// Both free-flight games use the same gradual steering, for humans and agents.
export const TURN_STEP = Math.PI / 22.5; // 8 degrees per 100 ms simulation step.
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const angleDelta = (from, to) =>
  Math.atan2(Math.sin(to - from), Math.cos(to - from));
export const interpolateAngle = (from, to, t) =>
  from + angleDelta(from, to) * t;
export function flightInput(p, raw = {}) {
  if (
    raw &&
    ("turn" in Object(raw) || "thrust" in Object(raw) || "brake" in Object(raw))
  ) {
    const turn = Number.isFinite(raw.turn) ? clamp(raw.turn, -1, 1) : 0;
    const thrust = Number.isFinite(raw.thrust) ? clamp(raw.thrust, 0, 1) : 0;
    const angle = angleDelta(0, p.angle + turn * TURN_STEP);
    return {
      angle,
      x: Math.cos(angle) * thrust,
      y: Math.sin(angle) * thrust,
      brake: raw.brake === true,
      aligned: true,
      fire: raw.fire === true,
      dash: raw.dash === true,
    };
  }
  // Agents select a desired course, but turn at the same bounded rate as people.
  const x = Number.isFinite(raw?.x) ? clamp(raw.x, -1, 1) : 0,
    y = Number.isFinite(raw?.y) ? clamp(raw.y, -1, 1) : 0;
  const delta = x || y ? angleDelta(p.angle, Math.atan2(y, x)) : 0;
  const angle = angleDelta(0, p.angle + clamp(delta, -TURN_STEP, TURN_STEP));
  const thrust = Math.min(1, Math.hypot(x, y)) * Math.max(0, Math.cos(delta));
  return {
    angle,
    x: Math.cos(angle) * thrust,
    y: Math.sin(angle) * thrust,
    brake: Math.abs(delta) > 1.1,
    aligned: Math.abs(delta) <= TURN_STEP * 1.5,
    fire: raw?.fire === true,
    dash: raw?.dash === true,
  };
}
