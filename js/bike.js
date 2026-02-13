// ============================================================
// GEAR GRINDER - BICYCLE & RIDER MODELS (Stunning Pro Racing)
// ============================================================

import { scene, MAT, GEO, gm, mp } from './renderer.js';

const THREE = window.THREE;

// --- Canvas texture helpers for rider details ---
function mkJerseyTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');

  // Base blue
  ctx.fillStyle = '#1144cc';
  ctx.fillRect(0, 0, 256, 256);

  // White side panel
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 30, 256);
  ctx.fillRect(226, 0, 30, 256);

  // Red chest stripe
  ctx.fillStyle = '#ee2222';
  ctx.fillRect(0, 60, 256, 20);

  // Flowky.ai sponsor text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FLOWKY.AI', 128, 130);

  // Small sub-sponsor
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.fillStyle = '#aaccff';
  ctx.fillText('GEAR GRINDER', 128, 155);

  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

function mkRaceNumberTexture(num) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, 124, 124);
  ctx.fillStyle = '#111111';
  ctx.font = 'bold 64px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(num), 64, 55);
  ctx.fillStyle = '#7c3aed';
  ctx.font = 'bold 16px Arial, sans-serif';
  ctx.fillText('FLOWKY.AI', 64, 100);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

// Pre-built textures
const jerseyTex = mkJerseyTexture();
const raceNumTex = mkRaceNumberTexture(1);

const jerseyTexMat = new THREE.MeshStandardMaterial({
  map: jerseyTex, roughness: .6, metalness: .05, side: THREE.DoubleSide
});
const jerseyTexMat2 = new THREE.MeshStandardMaterial({
  map: jerseyTex, roughness: .6, metalness: .05, color: 0xcccccc
});
const raceNumMat = new THREE.MeshStandardMaterial({ map: raceNumTex, roughness: .5 });

// --- Tube helper (frame tubes) ---
function mkTube(a, b, r = 0.025, mat = MAT.frame) {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), mat);
  m.position.copy(a).add(d.clone().multiplyScalar(0.5));
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  m.castShadow = true;
  return m;
}

// --- Pro racing wheel with disc effect ---
function mkWheel(zP, isRear = false) {
  const wg = new THREE.Group();
  // Tire
  const tire = mp(new THREE.Mesh(new THREE.TorusGeometry(.34, .055, 10, 32), MAT.tire), { castShadow: true });
  tire.rotation.y = Math.PI / 2;
  wg.add(tire);
  // Rim
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.295, .018, 8, 32), MAT.rim);
  rim.rotation.y = Math.PI / 2;
  wg.add(rim);
  // Hub
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .1, 8), MAT.chrome);
  hub.rotation.z = Math.PI / 2;
  wg.add(hub);

  if (isRear) {
    // Rear: deep-section disc-style wheel
    const discMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: .4, roughness: .3, side: THREE.DoubleSide });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(.28, 24), discMat);
    disc.position.x = .02;
    disc.rotation.y = Math.PI / 2;
    wg.add(disc);
    const disc2 = disc.clone();
    disc2.position.x = -.02;
    disc2.rotation.y = -Math.PI / 2;
    wg.add(disc2);
    // Hub ring
    const hubRing = new THREE.Mesh(new THREE.TorusGeometry(.06, .01, 6, 16), MAT.gold);
    hubRing.rotation.y = Math.PI / 2;
    wg.add(hubRing);
  } else {
    // Front: aero bladed spokes
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, mid = 0.165;
      const sp = new THREE.Mesh(new THREE.BoxGeometry(.003, .25, .01), MAT.spoke);
      sp.position.set(0, Math.cos(a) * mid, Math.sin(a) * mid);
      sp.rotation.x = a;
      wg.add(sp);
    }
  }

  // Valve stem
  const valve = new THREE.Mesh(new THREE.CylinderGeometry(.003, .003, .04, 4), MAT.chrome);
  valve.position.set(0, .30, 0);
  wg.add(valve);

  wg.position.set(0, .34, zP);
  return wg;
}

