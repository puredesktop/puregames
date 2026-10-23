export const WORLD = { width: 1800, height: 1400 };
export const SAFE = { x: 900, y: 1220 };
export const BUILDINGS = [
  { x: 180, y: 130, w: 510, h: 380, type: "theatre", name: "MERIDIAN" },
  { x: 1100, y: 170, w: 480, h: 300, type: "diner", name: "THE BLUE HOUR" },
  { x: 150, y: 850, w: 570, h: 280, type: "station", name: "BELL STREET" },
  { x: 1430, y: 820, w: 240, h: 160, type: "harbour", name: "VESPER" },
  { x: 70, y: 40, w: 590, h: 50, type: "block" },
  { x: 1130, y: 45, w: 540, h: 65, type: "block" },
  { x: 50, y: 590, w: 480, h: 110, type: "block" },
  { x: 1270, y: 590, w: 470, h: 110, type: "block" },
  { x: 100, y: 1230, w: 590, h: 125, type: "block" },
];
export const WATER = { x: 1380, y: 1080, w: 420, h: 320 };
export const DROPS = [
  { x: 420, y: 550, name: "Ticket window" },
  { x: 738, y: 270, name: "Projection alley" },
  { x: 1180, y: 515, name: "Diner booth" },
  { x: 1510, y: 515, name: "Counter telephone" },
  { x: 1210, y: 1130, name: "Pier mooring" },
  { x: 1490, y: 1022, name: "Harbour radio" },
  { x: 460, y: 800, name: "Platform clock" },
  { x: 770, y: 1030, name: "Left luggage" },
];
export const COATS = [
  { name: "blue", color: "#789caf" },
  { name: "ochre", color: "#b59a68" },
  { name: "ash", color: "#b4b7ad" },
];
export const MARKS = ["a pale hat", "a red scarf", "a briefcase"];
export const COURIER_ROUTES = [
  [
    { x: 760, y: 220 },
    { x: 900, y: 250 },
    { x: 1020, y: 515 },
    { x: 730, y: 550 },
    { x: 420, y: 550 },
    { x: 100, y: 550 },
    { x: 100, y: 140 },
    { x: 760, y: 100 },
  ],
  [
    { x: 1040, y: 260 },
    { x: 1040, y: 550 },
    { x: 1650, y: 550 },
    { x: 1650, y: 140 },
    { x: 1030, y: 140 },
  ],
  [
    { x: 770, y: 800 },
    { x: 1200, y: 800 },
    { x: 1210, y: 1130 },
    { x: 900, y: 1170 },
    { x: 770, y: 1160 },
  ],
];
export const GUARD_ROUTES = [
  [
    { x: 590, y: 740 },
    { x: 1140, y: 740 },
    { x: 1140, y: 560 },
    { x: 800, y: 560 },
  ],
  [
    { x: 1000, y: 880 },
    { x: 1340, y: 1015 },
    { x: 1000, y: 1170 },
    { x: 800, y: 1080 },
  ],
];
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function walkable(x, y, r = 14) {
  return (
    x >= r &&
    y >= r &&
    x <= WORLD.width - r &&
    y <= WORLD.height - r &&
    ![...BUILDINGS, WATER].some(
      (b) =>
        x > b.x - r && x < b.x + b.w + r && y > b.y - r && y < b.y + b.h + r
    )
  );
}
export function move(body, dx, dy) {
  let { x, y } = body;
  if (walkable(x + dx, y)) x += dx;
  if (walkable(x, y + dy)) y += dy;
  return { ...body, x, y };
}
// Small shared navigation grid; agents use existing JavaScript, with no pathfinding library.
export function routeDirection(body, target, guards = []) {
  const size = 40,
    cols = 45,
    rows = 35,
    toCell = (x, y) =>
      Math.max(0, Math.min(rows - 1, Math.floor(y / size))) * cols +
      Math.max(0, Math.min(cols - 1, Math.floor(x / size)));
  const start = toCell(body.x, body.y),
    goal = toCell(target.x, target.y);
  if (start === goal) return { x: target.x - body.x, y: target.y - body.y };
  const queue = [start],
    prev = new Int32Array(cols * rows).fill(-1);
  prev[start] = start;
  for (let at = 0; at < queue.length; at++) {
    const n = queue[at];
    if (n === goal) break;
    for (const next of [n - 1, n + 1, n - cols, n + cols]) {
      if (
        next < 0 ||
        next >= prev.length ||
        prev[next] >= 0 ||
        Math.abs((next % cols) - (n % cols)) +
          Math.abs(Math.floor(next / cols) - Math.floor(n / cols)) !==
          1
      )
        continue;
      const x = ((next % cols) + 0.5) * size,
        y = (Math.floor(next / cols) + 0.5) * size;
      if (
        !walkable(x, y, 17) ||
        (next !== goal && guards.some((g) => distance({ x, y }, g) < 85))
      )
        continue;
      prev[next] = n;
      queue.push(next);
    }
  }
  if (prev[goal] < 0) return { x: 0, y: 0 };
  let step = goal;
  while (prev[step] !== start && step !== start) step = prev[step];
  return {
    x: ((step % cols) + 0.5) * size - body.x,
    y: (Math.floor(step / cols) + 0.5) * size - body.y,
  };
}
