import { createStreetAudio } from "./halloween-audio.mjs";
import { HalloweenScene as Scene } from "./HalloweenScene.jsx";
import React, { useEffect, useRef, useState } from "react";
import {
  NEIGHBOURS,
  nearestPorch,
  newHalloween,
  normalAngle,
  dialogueFor,
  watcherDistance,
} from "./lib/halloween.mjs";

function GhostMark() {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle
        cx="20"
        cy="20"
        r="14"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="31 6"
      />
      <path
        d="M20 3v34M8 20h24M20 10l8 10-8 10-8-10 8-10Z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <circle cx="20" cy="20" r="3" fill="currentColor" />
    </svg>
  );
}
function NeighbourPortrait({ kind }) {
  const marks = {
    vampire: "M30 14v36m-8-8h16m-8-12h11",
    witch: "M16 46l14-30 14 30H16m8-10h12",
    wolf: "M16 18l14 30 14-30M22 30h16",
    mummy: "M15 20h30M18 30h24M15 40h30M30 14v36",
    ghost: "M18 44V25a12 12 0 0124 0v19M24 27v8m12-8v8",
    skeleton: "M18 18l24 24m0-24L18 42M30 13v35",
  };
  return (
    <svg viewBox="0 0 60 60" className="boo-portrait" aria-hidden="true">
      <circle
        cx="30"
        cy="30"
        r="26"
        fill="none"
        stroke="currentColor"
        strokeWidth=".7"
        opacity=".4"
      />
      <path
        d={marks[kind]}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}
export function HalloweenPreview() {
  const [board] = useState(newHalloween);
  return (
    <div className="boo-preview">
      <Scene board={board} preview balanced />
      <div className="boo-preview-title">
        <span>WELCOME TO GOURD STREET</span>
        <b>Gourd Street</b>
        <small>The lights are still on.</small>
      </div>
      <span className="boo-preview-sticker">
        STAY IN THE LIGHT.
        <br />
        STAY TOGETHER.
      </span>
    </div>
  );
}
export function HalloweenArena({
  board,
  seat = 0,
  seats = [],
  peers = new Map(),
  remote = false,
  code = "",
  connected = true,
  hostControls = true,
  ready = true,
  onJoin,
  onInvite,
  onLobby,
  paused,
  lobby,
  onAction,
  onSteer,
  onPause,
  onPlay,
}) {
  const stage = useRef(null),
    held = useRef(new Set()),
    drag = useRef(null),
    callbacks = useRef({ onAction, onSteer, onPause }),
    audio = useRef(null),
    soundscape = useRef(null),
    [help, setHelp] = useState(false),
    [lobbyConfirm, setLobbyConfirm] = useState(false),
    [sound, setSound] = useState(false),
    [balanced, setBalanced] = useState(false);
  const viewSeat = Math.max(0, seat),
    dialogue = dialogueFor(board, viewSeat);
  callbacks.current = { onAction, onSteer, onPause };
  const active = seat >= 0 && connected && !paused && !lobby && !board.done,
    walking = active && !dialogue && !board.players[viewSeat].escaped,
    controls = useRef({ active, walking });
  controls.current = { active, walking };
  const neighbour =
      nearestPorch(board, viewSeat) ||
      (board.visited.length === 6
        ? {
            name: "The gate",
            x: 0,
            z: -5.5,
            distance: Math.hypot(
              board.players[viewSeat].x,
              board.players[viewSeat].z + 5.5
            ),
            exit: true,
          }
        : null),
    resident = dialogue ? NEIGHBOURS[dialogue.id] : null,
    answered = dialogue?.choice !== null;
  const angle = neighbour
    ? normalAngle(
        Math.atan2(
          neighbour.x - board.players[viewSeat].x,
          neighbour.z - board.players[viewSeat].z
        ) - board.players[viewSeat].yaw
      )
    : 0;
  useEffect(() => {
    stage.current?.focus({ preventScroll: true });
    return () =>
      callbacks.current.onSteer({ forward: 0, strafe: 0, turn: 0 }, 0);
  }, []);
  useEffect(() => {
    const send = () => {
      const k = held.current;
      callbacks.current.onSteer(
        controls.current.walking
          ? {
              forward:
                Number(k.has("w") || k.has("ArrowUp")) -
                Number(k.has("s") || k.has("ArrowDown")),
              strafe: Number(k.has("d")) - Number(k.has("a")),
              turn: Number(k.has("ArrowRight")) - Number(k.has("ArrowLeft")),
              run: k.has("Shift"),
            }
          : { forward: 0, strafe: 0, turn: 0 },
        0
      );
    };
    const timer = setInterval(send, 50),
      clear = () => {
        held.current.clear();
        send();
      };
    window.addEventListener("blur", clear);
    window.addEventListener("pointerup", clear);
    send();
    return () => {
      clearInterval(timer);
      window.removeEventListener("blur", clear);
      window.removeEventListener("pointerup", clear);
      held.current.clear();
    };
  }, []);
  useEffect(() => {
    if (!walking) held.current.clear();
  }, [walking]);
  useEffect(() => {
    if (sound && resident) soundscape.current?.knock();
  }, [resident?.name, sound]);
  const distance = watcherDistance(board, viewSeat);
  useEffect(() => {
    soundscape.current?.set(
      sound && active && !document.hidden,
      Math.max(0, 1 - distance / 10)
    );
  }, [sound, active, distance]);
  const lastFootstep = useRef({ x: 0, z: -4, at: 0, caughtAt: -1 });
  useEffect(() => {
    const p = board.players[viewSeat],
      last = lastFootstep.current;
    if (
      sound &&
      active &&
      !document.hidden &&
      walking &&
      Math.hypot(p.x - last.x, p.z - last.z) > 0.12 &&
      board.ticks - last.at > 3
    ) {
      soundscape.current?.step();
      lastFootstep.current = { ...last, x: p.x, z: p.z, at: board.ticks };
    }
    if (p.caughtAt !== undefined && p.caughtAt !== last.caughtAt) {
      if (sound && active) soundscape.current?.caught();
      lastFootstep.current.caughtAt = p.caughtAt;
    }
  }, [board.ticks, sound, active, walking, viewSeat]);
  useEffect(() => {
    const visibility = () => {
      if (document.hidden) soundscape.current?.set(false);
    };
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  useEffect(
    () => () => {
      void audio.current?.close();
    },
    []
  );
  const focus = () => stage.current?.focus({ preventScroll: true });
  const action = (a) => {
    onAction(a);
    held.current.clear();
  };
  const keyDown = (e) => {
    if (
      e.ctrlKey ||
      e.metaKey ||
      e.altKey ||
      /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)
    )
      return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (
      [
        "w",
        "a",
        "s",
        "d",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Shift",
      ].includes(k)
    ) {
      e.preventDefault();
      if (walking) held.current.add(k);
    }
    if (!e.repeat && k === "e" && walking) {
      e.preventDefault();
      action({ type: "interact" });
    }
    if (!e.repeat && k === "p" && !board.done) {
      e.preventDefault();
      onPause();
      held.current.clear();
    }
    if (!e.repeat && dialogue && active && ["1", "2", "3"].includes(k)) {
      e.preventDefault();
      action({ type: "choice", choice: Number(k) - 1 });
    }
  };
  const moveButton = (key, label, symbol) => (
    <button
      type="button"
      aria-label={label}
      disabled={!walking}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        held.current.add(key);
        focus();
      }}
      onPointerUp={() => held.current.delete(key)}
      onPointerCancel={() => held.current.delete(key)}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          held.current.add(key);
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") held.current.delete(key);
      }}
      onBlur={() => held.current.delete(key)}
    >
      {symbol}
    </button>
  );
  return (
    <section className="boo-game">
      <div className="boo-stage-header">
        <div>
          <span className="boo-eyebrow">SIX DOORS. ONE WAY OUT.</span>
          <h1>
            Gourd Street{" "}
            <span className="boo-little-ghost">
              <GhostMark />
            </span>
          </h1>
        </div>
        <div className="boo-header-actions">
          <button
            type="button"
            aria-pressed={balanced}
            onClick={() => setBalanced((v) => !v)}
          >
            Graphics: {balanced ? "Balanced" : "High"}
          </button>
          {onInvite && (
            <button
              type="button"
              onClick={onInvite}
              disabled={remote && !lobby}
            >
              {remote ? "Invite friends" : "Play with friends"}
            </button>
          )}
          {remote && hostControls && !lobby && (
            <button
              type="button"
              onClick={() => {
                if (!paused) onPause();
                setLobbyConfirm(true);
              }}
            >
              Players
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setHelp((v) => !v);
              held.current.clear();
            }}
            aria-expanded={help}
          >
            {help ? "Hide controls" : "How to play"}
          </button>
          <button
            type="button"
            aria-pressed={sound}
            onClick={() => {
              if (!sound) {
                const Context =
                  window.AudioContext || window.webkitAudioContext;
                if (Context) {
                  audio.current ??= new Context();
                  soundscape.current ??= createStreetAudio(audio.current);
                  void audio.current.resume();
                  setSound(true);
                }
              } else setSound(false);
            }}
          >
            Sound {sound ? "on" : "off"}
          </button>
          <button
            type="button"
            onClick={() => {
              onPause();
              held.current.clear();
            }}
            disabled={
              board.done || lobby || seat < 0 || (paused && !hostControls)
            }
          >
            {paused ? "Resume" : "Pause"}
          </button>
        </div>
      </div>
      {help && (
        <div className="boo-help">
          <b>The street is watching.</b> Recover what was left at six doors,
          then escape through the gate. W/S or ↑/↓ walk; A/D sidestep; ←/→ turn.
          Drag the scene to look around. E knocks at a nearby door. Listen to
          the residents. Keep the watcher in your light to drive it back;
          porches are safe. If it catches you, you return to the gate with your
          evidence intact. P pauses. The small movement buttons work too.
          Headphones recommended. Sound starts only when you enable it.
        </div>
      )}
      <div
        className={`halloween-stage ${
          watcherDistance(board, viewSeat) < 7 ? "boo-danger" : ""
        }`}
        ref={stage}
        tabIndex={0}
        aria-label="Gourd Street game controls"
        onKeyDown={keyDown}
        onKeyUp={(e) => {
          held.current.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
        }}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) held.current.clear();
        }}
        onPointerDown={(e) => {
          if (e.target.tagName === "CANVAS" && walking) {
            focus();
            drag.current = { id: e.pointerId, x: e.clientX };
            e.currentTarget.setPointerCapture(e.pointerId);
          }
        }}
        onPointerMove={(e) => {
          if (drag.current?.id === e.pointerId && walking) {
            const dx = e.clientX - drag.current.x;
            drag.current.x = e.clientX;
            onAction({ type: "look", delta: dx * 0.004 });
          }
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <Scene
          board={board}
          seat={seat}
          names={seats.map((p) => p.name)}
          balanced={balanced}
        />
        {board.visited.length > 0 && !board.done && (
          <div className="boo-threat" role="status">
            {board.players[viewSeat].escaped
              ? "You reached the gate. Waiting for the others."
              : board.visited.length === 6
              ? "The gate is open. Get everyone back to the entrance."
              : board.ticks - (board.players[viewSeat].caughtAt ?? -1000) < 65
              ? "It found you. The relics are safe. Get back to the others."
              : watcherDistance(board, viewSeat) < 7
              ? "Something is close. Face it. Keep it in your light."
              : "Stay in the light. Keep each other in sight."}
          </div>
        )}
        <div className="boo-hud">
          <div className="boo-street-label">
            <span className="boo-live-dot" /> GOURD STREET{" "}
            <small>October 31 · 00:13</small>
          </div>
          <div className="boo-treats">
            <span>{board.players[viewSeat].score}</span> resolve
          </div>
        </div>
        {remote && (
          <div
            className="boo-party"
            aria-label="Players on Gourd Street"
            role="status"
          >
            <span>{connected ? "LIVE CO-OP" : "Reconnecting…"}</span>
            {seats.map((p, i) => (
              <b
                key={p.id}
                style={{
                  "--ghost-colour": [
                    "#f9bc73",
                    "#95d6d3",
                    "#c6a4ec",
                    "#ed9cab",
                  ][i],
                }}
              >
                <span aria-hidden="true">●</span> {p.name}
                {i === seat ? " (you)" : ""}
                {board.players[i]?.escaped ? " · escaped" : ""}
                {!peers.has(p.id) ? " · disconnected" : ""}
              </b>
            ))}
          </div>
        )}
        <aside className="boo-passport" aria-label="Recovered relics">
          <span className="boo-eyebrow">
            {board.visited.length === 6
              ? "RETURN TO THE GATE"
              : "RECOVER THE SIX RELICS"}
          </span>
          <div className="boo-stamps">
            {NEIGHBOURS.map((n, i) => (
              <span
                key={n.name}
                className={board.visited.includes(i) ? "visited" : ""}
                title={`${n.name}${
                  board.visited.includes(i) ? " · visited" : ""
                }`}
              >
                {board.visited.includes(i)
                  ? "✓"
                  : String(i + 1).padStart(2, "0")}
              </span>
            ))}
          </div>
          <p>
            {board.visited.length} of 6 doors sealed{" "}
            <span>· {board.collected.length}/5 lost echoes</span>
          </p>
        </aside>
        {walking && neighbour && (
          <div className="boo-compass">
            <button
              type="button"
              onClick={() => {
                action({ type: "orient" });
                focus();
              }}
              title="Turn toward the closest unvisited porch"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                style={{ transform: `rotate(${angle}rad)` }}
              >
                <path d="m12 3 7 16-7-4-7 4Z" fill="currentColor" />
              </svg>
              <span>
                <b>{neighbour.name}</b>
                <small>
                  {neighbour.exit
                    ? "Everyone must reach the entrance · click to face it"
                    : neighbour.distance < 2.65
                    ? "The threshold is safe"
                    : `${Math.ceil(
                        neighbour.distance
                      )} steps away · click to face the porch`}
                </small>
              </span>
            </button>
          </div>
        )}
        {walking && (
          <>
            <div className="boo-movement" aria-label="Movement controls">
              <div>
                {moveButton("ArrowLeft", "Turn left", "↶")}
                {moveButton("w", "Walk forward", "↑")}
                {moveButton("ArrowRight", "Turn right", "↷")}
              </div>
              <div>
                {moveButton("a", "Sidestep left", "←")}
                {moveButton("s", "Walk backwards", "↓")}
                {moveButton("d", "Sidestep right", "→")}
              </div>
            </div>
            <div className="boo-interact">
              <button
                type="button"
                disabled={
                  !neighbour || neighbour.exit || neighbour.distance > 2.65
                }
                onClick={() => action({ type: "interact" })}
              >
                <kbd>E</kbd>{" "}
                {neighbour?.exit
                  ? "Return to the gate"
                  : neighbour?.distance <= 2.65
                  ? "Knock on the door"
                  : "Find a lit threshold"}
              </button>
              <small>WASD to walk · ← → to turn · drag to look</small>
            </div>
            <div className="boo-crosshair" aria-hidden="true" />
          </>
        )}
        {resident && active && (
          <div
            className="boo-conversation"
            role="dialog"
            aria-modal="true"
            aria-label={`Conversation with ${resident.name}`}
          >
            <div className="boo-resident">
              <span className="boo-resident-icon">
                <NeighbourPortrait kind={resident.kind} />
              </span>
              <div>
                <span className="boo-eyebrow">BEHIND THE DOOR</span>
                <h2>{resident.name}</h2>
              </div>
              <span className="boo-house-number">No. {dialogue.id + 1}</span>
            </div>
            <p className="boo-quote">
              “
              {answered ? resident.replies[dialogue.choice] : resident.question}
              ”
            </p>
            {answered ? (
              <>
                <div className="boo-reward">
                  <span>+5 resolve</span>
                  <b>{resident.candy}</b>
                </div>
                <button
                  type="button"
                  className="boo-primary"
                  autoFocus
                  onClick={() => {
                    action({ type: "continue" });
                    requestAnimationFrame(focus);
                  }}
                >
                  {board.visited.length === 5
                    ? "Break the seal →"
                    : "Take the relic →"}
                </button>
              </>
            ) : (
              <div className="boo-choices">
                {resident.options.map((option, i) => (
                  <button
                    type="button"
                    key={option}
                    autoFocus={i === 0}
                    onClick={() => action({ type: "choice", choice: i })}
                  >
                    <span>{i + 1}</span>
                    {option}
                    <b>↗</b>
                  </button>
                ))}
              </div>
            )}
            <small className="boo-no-pressure">
              The porch light holds it back. For now.
            </small>
          </div>
        )}
        {lobbyConfirm && (
          <div className="boo-shade">
            <div
              className="boo-pause"
              role="dialog"
              aria-modal="true"
              aria-label="Return to lobby"
            >
              <h2>Return to the lobby?</h2>
              <p>
                This ends the current round. Your players stay together; the
                next round starts with no relics.
              </p>
              <button
                type="button"
                className="boo-primary"
                onClick={() => {
                  setLobbyConfirm(false);
                  onLobby();
                }}
              >
                Return to lobby
              </button>
              <button type="button" onClick={() => setLobbyConfirm(false)}>
                Keep this round
              </button>
            </div>
          </div>
        )}
        {(paused || lobby) && !board.done && !lobbyConfirm && (
          <div className="boo-shade">
            <div className="boo-pause">
              <GhostMark />
              <span className="boo-eyebrow">DO NOT ANSWER THE VOICES</span>
              <h2>
                {lobby ? "The lights are still on." : "The street is waiting."}
              </h2>
              <p>
                {remote
                  ? "Up to four witnesses. Six relics. Nobody gets left behind."
                  : "Six houses have appeared where there was an empty road. Something is moving between them."}
              </p>
              {remote && (
                <div className="boo-lobby-players">
                  {seats.map((p, i) => (
                    <div key={p.id}>
                      <span>{String(i + 1).padStart(2, "0")}</span>
                      <b>{p.name}</b>
                      <small>
                        {peers.has(p.id) ? "Ready" : "Disconnected"}
                      </small>
                    </div>
                  ))}
                  {code && (
                    <p>
                      Friends can choose Join game and enter{" "}
                      <strong>{code}</strong> on the same PureServer.
                    </p>
                  )}
                  {lobby && seat < 0 && (
                    <button
                      type="button"
                      className="boo-primary"
                      onClick={onJoin}
                      disabled={seats.length >= 4}
                    >
                      Join the group
                    </button>
                  )}
                  {lobby && onInvite && (
                    <button
                      type="button"
                      onClick={onInvite}
                      disabled={seats.length >= 4}
                    >
                      Invite a friend · {seats.length}/4 players
                    </button>
                  )}
                </div>
              )}
              <button
                type="button"
                className="boo-primary"
                disabled={!hostControls || !ready || !connected}
                onClick={() => {
                  lobby ? onPlay() : onPause();
                  focus();
                }}
              >
                {!hostControls
                  ? "Waiting for the host"
                  : lobby
                  ? "Enter Gourd Street"
                  : "Back to Gourd Street"}
              </button>
            </div>
          </div>
        )}
        {board.done && (
          <div className="boo-shade boo-finish">
            <div className="boo-ending">
              <GhostMark />
              <span className="boo-eyebrow">THE GATE REMEMBERS</span>
              <h2>
                Six doors.
                <br />
                Six relics.
                <br />
                <em>You made it out.</em>
              </h2>
              <p>
                The street has released you.{" "}
                {board.players.reduce((sum, p) => sum + p.score, 0)} resolve
                {board.players.length > 1 ? " together" : ""}.
                <br />
                You can still hear a telephone ringing.
              </p>
              <div className="boo-haul">
                {board.sweets.map((c, i) => (
                  <span key={`${c}-${i}`}>{c}</span>
                ))}
              </div>
              <p className="boo-end-note">
                {board.collected.length === 5
                  ? "Every lost echo recovered. Nothing was left behind."
                  : "Some echoes remain in the street. They will wait for someone else."}
              </p>
              <button
                type="button"
                className="boo-primary"
                disabled={!hostControls || !connected}
                onClick={() => {
                  onPlay();
                  focus();
                }}
              >
                {hostControls
                  ? "Return to the street →"
                  : "Waiting for the host to start again"}
              </button>
            </div>
          </div>
        )}
      </div>
      <footer className="boo-footer">
        <span>Keep it in the light.</span>
        <span>1–4 players · Atmospheric horror · Headphones recommended</span>
      </footer>
    </section>
  );
}
