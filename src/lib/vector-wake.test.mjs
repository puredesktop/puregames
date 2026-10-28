import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newVector,
  stepVector,
  targetFor,
  axes,
  sub,
  length,
  clamp,
  segmentDistance,
  SHIPS,
} from "./vector-wake.mjs";
import { createRoom, command, advance } from "./room.mjs";
import {
  clippedLine,
  MESHES,
  renderVector,
  camera,
  viewPoint,
} from "../vector-render.mjs";
test("flight moves in three dimensions, sanitises inputs and spends/recharges boost", () => {
  const original = newVector();
  let b = stepVector(original, { 0: { turn: 1, pitch: 1, boost: true } });
  assert.ok(b.players[0].x > 0);
  assert.ok(b.players[0].y > 0);
  assert.ok(b.players[0].z < 0);
  assert.ok(b.players[0].energy < 100);
  assert.equal(original.tick, 0);
  b = stepVector(b, { 0: { turn: NaN, pitch: Infinity } });
  assert.ok(Number.isFinite(b.players[0].yaw));
  assert.ok(b.players[0].energy > 97);
  for (let i = 0; i < 100; i++) b = stepVector(b, { 0: { pitch: 1 } });
  assert.ok(b.players[0].pitch <= 1.4);
});
test("continuous cannon fire overheats, and releasing fire cools and unlocks it", () => {
  let b = newVector();
  for (let i = 0; i < 100 && !b.overheated; i++)
    b = stepVector(b, { 0: { fire: true } });
  assert.ok(b.fired > 0);
  assert.ok(b.players[0].heat <= 100);
  assert.ok(b.overheated);
  const count = b.fired;
  for (let i = 0; i < 40; i++) b = stepVector(b);
  assert.equal(b.overheated, false);
  assert.equal(b.fired, count);
  assert.ok(stepVector(b, { 0: { fire: true } }).fired > count);
});
test("seeker launch requires a sustained valid lock and consumes one missile", () => {
  let b = newVector();
  b.enemies = [
    {
      id: "target",
      type: "prism",
      ...SHIPS.prism,
      x: 0,
      y: 0,
      z: -800,
      vx: 0,
      vy: 0,
      vz: 0,
      phase: 0,
      fireAt: 100,
    },
  ];
  const early = stepVector(b, { 0: { missile: true } });
  assert.equal(early.players[0].missiles, 4);
  for (let i = 0; i < 14; i++) b = stepVector(b);
  assert.ok(b.lockTime >= 1.1);
  b = stepVector(b, { 0: { missile: true } });
  assert.equal(b.players[0].missiles, 3);
  assert.ok(b.shots.some((s) => s.missile));
});
test("fast projectiles use swept collision and award a kill only once", () => {
  let b = newVector();
  b.enemies = [
    {
      id: "target",
      type: "spindle",
      ...SHIPS.spindle,
      x: 0,
      y: 0,
      z: -60,
      vx: 0,
      vy: 0,
      vz: 0,
      phase: 0,
      fireAt: 100,
    },
  ];
  b = stepVector(b, { 0: { fire: true } });
  assert.equal(b.kills, 1);
  assert.equal(b.players[0].score, 200); // 150 for the kill, 50 for its nearby cell.
  assert.equal(b.cells, 1);
  assert.equal(stepVector(b).kills, 1);
  assert.equal(
    segmentDistance(
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: -150 },
      { x: 0, y: 0, z: -75 }
    ),
    0
  );
});
test("hull failure ends the flight without awarding a win, and done boards remain stable", () => {
  let b = newVector();
  b.players[0].shield = 0;
  b.players[0].hull = 1;
  b.shots = [
    { x: 0, y: 0, z: -20, vx: 0, vy: 0, vz: 300, enemy: true, until: 20 },
  ];
  b = stepVector(b);
  assert.ok(b.done);
  assert.equal(b.victory, false);
  assert.deepEqual(b.winners, []);
  assert.equal(stepVector(b), b);
});
test("original hull meshes have valid edges and near-plane clipping stays finite", () => {
  for (const model of Object.values(MESHES))
    for (const edge of model.edges)
      for (const index of edge)
        assert.ok(index >= 0 && index < model.points.length);
  const line = clippedLine(
    { x: 1, y: 1, z: -5 },
    { x: 4, y: 1, z: 10 },
    1200,
    800
  );
  assert.ok(line);
  assert.ok(line.flatMap((p) => [p.x, p.y, p.z]).every(Number.isFinite));
  assert.equal(
    clippedLine({ x: 0, y: 0, z: -5 }, { x: 0, y: 0, z: -1 }, 1200, 800),
    null
  );
});
test("a pilot can finish all three sectors through ordinary flight, cannon and seeker inputs", () => {
  let b = newVector(),
    cooling = false;
  for (let i = 0; i < 6000 && !b.done; i++) {
    const p = b.players[0],
      t = targetFor(b);
    if (!t) {
      b = stepVector(b);
      continue;
    }
    const d = sub(t.enemy, p),
      yaw = Math.atan2(d.x, -d.z),
      pitch = Math.asin(d.y / length(d));
    const delta = Math.atan2(Math.sin(yaw - p.yaw), Math.cos(yaw - p.yaw));
    if (p.heat > 78) cooling = true;
    if (p.heat < 20) cooling = false;
    b = stepVector(b, {
      0: {
        turn: clamp(delta * 4, -1, 1),
        pitch: clamp((pitch - p.pitch) * 4, -1, 1),
        brake: t.distance < 300,
        boost: t.distance > 1500,
        fire: t.angle < 0.11 && !cooling,
        missile: b.lockTime >= 1.1,
      },
    });
  }
  assert.ok(
    b.victory,
    `Outcome wave=${b.wave} time=${b.time} hull=${b.players[0].hull} kills=${b.kills}`
  );
  assert.equal(b.wave, 3);
  assert.equal(b.kills, 16);
  assert.deepEqual(b.winners, [0]);
  assert.ok(b.players[0].score >= 5000);
});
test("the PureGames room launches solo without a countdown, pauses, and preserves other games", () => {
  const pilot = { id: "a", name: "Pilot", bot: false },
    people = new Map([["a", pilot]]);
  let s = createRoom("Flight", pilot, "vector");
  s = command(s, "a", { type: "start" }, "a", people);
  assert.equal(s.board.kind, "vector");
  assert.equal(s.countdown, 0);
  const run = advance(s, { a: { pitch: 1, fire: true } });
  assert.equal(run.board.tick, 1);
  assert.ok(run.board.players[0].y > 0);
  const paused = command(run, "a", { type: "pause" }, "a", people);
  assert.equal(advance(paused), paused);
  assert.equal(
    command(
      createRoom("Solo", pilot, "vector"),
      "a",
      { type: "bot" },
      "a",
      people
    ).seats.length,
    1
  );
  const again = command(
    { ...s, phase: "finished" },
    "a",
    { type: "rematch" },
    "a",
    people
  );
  assert.equal(again.board.players[0].hull, 100);
  assert.equal(again.board.time, 0);
});

