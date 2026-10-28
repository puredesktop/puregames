import { test } from "node:test";
import assert from "node:assert/strict";
import { createVectorMotion, interpolateVector } from "./vector-motion.mjs";
import { newVector, stepVector, vectorView } from "./vector-wake.mjs";
import { radarContacts } from "./vector-radar.mjs";
import { renderVector } from "../vector-render.mjs";

function snapshot(tick) {
  const x = tick * 10;
  return {
    tick,
    time: tick / 10,
    pilotIndex: 0,
    arena: "open",
    players: [{ x, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, alive: true }],
    enemies: [
      {
        id: "fighter",
        type: "spindle",
        x: x + 200,
        y: 0,
        z: -300,
        vx: 100,
        vy: 0,
        vz: 0,
      },
    ],
    wingmates: [{ index: 1, x: x + 100, y: 0, z: 0, yaw: 0, alive: true }],
    shots: [{ id: 4, x: x + 50, y: 0, z: -30, vx: 100, vy: 0, vz: 0 }],
    pickups: [{ id: 5, x: x + 80, y: 0, z: 0 }],
  };
}

test("camera, fighters, wingmates, shots and radar share the same sub-tick pose without mutation", () => {
  const a = snapshot(0),
    b = snapshot(1),
    before = structuredClone([a, b]);
  const frame = interpolateVector(a, b, 0.05);
  assert.equal(frame.players[0].x, 5);
  assert.equal(frame.enemies[0].x, 205);
  assert.equal(frame.wingmates[0].x, 105);
  assert.equal(frame.shots[0].x, 55);
  assert.equal(frame.pickups[0].x, 85);
  assert.equal(frame.time, 0.05);
  const contacts = radarContacts(frame, frame.players[0], 1600);
  assert.ok(contacts.length >= 2);
  assert.deepEqual([a, b], before);
});

test("irregular network arrivals stay smooth at 60 fps without backwards steps or packet-boundary jumps", () => {
  const motion = createVectorMotion();
  let board = snapshot(0),
    previous,
    largest = 0,
    smallest = Infinity;
  const jitter = [0, 22, -12, 35, -8, 18, 0];
  let next = 1;
  for (let now = 0; now <= 6000; now += 1000 / 60) {
    while (now >= next * 100 + jitter[next % jitter.length])
      board = snapshot(next++);
    // A freshly constructed React view with an unchanged tick must not reset motion.
    const frame = motion.sample({ ...board }, now);
    const x = frame.enemies[0].x;
    if (previous !== undefined && now > 700) {
      const step = x - previous;
      assert.ok(
        step > 1.3 && step < 2.1,
        `uneven movement ${step} at ${now}ms`
      );
      largest = Math.max(largest, step);
      smallest = Math.min(smallest, step);
    }
    assert.ok(Math.abs(x - frame.players[0].x - 200) < 1e-8);
    previous = x;
  }
  assert.ok(largest - smallest < 0.5);
});

test("bursty/coalesced packets and a late packet resume without rewinding", () => {
  const motion = createVectorMotion();
  let board = snapshot(0),
    previous = 200;
  for (let now = 0; now < 1400; now += 10) {
    if (now === 200) board = snapshot(2);
    if (now === 400) board = snapshot(4);
    if (now === 900) board = snapshot(9);
    if (now === 1100) board = snapshot(11);
    const x = motion.sample(board, now).enemies[0].x;
    assert.ok(x >= previous, `rewound at ${now}`);
    assert.ok(x - previous < 1.1, `snapped at ${now}`);
    previous = x;
  }
});

test("angle wrapping, stable entity IDs, spawns, removals and respawns keep valid boundaries", () => {
  const a = snapshot(0),
    b = snapshot(1);
  a.players[0].yaw = Math.PI - 0.02;
  b.players[0].yaw = -Math.PI + 0.02;
  a.enemies[0].vx = 0.1;
  a.enemies[0].vz = 100;
  b.enemies[0].vx = -0.1;
  b.enemies[0].vz = 100;
  b.enemies = [{ ...b.enemies[0], id: "new" }, b.enemies[0]];
  b.shots = [];
  b.wingmates[0].alive = false;
  b.wingmates[0].x = 10000;
  const half = interpolateVector(a, b, 0.05);
  assert.ok(Math.abs(half.players[0].yaw - Math.PI) < 1e-9);
  assert.ok(Math.abs(Math.abs(half.enemies[0].flightYaw) - Math.PI) < 1e-9);
  assert.equal(half.enemies.length, 1);
  assert.equal(half.enemies[0].x, 205);
  assert.equal(half.shots.length, 1);
  assert.equal(half.wingmates[0].x, 100);
  const end = interpolateVector(a, b, 0.1);
  assert.equal(end.enemies.length, 2);
  assert.equal(end.shots.length, 0);
  assert.equal(end.wingmates[0].alive, false);
});

test("pause freezes exactly, resume/round resets/seat changes/hidden tabs do not blend unrelated flights", () => {
  const motion = createVectorMotion();
  motion.sample(snapshot(0), 0);
  motion.sample(snapshot(1), 100);
  assert.equal(motion.sample(snapshot(1), 120, true).players[0].x, 10);
  assert.equal(motion.sample(snapshot(1), 800, true).players[0].x, 10);
  assert.equal(motion.sample(snapshot(1), 810).players[0].x, 10);
  assert.equal(motion.sample(snapshot(0), 820).players[0].x, 0);
  const other = { ...snapshot(5), pilotIndex: 1 };
  assert.equal(motion.sample(other, 830).players[0].x, 50);
  assert.equal(motion.sample(snapshot(30), 3000).players[0].x, 300);
});

test("a moving two-pilot cockpit renders finite geometry on interpolated frames", () => {
  const gradient = { addColorStop() {} };
  const ctx = new Proxy(
    {},
    {
      get(_, key) {
        if (key === "measureText") return () => ({ width: 20 });
        if (key === "createLinearGradient" || key === "createRadialGradient")
          return () => gradient;
        return (...args) => {
          for (const arg of args)
            if (typeof arg === "number")
              assert.ok(Number.isFinite(arg), `${key}: ${args}`);
        };
      },
      set() {
        return true;
      },
    }
  );
  let b = newVector(2);
  const motion = createVectorMotion();
  for (let i = 0; i < 240; i++) {
    if (i % 6 === 0)
      b = stepVector(b, {
        0: { turn: 0.4, pitch: 0.6, fire: true },
        1: { turn: -0.3, fire: true },
      });
    const frame = motion.sample(vectorView(b, 0), (i * 1000) / 60);
    renderVector(ctx, frame, 1280, 800, (i * 1000) / 60);
  }
});
