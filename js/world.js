// ============================================================
// GEAR GRINDER - WORLD (Road, Scenery, Obstacles, Particles)
// Tour de France atmosphere with flowky.ai branding
// ============================================================

import { scene, MAT, GEO, ROAD_GEO, gm, mp, shirtMats, hairMats, carMats } from './renderer.js';
import {
  RW, RSL, SEG_LEN, RCOUNT, ROAD_DRAW_DIST, SHOULDER_W,
  CURB_H, LANE_W, LANES, ROAD_EDGE, SCENERY_COUNT, SCENERY_SPACING,
  POWERUPS,
} from './constants.js';
import { S } from './state.js';

const THREE = window.THREE;

// ============================================================
// CANVAS TEXTURE HELPERS (for branding text)
// ============================================================
function mkTextTexture(text, opts = {}) {
  const w = opts.w || 512, h = opts.h || 128;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');

  // Background
  ctx.fillStyle = opts.bg || '#7c3aed';
  ctx.fillRect(0, 0, w, h);

  // Optional border
  if (opts.border) {
    ctx.strokeStyle = opts.border;
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, w - 6, h - 6);
  }

  // Text
  ctx.fillStyle = opts.color || '#ffffff';
  ctx.font = opts.font || 'bold 56px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2);

  // Subtitle
  if (opts.sub) {
    ctx.fillStyle = opts.subColor || '#e0d0ff';
    ctx.font = opts.subFont || 'bold 22px Arial, sans-serif';
    ctx.fillText(opts.sub, w / 2, h * .78);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

// Pre-build brand textures
const flowkyBannerTex = mkTextTexture('FLOWKY.AI', {
  w: 512, h: 128, bg: '#7c3aed', color: '#ffffff',
  font: 'bold 64px Arial, sans-serif',
  sub: 'OFFICIAL SPONSOR', subColor: '#d0c0ff', subFont: 'bold 18px Arial, sans-serif'
});
const flowkyArchTex = mkTextTexture('FLOWKY.AI', {
  w: 1024, h: 192, bg: '#4c1d95', color: '#ffffff',
  font: 'bold 100px Arial, sans-serif', border: '#a855f7',
  sub: 'POWERED BY AI', subColor: '#c4b5fd', subFont: 'bold 30px Arial, sans-serif'
});
const tdfStartTex = mkTextTexture('GEAR GRINDER', {
  w: 1024, h: 192, bg: '#ffdd00', color: '#111111',
  font: 'bold 90px Arial, sans-serif',
  sub: 'FLOWKY.AI GRAND TOUR', subColor: '#333333', subFont: 'bold 28px Arial, sans-serif'
});
const sponsorTex1 = mkTextTexture('FLOWKY.AI', {
  w: 256, h: 64, bg: '#7c3aed', color: '#fff',
  font: 'bold 36px Arial, sans-serif'
});
const kmBannerTex = mkTextTexture('KM', {
  w: 128, h: 128, bg: '#222222', color: '#ffdd00',
  font: 'bold 60px Arial, sans-serif'
});

// Material from canvas texture
function texMat(tex, opts = {}) {
  return new THREE.MeshStandardMaterial({
    map: tex,
    roughness: opts.roughness || .5,
    metalness: opts.metalness || .05,
    side: opts.side || THREE.DoubleSide,
    ...(opts.emissive ? { emissive: opts.emissive, emissiveIntensity: opts.emissiveI || .2, emissiveMap: tex } : {}),
  });
}

const flowkyBannerMat = texMat(flowkyBannerTex, { emissive: 0x7c3aed, emissiveI: .3 });
const flowkyArchMat = texMat(flowkyArchTex, { emissive: 0x4c1d95, emissiveI: .4 });
const tdfStartMat = texMat(tdfStartTex);
const sponsorMat = texMat(sponsorTex1, { emissive: 0x7c3aed, emissiveI: .2 });
const kmBannerMat = texMat(kmBannerTex);

// ============================================================
// ROAD
// ============================================================
export const roadSegs = [];
export const roadGrp = new THREE.Group();
scene.add(roadGrp);

const ROAD_SURFACE_W = 200;
export const seamRoadMat = MAT.road.clone();
export const seamRoad = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_SURFACE_W, ROAD_DRAW_DIST * 1.5), seamRoadMat);
seamRoad.rotation.x = -Math.PI / 2;
seamRoad.position.y = 0.005;
seamRoad.receiveShadow = true;
scene.add(seamRoad);

export function mkRoadSeg(z, idx) {
  const grp = new THREE.Group();
  grp.position.set(0, 0, z);

  [-1, 1].forEach(s => {
    const c = new THREE.Mesh(ROAD_GEO.curb, MAT.curb);
    c.position.set(s * (RW / 2 + SHOULDER_W + .075), CURB_H / 2, 0);
    c.castShadow = true;
    c.receiveShadow = true;
    grp.add(c);
  });

  [-1, 1].forEach(s => {
    const e = new THREE.Mesh(ROAD_GEO.edgeLine, MAT.edgeLine);
    e.rotation.x = -Math.PI / 2;
    e.position.set(s * (RW / 2 - .07), 0.015, 0);
    grp.add(e);
  });

  if (idx % 2 === 0) {
    const c = new THREE.Mesh(ROAD_GEO.centerDash, MAT.centerLine);
    c.rotation.x = -Math.PI / 2;
    c.position.set(0, 0.018, 0);
    grp.add(c);
  }

  [-LANE_W, LANE_W].forEach(x => {
    if (idx % 2 === 0) {
      const l = new THREE.Mesh(ROAD_GEO.laneDash, MAT.laneLine);
      l.rotation.x = -Math.PI / 2;
      l.position.set(x, 0.014, 0);
      grp.add(l);
    }
  });

  if (idx % 3 === 0) {
    [-1, 1].forEach(s => {
      for (let r = 0; r < 3; r++) {
        const b = new THREE.Mesh(ROAD_GEO.rumbleBump, MAT.rumble);
        b.position.set(s * (RW / 2 + .4), .02, (r - 1) * RSL * .3);
        grp.add(b);
      }
    });
  }

  if (idx % 8 === 0 && idx > 0) {
    [-1, 1].forEach(s => {
      const p = new THREE.Mesh(ROAD_GEO.guardPost, MAT.post);
      p.position.set(s * (RW / 2 + SHOULDER_W + .5), .3, 0);
      p.castShadow = true;
      grp.add(p);
      const rl = new THREE.Mesh(ROAD_GEO.guardRail, MAT.guard);
      rl.position.set(s * (RW / 2 + SHOULDER_W + .5), .45, 0);
      rl.castShadow = true;
      grp.add(rl);
      const rf = new THREE.Mesh(ROAD_GEO.reflector, MAT.refRed);
      rf.position.set(s * (RW / 2 + SHOULDER_W + .5), .45, s > .01 ? -.01 : .01);
      grp.add(rf);
    });
  }

  if (idx % 16 === 0 && idx > 0) {
    const mk = new THREE.Mesh(ROAD_GEO.marker, MAT.white);
    mk.position.set(RW / 2 + SHOULDER_W + .8, .25, 0);
    mk.castShadow = true;
    grp.add(mk);
    const bd = new THREE.Mesh(ROAD_GEO.markerBand, MAT.refGrn);
    bd.position.set(RW / 2 + SHOULDER_W + .8, .42, 0);
    grp.add(bd);
  }

  grp.userData = { idx };
  roadGrp.add(grp);
  return grp;
}

