// ============================================================
// GEAR GRINDER - THREE.JS SCENE SETUP & SHARED RESOURCES
// ============================================================

import { RW, SEG_LEN, SHOULDER_W, CURB_H, RSL, LANE_W } from './constants.js';

const THREE = window.THREE;

// --- Scene ---
export const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0e1e, 0.0018);

// --- Camera ---
export const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 900);
camera.position.set(0, 3.5, 8);

// --- Renderer ---
export const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
  stencil: false,
  depth: true,
});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
renderer.setClearColor(0x0a0e1e);
document.body.prepend(renderer.domElement);

// --- Lights ---
export const ambientL = new THREE.AmbientLight(0x556688, 1.0);
scene.add(ambientL);

export const sun = new THREE.DirectionalLight(0xfff0dd, 1.6);
sun.position.set(8, 18, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(512, 512);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 40;
sun.shadow.camera.left = -15;
sun.shadow.camera.right = 15;
sun.shadow.camera.top = 15;
sun.shadow.camera.bottom = -15;
scene.add(sun);

const fillLight = new THREE.DirectionalLight(0x88aaff, 0.4);
fillLight.position.set(-6, 8, 0);
scene.add(fillLight);

export const pLight = new THREE.PointLight(0xff6b3d, 0.5, 35);
pLight.position.set(0, 3, 0);
scene.add(pLight);

scene.add(new THREE.HemisphereLight(0x5577aa, 0x223344, 0.5));

// --- Shared Materials ---
export const MAT = {
  frame:     new THREE.MeshStandardMaterial({ color: 0xdd2222, metalness: .65, roughness: .2 }),
  frame2:    new THREE.MeshStandardMaterial({ color: 0xbb1111, metalness: .65, roughness: .2 }),
  chrome:    new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: .9, roughness: .1 }),
  dark:      new THREE.MeshStandardMaterial({ color: 0x222222, roughness: .8 }),
  tire:      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: .85 }),
  rim:       new THREE.MeshStandardMaterial({ color: 0xbbbbbb, metalness: .8, roughness: .15 }),
  spoke:     new THREE.MeshBasicMaterial({ color: 0x999999 }),
  gold:      new THREE.MeshStandardMaterial({ color: 0xccaa33, metalness: .7, roughness: .3 }),

  // Rider
  jersey:    new THREE.MeshStandardMaterial({ color: 0x1144cc, roughness: .65, metalness: .05 }),
  jersey2:   new THREE.MeshStandardMaterial({ color: 0x0033aa, roughness: .65, metalness: .05 }),
  shorts:    new THREE.MeshStandardMaterial({ color: 0x0a0a22, roughness: .75 }),
  skin:      new THREE.MeshStandardMaterial({ color: 0xe8b88a, roughness: .85 }),
  helmet:    new THREE.MeshStandardMaterial({ color: 0xee2222, metalness: .35, roughness: .35 }),
  helmet2:   new THREE.MeshStandardMaterial({ color: 0xcc1111, metalness: .35, roughness: .35 }),
  shoe:      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: .75, metalness: .1 }),
  goggle:    new THREE.MeshStandardMaterial({ color: 0x050505, metalness: .95, roughness: .05 }),
  glove:     new THREE.MeshStandardMaterial({ color: 0x111111, roughness: .65, metalness: .1 }),
  sock:      new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: .85 }),

  // World
  road:      new THREE.MeshStandardMaterial({ color: 0x30304a, roughness: .82, metalness: .05 }),
  shoulder:  new THREE.MeshStandardMaterial({ color: 0x1a1a2a, roughness: .9 }),
  curb:      new THREE.MeshStandardMaterial({ color: 0x444460, roughness: .7, metalness: .1 }),
  ground:    new THREE.MeshStandardMaterial({ color: 0x12121e, roughness: 1 }),
  edgeLine:  new THREE.MeshBasicMaterial({ color: 0xdddddd }),
  centerLine:new THREE.MeshBasicMaterial({ color: 0xffcc44 }),
  laneLine:  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .35 }),
  rumble:    new THREE.MeshStandardMaterial({ color: 0x882222, roughness: .8 }),
  guard:     new THREE.MeshStandardMaterial({ color: 0x888899, metalness: .6, roughness: .3 }),
  post:      new THREE.MeshStandardMaterial({ color: 0x666677, metalness: .5, roughness: .4 }),
  refRed:    new THREE.MeshBasicMaterial({ color: 0xff4444 }),
  refGrn:    new THREE.MeshBasicMaterial({ color: 0x44ff44 }),
  white:     new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: .8 }),

  // Scenery
  bark:      new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: .9 }),
  leaf:      new THREE.MeshStandardMaterial({ color: 0x1a4422, roughness: .9 }),
  leaf2:     new THREE.MeshStandardMaterial({ color: 0x2a5522, roughness: .9 }),
  conc:      new THREE.MeshStandardMaterial({ color: 0x555566, roughness: .85, metalness: .05 }),
  conc2:     new THREE.MeshStandardMaterial({ color: 0x444455, roughness: .85, metalness: .05 }),
  metal:     new THREE.MeshStandardMaterial({ color: 0x777788, metalness: .6, roughness: .3 }),
  glass:     new THREE.MeshStandardMaterial({ color: 0x88bbff, metalness: .3, roughness: .1, transparent: true, opacity: .6 }),
  roof:      new THREE.MeshStandardMaterial({ color: 0x663322, roughness: .8 }),
  brick:     new THREE.MeshStandardMaterial({ color: 0x884433, roughness: .85 }),
  brick2:    new THREE.MeshStandardMaterial({ color: 0x775544, roughness: .85 }),
  yellow:    new THREE.MeshStandardMaterial({ color: 0xccaa22, roughness: .7 }),
  red:       new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: .7 }),
  blue:      new THREE.MeshStandardMaterial({ color: 0x2244cc, roughness: .7 }),
  black:     new THREE.MeshStandardMaterial({ color: 0x111111, roughness: .9 }),
  carTire:   new THREE.MeshStandardMaterial({ color: 0x222222, roughness: .85 }),
  pole:      new THREE.MeshStandardMaterial({ color: 0x666666, metalness: .5, roughness: .4 }),
  banner:    new THREE.MeshStandardMaterial({ color: 0xff4444, roughness: .7, side: THREE.DoubleSide }),
  banner2:   new THREE.MeshStandardMaterial({ color: 0x4488ff, roughness: .7, side: THREE.DoubleSide }),
  skinNPC:   new THREE.MeshStandardMaterial({ color: 0xe8b88a, roughness: .85 }),
  pants:     new THREE.MeshStandardMaterial({ color: 0x333344, roughness: .8 }),
  litWindow: new THREE.MeshBasicMaterial({ color: 0xffeeaa }),
  headlight: new THREE.MeshBasicMaterial({ color: 0xffffcc }),
  taillight: new THREE.MeshBasicMaterial({ color: 0xff2200 }),
  lampGlow:  new THREE.MeshStandardMaterial({ color: 0xffee88, emissive: 0xffcc44, emissiveIntensity: 3 }),
  orange:    new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: .4 }),
  coneWhite: new THREE.MeshBasicMaterial({ color: 0xffffff }),

  // Cliff
  cliffWall: new THREE.MeshStandardMaterial({ color: 0x2a1a0e, roughness: .9 }),
  cliffDirt: new THREE.MeshStandardMaterial({ color: 0x5a3a1e, roughness: 1 }),
  cliffRamp: new THREE.MeshStandardMaterial({ color: 0x997744, roughness: .6 }),
  cliffBar:  new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: .5, emissive: 0x331100 }),
  abyss:     new THREE.MeshBasicMaterial({ color: 0x020202 }),
  chevYellow:new THREE.MeshBasicMaterial({ color: 0xffaa00 }),
  chevBlack: new THREE.MeshBasicMaterial({ color: 0x222222 }),
  chevRoad:  new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.7 }),
  cliffRock: new THREE.MeshStandardMaterial({ color: 0x3a2a18, roughness: .95 }),
  cliffRock2:new THREE.MeshStandardMaterial({ color: 0x4a3828, roughness: .92 }),
  cliffMoss: new THREE.MeshStandardMaterial({ color: 0x2a3a1a, roughness: .95 }),

  // Flowky.ai branding
  flowkyPurple:  new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: .4, metalness: .3 }),
  flowkyDark:    new THREE.MeshStandardMaterial({ color: 0x4c1d95, roughness: .5, metalness: .2 }),
  flowkyGlow:    new THREE.MeshStandardMaterial({ color: 0x7c3aed, emissive: 0x7c3aed, emissiveIntensity: .8, roughness: .3 }),
  flowkyWhite:   new THREE.MeshStandardMaterial({ color: 0xf0f0ff, roughness: .5, metalness: .1 }),
  flowkyAccent:  new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0x6d28d9, emissiveIntensity: .3, roughness: .4 }),

  // Tour de France / Race
  inflatable:    new THREE.MeshStandardMaterial({ color: 0xee2222, roughness: .65, metalness: .05 }),
  inflatableYlw: new THREE.MeshStandardMaterial({ color: 0xffdd00, roughness: .65, metalness: .05 }),
  podiumGold:    new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: .7, roughness: .2 }),
  podiumSilver:  new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: .7, roughness: .2 }),
  podiumBronze:  new THREE.MeshStandardMaterial({ color: 0xcd7f32, metalness: .7, roughness: .2 }),
  teamCarBody:   new THREE.MeshStandardMaterial({ color: 0xf0f0f0, metalness: .4, roughness: .3 }),
  roofRack:      new THREE.MeshStandardMaterial({ color: 0x555555, metalness: .6, roughness: .3 }),
  photoFinish:   new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: .8 }),
};

