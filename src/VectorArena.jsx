import React, { useEffect, useRef, useState } from "react";
import {
  newVector,
  WAVES,
  clamp,
  vectorView,
  PILOT_COLOURS,
} from "./lib/vector-wake.mjs";
import { renderVector } from "./vector-render.mjs";
import { createVectorMotion } from "./lib/vector-motion.mjs";
import { createFlightAudio } from "./vector-audio.mjs";
import "./vector.css";

function FlightCanvas({
  board,
  preview = false,
  paused = false,
  glow = true,
  radarRange = 1600,
  onPointer,
  onFire,
  onFocus,
}) {
  const canvas = useRef(null),
    state = useRef({ board, paused, radarRange });
  state.current = { board, paused, radarRange };
  useEffect(() => {
    const node = canvas.current,
      c = node.getContext("2d");
    if (!c) return;
    let raf,
      disposed = false,
      visible = true,
      motion = createVectorMotion(),
      width = 0,
      height = 0;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const resize = () => {
      const r = node.getBoundingClientRect();
      width = r.width;
      height = r.height;
      const dpr = Math.min(1.75, devicePixelRatio || 1);
      node.width = Math.max(1, Math.round(width * dpr));
      node.height = Math.max(1, Math.round(height * dpr));
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    resize();
    const seen = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
    });
    seen.observe(node);
    function draw(time) {
      if (disposed) return;
      const b = state.current.board;
      if (visible && width > 0) {
        const frame = motion.sample(b, time, state.current.paused || preview);
        const view = { ...frame.players[0] };
        if (preview) {
          view.yaw = Math.sin(reduced ? 0 : time * 0.00012) * 0.14;
          view.pitch = -0.03;
        }
        renderVector(c, frame, width, height, time, {
          preview,
          view,
          reduced,
          glow,
          radarRange: state.current.radarRange,
        });
      }
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      seen.disconnect();
    };
  }, [preview, glow]);
  return (
    <canvas
      ref={canvas}
      aria-label="3D vector starfighter cockpit, with original wireframe spacecraft"
      className="vector-canvas"
      onPointerMove={(e) => {
        if (e.pointerType === "touch") return;
        const r = e.currentTarget.getBoundingClientRect();
        onPointer?.({
          x: clamp(
            (e.clientX - r.left - r.width / 2) / (r.width * 0.34),
            -1,
            1
          ),
          y: clamp(
            -(e.clientY - r.top - r.height * 0.46) / (r.height * 0.34),
            -1,
            1
          ),
        });
      }}
      onPointerLeave={() => {
        onPointer?.(null);
        onFire?.(false);
      }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        onFocus?.();
        onFire?.(true);
      }}
      onPointerUp={() => onFire?.(false)}
      onPointerCancel={() => {
        onFire?.(false);
        onPointer?.(null);
      }}
      onLostPointerCapture={() => onFire?.(false)}
    />
  );
}
export function VectorPreview() {
  const [b] = useState(newVector);
  return (
    <div className="vector-library-preview">
      <FlightCanvas board={b} preview />
      <div className="vector-preview-type">
        <small>ORIGINAL VECTOR FLIGHT</small>
        <strong>
          VECTOR
          <br />
          WAKE<span>_</span>
        </strong>
        <p>A cockpit. A signal. A sky full of trouble.</p>
      </div>
      <span className="vector-preview-corner">
        VELA—09 / FLIGHT SYSTEM READY
      </span>
    </div>
  );
}
export function VectorArena({
  board: world,
  seat = 0,
  seats = [],
  peers = new Map(),
  remote = false,
  code = "",
  connected = true,
  hostControls = true,
  ready = true,
  onInvite,
  onRemove,
  lobby,
  paused,
  onSteer,
  onPause,
  onPlay,
  onLobby,
}) {
  const board = vectorView(world, seat);
  const stage = useRef(null),
    keys = useRef(new Set()),
    taps = useRef({}),
    pointer = useRef(null),
    pressed = useRef(false),
    touch = useRef({}),
    callbacks = useRef({ onSteer, onPause }),
    audio = useRef(null),
    lastSound = useRef({}),
    [help, setHelp] = useState(false),
    [sound, setSound] = useState(false),
    [mouse, setMouse] = useState(false),
    [glow, setGlow] = useState(true),
    [radarRange, setRadarRange] = useState(1600);
  const active =
    connected &&
    seat >= 0 &&
    board.players[0].alive &&
    !lobby &&
    !paused &&
    !board.done;
  callbacks.current = { onSteer, onPause };
  useEffect(() => {
    if (active) stage.current?.focus({ preventScroll: true });
    else {
      keys.current.clear();
      taps.current = {};
      pressed.current = false;
      pointer.current = null;
      touch.current = {};
      onSteer({});
    }
  }, [active]);
  useEffect(() => {
    const send = () => {
      const k = {
          has: (name) =>
            keys.current.has(name) ||
            (taps.current[name] || 0) > performance.now(),
        },
        m = mouse ? pointer.current : null,
        t = touch.current;
      const dead = (n) => (Math.abs(n || 0) < 0.07 ? 0 : n);
      callbacks.current.onSteer(
        active
          ? {
              turn: clamp(
                (k.has("d") || k.has("arrowright") ? 1 : 0) -
                  (k.has("a") || k.has("arrowleft") ? 1 : 0) +
                  (t.right ? 1 : 0) -
                  (t.left ? 1 : 0) +
                  dead(m?.x),
                -1,
                1
              ),
              pitch: clamp(
                (k.has("w") || k.has("arrowup") ? 1 : 0) -
                  (k.has("s") || k.has("arrowdown") ? 1 : 0) +
                  (t.up ? 1 : 0) -
                  (t.down ? 1 : 0) +
                  dead(m?.y),
                -1,
                1
              ),
              dodge: (k.has("c") || t.roll ? 1 : 0) - (k.has("z") ? 1 : 0),
              bank: (k.has("e") ? 1 : 0) - (k.has("q") ? 1 : 0),
              fire: pressed.current || k.has(" ") || !!t.fire,
              boost: k.has("shift") || !!t.boost,
              brake: k.has("x"),
              missile: k.has("r") || !!t.missile,
            }
          : {}
      );
    };
    const timer = setInterval(send, 40);
    const clear = () => {
      keys.current.clear();
      taps.current = {};
      pointer.current = null;
      pressed.current = false;
      touch.current = {};
      callbacks.current.onSteer({});
    };
    window.addEventListener("blur", clear);
    return () => {
      clearInterval(timer);
      window.removeEventListener("blur", clear);
      clear();
    };
  }, [active, mouse]);
  useEffect(() => {
    if (!sound) return;
    const a = audio.current;
    if (!a) return;
    a.update(board.players[0].speed, active);
    const old = lastSound.current;
    if (active) {
      if (board.fireAt !== old.fire && board.fireAt > 0) a.laser();
      if (board.hitAt !== old.hit && board.hitAt >= 0) a.hit();
      if (board.killAt !== old.kill && board.killAt >= 0) a.explode();
      if (board.damageAt !== old.damage && board.damageAt >= 0) a.damage();
      if (
        board.players[0].evadeAt !== old.evade &&
        board.players[0].evadeAt >= 0
      )
        a.roll();
      if (board.cellAt !== old.cell && board.cellAt >= 0) a.pickup();
      if (board.missileAt !== old.missile && board.missileAt >= 0) a.missile();
      if (board.lockTime >= 1.1 && old.lock < 1.1) a.lock();
    }
    lastSound.current = {
      fire: board.fireAt,
      hit: board.hitAt,
      kill: board.killAt,
      damage: board.damageAt,
      evade: board.players[0].evadeAt,
      cell: board.cellAt,
      missile: board.missileAt,
      lock: board.lockTime,
    };
  }, [board, sound, active]);
  useEffect(() => () => audio.current?.dispose(), []);
  async function toggleSound() {
    if (sound) {
      audio.current?.dispose();
      audio.current = null;
      setSound(false);
    } else {
      try {
        audio.current = createFlightAudio();
        if (audio.current) {
          await audio.current.resume();
          setSound(true);
        }
      } catch {
        setSound(false);
      }
    }
  }
  function key(e, down) {
    const k = e.key.toLowerCase();
    if (
      [
        "w",
        "a",
        "s",
        "d",
        "arrowup",
        "arrowdown",
        "arrowleft",
        "arrowright",
        "z",
        "c",
        "q",
        "e",
        "x",
        " ",
        "shift",
        "r",
        "p",
        "escape",
      ].includes(k)
    ) {
      e.preventDefault();
      if (down) {
        if (
          [
            "w",
            "a",
            "s",
            "d",
            "arrowup",
            "arrowdown",
            "arrowleft",
            "arrowright",
          ].includes(k)
        )
          pointer.current = null;
        keys.current.add(k);
        if (!["p", "escape"].includes(k))
          taps.current[k] = performance.now() + 150;
        if ((k === "p" || k === "escape") && !e.repeat && !lobby && !board.done)
          onPause();
      } else keys.current.delete(k);
    }
  }
  function touchButton(label, name) {
    return (
      <button
        aria-label={label}
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          touch.current[name] = true;
          stage.current?.focus({ preventScroll: true });
        }}
        onPointerUp={() => (touch.current[name] = false)}
        onPointerCancel={() => (touch.current[name] = false)}
        onLostPointerCapture={() => (touch.current[name] = false)}
      >
        {label}
      </button>
    );
  }
  const p = board.players[0],
    accuracy = board.fired ? Math.round((board.hits / board.fired) * 100) : 0;
  return (
    <section className="vector-shell" aria-label="Vector Wake cockpit shooter">
      <header className="vector-header">
        <div>
          <span className="vector-eyebrow">ORBITAL DEFENCE / VELA—09</span>
          <h1>
            VECTOR WAKE<span>_</span>
          </h1>
        </div>
        <div className="vector-mission">
          <small>SECTOR {String(board.wave).padStart(2, "0")} / 03</small>
          <strong>{WAVES[board.wave - 1]}</strong>
        </div>
        <div className="vector-options">
          <button onClick={() => setMouse(!mouse)} aria-pressed={mouse}>
            Mouse {mouse ? "on" : "off"}
          </button>
          <button
            onClick={() =>
              setRadarRange((v) => (v === 800 ? 1600 : v === 1600 ? 3200 : 800))
            }
            aria-label={`Radar range ${radarRange} metres. Change range`}
          >
            Radar{" "}
            {radarRange < 1000 ? `${radarRange}m` : `${radarRange / 1000}km`}
          </button>
          <button onClick={toggleSound} aria-pressed={sound}>
            Sound {sound ? "on" : "off"}
          </button>
          <button onClick={() => setGlow(!glow)} aria-pressed={glow}>
            Glow {glow ? "on" : "off"}
          </button>
          <button
            onClick={() => {
              if (active) onPause();
              setHelp(!help);
            }}
          >
            Flight manual
          </button>
          {!lobby && !board.done && (
            <button
              disabled={!connected || (paused && !hostControls) || seat < 0}
              onClick={onPause}
            >
              {paused ? "Resume" : "Pause"}
            </button>
          )}
        </div>
      </header>
      <div className="vector-wing" aria-label="Flight wing">
        <div className="vector-wing-roster">
          {seats.map((pilot, i) => (
            <div
              key={pilot.id}
              className="vector-wing-pilot"
              style={{ "--pilot-colour": PILOT_COLOURS[i] }}
            >
              <i aria-hidden="true" />
              <strong>
                {pilot.name}
                {i === seat ? " (you)" : ""}
              </strong>
              <span>
                {!peers.has(pilot.id)
                  ? "Disconnected"
                  : lobby
                  ? "Ready"
                  : !world.players[i]?.alive
                  ? board.done
                    ? "Down"
                    : "Recovering"
                  : `Hull ${Math.ceil(world.players[i].hull)}% · ${
                      world.players[i].score
                    } pts`}
              </span>
              {lobby && hostControls && i !== seat && (
                <button
                  onClick={() => onRemove?.(pilot.id)}
                  aria-label={`Remove ${pilot.name}`}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          {seat < 0 && (
            <span>Spectating · Join the next flight from the briefing</span>
          )}
        </div>
        <div className="vector-wing-actions">
          {remote && <span>WING {code}</span>}
          {onInvite && (
            <button
              disabled={!lobby || seats.length >= 4 || !connected}
              onClick={onInvite}
            >
              Invite wingmates
            </button>
          )}
          {!onInvite && !remote && (
            <span>Connect to PureServer to invite wingmates</span>
          )}
          {!lobby && hostControls && (
            <button disabled={!connected} onClick={onLobby}>
              Flight briefing
            </button>
          )}
        </div>
      </div>
      <div
        ref={stage}
        className="vector-stage"
        tabIndex={0}
        aria-label="Vector Wake flight controls"
        onKeyDown={(e) => key(e, true)}
        onKeyUp={(e) => key(e, false)}
      >
        <FlightCanvas
          board={board}
          paused={!active}
          glow={glow}
          radarRange={radarRange}
          onPointer={(v) => {
            pointer.current = v;
          }}
          onFire={(v) => {
            pressed.current = active && v;
          }}
          onFocus={() => stage.current?.focus({ preventScroll: true })}
        />
        <span className="vector-course">
          HDG{" "}
          {String(Math.round(((p.yaw * 180) / Math.PI + 360) % 360)).padStart(
            3,
            "0"
          )}
          ° / PIT {Math.round((p.pitch * 180) / Math.PI)}°
        </span>
        <div className="vector-telemetry" aria-live="off">
          <span>
            <b>{String(p.score).padStart(6, "0")}</b> SCORE
          </span>
          <span>
            <b>{String(board.enemies.length).padStart(2, "0")}</b> CONTACTS
          </span>
          <span>
            {Math.floor(board.time / 60)}:
            {String(Math.floor(board.time % 60)).padStart(2, "0")} FLIGHT
          </span>
        </div>
        {!lobby && !board.done && !p.alive && !paused && (
          <div className="vector-recovery" role="status">
            Rescue link active · Returning to your wing in{" "}
            {Math.max(0, Math.ceil(p.respawnAt - board.time))}s
          </div>
        )}
        {(lobby || paused || board.done || help) && (
          <div className="vector-overlay">
            <div className="vector-brief">
              <span className="vector-eyebrow">
                {help
                  ? "PILOT REFERENCE"
                  : board.done
                  ? board.victory
                    ? "TRANSMISSION COMPLETE"
                    : "TRANSMISSION ENDED"
                  : lobby
                  ? "INCOMING TRANSMISSION"
                  : "FLIGHT SUSPENDED"}
              </span>
              <h2>
                {help
                  ? "Know your cockpit."
                  : board.done
                  ? board.victory
                    ? "A clear sky. For now."
                    : "The signal went dark."
                  : lobby
                  ? "The silence ends here."
                  : "Holding position."}
              </h2>
              {help ? (
                <>
                  <p>
                    Arrow keys or WASD steer your nose. Enable Mouse to use the
                    pointer as a flight stick: centre it to fly straight, move
                    farther out to turn faster. Keyboard steering recentres
                    mouse input.
                  </p>
                  <dl>
                    <div>
                      <dt>SPACE / CLICK</dt>
                      <dd>Twin pulse cannons. Release to cool.</dd>
                    </div>
                    <div>
                      <dt>R</dt>
                      <dd>Seeker missile after the target lock ring fills.</dd>
                    </div>
                    <div>
                      <dt>SHIFT / X</dt>
                      <dd>Boost / brake. Boost recharges when released.</dd>
                    </div>
                    <div>
                      <dt>Z / C</dt>
                      <dd>
                        Evade left / right. Costs boost; recharges in 3.5s.
                      </dd>
                    </div>
                    <div>
                      <dt>Q / E</dt>
                      <dd>Bank the cockpit. P or Escape pauses.</dd>
                    </div>
                  </dl>
                  <p>
                    Follow the contact arrow when ships leave your view. Dodge
                    red bolts and debris. Shields recharge after seven seconds
                    without damage. Pitch is unrestricted: hold Up or W to loop.
                    Cyan diamonds on the radar are wingmates; short stems show
                    altitude. Each cleared sector restores shields and two
                    seekers. Collect cyan shield cells from wrecks to recover
                    shield and boost. Chain quick kills for score multipliers.
                  </p>
                </>
              ) : board.done ? (
                <>
                  <p>
                    {board.victory
                      ? "All three sectors secured. The Lattice Ark is silent."
                      : "Your flight recording is intact. Launch again with a fresh hull and a new flight."}
                  </p>
                  <div className="vector-results">
                    <span>
                      <b>{board.teamScore.toLocaleString()}</b> WING SCORE
                    </span>
                    <span>
                      <b>{board.kills}</b> TARGETS
                    </span>
                    <span>
                      <b>{accuracy}%</b> YOUR ACCURACY
                    </span>
                  </div>
                </>
              ) : lobby ? (
                <>
                  <p>
                    A derelict navigation lattice has come alive. Launch your
                    Vela-9, clear three hostile sectors, and stop the Lattice
                    Ark. Invite up to three wingmates from the briefing. No
                    friendly fire; keep one pilot alive to recover downed
                    teammates.
                  </p>
                  <div className="vector-loadout">
                    <span>02 PULSE CANNONS</span>
                    <span>04 SEEKERS</span>
                    <span>
                      {String(Math.max(1, seats.length)).padStart(2, "0")}{" "}
                      {seats.length > 1 ? "PILOTS" : "PILOT"}
                    </span>
                  </div>
                  <p className="vector-hint">
                    Arrows or WASD to steer · Click or Space to fire · Shift to
                    boost
                  </p>
                </>
              ) : (
                <p>
                  {!connected
                    ? "Flight paused while reconnecting. Your seat and mission are retained."
                    : hostControls
                    ? "Your wing is safe while paused. Resume when everyone is connected."
                    : "Your wing is paused. Waiting for the wing leader to resume."}
                </p>
              )}
              <div className="vector-brief-actions">
                <button
                  className="vector-launch"
                  disabled={
                    !help &&
                    (!connected ||
                      seat < 0 ||
                      !hostControls ||
                      (lobby && !ready))
                  }
                  onClick={() => {
                    setHelp(false);
                    pointer.current = null;
                    if (lobby || board.done) onPlay();
                    else if (paused) onPause();
                    stage.current?.focus({ preventScroll: true });
                  }}
                >
                  {help
                    ? lobby
                      ? "Launch flight"
                      : "Back to flight"
                    : lobby
                    ? hostControls
                      ? "Launch flight"
                      : "Waiting for wing leader"
                    : board.done
                    ? "Fly again"
                    : "Resume flight"}{" "}
                  <span>→</span>
                </button>
                {!help && (
                  <button onClick={() => setHelp(true)}>Controls</button>
                )}
                {board.done && (
                  <button onClick={onLobby}>Flight briefing</button>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="vector-touch" aria-label="Touch flight controls">
          <div>
            {touchButton("←", "left")}
            {touchButton("↑", "up")}
            {touchButton("↓", "down")}
            {touchButton("→", "right")}
          </div>
          <div>
            {touchButton("Fire", "fire")}
            {touchButton("Seeker", "missile")}
            {touchButton("Boost", "boost")}
            {touchButton("Roll", "roll")}
          </div>
        </div>
      </div>
      <footer className="vector-footer">
        <span>
          <i /> FLIGHT LINK {active ? "ACTIVE" : "STANDBY"}
        </span>
        <span>
          STEER <b>ARROWS / WASD / MOUSE</b> · FIRE <b>SPACE</b> · SEEKER{" "}
          <b>R</b> · BOOST <b>SHIFT</b> · EVADE <b>Z / C</b>
        </span>
        <span>ORIGINAL SHIPS. PURE VECTOR.</span>
      </footer>
    </section>
  );
}
