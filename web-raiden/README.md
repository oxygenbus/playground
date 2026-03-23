# Sky Raid

A lightweight browser shoot-'em-up inspired by Raiden / Sky Force, expanded into a wider desktop-first **7-stage** arcade campaign.

## What shipped in the final pass

- **Missiles rebalanced** so they act as support fire instead of the dominant damage source
- **Light procedural music pass** layered on top of the existing synth-style SFX
- **GitHub Pages / landing-page polish** with clearer copy, metadata, and below-the-fold feature cards
- **General cleanup** while keeping the 7-stage desktop-first structure intact

## Campaign

The game plays as a 7-stage sequence:

1. **Emerald Coast**
2. **Sunset Straits**
3. **Storm Front**
4. **Midnight Rail**
5. **Ashen Rift**
6. **Crimson Furnace**
7. **Void Apex**

Each stage keeps the same structure — intro, waves, miniboss, boss — while escalating enemy density, bullet pressure, and boss durability in a steadier arc than the old 3-stage version.

## Desktop-first profile

- wider playfield and canvas: **720×840**
- broader HUD and boss bar sized for desktop screens
- larger overlay panel / intro presentation
- best on keyboard in a modern desktop browser

## Controls

- Move: Arrow keys or WASD
- Fire: Space or J
- Bomb: B
- Pause: P
- Mute: M
- Start / Restart: Enter

## Missile balance notes

The final tuning intentionally pulls missiles back from "free boss delete" territory:

- level 1 now launches **1 missile** instead of 2
- level 2 launches **2 missiles** instead of 3
- level 3 launches **3 missiles** instead of 4
- missile damage reduced from **4** to **2**
- extra boss bonus damage removed
- homing is slower and arms later, so missiles track less aggressively
- reload cadence reduced to roughly **1.31s / 1.17s / 1.03s** by level instead of a rapid sub-second stream
- missile drops are less common from random drops, minibosses, and bosses

That keeps the main gun, positioning, and bomb timing as the core skill expression.

## Audio notes

- Sound still unlocks on first interaction because browsers block autoplay audio.
- The release pass adds a lightweight procedural music loop that shifts intensity during normal waves, minibosses, and bosses.
- No asset pipeline or build step required.

## Run locally

From the repo root:

```bash
python3 -m http.server 8000
```

Then open:

<http://localhost:8000/web-raiden/>

## Deploy

This is a static site and is suitable for GitHub Pages-style hosting as-is.
