// Integration check against the existing PureServer transport. Uses a temporary database and workspace.
import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { connectRoom } from "../src/lib/shared.mjs";
const serverRoot = process.argv[2];
if (!serverRoot) throw Error("Pass the PureServer checkout path.");
const load = (p) => import(pathToFileURL(join(serverRoot, p)).href);
const { openDb } = await load("src/db.ts"),
  { addTester } = await load("src/people.ts"),
  { createSession } = await load("src/auth.ts"),
  { workspaceFor } = await load("src/teams.ts"),
  { createCollab } = await load("src/collab.ts"),
  { WebSocket } = await load("node_modules/ws/wrapper.mjs");
const dir = await mkdtemp(join(tmpdir(), "puregames-check-")),
  db = openDb(join(dir, "test.sqlite"));
const a = addTester(db, {
    organisation: "Games test",
    name: "Player A",
    key: "1".repeat(64),
  }),
  b = addTester(db, {
    organisation: "Games test",
    name: "Player B",
    key: "2".repeat(64),
  });
const workspace = await workspaceFor(db, dir, a),
  path = "/Workspace/Games/test.puregames";
await workspace.write(
  path,
  JSON.stringify({ format: "puregames-room", version: 1 })
);
const collab = createCollab({ db, dataDir: dir }),
  server = createServer();
