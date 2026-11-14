// audio.js — synthesized sound effects and music via Web Audio API
(function (global) {
  'use strict';

  let ctx = null;
  let masterGain = null;
  let musicGain = null;
  let sfxGain = null;
  let musicNodes = null;
  let enabled = true;
  let musicEnabled = true;
  let musicPlaying = false;
  let initialized = false;

  function ensure() {
    if (ctx) return ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.9;
      masterGain.connect(ctx.destination);
      sfxGain = ctx.createGain();
      sfxGain.gain.value = 0.7;
      sfxGain.connect(masterGain);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.35;
      musicGain.connect(masterGain);
      initialized = true;
    } catch (e) {
      initialized = false;
    }
    return ctx;
  }

  function resume() {
    ensure();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  function setEnabled(v) { enabled = !!v; if (masterGain) masterGain.gain.value = enabled ? 0.9 : 0; }
  function setMusicEnabled(v) { musicEnabled = !!v; if (musicGain) musicGain.gain.value = musicEnabled ? 0.35 : 0; if (!musicEnabled) stopMusic(); }

  function tone(freq, dur, type, gain, dest, start) {
    if (!ctx) return;
    const t = start || ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gain || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(dest || sfxGain);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function noise(dur, gain, dest, start) {
    if (!ctx) return;
    const t = start || ctx.currentTime;
    const bufSize = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain || 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(g);
    g.connect(dest || sfxGain);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  const SFX = {
    shoot() {
      if (!enabled || !ctx) return;
      resume();
      tone(880, 0.06, 'square', 0.12);
      tone(1320, 0.04, 'square', 0.08, sfxGain, ctx.currentTime + 0.02);
    },
    shootDouble() {
      if (!enabled || !ctx) return;
      resume();
      tone(880, 0.06, 'square', 0.1);
      tone(1100, 0.06, 'square', 0.1, sfxGain, ctx.currentTime + 0.01);
    },
    explosion() {
      if (!enabled || !ctx) return;
      resume();
      noise(0.4, 0.4);
      tone(120, 0.3, 'sawtooth', 0.25);
      tone(60, 0.4, 'sawtooth', 0.2, sfxGain, ctx.currentTime + 0.05);
    },
    bigExplosion() {
      if (!enabled || !ctx) return;
      resume();
      noise(0.7, 0.5);
      tone(80, 0.5, 'sawtooth', 0.35);
      tone(40, 0.6, 'sawtooth', 0.25, sfxGain, ctx.currentTime + 0.1);
    },
    enemyShoot() {
      if (!enabled || !ctx) return;
      resume();
      tone(440, 0.08, 'triangle', 0.08);
    },
    powerup() {
      if (!enabled || !ctx) return;
      resume();
      const t = ctx.currentTime;
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, 'sine', 0.15, sfxGain, t + i * 0.08));
    },
    hit() {
      if (!enabled || !ctx) return;
      resume();
      tone(220, 0.1, 'square', 0.15);
    },
    bossWarn() {
      if (!enabled || !ctx) return;
      resume();
      const t = ctx.currentTime;
      for (let i = 0; i < 4; i++) {
        tone(660, 0.15, 'sawtooth', 0.2, sfxGain, t + i * 0.25);
        tone(330, 0.15, 'sawtooth', 0.2, sfxGain, t + i * 0.25 + 0.12);
      }
    },
    gameOver() {
      if (!enabled || !ctx) return;
      resume();
      const t = ctx.currentTime;
      [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.2, sfxGain, t + i * 0.25));
    },
    button() {
      if (!enabled || !ctx) return;
      resume();
      tone(660, 0.05, 'sine', 0.12);
    },
  };

  function startMusic() {
    if (!ctx || !musicEnabled || musicPlaying) return;
    resume();
    musicPlaying = true;
    const nodes = [];
    // bass line loop
    const bass = ctx.createOscillator();
    bass.type = 'triangle';
    const bassGain = ctx.createGain();
    bassGain.gain.value = 0.18;
    bass.connect(bassGain);
    bassGain.connect(musicGain);
    bass.start();
    nodes.push(bass, bassGain);

    const lead = ctx.createOscillator();
    lead.type = 'square';
    const leadGain = ctx.createGain();
    leadGain.gain.value = 0.08;
    lead.connect(leadGain);
    leadGain.connect(musicGain);
    lead.start();
    nodes.push(lead, leadGain);

    // LFO-ish arpeggio via scheduled notes
    const scale = [262, 294, 330, 349, 392, 440, 494, 523];
    let step = 0;
    const interval = setInterval(() => {
      if (!musicPlaying || !ctx) return;
      const now = ctx.currentTime;
      const f = scale[step % scale.length];
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'square';
      o.frequency.value = f * 2;
      g.gain.setValueAtTime(0.06, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      o.connect(g);
      g.connect(musicGain);
      o.start(now);
      o.stop(now + 0.2);
      // bass
      const bf = scale[(step * 2) % scale.length] / 2;
      const bo = ctx.createOscillator();
      const bg = ctx.createGain();
      bo.type = 'triangle';
      bo.frequency.value = bf;
      bg.gain.setValueAtTime(0.12, now);
      bg.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      bo.connect(bg);
      bg.connect(musicGain);
      bo.start(now);
      bo.stop(now + 0.25);
      step++;
    }, 220);
    nodes.push({ interval });

    musicNodes = nodes;
  }

  function stopMusic() {
    musicPlaying = false;
    if (musicNodes) {
      musicNodes.forEach(n => {
        try { if (n.interval) clearInterval(n.interval); } catch (e) {}
        try { if (n.stop) n.stop(); } catch (e) {}
        try { if (n.disconnect) n.disconnect(); } catch (e) {}
      });
      musicNodes = null;
    }
  }

  global.AudioManager = {
    ensure, resume, setEnabled, setMusicEnabled,
    startMusic, stopMusic,
    sfx: SFX,
    get enabled() { return enabled; },
    get musicEnabled() { return musicEnabled; },
    get ctx() { return ctx; },
    get musicGain() { return musicGain; },
    get sfxGain() { return sfxGain; },
  };
})(window);
