import React, { useEffect, useRef, useState } from "react";
import { LETTER_PUZZLES } from "./lib/letter-puzzles.mjs";
import {
  adjacent,
  checkLetters,
  findPath,
  LETTER_LIMIT,
} from "./lib/letters.mjs";

const centre = (i) => `${10 + (i % 5) * 20},${10 + Math.floor(i / 5) * 20}`;
const recordKey = (board) =>
  `puregames.letterlight.best.v1.${board.puzzle}.${board.arena}`;
function readBest(board) {
  try {
    return Number(localStorage.getItem(recordKey(board))) || 0;
  } catch {
    return 0;
  }
}

export function LetterPreview() {
  const pack = LETTER_PUZZLES[0],
    path = findPath(pack.grid, "SHELL");
  return (
    <svg
      className="library-art letter-preview"
      viewBox="0 0 800 600"
      role="img"
      aria-label="Letterlight: a glowing path connecting letter tiles in a five by five puzzle"
    >
      <defs>
        <radialGradient id="letter-dusk">
          <stop stopColor="#585277" />
          <stop offset="1" stopColor="#27273f" />
        </radialGradient>
        <filter id="letter-glow">
          <feGaussianBlur stdDeviation="12" />
        </filter>
      </defs>
      <rect width="800" height="600" fill="url(#letter-dusk)" />
      {[...Array(42)].map((_, i) => (
        <circle
          key={i}
          cx={(i * 137 + 29) % 800}
          cy={(i * 97 + 43) % 600}
          r={i % 3 === 0 ? 1.5 : 0.6}
          fill="#e6ddc9"
          opacity=".5"
        />
      ))}
      <text x="50" y="48" fill="#e1d9f3" fontSize="12" letterSpacing="3">
        A LITTLE ROOM FOR WORDS
      </text>
      <g transform="translate(202 91)">
        {[...pack.grid].map((letter, i) => (
          <g
            key={i}
            transform={`translate(${(i % 5) * 80} ${Math.floor(i / 5) * 80})`}
          >
            <rect
              x="0"
              y="5"
              width="70"
              height="70"
              rx="12"
              fill="#181c30"
              opacity=".35"
            />
            <rect
              width="70"
              height="70"
              rx="12"
              fill={path.includes(i) ? "#f2d894" : "#f7f1e8"}
            />
            <text
              x="35"
              y="47"
              textAnchor="middle"
              fill="#49405d"
              fontSize="33"
              fontWeight="600"
            >
              {letter}
            </text>
          </g>
        ))}
        <polyline
          points={path
            .map((i) => `${(i % 5) * 80 + 35},${Math.floor(i / 5) * 80 + 35}`)
            .join(" ")}
          fill="none"
          stroke="#ffd58c"
          strokeWidth="36"
          opacity=".22"
          filter="url(#letter-glow)"
        />
      </g>
      <text x="50" y="558" fill="#e9e1f3" fontSize="15">
        Six hidden words. As much time as you like.
      </text>
      <path d="m723 532 4 11 11 4-11 4-4 11-4-11-11-4 11-4z" fill="#f2d894" />
    </svg>
  );
}

