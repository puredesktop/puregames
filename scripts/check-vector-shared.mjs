// Four authenticated clients against the real PureServer, in a disposable workspace.
import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { connectRoom } from "../src/lib/shared.mjs";
import { targetFor, sub, length, clamp } from "../src/lib/vector-wake.mjs";
const root = process.argv[2];
if (!root) throw Error("Pass the PureServer checkout path.");
const load = (path) => import(pathToFileURL(join(root, path)).href);
const { openDb } = await load("src/db.ts");
const { addTester } = await load("src/people.ts");
const { createSession } = await load("src/auth.ts");
const { workspaceFor } = await load("src/teams.ts");
const { createCollab } = await load("src/collab.ts");
const { WebSocket } = await load("node_modules/ws/wrapper.mjs");
const dir = await mkdtemp(join(tmpdir(), "vector-coop-")),
  db = openDb(join(dir, "check.sqlite"));
const people = Array.from({ length: 4 }, (_, i) =>
  addTester(db, {
    organisation: "Vector test",
    name: `Pilot ${i + 1}`,
    key: String(i + 1).repeat(64),
  })
);
const workspace = await workspaceFor(db, dir, people[0]);
const path = "/Workspace/Games/vector.puregames";
await workspace.write(
  path,
  JSON.stringify({ format: "puregames-room", version: 1 })
);
const collab = createCollab({ db, dataDir: dir }),
  server = createServer();
