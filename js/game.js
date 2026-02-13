// ============================================================
// GEAR GRINDER - GAME LOGIC, PHYSICS, INPUT
// ============================================================

import { scene, camera, renderer, sun, pLight, MAT } from './renderer.js';
import { S, HS, resetState, saveHighScore } from './state.js';
import {
  LANES, GEARS, ZONES, POWERUPS, ROAD_DRAW_DIST, RSL, RW, SHOULDER_W,
  SCENERY_SPACING, getCurveX, getCurveDeriv, getHeightDeriv,
} from './constants.js';
import { createBike, createRider } from './bike.js';
import {
  roadSegs, roadGrp, seamRoad, seamRoadMat, gnd, sceneryItems,
  obstacles, powerupObjs, mkCliff, mkPU, emit, updateParticles,
} from './world.js';
import {
  initAudio, sndPedal, sndShift, sndPerfect, sndCrash,
  sndPowerup, sndCombo, updateWind, stopWind, tone,
} from './audio.js';
import {
  $, updHUD, floatText, toast, showZone, flash,
  showGameOver, hideGameOver, shareScore, shareRoom,
} from './ui.js';
import { MP, mpLoop, initMP, triggerRaceStart, setRacing, cleanupOpponents } from './multiplayer.js';

const THREE = window.THREE;

// ============================================================
// PLAYER BIKE INSTANCE
// ============================================================
const bikeData = createBike();
const { bikeGrp, frontW, rearW, crankGrp, chainring, sprocket } = bikeData;
scene.add(bikeGrp);

const riderData = createRider(bikeGrp);
const { hipGrp, spineGrp, neckGrp, headGrp, lArm, rArm, lLeg, rLeg } = riderData;

// ============================================================
// GAME ACTIONS
// ============================================================
const RPM_GAIN = 0.09;

export function pedal() {
  if (!S.alive || !S.started) return;
  if (S.energy <= 0 && S.speed < 2) { floatText('NO ENERGY!', '#ff4d4d'); return; }

  initAudio();
  sndPedal();

  const now = performance.now();
  if (S.lastPedal > 0) S.pedalInterval = now - S.lastPedal;
  S.lastPedal = now;
  S.pedalCount++;

  const gd = GEARS[S.gear];
  S.rpm = Math.min(1, S.rpm + RPM_GAIN);
  const inS = S.rpm >= gd.sMin && S.rpm <= gd.sMax;

  // Energy cost calculation
  let cost = 0.008 + gd.ratio * 0.012;
  if (inS) cost *= 0.25;
  else if (S.rpm > gd.sMax) cost *= 1.5 + ((S.rpm - gd.sMax) * 4);
  else cost *= 1.3 + ((gd.sMin - S.rpm) * 3);

  const [optLo, optHi] = gd.optSpd;
  const optRange = optHi - optLo;
  if (S.speed >= optLo && S.speed <= optHi) {
    cost *= 0.35;
  } else {
    const dist = S.speed < optLo ? (optLo - S.speed) / optRange : (S.speed - optHi) / optRange;
    cost *= (1.5 + dist * dist * 4);
    if (S.speed < optLo && S.gear > 3) cost *= (1 + Math.min(2, (S.gear - 3) * 0.25));
  }

  if (S.incline > 0) cost *= (1 + S.incline * 6);
  else cost *= Math.max(0.15, 1 + S.incline * 3);

  if (S.activePowerup && S.activePowerup.type === 'GRAVITY') cost *= 0.25;
  S.energy = Math.max(0, S.energy - cost);

  // Warning messages
  if (cost > 0.04 && S.pedalCount > 5 && S.combo < 2) {
    if (S.speed < optLo && S.gear > 1) floatText('\u26A0 GEAR TOO HIGH \u2014 BURNING ENERGY', '#ff4d4d');
    else if (S.speed > optHi && S.gear < S.maxGear) floatText('\u26A0 GEAR TOO LOW \u2014 WASTING POWER', '#ff884d');
  }

  // Acceleration
  let accel = inS ? 2.0 : 1.4;
  if (S.energy < 0.15) accel *= (0.3 + S.energy * 4.5);
  if (S.energy <= 0) accel *= 0.1;
  if (S.activePowerup && S.activePowerup.type === 'SPEED') accel *= 1.4;
  const topSpd = gd.top * (S.activePowerup && S.activePowerup.type === 'SPEED' ? 1.3 : 1);
  const incF = Math.max(0.1, 1 - S.incline * 5);
  const headroom = Math.max(0, (topSpd - S.speed) / topSpd);
  const dimReturn = 0.4 + headroom * 0.6;
  S.speed = Math.min(topSpd, S.speed + gd.ratio * accel * incF * dimReturn);

  // Combo + scoring
  if (inS) {
    S.combo++;
    if (S.combo > S.bestCombo) S.bestCombo = S.combo;
    const sm = S.activePowerup && S.activePowerup.type === 'SCORE' ? 2 : 1;
    S.score += (2 + S.combo * .4) * S.gear * sm;
    $('h-score').classList.add('bump');
    setTimeout(() => $('h-score').classList.remove('bump'), 100);
    if (S.combo === 5) { floatText('\uD83D\uDD25 ON FIRE!', '#ffb84d'); sndCombo(); }
    if (S.combo === 10) { floatText('\u26A1 UNSTOPPABLE!', '#ff4d8b'); sndCombo(); }
    if (S.combo === 25) { floatText('\uD83D\uDC80 LEGENDARY!', '#aa44ff'); sndCombo(); }
  } else {
    if (S.combo >= 5) floatText('COMBO LOST', '#ff4d4d');
    if (S.rpm > gd.sMax && S.combo < 2) {
      if (S.gear >= S.maxGear) floatText('MAX RPM \u2014 HOLD STEADY', '#ffcc00');
      else floatText('RPM TOO HIGH \u2014 SHIFT UP!', '#ff884d');
    } else if (S.rpm < gd.sMin && S.combo < 2 && S.pedalCount > 3) {
      floatText('RPM TOO LOW', '#4db8ff');
    }
    S.combo = 0;
  }

  crankGrp.rotation.x += Math.PI / 3;
  $('pedal-btn').classList.add('pressed');
  setTimeout(() => $('pedal-btn').classList.remove('pressed'), 70);
}

