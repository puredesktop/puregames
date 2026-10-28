import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newVector,
  stepVector,
  vectorView,
  axes,
  dot,
  sub,
  length,
  clamp,
  targetFor,
  SHIPS,
} from "./vector-wake.mjs";
import { radarContacts } from "./vector-radar.mjs";
import { createRoom, command, advance, pauseForDisconnect } from "./room.mjs";
import { sessionSummary } from "./session-summary.mjs";

const people = Array.from({ length: 5 }, (_, i) => ({
  id: `p${i}`,
  userId: `u${i}`,
  name: `Pilot ${i + 1}`,
  bot: false,
}));
const present = new Map(people.map((p) => [p.id, p]));
const cmd = (s, actor, action) => command(s, actor, action, "p0", present);

test("Vector Wake seats four humans, rejects bots and spectators' control, and resumes only a complete wing", () => {
  let s = createRoom("Wing", people[0], "vector");
  assert.equal(cmd(s, "p0", { type: "bot" }), s);
  for (const p of people.slice(1)) s = cmd(s, p.id, { type: "join" });
  assert.equal(s.seats.length, 4);
  assert.equal(sessionSummary(s, present).capacity, 4);
  assert.equal(cmd(s, "p1", { type: "start" }), s);
  s = cmd(s, "p0", { type: "start" });
  assert.equal(s.board.players.length, 4);
  assert.equal(s.countdown, 0);
  assert.equal(sessionSummary(s, present).joinable, false);
  const b = advance(s, {
    p0: { turn: 1 },
    p1: { turn: -1, pitch: 1, fire: true },
    p4: { fire: true },
  }).board;
  assert.ok(b.players[0].yaw > 0 && b.players[1].yaw < 0);
  assert.equal(b.players[0].fired, 0);
  assert.equal(b.players[1].fired, 2);
  assert.equal(b.players[2].fired, 0);
  const disconnected = new Map(present);
  disconnected.delete("p2");
  const paused = pauseForDisconnect(s, disconnected);
  assert.ok(paused.paused);
  assert.equal(
    command(paused, "p0", { type: "resume" }, "p0", disconnected),
    paused
  );
  assert.equal(cmd(paused, "p1", { type: "resume" }), paused);
  assert.ok(!cmd(paused, "p0", { type: "resume" }).paused);
});

test("each cockpit has its own locks, heat, ammunition and camera; old solo checkpoints still advance", () => {
  let b = newVector(2);
  b.players[1].yaw = Math.PI;
  b = stepVector(b, { 0: { fire: true, boost: true }, 1: { pitch: 1 } });
  assert.equal(b.players[0].fired, 2);
  assert.equal(b.players[1].fired, 0);
  assert.ok(b.players[0].heat > b.players[1].heat);
  assert.ok(b.players[0].energy < b.players[1].energy);
  const view = vectorView(b, 1);
  assert.equal(view.players[0], b.players[1]);
  assert.equal(view.fired, 0);
  assert.equal(view.wingmates[0].index, 0);
  b.players[0].lock = b.lock = "another-pilot-target";
  b.players[1].lock = null;
  assert.equal(
    vectorView(b, 1).lock,
    null,
    "an unlocked cockpit must never borrow another pilot's lock"
  );
  const old = newVector();
  for (const key of [
    "lock",
    "lockTime",
    "fireAt",
    "damageAt",
    "missileAt",
    "fired",
    "hits",
  ])
    delete old.players[0][key];
  assert.equal(stepVector(old, { 0: { fire: true } }).players[0].fired, 2);
});

test("a seeker's lock, ammunition and target belong only to its launching pilot", () => {
  let b = newVector(2);
  b.players[0].yaw = Math.PI;
  b.enemies = [
    {
      id: "locked",
      type: "prism",
      ...SHIPS.prism,
      x: 100,
      y: 0,
      z: -800,
      vx: 0,
      vy: 0,
      vz: 0,
      phase: 0,
      fireAt: 100,
    },
  ];
  b.players[1].lock = "locked";
  b.players[1].lockTime = 1.2;
  b = stepVector(b, { 0: { missile: true }, 1: { missile: true } });
  assert.equal(b.players[0].missiles, 4);
  assert.equal(b.players[1].missiles, 3);
  const missiles = b.shots.filter((s) => s.missile);
  assert.equal(missiles.length, 1);
  assert.equal(missiles[0].owner, 1);
  assert.equal(missiles[0].target, "locked");
});

test("friendly fire is harmless, hostile fire reaches other pilots and kills credit the actual shooter", () => {
  let b = newVector(2);
  const p = b.players[1];
  b.shots = [
    {
      x: p.x,
      y: p.y,
      z: p.z - 20,
      vx: 0,
      vy: 0,
      vz: 300,
      enemy: false,
      owner: 0,
      until: 20,
    },
  ];
  b = stepVector(b);
  assert.equal(b.players[1].shield, 100);
  b.shots = [
    {
      x: b.players[1].x,
      y: b.players[1].y,
      z: b.players[1].z - 20,
      vx: 0,
      vy: 0,
      vz: 300,
      enemy: true,
      until: 20,
    },
  ];
  b = stepVector(b);
  assert.equal(b.players[1].shield, 94);
  assert.equal(b.players[0].shield, 100);
  b = newVector(2);
  b.enemies = [
    {
      id: "target",
      type: "spindle",
      ...SHIPS.spindle,
      x: 100,
      y: 0,
      z: -125,
      vx: 0,
      vy: 0,
      vz: 0,
      phase: 0,
      fireAt: 100,
    },
  ];
  b = stepVector(b, { 1: { fire: true } });
  assert.equal(b.kills, 1);
  assert.ok(b.players[1].score >= 150);
  assert.equal(b.players[0].score, 0);
});

