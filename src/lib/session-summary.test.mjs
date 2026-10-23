import { test } from "node:test";
import assert from "node:assert/strict";
import { createRoom } from "./room.mjs";
import { sessionSummary } from "./session-summary.mjs";
test("active game summaries describe people, agents and availability", () => {
  const state = createRoom("Test", { id: "a", name: "Ada", bot: false });
  state.seats.push({ id: "bot", name: "Game Player", bot: true });
  const present = new Map([["a", {}]]);
  const summary = sessionSummary(state, present);
  assert.equal(summary.title, "Ribbon Run");
  assert.equal(summary.status, "waiting");
  assert.equal(summary.joinable, true);
  assert.deepEqual(
    summary.players.map((p) => [p.name, p.connected]),
    [
      ["Ada", true],
      ["Game Player", true],
    ]
  );
  assert.equal(
    sessionSummary({ ...state, phase: "playing", paused: false }, present)
      .joinable,
    false
  );
  assert.equal(
    sessionSummary({ ...state, ended: true }, present).status,
    "ended"
  );
});