server.on("upgrade", (req, socket, head) =>
  collab.handleUpgrade(req, socket, head)
);
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `ws://127.0.0.1:${
  server.address().port
}/v1/collab?path=${encodeURIComponent(path)}&mode=edit`;
const brokerPath = process.argv[3];
const nativeBridges = new Map();
if (brokerPath)
  for (const player of [a, b]) {
    const { createRemoteCollab } = await import(pathToFileURL(brokerPath).href);
    const token = createSession(
      db,
      player,
      (player === a ? "1" : "2").repeat(64),
      1
    ).token;
    const listeners = new Set();
    const broker = createRemoteCollab({
      state: async () => ({
        server: url.replace("ws:", "http:").split("/v1/")[0],
        person: { name: player.name },
        organisation: { name: "Games test" },
      }),
      token: async () => token,
      request: async (_server, _path, body) =>
        body ? { result: await workspace.readText(path) } : {},
    });
    const owner = { owner: 1, tabId: "test-native", appSlug: "puregames" };
    const nativeBridge = {
      call: (_method, [request]) =>
        broker.call(owner, structuredClone(request), (frame) => {
          for (const fn of listeners) fn(structuredClone(frame));
        }),
      onEvent: (_name, fn) => {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
    };
    nativeBridge.session = await nativeBridge.call("collab.remote", [
      { op: "join", path },
    ]);
    await assert.rejects(
      broker.call(
        { ...owner, owner: 2 },
        { op: "connect", conn: "stolen", token: nativeBridge.session.token },
        () => {}
      )
    );
    await assert.rejects(
      nativeBridge.call("collab.remote", [
        { op: "read", path: "/Workspace/../private" },
      ])
    );
    nativeBridges.set(player, nativeBridge);
  }
const states = {},
  connections = [];
const connect = (p, key) =>
  connectRoom({
    bridge: nativeBridges.get(p),
    session: nativeBridges.has(p)
      ? nativeBridges.get(p).session
      : {
          url,
          token: createSession(db, p, key.repeat(64), 1).token,
          user: { name: p.name },
        },
    saved: {},
    name: "Integration table",
    write: (text) => workspace.write(path, text),
    onChange: (v) => (states[p.name] = v),
    WebSocketImpl: WebSocket,
  });
const wait = async (fn, label, timeout = 8000) => {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    if (fn()) return;
    await new Promise((r) => setTimeout(r, 25));
  }
  console.log(
    Object.fromEntries(
      Object.entries(states).map(([k, v]) => [
        k,
        {
          connected: v.connected,
          id: v.id,
          host: v.host,
          error: v.error,
          peers: [...v.peers.keys()],
          hasState: !!v.state,
        },
      ])
    )
  );
  throw Error("Timed out: " + label);
};
try {
  const ca = connect(a, "1");
  connections.push(ca);
  await wait(() => states[a.name]?.state, "first seed");
  const cb = connect(b, "2");
  connections.push(cb);
  await wait(
    () =>
      states[b.name]?.state &&
      states[a.name].peers.size === 2 &&
      states[b.name].peers.size === 2,
    "two peers"
  );
  cb.action({ type: "join" });
  await wait(() => states[a.name].state.seats.length === 2, "join seat");
  const leader = states[a.name].host === states[a.name].id ? ca : cb;
  leader.action({ type: "bot" });
  await wait(() => states[a.name].state.seats.length === 3, "agent seat");
  leader.action({ type: "start" });
  await wait(() => states[a.name].state.phase === "playing", "start");
  leader.action({ type: "resume" });
  await wait(
    () =>
      states[a.name].state.board.tick > 3 &&
      states[b.name].state.board.tick > 3,
    "shared realtime ticks"
  );
  ca.steer(0);
  await wait(
    () => states[a.name].state.board.players[0].d === 0,
    "human steering"
  );
  leader.action({ type: "pause" });
  await wait(
    () => states[a.name].state.paused && states[b.name].state.paused,
    "pause"
  );
  assert.deepEqual(states[a.name].state, states[b.name].state);
  assert.ok(
    states[b.name].state.board.players.every((p) => p.points > 0),
    "live survival scores replicate"
  );
  const originalId = states[a.name].id;
  const originalSeats = states[a.name].state.seats.map((p) => p.id);
  ca.reconnect();
  await wait(() => !states[a.name].connected, "manual retry disconnects");
  await wait(
    () =>
      states[a.name].connected &&
      states[a.name].peers.size === 2 &&
      states[b.name].peers.size === 2,
    "manual retry rejoins both desktops"
  );
  assert.equal(
    states[a.name].id,
    originalId,
    "reconnect preserves player identity"
  );
  assert.deepEqual(
    states[a.name].state.seats.map((p) => p.id),
    originalSeats,
    "retry does not create duplicate seats"
  );
  leader.action({ type: "lobby" });
  await wait(
    () =>
      states[a.name].state.phase === "lobby" &&
      states[b.name].state.phase === "lobby",
    "reset reaches both desktops"
  );
  assert.equal(states[a.name].state.board, null);
  assert.equal(states[b.name].state.board, null);
  leader.action({ type: "game", game: "orbit" });
  await wait(
    () =>
      states[a.name].state.game === "orbit" &&
      states[b.name].state.game === "orbit",
    "shared game choice"
  );
  leader.action({ type: "start" });
  await wait(
    () =>
      states[a.name].state.board?.kind === "orbit" &&
      states[a.name].state.board.tick > 1,
    "orbit launch"
  );
  ca.steer({ turn: -1, thrust: 1, dash: true });
  await wait(
    () => states[b.name].state.board.players[0].cooldown > 0,
    "native pilot dash replicated"
  );
  leader.action({ type: "pause" });
  await wait(
    () => states[a.name].state.paused && states[b.name].state.paused,
    "orbit shared pause"
  );
  assert.deepEqual(states[a.name].state, states[b.name].state);
  const bot = states[a.name].state.board.players[2];
  assert.ok(Math.hypot(bot.vx, bot.vy) > 0, "agent flies in shared match");
  leader.action({ type: "resume" });
  await wait(() => !states[a.name].state.paused, "orbit resume");
  await wait(
    () =>
      states[a.name].state.board.players[2].score > 0 &&
      states[b.name].state.board.players[2].score > 0,
    "banked scores reach both players",
    25000
  );
  leader.action({ type: "pause" });
  await wait(
    () => states[a.name].state.paused && states[b.name].state.paused,
    "pause to compare live scores"
  );
  assert.deepEqual(states[a.name].state, states[b.name].state);
  leader.action({ type: "lobby" });
  await wait(() => states[a.name].state.phase === "lobby", "shootout lobby");
  leader.action({ type: "game", game: "shoot" });
  await wait(
    () =>
      states[a.name].state.game === "shoot" &&
      states[b.name].state.game === "shoot",
    "shared shootout choice"
  );
  leader.action({ type: "start" });
  await wait(
    () =>
      states[b.name].state.board?.kind === "shoot" &&
      states[b.name].state.board.tick > 1,
    "shootout launch"
  );
  const beforeTurn = states[a.name].state.board.players[0].angle;
  ca.steer({ turn: 1, thrust: 1, fire: true });
  await wait(
    () =>
      states[b.name].state.board.events.some(
        (e) => e.type === "fire" && e.owner === 0
      ),
    "native laser fire replicated"
  );
  const turned = states[b.name].state.board.players[0].angle - beforeTurn;
  assert.ok(
    turned > 0 && turned < Math.PI / 2,
    "small flight turns replicate without a right-angle snap"
  );
  await wait(
    () =>
      states[a.name].state.board.players.some((p) => p.score > 0) &&
      states[b.name].state.board.players.some((p) => p.score > 0),
    "shared knockout scores",
    25000
  );
  leader.action({ type: "pause" });
  await wait(
    () => states[a.name].state.paused && states[b.name].state.paused,
    "shootout pause"
  );
  assert.deepEqual(states[a.name].state, states[b.name].state);
  leader.action({ type: "lobby" });
  await wait(() => states[a.name].state.phase === "lobby", "word lobby");
  leader.action({ type: "game", game: "words" });
  await wait(
    () =>
      states[a.name].state.game === "words" &&
      states[b.name].state.game === "words",
    "shared word puzzle"
  );
  leader.action({ type: "start" });
  await wait(
    () =>
      states[b.name].state.board?.kind === "words" &&
      states[a.name].state.phase === "playing",
    "word round starts"
  );
  ca.steer({ focus: 2 });
  cb.steer({ focus: 3 });
  await wait(
    () =>
      states[b.name].state.board.players[0].focus === 2 &&
      states[a.name].state.board.players[1].focus === 3,
    "teammate clue focus"
  );
  ca.action({ type: "word", clue: 0, guess: "STAR" });
  cb.action({ type: "word", clue: 0, guess: "STAR" });
  await wait(
    () =>
      states[a.name].state.board.entries[0].by !== null &&
      states[b.name].state.board.entries[0].by !== null,
    "concurrent answer"
  );
  assert.equal(
    states[b.name].state.board.teamScore,
    18,
    "concurrent answer scores once"
  );
  cb.action({ type: "hint", clue: 1 });
  await wait(() => states[a.name].state.board.hints === 2, "shared hint");
  ca.action({ type: "word", clue: 1, guess: "LIGHT" });
  await wait(
    () => states[b.name].state.board.entries[1].by === 0,
    "native answer replicated"
  );
  cb.action({ type: "word", clue: 2, guess: "TRAIL" });
  await wait(
    () => states[a.name].state.board.entries[2].by === 1,
    "browser answer replicated"
  );
  assert.equal(states[a.name].state.board.teamScore, 56);
  await wait(
    () => states[b.name].state.board.entries.some((e) => e.by === 2),
    "Game Player helps shared puzzle",
    25000
  );
  leader.action({ type: "pause" });
  await wait(
    () => states[a.name].state.paused && states[b.name].state.paused,
    "word pause"
  );
  assert.deepEqual(states[a.name].state, states[b.name].state);
  leader.action({ type: "lobby" });
  await wait(() => states[a.name].state.phase === "lobby", "noir lobby");
  leader.action({ type: "game", game: "noir" });
  await wait(() => states[b.name].state.game === "noir", "shared noir choice");
  leader.action({ type: "start" });
  await wait(
    () => states[b.name].state.board?.kind === "noir",
    "live city starts"
  );
  const origin = states[a.name].state.board.players[0].x;
  ca.steer({ x: 1, y: 0 });
  cb.steer({ view: "eyes", turn: 1 });
  await wait(
    () => states[b.name].state.board.players[0].x > origin + 20,
    "noir walking replicates"
  );
  ca.steer({ x: 0, y: 0 });
  cb.steer({ view: "eyes", turn: 0 });
  assert.ok(
    states[a.name].state.board.players[1].angle > -Math.PI / 2,
    "first-person turns replicate"
  );
  await wait(
    () => states[b.name].state.board.drops.some((d) => d.by === 2),
    "agent physically recovers evidence",
    25000
  );
  leader.action({ type: "pause" });
  await wait(
    () => states[a.name].state.paused && states[b.name].state.paused,
    "noir pauses"
  );
  assert.deepEqual(states[a.name].state, states[b.name].state);
  assert.ok(states[b.name].state.board.teamScore >= 10);
  leader.action({ type: "lobby" });
  await wait(() => states[a.name].state.phase === "lobby", "salvage lobby");
  leader.action({ type: "game", game: "tether" });
  await wait(
    () => states[b.name].state.game === "tether",
    "shared salvage selection"
  );
  leader.action({ type: "start" });
  await wait(
    () => states[b.name].state.board?.kind === "tether",
    "salvage starts"
  );
  let towing = false;
  const guide = setInterval(() => {
    [ca, cb].forEach((client, i) => {
      const p = states[a.name].state.board.players[i];
      const x = ((towing ? 80 : 340) - p.x) * 0.06 - p.vx * 0.7;
      const y = (360 + i * 24 - p.y) * 0.06 - p.vy * 0.7;
      const d = Math.max(1, Math.hypot(x, y));
      client.steer({ x: x / d, y: y / d });
    });
  }, 70);
  try {
    await wait(
      () =>
        states[b.name].state.board.players
          .slice(0, 2)
          .every((p) => Math.hypot(p.x - 340, p.y - 372) < 30),
      "human tug movement"
    );
    ca.action({ type: "hook" });
    cb.action({ type: "hook" });
    await wait(
      () =>
        states[b.name].state.board.players
          .slice(0, 2)
          .every((p) => p.hook === 0),
      "both human cables replicate"
    );
    towing = true;
    await wait(
      () => states[b.name].state.board.delivered >= 1,
      "physical shared delivery",
      25000
    );
  } finally {
    clearInterval(guide);
  }
  ca.steer({ brake: true });
  cb.steer({ brake: true });
  leader.action({ type: "pause" });
  await wait(
    () => states[a.name].state.paused && states[b.name].state.paused,
    "salvage pauses"
  );
  assert.deepEqual(states[a.name].state, states[b.name].state);
  const haul = states[b.name].state.board;
  assert.equal(
    haul.teamScore,
    haul.players.reduce((n, p) => n + p.score, 0)
  );
  assert.ok(
    haul.players[0].score > 0 && haul.players[1].score > 0,
    "both teammates earn shared lift credit"
  );
  assert.ok(
    haul.players[2].x !== 300,
    "Game Player flies alongside the humans"
  );
  leader.action({ type: "resume" });
  await wait(() => !states[a.name].state.paused, "resume before migration");
  leader.close();
  await wait(() => {
    const remaining = leader === ca ? states[b.name] : states[a.name];
    return (
      remaining.peers.size === 1 &&
      remaining.host === remaining.id &&
      remaining.state.paused
    );
  }, "host migration pauses");
  console.log(
    "PASS: authenticated peers, mixed seats, realtime sync, human steering, pause, automatic seats, Orbit Rally shared selection/motion/dash, Star Skirmish shared launch/fire/knockouts, Word Loom concurrent answers/shared hints/agent help, The Ninth Bell walking/first-person turns/shared evidence, Tether Crew shared cables/physics/delivery/team credit, live scores for all games, host migration."
  );
} finally {
  for (const c of connections) c.close();
  server.close();
  db.close();
  await rm(dir, { recursive: true, force: true });
}
process.exit(0);
