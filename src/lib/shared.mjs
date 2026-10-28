import { sessionSummary } from "./session-summary.mjs";
import { remoteSocket } from "./bridge-socket.mjs";
import * as Y from "yjs";
import * as sync from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { createRoom, command, advance, pauseForDisconnect } from "./room.mjs";

// Uses PureServer's existing authenticated, workspace-scoped collaboration protocol.
// No game service or credentials live in the app. Peers are trusted collaborators,
// not adversarial clients; the elected coordinator validates all normal UI commands.
export function connectRoom({
  session,
  bridge,
  saved,
  name,
  write,
  onChange,
  WebSocketImpl = WebSocket,
}) {
  const doc = new Y.Doc(),
    map = doc.getMap("puregames"),
    actions = doc.getMap("actions"),
    inputs = doc.getMap("inputs");
  const awareness = new awarenessProtocol.Awareness(doc),
    id = String(doc.clientID);
  const me = {
    id,
    userId: session.user.id,
    name: session.user.name || "Player",
    bot: false,
  };
  let ws,
    closed = false,
    ready = false,
    retry,
    sequence = 0,
    disposed = false,
    lastJoin = 0,
    lastSave = 0,
    savePending = false,
    saveError = "",
    hostBefore,
    lastSummary = "";
  const seen = new Map();
  const peers = () =>
    new Map(
      [...awareness.getStates()]
        .filter(([, p]) => p.player)
        .map(([key, p]) => [String(key), p.player])
    );
  const host = () => {
    const present = peers();
    // Keep the table's first human in charge while present. An invited peer
    // must not silently take the Play button just because its random ID is lower.
    const owner = map.get("state")?.seats.find((p) => !p.bot)?.id;
    return present.has(owner)
      ? owner
      : [...present.keys()].sort((a, b) => Number(a) - Number(b))[0];
  };
  const snapshot = () => map.get("state");
  const notify = () =>
    !disposed &&
    onChange({
      state: snapshot(),
      id,
      host: host(),
      peers: peers(),
      connected: ready,
      error: saveError,
    });
  const send = (data) => {
    if (ws?.readyState === 1) ws.send(data);
  };
  const frame = (kind, fn) => {
    const e = encoding.createEncoder();
    encoding.writeVarUint(e, kind);
    fn(e);
    send(encoding.toUint8Array(e));
  };
  doc.on("update", (update, origin) => {
    if (origin !== "remote") frame(0, (e) => sync.writeUpdate(e, update));
    notify();
  });
  awareness.on("update", ({ added, updated, removed }, origin) => {
    if (origin !== "remote" && ready)
      frame(1, (e) =>
        encoding.writeVarUint8Array(
          e,
          awarenessProtocol.encodeAwarenessUpdate(awareness, [
            ...added,
            ...updated,
            ...removed,
          ])
        )
      );
    notify();
  });
  awareness.setLocalState(null);
  const persist = async () => {
    if (!ready || host() !== id || savePending || !snapshot()) return;
    savePending = true;
    try {
      await write(
        JSON.stringify({
          format: "puregames-room",
          version: 1,
          state: snapshot(),
        })
      );
      saveError = "";
    } catch {
      saveError = "The game is live, but its checkpoint could not be saved.";
    } finally {
      savePending = false;
      notify();
    }
  };
  function connect() {
    ws = new (
      session.url === "pure-desktop-remote:"
        ? remoteSocket(bridge)
        : WebSocketImpl
    )(session.url, ["pure-collab", session.token]);
    ws.binaryType = "arraybuffer";
    ws.onopen = () => frame(0, (e) => sync.writeSyncStep1(e, doc));
    ws.onmessage = (event) => {
      try {
        if (typeof event.data === "string") {
          const m = JSON.parse(event.data);
          if (m.type === "refused") {
            saveError = m.message;
            ready = false;
            closed = true;
            notify();
          }
          // Seed the protocol marker, not editor text. The game itself lives in its own Y.Map.
          if (m.type === "seed" && !map.has("state")) {
            doc.transact(() => {
              map.set(
                "state",
                saved?.state
                  ? { ...saved.state, paused: true }
                  : createRoom(name, me, saved?.game)
              );
              doc
                .getXmlFragment("prosemirror")
                .insert(0, [new Y.XmlElement("puregames")]);
            });
          }
          return;
        }
        const d = decoding.createDecoder(new Uint8Array(event.data)),
          kind = decoding.readVarUint(d);
        if (kind === 0) {
          const e = encoding.createEncoder();
          encoding.writeVarUint(e, 0);
          const type = sync.readSyncMessage(d, e, doc, "remote");
          if (encoding.length(e) > 1) send(encoding.toUint8Array(e));
          if (type === sync.messageYjsSyncStep2 && !ready) {
            ready = true;
            saveError = "";
            awareness.setLocalState({ player: me });
            notify();
          }
        } else if (kind === 1)
          awarenessProtocol.applyAwarenessUpdate(
            awareness,
            decoding.readVarUint8Array(d),
            "remote"
          );
      } catch {
        saveError =
          "The game sent an unreadable update. Reconnect to try again.";
        notify();
      }
    };
    ws.onclose = () => {
      ready = false;
      awarenessProtocol.removeAwarenessStates(
        awareness,
        [...awareness.getStates().keys()],
        "remote"
      );
      // A new socket receives a fresh presence snapshot. Forget remote clocks
      // as well as states so unchanged peers are accepted immediately, rather
      // than disappearing until their next periodic awareness heartbeat.
      for (const clientId of awareness.meta.keys())
        if (clientId !== doc.clientID) awareness.meta.delete(clientId);
      notify();
      if (!closed) retry = setTimeout(connect, 1500);
    };
    ws.onerror = () => {
      saveError = "Connection interrupted. Reconnecting…";
      notify();
    };
  }
  const timer = setInterval(() => {
    if (!ready || !snapshot()) return;
    if (
      !snapshot().ended &&
      !snapshot().seats.some((p) => p.id === id) &&
      Date.now() - lastJoin > 1000
    ) {
      lastJoin = Date.now();
      actions.set(id, {
        seq: ++sequence,
        round: snapshot().round,
        action: { type: "join" },
      });
    }
    const leader = host();
    if (leader !== id) {
      hostBefore = leader;
      return;
    }
    let s = snapshot();
    if (hostBefore !== leader) {
      s = { ...s, paused: true, revision: s.revision + 1 };
      hostBefore = leader;
    }
    s = pauseForDisconnect(s, peers());
    for (const [who, request] of actions.entries()) {
      if (seen.get(who) === request.seq) continue;
      seen.set(who, request.seq);
      if (peers().has(who) && request.round === s.round)
        s = command(s, who, request.action, id, peers());
      // The coordinator removes acknowledged commands, so a successor cannot replay them.
      actions.delete(who);
    }
    const now = Date.now();
    {
      const directions = {};
      for (const [who, request] of inputs.entries())
        if (
          request.round === s.round &&
          request.tick >= (s.board?.tick ?? s.board?.ticks ?? 0) - 3
        )
          directions[who] = request.direction;
      s = advance(s, directions);
    }
    if (s !== snapshot()) map.set("state", s);
    const summary = sessionSummary(s, peers());
    const encoded = JSON.stringify(summary);
    if (encoded !== lastSummary) {
      lastSummary = encoded;
      doc.getMap("session").set("summary", summary);
    }
    if (now - lastSave > 2000) {
      lastSave = now;
      void persist();
    }
  }, 100);
  connect();
  return {
    reconnect() {
      if (disposed) return;
      closed = false;
      saveError = "";
      clearTimeout(retry);
      // Keep the Y.Doc and player identity so a retry cannot leave a duplicate seat.
      if (ws?.readyState === 3) connect();
      else ws?.close();
    },
    action(action) {
      if (ready && snapshot()) {
        const pending = actions.get(id);
        if (
          action.type === "look" &&
          pending?.round === snapshot().round &&
          pending.action.type === "look"
        )
          action = {
            ...action,
            delta: (pending.action.delta || 0) + action.delta,
          };
        actions.set(id, {
          seq: ++sequence,
          round: snapshot().round,
          action: { ...action, revision: snapshot().revision },
        });
      }
    },
    steer(direction) {
      if (ready && snapshot()?.phase === "playing")
        inputs.set(id, {
          round: snapshot().round,
          tick: snapshot().board.tick ?? snapshot().board.ticks ?? 0,
          direction,
        });
    },
    close() {
      if (disposed) return;
      disposed = true;
      closed = true;
      clearTimeout(retry);
      clearInterval(timer);
      void persist();
      awareness.setLocalState(null);
      ws?.close();
      awareness.destroy();
      doc.destroy();
    },
  };
}
