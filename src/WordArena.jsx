import React, { useEffect, useRef, useState } from "react";
import { WORD_PUZZLES } from "./lib/word-puzzles.mjs";
import { checkWord, WORD_LIMIT, rackLetters } from "./lib/words.mjs";
import { colours } from "./Arena.jsx";
export function WordPreview() {
  return (
    <div
      className="word-preview"
      role="img"
      aria-label="Word Loom: a shared rack of letters, clues and team discoveries"
    >
      <div className="word-preview-top">
        <span>ONE RACK · EIGHT DISCOVERIES</span>
        <span>TOGETHER</span>
      </div>
      <div className="word-preview-thread" />
      <div className="word-preview-tiles">
        {"RIGTALSHT".split("").map((c, i) => (
          <span key={i}>{c}</span>
        ))}
      </div>
      <div className="word-preview-clues">
        <div>
          <i>01</i>
          <span>A distant sun, seen as a point in the night.</span>
          <b>
            STAR <em>+18</em>
          </b>
        </div>
        <div>
          <i>02</i>
          <span>What lets your eyes see.</span>
          <b>
            LIGHT <em>+20</em>
          </b>
        </div>
        <div className="unsolved">
          <i>03</i>
          <span>A path left for someone to follow.</span>
          <b>_ _ _ _ _</b>
        </div>
      </div>
      <div className="word-preview-bottom">
        <span>
          <i />
          <i />
          <i /> One team, one score
        </span>
        <strong>
          38 <small>points</small>
        </strong>
      </div>
    </div>
  );
}
export function WordArena({
  board,
  seats,
  paused,
  lobby,
  id,
  remote,
  onAction,
  onFocus,
}) {
  const pack = WORD_PUZZLES[board.puzzle],
    rack = rackLetters(pack.rack, board.puzzle),
    [selected, setSelected] = useState(0),
    [guess, setGuess] = useState(""),
    [message, setMessage] = useState(""),
    [localActor, setLocalActor] = useState(id),
    pending = useRef(null),
    input = useRef(null),
    send = useRef(onFocus);
  send.current = onFocus;
  const humans = seats.filter((p) => !p.bot),
    actor = remote
      ? id
      : humans.some((p) => p.id === localActor)
      ? localActor
      : id,
    own = seats.findIndex((p) => p.id === actor),
    author = seats[own],
    entry = board.entries[selected],
    answer = pack.words[selected][0],
    active = !lobby && !paused && !board.done;
  const solved = board.entries.filter((e) => e.by !== null).length;
  useEffect(() => {
    setSelected(0);
    setGuess("");
    setMessage("");
    pending.current = null;
  }, [board.puzzle, lobby]);
  useEffect(() => {
    const emit = () => send.current(active ? selected : -1, actor);
    emit();
    const timer = setInterval(emit, 200);
    return () => clearInterval(timer);
  }, [active, selected, actor]);
  useEffect(() => {
    if (!pending.current) return;
    const clue = pending.current;
    const done = board.entries[clue.index];
    if (done?.by !== null) {
      setMessage(
        done.by === clue.player
          ? `Added ${done.points} points to the team.`
          : `${seats[done.by]?.name || "A teammate"} solved that one.`
      );
      setGuess("");
      pending.current = null;
    }
  }, [board.entries, seats]);
  useEffect(() => {
    if (active && entry.by === null) input.current?.focus();
  }, [active, selected, entry.by]);
  const choose = (i) => {
    if (pending.current) return;
    setSelected(i);
    setGuess("");
    setMessage("");
    pending.current = null;
    input.current?.focus();
  };
  const submit = (e) => {
    e.preventDefault();
    if (!active || own < 0 || pending.current) return;
    const error = checkWord(board, selected, guess);
    if (error) {
      setMessage(error);
      return;
    }
    pending.current = { index: selected, player: own };
    setMessage("Adding your word…");
    onAction({ type: "word", clue: selected, guess }, actor);
  };
  const used = {};
  for (const c of guess) used[c] = (used[c] || 0) + 1;
  const allowed = active && entry.by === null && own >= 0 && !pending.current;
  useEffect(() => {
    if (!active) {
      pending.current = null;
    }
  }, [active]);
  const remaining = Math.max(0, Math.ceil((WORD_LIMIT - board.tick) / 10));
  const hintWord = answer.slice(0, entry.revealed).padEnd(answer.length, "·");
  return (
    <section
      className="word-arena arena-wrap"
      tabIndex={-1}
      aria-label="Word Loom shared puzzle"
    >
      <header className="word-header">
        <div>
          <span className="word-eyebrow">
            WORD LOOM · {board.puzzle + 1} / {WORD_PUZZLES.length}
          </span>
          <h2>{pack.title}</h2>
        </div>
        <div className="word-metrics">
          <span>
            <b>
              {solved}
              <small>/8</small>
            </b>
            FOUND
          </span>
          <span>
            <b>{board.teamScore}</b>TEAM POINTS
          </span>
          <span>
            <b>
              {board.arena === "islands"
                ? "∞"
                : `${Math.floor(remaining / 60)}:${String(
                    remaining % 60
                  ).padStart(2, "0")}`}
            </b>
            {board.arena === "islands" ? "RELAXED" : "TIME LEFT"}
          </span>
        </div>
      </header>
      <div className="word-progress" aria-label={`${solved} of 8 clues solved`}>
        {board.entries.map((e, i) => (
          <i
            key={i}
            className={e.by !== null ? "solved" : ""}
            style={e.by !== null ? { "--thread": colours[e.by] } : {}}
          />
        ))}
      </div>
      <div className="word-workspace">
        <div className="word-clues" aria-label="Shared clues">
          {pack.words.map(([word, clue], i) => {
            const record = board.entries[i],
              people = board.players
                .flatMap((p, j) =>
                  p.focus === i && j !== own && record.by === null
                    ? [seats[j]?.name]
                    : []
                )
                .filter(Boolean);
            return (
              <button
                key={i}
                aria-pressed={i === selected}
                className={`word-clue ${i === selected ? "selected" : ""} ${
                  record.by !== null ? "solved" : ""
                }`}
                onClick={() => choose(i)}
              >
                <span className="clue-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="clue-copy">
                  <span>{clue}</span>
                  <b>{record.by !== null ? word : `${word.length} letters`}</b>
                  {record.by !== null ? (
                    <small style={{ color: colours[record.by] }}>
                      {seats[record.by]?.name} · +{record.points}
                    </small>
                  ) : people.length > 0 ? (
                    <small>{people.join(", ")} working here</small>
                  ) : null}
                </span>
                <span className="clue-state" aria-hidden="true">
                  {record.by !== null ? "✓" : "›"}
                </span>
              </button>
            );
          })}
        </div>
        <div className="word-bench">
          <div className="word-bench-label">
            <span>YOUR LETTER RACK</span>
            <span>Reuse for every clue</span>
          </div>
          <div className="word-rack" aria-label="Available letters">
            {[...rack].map((letter, i) => {
              const position = [...rack.slice(0, i + 1)].filter(
                  (c) => c === letter
                ).length,
                spent = position <= (used[letter] || 0);
              return (
                <button
                  key={i}
                  disabled={!allowed || spent || guess.length >= answer.length}
                  className={spent ? "spent" : ""}
                  aria-label={`Add ${letter}, tile ${i + 1}`}
                  onClick={() => {
                    setGuess((v) => v + letter);
                    setMessage("");
                    input.current?.focus();
                  }}
                >
                  {letter}
                </button>
              );
            })}
          </div>
          {!remote && humans.length > 1 && (
            <div className="word-identity" aria-label="Local teammate">
              {humans.map((p) => (
                <button
                  key={p.id}
                  aria-pressed={actor === p.id}
                  onClick={() => setLocalActor(p.id)}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
          <div className="word-current">
            <span className="word-eyebrow">
              CLUE {String(selected + 1).padStart(2, "0")} · {answer.length}{" "}
              LETTERS
            </span>
            <h3>{pack.words[selected][1]}</h3>
          </div>
          {entry.by !== null ? (
            <div className="word-discovery">
              <span>WOVEN INTO THE BOARD</span>
              <strong>{answer}</strong>
              <p>
                {seats[entry.by]?.name} added {entry.points} points for
                everyone.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="word-form">
              <label htmlFor="word-guess">
                Your answer{author ? ` · ${author.name}` : ""}
              </label>
              <input
                ref={input}
                id="word-guess"
                className="word-entry"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                disabled={!allowed}
                value={guess}
                maxLength={answer.length}
                placeholder={
                  entry.revealed ? hintWord : "Type or tap the letters"
                }
                onChange={(e) => {
                  setGuess(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""));
                  setMessage("");
                }}
              />
              <div className="word-form-actions">
                <button
                  className="word-submit"
                  disabled={!allowed || guess.length !== answer.length}
                  type="submit"
                >
                  Add word <span>↵</span>
                </button>
                <button
                  type="button"
                  disabled={!allowed || !guess}
                  onClick={() => {
                    setGuess("");
                    setMessage("");
                    input.current?.focus();
                  }}
                >
                  Clear
                </button>
              </div>
              {entry.revealed > 0 && (
                <p className="word-hint-reveal">
                  Shared hint <b>{hintWord}</b>
                </p>
              )}
              <button
                className="word-hint"
                type="button"
                disabled={
                  !allowed ||
                  !board.hints ||
                  entry.revealed >= answer.length - 1
                }
                onClick={() =>
                  onAction({ type: "hint", clue: selected }, actor)
                }
              >
                Reveal a letter{" "}
                <span>{board.hints} shared hints left · −2 points</span>
              </button>
            </form>
          )}
          <p className="word-feedback" role="status">
            {message ||
              (lobby
                ? "Press Play to open the puzzle."
                : board.done
                ? solved === 8
                  ? "All eight clues solved together."
                  : "Time is up. Your discoveries stay on the board."
                : paused
                ? "Paused. Resume when your team is ready."
                : "Solve in any order. Every answer helps your team.")}
          </p>
          {seats.some((p) => p.bot) && active && (
            <div className="word-assistant">
              <span className="word-assistant-dot" />
              <span>
                Game Player helps in{" "}
                {Math.max(1, Math.ceil((board.nextAssist - board.tick) / 10))}s
                <small>Leaves the clues you’re working on to you.</small>
              </span>
            </div>
          )}
          {board.done && (
            <div className="word-completion">
              <b>{solved === 8 ? "Puzzle complete" : "Round complete"}</b>
              <span>
                {board.teamScore} team points · {solved} discoveries
              </span>
              <small>Play again for a fresh set of clues.</small>
            </div>
          )}
        </div>
      </div>
      <footer className="word-footer">
        <span>
          {lobby
            ? "A cooperative puzzle for 2–4 players"
            : paused
            ? "Puzzle paused"
            : "One team. Every discovery counts."}
        </span>
        <span>Letter tiles can be used once per answer.</span>
      </footer>
    </section>
  );
}
