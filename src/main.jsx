import { VectorArena } from "./VectorArena.jsx";
import { newVector } from "./lib/vector-wake.mjs";
import { HalloweenArena } from "./HalloweenArena.jsx";
import { newHalloween } from "./lib/halloween.mjs";
import "./halloween.css";
import { ActiveGames } from "./ActiveGames.jsx";
import { TeamPicker } from "./TeamPicker.jsx";
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
import {
  createRoom,
  command,
  advance,
  isSoloGame,
  canPlayAlone,
} from "./lib/room.mjs";
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
const initial = (game = "vector") =>
  canPlayAlone(game)
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
    [invite, setInvite] = useState(null),
    [server, setServer] = useState(null),
    [joinCode, setJoinCode] = useState(""),
    [code, setCode] = useState(""),
    [wantedRoom, setWantedRoom] = useState(""),
    [sentInvites, setSentInvites] = useState([]),
    [sending, setSending] = useState(false);
  const connection = useRef(null),
    directions = useRef({}),
    localRef = useRef(local),
    surface = useRef(null),
    requestedResource = useRef("");
  localRef.current = local;
  const s = remote?.state || local,
    id = remote ? remote.id : "local",
    host = remote ? remote.host : "local";
  const peers =
    remote?.peers ||
    new Map(local.seats.filter((p) => !p.bot).map((p) => [p.id, p]));
  const vector = s.game === "vector",
    halloween = s.game === "halloween",
    solo = isSoloGame(s.game),
    letters = s.game === "letters",
    tether = s.game === "tether",
    noir = s.game === "noir",
    coop = ["noir", "words", "tether", "halloween"].includes(s.game),
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
  useEffect(() => {
    const receive = (resource) => {
      const path = resource?.path;
      if (
        typeof path !== "string" ||
        !/^\/Workspace\/Games\/[A-F0-9]{8}\.puregames$/.test(path)
      )
        return;
      setScreen("table");
      if (requestedResource.current === path) return;
      requestedResource.current = path;
      setWantedRoom(path);
    };
    let done = false;
    void bridge.waitForReady().then((meta) => {
      if (!done) receive(meta.viewport?.resource);
    });
    const off = bridge.onEvent("resource.open", receive);
    return () => {
      done = true;
      off();
    };
  }, []);
  useEffect(() => {
    if (!server || !wantedRoom) return;
    setWantedRoom("");
    if (wantedRoom !== roomPath) void openRoom(wantedRoom);
  }, [server, wantedRoom]);
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
        vector
          ? ".vector-stage"
          : halloween
          ? ".halloween-stage"
          : letters
          ? ".letter-entry"
          : words
          ? ".word-entry"
          : ".arena-wrap"
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
        throw Error("This is not a supported PureGames game.");
      // Retired games return to a Ribbon Run lobby when an older room is reopened.
      if (saved.state && !Object.hasOwn(GAMES, saved.state.game))
        delete saved.state;
      const session = await request("join", path);
      if (!session?.url)
        throw Error("This host does not support a PureServer live connection.");
      connection.current?.close();
      requestedResource.current = path;
      setRoomPath(path);
      setCode(path.split("/").pop().replace(".puregames", ""));
      setInvite(null);
      setRemote({ state: null, connected: false, id: "", peers: new Map() });
      setScreen("table");
      setSentInvites([]);
      connection.current = connectRoom({
        session,
        saved,
        name: saved.name || title,
        write: (text) => request("write", path, text),
        onChange: setRemote,
        bridge,
      });
      return path;
    } catch (e) {
      requestedResource.current = "";
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function leave(destination = server ? "active" : "library") {
    requestedResource.current = "";
    connection.current?.close();
    connection.current = null;
    setRemote(null);
    setLocal(initial(s.game));
    directions.current = {};
    setRoomPath("");
    setCode("");
    setScreen(destination);
    setError("");
  }
  function showInvite(mode) {
    setLocal((v) => ({ ...v, paused: true }));
    setError("");
    setJoinCode("");
    setInvite(mode);
  }
  async function playNow() {
    if (solo && !remote) {
      action({ type: s.phase === "finished" ? "rematch" : "start" });
      focusArena();
    } else if (remote) {
      action({ type: s.phase === "finished" ? "rematch" : "start" });
      focusArena();
    } else if (server) {
      showInvite("choose");
    } else {
      action({ type: s.phase === "finished" ? "rematch" : "start" });
      focusArena();
    }
  }
  function robot() {
    setInvite(null);
    if (remote) leave("table");
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
    return openRoom(`${ROOT}/${next}.puregames`, true);
  }
  async function invitePeople(people) {
    setSending(true);
    setError("");
    try {
      const path = remote ? roomPath : await inviteTeam();
      if (!path) throw Error("The game could not be opened. Try again.");
      await bridge.call("collab.invite", [
        { path, people: people.map((p) => p.id), title: gameName },
      ]);
      setSentInvites(people);
      setInvite(null);
      setScreen("table");
    } catch (e) {
      setError(e.message);
      setInvite("team");
    } finally {
      setSending(false);
    }
  }
  const ready =
    (canPlayAlone(s.game) ? s.seats.length >= 1 : s.seats.length >= 2) &&
    s.seats.every((p) => p.bot || peers.has(p.id));
  return (
    <div
      className={`game-viewport software ${
        vector
          ? "vector-mode"
          : letters
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
          <button
            onClick={() => {
              if (!remote) setLocal((v) => ({ ...v, paused: true }));
              setScreen("library");
            }}
            aria-label="Game library"
          >
            Games
          </button>
          {server && (
            <button
              className={screen === "active" ? "selected" : ""}
              onClick={() => setScreen("active")}
            >
              Active games
            </button>
          )}
          {remote && screen !== "table" && (
            <button onClick={() => setScreen("table")}>Back to game</button>
          )}
          <strong>
            {screen === "active"
              ? "Your team"
              : screen === "library"
              ? "Game library"
              : gameName}
          </strong>
          {screen === "table" && (
            <span>
              {remote ? "Team game" : solo ? "Solo game" : "Local game"}
            </span>
          )}
        </div>
        <div className="toolbar-actions">
          <span
            className={`connection ${remote && !connected ? "offline" : ""}`}
          >
            {remote
              ? connected
                ? `● ${peers.size} ${
                    peers.size === 1 ? "person" : "people"
                  } connected`
                : "○ Reconnecting"
              : server
              ? "● PureServer"
              : "● Local play"}
          </span>
          {remote ? (
            <>
              <button
                onClick={() => connection.current?.reconnect()}
                disabled={busy}
              >
                Reconnect
              </button>
              <button onClick={() => leave()} disabled={busy}>
                Stop playing
              </button>
            </>
          ) : (
            server && (
              <button onClick={() => showInvite("join")}>Enter code</button>
            )
          )}
          <button
            onClick={full}
            aria-label={fullscreen ? "Exit full screen" : "Full screen"}
          >
            {fullscreen ? "Exit full screen" : "Full screen"}{" "}
            <span aria-hidden="true">⛶</span>
          </button>
        </div>
      </div>
      {error && !invite && (
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
      {screen === "active" && server ? (
        <ActiveGames
          currentPath={roomPath}
          busy={busy}
          onJoin={openRoom}
          onReturn={() => setScreen("table")}
          onLibrary={() => {
            if (remote) leave("library");
            else setScreen("library");
          }}
        />
      ) : screen === "library" ? (
        <Library
          room={s}
          server={server}
          remote={remote}
          onOpen={() => setScreen("table")}
          onSelect={(game) => {
            if (remote) {
              leave("library");
              setLocal(initial(game));
              return;
            }
            if (!remote)
              setLocal((v) =>
                v.game === game
                  ? v
                  : {
                      ...v,
                      game,
                      seats: canPlayAlone(game)
                        ? [me]
                        : canPlayAlone(v.game)
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
            if ((letters || vector) && !remote && s.phase === "finished")
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
            else if (!remote && canPlayAlone(s.game) && s.paused)
              action({ type: "resume" });
          }}
        />
      ) : remote?.state?.ended ? (
        <div className="active-empty">
          <h2>This game has ended</h2>
          <p>Start another game or see what your teammates are playing.</p>
          <button className="primary" onClick={() => leave()}>
            Active games
          </button>
        </div>
      ) : remote && !remote.state ? (
        <div className="empty-state">
          Connecting to game… <button onClick={() => leave()}>Cancel</button>
        </div>
      ) : vector ? (
        <VectorArena
          board={s.board?.kind === "vector" ? s.board : newVector(1, s.arena)}
          lobby={s.phase === "lobby"}
          paused={s.paused}
          onSteer={steer}
          onPause={togglePause}
          onPlay={playNow}
          onLobby={() => action({ type: "lobby" })}
        />
      ) : halloween ? (
        <HalloweenArena
          board={
            s.board?.kind === "halloween"
              ? s.board
              : newHalloween(Math.max(1, s.seats.length))
          }
          seat={s.seats.findIndex((p) => p.id === id)}
          seats={s.seats}
          peers={peers}
          remote={Boolean(remote)}
          code={code}
          hostControls={hostControls}
          connected={connected}
          ready={ready}
          onJoin={() => action({ type: "join" })}
          onInvite={server ? () => showInvite("team") : null}
          onLobby={() => action({ type: "lobby" })}
          onRemove={(id) => action({ type: "remove", id })}
          onEnd={() => action({ type: "end" })}
          paused={s.paused}
          lobby={s.phase === "lobby"}
          onAction={action}
          onSteer={steer}
          onPause={togglePause}
          onPlay={playNow}
        />
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
                  {s.phase !== "lobby" && hostControls && (
                    <button
                      disabled={!connected}
                      onClick={() => action({ type: "lobby" })}
                    >
                      Reset round
                    </button>
                  )}
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
                        Players & settings
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
                    <span className="section-label">Teammates</span>
                    <button
                      className="primary wide"
                      disabled={busy || sending || s.seats.length >= 4}
                      onClick={() => showInvite("team")}
                    >
                      Add player
                    </button>
                    {sentInvites.length > 0 && (
                      <p className="note" role="status">
                        Invitation sent to{" "}
                        {sentInvites.map((p) => p.name).join(", ")}. They can
                        press Join from their notification.
                      </p>
                    )}
                    {hostControls && (
                      <button
                        className="wide"
                        onClick={() => action({ type: "end" })}
                      >
                        End game for everyone
                      </button>
                    )}
                    <details>
                      <summary>Invite with a code instead</summary>
                      <p className="note">
                        Your teammate chooses Join game in the toolbar and
                        enters this code. Both names must appear here before you
                        start.
                      </p>
                      <input
                        className="invite-code"
                        aria-label="Game code"
                        readOnly
                        value={code}
                        onFocus={(e) => e.target.select()}
                      />
                      <p className="note">
                        {peers.size < 2
                          ? "Only you are connected. Your teammate must join this code, not start a different game."
                          : "Everyone sees the same live game. You can add Game Players too."}
                      </p>
                    </details>
                  </div>
                )}
                {remote && (
                  <details>
                    <summary>Connection details</summary>
                    <p className="note">
                      Connected to {server?.organisation || "PureServer"}.
                      Everyone must use the same server and game code.
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
                  ? "You host this game"
                  : "Connected to game host"
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
            aria-label={
              invite === "team"
                ? "Invite teammates"
                : invite === "join"
                ? "Join a teammate’s game"
                : "Who would you like to play?"
            }
          >
            <div className="dialog-head">
              <h2>
                {invite === "team"
                  ? "Invite teammates"
                  : invite === "join"
                  ? "Join a teammate’s game"
                  : "Who would you like to play?"}
              </h2>
              <button
                aria-label="Cancel"
                disabled={busy || sending}
                onClick={() => setInvite(null)}
              >
                ×
              </button>
            </div>
            <p>
              Connected to {server?.organisation || "PureServer"}.
              {invite === "team"
                ? " Choose people from your organisation. They receive a Join invitation on their desktop or in PureCloud."
                : invite === "join"
                ? " Enter the code shown on your teammate’s game."
                : " Start a new game or join a teammate."}
              {halloween &&
                !remote &&
                invite === "team" &&
                s.phase === "playing" &&
                " This starts a new co-op round."}
            </p>
            {error && (
              <div className="notice" role="alert">
                {error}
              </div>
            )}
            {invite === "team" ? (
              <TeamPicker
                bridge={bridge}
                limit={remote ? 4 - s.seats.length : 3}
                busy={busy || sending}
                onInvite={invitePeople}
              />
            ) : invite === "choose" ? (
              <>
                <button className="primary" disabled={busy} onClick={robot}>
                  {halloween
                    ? "Play on my own"
                    : coop
                    ? "Play with Game Player"
                    : "Play against Game Player"}
                </button>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => showInvite("team")}
                >
                  Invite teammates
                </button>
                <div className="join-divider">Already have a code?</div>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => showInvite("join")}
                >
                  Join a teammate’s game
                </button>
              </>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (/^[A-F0-9]{8}$/.test(joinCode) && !busy)
                    void openRoom(`${ROOT}/${joinCode}.puregames`);
                }}
              >
                <label className="inline-label" htmlFor="room-code">
                  Game code
                </label>
                <input
                  id="room-code"
                  className="invite-code"
                  value={joinCode}
                  placeholder="8-character code"
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  disabled={busy}
                  onChange={(e) => {
                    setError("");
                    setJoinCode(
                      e.target.value.toUpperCase().replace(/[\s-]/g, "")
                    );
                  }}
                />
                <button
                  className="primary"
                  type="submit"
                  disabled={!/^[A-F0-9]{8}$/.test(joinCode) || busy}
                >
                  {busy ? "Joining game…" : "Join game"}
                </button>
                <p>You’ll see your teammate’s name and share the same round.</p>
              </form>
            )}
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
