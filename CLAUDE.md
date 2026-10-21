# 海大漫遊 (NTOU Walk): project notes for Claude Code

A browser exploration game of National Taiwan Ocean University's main campus (校本部, 基隆市北寧路2號).
Third-person character (male or female), WASD + jump + run, mobile joystick, a rideable bicycle,
cartoon (toon-shaded) style. It is an exploration game only: no photo-viewer spots, no 360 viewers.

## Files

- `index.html`: the built game. One self-contained page (three.js r128 from cdnjs + inline data). Open it via a local server.
- `tools/game.tpl.html`: game source. All JS/CSS lives here; `__DATA__` is replaced by `data/game-data.json`.
- `tools/extract.py`: parses `data/map.osm` into `data/osm.json` (buildings, roads with lanes/oneway, areas, coast, piers, signals, crossings, benchmark heights).
- `tools/fit.py`: matches buildings to the school's numbered map (`docs/school-map.jpg`) and fits school-map pixels to real coordinates.
- `tools/build.py`: builds `data/game-data.json`: terrain height grid, sea mask, trees, school-map numbers, signposts for places OSM lacks, bus stops, spawn point.
- `tools/assemble.py`: writes `index.html` from the template + data.
- `tools/godmap.py`: renders `docs/ntou-game-map.png`, the top-down annotation map with a 50 m lettered grid.
- `data/map.osm`: OpenStreetMap export of the area (ODbL; credit "© OpenStreetMap contributors" stays on the map screen).

Rebuild everything:

```
python3 tools/extract.py && python3 tools/build.py && python3 tools/assemble.py && python3 tools/godmap.py
python3 -m http.server 8000   # then open http://localhost:8000
```

Needs Python 3 with numpy, scipy, matplotlib (godmap.py uses the Noto Sans CJK font; adjust the path on macOS).

## Coordinates

- Local metres: x = east, z = south (north is −z), origin at lat 25.1500, lon 121.7770.
- `x = (lon − 121.777) · cos(25.15°) · 111320`, `z = (25.15 − lat) · 110574`.
- Terrain grid: 4 m cells, heights in decimetres (Int16, base64) in `grid.h`. Sea cells are −5 m.
- Annotation map grid: 50 m squares; columns A, B, C… from the west edge, rows 1, 2, 3… from the north edge.

## What is real vs estimated

- Real (OSM): building footprints, roads and widths (lanes × 3.3 m), one-way tags, coastline, piers, pitches, pool, woods, traffic signals, crossings, bus stop nodes.
- Real (official): three 內政部水準點 benchmarks in the OSM file (10 m, 7.03 m, 5.09 m) set the base ground height.
- Estimated: hill heights (forest areas rise up to ~50 m; not surveyed), most building heights (floor counts guessed unless tagged),
  positions of school-map places missing from OSM (shown as signposts), some school-map numbers assigned to unnamed footprints by position.
- The real DTM (內政部 20 m grid) was not usable from the chat sandbox; a crop around 25.145–25.155°N, 121.770–121.785°E would replace the estimated hills.

## Style decisions

- Buildings follow the school's illustrated map: 北寧 = yellow/cream walls, teal trim, blue ribbon windows;
  祥豐 = terracotta brick with cream window frames; 濱海 = yellow with grey pilasters; town = white/grey.
  Specials: 56 and 30 have pitched roofs (red/orange); 4, 23, 26 are glass; 5 is dark brown.
- Roads are realistic (user request, matched to Street View of 北寧路): asphalt, double yellow centre, dashed white lanes,
  white edge lines, red curb paint, raised tiled sidewalks, zebra crossings with green bike band, traffic lights at OSM signals,
  orange delineator posts on 北寧路's centre line, street lamps.
- Junctions (`buildJunctions`): wherever a road meets a road with sidewalks, an asphalt mouth breaks the main road's kerb paint
  and edge line, sidewalk corners are rounded (radius `JR`, brick on 北寧路) with a kerb face, the side road's markings start
  after the sidewalk with a stop line, and smaller roads stop under the bigger one. Crossings and signal poles slide along the
  road out of junction mouths.
