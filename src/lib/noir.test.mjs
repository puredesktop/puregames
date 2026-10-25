import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newNoir,
  stepNoir,
  noirCommand,
  nearestInteractable,
  inBeam,
  NOIR_LIMIT,
  objective,
  clueText,
} from "./noir.mjs";
import {
  SAFE,
  DROPS,
  distance,
  walkable,
  routeDirection,
} from "./noir-world.mjs";
const game = () => newNoir(2, "islands", 1, 42);
const tick = (s, n, input = {}) => {
  for (let i = 0; i < n; i++) s = stepNoir(s, input);
  return s;
};
test("noir seeds reproduce a fair, distinct courier and shuffle evidence", () => {
  const a = game();
  assert.deepEqual(a, game());
  assert.notDeepEqual(a.drops, newNoir(2, "islands", 1, 77).drops);
  assert.equal(a.drops.filter((d) => d.kind < 3).length, 3);
  assert.equal(
    new Set(a.drops.filter((d) => d.kind < 3).map((d) => d.kind)).size,
    3
  );
  const c = a.couriers[a.target];
  assert.equal(
    a.couriers.filter((p) => p.coat === c.coat && p.mark === c.mark).length,
    1
  );
  for (const d of DROPS) {
    assert.ok(walkable(d.x, d.y));
    const r = routeDirection(SAFE, d);
    assert.ok(r.x || r.y, `${d.name} reachable`);
  }
});
test("movement is continuous, diagonals normalized, walls solid, sprint consumes stamina", () => {
  let s = game(),
    p = s.players[0];
  const normal = stepNoir(s, { 0: { x: 1 } }),
    diagonal = stepNoir(s, { 0: { x: 1, y: 1 } }),
    run = stepNoir(s, { 0: { x: 1, run: true } });
  assert.ok(
    Math.abs(
      distance(p, normal.players[0]) - distance(p, diagonal.players[0])
    ) < 1e-8
  );
  assert.ok(distance(p, run.players[0]) > distance(p, normal.players[0]));
  assert.ok(run.players[0].stamina < 100);
  s.players[0] = { ...p, x: 155, y: 250 };
  s = tick(s, 20, { 0: { x: 1 } });
  assert.ok(s.players[0].x <= 166);
  const invalid = stepNoir(game(), { 0: { x: Infinity, y: NaN } });
  assert.ok(Number.isFinite(invalid.players[0].x));
});
test("through-eyes controls turn in nudges, move forward and strafe without changing facing", () => {
  let s = game(),
    p = s.players[0],
    turned = stepNoir(s, { 0: { view: "eyes", turn: 1 } });
  assert.ok(Math.abs(turned.players[0].angle - p.angle - 0.11) < 1e-8);
  assert.equal(turned.players[0].x, p.x);
  const forward = stepNoir(s, { 0: { view: "eyes", forward: 1 } });
  assert.ok(forward.players[0].y < p.y);
  const side = stepNoir(s, { 0: { view: "eyes", strafe: 1 } });
  assert.ok(side.players[0].x > p.x);
  assert.equal(side.players[0].angle, p.angle);
});
test("search requires proximity and standing still, duplicate searches score once", () => {
  let s = game();
  s.players[0] = { ...s.players[0], x: 50, y: 1160 };
  assert.equal(noirCommand(s, 0, { type: "interact" }), s);
  s.players = s.players.map((p) => ({
    ...p,
    x: DROPS[0].x,
    y: DROPS[0].y,
    grace: 200,
  }));
  s = noirCommand(s, 0, { type: "interact" });
  assert.equal(s.players[0].search, 0);
  const moved = stepNoir(s, { 0: { x: 1 } });
  assert.equal(moved.players[0].search, null);
  s = noirCommand(s, 1, { type: "interact" });
  s = tick(s, 22);
  assert.equal(s.drops[0].by, 0);
  assert.equal(s.teamScore, 10);
  assert.equal(s.players[1].score, 0);
});
for (const [higher, lower] of [
  ["fragment", "blank"],
  ["fragment", "interception"],
  ["fragment", "agent"],
  ["interception", "blank"],
  ["interception", "agent"],
]) {
  test(`same-tick ${higher} notice outranks ${lower} in either player order`, () => {
    for (const events of [[higher, lower], [lower, higher]]) {
      const s = game(),
        inputs = {};
      s.guards = [{
        ...s.guards[0], x: 700, y: 740, angle: 0, alert: 0,
      }];
      events.forEach((event, i) => {
        if (event === "fragment" || event === "blank") {
          s.drops[i].kind = event === "fragment" ? 0 : 3;
          s.players[i] = {
            ...s.players[i], ...DROPS[i], search: i, progress: 21,
          };
        } else {
          s.players[i] = {
            ...s.players[i], x: 750, y: 740, heat: 99, grace: 0,
          };
          if (event === "agent") inputs[i] = { bot: true };
        }
      });
      const next = stepNoir(s, inputs);
      assert.equal(next.event, s.event + 2, "both events happened");
      assert.equal(next.strikes, events.includes("interception") ? 1 : 0);
      assert.equal(
        next.teamScore,
        events.filter((e) => ["fragment", "blank"].includes(e)).length * 10
      );
      if (higher === "fragment") {
        assert.deepEqual(next.fragments, [0]);
        assert.equal(next.notice, clueText(s, 0));
      } else {
        assert.match(next.notice, /^The watch intercepted an investigator\./);
      }
      assert.equal(
        stepNoir(next, inputs).notice,
        next.notice,
        "notice persists on a quiet tick"
      );
    }
  });
}
test("notice priority resets each tick and does not hide the end of the operation", () => {
  let s = game();
  s.guards = [];
  s.drops[0].kind = 0;
  s.drops[1].kind = 3;
  s.players[0] = {
    ...s.players[0], ...DROPS[0], search: 0, progress: 21,
  };
  const timed = { ...s, arena: "open", tick: NOIR_LIMIT - 1 };
  s = stepNoir(s);
  assert.equal(s.notice, clueText(s, 0));
  s.players[1] = {
    ...s.players[1], ...DROPS[1], search: 1, progress: 21,
  };
  s = stepNoir(s);
  assert.equal(s.notice, clueText(s, 3), "a later tick can show a blank drop");
  const ended = stepNoir(timed);
  assert.deepEqual(ended.fragments, [0], "fragment recovered as dawn arrives");
  assert.equal(ended.outcome, "dawn");
  assert.equal(ended.notice, "Dawn. The transmitter went silent.");
});
test("wrong contacts raise alarm; the right contact needs all fragments", () => {
  let s = game();
  s.players[0] = { ...s.players[0], ...s.couriers[s.target] };
  s.drops = s.drops.map((d) => ({ ...d, by: 1 }));
  assert.equal(noirCommand(s, 0, { type: "interact" }).phase, "search");
  s.fragments = [0, 1, 2];
  s = noirCommand(s, 0, { type: "interact" });
  assert.equal(s.phase, "extract");
  assert.equal(s.teamScore, 40);
  let bad = game();
  bad.fragments = [0, 1, 2];
  bad.drops = bad.drops.map((d) => ({ ...d, by: 1 }));
  const wrong = (bad.target + 1) % 3;
  bad.players[0] = { ...bad.players[0], ...bad.couriers[wrong] };
  bad = noirCommand(bad, 0, { type: "interact" });
  assert.equal(bad.phase, "search");
  assert.ok(bad.players[0].heat > 0);
  assert.ok(bad.guards.every((g) => g.alert > 0));
});
test("extraction waits for every human, awards a shared win once, and clock can expire", () => {
  let s = game();
  s.phase = "extract";
  s.players[1] = { ...s.players[1], x: 700, y: 740 };
  s = stepNoir(s);
  assert.equal(s.done, false);
  s.players[1] = { ...s.players[1], ...SAFE };
  s = stepNoir(s);
  assert.equal(s.done, true);
  assert.deepEqual(s.winners, [0, 1]);
  assert.equal(
    s.teamScore,
    s.players.reduce((n, p) => n + p.score, 0)
  );
  assert.equal(stepNoir(s), s);
  const timed = { ...game(), arena: "open", tick: NOIR_LIMIT - 1 };
  assert.equal(stepNoir(timed).outcome, "dawn");
  assert.equal(stepNoir({ ...timed, arena: "islands" }).done, false);
});
test("walls block searchlights, exposure falls in cover, and the starting telephone is safe", () => {
  assert.equal(inBeam({ x: 750, y: 300 }, { x: 700, y: 300, angle: 0 }), true);
  assert.equal(inBeam({ x: 720, y: 300 }, { x: 150, y: 300, angle: 0 }), false);
  assert.equal(inBeam({ x: 230, y: 240 }, { x: 150, y: 240, angle: 0 }), false);
  let s = game();
  s.players[0].heat = 50;
  assert.ok(stepNoir(s).players[0].heat < 50);
  s = tick(s, 500);
  assert.equal(s.strikes, 0);
  assert.equal(s.done, false);
});
test("agent physically explores and files evidence without burning human lives", () => {
  const s = tick(game(), 2000, { 1: { bot: true } });
  assert.ok(s.drops.filter((d) => d.by !== null).length >= 4);
  assert.ok(s.players[1].score > 0);
  assert.equal(s.strikes, 0);
  assert.equal(s.phase, "search");
  assert.equal(
    s.drops[7].by,
    null,
    "agent leaves the human’s nearest lead for them"
  );
});
