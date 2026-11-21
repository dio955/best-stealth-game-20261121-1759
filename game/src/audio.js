// Night Ledger — sound effects.
// One clear job: every sound in the game, made with WebAudio oscillators only.
// No audio files, no network. The AudioContext is created on the first user
// gesture (a key press or click), so browsers never block it.

'use strict';

NL.Audio = (function () {
  let ctx = null;
  let muted = false;
  let master = null;

  function ensureContext() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    return ctx;
  }

  // A short oscillator blip: frequency slides from f0 to f1 over `dur` seconds.
  function blip(f0, f1, dur, type, volume, when) {
    if (muted) return;
    const c = ensureContext();
    if (!c) return;
    const t0 = c.currentTime + (when || 0);
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(f0, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // A short burst of filtered noise, for footsteps.
  function noiseBurst(dur, volume, cutoff) {
    if (muted) return;
    const c = ensureContext();
    if (!c) return;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buffer = c.createBuffer(1, len, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff || 900;
    const gain = c.createGain();
    gain.gain.value = volume;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start();
  }

  return {
    // Call from any keydown / mousedown handler.
    unlock: function () { ensureContext(); },

    toggleMute: function () {
      muted = !muted;
      return muted;
    },
    isMuted: function () { return muted; },

    // The player's own step: a quiet tick, slightly higher when running.
    footstep: function (running) {
      noiseBurst(0.05, running ? 0.10 : 0.06, running ? 1200 : 800);
    },

    // A guard's step: a lower tick whose volume falls off with distance.
    // `distance` is in pixels; beyond 320 px it is silent.
    guardStep: function (distance) {
      const closeness = Math.max(0, 1 - distance / 320);
      if (closeness <= 0.02) return;
      noiseBurst(0.06, 0.04 + 0.16 * closeness, 500);
    },

    // Two-note chime when the player picks up loot.
    pickup: function () {
      blip(660, 660, 0.09, 'sine', 0.22);
      blip(990, 990, 0.14, 'sine', 0.22, 0.08);
    },

    // Metallic ping when a tossed coin lands.
    coin: function () {
      blip(1568, 1200, 0.18, 'triangle', 0.25);
      blip(2093, 2093, 0.10, 'sine', 0.12, 0.02);
    },

    // Rising two-tone sting when the alarm goes off.
    alarm: function () {
      blip(440, 660, 0.16, 'square', 0.16);
      blip(660, 880, 0.22, 'square', 0.16, 0.15);
    },

    // Low buzz when the player is caught.
    caught: function () {
      blip(180, 60, 0.5, 'sawtooth', 0.25);
    },

    // Little arpeggio when a level is cleared.
    win: function () {
      const notes = [523, 659, 784, 1047];
      for (let i = 0; i < notes.length; i++) {
        blip(notes[i], notes[i], 0.16, 'sine', 0.22, i * 0.11);
      }
    },

    // Soft click for menu navigation.
    click: function () {
      blip(800, 700, 0.05, 'sine', 0.12);
    }
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = NL;
