# PureGames

Private standalone PureDesktop app. Original app code, game rules text and game visuals. Uses React, the existing platform bridge/UI and Vite; no additional game or networking libraries.

Current preview: Seed Circuit (cooperative garden with a local rules-based Game Player) and Ribbon Run (real-time trail arena against Game Player or another person on the same keyboard). PureServer rooms, mixed remote seats, persistent matches, and the full agent integration remain in development. The current Game Player is an offline strategy implementation, not a configured language-model agent.

Develop inside a ps-suite checkout at `apps/puregames` so `../../packages/bridge` and `../../packages/ui` resolve. Run `npm install`, `npm test`, `npm run dev`, and `npm run build`. `python3 scripts/package.py` produces a compiled-only runtime package. That package requires the prebuilt-app installer shell PR; older desktops only understand Factory project packages.

Domain logic lives in src/lib and has Node built-in tests. AppFrame owns platform identity. Shared theme/control alignment and broader UI validation remain outstanding in this early preview. No external game code, branded game assets, word lists or boards were copied. Existing platform dependencies retain their own licenses.