- Junction boxes (`findJunctionBoxes` / `drawJunctionBoxes` / `inJBox`): where 3+ arms meet at a shared OSM vertex (one a
  main road), the junction is built like a real one (user request: "not two straight roads slapped on top of each other").
  Arms are sorted by angle; between neighbours the kerbs get a fillet (radius 3–6 m, a tight nose for narrow forks) or stay
  straight for a through side (≥166°). One plain asphalt polygon (draped on the terrain, polygonOffset above every road
  strip) covers the box so no lane markings run through it; corner paving and curved kerbs join the sidewalks; each arm gets a
  stop line on its incoming half unless its own crosswalk has one. Sidewalk strips, side-road mouths and crosswalks keep out
  of boxes; a crosswalk that cannot slide clear is placed on its road's nearest arm just outside the box (never dropped,
  since traffic lights are built on crosswalks). A 2-arm node (one road carrying on under a new name) gets no box, so its markings continue.
- Crosswalk stop lines cover only the lanes approaching the crossing (one full-width line on one-way roads).
- Ground texture: resolution follows the quality setting (2048/4096/6144 px wide), zone tint and the sea edge are drawn from
  small canvases scaled up smoothly (no 4 m squares), anisotropic filtering, and a tiling detail texture blended in the
  terrain shader (`onBeforeCompile`). The shader scales the colour by 0.8 because the sun + sky add up to ~1.5×, which used
  to clip pale paving to flat white. Asphalt wear patches are radial gradients drawn wrapped, so tiles never show a cut.
- Courts/track/pool use their own high-resolution canvas textures fitted to each OSM polygon.
- Building footprints that reach over a main road or its sidewalk are pulled back behind the kerb-side wall at load
  (`setBackFootprints`: half road width + 2.6 m sidewalk + 1 m, 0.6 m on tertiary roads); only the overhanging part moves.
- Road signs are boards from `signBoard()` (front = local +z; back is plain metal or a second readable face, never a mirrored
  double-sided texture): speed limits on signal poles face approaching traffic with a metal back; curve chevrons sit on top of a
  short post with the arrow for each direction on each face; bus stops have a blue 公車 disc and a name board (stop name, routes)
  facing along the road toward the oncoming bus, readable from both sides.
- Bus stops: one shelter per OSM stop node, snapped to the kerb on its side, open side facing the road; if a building footprint
  reaches the sidewalk there, it slides along the kerb to the nearest clear spot (祥豐校門 south side moves 8 m west).
- 北寧路 roadside (`buildRoadside`, from `docs/streetview-notes.md`): red/grey brick sidewalks, fan palms on both kerbs,
  ochre planter wall + hedge on the sea side (x −115…130), dark brick wall + white railing + hedge wherever campus is behind
  the kerb, scooter rows in front of campus (x windows in `SCOOT`), chevron signs on the outside of bends, striped utility
  poles with wires on the town side (north, x < −330). Walls, hedges, palms and scooters are solid.
- Landmarks (`buildLandmarks`, same survey): 祥豐校門 portal + flower-market tents on the 中正路 kerb; 濱海校門 portal, guard booth,
  lawn island (yellow kerb, flowers, blue sculpture), LED board, NTOU letters and a spinning wind turbine on the seaside lawn;
  和平橋 yellow twin-arch bridge where the 和平島 road leaves the north edge, with a low island beyond; stepped terraces
  (x −25…35, walkable via `step` solids) and the long navy block (x 35…160) on the sea side; 體育館 (23) gets a curved
  red-edged roof with glass ends (`SPECIAL[23].barrel`). `raiseEastCliff` makes the east woodland behind 北寧路154巷 a steep
  rocky cliff rising from the wood's edge (the parking area by the road stays flat), keeping 4 m flat around roads and buildings;
  `cliffDressing` adds dark rock slabs and shrubs. A tan 4-storey building OSM lacks (no 900, pushed into `D.b`) and an open
  scooter lot (`lotAt`, x 392–440) sit between the road and the lane, checked against the user's screenshot at x≈407, 213°.

## Campus life (v7)

