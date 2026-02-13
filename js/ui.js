// ============================================================
// GEAR GRINDER - UI (HUD, Screens, Toasts)
// ============================================================

import { S, HS } from './state.js';
import { GEARS, ZONES } from './constants.js';

// --- DOM helper ---
export const $ = id => document.getElementById(id);

// ============================================================
// HUD UPDATE
// ============================================================
export function updHUD() {
  $('h-score').textContent = Math.floor(S.score).toLocaleString();

  const spd = Math.floor(S.speed);
  $('h-speed').textContent = spd;
  $('h-speed').style.color = spd > 80 ? '#ff4d8b' : spd > 50 ? '#ffb84d' : '#fff';

  $('h-gear').textContent = S.gear;
  const gd = GEARS[S.gear];
  const [oL2, oH2] = gd.optSpd;
  const inOpt2 = S.speed >= oL2 && S.speed <= oH2;
  $('h-gname').textContent = gd.name + (inOpt2 ? ' \u2713' : S.speed > 3 ? ' \u26A0' : '');

  $('h-dist').textContent = Math.floor(S.distance).toLocaleString();
  $('h-best').textContent = HS.toLocaleString();

  // RPM bar
  const rN = Math.min(1, S.rpm);
  $('rpm-fill').style.height = (rN * 100) + '%';
  $('rpm-sweet').style.bottom = (gd.sMin * 100) + '%';
  $('rpm-sweet').style.height = ((gd.sMax - gd.sMin) * 100) + '%';
  const inS = S.rpm >= gd.sMin && S.rpm <= gd.sMax;
  $('rpm-fill').style.background = inS
    ? 'linear-gradient(to top,#4dffb8,#66ffcc)'
    : S.rpm > gd.sMax
      ? 'linear-gradient(to top,#ff8844,#ff4d4d)'
      : 'linear-gradient(to top,#4488cc,#4db8ff44)';

  // Energy bar
  $('energy-fill').style.height = (S.energy * 100) + '%';
  const eBar = $('energy-bar-el');
  if (S.energy < .2) eBar.classList.add('low');
  else eBar.classList.remove('low');

  // Incline
  const pct = Math.round(S.incline * 100);
  const icon = pct > 2 ? '\u25B2' : pct < -2 ? '\u25BC' : '\u2014';
  $('h-incline').textContent = icon + ' ' + (pct > 0 ? '+' : '') + pct + '%';
  $('h-incline').style.color = pct > 5 ? '#ff4d4d' : pct > 2 ? '#ffb84d' : pct < -2 ? '#4dffb8' : '#ffffff44';

  // Combo
  if (S.combo > 1) {
    $('combo-bar').textContent = 'COMBO \xD7' + S.combo;
    $('combo-bar').classList.add('on');
    $('combo-bar').style.color = S.combo >= 20 ? '#ff4d8b' : S.combo >= 10 ? '#ffb84d' : '#4dffb8';
  } else {
    $('combo-bar').classList.remove('on');
  }

  // Pedal ring
  if (S.pedalInterval > 0) {
    const ideal = 60000 / gd.bpm;
    const ratio = Math.min(1, ideal / Math.max(1, S.pedalInterval));
    const circ = 276.5;
    $('pedal-progress').style.strokeDashoffset = circ - circ * ratio;
    $('pedal-progress').style.stroke = inS ? '#4dffb8' : S.rpm > gd.sMax ? '#ff4d4d' : '#4db8ff';
  }

  // Powerup status
  if (S.activePowerup) {
    $('pu-icon').textContent = S.activePowerup.icon;
    $('pu-label').textContent = S.activePowerup.msg.split(' ').slice(1).join(' ');
    $('pu-timer').textContent = Math.ceil(S.powerupTimer) + 's';
    const pc = '#' + S.activePowerup.color.toString(16).padStart(6, '0');
    $('pu-timer').style.color = pc;
    $('pu-label').style.color = pc;
    $('powerup-status').classList.add('show');
  } else {
    $('powerup-status').classList.remove('show');
  }

  // Shift hint
  const hint = $('shift-hint');
  const [oL, oH] = gd.optSpd;
  const inOptSpd = S.speed >= oL && S.speed <= oH;
  if (hint._suppressed) {
    hint.style.opacity = 0;
  } else {
    if (S.rpm > gd.sMax && S.gear < S.maxGear) {
      hint.textContent = '\u25B2 SHIFT UP'; hint.style.color = '#ff4d4d'; hint.style.opacity = 1;
    } else if (S.rpm > gd.sMax && S.gear >= S.maxGear) {
      hint.textContent = '\u2605 MAX GEAR \u2014 HOLD RHYTHM'; hint.style.color = '#ffcc00'; hint.style.opacity = .8;
    } else if (S.rpm < gd.sMin * .7 && S.gear > 1) {
      hint.textContent = '\u25BC SHIFT DOWN'; hint.style.color = '#4db8ff'; hint.style.opacity = 1;
    } else if (S.incline > 0.04 && S.speed < oL && S.gear > 1) {
      hint.textContent = '\u25BC DOWNSHIFT FOR CLIMB'; hint.style.color = '#ff884d'; hint.style.opacity = 1;
    } else if (S.incline < -0.03 && S.speed > oH * .8 && S.gear < S.maxGear) {
      hint.textContent = '\u25B2 UPSHIFT \u2014 DOWNHILL!'; hint.style.color = '#4dffb8'; hint.style.opacity = .8;
    } else if (!inOptSpd && S.speed > 5) {
      if (S.speed < oL && S.gear > 1) {
        hint.textContent = '\u25BC GEAR TOO HIGH'; hint.style.color = '#ffb84d'; hint.style.opacity = .8;
      } else if (S.speed > oH && S.gear < S.maxGear) {
        hint.textContent = '\u25B2 GEAR TOO LOW'; hint.style.color = '#ffb84d'; hint.style.opacity = .8;
      } else hint.style.opacity = 0;
    } else hint.style.opacity = 0;
  }
  $('h-gear').style.color = inOptSpd ? '#4dffb8' : Math.abs(S.speed - (oL + oH) / 2) > 30 ? '#ff4d4d' : '#ffb84d';
}

