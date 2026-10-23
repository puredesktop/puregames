import React, { useRef, useEffect } from "react";
import { SIZE } from "./lib/trails.mjs";
export const colours = ["#64e3cc", "#ffb679", "#b2a0ff", "#f284b9"];
export function Arena({
  board,
  seats,
  paused,
  countdown,
  lobby,
  onSteer,
  onPause,
}) {
  const canvas = useRef(null),
    arena = useRef(null);
  useEffect(() => {
    const c = canvas.current;
    if (!c || !board) return;
    const ctx = c.getContext("2d"),
      u = c.width / SIZE;
    const bg = ctx.createRadialGradient(360, 260, 10, 360, 360, 560);
    bg.addColorStop(0, "#203b43");
    bg.addColorStop(1, "#101d27");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 720, 720);
    ctx.strokeStyle = "#ffffff08";
    ctx.lineWidth = 1;
    for (let i = 0; i <= SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * u, 0);
      ctx.lineTo(i * u, 720);
      ctx.moveTo(0, i * u);
      ctx.lineTo(720, i * u);
      ctx.stroke();
    }
    for (const p of board.obstacles || []) {
      ctx.fillStyle = "#52616c";
      ctx.fillRect(p.x * u + 1, p.y * u + 1, u - 2, u - 2);
    }
    for (const p of board.trail) {
      ctx.fillStyle = colours[p.owner];
      ctx.globalAlpha = 0.55;
      ctx.fillRect(p.x * u + 2, p.y * u + 2, u - 4, u - 4);
    }
    ctx.globalAlpha = 1;
    board.players.forEach((p, i) => {
      ctx.save();
      ctx.translate((p.x + 0.5) * u, (p.y + 0.5) * u);
      ctx.rotate((p.d * Math.PI) / 2);
      if (p.alive) {
        ctx.shadowBlur = 22;
        ctx.shadowColor = colours[i];
        ctx.fillStyle = colours[i];
        ctx.beginPath();
        ctx.moveTo(0, -u * 0.6);
        ctx.lineTo(u * 0.48, u * 0.4);
        ctx.lineTo(0, u * 0.22);
        ctx.lineTo(-u * 0.48, u * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff";
        ctx.fillRect(-2, -4, 4, 4);
      } else {
        ctx.strokeStyle = colours[i];
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-6, -6);
        ctx.lineTo(6, 6);
        ctx.moveTo(6, -6);
        ctx.lineTo(-6, 6);
        ctx.stroke();
      }
      ctx.restore();
    });
  }, [board]);
  return (
    <div
      className="arena-wrap"
      ref={arena}
      tabIndex={0}
      role="group"
      aria-label="Ribbon Run arena. Arrow keys steer your marker. Space pauses. W A S D steer the second local human."
      onPointerDown={() => arena.current?.focus()}
      onKeyDown={(e) => {
        const keys = {
          ArrowUp: 0,
          ArrowRight: 1,
          ArrowDown: 2,
          ArrowLeft: 3,
          w: 0,
          d: 1,
          s: 2,
          a: 3,
        };
        if ((e.key.length === 1 ? e.key.toLowerCase() : e.key) in keys) {
          e.preventDefault();
          e.stopPropagation();
          onSteer(
            keys[e.key.length === 1 ? e.key.toLowerCase() : e.key],
            e.key.startsWith("Arrow") ? 0 : 1
          );
        }
        if (e.code === "Space" && !e.repeat) {
          e.preventDefault();
          onPause();
        }
      }}
    >
      <canvas
        ref={canvas}
        width={720}
        height={720}
        aria-label="Shared trail arena"
      />
      {(paused || board.done || countdown > 0) && (
        <div className="arena-overlay">
          <span className="eyebrow">
            {countdown > 0
              ? "GET READY"
              : board.done
              ? "ROUND COMPLETE"
              : lobby
              ? "RIBBON RUN"
              : "PAUSED"}
          </span>
          <h2>
            {countdown > 0
              ? Math.ceil(countdown / 10)
              : board.done
              ? board.players.some((p) => p.alive)
                ? `${
                    seats[board.players.findIndex((p) => p.alive)]?.name ||
                    "Player"
                  } wins`
                : "A perfect draw"
              : lobby
              ? "Ready to play"
              : "Paused"}
          </h2>
          <p>
            {board.done
              ? "The next round is another chance."
              : lobby
              ? "Arrow keys to steer. Stay clear of every trail."
              : countdown > 0
              ? "Arrow keys to steer."
              : "Space to resume."}
          </p>
        </div>
      )}
      <div className="arena-hud">
        <span>
          ROUND TIME <b>{(board.tick / 10).toFixed(1)}s</b>
        </span>
        <span>
          IN PLAY{" "}
          <b>
            {board.players.slice(0, seats.length).filter((p) => p.alive).length}
            /{seats.length}
          </b>
        </span>
      </div>
      <div className="ribbon-scoreboard" aria-label="Live round scores">
        {seats.map((seat, i) => (
          <div key={seat.id} style={{ "--pilot": colours[i] }}>
            <span>{seat.name}</span>
            <b>
              {board.players[i]?.points || 0}
              <small> pts</small>
            </b>
            <em>{board.players[i]?.alive === false ? "OUT" : "IN PLAY"}</em>
          </div>
        ))}
      </div>
      <div className="steering" aria-label="Direction controls">
        {["↑", "→", "↓", "←"].map((v, d) => (
          <button
            key={d}
            aria-label={`Steer ${["up", "right", "down", "left"][d]}`}
            onClick={() => {
              onSteer(d, 0);
              arena.current.focus();
            }}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