// Initialize road segments
for (let i = 0; i < RCOUNT; i++) roadSegs.push(mkRoadSeg(-i * RSL, i));

// Ground plane
export const gnd = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1800), MAT.ground);
gnd.rotation.x = -Math.PI / 2;
gnd.position.set(0, -.01, 0);
gnd.receiveShadow = true;
scene.add(gnd);

// Grid lines
const gridMat = new THREE.MeshBasicMaterial({ color: 0x1a1a28, transparent: true, opacity: .3 });
for (let i = -10; i <= 10; i++) {
  const g = new THREE.Mesh(new THREE.PlaneGeometry(.03, 1800), gridMat);
  g.rotation.x = -Math.PI / 2;
  g.position.set(i * 12, -.06, 0);
  scene.add(g);
}

// Stars
const sGeo = new THREE.BufferGeometry(), sP = [];
for (let i = 0; i < 2000; i++) sP.push((Math.random() - .5) * 300, Math.random() * 80 + 10, (Math.random() - .5) * 300);
sGeo.setAttribute('position', new THREE.Float32BufferAttribute(sP, 3));
scene.add(new THREE.Points(sGeo, new THREE.PointsMaterial({ color: 0xffffff, size: .1, transparent: true, opacity: .7 })));

// ============================================================
// SCENERY BUILDERS - ORIGINAL
// ============================================================
function mkTree() {
  const g = new THREE.Group();
  const h = 1.2 + Math.random() * .8;
  const trunk = gm(GEO.cylLo, MAT.bark, .08, h, .08);
  trunk.position.y = h / 2; trunk.castShadow = true; g.add(trunk);
  const fs = .5 + Math.random() * .4;
  const fol = gm(GEO.dodec, Math.random() > .5 ? MAT.leaf : MAT.leaf2, fs, fs * (1.2 + Math.random() * .4), fs);
  fol.position.y = h + .3 + Math.random() * .3; fol.castShadow = true; g.add(fol);
  return g;
}

function mkPineTree() {
  const g = new THREE.Group();
  const h = 2 + Math.random();
  const trunk = gm(GEO.cylLo, MAT.bark, .06, h, .06);
  trunk.position.y = h / 2; trunk.castShadow = true; g.add(trunk);
  for (let i = 0; i < 3; i++) {
    const s = .6 - .15 * i;
    const cn = gm(GEO.coneLo, MAT.leaf, s, .7, s);
    cn.position.y = h * .5 + i * .55; cn.castShadow = true; g.add(cn);
  }
  return g;
}

function mkLamp() {
  const g = new THREE.Group();
  g.add(gm(GEO.cylLo, MAT.pole, .03, 4, .03).translateY(2));
  g.add(gm(GEO.box, MAT.metal, .08, .04, .3).translateX(0).translateY(4).translateZ(-.1));
  // Emissive glow instead of PointLight for performance
  g.add(gm(GEO.sphLo, MAT.lampGlow, .08, .08, .08).translateY(3.95).translateZ(-.2));
  return g;
}

function mkBarrier() {
  const g = new THREE.Group();
  const w = 1.5 + Math.random();
  g.add(gm(GEO.box, MAT.conc, w, .8, .15).translateY(.4));
  for (let i = 0; i < Math.floor(w / .4); i++) {
    g.add(gm(GEO.box, i % 2 ? MAT.red : MAT.white, .05, .6, .16).translateX(-w / 2 + .2 + i * .4).translateY(.4));
  }
  return g;
}

function mkCar() {
  const g = new THREE.Group();
  const bodyMat = carMats[Math.floor(Math.random() * carMats.length)];
  g.add(gm(GEO.box, bodyMat, 1.6, .5, 3.2).translateY(.45));
  g.add(gm(GEO.box, bodyMat, 1.3, .45, 1.6).translateY(.85).translateZ(-.15));
  g.add(gm(GEO.box, MAT.glass, 1.31, .35, 1.5).translateY(.87).translateZ(-.15));
  [[-0.7, 0.2, -0.9], [0.7, 0.2, -0.9], [-0.7, 0.2, 0.9], [0.7, 0.2, 0.9]].forEach(([x, y, z]) =>
    g.add(gm(GEO.cyl, MAT.carTire, .18, .12, .18).translateX(x).translateY(y).translateZ(z)));
  g.add(gm(GEO.box, MAT.headlight, .2, .1, .02).translateX(-.5).translateY(.45).translateZ(-1.61));
  g.add(gm(GEO.box, MAT.headlight, .2, .1, .02).translateX(.5).translateY(.45).translateZ(-1.61));
  g.add(gm(GEO.box, MAT.taillight, .15, .08, .02).translateX(-.55).translateY(.45).translateZ(1.61));
  g.add(gm(GEO.box, MAT.taillight, .15, .08, .02).translateX(.55).translateY(.45).translateZ(1.61));
  g.rotation.y = Math.random() * 0.3 - 0.15;
  return g;
}

function mkVan() {
  const g = new THREE.Group();
  const matVanBody = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: .6, metalness: .1 });
  g.add(gm(GEO.box, matVanBody, 1.8, 1.4, 3.5).translateY(.9));
  g.add(gm(GEO.box, MAT.glass, 1.5, .5, 1).translateY(1.35).translateZ(-1));
  [[-0.8, 0.2, -1.1], [0.8, 0.2, -1.1], [-0.8, 0.2, 1.1], [0.8, 0.2, 1.1]].forEach(([x, y, z]) =>
    g.add(gm(GEO.cyl, MAT.carTire, .22, .14, .22).translateX(x).translateY(y).translateZ(z)));
  return g;
}

