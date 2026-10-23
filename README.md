# PureGames

Standalone private PureDesktop app. Four original games share one native app: **Word Loom**, a cooperative word puzzle; **Star Skirmish**, a 2–4-player space shootout; **Orbit Rally**, a cosmic score chase; and **Ribbon Run**, a trail arena. Play locally with a Game Player or a second person on the keyboard, or connect PureDesktop to PureServer to mix teammates and Game Players in the same live match. Grow a Garden has been retired.

## Play

Play is beneath the arena. When connected to PureServer it offers **Play with Game Player** for Word Loom (**Play against Game Player** for the other games), **Invite teammates**, or entry of an existing invitation code. Teammates on the same PureServer organisation enter the code and automatically take a seat. The coordinator adds optional Game Players and starts the round. A code identifies the room; server membership and workspace permissions determine access. These organisation-workspace rooms are not private to a subgroup.

**Word Loom:** Solve eight clues together using a shared, shuffled letter rack. Type an answer and press Enter, or tap the tiles. Each tile may be used once per answer; the rack is reusable for every clue. Choose a three-minute round or relaxed play without a timer. Everyone can solve different clues at once and see where teammates are working. Correct answers earn 10 points plus two per letter, with two points deducted for each revealed hint letter. There are three shared hints per puzzle. Duplicate submissions score once. Game Player helps with unoccupied clues, giving people time to solve; it uses the authored answers locally. Completing all eight clues gives every teammate a completed puzzle. Play again advances through eight original themed puzzle sets, then cycles. These are curated clue puzzles, not an open dictionary word finder.

**Star Skirmish:** Left/Right turn in small increments, Up thrusts, Down brakes; hold **Space** to fire, **P** pauses. Three hits destroy a ship; it respawns after two seconds. Score one point per knockout; first to five, or highest score after 90 seconds, wins. Spawn shields last 1.8 seconds and end when you fire. Choose open space or asteroid cover. The second local pilot uses A/D to turn, W to thrust, S to brake and F to fire.

Orbit Rally uses the same gradual turning, thrust and brake controls. Ribbon Run keeps its four grid directions; Space pauses/resumes (the coordinator resumes a shared round). WASD controls only the second local human. Full screen is in the toolbar; **Games** returns to the selector. Arena controls remain beside the game. Both flight games interpolate ship rotation smoothly, cap turns to eight degrees per simulation step, and preserve quick taps between input samples. In Orbit Rally, collect cyan cores and bank them at moving gold gates: first to 20 points or the highest score after 90 seconds wins. Banking at least five cores earns a two-point bonus. Shift dashes with a brief shield; red hazards spill cargo. The second local pilot uses WASD and F to dash. Game Players use local navigation and hazard avoidance for Orbit Rally and a flood-fill strategy for Ribbon Run, not a remote language model or an assistant roster entry.

Live scoreboards stay inside all arenas, including full screen, and in the player panel. Word Loom shows the shared team total, discoveries and each person’s contributions. Star Skirmish shows knockouts and hull. Orbit Rally shows banked points and carried cores. Ribbon Run awards one point per step survived and 50 bonus points to the last survivor; eliminated players keep their points. Each new round resets points while round wins stay at the table. Scores are part of the shared simulation, so teammates see the same updates.

## Architecture

Game rules and rendering live here. `src/lib/shared.mjs` uses the platform's existing Yjs protocol. An elected peer coordinates the simulation at 10 ticks/second, accepts input and runs bots, and checkpoints JSON. All clients render the same state. Loss of a human connection or coordinator pauses play; transient connections retry. These are trusted collaborative games, not an adversarial competitive service with server-side anti-cheat.

Native sessions use `collab.remote` through the shell's authenticated main-process transport. PureServer credentials never enter the app. Browser sessions use the existing authenticated WebSocket. Older desktops without this transport retain local play. The shell work is in ps-suite PR #984. No new platform dependencies were introduced: React, Yjs, y-protocols and lib0 are already used by PureDesktop.

## Development and verification

Place this repo at `apps/puregames` within a ps-suite checkout so the platform SDK file dependencies resolve. Run `npm test`, `npm run build`, or `npm run dev`. `python3 scripts/package.py` builds the installable compiled package (requires the shell's prebuilt-app installer).

`node scripts/check-shared.mjs /path/to/pure-server [/path/to/ps-suite/packages/shell/src/modules/collab/remote.ts]` tests two authenticated clients, automatic seats, a mixed human/bot match, steering, dash, laser fire, knockout, banked and survival score replication, concurrent word submissions, shared hints, cooperative agent help, shared pause and coordinator migration against a temporary server database/workspace. With the optional shell module it runs one client through the native transport adapter and checks ticket ownership and path rejection. The combined test process can warn about two Yjs installations; production bundles have one.

App code and visual assets are original. Existing platform dependencies retain their own licences. No branded game names, artwork or external game code are bundled.
