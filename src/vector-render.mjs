import { radarContacts } from "./lib/vector-radar.mjs";
import {
  axes,
  add,
  sub,
  mul,
  dot,
  length,
  clamp,
  rocksNear,
  targetFor,
  SHIPS,
  evasionAngle,
} from "./lib/vector-wake.mjs";
const TAU = Math.PI * 2;
const hash = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
export const STARS = Array.from({ length: 650 }, (_, i) => {
  const a = hash(i + 3) * TAU,
    y = hash(i + 901) * 2 - 1,
    r = Math.sqrt(1 - y * y);
  return {
    x: Math.cos(a) * r * 4800,
    y: y * 4800,
    z: Math.sin(a) * r * 4800,
    bright: hash(i + 502),
  };
});
function mesh(points, faces, extra = []) {
  const edges = new Map();
  for (const face of faces)
    for (let i = 0; i < face.length; i++) {
      const a = face[i],
        b = face[(i + 1) % face.length],
        key = [a, b].sort((a, b) => a - b).join(":");
      edges.set(key, [a, b]);
    }
  return { points, edges: [...edges.values(), ...extra] };
}
// Each hull is original geometry: a three-spar needle, faceted cutter, asymmetric rake and pentagonal lattice carrier.
export const MESHES = {
  vela: mesh(
    [
      [0, 0, -24],
      [-6, -3, 1],
      [6, -3, 1],
      [0, 5, 6],
      [0, 0, 18],
      [-27, -2, 16],
      [27, -2, 16],
      [-19, -2, 5],
      [19, -2, 5],
      [-8, 0, 16],
      [8, 0, 16],
    ],
    [
      [0, 1, 3],
      [0, 3, 2],
      [1, 2, 4],
      [1, 5, 7],
      [2, 8, 6],
      [3, 4, 9],
      [3, 10, 4],
    ],
    [
      [5, 9],
      [6, 10],
    ]
  ),
  spindle: mesh(
    [
      [0, 0, -20],
      [-5, -4, 7],
      [5, -4, 7],
      [0, 6, 7],
      [0, 0, 15],
      [-16, -8, 12],
      [16, -8, 12],
      [0, 18, 12],
      [-9, -5, -3],
      [9, -5, -3],
      [0, 10, -3],
    ],
    [
      [0, 1, 2],
      [0, 2, 3],
      [0, 3, 1],
      [1, 4, 2],
      [2, 4, 3],
      [3, 4, 1],
      [1, 5, 8],
      [2, 9, 6],
      [3, 7, 10],
    ]
  ),
  prism: mesh(
    [
      [0, 0, -18],
      [-19, 0, 1],
      [0, 9, 4],
      [19, 0, 1],
      [0, -8, 4],
      [0, 0, 19],
      [-24, -4, 13],
      [24, -4, 13],
      [-13, 5, 9],
      [13, 5, 9],
    ],
    [
      [0, 1, 2],
      [0, 2, 3],
      [0, 3, 4],
      [0, 4, 1],
      [5, 2, 1],
      [5, 3, 2],
      [5, 4, 3],
      [5, 1, 4],
      [1, 6, 8],
      [3, 9, 7],
    ],
    [[6, 7]]
  ),
  rake: mesh(
    [
      [0, 1, -21],
      [-5, -4, 6],
      [7, -4, 8],
      [4, 5, 10],
      [0, 0, 19],
      [-23, 1, 6],
      [-17, 1, -10],
      [-20, 7, 14],
      [19, -6, 13],
      [15, -6, -3],
      [20, -1, 17],
    ],
    [
      [0, 1, 2],
      [0, 2, 3],
      [0, 3, 1],
      [1, 4, 2],
      [2, 4, 3],
      [3, 4, 1],
      [1, 5, 6],
      [5, 7, 3],
      [2, 8, 9],
      [8, 10, 3],
    ]
  ),
};
const arkPoints = [];
for (let ring = 0; ring < 3; ring++)
  for (let i = 0; i < 5; i++) {
    const a = (i * TAU) / 5 + ring * 0.21,
      r = ring === 1 ? 78 : 54;
    arkPoints.push([Math.cos(a) * r, Math.sin(a) * r, (ring - 1) * 68]);
  }
