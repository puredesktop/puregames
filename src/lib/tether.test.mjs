import test from "node:test";
import assert from "node:assert/strict";
import {
  newTether,
  stepTether,
  tetherCommand,
  TETHER_DOCK,
  TETHER_LIMIT,
  debrisAt,
} from "./tether.mjs";
const run = (s, n, input = {}) => {
  for (let i = 0; i < n; i++) s = stepTether(s, input);
  return s;
};
test("Tether Crew has finite inertial movement, normalised diagonals, braking and immutable state", () => {
  const s = newTether(2),
    snapshot = structuredClone(s);
  const straight = run(s, 10, { 0: { x: 1 } }),
    diagonal = run(s, 10, { 0: { x: 1, y: 1 } });
  assert.ok(
    Math.abs(
      Math.hypot(straight.players[0].vx, straight.players[0].vy) -
        Math.hypot(diagonal.players[0].vx, diagonal.players[0].vy)
    ) < 0.001
  );
  const coast = run(straight, 6),
    brake = run(straight, 6, { 0: { brake: true } });
  assert.ok(coast.players[0].vx > brake.players[0].vx * 3);
  assert.deepEqual(s, snapshot);
  assert.ok(
    Number.isFinite(stepTether(s, { 0: { x: NaN, y: Infinity } }).players[0].x)
  );
});
test("hook requires proximity, toggles once, and pulling transfers momentum to cargo", () => {
  let s = newTether(2);
  assert.equal(tetherCommand(s, 0, { type: "hook" }), s);
  s.players[0].x = 330;
  s = tetherCommand(s, 0, { type: "hook" });
  assert.equal(s.players[0].hook, 0);
  const start = s.cargo[0].x;
  s = run(s, 30, { 0: { x: -1 } });
  assert.ok(s.cargo[0].x < start - 30);
  assert.ok(s.players[0].tension > 0);
  s = tetherCommand(s, 0, { type: "hook" });
  assert.equal(s.players[0].hook, null);
});
test("two ropes pull a massive load faster than one, with finite stable forces", () => {
  const make = (two) => {
    let s = newTether(2);
    s.cargo[0].mass = 4;
    s.players[0] = { ...s.players[0], x: 365, y: 345, hook: 0 };
    s.players[1] = { ...s.players[1], x: 365, y: 375, hook: two ? 0 : null };
    return s;
  };
  const one = run(make(false), 25, { 0: { x: -1 }, 1: { x: -1 } }),
    two = run(make(true), 25, { 0: { x: -1 }, 1: { x: -1 } });
  assert.ok(two.cargo[0].x < one.cargo[0].x - 8);
  assert.ok(two.cargo[0].tow[0] > 0 && two.cargo[0].tow[1] > 0);
});
test("dock needs a slow settled delivery, awards shared credit once, and replenishes cargo", () => {
  let s = newTether(2);
  Object.assign(s.cargo[0], {
    x: TETHER_DOCK.x,
    y: TETHER_DOCK.y,
    vx: 0,
    vy: 0,
    tow: { 0: 20, 1: 30 },
  });
  s = run(s, 11);
  assert.equal(s.delivered, 0);
  s = stepTether(s);
  assert.equal(s.delivered, 1);
  assert.equal(s.teamScore, 125);
  assert.equal(s.cargo.length, 4);
  assert.equal(
    s.players.reduce((n, p) => n + p.score, 0),
    125
  );
  assert.equal(run(s, 15).teamScore, 125);
  assert.equal(s.players[0].hook, null);
});
test("cargo rebounds from debris, takes bounded damage, and overstretched tethers release", () => {
  let s = newTether(2),
    rock = debrisAt(1)[0];
  Object.assign(s.cargo[0], {
    x: rock.x - rock.r - 30,
    y: rock.y,
    vx: 5,
    vy: 0,
  });
  s = stepTether(s);
  assert.ok(s.cargo[0].vx < 0);
  assert.ok(s.cargo[0].health < 100 && s.cargo[0].health >= 25);
  s.players[0].hook = 0;
  s.players[0].x = 40;
  s.players[0].y = 40;
  assert.equal(stepTether(s).players[0].hook, null);
});
test("whole crew wins only after five deliveries; timed shifts end and relaxed shifts continue", () => {
  let s = newTether(2);
  s.delivered = 4;
  s.cargo = s.cargo.slice(0, 1);
  Object.assign(s.cargo[0], { x: 145, y: 360, settling: 11, tow: { 0: 9 } });
  s = stepTether(s);
  assert.equal(s.done, true);
  assert.deepEqual(s.winners, [0, 1]);
  assert.equal(stepTether(s), s);
  const timed = newTether(2);
  timed.tick = TETHER_LIMIT - 1;
  assert.equal(stepTether(timed).done, true);
  assert.deepEqual(stepTether(timed).winners, []);
  timed.arena = "islands";
  assert.equal(stepTether(timed).done, false);
});
test("Game Players physically tow every cargo through a full shift", () => {
  let s = newTether(2);
  const original = s.cargo[0].x;
  s = run(s, 100, { 0: { bot: true }, 1: { bot: true } });
  assert.ok(s.cargo[0].x < original);
  s = run(s, 2300, { 0: { bot: true }, 1: { bot: true } });
  assert.equal(s.delivered, 5);
  assert.equal(s.done, true);
  assert.deepEqual(s.winners, [0, 1]);
  assert.equal(
    s.teamScore,
    s.players.reduce((n, p) => n + p.score, 0)
  );
});

test("Game Player leaves a human’s nearest unclaimed load for them", () => {
  const s = run(newTether(2), 100, { 1: { bot: true } });
  assert.equal(s.cargo[0].x, 465);
  assert.notEqual(s.players[1].hook, 0);
});