function mkBuilding() {
  const g = new THREE.Group();
  const w = 2 + Math.random() * 3, h = 3 + Math.random() * 6, d = 2 + Math.random() * 2;
  const bMat = Math.random() > .5 ? MAT.brick : MAT.brick2;
  g.add(mp(gm(GEO.box, bMat, w, h, d), { position: new THREE.Vector3(0, h / 2, 0), castShadow: true, receiveShadow: true }));
  g.add(gm(GEO.box, MAT.conc2, w + .2, .15, d + .2).translateY(h + .075));
  const wRows = Math.floor(h / 1.2), wCols = Math.max(1, Math.floor(w / 1.2));
  for (let r = 0; r < wRows; r++) for (let c = 0; c < wCols; c++) {
    const wx = -w / 2 + .6 + c * (w - 1) / Math.max(1, wCols - 1 || 1);
    const wy = 1 + r * 1.2;
    if (wy < h - .5) {
      g.add(gm(GEO.box, Math.random() > .4 ? MAT.litWindow : MAT.glass, .4, .5, .02)
        .translateX(wCols > 1 ? wx : 0).translateY(wy).translateZ(-d / 2 - .01));
    }
  }
  g.add(gm(GEO.box, MAT.conc, .5, .9, .02).translateY(.45).translateZ(-d / 2 - .01));
  return g;
}

function mkSpectator() {
  const g = new THREE.Group();
  const shirt = shirtMats[Math.floor(Math.random() * shirtMats.length)];
  const hair = hairMats[Math.floor(Math.random() * hairMats.length)];
  g.add(gm(GEO.cyl, MAT.pants, .04, .5, .04).translateX(-.06).translateY(.25));
  g.add(gm(GEO.cyl, MAT.pants, .04, .5, .04).translateX(.06).translateY(.25));
  const torso = gm(GEO.cyl, shirt, .10, .4, .08); torso.position.y = .7; torso.castShadow = true; g.add(torso);
  const head = gm(GEO.sphere, MAT.skinNPC, .08, .084, .072); head.position.y = 1.0; head.castShadow = true; g.add(head);
  g.add(gm(GEO.sphere, hair, .082, .082, .082).translateY(1.02));
  const cheering = Math.random() > .4;
  [-1, 1].forEach(s => {
    const arm = gm(GEO.cylLo, shirt, .025, .35, .025);
    if (cheering && s > 0) { arm.position.set(s * .14, 1.05, 0); arm.rotation.z = s * (-0.3 - Math.random() * .8); }
    else { arm.position.set(s * .14, .7, 0); arm.rotation.z = s * .15; }
    g.add(arm);
  });
  if (Math.random() > .6) {
    g.add(gm(GEO.cylLo, MAT.pole, .008, .6, .008).translateX(.14).translateY(1.2));
    g.add(gm(GEO.plane, Math.random() > .5 ? MAT.banner : MAT.flowkyPurple, .25, .15, 1).translateX(.14).translateY(1.45).translateZ(.05));
  }
  return g;
}

function mkSpectatorGroup() {
  const g = new THREE.Group();
  const count = 3 + Math.floor(Math.random() * 6);
  for (let i = 0; i < count; i++) {
    const s = mkSpectator();
    s.position.set((i - count / 2) * .35 + Math.random() * .1, 0, Math.random() * .3);
    s.rotation.y = Math.random() * .4 - .2;
    g.add(s);
  }
  // Crowd barrier with sponsor banner
  if (Math.random() > .2) {
    const bw = count * .4;
    g.add(gm(GEO.box, MAT.metal, bw, .7, .08).translateY(.35).translateZ(-.25));
    // Sponsor banner on barrier
    const bannerM = new THREE.Mesh(new THREE.PlaneGeometry(bw * .8, .35), sponsorMat);
    bannerM.position.set(0, .5, -.3);
    g.add(bannerM);
  }
  return g;
}

// ============================================================
// SCENERY BUILDERS - TOUR DE FRANCE / FLOWKY
// ============================================================

// Flowky.ai branded banner arch over the road
function mkFlowkyArch() {
  const g = new THREE.Group();
  const halfW = RW / 2 + SHOULDER_W + 1.5;
  const archH = 6.5;
  const legR = .18;

  // Two tall purple legs
  [-1, 1].forEach(s => {
    g.add(gm(GEO.cyl, MAT.flowkyPurple, legR, archH, legR).translateX(s * halfW).translateY(archH / 2));
    // Glowing accents on legs
    g.add(gm(GEO.cyl, MAT.flowkyGlow, legR + .02, .15, legR + .02).translateX(s * halfW).translateY(archH - .5));
    g.add(gm(GEO.cyl, MAT.flowkyGlow, legR + .02, .15, legR + .02).translateX(s * halfW).translateY(1));
    // Base plates
    g.add(gm(GEO.box, MAT.flowkyDark, .5, .1, .5).translateX(s * halfW).translateY(.05));
  });

  // Main banner beam
  const bw = halfW * 2;
  g.add(gm(GEO.box, MAT.flowkyDark, bw, .8, .15).translateY(archH + .2));

  // Flowky banner texture on front and back
  const bannerMesh = new THREE.Mesh(new THREE.PlaneGeometry(bw * .9, .7), flowkyArchMat);
  bannerMesh.position.set(0, archH + .2, .09);
  g.add(bannerMesh);
  const bannerBack = bannerMesh.clone();
  bannerBack.position.z = -.09;
  bannerBack.rotation.y = Math.PI;
  g.add(bannerBack);

  // Emissive glow bar under the arch (no PointLight for perf)
  g.add(gm(GEO.box, MAT.flowkyGlow, bw * .6, .1, .1).translateY(archH - .3));

  // Glowing dot accents on top
  [-1, 0, 1].forEach(x => {
    g.add(gm(GEO.sphLo, MAT.flowkyGlow, .08, .08, .08).translateX(x * (bw * .3)).translateY(archH + .7));
  });

  g.userData._centered = true;
  return g;
}

