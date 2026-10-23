import React, { useEffect, useRef, useState } from "react";
import {
  newTether,
  stepTether,
  closestCargo,
  gap,
  HOOK_RANGE,
  TETHER_LIMIT,
  TETHER_DOCK,
  TETHER_TARGET,
  TETHER_COLOURS,
  CARGO_NAMES,
  tideAt,
} from "./lib/tether.mjs";
import { paintTetherBackdrop, renderTether } from "./tether-render.mjs";

function useTetherCanvas(canvas, board, own, mode = "yard") {
  const current = useRef({ board, own, mode }),
    previous = useRef(board),
    last = useRef(board),
    changed = useRef(performance.now());
  current.current = { board, own, mode };
  useEffect(() => {
    previous.current = last.current;
    last.current = board;
    changed.current = performance.now();
  }, [board]);
  useEffect(() => {
    const node = canvas.current;
    if (!node) return;
    const c = node.getContext("2d"),
      backdrop = document.createElement("canvas");
    backdrop.width = 1120;
    backdrop.height = 720;
    paintTetherBackdrop(backdrop.getContext("2d"));
    let width = 1,
      height = 1,
      dpr = 1,
      raf;
    const resize = () => {
      const box = node.getBoundingClientRect();
      width = box.width;
      height = box.height;
      dpr = Math.min(2, devicePixelRatio || 1);
      node.width = width * dpr;
      node.height = height * dpr;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    resize();
    let cameraX = 560,
      cameraY = 360;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const draw = (t) => {
      if (width < 1 || height < 1) {
        raf = requestAnimationFrame(draw);
        return;
      }
      const s = current.current,
        pilot = s.mode === "pilot",
        scale = pilot
          ? Math.max(width / 1120, height / 720)
          : Math.min(width / 1120, height / 720),
        vw = width / scale,
        vh = height / scale,
        me = s.board.players[Math.max(0, s.own)],
        load = s.board.cargo.find((q) => q.id === me.hook && !q.delivered),
        aimX = load ? (me.x + load.x) / 2 : me.x,
        aimY = load ? (me.y + load.y) / 2 : me.y;
      cameraX +=
        (pilot ? clamp(aimX, vw / 2, 1120 - vw / 2) - cameraX : 560 - cameraX) *
        0.1;
      cameraY +=
        (pilot ? clamp(aimY, vh / 2, 720 - vh / 2) - cameraY : 360 - cameraY) *
        0.1;
      const left = pilot ? cameraX - vw / 2 : (1120 - vw) / 2,
        top = pilot ? cameraY - vh / 2 : (720 - vh) / 2;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.fillStyle = "#172d47";
      c.fillRect(0, 0, width, height);
      c.translate(-left * scale, -top * scale);
      c.scale(scale, scale);
      renderTether(
        c,
        backdrop,
        s.board,
        previous.current,
        Math.min(1, (performance.now() - changed.current) / 100),
        t,
        s.own
      );
      if (pilot) {
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        const target = load ? TETHER_DOCK : closestCargo(s.board, me);
        if (target) {
          const tx = (target.x - left) * scale,
            ty = (target.y - top) * scale;
          if (tx < 22 || tx > width - 22 || ty < 22 || ty > height - 22) {
            const x = clamp(tx, 65, width - 65),
              y = clamp(ty, 23, height - 38);
            c.save();
            c.translate(x, y);
            c.rotate(Math.atan2(ty - height / 2, tx - width / 2));
            c.beginPath();
            c.moveTo(10, 0);
            c.lineTo(-5, -6);
            c.lineTo(-5, 6);
            c.closePath();
            c.fillStyle = "#ffe0a3";
            c.fill();
            c.restore();
            c.font = "600 11px system-ui";
            c.textAlign = "center";
            c.fillStyle = "#fff0c7";
            c.fillText(load ? "RECOVERY" : "CARGO", x, y + 19);
          }
        }
        const mw = width < 600 ? 100 : 130,
          mh = (mw * 720) / 1120,
          mx = width - mw - 12,
          my = height - mh - 12;
        c.fillStyle = "#152d46e8";
        c.fillRect(mx, my, mw, mh);
        c.strokeStyle = "#8ba2ad66";
        c.lineWidth = 1;
        c.strokeRect(mx, my, mw, mh);
        const point = (p, r, colour) => {
          c.fillStyle = colour;
          c.beginPath();
          c.arc(
            mx + (p.x / 1120) * mw,
            my + (p.y / 720) * mh,
            r,
            0,
            Math.PI * 2
          );
          c.fill();
        };
        point(TETHER_DOCK, 6, "#a6d9b7");
        s.board.cargo
          .filter((q) => !q.delivered)
          .forEach((q) => point(q, 2.5, "#f3c98e"));
        s.board.players.forEach((p, i) =>
          point(p, i === s.own ? 3.5 : 2, TETHER_COLOURS[i])
        );
        c.strokeStyle = "#d4dfd77a";
        c.strokeRect(
          mx + (left / 1120) * mw,
          my + (top / 720) * mh,
          (vw / 1120) * mw,
          (vh / 720) * mh
        );
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);
}
export function TetherPreview() {
  const canvas = useRef(null),
    [board, setBoard] = useState(() => newTether(3, "islands"));
  useEffect(() => {
    const timer = setInterval(
      () =>
        setBoard((s) =>
          s.done
            ? newTether(3, "islands")
            : stepTether(s, {
                0: { bot: true },
                1: { bot: true },
                2: { bot: true },
              })
        ),
      100
    );
    return () => clearInterval(timer);
  }, []);
  useTetherCanvas(canvas, board, -1);
  return (
    <div className="tether-preview">
      <div className="tether-cover-copy">
        <span>THE SMALL SHIPS. THE BIG JOBS.</span>
        <h2>
          Tether
          <br />
          <i>Crew.</i>
        </h2>
        <p>
          A little momentum.
          <br />A lot of teamwork.
        </p>
      </div>
      <canvas
        ref={canvas}
        aria-label="Live Tether Crew preview: three colourful salvage tugs tow cargo into a recovery ring beneath a sunlit planet"
      />
      <div className="tether-preview-stamp">
        <i /> LIVE SALVAGE FEED <b>07</b>
      </div>
    </div>
  );
}
export function TetherArena({
  board,
  seats,
  paused,
  lobby,
  id,
  remote,
  onAction,
  onSteer,
  onPause,
}) {
  const canvas = useRef(null),
    stage = useRef(null),
    held = useRef(new Set()),
    until = useRef(new Map()),
    callbacks = useRef({}),
    audio = useRef(null),
    heard = useRef(new Set()),
    [sound, setSound] = useState(false),
    [view, setView] = useState("pilot");
  const own = remote ? seats.findIndex((p) => p.id === id) : 0,
    me = board.players[Math.max(0, own)],
    active = !paused && !lobby && !board.done && own >= 0,
    two = !remote && seats.filter((p) => !p.bot).length > 1;
  callbacks.current = {
    onAction,
    onSteer,
    onPause,
    active,
    two,
    second: seats.filter((p) => !p.bot)[1]?.id,
  };
  useTetherCanvas(canvas, board, own, view);
  useEffect(() => {
    const emit = () => {
      const { active, two, onSteer } = callbacks.current,
        has = (k) =>
          active &&
          (held.current.has(k) ||
            (until.current.get(k) || 0) > performance.now());
      onSteer(
        {
          x:
            +has("ArrowRight") -
            has("ArrowLeft") +
            (two ? 0 : +has("d") - has("a")),
          y:
            +has("ArrowDown") -
            has("ArrowUp") +
            (two ? 0 : +has("s") - has("w")),
          brake: has("Shift"),
        },
        0
      );
      if (two)
        onSteer(
          { x: +has("d") - has("a"), y: +has("s") - has("w"), brake: has("x") },
          1
        );
    };
    const clear = () => {
      held.current.clear();
      until.current.clear();
      emit();
    };
    const key = (e, down) => {
      if (
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)
      )
        return;
      const k =
        e.code === "Space"
          ? "Space"
          : e.key.length === 1
          ? e.key.toLowerCase()
          : e.key;
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
          "x",
        ].includes(k)
      ) {
        e.preventDefault();
        e.stopPropagation();
        if (down) {
          held.current.add(k);
          if (!e.repeat) until.current.set(k, performance.now() + 140);
        } else held.current.delete(k);
        emit();
      } else if (down && !e.repeat && ["Space", "e", "f", "p"].includes(k)) {
        e.preventDefault();
        e.stopPropagation();
        const cb = callbacks.current;
        if (k === "p") cb.onPause();
        else if (cb.active) {
          if (k === "f") {
            if (cb.two) cb.onAction({ type: "hook" }, cb.second);
          } else cb.onAction({ type: "hook" });
        }
      }
    };
    const down = (e) => key(e, true),
      up = (e) => key(e, false),
      blur = (e) => {
        if (!stage.current?.contains(e.relatedTarget)) clear();
      };
    const root = stage.current;
    root.addEventListener("keydown", down);
    root.addEventListener("focusout", blur);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    const timer = setInterval(emit, 50);
    return () => {
      clearInterval(timer);
      root.removeEventListener("keydown", down);
      root.removeEventListener("focusout", blur);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
      clear();
    };
  }, []);
  useEffect(() => {
    if (!sound || !audio.current) return;
    for (const e of board.events) {
      const key = `${board.round}-${e.tick}-${e.type}-${e.owner ?? e.value}`;
      if (heard.current.has(key)) continue;
      heard.current.add(key);
      if (!["hook", "deliver", "snap"].includes(e.type)) continue;
      const tones =
        e.type === "deliver"
          ? [392, 494, 587, 784]
          : e.type === "hook"
          ? [520, 780]
          : [180, 110];
      tones.forEach((freq, i) => {
        const a = audio.current,
          o = a.createOscillator(),
          g = a.createGain(),
          t = a.currentTime + i * 0.085;
        o.type = "sine";
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.045, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        o.connect(g);
        g.connect(a.destination);
        o.start(t);
        o.stop(t + 0.2);
      });
    }
    if (heard.current.size > 100)
      heard.current = new Set([...heard.current].slice(-40));
  }, [board, sound]);
  useEffect(
    () => () => {
      void audio.current?.close();
    },
    []
  );
  const toggleSound = async () => {
    if (sound) {
      setSound(false);
      return;
    }
    try {
      audio.current ||= new (window.AudioContext ||
        window.webkitAudioContext)();
      await audio.current.resume();
      board.events.forEach((e) =>
        heard.current.add(
          `${board.round}-${e.tick}-${e.type}-${e.owner ?? e.value}`
        )
      );
      setSound(true);
    } catch {
      setSound(false);
    }
  };
  const load = board.cargo.find((c) => c.id === me.hook && !c.delivered),
    nearest = closestCargo(board, me),
    canHook = nearest && gap(me, nearest) <= HOOK_RANGE,
    tide = tideAt(board.tick),
    seconds = Math.max(0, Math.ceil((TETHER_LIMIT - board.tick) / 10)),
    delivery = board.events.findLast(
      (e) => e.type === "deliver" && board.tick - e.tick < 26
    ),
    title = load
      ? `Tow ${CARGO_NAMES[load.id % 5]} to the recovery ring`
      : canHook
      ? `Hook the ${CARGO_NAMES[nearest.id % 5]}`
      : "Fly toward a marked piece of cargo",
    instruction = load
      ? "Pull left toward the green ring. Hold Shift to slow down on arrival."
      : canHook
      ? "Press Space to attach your cable. Your tug pulls the cargo behind it."
      : "Arrow keys move your tug. Get close, then Space attaches your cable.";
  const hook = () => {
    if (active) onAction({ type: "hook" });
    stage.current?.focus();
  };
  return (
    <section
      ref={stage}
      className="tether-arena arena-wrap"
      tabIndex={0}
      aria-label="Tether Crew arena. Arrow keys move, Space hooks or releases cargo, Shift brakes, P pauses."
      onPointerDown={(e) => {
        if (!e.target.closest("button")) stage.current?.focus();
      }}
    >
      <header className="tether-instruments">
        <div className="tether-shift">
          <span>RECOVERY SHIFT {String(board.round).padStart(2, "0")}</span>
          <strong>
            {board.delivered}
            <small> / {TETHER_TARGET} cargo</small>
          </strong>
        </div>
        <div
          className="tether-manifest"
          aria-label={`${board.delivered} of ${TETHER_TARGET} cargo recovered`}
        >
          {Array.from({ length: TETHER_TARGET }, (_, i) => (
            <i key={i} className={i < board.delivered ? "secured" : ""}>
              {i < board.delivered ? "✓" : String(i + 1).padStart(2, "0")}
            </i>
          ))}
        </div>
        <div className="tether-score">
          <span>TEAM SCORE</span>
          <strong>{board.teamScore.toLocaleString()}</strong>
        </div>
        <div className="tether-clock">
          <span>
            {board.arena === "islands" ? "TAKE YOUR TIME" : "SHIFT ENDS IN"}
          </span>
          <strong>
            {board.arena === "islands"
              ? "∞"
              : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(
                  2,
                  "0"
                )}`}
          </strong>
        </div>
        <button
          className="tether-sound"
          aria-label={sound ? "Mute game sounds" : "Enable game sounds"}
          aria-pressed={sound}
          onClick={toggleSound}
        >
          {sound ? "♪ On" : "♪ Off"}
        </button>
      </header>
      <div className="tether-field">
        <div className="tether-view" aria-label="Camera view">
          <button
            aria-pressed={view === "pilot"}
            onClick={() => {
              setView("pilot");
              stage.current?.focus();
            }}
          >
            Pilot view
          </button>
          <button
            aria-pressed={view === "yard"}
            onClick={() => {
              setView("yard");
              stage.current?.focus();
            }}
          >
            Whole yard
          </button>
        </div>
        <canvas
          ref={canvas}
          aria-label="Salvage field with tugs, tow cables, drifting debris and a recovery dock on the left"
        />
        <div className={`tether-weather ${tide.active ? "active" : ""}`}>
          {tide.active
            ? "↗ MAGNETIC TIDE"
            : tide.warning
            ? `TIDE IN ${tide.seconds}s`
            : "◌ CLEAR CURRENT"}
          <small>
            {tide.active
              ? "Cargo is drifting. Keep a steady pull."
              : tide.warning
              ? "Get ready for a little sideways drift."
              : "Every load deserves a soft landing."}
          </small>
        </div>
        {delivery && (
          <div className="tether-delivery" key={delivery.tick} role="status">
            <span>
              {delivery.together ? "BEAUTIFULLY COORDINATED" : "CARGO SECURED"}
            </span>
            <strong>+{delivery.value}</strong>
            {board.chain > 1 && (
              <small>{board.chain} deliveries in a chain</small>
            )}
          </div>
        )}
        {load && (
          <div className="tether-load">
            <span>CABLE LOAD</span>
            <div>
              <i
                style={{
                  width: `${Math.round(me.tension * 100)}%`,
                  background:
                    me.tension > 0.84
                      ? "#ffbb83"
                      : TETHER_COLOURS[Math.max(0, own)],
                }}
              />
            </div>
            <small>
              {me.tension > 0.84
                ? "Ease off. Your cable is straining."
                : `${Math.round(load.health)}% cargo condition`}
            </small>
          </div>
        )}
        {(lobby || paused || board.done) && (
          <div className="tether-curtain">
            <div>
              <span>
                {board.done
                  ? "SHIFT REPORT"
                  : lobby
                  ? "WELCOME TO THE CREW"
                  : "ON HOLD"}
              </span>
              <h2>
                {board.done
                  ? board.delivered === 5
                    ? "Nothing left behind."
                    : "A good day’s work."
                  : lobby
                  ? "Small tugs. Big teamwork."
                  : "Take a breather."}
              </h2>
              <p>
                {board.done
                  ? `${board.delivered} of 5 cargo recovered · ${board.teamScore} team points`
                  : lobby
                  ? "Hook five pieces of cargo. Bring them to the green recovery ring on the left. A steady pull beats a fast one."
                  : "Your crew and cargo are waiting right here."}
              </p>
              {lobby && (
                <div className="tether-three-steps">
                  <b>
                    01 <small>Fly close</small>
                  </b>
                  <b>
                    02 <small>Space to hook</small>
                  </b>
                  <b>
                    03 <small>Tow into the ring</small>
                  </b>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <footer className="tether-guidance">
        <div>
          <span>{load ? "02 / BRING IT HOME" : "01 / PICK UP A LOAD"}</span>
          <strong>{board.done ? "Shift complete" : title}</strong>
          <p>
            {board.done
              ? "Play again for another shift with your crew."
              : instruction}
          </p>
        </div>
        <button onClick={hook} disabled={!active || (!load && !canHook)}>
          <kbd>Space</kbd>
          {load ? "Release cable" : canHook ? "Attach cable" : "Get closer"}
        </button>
      </footer>
      <div className="tether-crew-strip" aria-label="Live crew scores">
        {seats.map((seat, i) => (
          <span key={seat.id}>
            <i style={{ background: TETHER_COLOURS[i] }} />
            <b>{seat.id === id ? "You" : seat.name}</b>
            <strong>{board.players[i]?.score || 0}</strong>
          </span>
        ))}
        <em>
          {two
            ? "Player 2: WASD · F hook · X brake"
            : "Together is worth more. +25 for a shared lift."}
        </em>
      </div>
    </section>
  );
}