export function LetterArena({
  board,
  paused,
  lobby,
  onAction,
  onPause,
  onPlay,
}) {
  const pack = LETTER_PUZZLES[board.puzzle];
  const [path, setPath] = useState([]),
    [typed, setTyped] = useState(""),
    [message, setMessage] = useState(""),
    [selected, setSelected] = useState(0),
    [reveal, setReveal] = useState(false),
    [best, setBest] = useState(() => readBest(board));
  const input = useRef(null),
    trail = useRef([]),
    drag = useRef(null),
    grid = useRef(null);
  const active = !lobby && !paused && !board.done;
  const word = typed || path.map((i) => pack.grid[i]).join("");
  const drawn = typed ? findPath(pack.grid, typed) || [] : path;
  const found = new Set(board.found.map((e) => e.word));
  const solved = pack.words.filter(([word]) => found.has(word)).length;
  const bonus = board.found.filter((e) => !e.theme);
  const selectedWord = pack.words[selected][0];
  const hinted =
    board.hinted.includes(selectedWord) && !found.has(selectedWord);
  const hintPath = hinted ? findPath(pack.grid, selectedWord).slice(0, 2) : [];
  const remaining = Math.max(0, Math.ceil((LETTER_LIMIT - board.tick) / 10));
  const score = board.players[0].score;
  function clear() {
    setPath([]);
    trail.current = [];
    setTyped("");
    setMessage("");
  }
  useEffect(() => {
    clear();
    setSelected(0);
    setReveal(false);
    setBest(readBest(board));
  }, [board.puzzle, lobby]);
  useEffect(() => {
    if (!active) drag.current = null;
  }, [active]);
  useEffect(() => {
    if (board.done && score > readBest(board)) {
      try {
        localStorage.setItem(recordKey(board), String(score));
        setBest(score);
      } catch {
        /* Play remains available without storage. */
      }
    }
  }, [board.done, score, board.puzzle, board.arena]);
  function submit(value = word, route = typed ? undefined : path) {
    if (!active) return;
    const error = checkLetters(board, value, route);
    if (error) {
      setMessage(error);
      return;
    }
    onAction({ type: "word", guess: value, ...(route ? { path: route } : {}) });
    clear();
    const next = pack.words.findIndex(([w]) => !found.has(w) && w !== value);
    if (next >= 0) setSelected(next);
    input.current?.focus({ preventScroll: true });
  }
  function append(cell) {
    if (!active) return;
    let next = trail.current;
    if (next.at(-1) === cell) return;
    if (next.length > 1 && next.at(-2) === cell) next = next.slice(0, -1);
    else if (
      !next.length ||
      (!next.includes(cell) && adjacent(next.at(-1), cell))
    )
      next = [...next, cell];
    else return;
    trail.current = next;
    setPath(next);
    setTyped("");
    setMessage("");
  }
  function tracePointer(event) {
    const gesture = drag.current;
    if (!gesture || !active) return;
    const dx = event.clientX - gesture.x,
      dy = event.clientY - gesture.y;
    // Fast pointer events can cross several tiles. Sample the swept segment
    // so a quick straight stroke still visits every tile it passes through.
    const steps = Math.max(
      1,
      Math.ceil(Math.hypot(dx, dy) / Math.max(4, grid.current.clientWidth / 25))
    );
    for (let step = 1; step <= steps; step++) {
      const tile = document
        .elementFromPoint(
          gesture.x + (dx * step) / steps,
          gesture.y + (dy * step) / steps
        )
        ?.closest("[data-letter-cell]");
      if (!tile || !grid.current.contains(tile)) continue;
      const cell = Number(tile.dataset.letterCell);
      if (cell !== gesture.start) gesture.moved = true;
      append(cell);
    }
    gesture.x = event.clientX;
    gesture.y = event.clientY;
  }
  function selectClue(index) {
    setSelected(index);
    setReveal(false);
    if (board.done || found.has(pack.words[index][0])) {
      const next = findPath(pack.grid, pack.words[index][0]);
      trail.current = next;
      setPath(next);
      setTyped("");
    } else clear();
  }
  return (
    <section
      className="letter-arena arena-wrap"
      aria-label="Letterlight solo puzzle"
    >
      <header className="letter-header">
        <div>
          <span className="letter-eyebrow">
            LETTERLIGHT · BOARD {board.puzzle + 1} / {LETTER_PUZZLES.length}
          </span>
          <h2>{pack.title}</h2>
          <p>{pack.subtitle}</p>
        </div>
        <div className="letter-header-right">
          <div className="letter-stats">
            <span>
              <b>{score}</b>POINTS
            </span>
            <span>
              <b>
                {solved}
                <small> / 6</small>
              </b>
              THEME WORDS
            </span>
            <span>
              <b>
                {board.arena === "open"
                  ? "∞"
                  : `${Math.floor(remaining / 60)}:${String(
                      remaining % 60
                    ).padStart(2, "0")}`}
              </b>
              {board.arena === "open" ? "UNHURRIED" : "TIME LEFT"}
            </span>
          </div>
        </div>
        <button
          className="letter-session-action"
          onClick={board.done || lobby ? onPlay : onPause}
        >
          {board.done
            ? "Next board →"
            : lobby
            ? "Play"
            : paused
            ? "Resume"
            : "Pause"}
        </button>
      </header>
      <div className="letter-workspace">
        <div className="letter-bench">
          <div className="letter-board-label">
            <span>CONNECT THE LETTERS</span>
            <span>Diagonals welcome</span>
          </div>
          <div className="letter-grid-shell">
            <div
              ref={grid}
              className="letter-grid"
              aria-label="Letter grid"
              onPointerMove={tracePointer}
              onPointerUp={(event) => {
                tracePointer(event);
                const gesture = drag.current;
                drag.current = null;
                if (gesture?.moved && trail.current.length >= 3)
                  submit(
                    trail.current.map((i) => pack.grid[i]).join(""),
                    trail.current
                  );
              }}
              onPointerCancel={() => {
                drag.current = null;
              }}
            >
              {[...pack.grid].map((letter, i) => (
                <button
                  key={i}
                  data-letter-cell={i}
                  type="button"
                  aria-label={`${letter}, row ${
                    Math.floor(i / 5) + 1
                  }, column ${(i % 5) + 1}`}
                  aria-pressed={drawn.includes(i)}
                  disabled={!active}
                  className={`${drawn.includes(i) ? "chosen" : ""} ${
                    hintPath.includes(i) ? "hinted" : ""
                  }`}
                  onPointerDown={(e) => {
                    if (!active || e.button !== 0) return;
                    e.preventDefault();
                    if (
                      typed ||
                      (trail.current.length &&
                        !adjacent(trail.current.at(-1), i) &&
                        trail.current.at(-1) !== i)
                    ) {
                      trail.current = [];
                      setPath([]);
                    }
                    drag.current = {
                      start: i,
                      moved: false,
                      x: e.clientX,
                      y: e.clientY,
                    };
                    grid.current.setPointerCapture(e.pointerId);
                    append(i);
                  }}
                  onClick={(e) => {
                    if (e.detail === 0) append(i);
                  }}
                >
                  <span>{letter}</span>
                  {drawn.includes(i) && <small>{drawn.indexOf(i) + 1}</small>}
                </button>
              ))}
              <svg
                className="letter-thread"
                viewBox="0 0 100 100"
                aria-hidden="true"
              >
                <polyline points={drawn.map(centre).join(" ")} />
              </svg>
            </div>
            {!active && !board.done && (
              <div className="letter-paused">
                <span>✦</span>
                <strong>
                  {lobby ? "Your quiet corner is ready." : "Take your time."}
                </strong>
                <p>
                  {lobby
                    ? "Press Play above to begin."
                    : "Paused — press Resume above when you’re ready."}
                </p>
              </div>
            )}
          </div>
          <form
            className="letter-form"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <label htmlFor="letter-entry">
              Trace tiles, tap them, or type a word
            </label>
            <div className="letter-entry-row">
              <input
                ref={input}
                id="letter-entry"
                className="letter-entry"
                value={word}
                disabled={!active}
                autoComplete="off"
                spellCheck={false}
                autoCapitalize="characters"
                maxLength={25}
                placeholder="Your discovery…"
                onChange={(e) => {
                  setTyped(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""));
                  setPath([]);
                  trail.current = [];
                  setMessage("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") clear();
                }}
              />
              <button type="submit" disabled={!active || word.length < 3}>
                Add word <span>↵</span>
              </button>
              <button
                type="button"
                disabled={!active || !word}
                onClick={() => {
                  clear();
                  input.current?.focus({ preventScroll: true });
                }}
                aria-label="Clear word"
              >
                ⌫
              </button>
            </div>
          </form>
          <div
            className={`letter-feedback ${message ? "caution" : ""}`}
            role="status"
          >
            {message ||
              (board.done ? (
                solved === 6 ? (
                  `All six found. +100 completion bonus!`
                ) : (
                  "Board finished. Select any clue to see its path."
                )
              ) : board.notice ? (
                <>
                  <b>{board.notice.word}</b> ·{" "}
                  {board.notice.theme ? "Theme word" : "Bonus discovery"}{" "}
                  <strong>+{board.notice.points}</strong>
                </>
              ) : (
                "Find the six theme words. Other discoveries earn bonus points."
              ))}
          </div>
          <div className="letter-bonus">
            <div>
              <span className="letter-eyebrow">BONUS DISCOVERIES</span>
              <b>{bonus.length}</b>
            </div>
            <p>
              {bonus.length
                ? bonus.map((e) => (
                    <span key={e.word}>{e.word.toLowerCase()}</span>
                  ))
                : "Little finds along the way will gather here."}
            </p>
          </div>
        </div>
        <aside className="letter-notebook">
          <div className="letter-clue-heading">
            <div>
              <span className="letter-eyebrow">YOUR FIELD NOTES</span>
              <h3>Six things to find</h3>
            </div>
            <span className="letter-spark" aria-hidden="true">
              ✦
            </span>
          </div>
          <div
            className="letter-progress"
            aria-label={`${solved} of 6 theme words discovered`}
          >
            {pack.words.map(([w]) => (
              <i key={w} className={found.has(w) ? "filled" : ""} />
            ))}
          </div>
          <div className="letter-clues">
            {pack.words.map(([answer, clue], i) => (
              <button
                key={answer}
                className={`letter-clue ${found.has(answer) ? "solved" : ""} ${
                  selected === i ? "selected" : ""
                }`}
                aria-pressed={selected === i}
                onClick={() => selectClue(i)}
              >
                <span className="letter-clue-index">
                  {found.has(answer) ? "✓" : String(i + 1).padStart(2, "0")}
                </span>
                <span>
                  <b>{clue}</b>
                  <small>
                    {found.has(answer) || board.done
                      ? answer
                      : board.hinted.includes(answer)
                      ? `${answer.slice(0, 2)}${" ·".repeat(answer.length - 2)}`
                      : `${answer.length} letters`}
                    {board.done && !found.has(answer) ? " · revealed" : ""}
                  </small>
                </span>
                {found.has(answer) && (
                  <em>+{board.found.find((e) => e.word === answer).points}</em>
                )}
              </button>
            ))}
          </div>
          {!board.done && (
            <div className="letter-nudge">
              <button
                disabled={
                  !active || !board.hints || hinted || found.has(selectedWord)
                }
                onClick={() => onAction({ type: "hint", clue: selected })}
              >
                A little nudge <span>{board.hints} left</span>
              </button>
              <p>
                {hinted
                  ? `Start with ${selectedWord.slice(
                      0,
                      2
                    )}. Two tiles are marked on the board.`
                  : "Reveal the selected clue’s first two letters and starting tiles. −15 points for that word."}
              </p>
            </div>
          )}
          {board.done && (
            <div className="letter-finish">
              <span aria-hidden="true">✦</span>
              <h3>
                {solved === 6
                  ? "Beautifully found."
                  : "A few more for next time."}
              </h3>
              <p>
                {score} points · {bonus.length} bonus discoveries
              </p>
              <p>Choose Next board above for a fresh theme.</p>
            </div>
          )}
        </aside>
      </div>
      <footer className="letter-footer">
        {" "}
        <div className="letter-record">
          <span>Best on this board · this device</span>
          <b>{best || "—"}</b>
        </div>
        <details className="letter-rules">
          <summary>How to play & scoring</summary>
          <p>
            Join neighbouring tiles horizontally, vertically or diagonally. Each
            tile can appear once in a word. Drag and release to submit, or tap
            tiles and press Add word. Typing shows a possible path.
          </p>
          <p>
            Find all six theme words to finish. Words earn 10 points per letter,
            plus 20 for a theme word. Completing the six earns 100 extra points.
            Bonus words use a curated list for this board; not every dictionary
            word is included.
          </p>
        </details>
        {active && (
          <button
            className="letter-reveal"
            onClick={() => {
              if (reveal) {
                onAction({ type: "reveal" });
                setReveal(false);
              } else setReveal(true);
            }}
          >
            {reveal
              ? "Reveal & finish this board"
              : "Ready to move on? Reveal board"}
          </button>
        )}
      </footer>
    </section>
  );
}
