export const SIZE = 36;
export const vectors = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
export function newRace() {
  const players = [
    { x: 5, y: 18, d: 1, alive: true },
    { x: 30, y: 18, d: 3, alive: true },
  ];
  return {
    players,
    trail: players.map((p, i) => ({ x: p.x, y: p.y, owner: i })),
    tick: 0,
    done: false,
  };
}
const key = (x, y) => `${x},${y}`;
export function step(s, inputs = {}) {
  if (s.done) return s;
  const occupied = new Set(s.trail.map((p) => key(p.x, p.y)));
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
  return {
    players: next,
    trail: [
      ...s.trail,
      ...next.flatMap((p, i) =>
        p.alive ? [{ x: p.x, y: p.y, owner: i }] : []
      ),
    ],
    tick: s.tick + 1,
    done: next.filter((p) => p.alive).length <= 1,
  };
}
export function steer(s, id) {
  const p = s.players[id];
  const occupied = new Set(s.trail.map((p) => key(p.x, p.y)));
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