// NPC shirt / hair palettes
export const shirtMats = [
  new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: .75 }),
  new THREE.MeshStandardMaterial({ color: 0x3366cc, roughness: .75 }),
  new THREE.MeshStandardMaterial({ color: 0x33aa33, roughness: .75 }),
  new THREE.MeshStandardMaterial({ color: 0xffaa00, roughness: .75 }),
];
export const hairMats = [
  new THREE.MeshStandardMaterial({ color: 0x332211, roughness: .9 }),
  new THREE.MeshStandardMaterial({ color: 0x885522, roughness: .9 }),
  new THREE.MeshStandardMaterial({ color: 0xddbb66, roughness: .9 }),
];
export const carColors = [0xcc2222, 0x2255cc, 0x22aa44, 0xdddddd, 0x111111, 0xffaa00, 0x8822aa];
export const carMats = carColors.map(c => new THREE.MeshStandardMaterial({ color: c, metalness: .5, roughness: .3 }));

// --- Shared Geometries (optimized segment counts for performance) ---
export const GEO = {
  box:     new THREE.BoxGeometry(1, 1, 1),
  cyl:     new THREE.CylinderGeometry(1, 1, 1, 6),
  cylHi:   new THREE.CylinderGeometry(1, 1, 1, 8),
  cylLo:   new THREE.CylinderGeometry(1, 1, 1, 5),
  sphere:  new THREE.SphereGeometry(1, 8, 6),
  sphLo:   new THREE.SphereGeometry(1, 5, 3),
  sphHi:   new THREE.SphereGeometry(1, 10, 10),
  cone:    new THREE.ConeGeometry(1, 1, 5),
  coneLo:  new THREE.ConeGeometry(1, 1, 6),
  plane:   new THREE.PlaneGeometry(1, 1),
  dodec:   new THREE.DodecahedronGeometry(1, 0),
  torus:   new THREE.TorusGeometry(1, .08, 6, 20),
};

