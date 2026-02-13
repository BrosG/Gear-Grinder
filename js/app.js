// ============================================================
// GEAR GRINDER - APPLICATION ENTRY POINT
// Powered by flowky.ai
// ============================================================

import { setupInput, setupButtons, gameLoop } from './game.js';
import { startRoomScan } from './multiplayer.js';
import { $ } from './ui.js';

// --- Check for room parameter in URL ---
function checkRoomParam() {
  const params = new URLSearchParams(window.location.search);
  const room = params.get('room');
  if (room) {
    $('room-input').value = room.toUpperCase();
  }
}

// --- Initialize ---
function init() {
  checkRoomParam();
  setupInput();
  setupButtons();

  // Start scanning for active rooms
  startRoomScan();

  // Start the render loop
  gameLoop();
}

init();