// --- Build complete pro racing bicycle ---
export function createBike() {
  const bikeGrp = new THREE.Group();

  const frontW = mkWheel(-1, false);
  const rearW = mkWheel(1, true);
  bikeGrp.add(frontW, rearW);

  // Frame points (aero road bike geometry)
  const P = {
    ht: new THREE.Vector3(0, 1.06, -.70),
    hb: new THREE.Vector3(0, .65, -.82),
    seat: new THREE.Vector3(0, 1.12, .30),
    bb: new THREE.Vector3(0, .42, .12),
    rear: new THREE.Vector3(0, .34, 1),
    fork: new THREE.Vector3(0, .34, -1),
    sTop: new THREE.Vector3(0, 1.22, .32),
  };

  // Aero frame tubes
  const mAero = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: .7, roughness: .15 });
  bikeGrp.add(mkTube(P.seat, P.ht, .026, MAT.frame));
  bikeGrp.add(mkTube(P.ht, P.bb, .030, MAT.frame));
  bikeGrp.add(mkTube(P.seat, P.bb, .032, MAT.frame));
  bikeGrp.add(mkTube(P.seat, P.sTop, .014, MAT.chrome));
  bikeGrp.add(mkTube(P.ht, P.hb, .024, MAT.frame));

  // Rear stays
  [.055, -.055].forEach(x => {
    bikeGrp.add(mkTube(P.seat.clone().add(new THREE.Vector3(x, -.12, 0)), P.rear.clone().add(new THREE.Vector3(x, 0, 0)), .012, MAT.frame2));
    bikeGrp.add(mkTube(P.bb.clone().add(new THREE.Vector3(x, -.04, 0)), P.rear.clone().add(new THREE.Vector3(x, 0, 0)), .014, MAT.frame2));
  });

  // Fork (aero blades)
  [.05, -.05].forEach(x => {
    bikeGrp.add(mkTube(P.hb.clone().add(new THREE.Vector3(x, .05, 0)), P.fork.clone().add(new THREE.Vector3(x, 0, 0)), .018, mAero));
  });

  // Drop handlebars with aero extensions
  const hbar = new THREE.Mesh(new THREE.TorusGeometry(.15, .008, 6, 16, Math.PI), MAT.chrome);
  hbar.position.set(0, 1.12, -.80);
  hbar.rotation.x = Math.PI / 2;
  hbar.rotation.z = Math.PI;
  bikeGrp.add(hbar);

  // Aero bar extensions
  [-.04, .04].forEach(x => {
    const ext = new THREE.Mesh(new THREE.CylinderGeometry(.005, .005, .22, 4), MAT.chrome);
    ext.position.set(x, 1.13, -1.0);
    ext.rotation.x = Math.PI / 2 - 0.15;
    bikeGrp.add(ext);
  });
  // Aero bar pads
  [-.04, .04].forEach(x => {
    bikeGrp.add(new THREE.Mesh(new THREE.BoxGeometry(.025, .01, .06), MAT.dark).translateX(x).translateY(1.14).translateZ(-.88));
  });

  // Grips (bar tape)
  const tapeMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: .9 });
  [-.15, .15].forEach(x => {
    const g = new THREE.Mesh(new THREE.CylinderGeometry(.014, .014, .08, 6), tapeMat);
    g.position.set(x, 1.12, -.95);
    g.rotation.z = Math.PI / 2;
    bikeGrp.add(g);
  });

  // Pro saddle
  const saddleMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: .6, metalness: .1 });
  bikeGrp.add(new THREE.Mesh(new THREE.BoxGeometry(.10, .025, .30), saddleMat).translateY(1.235).translateZ(.30));
  // Saddle rails
  [-.03, .03].forEach(x => {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(.003, .003, .18, 4), MAT.chrome);
    rail.position.set(x, 1.215, .30);
    rail.rotation.x = Math.PI / 2;
    bikeGrp.add(rail);
  });

  // Chainring + cranks
  const chainring = new THREE.Mesh(new THREE.TorusGeometry(.10, .012, 6, 24), MAT.gold);
  chainring.position.copy(P.bb);
  chainring.rotation.y = Math.PI / 2;
  bikeGrp.add(chainring);
  const chainring2 = new THREE.Mesh(new THREE.TorusGeometry(.07, .008, 6, 18), MAT.chrome);
  chainring2.position.copy(P.bb);
  chainring2.rotation.y = Math.PI / 2;
  bikeGrp.add(chainring2);

  const crankGrp = new THREE.Group();
  crankGrp.position.copy(P.bb);
  const cAG = new THREE.BoxGeometry(.02, .17, .012);
  crankGrp.add(new THREE.Mesh(cAG, mAero).translateX(.06).translateY(.085));
  crankGrp.add(new THREE.Mesh(cAG, mAero).translateX(-.06).translateY(-.085));
  // Clipless pedals
  const pG = new THREE.BoxGeometry(.07, .012, .04);
  crankGrp.add(new THREE.Mesh(pG, MAT.chrome).translateX(.06).translateY(.17));
  crankGrp.add(new THREE.Mesh(pG, MAT.chrome).translateX(-.06).translateY(-.17));
  bikeGrp.add(crankGrp);

  // Sprocket cassette
  const sprocket = new THREE.Mesh(new THREE.TorusGeometry(.05, .008, 6, 16), MAT.chrome);
  sprocket.position.copy(P.rear);
  sprocket.rotation.y = Math.PI / 2;
  bikeGrp.add(sprocket);
  const sprocket2 = new THREE.Mesh(new THREE.TorusGeometry(.04, .006, 4, 14), MAT.chrome);
  sprocket2.position.copy(P.rear).add(new THREE.Vector3(.01, 0, 0));
  sprocket2.rotation.y = Math.PI / 2;
  bikeGrp.add(sprocket2);

  // Chain
  const mChn = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: .6, roughness: .5 });
  bikeGrp.add(new THREE.Mesh(new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([P.bb.clone().add(new THREE.Vector3(0, -.07, 0)), P.rear.clone().add(new THREE.Vector3(0, -.03, 0))]),
    8, .006, 4, false), mChn));
  bikeGrp.add(new THREE.Mesh(new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([P.rear.clone().add(new THREE.Vector3(0, .03, 0)), P.bb.clone().add(new THREE.Vector3(0, .07, 0))]),
    8, .006, 4, false), mChn));

  // Rear derailleur
  const deraGrp = new THREE.Group();
  deraGrp.position.copy(P.rear).add(new THREE.Vector3(.04, -.05, 0));
  deraGrp.add(gm(GEO.box, mAero, .02, .06, .03));
  deraGrp.add(new THREE.Mesh(new THREE.TorusGeometry(.015, .004, 4, 8), MAT.chrome).translateY(-.04));
  bikeGrp.add(deraGrp);

  // Water bottle
  bikeGrp.add(new THREE.Mesh(new THREE.CylinderGeometry(.032, .035, .20, 8),
    new THREE.MeshStandardMaterial({ color: 0x2288ff, roughness: .5 })).translateY(.72).translateZ(-.18));
  // Bottle cage
  [-.035, .035].forEach(x => {
    bikeGrp.add(new THREE.Mesh(new THREE.CylinderGeometry(.002, .002, .15, 4), MAT.chrome).translateX(x).translateY(.70).translateZ(-.18));
  });

  // Race number plate (on handlebar)
  const numPlate = new THREE.Mesh(new THREE.PlaneGeometry(.1, .07), raceNumMat);
  numPlate.position.set(0, 1.05, -.73);
  bikeGrp.add(numPlate);

  // Headlight
  const headL = new THREE.SpotLight(0xffffee, 2.5, 40, .5, .6, 1.2);
  headL.position.set(0, .9, -.85);
  headL.target.position.set(0, 0, -12);
  bikeGrp.add(headL, headL.target);
  bikeGrp.add(new THREE.Mesh(new THREE.SphereGeometry(.03, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffcc })).translateY(.9).translateZ(-.88));

  // Taillight
  bikeGrp.add(new THREE.Mesh(new THREE.BoxGeometry(.04, .03, .015), new THREE.MeshBasicMaterial({ color: 0xff2200 })).translateY(1.15).translateZ(.42));

  // GPS computer on handlebar
  const gpsMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: .4, metalness: .2 });
  const gpsScreen = new THREE.MeshBasicMaterial({ color: 0x44ff88 });
  bikeGrp.add(gm(GEO.box, gpsMat, .04, .03, .025).translateY(1.16).translateZ(-.82));
  bikeGrp.add(gm(GEO.box, gpsScreen, .032, .022, .001).translateY(1.165).translateZ(-.808));

  return { bikeGrp, frontW, rearW, crankGrp, chainring, sprocket };
}