// ============================================================
// FLOAT TEXT & TOAST
// ============================================================
let _lastFloatTime = 0;
export function floatText(t, c = '#4dffb8') {
  const now = Date.now();
  if (now - _lastFloatTime < 600) return;
  _lastFloatTime = now;
  const f = $('float-text');
  f.textContent = t; f.style.color = c;
  f.classList.remove('show'); void f.offsetWidth; f.classList.add('show');
  $('shift-hint').style.opacity = 0; $('shift-hint')._suppressed = true;
  clearTimeout(f._t);
  f._t = setTimeout(() => { f.classList.remove('show'); $('shift-hint')._suppressed = false; }, 900);
}

export function toast(m) {
  const t = $('toast');
  t.textContent = m; t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 2000);
}

export function showZone(z) {
  $('z-name').textContent = z.name;
  $('z-name').style.color = '#' + z.col.toString(16).padStart(6, '0');
  $('z-sub').textContent = 'ZONE ' + (ZONES.indexOf(z) + 1);
  const b = $('zone-banner');
  b.classList.add('show');
  setTimeout(() => b.classList.remove('show'), 3000);
}

export function flash(col = '#ffffff') {
  const f = $('flash-overlay');
  f.style.background = col; f.style.opacity = .35;
  setTimeout(() => f.style.opacity = 0, 80);
}

// ============================================================
// ROOM BROWSER (start screen)
// ============================================================
export function updateRoomList(rooms) {
  const list = $('room-list');
  if (!list) return;
  list.innerHTML = '';

  const roomEntries = Object.entries(rooms);
  if (roomEntries.length === 0) {
    list.innerHTML = '<div class="room-empty">NO ACTIVE ROOMS — CREATE ONE BELOW</div>';
    return;
  }

  roomEntries.forEach(([name, info]) => {
    const isFull = info.players >= 10;
    const card = document.createElement('div');
    card.className = 'room-card' + (isFull ? ' full' : '');
    card.innerHTML = `
      <span class="room-card-name">${name}</span>
      <div class="room-card-info">
        <span class="room-card-players ${isFull ? 'full' : ''}">${info.players}/10</span>
        <span class="room-card-status ${info.racing ? 'racing' : 'waiting'}">${info.racing ? 'RACING' : 'WAITING'}</span>
      </div>`;
    if (!isFull) {
      card.addEventListener('click', () => {
        $('room-input').value = name;
        $('start-btn').click();
      });
    }
    list.appendChild(card);
  });
}

// ============================================================
// LOBBY UI
// ============================================================
export function updateLobbyUI(players, myId) {
  const list = $('lobby-list');
  const countEl = $('lobby-player-count');
  list.innerHTML = '';

  const entries = Object.entries(players);
  if (countEl) countEl.textContent = entries.length + '/10 RIDERS';

  entries.forEach(([id, p], i) => {
    const isMe = id === myId;
    const div = document.createElement('div');
    div.className = 'lobby-player' + (isMe ? ' me' : '');
    div.setAttribute('data-player-id', id);
    const colorHex = p.color ? '#' + p.color.toString(16).padStart(6, '0') : '#4dffb8';
    const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    div.innerHTML = `
      <span class="lobby-rank ${rankClass}">#${i + 1}</span>
      <span><span class="player-color" style="background:${colorHex}"></span><strong>${p.name}${isMe ? ' (YOU)' : ''}</strong></span>
      <span class="voice-indicator" data-voice-id="${id}"><span class="voice-bar"></span><span class="voice-bar"></span><span class="voice-bar"></span></span>
      <span class="status">READY</span>`;
    list.appendChild(div);
  });
}

