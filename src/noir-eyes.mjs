import { objective } from "./lib/noir.mjs";
import { BUILDINGS, WORLD, WATER, SAFE, COATS } from "./lib/noir-world.mjs";
const FOV = Math.PI / 2.8;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
function wallHit(x, y, dx, dy, b) {
  const a = (b.x - x) / dx,
    z = (b.x + b.w - x) / dx,
    c = (b.y - y) / dy,
    d = (b.y + b.h - y) / dy;
  const nx = Math.min(a, z),
    ny = Math.min(c, d),
    near = Math.max(nx, ny),
    far = Math.min(Math.max(a, z), Math.max(c, d));
  if (far < Math.max(0, near)) return null;
  const t = near < 0 ? far : near;
  return { t, side: nx > ny, coord: nx > ny ? y + dy * t : x + dx * t, b };
}
function personSprite(coat, mark, guard = false) {
  const n = document.createElement("canvas");
  n.width = 120;
  n.height = 210;
  const c = n.getContext("2d");
  c.fillStyle = "#0e1b22";
  c.beginPath();
  c.ellipse(61, 199, 39, 8, 0, 0, 7);
  c.fill();
  c.fillRect(35, 146, 19, 48);
  c.fillRect(67, 146, 19, 48);
  c.fillStyle = coat;
  c.beginPath();
  c.moveTo(38, 62);
  c.lineTo(80, 62);
  c.lineTo(97, 157);
  c.lineTo(25, 157);
  c.closePath();
  c.fill();
  c.fillStyle = "#15252c";
  c.beginPath();
  c.moveTo(44, 67);
  c.lineTo(61, 114);
  c.lineTo(77, 67);
  c.lineTo(62, 91);
  c.fill();
  c.fillStyle = "#c6b391";
  c.beginPath();
  c.ellipse(60, 43, 17, 24, 0, 0, 7);
  c.fill();
  c.fillStyle = mark === 0 ? "#e3d6af" : guard ? "#3b555a" : "#1a2d35";
  c.fillRect(31, 26, 59, 9);
  c.beginPath();
  c.moveTo(39, 27);
  c.lineTo(44, 9);
  c.lineTo(76, 12);
  c.lineTo(82, 27);
  c.fill();
  c.fillStyle = "#2c3838";
  c.fillRect(46, 44, 28, 4);
  if (mark === 1) {
    c.fillStyle = "#cd7767";
    c.fillRect(42, 61, 35, 7);
    c.fillRect(66, 67, 8, 44);
  }
  if (mark === 2) {
    c.fillStyle = "#aa8d54";
    c.fillRect(89, 113, 24, 37);
    c.strokeStyle = "#6f6041";
    c.strokeRect(96, 108, 10, 7);
  }
  if (guard) {
    c.fillStyle = "#d8dbb9";
    c.fillRect(27, 96, 12, 7);
    c.fillStyle = "#e0bb71";
    c.fillRect(50, 77, 5, 7);
  }
  return n;
}
export function makeEyesAssets() {
  const textures = {};
  for (const type of ["theatre", "diner", "station", "harbour", "block"]) {
    const n = document.createElement("canvas");
    n.width = 512;
    n.height = 512;
    const c = n.getContext("2d");
    c.fillStyle = type === "diner" ? "#52625a" : "#3a4847";
    c.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 24)
      for (let x = 0; x < 512; x += 64) {
        c.strokeStyle = "#192b2e55";
        c.strokeRect(x + (y % 48 ? 32 : 0), y, 64, 24);
      }
    for (let x = 32; x < 512; x += 128)
      for (let y = 48; y < 420; y += 155) {
        c.fillStyle = "#14252b";
        c.fillRect(x - 4, y - 4, 72, 98);
        c.fillStyle = (x + y) % 3 ? "#a29469" : "#4b665f";
        c.fillRect(x, y, 64, 90);
        c.fillStyle = "#2d3e3c";
        c.fillRect(x + 30, y, 4, 90);
        c.fillRect(x, y + 44, 64, 4);
      }
    c.fillStyle = "#243b3c";
    c.fillRect(0, 400, 512, 112);
    c.fillStyle = "#c5ae7c";
    c.fillRect(0, 397, 512, 5);
    c.fillStyle = "#e4d1a4";
    c.textAlign = "center";
    c.font = "26px Georgia";
    c.fillText(
      {
        theatre: "MERIDIAN",
        diner: "THE BLUE HOUR",
        station: "BELL STREET",
        harbour: "VESPER",
        block: "BLACKWATER",
      }[type],
      256,
      445
    );
    c.fillStyle = "#162a30";
    c.fillRect(218, 460, 76, 52);
    textures[type] = n;
  }
  const people = COATS.map((c) =>
    [0, 1, 2].map((mark) => personSprite(c.color, mark))
  );
  return {
    textures,
    people,
    guard: personSprite("#4a6260", 0, true),
    partner: personSprite("#d7c79d", 1),
  };
}
export function renderEyes(
  c,
  assets,
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
    p = board.players[Math.max(0, own)],
    old = previous?.players?.[Math.max(0, own)],
    smooth = old && Math.hypot(old.x - p.x, old.y - p.y) < 80;
  const px = smooth ? old.x + (p.x - old.x) * alpha : p.x,
    py = smooth ? old.y + (p.y - old.y) * alpha : p.y,
    angle = smooth ? old.angle + wrap(p.angle - old.angle) * alpha : p.angle;
  const horizon =
      height * 0.47 + (p.search === null ? Math.sin(p.walk * 2) * 2 : 0),
    projection = width / (2 * Math.tan(FOV / 2));
  const sky = c.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, "#11212a");
  sky.addColorStop(1, "#5e6b63");
  c.fillStyle = sky;
  c.fillRect(0, 0, width, horizon);
  // A distant skyline slides against the heading, beyond the playable buildings.
  for (let i = 0; i < 24; i++) {
    const x =
        ((((i * 153 - angle * 350) % (width + 300)) + width + 300) %
          (width + 300)) -
        150,
      roof = 40 + ((i * 37) % 100);
    c.fillStyle = "#25373d";
    c.fillRect(x, horizon - roof, 90 + (i % 3) * 30, roof);
    c.fillStyle = "#a99d6b55";
    for (let j = 0; j < 4; j++)
      c.fillRect(x + 15 + j * 18, horizon - roof + 17, 4, 9);
  }
  const floor = c.createLinearGradient(0, horizon, 0, height);
  floor.addColorStop(0, "#53605a");
  floor.addColorStop(0.35, "#24363b");
  floor.addColorStop(1, "#15272f");
  c.fillStyle = floor;
  c.fillRect(0, horizon, width, height - horizon);
  for (let i = 0; i < 32; i++) {
    const y = horizon + Math.pow(i / 31, 2) * (height - horizon),
      x = (i * 173 + angle * 150) % width;
    c.fillStyle = "#d5c59514";
    c.fillRect(x, y, 15 + i * 4, 1);
  }
  const depth = new Float32Array(Math.ceil(width / 3)).fill(Infinity),
    bounds = [
      ...BUILDINGS,
      { x: -30, y: -30, w: 1860, h: 30, type: "block" },
      { x: -30, y: 1400, w: 1860, h: 30, type: "block" },
      { x: -30, y: 0, w: 30, h: 1400, type: "block" },
      { x: 1800, y: 0, w: 30, h: 1400, type: "block" },
    ];
  for (let x = 0; x < width; x += 3) {
    const ray = Math.atan((x - width / 2) / projection),
      dir = angle + ray,
      dx = Math.cos(dir),
      dy = Math.sin(dir);
    let hit = null;
    for (const b of bounds) {
      const h = wallHit(px, py, dx, dy, b);
      if (h && h.t > 0.01 && (!hit || h.t < hit.t)) hit = h;
    }
    if (!hit) continue;
    const d = Math.max(1, hit.t * Math.cos(ray));
    depth[Math.floor(x / 3)] = d;
    const top = horizon - (125 * projection) / d,
      bottom = horizon + (55 * projection) / d,
      tex = assets.textures[hit.b.type] || assets.textures.block,
      source = (((hit.coord / 1.3) % 512) + 512) % 512;
    c.drawImage(tex, source, 0, 2, 512, x, top, 3, bottom - top);
    c.fillStyle = `rgba(8,24,31,${Math.min(
      0.79,
      d / 1900 + (hit.side ? 0.12 : 0)
    )})`;
    c.fillRect(x, top, 3, bottom - top);
    c.fillStyle = "#b7b38810";
    c.fillRect(x, bottom, 3, Math.min(70, (projection * 30) / d));
  }
  const sprites = [];
  board.drops.forEach((d) => {
    if (d.by === null) sprites.push({ ...d, type: "drop", height: 24 });
  });
  board.couriers.forEach((p) =>
    sprites.push({
      ...p,
      type: "person",
      sprite: assets.people[p.coat][p.mark],
      height: 85,
    })
  );
  board.guards.forEach((g) =>
    sprites.push({ ...g, type: "guard", sprite: assets.guard, height: 85 })
  );
  board.players.forEach((q, i) => {
    if (i !== own)
      sprites.push({
        ...q,
        type: "partner",
        sprite: assets.partner,
        height: 85,
        label: seats[i]?.name,
      });
  });
  sprites.push({ ...SAFE, type: "phone", height: 90 });
  sprites.sort(
    (a, b) => Math.hypot(b.x - px, b.y - py) - Math.hypot(a.x - px, a.y - py)
  );
  for (const s of sprites) {
    const dx = s.x - px,
      dy = s.y - py,
      d = dx * Math.cos(angle) + dy * Math.sin(angle),
      side = -dx * Math.sin(angle) + dy * Math.cos(angle);
    if (d < 12) continue;
    const center = width / 2 + (side * projection) / d,
      h = (s.height * projection) / d,
      w = h * (s.sprite ? 0.57 : 0.6),
      bottom = horizon + (55 * projection) / d;
    if (center + w / 2 < 0 || center - w / 2 > width) continue;
    for (
      let sx = Math.max(0, Math.floor(center - w / 2));
      sx < Math.min(width, center + w / 2);
      sx += 3
    ) {
      if (d > depth[Math.floor(sx / 3)] + 15) continue;
      if (s.sprite)
        c.drawImage(
          s.sprite,
          ((sx - (center - w / 2)) / w) * s.sprite.width,
          0,
          Math.max(1, (3 / w) * s.sprite.width),
          s.sprite.height,
          sx,
          bottom - h,
          3,
          h
        );
      else {
        c.fillStyle = s.type === "phone" ? "#c4a46a" : "#c4b98a";
        c.fillRect(sx, bottom - h, 3, h);
        c.fillStyle = "#22383b";
        c.fillRect(sx, bottom - h * 0.87, 3, h * 0.5);
      }
    }
    if (
      s.type === "guard" &&
      Math.abs(wrap(Math.atan2(py - s.y, px - s.x) - s.angle)) < 0.4
    ) {
      const glow = c.createRadialGradient(
        center,
        bottom - h * 0.65,
        2,
        center,
        bottom - h * 0.65,
        Math.min(250, h * 1.4)
      );
      glow.addColorStop(0, "#f7df9a99");
      glow.addColorStop(1, "#eacb7d00");
      c.fillStyle = glow;
      c.fillRect(center - 250, bottom - h * 2, 500, h * 3);
    }
    if (
      d < 260 &&
      center >= 0 &&
      center < width &&
      d < depth[Math.floor(center / 3)] + 15
    ) {
      c.font = "13px ui-monospace, monospace";
      c.textAlign = "center";
      const label =
        s.type === "drop"
          ? "DEAD DROP"
          : s.type === "phone"
          ? "TELEPHONE"
          : s.label || "";
      if (label) {
        c.fillStyle = "#142932ef";
        c.fillRect(center - 65, bottom - h - 26, 130, 22);
        c.fillStyle = "#f6e9c9";
        c.fillText(label, center, bottom - h - 10);
      }
    }
  }
  const lead = objective(board, p);
  if (lead) {
    const bearing = wrap(Math.atan2(lead.y - py, lead.x - px) - angle),
      x = Math.max(
        30,
        Math.min(
          width - 30,
          width / 2 +
            Math.tan(Math.max(-1.1, Math.min(1.1, bearing))) * projection
        )
      );
    c.fillStyle = "#edcf91";
    c.beginPath();
    c.moveTo(x, horizon - 25);
    c.lineTo(x + 7, horizon - 16);
    c.lineTo(x, horizon - 7);
    c.lineTo(x - 7, horizon - 16);
    c.fill();
    c.font = "12px ui-monospace,monospace";
    c.textAlign = "center";
    c.fillStyle = "#f2e6c6";
    c.fillText(
      Math.abs(bearing) > Math.PI / 2
        ? "BEHIND YOU"
        : `${Math.round(Math.hypot(lead.x - px, lead.y - py))}m`,
      x,
      horizon + 10
    );
  }
  // Fine rain crosses the lens. The reticle is large enough to read in a dark scene.
  c.strokeStyle = "#e9e4ca33";
  c.lineWidth = 1;
  for (let i = 0; i < 75; i++) {
    const x = (i * 179 + time * 0.02) % width,
      y = (i * 113 + time * 0.35) % height;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x - 4, y + 24);
    c.stroke();
  }
  c.strokeStyle = "#ede4c1cc";
  c.beginPath();
  c.arc(width / 2, height / 2, 4, 0, 7);
  c.stroke();
  const vignette = c.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.3,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.75
  );
  vignette.addColorStop(0, "#0b1d2600");
  vignette.addColorStop(1, "#0b1d2699");
  c.fillStyle = vignette;
  c.fillRect(0, 0, width, height);
}
