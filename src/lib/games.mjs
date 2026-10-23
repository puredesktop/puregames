export const GAMES = {
  words: {
    name: "Word Loom",
    subtitle: "Cooperative word puzzle",
    genre: "Cooperative · Words",
    tagline: "Eight clues. One shared discovery.",
    description:
      "Make words from one rack of letters. Solve clues together, share hints, and weave a perfect board.",
    arenas: { open: "Three-minute round", islands: "Relaxed" },
    goal: "8 clues · One team score",
    rules: [
      "Solve eight clues using the shared letter rack. Type an answer or tap letters, then press Enter. Each tile can be used once per answer.",
      "Every solved clue adds to the team score. Three shared hints reveal letters, costing 2 points each. Game Player helps every 20 seconds and leaves occupied clues for people.",
    ],
  },
  shoot: {
    name: "Star Skirmish",
    subtitle: "Space shootout",
    genre: "Real-time · Space shootout",
    tagline: "Fly. Fire. Stay in the fight.",
    description:
      "Turn toward a rival and hold Space. Dodge their fire, respawn, and race to five knockouts.",
    arenas: { open: "Deep space", islands: "Asteroid field" },
    goal: "First to 5 · 90 second rounds",
    rules: [
      "Left/right turn gradually. Up thrusts; Down brakes. Hold Space to fire. Three hits destroy a ship; score one point per knockout.",
      "Respawn after 2 seconds with a brief shield. Firing ends your shield. First to 5 wins, or highest score after 90 seconds. P pauses.",
    ],
  },
  orbit: {
    name: "Orbit Rally",
    subtitle: "Cosmic score chase",
    genre: "Real-time · Score chase",
    tagline: "Fortune favours the fast.",
    description:
      "Scoop up starlight. Dash through danger. Bank your haul before a rival beats you to 20.",
    arenas: { open: "Nebula", islands: "Solar storm" },
    goal: "First to 20 · 90 second rounds",
    rules: [
      "Left/right turn, Up thrusts, Down brakes. Collect cyan cores and fly into a gold BANK gate. First to 20 points wins, or highest score after 90 seconds.",
      "Bank 5 or more cores for +2 bonus points. Red hazards spill up to 3 cores. Shift dashes with a brief shield; recharge takes 4 seconds. Nobody is eliminated.",
    ],
  },
  ribbon: {
    name: "Ribbon Run",
    subtitle: "Trail survival",
    genre: "Real-time · Survival",
    tagline: "Make your next turn count.",
    description:
      "Leave a trail. Cut off your rivals. Keep moving until you’re the last one left.",
    arenas: { open: "Open field", islands: "Four islands" },
    goal: "Last marker moving wins",
    rules: [
      "Keep moving. Avoid every trail, island and border—including your own trail. The last marker moving wins.",
      "Earn 1 point per step survived and 50 bonus points for winning. A simultaneous crash is a draw. Round wins carry across games.",
    ],
  },
};
