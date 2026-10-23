import { Trails } from "./Trails.jsx";
import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { AppFrame } from "@purescience/platform-bridge/components/AppFrame";
import { start, legal, play, choose, points } from "./lib/garden.mjs";
import "./style.css";
const marks = { sun: "☀", fern: "❧", bloom: "✿" };
function Games() {
  const [screen, Screen] = useState(false);
  const [s, set] = useState(start),
    [plant, P] = useState("fern"),
    [difficulty, D] = useState("thoughtful"),
    [active, A] = useState(false);
  useEffect(() => {
    if (!active || s.turn !== 1 || s.moves >= 20) return;
    const timer = setTimeout(() => {
      const a = choose(s, difficulty);
      if (a) set(play(s, a.i, a.p));
    }, 650);
    return () => clearTimeout(timer);
  }, [s, active, difficulty]);
  const moves = legal(s);
  if (screen) return <Trails back={() => Screen(false)} />;
  return (
    <main>
      <header>
        <div>
          <span className="eyebrow">THE PLAY ROOM · DEVELOPMENT PREVIEW</span>
          <h1>A little room for play.</h1>
          <p>Original games. Curious companions. A few good minutes.</p>
        </div>
        <span className="status">● Local play ready</span>
      </header>
      {!active ? (
        <>
          <section className="feature">
            <div>
              <span className="eyebrow">01 / COOPERATIVE · 2 PLAYERS</span>
              <h2>Seed Circuit</h2>
              <p>
                A small garden, twenty plantings. Build a living patchwork with
                your Game Player companion. Different habitats thrive next to
                each other.
              </p>
              <button className="primary" onClick={() => A(true)}>
                Play with Game Player →
              </button>
            </div>
            <div className="illustration" aria-hidden="true">
              ❧ <span>✿</span>
              <br />
              <span>☀</span> ❧
            </div>
          </section>
          <section className="lower">
            <article>
              <span className="eyebrow">02 / REAL-TIME · 2 PLAYERS</span>
              <h3>Ribbon Run</h3>
              <p>
                Leave a trail. Keep your options open. A quick arena game
                against Game Player or a friend on the same keyboard.
              </p>
              <button onClick={() => Screen(true)}>Enter the arena →</button>
            </article>
            <article>
              <span className="eyebrow">YOUR COMPANION</span>
              <h3>Meet Game Player</h3>
              <p>
                An offline game agent that takes legal turns and shares the same
                board. No model subscription required.
              </p>
            </article>
            <article>
              <span className="eyebrow">COMING INTO THIS BUILD</span>
              <h3>Bring your team</h3>
              <p>
                PureServer rooms and mixed human–agent tables are in
                development. This preview has local agent play.
              </p>
            </article>
          </section>
        </>
      ) : (
        <>
          <nav>
            <button onClick={() => A(false)}>← Play room</button>
            <button onClick={() => set(start())}>New garden</button>
            <button
              onClick={() =>
                D(difficulty === "relaxed" ? "thoughtful" : "relaxed")
              }
            >
              Companion: {difficulty}
            </button>
          </nav>
          <section className="table">
            <div>
              <span className="eyebrow">SEED CIRCUIT</span>
              <h2>Grow something together.</h2>
              <p>
                Start in the centre. Then plant beside any occupied plot. Each
                neighbouring pair of different plants earns 2 harmony. Aim for
                60 in twenty turns.
              </p>
              <div className="board" aria-label="Garden board">
                {s.board.map((v, i) => (
                  <button
                    key={i}
                    className={v || ""}
                    disabled={!!v || s.turn !== 0 || !moves.includes(i)}
                    aria-label={`Plot ${i + 1}${v ? ": " + v : ": empty"}`}
                    onClick={() => set(play(s, i, plant))}
                  >
                    {v ? marks[v] : moves.includes(i) ? "·" : ""}
                  </button>
                ))}
              </div>
            </div>
            <aside>
              <span className="eyebrow">SHARED HARMONY</span>
              <strong className="score">
                {points(s.board)}
                <small> / 60</small>
              </strong>
              <p>{s.moves} of 20 plantings</p>
              <h3 aria-live="polite">
                {s.moves === 20
                  ? points(s.board) >= 60
                    ? "A thriving garden!"
                    : "A garden worth growing again."
                  : s.turn
                  ? "Game Player is thinking…"
                  : "Your turn to plant"}
              </h3>
              <div className="plants">
                {Object.entries(marks).map(([p, m]) => (
                  <button
                    key={p}
                    aria-pressed={plant === p}
                    onClick={() => P(p)}
                  >
                    {m} {p}
                  </button>
                ))}
              </div>
              <p className="note">
                You and Game Player share one goal. There is no hidden
                information and neither player gets extra moves.
              </p>
              <ol aria-live="polite">
                {s.log.slice(-4).map((l, i) => (
                  <li key={s.moves + i}>{l}</li>
                ))}
              </ol>
            </aside>
          </section>
        </>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")).render(
  <AppFrame identityAppSlug="games">
    <Games />
  </AppFrame>
);
