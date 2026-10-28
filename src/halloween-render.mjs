import { NEIGHBOURS, WRAPPERS, normalAngle } from "./lib/halloween.mjs";

const TAU = Math.PI * 2;
const ellipse = (c, x, y, rx, ry, colour) => {
  c.fillStyle = colour;
  c.beginPath();
  c.ellipse(x, y, Math.abs(rx), Math.abs(ry), 0, 0, TAU);
  c.fill();
};
function pumpkin(c, x, y, size, time = 0) {
  c.save();
  c.translate(x, y);
  c.scale(size, size);
  ellipse(c, 0, 0.2, 0.58, 0.48, "#713d3e");
  for (const [a, b, col] of [
    [-0.32, 0.05, "#e37536"],
    [0.3, 0.05, "#ef8b3c"],
    [0, 0.06, "#ffa345"],
  ])
    ellipse(c, a, b, 0.3, 0.48, col);
  c.strokeStyle = "#668265";
  c.lineWidth = 0.13;
  c.beginPath();
  c.moveTo(0, -0.35);
  c.quadraticCurveTo(-0.1, -0.7, 0.13, -0.64);
  c.stroke();
  c.fillStyle = "#fff2a5";
  c.beginPath();
  c.moveTo(-0.33, -0.07);
  c.lineTo(-0.15, -0.19);
  c.lineTo(-0.12, 0.03);
  c.closePath();
  c.fill();
  c.beginPath();
  c.moveTo(0.33, -0.07);
  c.lineTo(0.15, -0.19);
  c.lineTo(0.12, 0.03);
  c.closePath();
  c.fill();
  c.beginPath();
  c.moveTo(-0.28, 0.18);
  c.quadraticCurveTo(0, 0.47, 0.28, 0.18);
  c.lineTo(0.07, 0.27);
  c.lineTo(0, 0.18);
  c.lineTo(-0.08, 0.28);
  c.closePath();
  c.fill();
  c.restore();
}
function monster(c, kind, x, y, size, time) {
  c.save();
  c.translate(x, y);
  c.scale(size, size);
  const bob = Math.sin(time / 700) * 0.035;
  c.translate(0, bob);
  ellipse(c, 0, 0.1, 0.5, 0.12, "#202a3555");
  if (kind === "ghost") {
    c.fillStyle = "#e0f0e4";
    c.beginPath();
    c.moveTo(-0.44, 0.03);
    c.lineTo(-0.42, -0.6);
    c.bezierCurveTo(-0.4, -1.45, 0.4, -1.45, 0.43, -0.6);
    c.lineTo(0.5, 0.03);
    c.lineTo(0.28, -0.08);
    c.lineTo(0.08, 0.06);
    c.lineTo(-0.15, -0.07);
    c.closePath();
    c.fill();
  } else if (kind === "vampire") {
    c.fillStyle = "#402c56";
    c.beginPath();
    c.moveTo(-0.55, 0.05);
    c.lineTo(-0.26, -1.05);
    c.lineTo(0.3, -1.05);
    c.lineTo(0.55, 0.05);
    c.closePath();
    c.fill();
    c.fillStyle = "#c65d78";
    c.beginPath();
    c.moveTo(-0.34, -0.9);
    c.lineTo(0, -0.5);
    c.lineTo(0.34, -0.9);
    c.fill();
    ellipse(c, 0, -0.81, 0.29, 0.36, "#d4cce7");
    c.fillStyle = "#38324f";
    c.beginPath();
    c.moveTo(-0.29, -0.95);
    c.quadraticCurveTo(0, -1.44, 0.29, -0.95);
    c.lineTo(0.02, -1.06);
    c.lineTo(-0.07, -0.91);
    c.fill();
  } else if (kind === "witch") {
    c.fillStyle = "#52507e";
    c.beginPath();
    c.moveTo(-0.45, 0.05);
    c.lineTo(0, -0.95);
    c.lineTo(0.45, 0.05);
    c.fill();
    ellipse(c, 0, -0.8, 0.28, 0.32, "#b5d5a2");
    c.fillStyle = "#5f437c";
    c.beginPath();
    c.moveTo(-0.38, -1.05);
    c.lineTo(0.1, -1.83);
    c.lineTo(0.37, -1.05);
    c.fill();
    ellipse(c, 0, -1.04, 0.51, 0.1, "#483558");
    c.strokeStyle = "#b99d64";
    c.lineWidth = 0.07;
    c.beginPath();
    c.moveTo(0.5, 0.03);
    c.lineTo(0.5, -1.05);
    c.stroke();
  } else if (kind === "wolf") {
    ellipse(c, 0, -0.35, 0.35, 0.47, "#a37e66");
    c.fillStyle = "#9b725c";
    c.beginPath();
    c.moveTo(-0.32, -0.9);
    c.lineTo(-0.31, -1.45);
    c.lineTo(0, -1.14);
    c.lineTo(0.31, -1.45);
    c.lineTo(0.32, -0.9);
    c.fill();
    ellipse(c, 0, -0.86, 0.35, 0.36, "#bf9676");
    ellipse(c, 0, -0.69, 0.23, 0.16, "#e7cfa7");
    ellipse(c, 0, -0.76, 0.09, 0.06, "#343147");
    c.strokeStyle = "#715343";
    c.lineWidth = 0.06;
    c.beginPath();
    c.moveTo(-0.45, -0.25);
    c.lineTo(0.49, -0.05);
    c.stroke();
  } else if (kind === "mummy") {
    ellipse(c, 0, -0.4, 0.29, 0.52, "#dfcfa6");
    ellipse(c, 0, -0.95, 0.3, 0.34, "#e6dabb");
    c.strokeStyle = "#aa987a";
    c.lineWidth = 0.035;
    for (let i = 0; i < 8; i++) {
      c.beginPath();
      c.moveTo(-0.27, -0.96 + i * 0.13);
      c.lineTo(0.27, -1.04 + i * 0.13);
      c.stroke();
    }
  } else {
    c.strokeStyle = "#e8e2d1";
    c.lineWidth = 0.1;
    c.lineCap = "round";
    for (const seg of [
      [0, -0.64, 0, -0.12],
      [0, -0.1, -0.22, 0.09],
      [0, -0.1, 0.22, 0.09],
      [-0.3, -0.55, 0.3, -0.55],
      [-0.3, -0.55, -0.42, -0.2],
      [0.3, -0.55, 0.4, -0.25],
    ]) {
      c.beginPath();
      c.moveTo(seg[0], seg[1]);
      c.lineTo(seg[2], seg[3]);
      c.stroke();
    }
    ellipse(c, 0, -0.95, 0.31, 0.32, "#e8e2d1");
    c.lineWidth = 0.04;
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.ellipse(0, -0.49 + i * 0.1, 0.2, 0.06, 0, 0, TAU);
      c.stroke();
    }
  }
  // Friendly eyes and smile, rather than scary faces.
  const eyeY = kind === "ghost" ? -0.83 : -0.94;
  ellipse(c, -0.105, eyeY, 0.04, 0.065, "#34334a");
  ellipse(c, 0.105, eyeY, 0.04, 0.065, "#34334a");
  c.strokeStyle = "#69485b";
  c.lineWidth = 0.035;
  c.beginPath();
  c.arc(0, eyeY + 0.13, 0.09, 0.1, Math.PI - 0.1);
  c.stroke();
  c.restore();
}
export function renderHalloween(
  c,
  board,
  width,
  height,
  time,
  camera = board.players[0]
) {
  const w = width,
    h = height,
    horizon = h * 0.44,
    focal = w * 0.78;
  c.clearRect(0, 0, w, h);
  const sky = c.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#242644");
  sky.addColorStop(0.42, "#67577c");
  sky.addColorStop(0.6, "#d0908b");
  sky.addColorStop(1, "#38414e");
  c.fillStyle = sky;
  c.fillRect(0, 0, w, h);
  for (let i = 0; i < 65; i++) {
    const x = (i * 137.5 - camera.yaw * 50 + w * 5) % w,
      y = (i * 53.2) % (h * 0.38);
    ellipse(
      c,
      x,
      y,
      i % 5 === 0 ? 1.4 : 0.7,
      i % 5 === 0 ? 1.4 : 0.7,
      `rgba(255,240,200,${0.35 + Math.sin(time / 1000 + i) * 0.15})`
    );
  }
  const moonX =
    ((((w * 0.78 - camera.yaw * w * 0.25) % (w * 2)) + w * 2) % (w * 2)) -
    w * 0.2;
  const glow = c.createRadialGradient(
    moonX,
    h * 0.19,
    2,
    moonX,
    h * 0.19,
    h * 0.2
  );
  glow.addColorStop(0, "#ffe7ae30");
  glow.addColorStop(1, "#ffe7ae00");
  c.fillStyle = glow;
  c.fillRect(0, 0, w, h * 0.5);
  ellipse(c, moonX, h * 0.19, h * 0.055, h * 0.055, "#f9e2ab");
  ellipse(c, moonX + h * 0.018, h * 0.174, h * 0.05, h * 0.05, "#504761");
  // Distant rolling silhouettes keep the street a cosy little world.
  for (let layer = 0; layer < 2; layer++) {
    c.fillStyle = layer ? "#36384e" : "#4c4661";
    c.beginPath();
    c.moveTo(0, horizon + 30);
    for (let x = 0; x <= w + 50; x += 50)
      c.lineTo(
        x,
        horizon - 15 - layer * 10 + Math.sin(x / 170 + layer * 3) * 18
      );
    c.lineTo(w, h);
    c.lineTo(0, h);
    c.fill();
  }
  const floor = c.createLinearGradient(0, horizon, 0, h);
  floor.addColorStop(0, "#68645f");
  floor.addColorStop(1, "#343a48");
  c.fillStyle = floor;
  c.fillRect(0, horizon, w, h - horizon);
  const sin = Math.sin(camera.yaw),
    cos = Math.cos(camera.yaw);
  const view = ([x, y, z]) => ({
    x: (x - camera.x) * cos - (z - camera.z) * sin,
    y: y - 1.5,
    z: (x - camera.x) * sin + (z - camera.z) * cos,
  });
  const project = (p) => ({
    x: w / 2 + (p.x / p.z) * focal,
    y: horizon - (p.y / p.z) * focal,
  });
  const objects = [];
  function face(vertices, fill, stroke) {
    const original = vertices.map(view);
    let clipped = [];
    for (let i = 0; i < original.length; i++) {
      const a = original[i],
        b = original[(i + 1) % original.length];
      if (a.z >= 0.12) clipped.push(a);
      if (a.z >= 0.12 !== b.z >= 0.12) {
        const t = (0.12 - a.z) / (b.z - a.z);
        clipped.push({
          x: a.x + t * (b.x - a.x),
          y: a.y + t * (b.y - a.y),
          z: 0.12,
        });
      }
    }
    if (clipped.length < 3) return;
    objects.push({
      depth: original.reduce((n, p) => n + p.z, 0) / original.length,
      draw() {
        c.beginPath();
        clipped.forEach((p, i) => {
          const s = project(p);
          if (i) c.lineTo(s.x, s.y);
          else c.moveTo(s.x, s.y);
        });
        c.closePath();
        c.fillStyle = fill;
        c.fill();
        if (stroke) {
          c.strokeStyle = stroke;
          c.lineWidth = 1;
          c.stroke();
        }
      },
    });
  }
  function sprite(x, y, z, size, draw) {
    const a = view([x, y, z]);
    if (a.z < 0.2) return;
    const p = project(a),
      scale = (focal / a.z) * size;
    if (p.x < -scale * 2 || p.x > w + scale * 2) return;
    objects.push({ depth: a.z - 0.03, draw: () => draw(p.x, p.y, scale) });
  }
  // The footpath, stepping stones, gardens and fences are real perspective geometry.
  face(
    [
      [-2.15, 0, -8],
      [2.15, 0, -8],
      [2.15, 0, 35],
      [-2.15, 0, 35],
    ],
    "#968078"
  );
  for (let z = -7; z < 34; z += 1.4) {
    face(
      [
        [-2.08, 0.005, z],
        [2.08, 0.005, z],
        [2.08, 0.005, z + 0.07],
        [-2.08, 0.005, z + 0.07],
      ],
      "#c1a18e30"
    );
    face(
      [
        [0, 0.007, z],
        [0.03, 0.007, z],
        [0.03, 0.007, z + 1.4],
        [0, 0.007, z + 1.4],
      ],
      "#d4b49b25"
    );
  }
  for (const n of NEIGHBOURS) {
    const s = Math.sign(n.x),
      front = n.x,
      back = n.x + s * 3.3,
      a = n.z - 2.15,
      b = n.z + 2.15;
    face(
      [
        [front, 0, a],
        [back, 0, a],
        [back, 3, a],
        [front, 3, a],
      ],
      "#4c475e"
    );
    face(
      [
        [front, 0, b],
        [back, 0, b],
        [back, 3, b],
        [front, 3, b],
      ],
      "#51465c"
    );
    face(
      [
        [front, 0, a],
        [front, 0, b],
        [front, 3, b],
        [front, 3, a],
      ],
      n.colour,
      "#e3b19622"
    );
    face(
      [
        [front, 3, a],
        [front, 3, b],
        [front, 4.65, n.z],
      ],
      n.colour
    );
    face(
      [
        [front, 3, a],
        [front, 4.65, n.z],
        [back, 4.65, n.z],
        [back, 3, a],
      ],
      n.roof,
      "#d2a3c633"
    );
    face(
      [
        [front, 4.65, n.z],
        [front, 3, b],
        [back, 3, b],
        [back, 4.65, n.z],
      ],
      n.roof,
      "#d2a3c633"
    );
    const f = front - s * 0.025;
    face(
      [
        [f, 0, n.z - 0.46],
        [f, 0, n.z + 0.46],
        [f, 2.05, n.z + 0.46],
        [f, 2.05, n.z - 0.46],
      ],
      "#3e344f",
      "#dcb37b"
    );
    for (const z of [n.z - 1.45, n.z + 1.45]) {
      face(
        [
          [f, 0.95, z - 0.37],
          [f, 0.95, z + 0.37],
          [f, 1.9, z + 0.37],
          [f, 1.9, z - 0.37],
        ],
        "#edba79",
        "#f4d7a1"
      );
      face(
        [
          [f - s * 0.01, 1.37, z - 0.37],
          [f - s * 0.01, 1.42, z + 0.37],
          [f - s * 0.01, 1.48, z + 0.37],
          [f - s * 0.01, 1.43, z - 0.37],
        ],
        "#806965"
      );
      face(
        [
          [f - s * 0.012, 0.95, z - 0.03],
          [f - s * 0.012, 0.95, z + 0.03],
          [f - s * 0.012, 1.9, z + 0.03],
          [f - s * 0.012, 1.9, z - 0.03],
        ],
        "#806965"
      );
    }
    face(
      [
        [f, 2.35, n.z - 0.3],
        [f, 2.35, n.z + 0.3],
        [f, 2.9, n.z + 0.3],
        [f, 2.9, n.z - 0.3],
      ],
      "#f2c786"
    );
    // Six short garden paths make the doorways easy to find.
    face(
      [
        [s * 2.15, 0.01, n.z - 0.5],
        [front, 0.01, n.z - 0.5],
        [front, 0.01, n.z + 0.5],
        [s * 2.15, 0.01, n.z + 0.5],
      ],
      "#b39782"
    );
    for (let j = 0; j < 7; j++) {
      const z = a + j * 0.65;
      if (Math.abs(z - n.z) < 0.7) continue;
      face(
        [
          [s * 4.25, 0, z],
          [s * 4.25, 0, z + 0.12],
          [s * 4.25, 0.65, z + 0.12],
          [s * 4.25, 0.74, z + 0.06],
          [s * 4.25, 0.65, z],
        ],
        "#b6a58e"
      );
    }
    for (const [left, right] of [
      [a, n.z - 0.65],
      [n.z + 0.65, b],
    ])
      face(
        [
          [s * 4.25, 0.32, left],
          [s * 4.25, 0.32, right],
          [s * 4.25, 0.4, right],
          [s * 4.25, 0.4, left],
        ],
        "#9d8e80"
      );
    const visited = board.visited.includes(NEIGHBOURS.indexOf(n));
    sprite(front - s * 0.65, 0, n.z + 0.84, 0.55, (x, y, k) =>
      monster(c, n.kind, x, y, k, time)
    );
    sprite(front - s * 0.6, 0.29, n.z - 1.1, 0.44, (x, y, k) =>
      pumpkin(c, x, y, k, time)
    );
    sprite(front - s * 0.3, 0.18, n.z + 1.52, 0.28, (x, y, k) =>
      pumpkin(c, x, y, k, time)
    );
    sprite(front - s * 0.2, 2.25, n.z, 0.15, (x, y, k) => {
      ellipse(c, x, y, k * 3, k * 3, visited ? "#b3dfbb15" : "#ffd28b18");
      ellipse(c, x, y, k, k, visited ? "#b6dcb5" : "#ffe3a0");
    });
  }
  // Friendly background firs and bare autumn trees.
  for (let i = 0; i < 22; i++) {
    const x = (i % 2 ? -1 : 1) * (9 + (i % 3)),
      z = -2 + i * 1.7;
    face(
      [
        [x - 0.7, 0, z],
        [x + 0.7, 0, z],
        [x + 0.1, 6 + (i % 3), z],
      ],
      i % 2 ? "#303b4a" : "#414456"
    );
  }
  WRAPPERS.forEach((p, i) => {
    if (!board.collected.includes(i))
      sprite(
        p.x,
        0.35 + Math.sin(time / 400 + i) * 0.06,
        p.z,
        0.16,
        (x, y, k) => {
          ellipse(c, x, y + k * 2, k * 2, k * 0.35, "#171a3033");
          ellipse(c, x, y, k * 2.4, k * 2.4, "#ffdb9411");
          c.save();
          c.translate(x, y);
          c.rotate(time / 1300);
          c.fillStyle = i % 2 ? "#b8e1cd" : "#ffd29e";
          c.fillRect(-k, -k, k * 2, k * 2);
          c.beginPath();
          c.moveTo(-k, 0);
          c.lineTo(-k * 2, -k * 0.8);
          c.lineTo(-k * 2, k * 0.8);
          c.fill();
          c.beginPath();
          c.moveTo(k, 0);
          c.lineTo(k * 2, -k * 0.8);
          c.lineTo(k * 2, k * 0.8);
          c.fill();
          c.restore();
        }
      );
  });
  // A festoon at the end of the street.
  for (const x of [-2.5, 2.5])
    face(
      [
        [x, 0, 29],
        [x + 0.1, 0, 29],
        [x + 0.1, 3.7, 29],
        [x, 3.7, 29],
      ],
      "#806571"
    );
  for (let i = 0; i < 10; i++) {
    const x = -2.5 + i * 0.5,
      y = 3.5 - Math.sin((i / 9) * Math.PI) * 0.35;
    face(
      [
        [x, y, 29],
        [x + 0.5, y, 29],
        [x + 0.25, y - 0.4, 29],
      ],
      i % 2 ? "#e7b272" : "#a692bb"
    );
  }
  objects.sort((a, b) => b.depth - a.depth).forEach((o) => o.draw());
  // Drifting gold leaves; no flashing or startling visual effects.
  for (let i = 0; i < 13; i++) {
    const x = ((i * 193 + time * 0.012) % (w + 80)) - 40,
      y = (i * 83 + time * 0.018) % (h + 40);
    c.save();
    c.translate(x, y);
    c.rotate(i + time / 1700);
    ellipse(c, 0, 0, 3, 1.5, "#edbb8666");
    c.restore();
  }
  // A first-person sleeve, hand and jack-o'-lantern bucket.
  const bob = Math.sin(time / 480) * 2,
    bx = w * 0.81,
    by = h * 0.97 + bob,
    bs = Math.min(w * 0.13, h * 0.2);
  c.save();
  c.translate(bx, by);
  c.rotate(-0.08);
  c.fillStyle = "#5f8790";
  c.beginPath();
  c.moveTo(bs * 0.7, bs * 0.35);
  c.lineTo(bs * 1.7, bs * 0.2);
  c.lineTo(bs * 1.6, -bs * 0.45);
  c.lineTo(bs * 0.6, -bs * 0.38);
  c.fill();
  ellipse(c, bs * 0.68, -bs * 0.34, bs * 0.21, bs * 0.15, "#dca886");
  c.strokeStyle = "#ebc482";
  c.lineWidth = bs * 0.06;
  c.beginPath();
  c.ellipse(0, -bs * 0.61, bs * 0.47, bs * 0.43, 0, Math.PI, TAU);
  c.stroke();
  pumpkin(c, 0, -bs * 0.2, bs);
  for (let i = 0; i < Math.min(8, board.players[0].score); i++)
    ellipse(
      c,
      ((i % 4) - 0.5) * bs * 0.18 - bs * 0.18,
      -bs * 0.48 - Math.floor(i / 4) * bs * 0.12,
      bs * 0.09,
      bs * 0.065,
      ["#d1d3ef", "#a9dabd", "#f6cc92"][i % 3]
    );
  c.restore();
}
export function cameraBetween(a, b, t) {
  return {
    ...b,
    x: a.x + (b.x - a.x) * t,
    z: a.z + (b.z - a.z) * t,
    yaw: a.yaw + normalAngle(b.yaw - a.yaw) * t,
  };
}

export function paintNeighbour(c, kind, width, height) {
  c.clearRect(0, 0, width, height);
  monster(c, kind, width * 0.5, height * 0.93, height * 0.48, 0);
}
