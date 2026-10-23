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

test("Orbit Rally persists game choice, launches and awards only winning pilots",()=>{let s=createRoom('Orbit',a,'orbit');s=cmd(s,'a',{type:'bot'});assert.equal(cmd(s,'b',{type:'game',game:'ribbon'}),s);s=cmd(s,'a',{type:'start'});assert.equal(s.board.kind,'orbit');assert.equal(s.countdown,30);s={...s,countdown:0,board:{...s.board,tick:899,players:s.board.players.map((p,i)=>({...p,score:i===0?9:3}))}};s=advance(s);assert.equal(s.phase,'finished');assert.equal(s.scores.a,1);assert.equal(s.scores[s.seats[1].id],undefined)});
