// Four authenticated clients against the real PureServer, in a disposable workspace.
import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { connectRoom } from "../src/lib/shared.mjs";
import { dialogueFor, nearestPorch } from "../src/lib/halloween.mjs";
const root = process.argv[2];
if (!root) throw Error("Pass the PureServer checkout path.");
const load = (path) => import(pathToFileURL(join(root, path)).href);
const { openDb } = await load("src/db.ts");
const { addTester } = await load("src/people.ts");
const { createSession } = await load("src/auth.ts");
const { workspaceFor } = await load("src/teams.ts");
const { createCollab } = await load("src/collab.ts");
const { WebSocket } = await load("node_modules/ws/wrapper.mjs");
const dir = await mkdtemp(join(tmpdir(), "gourd-coop-")),
  db = openDb(join(dir, "check.sqlite"));
const people = Array.from({ length: 4 }, (_, i) =>
  addTester(db, {
    organisation: "Gourd test",
    name: `Witness ${i + 1}`,
    key: String(i + 1).repeat(64),
  })
);
const workspace = await workspaceFor(db, dir, people[0]);
const path = "/Workspace/Games/haunted.puregames";
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
    session: {
      url,
      token: createSession(db, people[i], String(i + 1).repeat(64), 1).token,
      user: { id: people[i].id, name: people[i].name },
    },
    saved: { game: "halloween" },
    name: "Gourd Street check",
    write: (text) => workspace.write(path, text),
    onChange: (v) => {
      states[i] = v;
    },
    WebSocketImpl: WebSocket,
  });
try {
  clients.push(open(0));
  await wait(() => states[0]?.state, "seed");
  for (let i = 1; i < 4; i++) clients.push(open(i));
  await wait(
    () =>
      states.every(
        (v) => v.connected && v.peers.size === 4 && v.state?.seats.length === 4
      ),
    "four players join"
  );
  clients[1].action({ type: "start" });
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert.equal(states[0].state.phase, "lobby", "guest cannot start");
  clients[0].action({ type: "start" });
  await wait(
    () => states.every((v) => v.state.phase === "playing" && !v.state.paused),
    "host starts"
  );
  const start = structuredClone(states[0].state.board.players);
  const move = setInterval(
    () =>
      clients.forEach((c, i) =>
        c.steer({ forward: i % 2 ? -1 : 1, strafe: i < 2 ? -1 : 1 })
      ),
    60
  );
  try {
    await wait(
      () =>
        states.every((v) =>
          v.state.board.players.every(
            (p, i) => Math.hypot(p.x - start[i].x, p.z - start[i].z) > 0.5
          )
        ),
      "all four cameras move through the transport"
    );
  } finally {
    clearInterval(move);
    clients.forEach((c) => c.steer({}));
  }
  // Camera turning, input expiry and perspective-specific actions are replicated.
  clients[3].action({ type: "look", delta: 0.3 });
  await wait(
    () => states[0].state.board.players[3].yaw > 0.25,
    "fourth player look"
  );
  const go = setInterval(() => {
    for (const i of [0, 1]) {
      const b = states[i].state.board,
        seat = states[i].state.seats.findIndex((p) => p.id === states[i].id);
      const porch = nearestPorch(b, seat);
      clients[i].action({ type: "orient" });
      clients[i].steer({ forward: porch.distance > 2.35 ? 1 : 0 });
    }
  }, 120);
  try {
    await wait(
      () =>
        [0, 1].every((i) => {
          const v = states[i];
          return (
            nearestPorch(
              v.state.board,
              v.state.seats.findIndex((p) => p.id === v.id)
            )?.distance < 2.5
          );
        }),
      "two players reach the same threshold"
    );
  } finally {
    clearInterval(go);
    clients.forEach((c) => c.steer({}));
  }
  clients[0].action({ type: "interact" });
  await wait(() => dialogueFor(states[1].state.board, 0), "first conversation");
  const z = states[0].state.board.players[2].z;
  const walk = setInterval(() => clients[2].steer({ forward: 1 }), 70);
  try {
    await wait(
      () => states[0].state.board.players[2].z > z + 0.5,
      "other player moves during conversation"
    );
  } finally {
    clearInterval(walk);
    clients[2].steer({});
  }
  clients[1].action({ type: "interact" });
  await wait(
    () => dialogueFor(states[0].state.board, 1),
    "second independent conversation"
  );
  clients[0].action({ type: "choice", choice: 0 });
  clients[1].action({ type: "choice", choice: 1 });
  await wait(
    () =>
      [0, 1].every(
        (i) => dialogueFor(states[0].state.board, i)?.choice !== null
      ),
    "both replies"
  );
  clients[0].action({ type: "continue" });
  clients[1].action({ type: "continue" });
  await wait(
    () =>
      states.every(
        (v) =>
          v.state.board.visited.length === 1 &&
          !dialogueFor(v.state.board, 0) &&
          !dialogueFor(v.state.board, 1)
      ),
    "shared relic"
  );
  assert.equal(states[0].state.board.players[0].score, 5);
  assert.equal(states[0].state.board.players[1].score, 5);
  clients[0].action({ type: "pause" });
  await wait(() => states.every((v) => v.state.paused), "shared pause");
  assert.deepEqual(states[0].state, states[3].state);
  const old = states[0].id;
  clients[0].close();
  await wait(
    () =>
      states[1].peers.size === 3 &&
      states[1].host !== old &&
      states[1].state.paused,
    "host migration"
  );
  clients[0] = open(0);
  await wait(
    () =>
      states.every(
        (v) => v.connected && v.peers.size === 4 && v.state.seats.length === 4
      ) && states[0].state.seats[0].id === states[0].id,
    "account recovers its seat"
  );
  assert.notEqual(states[0].id, old);
  assert.equal(states[0].state.board.visited.length, 1);
  assert.equal(states[0].state.board.players[0].score, 5);
  const departed = states[3].id;
  clients[3].close();
  await wait(() => states[0].peers.size === 3, "departed guest");
  clients[0].action({ type: "lobby" });
  await wait(() => states[0].state.phase === "lobby", "recover lobby");
  clients[0].action({ type: "remove", id: departed });
  await wait(
    () => states[0].state.seats.length === 3,
    "host removes departed seat"
  );
  clients[0].action({ type: "start" });
  await wait(
    () =>
      states[0].state.phase === "playing" &&
      states[0].state.board.players.length === 3,
    "remaining players restart"
  );
  console.log(
    "PASS: four authenticated humans, host-only start, independent movement/turning, two conversations at one door, other players keep moving, shared relic once, pause, coordinator migration and reconnect without duplicate seats or lost progress; host can remove a departed player and restart."
  );
} finally {
  clients.forEach((c) => c.close());
  server.close();
  db.close();
  await rm(dir, { recursive: true, force: true });
}
process.exit(0);
