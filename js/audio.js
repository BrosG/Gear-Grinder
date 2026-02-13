// ============================================================
// GEAR GRINDER - AUDIO SYSTEM
// ============================================================

import { S } from './state.js';

let actx;

export function initAudio() {
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
}

export function tone(f, d, t = 'square', v = 0.04) {
  if (!actx) return;
  const o = actx.createOscillator();
  const g = actx.createGain();
  o.type = t;
  o.frequency.setValueAtTime(f, actx.currentTime);
  g.gain.setValueAtTime(v, actx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + d);
  o.connect(g).connect(actx.destination);
  o.start();
  o.stop(actx.currentTime + d);
}

export function sndPedal() { tone(140 + S.gear * 22, .04, 'triangle', .03); }

export function sndShift(up) {
  tone(up ? 420 : 200, .08, 'square', .025);
  setTimeout(() => tone(up ? 620 : 300, .08, 'square', .025), 45);
}

export function sndPerfect() {
  tone(523, .1, 'sine', .05);
  setTimeout(() => tone(659, .1, 'sine', .05), 70);
  setTimeout(() => tone(784, .15, 'sine', .04), 140);
  setTimeout(() => tone(1047, .2, 'sine', .03), 220);
}

export function sndCrash() {
  tone(80, .5, 'sawtooth', .08);
  tone(45, .7, 'sawtooth', .06);
}

export function sndPowerup() {
  if (!actx) return;
  [523, 659, 784, 1047].forEach((f, i) => {
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    g.gain.setValueAtTime(.04, actx.currentTime + i * .07);
    g.gain.exponentialRampToValueAtTime(.001, actx.currentTime + i * .07 + .25);
    o.connect(g).connect(actx.destination);
    o.start(actx.currentTime + i * .07);
    o.stop(actx.currentTime + i * .07 + .25);
  });
}

export function sndCombo() { tone(880, .1, 'sine', .03); }

let windOsc, windGain;
export function updateWind() {
  if (!actx) return;
  if (!windOsc) {
    windOsc = actx.createOscillator();
    windGain = actx.createGain();
    windOsc.frequency.value = 60;
    windGain.gain.value = 0;
    windOsc.connect(windGain).connect(actx.destination);
    windOsc.start();
  }
  windGain.gain.setTargetAtTime(Math.min(.1, S.speed / 800), actx.currentTime, .15);
  windOsc.frequency.setTargetAtTime(40 + S.speed * 1.5, actx.currentTime, .15);
}

export function stopWind() {
  if (windGain && actx) windGain.gain.setTargetAtTime(0, actx.currentTime, .1);
}