All in `tools/game.tpl.html` (the "CAMPUS LIFE" section; `tools/life.reference.js` is a readable copy of it):
- Clock: Taiwan time (UTC+8) by default; −1h / +1h / ×60 / 現在 buttons, keys `[` `]` `\`. Sky colour, sun and lamps follow the hour.
  A new game always starts at 09:00 (`startNewDay` sets the offset; the clock then runs on), so the intro is in daylight;
  Continue drops any saved offset and runs on real Taiwan time (user decision). The save still records the offset, unused.
- Traffic signals: real cycles. Peak (07–09, 16–19): 62 s main green; off-peak 42 s; yellow 3 s, all-red 2 s, walk 18–20 s
  with flashing green and countdown. 23:00–06:00: flashing yellow (閃光號誌), pedestrians cross when no car is near.
- Traffic: road chains merged from OSM ways by name (北寧路 ≈ 2 km, 4 lanes, 7 crossings, 6 bus stops; 中正路; 祥豐街).
  Cars, taxis, scooters, trucks, Keelung city buses (103/104/108) that stop at the bus shelters. Density follows TRAFFIC[hour]
  (peaks 7–9 and 16–19, near zero after midnight). Intelligent-driver following; stop at red, yield to people on zebras,
  stop and honk for a player standing in the lane. Vehicles block the player.
- Students: walking graph from footpaths, campus roads, sidewalks and zebra crossings (largest component ~1000 nodes, A* routes).
  Count follows CROWD[hour]. Solo walkers, pairs, and chatting groups near buildings; speech bubbles in Chinese (lines vary by
  morning / peak / night); they wait for the walking man, greet the player, and react to emotes.
- Sports (`SPORT`, `updateSports`, `updateCourt`): `buildPitches` records the running tracks and basketball courts.
  Within ~170 m of the player, joggers (2.6–4.2 m/s, inner lanes, leaning forward) and walkers (outer lanes) lap the track
  (`trackPt` = stadium-shaped lane path); they ease off and swing out a lane to pass the player or slower people. Each
  basketball court gets a half-court pickup game (daytime to 23:00): a real ball is dribbled, passed, shot at the rim
  (make chance falls with distance), bounces with gravity, and the nearest player chases rebounds. Busier in the evening.
  They are students with `state:'sport'` (skipped by `updateStudents`, not counted in the walking crowd); a knocked-down
  one recovers as an ordinary walker and the venue spawns a replacement.
- Bikes: S brakes, then rolls backwards (A/D steer like a car in reverse). Hitting something bounces the bike off it
  (velocity reflected about the surface normal from 16 probes; glancing hits slide and turn along the wall); `unstick()` frees
  the player if anything overlaps. Vehicles collide as slim boxes with real roof heights (cars: low hood/boot, taller cabin),
  so you can lane-split between cars, jump over cars and scooters on foot (jump ≈1.8 m) and stand on roofs. Racks near 圖書館, 第一餐廳, 體育館, 工學院, dorms, 生命科學院館, 學生活動中心 (23 bikes); ride any, park anywhere; shown on maps.
- Save: autosaves every 5 s and when the page is hidden/closed to localStorage `ntou-walk-save-v1` (position, character,
  camera, riding + which bike, every bike's parking spot, clock offset); explored places stay in `ntou-walk-found-v3`.
  The start screen shows 繼續 Continue when a save exists; 重新開始 New game needs a second click and clears both keys.
  Saves are per browser and per address (localhost:8000 and localhost:8001 keep separate saves).
- Driving (`DRIVE`, `driveStep`): F gets into the nearest vehicle within 2.2 m: any parked one (`PARKED`: G5 lot, far-east lot,
  a row on 北寧路154巷, a scooter by the start point) or a traffic vehicle moving under 4 m/s (it leaves traffic and stays parked
  where you leave it). W throttle, S brake then reverse, A/D steer (bicycle model, `VSPEC` per type: top speed, acceleration,
  wheelbase), Space handbrake (jump button on touch), H horn, F out (below 9 km/h). Bumps bounce back; people and props block.
  Traffic stops behind driven/parked vehicles in its lane.
  Crashes (`crash`, `knock`, `updateKnock`): momentum shared along the line of impact (`MASS`: person 70, scooter 200,
  car/taxi 1400, truck 4000, bus 12000 kg; restitution 0.15). The lighter one is shoved along the ground (no flying), slides
  to a stop by friction and spins on off-centre hits; scooters hit at >4 m/s change tip onto their side, people hit at
  >2.5 m/s fall, lie ~2.6 s and get up; traffic vehicles hit hard leave traffic and stay where they stop. A fallen person
  is a solid obstacle (cars stop instead of pushing them).
  Recovery (`RECOVER`, `updateRecover`): once a hit vehicle stops it waits ~2.5 s, a fallen scooter stands itself up, then a
  vehicle that came from traffic drives slowly back to the nearest lane running its way (backing out and re-steering when
  blocked) and rejoins traffic; after 3 failed tries it squeezes past trunks, posts, hedges and low walls, and after 10 it slips
  straight into its lane when there is a gap. More than 25 m from any lane, it stays parked.
  Lane changes: a traffic vehicle with something stuck in its lane ahead (crash, parked or recovering vehicle, or a stopped queue
  behind one) moves to the adjacent same-direction lane when the gap there is safe (`laneChanges`, drifting across via `v.shift`).
  It checks every 1.5 s while blocked (5 s cooldown after a change); a bus waiting at a stop counts as a blockage.
- Slope physics (`wheelGround`, `settleDriven`): the driven vehicle sits on its four wheel contact points. Grounded, its
  vertical speed is the rate the road moves it; when the ground drops away more than 2.2 m/s faster than that (a crest
  at speed) it goes ballistic (gravity, no throttle/brake/steering, nose slowly follows the flight path), and landing
  compresses the suspension, costs speed by impact, and a hard one bounces once. A sudden stop never launches it. Cars
  pitch/roll with the terrain and roll outward in fast turns (~0.011 rad per m/s²); scooters lean into turns
  (atan(a/g)). Gravity along the slope is g·sin. Airborne collision checks use the body height. Traffic pitches and
  rolls with the terrain (`placeVehicle`).
- Buses dwell 6–12 s (never over 15) once within 3.5 m of a stop (they stop a safety gap short of the marker). Each bus has
  its own route sign (`BUS_ROUTES`). Traffic continues from a road into the road that joins it end-to-end (中正路 → 北寧路).
- The orange delineator posts on 北寧路's centre line are not solid: they bend over when the player or the player's vehicle
  goes through and spring back (`flexPosts`).
- Vehicles you leave are cleared 60 s later once you are 8 m away (`updateAbandoned`): ones from traffic are removed, ones from
  a parking spot return to it (`home`). G toggles hazard lights (雙黃燈) while driving (`toggleHazard`); they stay on when you leave.
- Riding (`P.onBus`): at a bus waiting at a stop, F drives it, R rides it. Riding follows its route with the camera behind; the
  panel shows route and next stop, arrivals pop a toast; R gets off whenever it is stopped, on the kerb side. Leaving the
  map or the end of the line lets you off. HUD: km/h, gear (D/R/N/P), speed bar, vehicle name. Saved with the game
  (`cars`, `driving`).
  Vehicle lamps (`LAMP`, `setVehLights`, `updateVehLights`): headlights with a glow and a light pool on the road, and tail lights,
  come on through dusk (from `nightLevel`) for traffic, the player's vehicle and recovering vehicles; parked ones stay dark.
  Tail lights brighten as brake lights day or night (traffic slowing or stopped; the player braking or on the handbrake).
- Intro (`INTRO`, `startIntro`, `updateIntro`, `endIntro`, `setupArrival`, `introBus`; mode 'intro'): after 開始探索 in a new
  game, ~24 s letterboxed film, narrated (browser speechSynthesis, zh-TW voice if present) with subtitles: aerial welcome
  (歡迎來到國立臺灣海洋大學) → a scripted bus brakes evenly into 海大(濱海校門) on the gate (south) side of 北寧路, watched from
  the gutter (下一站，海大，濱海校門) → you step out of its rear door onto the kerb edge (歡迎來到海大！) in an over-the-shoulder
  shot → the camera pulls back into the play camera and the bus pulls away. Play starts exactly there, facing the gate.
  `setupArrival` (after `buildChains`) sets START (+ `rot`, `yaw`) in road terms (along the bus chain / lateral from the
  centre line), picks a standing spot and camera angle with a clear view (`clearView`: no tall trunk/pole near the line;
  the palm row runs down the middle of this sidewalk), and parks your bike on the sidewalk 2–3 m behind you, parallel to
  the kerb. Nothing else is parked there. The intro bus sits in the lane with `scripted:true` (traffic queues behind it but
  doesn't move it); at the end it is handed to traffic with the stop marked served. Skip (略過, Esc, Space, Enter) jumps to
  the same end state and stops the narration. No control hints. Continue never plays it.
- Screens (`mode`: title / pick / intro / play / pause / bye): the title screen (aerial fly-around) offers 繼續遊戲 Continue (with the save's
  age and progress), 新遊戲 New Game (confirms before clearing a save, then character choice) and 設定 Settings. Esc or the
  選單 Menu button pauses the world and opens Resume / Settings / Back to title (save + reload) / Quit (save, try window.close,
  else a goodbye screen). Settings live in localStorage `ntou-walk-settings` (`SET`): graphics quality (pixel ratio, shadows),
  traffic and crowd multipliers (`VEH.base`, `STU.base`), clock (Taiwan real time or a fixed 10:00 start),
  camera sensitivity.
- Emotes: 1 揮手, 2 歡呼, 3 鞠躬, 4 跳舞, 5 坐下 (mobile: 表情 button).

## Publishing

- Repo: github.com/pork0817/ntou-walk (branch `main`). GitHub Pages serves `main` at https://pork0817.github.io/ntou-walk/.
- The owner asked for auto-push: after each finished, tested change, rebuild `index.html`, make sure the test hook is gone
  (`grep -c window.DBG index.html` is 0), commit with a short description and push `main`. Never push work in progress.
- `.gitignore` keeps out `.claude/` (local preview config and test hook), `docs/school-map.jpg` (the school's artwork) and
  any Street View screenshots (reference only, never published).

## Phones (body.touch)

- No on-screen hints anywhere (user request): no key bar, no "press E/F" tips, no hints setting. The two warnings that
  matter ("stop first", "wait for the bus to stop") are speech bubbles on the vehicle. The intro has no control hints either.
- Compact HUD: location card without the English line, small stats; minimap 112×82 with 地圖 / 選單 only (time controls live
  in the pause menu for everyone). Driving shows a slim speed pill (no name line): under the HUD in portrait, top-centre
  between the cards in landscape. The new-place toast sits below the HUD.
- Floating joystick: touching anywhere in the lower-left (`#joyZone`, 50vw × 60vh) places the stick under the thumb.
- Thumb cluster bottom-right: 跳 / 跑 / 表情, with 騎車 / 開車 / 搭車 stacked above 跳 in portrait and in a row to the left of
  the cluster in landscape (so they never reach the minimap); while driving they become 手煞 / 雙黃燈 / 喇叭, on a bus only
  下車 shows (`refreshTouchButtons`). Two-finger pinch zooms the camera.