// --- Build stunning pro cyclist rider ---
export function createRider(bikeGrp) {
  const riderGrp = new THREE.Group();
  bikeGrp.add(riderGrp);

  // Skinsuit material with jersey texture
  const suitMat = jerseyTexMat;
  const suitMat2 = jerseyTexMat2;

  // Hip
  const hipGrp = new THREE.Group();
  hipGrp.position.set(0, 1.18, .30);
  riderGrp.add(hipGrp);

  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(.10, 10, 8), MAT.shorts);
  pelvis.scale.set(1.2, .7, 1);
  pelvis.castShadow = true;
  hipGrp.add(pelvis);

  // Spine
  const spineGrp = new THREE.Group();
  spineGrp.position.set(0, .06, 0);
  hipGrp.add(spineGrp);

  // Lower torso - tapered waist
  spineGrp.add(mp(new THREE.Mesh(new THREE.CylinderGeometry(.09, .11, .16, 10), suitMat), { position: new THREE.Vector3(0, .08, 0), castShadow: true }));
  // Upper torso - broader chest
  spineGrp.add(mp(new THREE.Mesh(new THREE.CylinderGeometry(.13, .10, .28, 10), suitMat), { position: new THREE.Vector3(0, .30, 0), castShadow: true }));
  // Pectoral definition
  [-.04, .04].forEach(x => {
    const pec = new THREE.Mesh(new THREE.SphereGeometry(.04, 6, 6), suitMat);
    pec.scale.set(1.2, .7, .8);
    pec.position.set(x, .36, .06);
    spineGrp.add(pec);
  });

  // Jersey collar - white
  spineGrp.add(new THREE.Mesh(new THREE.CylinderGeometry(.125, .108, .04, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .7 })).translateY(.34));
  // Red accent stripe
  spineGrp.add(new THREE.Mesh(new THREE.CylinderGeometry(.126, .109, .018, 10), new THREE.MeshStandardMaterial({ color: 0xee2222, roughness: .7 })).translateY(.37));

  // Back pockets (3 pockets like real pro jersey)
  for (let i = -1; i <= 1; i++) spineGrp.add(new THREE.Mesh(new THREE.BoxGeometry(.055, .035, .025), suitMat2).translateX(i * .05).translateY(.17).translateZ(-.10));

  // Race number bib on back (canvas texture)
  const backNum = new THREE.Mesh(new THREE.PlaneGeometry(.14, .12), raceNumMat);
  backNum.position.set(0, .26, -.085);
  backNum.rotation.y = Math.PI;
  spineGrp.add(backNum);

  // Sponsor logo on chest
  const chestLogo = new THREE.Mesh(new THREE.PlaneGeometry(.10, .04),
    new THREE.MeshStandardMaterial({
      map: (() => {
        const c = document.createElement('canvas'); c.width = 128; c.height = 48;
        const ctx = c.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillRect(0, 0, 128, 48);
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center';
        ctx.fillText('FLOWKY', 64, 30);
        const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter; return t;
      })(),
      transparent: true, roughness: .5, side: THREE.DoubleSide
    })
  );
  chestLogo.position.set(0, .36, .095);
  spineGrp.add(chestLogo);

  // Shoulders (broader, more defined)
  const shY = .44, shX = .14;
  [-1, 1].forEach(s => {
    const sh = new THREE.Mesh(new THREE.SphereGeometry(.055, 8, 8), suitMat);
    sh.scale.set(1.15, .8, 1);
    sh.position.set(s * shX, shY, 0);
    sh.castShadow = true;
    spineGrp.add(sh);
    // Deltoid muscle bump
    const delt = new THREE.Mesh(new THREE.SphereGeometry(.03, 6, 6), suitMat);
    delt.position.set(s * (shX + .02), shY - .03, .01);
    spineGrp.add(delt);
  });

  // Neck + Head
  const neckGrp = new THREE.Group();
  neckGrp.position.set(0, .48, .02);
  spineGrp.add(neckGrp);
  // Thicker muscular neck
  neckGrp.add(new THREE.Mesh(new THREE.CylinderGeometry(.032, .038, .06, 8), MAT.skin));
  // Neck tendons
  [-.015, .015].forEach(x => {
    neckGrp.add(new THREE.Mesh(new THREE.CylinderGeometry(.004, .006, .05, 4), MAT.skin).translateX(x).translateZ(.02));
  });

  const headGrp = new THREE.Group();
  headGrp.position.set(0, .06, 0);
  neckGrp.add(headGrp);

  // Skull
  const sk = new THREE.Mesh(new THREE.SphereGeometry(.082, 12, 10), MAT.skin);
  sk.scale.set(.95, 1.05, .90);
  sk.castShadow = true;
  headGrp.add(sk);

  // Jaw/chin - stronger jaw
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(.032, 6, 6), MAT.skin);
  jaw.position.set(0, -.06, .05);
  jaw.scale.set(1.1, .55, 1);
  headGrp.add(jaw);
  // Cheekbones
  [-.04, .04].forEach(x => {
    headGrp.add(new THREE.Mesh(new THREE.SphereGeometry(.015, 4, 4), MAT.skin).translateX(x).translateY(-.01).translateZ(.065));
  });

  // Nose
  headGrp.add(new THREE.Mesh(new THREE.ConeGeometry(.012, .03, 4), MAT.skin).translateY(-.015).translateZ(.08).rotateX(-.3));

  // Ears
  [-.075, .075].forEach(x => {
    headGrp.add(new THREE.Mesh(new THREE.SphereGeometry(.012, 4, 4), MAT.skin).translateX(x).translateY(0).translateZ(0));
  });

  // Aero helmet (smooth, elongated)
  headGrp.add(mp(new THREE.Mesh(new THREE.SphereGeometry(.098, 12, 10, 0, Math.PI * 2, 0, Math.PI * .62), MAT.helmet), { position: new THREE.Vector3(0, .01, 0), castShadow: true }));
  // Helmet vents (aerodynamic slits)
  for (let i = -2; i <= 2; i++) headGrp.add(new THREE.Mesh(new THREE.BoxGeometry(.008, .003, .06), MAT.dark).translateX(i * .022).translateY(.088).translateZ(-.015));
  // Aero tail (long teardrop shape)
  const ht = new THREE.Mesh(new THREE.CylinderGeometry(.028, .004, .24, 6), MAT.helmet2);
  ht.rotation.x = .65;
  ht.position.set(0, .03, -.16);
  headGrp.add(ht);

  // Iridescent visor shield (full face)
  const visorMat = new THREE.MeshStandardMaterial({
    color: 0x2244aa, metalness: .98, roughness: .02,
    transparent: true, opacity: .88, envMapIntensity: 2.0,
  });
  const visor = new THREE.Mesh(new THREE.SphereGeometry(.092, 10, 8, 0, Math.PI, 0, Math.PI * .38), visorMat);
  visor.position.set(0, .005, .06);
  visor.rotation.x = 0.15;
  headGrp.add(visor);

  // Arms
  function mkArm(side) {
    const sp = new THREE.Group();
    sp.position.set(side * shX, shY, 0);
    const sg = new THREE.Group();
    // Upper arm (bicep/tricep shape)
    const u = new THREE.Mesh(new THREE.CylinderGeometry(.040, .034, .22, 8), suitMat);
    u.position.y = -.11;
    u.castShadow = true;
    sg.add(u);
    // Bicep bulge
    const bicep = new THREE.Mesh(new THREE.SphereGeometry(.025, 6, 6), suitMat);
    bicep.position.set(side * .01, -.08, .02);
    sg.add(bicep);
    // Sleeve cuff
    sg.add(new THREE.Mesh(new THREE.CylinderGeometry(.035, .038, .015, 8), suitMat2).translateY(-.21));
    sp.add(sg);
    const ep = new THREE.Group();
    ep.position.set(0, -.22, 0);
    ep.add(new THREE.Mesh(new THREE.SphereGeometry(.024, 6, 6), MAT.skin));
    // Forearm (with muscle taper)
    const fa = new THREE.Mesh(new THREE.CylinderGeometry(.030, .022, .20, 8), MAT.skin);
    fa.position.y = -.10;
    fa.castShadow = true;
    ep.add(fa);
    // Forearm muscle bump
    ep.add(new THREE.Mesh(new THREE.SphereGeometry(.018, 4, 4), MAT.skin).translateY(-.06).translateZ(.015));
    // Wrist + veins
    ep.add(new THREE.Mesh(new THREE.CylinderGeometry(.018, .020, .03, 6), MAT.skin).translateY(-.18));
    // Glove (aero cut with fingers)
    const wp = new THREE.Group();
    wp.position.set(0, -.20, 0);
    // Palm
    wp.add(new THREE.Mesh(new THREE.BoxGeometry(.038, .022, .048), MAT.glove).translateY(-.008).translateZ(.005));
    // Fingers (4 grouped)
    for (let f = 0; f < 4; f++) {
      wp.add(new THREE.Mesh(new THREE.CylinderGeometry(.005, .004, .025, 4), MAT.glove)
        .translateX(-.012 + f * .008).translateY(-.025).translateZ(.02));
    }
    // Thumb
    wp.add(new THREE.Mesh(new THREE.CylinderGeometry(.005, .005, .02, 4), MAT.glove)
      .translateX(side * .018).translateY(-.01).translateZ(-.01));
    // Gel padding on palm
    wp.add(new THREE.Mesh(new THREE.BoxGeometry(.025, .005, .02),
      new THREE.MeshStandardMaterial({ color: 0x333333, roughness: .5 }))
      .translateY(.005).translateZ(.01));
    ep.add(wp);
    sp.add(ep);
    sp.userData = { elbow: ep, wrist: wp, side };
    return sp;
  }
  const lArm = mkArm(1), rArm = mkArm(-1);
  spineGrp.add(lArm, rArm);

  // Legs (muscular cyclist legs - quads, hamstrings, calves)
  function mkLeg(side) {
    const hp = new THREE.Group();
    hp.position.set(side * .07, -.04, .01);
    // Thigh (powerful quad)
    hp.add(mp(new THREE.Mesh(new THREE.CylinderGeometry(.070, .052, .30, 10), MAT.shorts), { position: new THREE.Vector3(0, -.15, 0), castShadow: true }));
    // Quad muscle definition (front bulge)
    const quad = new THREE.Mesh(new THREE.SphereGeometry(.035, 6, 6), MAT.shorts);
    quad.scale.set(.8, 1.8, .9);
    quad.position.set(0, -.12, .04);
    hp.add(quad);
    // Inner quad sweep (vastus medialis - "teardrop")
    hp.add(new THREE.Mesh(new THREE.SphereGeometry(.022, 4, 4), MAT.shorts)
      .translateX(-side * .03).translateY(-.25).translateZ(.02));
    // Hamstring (rear bulge)
    const ham = new THREE.Mesh(new THREE.SphereGeometry(.028, 6, 6), MAT.shorts);
    ham.scale.set(.8, 1.6, .8);
    ham.position.set(0, -.15, -.035);
    hp.add(ham);
    // Shorts cuff (laser-cut edge)
    hp.add(new THREE.Mesh(new THREE.CylinderGeometry(.053, .055, .012, 10),
      new THREE.MeshStandardMaterial({ color: 0x222244, roughness: .5 })).translateY(-.295));

    const kp = new THREE.Group();
    kp.position.set(0, -.30, 0);
    // Knee cap
    kp.add(new THREE.Mesh(new THREE.SphereGeometry(.032, 6, 6), MAT.skin).translateZ(.015));
    // Shin (with defined calf)
    kp.add(mp(new THREE.Mesh(new THREE.CylinderGeometry(.042, .030, .26, 8), MAT.skin), { position: new THREE.Vector3(0, -.13, 0), castShadow: true }));
    // Calf muscle (gastrocnemius - two heads)
    const calf1 = new THREE.Mesh(new THREE.SphereGeometry(.032, 6, 6), MAT.skin);
    calf1.scale.set(.75, 1.8, .85);
    calf1.position.set(-.01, -.07, -.028);
    kp.add(calf1);
    const calf2 = new THREE.Mesh(new THREE.SphereGeometry(.028, 6, 6), MAT.skin);
    calf2.scale.set(.7, 1.5, .8);
    calf2.position.set(.01, -.09, -.025);
    kp.add(calf2);
    // Achilles tendon
    kp.add(new THREE.Mesh(new THREE.CylinderGeometry(.008, .010, .06, 4), MAT.skin).translateY(-.22).translateZ(-.02));
    // Ankle bone
    [-.018, .018].forEach(x => {
      kp.add(new THREE.Mesh(new THREE.SphereGeometry(.008, 4, 4), MAT.skin).translateX(x).translateY(-.24));
    });

    // Tall cycling socks (team color stripe)
    kp.add(new THREE.Mesh(new THREE.CylinderGeometry(.032, .030, .10, 8), MAT.sock).translateY(-.20));
    // Sock stripe
    kp.add(new THREE.Mesh(new THREE.CylinderGeometry(.033, .031, .01, 8),
      new THREE.MeshStandardMaterial({ color: 0xee2222, roughness: .6 })).translateY(-.175));

    // Pro cycling shoe (stiff carbon sole, BOA dial)
    const sg = new THREE.Group();
    sg.position.set(0, -.27, 0);
    // Shoe body
    sg.add(new THREE.Mesh(new THREE.BoxGeometry(.052, .03, .13), MAT.shoe).translateY(-.012).translateZ(.018));
    // Carbon sole (stiff, visible)
    sg.add(new THREE.Mesh(new THREE.BoxGeometry(.054, .006, .13),
      new THREE.MeshStandardMaterial({ color: 0x111111, metalness: .3, roughness: .2 })).translateY(-.03).translateZ(.018));
    // Red accent on heel
    sg.add(new THREE.Mesh(new THREE.BoxGeometry(.052, .02, .015),
      new THREE.MeshStandardMaterial({ color: 0xcc1111, roughness: .5, metalness: .2 })).translateZ(-.04));
    // BOA dial (small metallic disc on side)
    sg.add(new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .004, 6), MAT.chrome)
      .translateX(side * .027).translateY(.005).translateZ(.01).rotateZ(Math.PI / 2));
    // Cleat
    sg.add(new THREE.Mesh(new THREE.BoxGeometry(.025, .005, .035), MAT.dark).translateY(-.035).translateZ(.005));
    // Heel reflector
    sg.add(new THREE.Mesh(new THREE.BoxGeometry(.025, .015, .012),
      new THREE.MeshStandardMaterial({ color: 0xff3333, roughness: .6 })).translateZ(-.048));
    kp.add(sg);
    hp.add(kp);
    hp.userData = { knee: kp, side };
    return hp;
  }
  const lLeg = mkLeg(1), rLeg = mkLeg(-1);
  hipGrp.add(lLeg, rLeg);

  return { riderGrp, hipGrp, spineGrp, neckGrp, headGrp, lArm, rArm, lLeg, rLeg };
}