export function shift(dir) {
  if (!S.alive || !S.started) return;
  initAudio();
  const ng = Math.max(1, Math.min(S.maxGear, S.gear + dir));
  if (ng === S.gear) return;

  const el = $('h-gear');
  el.classList.remove('shift-up', 'shift-down');
  void el.offsetWidth;
  el.classList.add(dir > 0 ? 'shift-up' : 'shift-down');

  const oldR = S.rpm;
  S.gear = ng;
  if (ng > S.topGearUsed) S.topGearUsed = ng;
  sndShift(dir > 0);

  S._fovKick = dir > 0 ? -Math.min(10, 2 + S.speed * .06) : Math.min(7, 1.5 + S.speed * .04);
  const gd = GEARS[S.gear];

  if (oldR >= gd.sMin * .75 && oldR <= gd.sMax * 1.2) {
    floatText('\u26A1 PERFECT SHIFT!', '#4dffb8');
    sndPerfect();
    S.score += 120 * S.gear;
    S.stats.perfects++;
    S.rpm = dir > 0 ? S.rpm * .80 : Math.min(.95, S.rpm * 1.3);
    S._fovKick *= 2.0;
  } else {
    S.rpm = dir > 0 ? S.rpm * .65 : Math.min(.95, S.rpm * 1.25);
  }
  updHUD();
}

export function changeLane(dir) {
  if (!S.alive || !S.started) return;
  const nL = S.lane + dir;
  if (nL >= 0 && nL < LANES.length) S.lane = nL;
}

export function die() {
  S.alive = false;
  sndCrash();
  S.shake = 1.2;
  flash('#ff0000');
  stopWind();

  const isNew = S.score > HS;
  if (isNew) saveHighScore(S.score);

  setTimeout(() => showGameOver(isNew, MP.room), 900);
}

export function reset() {
  resetState();
  bikeGrp.position.set(0, 0, 0);
  bikeGrp.rotation.set(0, 0, 0);

  obstacles.forEach(o => scene.remove(o));
  obstacles.length = 0;
  powerupObjs.forEach(p => scene.remove(p));
  powerupObjs.length = 0;

  for (let i = 0; i < sceneryItems.length; i++) {
    sceneryItems[i].userData._localZ = -i * SCENERY_SPACING - Math.random() * 2;
    sceneryItems[i].position.z = sceneryItems[i].userData._localZ;
  }

  hideGameOver();
  $('hud').style.display = 'block';
  nextCliffDist = 150;
  nextPowerupDist = 80;

  const z = ZONES[0];
  scene.fog.color.set(z.fog);
  renderer.setClearColor(z.fog);
  pLight.color.set(z.col);
}

