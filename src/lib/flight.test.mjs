import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TURN_STEP,
  flightInput,
  angleDelta,
  interpolateAngle,
} from "./flight.mjs";
import { newOrbit, stepOrbit } from "./orbit.mjs";
import { newSkirmish, stepSkirmish } from "./skirmish.mjs";
test("both flight games nudge heading, thrust along the nose and brake momentum", () => {
  for (const [create, step] of [
    [newOrbit, stepOrbit],
    [newSkirmish, stepSkirmish],
  ]) {
    let s = create();
    const start = s.players[0];
    s = step(s, { 0: { turn: 1, thrust: 0 } });
    assert.ok(Math.abs(s.players[0].angle - TURN_STEP) < 1e-9);
    assert.equal(s.players[0].x, start.x);
    assert.equal(s.players[0].y, start.y);
    s = step(s, { 0: { turn: 0, thrust: 1 } });
    assert.ok(s.players[0].x > start.x && s.players[0].y > start.y);
    const velocity = Math.hypot(s.players[0].vx, s.players[0].vy);
    s = step(s, { 0: { brake: true } });
    assert.ok(Math.hypot(s.players[0].vx, s.players[0].vy) < velocity * 0.6);
    const angle = s.players[0].angle;
    s = step(s, { 0: { turn: -1, thrust: 1 } });
    assert.ok(
      Math.abs(angleDelta(angle, s.players[0].angle) + TURN_STEP) < 1e-9
    );
  }
});
test("agents share the turn cap and rendering takes the shortest path through zero", () => {
  const p = { angle: 0 };
  assert.ok(Math.abs(flightInput(p, { x: 0, y: 1 }).angle - TURN_STEP) < 1e-12);
  assert.ok(
    Math.abs(flightInput(p, { turn: Infinity, thrust: NaN }).angle) < 1e-9
  );
  const a = Math.PI - 0.05,
    b = -Math.PI + 0.05;
  assert.ok(Math.abs(interpolateAngle(a, b, 0.5) - Math.PI) < 1e-9);
});
