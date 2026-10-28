// Original deterministic flight/combat rules. World units are metres; the room ticks at 10 Hz.
export const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
export const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const mul = (a, k) => ({ x: a.x * k, y: a.y * k, z: a.z * k });
export const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
export const length = (a) => Math.hypot(a.x, a.y, a.z);
export const unit = (a) => mul(a, 1 / (length(a) || 1));
const finite = (n) => (Number.isFinite(n) ? clamp(n, -1, 1) : 0);
export function axes(p) {
  const f = {
    x: Math.sin(p.yaw) * Math.cos(p.pitch),
    y: Math.sin(p.pitch),
    z: -Math.cos(p.yaw) * Math.cos(p.pitch),
  };
  const r = { x: Math.cos(p.yaw), y: 0, z: Math.sin(p.yaw) };
  const u = {
    x: -Math.sin(p.yaw) * Math.sin(p.pitch),
    y: Math.cos(p.pitch),
    z: Math.cos(p.yaw) * Math.sin(p.pitch),
  };
  return { f, r, u };
}
export function evasionAngle(p, time) {
  const t = clamp((time - (p.evadeAt ?? -10)) / 0.75, 0, 1);
  return t > 0 && t < 1
    ? (p.evadeSide || 1) * Math.PI * 2 * t * t * (3 - 2 * t)
    : 0;
}
export const SHIPS = {
  spindle: {
    name: "Spindle",
    hp: 40,
    radius: 20,
    scale: 1.6,
    speed: 190,
    points: 150,
    colour: "#b8ff65",
  },
  prism: {
    name: "Prism cutter",
    hp: 80,
    radius: 28,
    scale: 1.5,
    speed: 145,
    points: 250,
    colour: "#ffb84a",
  },
  rake: {
    name: "Rake interceptor",
    hp: 60,
    radius: 24,
    scale: 1.5,
    speed: 230,
    points: 200,
    colour: "#aeb3ff",
  },
  ark: {
    name: "Lattice Ark",
    hp: 650,
    radius: 90,
    scale: 1.2,
    speed: 20,
    points: 2000,
    colour: "#ff69c7",
  },
};
export const WAVES = ["Hot perimeter", "Broken formation", "The lattice wakes"];
export function spawnWave(b) {
  const { f, r, u } = axes(b.players[0]);
  b.scenery = add(
    b.players[0],
    add(mul(f, 4500), add(mul(r, -2100), mul(u, 600)))
  );
  const types =
    b.wave === 1
      ? ["spindle", "spindle", "prism", "spindle"]
      : b.wave === 2
      ? ["rake", "prism", "spindle", "rake", "prism", "spindle"]
      : ["ark", "rake", "prism", "rake", "spindle", "prism"];
  b.enemies = types.map((type, i) => ({
    id: `w${b.wave}-${i}`,
    type,
    ...SHIPS[type],
    ...add(
      b.players[0],
      add(
        mul(f, type === "ark" ? 850 : 350 + i * 85),
        add(
          mul(r, (i % 2 ? 1 : -1) * (65 + i * 24)),
          mul(u, Math.sin(i * 2.1) * 95)
        )
      )
    ),
    phase: i * 1.9,
    fireAt: b.time + 1.1 + i * 0.45,
    side: i % 2 ? 1 : -1,
    trail: [],
    vx: 0,
    vy: 0,
    vz: 0,
  }));
  b.bannerUntil = b.time + 3.5;
}
export function newVector(_count = 1, arena = "open") {
  const b = {
    kind: "vector",
    tick: 0,
    time: 0,
    wave: 1,
    arena,
    players: [
      {
        x: 0,
        y: 0,
        z: 0,
        yaw: 0,
        pitch: 0,
        roll: 0,
        speed: 145,
        hull: 100,
        shield: 100,
        energy: 100,
        heat: 0,
        missiles: 4,
        alive: true,
        score: 0,
        evadeAt: -10,
        evadeSide: 1,
      },
    ],
    enemies: [],
    shots: [],
    effects: [],
    pickups: [],
    cells: 0,
    cellAt: -10,
    nextId: 0,
    nextWave: 0,
    lock: null,
    lockTime: 0,
    kills: 0,
    fired: 0,
    hits: 0,
    done: false,
    winners: [],
    victory: false,
    chain: 0,
    killAt: -10,
    nearAt: -10,
    nearMisses: 0,
    hitAt: -10,
    damageAt: -10,
    missileAt: -10,
    fireAt: 0,
    overheated: false,
    notice: "Break the perimeter. Keep moving.",
    noticeUntil: 5,
  };
  spawnWave(b);
  return b;
}
export function targetFor(b, p = b.players[0]) {
  const f = axes(p).f;
  return (
    b.enemies
      .map((e) => {
        const delta = sub(e, p),
          distance = length(delta);
        return {
          enemy: e,
          distance,
          angle: Math.acos(clamp(dot(unit(delta), f), -1, 1)),
        };
      })
      .filter((t) => t.distance < 1800)
      .sort((a, b) => a.angle - b.angle)[0] || null
  );
}
export function segmentDistance(a, b, p) {
  const ab = sub(b, a),
    t = clamp(dot(sub(p, a), ab) / (dot(ab, ab) || 1), 0, 1);
  return length(sub(add(a, mul(ab, t)), p));
}
function effect(b, pos, kind = "burst", colour = "#b8ff65") {
  b.effects.push({
    x: pos.x,
    y: pos.y,
    z: pos.z,
    type: pos.type,
    radius: pos.radius || 20,
    createdAt: b.time,
    reward: pos.reward || 0,
    kind,
    colour,
    id: b.nextId++,
    until: b.time + (kind === "burst" ? 1.6 : 0.45),
  });
}
function damage(b, amount) {
  // One shield response per volley, rather than simultaneous bolts double-hitting.
  if (
    b.time - b.damageAt < 0.25 ||
    b.time - (b.players[0].evadeAt ?? -10) < 0.65
  )
    return;
  const p = b.players[0],
    shield = Math.min(p.shield, amount);
  p.shield -= shield;
  p.hull = Math.max(0, p.hull - (amount - shield));
  b.damageAt = b.time;
  if (p.hull <= 0) {
    p.alive = false;
    b.done = true;
    b.winners = [];
    b.notice = "Signal lost";
  }
}
export function rocksNear(p) {
  return Array.from({ length: 26 }, (_, i) => {
    const period = 3200,
      wrap = (v, center) => v + Math.round((center - v) / period) * period;
    return {
      x: wrap(((i * 733 + 191) % period) - 1600, p.x),
      y: wrap(((i * 457 + 933) % period) - 1600, p.y),
      z: wrap(((i * 997 + 421) % period) - 1600, p.z),
      radius: 18 + ((i * 13) % 33),
      seed: i,
    };
  });
}
function shoot(b, p, dir, enemy = false, owner = "pilot", missile = false) {
  const speed = missile ? 440 : enemy ? 310 : 1500;
  b.shots.push({
    x: p.x,
    y: p.y,
    z: p.z,
    id: b.nextId++,
    born: b.time,
    origin: { x: p.x, y: p.y, z: p.z },
    vx: dir.x * speed,
    vy: dir.y * speed,
    vz: dir.z * speed,
    enemy,
    owner,
    missile,
    until: b.time + (enemy ? 7 : missile ? 6 : 1.7),
    target: missile ? b.lock : null,
  });
}
export function stepVector(state, inputs = {}) {
  if (state.done) return state;
  const b = structuredClone(state),
    p = b.players[0],
    raw = inputs[0] || {},
    dt = 0.1;
  b.time = Math.round((b.time + dt) * 10) / 10;
  b.tick++;
  const turn = finite(raw.turn),
    pitch = finite(raw.pitch);
  p.yaw = Math.atan2(
    Math.sin(p.yaw + turn * 0.13),
    Math.cos(p.yaw + turn * 0.13)
  );
  p.pitch = clamp(p.pitch + pitch * 0.105, -1.4, 1.4);
  p.roll +=
    (clamp(-turn * 0.85 + finite(raw.bank) * 1.1, -1, 1) - p.roll) * 0.24;
  const boosting = raw.boost === true && p.energy > 3 && !raw.brake;
  const goal = boosting ? 420 : raw.brake === true ? 55 : 145;
  p.speed += (goal - p.speed) * 0.16;
  p.energy = clamp(p.energy + (boosting ? -3 : 1.5), 0, 100);
  const { f, r, u } = axes(p);
  const dodge = finite(raw.dodge);
  if (
    Math.abs(dodge) > 0.5 &&
    b.time - (p.evadeAt ?? -10) >= 3.5 &&
    p.energy >= 18
  ) {
    p.evadeAt = b.time;
    p.evadeSide = Math.sign(dodge);
    p.energy -= 18;
  }
  const evading = b.time - (p.evadeAt ?? -10);
  const slide =
    evading >= 0 && evading < 0.65
      ? mul(r, Math.sin((evading / 0.65) * Math.PI) * 420 * p.evadeSide * dt)
      : { x: 0, y: 0, z: 0 };
  Object.assign(p, add(p, add(mul(f, p.speed * dt), slide)));
  p.heat = Math.max(0, p.heat - 2.7);
  if (p.heat < 25) b.overheated = false;
  if (b.time - b.damageAt > 7) p.shield = Math.min(100, p.shield + 0.6);
  const nearest = targetFor(b),
    lockable = nearest && nearest.angle < 0.16 && nearest.distance < 1400;
  const wanted = lockable ? nearest.enemy.id : null;
  b.lockTime = wanted && wanted === b.lock ? Math.min(1.3, b.lockTime + dt) : 0;
  b.lock = wanted;
  if (raw.fire === true && b.time >= b.fireAt && !b.overheated) {
    let dir = f;
    if (nearest && nearest.angle < 0.065 && nearest.distance < 1200) {
      const e = nearest.enemy,
        lead = nearest.distance / 1500;
      dir = unit(
        sub(add(e, { x: e.vx * lead, y: e.vy * lead, z: e.vz * lead }), p)
      );
    }
    for (const side of [-1, 1]) {
      const cr = Math.cos(p.roll + evasionAngle(p, b.time)),
        sr = Math.sin(p.roll + evasionAngle(p, b.time));
      const gunRight = add(mul(r, cr), mul(u, sr));
      const gunUp = add(mul(u, cr), mul(r, -sr));
      const muzzle = add(
        p,
        add(mul(f, 14), add(mul(gunRight, side * 3.8), mul(gunUp, -4.4)))
      );
      shoot(
        b,
        muzzle,
        unit(sub(add(p, mul(dir, nearest?.distance || 900)), muzzle))
      );
    }
    p.heat = Math.min(100, p.heat + 12);
    b.fired += 2;
    b.fireAt = b.time + 0.19;
    if (p.heat >= 97) b.overheated = true;
  }
  if (
    raw.missile === true &&
    p.missiles > 0 &&
    b.time - b.missileAt > 1 &&
    b.lockTime >= 1.1
  ) {
    shoot(b, add(p, mul(f, 6)), f, false, "pilot", true);
    p.missiles--;
    b.missileAt = b.time;
  }
  for (const e of b.enemies) {
    const delta = sub(p, e),
      dist = length(delta),
      direction = unit(delta);
    if (e.type === "ark") {
      const desired = add(p, mul(f, 780));
      const d = sub(desired, e);
      e.vx = d.x * 0.035;
      e.vy = d.y * 0.035;
      e.vz = d.z * 0.035;
    } else {
      // Three leg attack runs: dive toward the nose, slash across it, then climb
      // back into formation. Steering has inertia so enemies bank through turns.
      const cycle = (b.time + e.phase) % 9.6,
        side = e.side || (e.phase % 2 ? 1 : -1);
      e.manoeuvre =
        cycle < 3.8 ? "ATTACK RUN" : cycle < 5.5 ? "CROSSING" : "REGROUP";
      const ahead = cycle < 3.8 ? 70 : cycle < 5.5 ? -260 : 620;
      const across =
        cycle < 3.8 ? side * 45 : cycle < 5.5 ? -side * 290 : side * 270;
      const high =
        Math.sin(b.time * 1.3 + e.phase) * 55 + (cycle > 5.5 ? side * 140 : 0);
      const goal = add(
        p,
        add(mul(f, ahead), add(mul(r, across), mul(u, high)))
      );
      // A recovery burn must outrun the pilot; otherwise every flyby falls
      // permanently behind cruise and leaves an empty forward view.
      const behind = dot(sub(e, p), f) < -120;
      const throttle = cycle > 5.5 ? 3.2 : behind || dist > 1300 ? 2.7 : 1;
      const wanted = mul(unit(sub(goal, e)), e.speed * throttle);
      e.vx += (wanted.x - e.vx) * 0.19;
      e.vy += (wanted.y - e.vy) * 0.19;
      e.vz += (wanted.z - e.vz) * 0.19;
    }
    e.trail = [...(e.trail || []), { x: e.x, y: e.y, z: e.z }].slice(-9);
    Object.assign(e, add(e, mul({ x: e.vx, y: e.vy, z: e.vz }, dt)));
    if (dist < 1400 && b.time > e.fireAt) {
      const lead = dist / 390,
        aim = add(p, mul(f, Math.min(110, p.speed * lead * 0.65)));
      // Readable paired volleys. The carrier fans three bolts across the flight path.
      for (const offset of e.type === "ark" ? [-32, 0, 32] : [-12, 12]) {
        const destination = add(aim, mul(r, offset));
        shoot(
          b,
          add(e, mul(direction, e.radius + 5)),
          unit(sub(destination, e)),
          true,
          e.id
        );
      }
      e.fireAt =
        b.time +
        (e.type === "ark" ? 0.85 : 2.6) +
        (b.arena === "islands" ? -0.6 : 0.6);
    }
    if (dist < e.radius + 8 && b.time - b.damageAt > 1.3) {
      damage(b, 18);
      effect(b, p, "impact", "#ff6a68");
    }
  }
  const dead = new Set();
  b.shots = b.shots.filter((s) => {
    if (s.until < b.time) return false;
    if (s.missile) {
      const e = b.enemies.find((e) => e.id === s.target && !dead.has(e.id));
      if (e) {
        const d = unit(sub(e, s));
        s.vx += (d.x * 620 - s.vx) * 0.23;
        s.vy += (d.y * 620 - s.vy) * 0.23;
        s.vz += (d.z * 620 - s.vz) * 0.23;
      }
    }
    const old = { x: s.x, y: s.y, z: s.z };
    Object.assign(s, add(s, mul({ x: s.vx, y: s.vy, z: s.vz }, dt)));
    if (s.enemy) {
      if (segmentDistance(old, s, p) < 10) {
        damage(b, b.arena === "islands" ? 8 : 6);
        effect(b, p, "impact", "#ff6a68");
        return false;
      }
      if (!s.near && segmentDistance(old, s, p) < 45) {
        s.near = true;
        b.nearAt = b.time;
        b.nearMisses++;
        p.score += 15;
      }
    } else {
      const candidates = b.enemies
        .filter((e) => !dead.has(e.id) && segmentDistance(old, s, e) < e.radius)
        .sort((a, c) => length(sub(a, old)) - length(sub(c, old)));
      const e = candidates[0];
      if (e) {
        e.hp -= s.missile ? 135 : 20;
        b.hits++;
        b.hitAt = b.time;
        effect(b, e, "spark", e.colour);
        if (e.hp <= 0) {
          dead.add(e.id);
          b.kills++;
          b.chain = b.time - b.killAt < 3 ? Math.min(4, b.chain + 1) : 1;
          b.killAt = b.time;
          e.reward = e.points * b.chain;
          p.score += e.reward;
          b.pickups ||= [];
          b.pickups.push({
            id: b.nextId++,
            x: e.x,
            y: e.y,
            z: e.z,
            born: b.time,
            until: b.time + 14,
          });
          b.pickups = b.pickups.slice(-8);
          b.notice = `${e.name.toUpperCase()} DOWN${
            b.chain > 1 ? ` · CHAIN ×${b.chain}` : ""
          }`;
          b.noticeUntil = b.time + 1.2;
          effect(b, e, "burst", e.colour);
        }
        return false;
      }
    }
    return true;
  });
  b.enemies = b.enemies.filter((e) => !dead.has(e.id));
  if (b.time > 4 && b.time - b.damageAt > 1.5) {
    const rock = rocksNear(p).find(
      (r) => length(sub(r, p)) < r.radius * 0.65 + 6
    );
    if (rock) {
      damage(b, 22);
      effect(b, p, "impact", "#ffb84a");
      b.notice = "Debris impact — break away";
      b.noticeUntil = b.time + 2;
    }
  }
  b.pickups = (b.pickups || []).filter((cell) => {
    if (cell.until <= b.time) return false;
    const delta = sub(p, cell),
      distance = length(delta);
    if (distance < 180)
      Object.assign(
        cell,
        add(cell, mul(unit(delta), Math.min(distance, 320 * dt)))
      );
    if (length(sub(p, cell)) < 50) {
      p.shield = Math.min(100, p.shield + 20);
      p.energy = Math.min(100, p.energy + 30);
      p.score += 50;
      b.cells = (b.cells || 0) + 1;
      b.cellAt = b.time;
      return false;
    }
    return true;
  });
  b.effects = b.effects.filter((e) => e.until > b.time).slice(-35);
  if (!b.enemies.length && !b.done) {
    if (!b.nextWave) {
      b.nextWave = b.time + 2;
      p.shield = Math.min(100, p.shield + 35);
      p.missiles = Math.min(6, p.missiles + 2);
      b.notice = "Sector clear. Shields restored. Next contact incoming.";
      b.noticeUntil = b.time + 2;
    }
    if (b.time >= b.nextWave) {
      if (b.wave >= 3) {
        b.done = true;
        b.victory = true;
        b.winners = [0];
        p.score += Math.max(0, Math.round(1500 - b.time * 2));
      } else {
        b.wave++;
        b.nextWave = 0;
        spawnWave(b);
      }
    }
  }
  if (b.time > 600 && !b.done) {
    b.done = true;
    b.notice = "Flight window closed";
  }
  return b;
}
