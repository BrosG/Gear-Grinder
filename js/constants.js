// ============================================================
// GEAR GRINDER - CONSTANTS & CONFIGURATION
// ============================================================

export const MAX_PLAYERS_PER_ROOM = 10;

// Road geometry
export const LANE_W = 2.2;
export const LANES = [-LANE_W, 0, LANE_W];
export const RW = 8;
export const RSL = 4;
export const SEG_LEN = 8.0;
export const RCOUNT = 120;
export const ROAD_DRAW_DIST = RCOUNT * RSL;
export const SHOULDER_W = 1.2;
export const CURB_H = 0.08;
export const ROAD_EDGE = RW / 2 + SHOULDER_W + 0.3;
export const SCENERY_COUNT = 160;
export const SCENERY_SPACING = 6;

// Powerup definitions
export const POWERUPS = [
  { type: 'ENERGY',  color: 0x4dffb8, icon: '\u26A1', dur: 0, msg: '\u26A1 ENERGY BOOST' },
  { type: 'SPEED',   color: 0xff6b3d, icon: '\uD83D\uDD25', dur: 6, msg: '\uD83D\uDD25 SPEED BURST' },
  { type: 'SCORE',   color: 0xffcc00, icon: '\u2728', dur: 8, msg: '\u2728 DOUBLE POINTS' },
  { type: 'GRAVITY', color: 0x4db8ff, icon: '\uD83E\uDEB6', dur: 7, msg: '\uD83E\uDEB6 FEATHERWEIGHT' },
];

// 12-gear transmission
export const GEARS = [
  null,
  { name: 'EASY',      ratio: 0.55, sMin: .15, sMax: .80, bpm: 200, top: 15,  eCost: .003, optSpd: [0, 14] },
  { name: 'LIGHT',     ratio: 0.70, sMin: .18, sMax: .78, bpm: 185, top: 22,  eCost: .005, optSpd: [10, 21] },
  { name: 'CRUISE',    ratio: 0.85, sMin: .20, sMax: .76, bpm: 170, top: 30,  eCost: .007, optSpd: [18, 29] },
  { name: 'TEMPO',     ratio: 1.00, sMin: .22, sMax: .74, bpm: 155, top: 38,  eCost: .010, optSpd: [26, 37] },
  { name: 'STEADY',    ratio: 1.15, sMin: .24, sMax: .72, bpm: 140, top: 46,  eCost: .013, optSpd: [34, 45] },
  { name: 'DRIVE',     ratio: 1.30, sMin: .26, sMax: .70, bpm: 125, top: 55,  eCost: .017, optSpd: [42, 54] },
  { name: 'PUSH',      ratio: 1.48, sMin: .26, sMax: .68, bpm: 115, top: 64,  eCost: .022, optSpd: [50, 63] },
  { name: 'POWER',     ratio: 1.66, sMin: .26, sMax: .66, bpm: 108, top: 74,  eCost: .028, optSpd: [59, 73] },
  { name: 'TURBO',     ratio: 1.85, sMin: .25, sMax: .65, bpm: 100, top: 84,  eCost: .035, optSpd: [68, 83] },
  { name: 'OVERDRIVE', ratio: 2.05, sMin: .25, sMax: .64, bpm: 95,  top: 95,  eCost: .042, optSpd: [78, 94] },
  { name: 'HYPER',     ratio: 2.28, sMin: .24, sMax: .62, bpm: 90,  top: 107, eCost: .052, optSpd: [88, 106] },
  { name: 'WARP',      ratio: 2.52, sMin: .24, sMax: .62, bpm: 85,  top: 120, eCost: .065, optSpd: [98, 120] },
];

