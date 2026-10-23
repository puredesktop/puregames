import { LETTER_PUZZLES } from "./letter-puzzles.mjs";

export const LETTER_LIMIT = 1800;
export const cleanLetters = (value) =>
  typeof value === "string" ? value.trim().toUpperCase() : "";
export const adjacent = (a, b) =>
  Number.isInteger(a) &&
  Number.isInteger(b) &&
  a >= 0 &&
  b >= 0 &&
  a < 25 &&
  b < 25 &&
  a !== b &&
  Math.max(
    Math.abs((a % 5) - (b % 5)),
    Math.abs(Math.floor(a / 5) - Math.floor(b / 5))
  ) === 1;

export function validPath(grid, word, path) {
  return (
    Array.isArray(path) &&
    path.length === word.length &&
    new Set(path).size === path.length &&
    path.every(
      (cell, i) =>
        Number.isInteger(cell) &&
        cell >= 0 &&
        cell < 25 &&
        grid[cell] === word[i] &&
        (i === 0 || adjacent(path[i - 1], cell))
    )
  );
}

export function findPath(grid, word) {
  if (!/^[A-Z]{1,25}$/.test(word)) return null;
  function visit(cell, index, trail) {
    if (grid[cell] !== word[index] || trail.includes(cell)) return null;
    const path = [...trail, cell];
    if (index === word.length - 1) return path;
    for (let next = 0; next < 25; next++) {
      if (!adjacent(cell, next)) continue;
      const found = visit(next, index + 1, path);
      if (found) return found;
    }
    return null;
  }
  for (let cell = 0; cell < 25; cell++) {
    const found = visit(cell, 0, []);
    if (found) return found;
  }
  return null;
}

export function newLetters(count = 1, arena = "open", round = 1) {
  if (count !== 1) throw Error("Letterlight is a solo game.");
  return {
    kind: "letters",
    puzzle: (Math.max(1, round) - 1) % LETTER_PUZZLES.length,
    arena,
    tick: 0,
    done: false,
    winners: [],
    players: [{ score: 0, alive: true }],
    found: [],
    hinted: [],
    hints: 3,
    completionBonus: 0,
    notice: null,
  };
}

export function checkLetters(s, guess, path) {
  const word = cleanLetters(guess),
    pack = LETTER_PUZZLES[s.puzzle];
  if (!/^[A-Z]{3,25}$/.test(word))
    return "Find a word of at least three letters.";
  if (s.found.some((entry) => entry.word === word))
    return "Already discovered. Find a new word.";
  if (
    path !== undefined
      ? !validPath(pack.grid, word, path)
      : !findPath(pack.grid, word)
  )
    return "Connect neighbouring tiles, including diagonals. Use each tile once.";
  if (
    !pack.words.some(([answer]) => answer === word) &&
    !pack.bonus.includes(word)
  )
    return "That word is not in this board’s curated word list. Try a clue.";
  return null;
}

function settle(s, reveal = false) {
  const complete = LETTER_PUZZLES[s.puzzle].words.every(([word]) =>
    s.found.some((e) => e.word === word)
  );
  const bonus = complete && !s.completionBonus ? 100 : 0;
  return {
    ...s,
    done:
      complete || reveal || (s.arena === "islands" && s.tick >= LETTER_LIMIT),
    winners: complete ? [0] : [],
    completionBonus: s.completionBonus + bonus,
    players: [{ ...s.players[0], score: s.players[0].score + bonus }],
  };
}

export function letterCommand(s, player, action) {
  if (s.done || player !== 0) return s;
  if (action.type === "word") {
    if (checkLetters(s, action.guess, action.path)) return s;
    const word = cleanLetters(action.guess),
      theme = LETTER_PUZZLES[s.puzzle].words.some(
        ([answer]) => answer === word
      ),
      points =
        word.length * 10 +
        (theme ? 20 : 0) -
        (s.hinted.includes(word) ? 15 : 0);
    return settle({
      ...s,
      found: [...s.found, { word, points, theme, at: s.tick }],
      players: [{ ...s.players[0], score: s.players[0].score + points }],
      notice: { word, points, theme },
    });
  }
  if (action.type === "hint" && s.hints > 0) {
    const word = LETTER_PUZZLES[s.puzzle].words[action.clue]?.[0];
    if (
      !word ||
      !Number.isInteger(action.clue) ||
      s.hinted.includes(word) ||
      s.found.some((e) => e.word === word)
    )
      return s;
    return { ...s, hints: s.hints - 1, hinted: [...s.hinted, word] };
  }
  if (action.type === "reveal") return settle(s, true);
  return s;
}

export function stepLetters(s) {
  return s.done ? s : settle({ ...s, tick: s.tick + 1 });
}