test("full cockpit rendering survives near-plane crossings across a moving flight", () => {
  const c = new Proxy(
    {},
    {
      get: (o, k) =>
        o[k] ||
        ((...args) => {
          if (
            [
              "moveTo",
              "lineTo",
              "arc",
              "fillRect",
              "clearRect",
              "strokeRect",
            ].includes(k)
          )
            assert.ok(
              args.every((v) => typeof v === "boolean" || Number.isFinite(v)),
              `${String(k)} received a non-finite coordinate`
            );
        }),
      set: (o, k, v) => ((o[k] = v), true),
    }
  );
  let b = newVector();
  for (let i = 0; i < 450 && !b.done; i++) {
    b = stepVector(b, {
      0: {
        turn: Math.sin(i * 0.04),
        pitch: Math.sin(i * 0.08) * 0.4,
        fire: true,
        dodge: i % 50 === 0 ? 1 : 0,
        boost: i % 30 < 8,
      },
    });
    assert.doesNotThrow(() =>
      renderVector(c, b, 1440, 900, i * 100, { elapsed: 0.05 })
    );
    if (i % 25 === 0)
      assert.doesNotThrow(() =>
        renderVector(c, b, 390, 844, i * 100, { reduced: true, glow: false })
      );
  }
});

test("fighters cross the nose and recover instead of hovering at a fixed range", () => {
  let b = newVector();
  const seen = new Set(),
    first = b.enemies[0].id;
  let crossed = false,
    returned = false,
    attackSpeed = 0;
  for (let i = 0; i < 140 && !b.done; i++) {
    b = stepVector(b);
    const e = b.enemies.find((e) => e.id === first);
    seen.add(e.manoeuvre);
    const relative = viewPoint(e, camera(b.players[0]));
    if (crossed && relative.z > 150) returned = true;
    if (relative.z < 0) crossed = true;
    attackSpeed = Math.max(attackSpeed, Math.hypot(e.vx, e.vy, e.vz));
  }
  assert.deepEqual([...seen].sort(), ["ATTACK RUN", "CROSSING", "REGROUP"]);
  assert.ok(crossed, "an attack run must actually pass the pilot");
  assert.ok(
    returned,
    "recovery burns must bring fighters back ahead of a cruising pilot"
  );
  assert.ok(attackSpeed > 150);
  assert.ok(b.enemies[0].trail.length <= 9);
});

