# PureGames

Free, open-source games for [PureDesktop](https://puredesktop.ai), published under the [MIT licence](LICENSE). Five original games share one native app: **The Ninth Bell**, a real-time noir investigation; **Word Loom**, a cooperative word puzzle; **Star Skirmish**, a 2–4-player space shootout; **Orbit Rally**, a cosmic score chase; and **Ribbon Run**, a trail arena. Play locally with a Game Player or a second person on the keyboard, or connect PureDesktop to PureServer to mix teammates and Game Players in the same live match. Grow a Garden has been retired.

## Play

Play is beneath the arena. When connected to PureServer it offers **Play with Game Player** for the cooperative games (**Play against Game Player** for the other games), **Invite teammates**, or entry of an existing invitation code. Teammates on the same PureServer organisation enter the code and automatically take a seat. The coordinator adds optional Game Players and starts the round. A code identifies the room; server membership and workspace permissions determine access. These organisation-workspace rooms are not private to a subgroup.

**The Ninth Bell:** Walk a continuous, rain-soaked city with teammates and Game Players. Three couriers roam the streets while searchlight patrols react to exposed investigators. Each operation randomises the correct courier, their coat and distinguishing mark, the countersign, and which dead drops hold the three fragments. Follow the amber objective marker, approach a drop and press **E**, then stand still for the two-second search. When all three fragments are recovered, identify the person matching both appearance clues and press **E** nearby. Everyone playing as a human must return to the southern telephone to extract the evidence. Three human interceptions end the operation; the starting telephone is safe, and agents cannot spend the team's lives. Extra drops award points and extend timed play. **Before dawn** starts at eight minutes; **After hours** has no deadline.

Use arrows or WASD to walk, Shift to run, E to interact, and C for evidence. **V** switches between the following overhead camera, a whole-city bird’s-eye view, and a first-person raycast view. In first person Left/Right turn gradually, Up/Down or W/S walk forward/backward, and A/D sidestep. A second local human uses WASD and F to interact in the overhead view; the camera follows player one. Each remote player has an independent camera. Game Players physically navigate and recover evidence, leaving the human's nearest lead to them. Buildings block movement and searchlights. The canvas scenery, sprites, facade textures and illustrated library cover are original code, with no new graphics dependency. This is a repeatable stealth-and-identification game, not a branching storybook.

**Word Loom:** Solve eight clues together using a shared, shuffled letter rack. Type an answer and press Enter, or tap the tiles. Each tile may be used once per answer; the rack is reusable for every clue. Choose a three-minute round or relaxed play without a timer. Everyone can solve different clues at once and see where teammates are working. Correct answers earn 10 points plus two per letter, with two points deducted for each revealed hint letter. There are three shared hints per puzzle. Duplicate submissions score once. Game Player helps with unoccupied clues, giving people time to solve; it uses the authored answers locally. Completing all eight clues gives every teammate a completed puzzle. Play again advances through eight original themed puzzle sets, then cycles. These are curated clue puzzles, not an open dictionary word finder.

**Star Skirmish:** Left/Right turn in small increments, Up thrusts, Down brakes; hold **Space** to fire, **P** pauses. Three hits destroy a ship; it respawns after two seconds. Score one point per knockout; first to five, or highest score after 90 seconds, wins. Spawn shields last 1.8 seconds and end when you fire. Choose open space or asteroid cover. The second local pilot uses A/D to turn, W to thrust, S to brake and F to fire.

Orbit Rally uses the same gradual turning, thrust and brake controls. Ribbon Run keeps its four grid directions; Space pauses/resumes (the coordinator resumes a shared round). WASD controls only the second local human. Full screen is in the toolbar; **Games** returns to the selector. Arena controls remain beside the game. Both flight games interpolate ship rotation smoothly, cap turns to eight degrees per simulation step, and preserve quick taps between input samples. In Orbit Rally, collect cyan cores and bank them at moving gold gates: first to 20 points or the highest score after 90 seconds wins. Banking at least five cores earns a two-point bonus. Shift dashes with a brief shield; red hazards spill cargo. The second local pilot uses WASD and F to dash. Game Players use local navigation and hazard avoidance for Orbit Rally and a flood-fill strategy for Ribbon Run, not a remote language model or an assistant roster entry.

Live scoreboards stay inside all arenas, including full screen, and in the player panel. The Ninth Bell awards 10 points per recovered drop, 40 for contact, and a shared extraction bonus based on remaining chances. Word Loom shows the shared team total, discoveries and each person’s contributions. Star Skirmish shows knockouts and hull. Orbit Rally shows banked points and carried cores. Ribbon Run awards one point per step survived and 50 bonus points to the last survivor; eliminated players keep their points. Each new round resets points while round wins stay at the table. Scores are part of the shared simulation, so teammates see the same updates.

## Architecture

Game rules and rendering live here. `src/lib/shared.mjs` uses the platform's existing Yjs protocol. An elected peer coordinates the simulation at 10 ticks/second, accepts input and runs bots, and checkpoints JSON. All clients render the same state. Loss of a human connection or coordinator pauses play; transient connections retry. These are trusted collaborative games, not an adversarial competitive service with server-side anti-cheat.

Native sessions use `collab.remote` through the shell's authenticated main-process transport. PureServer credentials never enter the app. Browser sessions use the existing authenticated WebSocket. Older desktops without this transport retain local play. The shell work is in ps-suite PR #984. No new platform dependencies were introduced: React, Yjs, y-protocols and lib0 are already used by PureDesktop.

## Development and verification

Place this repo at `apps/puregames` within a ps-suite checkout so the platform SDK file dependencies resolve. Run `npm test`, `npm run build`, or `npm run dev`. `python3 scripts/package.py` builds the installable compiled package (requires the shell's prebuilt-app installer).

`node scripts/check-shared.mjs /path/to/pure-server [/path/to/ps-suite/packages/shell/src/modules/collab/remote.ts]` tests two authenticated clients, automatic seats, a mixed human/bot match, steering, dash, laser fire, knockout, banked and survival score replication, concurrent word submissions, shared hints, cooperative agent help, live noir movement and first-person turns, shared evidence, shared pause and coordinator migration against a temporary server database/workspace. With the optional shell module it runs one client through the native transport adapter and checks ticket ownership and path rejection. The combined test process can warn about two Yjs installations; production bundles have one.

App code and visual assets are original. Existing platform dependencies retain their own licences. No branded game names, artwork or external game code are bundled.

## Contributing

Bug reports, ideas and pull requests are welcome at
[puredesktop/puregames](https://github.com/puredesktop/puregames). Fork the
repository to contribute; updates and merges to the protected main branch are
reserved for administrators. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

Original code and visual assets are copyright (c) 2026 pure.science inc and
licensed under the [MIT License](LICENSE). Dependencies retain their own
copyright notices and licences; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
