import React from "react";
import { AVAILABLE_GAMES, GAMES } from "./lib/games.mjs";

/** The games, one line each, beside a conversation. Picking one plays it: the game itself fills the frame. */
export function HeldGames({ onPick }) {
  return (
    <div className="games-held">
      <h2>Choose a game</h2>
      <ul>
        {AVAILABLE_GAMES.map((game) => (
          <li key={game}>
            <button type="button" onClick={() => onPick(game)}>
              <b>{GAMES[game].name}</b>
              <span>{GAMES[game].subtitle}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