arkPoints.push([0, 0, -112], [0, 0, 105]);
const arkEdges = [];
for (let i = 0; i < 5; i++) {
  for (let k = 0; k < 3; k++) arkEdges.push([k * 5 + i, k * 5 + ((i + 1) % 5)]);
  arkEdges.push(
    [i, i + 5],
    [i + 5, i + 10],
    [i, ((i + 1) % 5) + 5],
    [i + 5, ((i + 1) % 5) + 10],
    [15, i],
    [16, i + 10]
  );
}
MESHES.ark = { points: arkPoints, edges: arkEdges };
// Procedural orbital backdrop: latitude/longitude curves and oblique satellite rings.
const planet = { points: [], edges: [] };
for (let latitude = 1; latitude < 12; latitude++) {
  const theta = (latitude * Math.PI) / 12;
  for (let j = 0; j < 48; j++) {
    const a = (j * TAU) / 48,
      index = planet.points.length;
    planet.points.push([
      Math.cos(a) * Math.sin(theta),
      Math.cos(theta),
      Math.sin(a) * Math.sin(theta),
    ]);
    planet.edges.push([index, index - j + ((j + 1) % 48)]);
    if (latitude > 1 && j % 4 === 0) planet.edges.push([index - 48, index]);
  }
}
const orbit = { points: [], edges: [] };
for (let ring = 0; ring < 3; ring++)
  for (let i = 0; i < 96; i++) {
    const a = (i * TAU) / 96,
      index = orbit.points.length,
      radius = 1.38 + ring * 0.1;
    orbit.points.push([
      Math.cos(a) * radius,
      Math.sin(a) * radius * 0.23,
      Math.sin(a) * radius * 0.65,
    ]);
    orbit.edges.push([index, index - i + ((i + 1) % 96)]);
  }