// Large inflatable start/finish arch (Tour de France style)
function mkInflatableArch() {
  const g = new THREE.Group();
  const halfW = RW / 2 + SHOULDER_W + 1;
  const archH = 5.5;
  const tubeR = .4;

  // Use yellow or red inflatable
  const iMat = Math.random() > .5 ? MAT.inflatable : MAT.inflatableYlw;

  // Two inflatable legs (fat tubes)
  [-1, 1].forEach(s => {
    g.add(gm(GEO.cyl, iMat, tubeR, archH, tubeR).translateX(s * halfW).translateY(archH / 2));
    // Bulgy base
    g.add(gm(GEO.sphere, iMat, tubeR * 1.3, tubeR * .8, tubeR * 1.3).translateX(s * halfW).translateY(.2));
  });

  // Top inflatable crossbar (slightly arched look using box)
  g.add(gm(GEO.box, iMat, halfW * 2.1, tubeR * 2, tubeR * 1.5).translateY(archH + tubeR * .5));

  // Sponsor banner on front
  const bannerW = halfW * 1.8;
  const bannerH = archH * .22;
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(bannerW, bannerH), tdfStartMat);
  banner.position.set(0, archH * .55, tubeR * .8);
  g.add(banner);
  const bannerRear = banner.clone();
  bannerRear.position.z = -tubeR * .8;
  bannerRear.rotation.y = Math.PI;
  g.add(bannerRear);

  // Flowky sub-banner below
  const subBanner = new THREE.Mesh(new THREE.PlaneGeometry(bannerW * .6, bannerH * .5), flowkyBannerMat);
  subBanner.position.set(0, archH * .35, tubeR * .8 + .01);
  g.add(subBanner);

  g.userData._centered = true;
  return g;
}

// Team support car with bike racks on roof
function mkTeamCar() {
  const g = new THREE.Group();
  const colors = [0xffdd00, 0x0066cc, 0xee2222, 0x00aa55, 0xff6600, 0x7c3aed];
  const teamColor = colors[Math.floor(Math.random() * colors.length)];
  const bodyMat = new THREE.MeshStandardMaterial({ color: teamColor, metalness: .4, roughness: .3 });

  // Car body - estate/wagon style
  g.add(gm(GEO.box, bodyMat, 1.7, .55, 3.8).translateY(.5));
  g.add(gm(GEO.box, bodyMat, 1.5, .5, 2.2).translateY(.95).translateZ(.1));
  g.add(gm(GEO.box, MAT.glass, 1.51, .4, 2.1).translateY(.97).translateZ(.1));

  // Wheels
  [[-0.75, 0.2, -1.2], [0.75, 0.2, -1.2], [-0.75, 0.2, 1.2], [0.75, 0.2, 1.2]].forEach(([x, y, z]) =>
    g.add(gm(GEO.cyl, MAT.carTire, .2, .14, .2).translateX(x).translateY(y).translateZ(z)));

  // Headlights & taillights
  g.add(gm(GEO.box, MAT.headlight, .2, .1, .02).translateX(-.5).translateY(.5).translateZ(-1.91));
  g.add(gm(GEO.box, MAT.headlight, .2, .1, .02).translateX(.5).translateY(.5).translateZ(-1.91));
  g.add(gm(GEO.box, MAT.taillight, .15, .08, .02).translateX(-.6).translateY(.5).translateZ(1.91));
  g.add(gm(GEO.box, MAT.taillight, .15, .08, .02).translateX(.6).translateY(.5).translateZ(1.91));

  // Roof rack (metal frame)
  g.add(gm(GEO.box, MAT.roofRack, 1.3, .04, 2).translateY(1.24).translateZ(.1));
  [-1, 1].forEach(s => {
    g.add(gm(GEO.box, MAT.roofRack, .04, .06, 2).translateX(s * .6).translateY(1.26).translateZ(.1));
  });

  // Bikes on roof (3 bikes simplified as colored bars + wheels)
  for (let i = 0; i < 3; i++) {
    const bx = -.4 + i * .4;
    const bikeColor = new THREE.MeshStandardMaterial({ color: colors[Math.floor(Math.random() * colors.length)], metalness: .5, roughness: .3 });
    // Frame triangle
    g.add(gm(GEO.box, bikeColor, .03, .15, .5).translateX(bx).translateY(1.38).translateZ(.1));
    // Wheels
    g.add(gm(GEO.cyl, MAT.dark, .08, .03, .08).translateX(bx).translateY(1.32).translateZ(-.12));
    g.add(gm(GEO.cyl, MAT.dark, .08, .03, .08).translateX(bx).translateY(1.32).translateZ(.32));
  }

  // Number panel on side
  const numTex = mkTextTexture(String(Math.floor(Math.random() * 9) + 1), {
    w: 64, h: 64, bg: '#ffffff', color: '#111111', font: 'bold 44px Arial'
  });
  const numMat = new THREE.MeshStandardMaterial({ map: numTex, roughness: .5 });
  const numPanel = new THREE.Mesh(new THREE.PlaneGeometry(.3, .25), numMat);
  numPanel.position.set(.86, .65, -.5);
  numPanel.rotation.y = Math.PI / 2;
  g.add(numPanel);

  // Sponsor sticker
  const stickerMesh = new THREE.Mesh(new THREE.PlaneGeometry(.6, .2), sponsorMat);
  stickerMesh.position.set(.86, .4, .3);
  stickerMesh.rotation.y = Math.PI / 2;
  g.add(stickerMesh);

  g.rotation.y = Math.random() * .3 - .15;
  return g;
}

// Flowky.ai branded building/booth
function mkFlowkyBuilding() {
  const g = new THREE.Group();
  const w = 3 + Math.random() * 2;
  const h = 4 + Math.random() * 3;
  const d = 2.5 + Math.random() * 1.5;

  // Main structure - purple themed
  g.add(mp(gm(GEO.box, MAT.flowkyDark, w, h, d), {
    position: new THREE.Vector3(0, h / 2, 0), castShadow: true, receiveShadow: true
  }));

  // White top trim
  g.add(gm(GEO.box, MAT.flowkyWhite, w + .2, .2, d + .2).translateY(h + .1));

  // Glowing purple accent stripe
  g.add(gm(GEO.box, MAT.flowkyGlow, w + .05, .12, d + .05).translateY(h * .7));

  // Large "FLOWKY.AI" banner on face
  const bannerMesh = new THREE.Mesh(new THREE.PlaneGeometry(w * .85, h * .25), flowkyBannerMat);
  bannerMesh.position.set(0, h * .45, -d / 2 - .02);
  g.add(bannerMesh);

  // Windows with purple tint
  const winMat = new THREE.MeshStandardMaterial({ color: 0x9966ff, metalness: .3, roughness: .1, transparent: true, opacity: .7 });
  const wRows = Math.floor(h / 1.5);
  const wCols = Math.max(1, Math.floor(w / 1.4));
  for (let r = 0; r < wRows; r++) for (let c = 0; c < wCols; c++) {
    const wx = -w / 2 + .7 + c * (w - 1.2) / Math.max(1, wCols - 1 || 1);
    const wy = 1.2 + r * 1.5;
    if (wy < h - .5 && wy > h * .55) {
      g.add(gm(GEO.box, winMat, .45, .55, .02)
        .translateX(wCols > 1 ? wx : 0).translateY(wy).translateZ(-d / 2 - .02));
    }
  }

  // Ground-level storefront glow (emissive, no PointLight)
  g.add(gm(GEO.box, MAT.flowkyGlow, w * .6, 1.2, .02).translateY(.7).translateZ(-d / 2 - .02));

  return g;
}

