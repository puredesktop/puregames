import { newHalloween, stepHalloween, halloweenCommand } from "./halloween.mjs";
export const canPlayAlone = (game) => ["letters", "halloween"].includes(game);
export const isSoloGame = (game) => game === "letters";
import { newLetters, stepLetters, letterCommand } from "./letters.mjs";
import { newTether, stepTether, tetherCommand } from "./tether.mjs";
import { newNoir, stepNoir, noirCommand } from "./noir.mjs";
import { newWords, stepWords, wordCommand } from "./words.mjs";
import { newSkirmish, stepSkirmish, skirmishBot } from "./skirmish.mjs";
import { newOrbit, stepOrbit, orbitBot } from "./orbit.mjs";
import { newRace, step, steer } from "./trails.mjs";
const engines = {
  halloween: {
    create: newHalloween,
    step: stepHalloween,
    bot: () => undefined,
  },
  letters: { create: newLetters, step: stepLetters, bot: () => undefined },
  tether: { create: newTether, step: stepTether, bot: () => ({ bot: true }) },
  noir: { create: newNoir, step: stepNoir, bot: () => ({ bot: true }) },
  words: { create: newWords, step: stepWords, bot: () => ({ bot: true }) },
  ribbon: { create: newRace, step, bot: steer },
  orbit: { create: newOrbit, step: stepOrbit, bot: orbitBot },
  shoot: { create: newSkirmish, step: stepSkirmish, bot: skirmishBot },
};
export const CAPACITY = 4;
export const createRoom = (name, owner, game = "ribbon") => ({
  version: 1,
  name: name.slice(0, 60),
  game: Object.hasOwn(engines, game) ? game : "ribbon",
  phase: "lobby",
  revision: 0,
  round: 0,
  seats: [owner],
  board: null,
  paused: true,
  scores: {},
  arena: "open",
});
export function command(s, actor, action, host, present) {
  if (s.ended) return s;
  const seat = s.seats.findIndex((p) => p.id === actor);
  const admin = actor === host;
  let next;
  const returning =
    action.type === "join" && seat < 0 && present.get(actor)?.userId
      ? s.seats.findIndex(
          (p) =>
            !p.bot &&
            p.userId === present.get(actor).userId &&
            !present.has(p.id)
        )
      : -1;
  if (returning >= 0) {
    const old = s.seats[returning];
    const seats = [...s.seats];
    seats[returning] = { ...old, id: actor, name: present.get(actor).name };
    const scores = { ...s.scores, [actor]: s.scores[old.id] || 0 };
    delete scores[old.id];
    next = { ...s, seats, scores, paused: true };
  } else if (
    action.type === "join" &&
    !isSoloGame(s.game) &&
    s.phase === "lobby" &&
    seat < 0 &&
    s.seats.length < CAPACITY &&
    present.has(actor)
  ) {
    next = {
      ...s,
      seats: [
        ...s.seats,
        {
          id: actor,
          userId: present.get(actor).userId,
          name: present.get(actor).name.slice(0, 60),
          bot: false,
        },
      ],
    };
  } else if (action.type === "leave" && s.phase === "lobby") {
    next = { ...s, seats: s.seats.filter((p) => p.id !== actor) };
  } else if (
    action.type === "bot" &&
    s.game !== "halloween" &&
    !isSoloGame(s.game) &&
    admin &&
    s.phase === "lobby" &&
    s.seats.length < CAPACITY
  ) {
    const id = `bot-${s.revision}`;
    next = {
      ...s,
      seats: [
        ...s.seats,
        {
          id,
          name: `Game Player ${s.seats.filter((p) => p.bot).length + 1}`,
          bot: true,
        },
      ],
    };
  } else if (
    action.type === "remove" &&
    admin &&
    s.phase === "lobby" &&
    action.id !== actor
  ) {
    next = { ...s, seats: s.seats.filter((p) => p.id !== action.id) };
  } else if (
    action.type === "game" &&
    admin &&
    s.phase === "lobby" &&
    Object.hasOwn(engines, action.game) &&
    (action.game !== "halloween" || s.seats.every((p) => !p.bot)) &&
    (!isSoloGame(action.game) || (s.seats.length === 1 && !s.seats[0].bot))
  ) {
    next = { ...s, game: action.game, board: null, scores: {}, round: 0 };
  } else if (
    action.type === "arena" &&
    admin &&
    s.phase === "lobby" &&
    ["open", "islands"].includes(action.arena)
  ) {
    next = { ...s, arena: action.arena };
  } else if (
    (action.type === "start" || action.type === "rematch") &&
    admin &&
    (s.phase === "lobby" || s.phase === "finished") &&
    (canPlayAlone(s.game) ? s.seats.length >= 1 : s.seats.length >= 2) &&
    (!isSoloGame(s.game) || (s.seats.length === 1 && !s.seats[0].bot)) &&
    (s.game !== "halloween" || s.seats.every((p) => !p.bot)) &&
    s.seats.every((p) => p.bot || present.has(p.id))
  ) {
    next = {
      ...s,
      phase: "playing",
      round: s.round + 1,
      paused: false,
      countdown: ["words", "noir", "tether", "letters", "halloween"].includes(
        s.game
      )
        ? 0
        : 30,
      board: engines[s.game].create(s.seats.length, s.arena, s.round + 1),
    };
  } else if (action.type === "pause" && seat >= 0 && s.phase === "playing") {
    next = { ...s, paused: true };
  } else if (
    action.type === "resume" &&
    admin &&
    s.phase === "playing" &&
    s.seats.every((p) => p.bot || present.has(p.id))
  ) {
    next = {
      ...s,
      paused: false,
      countdown: ["words", "noir", "tether", "letters", "halloween"].includes(
        s.game
      )
        ? 0
        : 30,
    };
  } else if (
    ["words", "noir", "tether", "letters", "halloween"].includes(s.game) &&
    seat >= 0 &&
    present.has(actor) &&
    s.phase === "playing" &&
    !s.paused &&
    !s.countdown &&
    (s.game === "halloween"
      ? ["interact", "choice", "continue", "look", "orient"]
      : s.game === "letters"
      ? ["word", "hint", "reveal"]
      : s.game === "tether"
      ? ["hook"]
      : s.game === "noir"
      ? ["interact"]
      : ["word", "hint"]
    ).includes(action.type)
  ) {
    const board =
      s.game === "halloween"
        ? halloweenCommand(s.board, seat, action)
        : s.game === "letters"
        ? letterCommand(s.board, seat, action)
        : s.game === "tether"
        ? tetherCommand(s.board, seat, action)
        : s.game === "noir"
        ? noirCommand(s.board, seat, action, s.seats)
        : wordCommand(s.board, seat, action);
    if (board !== s.board) next = finishBoard(s, board);
  } else if (action.type === "end" && admin) {
    next = { ...s, ended: true, paused: true };
  } else if (action.type === "lobby" && admin) {
    next = { ...s, phase: "lobby", paused: true, board: null };
  }
  return next ? { ...next, revision: s.revision + 1 } : s;
}
export function advance(s, inputs = {}) {
  if (s.phase !== "playing" || s.paused) return s;
  if (s.countdown > 0)
    return { ...s, countdown: s.countdown - 1, revision: s.revision + 1 };
  const turns = {};
  s.seats.forEach((p, i) => {
    if (s.board.players[i].alive)
      turns[i] = p.bot
        ? engines[s.game].bot(s.board, i)
        : ["words", "noir", "tether", "letters", "halloween"].includes(
            s.game
          ) && inputs[p.id]
        ? {
            focus: inputs[p.id].focus,
            x: inputs[p.id].x,
            y: inputs[p.id].y,
            run: inputs[p.id].run,
            brake: inputs[p.id].brake,
            view: inputs[p.id].view,
            turn: inputs[p.id].turn,
            forward: inputs[p.id].forward,
            strafe: inputs[p.id].strafe,
            bot: false,
          }
        : inputs[p.id];
  });
  const board = engines[s.game].step(s.board, turns);
  return { ...finishBoard(s, board), revision: s.revision + 1 };
}
function finishBoard(s, board) {
  const scores = { ...s.scores };
  if (board.done && !s.board?.done)
    board.players.forEach((p, i) => {
      if (s.game !== "ribbon" ? board.winners.includes(i) : p.alive)
        scores[s.seats[i].id] = (scores[s.seats[i].id] || 0) + 1;
    });
  return { ...s, board, scores, phase: board.done ? "finished" : "playing" };
}

export function pauseForDisconnect(s, present) {
  return s.phase === "playing" &&
    !s.paused &&
    s.seats.some((p) => !p.bot && !present.has(p.id))
    ? { ...s, paused: true, revision: s.revision + 1 }
    : s;
}