// Zone progression
export const ZONES = [
  { dist: 0,    name: 'CITY STREETS',  col: 0x4db8ff, fog: 0x0a0e1e, gnd: 0x10101c, road: 0x30304a, line: 0x505070 },
  { dist: 500,  name: 'COASTAL ROAD',  col: 0x4dffb8, fog: 0x081812, gnd: 0x0c1c14, road: 0x243830, line: 0x4a7a60 },
  { dist: 1200, name: 'FOREST TRAIL',  col: 0x88cc44, fog: 0x0c180a, gnd: 0x121c0c, road: 0x2a3820, line: 0x608a40 },
  { dist: 2200, name: 'MOUNTAIN PASS', col: 0xffb84d, fog: 0x181208, gnd: 0x1c180c, road: 0x3a3420, line: 0x9a8a50 },
  { dist: 3500, name: 'DESERT FURY',   col: 0xff6b3d, fog: 0x180e08, gnd: 0x1c120c, road: 0x3a2a1a, line: 0x9a6a40 },
  { dist: 5000, name: 'NEON CANYON',   col: 0xff4d8b, fog: 0x180a12, gnd: 0x1c0c14, road: 0x3a1a2a, line: 0x9a4060 },
  { dist: 7000, name: 'THE VOID',      col: 0xaa44ff, fog: 0x100a18, gnd: 0x140c1c, road: 0x2a1a38, line: 0x7a4090 },
];

// Player bike colors for multiplayer
export const PLAYER_COLORS = [
  0xff6b3d, 0x4dffb8, 0x4db8ff, 0xff4d8b, 0xffcc00,
  0xaa44ff, 0x44ffaa, 0xff4444, 0x44aaff, 0xffaa44,
];

// ============================================================
// ROAD SPLINE TABLES
// ============================================================
const TABLE_SIZE = 2048;

export const CURVE_TABLE = new Float32Array(TABLE_SIZE);
export const CURVE_PERIOD = ROAD_DRAW_DIST * 2.5;
(function buildCurveTable() {
  for (let i = 0; i < TABLE_SIZE; i++) {
    const t = i / TABLE_SIZE;
    CURVE_TABLE[i] =
      Math.sin(t * Math.PI * 2 * 1.0) * 1.4 +
      Math.sin(t * Math.PI * 2 * 2.7 + 0.8) * 0.6 +
      Math.sin(t * Math.PI * 2 * 0.3 + 2.1) * 2.0;
  }
})();
const CURVE_ORIGIN = CURVE_TABLE[0];

export const HEIGHT_TABLE = new Float32Array(TABLE_SIZE);
export const HEIGHT_PERIOD = ROAD_DRAW_DIST * 2.5;
(function buildHeightTable() {
  for (let i = 0; i < TABLE_SIZE; i++) {
    const t = i / TABLE_SIZE;
    HEIGHT_TABLE[i] =
      Math.sin(t * Math.PI * 2 * 1) * 3.5 +
      Math.sin(t * Math.PI * 2 * 3 + 0.7) * 1.5 +
      Math.sin(t * Math.PI * 2 * 7 + 2.1) * 0.5;
  }
})();
const HEIGHT_ORIGIN = HEIGHT_TABLE[0];

// Spline sampling (need state.S for distance/difficulty - passed at call time)
function sampleTable(table, period, origin, wz) {
  const t = ((wz % period) + period) % period;
  const idx = (t / period) * TABLE_SIZE;
  const i0 = Math.floor(idx) % TABLE_SIZE;
  const i1 = (i0 + 1) % TABLE_SIZE;
  const f = idx - Math.floor(idx);
  return (table[i0] * (1 - f) + table[i1] * f) - origin;
}

export function getCurveX(wz, distance) {
  const raw = sampleTable(CURVE_TABLE, CURVE_PERIOD, CURVE_ORIGIN, wz);
  const ramp = Math.min(1, distance / 150);
  return raw * ramp;
}

export function getCurveDeriv(wz, distance) {
  const e = 0.5;
  return (getCurveX(wz + e, distance) - getCurveX(wz - e, distance)) / (2 * e);
}

export function getHeightY(wz, distance, difficulty) {
  const raw = sampleTable(HEIGHT_TABLE, HEIGHT_PERIOD, HEIGHT_ORIGIN, wz);
  const ramp = Math.min(1, distance / 200);
  const amp = Math.min(4.0, 0.5 + difficulty * 0.6);
  return raw * ramp * amp;
}

export function getHeightDeriv(wz, distance, difficulty) {
  const e = 0.5;
  return (getHeightY(wz + e, distance, difficulty) - getHeightY(wz - e, distance, difficulty)) / (2 * e);
}

export function getSlopeAngle(wz, distance, difficulty) {
  return Math.atan(getHeightDeriv(wz, distance, difficulty));
}