// --- Create a multiplayer bike (colored, with name label) ---
export function createPlayerBike(color, playerName) {
  const bikeData = createBike();
  const { bikeGrp } = bikeData;

  // Re-color the frame
  const frameMat = new THREE.MeshStandardMaterial({ color, metalness: .65, roughness: .2 });
  const frameMat2 = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.8), metalness: .65, roughness: .2 });
  bikeGrp.traverse(o => {
    if (o.isMesh) {
      if (o.material === MAT.frame) o.material = frameMat;
      if (o.material === MAT.frame2) o.material = frameMat2;
    }
  });

  // Add rider
  const riderData = createRider(bikeGrp);
  // Color rider helmet + jersey to match team
  const helmetMat = new THREE.MeshStandardMaterial({ color, metalness: .35, roughness: .35 });
  const teamJerseyMat = new THREE.MeshStandardMaterial({ color, roughness: .65, metalness: .05 });
  bikeGrp.traverse(o => {
    if (o.isMesh) {
      if (o.material === MAT.helmet) o.material = helmetMat;
      if (o.material === MAT.helmet2) o.material = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.85), metalness: .35, roughness: .35 });
      if (o.material === jerseyTexMat || o.material === jerseyTexMat2) o.material = teamJerseyMat;
    }
  });

  // Floating name label
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath();
  if (ctx.roundRect) { ctx.roundRect(4, 4, 248, 56, 12); }
  else { ctx.rect(4, 4, 248, 56); }
  ctx.fill();
  ctx.font = 'bold 28px Orbitron, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#' + new THREE.Color(color).getHexString();
  ctx.fillText(playerName.substring(0, 12), 128, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const nameSprite = new THREE.Sprite(spriteMat);
  nameSprite.scale.set(2.5, 0.625, 1);
  nameSprite.position.set(0, 2.5, 0);
  bikeGrp.add(nameSprite);

  // Disable shadows + lights for performance on opponents
  bikeGrp.traverse(o => {
    if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; }
    if (o.isLight && !(o instanceof THREE.AmbientLight)) o.visible = false;
  });

  return { ...bikeData, ...riderData, nameSprite };
}
