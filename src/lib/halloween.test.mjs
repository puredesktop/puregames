import test from "node:test";
import assert from "node:assert/strict";
import {
  newHalloween,
  stepHalloween,
  halloweenCommand,
  nearestPorch,
  NEIGHBOURS,
  WRAPPERS,
} from "./halloween.mjs";
import { createRoom, command, advance } from "./room.mjs";
import { sessionSummary } from "./session-summary.mjs";
const me = { id: "human", name: "Human", bot: false },
  present = new Map([[me.id, me]]);
const act = (s, a) => command(s, me.id, a, me.id, present);
test("a complete six-porch round can be walked, answered and replayed through the room engine", () => {
  let room = act(createRoom("Halloween", me, "halloween"), { type: "start" });
  assert.equal(room.phase, "playing");
  assert.equal(room.countdown, 0);
  for (let i = 0; i < 6; i++) {
    let ticks = 0;
    while (nearestPorch(room.board).distance > 2.4 && ticks++ < 150) {
      room = act(room, { type: "orient" });
      room = advance(room, { [me.id]: { forward: 1 } });
    }
    assert.ok(ticks < 150, "every porch must be reachable");
    room = act(room, { type: "interact" });
    assert.ok(room.board.dialogue);
    room = act(room, { type: "choice", choice: i % 3 });
    const score = room.board.players[0].score;
    room = act(room, { type: "choice", choice: (i + 1) % 3 });
    assert.equal(
      room.board.players[0].score,
      score,
      "repeated choice cannot award twice"
    );
    room = act(room, { type: "continue" });
    assert.equal(room.board.visited.length, i + 1);
  }
  assert.equal(room.phase, "finished");
  assert.equal(room.board.sweets.length, 6);
  assert.equal(room.scores.human, 1);
  assert.equal(act(room, { type: "continue" }), room);
  const fresh = act(room, { type: "rematch" });
  assert.equal(fresh.phase, "playing");
  assert.equal(fresh.board.players[0].score, 0);
  assert.deepEqual(fresh.board.visited, []);
  assert.equal(fresh.round, 2);
  assert.equal(fresh.scores.human, 1);
});
test("movement is bounded, finite, immutable, diagonal-normalised and paused by conversations", () => {
  const b = newHalloween(),
    snapshot = structuredClone(b);
  for (const invalid of [
    { forward: Infinity, turn: NaN, strafe: "1" },
    { forward: 1e20, turn: 20, strafe: -20 },
  ]) {
    let n = stepHalloween(b, { 0: invalid });
    for (let i = 0; i < 300; i++) n = stepHalloween(n, { 0: invalid });
    assert.ok(
      Object.values(n.players[0])
        .filter((v) => typeof v === "number")
        .every(Number.isFinite)
    );
    assert.ok(
      Math.abs(n.players[0].x) <= 4.6 &&
        n.players[0].z <= 29 &&
        n.players[0].z >= -5.5
    );
  }
  assert.deepEqual(b, snapshot);
  const straight = stepHalloween(b, { 0: { forward: 1 } }),
    diagonal = stepHalloween(b, { 0: { forward: 1, strafe: 1 } });
  assert.ok(
    Math.abs(
      Math.hypot(diagonal.players[0].x, diagonal.players[0].z + 4) -
        (straight.players[0].z + 4)
    ) < 1e-8
  );
  const talking = { ...b, dialogue: { id: 0, choice: null } };
  assert.equal(stepHalloween(talking, { 0: { forward: 1 } }), talking);
});
test("distance, valid choices and completion gates prevent remote doorbells and duplicate rewards", () => {
  const b = newHalloween();
  assert.equal(halloweenCommand(b, 0, { type: "interact" }), b);
  assert.equal(halloweenCommand(b, 1, { type: "orient" }), b);
  const near = { ...b, players: [{ ...b.players[0], x: -4, z: 3 }] },
    talk = halloweenCommand(near, 0, { type: "interact" });
  assert.equal(halloweenCommand(talk, 0, { type: "continue" }), talk);
  for (const choice of [-1, 3, 1.5, "0", NaN])
    assert.equal(halloweenCommand(talk, 0, { type: "choice", choice }), talk);
  const prize = halloweenCommand(talk, 0, { type: "choice", choice: 2 });
  assert.equal(prize.sweets.length, 1);
  assert.deepEqual(talk.sweets, []);
  const closed = halloweenCommand(prize, 0, { type: "continue" });
  assert.ok(closed.visited.includes(0));
  assert.notEqual(nearestPorch(closed).id, 0);
});
test("bonus sweets are collected once and every reply has authored content", () => {
  let b = newHalloween();
  for (const sweet of WRAPPERS) {
    b = { ...b, players: [{ ...b.players[0], x: sweet.x, z: sweet.z }] };
    b = stepHalloween(b);
    b = stepHalloween(b);
  }
  assert.equal(b.collected.length, 5);
  assert.equal(b.players[0].score, 5);
  assert.ok(
    NEIGHBOURS.every(
      (n) => n.options.length === 3 && n.replies.length === 3 && n.candy
    )
  );
});
test("solo rooms reject bots and extra seats, pause deterministically and are not advertised as joinable", () => {
  let s = createRoom("Halloween", me, "halloween");
  assert.equal(act(s, { type: "bot" }), s);
  const outsider = { id: "other", name: "Other", bot: false };
  assert.equal(
    command(
      s,
      "other",
      { type: "join" },
      "human",
      new Map([...present, ["other", outsider]])
    ),
    s
  );
  assert.equal(sessionSummary(s, present).joinable, false);
  s = act(s, { type: "start" });
  s = act(s, { type: "pause" });
  assert.equal(advance(s, { human: { forward: 1 } }), s);
  assert.equal(act(s, { type: "interact" }), s);
  s = act(s, { type: "resume" });
  assert.notEqual(
    advance(s, { human: { forward: 1 } }).board.players[0].z,
    s.board.players[0].z
  );
});
