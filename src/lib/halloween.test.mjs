import test from "node:test";
import assert from "node:assert/strict";
import {
  newHalloween,
  stepHalloween,
  halloweenCommand,
  nearestPorch,
  NEIGHBOURS,
  WRAPPERS,
  dialogueFor,
  watcherDistance,
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
  assert.equal(
    room.phase,
    "playing",
    "recovering the relics opens the gate; it does not skip the escape"
  );
  let escapeTicks = 0;
  while (!room.board.done && escapeTicks++ < 350) {
    room = act(room, { type: "orient" });
    room = advance(room, { [me.id]: { forward: 1 } });
  }
  assert.ok(escapeTicks < 350, "the entrance is reachable with all relics");
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
test("Halloween rooms welcome four humans, reject bots and pause when a player disconnects", () => {
  let s = createRoom("Halloween", me, "halloween");
  assert.equal(act(s, { type: "bot" }), s);
  const people = new Map(present);
  for (let i = 1; i <= 4; i++)
    people.set(`friend${i}`, {
      id: `friend${i}`,
      name: `Friend ${i}`,
      bot: false,
    });
  assert.equal(sessionSummary(s, people).joinable, true);
  for (let i = 1; i <= 3; i++)
    s = command(s, `friend${i}`, { type: "join" }, me.id, people);
  assert.equal(s.seats.length, 4);
  assert.equal(command(s, "friend4", { type: "join" }, me.id, people), s);
  assert.equal(command(s, "friend1", { type: "start" }, me.id, people), s);
  assert.equal(sessionSummary(s, people).joinable, false);
  s = command(s, me.id, { type: "start" }, me.id, people);
  assert.equal(s.board.players.length, 4);
  s = command(s, "friend1", { type: "pause" }, me.id, people);
  assert.equal(advance(s, { human: { forward: 1 } }), s);
  assert.equal(command(s, "friend1", { type: "resume" }, me.id, people), s);
  s = command(s, me.id, { type: "resume" }, me.id, people);
  const next = advance(s, {
    human: { forward: 1 },
    friend1: { strafe: 1 },
    friend2: { forward: -1 },
  });
  assert.ok(next.board.players[0].z > s.board.players[0].z);
  assert.ok(next.board.players[1].x > s.board.players[1].x);
  assert.ok(next.board.players[2].z < s.board.players[2].z);
  assert.equal(next.board.players[3].z, s.board.players[3].z);
});
test("conversations are independent and simultaneous visits never duplicate a stamp or repeat a reward", () => {
  let b = newHalloween(2);
  b = { ...b, players: b.players.map((p) => ({ ...p, x: -4, z: 3 })) };
  const before = structuredClone(b);
  b = halloweenCommand(b, 0, { type: "interact" });
  const moving = stepHalloween(b, { 0: { forward: 1 }, 1: { forward: 1 } });
  assert.equal(moving.players[0].z, 3);
  assert.ok(moving.players[1].z > 3);
  b = halloweenCommand(b, 1, { type: "interact" });
  assert.equal(dialogueFor(b, 1).id, 0);
  assert.equal(halloweenCommand(b, -1, { type: "choice", choice: 0 }), b);
  for (let i = 0; i < 2; i++) {
    b = halloweenCommand(b, i, { type: "choice", choice: i });
    const paid = b;
    assert.equal(halloweenCommand(b, i, { type: "choice", choice: 2 }), paid);
    b = halloweenCommand(b, i, { type: "continue" });
  }
  assert.deepEqual(b.visited, [0]);
  assert.deepEqual(
    b.players.map((p) => p.score),
    [5, 5]
  );
  assert.deepEqual(before.visited, []);
});
test("one shared bonus has one collector and team completion waits for pending conversations", () => {
  let b = newHalloween(4);
  b = { ...b, players: b.players.map((p) => ({ ...p, ...WRAPPERS[0] })) };
  b = stepHalloween(b);
  assert.equal(
    b.players.reduce((sum, p) => sum + p.score, 0),
    1
  );
  assert.deepEqual(b.collected, [0]);
  b = {
    ...b,
    visited: [0, 1, 2, 3, 4],
    players: b.players.map((p) => ({ ...p, x: 4, z: 25 })),
  };
  for (let i = 0; i < 4; i++) b = halloweenCommand(b, i, { type: "interact" });
  for (let i = 0; i < 4; i++) {
    b = halloweenCommand(b, i, { type: "choice", choice: i % 3 });
    b = halloweenCommand(b, i, { type: "continue" });
    assert.equal(b.done, false);
  }
  b = {
    ...b,
    players: b.players.map((p, i) => ({ ...p, x: 0, z: i === 3 ? 0 : -5 })),
  };
  b = stepHalloween(b);
  assert.equal(
    b.done,
    false,
    "nobody wins while a teammate is still in the street"
  );
  assert.ok(b.players.slice(0, 3).every((p) => p.escaped));
  b = { ...b, players: b.players.map((p) => ({ ...p, z: -5 })) };
  b = stepHalloween(b);
  assert.equal(b.done, true);
  assert.deepEqual(b.winners, [0, 1, 2, 3]);
  assert.equal(b.visited.length, 6);
  assert.equal(stepHalloween(b, { 0: { forward: 1 } }), b);
});
test("invalid capacity is rejected and legacy solo saves resume without losing conversation or treats", () => {
  for (const count of [0, 5, -1, 1.5, NaN])
    assert.throws(() => newHalloween(count));
  const old = {
    ...newHalloween(),
    dialogue: { id: 2, choice: 1 },
    sweets: ["Moonmallow bites"],
  };
  assert.equal(dialogueFor(old, 0).choice, 1);
  const next = halloweenCommand(old, 0, { type: "continue" });
  assert.deepEqual(next.visited, [2]);
  assert.deepEqual(next.sweets, old.sweets);
});

test("the watcher retreats from the beam, pursues turned backs and preserves relics on capture", () => {
  const b = {
    ...newHalloween(),
    visited: [0],
    watcher: { x: 0, z: 2 },
    players: [{ x: 0, z: 0, yaw: 0, alive: true, score: 5 }],
  };
  assert.ok(
    stepHalloween(b).watcher.z > 2,
    "a facing flashlight drives it back"
  );
  const turned = { ...b, players: [{ ...b.players[0], yaw: Math.PI }] };
  assert.ok(stepHalloween(turned).watcher.z < 2);
  const caught = stepHalloween({ ...turned, watcher: { x: 0, z: 0.7 } });
  assert.equal(caught.players[0].z, -4);
  assert.equal(caught.players[0].score, 5);
  assert.deepEqual(caught.visited, [0]);
  assert.equal(caught.players[0].caughtAt, 0);
  const safe = {
    ...b,
    players: [{ ...b.players[0], x: 4, yaw: Math.PI }],
    watcher: { x: 2.6, z: 0 },
  };
  assert.equal(
    stepHalloween(safe).players[0].x,
    4,
    "porches provide sanctuary"
  );
  assert.equal(watcherDistance(newHalloween()), Infinity);
});
