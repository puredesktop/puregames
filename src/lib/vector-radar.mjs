import { axes, add, mul, dot, sub, length, clamp } from "./vector-wake.mjs";

// Ship-relative 3D contacts: forward is up, aft is down; roll follows the cockpit.
// Out-of-range contacts stay at the rim, with altitude encoded separately.
export function radarContacts(board, pilot, range = 1600) {
  const a = axes(pilot),
    cr = Math.cos(pilot.roll),
    sr = Math.sin(pilot.roll);
  const right = add(mul(a.r, cr), mul(a.u, sr));
  const up = add(mul(a.u, cr), mul(a.r, -sr));
  const contacts = [
    ...board.enemies.map((e) => ({
      ...e,
      kind: "hostile",
      locked: e.id === board.lock,
    })),
    ...(board.wingmates || [])
      .filter((p) => p.alive)
      .map((p) => ({ ...p, kind: "wingmate", id: `wing-${p.index}` })),
  ];
  return contacts.map((contact) => {
    const delta = sub(contact, pilot),
      x = dot(delta, right),
      z = dot(delta, a.f),
      y = dot(delta, up);
    const planar = Math.hypot(x, z),
      radial = Math.min(0.92, (planar / range) * 0.92);
    return {
      ...contact,
      distance: length(delta),
      behind: z < 0,
      x: planar ? (x / planar) * radial : 0,
      y: planar ? (-z / planar) * radial : 0,
      altitude: clamp(y / range, -0.3, 0.3),
      outside: length(delta) > range,
    };
  });
}
