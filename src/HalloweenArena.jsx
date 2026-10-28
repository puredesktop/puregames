import React, { useEffect, useRef, useState } from "react";
import {
  NEIGHBOURS,
  nearestPorch,
  newHalloween,
  normalAngle,
} from "./lib/halloween.mjs";
import {
  renderHalloween,
  cameraBetween,
  paintNeighbour,
} from "./halloween-render.mjs";

function GhostMark() {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path
        d="M7 33V18a13 13 0 0 1 26 0v15l-6-4-7 4-7-4-6 4Z"
        fill="currentColor"
      />
      <ellipse cx="16" cy="18" rx="2" ry="3" fill="#333149" />
      <ellipse cx="25" cy="18" rx="2" ry="3" fill="#333149" />
      <path
        d="M18 25q4 3 7-1"
        stroke="#333149"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
function NeighbourPortrait({ kind }) {
  const canvas = useRef(null);
  useEffect(() => {
    const c = canvas.current?.getContext("2d");
    if (c) paintNeighbour(c, kind, 112, 128);
  }, [kind]);
  return (
    <canvas
      ref={canvas}
      width="112"
      height="128"
      className="boo-portrait"
      aria-hidden="true"
    />
  );
}
function Scene({ board, preview = false }) {
  const canvas = useRef(null),
    latest = useRef(board),
    before = useRef(board.players[0]),
    changed = useRef(performance.now());
  useEffect(() => {
    before.current = latest.current.players[0];
    latest.current = board;
    changed.current = performance.now();
  }, [board]);
  useEffect(() => {
    const node = canvas.current,
      c = node.getContext("2d");
    if (!c) return;
    let w = 1,
      h = 1,
      raf;
    const resize = () => {
      const r = node.getBoundingClientRect(),
        dpr = Math.min(1.5, window.devicePixelRatio || 1);
      w = r.width;
      h = r.height;
      node.width = Math.round(w * dpr);
      node.height = Math.round(h * dpr);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    resize();
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const frame = (t) => {
      const b = latest.current;
      renderHalloween(
        c,
        b,
        w,
        h,
        reduced ? 0 : t,
        cameraBetween(
          before.current,
          b.players[0],
          Math.min(1, (performance.now() - changed.current) / 100)
        )
      );
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);
  return (
    <canvas
      ref={canvas}
      className="boo-canvas"
      role="img"
      aria-label={
        preview
          ? "Boo, Please! A cosy first-person Halloween street, with glowing porches and a pumpkin candy bucket."
          : "First-person view of Gourd Street. Use the movement controls and porch compass to visit six friendly monsters."
      }
    />
  );
}
export function HalloweenPreview() {
  const [board] = useState(newHalloween);
  return (
    <div className="boo-preview">
      <Scene board={board} preview />
      <div className="boo-preview-title">
        <span>WELCOME TO GOURD STREET</span>
        <b>Boo, Please!</b>
        <small>A very polite Halloween.</small>
      </div>
      <span className="boo-preview-sticker">
        ALL TREATS.
        <br />
        NO TERROR.
      </span>
    </div>
  );
}
export function HalloweenArena({
  board,
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
    [help, setHelp] = useState(false),
    [sound, setSound] = useState(false);
  callbacks.current = { onAction, onSteer, onPause };
  const active = !paused && !lobby && !board.done,
    walking = active && !board.dialogue,
    controls = useRef({ active, walking });
  controls.current = { active, walking };
  const neighbour = nearestPorch(board),
    resident = board.dialogue ? NEIGHBOURS[board.dialogue.id] : null,
    answered = board.dialogue?.choice !== null;
  const angle = neighbour
    ? normalAngle(
        Math.atan2(
          neighbour.x - board.players[0].x,
          neighbour.z - board.players[0].z
        ) - board.players[0].yaw
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
    if (!sound || !resident || !audio.current) return;
    const ctx = audio.current;
    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator(),
        gain = ctx.createGain(),
        t = ctx.currentTime + i * 0.16;
      osc.type = "sine";
      osc.frequency.value = [659, 523][i];
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.06, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.55);
    }
  }, [resident, sound]);
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
    if (!e.repeat && board.dialogue && active && ["1", "2", "3"].includes(k)) {
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
          <span className="boo-eyebrow">A VERY POLITE HALLOWEEN</span>
          <h1>
            Boo, Please!{" "}
            <span className="boo-little-ghost">
              <GhostMark />
            </span>
          </h1>
        </div>
        <div className="boo-header-actions">
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
            disabled={board.done || lobby}
          >
            {paused ? "Resume" : "Pause"}
          </button>
        </div>
      </div>
      {help && (
        <div className="boo-help">
          <b>A night of questionable jokes.</b> Visit every glowing porch. W/S
          or ↑/↓ walk; A/D sidestep; ←/→ turn. Drag the scene to look around. E
          rings a nearby doorbell. Choose any reply for a treat. P pauses. The
          small movement buttons work too. No timer, no wrong answers, no jump
          scares.
        </div>
      )}
      <div
        className="halloween-stage"
        ref={stage}
        tabIndex={0}
        aria-label="Boo, Please! game controls"
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
        <Scene board={board} />
        <div className="boo-hud">
          <div className="boo-street-label">
            <span className="boo-live-dot" /> GOURD STREET{" "}
            <small>October 31 · just after dusk</small>
          </div>
          <div className="boo-treats">
            <span>{board.players[0].score}</span> treats in your bucket
          </div>
        </div>
        <aside className="boo-passport" aria-label="Neighbour visits">
          <span className="boo-eyebrow">THE NEIGHBOURHOOD ROUND</span>
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
            {board.visited.length} of 6 porches visited{" "}
            <span>· {board.collected.length}/5 bonus sweets</span>
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
                  {neighbour.distance < 2.65
                    ? "You’re at the porch"
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
                disabled={!neighbour || neighbour.distance > 2.65}
                onClick={() => action({ type: "interact" })}
              >
                <kbd>E</kbd>{" "}
                {neighbour?.distance <= 2.65
                  ? "Ring doorbell"
                  : "Find a glowing porch"}
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
                <span className="boo-eyebrow">YOUR NEIGHBOUR</span>
                <h2>{resident.name}</h2>
              </div>
              <span className="boo-house-number">
                No. {board.dialogue.id + 1}
              </span>
            </div>
            <p className="boo-quote">
              “
              {answered
                ? resident.replies[board.dialogue.choice]
                : resident.question}
              ”
            </p>
            {answered ? (
              <>
                <div className="boo-reward">
                  <span>+5 treats</span>
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
                    ? "The best night ever →"
                    : "Thanks, neighbour! →"}
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
              No wrong answers. They’re just happy you came.
            </small>
          </div>
        )}
        {(paused || lobby) && !board.done && (
          <div className="boo-shade">
            <div className="boo-pause">
              <GhostMark />
              <span className="boo-eyebrow">THE NEIGHBOURS CAN WAIT</span>
              <h2>
                {lobby ? "Your bucket awaits." : "Taking a little breather."}
              </h2>
              <p>Not even the werewolf is in a hurry.</p>
              <button
                type="button"
                className="boo-primary"
                onClick={() => {
                  lobby ? onPlay() : onPause();
                  focus();
                }}
              >
                {lobby ? "Let’s trick-or-treat" : "Back to Gourd Street"}
              </button>
            </div>
          </div>
        )}
        {board.done && (
          <div className="boo-shade boo-finish">
            <div className="boo-ending">
              <GhostMark />
              <span className="boo-eyebrow">
                OFFICIALLY, VERY MILDLY SPOOKY
              </span>
              <h2>
                You came.
                <br />
                You saw.
                <br />
                <em>You said boo.</em>
              </h2>
              <p>
                Six new friends. {board.players[0].score} treats.
                <br />
                One werewolf who really needed that compliment.
              </p>
              <div className="boo-haul">
                {board.sweets.map((c) => (
                  <span key={c}>{c}</span>
                ))}
              </div>
              <p className="boo-end-note">
                {board.collected.length === 5
                  ? "You even found every bonus sweet. Impeccable snack work."
                  : "The street has five bonus sweets. There’s always room for another stroll."}
              </p>
              <button
                type="button"
                className="boo-primary"
                onClick={() => {
                  onPlay();
                  focus();
                }}
              >
                Another little Halloween →
              </button>
            </div>
          </div>
        )}
      </div>
      <footer className="boo-footer">
        <span>All treats. No terror.</span>
        <span>Solo · No timer · Made for a little smile</span>
      </footer>
    </section>
  );
}
