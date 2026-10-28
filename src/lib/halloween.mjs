// Original solo Halloween game. No network, model calls or external assets.
export const NEIGHBOURS = [
  {
    name: "Count Snackula",
    kind: "vampire",
    x: -5.2,
    z: 3,
    colour: "#804f86",
    roof: "#352846",
    candy: "Bat-shaped biscuits",
    question:
      "Welcome! I have spent 400 years perfecting my entrance. Too much cape?",
    options: [
      "There is no such thing as too much cape.",
      "Have you considered a cardigan?",
      "Only if it gets caught in the door.",
    ],
    replies: [
      "Finally, someone with taste. Unlike my biscuits. Those are mostly charcoal.",
      "A countigan! I shall patent it immediately.",
      "It has. Three times tonight. Please use the other door.",
    ],
  },
  {
    name: "Winnie the Witch",
    kind: "witch",
    x: 5.2,
    z: 7,
    colour: "#53716a",
    roof: "#293e47",
    candy: "Suspiciously normal toffees",
    question: "I turned my ex into a frog. Now he has a podcast. What do I do?",
    options: [
      "Unsubscribe.",
      "Turn him into a quieter frog.",
      "Ask him to hop to the point.",
    ],
    replies: [
      "A powerful spell. Why did I not think of that?",
      "He has already bought a smaller microphone.",
      "That is, unfortunately, the name of his podcast.",
    ],
  },
  {
    name: "Doug, the Werewolf",
    kind: "wolf",
    x: -5.2,
    z: 12,
    colour: "#a16d54",
    roof: "#4d334c",
    candy: "Moonmallow bites",
    question:
      "Everyone says I am a terrifying beast. But look: I brought you a stick.",
    options: [
      "An excellent stick, Doug.",
      "Who is a good terrifying beast?",
      "Is this locally sourced?",
    ],
    replies: [
      "Thank you. I have been carrying this review around all night.",
      "ME. Sorry. Indoor voice. Me.",
      "Yes. From the tree directly behind you. Five stars for provenance.",
    ],
  },
  {
    name: "Mavis the Mummy",
    kind: "mummy",
    x: 5.2,
    z: 16,
    colour: "#907960",
    roof: "#433952",
    candy: "Caramel unravels",
    question:
      "I tried yoga. Now I am emotionally and physically unravelled. Advice?",
    options: [
      "Take it one wrap at a time.",
      "Try the child’s pose. You are only 3,000.",
      "Have a little lie down.",
    ],
    replies: [
      "A beautifully layered answer. Have some caramel.",
      "My physiotherapist said the same thing. He was a sphinx.",
      "I did. For 2,000 years. Still tired.",
    ],
  },
  {
    name: "Gail, a Ghost",
    kind: "ghost",
    x: -5.2,
    z: 21,
    colour: "#687996",
    roof: "#323c5d",
    candy: "Boo-berry chews",
    question: "Be honest. Does this sheet make me look haunted?",
    options: [
      "You look boo-tiful.",
      "Very on brand.",
      "It has excellent drape.",
    ],
    replies: [
      "That is the nicest thing anyone has said since 1894.",
      "Thank you. My brand consultant is a medium.",
      "It is fitted. The elastic is doing most of the haunting.",
    ],
  },
  {
    name: "Sid the Skeleton",
    kind: "skeleton",
    x: 5.2,
    z: 25,
    colour: "#78628c",
    roof: "#3e2b50",
    candy: "Funny-bone fudge",
    question: "I want to join the band, but they say I have no body of work.",
    options: [
      "You have excellent composition.",
      "Try the trom-bone.",
      "Ask for a skeleton crew.",
    ],
    replies: [
      "Thank you. I do hold myself together rather well.",
      "YES. Finally a career with dental benefits.",
      "I did. It was just me and a very nervous drummer.",
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
  if (count !== 1) throw Error("Boo, Please! is a solo game.");
  return {
    kind: "halloween",
    arena,
    round,
    players: [{ x: 0, z: -4, yaw: 0, alive: true, score: 0 }],
    visited: [],
    sweets: [],
    collected: [],
    dialogue: null,
    ticks: 0,
    done: false,
    winners: [],
  };
}
export function nearestPorch(board) {
  const p = board.players[0];
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
export function halloweenCommand(board, seat, action) {
  if (seat !== 0 || board.done) return board;
  const p = board.players[0];
  if (action.type === "interact" && !board.dialogue) {
    const next = nearestPorch(board);
    return next && next.distance <= 2.65
      ? { ...board, dialogue: { id: next.id, choice: null } }
      : board;
  }
  if (
    action.type === "choice" &&
    board.dialogue?.choice === null &&
    Number.isInteger(action.choice) &&
    action.choice >= 0 &&
    action.choice < 3
  ) {
    const id = board.dialogue.id;
    return {
      ...board,
      dialogue: { id, choice: action.choice },
      sweets: [...board.sweets, NEIGHBOURS[id].candy],
      players: [{ ...p, score: p.score + 5 }],
    };
  }
  if (
    action.type === "continue" &&
    board.dialogue &&
    board.dialogue.choice !== null
  ) {
    const visited = [...board.visited, board.dialogue.id];
    const done = visited.length === NEIGHBOURS.length;
    return {
      ...board,
      dialogue: null,
      visited,
      done,
      winners: done ? [0] : [],
    };
  }
  if (
    action.type === "look" &&
    !board.dialogue &&
    Number.isFinite(action.delta)
  ) {
    return {
      ...board,
      players: [
        {
          ...p,
          yaw: normalAngle(p.yaw + Math.max(-0.4, Math.min(0.4, action.delta))),
        },
      ],
    };
  }
  if (action.type === "orient" && !board.dialogue) {
    const n = nearestPorch(board);
    return n
      ? { ...board, players: [{ ...p, yaw: Math.atan2(n.x - p.x, n.z - p.z) }] }
      : board;
  }
  return board;
}
export function stepHalloween(board, inputs = {}) {
  if (board.done || board.dialogue) return board;
  const raw = inputs[0] || {};
  const unit = (n) => (Number.isFinite(n) ? Math.max(-1, Math.min(1, n)) : 0);
  const p = board.players[0],
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
    !board.collected.includes(i) && Math.hypot(x - w.x, z - w.z) < 0.7
      ? [i]
      : []
  );
  return {
    ...board,
    ticks: board.ticks + 1,
    collected: [...board.collected, ...found],
    players: [{ ...p, x, z, yaw, score: p.score + found.length }],
  };
}
