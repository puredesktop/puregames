// Deterministic co-op simulation. Rendering and transport stay outside the rules.
export const NEIGHBOURS = [
  {
    name: "The Keeper",
    kind: "vampire",
    x: -5.2,
    z: 3,
    colour: "#66616b",
    roof: "#252a34",
    candy: "The iron key",
    question:
      "You have been here before. The street remembers your footsteps. Do you?",
    options: [
      "Tell me how to leave.",
      "What is following us?",
      "I have never been here.",
    ],
    replies: [
      "Six doors. Six things you left behind. Bring them to the gate before the street forgets your name.",
      "It cannot cross a lit threshold. Keep it in your light. Do not let it reach you.",
      "That is what you said the last time. Take the key. This time, do not stop.",
    ],
  },
  {
    name: "The Listener",
    kind: "witch",
    x: 5.2,
    z: 7,
    colour: "#465652",
    roof: "#253237",
    candy: "A broken recording",
    question:
      "There is a voice on the telephone upstairs. It sounds exactly like you. It is asking to come in.",
    options: [
      "Unplug the telephone.",
      "What is it saying?",
      "Give me the recording.",
    ],
    replies: [
      "I did. Seventeen years ago. It has not stopped ringing.",
      "Your name. Over and over. A little closer each time.",
      "Do not play it until you are somewhere the windows open.",
    ],
  },
  {
    name: "The Groundsman",
    kind: "wolf",
    x: -5.2,
    z: 12,
    colour: "#685b55",
    roof: "#2a2933",
    candy: "The missing photograph",
    question:
      "Every night I bury the same photograph. Every morning it is back on my table. Tonight, you are in it.",
    options: [
      "Let me see it.",
      "Who is standing behind me?",
      "I will take it away.",
    ],
    replies: [
      "Look at the windows. They are all looking out. Except that one.",
      "There was nobody behind you when I took it. There is now.",
      "Then walk. If the lamps go out, get to a porch. Do not wait for me.",
    ],
  },
  {
    name: "The Seamstress",
    kind: "mummy",
    x: 5.2,
    z: 16,
    colour: "#746d60",
    roof: "#302e38",
    candy: "A length of red thread",
    question:
      "I stitched the doors shut from the inside. Someone has been unpicking them from the other side.",
    options: [
      "Why did you lock us in?",
      "Who lives across the street?",
      "Give me the thread.",
    ],
    replies: [
      "I was not keeping you in. Listen. That is not the wind.",
      "That house has been empty since the fire. Do not answer if it calls you by name.",
      "Tie it to something you remember. When the street changes, follow it back.",
    ],
  },
  {
    name: "The Unseen",
    kind: "ghost",
    x: -5.2,
    z: 21,
    colour: "#576673",
    roof: "#29303d",
    candy: "A name scratched in glass",
    question:
      "I can see all of you. There is one more shadow than there should be. Please do not turn around.",
    options: [
      "We are leaving together.",
      "Whose name is on the glass?",
      "What happens at the last door?",
    ],
    replies: [
      "Then keep each other in sight. It borrows the shape of people who fall behind.",
      "Yours, before you arrived. Mine, before I disappeared. Break the pattern.",
      "The gate will remember where it leads. You must remember to walk through it.",
    ],
  },
  {
    name: "The Last Resident",
    kind: "skeleton",
    x: 5.2,
    z: 25,
    colour: "#605b6b",
    roof: "#272936",
    candy: "The gatekeeper’s seal",
    question:
      "You have brought everything back. One question remains. When you leave, who will close the gate?",
    options: [
      "We will close it together.",
      "Nobody else stays here.",
      "Open the gate.",
    ],
    replies: [
      "Then do not let go. Not until you hear the latch.",
      "That is what I hoped you would say. Take the seal. I am very tired.",
      "It is open. The street behind you is not the street you came down. Keep walking.",
    ],
  },
];
export const WRAPPERS = [
  { x: 0.9, z: 1 },
  { x: -1, z: 8 },
  { x: 1.2, z: 14 },
  { x: -1, z: 20 },
  { x: 0.8, z: 25 },
];
export const normalAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
export function newHalloween(count = 1, arena = "open", round = 1) {
  if (!Number.isInteger(count) || count < 1 || count > 4)
    throw Error("Gourd Street welcomes one to four players.");
  return {
    kind: "halloween",
    arena,
    round,
    players: Array.from({ length: count }, (_, i) => ({
      x: count === 1 ? 0 : (i - (count - 1) / 2) * 0.85,
      z: -4,
      yaw: 0,
      alive: true,
      score: 0,
    })),
    visited: [],
    sweets: [],
    collected: [],
    dialogue: null,
    escapeRequired: true,
    watcher: { x: 0, z: 31 },
    ticks: 0,
    done: false,
    winners: [],
  };
}
// Older saved solo rounds stored one dialogue at the board root.
export const dialogueFor = (board, seat = 0) =>
  board.dialogues
    ? board.dialogues[seat] || null
    : seat === 0
    ? board.dialogue
    : null;