// Victory podium (Tour de France style)
function mkPodium() {
  const g = new THREE.Group();

  // Podium steps - 1st (center, tallest), 2nd (left), 3rd (right)
  g.add(gm(GEO.box, MAT.podiumGold, 1.2, 1.8, 1.2).translateY(.9));            // 1st
  g.add(gm(GEO.box, MAT.podiumSilver, 1.2, 1.3, 1.2).translateX(-1.3).translateY(.65)); // 2nd
  g.add(gm(GEO.box, MAT.podiumBronze, 1.2, 1.0, 1.2).translateX(1.3).translateY(.5));   // 3rd

  // Number labels
  ['1', '2', '3'].forEach((num, i) => {
    const x = i === 0 ? 0 : i === 1 ? -1.3 : 1.3;
    const y = i === 0 ? .9 : i === 1 ? .65 : .5;
    const nTex = mkTextTexture(num, {
      w: 64, h: 64, bg: '#222222', color: '#ffffff', font: 'bold 48px Arial'
    });
    const nMat = new THREE.MeshStandardMaterial({ map: nTex, roughness: .5 });
    const nMesh = new THREE.Mesh(new THREE.PlaneGeometry(.5, .5), nMat);
    nMesh.position.set(x, y, -.62);
    g.add(nMesh);
  });

  // Flowky logo on podium front
  const logoMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, .3), sponsorMat);
  logoMesh.position.set(0, .2, -.62);
  g.add(logoMesh);

  // Red carpet
  g.add(gm(GEO.box, MAT.inflatable, 4, .02, 3).translateY(.01).translateZ(1.5));

  return g;
}

// Race crowd barrier (long, with sponsor banners)
function mkCrowdBarrier() {
  const g = new THREE.Group();
  const sections = 3 + Math.floor(Math.random() * 4);
  const totalW = sections * 1.2;

  for (let i = 0; i < sections; i++) {
    const bx = (i - sections / 2) * 1.2;
    // Metal barrier frame
    g.add(gm(GEO.box, MAT.metal, 1.15, .9, .06).translateX(bx).translateY(.45));
    // Legs
    g.add(gm(GEO.box, MAT.metal, .04, .9, .3).translateX(bx - .5).translateY(.45));
    g.add(gm(GEO.box, MAT.metal, .04, .9, .3).translateX(bx + .5).translateY(.45));
  }

  // Sponsor banner across all sections
  const bannerMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(totalW * .85, .4),
    Math.random() > .4 ? flowkyBannerMat : sponsorMat
  );
  bannerMesh.position.set(0, .55, -.04);
  g.add(bannerMesh);

  return g;
}

// KM marker post (Tour de France distance markers)
function mkKmMarker() {
  const g = new THREE.Group();
  // Post
  g.add(gm(GEO.cyl, MAT.white, .04, 1.5, .04).translateY(.75));
  // KM sign
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(.4, .4), kmBannerMat);
  sign.position.set(0, 1.4, .03);
  g.add(sign);
  // Flowky.ai small tag below
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(.3, .1), sponsorMat);
  tag.position.set(0, 1.1, .03);
  g.add(tag);
  return g;
}

// Original banner arch (simpler, kept for variety)
function mkBannerArch() {
  const g = new THREE.Group();
  const halfW = RW / 2 + SHOULDER_W + 0.5;
  [-1, 1].forEach(s => g.add(gm(GEO.cyl, MAT.pole, .05, 5, .05).translateX(s * halfW).translateY(2.5)));
  const bw = halfW * 2;
  g.add(gm(GEO.box, Math.random() > .5 ? MAT.banner : MAT.banner2, bw, .7, .06).translateY(5.1));
  // Flowky text on banner
  const bMesh = new THREE.Mesh(new THREE.PlaneGeometry(bw * .7, .5), flowkyBannerMat);
  bMesh.position.set(0, 5.1, .04);
  g.add(bMesh);
  g.userData._centered = true;
  return g;
}

function mkTrashCan() {
  const g = new THREE.Group();
  g.add(gm(GEO.cyl, MAT.conc, .15, .5, .12).translateY(.25));
  g.add(gm(GEO.cyl, MAT.metal, .16, .03, .16).translateY(.51));
  return g;
}

function mkBench() {
  const g = new THREE.Group();
  g.add(gm(GEO.box, MAT.bark, .8, .04, .3).translateY(.4));
  g.add(gm(GEO.box, MAT.bark, .8, .3, .04).translateY(.35).translateZ(-.13));
  [-.3, .3].forEach(x => g.add(gm(GEO.box, MAT.metal, .04, .4, .25).translateX(x).translateY(.2)));
  return g;
}

function mkCone() {
  const g = new THREE.Group();
  g.add(gm(GEO.cone, MAT.red, .1, .3, .1).translateY(.15));
  g.add(gm(GEO.box, MAT.red, .2, .02, .2).translateY(.01));
  g.add(gm(GEO.cyl, MAT.coneWhite, .07, .04, .06).translateY(.2));
  return g;
}

// Flowky.ai flag pole (spectators hold these)
function mkFlowkyFlag() {
  const g = new THREE.Group();
  g.add(gm(GEO.cylLo, MAT.pole, .015, 2.5, .015).translateY(1.25));
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(.5, .3), sponsorMat);
  flag.position.set(.25, 2.3, 0);
  g.add(flag);
  return g;
}

