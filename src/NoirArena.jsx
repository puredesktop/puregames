import { makeEyesAssets, renderEyes } from "./noir-eyes.mjs";
import React, { useEffect, useRef, useState } from "react";
import {
  NOIR_LIMIT,
  clueText,
  nearestInteractable,
  objective,
} from "./lib/noir.mjs";
import { SAFE, distance, COATS, MARKS } from "./lib/noir-world.mjs";
import { paintCity, renderNoir } from "./noir-render.mjs";
export function NoirArena({
  board,
  seats,
  paused,
  lobby,
  id,
  remote,
  onAction,
  onSteer,
}) {
  const [casebook, setCasebook] = useState(false),
    [viewMode, setViewMode] = useState("follow"),
    canvas = useRef(null),
    stage = useRef(null),
    latest = useRef(null),
    prev = useRef(board),
    lastBoard = useRef(board),
    changed = useRef(performance.now()),
    held = useRef(new Set()),
    keyTimes = useRef(new Map()),
    releases = useRef(new Map()),
    callbacks = useRef({ onAction, onSteer });
  const own = remote ? seats.findIndex((p) => p.id === id) : 0,
    me = board.players[Math.max(0, own)],
    active = !lobby && !paused && !board.done && own >= 0;
  callbacks.current = { onAction, onSteer };
  latest.current = { board, seats, own, viewMode };
  useEffect(() => {
    prev.current = lastBoard.current;
    lastBoard.current = board;
    changed.current = performance.now();
  }, [board]);
  useEffect(() => {
    const node = canvas.current;
    if (!node) return;
    const city = document.createElement("canvas");
    city.width = 1800;
    city.height = 1400;
    paintCity(city.getContext("2d"));
    const eyesAssets = makeEyesAssets();
    const context = node.getContext("2d"),
      view = { x: 450, y: 800, width: 1, height: 1, scale: 1 };
    const resize = () => {
      const box = node.getBoundingClientRect(),
        dpr = Math.min(2, window.devicePixelRatio || 1);
      node.width = box.width * dpr;
      node.height = box.height * dpr;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      view.width = box.width;
      view.height = box.height;
      view.scale = box.width < 550 ? 0.75 : 0.95;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    resize();
    let raf;
    const frame = (t) => {
      const s = latest.current;
      view.mode = s.viewMode;
      if (s.viewMode === "eyes")
        renderEyes(
          context,
          eyesAssets,
          s.board,
          s.seats,
          s.own,
          view,
          t,
          prev.current,
          Math.min(1, (performance.now() - changed.current) / 100)
        );
      else
        renderNoir(
          context,
          city,
          s.board,
          s.seats,
          s.own,
          view,
          t,
          prev.current,
          Math.min(1, (performance.now() - changed.current) / 100)
        );
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);
  useEffect(() => {
    const root = stage.current,
      keys = held.current;
    const send = () => {
      const arrows = {
        x: (keys.has("ArrowRight") ? 1 : 0) - (keys.has("ArrowLeft") ? 1 : 0),
        y: (keys.has("ArrowDown") ? 1 : 0) - (keys.has("ArrowUp") ? 1 : 0),
        run: keys.has("Shift"),
      };
      const wasd = {
        x: (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0),
        y: (keys.has("s") ? 1 : 0) - (keys.has("w") ? 1 : 0),
        run: keys.has("Shift"),
      };
      const two = !remote && seats.filter((p) => !p.bot).length > 1;
      callbacks.current.onSteer(
        active
          ? latest.current.viewMode === "eyes"
            ? {
                view: "eyes",
                turn: arrows.x,
                forward: -arrows.y - (two ? 0 : wasd.y),
                strafe: two ? 0 : wasd.x,
                run: arrows.run,
              }
            : {
                x: arrows.x + (two ? 0 : wasd.x),
                y: arrows.y + (two ? 0 : wasd.y),
                run: arrows.run,
              }
          : { x: 0, y: 0 },
        0
      );
      if (two) callbacks.current.onSteer(active ? wasd : { x: 0, y: 0 }, 1);
    };
    const down = (e) => {
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)
      )
        return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (
        [
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "w",
          "a",
          "s",
          "d",
          "Shift",
        ].includes(key)
      ) {
        if (!keys.has(key)) keyTimes.current.set(key, performance.now());
        clearTimeout(releases.current.get(key));
        keys.add(key);
        e.preventDefault();
        send();
      }
      if (key === "e" && !e.repeat && active) {
        e.preventDefault();
        callbacks.current.onAction({ type: "interact" });
      }
      if (
        key === "f" &&
        !e.repeat &&
        active &&
        !remote &&
        seats.filter((p) => !p.bot).length > 1
      ) {
        e.preventDefault();
        callbacks.current.onAction(
          { type: "interact" },
          seats.filter((p) => !p.bot)[1].id
        );
      }
      if (key === "v" && !e.repeat) {
        setViewMode((v) =>
          v === "follow" ? "bird" : v === "bird" ? "eyes" : "follow"
        );
        e.preventDefault();
      }
      if (key === "c" && !e.repeat) {
        setCasebook((v) => !v);
        e.preventDefault();
      }
    };
    const up = (e) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const release = () => {
        keys.delete(key);
        send();
      };
      const remaining =
        120 - (performance.now() - (keyTimes.current.get(key) || 0));
      if (remaining > 0)
        releases.current.set(key, setTimeout(release, remaining));
      else release();
    };
    const clear = () => {
      keys.clear();
      send();
    };
    root.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    const timer = setInterval(send, 50);
    return () => {
      clearInterval(timer);
      root.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
      keys.clear();
      for (const timer of releases.current.values()) clearTimeout(timer);
      releases.current.clear();
      callbacks.current.onSteer({ x: 0, y: 0 }, 0);
      callbacks.current.onSteer({ x: 0, y: 0 }, 1);
    };
  }, [active, remote, seats.filter((p) => !p.bot).length]);
  const lead = objective(board, me),
    courier = board.couriers[board.target];
  const near = nearestInteractable(board, me),
    remaining = Math.max(0, Math.ceil((NOIR_LIMIT - board.tick) / 10)),
    exitDistance = Math.round(distance(me, SAFE));
  const interact = () => {
    if (active) onAction({ type: "interact" });
    stage.current?.focus();
  };
  return (
    <section
      ref={stage}
      className={`noir-arena arena-wrap ${me.heat > 40 ? "exposed" : ""}`}
      tabIndex={0}
      aria-label="The Ninth Bell. Arrow keys or WASD to walk. Shift to run. E to inspect or speak. C for evidence."
      onPointerDown={() => stage.current?.focus()}
    >
      <canvas
        ref={canvas}
        className="noir-canvas"
        aria-label="Live rain-soaked city with moving investigators, couriers and searchlight patrols"
      />
      <header className="noir-live-header">
        <div>
          <span>BLACKWATER / OPERATION 09</span>
          <h2>The Ninth Bell</h2>
        </div>
        <div className="noir-clock">
          <b>
            {board.arena === "islands"
              ? "AFTER HOURS"
              : `${Math.floor(remaining / 60)}:${String(
                  remaining % 60
                ).padStart(2, "0")}`}
          </b>
          <span>
            {board.arena === "islands"
              ? "NO DEADLINE"
              : "UNTIL THE LINE GOES DEAD"}
          </span>
        </div>
      </header>
      <div className="noir-mission">
        <span>
          {board.phase === "extract"
            ? "3 / GET YOUR TEAM HOME"
            : board.fragments.length < 3
            ? "1 / RECOVER THREE CLUES"
            : "2 / IDENTIFY THE COURIER"}
        </span>
        <strong>
          {lead
            ? `${lead.name} · ${Math.round(distance(me, lead))}m`
            : `${COATS[courier.coat].name} coat · ${MARKS[courier.mark]}`}
        </strong>
        <p>
          {board.phase === "extract"
            ? "Follow the amber marker. Everyone must reach the telephone."
            : board.fragments.length < 3
            ? "Follow the amber marker. Get close, press E, then stay still."
            : "Find someone who matches BOTH clues. Get close and press E."}
        </p>
        <div className="noir-fragments">
          {["COAT", "MARK", "COUNTERSIGN"].map((label, i) => (
            <span
              key={label}
              className={board.fragments.includes(i) ? "known" : ""}
            >
              {board.fragments.includes(i) ? "✓" : "○"} {label}
            </span>
          ))}
        </div>
      </div>
      <nav className="noir-view-switch" aria-label="Camera perspective">
        {[
          ["follow", "Follow"],
          ["bird", "Bird’s-eye"],
          ["eyes", "Through your eyes"],
        ].map(([key, label]) => (
          <button
            key={key}
            aria-pressed={viewMode === key}
            onClick={() => {
              setViewMode(key);
              stage.current?.focus();
            }}
          >
            {label}
          </button>
        ))}
        <kbd>V</kbd>
      </nav>
      <div className="noir-telemetry">
        <div>
          <span>EXPOSURE</span>
          <meter min="0" max="100" value={me.heat} />
        </div>
        <div>
          <span>STAMINA</span>
          <meter min="0" max="100" value={me.stamina} />
        </div>
        <span className="noir-strikes">{board.strikes} / 3 interceptions</span>
      </div>
      <button
        className="noir-book-toggle"
        aria-expanded={casebook}
        onClick={() => setCasebook((v) => !v)}
      >
        Evidence <kbd>C</kbd>
        <span>{board.fragments.length}/3</span>
      </button>
      {casebook && (
        <aside className="noir-casebook">
          <div>
            <span>THE INTERCEPT</span>
            <button
              aria-label="Close evidence"
              onClick={() => setCasebook(false)}
            >
              ×
            </button>
          </div>
          <h3>Someone in this city is carrying proof.</h3>
          <p>
            Search the marked dead drops. The carrier's coat and distinguishing
            mark are separate clues: one alone can lead you to the wrong person.
          </p>
          {[0, 1, 2].map((kind) => (
            <article key={kind}>
              <span>{["THE COAT", "THE MARK", "THE COUNTERSIGN"][kind]}</span>
              <p>
                {board.fragments.includes(kind)
                  ? clueText(board, kind)
                  : "Still missing. Search the city."}
              </p>
            </article>
          ))}
          <p className="noir-book-tip">
            Searchlights build exposure. Break away before the meter fills.
            Shift runs while stamina lasts. After contact, every human
            investigator must reach the southern telephone.
          </p>
          <div className="noir-live-score">
            <b>{board.teamScore}</b> team points
          </div>
        </aside>
      )}
      <div className="noir-radio" role="status">
        <span>ON THE WIRE</span>
        <p>{board.notice}</p>
      </div>
      {active && (
        <div className="noir-interaction">
          {me.search !== null ? (
            <span>
              Searching… {Math.round((me.progress / 22) * 100)}% · stay still
            </span>
          ) : near ? (
            <button
              onClick={interact}
              disabled={
                near.type === "safe" ||
                (near.type === "courier" && board.fragments.length < 3)
              }
            >
              <kbd>E</kbd>
              {near.label}
            </button>
          ) : (
            <span>
              {viewMode === "eyes" ? (
                <>
                  <kbd>← →</kbd> Turn <kbd>↑ ↓</kbd> Walk
                </>
              ) : (
                <>
                  <kbd>↑ ← ↓ →</kbd> Walk
                </>
              )}{" "}
              <kbd>Shift</kbd> Run <kbd>E</kbd> Interact
            </span>
          )}
        </div>
      )}
      {(lobby || paused || board.done) && (
        <div className="noir-curtain">
          <div>
            <span className="noir-eyebrow">
              {board.done
                ? "END OF TRANSMISSION"
                : lobby
                ? "A LIVE COOPERATIVE THRILLER"
                : "THE CITY IS WAITING"}
            </span>
            <h2>
              {board.done
                ? board.outcome === "solved"
                  ? "You broke the silence."
                  : "Lost in the rain."
                : lobby
                ? "Keep to the shadows."
                : "Investigation paused."}
            </h2>
            <p>
              {board.done
                ? board.notice
                : lobby
                ? "Find three clues in the marked dead drops. Match the coat AND distinguishing mark to a moving courier. Speak to them with E, then bring your team back to the telephone. Avoid the searchlights."
                : "Resume below when your team is ready."}
            </p>
            {board.done ? (
              <b className="noir-end-score">{board.teamScore} team points</b>
            ) : (
              lobby && (
                <div className="noir-intro-keys">
                  <span>
                    <kbd>↑ ← ↓ →</kbd> or WASD — move
                  </span>
                  <span>
                    <kbd>Shift</kbd> run <kbd>E</kbd> investigate
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </section>
  );
}
