// Synthesised sound only — no audio files. A WebAudio engine hum whose
// pitch follows the throttle, wind noise that grows with speed, and short
// chimes for rings, landings and crashes. Starts on the first user gesture.
export function createAudio() {
  let ctx = null; let engineOsc = null; let engineGain = null;
  let windSrc = null; let windGain = null; let windFilter = null;
  let muted = false;
  let started = false;

  function ensure() {
    if (started) return;
    started = true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      // Engine: two detuned sawtooth oscillators through a low-pass filter.
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      const engineOsc2 = ctx.createOscillator();
      engineOsc2.type = 'sawtooth';
      engineOsc2.frequency.value = 55 * 1.5;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineFilter);
      engineOsc2.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start(); engineOsc2.start();
      engineOsc.userData = { second: engineOsc2 };
      // Wind: looped white noise through a band-pass filter.
      const len = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
      windSrc = ctx.createBufferSource();
      windSrc.buffer = buffer; windSrc.loop = true;
      windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 700;
      windFilter.Q.value = 0.6;
      windGain = ctx.createGain();
      windGain.gain.value = 0;
      windSrc.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(ctx.destination);
      windSrc.start();
    } catch {
      ctx = null;
    }
  }

  /** Call every frame: engine and wind follow throttle and speed. */
  function update(throttle, speed, flying) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    engineGain.gain.setTargetAtTime(flying ? 0.05 + throttle * 0.06 : 0.03, t, 0.1);
    engineOsc.frequency.setTargetAtTime(48 + throttle * 70, t, 0.1);
    engineOsc.userData.second.frequency.setTargetAtTime((48 + throttle * 70) * 1.5, t, 0.1);
    windGain.gain.setTargetAtTime(Math.min(0.12, speed * 0.0012), t, 0.15);
    windFilter.frequency.setTargetAtTime(400 + speed * 9, t, 0.15);
  }

  function blip(freq, dur, type, vol, when = 0) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol || 0.18, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t); osc.stop(t + dur + 0.05);
  }

  return {
    ensure,
    update,
    ring() { blip(660, 0.25, 'sine', 0.2); blip(990, 0.35, 'sine', 0.18, 0.09); },
    land() { blip(523, 0.2, 'triangle', 0.2); blip(659, 0.2, 'triangle', 0.2, 0.12); blip(784, 0.4, 'triangle', 0.22, 0.24); },
    crash() { blip(90, 0.5, 'sawtooth', 0.25); blip(55, 0.7, 'sawtooth', 0.22, 0.05); },
    click() { blip(440, 0.08, 'square', 0.08); },
    toggleMute() { muted = !muted; if (ctx && engineGain) engineGain.gain.value = 0; return muted; },
    get muted() { return muted; },
  };
}
