// ============================================================
// GEAR GRINDER - P2P VOICE CHAT (WebRTC + MQTT Signaling)
// ============================================================

// ============================================================
// STATE
// ============================================================
export const Voice = {
  enabled: false,
  muted: false,
  localStream: null,
  peers: {},          // { peerId: { pc, analyser, speaking } }
  room: null,
  myId: null,
  mqttClient: null,
  audioCtx: null,
  speakingInterval: null,
  onSpeakingChange: null,  // callback(peerId, isSpeaking)
};

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

// ============================================================
// INIT / STOP
// ============================================================
export async function initVoice(room, myId, mqttClient) {
  if (Voice.enabled) return;

  try {
    Voice.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  } catch (e) {
    console.warn('Voice: mic denied', e);
    return false;
  }

  Voice.room = room;
  Voice.myId = myId;
  Voice.mqttClient = mqttClient;
  Voice.enabled = true;
  Voice.muted = false;
  Voice.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  // Subscribe to personal RTC signaling topic
  const topic = 'geargrinder/rtc/' + room + '/' + myId;
  mqttClient.subscribe(topic);

  // Start speaking detection loop
  Voice.speakingInterval = setInterval(checkSpeaking, 150);

  return true;
}

export function stopVoice() {
  if (!Voice.enabled) return;

  // Close all peer connections
  Object.keys(Voice.peers).forEach(id => disconnectPeer(id));

  // Stop local stream
  if (Voice.localStream) {
    Voice.localStream.getTracks().forEach(t => t.stop());
    Voice.localStream = null;
  }

  // Unsubscribe
  if (Voice.mqttClient && Voice.mqttClient.isConnected() && Voice.room) {
    try {
      Voice.mqttClient.unsubscribe('geargrinder/rtc/' + Voice.room + '/' + Voice.myId);
    } catch (e) {}
  }

  if (Voice.speakingInterval) {
    clearInterval(Voice.speakingInterval);
    Voice.speakingInterval = null;
  }

  if (Voice.audioCtx) {
    Voice.audioCtx.close().catch(() => {});
    Voice.audioCtx = null;
  }

  Voice.enabled = false;
  Voice.muted = false;
  Voice.peers = {};
}

// ============================================================
// PEER CONNECTION
// ============================================================
export function connectToPeer(peerId) {
  if (!Voice.enabled || Voice.peers[peerId]) return;

  // Deterministic initiator: lower ID creates offer
  const isInitiator = Voice.myId < peerId;

  const pc = new RTCPeerConnection(RTC_CONFIG);
  Voice.peers[peerId] = { pc, analyser: null, speaking: false, audio: null };

  // Add local tracks
  if (Voice.localStream) {
    Voice.localStream.getTracks().forEach(track => {
      pc.addTrack(track, Voice.localStream);
    });
  }

  // ICE candidates -> send via MQTT
  pc.onicecandidate = (e) => {
    if (e.candidate) {
      sendRtcSignal(peerId, { type: 'rtc_ice', candidate: e.candidate, from: Voice.myId });
    }
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
      disconnectPeer(peerId);
    }
  };

  // Remote audio
  pc.ontrack = (e) => {
    const remoteStream = e.streams[0];
    if (!remoteStream) return;

    // Play remote audio
    const audio = new Audio();
    audio.srcObject = remoteStream;
    audio.play().catch(() => {});
    Voice.peers[peerId].audio = audio;

    // Analyser for speaking detection
    try {
      const source = Voice.audioCtx.createMediaStreamSource(remoteStream);
      const analyser = Voice.audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      Voice.peers[peerId].analyser = analyser;
    } catch (e) {
      console.warn('Voice: analyser error', e);
    }
  };

  // Only initiator creates the offer
  if (isInitiator) {
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .then(() => {
        sendRtcSignal(peerId, { type: 'rtc_offer', sdp: pc.localDescription, from: Voice.myId });
      })
      .catch(e => console.warn('Voice: offer error', e));
  }
}

function disconnectPeer(peerId) {
  const peer = Voice.peers[peerId];
  if (!peer) return;
  if (peer.pc) { try { peer.pc.close(); } catch (e) {} }
  if (peer.audio) { peer.audio.srcObject = null; }
  if (Voice.onSpeakingChange) Voice.onSpeakingChange(peerId, false);
  delete Voice.peers[peerId];
}

// ============================================================
// SIGNALING (via MQTT)
// ============================================================
function sendRtcSignal(targetId, data) {
  if (!Voice.mqttClient || !Voice.mqttClient.isConnected()) return;
  const payload = JSON.stringify(data);
  const m = new Paho.MQTT.Message(payload);
  m.destinationName = 'geargrinder/rtc/' + Voice.room + '/' + targetId;
  Voice.mqttClient.send(m);
}

export function handleRtcSignal(data) {
  if (!Voice.enabled) return;
  const from = data.from;
  if (!from || from === Voice.myId) return;

  if (data.type === 'rtc_offer') {
    // Create peer if not exists and handle offer
    if (!Voice.peers[from]) {
      connectToPeer(from);
    }
    const peer = Voice.peers[from];
    if (!peer || !peer.pc) return;

    peer.pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
      .then(() => peer.pc.createAnswer())
      .then(answer => peer.pc.setLocalDescription(answer))
      .then(() => {
        sendRtcSignal(from, { type: 'rtc_answer', sdp: peer.pc.localDescription, from: Voice.myId });
      })
      .catch(e => console.warn('Voice: answer error', e));

  } else if (data.type === 'rtc_answer') {
    const peer = Voice.peers[from];
    if (!peer || !peer.pc) return;
    peer.pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
      .catch(e => console.warn('Voice: remote desc error', e));

  } else if (data.type === 'rtc_ice') {
    const peer = Voice.peers[from];
    if (!peer || !peer.pc) return;
    peer.pc.addIceCandidate(new RTCIceCandidate(data.candidate))
      .catch(e => console.warn('Voice: ICE error', e));
  }
}

// ============================================================
// MUTE
// ============================================================
export function toggleMute() {
  if (!Voice.enabled || !Voice.localStream) return Voice.muted;
  Voice.muted = !Voice.muted;
  Voice.localStream.getAudioTracks().forEach(t => { t.enabled = !Voice.muted; });
  return Voice.muted;
}

// ============================================================
// SPEAKING DETECTION
// ============================================================
function checkSpeaking() {
  if (!Voice.enabled) return;

  Object.entries(Voice.peers).forEach(([id, peer]) => {
    if (!peer.analyser) return;

    const data = new Uint8Array(peer.analyser.frequencyBinCount);
    peer.analyser.getByteFrequencyData(data);

    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i];
    const avg = sum / data.length;

    const wasSpeaking = peer.speaking;
    peer.speaking = avg > 25;

    if (peer.speaking !== wasSpeaking && Voice.onSpeakingChange) {
      Voice.onSpeakingChange(id, peer.speaking);
    }
  });
}

// ============================================================
// UI HELPERS
// ============================================================
export function updateVoiceIndicators() {
  // Update all voice indicator elements in the DOM
  document.querySelectorAll('.voice-indicator').forEach(el => {
    const id = el.getAttribute('data-voice-id');
    if (!id) return;

    if (!Voice.enabled) {
      el.classList.remove('active', 'speaking');
      return;
    }

    el.classList.add('active');
    const peer = Voice.peers[id];
    if (peer && peer.speaking) {
      el.classList.add('speaking');
    } else {
      el.classList.remove('speaking');
    }
  });
}