server.on("upgrade", (req, socket, head) =>
  collab.handleUpgrade(req, socket, head)
);
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const url = `ws://127.0.0.1:${
  server.address().port
}/v1/collab?path=${encodeURIComponent(path)}&mode=edit`;
const nativeBridges = new Map();
if (process.argv[3]) {
  const { createRemoteCollab } = await import(
    pathToFileURL(process.argv[3]).href
  );
  for (let i = 0; i < people.length; i++) {
    const person = people[i],
      listeners = new Set();
    const token = createSession(db, person, String(i + 1).repeat(64), 1).token;
    const broker = createRemoteCollab({
      state: async () => ({
        server: url.replace("ws:", "http:").split("/v1/")[0],
        person: { id: person.id, name: person.name },
        organisation: { name: "Vector test" },
      }),
      token: async () => token,
      request: async (_server, _path, body) =>
        body ? { result: await workspace.readText(path) } : {},
    });
    const owner = { owner: 1, tabId: `vector-${i}`, appSlug: "puregames" };
    const bridge = {
      call: (_method, [request]) =>
        broker.call(owner, structuredClone(request), (frame) => {
          for (const fn of listeners) fn(structuredClone(frame));
        }),
      onEvent: (_event, fn) => {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
    };
    nativeBridges.set(i, {
      bridge,
      session: await bridge.call("collab.remote", [{ op: "join", path }]),
    });
  }
}
const states = [],
  clients = [];
const wait = async (check, label, timeout = 12000) => {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
  throw Error(
    `Timed out: ${label}; ${JSON.stringify(
      states.map((v) => ({
        id: v?.id,
        host: v?.host,
        error: v?.error,
        seats: v?.state?.seats.length,
        phase: v?.state?.phase,
      }))
    )}`
  );
};
const open = (i) =>
  connectRoom({
    bridge: nativeBridges.get(i)?.bridge,
    session: nativeBridges.get(i)?.session ?? {
      url,
      token: createSession(db, people[i], String(i + 1).repeat(64), 1).token,
      user: { id: people[i].id, name: people[i].name },
    },
    saved: { game: "vector" },
    name: "Vector Wake check",
    write: (text) => workspace.write(path, text),
    onChange: (v) => {
      states[i] = v;
    },
    WebSocketImpl: WebSocket,
  });
let guide;
try {
  clients.push(open(0));
  await wait(() => states[0]?.state, "seed");
  for (let i = 1; i < 4; i++) clients.push(open(i));
  await wait(
    () =>
      states.length === 4 &&
      states.every(
        (v) => v.connected && v.peers.size === 4 && v.state?.seats.length === 4
      ),
    "four authenticated pilots"
  );
  clients[1].action({ type: "start" });
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(states[0].state.phase, "lobby");
  clients[0].action({ type: "start" });
  await wait(
    () => states.every((v) => v.state.phase === "playing" && !v.state.paused),
    "wing launch"
  );
  const steer = setInterval(
    () =>
      clients.forEach((c, i) =>
        c.steer({ turn: i % 2 ? 1 : -1, pitch: i < 2 ? 1 : -1, fire: true })
      ),
    60
  );
  try {
    await wait(
      () =>
        states.every((v) => v.state.board.players.every((p) => p.fired >= 4)),
      "independent cannons"
    );
    assert.ok(
      states[0].state.board.players[0].yaw < 0 &&
        states[0].state.board.players[1].yaw > 0
    );
    assert.ok(
      states[0].state.board.players[0].pitch > 0 &&
        states[0].state.board.players[2].pitch < 0
    );
    await wait(
      () => states[0].state.board.players[0].pitch > 1.8,
      "pitch crosses former stop through live transport"
    );
  } finally {
    clearInterval(steer);
    clients.forEach((c) => c.steer({}));
  }
  clients[2].action({ type: "pause" });
  await wait(() => states.every((v) => v.state.paused), "any pilot may pause");
  states.forEach((v) => assert.deepEqual(v.state, states[0].state));
  const old = states[0].id,
    before = structuredClone(states[0].state.board);
  clients[0].close();
  await wait(
    () =>
      states[1].peers.size === 3 &&
      states[1].host !== old &&
      states[1].state.paused,
    "coordinator migration"
  );
  clients[0] = open(0);
  await wait(
    () =>
      states.every(
        (v) => v.connected && v.peers.size === 4 && v.state.seats.length === 4
      ) && states[0].state.seats[0].id === states[0].id,
    "account seat recovery"
  );
  assert.deepEqual(
    states[0].state.board,
    before,
    "rejoining must preserve the whole mission"
  );
  const leader = () =>
    clients[states.findIndex((v) => v.id === states[0].host)];
  leader().action({ type: "lobby" });
  await wait(
    () => states.every((v) => v.state.phase === "lobby"),
    "shared reset"
  );
  leader().action({ type: "start" });
  await wait(
    () => states.every((v) => v.state.phase === "playing" && !v.state.paused),
    "fresh mission"
  );
  const cooling = [false, false, false, false];
  guide = setInterval(
    () =>
      clients.forEach((client, i) => {
        const view = states[i],
          b = view.state.board,
          index = view.state.seats.findIndex((p) => p.id === view.id),
          p = b.players[index];
        if (!p.alive) {
          client.steer({});
          return;
        }
        const t = targetFor(b, p);
        if (!t) {
          client.steer({});
          return;
        }
        const d = sub(t.enemy, p),
          yaw = Math.atan2(d.x, -d.z),
          pitch = Math.asin(d.y / length(d));
        const turn = Math.atan2(Math.sin(yaw - p.yaw), Math.cos(yaw - p.yaw));
        const lift = Math.atan2(
          Math.sin(pitch - p.pitch),
          Math.cos(pitch - p.pitch)
        );
        if (p.heat > 78) cooling[i] = true;
        if (p.heat < 20) cooling[i] = false;
        client.steer({
          turn: clamp(turn * 4, -1, 1),
          pitch: clamp(lift * 4, -1, 1),
          brake: t.distance < 300,
          boost: t.distance > 1500,
          fire: t.angle < 0.11 && !cooling[i],
          missile: p.lockTime >= 1.1,
        });
      }),
    60
  );
  await wait(
    () => states.every((v) => v.state.phase === "finished"),
    "all three live sectors",
    150000
  );
  clearInterval(guide);
  guide = null;
  states.forEach((v) => assert.deepEqual(v.state.board, states[0].state.board));
  const result = states[0].state.board;
  assert.ok(
    result.victory,
    `mission ended at wave ${result.wave}, kills ${result.kills}`
  );
  assert.deepEqual(result.winners, [0, 1, 2, 3]);
  assert.equal(result.kills, 34);
  assert.ok(result.players.every((p) => p.score > 0 && p.fired > 0));
  console.log(
    JSON.stringify(
      {
        test: "Four authenticated pilots through real PureServer",
        transport: process.argv[3] ? "desktop adapter" : "websocket",
        victory: result.victory,
        sectors: result.wave,
        targets: result.kills,
        seconds: result.time,
        pilots: result.players.map((p) => ({
          score: p.score,
          hull: p.hull,
          shield: p.shield,
          fired: p.fired,
        })),
        checks: [
          "host-only launch",
          "independent controls and cannons",
          "full pitch loop",
          "shared pause",
          "coordinator migration",
          "same-account seat recovery",
          "mission retained",
          "shared reset",
          "complete three-sector mission",
        ],
      },
      null,
      2
    )
  );
} finally {
  clearInterval(guide);
  clients.forEach((c) => c.close());
  server.close();
  db.close();
  await rm(dir, { recursive: true, force: true });
}
process.exit(0);
