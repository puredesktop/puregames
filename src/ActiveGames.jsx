import React, { useEffect, useState } from "react";
import { bridge } from "@purescience/platform-bridge/client";
import { GAMES, isAvailableGame } from "./lib/games.mjs";

export function ActiveGames({
  currentPath,
  onJoin,
  onReturn,
  onLibrary,
  busy,
}) {
  const [games, setGames] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    let disposed = false,
      pending = false;
    async function refresh() {
      if (pending) return;
      pending = true;
      try {
        const entries = await bridge.call("collab.active", [
          { path: "/Workspace/Games" },
        ]);
        if (!disposed) {
          setGames(
            entries.filter(
              (g) =>
                /^\/Workspace\/Games\/[A-F0-9]{8}\.puregames$/.test(g.path) &&
                isAvailableGame(g.summary?.game) &&
                g.summary.status !== "ended"
            )
          );
          setError("");
        }
      } catch (e) {
        if (!disposed) setError(e.message);
      } finally {
        pending = false;
        if (!disposed) setLoading(false);
      }
    }
    void refresh();
    const timer = setInterval(refresh, 3000);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, []);
  return (
    <main className="active-games">
      <header>
        <div>
          <h1>Active games</h1>
          <p>See who’s playing. Join your teammates or start something new.</p>
        </div>
        <button className="primary" onClick={onLibrary}>
          Choose a game
        </button>
      </header>
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
      {!games.length && (
        <div className="active-empty">
          <h2>{loading ? "Finding active games…" : "No games in progress"}</h2>
          <p>
            Choose a game and invite someone from your team. Game Players can
            join in too.
          </p>
        </div>
      )}
      <div className="active-list">
        {games.map((g) => {
          const summary = g.summary,
            current = g.path === currentPath;
          const players = Array.isArray(summary.players)
            ? summary.players
            : g.people;
          const coop = ["words", "noir", "tether"].includes(summary.game);
          return (
            <article className="active-game" key={g.path}>
              <div className={`active-mark ${summary.game}`} aria-hidden="true">
                <svg
                  viewBox="0 0 32 32"
                  width="30"
                  height="30"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M5 26V8h12v10h10M22 13l5 5-5 5" />
                </svg>
              </div>
              <div className="active-game-content">
                <div className="active-game-heading">
                  <h2>{GAMES[summary.game].name}</h2>
                  <span className={`match-status ${summary.status}`}>
                    {summary.status}
                    {current ? " · Your game" : ""}
                  </span>
                </div>
                <p className="matchup">
                  {players.map((p, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && (
                        <span className="versus">{coop ? "+" : "vs"}</span>
                      )}
                      <span className={p.connected === false ? "away" : ""}>
                        {p.name}
                        {p.bot && <small>Agent</small>}
                        {p.connected === false && <small>away</small>}
                      </span>
                    </React.Fragment>
                  ))}
                </p>
                <p className="note">
                  {summary.joinable
                    ? `${4 - players.length} ${
                        players.length === 3 ? "place" : "places"
                      } open`
                    : summary.status === "ended"
                    ? "Game ended"
                    : "Watch now · join the next round"}
                </p>
              </div>
              <button
                className="primary"
                disabled={busy}
                onClick={() => (current ? onReturn() : onJoin(g.path))}
              >
                {current
                  ? "Back to game"
                  : summary.joinable
                  ? "Join game"
                  : "Watch game"}
              </button>
            </article>
          );
        })}
      </div>
    </main>
  );
}
