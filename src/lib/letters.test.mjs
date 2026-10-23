import { test } from "node:test";
import assert from "node:assert/strict";
import { LETTER_PUZZLES } from "./letter-puzzles.mjs";
import {
  adjacent,
  validPath,
  findPath,
  newLetters,
  letterCommand,
  stepLetters,
  checkLetters,
  LETTER_LIMIT,
} from "./letters.mjs";

test("every authored Letterlight theme and bonus word has a legal connected path", () => {
  assert.equal(LETTER_PUZZLES.length, 8);
  for (const pack of LETTER_PUZZLES) {
    assert.match(pack.grid, /^[A-Z]{25}$/);
    assert.equal(pack.words.length, 6);
    const words = [...pack.words.map(([w]) => w), ...pack.bonus];
    assert.equal(new Set(words).size, words.length);
    assert.ok(pack.bonus.length >= 20);
    for (const word of words)
      assert.ok(
        validPath(pack.grid, word, findPath(pack.grid, word)),
        `${pack.title}: ${word}`
      );
  }
});

test("Letterlight paths allow diagonals, reject wraparound, jumps, tile reuse and malformed indexes", () => {
  const grid = "ABCDEFGHIJKLMNOPQRSTUVWXY";
  assert.ok(adjacent(0, 6));
  assert.equal(adjacent(4, 5), false);
  assert.equal(adjacent(0, 0), false);
  assert.ok(validPath(grid, "AGM", [0, 6, 12]));
  for (const [word, path] of [
    ["AEA", [0, 4, 0]],
    ["ABA", [0, 1, 0]],
    ["AFZ", [0, 5, 25]],
    ["ABC", [0, 1, 2.5]],
    ["ABC", [0, 1]],
  ])
    assert.equal(validPath(grid, word, path), false);
  assert.equal(findPath(grid, "ABA"), null);
  assert.equal(findPath(grid, ""), null);
});

test("Letterlight scores themes and bonuses once, with a single completion award", () => {
  let s = newLetters();
  const pack = LETTER_PUZZLES[0],
    bonus = pack.bonus[0];
  const original = structuredClone(s);
  s = letterCommand(s, 0, { type: "word", guess: bonus.toLowerCase() });
  assert.equal(s.players[0].score, bonus.length * 10);
  assert.equal(s.found[0].theme, false);
  assert.equal(letterCommand(s, 0, { type: "word", guess: bonus }), s);
  assert.equal(
    letterCommand(s, 1, { type: "word", guess: pack.words[0][0] }),
    s
  );
  assert.equal(checkLetters(s, bonus), "Already discovered. Find a new word.");
  for (const [word] of pack.words)
    s = letterCommand(s, 0, { type: "word", guess: word });
  assert.equal(s.done, true);
  assert.deepEqual(s.winners, [0]);
  assert.equal(s.completionBonus, 100);
  assert.equal(
    s.players[0].score,
    bonus.length * 10 +
      pack.words.reduce((n, [w]) => n + w.length * 10 + 20, 100)
  );
  assert.equal(stepLetters(s), s);
  assert.equal(letterCommand(s, 0, { type: "word", guess: pack.bonus[1] }), s);
  assert.deepEqual(original, newLetters());
});

test("Letterlight hints are limited, cannot repeat, and only discount their target", () => {
  let s = newLetters();
  for (const clue of [0, 1, 2]) s = letterCommand(s, 0, { type: "hint", clue });
  assert.equal(s.hints, 0);
  assert.equal(letterCommand(s, 0, { type: "hint", clue: 3 }), s);
  assert.equal(letterCommand(s, 0, { type: "hint", clue: 0 }), s);
  const word = LETTER_PUZZLES[0].words[0][0];
  s = letterCommand(s, 0, { type: "word", guess: word });
  assert.equal(s.players[0].score, word.length * 10 + 5);
  const fresh = newLetters();
  assert.equal(letterCommand(fresh, 0, { type: "hint", clue: -1 }), fresh);
  assert.equal(letterCommand(fresh, 0, { type: "hint", clue: "0" }), fresh);
});

test("Letterlight expires only in timed mode, pauses through room state, and reveals without a win", () => {
  let timed = { ...newLetters(1, "islands"), tick: LETTER_LIMIT - 1 };
  timed = stepLetters(timed);
  assert.equal(timed.done, true);
  assert.deepEqual(timed.winners, []);
  assert.equal(
    stepLetters({ ...newLetters(), tick: LETTER_LIMIT }).done,
    false
  );
  const revealed = letterCommand(newLetters(), 0, { type: "reveal" });
  assert.equal(revealed.done, true);
  assert.deepEqual(revealed.winners, []);
  assert.equal(revealed.players[0].score, 0);
  assert.equal(newLetters(1, "open", 9).puzzle, 0);
  assert.throws(() => newLetters(2));
});

test("Letterlight rejects fabricated paths and out-of-list guesses without changing state", () => {
  const s = newLetters(),
    pack = LETTER_PUZZLES[0];
  for (const action of [
    { type: "word", guess: pack.words[0][0], path: [0, 1, 2, 3, 4] },
    { type: "word", guess: pack.grid.slice(0, 3) },
    { type: "word", guess: "ZZZZ" },
    { type: "word", guess: "AB" },
    { type: "word", guess: 123 },
  ])
    assert.equal(letterCommand(s, 0, action), s);
  assert.match(checkLetters(s, "ZZZZ"), /neighbouring/);
});