// ============================================================
// COUNTDOWN & START
// ============================================================
export function beginCountdown(ms) {
  if (MP.state === 'COUNTDOWN' || MP.state === 'RACING') return;
  MP.state = 'COUNTDOWN';
  $('lobby-screen').classList.remove('show');
  const overlay = $('countdown-overlay');
  overlay.style.display = 'flex';

  let sec = Math.ceil(ms / 1000);
  overlay.innerText = sec;

  const timer = setInterval(() => {
    ms -= 100;
    const newSec = Math.ceil(ms / 1000);
    if (newSec < sec) {
      sec = newSec;
      overlay.innerText = sec > 0 ? sec : 'GO!';
      tone(sec > 0 ? 400 : 800, 0.1, 'square');
    }
    if (ms <= 0) {
      clearInterval(timer);
      setTimeout(() => overlay.style.display = 'none', 500);
      startGame();
    }
  }, 100);
}

export function startGame() {
  setRacing();
  reset();
  S.started = true; // Must be AFTER reset() which sets started=false
  $('hud').style.display = 'block';
}

// ============================================================
// INPUT SETUP
// ============================================================
export function setupInput() {
  let _spaceDown = false;

  document.addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); if (!_spaceDown) { _spaceDown = true; pedal(); } }
    if (e.code === 'ArrowUp') { e.preventDefault(); shift(1); }
    if (e.code === 'ArrowDown') { e.preventDefault(); shift(-1); }
    if (e.code === 'ArrowLeft') { e.preventDefault(); changeLane(-1); }
    if (e.code === 'ArrowRight') { e.preventDefault(); changeLane(1); }
  });

  document.addEventListener('keyup', e => { if (e.code === 'Space') _spaceDown = false; });

  $('pedal-btn').addEventListener('pointerdown', e => { e.preventDefault(); pedal(); });

  let lastScroll = 0;
  window.addEventListener('wheel', e => {
    const n = performance.now();
    if (n - lastScroll < 130) return;
    lastScroll = n;
    shift(e.deltaY < 0 ? 1 : -1);
  }, { passive: true });

  let tsx = 0, tsy = 0;
  document.addEventListener('touchstart', e => {
    tsx = e.touches[0].clientX;
    tsy = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if (S.started) e.preventDefault();
    const dx = e.touches[0].clientX - tsx;
    const dy = e.touches[0].clientY - tsy;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > 28) { changeLane(dx > 0 ? 1 : -1); tsx = e.touches[0].clientX; }
    } else {
      if (Math.abs(dy) > 28) { shift(dy < 0 ? 1 : -1); tsy = e.touches[0].clientY; }
    }
  }, { passive: false });
}

// ============================================================
// UI BUTTON BINDINGS
// ============================================================
export function setupButtons() {
  // Start button
  $('start-btn').onclick = () => {
    initAudio();
    const btn = $('start-btn');
    btn.textContent = 'CONNECTING...';
    btn.disabled = true;

    const room = $('room-input').value.trim();
    initMP(room.length > 0 ? room : 'RACE1', {
      onCountdown: beginCountdown,
      onStartGame: startGame,
    });
  };

  // Lobby start
  $('lobby-start-btn').onclick = () => {
    initAudio();
    triggerRaceStart();
  };

  // Lobby share
  $('lobby-share-btn').onclick = () => shareRoom(MP.room);

  // Retry
  $('retry-btn').onclick = () => { reset(); S.started = true; };

  // Share score
  $('share-btn').onclick = () => shareScore(MP.room);

  // Share room from game over
  const goShareBtn = $('go-share-room-btn');
  if (goShareBtn) goShareBtn.onclick = () => shareRoom(MP.room);
}

// ============================================================
// MAIN UPDATE LOOP
// ============================================================
let lastT = performance.now();
let nextCliffDist = 150;
let nextPowerupDist = 80;
const _tc = new THREE.Color();

