// Deterministic cooperative towing. Positions and forces use one 100 ms tick;
// three substeps keep springs stable. Rendering never owns simulation state.
export const TETHER_SIZE = { w: 1120, h: 720 };
export const TETHER_DOCK = { x: 145, y: 360, r: 102 };
export const TETHER_LIMIT = 2400;
export const TETHER_TARGET = 5;
export const HOOK_RANGE = 155;
export const TETHER_COLOURS = ["#45d9c1", "#ffad78", "#b3a5f8", "#80c9fb"];
export const CARGO_NAMES = [
  "Sun cell",
  "Habitat pod",
  "Seed vault",
  "Weather buoy",
  "Long-range relay",
];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const finite = (v) => (Number.isFinite(v) ? clamp(v, -1, 1) : 0);
export const gap = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function cargoAt(id, round) {
  const places = [
    [465, 360],
    [880, 180],
    [885, 525],
    [900, 330],
    [770, 150],
  ];
  const [x, y] = places[id % places.length];
  return {
    id,
    x,
    y,
    vx: 0,
    vy: 0,
    r: [31, 41, 35, 30, 43][id % 5],
    mass: [2, 3.6, 2.8, 2.2, 3.8][id % 5],
    angle: id * 0.7 + round * 0.1,
    spin: 0,
    health: 100,
    tow: {},
    settling: 0,
    hit: 0,
    delivered: false,
  };
}
export function newTether(count = 2, arena = "open", round = 1) {
  return {
    kind: "tether",
    arena,
    round,
    tick: 0,
    teamScore: 0,
    delivered: 0,
    chain: 0,
    lastDelivery: -1000,
    done: false,
    winners: [],
    events: [],
    players: Array.from({ length: clamp(count, 2, 4) }, (_, i) => ({
      x: 300 - (i % 2) * 35,
      y: 360 + [0, 80, -80, 140][i],
      vx: 0,
      vy: 0,
      angle: 0,
      alive: true,
      score: 0,
      hook: null,
      tension: 0,
      thrust: 0,
      braking: false,
    })),
    cargo: [0, 1, 2].map((id) => cargoAt(id, round)),
  };
}
export function debrisAt(tick) {
  return [
    {
      x: 636 + Math.sin(tick / 120) * 32,
      y: 336 + Math.cos(tick / 110) * 24,
      r: 54,
      phase: 0.2,
    },
    {
      x: 415 + Math.cos(tick / 170) * 22,
      y: 145 + Math.sin(tick / 130) * 22,
      r: 38,
      phase: 2,
    },
    {
      x: 680 + Math.sin(tick / 150) * 50,
      y: 578 + Math.cos(tick / 90) * 10,
      r: 43,
      phase: 4,
    },
  ];
}
export function tideAt(tick) {
  const cycle = tick % 360;
  return {
    active: cycle >= 280,
    warning: cycle >= 230 && cycle < 280,
    seconds: Math.ceil((cycle < 280 ? 280 - cycle : 360 - cycle) / 10),
    x: Math.sin(Math.floor(tick / 360) * 1.9 + 0.6) * 0.12,
    y: Math.cos(Math.floor(tick / 360) * 1.7 + 0.6) * 0.12,
  };
}
export function closestCargo(s, p) {
  return s.cargo
    .filter((c) => !c.delivered)
    .sort((a, b) => gap(a, p) - gap(b, p))[0];
}
export function tetherCommand(s, index, action) {
  if (s.done || !s.players[index] || action.type !== "hook") return s;
  const p = s.players[index],
    target = closestCargo(s, p);
  if (p.hook === null && (!target || gap(p, target) > HOOK_RANGE)) return s;
  const hook = p.hook !== null ? null : target.id;
  return {
    ...s,
    players: s.players.map((q, i) =>
      i === index ? { ...q, hook, tension: 0 } : q
    ),
    events: [
      ...s.events,
      {
        type: hook === null ? "release" : "hook",
        x: p.x,
        y: p.y,
        tick: s.tick,
        owner: index,
      },
    ].slice(-30),
  };
}
function blocked(a, b, o, margin) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    len = dx * dx + dy * dy;
  const t = clamp(((o.x - a.x) * dx + (o.y - a.y) * dy) / (len || 1), 0, 1);
  return Math.hypot(a.x + dx * t - o.x, a.y + dy * t - o.y) < o.r + margin;
}
function waypoint(a, goal, debris, margin) {
  const o = debris.find((o) => blocked(a, goal, o, margin));
  if (!o) return goal;
  // Go around the same side until the cargo has cleared the obstacle.
  const points = [-1, 1].map((side) => ({
    x: o.x,
    y: clamp(o.y + side * (o.r + margin + 50), 75, 645),
  }));
  return points.sort(
    (p, q) => gap(a, p) + gap(p, goal) - gap(a, q) - gap(q, goal)
  )[0];
}
function botInput(s, p, i, players, cargo, debris) {
  let load = cargo.find((c) => c.id === p.hook && !c.delivered);
  if (!load) {
    // Prefer a human's heavy load, otherwise spread the crew over available cargo.
    const options = cargo
      .filter((c) => !c.delivered)
      .map((c) => {
        const attached = players.filter((q) => q.hook === c.id).length;
        const human = players.some(
          (q, n) => q.hook === c.id && !s.botSeats.includes(n)
        );
        const reserved = players.some(
          (q, n) =>
            !s.botSeats.includes(n) &&
            q.hook === null &&
            closestCargo({ cargo }, q)?.id === c.id
        );
        return {
          c,
          cost:
            gap(p, c) +
            (reserved ? 700 : 0) +
            attached * 280 -
            (human && c.mass > 3 && attached === 1 ? 400 : 0),
        };
      })
      .sort((a, b) => a.cost - b.cost);
    load = options[0]?.c;
    if (!load) return { x: 0, y: 0, brake: true };
    if (gap(p, load) < HOOK_RANGE - 15) p.hook = load.id;
  }
  let aim;
  if (p.hook !== null) {
    const route = waypoint(load, TETHER_DOCK, debris, load.r + 20);
    const d = gap(load, route) || 1;
    const dx = (route.x - load.x) / d,
      dy = (route.y - load.y) / d;
    const helpers = players.flatMap((q, n) => (q.hook === load.id ? [n] : []));
    const side = helpers.length > 1 ? (helpers.indexOf(i) % 2 ? 24 : -24) : 0;
    aim = {
      x: load.x + dx * 102 - dy * side,
      y: load.y + dy * 102 + dx * side,
    };
    if (gap(load, TETHER_DOCK) < 70) aim = { x: TETHER_DOCK.x - 65, y: load.y };
  } else aim = waypoint(p, load, debris, 30);
  let x = (aim.x - p.x) * 0.035 - p.vx * 0.75;
  let y = (aim.y - p.y) * 0.035 - p.vy * 0.75;
  for (const o of debris) {
    const d = gap(p, o),
      reach = o.r + 56;
    if (d < reach) {
      x += ((p.x - o.x) / (d || 1)) * (reach - d) * 0.1;
      y += ((p.y - o.y) / (d || 1)) * (reach - d) * 0.1;
    }
  }
  const n = Math.max(1, Math.hypot(x, y));
  return {
    x: x / n,
    y: y / n,
    brake: gap(load, TETHER_DOCK) < 95 && Math.hypot(load.vx, load.vy) > 2.5,
  };
}
function bounce(body, r, mass, obstacle, events, tick) {
  const d = gap(body, obstacle),
    min = r + obstacle.r;
  if (d >= min) return;
  const nx = (body.x - obstacle.x) / (d || 1) || 1,
    ny = (body.y - obstacle.y) / (d || 1);
  body.x = obstacle.x + nx * min;
  body.y = obstacle.y + ny * min;
  const incoming = body.vx * nx + body.vy * ny;
  if (incoming < 0) {
    body.vx -= incoming * 1.45 * nx;
    body.vy -= incoming * 1.45 * ny;
  }
  if (mass > 1 && -incoming > 1.5 && !body.hit) {
    body.health = Math.max(25, body.health - Math.round(-incoming * 3));
    body.hit = 12;
    body.spin += incoming * 0.006;
    events.push({ type: "bump", x: body.x, y: body.y, tick });
  }
}
export function stepTether(s, inputs = {}) {
  if (s.done) return s;
  const tick = s.tick + 1,
    players = s.players.map((p) => ({ ...p })),
    cargo = s.cargo.map((c) => ({
      ...c,
      tow: { ...c.tow },
      hit: Math.max(0, c.hit - 1),
    })),
    debris = debrisAt(tick),
    events = s.events.filter((e) => tick - e.tick < 30),
    tide = tideAt(tick),
    botSeats = players.flatMap((_, i) => (inputs[i]?.bot ? [i] : []));
  const controls = players.map((p, i) => {
    if (!cargo.some((c) => c.id === p.hook && !c.delivered)) p.hook = null;
    const raw = inputs[i]?.bot
      ? botInput({ ...s, botSeats }, p, i, players, cargo, debris)
      : inputs[i] || {};
    const x = finite(raw.x),
      y = finite(raw.y),
      len = Math.max(1, Math.hypot(x, y));
    p.braking = !!raw.brake;
    p.thrust = Math.hypot(x / len, y / len);
    if (p.thrust > 0.01) p.angle = Math.atan2(y, x);
    p.tension = 0;
    return { x: x / len, y: y / len, brake: p.braking };
  });
  for (let sub = 0; sub < 3; sub++) {
    players.forEach((p, i) => {
      const u = controls[i],
        drag = Math.pow(u.brake ? 0.68 : 0.97, 1 / 3);
      p.vx = p.vx * drag + (u.x * 0.9) / 3;
      p.vy = p.vy * drag + (u.y * 0.9) / 3;
      const c = cargo.find((c) => c.id === p.hook && !c.delivered);
      if (c) {
        const d = gap(p, c),
          nx = (c.x - p.x) / (d || 1),
          ny = (c.y - p.y) / (d || 1);
        const relative = (c.vx - p.vx) * nx + (c.vy - p.vy) * ny;
        const force = clamp((d - 82) * 0.025 + relative * 0.13, 0, 2.8);
        p.tension = Math.max(p.tension, force / 2.8);
        p.vx += (nx * force) / 3;
        p.vy += (ny * force) / 3;
        c.vx -= (nx * force) / c.mass / 3;
        c.vy -= (ny * force) / c.mass / 3;
        c.spin += (p.vy * nx - p.vx * ny) * force * 0.00012;
        if (d > 240) {
          p.hook = null;
          events.push({
            type: "snap",
            x: (p.x + c.x) / 2,
            y: (p.y + c.y) / 2,
            tick,
            owner: i,
          });
        }
      }
      const speed = Math.hypot(p.vx, p.vy);
      if (speed > 8) {
        p.vx *= 8 / speed;
        p.vy *= 8 / speed;
      }
      p.x += p.vx / 3;
      p.y += p.vy / 3;
      for (const o of debris) bounce(p, 16, 1, o, events, tick);
      for (const [axis, vel, size] of [
        ["x", "vx", 1120],
        ["y", "vy", 720],
      ]) {
        if (p[axis] < 28 || p[axis] > size - 28) {
          p[axis] = clamp(p[axis], 28, size - 28);
          p[vel] *= -0.4;
        }
      }
    });
    cargo
      .filter((c) => !c.delivered)
      .forEach((c) => {
        const inDock = gap(c, TETHER_DOCK) < 116;
        const drag = Math.pow(inDock ? 0.8 : 0.993, 1 / 3);
        c.vx *= drag;
        c.vy *= drag;
        if (tide.active && !inDock) {
          c.vx += tide.x / c.mass / 3;
          c.vy += tide.y / c.mass / 3;
        }
        c.x += c.vx / 3;
        c.y += c.vy / 3;
        c.angle += c.spin / 3;
        c.spin *= 0.99;
        for (const o of debris) bounce(c, c.r, c.mass, o, events, tick);
        for (const [axis, vel, size] of [
          ["x", "vx", 1120],
          ["y", "vy", 720],
        ]) {
          if (c[axis] < c.r + 20 || c[axis] > size - c.r - 20) {
            c[axis] = clamp(c[axis], c.r + 20, size - c.r - 20);
            c[vel] *= -0.55;
          }
        }
      });
    for (let i = 0; i < cargo.length; i++)
      for (let j = i + 1; j < cargo.length; j++) {
        const a = cargo[i],
          b = cargo[j];
        if (a.delivered || b.delivered) continue;
        const d = gap(a, b),
          radius = a.r + b.r;
        if (d < radius) {
          const nx = (b.x - a.x) / (d || 1) || 1,
            ny = (b.y - a.y) / (d || 1),
            overlap = (radius - d) / 2;
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;
          const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rel < 0) {
            const impulse = (-1.3 * rel) / (1 / a.mass + 1 / b.mass);
            a.vx -= (impulse / a.mass) * nx;
            a.vy -= (impulse / a.mass) * ny;
            b.vx += (impulse / b.mass) * nx;
            b.vy += (impulse / b.mass) * ny;
          }
        }
      }
  }
  let { teamScore, delivered, chain, lastDelivery } = s;
  for (const c of cargo.filter((c) => !c.delivered)) {
    players.forEach((p, i) => {
      if (p.hook === c.id && p.tension > 0.01) c.tow[i] = (c.tow[i] || 0) + 1;
    });
    c.settling =
      gap(c, TETHER_DOCK) < 90 && Math.hypot(c.vx, c.vy) < 3
        ? c.settling + 1
        : 0;
    if (c.settling < 12) continue;
    c.delivered = true;
    delivered++;
    chain = tick - lastDelivery <= 300 ? Math.min(3, chain + 1) : 1;
    lastDelivery = tick;
    const crew = Object.keys(c.tow)
      .map(Number)
      .filter((i) => c.tow[i] >= 3);
    const amount = Math.round(
      (60 + c.health * 0.4 + (crew.length > 1 ? 25 : 0)) *
        (1 + (chain - 1) * 0.25)
    );
    teamScore += amount;
    const credit = crew.length ? crew : players.map((_, i) => i);
    credit.forEach((i, n) => {
      players[i].score +=
        Math.floor(amount / credit.length) +
        (n < amount % credit.length ? 1 : 0);
    });
    players.forEach((p) => {
      if (p.hook === c.id) {
        p.hook = null;
        p.tension = 0;
      }
    });
    events.push({
      type: "deliver",
      x: c.x,
      y: c.y,
      tick,
      value: amount,
      together: crew.length > 1,
    });
  }
  if (
    cargo.filter((c) => !c.delivered).length < 3 &&
    cargo.length < TETHER_TARGET
  )
    cargo.push(cargoAt(cargo.length, s.round));
  const done =
    delivered >= TETHER_TARGET || (s.arena === "open" && tick >= TETHER_LIMIT);
  return {
    ...s,
    tick,
    players,
    cargo,
    teamScore,
    delivered,
    chain,
    lastDelivery,
    done,
    winners: done && delivered >= TETHER_TARGET ? players.map((_, i) => i) : [],
    events: events.slice(-35),
  };
}
