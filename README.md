# 海大漫遊 NTOU Walk

A browser exploration game of National Taiwan Ocean University's main campus (校本部, 基隆市北寧路2號).
Walk, ride a bike, drive any car or scooter, take the bus along 北寧路, and discover the campus buildings.

**Play:** open `index.html` in a browser (it needs an internet connection for three.js and the fonts).

## Controls

| Key | Action |
|---|---|
| WASD / arrows | Move |
| Space | Jump (handbrake while driving) |
| Shift | Run |
| E | Get on / off a bicycle |
| F | Drive the nearest vehicle / get out |
| R | Ride a bus waiting at a stop / get off |
| G | Hazard lights while driving |
| H | Horn |
| 1–5 | Emotes |
| [ ] | Change the hour |
| M | Map |
| Esc | Pause menu (settings, back to title, quit) |

On phones: touch the lower-left of the screen to move (the stick appears under your thumb), drag elsewhere to look,
pinch to zoom. Buttons bottom-right for jump, run, emotes, bike, drive and ride (horn, hazards and handbrake while driving).
The 選單 menu has the clock controls and fullscreen.

The game saves automatically in your browser.

## Building

`index.html` is built from `tools/game.tpl.html` and `data/game-data.json`:

```
python3 tools/assemble.py
```

See `CLAUDE.md` for how the map data is made and how the game systems work.

## Credits

Map data © OpenStreetMap contributors (ODbL). Buildings and roads follow OSM; heights and some details are estimated.
