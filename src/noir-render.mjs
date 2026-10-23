import { objective } from "./lib/noir.mjs";
import {
  WORLD,
  BUILDINGS,
  WATER,
  SAFE,
  COATS,
  DROPS,
} from "./lib/noir-world.mjs";
export const INK = ["#dfd6ad", "#9bc5cf", "#c8acdf", "#e5b49a"];
const rect = (c, x, y, w, h, fill) => {
  c.fillStyle = fill;
  c.fillRect(x, y, w, h);
};
function text(c, s, x, y, size = 14, color = "#dbcda9", align = "left") {
  c.fillStyle = color;
  c.font = `${size}px ui-monospace, monospace`;
  c.textAlign = align;
  c.fillText(s, x, y);
}
function lamp(c, x, y, r = 170) {
  const light = c.createRadialGradient(x, y, 3, x, y, r);
  light.addColorStop(0, "#e5c08038");
  light.addColorStop(0.25, "#d8bc7520");
  light.addColorStop(1, "#dfcc8b00");
  c.fillStyle = light;
  c.fillRect(x - r, y - r, r * 2, r * 2);
  c.fillStyle = "#e8d2a0";
  c.fillRect(x - 3, y - 3, 6, 6);
}
export function paintCity(c) {
  rect(c, 0, 0, WORLD.width, WORLD.height, "#172327");
  rect(c, 800, 0, 220, 1400, "#263236");
  rect(c, 0, 710, 1800, 100, "#263236");
  c.strokeStyle = "#a6a38716";
  c.lineWidth = 2;
  c.setLineDash([28, 24]);
  c.beginPath();
  c.moveTo(910, 0);
  c.lineTo(910, 1400);
  c.moveTo(0, 760);
  c.lineTo(1800, 760);
  c.stroke();
  c.setLineDash([]);
  // Rain-slick paving, gutters and small reflected lights.
  for (let i = 0; i < 900; i++) {
    const x = (i * 173) % 1800,
      y = (i * 307) % 1400;
    rect(c, x, y, 8 + (i % 6) * 8, 1, i % 3 ? "#72827b0b" : "#c0ba8a10");
  }
  for (const b of BUILDINGS) {
    const { x, y, w, h, type } = b;
    c.fillStyle = "#08151999";
    c.beginPath();
    c.moveTo(x, y + h);
    c.lineTo(x + w, y + h);
    c.lineTo(x + w + 45, y + h + 65);
    c.lineTo(x + 25, y + h + 65);
    c.fill();
    rect(c, x - 12, y - 12, w + 24, h + 24, "#56605a");
    rect(c, x - 8, y - 8, w + 16, h + 16, "#384842");
    rect(
      c,
      x,
      y,
      w,
      h,
      type === "diner" ? "#405653" : type === "theatre" ? "#424843" : "#303e40"
    );
    rect(c, x, y + h - 28, w, 28, "#111f23");
    rect(c, x + 8, y + 8, w - 16, h - 46, "#243236");
    if (type === "station") {
      for (let j = 0; j < 10; j++) {
        rect(c, x + 25 + j * 52, y + 22, 43, h - 90, "#4b65624a");
        c.strokeStyle = "#92aaa13a";
        c.strokeRect(x + 25 + j * 52, y + 22, 43, h - 90);
      }
      text(c, "BELL STREET", x + w / 2, y + 60, 25, "#abb5a2", "center");
      c.fillStyle = "#d1be8b";
      c.beginPath();
      c.arc(x + w / 2, y - 22, 18, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "#34413c";
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(x + w / 2, y - 33);
      c.lineTo(x + w / 2, y - 22);
      c.lineTo(x + w / 2 + 10, y - 19);
      c.stroke();
    } else if (type === "theatre") {
      rect(c, x + 70, y + 48, w - 140, h - 148, "#374440");
      c.strokeStyle = "#7b81714d";
      c.strokeRect(x + 77, y + 55, w - 154, h - 162);
      for (let j = 0; j < 7; j++) {
        rect(c, x + 30 + j * 69, y + h - 25, 43, 15, "#b59e62");
        rect(c, x + 34 + j * 69, y + h - 25, 3, 15, "#292f2a");
        lamp(c, x + 50 + j * 69, y + h + 22, 90);
      }
      rect(c, x + 120, y + h - 15, 270, 48, "#ab9363");
      text(
        c,
        "M E R I D I A N",
        x + w / 2,
        y + h + 15,
        19,
        "#1a282a",
        "center"
      );
      text(
        c,
        "FINAL SHOW / 23:40",
        x + w / 2,
        y + 100,
        15,
        "#c3bc9a",
        "center"
      );
      for (let j = 0; j < 4; j++)
        rect(c, x + 125 + j * 75, y + 155, 45, 55, "#475852");
    } else if (type === "diner") {
      rect(c, x + 30, y + 35, w - 60, 55, "#64776a");
      text(c, "THE BLUE HOUR", x + w / 2, y + 72, 28, "#eeddb1", "center");
      for (let j = 0; j < 6; j++) {
        rect(c, x + 25 + j * 75, y + h - 29, 55, 30, "#d5b67b");
        rect(c, x + 25 + j * 75, y + h - 10, 55, 3, "#57624b");
        lamp(c, x + 50 + j * 75, y + h + 22, 110);
      }
      for (let j = 0; j < 4; j++)
        rect(c, x + 65 + j * 95, y + 125, 60, 90, "#32443f");
    } else if (type === "harbour") {
      text(c, "VESPER", x + w / 2, y + 55, 25, "#b4b59b", "center");
      rect(c, x + 35, y + h - 25, 65, 25, "#c9b17a");
      lamp(c, x + 70, y + h + 20);
    } else {
      for (let j = 30; j < w - 20; j += 70) {
        rect(c, x + j, y + 18, 38, 25, "#51605a");
        rect(c, x + j + 8, y + 22, 25, 16, "#243439");
      }
    }
    // Roof vents and pipes.
    rect(c, x + w - 70, y + 30, 35, 30, "#52605c");
    rect(c, x + w - 66, y + 34, 27, 22, "#1a2a2d");
    c.strokeStyle = "#63706455";
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(x + 12, y + 15);
    c.lineTo(x + 12, y + h - 40);
    c.lineTo(x + w - 15, y + h - 40);
    c.stroke();
  }
  rect(c, WATER.x, WATER.y, WATER.w, WATER.h, "#0d222a");
  for (let i = 0; i < 90; i++) {
    const x = WATER.x + ((i * 67) % 420),
      y = WATER.y + ((i * 37) % 320);
    rect(c, x, y, 20 + (i % 9) * 12, 1, "#7eaba226");
  }
  rect(c, 1120, 1040, 250, 270, "#514e3a");
  for (let i = 0; i < 20; i++) rect(c, 1120, 1040 + i * 14, 250, 3, "#202d29");
  for (let i = 0; i < 6; i++) {
    rect(c, 1122, 1040 + i * 50, 8, 13, "#aba381");
    rect(c, 1358, 1040 + i * 50, 8, 13, "#aba381");
  }
  // Tram rails and zebra crossings.
  for (const x of [846, 851, 965, 970]) rect(c, x, 0, 2, 1400, "#84928a38");
  for (let i = 0; i < 7; i++) {
    rect(c, 805 + i * 30, 675, 16, 33, "#c2bb9226");
    rect(c, 805 + i * 30, 813, 16, 33, "#c2bb9226");
  }
  for (const [x, y] of [
    [760, 140],
    [1030, 140],
    [760, 590],
    [1040, 590],
    [90, 755],
    [1670, 755],
    [790, 1160],
    [1040, 1190],
    [1330, 1120],
  ])
    lamp(c, x, y, 190);
  // Parked cars are decoration outside the walking routes.
  for (const [x, y, angle] of [
    [835, 390, 0],
    [985, 930, 0],
    [300, 730, Math.PI / 2],
    [1560, 780, Math.PI / 2],
  ]) {
    c.save();
    c.translate(x, y);
    c.rotate(angle);
    c.fillStyle = "#111b20";
    c.beginPath();
    c.roundRect(-14, -33, 28, 66, 7);
    c.fill();
    rect(c, -10, -18, 20, 17, "#576966");
    rect(c, -10, 11, 20, 10, "#485d59");
    rect(c, -11, -30, 5, 3, "#d8cda0");
    rect(c, 7, -30, 5, 3, "#d8cda0");
    c.restore();
  }
  // Extraction phone: a recognisable amber anchor in the south.
  lamp(c, SAFE.x, SAFE.y, 220);
  rect(c, SAFE.x - 23, SAFE.y - 37, 46, 63, "#c0a36b");
  rect(c, SAFE.x - 18, SAFE.y - 30, 36, 49, "#263a3b");
  rect(c, SAFE.x - 15, SAFE.y - 25, 30, 22, "#c3b58a");
  text(c, "TELEPHONE", SAFE.x, SAFE.y - 48, 12, "#e8d8b6", "center");
  c.fillStyle = "#d0c8a50b";
  for (let i = 0; i < 5000; i++)
    c.fillRect((i * 137) % 1800, (i * 313) % 1400, 1, 1);
}
function cone(c, g, color, range) {
  c.save();
  c.translate(g.x, g.y);
  c.rotate(g.angle);
  const gradient = c.createRadialGradient(0, 0, 0, 0, 0, range);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, "#e9dbad00");
  c.fillStyle = gradient;
  c.beginPath();
  c.moveTo(0, 0);
  c.arc(0, 0, range, -0.38, 0.38);
  c.closePath();
  c.fill();
  c.restore();
}
function figure(c, p, color, t, mark = -1) {
  c.save();
  c.translate(p.x, p.y);
  c.rotate(p.angle + Math.PI / 2);
  c.fillStyle = "#070f1488";
  c.beginPath();
  c.ellipse(4, 10, 13, 20, 0, 0, 7);
  c.fill();
  const stride = Math.sin(p.walk || t / 160) * 3;
  rect(c, -7, 7, 5, 10 + stride, "#0d171b");
  rect(c, 2, 7, 5, 10 - stride, "#0d171b");
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(-9, -8);
  c.lineTo(9, -8);
  c.lineTo(12, 13);
  c.lineTo(-12, 13);
  c.fill();
  c.fillStyle = "#d7c9a8";
  c.beginPath();
  c.arc(0, -10, 5, 0, 7);
  c.fill();
  if (mark === 0) {
    rect(c, -10, -13, 20, 4, "#d5cfb4");
    rect(c, -7, -18, 14, 8, "#d5cfb4");
  } else {
    rect(c, -8, -14, 16, 5, "#2a3539");
  }
  if (mark === 1) {
    rect(c, -8, -5, 16, 3, "#c97868");
    rect(c, 5, -2, 3, 11, "#c97868");
  }
  if (mark === 2) {
    rect(c, 12, 0, 7, 12, "#b59963");
  }
  c.restore();
}
export function renderNoir(
  c,
  city,
  board,
  seats,
  own,
  view,
  time,
  previous,
  alpha
) {
  const width = view.width,
    height = view.height,
    scale =
      view.mode === "bird"
        ? Math.min(width / 1800, height / 1400) * 0.97
        : width < 550
        ? 0.75
        : 0.95;
  const blend = (p) => {
    const old = previous?.players?.[p];
    const now = board.players[p];
    return old && Math.hypot(old.x - now.x, old.y - now.y) < 80
      ? {
          ...now,
          x: old.x + (now.x - old.x) * alpha,
          y: old.y + (now.y - old.y) * alpha,
        }
      : now;
  };
  const me = blend(Math.max(0, own));
  const targetX = Math.max(
      0,
      Math.min(WORLD.width - width / scale, me.x - width / scale / 2)
    ),
    targetY = Math.max(
      0,
      Math.min(WORLD.height - height / scale, me.y - height / scale / 2)
    );
  view.x +=
    ((view.mode === "bird" ? (WORLD.width - width / scale) / 2 : targetX) -
      view.x) *
    0.12;
  view.y +=
    ((view.mode === "bird" ? (WORLD.height - height / scale) / 2 : targetY) -
      view.y) *
    0.12;
  c.clearRect(0, 0, width, height);
  c.save();
  c.scale(scale, scale);
  c.translate(-view.x, -view.y);
  c.drawImage(city, 0, 0);
  const lead = objective(board, me);
  if (lead) {
    c.strokeStyle = "#f4d38c";
    c.lineWidth = 3 / scale;
    c.setLineDash([7 / scale, 8 / scale]);
    c.beginPath();
    c.arc(lead.x, lead.y, 29 + Math.sin(time / 300) * 3, 0, 7);
    c.stroke();
    c.setLineDash([]);
  }

  for (const d of board.drops) {
    c.strokeStyle = d.by === null ? "#d7c99b" : "#82a69b";
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(
      d.x,
      d.y,
      d.by === null ? 12 + Math.sin(time / 450) * 2 : 9,
      0,
      Math.PI * 2
    );
    c.stroke();
    text(
      c,
      d.by === null ? "?" : "✓",
      d.x,
      d.y + 5,
      15,
      d.by === null ? "#efe0b1" : "#9dbcb0",
      "center"
    );
    if (Math.hypot(d.x - me.x, d.y - me.y) < 150)
      text(c, d.name, d.x, d.y + 32, 13, "#ede4d0", "center");
  }
  board.couriers.forEach((p) => {
    figure(c, p, COATS[p.coat].color, time, p.mark);
    if (Math.hypot(p.x - me.x, p.y - me.y) < 110)
      text(c, "?", p.x, p.y - 30, 18, "#f1dbab", "center");
  });
  board.guards.forEach((g) => {
    cone(c, g, g.alert ? "#e6b27677" : "#ead7a05c", 235);
    figure(c, g, "#3f5558", time);
    c.fillStyle = g.alert ? "#f2b074" : "#c5cbb4";
    c.beginPath();
    c.arc(g.x, g.y - 3, 3, 0, 7);
    c.fill();
  });
  board.players.forEach((p, i) => {
    const at = blend(i);
    cone(c, at, "#d1d6b92b", 170);
    figure(c, at, INK[i], time);
    c.strokeStyle = i === own ? "#f1e5c1" : "#93bec6";
    c.lineWidth = i === own ? 2 : 1;
    c.beginPath();
    c.ellipse(at.x, at.y + 4, 18, 12, 0, 0, Math.PI * 2);
    c.stroke();
    text(
      c,
      i === own ? "YOU" : seats[i]?.name || "Partner",
      at.x,
      at.y - 30,
      12,
      INK[i],
      "center"
    );
    if (p.search !== null) {
      c.strokeStyle = "#f0dca8";
      c.lineWidth = 3;
      c.beginPath();
      c.arc(
        at.x,
        at.y,
        25,
        -Math.PI / 2,
        -Math.PI / 2 + (p.progress / 22) * Math.PI * 2
      );
      c.stroke();
    }
  });
  if (board.phase === "extract") {
    c.strokeStyle = "#ebc783";
    c.lineWidth = 3;
    c.beginPath();
    c.arc(SAFE.x, SAFE.y, 70 + Math.sin(time / 400) * 4, 0, Math.PI * 2);
    c.stroke();
    text(c, "EXTRACTION", SAFE.x, SAFE.y + 75, 15, "#efdbac", "center");
  }
  c.restore();
  if (lead) {
    const sx = (lead.x - view.x) * scale,
      sy = (lead.y - view.y) * scale;
    if (sx < 30 || sy < 30 || sx > width - 30 || sy > height - 30) {
      const a = Math.atan2(sy - height / 2, sx - width / 2),
        r = Math.min(
          (width / 2 - 35) / (Math.abs(Math.cos(a)) || 0.001),
          (height / 2 - 40) / (Math.abs(Math.sin(a)) || 0.001)
        );
      const x = width / 2 + Math.cos(a) * r,
        y = height / 2 + Math.sin(a) * r;
      c.save();
      c.translate(x, y);
      c.rotate(a);
      c.fillStyle = "#f0d299";
      c.beginPath();
      c.moveTo(13, 0);
      c.lineTo(-8, -8);
      c.lineTo(-5, 0);
      c.lineTo(-8, 8);
      c.fill();
      c.restore();
    }
  }
  // Foreground rain and a restrained vignette move independently of the world.
  c.strokeStyle = "#e7e6cf29";
  c.lineWidth = 0.8;
  for (let i = 0; i < 100; i++) {
    const x = (i * 179 + time * 0.035) % width,
      y = (i * 97 + time * 0.42) % height;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x - 6, y + 22);
    c.stroke();
  }
  const v = c.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.2,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.7
  );
  v.addColorStop(0, "#08131900");
  v.addColorStop(1, "#081319aa");
  c.fillStyle = v;
  c.fillRect(0, 0, width, height);
  // Street overview: only discovered drops, living teammates and the extraction light.
  const mx = width - 153,
    my = 20,
    mw = 133,
    mh = 104,
    sx = mw / WORLD.width,
    sy = mh / WORLD.height;
  rect(c, mx - 8, my - 8, mw + 16, mh + 16, "#101e24ec");
  c.strokeStyle = "#b4a57866";
  c.strokeRect(mx - 8, my - 8, mw + 16, mh + 16);
  for (const b of BUILDINGS)
    rect(c, mx + b.x * sx, my + b.y * sy, b.w * sx, b.h * sy, "#485650");
  board.drops.forEach((d) => {
    c.fillStyle = d.by === null ? "#9a8e6a" : "#87b4a2";
    c.fillRect(mx + d.x * sx - 1, my + d.y * sy - 1, 3, 3);
  });
  board.players.forEach((p, i) => {
    c.fillStyle = INK[i];
    c.beginPath();
    c.arc(mx + p.x * sx, my + p.y * sy, i === own ? 3 : 2, 0, 7);
    c.fill();
  });
  c.fillStyle = "#eed09b";
  c.fillRect(mx + SAFE.x * sx - 2, my + SAFE.y * sy - 2, 5, 5);
}
