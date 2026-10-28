// Development-only entry, excluded from the production build.
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { HalloweenArena } from "../src/HalloweenArena.jsx";
import { newHalloween } from "../src/lib/halloween.mjs";
import { connectRoom } from "../src/lib/shared.mjs";
import "../src/halloween.css";
function Check() {
  const [who, setWho] = useState("0"),
    [view, setView] = useState(null),
    [error, setError] = useState("");
  const connection = useRef(null);
  useEffect(() => () => connection.current?.close(), []);
  const connect = async () => {
    try {
      const response = await fetch(`/__halloween/session?player=${who}`);
      if (!response.ok)
        throw Error(
          "Start scripts/preview-halloween.mjs with the PureServer checkout."
        );
      const session = await response.json();
      connection.current?.close();
      connection.current = connectRoom({
        session,
        name: "Local horror check",
        saved: { game: "halloween" },
        write: async () => {},
        onChange: setView,
      });
    } catch (e) {
      setError(e.message);
    }
  };
  const s = view?.state,
    host = view?.id === view?.host;
  return (
    <main
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#101b20",
        color: "#b9cbbb",
        fontFamily: "system-ui",
      }}
    >
      <div
        style={{
          padding: "10px 18px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          fontSize: 11,
        }}
      >
        <b>LOCAL MULTIPLAYER TEST</b>
        <span>Temporary server · no real accounts or data</span>
        {!view?.connected ? (
          <>
            <select
              aria-label="Test player"
              value={who}
              onChange={(e) => setWho(e.target.value)}
            >
              {[0, 1, 2, 3].map((i) => (
                <option key={i} value={i}>
                  Witness {i + 1}
                </option>
              ))}
            </select>
            <button onClick={connect}>Connect</button>
          </>
        ) : (
          <>
            <span>{view.peers.size} connected</span>
            <button
              onClick={() => {
                connection.current.close();
                setView(null);
              }}
            >
              Disconnect
            </button>
          </>
        )}
        {error && <span role="alert">{error}</span>}
      </div>
      {s && (
        <button
          style={{ position: "absolute", right: 20, top: 10, fontSize: 10 }}
          onClick={() => {
            const canvas = document.querySelector(".boo-canvas");
            canvas
              ?.getContext("webgl2")
              ?.getExtension("WEBGL_lose_context")
              ?.loseContext();
          }}
        >
          Test graphics fallback
        </button>
      )}
      {s && (
        <HalloweenArena
          board={s.board || newHalloween(Math.max(1, s.seats.length))}
          seat={s.seats.findIndex((p) => p.id === view.id)}
          seats={s.seats}
          peers={view.peers}
          remote
          code="LOCAL TEST"
          connected={view.connected}
          hostControls={host}
          ready={s.seats.every((p) => view.peers.has(p.id))}
          paused={s.paused}
          lobby={s.phase === "lobby"}
          onAction={(a) => connection.current.action(a)}
          onSteer={(d) => connection.current.steer(d)}
          onPause={() =>
            connection.current.action({ type: s.paused ? "resume" : "pause" })
          }
          onPlay={() =>
            connection.current.action({
              type: s.phase === "finished" ? "rematch" : "start",
            })
          }
          onJoin={() => connection.current.action({ type: "join" })}
          onLobby={() => connection.current.action({ type: "lobby" })}
        />
      )}
    </main>
  );
}
createRoot(document.getElementById("root")).render(<Check />);
