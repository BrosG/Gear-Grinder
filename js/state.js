// ============================================================
// GEAR GRINDER - GAME STATE
// ============================================================

export function createDefaultState() {
  return {
    score: 0, distance: 0, speed: 0, maxSpeed: 0,
    gear: 1, maxGear: 12, topGearUsed: 1,
    rpm: 0, combo: 0, bestCombo: 0, energy: 1,
    alive: true, started: false,
    lastPedal: 0, pedalInterval: 0, pedalCount: 0,
    difficulty: 1, zone: 0, shake: 0, frame: 0, incline: 0,
    lane: 1, laneX: 0,
    activePowerup: null, powerupTimer: 0, invulnerable: 0,
    _deathTimer: 0, _renderIncline: 0, _camIncline: 0, _worldZ: 0,
    _fovKick: 0, _cliffTension: 0, _cliffTarget: 0, _terrainFeel: 0,
    stats: { perfects: 0, cliffs: 0, powerups: 0 },
  };
}

// Singleton game state
export const S = createDefaultState();

// High score
export let HS = parseInt(localStorage.getItem('gg_hs3') || '0');

export function saveHighScore(score) {
  HS = Math.floor(score);
  localStorage.setItem('gg_hs3', HS);
}

export function resetState() {
  Object.assign(S, createDefaultState());
}