// --- LED Promotion Board (roadside advertising panel) ---
function mkPromoBoard() {
  const g = new THREE.Group();
  const bw = 3 + Math.random() * 2;
  const bh = 1.2;

  // Support legs
  [-.4, .4].forEach(frac => {
    g.add(gm(GEO.cylLo, MAT.metal, .04, 1.8, .04).translateX(frac * bw).translateY(.9));
  });
  // Cross brace
  g.add(gm(GEO.box, MAT.metal, bw * .9, .03, .03).translateY(.4));

  // LED panel frame
  g.add(gm(GEO.box, MAT.dark, bw + .1, bh + .1, .06).translateY(1.8 + bh / 2));

  // Glowing ad panel with flowky.ai
  const panelTextures = [flowkyBannerMat, sponsorMat, tdfStartMat];
  const panelMat = panelTextures[Math.floor(Math.random() * panelTextures.length)];
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), panelMat);
  panel.position.set(0, 1.8 + bh / 2, .035);
  g.add(panel);
  // Back side
  const panelBack = panel.clone();
  panelBack.position.z = -.035;
  panelBack.rotation.y = Math.PI;
  g.add(panelBack);

  // LED edge glow strip
  g.add(gm(GEO.box, MAT.flowkyGlow, bw + .05, .04, .07).translateY(1.8 + bh + .02));
  g.add(gm(GEO.box, MAT.flowkyGlow, bw + .05, .04, .07).translateY(1.78));

  return g;
}

// --- Building cluster (group of 3-5 buildings) ---
function mkBuildingCluster() {
  const g = new THREE.Group();
  const count = 3 + Math.floor(Math.random() * 3);
  let xOff = 0;
  for (let i = 0; i < count; i++) {
    const w = 2 + Math.random() * 2.5, h = 3 + Math.random() * 7, d = 2 + Math.random() * 1.5;
    const bMat = [MAT.brick, MAT.brick2, MAT.conc, MAT.conc2][Math.floor(Math.random() * 4)];
    const b = new THREE.Group();
    b.add(mp(gm(GEO.box, bMat, w, h, d), {
      position: new THREE.Vector3(0, h / 2, 0), castShadow: true, receiveShadow: true
    }));
    // Roof
    b.add(gm(GEO.box, MAT.conc2, w + .15, .12, d + .15).translateY(h + .06));
    // Windows
    const wRows = Math.floor(h / 1.3), wCols = Math.max(1, Math.floor(w / 1.2));
    for (let r = 0; r < wRows; r++) for (let c = 0; c < wCols; c++) {
      const wx = -w / 2 + .6 + c * (w - 1) / Math.max(1, wCols - 1 || 1);
      const wy = 1 + r * 1.3;
      if (wy < h - .5) {
        b.add(gm(GEO.box, Math.random() > .35 ? MAT.litWindow : MAT.glass, .4, .5, .02)
          .translateX(wCols > 1 ? wx : 0).translateY(wy).translateZ(-d / 2 - .01));
      }
    }
    // Sponsor banner on some buildings
    if (Math.random() > .5) {
      const bannerMesh = new THREE.Mesh(new THREE.PlaneGeometry(w * .8, h * .15), sponsorMat);
      bannerMesh.position.set(0, h * .4, -d / 2 - .02);
      b.add(bannerMesh);
    }
    b.position.x = xOff + w / 2;
    b.position.z = (Math.random() - .5) * 1.5;
    g.add(b);
    xOff += w + .3 + Math.random() * .5;
  }
  // Center the cluster
  g.position.x -= xOff / 2;
  return g;
}

// --- Big crowd section (many spectators in rows) ---
function mkBigCrowd() {
  const g = new THREE.Group();
  const rows = 2 + Math.floor(Math.random() * 2);
  const perRow = 5 + Math.floor(Math.random() * 6);

  for (let row = 0; row < rows; row++) {
    for (let i = 0; i < perRow; i++) {
      const s = mkSpectator();
      s.position.set((i - perRow / 2) * .35 + Math.random() * .1, row * .05, row * .4 + Math.random() * .2);
      s.rotation.y = Math.random() * .3 - .15;
      g.add(s);
    }
  }

  // Long barrier in front
  const totalW = perRow * .4;
  g.add(gm(GEO.box, MAT.metal, totalW, .9, .06).translateY(.45).translateZ(-.2));
  // Sponsor banner
  const bannerM = new THREE.Mesh(new THREE.PlaneGeometry(totalW * .9, .4),
    Math.random() > .3 ? flowkyBannerMat : sponsorMat);
  bannerM.position.set(0, .55, -.24);
  g.add(bannerM);

  return g;
}

// --- Roadside advertising wall (like real cycling races) ---
function mkAdWall() {
  const g = new THREE.Group();
  const sections = 4 + Math.floor(Math.random() * 4);
  const sectionW = 1.5;
  const totalW = sections * sectionW;

  // Long low wall
  g.add(gm(GEO.box, MAT.white, totalW, 1, .08).translateY(.5));

  // Alternating sponsor panels
  for (let i = 0; i < sections; i++) {
    const x = (i - sections / 2 + .5) * sectionW;
    const mat = i % 3 === 0 ? flowkyBannerMat : (i % 3 === 1 ? sponsorMat : tdfStartMat);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(sectionW * .9, .7), mat);
    panel.position.set(x, .55, .045);
    g.add(panel);
    const panelBack = panel.clone();
    panelBack.position.z = -.045;
    panelBack.rotation.y = Math.PI;
    g.add(panelBack);
  }

  // Support feet
  for (let i = 0; i <= sections; i++) {
    const x = (i - sections / 2) * sectionW;
    g.add(gm(GEO.box, MAT.metal, .04, 1, .25).translateX(x).translateY(.5));
  }

  return g;
}

// ============================================================
// SCENERY MANAGEMENT
// ============================================================
export const sceneryGrp = new THREE.Group();
scene.add(sceneryGrp);
export const sceneryItems = [];

