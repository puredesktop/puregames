export const GAMES = {
  letters: {
    name: "Letterlight",
    subtitle: "Solo word discovery",
    genre: "Solo · Words · Discovery",
    tagline: "A little room for words.",
    description:
      "Follow the letters. Uncover six words hidden around a theme, and gather bonus discoveries along the way. Just you, a fresh board, and one more word.",
    arenas: { open: "Unhurried", islands: "Three minutes" },
    goal: "6 theme words · Bonus discoveries · Just you",
    rules: [
      "Trace neighbouring letters, including diagonals, without reusing a tile. Release a traced path to submit, or type a word and press Enter. Find all six theme words to finish.",
      "Words earn 10 points per letter, with 20 extra for a theme word and 100 for completing the board. Three hints reveal starting letters and tiles, reducing that word’s score by 15. Bonus words use a curated list. Play unhurried or against a three-minute clock.",
    ],
  },
  tether: {
    name: "Tether Crew",
    subtitle: "Cooperative physics playground",
    genre: "Cooperative · Physics · Salvage",
    tagline: "Good things come to those who tow.",
    description:
      "Small tugs. Oversized cargo. Hook up, find your rhythm, and bring five lost treasures home. Every beautiful landing belongs to the whole crew.",
    arenas: { open: "Four-minute shift", islands: "Easy drift" },
    goal: "5 deliveries · One happy crew",
    rules: [
      "Arrows or WASD move your tug. Space hooks the nearest cargo within reach, or releases your cable. Pull cargo into the green recovery ring on the left. Hold Shift to brake; P pauses. A second local player uses WASD, F to hook, and X to brake.",
      "Recover five loads together. Two cables make heavy cargo easier to move and earn +25 for a shared lift. Gentle landings preserve cargo value. Deliveries within 30 seconds build a chain bonus. Avoid drifting debris and watch for magnetic tides. Easy drift has no time limit.",
    ],
  },
  noir: {
    name: "The Ninth Bell",
    subtitle: "Live noir pursuit",
    genre: "Real-time · Stealth · Mystery",
    tagline: "Keep moving. Keep to the shadows.",
    description:
      "Walk the rain-soaked streets with your team. Recover coded fragments, identify a moving courier, and get the evidence out while the watch closes in.",
    arenas: { open: "Before dawn", islands: "After hours" },
    goal: "A live city · A different trail every round",
    rules: [
      "Arrows or WASD to walk. Shift to run. Get close to a marked drop and press E, then stay still while searching. Recover the coat, mark and countersign; press C to read your evidence. V switches Follow, Bird’s-eye and Through your eyes. In first person, Left/Right turn, Up/Down walk and A/D sidestep.",
      "Identify the moving courier from both appearance clues. Approach and press E. Then every human investigator must return to the amber telephone in the south. Avoid searchlight cones: three interceptions end the operation. Before dawn has eight minutes; After hours has no deadline.",
    ],
  },
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