- Portrait gets a wider field of view (74°) and the camera starts further back (11 m).
- Starting or continuing a game on a phone asks for fullscreen (that tap is the gesture browsers require; iPhone Safari
  ignores it); the pause menu can leave or re-enter it. Resizes on orientation change and visual-viewport changes.
- Short screens (≤520 px tall, i.e. phones in landscape): compact title, and the pause menu and settings go two columns so
  nothing needs scrolling. Modals use dvh so mobile browser bars don't cut them off; no pull-to-refresh/overscroll.
- Testing tip: the browser pane only emulates touch below 768 px wide, so test landscape at e.g. 760×360.

## Known gaps / next steps (agreed with the user)

0. Check performance on a phone with traffic and students (VEH.max / STU.max are lower on touch devices).
1. The 3D view was never rendered in the chat sandbox (three.js could not be downloaded there). First task: run it locally in a
   real browser and fix anything visibly wrong.
2. User will mark stairs, slopes, guardrails and corrections on `docs/ntou-game-map.png` (grid squares like "K7").
3. User will send photos per spot: four directions (N/E/S/W, 0.5× lens) + 2–3 sideways-walking shots of key features,
   named like `P3_N.jpg`, pinned on the annotation map. Use them to add stairs, railings, kerbs, facade colours and window patterns.
4. Optional scans (Scaniverse / Apple Object Capture → GLB/OBJ with one measured reference distance) for gates, 夢泉, stairs, facades.
5. Interiors later: separate per-building scenes loaded on demand through doors, built from the 逃生避難圖 floor plans plus photos.
   Start with 圖書館 or 行政大樓. Keep each interior a few MB.
6. Street View screenshots (user decision, 2026-10-20): used only as a visual reference for key features (stairs, slopes,
   railings, gates, walls, rough heights and colours, window patterns), rebuilt by hand in the toon style. Never as textures,
   never traced or measured off the image, never put in the repo or the built game. Own photos and OSM remain the primary sources.
