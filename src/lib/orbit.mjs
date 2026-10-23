// Original deterministic arena simulation. One coordinator advances each 100 ms step.
export const ORBIT_WIDTH = 900,
  ORBIT_HEIGHT = 600,
  ORBIT_LIMIT = 900,
  ORBIT_TARGET = 20;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const gatesAt = (tick) =>
  [0, Math.PI].map((a) => ({
    x: 450 + Math.cos(a + tick * 0.004) * 290,
    y: 300 + Math.sin(a + tick * 0.004) * 180,
  }));
export const hazardsAt = (tick, arena = "open") =>
  Array.from({ length: arena === "islands" ? 5 : 3 }, (_, i) => {
    const a = (i * Math.PI * 2) / (arena === "islands" ? 5 : 3) + tick * 0.013;
    return {
      x: 450 + Math.cos(a) * (i % 2 ? 155 : 210),
      y: 300 + Math.sin(a) * (i % 2 ? 115 : 150),
      r: 17,
    };
  });
const coreAt = (i, cycle = 0) => {
  const angle = i * 2.399963 + cycle * 1.17;
  const r = 95 + ((i * 47 + cycle * 31) % 235);
  return { x: 450 + Math.cos(angle) * r, y: 300 + Math.sin(angle) * r * 0.67 };
};
export function newOrbit(count = 2, arena = "open") {
  if (!Number.isInteger(count) || count < 2 || count > 4)
    throw Error("Choose two to four players.");
  return {
    kind: "orbit",
    arena,
    tick: 0,
    done: false,
    winners: [],
    events: [],
    players: Array.from({ length: count }, (_, i) => ({
      x: [125, 775, 450, 450][i],
      y: [300, 300, 95, 505][i],
      vx: 0,
      vy: 0,
      angle: i === 1 ? Math.PI : 0,
      score: 0,
      cargo: 0,
      cooldown: 0,
      shield: 20,
      stun: 0,
      boost: 0,
      alive: true,
    })),
    cores: Array.from({ length: 26 }, (_, i) => ({
      id: i,
      ...coreAt(i),
      cycle: 0,
      wait: 0,
    })),
  };
}
export function orbitInput(raw) {
  const x = Number.isFinite(raw?.x) ? clamp(raw.x, -1, 1) : 0,
    y = Number.isFinite(raw?.y) ? clamp(raw.y, -1, 1) : 0,
    n = Math.max(1, Math.hypot(x, y));
  return { x: x / n, y: y / n, dash: raw?.dash === true };
}
export function orbitBot(s, i) {
  const p = s.players[i],
    gates = gatesAt(s.tick),
    hazards = hazardsAt(s.tick, s.arena);
  const targets =
    p.cargo >= 4 || (s.tick > ORBIT_LIMIT - 80 && p.cargo)
      ? gates
      : s.cores.filter((c) => !c.wait);
  const target =
    targets.reduce(
      (a, b) => (!a || distance(p, b) < distance(p, a) ? b : a),
      null
    ) || gates[0];
  let x = target.x - p.x,
    y = target.y - p.y,
    n = Math.max(1, Math.hypot(x, y));
  x /= n;
  y /= n;
  for (const h of hazards) {
    const d = distance(p, h);
    if (d < 80) {
      x += ((p.x - h.x) / Math.max(1, d)) * 2.8 * (1 - d / 80);
      y += ((p.y - h.y) / Math.max(1, d)) * 2.8 * (1 - d / 80);
    }
  }
  // Brake on approach instead of orbiting a target indefinitely.
  return orbitInput({
    x: x * Math.min(1, n / 25) - p.vx * 0.025,
    y: y * Math.min(1, n / 25) - p.vy * 0.025,
    dash:
      p.cooldown === 0 && n > 140 && hazards.every((h) => distance(p, h) > 85),
  });
}
export function stepOrbit(s, inputs = {}) {
  if (s.done) return s;
  const tick = s.tick + 1,
    events = [],
    gates = gatesAt(tick),
    hazards = hazardsAt(tick, s.arena);
  const players = s.players.map((old, i) => {
    const p = {
      ...old,
      cooldown: Math.max(0, old.cooldown - 1),
      shield: Math.max(0, old.shield - 1),
      stun: Math.max(0, old.stun - 1),
      boost: Math.max(0, old.boost - 1),
    };
    const input = orbitInput(inputs[i]);
    if (!p.stun) {
      p.vx = p.vx * 0.77 + input.x * 2.7;
      p.vy = p.vy * 0.77 + input.y * 2.7;
      if (input.x || input.y) p.angle = Math.atan2(input.y, input.x);
      if (input.dash && !p.cooldown && (input.x || input.y)) {
        p.vx += input.x * 18;
        p.vy += input.y * 18;
        p.cooldown = 40;
        p.boost = 4;
        p.shield = Math.max(p.shield, 4);
        events.push({ type: "dash", x: p.x, y: p.y, owner: i, tick });
      }
    } else {
      p.vx *= 0.8;
      p.vy *= 0.8;
    }
    p.x = clamp(p.x + p.vx, 36, 864);
    p.y = clamp(p.y + p.vy, 46, 554);
    if (p.x === 36 || p.x === 864) p.vx *= -0.5;
    if (p.y === 46 || p.y === 554) p.vy *= -0.5;
    if (!p.shield && hazards.some((h) => distance(p, h) < h.r + 12)) {
      const lost = Math.min(3, p.cargo);
      p.cargo -= lost;
      p.stun = 5;
      p.shield = 18;
      p.vx *= -0.6;
      p.vy *= -0.6;
      events.push({ type: "hit", x: p.x, y: p.y, owner: i, tick, value: lost });
    }
    return p;
  });
  // Resolve each pair once, then collectibles by distance, rotating exact ties for fairness.
  for (let i = 0; i < players.length; i++)
    for (let j = i + 1; j < players.length; j++) {
      const a = players[i],
        b = players[j],
        d = distance(a, b);
      if (d < 25) {
        const nx = (a.x - b.x) / (d || 1) || 1,
          ny = (a.y - b.y) / (d || 1);
        a.vx += nx * 3;
        a.vy += ny * 3;
        b.vx -= nx * 3;
        b.vy -= ny * 3;
      }
    }
  const cores = s.cores.map((c) => {
    if (c.wait > 0) return { ...c, wait: c.wait - 1 };
    const next = {
      ...c,
      x: c.x + Math.sin(tick * 0.018 + c.id) * 0.18,
      y: c.y + Math.cos(tick * 0.015 + c.id) * 0.16,
    };
    const candidates = players
      .map((p, i) => ({ p, i, d: distance(p, next) }))
      .filter(({ p, d }) => !p.stun && p.cargo < 7 && d < 24)
      .sort(
        (a, b) =>
          a.d - b.d ||
          ((a.i + tick) % players.length) - ((b.i + tick) % players.length)
      );
    if (candidates.length) {
      const { p, i } = candidates[0];
      p.cargo++;
      events.push({ type: "collect", x: next.x, y: next.y, owner: i, tick });
      return {
        ...next,
        ...coreAt(c.id, c.cycle + 1),
        cycle: c.cycle + 1,
        wait: 30,
      };
    }
    return next;
  });
  players.forEach((p, i) => {
    if (p.cargo && gates.some((g) => distance(p, g) < 37)) {
      const points = p.cargo + (p.cargo >= 5 ? 2 : 0);
      p.score += points;
      p.cargo = 0;
      events.push({
        type: "bank",
        x: p.x,
        y: p.y,
        owner: i,
        tick,
        value: points,
      });
    }
  });
  const done =
      tick >= ORBIT_LIMIT || players.some((p) => p.score >= ORBIT_TARGET),
    high = Math.max(...players.map((p) => p.score));
  return {
    ...s,
    tick,
    players,
    cores,
    done,
    winners: done
      ? players.flatMap((p, i) => (p.score === high ? [i] : []))
      : [],
    events: [...s.events.filter((e) => tick - e.tick < 12), ...events].slice(
      -45
    ),
  };
}
