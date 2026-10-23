import {
  TETHER_COLOURS,
  TETHER_DOCK as dock,
  debrisAt,
  tideAt,
  gap,
  HOOK_RANGE,
} from "./lib/tether.mjs";
const TAU = Math.PI * 2;
function disc(c, x, y, r, fill, stroke) {
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.stroke();
  }
}
function rect(c, x, y, w, h, r, fill, stroke) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.stroke();
  }
}
function line(c, points, colour, width = 1) {
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.strokeStyle = colour;
  c.lineWidth = width;
  c.stroke();
}
function glow(c, x, y, r, colour) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, colour);
  g.addColorStop(1, "transparent");
  disc(c, x, y, r, g);
}
function label(c, text, x, y, colour = "#d6e1ed", size = 12) {
  c.font = `600 ${size}px system-ui`;
  c.textAlign = "center";
  c.fillStyle = colour;
  c.fillText(text, x, y);
}
export function paintTetherBackdrop(c) {
  const g = c.createLinearGradient(0, 0, 900, 720);
  g.addColorStop(0, "#152b45");
  g.addColorStop(0.55, "#293b62");
  g.addColorStop(1, "#514865");
  c.fillStyle = g;
  c.fillRect(0, 0, 1120, 720);
  glow(c, 950, 50, 750, "#e9977160");
  glow(c, 300, 610, 600, "#54d7d322");
  // A sunlit giant, seen through the salvage field. All scenery is authored geometry.
  c.save();
  c.translate(1015, 32);
  c.rotate(-0.43);
  c.strokeStyle = "#b6a6a355";
  c.lineWidth = 32;
  c.beginPath();
  c.ellipse(0, 0, 305, 90, 0, 0, TAU);
  c.stroke();
  const planet = c.createLinearGradient(-160, -200, 160, 200);
  planet.addColorStop(0, "#ffd4a0");
  planet.addColorStop(0.5, "#d39282");
  planet.addColorStop(1, "#5a5470");
  disc(c, 0, 0, 190, planet);
  c.save();
  c.beginPath();
  c.arc(0, 0, 190, 0, TAU);
  c.clip();
  for (let i = -200; i < 220; i += 27) {
    c.strokeStyle = i % 2 ? "#eac2a028" : "#846f8130";
    c.lineWidth = 12;
    c.beginPath();
    c.ellipse(-35, i, 250, 25, 0.03, 0, TAU);
    c.stroke();
  }
  c.restore();
  c.strokeStyle = "#f6cfad66";
  c.lineWidth = 18;
  c.beginPath();
  c.ellipse(0, 0, 305, 90, 0, 0, Math.PI);
  c.stroke();
  c.restore();
  for (let i = 0; i < 170; i++) {
    const x = (i * 139.13 + 42) % 1120,
      y = (i * 79.31 + 34) % 720;
    disc(c, x, y, i % 11 === 0 ? 1.5 : 0.7, i % 3 ? "#d4dfed70" : "#ffd7aa88");
  }
  c.strokeStyle = "#a4c1d90d";
  c.lineWidth = 1;
  for (let x = 0; x < 1120; x += 56)
    line(
      c,
      [
        [x, 0],
        [x, 720],
      ],
      "#a4c1d90d"
    );
  for (let y = 0; y < 720; y += 56)
    line(
      c,
      [
        [0, y],
        [1120, y],
      ],
      "#a4c1d90d"
    );
  c.lineWidth = 1;
  rect(c, 20, 20, 1080, 680, 24, null, "#b4c7df28");
  for (const [x, y, dx, dy] of [
    [20, 20, 1, 1],
    [1100, 20, -1, 1],
    [20, 700, 1, -1],
    [1100, 700, -1, -1],
  ])
    line(
      c,
      [
        [x, y + dy * 35],
        [x, y + dy * 15],
        [x + dx * 15, y],
        [x + dx * 35, y],
      ],
      "#e2c5a584",
      2
    );
}
function drawDock(c, s, t) {
  c.save();
  c.translate(dock.x, dock.y);
  glow(c, 0, 0, 160, "#7fe5d51c");
  // The recovery ring has a deep lower hull and three docking arms.
  disc(c, 7, 16, 120, "#101f3888");
  c.lineWidth = 19;
  disc(c, 0, 0, 110, null, "#142c43");
  c.lineWidth = 3;
  disc(c, 0, 0, 120, null, "#81a1b880");
  c.lineWidth = 12;
  c.strokeStyle = "#c5c8bc";
  c.beginPath();
  c.arc(0, 0, 110, 0.54, TAU - 0.54);
  c.stroke();
  c.lineWidth = 5;
  c.strokeStyle = "#6c857f";
  c.beginPath();
  c.arc(0, 0, 110, 0.54, TAU - 0.54);
  c.stroke();
  for (let i = 0; i < 19; i++) {
    let a = 0.65 + i * 0.277;
    c.save();
    c.rotate(a);
    rect(c, 102, -4, 17, 8, 1, i % 3 ? "#718b96" : "#edb779");
    c.restore();
  }
  for (const a of [Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    c.save();
    c.rotate(a);
    rect(c, 102, -16, 47, 32, 5, "#e1dac3", "#889da3");
    rect(c, 120, -11, 22, 22, 3, "#e9a669");
    for (let n = 0; n < 3; n++) rect(c, 122 + n * 6, -8, 3, 16, 0, "#8d6656");
    c.restore();
  }
  disc(c, 0, 0, 89, "#152f4899");
  c.setLineDash([6, 10]);
  c.lineDashOffset = -t / 400;
  c.lineWidth = 2;
  disc(c, 0, 0, 90, null, "#90e4d4aa");
  c.setLineDash([]);
  for (let r = 25; r < 80; r += 25) {
    c.lineWidth = 1;
    disc(c, 0, 0, r, null, "#9ed9d41a");
  }
  line(
    c,
    [
      [-14, 0],
      [14, 0],
    ],
    "#d3f0d3",
    2
  );
  line(
    c,
    [
      [0, -14],
      [0, 14],
    ],
    "#d3f0d3",
    2
  );
  label(c, "RECOVERY", 0, -31, "#def0d9", 14);
  label(c, `${s.delivered} / 5 SECURED`, 0, 43, "#92c6bd", 11);
  for (let i = 0; i < 3; i++) {
    const x = 92 + i * 23;
    line(
      c,
      [
        [x, -9],
        [x + 8, 0],
        [x, 9],
      ],
      "#b2f3d94d",
      2
    );
  }
  c.restore();
}
function drawDebris(c, o, t, index) {
  c.save();
  c.translate(o.x, o.y);
  c.rotate(o.phase + t * 0.00002 * (index % 2 ? -1 : 1));
  c.fillStyle = "#101d3255";
  c.beginPath();
  for (let n = 0; n < 9; n++) {
    const a = (n / 9) * TAU,
      r = o.r * (0.85 + 0.12 * Math.sin(n * 3 + index));
    c.lineTo(Math.cos(a) * r + 8, Math.sin(a) * r + 14);
  }
  c.closePath();
  c.fill();
  const g = c.createLinearGradient(-o.r, -o.r, o.r, o.r);
  g.addColorStop(0, "#a0a9b4");
  g.addColorStop(0.4, "#626f86");
  g.addColorStop(1, "#34415c");
  c.fillStyle = g;
  c.strokeStyle = "#c7c2bc";
  c.lineWidth = 1.3;
  c.beginPath();
  for (let n = 0; n < 9; n++) {
    const a = (n / 9) * TAU,
      r = o.r * (0.85 + 0.12 * Math.sin(n * 3 + index));
    c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  c.closePath();
  c.fill();
  c.stroke();
  line(
    c,
    [
      [-o.r * 0.5, -o.r * 0.65],
      [0, -o.r * 0.3],
      [o.r * 0.7, -o.r * 0.5],
    ],
    "#d0c0ae60",
    2
  );
  disc(c, -10, 6, o.r * 0.23, "#283a5555", "#8899ab44");
  disc(c, 16, -9, o.r * 0.12, "#273c5744");
  c.restore();
}
function cargoShape(c, p, t) {
  c.save();
  c.translate(p.x, p.y);
  c.rotate(p.angle);
  const r = p.r,
    kind = p.id % 5;
  c.shadowColor = "#101b3566";
  c.shadowOffsetX = 8;
  c.shadowOffsetY = 12;
  c.shadowBlur = 5;
  if (kind === 0) {
    rect(c, -r * 1.55, -r * 0.72, r * 3.1, r * 1.44, 5, "#eab064", "#ffe1a6");
    c.shadowColor = "transparent";
    for (let side of [-1, 1]) {
      rect(
        c,
        side < 0 ? -r * 1.48 : r * 0.51,
        -r * 0.61,
        r * 0.94,
        r * 1.22,
        2,
        "#365370"
      );
      for (let n = 0; n < 3; n++)
        line(
          c,
          [
            [side < 0 ? -r * 1.48 : r * 0.51, -r * 0.4 + n * r * 0.4],
            [side < 0 ? -r * 0.54 : r * 1.45, -r * 0.4 + n * r * 0.4],
          ],
          "#78acbc",
          1
        );
    }
    rect(c, -r * 0.44, -r, r * 0.88, r * 2, 8, "#e8e1ca", "#fff4d5");
    rect(c, -r * 0.3, -r * 0.7, r * 0.6, r * 1.2, 4, "#f1ba70");
  } else if (kind === 1) {
    rect(c, -r, -r * 0.67, r * 2, r * 1.34, r * 0.6, "#d8dfdb", "#fff5d9");
    c.shadowColor = "transparent";
    rect(c, -r * 0.5, -r * 0.68, r * 0.29, r * 1.36, 2, "#d99c75");
    rect(c, r * 0.3, -r * 0.68, r * 0.22, r * 1.36, 2, "#d99c75");
    for (let x of [-0.72, 0, 0.72]) {
      disc(c, x * r, 0, r * 0.18, "#192f4d", "#7da9b8");
      disc(c, x * r - 2, -3, r * 0.1, "#54828d");
    }
  } else if (kind === 2) {
    rect(c, -r * 0.85, -r * 0.9, r * 1.7, r * 1.8, 10, "#d7d9bf", "#fff1c9");
    c.shadowColor = "transparent";
    rect(c, -r * 0.68, -r * 0.7, r * 1.36, r * 1.4, 8, "#1a4c53", "#7acaba");
    for (let i = 0; i < 4; i++) {
      let x = (i % 2 ? 1 : -1) * r * 0.3,
        y = (i < 2 ? -1 : 1) * r * 0.33;
      line(
        c,
        [
          [x, y + 10],
          [x, y - 7],
        ],
        "#e8db8f",
        2
      );
      c.save();
      c.translate(x, y);
      c.rotate(i);
      c.fillStyle = "#b3dc88";
      c.beginPath();
      c.ellipse(-4, -3, 7, 3, -0.5, 0, TAU);
      c.fill();
      c.restore();
    }
    line(
      c,
      [
        [-r * 0.55, -r * 0.48],
        [r * 0.45, -r * 0.55],
      ],
      "#e8ffe86b",
      2
    );
  } else if (kind === 3) {
    disc(c, 0, 0, r, "#eda782", "#ffe3b6");
    c.shadowColor = "transparent";
    disc(c, 0, 0, r * 0.7, "#eadcca", "#fff7e1");
    disc(c, 0, 0, r * 0.4, "#637d91", "#b4d2d4");
    line(
      c,
      [
        [0, -r * 0.8],
        [0, -r * 1.5],
      ],
      "#e3ccb0",
      3
    );
    disc(c, 0, -r * 1.5, 4, Math.sin(t / 180) > 0 ? "#ffe69c" : "#b78c73");
  } else {
    rect(c, -r * 1.35, -r * 0.52, r * 2.7, r * 1.04, 3, "#8e9bca", "#b8c4e3");
    c.shadowColor = "transparent";
    for (let x = -r * 1.15; x < r * 1.3; x += r * 0.35)
      line(
        c,
        [
          [x, -r * 0.45],
          [x, r * 0.45],
        ],
        "#374d76",
        1
      );
    disc(c, 0, 0, r * 0.64, "#e8e2ca", "#fff5da");
    c.save();
    c.scale(0.65, 1);
    disc(c, 0, 0, r * 0.48, "#aebec2", "#ffffff");
    c.restore();
    line(
      c,
      [
        [0, 0],
        [r * 0.4, -r * 0.6],
      ],
      "#edbb7e",
      3
    );
    disc(c, r * 0.4, -r * 0.6, 3, "#fff4bd");
  }
  c.shadowColor = "transparent";
  c.restore();
}
function drawTug(c, p, i, t, own) {
  const colour = TETHER_COLOURS[i];
  c.save();
  c.translate(p.x, p.y);
  if (own) {
    c.setLineDash([3, 5]);
    c.lineDashOffset = -t / 220;
    c.lineWidth = 1;
    disc(c, 0, 0, 28, null, "#ffffffaa");
    c.setLineDash([]);
  }
  if (p.braking) {
    c.lineWidth = 2;
    disc(c, 0, 0, 23, null, "#c8e8f6a0");
  }
  c.rotate(p.angle);
  if (p.thrust > 0.05) {
    const length = 13 + p.thrust * 18 + Math.sin(t / 32 + i) * 5;
    glow(c, -22, 0, 30, "#76dfed40");
    c.fillStyle = "#8fe2e4";
    c.beginPath();
    c.moveTo(-15, -7);
    c.quadraticCurveTo(-length - 12, 0, -15, 7);
    c.fill();
    c.fillStyle = "#e9f7d3";
    c.beginPath();
    c.moveTo(-15, -3);
    c.lineTo(-length, 0);
    c.lineTo(-15, 3);
    c.fill();
  }
  c.shadowColor = "#0f203a88";
  c.shadowBlur = 5;
  c.shadowOffsetX = 5;
  c.shadowOffsetY = 8;
  rect(c, -19, -13, 36, 26, 10, "#efe5c9", "#fff5dc");
  c.shadowColor = "transparent";
  rect(c, -14, -18, 19, 7, 3, colour, "#ffffff70");
  rect(c, -14, 11, 19, 7, 3, colour, "#ffffff70");
  rect(c, 0, -10, 16, 20, 8, "#243c55", "#90bdbf");
  rect(c, 6, -7, 5, 10, 3, "#82b8b8");
  rect(c, -14, -8, 9, 16, 3, colour);
  line(
    c,
    [
      [18, -5],
      [24, -5],
      [24, 5],
      [18, 5],
    ],
    "#e7d5aa",
    2
  );
  c.restore();
  label(
    c,
    own ? "YOU" : `${i + 1}`,
    p.x,
    p.y - 35,
    own ? "#fff1d4" : colour,
    12
  );
}
export function renderTether(c, backdrop, s, previous, alpha, t, own = -1) {
  c.drawImage(backdrop, 0, 0);
  const mix = (old, p) => ({
    ...p,
    x: old.x + (p.x - old.x) * alpha,
    y: old.y + (p.y - old.y) * alpha,
    angle:
      old.angle +
      Math.atan2(Math.sin(p.angle - old.angle), Math.cos(p.angle - old.angle)) *
        alpha,
  });
  const players = s.players.map((p, i) => mix(previous?.players[i] || p, p));
  const cargo = s.cargo.map((p) =>
    mix(previous?.cargo.find((q) => q.id === p.id) || p, p)
  );
  const tide = tideAt(s.tick);
  if (tide.active) {
    for (let i = 0; i < 30; i++) {
      const x = (i * 51 + t * 0.05) % 1120,
        y = (i * 139 + t * 0.015) % 720;
      line(
        c,
        [
          [x, y],
          [x + 35, y + 12],
        ],
        "#a4e5ea25",
        1
      );
    }
  }
  drawDock(c, s, t);
  debrisAt(s.tick).forEach((o, i) => drawDebris(c, o, t, i));
  const me = players[own];
  if (me && me.hook === null && !s.done) {
    const target = cargo
      .filter((q) => !q.delivered)
      .sort((a, b) => gap(a, me) - gap(b, me))[0];
    if (target) {
      const can = gap(me, target) <= HOOK_RANGE;
      c.save();
      c.setLineDash([3, 8]);
      line(
        c,
        [
          [me.x, me.y],
          [target.x, target.y],
        ],
        can ? "#e8e2ab80" : "#ffffff25",
        1
      );
      c.restore();
      c.lineWidth = 1.5;
      disc(
        c,
        target.x,
        target.y,
        target.r + 15 + Math.sin(t / 250) * 2,
        null,
        can ? "#ffdb95" : "#d4d9e566"
      );
    }
  }
  players.forEach((p, i) => {
    const load = cargo.find((q) => q.id === p.hook && !q.delivered);
    if (!load) return;
    const d = gap(p, load),
      slack = Math.max(0, 82 - d) * 0.55;
    c.beginPath();
    c.moveTo(p.x, p.y);
    c.quadraticCurveTo(
      (p.x + load.x) / 2,
      (p.y + load.y) / 2 + slack,
      load.x,
      load.y
    );
    c.lineWidth = 6;
    c.strokeStyle = "#15283b77";
    c.stroke();
    c.lineWidth = 2.5;
    c.strokeStyle = p.tension > 0.84 ? "#ffca86" : TETHER_COLOURS[i];
    c.stroke();
    c.setLineDash([3, 10]);
    c.lineDashOffset = -t / 70;
    c.lineWidth = 1;
    c.strokeStyle = "#fff2d8a0";
    c.stroke();
    c.setLineDash([]);
    disc(c, load.x, load.y, 6, TETHER_COLOURS[i]);
  });
  for (const load of cargo) {
    if (load.delivered) continue;
    cargoShape(c, load, t);
    if (load.health < 100) {
      rect(c, load.x - 22, load.y + load.r + 12, 44, 3, 2, "#102b4388");
      rect(
        c,
        load.x - 22,
        load.y + load.r + 12,
        (44 * load.health) / 100,
        3,
        2,
        load.health < 60 ? "#ffc08b" : "#afe7cb"
      );
    }
    if (load.settling) {
      c.strokeStyle = "#beffe2";
      c.lineWidth = 4;
      c.beginPath();
      c.arc(
        load.x,
        load.y,
        load.r + 12,
        -Math.PI / 2,
        -Math.PI / 2 + (TAU * load.settling) / 12
      );
      c.stroke();
    }
  }
  players.forEach((p, i) => drawTug(c, p, i, t, i === own));
  for (const e of s.events) {
    const age = (s.tick - e.tick + alpha) / 10;
    if (e.type === "deliver") {
      c.globalAlpha = Math.max(0, 1 - age / 2.8);
      c.lineWidth = 2;
      disc(c, e.x, e.y, 40 + age * 75, null, "#c6f1cf");
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * TAU;
        disc(
          c,
          e.x + Math.cos(a) * (20 + age * 75),
          e.y + Math.sin(a) * (20 + age * 75),
          2 + (i % 3),
          ["#d4f1b7", "#fbd19c", "#9edce6"][i % 3]
        );
      }
      label(c, `+${e.value}`, e.x, e.y - age * 35 - 35, "#e5ffcf", 24);
      if (e.together)
        label(c, "TEAM LIFT", e.x, e.y - age * 35 - 12, "#edebba", 10);
      c.globalAlpha = 1;
    } else if (e.type === "bump" || e.type === "snap") {
      c.globalAlpha = Math.max(0, 1 - age * 2);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU;
        line(
          c,
          [
            [e.x + Math.cos(a) * age * 30, e.y + Math.sin(a) * age * 30],
            [
              e.x + Math.cos(a) * (age * 30 + 8),
              e.y + Math.sin(a) * (age * 30 + 8),
            ],
          ],
          "#ffd19c",
          2
        );
      }
      c.globalAlpha = 1;
    }
  }
  c.textAlign = "left";
  c.font = "10px ui-monospace,monospace";
  c.fillStyle = "#d1dce17a";
  c.fillText("AURELIA / RECOVERY SECTOR 07", 42, 48);
  c.textAlign = "right";
  c.fillText("SALVAGE IS A TEAM SPORT", 1078, 676);
}
