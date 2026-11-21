# Night Ledger

[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![make.fun rank](https://make.fun/badge/best-stealth-game-20261121-1759/dio955/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![make.fun reward](https://make.fun/badge/best-stealth-game-20261121-1759/dio955/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)

An entry for the [make.fun best stealth game bounty](https://make.fun/bounty/best-stealth-game-20261121-1759).

You are Rin, night archivist of the Meridian Ledger House. Slip through three
floors after hours, pocket the ledger dots, and reach the green exit unseen.
Guards patrol with vision cones and sharp ears — run too close and they hear
you, step into a cone and the meter climbs, fill it and they chase you down.
Hide in the green bushes, toss a coin to lure a guard away, and clear a floor
without ever raising an alarm for the ghost bonus.

## How to play

- **WASD / Arrow keys** — move
- **Shift** — run (faster, but louder: guards hear you within 150 px)
- **Click** — toss a coin toward the mouse (3 per floor); the ping draws a
  nearby guard to investigate the spot
- **M** — mute sound
- **Enter** — start / continue after being caught or clearing a floor
- **R** — play again after game over or winning

You have 3 lives. Being caught costs one life and restarts the floor. Reach
the exit on all three floors to win.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. The game is plain static
files under `game/` — no build step, no network requests, all art drawn on
canvas and all sounds synthesized with WebAudio.

## Layout

- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to the
  output directory and writes `dossier.json`
- `game/index.html` — the page
- `game/src/config.js` — constants (speeds, vision, detection)
- `game/src/levels.js` — the three handcrafted floor maps and patrol routes
- `game/src/audio.js` — WebAudio sound effects (oscillators only)
- `game/src/guards.js` — guard patrol, vision cones, hearing, chase
- `game/src/player.js` — movement, running, coin tosses, hiding
- `game/src/render.js` — all canvas drawing and the HUD
- `game/src/main.js` — game loop, states, scoring, level flow
- `screenshots/` — screenshots of the game in play

## License

MIT — see [LICENSE](LICENSE).