test("cannon origins stay at the visible barrel mouths while banking", () => {
  let b = newVector();
  b.players[0].roll = 0.7;
  b = stepVector(b, { 0: { fire: true, bank: 0.7 / 1.1 } });
  const cam = camera(b.players[0]),
    shots = b.shots.filter((s) => !s.enemy);
  assert.equal(shots.length, 2);
  const local = shots.map((s) => viewPoint(s.origin, cam));
  assert.ok(Math.abs(local[0].x + 3.8) < 1e-8);
  assert.ok(Math.abs(local[1].x - 3.8) < 1e-8);
  for (const p of local) {
    assert.ok(Math.abs(p.y + 4.4) < 1e-8);
    assert.ok(Math.abs(p.z - 14) < 1e-8);
  }
});

test("paired enemy volleys share shield recovery and close-call credit is awarded once", () => {
  let b = newVector();
  b.shots = [0, 1].map((id) => ({
    id,
    x: 0,
    y: 0,
    z: -20,
    vx: 0,
    vy: 0,
    vz: 300,
    enemy: true,
    until: 20,
  }));
  b = stepVector(b);
  assert.equal(
    b.players[0].shield,
    94,
    "paired bolts must not double-hit in one tick"
  );
  b.shots = [
    {
      id: 90,
      x: 25,
      y: 0,
      z: b.players[0].z - 20,
      vx: 0,
      vy: 0,
      vz: 300,
      enemy: true,
      until: 20,
    },
  ];
  b = stepVector(b);
  assert.equal(b.nearMisses, 1);
  assert.equal(b.players[0].score, 15);
  for (let i = 0; i < 3; i++) b = stepVector(b);
  assert.equal(b.nearMisses, 1);
});

test("evade rolls spend boost, move laterally, reject repeated activation and protect during the manoeuvre", () => {
  let b = newVector();
  b.shots = [
    {
      id: 1,
      x: 0,
      y: 0,
      z: -20,
      vx: 0,
      vy: 0,
      vz: 300,
      enemy: true,
      until: 20,
    },
  ];
  b = stepVector(b, { 0: { dodge: -1 } });
  assert.equal(b.players[0].shield, 100);
  assert.equal(b.players[0].energy, 82);
  const start = b.players[0].evadeAt;
  for (let i = 0; i < 8; i++) b = stepVector(b, { 0: { dodge: 1 } });
  assert.equal(b.players[0].evadeAt, start);
  assert.ok(b.players[0].x < -140);
  for (let i = 0; i < 28; i++) b = stepVector(b);
  b = stepVector(b, { 0: { dodge: 1 } });
  assert.ok(b.players[0].evadeAt > start + 3.4);
});

test("shield cells magnetise nearby, restore bounded reserves, award once and expire", () => {
  let b = newVector();
  b.damageAt = 0; // Keep the ordinary recharge delay out of the pickup assertion.
  b.players[0].shield = 70;
  b.players[0].energy = 50;
  b.pickups = [
    { id: 100, x: 0, y: 0, z: -80, until: 14 },
    { id: 101, x: 900, y: 900, z: -900, until: 0 },
  ];
  b = stepVector(b);
  assert.equal(b.cells, 1);
  assert.equal(b.players[0].shield, 90);
  assert.equal(b.players[0].energy, 81.5);
  assert.equal(b.players[0].score, 50);
  assert.equal(b.pickups.length, 0);
  b = stepVector(b);
  assert.equal(b.players[0].score, 50);
  assert.equal(b.cells, 1);
});
