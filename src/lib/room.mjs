import { newOrbit, stepOrbit, orbitBot } from "./orbit.mjs";
import { newRace, step, steer } from "./trails.mjs";
export const CAPACITY = 4;
export const createRoom = (name, owner, game = "ribbon") => ({
  version: 1,
  name: name.slice(0, 60),
  game: game === "orbit" ? "orbit" : "ribbon",
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
  const seat = s.seats.findIndex((p) => p.id === actor);
  const admin = actor === host;
  let next;
  if (
    action.type === "join" &&
    s.phase === "lobby" &&
    seat < 0 &&
    s.seats.length < CAPACITY &&
    present.has(actor)
  ) {
    next = {
      ...s,
      seats: [
        ...s.seats,
        { id: actor, name: present.get(actor).name.slice(0, 60), bot: false },
      ],
    };
  } else if (action.type === "leave" && s.phase === "lobby") {
    next = { ...s, seats: s.seats.filter((p) => p.id !== actor) };
  } else if (
    action.type === "bot" &&
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
    ["ribbon", "orbit"].includes(action.game)
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
    s.seats.length >= 2 &&
    s.seats.every((p) => p.bot || present.has(p.id))
  ) {
    next = {
      ...s,
      phase: "playing",
      round: s.round + 1,
      paused: false,
      countdown: 30,
      board:
        s.game === "orbit"
          ? newOrbit(s.seats.length, s.arena)
          : newRace(s.seats.length, s.arena),
    };
  } else if (action.type === "pause" && seat >= 0 && s.phase === "playing") {
    next = { ...s, paused: true };
  } else if (
    action.type === "resume" &&
    admin &&
    s.phase === "playing" &&
    s.seats.every((p) => p.bot || present.has(p.id))
  ) {
    next = { ...s, paused: false, countdown: 30 };
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
        ? s.game === "orbit"
          ? orbitBot(s.board, i)
          : steer(s.board, i)
        : inputs[p.id];
  });
  const board =
    s.game === "orbit" ? stepOrbit(s.board, turns) : step(s.board, turns);
  const scores = { ...s.scores };
  if (board.done)
    board.players.forEach((p, i) => {
      if (s.game === "orbit" ? board.winners.includes(i) : p.alive)
        scores[s.seats[i].id] = (scores[s.seats[i].id] || 0) + 1;
    });
  return {
    ...s,
    board,
    scores,
    phase: board.done ? "finished" : "playing",
    revision: s.revision + 1,
  };
}
export function pauseForDisconnect(s, present) {
  return s.phase === "playing" &&
    !s.paused &&
    s.seats.some((p) => !p.bot && !present.has(p.id))
    ? { ...s, paused: true, revision: s.revision + 1 }
    : s;
}
