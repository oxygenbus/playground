# Sky Raid

A lightweight browser shoot-'em-up inspired by Raiden / Sky Force, expanded into a wider desktop-first **7-stage** arcade campaign.

## What shipped in the true final-final pass

- **Missiles pulled back further** so they read as support weapons, not the dominant answer to bosses
- **Background pass upgraded** with stronger perspective terrain so the game feels more like flying over ground from the sky, especially on desktop
- **Late-game boss tuning cleaned up** so the last act is still tense without turning messy or grindy
- **GitHub Pages / landing-page polish** with clearer hero copy, better metadata, and more presentable live-facing notes

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
- improved start/menu presentation for a live static page
- best on keyboard in a modern desktop browser

## Controls

- Move: Arrow keys or WASD
- Fire: Space or J
- Bomb: B
- Pause: P
- Mute: M
- Start / Restart: Enter

## Final-final balance notes

### Missiles

Missiles were reduced again so the main gun remains the primary weapon:

- slower reload cadence: roughly **1.8s / 1.64s / 1.48s** by level
- slower travel and weaker turn rate, so they home later and less aggressively
- damage reduced to a light support hit
- missile drop rates reduced across random drops, miniboss clears, and boss clears

### Bosses

- all stage bosses got a small HP trim
- overlord-family bosses were softened slightly in both aimed and radial pressure
- the final stage boss got the most conservative tuning so the last clear feels fairer, not flatter

## Visual notes

The background pass now emphasizes a higher-altitude forward flight feel:

- broader terrain lanes and striping that read like land/water seen from above
- stronger horizon definition
- terrain-specific perspective layers for coast, storm, lava, and void routes

## Run locally

From the repo root:

```bash
python3 -m http.server 8000
```

Then open:

<http://localhost:8000/web-raiden/>

## Deploy

This is a static site and is suitable for GitHub Pages-style hosting as-is.