test("a downed pilot recovers beside a surviving wingmate; total wing loss ends the mission", () => {
  let b = newVector(2);
  b.players[1].shield = 0;
  b.players[1].hull = 1;
  b.shots = [
    { x: 100, y: 0, z: -85, vx: 0, vy: 0, vz: 300, enemy: true, until: 20 },
  ];
  b = stepVector(b);
  assert.ok(!b.players[1].alive);
  assert.ok(!b.done);
  b.enemies.forEach((e) => (e.fireAt = 1000));
  for (let i = 0; i < 81; i++) b = stepVector(b);
  assert.ok(b.players[1].alive);
  assert.equal(b.players[1].hull, 100);
  assert.ok(length(sub(b.players[1], b.players[0])) < 200);
  assert.ok(b.players[1].invulnerableUntil > b.time);
  b.players.forEach((p) => {
    p.alive = false;
    p.hull = 0;
    p.respawnAt = b.time + 8;
  });
  b = stepVector(b);
  assert.ok(b.done);
  assert.ok(!b.victory);
  assert.deepEqual(b.winners, []);
});

test("pitch and yaw can loop repeatedly in either direction without limits or camera flips", () => {
  for (const direction of [1, -1]) {
    let b = newVector(),
      angle = 0,
      last = axes(b.players[0]).f;
    for (let i = 0; i < 180; i++) {
      b = stepVector(b, { 0: { pitch: direction, turn: direction } });
      const p = b.players[0],
        f = axes(p).f;
      angle += Math.atan2(Math.sin(p.pitch - angle), Math.cos(p.pitch - angle));
      assert.ok(
        dot(f, last) > 0.97,
        "adjacent camera directions stay continuous at the poles and wrap"
      );
      assert.ok(Number.isFinite(p.x + p.y + p.z + p.pitch + p.yaw));
      last = f;
    }
    assert.ok(
      Math.abs(angle) > Math.PI * 5,
      "three continuous loops must be possible"
    );
  }
});

test("radar distinguishes ahead, aft, altitude, locked targets, wingmates and range", () => {
  const b = newVector(2),
    p = b.players[0];
  b.enemies = [
    { id: "ahead", x: 100, y: 200, z: -400 },
    { id: "aft", x: -200, y: -200, z: 600 },
    { id: "far", x: 0, y: 0, z: -9000 },
  ];
  b.lock = "ahead";
  p.lock = "ahead";
  let contacts = radarContacts(vectorView(b, 0), p, 1600);
  const ahead = contacts.find((c) => c.id === "ahead"),
    aft = contacts.find((c) => c.id === "aft"),
    far = contacts.find((c) => c.id === "far");
  assert.ok(ahead.y < 0 && ahead.x > 0 && ahead.altitude > 0 && ahead.locked);
  assert.ok(aft.y > 0 && aft.x < 0 && aft.altitude < 0 && aft.behind);
  assert.ok(far.outside);
  assert.ok(Math.hypot(far.x, far.y) <= 0.92);
  assert.equal(contacts.filter((c) => c.kind === "wingmate").length, 1);
  const zoomed = radarContacts(vectorView(b, 0), p, 800).find(
    (c) => c.id === "ahead"
  );
  assert.ok(Math.abs(zoomed.y) > Math.abs(ahead.y));
  p.yaw = Math.PI;
  contacts = radarContacts(vectorView(b, 0), p, 1600);
  assert.ok(contacts.find((c) => c.id === "ahead").behind);
});

test("a cooperative crew can clear all three sectors through ordinary flight inputs", () => {
  let b = newVector(4);
  const cooling = [false, false, false, false];
  for (let i = 0; i < 6000 && !b.done; i++) {
    const inputs = {};
    b.players.forEach((p, index) => {
      if (!p.alive) return;
      const t = targetFor(b, p);
      if (!t) return;
      const d = sub(t.enemy, p),
        yaw = Math.atan2(d.x, -d.z),
        pitch = Math.asin(d.y / length(d));
      const turn = Math.atan2(Math.sin(yaw - p.yaw), Math.cos(yaw - p.yaw));
      const lift = Math.atan2(
        Math.sin(pitch - p.pitch),
        Math.cos(pitch - p.pitch)
      );
      if (p.heat > 78) cooling[index] = true;
      if (p.heat < 20) cooling[index] = false;
      inputs[index] = {
        turn: clamp(turn * 4, -1, 1),
        pitch: clamp(lift * 4, -1, 1),
        brake: t.distance < 300,
        boost: t.distance > 1500,
        fire: t.angle < 0.11 && !cooling[index],
        missile: p.lockTime >= 1.1,
      };
    });
    b = stepVector(b, inputs);
  }
  assert.ok(b.victory, `wave=${b.wave} time=${b.time} kills=${b.kills}`);
  assert.deepEqual(b.winners, [0, 1, 2, 3]);
  assert.equal(b.kills, 34);
  assert.ok(b.players.every((p) => p.fired > 0 && p.score > 0));
});
