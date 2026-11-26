# Sky Courier — Island Runway Delivery

[![Make.fun bounty](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![Rank](https://make.fun/badge/best-flight-game-20261126-0057/Totoiswanto23/flight-game-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![Reward](https://make.fun/badge/best-flight-game-20261126-0057/Totoiswanto23/flight-game-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

A 3D flight game for the [“Make the best flight game” bounty](https://make.fun/bounty/best-flight-game-20261126-0057) ($500).
You fly the island mail plane: throttle up on the runway, lift off, fly
through all **5 rings** in order, then come back and land on the runway.
Watch your fuel — an empty tank only glides. A hard hit costs damage;
100% damage ends the run.

## Play

Serve `game/` with any static server and open it in desktop Chrome:

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests: every script, the three.js library
(`game/vendor/three.min.js`) and all sound (synthesised WebAudio) live
under `game/`.

### Controls

| Input | Action |
| --- | --- |
| W / S or ↑ / ↓ | Pitch up / down |
| A / D or ← / → | Roll left / right (bank to turn) |
| SHIFT / CTRL (or + / −) | Throttle up / down |
| SPACE | Airbrake |
| Hold mouse + drag | Steer with the pointer |
| C | Chase / cockpit camera |
| P | Pause · R restart · M mute · Enter start |

### The island

A procedural island (~2 km across) with a sand beach, grass hills, a
lighthouse point, 170 trees, houses by the runway, drifting clouds, and
one east–west runway on the south shore. The plane is built from three.js
primitives; the HUD shows altitude, speed, heading, vertical speed, a
compass tape, an artificial horizon, throttle / fuel / damage bars, the
next-target bearing and distance, score and time.

## Layout

```
main.ts                  hands the entry in (copies game/ + screenshots/,
                         writes /output/dossier.json)
serve.ts                 tiny static server for local play (node serve.ts)
vendor/makefun-game.ts   the kit's dossier library, unchanged
game/
  index.html             canvas + HUD mount, loads vendor/three.min.js
  vendor/three.min.js    three.js r160 (UMD), vendored
  src/
    config.js            tuning numbers, world layout, palette
    random.js            seeded PRNG + value noise (deterministic island)
    terrain.js           heightfield, sea, runway, trees, houses,
                         lighthouse, clouds; heightAt(x, z)
    aircraft.js          the courier plane from primitives + propeller
    physics.js           arcade flight model (throttle, pitch, bank, lift)
    controls.js          keyboard + mouse steering
    missions.js          the 5-ring course, scoring, landing check
    hud.js               DOM HUD, compass, attitude indicator, screens
    audio.js             synthesised engine, wind, chimes (WebAudio)
    shots.js             deterministic ?shot=1..4 screenshot scenes
    main.js              game loop, cameras, screens, state machine
screenshots/            4 real renders of the game (see shots.json)
```

## Screenshots

Deterministic scenes via `?shot=N` (the same seed always gives the same
frame): `1` chase view to ring 1, `2` cockpit view on final approach,
`3` low over the island to ring 4, `4` wheels down on the runway after
mission complete. Captured headless with the script in
`../capture.mjs` (see `FINISHER-NOTES.md`).

## License

MIT — see [LICENSE](LICENSE).
