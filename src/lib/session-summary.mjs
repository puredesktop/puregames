import { isSoloGame } from "./room.mjs";
import { GAMES } from "./games.mjs";
export function sessionSummary(state, present) {
  const connected = new Set(present.keys());
  return {
    game: state.game,
    title: GAMES[state.game]?.name || "Game",
    status: state.ended
      ? "ended"
      : state.phase === "lobby"
      ? "waiting"
      : state.phase === "finished"
      ? "round finished"
      : state.paused
      ? "paused"
      : "playing",
    players: state.seats.map((p) => ({
      name: p.name,
      bot: p.bot,
      connected: p.bot || connected.has(p.id),
    })),
    capacity: isSoloGame(state.game) ? 1 : 4,
    joinable:
      !isSoloGame(state.game) &&
      !state.ended &&
      state.phase === "lobby" &&
      state.seats.length < 4,
  };
}
