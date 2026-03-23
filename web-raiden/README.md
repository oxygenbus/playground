# Sky Raid

A lightweight browser shoot-'em-up inspired by Raiden / Sky Force, now expanded into a short 3-stage arcade run.

## What changed

- 3 themed stages with transitions:
  - **Emerald Coast**
  - **Storm Front**
  - **Crimson Furnace**
- structured wave flow with stage intro, wave breaks, miniboss, and boss
- more enemy variety: grunts, zigzags, sweepers, turrets, aces, gunships, minibosses, bosses
- better game feel:
  - hit sparks and larger explosion bursts
  - screen shake + screen flash on major impacts
  - warning / clear overlays
  - boss health bar polish
  - improved HUD and start/pause presentation
- more loadout variety:
  - pulse / spread / pierce main weapons
  - upgradable missiles
  - power, bomb, missile, weapon, and occasional 1UP pickups
- practical audio update:
  - generated synth/SFX via Web Audio API
  - mute toggle in HUD or with `M`
- still works as a static site, so it’s easy to host anywhere, including GitHub Pages

## Run locally

From the repo root:

```bash
python3 -m http.server 8000
```

Then open:

<http://localhost:8000/web-raiden/>

## Controls

- Move: Arrow keys or WASD
- Fire: Space or J
- Bomb: B
- Pause: P
- Mute: M
- Start / Restart: Enter
- Mobile: on-screen stick + FIRE/BOMB buttons

## GitHub Pages

This game is just static files, so GitHub Pages can serve it directly.

If the repo is published from the `master` branch root, the repo-level `index.html` now redirects to the game automatically.

So these both work:

- `https://<your-user>.github.io/<repo-name>/`
- `https://<your-user>.github.io/<repo-name>/web-raiden/`

## Notes

- Audio unlocks on first interaction because browsers block autoplay sound.
- No build step required.
- Best played in a modern desktop or mobile browser.
