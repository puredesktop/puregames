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
let nativeBridge;
if (brokerPath) {
  const { createRemoteCollab } = await import(pathToFileURL(brokerPath).href);
  const token = createSession(db, a, "1".repeat(64), 1).token;
  const listeners = new Set();
  const broker = createRemoteCollab({
    state: async () => ({
      server: url.replace("ws:", "http:").split("/v1/")[0],
      person: { name: a.name },
      organisation: { name: "Games test" },
    }),
    token: async () => token,
    request: async (_server, _path, body) =>
      body ? { result: await workspace.readText(path) } : {},
  });
  const owner = { owner: 1, tabId: "test-native", appSlug: "puregames" };
  nativeBridge = {
    call: (_method, [request]) =>
      broker.call(owner, request, (frame) => {
        for (const fn of listeners) fn(frame);
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
}
const states = {},
  connections = [];
const connect = (p, key) =>
  connectRoom({
    bridge: p === a ? nativeBridge : undefined,
    session:
      p === a && nativeBridge
        ? nativeBridge.session
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
  leader.action({ type: "lobby" });
  await wait(() => states[a.name].state.phase === "lobby", "lobby");
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
  ca.steer({ x: 0, y: -1, dash: true });
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
    "PASS: authenticated peers, mixed seats, realtime sync, human steering, pause, automatic seats, Orbit Rally shared selection/motion/dash, live scores for both games, host migration."
  );
} finally {
  for (const c of connections) c.close();
  server.close();
  db.close();
  await rm(dir, { recursive: true, force: true });
}
process.exit(0);