// ============================================================
// MULTIPLAYER LEADERBOARD (in-game)
// ============================================================
export function updateLeaderboard(players, myId, myDistance) {
  const lb = $('mp-leaderboard');
  if (!lb) return;

  const entries = [];
  entries.push({ id: myId, name: 'YOU', dist: myDistance, color: 0xffb84d, me: true });

  Object.entries(players).forEach(([id, p]) => {
    if (id === myId || !p.targetDist) return;
    entries.push({ id, name: p.name || id.substring(0, 8), dist: p.targetDist, color: p.color || 0x4dffb8, me: false });
  });

  entries.sort((a, b) => b.dist - a.dist);

  lb.innerHTML = '';
  if (entries.length <= 1) { lb.classList.remove('show'); return; }
  lb.classList.add('show');

  entries.slice(0, 10).forEach((e, i) => {
    const div = document.createElement('div');
    div.className = 'mp-lb-entry' + (e.me ? ' me' : '');
    div.setAttribute('data-player-id', e.id);
    const colorHex = '#' + e.color.toString(16).padStart(6, '0');
    div.innerHTML = `
      <span class="mp-lb-pos">P${i + 1}</span>
      <span class="mp-lb-dot" style="background:${colorHex}"></span>
      <span class="mp-lb-name">${e.name}</span>
      <span class="voice-indicator mp-lb-voice" data-voice-id="${e.id}"><span class="voice-bar"></span><span class="voice-bar"></span><span class="voice-bar"></span></span>
      <span class="mp-lb-dist">${Math.floor(e.dist)}m</span>`;
    lb.appendChild(div);
  });
}

// ============================================================
// GAME OVER SCREEN
// ============================================================
export function showGameOver(isNew, roomName) {
  let grade = 'D';
  if (S.score > 200000) grade = 'S+';
  else if (S.score > 150000) grade = 'S';
  else if (S.score > 100000) grade = 'A+';
  else if (S.score > 75000) grade = 'A';
  else if (S.score > 50000) grade = 'B+';
  else if (S.score > 30000) grade = 'B';
  else if (S.score > 15000) grade = 'C';

  $('go-grade').textContent = grade;
  $('go-grade').style.color = grade[0] === 'S' ? '#ff4d8b' : grade[0] === 'A' ? '#4dffb8' : grade === 'B+' || grade === 'B' ? '#ffb84d' : '#ffffff88';
  $('go-dist').textContent = Math.floor(S.distance) + 'm';
  $('go-maxspd').textContent = Math.floor(S.maxSpeed) + ' km/h';
  $('go-perfect').textContent = S.stats.perfects;
  $('go-cliffs').textContent = S.stats.cliffs;
  $('go-topgear').textContent = S.topGearUsed + '/12';
  $('go-combo').textContent = S.bestCombo + '\xD7';
  $('go-score').textContent = Math.floor(S.score).toLocaleString();
  $('go-hs').textContent = 'HIGH SCORE: ' + HS.toLocaleString();
  $('go-new').style.display = isNew ? 'block' : 'none';

  $('go-screen').classList.add('show');
  $('hud').style.display = 'none';

  setTimeout(() => $('go-grade').classList.add('pop'), 200);
  document.querySelectorAll('.go-stat').forEach((el, i) => setTimeout(() => el.classList.add('show'), 350 + i * 80));
}

export function hideGameOver() {
  $('go-screen').classList.remove('show');
  $('go-grade').classList.remove('pop');
  document.querySelectorAll('.go-stat').forEach(el => el.classList.remove('show'));
}

// ============================================================
// SHARE FUNCTIONS
// ============================================================
export function shareScore(roomName) {
  const t = '\uD83D\uDEB4 GEAR GRINDER MULTIPLAYER\n'
    + $('go-grade').textContent + ' Grade | '
    + Math.floor(S.score).toLocaleString() + ' pts\n'
    + Math.floor(S.distance) + 'm | ' + Math.floor(S.maxSpeed) + ' km/h\n'
    + (roomName ? '\uD83C\uDFC1 Join room: ' + roomName + '\n' : '')
    + 'Powered by flowky.ai';

  if (navigator.share) {
    navigator.share({ title: 'GEAR GRINDER', text: t }).catch(() => {});
  } else {
    navigator.clipboard.writeText(t).then(() => toast('COPIED TO CLIPBOARD!'));
  }
}

export function shareRoom(roomName) {
  const url = window.location.origin + window.location.pathname + '?room=' + encodeURIComponent(roomName);
  const t = '\uD83D\uDEB4 Join my Gear Grinder race!\nRoom: ' + roomName + '\n' + url + '\nPowered by flowky.ai';

  if (navigator.share) {
    navigator.share({ title: 'Join Gear Grinder Race!', text: t, url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(t).then(() => toast('ROOM LINK COPIED!'));
  }
}