export function spawnSceneryItem(z, idx) {
  const side = idx % 2 === 0 ? -1 : 1;
  const r = Math.random();
  let mesh, minDist, maxDist;

  // Dense Tour de France distribution: lots of people, promo boards, buildings
  if (r < .06)       { mesh = mkTree(); minDist = 1; maxDist = 12; }
  else if (r < .10)  { mesh = mkPineTree(); minDist = 1; maxDist = 12; }
  else if (r < .14)  { mesh = mkLamp(); minDist = .8; maxDist = 1.5; }
  else if (r < .22)  { mesh = mkSpectatorGroup(); minDist = 1; maxDist = 3; }
  else if (r < .28)  { mesh = mkBigCrowd(); minDist = 1; maxDist = 3.5; }
  else if (r < .31)  { mesh = mkSpectator(); minDist = 1; maxDist = 2.5; }
  else if (r < .34)  { mesh = mkTeamCar(); minDist = 3; maxDist = 8; }
  else if (r < .37)  { mesh = mkCar(); minDist = 3; maxDist = 8; }
  else if (r < .39)  { mesh = mkVan(); minDist = 3.5; maxDist = 8; }
  else if (r < .43)  { mesh = mkBuilding(); minDist = 6; maxDist = 18; }
  else if (r < .47)  { mesh = mkBuildingCluster(); minDist = 8; maxDist = 22; }
  else if (r < .50)  { mesh = mkFlowkyBuilding(); minDist = 6; maxDist = 18; }
  else if (r < .54)  { mesh = mkPromoBoard(); minDist = 1; maxDist = 3; }
  else if (r < .58)  { mesh = mkAdWall(); minDist = .3; maxDist = 1.5; }
  else if (r < .61)  { mesh = mkCrowdBarrier(); minDist = .3; maxDist = 1.5; }
  else if (r < .63)  { mesh = mkBarrier(); minDist = .3; maxDist = 1; }
  else if (r < .66)  { mesh = mkFlowkyArch(); minDist = 0; maxDist = 0; }
  else if (r < .69)  { mesh = mkInflatableArch(); minDist = 0; maxDist = 0; }
  else if (r < .72)  { mesh = mkBannerArch(); minDist = 0; maxDist = 0; }
  else if (r < .74)  { mesh = mkPodium(); minDist = 4; maxDist = 10; }
  else if (r < .77)  { mesh = mkKmMarker(); minDist = .5; maxDist = 1.5; }
  else if (r < .80)  { mesh = mkFlowkyFlag(); minDist = .5; maxDist = 2; }
  else if (r < .84)  { mesh = mkTrashCan(); minDist = .5; maxDist = 1.5; }
  else if (r < .88)  { mesh = mkBench(); minDist = .5; maxDist = 2; }
  else if (r < .92)  { mesh = mkCone(); minDist = .2; maxDist = .8; }
  else               { mesh = mkTree(); minDist = 1; maxDist = 8; }

  const sideOffset = mesh.userData._centered ? 0 : (ROAD_EDGE + minDist + Math.random() * (maxDist - minDist));
  mesh.userData._side = mesh.userData._centered ? 0 : side;
  mesh.userData._sideOffset = sideOffset;
  mesh.userData._localZ = z;
  mesh.position.z = z;
  if (r >= .20 && r < .34) mesh.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
  sceneryGrp.add(mesh);
  sceneryItems.push(mesh);
}

// Initialize scenery
for (let i = 0; i < SCENERY_COUNT; i++) {
  spawnSceneryItem(-i * SCENERY_SPACING - Math.random() * 2, i);
}

// ============================================================
// OBSTACLES (Massive Dramatic Cliffs)
// ============================================================
export const obstacles = [];

export function mkCliff() {
  const g = new THREE.Group();
  const w = RW + 12, gap = 3 + Math.random() * 2.5;
  const wallH = 10, wallD = 1.2;

  // Main cliff walls - taller and thicker
  g.add(gm(GEO.box, MAT.cliffWall, w, wallH, wallD).translateY(-wallH / 2 + .05).translateZ(gap / 2));
  g.add(gm(GEO.box, MAT.cliffWall, w, wallH, wallD).translateY(-wallH / 2 + .05).translateZ(-gap / 2));

  // Rocky texture layers on walls (staggered rock faces)
  [-1, 1].forEach(zs => {
    for (let i = 0; i < 6; i++) {
      const rw = 1.5 + Math.random() * 3;
      const rh = 1 + Math.random() * 2.5;
      const rx = (Math.random() - .5) * (w - 2);
      const ry = -Math.random() * (wallH - 2);
      const mat = Math.random() > .5 ? MAT.cliffRock : MAT.cliffRock2;
      g.add(gm(GEO.box, mat, rw, rh, .3)
        .translateX(rx).translateY(ry).translateZ(zs * (gap / 2 + wallD / 2 + .05)));
    }
    // Moss patches
    for (let i = 0; i < 3; i++) {
      const rx = (Math.random() - .5) * (w - 4);
      g.add(gm(GEO.box, MAT.cliffMoss, .8 + Math.random(), .4 + Math.random() * .5, .1)
        .translateX(rx).translateY(-.5 - Math.random() * 2).translateZ(zs * (gap / 2 + wallD / 2 + .1)));
    }
  });

  // Side cliff walls (makes it feel like a canyon)
  [-1, 1].forEach(s => {
    const sideH = wallH * .7;
    g.add(gm(GEO.box, MAT.cliffRock, wallD, sideH, gap + wallD * 2)
      .translateX(s * (w / 2 + .3)).translateY(-sideH / 2 + .05));
    // Rocky outcrops on sides
    for (let i = 0; i < 3; i++) {
      const rh = 1 + Math.random() * 2;
      const rz = (Math.random() - .5) * gap;
      g.add(gm(GEO.box, MAT.cliffRock2, .6 + Math.random() * .5, rh, .8 + Math.random())
        .translateX(s * (w / 2 - .5)).translateY(-Math.random() * 3).translateZ(rz));
    }
  });

  // Deep abyss below
  const ab = gm(GEO.plane, MAT.abyss, w + 4, gap + 1, 1);
  ab.rotation.x = -Math.PI / 2; ab.position.y = -wallH; g.add(ab);

  // Dirt edges
  [-1, 1].forEach(s => {
    g.add(gm(GEO.box, MAT.cliffDirt, w, .2, .6).translateY(.08).translateZ(s * (gap / 2 + wallD / 2 + .4)));
    // Loose rocks near the edge
    for (let i = 0; i < 5; i++) {
      const sz = .08 + Math.random() * .15;
      g.add(gm(GEO.dodec, MAT.cliffRock, sz, sz, sz)
        .translateX((Math.random() - .5) * RW)
        .translateY(.05)
        .translateZ(s * (gap / 2 + .8 + Math.random())));
    }
  });

  // Debris rocks at the bottom of the chasm
  for (let i = 0; i < 8; i++) {
    const sz = .2 + Math.random() * .4;
    const mat = Math.random() > .5 ? MAT.cliffRock : MAT.cliffRock2;
    g.add(gm(GEO.dodec, mat, sz, sz * .7, sz)
      .translateX((Math.random() - .5) * w * .5)
      .translateY(-wallH + .5 + Math.random())
      .translateZ((Math.random() - .5) * gap * .6));
  }

  // Dramatic ramp - bigger
  const ramp = gm(GEO.box, MAT.cliffRamp, RW * .75, .35, 3.5);
  ramp.position.set(0, .17, gap / 2 + wallD / 2 + 3); ramp.rotation.x = .08; ramp.castShadow = true; g.add(ramp);
  for (let i = 0; i < 7; i++) {
    const st = gm(GEO.box, i % 2 === 0 ? MAT.chevYellow : MAT.chevBlack, RW * .65, .01, .15);
    st.position.set(0, .36, gap / 2 + wallD / 2 + 1.5 + i * .4); st.rotation.x = .08; g.add(st);
  }

  // Barriers with warning lights
  [-1, 1].forEach(s => {
    g.add(gm(GEO.box, MAT.cliffBar, .2, 1.8, 1).translateX(s * (RW / 2 + .5)).translateY(.9).translateZ(gap / 2 + wallD / 2 + 1.5));
    g.add(gm(GEO.box, MAT.coneWhite, .22, .22, .9).translateX(s * (RW / 2 + .5)).translateY(1.2).translateZ(gap / 2 + wallD / 2 + 1.5));
    // Flashing warning light
    g.add(gm(GEO.sphLo, MAT.orange, .1, .1, .1).translateX(s * (RW / 2 + .5)).translateY(1.85).translateZ(gap / 2 + wallD / 2 + 1.5));
  });

  // More warning cones (further ahead)
  for (let i = 0; i < 8; i++) {
    [-1, 1].forEach(s => {
      g.add(gm(GEO.cone, MAT.orange, .14, .5, .14)
        .translateX(s * (RW / 2 - .3)).translateY(.25).translateZ(gap / 2 + wallD / 2 + 6 + i * 2.5));
      g.add(gm(GEO.cyl, MAT.coneWhite, .12, .07, .14)
        .translateX(s * (RW / 2 - .3)).translateY(.38).translateZ(gap / 2 + wallD / 2 + 6 + i * 2.5));
    });
  }

  // Road chevron warnings
  for (let i = 0; i < 6; i++) {
    const ch = gm(GEO.plane, MAT.chevRoad, RW * .45, .18, 1);
    ch.rotation.x = -Math.PI / 2; ch.position.set(0, .02, gap / 2 + wallD / 2 + 5 + i * 2); g.add(ch);
  }

  // Reflectors
  [-1, 1].forEach(s => {
    g.add(gm(GEO.sphLo, MAT.refRed, .1, .1, .1).translateX(s * (RW / 2 + .3)).translateY(.5).translateZ(gap / 2 + .3));
    g.add(gm(GEO.sphLo, MAT.refGrn, .1, .1, .1).translateX(s * (RW / 2 + .3)).translateY(.5).translateZ(-gap / 2 - .3));
  });

  // Danger sign
  const dangerTex = mkTextTexture('DANGER', {
    w: 256, h: 64, bg: '#ff2200', color: '#ffffff',
    font: 'bold 44px Arial, sans-serif'
  });
  const dangerMat = texMat(dangerTex, { emissive: 0xff2200, emissiveI: .3 });
  [-1, 1].forEach(s => {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1, .3), dangerMat);
    sign.position.set(s * (RW / 2 + 1), 1.5, gap / 2 + wallD / 2 + 4);
    g.add(sign);
  });

  g.userData = { type: 'cliff', gap, reqSpeed: 20 + S.difficulty * 5, cleared: false };
  return g;
}

