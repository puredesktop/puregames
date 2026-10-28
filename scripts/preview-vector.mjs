// Opt-in development harness: never included in the compiled app. All accounts are disposable.
import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { createServer as createVite } from "vite";
const root = process.argv[2];
if (!root) throw Error("Pass the PureServer checkout path.");
const load = (path) => import(pathToFileURL(join(root, path)).href);
const { openDb } = await load("src/db.ts"),
  { addTester } = await load("src/people.ts"),
  { createSession } = await load("src/auth.ts"),
  { workspaceFor } = await load("src/teams.ts"),
  { createCollab } = await load("src/collab.ts");
const dir = await mkdtemp(join(tmpdir(), "vector-preview-")),
  db = openDb(join(dir, "test.sqlite"));
const people = [1, 2, 3, 4].map((i) =>
  addTester(db, {
    organisation: "Temporary Vector Wake test",
    name: `Pilot ${i}`,
    key: String(i).repeat(64),
  })
);
const workspace = await workspaceFor(db, dir, people[0]),
  path = "/Workspace/Games/vector-preview.puregames";
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
const sessions = people.map((p, i) => ({
  url,
  token: createSession(db, p, String(i + 1).repeat(64), 1).token,
  user: { id: p.id, name: p.name },
}));
const vite = await createVite({
  root: fileURLToPath(new URL("../", import.meta.url)),
  server: { host: "127.0.0.1", port: 7197, strictPort: true },
  plugins: [
    {
      name: "temporary-vector-fixture",
      configureServer(v) {
        v.middlewares.use("/__vector/session", (req, res) => {
          const i = new URL(req.url, "http://127.0.0.1").searchParams.get(
            "player"
          );
          if (!/^[0-3]$/.test(i || "")) {
            res.statusCode = 400;
            res.end();
            return;
          }
          res.setHeader("Cache-Control", "no-store");
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(sessions[Number(i)]));
        });
      },
    },
  ],
});
await vite.listen();
console.log("Local co-op preview: http://127.0.0.1:7197/qa-vector.html");
const close = async () => {
  await vite.close();
  server.closeAllConnections();
  server.close();
  db.close();
  await rm(dir, { recursive: true, force: true });
  process.exit(0);
};
process.once("SIGINT", close);
process.once("SIGTERM", close);
