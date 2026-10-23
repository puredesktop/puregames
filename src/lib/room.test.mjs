import { test } from "node:test";
import assert from "node:assert/strict";
import { createRoom, command, advance, pauseForDisconnect } from "./room.mjs";
const a = { id: "a", name: "Ada", bot: false },
  b = { id: "b", name: "Bo", bot: false };
const people = new Map([
  ["a", a],
  ["b", b],
]);
const cmd = (s, id, action) => command(s, id, action, "a", people);
test("mixed four-seat lobby, host-only controls and capacity", () => {
  let s = createRoom("Team", a);
  s = cmd(s, "b", { type: "join" });
  s = cmd(s, "a", { type: "bot" });
  s = cmd(s, "a", { type: "bot" });
  assert.equal(s.seats.length, 4);
  assert.equal(cmd(s, "a", { type: "bot" }), s);
  assert.equal(cmd(s, "b", { type: "start" }), s);
  s = cmd(s, "a", { type: "start" });
  assert.equal(s.board.players.length, 4);
  assert.equal(s.paused, false);
  s = cmd(s, "a", { type: "resume" });
  assert.equal(advance(s).board.tick, 0);
  for (let i = 0; i < 31; i++) s = advance(s);
  assert.equal(s.board.tick, 1);
});
test("a disconnect pauses play; absent players block resume", () => {
  let s = createRoom("Team", a);
  s = cmd(s, "b", { type: "join" });
  s = cmd(s, "a", { type: "start" });
  s = cmd(s, "a", { type: "resume" });
  const present = new Map([["a", a]]);
  s = pauseForDisconnect(s, present);
  assert.ok(s.paused);
  assert.equal(command(s, "a", { type: "resume" }, "a", present), s);
  assert.equal(advance(s), s);
});

test("Orbit Rally persists game choice, launches and awards only winning pilots", () => {
  let s = createRoom("Orbit", a, "orbit");
  s = cmd(s, "a", { type: "bot" });
  assert.equal(cmd(s, "b", { type: "game", game: "ribbon" }), s);
  s = cmd(s, "a", { type: "start" });
  assert.equal(s.board.kind, "orbit");
  assert.equal(s.countdown, 30);
  s = {
    ...s,
    countdown: 0,
    board: {
      ...s.board,
      tick: 899,
      players: s.board.players.map((p, i) => ({
        ...p,
        score: i === 0 ? 9 : 3,
      })),
    },
  };
  s = advance(s);
  assert.equal(s.phase, "finished");
  assert.equal(s.scores.a, 1);
  assert.equal(s.scores[s.seats[1].id], undefined);
});

test("Star Skirmish shared rules launch, pause and award wins once", () => {
  let s = createRoom("Shootout", a, "shoot");
  s = cmd(s, "b", { type: "join" });
  s = cmd(s, "a", { type: "bot" });
  s = cmd(s, "a", { type: "start" });
  assert.equal(s.board.kind, "shoot");
  assert.equal(s.board.players.length, 3);
  s = {
    ...s,
    countdown: 0,
    board: {
      ...s.board,
      tick: 899,
      players: s.board.players.map((p, i) => ({
        ...p,
        score: i === 0 ? 4 : 2,
      })),
    },
  };
  const paused = cmd(s, "a", { type: "pause" });
  assert.equal(advance(paused), paused);
  s = advance(s);
  assert.equal(s.phase, "finished");
  assert.equal(s.scores.a, 1);
  assert.equal(advance(s), s);
  s = cmd(s, "a", { type: "rematch" });
  assert.equal(s.board.players[0].score, 0);
  assert.equal(s.scores.a, 1);
});

test("Word Loom accepts either teammate, blocks paused answers and awards a shared win once", async () => {
  const { WORD_PUZZLES } = await import("./word-puzzles.mjs");
  let s = createRoom("Words", a, "words");
  s = cmd(s, "b", { type: "join" });
  s = cmd(s, "a", { type: "bot" });
  s = cmd(s, "a", { type: "start" });
  assert.equal(s.countdown, 0);
  s = cmd(s, "a", { type: "pause" });
  assert.equal(cmd(s, "b", { type: "word", clue: 0, guess: "STAR" }), s);
  s = cmd(s, "a", { type: "resume" });
  for (let i = 0; i < 8; i++)
    s = cmd(s, i % 2 ? "b" : "a", {
      type: "word",
      clue: i,
      guess: WORD_PUZZLES[0].words[i][0],
    });
  assert.equal(s.phase, "finished");
  assert.equal(s.scores.a, 1);
  assert.equal(s.scores.b, 1);
  assert.equal(s.scores[s.seats[2].id], 1);
  assert.equal(advance(s), s);
  s = cmd(s, "a", { type: "rematch" });
  assert.equal(s.board.puzzle, 1);
  assert.equal(s.scores.a, 1);
  assert.equal(s.board.teamScore, 0);
});

test("The Ninth Bell shares movement and perspective inputs, pauses, and retains human control", () => {
  let s = createRoom("Noir", a, "noir");
  s = cmd(s, "b", { type: "join" });
  s = cmd(s, "a", { type: "bot" });
  s = cmd(s, "a", { type: "start" });
  assert.equal(s.countdown, 0);
  assert.equal(s.board.kind, "noir");
  const x = s.board.players[0].x,
    angle = s.board.players[1].angle;
  s = advance(s, { a: { x: 1, bot: true }, b: { view: "eyes", turn: 1 } });
  assert.ok(s.board.players[0].x > x);
  assert.ok(Math.abs(s.board.players[1].angle - angle - 0.11) < 1e-8);
  s = cmd(s, "a", { type: "pause" });
  assert.equal(advance(s, { a: { x: 1 } }), s);
  assert.equal(cmd(s, "b", { type: "interact" }), s);
});

test("Tether Crew shares human hooks and brakes, rejects bot spoofing and pauses commands", () => {
  let s = createRoom("Salvage", a, "tether");
  s = cmd(s, "b", { type: "join" });
  s = cmd(s, "a", { type: "bot" });
  s = cmd(s, "a", { type: "start" });
  assert.equal(s.board.kind, "tether");
  assert.equal(s.countdown, 0);
  const x = s.board.players[0].x;
  s = advance(s, { a: { x: 1, bot: true }, b: { x: 1, brake: true } });
  assert.ok(s.board.players[0].x > x);
  assert.equal(s.board.players[0].hook, null);
  assert.equal(s.board.players[1].braking, true);
  s.board.players[1].x = 340;
  s.board.players[1].y = 360;
  s = cmd(s, "b", { type: "hook" });
  assert.equal(s.board.players[1].hook, 0);
  s = cmd(s, "a", { type: "pause" });
  assert.equal(cmd(s, "b", { type: "hook" }), s);
  assert.equal(advance(s), s);
  s = cmd(s, "a", { type: "resume" });
  s = cmd(s, "b", { type: "hook" });
  assert.equal(s.board.players[1].hook, null);
});
