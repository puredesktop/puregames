import React, { useEffect, useMemo, useRef } from "react";
import {
  newOrbit,
  stepOrbit,
  orbitBot,
  gatesAt,
  hazardsAt,
  ORBIT_LIMIT,
  ORBIT_TARGET,
} from "./lib/orbit.mjs";
import { colours } from "./Arena.jsx";
const TAU = Math.PI * 2;
const stars = Array.from({ length: 150 }, (_, i) => ({
  x: (i * 137.51) % 900,
  y: (i * 97.13) % 600,
  r: i % 7 === 0 ? 1.5 : 0.65,
}));
function circle(c, x, y, r, fill) {
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.fillStyle = fill;
  c.fill();
}
function glow(c, x, y, r, colour) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, colour);
  g.addColorStop(1, "transparent");
  circle(c, x, y, r, g);
}
function draw(c, s, previous, t, seats, history, me) {
  const tick = s.tick,
    lerp = (a, b) => a + (b - a) * t;
  c.clearRect(0, 0, 900, 600);
  c.fillStyle = "#080c22";
  c.fillRect(0, 0, 900, 600);
  glow(c, 300, 200, 400, "#243c6955");
  glow(c, 680, 400, 340, "#672f7855");
  glow(c, 450, 300, 260, "#282d5d66");
  for (const star of stars)
    circle(
      c,
      star.x,
      star.y,
      star.r,
      `rgba(185,206,255,${
        0.2 + (0.5 + 0.5 * Math.sin(tick * 0.02 + star.x)) * 0.4
      })`
    );
  c.strokeStyle = "#8e9fe115";
  c.lineWidth = 1;
  for (let r = 80; r < 350; r += 62) {
    c.beginPath();
    c.ellipse(450, 300, r, r * 0.68, -0.2, 0, TAU);
    c.stroke();
  }
  c.strokeStyle = "#8193d53b";
  c.beginPath();
  c.roundRect(25, 35, 850, 530, 28);
  c.stroke();
  for (const [x, y, dx, dy] of [
    [25, 35, 1, 1],
    [875, 35, -1, 1],
    [25, 565, 1, -1],
    [875, 565, -1, -1],
  ]) {
    c.strokeStyle = "#91b5ea";
    c.beginPath();
    c.moveTo(x, y + dy * 28);
    c.lineTo(x, y + dy * 12);
    c.quadraticCurveTo(x, y, x + dx * 12, y);
    c.lineTo(x + dx * 28, y);
    c.stroke();
  }
  // The quiet central planet gives the arena depth without hiding live objects.
  glow(c, 450, 300, 130, "#8474ee33");
  const planet = c.createRadialGradient(430, 275, 0, 450, 300, 48);
  planet.addColorStop(0, "#8182cb");
  planet.addColorStop(0.4, "#414979");
  planet.addColorStop(1, "#111d39");
  circle(c, 450, 300, 48, planet);
  c.strokeStyle = "#b6b3f260";
  c.lineWidth = 3;
  c.beginPath();
  c.ellipse(450, 300, 79, 17, -0.45, 0, TAU);
  c.stroke();
  for (const g of gatesAt(tick)) {
    glow(c, g.x, g.y, 66, "#ffc76d25");
    c.save();
    c.translate(g.x, g.y);
    c.rotate(tick * 0.015);
    c.strokeStyle = "#ffd58d";
    c.lineWidth = 2;
    c.setLineDash([16, 7]);
    c.beginPath();
    c.arc(0, 0, 34, 0, TAU);
    c.stroke();
    c.setLineDash([]);
    c.strokeStyle = "#f5b95550";
    c.lineWidth = 5;
    c.beginPath();
    c.arc(0, 0, 26, 0, TAU);
    c.stroke();
    c.restore();
    c.fillStyle = "#ffe4a7";
    c.font = "bold 9px system-ui";
    c.textAlign = "center";
    c.fillText("BANK", g.x, g.y + 3);
    c.font = "8px system-ui";
    c.fillStyle = "#d7bd87";
    c.fillText("DEPOSIT", g.x, g.y + 51);
  }
  for (const h of hazardsAt(tick, s.arena)) {
    glow(c, h.x, h.y, 39, "#ff5d7740");
    c.save();
    c.translate(h.x, h.y);
    c.rotate(tick * 0.05);
    c.fillStyle = "#ff6b84";
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      let r = i % 2 ? 8 : 19;
      const a = (i / 8) * TAU;
      c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    c.closePath();
    c.fill();
    circle(c, 0, 0, 5, "#ffdde3");
    c.restore();
  }
  for (const core of s.cores) {
    if (core.wait) continue;
    glow(c, core.x, core.y, 17, "#81fff235");
    c.save();
    c.translate(core.x, core.y);
    c.rotate(Math.PI / 4 + Math.sin(tick * 0.04 + core.id) * 0.2);
    c.fillStyle = "#a4fff0";
    c.shadowColor = "#75ffe6";
    c.shadowBlur = 10;
    c.fillRect(-3, -3, 6, 6);
    c.restore();
  }
  s.players.forEach((p, i) => {
    const old = previous?.players[i] || p,
      x = lerp(old.x, p.x),
      y = lerp(old.y, p.y),
      colour = colours[i];
    const trail = history.map((b) => b.players[i]).filter(Boolean);
    c.lineWidth = p.boost ? 5 : 2;
    c.lineCap = "round";
    trail.forEach((q, j) => {
      if (!j) return;
      c.globalAlpha = (j / trail.length) * 0.35;
      c.strokeStyle = colour;
      c.beginPath();
      c.moveTo(trail[j - 1].x, trail[j - 1].y);
      c.lineTo(q.x, q.y);
      c.stroke();
    });
    c.globalAlpha = 1;
    glow(c, x, y, p.boost ? 55 : 30, colour + "36");
    if (p.shield) {
      c.strokeStyle = colour + "80";
      c.lineWidth = 1.4;
      c.beginPath();
      c.arc(x, y, 22, 0, TAU);
      c.stroke();
    }
    if (i === me) {
      c.strokeStyle = "#ffffff55";
      c.setLineDash([2, 5]);
      c.beginPath();
      c.arc(x, y, 28, 0, TAU);
      c.stroke();
      c.setLineDash([]);
    }
    c.save();
    c.translate(x, y);
    c.rotate(p.angle);
    c.shadowBlur = 15;
    c.shadowColor = colour;
    c.fillStyle = colour;
    c.beginPath();
    c.moveTo(16, 0);
    c.lineTo(-11, -10);
    c.lineTo(-5, 0);
    c.lineTo(-11, 10);
    c.closePath();
    c.fill();
    c.shadowBlur = 0;
    c.fillStyle = "#ffffff";
    c.beginPath();
    c.moveTo(9, 0);
    c.lineTo(-3, -3);
    c.lineTo(-3, 3);
    c.closePath();
    c.fill();
    if (Math.hypot(p.vx, p.vy) > 1) {
      c.fillStyle = "#fff4c8";
      c.beginPath();
      c.moveTo(-8, -3);
      c.lineTo(-18 - Math.min(18, Math.hypot(p.vx, p.vy)), 0);
      c.lineTo(-8, 3);
      c.fill();
    }
    c.restore();
    for (let j = 0; j < p.cargo; j++) {
      const a = (j / 7) * TAU - tick * 0.025;
      circle(c, x + Math.cos(a) * 20, y + Math.sin(a) * 20, 2.5, "#f7dc98");
    }
    c.textAlign = "center";
    c.font = "bold 10px system-ui";
    c.fillStyle = colour;
    c.fillText(
      i === me ? "YOU" : (seats[i]?.name || `Pilot ${i + 1}`).slice(0, 14),
      x,
      y + 39
    );
  });
  for (const e of s.events) {
    const age = tick - e.tick + t,
      life = 1 - age / 12;
    if (life <= 0) continue;
    c.globalAlpha = life;
    const colour =
      e.type === "hit"
        ? "#ff6688"
        : e.type === "bank"
        ? "#ffdd99"
        : colours[e.owner];
    if (e.type === "bank" || e.type === "hit") {
      c.strokeStyle = colour;
      c.lineWidth = 2;
      c.beginPath();
      c.arc(e.x, e.y, 12 + age * 5, 0, TAU);
      c.stroke();
      c.font = "bold 19px system-ui";
      c.textAlign = "center";
      c.fillStyle = colour;
      c.fillText(
        e.type === "bank" ? `+${e.value}` : `−${e.value}`,
        e.x,
        e.y - 25 - age * 2
      );
    }
    for (let j = 0; j < 7; j++) {
      const a = (j / 7) * TAU + e.tick;
      circle(
        c,
        e.x + Math.cos(a) * age * 3,
        e.y + Math.sin(a) * age * 3,
        Math.max(0.5, life * 2),
        colour
      );
    }
    c.globalAlpha = 1;
  }
}
export function OrbitCanvas({ board, seats = [], me = -1, demo = false }) {
  const canvas = useRef(null),
    state = useRef({
      current: board,
      previous: board,
      at: performance.now(),
      history: [],
    });
  useEffect(() => {
    const r = state.current;
    if (r.current !== board) {
      r.previous = r.current;
      r.current = board;
      r.at = performance.now();
      r.history = [...r.history.slice(-11), board];
    }
  }, [board]);
  useEffect(() => {
    let frame, timer;
    const r = state.current;
    if (demo) {
      r.current = newOrbit(4);
      r.previous = r.current;
      timer = setInterval(() => {
        const b = r.current;
        r.previous = b;
        r.current = b.done
          ? newOrbit(4)
          : stepOrbit(
              b,
              Object.fromEntries(b.players.map((_, i) => [i, orbitBot(b, i)]))
            );
        r.at = performance.now();
        r.history = [...r.history.slice(-11), r.current];
      }, 100);
    }
    const c = canvas.current.getContext("2d");
    const render = () => {
      const v = state.current;
      if (v.current)
        draw(
          c,
          v.current,
          v.previous,
          Math.min(1, (performance.now() - v.at) / 100),
          seats,
          v.history,
          me
        );
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(timer);
    };
  }, [demo, me, seats]);
  return (
    <canvas
      ref={canvas}
      width="900"
      height="600"
      aria-label={
        demo
          ? "Orbit Rally live demonstration"
          : "Orbit Rally arena with cores, banking gates, ships and hazards"
      }
    />
  );
}
export function OrbitPreview() {
  const board = useMemo(() => newOrbit(4), []),
    seats = useMemo(
      () => [
        { name: "Comet" },
        { name: "Nova" },
        { name: "Echo" },
        { name: "Pulse" },
      ],
      []
    );
  return (
    <div className="orbit-preview">
      <OrbitCanvas board={board} seats={seats} demo />
      <div className="orbit-preview-label">
        <span>LIVE DEMO</span>Collect · Dash · Bank
      </div>
    </div>
  );
}
export function OrbitArena({
  board,
  seats,
  paused,
  countdown,
  lobby,
  onSteer,
  onPause,
  playerIndex = 0,
}) {
  const root = useRef(null),
    keys = useRef(new Set()),
    send = useRef(onSteer);
  send.current = onSteer;
  useEffect(() => {
    const emit = () => {
      const k = keys.current;
      send.current(
        {
          x: +k.has("ArrowRight") - k.has("ArrowLeft"),
          y: +k.has("ArrowDown") - k.has("ArrowUp"),
          dash: k.has("Shift"),
        },
        0
      );
      send.current(
        {
          x: +k.has("d") - k.has("a"),
          y: +k.has("s") - k.has("w"),
          dash: k.has("f"),
        },
        1
      );
    };
    const timer = setInterval(emit, 70);
    const clear = () => {
      keys.current.clear();
      emit();
    };
    window.addEventListener("blur", clear);
    return () => {
      clearInterval(timer);
      window.removeEventListener("blur", clear);
      clear();
    };
  }, []);
  const key = (e, down) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (
      [
        "ArrowUp",
        "ArrowRight",
        "ArrowDown",
        "ArrowLeft",
        "w",
        "a",
        "s",
        "d",
        "f",
        "Shift",
      ].includes(k)
    ) {
      e.preventDefault();
      e.stopPropagation();
      if (down) keys.current.add(k);
      else keys.current.delete(k);
    }
    if (e.code === "Space" && down && !e.repeat) {
      e.preventDefault();
      onPause();
    }
  };
  const p = board.players[playerIndex] || board.players[0];
  return (
    <div
      ref={root}
      className="arena-wrap orbit-arena"
      tabIndex={0}
      role="group"
      aria-label="Orbit Rally. Arrow keys move, Shift dashes, Space pauses."
      onKeyDown={(e) => key(e, true)}
      onKeyUp={(e) => key(e, false)}
      onBlur={() => keys.current.clear()}
      onPointerDown={() => root.current?.focus()}
    >
      <OrbitCanvas board={board} seats={seats} me={playerIndex} />
      <div className="orbit-topline">
        <span>ORBIT RALLY</span>
        <strong>
          {Math.ceil((ORBIT_LIMIT - board.tick) / 10)}
          <small>s</small>
        </strong>
        <span>FIRST TO {ORBIT_TARGET}</span>
      </div>
      <div className="orbit-scoreboard" aria-label="Live round scores">
        {board.players.map((p, i) => (
          <div key={i} style={{ "--pilot": colours[i] }}>
            <span>{seats[i]?.name || "Pilot"}</span>
            <b>
              {p.score}
              <small> / {ORBIT_TARGET}</small>
            </b>
          </div>
        ))}
      </div>
      {(lobby || paused || countdown > 0 || board.done) && (
        <div className="orbit-overlay">
          <span className="orbit-kicker">
            {board.done
              ? "ROUND COMPLETE"
              : countdown
              ? "LAUNCH SEQUENCE"
              : "COLLECT · DASH · BANK"}
          </span>
          <h2>
            {board.done
              ? board.winners.length === 1
                ? `${seats[board.winners[0]]?.name || "Pilot"} wins`
                : "Shared victory"
              : countdown
              ? Math.ceil(countdown / 10)
              : lobby
              ? "Own the orbit."
              : "Flight paused"}
          </h2>
          <p>
            {board.done
              ? "The next round is a new race."
              : lobby
              ? "Collect glowing cores. Bank them in gold gates. First to 20 wins."
              : countdown
              ? "Arrow keys to move · Shift to dash"
              : "Space to resume"}
          </p>
        </div>
      )}
      <div className="orbit-flightbar">
        <span>
          CARGO{" "}
          <b>
            {p.cargo}
            <small>/7</small>
          </b>
        </span>
        <span className="dash-meter">
          <i style={{ width: `${100 - (p.cooldown / 40) * 100}%` }} />
          <b>
            {p.cooldown
              ? `DASH ${(p.cooldown / 10).toFixed(1)}s`
              : "SHIFT · DASH READY"}
          </b>
        </span>
        <span>
          5+ CORES <b>+2 BONUS</b>
        </span>
      </div>
    </div>
  );
}
