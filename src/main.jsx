import { LetterArena } from "./LetterArena.jsx";
import { newLetters } from "./lib/letters.mjs";
import "./tether.css";
import { TetherArena } from "./TetherArena.jsx";
import { newTether } from "./lib/tether.mjs";
import "./noir.css";
import { NoirArena } from "./NoirArena.jsx";
import { newNoir } from "./lib/noir.mjs";
import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { AppFrame } from "@purescience/platform-bridge/components/AppFrame";
import { bridge } from "@purescience/platform-bridge/client";
import { createRoom, command, advance } from "./lib/room.mjs";
import { newRace } from "./lib/trails.mjs";
import { connectRoom } from "./lib/shared.mjs";
import { Arena, colours } from "./Arena.jsx";
import { OrbitArena } from "./OrbitArena.jsx";
import { newOrbit } from "./lib/orbit.mjs";
import { SkirmishArena } from "./SkirmishArena.jsx";
import { newSkirmish } from "./lib/skirmish.mjs";
import { WordArena } from "./WordArena.jsx";
import { newWords } from "./lib/words.mjs";
import { GAMES } from "./lib/games.mjs";
import { Library, FlightKeys } from "./Library.jsx";
import "./style.css";
import "./letters.css";
const me = { id: "local", name: "You", bot: false };
const initial = (game = "letters") =>
  game === "letters"
    ? createRoom("Solo session", me, game)
    : command(
        createRoom("Local table", me, game),
        "local",
        { type: "bot" },
        "local",
        new Map([["local", me]])
      );
