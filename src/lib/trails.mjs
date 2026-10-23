export const SIZE = 36;
export const vectors = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
export function newRace(count = 2, arena = "open") {
  if (!Number.isInteger(count) || count < 2 || count > 4)
    throw Error("Choose two to four players.");
  const players = [
    { x: 5, y: 18, d: 1, alive: true },
    { x: 30, y: 18, d: 3, alive: true },
    { x: 18, y: 5, d: 2, alive: true },
    { x: 18, y: 30, d: 0, alive: true },
  ]
    .slice(0, count)
    .map((p) => ({ ...p, points: 0 }));
  return {
    players,
    trail: players.map((p, i) => ({ x: p.x, y: p.y, owner: i })),
    obstacles:
      arena === "islands"
        ? [10, 24].flatMap((x) =>
            [10, 24].flatMap((y) =>
              Array.from({ length: 9 }, (_, i) => ({
                x: x + (i % 3),
                y: y + Math.floor(i / 3),
              }))
            )
          )
        : [],
    tick: 0,
    done: false,
  };
}
const key = (x, y) => `${x},${y}`;
export function step(s, inputs = {}) {
  if (s.done) return s;
  const occupied = new Set(
    [...s.trail, ...(s.obstacles || [])].map((p) => key(p.x, p.y))
  );
  const next = s.players.map((p, i) => {
    if (!p.alive) return { ...p };
    const requested = inputs[i];
    const d =
      Number.isInteger(requested) &&
      requested >= 0 &&
      requested < 4 &&
      (requested + 2) % 4 !== p.d
        ? requested
        : p.d;
    return { ...p, d, x: p.x + vectors[d][0], y: p.y + vectors[d][1] };
  });
  next.forEach((p, i) => {
    if (!s.players[i].alive) return;
    p.alive =
      p.x >= 0 &&
      p.x < SIZE &&
      p.y >= 0 &&
      p.y < SIZE &&
      !occupied.has(key(p.x, p.y)) &&
      !next.some(
        (q, j) => j !== i && s.players[j].alive && q.x === p.x && q.y === p.y
      );
  });
  const done = next.filter((p) => p.alive).length <= 1;
  next.forEach((p, i) => {
    p.points =
      (s.players[i].points || 0) +
      (p.alive ? 1 : 0) +
      (done && p.alive ? 50 : 0);
  });
  return {
    ...s,
    players: next,
    trail: [
      ...s.trail,
      ...next.flatMap((p, i) =>
        p.alive ? [{ x: p.x, y: p.y, owner: i }] : []
      ),
    ],
    tick: s.tick + 1,
    done,
  };
}
export function steer(s, id) {
  const p = s.players[id];
  const occupied = new Set(
    [...s.trail, ...(s.obstacles || [])].map((p) => key(p.x, p.y))
  );
  const score = (d) => {
    const x = p.x + vectors[d][0],
      y = p.y + vectors[d][1];
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE || occupied.has(key(x, y)))
      return -1;
    const seen = new Set(occupied),
      queue = [[x, y]];
    let count = 0;
    while (queue.length && count < 140) {
      const [a, b] = queue.shift(),
        k = key(a, b);
      if (a < 0 || b < 0 || a >= SIZE || b >= SIZE || seen.has(k)) continue;
      seen.add(k);
      count++;
      vectors.forEach(([dx, dy]) => queue.push([a + dx, b + dy]));
    }
    return count + (d === p.d ? 0.1 : 0);
  };
  return [p.d, (p.d + 1) % 4, (p.d + 3) % 4].sort(
    (a, b) => score(b) - score(a)
  )[0];
}
