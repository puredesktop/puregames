import {
  SAFE,
  DROPS,
  COURIER_ROUTES,
  GUARD_ROUTES,
  COATS,
  MARKS,
  distance,
  move,
  routeDirection,
  walkable,
} from "./noir-world.mjs";
export const NOIR_LIMIT = 4800;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
function rng(seed) {
  let n = seed >>> 0;
  return () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  };
}
export function newNoir(
  count = 2,
  arena = "open",
  round = 1,
  seed = Math.floor(Math.random() * 0xffffffff)
) {
  if (!Number.isInteger(count) || count < 2 || count > 4)
    throw Error("Choose two to four investigators.");
  const random = rng(seed),
    target = Math.floor(random() * 3),
    coat = Math.floor(random() * 3),
    mark = Math.floor(random() * 3),
    order = DROPS.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const drops = DROPS.map((p, i) => ({
    ...p,
    kind: order.indexOf(i) < 3 ? order.indexOf(i) : 3,
    by: null,
  }));
  const couriers = COURIER_ROUTES.map((route, i) => ({
    ...route[Math.floor(random() * route.length)],
    route: i,
    waypoint: 0,
    coat: i === target ? coat : (coat + (i === (target + 1) % 3 ? 0 : 1)) % 3,
    mark: i === target ? mark : (mark + 1) % 3,
    angle: 0,
    wait: 0,
  }));
  return {
    kind: "noir",
    arena,
    round,
    seed,
    tick: 0,
    done: false,
    winners: [],
    outcome: null,
    phase: "search",
    teamScore: 0,
    fragments: [],
    target,
    code: `${Math.floor(random() * 900) + 100}`,
    drops,
    couriers,
    guards: GUARD_ROUTES.map((route, i) => ({
      ...route[0],
      route: i,
      waypoint: 1,
      angle: i ? 0 : Math.PI,
      alert: 0,
    })),
    players: Array.from({ length: count }, (_, i) => ({
      x: SAFE.x + (i - 1.5) * 27,
      y: SAFE.y,
      angle: -Math.PI / 2,
      score: 0,
      alive: true,
      heat: 0,
      search: null,
      goal: null,
      progress: 0,
      grace: 80,
      stamina: 100,
      walk: 0,
    })),
    strikes: 0,
    notice:
      "Find three coded fragments. Watch the searchlights. The courier is already moving.",
    event: 0,
    contact: null,
  };
}
export function clueText(s, kind) {
  const c = s.couriers[s.target];
  return kind === 0
    ? `The courier’s coat is ${COATS[c.coat].name}.`
    : kind === 1
    ? `Look for ${MARKS[c.mark]}. The coat alone is not enough.`
    : kind === 2
    ? `Tonight's countersign is ${s.code}. You need all three fragments before making contact.`
    : "A clean line. An extra 15 seconds before the signal dies.";
}
export function objective(s, p) {
  if (s.phase === "extract") return { ...SAFE, name: "Southern telephone" };
  if (s.fragments.length === 3) return null;
  return (
    s.drops
      .filter((d) => d.by === null)
      .sort((a, b) => distance(p, a) - distance(p, b))[0] || null
  );
}
export function nearestInteractable(s, p) {
  if (s.phase === "extract")
    return distance(p, SAFE) < 85
      ? { type: "safe", label: "Stay at the telephone. Wait for your team." }
      : null;
  const drop = s.drops
    .map((d, i) => ({ ...d, index: i }))
    .filter((d) => d.by === null && distance(p, d) < 78)
    .sort((a, b) => distance(p, a) - distance(p, b))[0];
  if (drop)
    return { type: "drop", index: drop.index, label: `Search ${drop.name}` };
  const courier = s.couriers
    .map((c, i) => ({ ...c, index: i }))
    .filter((c) => distance(p, c) < 72)
    .sort((a, b) => distance(p, a) - distance(p, b))[0];
  if (courier)
    return {
      type: "courier",
      index: courier.index,
      label:
        s.fragments.length === 3
          ? "Speak the countersign"
          : "Follow this person. Recover all three fragments first.",
    };
  return null;
}
export function noirCommand(s, player, action) {
  if (
    s.done ||
    !Number.isInteger(player) ||
    !s.players[player] ||
    action.type !== "interact"
  )
    return s;
  const p = s.players[player],
    near = nearestInteractable(s, p);
  if (!near || near.type === "safe") return s;
  if (near.type === "drop")
    return {
      ...s,
      players: s.players.map((q, i) =>
        i === player ? { ...q, search: near.index, progress: 0 } : q
      ),
    };
  if (s.fragments.length < 3)
    return {
      ...s,
      notice:
        "Not yet. Find the coat, the distinguishing mark and the countersign.",
      event: s.event + 1,
    };
  if (near.index !== s.target)
    return {
      ...s,
      players: s.players.map((q, i) =>
        i === player ? { ...q, heat: Math.min(100, q.heat + 55) } : q
      ),
      notice: "Wrong person. They called the watch. Move into the shadows.",
      event: s.event + 1,
      guards: s.guards.map((g) => ({ ...g, alert: 100, tx: p.x, ty: p.y })),
    };
  return {
    ...s,
    phase: "extract",
    contact: player,
    teamScore: s.teamScore + 40,
    players: s.players.map((q, i) =>
      i === player ? { ...q, score: q.score + 40 } : q
    ),
    guards: s.guards.map((g) => ({ ...g, alert: 0 })),
    notice:
      "The courier passed you the evidence. Regroup at the amber telephone in the south. Every human investigator must get back.",
    event: s.event + 1,
  };
}
function patrol(g, route, speed) {
  const target = g.alert > 0 ? { x: g.tx, y: g.ty } : route[g.waypoint];
  const dx = target.x - g.x,
    dy = target.y - g.y,
    d = Math.hypot(dx, dy);
  const angle =
    d > 2
      ? g.angle +
        Math.max(-0.1, Math.min(0.1, wrap(Math.atan2(dy, dx) - g.angle)))
      : g.angle + 0.025;
  const dir = routeDirection(g, target);
  return {
    ...move(
      g,
      (dir.x / (Math.hypot(dir.x, dir.y) || 1)) * speed,
      (dir.y / (Math.hypot(dir.x, dir.y) || 1)) * speed
    ),
    angle,
    waypoint: d < 35 ? (g.waypoint + 1) % route.length : g.waypoint,
    alert: Math.max(0, g.alert - 1),
  };
}
export function inBeam(p, g) {
  if (
    distance(p, g) >= 235 ||
    Math.abs(wrap(Math.atan2(p.y - g.y, p.x - g.x) - g.angle)) >= 0.38
  )
    return false;
  const steps = Math.ceil(distance(p, g) / 12);
  for (let i = 1; i < steps; i++)
    if (
      !walkable(
        g.x + ((p.x - g.x) * i) / steps,
        g.y + ((p.y - g.y) * i) / steps,
        0
      )
    )
      return false;
  return true;
}
export function stepNoir(s, inputs = {}) {
  if (s.done) return s;
  let next = {
    ...s,
    tick: s.tick + 1,
    players: s.players.map((p) => ({ ...p })),
    drops: s.drops.map((d) => ({ ...d })),
    fragments: [...s.fragments],
    guards: s.guards.map((g) =>
      patrol(g, GUARD_ROUTES[g.route], g.alert ? 5.5 : 3.1)
    ),
    couriers: s.couriers.map((c) => {
      if (c.wait > 0) return { ...c, wait: c.wait - 1 };
      const path = COURIER_ROUTES[c.route],
        target = path[c.waypoint],
        dir = routeDirection(c, target),
        length = Math.hypot(dir.x, dir.y) || 1;
      return {
        ...move(c, (dir.x / length) * 3.2, (dir.y / length) * 3.2),
        angle: Math.atan2(dir.y, dir.x),
        waypoint:
          distance(c, target) < 35
            ? (c.waypoint + 1) % path.length
            : c.waypoint,
        wait: distance(c, target) < 35 ? 35 : 0,
      };
    }),
  };
  const bots = Object.entries(inputs)
    .filter(([, v]) => v?.bot === true)
    .map(([i]) => +i);
  for (let i = 0; i < next.players.length; i++) {
    let p = next.players[i],
      input = inputs[i] || {},
      bot = bots.includes(i),
      dx = Number.isFinite(input.x) ? Math.max(-1, Math.min(1, input.x)) : 0,
      dy = Number.isFinite(input.y) ? Math.max(-1, Math.min(1, input.y)) : 0;
    const eyes = !bot && input.view === "eyes";
    if (eyes) {
      const axis = (v) =>
        Number.isFinite(v) ? Math.max(-1, Math.min(1, v)) : 0;
      p.angle = wrap(p.angle + axis(input.turn) * 0.11);
      dx =
        Math.cos(p.angle) * axis(input.forward) -
        Math.sin(p.angle) * axis(input.strafe);
      dy =
        Math.sin(p.angle) * axis(input.forward) +
        Math.cos(p.angle) * axis(input.strafe);
    }
    if (bot) {
      const humanTargets = new Set(
        next.players
          .filter((_, j) => !bots.includes(j))
          .flatMap((q) => [q.search, next.drops.indexOf(objective(next, q))])
          .filter((v) => v !== null && v >= 0)
      );
      const candidates = next.drops
        .map((d, j) => ({ ...d, index: j }))
        .filter((d) => d.by === null && !humanTargets.has(d.index));
      const assigned = candidates.find((d) => d.index === p.goal);
      const others = new Set(
        next.players
          .filter((_, j) => j !== i && bots.includes(j))
          .map((p) => p.goal)
      );
      const target =
        next.phase === "extract"
          ? SAFE
          : assigned ||
            candidates
              .filter((d) => !others.has(d.index))
              .sort((a, b) => distance(p, a) - distance(p, b))[0] ||
            candidates[0] ||
            SAFE;
      p.goal = target.index ?? null;
      if (p.search === null && distance(p, target) > 48) {
        const dir = routeDirection(p, target, next.guards);
        dx = dir.x;
        dy = dir.y;
      } else if (p.search === null && target.index !== undefined) {
        p.search = target.index;
        p.progress = 0;
      }
    }
    const length = Math.hypot(dx, dy),
      running = !!input.run && p.stamina > 2 && length > 0;
    const speed = running ? 12 : 7.6;
    p.stamina = Math.max(0, Math.min(100, p.stamina + (running ? -1.8 : 0.9)));
    if (length > 0) {
      p = move(p, (dx / length) * speed, (dy / length) * speed);
      if (!eyes) p.angle = Math.atan2(dy, dx);
      p.walk += running ? 0.28 : 0.18;
      p.search = null;
      p.progress = 0;
    }
    if (p.search !== null) {
      const drop = next.drops[p.search];
      if (!drop || drop.by !== null || distance(p, drop) > 85) {
        p.search = null;
        p.progress = 0;
      } else if (++p.progress >= 22) {
        drop.by = i;
        p.score += 10;
        next.teamScore += 10;
        if (drop.kind < 3) {
          if (!next.fragments.includes(drop.kind))
            next.fragments.push(drop.kind);
        } else if (s.arena === "open") next.tick = Math.max(0, next.tick - 150);
        next.notice = clueText(next, drop.kind);
        next.event++;
        p.search = null;
        p.progress = 0;
      }
    }
    p.grace = Math.max(0, p.grace - 1);
    const seen =
      !p.grace &&
      distance(p, SAFE) > 125 &&
      next.guards.find((g) => inBeam(p, g));
    p.heat = Math.max(0, Math.min(100, p.heat + (seen ? 2.8 : -3)));
    if (seen && p.heat > 35) {
      seen.alert = 70;
      seen.tx = p.x;
      seen.ty = p.y;
    }
    if (p.heat >= 100) {
      if (!bot) next.strikes++;
      p = {
        ...p,
        x: SAFE.x + (i - 1.5) * 27,
        y: SAFE.y,
        heat: 0,
        grace: 70,
        search: null,
        progress: 0,
      };
      next.notice = bot
        ? "Game Player slipped away from the watch and is regrouping at the telephone."
        : "The watch intercepted an investigator. Back at the telephone. Three interceptions burn the operation.";
      next.event++;
    }
    next.players[i] = p;
  }
  if (next.strikes >= 3) {
    next.done = true;
    next.outcome = "caught";
    next.notice =
      "The line is compromised. The courier vanished into the rain.";
  } else if (next.arena === "open" && next.tick >= NOIR_LIMIT) {
    next.done = true;
    next.outcome = "dawn";
    next.notice = "Dawn. The transmitter went silent.";
  } else if (
    next.phase === "extract" &&
    next.players.every((p, i) => bots.includes(i) || distance(p, SAFE) < 90)
  ) {
    const bonus = 20 + (3 - next.strikes) * 10;
    next = {
      ...next,
      done: true,
      outcome: "solved",
      winners: next.players.map((_, i) => i),
      teamScore: next.teamScore + bonus * next.players.length,
      players: next.players.map((p) => ({ ...p, score: p.score + bonus })),
      notice:
        "The evidence is on the wire. Tonight, the city does not get to keep its secret.",
    };
  }
  return next;
}