// ============================================================
// POWERUPS
// ============================================================
export const powerupObjs = [];
const puMats = {};
const puRingMat = {};
POWERUPS.forEach(p => {
  puMats[p.type] = new THREE.MeshStandardMaterial({ color: p.color, emissive: p.color, emissiveIntensity: .5 });
  puRingMat[p.type] = new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: .6 });
});

export function mkPU(type) {
  const def = POWERUPS.find(p => p.type === type);
  const g = new THREE.Group();
  g.add(gm(GEO.sphHi, puMats[type], .25, .25, .25));
  const r1 = gm(GEO.torus, puRingMat[type], .4, .4, .4); g.add(r1);
  const r2 = gm(GEO.torus, puRingMat[type], .4, .4, .4); r2.rotation.x = Math.PI / 2; g.add(r2);
  g.add(new THREE.PointLight(def.color, .8, 10));
  g.userData = { type: 'powerup', pType: type, def, rot: Math.random() * 6, bob: Math.random() * 6 };
  return g;
}

// ============================================================
// PARTICLES
// ============================================================
const PC = 180;
const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(PC * 3);
const pCol = new Float32Array(PC * 3);
export const pVel = [];

for (let i = 0; i < PC; i++) {
  pPos[i * 3] = 0; pPos[i * 3 + 1] = -10; pPos[i * 3 + 2] = 0;
  pCol[i * 3] = 1; pCol[i * 3 + 1] = .7; pCol[i * 3 + 2] = .3;
  pVel.push({ x: 0, y: 0, z: 0, life: 0, kind: 0 });
}
pGeo.setAttribute('position', new THREE.Float32BufferAttribute(pPos, 3));
pGeo.setAttribute('color', new THREE.Float32BufferAttribute(pCol, 3));
export const parts = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: .06, transparent: true, opacity: .8, vertexColors: true }));
scene.add(parts);

export function emit(x, y, z, n, col, kind = 0) {
  const c = new THREE.Color(col || 0xffb84d);
  for (let i = 0; i < PC && n > 0; i++) {
    if (pVel[i].life <= 0) {
      pPos[i * 3] = x + (Math.random() - .5) * .5;
      pPos[i * 3 + 1] = y;
      pPos[i * 3 + 2] = z + (Math.random() - .5) * .5;
      pCol[i * 3] = c.r; pCol[i * 3 + 1] = c.g; pCol[i * 3 + 2] = c.b;
      if (kind === 1) pVel[i] = { x: (Math.random() - .5) * .5, y: Math.random() * .3, z: .5 + Math.random(), life: .4 + Math.random() * .3, kind: 1 };
      else pVel[i] = { x: (Math.random() - .5) * 2.5, y: Math.random() * 3.5 + 1, z: (Math.random() - .5) * 2.5, life: .8 + Math.random() * .4, kind: 0 };
      n--;
    }
  }
  pGeo.attributes.position.needsUpdate = true;
  pGeo.attributes.color.needsUpdate = true;
}

export function updateParticles(dt) {
  for (let i = 0; i < PC; i++) {
    const v = pVel[i];
    if (v.life > 0) {
      pPos[i * 3] += v.x * dt;
      pPos[i * 3 + 1] += v.y * dt;
      pPos[i * 3 + 2] += v.z * dt;
      if (v.kind === 0) v.y -= 5 * dt;
      v.life -= dt * (v.kind === 1 ? 1.5 : 2);
      if (v.life <= 0) pPos[i * 3 + 1] = -10;
    }
  }
  pGeo.attributes.position.needsUpdate = true;
}