// Road-specific geometries
export const ROAD_GEO = {
  roadPlane:   new THREE.PlaneGeometry(RW, SEG_LEN),
  shoulder:    new THREE.PlaneGeometry(SHOULDER_W, SEG_LEN),
  curb:        new THREE.BoxGeometry(.15, CURB_H, SEG_LEN),
  edgeLine:    new THREE.PlaneGeometry(.14, SEG_LEN),
  centerDash:  new THREE.PlaneGeometry(.10, SEG_LEN * .6),
  laneDash:    new THREE.PlaneGeometry(.08, SEG_LEN * .4),
  rumbleBump:  new THREE.BoxGeometry(.3, .03, .25),
  guardPost:   new THREE.CylinderGeometry(.04, .04, .6, 6),
  guardRail:   new THREE.BoxGeometry(.04, .12, RSL * 1.5),
  reflector:   new THREE.BoxGeometry(.06, .06, .02),
  marker:      new THREE.BoxGeometry(.08, .5, .08),
  markerBand:  new THREE.BoxGeometry(.09, .08, .09),
};

// --- Helpers ---
export function gm(geo, mat, sx, sy, sz) {
  const m = new THREE.Mesh(geo, mat);
  m.scale.set(sx, sy, sz);
  return m;
}

export function mp(mesh, props) {
  if (props.position) { mesh.position.set(props.position.x, props.position.y, props.position.z); delete props.position; }
  if (props.rotation) { mesh.rotation.set(props.rotation.x, props.rotation.y, props.rotation.z); delete props.rotation; }
  if (props.scale) { mesh.scale.set(props.scale.x, props.scale.y, props.scale.z); delete props.scale; }
  if (props.castShadow !== undefined) { mesh.castShadow = props.castShadow; delete props.castShadow; }
  if (props.receiveShadow !== undefined) { mesh.receiveShadow = props.receiveShadow; delete props.receiveShadow; }
  return mesh;
}

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
