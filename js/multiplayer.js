// ============================================================
// GEAR GRINDER - MULTIPLAYER (MQTT Rooms + Player Rendering)
// ============================================================

import { scene } from './renderer.js';
import { S } from './state.js';
import {
  MAX_PLAYERS_PER_ROOM, PLAYER_COLORS,
  getCurveX, getCurveDeriv, getHeightDeriv,
} from './constants.js';
import { createPlayerBike } from './bike.js';
import { $, toast, updateLobbyUI, updateRoomList, updateLeaderboard } from './ui.js';

const THREE = window.THREE;

// ============================================================
// MULTIPLAYER STATE
// ============================================================
export const MP = {
  client: null,
  room: 'RACE1',
  id: 'RIDER_' + Math.floor(Math.random() * 9999),
  playerName: '',
  state: 'DISCONNECTED',  // DISCONNECTED, LOBBY, COUNTDOWN, RACING
  players: {},
  lastSent: 0,
  colorIndex: 0,
  onCountdown: null,      // callback set by game.js
  onStartGame: null,      // callback set by game.js
};

// Room discovery
const knownRooms = {};
let roomScanInterval = null;

// ============================================================
// CONNECTION
// ============================================================
export function initMP(roomCode, callbacks = {}) {
  MP.room = roomCode.toUpperCase();
  MP.onCountdown = callbacks.onCountdown || null;
  MP.onStartGame = callbacks.onStartGame || null;
  MP.playerName = MP.id.replace('RIDER_', 'R');

  try {
    MP.client = new Paho.MQTT.Client('broker.emqx.io', 8084, MP.id);
  } catch (e) {
    toast('NETWORK ERROR');
    return;
  }

  MP.client.onConnectionLost = (o) => {
    console.log('MP Lost', o);
    if (MP.state === 'LOBBY') toast('CONNECTION LOST');
  };
  MP.client.onMessageArrived = onMessage;

  MP.client.connect({
    onSuccess: () => {
      console.log('Connected to Broker');
      // Subscribe to room topic + global directory
      MP.client.subscribe('geargrinder/lob/' + MP.room);
      MP.client.subscribe('geargrinder/directory');
      enterLobby();
    },
    onFailure: (e) => {
      toast('CANNOT CONNECT TO SERVER');
      $('start-btn').textContent = 'ENTER LOBBY';
      $('start-btn').disabled = false;
    },
    useSSL: true,
  });
}

// ============================================================
// MESSAGING
// ============================================================
function sendMsg(type, data = {}) {
  if (!MP.client || !MP.client.isConnected()) return;
  const payload = JSON.stringify({ ...data, type, id: MP.id, name: MP.playerName });
  const m = new Paho.MQTT.Message(payload);
  m.destinationName = 'geargrinder/lob/' + MP.room;
  MP.client.send(m);
}

function sendDirectory() {
  if (!MP.client || !MP.client.isConnected()) return;
  const playerCount = Object.keys(MP.players).length;
  const payload = JSON.stringify({
    room: MP.room,
    players: playerCount,
    racing: MP.state === 'RACING',
  });
  const m = new Paho.MQTT.Message(payload);
  m.destinationName = 'geargrinder/directory';
  MP.client.send(m);
}

// ============================================================
// MESSAGE HANDLER
// ============================================================
function onMessage(msg) {
  let data;
  try { data = JSON.parse(msg.payloadString); } catch (e) { return; }

  // Room directory messages
  if (msg.destinationName === 'geargrinder/directory') {
    if (data.room) {
      knownRooms[data.room] = {
        players: data.players || 0,
        racing: data.racing || false,
        lastSeen: Date.now(),
      };
      updateRoomList(knownRooms);
    }
    return;
  }

  // Ignore self
  if (data.id === MP.id) return;

  if (data.type === 'presence') {
    if (!MP.players[data.id]) {
      // Check room capacity
      const currentCount = Object.keys(MP.players).length;
      if (currentCount >= MAX_PLAYERS_PER_ROOM) return;

      // Assign color
      const colorIdx = currentCount % PLAYER_COLORS.length;
      MP.players[data.id] = {
        name: data.name || data.id.substring(0, 8),
        color: PLAYER_COLORS[colorIdx],
        ready: true,
        mesh: null,
        targetDist: 0,
        laneX: 0,
        lastUpd: 0,
      };
      updateLobbyUI(MP.players, MP.id);
      sendMsg('presence');
      sendDirectory();
    }
  } else if (data.type === 'start_race') {
    const delay = data.startAt - Date.now();
    if (MP.onCountdown) MP.onCountdown(delay > 0 ? delay : 0);
  } else if (data.type === 'pos') {
    updateOpponent(data);
  }
}

