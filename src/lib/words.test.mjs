import { test } from "node:test";
import assert from "node:assert/strict";
import { WORD_PUZZLES } from "./word-puzzles.mjs";
import {
  newWords,
  checkWord,
  wordCommand,
  stepWords,
  fitsRack,
  WORD_LIMIT,
} from "./words.mjs";
test("every original clue has a distinct answer made only from its rack", () => {
  for (const p of WORD_PUZZLES) {
    assert.equal(p.words.length, 8);
    assert.equal(new Set(p.words.map((w) => w[0])).size, 8);
    for (const [word, clue] of p.words) {
      assert.ok(fitsRack(word, p.rack), `${word} from ${p.rack}`);
      assert.ok(clue.length > 15);
    }
  }
});
test("simultaneous duplicate answers score once; teammates share the completed round", () => {
  let s = newWords(3);
  const before = JSON.stringify(s);
  assert.equal(checkWord(s, 0, " star "), null);
  assert.ok(checkWord(s, 0, "AAAA"));
  const n = wordCommand(s, 0, { type: "word", clue: 0, guess: "star" });
  assert.equal(JSON.stringify(s), before);
  assert.equal(n.teamScore, 18);
  assert.equal(wordCommand(n, 1, { type: "word", clue: 0, guess: "STAR" }), n);
  s = n;
  for (let i = 1; i < 8; i++)
    s = wordCommand(s, i % 3, {
      type: "word",
      clue: i,
      guess: WORD_PUZZLES[0].words[i][0],
    });
  assert.equal(s.done, true);
  assert.deepEqual(s.winners, [0, 1, 2]);
  assert.equal(
    s.teamScore,
    s.players.reduce((total, p) => total + p.score, 0)
  );
  assert.equal(stepWords(s), s);
});
test("shared hints reveal letters, are bounded, and reduce that answer by two points", () => {
  let s = newWords();
  for (let i = 0; i < 4; i++) s = wordCommand(s, 0, { type: "hint", clue: 0 });
  assert.equal(s.hints, 0);
  assert.equal(s.entries[0].revealed, 3);
  s = wordCommand(s, 1, { type: "word", clue: 0, guess: "STAR" });
  assert.equal(s.teamScore, 12);
  assert.equal(s.players[1].score, 12);
});
test("timed rounds expire, relaxed rounds continue, agents assist without taking an occupied clue", () => {
  const expired = stepWords({ ...newWords(), tick: WORD_LIMIT - 1 });
  assert.ok(expired.done);
  assert.deepEqual(expired.winners, []);
  assert.equal(
    stepWords({ ...newWords(2, "islands"), tick: WORD_LIMIT - 1 }).done,
    false
  );
  let s = stepWords(
    { ...newWords(), tick: 199 },
    { 0: { focus: 0 }, 1: { bot: true } }
  );
  assert.equal(s.entries[0].by, null);
  assert.equal(s.entries[1].by, 1);
  assert.ok(s.teamScore > 0);
  assert.notEqual(newWords(2, "open", 2).puzzle, newWords().puzzle);
});
