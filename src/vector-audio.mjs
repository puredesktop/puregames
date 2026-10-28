// Synthesised locally; no recordings, samples or external sound assets.
export function createFlightAudio() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return null;
  const ctx = new Audio(),
    out = ctx.createGain();
  out.gain.value = 0.16;
  out.connect(ctx.destination);
  const engine = ctx.createOscillator(),
    hum = ctx.createGain();
  engine.type = "triangle";
  engine.frequency.value = 44;
  hum.gain.value = 0;
  engine.connect(hum).connect(out);
  engine.start();
  function tone(freq, duration, type = "sine", level = 0.2, end = freq) {
    const at = ctx.currentTime,
      o = ctx.createOscillator(),
      g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, at);
    o.frequency.exponentialRampToValueAtTime(Math.max(10, end), at + duration);
    g.gain.setValueAtTime(level, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + duration);
    o.connect(g).connect(out);
    o.start(at);
    o.stop(at + duration);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
  function rumble(duration = 0.65) {
    const buffer = ctx.createBuffer(
      1,
      Math.ceil(ctx.sampleRate * duration),
      ctx.sampleRate
    );
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++)
      samples[i] = (Math.random() * 2 - 1) * (1 - i / samples.length);
    const noise = ctx.createBufferSource(),
      filter = ctx.createBiquadFilter(),
      gain = ctx.createGain();
    noise.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.value = 650;
    gain.gain.value = 0.65;
    noise.connect(filter).connect(gain).connect(out);
    noise.start();
    noise.onended = () => {
      noise.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }
  return {
    resume: () => ctx.resume(),
    update(speed, active) {
      engine.frequency.setTargetAtTime(35 + speed * 0.3, ctx.currentTime, 0.2);
      hum.gain.setTargetAtTime(active ? 0.1 : 0, ctx.currentTime, 0.12);
    },
    laser: () => tone(840, 0.11, "sawtooth", 0.13, 95),
    hit: () => tone(150, 0.13, "triangle", 0.3, 50),
    explode() {
      rumble();
      tone(85, 0.5, "triangle", 0.45, 22);
    },
    damage() {
      rumble(0.2);
      tone(65, 0.22, "square", 0.15, 30);
    },
    pickup() {
      tone(580, 0.16, "sine", 0.18, 1120);
    },
    roll() {
      tone(90, 0.55, "triangle", 0.22, 480);
    },
    lock: () => tone(1300, 0.07, "sine", 0.1),
    missile: () => tone(80, 0.45, "triangle", 0.3, 300),
    dispose() {
      engine.stop();
      void ctx.close();
    },
  };
}