// ============================================================
// LOBBY
// ============================================================
function enterLobby() {
  MP.state = 'LOBBY';
  $('start-screen').style.display = 'none';
  $('lobby-screen').classList.add('show');
  $('lobby-room-display').innerText = 'ROOM: ' + MP.room;

  // Assign self a color
  MP.colorIndex = 0;
  MP.players[MP.id] = {
    name: MP.playerName,
    color: PLAYER_COLORS[0],
    ready: true,
  };

  sendMsg('presence');
  updateLobbyUI(MP.players, MP.id);
  sendDirectory();

  // Periodic presence + directory
  if (roomScanInterval) clearInterval(roomScanInterval);
  roomScanInterval = setInterval(() => {
    if (MP.state === 'LOBBY') {
      sendMsg('presence');
      sendDirectory();
    }
    // Prune stale rooms
    const now = Date.now();
    Object.keys(knownRooms).forEach(k => {
      if (now - knownRooms[k].lastSeen > 15000) delete knownRooms[k];
    });
  }, 2000);
}

// ============================================================
// RACE START
// ============================================================
export function triggerRaceStart() {
  const startTimestamp = Date.now() + 3000;
  sendMsg('start_race', { startAt: startTimestamp });
  if (MP.onCountdown) MP.onCountdown(3000);
}

export function setRacing() {
  MP.state = 'RACING';
}

// ============================================================
// OPPONENT RENDERING
// ============================================================
function updateOpponent(data) {
  if (!MP.players[data.id]) {
    MP.players[data.id] = {
      name: data.name || data.id.substring(0, 8),
      color: PLAYER_COLORS[Object.keys(MP.players).length % PLAYER_COLORS.length],
      mesh: null, targetDist: 0, laneX: 0, lastUpd: 0,
    };
  }
  const opp = MP.players[data.id];

  // Create visible bike with name (not a ghost!)
  if (!opp.mesh) {
    const playerBike = createPlayerBike(opp.color, opp.name);
    scene.add(playerBike.bikeGrp);
    opp.mesh = playerBike.bikeGrp;
    opp.bikeData = playerBike;
  }

  opp.targetDist = data.d;
  opp.laneX = data.x;
  opp.mesh.visible = true;
  opp.lastUpd = Date.now();
}

// ============================================================
// MULTIPLAYER GAME LOOP
// ============================================================
export function mpLoop(dt) {
  if (MP.state !== 'RACING') return;

  const now = Date.now();

  // Send position every 100ms
  if (now - MP.lastSent > 100) {
    sendMsg('pos', { d: Math.floor(S.distance), x: S.laneX });
    MP.lastSent = now;
  }

  // Update opponent positions
  Object.entries(MP.players).forEach(([id, opp]) => {
    if (id === MP.id) return;
    if (!opp.mesh) return;
    if (now - opp.lastUpd > 5000) { opp.mesh.visible = false; return; }

    const relZ = -(opp.targetDist - S.distance);
    if (relZ > -200 && relZ < 50) {
      opp.mesh.visible = true;
      const oppWorldZ = S._worldZ - (opp.targetDist - S.distance);

      // Lateral position with curve following
      const curveX = getCurveX(oppWorldZ, S.distance);
      opp.mesh.position.x += ((curveX + opp.laneX) - opp.mesh.position.x) * dt * 5;

      // Longitudinal position
      const visualZ = -(opp.targetDist - S.distance);
      opp.mesh.position.z += (visualZ - opp.mesh.position.z) * dt * 5;
      opp.mesh.position.y = 0;

      // Rotation
      const cd = getCurveDeriv(oppWorldZ, S.distance);
      opp.mesh.rotation.z = -cd * 0.08;
      opp.mesh.rotation.x = -getHeightDeriv(oppWorldZ, S.distance, S.difficulty) * 1.5;

      // Animate wheels
      if (opp.bikeData) {
        opp.bikeData.frontW.rotation.x += dt * 10;
        opp.bikeData.rearW.rotation.x += dt * 10;
        opp.bikeData.crankGrp.rotation.x += dt * 5;
      }
    } else {
      opp.mesh.visible = false;
    }
  });

  // Update leaderboard
  updateLeaderboard(MP.players, MP.id, S.distance);
}

// ============================================================
// ROOM DISCOVERY (for start screen)
// ============================================================
export function startRoomScan() {
  // Connect just for room scanning
  if (MP.client && MP.client.isConnected()) return;
  try {
    const scanClient = new Paho.MQTT.Client('broker.emqx.io', 8084, 'SCAN_' + Math.floor(Math.random() * 9999));
    scanClient.onMessageArrived = (msg) => {
      if (msg.destinationName === 'geargrinder/directory') {
        let data;
        try { data = JSON.parse(msg.payloadString); } catch (e) { return; }
        if (data.room) {
          knownRooms[data.room] = {
            players: data.players || 0,
            racing: data.racing || false,
            lastSeen: Date.now(),
          };
          updateRoomList(knownRooms);
        }
      }
    };
    scanClient.connect({
      onSuccess: () => {
        scanClient.subscribe('geargrinder/directory');
        // Disconnect after 30 seconds if we haven't joined
        setTimeout(() => {
          try { scanClient.disconnect(); } catch (e) {}
        }, 30000);
      },
      useSSL: true,
    });
  } catch (e) {
    // Silent fail for room scan
  }
}

// ============================================================
// CLEANUP
// ============================================================
export function cleanupOpponents() {
  Object.entries(MP.players).forEach(([id, opp]) => {
    if (id === MP.id) return;
    if (opp.mesh) {
      scene.remove(opp.mesh);
      opp.mesh = null;
    }
  });
}
