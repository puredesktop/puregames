import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newSkirmish,
  stepSkirmish,
  skirmishInput,
  skirmishBot,
  segmentHit,
} from "./skirmish.mjs";
const shot = (id, owner, x, y, vx = 27, vy = 0) => ({
  id,
  owner,
  x,
  y,
  vx,
  vy,
  life: 20,
});
const unshield = (s) => ({
  ...s,
  players: s.players.map((p) => ({ ...p, shield: 0 })),
});
test("flight inputs are bounded, fire repeats at a fixed rate, snapshots are immutable", () => {
  assert.deepEqual(skirmishInput({ x: NaN, y: Infinity, fire: 1 }), {
    x: 0,
    y: 0,
    fire: false,
  });
  const d = skirmishInput({ x: 8, y: 9, fire: true });
  assert.equal(Math.hypot(d.x, d.y), 1);
  const initial = newSkirmish(),
    snapshot = JSON.stringify(initial);
  let s = stepSkirmish(initial, { 0: { x: 1, y: 0, fire: true } });
  assert.equal(s.serial, 1);
  assert.equal(s.players[0].shield, 0);
  assert.ok(s.players[0].x > initial.players[0].x);
  for (let i = 0; i < 3; i++) s = stepSkirmish(s, { 0: { fire: true } });
  assert.equal(s.serial, 1);
  s = stepSkirmish(s, { 0: { fire: true } });
  assert.equal(s.serial, 2);
  assert.equal(JSON.stringify(initial), snapshot);
});
test("swept shots hit the first ship, award only one knockout, then respawn protected", () => {
  assert.equal(
    segmentHit({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 0 }, 10),
    0.4
  );
  assert.equal(
    segmentHit({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 20 }, 10),
    null
  );
  let s = unshield(newSkirmish(3));
  s.players[1] = { ...s.players[1], x: 400, y: 300, hull: 1 };
  s.players[2] = { ...s.players[2], x: 440, y: 300 };
  s.shots = [shot(1, 0, 370, 300, 100), shot(2, 0, 371, 300, 100)];
  s = stepSkirmish(s);
  assert.equal(s.players[0].score, 1);
  assert.equal(s.players[1].respawn, 20);
  assert.equal(s.players[2].hull, 3);
  assert.equal(s.shots.length, 0);
  for (let i = 0; i < 20; i++) s = stepSkirmish(s);
  assert.equal(s.players[1].respawn, 0);
  assert.equal(s.players[1].hull, 3);
  assert.equal(s.players[1].shield, 18);
  const p = s.players[1];
  s.shots = [shot(4, 0, p.x - 20, p.y)];
  s = stepSkirmish(s);
  assert.equal(s.players[1].hull, 3);
  assert.equal(s.shots.length, 0);
});
test("rocks block lasers; simultaneous knockouts and timeout ties stay fair", () => {
  let s = unshield(newSkirmish(2, "islands"));
  s.players[1] = { ...s.players[1], x: 370, y: 250, hull: 1 };
  s.shots = [shot(1, 0, 260, 250, 120)];
  s = stepSkirmish(s);
  assert.equal(s.players[1].hull, 1);
  assert.equal(s.players[0].score, 0);
  s = unshield(newSkirmish());
  s.players = s.players.map((p) => ({ ...p, hull: 1, score: 4 }));
  s.shots = [shot(1, 0, 740, 300), shot(2, 1, 160, 300, -27)];
  s = stepSkirmish(s);
  assert.deepEqual(
    s.players.map((p) => p.score),
    [5, 5]
  );
  assert.deepEqual(s.winners, [0, 1]);
  assert.equal(s.done, true);
  assert.equal(stepSkirmish(s), s);
  s = stepSkirmish({ ...newSkirmish(), tick: 899 });
  assert.equal(s.done, true);
  assert.deepEqual(s.winners, [0, 1]);
});
test("two and four Game Players finish on both arenas with bounded state and real scores", () => {
  for (const arena of ["open", "islands"])
    for (const n of [2, 4]) {
      let s = newSkirmish(n, arena);
      while (!s.done) {
        s = stepSkirmish(
          s,
          Object.fromEntries(s.players.map((_, i) => [i, skirmishBot(s, i)]))
        );
        assert.ok(s.shots.length < 100);
        for (const p of s.players) {
          assert.ok(Number.isFinite(p.x) && p.x >= 30 && p.x <= 870);
          assert.ok(p.hull >= 0 && p.hull <= 3);
          assert.ok(p.respawn >= 0 && p.respawn <= 20);
        }
      }
      assert.ok(s.tick <= 900);
      assert.ok(s.players.some((p) => p.score >= 5));
      assert.equal(
        s.players.reduce((n, p) => n + p.score, 0),
        s.players.reduce((n, p) => n + p.deaths, 0)
      );
    }
});
