# Sky Raid

A lightweight browser shoot-'em-up inspired by Raiden / Sky Force, now expanded into a wider desktop-first 7-stage arcade run.

## Campaign

The game now plays as a 7-stage sequence:

1. **Emerald Coast**
2. **Sunset Straits**
3. **Storm Front**
4. **Midnight Rail**
5. **Ashen Rift**
6. **Crimson Furnace**
7. **Void Apex**

Each stage keeps the same structure — intro, waves, miniboss, boss — while escalating enemy density, bullet pressure, and boss durability in a steadier arc than the old 3-stage version.

## Desktop-first changes

- wider playfield and canvas: **720×840**
- broader HUD and boss bar sized for desktop screens
- larger overlay panel / intro presentation
- touch controls are no longer part of the intended experience

## Controls

- Move: Arrow keys or WASD
- Fire: Space or J
- Bomb: B
- Pause: P
- Mute: M
- Start / Restart: Enter

## Run locally

From the repo root:

```bash
python3 -m http.server 8000
```

Then open:

<http://localhost:8000/web-raiden/>

## Notes

- Audio unlocks on first interaction because browsers block autoplay sound.
- No build step required.
- Best played in a modern desktop browser.
