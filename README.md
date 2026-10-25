# 海大漫遊 NTOU Walk

A browser exploration game of National Taiwan Ocean University's main campus (校本部, 基隆市北寧路2號) and the coast around it:
碧砂漁港 and 八斗子 to the east, 正濱漁港 (the rainbow houses) and 和平島 to the west. Walk, ride a bike, drive any car or scooter, take the bus along 北寧路, discover the campus buildings,
browse the fish market, eat at 八斗子夜市 in the evening, and go fishing from the quays.

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
| C | Fish (at the water's edge: cast, then again when the bobber dips) |
| T | Hail a taxi (by a road; pick where to go, pay the meter) |
| 1–5 | Emotes |
| [ ] | Change the hour |
| M | Map |
| Esc | Pause menu (settings, back to title, quit) |

On phones: touch the lower-left of the screen to move (the stick appears under your thumb), drag elsewhere to look,
pinch to zoom. Buttons bottom-right for jump, run, emotes, bike, drive and ride (horn, hazards and handbrake while driving).
The 選單 menu has the clock controls and fullscreen.

**Money:** you start with NT$2,000. Fuel, parking, taxi rides, YouBike and police fines cost money; driving a taxi earns it
(get into any taxi and pick up the people waving at the kerb). Stop at a gas station pump to fill up. Leaving a car on the
road can get you a parking ticket. YouBike: take one from any station, return it at any station.

The game saves automatically in your browser.

## Building

`index.html` is built from `tools/game.tpl.html` and `data/game-data.json`:

```
python3 tools/assemble.py
```

See `CLAUDE.md` for how the map data is made and how the game systems work.

## Credits

Map data © OpenStreetMap contributors (ODbL). Buildings and roads follow OSM. Terrain outside the original campus area uses
SRTM 30 m elevation (NASA, via opentopodata.org); campus hill heights and some details are estimated.
