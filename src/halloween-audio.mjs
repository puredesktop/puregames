// Synthesised locally. No recordings, autoplay, network requests or microphone access.
export function createStreetAudio(ctx) {
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  const drone = ctx.createGain();
  drone.gain.value = 0.032;
  drone.connect(master);
  for (const hz of [43, 57.3, 85.8]) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = hz;
    osc.connect(drone);
    osc.start();
  }
  const noise = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
  const data = noise.getChannelData(0);
  let previous = 0;
  for (let i = 0; i < data.length; i++) {
    previous = (previous + (Math.random() * 2 - 1) * 0.02) / 1.02;
    data[i] = previous * 3;
  }
  const wind = ctx.createBufferSource();
  wind.buffer = noise;
  wind.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 430;
  const windGain = ctx.createGain();
  windGain.gain.value = 0.1;
  wind.connect(filter).connect(windGain).connect(master);
  wind.start();
  const pulse = (frequency, volume, duration, delay = 0) => {
    const osc = ctx.createOscillator(),
      gain = ctx.createGain(),
      t = ctx.currentTime + delay;
    osc.frequency.setValueAtTime(frequency, t);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(22, frequency * 0.45),
      t + duration
    );
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain).connect(master);
    osc.start(t);
    osc.stop(t + duration + 0.05);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  };
  return {
    set(enabled, threat = 0) {
      master.gain.setTargetAtTime(enabled ? 0.65 : 0, ctx.currentTime, 0.2);
      drone.gain.setTargetAtTime(0.032 + threat * 0.05, ctx.currentTime, 0.4);
      filter.frequency.setTargetAtTime(
        430 + threat * 250,
        ctx.currentTime,
        0.3
      );
    },
    step() {
      pulse(92, 0.09, 0.16);
    },
    knock() {
      [0, 0.24, 0.59].forEach((t) => pulse(115, 0.2, 0.13, t));
    },
    caught() {
      pulse(38, 0.2, 1.4);
      pulse(81, 0.065, 1.8, 0.08);
    },
  };
}