const cellMesh = mesh(
  [
    [0, 12, 0],
    [-9, 0, 0],
    [0, 0, -9],
    [9, 0, 0],
    [0, 0, 9],
    [0, -12, 0],
  ],
  [
    [0, 1, 2],
    [0, 2, 3],
    [0, 3, 4],
    [0, 4, 1],
    [5, 2, 1],
    [5, 3, 2],
    [5, 4, 3],
    [5, 1, 4],
  ]
);
export function camera(p) {
  const a = axes(p),
    c = Math.cos(p.roll),
    s = Math.sin(p.roll);
  return {
    ...p,
    f: a.f,
    r: add(mul(a.r, c), mul(a.u, s)),
    u: add(mul(a.u, c), mul(a.r, -s)),
  };
}
export const viewPoint = (v, cam) => {
  const d = sub(v, cam);
  return { x: dot(d, cam.r), y: dot(d, cam.u), z: dot(d, cam.f) };
};
const lens = (w, h) => Math.min(w * 0.68, h * 1.05);
export function project(v, w, h) {
  return v.z < 3
    ? null
    : {
        x: w / 2 + (v.x * lens(w, h)) / v.z,
        y: h * 0.46 - (v.y * lens(w, h)) / v.z,
        z: v.z,
      };
}
export function clippedLine(a, b, w, h) {
  if (a.z < 3 && b.z < 3) return null;
  if (a.z < 3) {
    const t = (3 - a.z) / (b.z - a.z);
    a = { ...add(a, mul(sub(b, a), t)), z: 3 };
  }
  if (b.z < 3) {
    const t = (3 - b.z) / (a.z - b.z);
    b = { ...add(b, mul(sub(a, b), t)), z: 3 };
  }
  return [project(a, w, h), project(b, w, h)];
}
function worldMesh(
  c,
  model,
  pos,
  cam,
  w,
  h,
  colour,
  scale = 1,
  yaw = 0,
  roll = 0,
  glow = true
) {
  const cs = Math.cos(yaw),
    sn = Math.sin(yaw),
    cr = Math.cos(roll),
    sr = Math.sin(roll);
  const points = model.points.map(([x, y, z]) => {
    const xx = x * cr - y * sr,
      yy = x * sr + y * cr;
    return viewPoint(
      {
        x: pos.x + (xx * cs + z * sn) * scale,
        y: pos.y + yy * scale,
        z: pos.z + (-xx * sn + z * cs) * scale,
      },
      cam
    );
  });
  c.strokeStyle = colour;
  c.lineWidth = 1;
  c.shadowColor = colour;
  c.shadowBlur = glow ? 4 : 0;
  c.beginPath();
  for (const [i, j] of model.edges) {
    const line = clippedLine(points[i], points[j], w, h);
    if (!line) continue;
    const [a, b] = line;
    c.moveTo(a.x, a.y);
    c.lineTo(b.x, b.y);
  }
  c.stroke();
  c.shadowBlur = 0;
}
const rocks = Array.from({ length: 26 }, (_, i) => {
  const pts = [];
  for (let j = 0; j < 8; j++) {
    const a = (j * TAU) / 8,
      r = 0.75 + hash(i * 17 + j) * 0.4;
    pts.push([Math.cos(a) * r, Math.sin(a) * r, j % 2 ? -0.5 : 0.5]);
  }
  pts.push([0.1, 0.1, -1], [-0.2, 0, 1]);
  return mesh(
    pts,
    Array.from({ length: 8 }, (_, j) => [j, (j + 1) % 8, j % 2 ? 8 : 9])
  );
});
function path(c, points, colour, width = 1) {
  c.strokeStyle = colour;
  c.lineWidth = width;
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.stroke();
}
// Three strokes make a luminous vector beam without bitmap textures or filled explosions.
function beam(c, points, colour, glow, width = 1.6) {
  if (glow) {
    c.globalAlpha *= 0.25;
    path(c, points, colour, width * 4);
    c.globalAlpha *= 4;
  }
  c.shadowColor = colour;
  c.shadowBlur = glow ? 12 : 0;
  path(c, points, colour, width + 1);
  c.shadowBlur = 0;
  path(c, points, "#effff5", Math.max(0.7, width * 0.48));
}
function worldLine(c, a, z, cam, w, h, colour, glow = false, width = 1) {
  const line = clippedLine(viewPoint(a, cam), viewPoint(z, cam), w, h);
  if (line) {
    const pts = line.map((p) => [p.x, p.y]);
    if (glow) beam(c, pts, colour, true, width);
    else path(c, pts, colour, width);
  }
}
function cannons(c, b, w, h, clock, glow, reduced) {
  const age = clock - (b.fireAt - 0.19),
    firing = b.fired > 0 && age >= 0 && age < 0.13;
  for (const side of [-1, 1]) {
    const mouth = project({ x: side * 3.8, y: -4.4, z: 14 }, w, h);
    const rear = project({ x: side * 5.8, y: -7, z: 7 }, w, h);
    const recoil = firing && !reduced ? (1 - age / 0.13) * 5 : 0;
    const ring = (p, size) =>
      Array.from({ length: 7 }, (_, i) => {
        const a = (i * TAU) / 6;
        return [
          p.x + Math.cos(a) * size,
          p.y + recoil + Math.sin(a) * size * 0.6,
        ];
      });
    const front = ring(mouth, Math.max(5, w * 0.009)),
      back = ring(rear, w * 0.025);
    path(c, back, "#20564c", 1.5);
    for (let i = 0; i < 6; i++)
      path(c, [back[i], front[i]], i % 2 ? "#286e60" : "#55b59e", 1.2);
    path(c, front, "#8be9c3", 1.5);
    if (firing) {
      c.globalAlpha = 1 - age / 0.13;
      const radius = (reduced ? 9 : 23) * (1 - age / 0.2);
      for (let i = 0; i < 6; i++) {
        const a = (i * TAU) / 6;
        beam(
          c,
          [
            [mouth.x, mouth.y],
            [
              mouth.x + Math.cos(a) * radius,
              mouth.y + Math.sin(a) * radius * 0.6,
            ],
          ],
          "#76ffcd",
          glow,
          1.3
        );
      }
      c.globalAlpha = 1;
    }
  }
}
function label(c, text, x, y, colour = "#a5ddd3", size = 11, align = "left") {
  c.font = `${size}px ui-monospace, SFMono-Regular, Consolas, monospace`;
  c.fillStyle = colour;
  c.textAlign = align;
  c.fillText(text, x, y);
}
function bar(c, x, y, value, colour, width = 116) {
  for (let i = 0; i < 10; i++) {
    c.fillStyle = i < value / 10 ? colour : "#11312e";
    c.fillRect(x + i * (width / 10), y, width / 10 - 3, 4);
  }
}
function cockpit(c, b, p, cam, w, h, time, reduced, radarRange) {
  const cyan = "#55dfc5",
    dim = "#194c45",
    soft = "#357f72",
    cx = w / 2,
    cy = h * 0.46;
  c.shadowColor = cyan;
  c.shadowBlur = 3;
  // Vela-9 canopy: open three-point arch and offset consoles; never a borrowed spacecraft silhouette.
  path(
    c,
    [
      [0, h * 0.73],
      [w * 0.12, h * 0.79],
      [w * 0.25, h * 0.94],
      [w * 0.34, h],
      [0, h],
    ],
    dim,
    2
  );
  path(
    c,
    [
      [w, h * 0.73],
      [w * 0.88, h * 0.79],
      [w * 0.75, h * 0.94],
      [w * 0.66, h],
      [w, h],
    ],
    dim,
    2
  );
  path(
    c,
    [
      [0, h * 0.12],
      [w * 0.045, h * 0.15],
      [w * 0.14, h * 0.76],
      [w * 0.24, h],
    ],
    soft,
    1.2
  );
  path(
    c,
    [
      [w, h * 0.12],
      [w * 0.955, h * 0.15],
      [w * 0.86, h * 0.76],
      [w * 0.76, h],
    ],
    soft,
    1.2
  );
  path(
    c,
    [
      [w * 0.13, 0],
      [w * 0.21, h * 0.085],
      [w * 0.39, h * 0.085],
    ],
    dim
  );
  path(
    c,
    [
      [w * 0.87, 0],
      [w * 0.79, h * 0.085],
      [w * 0.61, h * 0.085],
    ],
    dim
  );
  path(
    c,
    [
      [w * 0.06, h * 0.82],
      [w * 0.19, h * 0.87],
      [w * 0.24, h * 0.96],
      [w * 0.05, h * 0.96],
      [w * 0.06, h * 0.82],
    ],
    soft
  );
  path(
    c,
    [
      [w * 0.94, h * 0.82],
      [w * 0.81, h * 0.87],
      [w * 0.76, h * 0.96],
      [w * 0.95, h * 0.96],
      [w * 0.94, h * 0.82],
    ],
    soft
  );
  for (let i = 0; i < 5; i++)
    path(
      c,
      [
        [w * 0.075, h * (0.85 + i * 0.02)],
        [w * 0.15, h * (0.87 + i * 0.015)],
      ],
      dim
    );
  // Aim and flight ladder.
  for (const a of [-1, 1]) {
    path(
      c,
      [
        [cx + a * 14, cy - 7],
        [cx + a * 22, cy - 7],
        [cx + a * 22, cy + 7],
        [cx + a * 14, cy + 7],
      ],
      cyan
    );
    path(
      c,
      [
        [cx - 4, cy + a * 4],
        [cx + 4, cy + a * 4],
      ],
      cyan
    );
  }
  c.strokeStyle = dim;
  c.setLineDash([2, 8]);
  c.beginPath();
  c.arc(cx, cy, Math.min(w, h) * 0.255, Math.PI * 0.85, Math.PI * 2.15);
  c.stroke();
  c.setLineDash([]);
  for (let i = -2; i <= 2; i++) {
    const yy = cy + i * 45 + p.pitch * 46;
    if (yy < h * 0.18 || yy > h * 0.76) continue;
    path(
      c,
      [
        [cx - 90, yy],
        [cx - 64, yy],
      ],
      dim
    );
    path(
      c,
      [
        [cx + 64, yy],
        [cx + 90, yy],
      ],
      dim
    );
  }
  if (w > 700) {
    label(c, "VELA / 09", w * 0.065, h * 0.79, soft, 10);
    label(c, "TWIN PULSE", w * 0.79, h * 0.86, cyan, 10);
    bar(
      c,
      w * 0.79,
      h * 0.89,
      100 - p.heat,
      b.overheated ? "#ff9064" : cyan,
      w * 0.105
    );
    label(
      c,
      `${p.speed.toFixed(0).padStart(3, "0")} M/S`,
      w * 0.79,
      h * 0.935,
      soft,
      11
    );
  }
  // Tactical scope: distinct silhouettes, altitude stems and locked-contact brackets.
  const radius = Math.min(76, w * 0.12),
    rx = cx,
    ry = h - radius - 23;
  c.fillStyle = "#03130f";
  c.beginPath();
  c.arc(rx, ry, radius, 0, TAU);
  c.fill();
  for (const ring of [0.33, 0.66, 1]) {
    c.strokeStyle = ring === 1 ? soft : dim;
    c.beginPath();
    c.arc(rx, ry, radius * ring, 0, TAU);
    c.stroke();
  }
  path(
    c,
    [
      [rx - radius, ry],
      [rx + radius, ry],
    ],
    dim
  );
  path(
    c,
    [
      [rx, ry - radius],
      [rx, ry + radius],
    ],
    dim
  );
  c.setLineDash([2, 5]);
  path(
    c,
    [
      [rx - radius * 0.65, ry - radius * 0.75],
      [rx, ry],
      [rx + radius * 0.65, ry - radius * 0.75],
    ],
    soft
  );
  c.setLineDash([]);
  const contacts = radarContacts(b, p, radarRange);
  for (const contact of contacts) {
    const x = rx + contact.x * radius,
      y = ry + contact.y * radius;
    const tip = clamp(
      y - contact.altitude * radius,
      ry - radius + 5,
      ry + radius - 5
    );
    const colour =
      contact.kind === "wingmate"
        ? contact.colour
        : contact.locked
        ? "#fff1aa"
        : "#ff906b";
    if (Math.abs(tip - y) > 2) {
      path(
        c,
        [
          [x, y],
          [x, tip],
        ],
        colour
      );
      path(
        c,
        [
          [x - 2, y],
          [x + 2, y],
        ],
        colour
      );
    }
    if (contact.kind === "wingmate") {
      path(
        c,
        [
          [x, tip - 4],
          [x + 4, tip],
          [x, tip + 4],
          [x - 4, tip],
          [x, tip - 4],
        ],
        colour,
        1.4
      );
    } else {
      const side = contact.behind ? 1 : -1;
      path(
        c,
        [
          [x - 3, tip - side * 2],
          [x, tip + side * 4],
          [x + 3, tip - side * 2],
          [x - 3, tip - side * 2],
        ],
        colour,
        1.2
      );
    }
    if (contact.locked) {
      c.strokeStyle = "#fff1aa";
      c.strokeRect(x - 7, tip - 7, 14, 14);
    }
    if (contact.outside)
      path(
        c,
        [
          [x - 2, tip + 6],
          [x + 2, tip + 6],
        ],
        colour
      );
  }
  path(
    c,
    [
      [rx - 3, ry + 4],
      [rx, ry - 4],
      [rx + 3, ry + 4],
    ],
    cyan,
    1.5
  );
  label(
    c,
    `FWD · ${radarRange < 1000 ? `${radarRange}m` : `${radarRange / 1000}km`}`,
    rx,
    ry - radius - 5,
    soft,
    8,
    "center"
  );
  label(c, "AFT", rx, ry + radius - 8, soft, 8, "center");
  if (w > 700) {
    label(c, "▲ HOSTILE", rx + radius + 14, ry - 14, "#ff906b", 8);
    label(c, "◇ WING", rx + radius + 14, ry, "#69eaff", 8);
    label(c, "STEM: ALT", rx + radius + 14, ry + 14, soft, 8);
  }
  label(c, "SHIELD", 25, h - 56, soft, 9);
  bar(c, 25, h - 45, p.shield, cyan, Math.min(130, w * 0.2));
  label(c, "HULL", 25, h - 25, soft, 9);
  bar(
    c,
    25,
    h - 14,
    p.hull,
    p.hull < 35 ? "#ff7867" : cyan,
    Math.min(130, w * 0.2)
  );
  const right = w - 25;
  label(
    c,
    `SEEKERS ${"▱".repeat(p.missiles)}`,
    right,
    h - 48,
    cyan,
    10,
    "right"
  );
  label(c, "BOOST", right, h - 25, soft, 9, "right");
  bar(
    c,
    right - Math.min(130, w * 0.2),
    h - 14,
    p.energy,
    cyan,
    Math.min(130, w * 0.2)
  );
  c.shadowBlur = 0;
  if (b.time - b.hitAt < 0.15) {
    c.strokeStyle = "#f8ffe6";
    c.beginPath();
    for (const [x, y] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      c.moveTo(cx + x * 10, cy + y * 10);
      c.lineTo(cx + x * 17, cy + y * 17);
    }
    c.stroke();
  }
  if (b.time - b.damageAt < 0.25 && !reduced) {
    c.strokeStyle = "#ff685c";
    c.lineWidth = 4;
    c.strokeRect(3, 3, w - 6, h - 6);
  }
}
export function renderVector(
  c,
  b,
  w,
  h,
  time,
  {
    preview = false,
    view = null,
    reduced = false,
    glow = true,
    elapsed = 0,
    radarRange = 1600,
  } = {}
) {
  const p = view || b.players[0],
    clock = b.time + elapsed,
    roll = reduced ? p.roll : p.roll + evasionAngle(p, clock),
    cam = camera({ ...p, roll });
  c.clearRect(0, 0, w, h);
  c.fillStyle = "#010606";
  c.fillRect(0, 0, w, h);
  for (const star of STARS) {
    const local = {
      x: dot(star, cam.r),
      y: dot(star, cam.u),
      z: dot(star, cam.f),
    };
    const point = project(local, w, h);
    if (!point || point.x < 0 || point.x > w || point.y < 0 || point.y > h)
      continue;
    c.fillStyle = star.bright > 0.8 ? "#b7ddd3" : "#3c6964";
    c.fillRect(
      point.x,
      point.y,
      star.bright > 0.93 ? 1.5 : 1,
      star.bright > 0.93 ? 1.5 : 1
    );
    if (p.speed > 130 && !reduced) {
      const dx = point.x - w / 2,
        dy = point.y - h * 0.46;
      path(
        c,
        [
          [point.x, point.y],
          [point.x + dx * 0.035, point.y + dy * 0.035],
        ],
        "#164438"
      );
    }
  }
  const sky = b.scenery || { x: -1800, y: 1050, z: -4000 };
  worldMesh(
    c,
    planet,
    sky,
    cam,
    w,
    h,
    ["#1f3f59", "#293963", "#4b305e"][b.wave - 1],
    920,
    clock * 0.008,
    0.3,
    false
  );
  worldMesh(
    c,
    orbit,
    sky,
    cam,
    w,
    h,
    ["#315975", "#424f7d", "#6a3e70"][b.wave - 1],
    920,
    clock * 0.008,
    0.3,
    false
  );
  // Radial slipstream is visible only under boost, leaving ordinary flight uncluttered.
  if (!preview && !reduced && p.speed > 220) {
    const strength = clamp((p.speed - 220) / 200, 0, 1);
    c.globalAlpha = strength * 0.5;
    for (let i = 0; i < 34; i++) {
      const a = (i * TAU) / 34 + Math.sin(clock * 0.4) * 0.08,
        phase = (clock * 1.9 + hash(i + 500) * 2) % 1;
      const radius = Math.min(w, h) * (0.22 + phase * 0.8);
      const far = radius + 35 + phase * 150;
      path(
        c,
        [
          [w / 2 + Math.cos(a) * radius, h * 0.46 + Math.sin(a) * radius],
          [w / 2 + Math.cos(a) * far, h * 0.46 + Math.sin(a) * far],
        ],
        i % 4 ? "#478bbc" : "#97e6ff",
        1.2
      );
    }
    c.globalAlpha = 1;
  }
  // A local dust field gives cruise speed parallax; boost stretches it into streaks.
  // Particles wrap in world space so they continue moving as the pilot turns.
  if (!preview && !reduced)
    for (let i = 0; i < 140; i++) {
      const wrap = (v, centre) => v + Math.round((centre - v) / 1600) * 1600;
      const dust = {
        x: wrap(hash(i + 2500) * 1600, p.x),
        y: wrap(hash(i + 2800) * 1600, p.y),
        z: wrap(hash(i + 3100) * 1600, p.z),
      };
      const end = sub(dust, mul(cam.f, 4 + p.speed * 0.08));
      worldLine(c, dust, end, cam, w, h, p.speed > 230 ? "#378a78" : "#20463e");
    }
  // Remote navigation lattice: rings at true world coordinates, not a flat background image.
  const gate = { points: [], edges: [] };
  for (let k = 0; k < 2; k++)
    for (let i = 0; i < 8; i++) {
      const a = (i * TAU) / 8;
      gate.points.push([Math.cos(a) * 340, Math.sin(a) * 340, k * 260]);
      gate.edges.push([k * 8 + i, k * 8 + ((i + 1) % 8)]);
      if (k === 0) gate.edges.push([i, i + 8]);
    }
  worldMesh(
    c,
    gate,
    { x: 420, y: -230, z: -2300 },
    cam,
    w,
    h,
    "#0d3836",
    1,
    0,
    0,
    false
  );
  for (const r of rocksNear(p)) {
    if (length(sub(r, p)) > 2100) continue;
    worldMesh(
      c,
      rocks[r.seed],
      r,
      cam,
      w,
      h,
      "#305749",
      r.radius,
      r.seed * 0.6,
      r.seed * 0.4,
      false
    );
  }
  for (const e of [...b.enemies].sort(
    (a, d) => length(sub(d, p)) - length(sub(a, p))
  )) {
    const velocity = { x: e.vx, y: e.vy, z: e.vz };
    const pos = add(e, mul(velocity, elapsed));
    const yaw =
      e.type === "ark"
        ? clock * 0.045
        : e.flightYaw ?? Math.atan2(-e.vx, -e.vz);
    if (!reduced) {
      const trail = [...(e.trail || []), pos];
      c.globalAlpha = 0.35;
      for (let i = 1; i < trail.length; i++)
        worldLine(c, trail[i - 1], trail[i], cam, w, h, e.colour);
      c.globalAlpha = 1;
      const speed = Math.hypot(e.vx, e.vy, e.vz) || 1;
      const exhaust = mul(velocity, -1 / speed);
      const start = add(pos, mul(exhaust, e.radius));
      worldLine(
        c,
        start,
        add(
          start,
          mul(
            exhaust,
            e.type === "ark"
              ? 65
              : (e.manoeuvre === "REGROUP" ? 80 : 30) +
                  Math.sin(clock * 31 + e.phase) * 7
          )
        ),
        cam,
        w,
        h,
        e.colour,
        glow,
        1.2
      );
    }
    if (e.type === "ark") {
      const colour = e.hp < SHIPS.ark.hp * 0.4 ? "#ffb764" : "#e8adff";
      worldMesh(
        c,
        MESHES.ark,
        pos,
        cam,
        w,
        h,
        colour,
        0.3 + Math.sin(clock * 2.8) * 0.025,
        -clock * 0.4,
        clock * 0.33,
        glow
      );
    }
    worldMesh(
      c,
      MESHES[e.type],
      pos,
      cam,
      w,
      h,
      e.colour,
      e.scale || 1,
      yaw,
      e.type === "ark" ? b.time * 0.09 : Math.sin(b.time + e.phase) * 0.3,
      glow
    );
  }
  for (const mate of b.wingmates || []) {
    if (!mate.alive) continue;
    worldMesh(
      c,
      MESHES.vela,
      mate,
      cam,
      w,
      h,
      mate.colour,
      1.1,
      mate.yaw,
      mate.roll,
      glow
    );
    const point = project(viewPoint(mate, cam), w, h);
    if (
      point &&
      point.x > 25 &&
      point.x < w - 25 &&
      point.y > 65 &&
      point.y < h * 0.76
    )
      label(
        c,
        `WING ${mate.index + 1} / ${Math.round(length(sub(mate, p)))}m`,
        point.x,
        point.y - 22,
        mate.colour,
        10,
        "center"
      );
  }
  for (const cell of b.pickups || []) {
    const distance = length(sub(cell, p));
    worldMesh(
      c,
      cellMesh,
      cell,
      cam,
      w,
      h,
      "#69eaff",
      1 + Math.sin(clock * 4 + cell.id) * 0.12,
      clock * 1.8,
      clock * 0.5,
      glow
    );
    const point = project(viewPoint(cell, cam), w, h);
    if (
      point &&
      distance < 900 &&
      point.x > 30 &&
      point.x < w - 30 &&
      point.y > 80 &&
      point.y < h * 0.8
    ) {
      label(
        c,
        `CELL / ${Math.round(distance)}m`,
        point.x,
        point.y + 25,
        "#78c7e2",
        9,
        "center"
      );
    }
  }
  for (const s of b.shots) {
    const velocity = { x: s.vx, y: s.vy, z: s.vz };
    const age = Math.max(0, clock - (s.born ?? b.time - 1));
    const head = b.smoothMotion ? s : add(s, mul(velocity, elapsed - 0.1));
    const trailTime = Math.min(age, s.missile ? 0.26 : s.enemy ? 0.1 : 0.065);
    const tail = sub(head, mul(velocity, trailTime));
    worldLine(
      c,
      tail,
      head,
      cam,
      w,
      h,
      s.enemy ? "#ff7650" : s.missile ? "#ffd88a" : "#64ffd4",
      glow,
      s.missile ? 2.3 : s.enemy ? 1.8 : 2.4
    );
    if (s.missile) {
      const tip = project(viewPoint(head, cam), w, h);
      if (tip) {
        c.strokeStyle = "#fff0a8";
        c.beginPath();
        c.arc(tip.x, tip.y, 3, 0, TAU);
        c.stroke();
      }
    }
  }
  for (const e of b.effects) {
    if (e.kind === "impact") continue;
    const duration = e.kind === "burst" ? 1.6 : 0.45;
    const progress = clamp(
      (clock - (e.createdAt ?? e.until - duration)) / duration,
      0,
      1
    );
    const burst = e.kind === "burst",
      radius = progress * (burst ? Math.max(130, e.radius * 3.2) : 38);
    c.globalAlpha = 1 - progress;
    if (burst) {
      const ring = [];
      for (let j = 0; j <= 28; j++) {
        const a = (j * TAU) / 28;
        ring.push(
          add(
            e,
            add(
              mul(cam.r, Math.cos(a) * radius),
              mul(cam.u, Math.sin(a) * radius * 0.72)
            )
          )
        );
      }
      for (let j = 1; j < ring.length; j++)
        worldLine(
          c,
          ring[j - 1],
          ring[j],
          cam,
          w,
          h,
          e.colour,
          glow && progress < 0.35,
          1.4
        );
      const centre = project(viewPoint(e, cam), w, h);
      if (centre && e.reward)
        label(
          c,
          `+${e.reward}`,
          centre.x,
          centre.y - progress * 55,
          "#edffbf",
          15,
          "center"
        );
      if (progress < 0.5) {
        // Two oblique secondary shock rings, not a filled full-screen flash.
        for (const tilt of [-1, 1])
          for (let j = 0; j < 30; j++) {
            const point = (a) =>
              add(
                e,
                add(
                  mul(cam.r, Math.cos(a) * radius * 1.2),
                  add(
                    mul(cam.u, Math.sin(a) * radius * 0.3),
                    mul(cam.f, Math.sin(a) * radius * tilt)
                  )
                )
              );
            worldLine(
              c,
              point((j * TAU) / 30),
              point(((j + 1) * TAU) / 30),
              cam,
              w,
              h,
              "#fff2c0"
            );
          }
      }
    }
    for (let i = 0; i < (burst ? 26 : 10); i++) {
      const a = i * 2.399 + e.id,
        direction = { x: Math.cos(a), y: Math.sin(a), z: Math.sin(i * 4.1) };
      const pos = add(e, mul(direction, radius));
      const end = add(pos, mul(direction, burst ? 16 : 9));
      worldLine(
        c,
        pos,
        end,
        cam,
        w,
        h,
        i % 3 ? e.colour : "#fff7c7",
        glow && progress < 0.5,
        1.2
      );
      // Spinning triangular hull fragments keep the breakup in the same vector vocabulary.
      if (burst && i % 3 === 0 && !reduced) {
        const spin = clock * 4 + i,
          extent = 6 + e.radius * 0.12;
        const q = add(
          pos,
          add(
            mul(cam.r, Math.cos(spin) * extent),
            mul(cam.u, Math.sin(spin) * extent)
          )
        );
        worldLine(c, pos, q, cam, w, h, e.colour);
        worldLine(c, q, end, cam, w, h, e.colour);
      }
    }
    c.globalAlpha = 1;
  }
  const nearest = targetFor(b, p);
  if (nearest) {
    const e = nearest.enemy,
      local = viewPoint(e, cam),
      s = project(local, w, h);
    if (s && s.x > 25 && s.x < w - 25 && s.y > 75 && s.y < h * 0.79) {
      const size = clamp((e.radius * lens(w, h) * 1.1) / local.z, 17, 95),
        colour = b.lockTime >= 1.1 ? "#fff3ab" : e.colour;
      for (const [dx, dy] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ])
        path(
          c,
          [
            [s.x + dx * (size - 6), s.y + dy * size],
            [s.x + dx * size, s.y + dy * size],
            [s.x + dx * size, s.y + dy * (size - 6)],
          ],
          colour
        );
      label(
        c,
        `${e.name.toUpperCase()} / ${Math.round(nearest.distance)}m`,
        s.x,
        s.y + size + 16,
        colour,
        10,
        "center"
      );
      if (b.lock) {
        c.strokeStyle = colour;
        c.beginPath();
        c.arc(
          s.x,
          s.y,
          size + 7,
          -Math.PI / 2,
          -Math.PI / 2 + (TAU * b.lockTime) / 1.2
        );
        c.stroke();
      }
      if (e.type === "ark") {
        bar(
          c,
          s.x - 60,
          s.y - size - 12,
          (e.hp / SHIPS.ark.hp) * 100,
          e.colour,
          120
        );
      }
    } else {
      let dx = local.x,
        dy = -local.y;
      if (local.z < 0) {
        dx = dx || 1;
        dy = dy || 0.3;
      }
      const a = Math.atan2(dy, dx),
        rr = Math.min(w * 0.37, h * 0.32),
        x = w / 2 + Math.cos(a) * rr,
        y = h * 0.46 + Math.sin(a) * rr;
      path(
        c,
        [
          [x - Math.cos(a - 0.5) * 10, y - Math.sin(a - 0.5) * 10],
          [x, y],
          [x - Math.cos(a + 0.5) * 10, y - Math.sin(a + 0.5) * 10],
        ],
        e.colour,
        1.5
      );
      label(c, "CONTACT", x, y + 20, e.colour, 9, "center");
    }
  }
  cockpit(c, b, p, cam, w, h, time, reduced, radarRange);
  cannons(c, b, w, h, clock, glow, reduced);
  if (!preview) {
    const threat = b.shots.find((s) => {
      if (!s.enemy) return false;
      const d = sub(s, p),
        velocity = {
          x: s.vx - cam.f.x * p.speed,
          y: s.vy - cam.f.y * p.speed,
          z: s.vz - cam.f.z * p.speed,
        };
      const t = -dot(d, velocity) / (dot(velocity, velocity) || 1);
      return t > 0 && t < 1.6 && length(add(d, mul(velocity, t))) < 75;
    });
    if (threat) {
      const local = viewPoint(threat, cam),
        x = w / 2 + (local.x > 0 ? 1 : -1) * Math.min(165, w * 0.3),
        y = h * 0.46;
      path(
        c,
        [
          [x - 10, y - 13],
          [x + 10, y],
          [x - 10, y + 13],
        ],
        "#ff9564",
        2
      );
      label(c, "INCOMING · BREAK", w / 2, h * 0.22, "#ffb184", 12, "center");
    }
    if (clock - b.nearAt < 0.65)
      label(c, "CLOSE CALL +15", w / 2, h * 0.65, "#ffd38c", 11, "center");
  }
  if (!preview) {
    const evadeAge = clock - (p.evadeAt ?? -10),
      ready = evadeAge >= 3.5;
    label(
      c,
      ready
        ? "Z / C · EVADE READY"
        : `EVADE ${Math.max(0, 3.5 - evadeAge).toFixed(1)}s`,
      w / 2,
      h - 9,
      ready ? "#83cbd5" : "#466d72",
      9,
      "center"
    );
    if (evadeAge >= 0 && evadeAge < 0.65) {
      const radius = Math.min(w, h) * 0.3;
      c.strokeStyle = "#85dfff";
      c.lineWidth = 1.6;
      c.beginPath();
      c.arc(w / 2, h * 0.46, radius, -Math.PI * 0.7, Math.PI * 0.7);
      c.stroke();
      label(c, "EVASIVE ROLL", w / 2, h * 0.67, "#a6edff", 11, "center");
    }
    if (clock - (b.cellAt ?? -10) < 1.1)
      label(
        c,
        "SHIELD +20 / BOOST +30",
        w / 2,
        h * 0.61,
        "#9defff",
        11,
        "center"
      );
    if (b.chain > 1 && clock - b.killAt < 2) {
      label(c, `CHAIN ×${b.chain}`, w - 25, 72, "#e7ff9c", 19, "right");
    }
  }
  if (b.overheated)
    label(c, "CANNONS COOLING", w / 2, h * 0.64, "#ffb84a", 12, "center");
  if (!preview && b.time < b.noticeUntil)
    label(c, b.notice, w / 2, h * 0.16, "#b9e8da", w < 700 ? 10 : 12, "center");
}