const ROOT = "/Workspace/Games";
const title = "Team game";
function App() {
  const [screen, setScreen] = useState("library"),
    [local, setLocal] = useState(initial),
    [remote, setRemote] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [roomPath, setRoomPath] = useState(""),
    [fullscreen, setFullscreen] = useState(false),
    [invite, setInvite] = useState(false),
    [server, setServer] = useState(null),
    [joinCode, setJoinCode] = useState(""),
    [code, setCode] = useState("");
  const connection = useRef(null),
    directions = useRef({}),
    localRef = useRef(local),
    surface = useRef(null);
  localRef.current = local;
  const s = remote?.state || local,
    id = remote ? remote.id : "local",
    host = remote ? remote.host : "local";
  const peers =
    remote?.peers ||
    new Map(local.seats.filter((p) => !p.bot).map((p) => [p.id, p]));
  const letters = s.game === "letters",
    tether = s.game === "tether",
    noir = s.game === "noir",
    coop = ["noir", "words", "tether"].includes(s.game),
    orbit = s.game === "orbit",
    shoot = s.game === "shoot",
    words = s.game === "words",
    game = GAMES[s.game],
    gameName = game.name;
  const connected = !remote || remote.connected,
    hostControls = !remote || id === host;
  useEffect(() => {
    let done = false;
    const check = async () => {
      await bridge.waitForReady();
      const meta = bridge.getMeta();
      if (meta?.methods?.includes("collab.remote")) {
        const status = await bridge.call("collab.remote", [{ op: "status" }]);
        if (!done)
          setServer(status.connected ? { native: true, ...status } : null);
      } else if (
        (await bridge.call("runtime.platform")) === "web" &&
        location.pathname.startsWith("/apps/")
      ) {
        if (!done) setServer({ native: false, connected: true });
      }
    };
    void check().catch(() => {});
    const timer = setInterval(
      () => void check().catch(() => setServer(null)),
      10000
    );
    return () => {
      clearInterval(timer);
      done = true;
    };
  }, []);
  const request = (op, path, content) =>
    server?.native
      ? bridge.call("collab.remote", [{ op, path, content }])
      : op === "list"
      ? bridge.call("fs.list", [{ rootPath: path }])
      : op === "read"
      ? bridge.call("fs.read", [path])
      : op === "write"
      ? bridge.call("fs.write", [path, content])
      : bridge.call("collab.join", [{ path }]);
  const action = (a, actor = "local") =>
    remote
      ? connection.current?.action(a)
      : setLocal((v) =>
          command(
            v,
            actor,
            { ...a, revision: v.revision },
            "local",
            new Map(v.seats.filter((p) => !p.bot).map((p) => [p.id, p]))
          )
        );
  const steer = (direction, index = 0) => {
    if (remote) {
      if (index === 0) connection.current?.steer(direction);
    } else {
      const humans = localRef.current.seats.filter((p) => !p.bot);
      const who = humans[index];
      if (
        who &&
        (localRef.current.game !== "ribbon" ||
          directions.current[who.id] === undefined)
      )
        directions.current[who.id] = direction;
    }
  };
  const focusArena = () =>
    surface.current
      ?.querySelector(
        letters ? ".letter-entry" : words ? ".word-entry" : ".arena-wrap"
      )
      ?.focus({ preventScroll: true });
  const togglePause = () => {
    if (s.phase === "playing") {
      action({ type: s.paused ? "resume" : "pause" });
      focusArena();
    }
  };
  useEffect(() => {
    if (remote || screen !== "table") return;
    const timer = setInterval(
      () =>
        setLocal((v) => {
          const next = advance(v, directions.current);
          if (!v.countdown) directions.current = {};
          return next;
        }),
      100
    );
    return () => clearInterval(timer);
  }, [remote, screen]);
  useEffect(() => () => connection.current?.close(), []);
  useEffect(() => {
    if (s.phase === "playing" && !s.paused) focusArena();
  }, [s.phase, s.paused]);
  useEffect(() => {
    const onBlur = () => {
      if (!remote)
        setLocal((v) => (v.phase === "playing" ? { ...v, paused: true } : v));
    };
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, [remote]);
  useEffect(() => {
    const changed = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);
  async function full() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await surface.current.requestFullscreen();
      focusArena();
    } catch {
      setError(
        "This host blocked full screen. Use the desktop window’s full-screen control while we update its frame support."
      );
    }
  }
  async function openRoom(path, create = false) {
    setBusy(true);
    setError("");
    try {
      if (create)
        await request(
          "write",
          path,
          JSON.stringify({
            format: "puregames-room",
            version: 1,
            name: title,
            game: s.game,
          })
        );
      const saved = JSON.parse(await request("read", path));
      if (saved.format !== "puregames-room" || saved.version !== 1)
        throw Error("This is not a supported PureGames room.");
      // Retired games return to a Ribbon Run lobby when an older room is reopened.
      if (saved.state && !Object.hasOwn(GAMES, saved.state.game))
        delete saved.state;
      const session = await request("join", path);
      if (!session?.url)
        throw Error("This host does not support a PureServer live connection.");
      connection.current?.close();
      setRoomPath(path);
      setCode(path.split("/").pop().replace(".puregames", ""));
      setInvite(false);
      setRemote({ state: null, connected: false, id: "", peers: new Map() });
      setScreen("table");
      connection.current = connectRoom({
        session,
        saved,
        name: saved.name || title,
        write: (text) => request("write", path, text),
        onChange: setRemote,
        bridge,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function leave() {
    connection.current?.close();
    connection.current = null;
    setRemote(null);
    setLocal((v) => ({ ...v, paused: true }));
    setScreen("table");
    setError("");
  }
  async function playNow() {
    if (letters && !remote) {
      action({ type: s.phase === "finished" ? "rematch" : "start" });
      focusArena();
    } else if (remote) {
      action({ type: s.phase === "finished" ? "rematch" : "start" });
      focusArena();
    } else if (server) {
      setInvite(true);
    } else {
      action({ type: s.phase === "finished" ? "rematch" : "start" });
      focusArena();
    }
  }
  function robot() {
    setInvite(false);
    if (remote) leave();
    setLocal((v) => {
      const fresh =
        v.phase === "lobby" || v.phase === "finished" ? v : initial(v.game);
      return command(
        fresh,
        "local",
        { type: fresh.phase === "finished" ? "rematch" : "start" },
        "local",
        new Map(fresh.seats.filter((p) => !p.bot).map((p) => [p.id, p]))
      );
    });
    focusArena();
  }
  async function inviteTeam() {
    const next = crypto.randomUUID().slice(0, 8).toUpperCase();
    await openRoom(`${ROOT}/${next}.puregames`, true);
  }
  const ready =
    (letters ? s.seats.length === 1 : s.seats.length >= 2) &&
    s.seats.every((p) => p.bot || peers.has(p.id));
  return (
    <div
      className={`game-viewport software ${
        letters
          ? "letters-mode"
          : tether
          ? "tether-mode"
          : noir
          ? "noir-mode"
          : ""
      } ${fullscreen ? "is-fullscreen" : ""}`}
      ref={surface}
    >
      <div className="game-toolbar">
        <div className="game-title">
          {screen !== "library" && (
            <button
              onClick={() => {
                if (remote) action({ type: "pause" });
                else setLocal((v) => ({ ...v, paused: true }));
                setScreen("library");
              }}
              aria-label="Back to games"
            >
              ‹ Games
            </button>
          )}
          <strong>{screen === "library" ? "Game library" : gameName}</strong>
          {screen !== "library" && (
            <span>
              {remote ? s.name : letters ? "Solo session" : "Local table"}
            </span>
          )}
        </div>
        <div className="toolbar-actions">
          <span
            className={`connection ${remote && !connected ? "offline" : ""}`}
          >
            {remote
              ? connected
                ? "● Connected"
                : "○ Reconnecting"
              : server
              ? "● PureServer"
              : "● Local play"}
          </span>
          {remote && <button onClick={leave}>Leave room</button>}
          <button
            onClick={full}
            aria-label={fullscreen ? "Exit full screen" : "Full screen"}
          >
            {fullscreen ? "Exit full screen" : "Full screen"}{" "}
            <span aria-hidden="true">⛶</span>
          </button>
        </div>
      </div>
      {error && (
        <div className="notice" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Dismiss message">
            ×
          </button>
        </div>
      )}
      {remote?.error && (
        <div className="notice" role="status">
          {remote.error}
        </div>
      )}
      {screen === "library" ? (
        <Library
          room={s}
          server={server}
          remote={remote}
          onOpen={() => setScreen("table")}
          onSelect={(game) => {
            if (!remote)
              setLocal((v) =>
                v.game === game
                  ? v
                  : {
                      ...v,
                      game,
                      seats:
                        game === "letters"
                          ? [me]
                          : v.game === "letters"
                          ? initial(game).seats
                          : v.seats,
                      arena: "open",
                      phase: "lobby",
                      board: null,
                      paused: true,
                      countdown: 0,
                      scores: {},
                      round: 0,
                    }
              );
          }}
          onArena={(arena) => {
            if (letters && !remote && s.phase === "finished")
              setLocal((v) => ({
                ...v,
                arena,
                phase: "lobby",
                board: null,
                paused: true,
              }));
            else action({ type: "arena", arena });
          }}
          onPlay={() => {
            setScreen("table");
            if (!remote && s.phase !== "playing") void playNow();
            else if (!remote && letters && s.paused) action({ type: "resume" });
          }}
        />
      ) : remote && !remote.state ? (
        <div className="empty-state">
          Connecting to room… <button onClick={leave}>Cancel</button>
        </div>
      ) : (
        <>
          <div className="match">
            <div
              className={`play-surface ${
                letters
                  ? "letters-surface"
                  : tether
                  ? "tether-surface"
                  : noir
                  ? "noir-surface"
                  : words
                  ? "word-surface"
                  : ""
              }`}
            >
              {letters ? (
                <LetterArena
                  onPause={togglePause}
                  onPlay={playNow}
                  board={
                    s.board?.kind === "letters"
                      ? s.board
                      : newLetters(1, s.arena, s.round + 1)
                  }
                  paused={s.paused}
                  lobby={s.phase === "lobby"}
                  onAction={action}
                />
              ) : tether ? (
                <TetherArena
                  board={
                    s.board?.kind === "tether"
                      ? s.board
                      : newTether(
                          Math.max(2, s.seats.length),
                          s.arena,
                          s.round + 1
                        )
                  }
                  seats={s.seats}
                  paused={s.paused}
                  lobby={s.phase === "lobby"}
                  id={id}
                  remote={!!remote}
                  onAction={action}
                  onSteer={steer}
                  onPause={togglePause}
                />
              ) : noir ? (
                <NoirArena
                  board={
                    s.board?.kind === "noir"
                      ? s.board
                      : newNoir(
                          Math.max(2, s.seats.length),
                          s.arena,
                          s.round + 1,
                          42
                        )
                  }
                  seats={s.seats}
                  paused={s.paused}
                  lobby={s.phase === "lobby"}
                  id={id}
                  remote={!!remote}
                  onAction={action}
                  onSteer={steer}
                />
              ) : words ? (
                <WordArena
                  board={
                    s.board?.kind === "words"
                      ? s.board
                      : newWords(
                          Math.max(2, s.seats.length),
                          s.arena,
                          s.round + 1
                        )
                  }
                  seats={s.seats}
                  paused={s.paused}
                  lobby={s.phase === "lobby"}
                  id={id}
                  remote={!!remote}
                  onAction={action}
                  onFocus={(focus, actor) => {
                    const index = localRef.current.seats
                      .filter((p) => !p.bot)
                      .findIndex((p) => p.id === actor);
                    steer({ focus }, remote ? 0 : index);
                  }}
                />
              ) : shoot ? (
                <SkirmishArena
                  board={
                    s.board?.kind === "shoot"
                      ? s.board
                      : newSkirmish(Math.max(2, s.seats.length), s.arena)
                  }
                  seats={s.seats}
                  paused={s.paused}
                  countdown={s.countdown || 0}
                  lobby={s.phase === "lobby"}
                  onSteer={steer}
                  onPause={togglePause}
                  playerIndex={
                    remote ? s.seats.findIndex((p) => p.id === id) : 0
                  }
                />
              ) : orbit ? (
                <OrbitArena
                  board={
                    s.board?.kind === "orbit"
                      ? s.board
                      : newOrbit(Math.max(2, s.seats.length), s.arena)
                  }
                  seats={s.seats}
                  paused={s.paused}
                  countdown={s.countdown || 0}
                  lobby={s.phase === "lobby"}
                  onSteer={steer}
                  onPause={togglePause}
                  playerIndex={
                    remote ? s.seats.findIndex((p) => p.id === id) : 0
                  }
                />
              ) : (
                <Arena
                  board={
                    s.board?.players
                      ? s.board
                      : newRace(Math.max(2, s.seats.length), s.arena)
                  }
                  seats={s.seats}
                  paused={s.paused}
                  countdown={s.countdown || 0}
                  lobby={s.phase === "lobby"}
                  onSteer={steer}
                  onPause={togglePause}
                />
              )}
              {!letters && (
                <div className="arena-actions">
                  {s.phase === "playing" ? (
                    <button
                      className="primary"
                      disabled={!connected || (s.paused && !hostControls)}
                      onClick={togglePause}
                    >
                      {s.paused ? "Resume" : "Pause"}
                    </button>
                  ) : (
                    <button
                      className="primary"
                      disabled={!connected || !hostControls || !ready}
                      onClick={playNow}
                    >
                      {s.phase === "finished"
                        ? letters
                          ? "Next board"
                          : "Play again"
                        : "Play"}
                    </button>
                  )}
                  {remote && s.phase === "lobby" && (
                    <span>
                      {s.seats.length < 2
                        ? "Waiting for a teammate…"
                        : hostControls
                        ? ready
                          ? "Everyone is ready"
                          : "A player disconnected"
                        : "Waiting for the coordinator"}
                    </span>
                  )}
                </div>
              )}
              <div className="control-strip">
                {tether ? (
                  <span>
                    <kbd>↑ ← ↓ →</kbd> Move <kbd>Space</kbd> Hook / release{" "}
                    <kbd>Shift</kbd> Brake
                  </span>
                ) : noir ? (
                  <span>
                    <kbd>↑ ← ↓ →</kbd> Walk <kbd>Shift</kbd> Run <kbd>E</kbd>{" "}
                    Interact
                  </span>
                ) : words || letters ? (
                  <span>
                    <kbd>A–Z</kbd> Type or tap letters
                  </span>
                ) : s.game !== "ribbon" ? (
                  <FlightKeys />
                ) : (
                  <span>
                    <kbd>↑</kbd>
                    <kbd>←</kbd>
                    <kbd>↓</kbd>
                    <kbd>→</kbd> Steer
                  </span>
                )}
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
                {words || letters ? (
                  <span>
                    <kbd>Enter</kbd> Add word
                  </span>
                ) : (
                  !noir && (
                    <span>
                      <kbd>{shoot || tether ? "P" : "Space"}</kbd> Pause /
                      resume
                    </span>
                  )
                )}
                <span>
                  <kbd>Esc</kbd> Exit full screen
                </span>
              </div>
            </div>
            {!letters && (
              <aside className="players-panel">
                <div className="section-heading">
                  <span className="section-label">
                    {coop ? "Team contributions" : "Live scores"}
                  </span>
                  <span>{s.seats.length} / 4</span>
                </div>
                <ol className="players">
                  {s.seats.map((p, i) => (
                    <li key={p.id}>
                      <span
                        className="player-dot"
                        style={{ background: colours[i] }}
                      >
                        {i + 1}
                      </span>
                      <div>
                        <b>
                          {p.name}
                          {remote && p.id === id ? " · you" : ""}
                        </b>
                        <small>
                          {p.bot
                            ? "Game Player"
                            : peers.has(p.id)
                            ? "Ready"
                            : "Disconnected"}{" "}
                          · {s.scores?.[p.id] || 0}{" "}
                          {coop ? "completed" : "wins"}
                        </small>
                        {shoot && s.board?.kind === "shoot" && (
                          <small>
                            {s.board.players[i]?.respawn
                              ? "Respawning…"
                              : `${s.board.players[i]?.hull ?? 3} / 3 hull`}
                          </small>
                        )}
                        {orbit && s.board?.kind === "orbit" && (
                          <small className="orbit-pilot-stat">
                            {s.board.players[i]?.cargo || 0} / 7 cores carried
                          </small>
                        )}
                      </div>
                      <span
                        className="live-score"
                        style={{ "--score-colour": colours[i] }}
                      >
                        <b>
                          {s.board?.players?.[i]?.[
                            s.game !== "ribbon" ? "score" : "points"
                          ] || 0}
                        </b>
                        <small>{shoot ? "knockouts" : "points"}</small>
                      </span>
                      {s.phase === "lobby" && hostControls && p.id !== id && (
                        <button
                          className="icon-button"
                          aria-label={`Remove ${p.name}`}
                          onClick={() => action({ type: "remove", id: p.id })}
                        >
                          −
                        </button>
                      )}
                    </li>
                  ))}
                </ol>
                {s.phase === "lobby" ? (
                  <>
                    <div className="seat-actions">
                      {hostControls && (
                        <button
                          disabled={s.seats.length >= 4}
                          onClick={() => action({ type: "bot" })}
                        >
                          + Game Player
                        </button>
                      )}
                      {!remote && (
                        <button
                          disabled={
                            s.seats.length >= 4 ||
                            s.seats.filter((p) => !p.bot).length >= 2
                          }
                          onClick={() =>
                            setLocal((v) => ({
                              ...v,
                              seats: [
                                ...v.seats,
                                {
                                  id: "local2",
                                  name: "Player two",
                                  bot: false,
                                },
                              ],
                              revision: v.revision + 1,
                            }))
                          }
                        >
                          + Local player
                        </button>
                      )}
                    </div>
                    <div className="setting-section">
                      <span className="section-label">
                        {coop ? "Mode" : "Arena"}
                      </span>
                      <div className="choice-row">
                        {["open", "islands"].map((arena) => (
                          <button
                            key={arena}
                            aria-pressed={s.arena === arena}
                            disabled={!hostControls}
                            onClick={() => action({ type: "arena", arena })}
                          >
                            {game.arenas[arena]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="note">
                      {remote
                        ? hostControls
                          ? "Start when everyone has a seat."
                          : "The coordinator starts the round."
                        : tether
                        ? "Arrows or WASD move. Space hooks. Shift brakes. Player 2 uses WASD, F to hook, X to brake."
                        : noir
                        ? "Move with arrows or WASD. Shift runs. E searches or speaks. Player 2 uses WASD and F."
                        : words
                        ? "Type or tap the rack. All players work toward the same score."
                        : s.seats.filter((p) => !p.bot).length > 1
                        ? shoot
                          ? "Arrows: turn, thrust, brake. Space fires. Player 2: A/D turn, W thrust, S brake, F fires."
                          : orbit
                          ? "Arrows: turn, thrust, brake. Player 2: A/D turn, W thrust, S brake, F dashes."
                          : "Player 1: arrows. Player 2: WASD."
                        : s.game !== "ribbon"
                        ? "Left/right turn. Up thrusts. Down brakes."
                        : "Arrow keys to steer. Game Player runs on-device."}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="round-status">
                      <span className="section-label">Round {s.round}</span>
                      <h3 role="status">
                        {s.phase === "finished"
                          ? "Round finished"
                          : s.paused
                          ? "Paused"
                          : s.countdown > 0
                          ? "Get ready"
                          : "In play"}
                      </h3>
                    </div>
                    {hostControls && (
                      <button
                        className="wide"
                        onClick={() => action({ type: "lobby" })}
                      >
                        Edit table
                      </button>
                    )}
                  </>
                )}
                <div className="rules">
                  <span className="section-label">How to play</span>
                  {game.rules.map((rule) => (
                    <p key={rule}>{rule}</p>
                  ))}
                </div>
                {remote && (
                  <div className="invite-summary">
                    <span className="section-label">Invite a teammate</span>
                    <p className="note">
                      They choose Play, enter this invitation code and select
                      Join game.
                    </p>
                    <input
                      className="invite-code"
                      aria-label="Room code"
                      readOnly
                      value={code}
                      onFocus={(e) => e.target.select()}
                    />
                    <p className="note">
                      Add a Game Player if you want a robot at the table too.
                    </p>
                  </div>
                )}
                {remote && (
                  <details>
                    <summary>Room details</summary>
                    <p className="note">
                      Invite teammates to PureGames → Play → this room. Access
                      follows the folder.
                    </p>
                    <code>{roomPath}</code>
                  </details>
                )}
              </aside>
            )}
          </div>
          <div className="game-statusbar">
            <span>
              {remote ? "Shared table" : "Local session"} ·{" "}
              {game.arenas[s.arena]}
            </span>
            <span>
              {remote
                ? hostControls
                  ? "You coordinate this room"
                  : "Connected to room coordinator"
                : "No server required"}
            </span>
          </div>
        </>
      )}
      {invite && (
        <div className="dialog-shade">
          <section
            className="play-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Who would you like to play?"
          >
            <div className="dialog-head">
              <h2>Who would you like to play?</h2>
              <button aria-label="Cancel" onClick={() => setInvite(false)}>
                ×
              </button>
            </div>
            <p>
              Connected to {server?.organisation || "PureServer"}. Play with a
              Game Player or invite people from your team.
            </p>
            <button className="primary" onClick={robot}>
              {coop ? "Play with Game Player" : "Play against Game Player"}
            </button>
            <button className="secondary" disabled={busy} onClick={inviteTeam}>
              {busy ? "Creating invitation…" : "Invite teammates"}
            </button>
            <label className="inline-label" htmlFor="room-code">
              Have an invitation?
            </label>
            <input
              id="room-code"
              className="invite-code"
              value={joinCode}
              placeholder="Room code"
              maxLength={8}
              onChange={(e) =>
                setJoinCode(
                  e.target.value.toUpperCase().replace(/[^A-F0-9]/g, "")
                )
              }
            />
            <button
              className="secondary"
              disabled={joinCode.length !== 8 || busy}
              onClick={() => openRoom(`${ROOT}/${joinCode}.puregames`)}
            >
              Join game
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")).render(
  <AppFrame identityAppSlug="games">
    <App />
  </AppFrame>
);