function update(dt) {
  if (!S.alive || !S.started) return;

  // Multiplayer sync
  mpLoop(dt);

  S.frame++;
  const targetX = LANES[S.lane];
  S.laneX += (targetX - S.laneX) * dt * 8;

  const gd = GEARS[S.gear];

  // RPM decay
  const gearEffort = S.gear <= 6 ? 1.0 : 1.0 + (S.gear - 6) * 0.08;
  const uphillRpmPenalty = S.incline > 0 ? 1 + S.incline * 20 : 1;
  S.rpm = Math.max(0, S.rpm - dt * (0.06 + S.rpm * 0.30) * gearEffort * uphillRpmPenalty);

  // Terrain
  S.incline = getHeightDeriv(S._worldZ, S.distance, S.difficulty);
  S._renderIncline += (S.incline - S._renderIncline) * dt * 2.5;
  S._camIncline += (S._renderIncline - S._camIncline) * dt * 0.8;

  // Speed physics
  const incDrag = S.incline > 0 ? S.incline * 20 : 0;
  const downBoost = S.incline < 0 ? -S.incline * 12 : 0;
  S.speed = Math.max(0, S.speed - dt * (0.12 + S.speed * S.speed * 0.00035 + S.speed * 0.008 + incDrag) + dt * downBoost);

  // Energy regen
  const ts = (performance.now() - S.lastPedal) / 1000;
  let regen = 0.015 + (ts > 0.6 ? 0.05 : 0) + (S.incline < 0 ? -S.incline * .6 : 0);
  if (S.speed > 5) {
    const gd2 = GEARS[S.gear];
    const [oL, oH] = gd2.optSpd;
    if (S.speed < oL - 5 || S.speed > oH + 10) {
      const mismatch = S.speed < oL ? (oL - S.speed) / 15 : (S.speed - oH) / 15;
      regen -= Math.min(0.06, mismatch * 0.035);
    }
  }
  S.energy = Math.min(1, S.energy + dt * regen);

  if (S.speed > S.maxSpeed) S.maxSpeed = S.speed;
  const mz = S.speed * dt * .5;
  S.distance += mz;
  S._worldZ -= mz;

  // Scoring
  const sm = S.activePowerup && S.activePowerup.type === 'SCORE' ? 2 : 1;
  S.score += mz * .5 * (1 + S.combo * .1) * sm;
  S.difficulty = 1 + S.distance / 700;

  // Powerup timer
  if (S.activePowerup) {
    S.powerupTimer -= dt;
    if (S.powerupTimer <= 0) { S.activePowerup = null; toast('POWERUP EXPIRED'); }
  }
  if (S.invulnerable > 0) S.invulnerable -= dt;

  // Zone progression
  for (let i = ZONES.length - 1; i >= 0; i--) {
    if (S.distance >= ZONES[i].dist) {
      if (S.zone !== i) { S.zone = i; showZone(ZONES[i]); }
      const z = ZONES[i];
      _tc.set(z.fog); scene.fog.color.lerp(_tc, dt * .5); renderer.setClearColor(scene.fog.color);
      _tc.set(z.col); pLight.color.lerp(_tc, dt * .5);
      _tc.set(z.gnd); MAT.ground.color.lerp(_tc, dt * .5);
      const tR = new THREE.Color(z.road); seamRoadMat.color.lerp(tR, dt * .3);
      _tc.set(z.line).multiplyScalar(1.2); MAT.curb.color.lerp(_tc, dt * .2);
      break;
    }
  }

  // Fog
  const baseFog = Math.max(0.0006, 0.003 - Math.min(0.0024, S.speed * 0.000025));
  const dlFog = Math.max(0, -S._terrainFeel) * 0.002;
  const clFog = S._cliffTension * 0.004;
  const tf = Math.max(0.0002, baseFog - dlFog + clFog);
  scene.fog.density += (tf - scene.fog.density) * dt * 1.5;

  // Spawn obstacles + powerups
  if (S.distance >= nextCliffDist) {
    const c = mkCliff();
    c.position.z = -ROAD_DRAW_DIST;
    c.userData.reqSpeed = Math.min(90, 18 + S.difficulty * 6 + Math.random() * 8);
    scene.add(c);
    obstacles.push(c);
    nextCliffDist = S.distance + 120 + Math.random() * (200 - Math.min(120, S.difficulty * 18));
  }
  if (S.distance >= nextPowerupDist) {
    const safe = !obstacles.some(o => o.position.z > -ROAD_DRAW_DIST - 20 && o.position.z < -ROAD_DRAW_DIST + 20);
    if (safe) {
      const ty = POWERUPS[Math.floor(Math.random() * POWERUPS.length)].type;
      const p = mkPU(ty);
      p.position.set(LANES[Math.floor(Math.random() * 3)], 1, -ROAD_DRAW_DIST);
      p.userData._laneOffset = p.position.x;
      scene.add(p);
      powerupObjs.push(p);
    }
    nextPowerupDist = S.distance + 100 + Math.random() * 80 + S.difficulty * 8;
  }

  // Road curve + terrain feel
  const bikeCX = getCurveX(S._worldZ, S.distance);
  const rawFeel = Math.max(-1, Math.min(1, S._renderIncline * 8));
  S._terrainFeel += (rawFeel - S._terrainFeel) * dt * 2;
  const cf = S._cliffTension;

  // Recycle road segments + visibility culling
  const recycleZ = RSL * 2;
  for (let i = 0; i < roadSegs.length; i++) {
    const seg = roadSegs[i];
    seg.position.z += mz;
    if (seg.position.z > recycleZ) {
      let mn = Infinity;
      for (let j = 0; j < roadSegs.length; j++) if (roadSegs[j].position.z < mn) mn = roadSegs[j].position.z;
      seg.position.z = mn - RSL;
    }
    // Only update visible segments
    if (seg.position.z > -ROAD_DRAW_DIST && seg.position.z < recycleZ) {
      seg.position.x = getCurveX(S._worldZ + seg.position.z, S.distance);
      seg.position.y = 0;
      seg.rotation.set(0, 0, 0);
    }
  }

  // Road scale effects
  const downScale = Math.max(0, -S._terrainFeel) * 0.8;
  const cliffNarrow = cf * 0.4;
  const targetRoadScale = 1.0 + downScale - cliffNarrow;
  roadGrp.scale.x += (targetRoadScale - roadGrp.scale.x) * dt * 2;
  seamRoad.scale.x += (targetRoadScale - seamRoad.scale.x) * dt * 2;
  seamRoad.position.x = camera.position.x;
  seamRoad.position.z = camera.position.z - ROAD_DRAW_DIST * 0.5;
  seamRoad.position.y = 0;

  // Recycle scenery + distance-based visibility culling
  const scenRecycleZ = 25;
  const visCullFar = -ROAD_DRAW_DIST * 0.85;
  const visCullNear = 18;
  for (let i = 0; i < sceneryItems.length; i++) {
    const it = sceneryItems[i];
    it.position.z += mz;
    if (it.position.z > scenRecycleZ) {
      let mn = Infinity;
      for (let j = 0; j < sceneryItems.length; j++) if (sceneryItems[j].position.z < mn) mn = sceneryItems[j].position.z;
      it.position.z = mn - SCENERY_SPACING - Math.random() * 2;
    }
    // Visibility culling: hide objects behind camera or too far
    const zp = it.position.z;
    if (zp > visCullNear || zp < visCullFar) {
      it.visible = false;
    } else {
      it.visible = true;
      it.position.x = getCurveX(S._worldZ + zp, S.distance) + it.userData._side * it.userData._sideOffset * roadGrp.scale.x;
      it.position.y = 0;
    }
  }

  // Cliff collision
  let warn = false;
  S._cliffTarget = 0;
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    o.position.z += mz;
    o.position.x = getCurveX(S._worldZ + o.position.z, S.distance);
    o.position.y = 0;

    if (o.position.z > -60 && o.position.z < -4 && !o.userData.cleared) {
      warn = true;
      const distM = Math.floor(-o.position.z);
      const spd = Math.floor(o.userData.reqSpeed);
      const have = Math.floor(S.speed);
      const ok = have >= spd;
      $('cliff-warn').innerHTML = (ok ? '\u2713' : '\u26A0') + ' CLIFF ' + distM + 'm \u2014 NEED ' + spd + ' KM/H ' + (ok ? '\u2713' : '\u26A0');
      $('cliff-warn').style.color = ok ? '#4dffb8' : '#ff6633';
      const proximity = Math.max(0, 1 - (o.position.z + 4) / (-56));
      S._cliffTarget = Math.max(S._cliffTarget, proximity * proximity);
    }

    if (o.position.z > -o.userData.gap / 2 && o.position.z < o.userData.gap / 2 && !o.userData.cleared) {
      if (S.speed >= o.userData.reqSpeed) {
        o.userData.cleared = true;
        const bonus = Math.floor(200 * S.difficulty);
        S.score += bonus;
        S.stats.cliffs++;
        floatText('CLEARED! +' + bonus, '#4dffb8');
        emit(0, 2, 0, 25, 0x4dffb8);
        tone(600, .1, 'sine');
        tone(900, .2, 'sine');
        S._fovKick = -Math.min(14, 4 + S.speed * .08);
      } else {
        die();
        return;
      }
    }
    if (o.position.z > 20) { scene.remove(o); obstacles.splice(i, 1); }
  }
  $('cliff-warn').classList.toggle('show', warn);

  // Powerup pickup
  const bikeCXL = bikeCX + S.laneX;
  for (let i = powerupObjs.length - 1; i >= 0; i--) {
    const p = powerupObjs[i];
    p.position.z += mz;
    p.position.x = getCurveX(S._worldZ + p.position.z, S.distance) + (p.userData._laneOffset || 0);
    p.rotation.y += dt * 2;
    p.userData.bob += dt * 4;
    p.position.y = 1 + Math.sin(p.userData.bob) * .2;

    if (Math.abs(p.position.z) < 1.5 && Math.abs(p.position.x - bikeCXL) < 1.2) {
      const def = p.userData.def;
      S.activePowerup = def;
      S.powerupTimer = def.dur;
      S.stats.powerups++;
      if (p.userData.pType === 'ENERGY') { S.energy = Math.min(1, S.energy + .5); S.invulnerable = .5; }
      floatText(def.msg, '#' + def.color.toString(16).padStart(6, '0'));
      sndPowerup();
      emit(p.position.x, 1, 0, 30, def.color);
      scene.remove(p);
      powerupObjs.splice(i, 1);
    } else if (p.position.z > 10) {
      scene.remove(p);
      powerupObjs.splice(i, 1);
    }
  }

  // Road particles
  if (S.speed > 5) emit(bikeGrp.position.x, .1, 1.2, 1, 0x888888, 1);

  // Visual effects
  $('speed-lines').style.opacity = Math.min(1, Math.max(0, (S.speed - 40) / 60) + Math.max(0, -S._terrainFeel) * 0.8);
  $('vignette').style.opacity = 1 + S._cliffTension * 0.6;

  // Bike animation
  frontW.rotation.x += S.speed * .3 * dt;
  rearW.rotation.x += S.speed * .3 * dt;
  crankGrp.rotation.x += S.rpm * dt * 5;
  chainring.rotation.x += S.rpm * dt * 5;
  sprocket.rotation.x += S.rpm * dt * 5 * gd.ratio;

  bikeGrp.position.x = bikeCX + S.laneX;
  bikeGrp.position.y = Math.sin(S.frame * .12) * .012 * Math.min(1, S.speed / 10);
  bikeGrp.rotation.x += (-S._renderIncline * 1.5 - bikeGrp.rotation.x) * dt * 3;
  const bcd = getCurveDeriv(S._worldZ, S.distance);
  bikeGrp.rotation.z = -bcd * 0.08 * Math.min(1, S.speed / 30);
  bikeGrp.rotation.y = (targetX - S.laneX) * 0.15;

  // Rider animation
  const pa = crankGrp.rotation.x;
  const br = Math.sin(S.frame * .04) * .005;
  const sc = Math.min(.20, S.speed * .0025);
  const hillLean = S._renderIncline * 2.5;

  spineGrp.rotation.x = -.65 - sc + br - hillLean * 0.3;
  neckGrp.rotation.x = -spineGrp.rotation.x * .5 - .1;
  headGrp.rotation.x = .15 + sc * .3 + hillLean * 0.1;
  if (S.rpm > .5) headGrp.rotation.z = Math.sin(pa) * .015 * S.rpm; else headGrp.rotation.z *= .9;

  const lP = pa, rP = pa + Math.PI;
  const legAmp = 0.55 + Math.max(0, hillLean) * 0.15;
  lLeg.rotation.x = Math.sin(lP) * legAmp + .35;
  lLeg.userData.knee.rotation.x = -(Math.abs(Math.cos(lP)) * .9 + .45);
  rLeg.rotation.x = Math.sin(rP) * legAmp + .35;
  rLeg.userData.knee.rotation.x = -(Math.abs(Math.cos(rP)) * .9 + .45);

  const aw = Math.sin(pa * .5) * .04;
  const spR = S.rpm > .6 ? Math.sin(pa) * .035 : 0;
  lArm.rotation.x = -1.1 - sc * .5 + aw + spR - hillLean * 0.2;
  lArm.rotation.z = .15;
  lArm.userData.elbow.rotation.x = .6 + sc * .8;
  rArm.rotation.x = -1.1 - sc * .5 - aw - spR - hillLean * 0.2;
  rArm.rotation.z = -.15;
  rArm.userData.elbow.rotation.x = .6 + sc * .8;

  const swayAmp = S.rpm > .4 ? Math.min(1, S.rpm) * (1 + Math.max(0, hillLean) * 0.8) : 0;
  if (swayAmp > 0) {
    const rk = Math.sin(pa) * .025 * swayAmp;
    spineGrp.rotation.z = rk;
    hipGrp.rotation.z = rk * .3;
  } else {
    spineGrp.rotation.z *= .92;
    hipGrp.rotation.z *= .92;
  }

  // Camera
  camera.position.x = bikeGrp.position.x;
  const tf2 = S._terrainFeel;
  const downF = Math.max(0, -tf2);
  const upF = Math.max(0, tf2);

  const camY = 3.5 + S.speed * .008 + downF * 9 - upF * 1.5 - cf * 1.5;
  camera.position.y += (camY - camera.position.y) * dt * 2;

  const camZ = 7.5 - S.speed * .025 + downF * 14 - cf * 4 + S._fovKick * 0.3;
  camera.position.z += (camZ - camera.position.z) * dt * 1.5;

  if (S.shake > 0) {
    camera.position.x += (Math.random() - .5) * S.shake;
    camera.position.y += (Math.random() - .5) * S.shake * .7;
    S.shake *= .88;
    if (S.shake < .01) S.shake = 0;
  }

  const lookY = 1.0 - downF * 4 + cf * 2;
  camera.lookAt(camera.position.x, lookY, -3);

  const baseFov = 60 + S.speed / 100 * 12;
  const terrainFov = downF * 35 - upF * 10 - cf * 14;
  const targetFov = baseFov + terrainFov + S._fovKick;
  camera.fov += (Math.max(44, Math.min(110, targetFov)) - camera.fov) * dt * 2;
  camera.updateProjectionMatrix();

  S._fovKick *= 1 - dt * 1.5;
  S._cliffTension += (S._cliffTarget - S._cliffTension) * dt * 2;

  // Lights follow bike
  sun.position.set(8, 18, bikeGrp.position.z + 5);
  sun.target.position.set(0, 0, bikeGrp.position.z);
  pLight.position.set(bikeGrp.position.x, 3, bikeGrp.position.z);

  // Terrain tint overlay
  const tt = $('terrain-tint');
  if (S._cliffTension > 0.05) {
    tt.style.background = 'radial-gradient(ellipse at 50% 70%,#ff330010 0%,#ff110020 100%)';
    tt.style.opacity = Math.min(1, S._cliffTension * 1.5);
  } else if (S._terrainFeel < -0.15) {
    tt.style.background = 'radial-gradient(ellipse at 50% 30%,#2266ff08 0%,#0044aa10 60%,transparent 100%)';
    tt.style.opacity = Math.min(1, -S._terrainFeel);
  } else if (S._terrainFeel > 0.15) {
    tt.style.background = 'radial-gradient(ellipse at 50% 70%,#ff660008 0%,transparent 60%)';
    tt.style.opacity = Math.min(0.7, S._terrainFeel);
  } else {
    tt.style.opacity = 0;
  }

  // Particles + world updates
  updateParticles(dt);
  gnd.position.z = camera.position.z - 600;
  gnd.position.x = bikeCX;
  gnd.position.y = -0.1;
  updateWind();

  // Death check (out of energy + stopped)
  if (S.energy <= 0 && S.speed <= 0.5 && S.distance > 30) {
    S._deathTimer = (S._deathTimer || 0) + dt;
    if (S._deathTimer > 1.5) die();
  } else {
    S._deathTimer = 0;
  }

  updHUD();
}

// ============================================================
// GAME LOOP
// ============================================================
export function gameLoop() {
  requestAnimationFrame(gameLoop);
  const now = performance.now();
  const dt = Math.min(0.06, (now - lastT) / 1000);
  lastT = now;
  update(dt);
  renderer.render(scene, camera);
}
