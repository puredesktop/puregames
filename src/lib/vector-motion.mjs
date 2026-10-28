// Presentation only: keep every cockpit object on the same buffered 10 Hz timeline.
// The small buffer absorbs uneven multiplayer deliveries without predicting combat.
const DELAY = 0.15;
const linearFields = ["x", "y", "z", "vx", "vy", "vz", "speed"];
const angleFields = ["yaw", "pitch", "roll"];
const mix = (a, b, t) => a + (b - a) * t;
const angle = (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;

function pose(a, b, t) {
  // Death/respawn is a discontinuity, never fly a ship through its respawn route.
  if (!b || a.alive !== b.alive || a.respawnAt !== b.respawnAt) return a;
  const p = { ...a };
  for (const key of linearFields)
    if (Number.isFinite(a[key]) && Number.isFinite(b[key]))
      p[key] = mix(a[key], b[key], t);
  for (const key of angleFields)
    if (Number.isFinite(a[key]) && Number.isFinite(b[key]))
      p[key] = angle(a[key], b[key], t);
  if (a.type && Number.isFinite(a.vx) && Number.isFinite(b.vx))
    p.flightYaw = angle(Math.atan2(-a.vx, -a.vz), Math.atan2(-b.vx, -b.vz), t);
  return p;
}

export function interpolateVector(a, b, time) {
  if (time >= b.time || b.time <= a.time) return { ...b, smoothMotion: true };
  const t = Math.max(0, (time - a.time) / (b.time - a.time));
  const list = (key, id) => {
    const next = new Map((b[key] || []).map((p, i) => [id(p, i), p]));
    return (a[key] || []).map((p, i) => pose(p, next.get(id(p, i)), t));
  };
  return {
    ...a,
    time: Math.max(a.time, time),
    smoothMotion: true,
    players: list("players", (_, i) => i),
    wingmates: list("wingmates", (p) => p.index),
    enemies: list("enemies", (e) => e.id),
    shots: list("shots", (s) => s.id),
    pickups: list("pickups", (p) => p.id),
  };
}

export function createVectorMotion() {
  let frames = [],
    clock,
    lastFrame,
    arrived,
    stopped = false;
  return {
    sample(board, now, paused = false) {
      const last = frames.at(-1);
      const reset =
        !last ||
        board.time < last.time ||
        board.pilotIndex !== last.pilotIndex ||
        board.arena !== last.arena ||
        now - lastFrame > 1000 ||
        stopped !== (paused || !!board.done);
      if (reset) {
        frames = [board];
        clock = board.time - DELAY;
        arrived = now;
        lastFrame = now;
      } else if (board.tick !== last.tick) {
        frames.push(board);
        arrived = now;
      }
      stopped = paused || !!board.done;
      if (stopped) {
        frames = [board];
        lastFrame = now;
        return { ...board, smoothMotion: true };
      }
      const latest = frames.at(-1);
      // A monotonic clock, rather than restarting a tween on each arriving packet.
      // Gently correct drift; never jump backwards when packets arrive in a burst.
      const estimated = latest.time + Math.min(100, now - arrived) / 1000;
      const error = estimated - DELAY - clock;
      const rate = 1 + Math.max(-0.08, Math.min(0.08, error * 2));
      clock = Math.min(
        latest.time,
        clock + (Math.max(0, now - lastFrame) / 1000) * rate
      );
      lastFrame = now;
      while (frames.length > 2 && frames[1].time <= clock) frames.shift();
      return interpolateVector(frames[0], frames[1] || frames[0], clock);
    },
  };
}
