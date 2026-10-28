import { test } from "node:test";
import assert from "node:assert/strict";
import { newVector, stepVector, vectorView } from "./vector-wake.mjs";
import { interpolateVector } from "./vector-motion.mjs";
import {
  renderVector,
  camera,
  viewPoint,
  clippedLine,
} from "../vector-render.mjs";

function strokesOf(board, options = {}) {
  let path = [];
  const strokes = [];
  const ctx = new Proxy(
    {
      beginPath() {
        path = [];
      },
      moveTo(x, y) {
        path.push({ x, y });
      },
      lineTo(x, y) {
        path.push({ x, y });
      },
      stroke() {
        strokes.push({
          path: [...path],
          colour: this.strokeStyle,
          width: this.lineWidth,
        });
      },
    },
    {
      get: (obj, key) => obj[key] ?? (() => {}),
      set: (obj, key, value) => ((obj[key] = value), true),
    }
  );
  renderVector(ctx, board, 1280, 800, board.time * 1000, options);
  return strokes;
}

function volley(seat = 0) {
  let b = newVector(2);
  b.enemies = [];
  b.noticeUntil = 0;
  const first = stepVector(b, { [seat]: { fire: true } });
  const second = stepVector(first);
  return [vectorView(first, seat), vectorView(second, seat)];
}

for (const seat of [0, 1]) {
  test(`pilot ${
    seat + 1
  }: interpolated twin pulses visibly streak out of the barrels during launch`, () => {
    const [first, second] = volley(seat);
    for (const age of [0.016, 0.033, 0.05, 0.075]) {
      const frame = interpolateVector(first, second, first.time + age);
      const cam = camera(frame.players[0]);
      const beams = strokesOf(frame).filter(
        (s) => s.colour === "#effff5" && Math.abs(s.width - 2.4 * 0.48) < 1e-9
      );
      assert.equal(beams.length, 2, "both luminous cannon cores must be drawn");
      for (const [i, shot] of frame.shots.entries()) {
        // Simulation advances newly spawned shots by 100ms before publishing a snapshot.
        const head = {
          x: shot.origin.x + shot.vx * age,
          y: shot.origin.y + shot.vy * age,
          z: shot.origin.z + shot.vz * age,
        };
        const trail = Math.min(age, 0.065);
        const tail = {
          x: head.x - shot.vx * trail,
          y: head.y - shot.vy * trail,
          z: head.z - shot.vz * trail,
        };
        const expected = clippedLine(
          viewPoint(tail, cam),
          viewPoint(head, cam),
          1280,
          800
        );
        assert.ok(expected);
        for (let j = 0; j < 2; j++) {
          assert.ok(
            Math.abs(beams[i].path[j].x - expected[j].x) < 1e-7,
            `pulse starts too far downrange at age ${age}`
          );
          assert.ok(Math.abs(beams[i].path[j].y - expected[j].y) < 1e-7);
        }
      }
    }
  });
}

test("glow-off and reduced-motion cockpits still draw both cannon bolts", () => {
  const [a, b] = volley();
  const frame = interpolateVector(a, b, 0.133);
  const strokes = strokesOf(frame, { glow: false, reduced: true });
  assert.equal(
    strokes.filter((s) => s.colour === "#64ffd4" && s.width === 2.4).length,
    2
  );
});
