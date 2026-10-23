import { WORD_PUZZLES } from "./word-puzzles.mjs";
export const WORD_LIMIT = 1800,
  WORD_HINTS = 3;
export const cleanWord = (value) =>
  typeof value === "string" ? value.trim().toUpperCase() : "";
export function fitsRack(word, rack) {
  const counts = {};
  for (const c of rack) counts[c] = (counts[c] || 0) + 1;
  return [...word].every((c) => counts[c] > 0 && --counts[c] >= 0);
}
export function rackLetters(rack, puzzle = 0) {
  const tiles = [...rack];
  let seed = 7919 + puzzle * 104729;
  for (let i = tiles.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  return tiles.join("");
}
export function newWords(count = 2, arena = "open", round = 1) {
  if (!Number.isInteger(count) || count < 2 || count > 4)
    throw Error("Choose two to four players.");
  const puzzle = (Math.max(1, round) - 1) % WORD_PUZZLES.length;
  return {
    kind: "words",
    puzzle,
    arena,
    tick: 0,
    done: false,
    winners: [],
    teamScore: 0,
    hints: WORD_HINTS,
    lastSolve: 0,
    nextAssist: 200,
    players: Array.from({ length: count }, () => ({
      score: 0,
      alive: true,
      focus: -1,
    })),
    entries: WORD_PUZZLES[puzzle].words.map(() => ({
      by: null,
      at: 0,
      points: 0,
      revealed: 0,
    })),
    notice: null,
  };
}
export function checkWord(s, index, guess) {
  const pack = WORD_PUZZLES[s.puzzle],
    entry = s.entries[index];
  if (!Number.isInteger(index) || !entry) return "Choose a clue first.";
  if (entry.by !== null) return "A teammate has already solved this clue.";
  const word = cleanWord(guess);
  if (!/^[A-Z]+$/.test(word)) return "Use letters from the rack.";
  if (word.length !== pack.words[index][0].length)
    return `This answer needs ${pack.words[index][0].length} letters.`;
  if (!fitsRack(word, pack.rack))
    return "That word uses letters that are not available in this rack.";
  if (word !== pack.words[index][0])
    return "Those letters fit. Try another answer for this clue.";
  return null;
}
function settle(s) {
  const complete = s.entries.every((e) => e.by !== null),
    expired = s.arena === "open" && s.tick >= WORD_LIMIT;
  return {
    ...s,
    done: complete || expired,
    winners: complete ? s.players.map((_, i) => i) : [],
  };
}
export function wordCommand(s, player, action) {
  if (s.done || !s.players[player]) return s;
  const index = action.clue,
    entry = s.entries[index];
  if (!Number.isInteger(index) || !entry || entry.by !== null) return s;
  if (action.type === "word") {
    if (checkWord(s, index, action.guess)) return s;
    const points =
      10 +
      WORD_PUZZLES[s.puzzle].words[index][0].length * 2 -
      entry.revealed * 2;
    return settle({
      ...s,
      teamScore: s.teamScore + points,
      lastSolve: s.tick,
      nextAssist: Math.max(s.nextAssist, s.tick + 150),
      entries: s.entries.map((e, i) =>
        i === index ? { ...e, by: player, at: s.tick, points } : e
      ),
      players: s.players.map((p, i) =>
        i === player ? { ...p, score: p.score + points } : p
      ),
      notice: { type: "solved", clue: index, by: player, points, tick: s.tick },
    });
  }
  if (
    action.type === "hint" &&
    s.hints > 0 &&
    entry.revealed < WORD_PUZZLES[s.puzzle].words[index][0].length - 1
  ) {
    return {
      ...s,
      hints: s.hints - 1,
      entries: s.entries.map((e, i) =>
        i === index ? { ...e, revealed: e.revealed + 1 } : e
      ),
      notice: { type: "hint", clue: index, by: player, tick: s.tick },
    };
  }
  return s;
}
export function stepWords(s, inputs = {}) {
  if (s.done) return s;
  let next = {
    ...s,
    tick: s.tick + 1,
    players: s.players.map((p, i) => ({
      ...p,
      focus:
        inputs[i] === undefined
          ? p.focus
          : Number.isInteger(inputs[i]?.focus) &&
            inputs[i].focus >= 0 &&
            inputs[i].focus < s.entries.length
          ? inputs[i].focus
          : -1,
    })),
  };
  const bots = Object.entries(inputs)
    .filter(([, v]) => v?.bot === true)
    .map(([i]) => Number(i));
  if (bots.length && next.tick >= next.nextAssist) {
    const occupied = new Set(
      next.players.filter((_, i) => !bots.includes(i)).map((p) => p.focus)
    );
    const clue = next.entries.findIndex(
      (e, i) => e.by === null && !occupied.has(i)
    );
    if (clue >= 0) {
      const who = bots[Math.floor(next.tick / 200) % bots.length];
      next = wordCommand(next, who, {
        type: "word",
        clue,
        guess: WORD_PUZZLES[next.puzzle].words[clue][0],
      });
    }
    next = { ...next, nextAssist: next.tick + 200 };
  }
  return settle(next);
}
