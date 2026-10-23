import React, { useEffect, useMemo, useRef } from "react";
import {
  newSkirmish,
  stepSkirmish,
  skirmishBot,
  rocksFor,
  SKIRMISH_LIMIT,
  SKIRMISH_TARGET,
} from "./lib/skirmish.mjs";
import { useFlightControls } from "./useFlightControls.js";
import { interpolateAngle } from "./lib/flight.mjs";
import { colours } from "./Arena.jsx";
const TAU = Math.PI * 2;
const stars = Array.from({ length: 135 }, (_, i) => ({
  x: (i * 137.23) % 900,
  y: (i * 79.77) % 600,
  r: i % 9 === 0 ? 1.2 : 0.6,
}));
function circle(c, x, y, r, colour) {
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.fillStyle = colour;
  c.fill();
}
function glow(c, x, y, r, colour) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, colour);
  g.addColorStop(1, "transparent");
  circle(c, x, y, r, g);
}
function paint(c, s, old, blend, seats, me) {
  c.fillStyle = "#0b1525";
  c.fillRect(0, 0, 900, 600);
  glow(c, 760, 100, 460, "#49395d70");
  glow(c, 150, 530, 440, "#1f596155");
  for (const star of stars) circle(c, star.x, star.y, star.r, "#b9d5e06b");
  // A distant eclipsed world and radar rings are scenery; the combat plane stays clear.
  glow(c, 750, 210, 116, "#ffbe7c12");
  circle(c, 750, 210, 83, "#efb57c37");
  circle(c, 744, 213, 81, "#101c2c");
  c.strokeStyle = "#86aebb12";
  c.lineWidth = 1;
  for (let r = 90; r < 450; r += 100) {
    c.beginPath();
    c.arc(450, 330, r, 0, TAU);
    c.stroke();
  }
  c.setLineDash([2, 12]);
  c.strokeStyle = "#93b1bf20";
  c.strokeRect(22, 118, 856, 440);
  c.setLineDash([]);
  for (const [x, y, dx, dy] of [
    [22, 118, 1, 1],
    [878, 118, -1, 1],
    [22, 558, 1, -1],
    [878, 558, -1, -1],
  ]) {
    c.strokeStyle = "#8eabbd80";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x, y + dy * 17);
    c.lineTo(x, y);
    c.lineTo(x + dx * 17, y);
    c.stroke();
  }
  for (const [i, r] of rocksFor(s.arena).entries()) {
    c.save();
    c.translate(r.x, r.y);
    c.rotate(i * 0.7);
    c.fillStyle = "#394454";
    c.strokeStyle = "#82929c70";
    c.lineWidth = 1.5;
    c.beginPath();
    for (let j = 0; j < 9; j++) {
      const a = (j * TAU) / 9,
        rad = r.r * (j % 2 ? 0.89 : 1.06);
      c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    c.closePath();
    c.fill();
    c.stroke();
    circle(c, -8, -8, 9, "#1c2c3a");
    circle(c, 12, 11, 6, "#233440");
    c.restore();
  }
  const previousShots = new Map(old.shots.map((b) => [b.id, b]));
  for (const b of s.shots) {
    const a = previousShots.get(b.id) || b,
      x = a.x + (b.x - a.x) * blend,
      y = a.y + (b.y - a.y) * blend,
      colour = colours[b.owner];
    c.save();
    c.strokeStyle = colour;
    c.shadowColor = colour;
    c.shadowBlur = 13;
    c.lineWidth = 3;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(x - b.vx * 0.65, y - b.vy * 0.65);
    c.lineTo(x, y);
    c.stroke();
    circle(c, x, y, 2.5, "#f7fffa");
    c.restore();
  }
  s.players.forEach((p, i) => {
    const before = old.players[i] || p,
      reset = p.respawn || before.respawn,
      x = reset ? p.x : before.x + (p.x - before.x) * blend,
      y = reset ? p.y : before.y + (p.y - before.y) * blend,
      colour = colours[i];
    if (p.respawn) {
      c.strokeStyle = colour + "66";
      c.lineWidth = 1.5;
      c.setLineDash([3, 6]);
      c.beginPath();
      c.arc(x, y, 24, 0, TAU);
      c.stroke();
      c.setLineDash([]);
      return;
    }
    const hit = s.events.some(
      (e) => e.type === "hit" && e.owner === i && s.tick - e.tick < 2
    );
    glow(c, x, y, 33, colour + "25");
    c.save();
    c.translate(x, y);
    c.rotate(reset ? p.angle : interpolateAngle(before.angle, p.angle, blend));
    if (Math.hypot(p.vx, p.vy) > 0.5) {
      const flame =
        10 +
        Math.min(18, Math.hypot(p.vx, p.vy) * 2) +
        Math.sin(s.tick * 2 + i) * 3;
      const g = c.createLinearGradient(-12, 0, -12 - flame, 0);
      g.addColorStop(0, colour);
      g.addColorStop(1, "transparent");
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(-10, -5);
      c.lineTo(-12 - flame, 0);
      c.lineTo(-10, 5);
      c.fill();
    }
    c.fillStyle = hit ? "#ffffff" : colour;
    c.strokeStyle = "#f3f7ff";
    c.lineWidth = 0.6;
    c.beginPath();
    c.moveTo(19, 0);
    c.lineTo(-12, -12);
    c.lineTo(-7, -3);
    c.lineTo(-12, 0);
    c.lineTo(-7, 3);
    c.lineTo(-12, 12);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = "#183044";
    c.beginPath();
    c.moveTo(10, 0);
    c.lineTo(-5, -4);
    c.lineTo(-5, 4);
    c.closePath();
    c.fill();
    c.restore();
    if (p.shield) {
      c.strokeStyle = colour + "aa";
      c.lineWidth = 1.5;
      c.setLineDash([5, 5]);
      c.beginPath();
      c.arc(x, y, 27, 0, TAU);
      c.stroke();
      c.setLineDash([]);
    }
    for (let j = 0; j < 3; j++) {
      c.fillStyle = j < p.hull ? colour : "#ffffff22";
      c.fillRect(x - 12 + j * 9, y + 23, 6, 3);
    }
    c.font = "9px system-ui";
    c.textAlign = "center";
    c.fillStyle = i === me ? "#f0ffff" : colour;
    c.fillText(
      i === me ? "YOU" : seats[i]?.name || `Pilot ${i + 1}`,
      x,
      y + 40
    );
  });
  for (const e of s.events) {
    const age = s.tick - e.tick + blend,
      life = Math.max(0, 1 - age / 16),
      colour = colours[e.owner];
    if (e.type === "fire") {
      if (age < 2) glow(c, e.x, e.y, 12, colour + "aa");
      continue;
    }
    const burst = e.type === "burst",
      radius = burst ? 16 : 6;
    c.save();
    c.globalAlpha = life;
    if (burst) {
      glow(c, e.x, e.y, 40 + age * 3, colour + "55");
      c.strokeStyle = colour;
      c.lineWidth = 2 * life;
      c.beginPath();
      c.arc(e.x, e.y, 8 + age * 4, 0, TAU);
      c.stroke();
    }
    for (let i = 0; i < (burst ? 22 : 7); i++) {
      const a = i * 2.399 + e.tick,
        r = age * (1.8 + (i % 4));
      circle(
        c,
        e.x + Math.cos(a) * r,
        e.y + Math.sin(a) * r,
        Math.max(0.6, (life * radius) / 5),
        colour
      );
    }
    if (burst) {
      c.font = "bold 14px system-ui";
      c.textAlign = "center";
      c.fillStyle = colours[e.killer];
      c.fillText("+1", e.x, e.y - 30 - age * 2);
    }
    c.restore();
  }
}
export function SkirmishCanvas({ board, seats = [], me = -1, demo = false }) {
  const canvas = useRef(null),
    live = useRef({ board, previous: board, at: performance.now() }),
    labels = useRef(seats);
  labels.current = seats;
  useEffect(() => {
    if (!demo && live.current.board !== board) {
      live.current = {
        board,
        previous: live.current.board,
        at: performance.now(),
      };
    }
  }, [board, demo]);
  useEffect(() => {
    let frame, timer;
    const c = canvas.current.getContext("2d");
    if (demo) {
      const b = newSkirmish(4, board.arena);
      live.current = { board: b, previous: b, at: performance.now() };
      timer = setInterval(() => {
        const b = live.current.board;
        const next = b.done
          ? newSkirmish(4, board.arena)
          : stepSkirmish(
              b,
              Object.fromEntries(
                b.players.map((_, i) => [i, skirmishBot(b, i)])
              )
            );
        live.current = { board: next, previous: b, at: performance.now() };
      }, 100);
    }
    const draw = () => {
      const v = live.current;
      if (v.board)
        paint(
          c,
          v.board,
          v.previous,
          Math.min(1, (performance.now() - v.at) / 100),
          labels.current,
          me
        );
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(timer);
    };
  }, [demo, me, board.arena]);
  return (
    <canvas
      ref={canvas}
      width="900"
      height="600"
      aria-label={
        demo
          ? "Star Skirmish live demonstration"
          : "Star Skirmish arena with ships, laser fire and hull indicators"
      }
    />
  );
}
export function SkirmishPreview({ arena = "open" }) {
  const board = useMemo(() => newSkirmish(4, arena), [arena]),
    seats = useMemo(
      () => [
        { name: "Nova" },
        { name: "Flare" },
        { name: "Echo" },
        { name: "Pulse" },
      ],
      []
    );
  return (
    <div className="orbit-preview skirmish-preview">
      <SkirmishCanvas board={board} seats={seats} demo />
      <div className="orbit-preview-label">
        <span>LIVE DEMO</span>Fly · Fire · Respawn
      </div>
    </div>
  );
}
export function SkirmishArena({
  board,
  seats,
  paused,
  countdown,
  lobby,
  onSteer,
  onPause,
  playerIndex = 0,
}) {
  const root = useRef(null);
  const controls = useFlightControls(onSteer, onPause, "fire");
  const pilot = board.players[playerIndex],
    overlay = paused || lobby || countdown > 0 || board.done;
  const winners = board.winners.map((i) => seats[i]?.name || "Pilot");
  return (
    <div
      ref={root}
      tabIndex={0}
      role="group"
      className="arena-wrap orbit-arena skirmish-arena"
      aria-label="Star Skirmish. Left and Right turn, Up thrusts, Down brakes. Hold Space to fire. P pauses."
      onPointerDown={() => root.current?.focus()}
      {...controls}
    >
      <SkirmishCanvas board={board} seats={seats} me={playerIndex} />
      <div className="orbit-topline">
        <span>STAR SKIRMISH</span>
        <strong>
          {Math.ceil((SKIRMISH_LIMIT - board.tick) / 10)}
          <small>s</small>
        </strong>
        <span>FIRST TO {SKIRMISH_TARGET}</span>
      </div>
      <div
        className="orbit-scoreboard skirmish-scores"
        aria-label="Live knockout scores"
      >
        {seats.map((seat, i) => {
          const p = board.players[i];
          return (
            <div key={seat.id} style={{ "--pilot": colours[i] }}>
              <span>{seat.name}</span>
              <b>
                {p?.score || 0}
                <small> / {SKIRMISH_TARGET}</small>
              </b>
              <span
                className="hull-pips"
                aria-label={
                  p?.respawn ? "Respawning" : `${p?.hull || 0} hull remaining`
                }
              >
                {[0, 1, 2].map((j) => (
                  <i key={j} className={j < (p?.hull || 0) ? "filled" : ""} />
                ))}
              </span>
            </div>
          );
        })}
      </div>
      {overlay && (
        <div className="orbit-overlay skirmish-overlay">
          <span className="orbit-kicker">
            {board.done
              ? "ROUND COMPLETE"
              : countdown
              ? "GET READY"
              : "FLY · FIRE · RESPAWN"}
          </span>
          <h2>
            {board.done
              ? winners.length === 1
                ? `${winners[0]} wins`
                : "A shared victory"
              : countdown
              ? Math.ceil(countdown / 10)
              : lobby
              ? "Ready for launch"
              : "Fight paused"}
          </h2>
          <p>
            {board.done
              ? "Five knockouts. One winner. One more round?"
              : lobby
              ? "← → turn · ↑ thrust · ↓ brake · Space fires"
              : countdown
              ? "Three hull. Unlimited respawns."
              : "Press P to resume."}
          </p>
        </div>
      )}
      {!overlay && pilot?.respawn > 0 && (
        <div className="respawn-notice" role="status">
          Back in {Math.ceil(pilot.respawn / 10)}s
        </div>
      )}
      <div className="orbit-flightbar skirmish-flightbar">
        <span>
          {pilot?.respawn
            ? "REBUILDING SHIP"
            : pilot?.shield
            ? "SPAWN SHIELD"
            : "HULL"}{" "}
          <b>
            {pilot?.respawn
              ? `${Math.ceil(pilot.respawn / 10)}s`
              : pilot?.shield
              ? "Protected"
              : `${pilot?.hull ?? 3} / 3`}
          </b>
        </span>
        <span>
          <kbd>SPACE</kbd> HOLD TO FIRE
        </span>
        <span>
          <kbd>P</kbd> PAUSE
        </span>
      </div>
    </div>
  );
}
