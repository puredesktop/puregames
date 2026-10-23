import React from "react";
import { GAMES } from "./lib/games.mjs";
import { SkirmishPreview } from "./SkirmishArena.jsx";
import { OrbitPreview } from "./OrbitArena.jsx";

function RibbonMark() {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path
        d="M9 30V10h13v12h10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="m27 17 5 5-5 5" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}
function ArenaPreview({ islands }) {
  return (
    <svg
      className="library-art"
      viewBox="0 0 800 600"
      role="img"
      aria-label={`Ribbon Run ${
        islands ? "islands" : "open field"
      } arena preview, with four coloured trails`}
    >
      <defs>
        <pattern
          id="library-grid"
          width="25"
          height="25"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M25 0H0V25"
            fill="none"
            stroke="#a7d5cf"
            strokeOpacity=".07"
          />
        </pattern>
        <radialGradient id="library-light">
          <stop stopColor="#253f49" />
          <stop offset="1" stopColor="#111e29" />
        </radialGradient>
        <filter id="ribbon-glow">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <rect width="800" height="600" fill="url(#library-light)" />
      <rect width="800" height="600" fill="url(#library-grid)" />
      <rect
        x="47"
        y="47"
        width="706"
        height="506"
        rx="5"
        fill="none"
        stroke="#94b5ba"
        strokeOpacity=".25"
      />
      <g fill="#405b64" stroke="#64828a" strokeWidth="1">
        {islands &&
          [
            [250, 200],
            [500, 200],
            [250, 400],
            [500, 400],
          ].map(([x, y]) => (
            <rect key={`${x}${y}`} x={x} y={y} width="50" height="50" rx="4" />
          ))}
      </g>
      <g
        fill="none"
        strokeWidth="7"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path
          className="preview-trail mint"
          d="M150 500V375H100V100H350V250H425V325H325V400H400"
        />
        <path
          className="preview-trail peach"
          d="M650 100V300H700V500H475V375H550V200H450V150H400"
        />
        <path
          className="preview-trail lilac"
          d="M225 150V300H175V450H300V525H400"
        />
        <path
          className="preview-trail blue"
          d="M575 125V75H725V350H625V450H575"
        />
      </g>
      <g className="preview-heads">
        <circle
          cx="400"
          cy="400"
          r="18"
          fill="#70e6c7"
          opacity=".3"
          filter="url(#ribbon-glow)"
        />
        <path d="m412 400-20-10v20z" fill="#86f6d7" />
        <path d="m388 150 20-10v20z" fill="#ffb88e" />
        <path d="m412 525-20-10v20z" fill="#bca8f6" />
        <path d="m563 450 20-10v20z" fill="#8ed3ed" />
      </g>
      <g fill="#72949d" fontFamily="monospace" fontSize="10" letterSpacing="2">
        <text x="48" y="30">
          RIBBON RUN
        </text>
        <text x="654" y="30">
          {islands ? "ISLANDS" : "OPEN FIELD"}
        </text>
        <text x="48" y="577">
          4 TRAILS / ONE SURVIVOR
        </text>
      </g>
    </svg>
  );
}
export function FlightKeys() {
  return (
    <>
      <span>
        <kbd>←</kbd>
        <kbd>→</kbd> Turn
      </span>
      <span>
        <kbd>↑</kbd> Thrust
      </span>
      <span>
        <kbd>↓</kbd> Brake
      </span>
    </>
  );
}
export function Library({
  room,
  server,
  remote,
  onPlay,
  onOpen,
  onArena,
  onSelect,
}) {
  const orbit = room.game === "orbit",
    shoot = room.game === "shoot",
    info = GAMES[room.game];
  const islands = room.arena === "islands";
  return (
    <section className="games-library" aria-label="Game library">
      <nav className="library-rail" aria-label="Games">
        <div className="library-section-label">
          Library <span>03</span>
        </div>
        {["shoot", "orbit", "ribbon"].map((game) => (
          <button
            key={game}
            className={`library-game ${room.game === game ? "selected" : ""}`}
            aria-current={room.game === game ? "page" : undefined}
            disabled={!!remote && room.game !== game}
            onClick={() => onSelect(game)}
          >
            <span className={`library-game-icon ${game}`}>
              {game === "shoot" ? (
                <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
                  <path d="m29 10-5 24-7-11-11-7z" fill="currentColor" />
                  <path
                    d="m27 3 1 4M33 10l4 1M9 27l-4 5M14 30l-3 5"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              ) : game === "orbit" ? (
                <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
                  <circle
                    cx="20"
                    cy="20"
                    r="7"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <ellipse
                    cx="20"
                    cy="20"
                    rx="17"
                    ry="8"
                    transform="rotate(-35 20 20)"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <circle cx="33" cy="11" r="3" fill="currentColor" />
                </svg>
              ) : (
                <RibbonMark />
              )}
            </span>
            <span>
              <strong>
                {GAMES[game].name}
                {game === "shoot" && <em className="library-new">NEW</em>}
              </strong>
              <small>{GAMES[game].subtitle}</small>
            </span>
          </button>
        ))}
        <div className="library-connection">
          <i />
          {server ? "Team play available" : "Offline play available"}
        </div>
      </nav>
      <main className="library-workspace">
        <header className="library-heading">
          <div>
            <span className="library-section-label">{info.genre}</span>
            <h1>{info.name}</h1>
            <div className="game-mode-labels" aria-label="Supported play modes">
              <span className="mode-live">
                <i aria-hidden="true" />
                Live multiplayer
              </span>
              <span className="mode-agent">
                <RibbonMark />
                Play against agent
              </span>
            </div>
          </div>
          <span className="library-player-count">2–4 players</span>
        </header>
        <div className="library-content">
          <div className="library-preview">
            {shoot ? (
              <SkirmishPreview arena={room.arena} />
            ) : orbit ? (
              <OrbitPreview />
            ) : (
              <ArenaPreview islands={islands} />
            )}
            <div className="preview-caption">
              <span>
                <i /> Arena preview
              </span>
              <span>{info.arenas[room.arena]}</span>
            </div>
          </div>
          <aside className="library-inspector">
            <div className="library-description">
              <h2>{info.tagline}</h2>
              <p>{info.description}</p>
            </div>
            <div className="library-setting">
              <span className="library-section-label">Arena</span>
              <div className="library-arena-options">
                {["open", "islands"].map((arena) => (
                  <button
                    key={arena}
                    aria-pressed={room.arena === arena}
                    disabled={remote || room.phase !== "lobby"}
                    onClick={() => onArena(arena)}
                  >
                    <span
                      className={`arena-mini ${
                        shoot
                          ? arena === "open"
                            ? "deep-space"
                            : "asteroids"
                          : orbit
                          ? arena === "open"
                            ? "nebula"
                            : "storm"
                          : arena
                      }`}
                    >
                      <i />
                      <i />
                      <i />
                      <i />
                    </span>
                    {info.arenas[arena]}
                  </button>
                ))}
              </div>
            </div>
            <div className="library-setting">
              <span className="library-section-label">At the table</span>
              <div className="library-seats">
                <span className="seat-avatar human">You</span>
                <span className="seat-connector">+</span>
                <span className="seat-avatar robot">
                  <RibbonMark />
                </span>
                <span className="seat-caption">
                  Game Players{server && <small>and your teammates</small>}
                </span>
              </div>
              <p className="library-note">
                {remote
                  ? "Your shared table is still open. Return to see the players."
                  : server
                  ? "Play with teammates, Game Player agents, or both in the same live match."
                  : "Play against a Game Player agent offline. Connect to PureServer for live team multiplayer."}
              </p>
            </div>
            <div className="library-launch">
              <button className="library-play" onClick={onPlay}>
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path fill="currentColor" d="m4 2 10 6-10 6z" />
                </svg>
                {remote || room.phase === "playing" ? "Return to game" : "Play"}
              </button>
              <button className="library-table" onClick={onOpen}>
                Table & players <span>→</span>
              </button>
            </div>
          </aside>
        </div>
        <footer className="library-shortcuts">
          {room.game !== "ribbon" ? (
            <FlightKeys />
          ) : (
            <span>
              <kbd>↑</kbd>
              <kbd>←</kbd>
              <kbd>↓</kbd>
              <kbd>→</kbd> Steer
            </span>
          )}
          <span>
            <kbd>{shoot ? "P" : "Space"}</kbd> Pause
          </span>
          {shoot && (
            <span>
              <kbd>Space</kbd> Hold to fire
            </span>
          )}
          {orbit && (
            <span>
              <kbd>Shift</kbd> Dash
            </span>
          )}
          <span>{info.goal}</span>
        </footer>
      </main>
    </section>
  );
}