export function nearestPorch(board, seat = 0) {
  const p = board.players[seat];
  if (!p) return null;
  return (
    NEIGHBOURS.map((n, id) => ({
      ...n,
      id,
      distance: Math.hypot(p.x - n.x, p.z - n.z),
    }))
      .filter((n) => !board.visited.includes(n.id))
      .sort((a, b) => a.distance - b.distance)[0] || null
  );
}
function withDialogue(board, seat, value) {
  const dialogues = board.players.map((_, i) =>
    i === seat ? value : dialogueFor(board, i)
  );
  return { ...board, dialogues, dialogue: dialogues[0] };
}
export function halloweenCommand(board, seat, action) {
  if (
    !Number.isInteger(seat) ||
    !board.players[seat] ||
    board.players[seat].escaped ||
    board.done
  )
    return board;
  const p = board.players[seat],
    dialogue = dialogueFor(board, seat);
  const player = (patch) =>
    board.players.map((v, i) => (i === seat ? { ...v, ...patch } : v));
  if (action.type === "interact" && !dialogue) {
    const next = nearestPorch(board, seat);
    return next && next.distance <= 2.65
      ? withDialogue(board, seat, { id: next.id, choice: null })
      : board;
  }
  if (
    action.type === "choice" &&
    dialogue?.choice === null &&
    Number.isInteger(action.choice) &&
    action.choice >= 0 &&
    action.choice < 3
  ) {
    return {
      ...withDialogue(board, seat, { id: dialogue.id, choice: action.choice }),
      sweets: [...board.sweets, NEIGHBOURS[dialogue.id].candy],
      players: player({ score: p.score + 5 }),
    };
  }
  if (action.type === "continue" && dialogue && dialogue.choice !== null) {
    const next = withDialogue(board, seat, null);
    const visited = [...new Set([...board.visited, dialogue.id])];
    const done =
      !board.escapeRequired &&
      visited.length === NEIGHBOURS.length &&
      !next.dialogues.some(Boolean);
    return {
      ...next,
      visited,
      done,
      winners: done ? board.players.map((_, i) => i) : [],
    };
  }
  if (action.type === "look" && !dialogue && Number.isFinite(action.delta)) {
    return {
      ...board,
      players: player({
        yaw: normalAngle(p.yaw + Math.max(-0.4, Math.min(0.4, action.delta))),
      }),
    };
  }
  if (action.type === "orient" && !dialogue) {
    const n =
      nearestPorch(board, seat) ||
      (board.visited.length === 6 ? { x: 0, z: -5.5 } : null);
    return n
      ? { ...board, players: player({ yaw: Math.atan2(n.x - p.x, n.z - p.z) }) }
      : board;
  }
  return board;
}
export function watcherDistance(board, seat = 0) {
  const p = board.players[seat];
  return p && board.visited.length && board.watcher
    ? Math.hypot(p.x - board.watcher.x, p.z - board.watcher.z)
    : Infinity;
}
export function stepHalloween(board, inputs = {}) {
  if (board.done || board.players.every((_, i) => dialogueFor(board, i)))
    return board;
  const collected = [...board.collected];
  const unit = (n) => (Number.isFinite(n) ? Math.max(-1, Math.min(1, n)) : 0);
  const players = board.players.map((p, seat) => {
    if (dialogueFor(board, seat) || p.escaped) return p;
    const raw = inputs[seat] || {},
      yaw = normalAngle(p.yaw + unit(raw.turn) * 0.15);
    let forward = unit(raw.forward),
      strafe = unit(raw.strafe);
    const length = Math.max(1, Math.hypot(forward, strafe));
    forward /= length;
    strafe /= length;
    const speed = raw.run ? 0.42 : 0.27;
    const x = Math.max(
      -4.6,
      Math.min(
        4.6,
        p.x + (Math.sin(yaw) * forward + Math.cos(yaw) * strafe) * speed
      )
    );
    const z = Math.max(
      -5.5,
      Math.min(
        29,
        p.z + (Math.cos(yaw) * forward - Math.sin(yaw) * strafe) * speed
      )
    );
    const found = WRAPPERS.flatMap((w, i) =>
      !collected.includes(i) && Math.hypot(x - w.x, z - w.z) < 0.7 ? [i] : []
    );
    collected.push(...found);
    return { ...p, x, z, yaw, score: p.score + found.length };
  });
  let watcher = board.watcher || { x: 0, z: 31 };
  if (board.visited.length) {
    const exposed = players
      .map((p, i) => ({
        p,
        i,
        distance: Math.hypot(p.x - watcher.x, p.z - watcher.z),
      }))
      .filter(
        ({ p, i }) =>
          !p.escaped &&
          Math.abs(p.x) < 3.5 &&
          !dialogueFor(board, i) &&
          board.ticks - (p.caughtAt ?? -1000) > 90
      )
      .sort((a, b) => a.distance - b.distance);
    if (exposed.length) {
      const target = exposed[0],
        dx = target.p.x - watcher.x,
        dz = target.p.z - watcher.z;
      const lit = players.some(
        (p, i) =>
          !dialogueFor(board, i) &&
          Math.hypot(p.x - watcher.x, p.z - watcher.z) < 11 &&
          Math.abs(
            normalAngle(Math.atan2(watcher.x - p.x, watcher.z - p.z) - p.yaw)
          ) < 0.38
      );
      const speed = lit ? -0.055 : 0.095;
      watcher = {
        x: Math.max(
          -2.6,
          Math.min(
            2.6,
            watcher.x + (dx / Math.max(0.1, target.distance)) * speed
          )
        ),
        z: Math.max(
          -5,
          Math.min(
            32,
            watcher.z + (dz / Math.max(0.1, target.distance)) * speed
          )
        ),
      };
      players.forEach((p, i) => {
        if (
          !p.escaped &&
          !dialogueFor(board, i) &&
          Math.abs(p.x) < 3.5 &&
          board.ticks - (p.caughtAt ?? -1000) > 90 &&
          Math.hypot(p.x - watcher.x, p.z - watcher.z) < 0.85
        )
          players[i] = {
            ...p,
            x: (i - (players.length - 1) / 2) * 0.85,
            z: -4,
            yaw: 0,
            caughtAt: board.ticks,
          };
      });
    }
  }
  let done = false;
  if (
    board.escapeRequired &&
    board.visited.length === 6 &&
    !players.some((_, i) => dialogueFor(board, i))
  ) {
    players.forEach((p, i) => {
      if (p.z <= -4.8) players[i] = { ...p, escaped: true };
    });
    done = players.every((p) => p.escaped);
  }
  return {
    ...board,
    ticks: board.ticks + 1,
    collected,
    players,
    watcher,
    done,
    winners: done ? players.map((_, i) => i) : board.winners,
  };
}
