import { flightInput } from "./flight.mjs";
// Original, deterministic 10 Hz space arena. The elected room peer owns simulation.
export const SKIRMISH_TARGET = 5,
  SKIRMISH_LIMIT = 900;
const TAU = Math.PI * 2;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const spawnPoints = [
  { x: 140, y: 300, angle: 0 },
  { x: 760, y: 300, angle: Math.PI },
  { x: 450, y: 170, angle: Math.PI / 2 },
  { x: 450, y: 470, angle: -Math.PI / 2 },
];
export const rocksFor = (arena) =>
  arena === "islands"
    ? [
        { x: 320, y: 250, r: 32 },
        { x: 580, y: 250, r: 32 },
        { x: 320, y: 430, r: 32 },
        { x: 580, y: 430, r: 32 },
      ]
    : [];
export function newSkirmish(count = 2, arena = "open") {
  if (!Number.isInteger(count) || count < 2 || count > 4)
    throw Error("Choose two to four players.");
  return {
    kind: "shoot",
    arena,
    tick: 0,
    done: false,
    winners: [],
    shots: [],
    events: [],
    serial: 0,
    players: Array.from({ length: count }, (_, i) => ({
      ...spawnPoints[i],
      vx: 0,
      vy: 0,
      hull: 3,
      score: 0,
      deaths: 0,
      cooldown: 0,
      respawn: 0,
      shield: 18,
      alive: true,
    })),
  };
}
export function skirmishInput(raw) {
  const x = Number.isFinite(raw?.x) ? clamp(raw.x, -1, 1) : 0,
    y = Number.isFinite(raw?.y) ? clamp(raw.y, -1, 1) : 0,
    n = Math.max(1, Math.hypot(x, y));
  return { x: x / n, y: y / n, fire: raw?.fire === true };
}
// Swept collision prevents a fast bolt skipping a ship between simulation ticks.
export function segmentHit(a, b, c, r) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    ox = a.x - c.x,
    oy = a.y - c.y;
  const aa = dx * dx + dy * dy,
    cc = ox * ox + oy * oy - r * r;
  if (cc <= 0) return 0;
  if (!aa) return null;
  const bb = 2 * (ox * dx + oy * dy),
    disc = bb * bb - 4 * aa * cc;
  if (disc < 0) return null;
  const t = (-bb - Math.sqrt(disc)) / (2 * aa);
  return t >= 0 && t <= 1 ? t : null;
}
function respawnPoint(s, players, index) {
  const candidates = [
    ...spawnPoints,
    { x: 160, y: 170 },
    { x: 740, y: 470 },
    { x: 160, y: 470 },
    { x: 740, y: 170 },
  ];
  const opponents = players.filter((p, i) => i !== index && !p.respawn);
  const danger = (p) =>
    Math.min(
      1000,
      ...opponents.map((q) => distance(p, q)),
      ...s.shots.map((q) => distance(p, q))
    );
  return candidates.reduce(
    (a, b) => (danger(b) > danger(a) ? b : a),
    candidates[index]
  );
}
export function skirmishBot(s, i) {
  const p = s.players[i];
  if (p.respawn) return { x: 0, y: 0, fire: false };
  const targets = s.players
    .map((q, j) => ({ ...q, index: j }))
    .filter((q) => q.index !== i && !q.respawn);
  const enemy = targets.reduce(
    (a, b) => (!a || distance(p, b) < distance(p, a) ? b : a),
    null
  );
  if (!enemy) return { x: 0, y: 0, fire: false };
  const lead = distance(p, enemy) / 27,
    dx = enemy.x + enemy.vx * lead - p.x,
    dy = enemy.y + enemy.vy * lead - p.y,
    n = Math.max(1, Math.hypot(dx, dy));
  let x = dx / n,
    y = dy / n;
  // Brief evasive sidesteps keep agents readable and give human pilots openings.
  const threat = s.shots.find(
    (b) =>
      b.owner !== i &&
      segmentHit(b, { x: b.x + b.vx * 5, y: b.y + b.vy * 5 }, p, 28) !== null
  );
  let evading = false;
  if (threat && (s.tick + i * 9) % 19 < 7) {
    x = -dy / n;
    y = dx / n;
    evading = true;
  }
  for (const rock of rocksFor(s.arena)) {
    if (
      segmentHit(p, { x: p.x + x * 90, y: p.y + y * 90 }, rock, rock.r + 20) !==
      null
    ) {
      const side = i % 2 ? 1 : -1;
      x = (p.y - rock.y) * side;
      y = -(p.x - rock.x) * side;
      const d = Math.max(1, Math.hypot(x, y));
      x /= d;
      y /= d;
      evading = true;
    }
  }
  return skirmishInput({
    x: x * 0.85,
    y: y * 0.85,
    fire: !evading && distance(p, enemy) < 650 && (s.tick + i * 7) % 23 < 17,
  });
}
export function stepSkirmish(s, inputs = {}) {
  if (s.done) return s;
  const tick = s.tick + 1,
    events = [],
    rocks = rocksFor(s.arena);
  let serial = s.serial;
  const players = s.players.map((old, i) => {
    let p = {
      ...old,
      cooldown: Math.max(0, old.cooldown - 1),
      shield: Math.max(0, old.shield - 1),
    };
    if (old.respawn) {
      p.respawn--;
      if (!p.respawn) {
        p = {
          ...p,
          ...respawnPoint(s, s.players, i),
          vx: 0,
          vy: 0,
          hull: 3,
          shield: 18,
        };
        events.push({ type: "spawn", x: p.x, y: p.y, owner: i, tick });
      }
      return p;
    }
    const input = flightInput(p, inputs[i]);
    const drag = input.brake ? 0.5 : 0.9;
    p.vx = p.vx * drag + input.x;
    p.vy = p.vy * drag + input.y;
    p.angle = input.angle;
    p.x = clamp(p.x + p.vx, 30, 870);
    p.y = clamp(p.y + p.vy, 125, 550);
    for (const rock of rocks) {
      const d = distance(p, rock);
      if (d < rock.r + 15) {
        const a = d
          ? Math.atan2(p.y - rock.y, p.x - rock.x)
          : (i * TAU) / s.players.length;
        p.x = rock.x + Math.cos(a) * (rock.r + 16);
        p.y = rock.y + Math.sin(a) * (rock.r + 16);
        p.vx *= 0.2;
        p.vy *= 0.2;
      }
    }
    return p;
  });
  const bolts = [...s.shots];
  players.forEach((p, i) => {
    const trigger = flightInput(s.players[i], inputs[i]);
    if (p.respawn || !trigger.fire || !trigger.aligned || p.cooldown) return;
    p.cooldown = 4;
    // Firing ends spawn protection so a shield cannot be used offensively.
    p.shield = 0;
    const vx = Math.cos(p.angle) * 27,
      vy = Math.sin(p.angle) * 27;
    bolts.push({
      id: ++serial,
      owner: i,
      x: p.x + vx * 0.5,
      y: p.y + vy * 0.5,
      vx,
      vy,
      life: 34,
    });
    events.push({
      type: "fire",
      x: p.x + vx * 0.5,
      y: p.y + vy * 0.5,
      owner: i,
      tick,
    });
  });
  const hits = [];
  const shots = bolts.flatMap((b) => {
    const next = { ...b, x: b.x + b.vx, y: b.y + b.vy, life: b.life - 1 };
    const candidates = players.flatMap((p, i) => {
      if (i === b.owner || p.respawn) return [];
      const t = segmentHit(b, next, p, 16);
      return t === null ? [] : [{ t, index: i }];
    });
    for (const rock of rocks) {
      const t = segmentHit(b, next, rock, rock.r);
      if (t !== null) candidates.push({ t, index: -1 });
    }
    const hit = candidates.sort((a, b) => a.t - b.t || a.index - b.index)[0];
    if (hit) {
      if (hit.index >= 0 && !players[hit.index].shield)
        hits.push({ victim: hit.index, owner: b.owner, id: b.id, t: hit.t });
      else
        events.push({
          type: "spark",
          x: b.x + (next.x - b.x) * hit.t,
          y: b.y + (next.y - b.y) * hit.t,
          owner: b.owner,
          tick,
        });
      return [];
    }
    return next.life > 0 &&
      next.x >= 20 &&
      next.x <= 880 &&
      next.y >= 115 &&
      next.y <= 560
      ? [next]
      : [];
  });
  // All movement and firing precede damage, so mutual knockouts remain possible.
  hits
    .sort((a, b) => a.t - b.t || a.id - b.id)
    .forEach((h) => {
      const p = players[h.victim];
      if (p.respawn) return;
      p.hull--;
      events.push({ type: "hit", x: p.x, y: p.y, owner: h.victim, tick });
      if (p.hull === 0) {
        p.respawn = 20;
        p.deaths++;
        p.vx = 0;
        p.vy = 0;
        players[h.owner].score++;
        events.push({
          type: "burst",
          x: p.x,
          y: p.y,
          owner: h.victim,
          killer: h.owner,
          tick,
        });
      }
    });
  const done =
      tick >= SKIRMISH_LIMIT || players.some((p) => p.score >= SKIRMISH_TARGET),
    high = Math.max(...players.map((p) => p.score));
  return {
    ...s,
    tick,
    serial,
    players,
    shots,
    done,
    winners: done
      ? players.flatMap((p, i) => (p.score === high ? [i] : []))
      : [],
    events: [...s.events.filter((e) => tick - e.tick < 16), ...events].slice(
      -64
    ),
  };
}
