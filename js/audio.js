// ════════════════════════════════════════
//  audio.js  —  SFX & background drone
// ════════════════════════════════════════

const Audio = (() => {
  let AC = null;
  let droneNodes = null;

  function getAC() {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    return AC;
  }

  function unlock() {
    const ac = getAC();
    if (ac.state === 'suspended') ac.resume();
  }

  function tone(freq, type = 'sine', dur = 0.12, vol = 0.16, delay = 0) {
    try {
      const ac = getAC();
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      o.type = type; o.frequency.value = freq;
      const t = ac.currentTime + delay;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  }

  function noise(dur = 0.06, vol = 0.18, bandFreq = 400) {
    try {
      const ac = getAC();
      const buf = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = ac.createBufferSource();
      const g   = ac.createGain();
      const f   = ac.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = bandFreq;
      src.buffer = buf;
      src.connect(f); f.connect(g); g.connect(ac.destination);
      g.gain.setValueAtTime(vol, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      src.start(); src.stop(ac.currentTime + dur + 0.02);
    } catch (e) {}
  }

  function startDrone() {
    if (droneNodes) return;
    try {
      const ac = getAC();
      droneNodes = [55, 82, 110].map(freq => {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.type = 'sine'; o.frequency.value = freq;
        g.gain.setValueAtTime(0.035, ac.currentTime);
        o.start();
        return { o, g };
      });
    } catch (e) {}
  }

  function stopDrone() {
    if (!droneNodes) return;
    droneNodes.forEach(n => {
      try { n.g.gain.setValueAtTime(0, getAC().currentTime); n.o.stop(getAC().currentTime + 0.1); } catch (e) {}
    });
    droneNodes = null;
  }

  // ── Named SFX ─────────────────────────────────────
  const sfx = {
    paraOpen()  { tone(320, 'sine', 0.08, 0.12); tone(440, 'sine', 0.07, 0.08, 0.05); },
    paraClose() { tone(180, 'sawtooth', 0.07, 0.10); },
    hit()       { noise(0.14, 0.28, 300); tone(100, 'sawtooth', 0.18, 0.18); },
    collect()   { tone(523, 'sine', 0.10, 0.14); tone(659, 'sine', 0.10, 0.11, 0.04); tone(784, 'sine', 0.12, 0.10, 0.08); },
    rocket()    { tone(70,  'sawtooth', 0.30, 0.22); tone(140, 'sawtooth', 0.25, 0.12, 0.06); },
    destroy()   { noise(0.22, 0.30, 250); tone(180, 'square', 0.22, 0.14); },
    dash()      { tone(620, 'sine', 0.06, 0.18); tone(940, 'sine', 0.09, 0.13, 0.04); },
    laser()     { tone(820, 'sine', 0.05, 0.14); tone(1240, 'sine', 0.04, 0.09, 0.03); },
    cannon()    { noise(0.10, 0.35, 180); tone(90, 'square', 0.14, 0.22); },
  };

  return { unlock, startDrone, stopDrone, sfx };
})();
