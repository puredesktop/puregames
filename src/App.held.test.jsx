// @vitest-environment happy-dom
// Run from this folder with the workspace's vitest: this app's own `npm test` is node --test, for src/lib only.
import React, { act } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => []);
const HELD = { tabId: "held:1", name: "the conversation", heldInRoom: true };
const ROOM = "/Workspace/Games/ABCDEF12.puregames";

vi.mock("@purescience/platform-bridge/components/AppFrame", () => ({
  AppFrame: ({ children, identityAppSlug: _slug, ...rest }) => (
    <div data-frame="" {...rest}>
      {children}
    </div>
  ),
}));
vi.mock("@purescience/platform-bridge/client", () => ({
  bridge: {
    waitForReady: async () => ({ viewport: { resource: { path: ROOM } }, methods: ["collab.remote"] }),
    getMeta: () => ({ methods: ["collab.remote"] }),
    onEvent: () => () => undefined,
    call: async (method, args) => {
      calls.push([method, args?.[0]]);
      if (method === "workspace.adjacentApp") return HELD;
      if (method === "collab.remote" && args?.[0]?.op === "status") return { connected: true, signedIn: true };
      if (method === "collab.remote") return { content: "", entries: [] };
      return null;
    },
  },
}));
vi.mock("@purescience/platform-ui/bridge/client", async () => ({
  bridge: (await import("@purescience/platform-bridge/client")).bridge,
}));
vi.mock("./VectorArena.jsx", () => ({ VectorArena: () => <div data-arena="vector" />, VectorPreview: () => null }));
vi.mock("./HalloweenArena.jsx", () => ({ HalloweenArena: () => null }));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const settle = () => act(async () => { for (let i = 0; i < 8; i++) await new Promise((r) => setTimeout(r, 0)); });
const real = { parent: Object.getOwnPropertyDescriptor(window, "parent"), top: Object.getOwnPropertyDescriptor(window, "top") };

async function open() {
  vi.resetModules();
  document.body.innerHTML = '<div id="root"></div>';
  const top = {};
  Object.defineProperty(window, "top", { configurable: true, value: top });
  Object.defineProperty(window, "parent", { configurable: true, value: top });
  await act(async () => { await import("./main.jsx"); });
  await settle();
}

beforeEach(() => {
  calls.length = 0;
});
afterEach(() => {
  if (real.parent) Object.defineProperty(window, "parent", real.parent);
  if (real.top) Object.defineProperty(window, "top", real.top);
});

const joined = () => calls.filter(([method, request]) => method === "collab.join" || method === "fs.write" || (method === "collab.remote" && request?.op !== "status"));

it("held, it joins no team game on its own, even when opened on one, and writes nothing", async () => {
  await open();
  expect(joined()).toEqual([]);
});

it("held, it offers the games in a short list, not the whole library", async () => {
  await open();
  const frame = document.querySelector("[data-compact-room]");
  expect(frame).toBeTruthy();
  expect(document.querySelector(".games-library")).toBeNull();
  expect([...document.querySelectorAll(".games-held button")].map((b) => b.textContent).join(" ")).toContain("Letterlight");
});

it("picking a game there plays the game itself in the frame", async () => {
  await open();
  const row = [...document.querySelectorAll(".games-held button")].find((b) => b.textContent.includes("Vector Wake"));
  await act(async () => { row.click(); });
  await settle();
  expect(document.querySelector('[data-arena="vector"]')).toBeTruthy();
  expect(document.querySelector(".games-held")).toBeNull();
});

it("has no style that can apply with compact off: every selector starts from the compact frame", () => {
  const rules = readFileSync(join(process.cwd(), "src/compact-in-room.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const selectors = [...rules.matchAll(/([^{}]+)\{/g)].flatMap((m) => m[1].split(",")).map((s) => s.trim());
  expect(selectors.length).toBeGreaterThan(3);
  for (const selector of selectors) expect(selector).toMatch(/^(\[data-compact-room\]|html\[data-held-in-room\]:has\(\[data-compact-room\]\))/);
});
