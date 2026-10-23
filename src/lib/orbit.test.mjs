import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newOrbit,
  stepOrbit,
  orbitBot,
  gatesAt,
  orbitInput,
  ORBIT_LIMIT,
} from "./orbit.mjs";
test("inputs are bounded; dash has a cooldown and snapshots stay immutable", () => {
  let s = newOrbit(2);
  const before = JSON.stringify(s);
  let n = stepOrbit(s, { 0: { x: Infinity, y: NaN, dash: true } });
  assert.ok(Number.isFinite(n.players[0].x));
  assert.ok(
    Math.abs(
      Math.hypot(...Object.values(orbitInput({ x: 5, y: 5 })).slice(0, 2)) - 1
    ) < 1e-12
  );
  n = stepOrbit(s, { 0: { x: 1, dash: true } });
  assert.equal(n.players[0].cooldown, 40);
  assert.equal(
    stepOrbit(n, { 0: { x: 1, dash: true } }).players[0].cooldown,
    39
  );
  assert.equal(JSON.stringify(s), before);
});
test("collectibles have one owner, bank five for bonus, and timeout ties finish", () => {
  let s = newOrbit(2);
  s.players.forEach((p) => {
    p.x = 200;
    p.y = 200;
  });
  s.cores = [{ id: 0, x: 200, y: 200, cycle: 0, wait: 0 }];
  let n = stepOrbit(s);
  assert.equal(
    n.players.reduce((a, p) => a + p.cargo, 0),
    1
  );
  s = newOrbit(2);
  Object.assign(s.players[0], gatesAt(1)[0], { cargo: 5 });
  n = stepOrbit(s);
  assert.equal(n.players[0].score, 7);
  assert.equal(n.players[0].cargo, 0);
  s = newOrbit(2);
  s.tick = ORBIT_LIMIT - 1;
  n = stepOrbit(s);
  assert.equal(n.done, true);
  assert.deepEqual(n.winners, [0, 1]);
});
test("four bots compete to a bounded finish and collect and bank cores", () => {
  let s = newOrbit(4, "islands");
  while (!s.done) {
    s = stepOrbit(
      s,
      Object.fromEntries(s.players.map((_, i) => [i, orbitBot(s, i)]))
    );
    for (const p of s.players) {
      assert.ok(Number.isFinite(p.x) && p.x >= 36 && p.x <= 864);
      assert.ok(p.cargo >= 0 && p.cargo <= 7);
    }
  }
  assert.ok(s.tick <= ORBIT_LIMIT);
  assert.ok(s.players.some((p) => p.score >= 10));
  assert.ok(s.winners.length > 0);
});
