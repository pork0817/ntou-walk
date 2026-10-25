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
- `data/map.osm`: OpenStreetMap data of the area (ODbL; credit "© OpenStreetMap contributors" stays on the map screen).
  Since the map was widened it is an Overpass download of lat 25.13835–25.16325, lon 121.75815–121.7985
  (nodes, ways and multipolygon relations, with their members).
- `tools/fetch_dem.py` → `data/dem.json`: SRTM 30 m heights (api.opentopodata.org) on a 30 m grid over the game area.
- `data/campus-terrain.json`: the original campus box's terrain and trees (x −600..756, z −320..396), frozen when the
  map was widened so the campus stays exactly as it was. `build.py` uses it inside that box, blends to the real
  heights over the last 80 m of its east and south edges, and keeps the box's buildings, roads, areas etc. first and in
  their old order (some looks are picked by index).

Rebuild everything:

```
python3 tools/extract.py && python3 tools/build.py && python3 tools/assemble.py && python3 tools/godmap.py
python3 -m http.server 8000   # then open http://localhost:8000
```

Needs Python 3 with numpy, scipy, matplotlib (godmap.py uses the Noto Sans CJK font; adjust the path on macOS).
On this Mac the system Python has none of them: make a venv (`python3 -m venv venv && venv/bin/pip install numpy scipy matplotlib`).

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
- Road network (`buildRoadNet` → `drawRoadNet`, user request: "real junctions, not roads slapped on each other"; replaces
  the old per-road textured strips, mouth patches and junction boxes). OSM drivable ways become a clean graph:
  a road end that stops short of / overshoots another road is snapped onto it; roads crossing mid-segment are split;
  vertices < 1 m apart are one node; slip roads (≤0.6× the width, < 35° off the wider road) are cut where they clear
  its kerb and joined to it square, so they get a mouth; roads that simply carry on through a node are one edge (width
  eased over 8 m). Nodes with 3+ arms are junctions (two joined by a stub < 10 m merge; longer links share their
  length, ≤45 % each). Each junction is ONE polygon from all its arms (fillet radius 3–6 m, tight nose for narrow
  forks, straight for through sides ≥166°, cut-back 1 m past the tangent point), with corner paving and curved kerb
  faces; each edge is ONE ribbon trimmed to the junctions, 5 vertices across, world-UV asphalt. Markings are geometry
  per edge (`rnLine`, `rnRuns` with blank intervals): main roads red curb, white edge lines, double yellow, 4/6 m lane
  dashes (solid for 30 m before a signalised stop line); minor roads white edges + dashed yellow; service none.
  Sidewalks (rank ≥ 3) are ribbons + vertical kerb faces. Footpaths keep their own ribbons but stop at kerbs
  (`onRoadArea`). Paint materials must be double-sided (strip winding faces down).
- Crossings: every arm (rank ≥ 2) of a signalised junction (OSM signal within the junction's reach) gets a crosswalk
  just outside it: zebra (0.45 m stripes along the traffic), teal bike band, stop line on the incoming half only, and
  the signal pole on the near-side right kerb at that stop line, arm over the incoming lanes (`signalPole`, user
  screenshot). Its crossing spot has `inDir` (only traffic heading into the junction obeys it) and `gap` 4.1 (stop at
  the line; measured: cars wait ~2 m behind it). OSM crossings near a junction move onto that arm; others are
  mid-block (stop lines on both incoming halves, poles at them). Unsignalised junctions: a stop line where a smaller
  road meets a bigger one. Signal phases per junction: the straightest highest-ranked pair is the main road; other
  arms are `side` (green while the main road is held for pedestrians; their walkers cross with the main green; at
  night main flashes yellow, side flashes red 'FR', which traffic treats like 'FY').
- The 濱海校門 lawn island is the surveyed outline (`BH_ISLAND`); an OSM service way runs through it and is left out.
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
- Traffic steering (`placeVehicle`, `laneAt`; user: NPCs twitched on curves): front and rear axle points (0.6 × length
  apart) both ride the lane line, whose direction is averaged over ±5 m of the chain before the sideways offset; the body
  sits between them and points rear → front. Measured over all lanes: worst heading change 4.4° per 0.5 m (a junction
  corner) vs 19.9° snaps before; sideways jumps 0.09 m vs 1.55 m.
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
- Bike parking (`BIKE_PARKS`, `findBikePark`, `addBikePark`, `updateBikes`; user request): bikes exist only in parking
  areas. For each `BIKE_SPOTS` building that has room, a paved bay beside the nearest footpath/service road (flat, clear,
  off driving roads, ≥18 m from other bays): rack rail parallel to the path, 5 hoops, 3–4 bikes nose-in, blue
  自行車停放區 sign (currently 圖書館, 體育館, 生命科學院館, 學生活動中心, 第四宿舍). The 海大(濱海校門) bus stop has a
  2-hoop rack + sign holding your starting bike. Every bike has `home` {x,z,rot,label}; one left away from it for 60 s
  (and not within 3 m of you) goes back to its slot.
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
  game, ~24 s letterboxed film with subtitles. Only the bus announcement is spoken (browser speechSynthesis, zh-TW voice;
  the user found more narration excessive). Safari blocks speech not first started in a tap, and the announcement comes
  7 s after 開始探索, so that tap speaks a silent utterance first (`primeSpeech`). Shots: aerial welcome
  → a scripted bus brakes evenly into 海大(濱海校門) on the gate (south) side of 北寧路, watched from
  the gutter (下一站，海大，濱海校門) → you step out of its rear door onto the kerb edge (door chime) in an over-the-shoulder
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
  traffic and crowd multipliers (`VEH.base`, `STU.base`), sound on/off,
  camera sensitivity.
- Emotes: 1 揮手, 2 歡呼, 3 鞠躬, 4 跳舞, 5 坐下 (mobile: 表情 button).

## Publishing

- Repo: github.com/pork0817/ntou-walk (branch `main`). GitHub Pages serves `main` at https://pork0817.github.io/ntou-walk/.
- The owner asked for auto-push: after each finished, tested change, rebuild `index.html`, make sure the test hook is gone
  (`grep -c window.DBG index.html` is 0), commit with a short description and push `main`. Never push work in progress.
- `.gitignore` keeps out `.claude/` (local preview config and test hook), `docs/school-map.jpg` (the school's artwork) and
  any Street View screenshots (reference only, never published).

## Coast (`COAST`, `buildCoast`, `updateCoast`, user request)

- Shore: along every `D.coast` line a sloped rock revetment (boulder texture, land edge → −1.6 m) and a soft surf
  ribbon on the water (animated foam texture); it also hides the 4 m stair-steps of the terrain shoreline.
- Boats on scheduled routes (`routeAt`; out → away beyond the fog → back → in harbour), local +z forward, bobbing and a
  wake, red/green/white navigation lights at night (`coastDark`: before 05:48 / after 18:24): the research ship docks
  at the campus wharf in the cove (replaces the old sliding ship), 3 boats (fishing + tug) to/from 八斗子 off the east
  edge, 2 fishing boats out of the 和平島 channel (west), and the 基隆嶼 ferry crossing the horizon one way.
- Channel buoys (red/green, lamps flash at night), the harbour light on the breakwater tip (flashing red), gulls
  circling over the cove and channel mouths by day (two flapping wings, banking), 5 people fishing from the seawall,
  基隆嶼 as a fog-free silhouette on the NE horizon, and squid-jigging boats with lamp rows and a big additive glow
  sprite on the night horizon (Keelung's famous night view).

## Interiors (`INT`, `buildLibrary`, `buildStore`, `updateInterior`, `liftTo`; user request)

- Sources (researched online): the library's 樓層配置 page (li.ntou.edu.tw, 圖書排架/樓層配置) and 7-ELEVEN's X-STORE
  listing (X-STORE 第八店, 北寧路2號 海洋大學圖書館, 19 坪, 24 h; LiDAR grab-and-go, four-door fridge, opened 2024-10).
  Library designed by 王秋華 with J. J. Pan and Partners (M+ archive). B1 (全興書苑) and 圖書二館 are not built yet.
- OSM split the library outline into three ways and only the first was drawn; `mergeLibraryFootprint` chains them
  (now a 46.8 × 37.2 m block). Five floors above ground, 4.2 m apart (= the building's 21 m), 1F = plinth top.
- Layout in façade coordinates (u along the long SW façade from its west end, v inward). 1F: lobby, book drop, smart
  lockers, AI 共創教室, 資訊網路服務組 and 藝文中心 offices, reading tables, X-STORE 8 in the south corner (own 24 h
  door + glass front + stripe fascia; entry gates, gondolas, fridge wall, coffee counter, LiDAR sensor rails; entering
  says 歡迎光臨 with a chime, and it is a discoverable place). 2F: circulation desk, new books, search terminals, 愛樂廳,
  團體視聽室, multimedia PCs, 4 discussion rooms, reference stacks. 3F: periodical racks, bound periodicals, 夢幻海洋 VR,
  靜音艙 pods, study carrels, manga corner. 4F: Western books, theses, children's books, 數位攝影棚, learning commons.
  5F: Eastern books, 特藏室 display cases, AV archive, rarely-used books. Hanging signs per area, a floor directory
  at the lift, a few readers. Books are one InstancedMesh per floor.
- Separate interior spaces (user: the dollhouse cut-away showed the campus through the walls and felt cramped):
  each interior is built far from the world (`IN_X/IN_Z`, y = `IN_Y` = 100; library floors `IN_GAP` 140 m apart,
  the store beside them). The building outside stays one solid block. Stepping onto the landing in front of a door
  (`updateInterior`) fades (`#doorFade`, driven by the frame loop) into that space; walking back to the door inside
  brings you out in front of it (`enterSpace` / `exitSpace` / `moveTo`). Each library floor is its own space; the lift
  (yellow square → 1F–5F panel) moves you between them at the same spot. Rooms are tall (library 7 m, store 5 m):
  `roomShell` builds inward-facing walls (window band) and a downward-facing lit ceiling, so anything between the
  camera and you is see-through from behind; the camera stays under the ceiling (≤ 8 m, store ≤ 5 m). Exit doors and
  exit signs are inward-facing panels for the same reason. Indoors: constant light (`updateSky`), no sea/traffic/rain
  sound or rain, HUD shows 圖書館 nF / X-STORE 8 instead of altitude, and `blocked()` only checks walls/furniture
  (the spaces are outside the map bounds). `WPOS` (the door outside while inside) feeds places, zone, minimap,
  student spawning, traffic culling and saving. The library's 1F corner is walled off (the store has its own street
  door). Collision stays floor-aware (`bot`, `kind:'floor'`, `nocam`).

## Seasons and weather (`WX`, `setupSeason`, `pickWeather`, `updateWeather`, user request)

- Season from today's date in Taiwan (Mar–May spring, Jun–Aug summer, Sep–Nov autumn, Dec–Feb winter). Sunrise/sunset
  follow the year (`WX.sr/ss`: ~05:05–18:50 in June, ~06:30–17:05 in December) and drive `updateSky` and the sun arc.
  Tree leaf colours (`WX.leaf`): spring 12 % pink blossom + fresher green, autumn 24 % yellow/orange + warmer, winter
  duller; terrain gets a seasonal tint uniform.
- Weather states clear / cloudy / drizzle / rain / storm / fog (cloud, rain, fog, thunder mix), re-rolled every
  4–9 min with ~35 s transitions, weighted per season for Keelung (`WX_SEASON`: wet winter monsoon, spring fog,
  summer thunderstorms). A new game always starts fine (the intro); Settings → 天氣 自動 / 晴天 (always fine).
- Effects: grey sky + closer fog (`scene.fog` near/far), dimmer sun, lamps and headlights on in dark weather
  (`nightLevel` raised; coast lights follow `nightLevel`), rain as ~3000 streak point-sprites in a 40 m box round the
  camera (1-px lines were invisible), wet ground (terrain shader `wxWet`, road and sidewalk materials darken),
  umbrellas on students and on you when walking (not riding/driving/indoors), lightning flashes and delayed thunder
  in storms, a rain hiss in the sound mix (muffled indoors), stronger breeze. HUD clock shows e.g. 一般時段 · 秋 · 雨.

## Bike race (`RACE`, `buildRace`, `startRace`, `updateRace`, `finishRace`, `endRace`; user request)

- 第一餐廳FRB → 海空大樓, ~600 m, all on campus (the first finish, 電資暨綜合教學大樓, is across 北寧路: the race left
  through the gate and crossed the road; user asked to fix). Route = the walking graph's shortest path (`astar`), Chaikin-smoothed,
  resampled every 2 m; along main roads it moves off the sidewalk onto the road edge (1.8 m in from the kerb), then
  any point with a solid within 0.9 m is nudged sideways (≤ 10 m) to clear space (the sidewalk is full of palms,
  lamps, scooter rows and walls a bike can't pass). Start and finish arches (banners back to back) only show during a
  race; otherwise the start is a glowing orange circle with a bike icon on the road (a discoverable place).
- Stand in the start circle → 開始比賽 panel (best time shown). Start: you get a race bike if you aren't
  riding (it later returns to the grid by the 60 s rule), six on a 2×3 grid, 3-2-1-GO with beeps (you can't move
  during it), yellow arrows every 30 m, route + racers + finish on the minimap, HUD 名次 / 時間 / 剩 m + 退出. Traffic
  max drops to 4 and vehicles near the route are removed; restored after.
- Five student racers ride the route (ghosts: no collisions) at 9.5–11.7 m/s × skill, slower through bends, a sprint
  for the last 120 m, catch-up (ahead > 35 m: −10 %; behind 25/60 m: +15/+30 %). Measured: cruising ≈ 5th in 1:15,
  sprinting (Shift) wins. Your progress is the route position near your last one (no skipping). The race ends when
  you cross the line: results (place, game-time clock, best time in localStorage `ntou-walk-race-best-v2`), 再比一次.
  Quit anytime (HUD button or 放棄比賽 in the pause menu).

## Sound (`SND`, `audioInit`, `updateAudio`)

- Relaxing game: everything synthesised with Web Audio, no files. Output: master → DynamicsCompressor (−20 dB, 4:1) →
  ×2.8 make-up gain (`SND.out`), so it is clearly audible at low system volume without clipping (user: 25 % volume was
  too quiet). Measured RMS: quiet campus ≈ −27 dB, coast ≈ −22 dB, beside 北寧路 ≈ −24 dB with passes to −17 dB.
- Ambience: one looped brown-noise buffer feeds a sea bed (low-pass, slow swell, more water within ~45/110 m = louder)
  and a faint breeze. Birds (chirp trills) 05:30–18:30. No crickets: the user heard them as an unexplained night beep.
- Traffic (user: cars and buses are petrol; traffic noise is mostly tyres): the base is a tyre-roll bed (white noise,
  band-pass ~850 Hz) summed from every moving vehicle within 300 m, plus a low rumble under it. The 4 loudest nearby
  vehicles (idling ones within 30 m too) get a panned voice (`driveVoice`), kept on the same vehicle while audible.
  Engines are deliberately calm (user found sawtooth roar and the e-whine irritating): two detuned triangles + a sine
  sub at the firing frequency through a low, gentle low-pass, narrow rev range, slow glides, well under the tyre noise.
  Cars/taxis rpm/30 (idle 800), buses/trucks rpm/20 (idle 650), petrol scooters rpm/120. ~35 % of scooters are
  electric (`v.ev`): a very quiet low sine hum (110 Hz + 9 Hz per m/s). Your vehicle uses the same model.
  Except your own tyres: low-passed at ~260 Hz + 6 Hz per m/s and capped at 0.09 — a soft dark rumble. As a bright
  band-pass hiss it sounded like loud wind in the trees at speed and drowned out the traffic.
- Horns are soft two-tone beeps (yours, H / 喇叭, and traffic honking at you); a door chime when the intro bus stops.
- Crash sounds (`impactSound(kind,speed,x,z)`, debounced per kind, loudness by impact speed and distance), one per thing
  hit: wall/concrete thud (+crunch when fast), tree knock + leaf shiver, pole metal clang, hedge rustle, bus-shelter glass
  tinkle, kerb/bank bump, car crunch, bus/truck boom, scooter plastic clatter + scrape, a soft muffled thump for people.
  Solids carry `mat` where they're created (palms/trees 'tree', hedges 'bush', scooter rows 'scooter', shelters
  'glass'); `solidMat` falls back to 'pole' (thin, tall) or 'wall'. `hitsSolid` records LASTSOLID. Driving uses it for
  walls/trees/poles and crash() for vehicles/people; the bicycle's bounce uses it too (softer).
- `SET.sound` on/off: 聲音 toggle top-right of the title screen and a row in Settings. Audio starts on the first tap/key
  (browser rule), master fades to 0 in the pause menu, after Quit and when the tab is hidden. The clock option was removed
  (user request); the game clock is always real Taiwan time plus the offset.

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

## Missions

`MS` holds the state, and `MS.list` holds one definition per mission, built in `buildMission`. Each definition has:
- `giver`, an NPC made by `msNpc`;
- an optional `when()` condition with a `whenZh` label;
- `greet`, `start`, `tick`, `end`, `clean` and idle lines;
- `steps`, where each step has `zh`/`en` (strings or functions of `M`), `t(M)` (the target `{x,z,y,inside}`),
  `ok(M,d,dt,t)` (done?), and optional `then` and `note`.

Setting `M.back=n` sends the mission back to step `n` (used when a race is quit or the car is left).

1. 新生報到 is active from the start. The other nine unlock after it. Walk within 3.2 m of a giver with a ! and that
   mission starts. Only one mission runs at a time.
2. While indoors, a target that is outside or in another space points first to the exit or the lift (`msExit`).
3. Missions and their givers, in order:

| Mission | Giver | When | What you do |
|---|---|---|---|
| 早餐跑腿 | 阿哲 at 第二宿舍 | any time | 7-11 counter, then back to him; 10-minute soft timer |
| 搭公車去海邊 | 學姐 | 06–23 | board at 濱海校門, get off at 體育館, watch the sea for 15 s at `G.shore` |
| 雨天送傘 | 小雨 at 海空大樓 | raining | the umbrella prop is on library 2F; you carry it back |
| 校園巡禮 | guide at 山海迴廊 | any time | 夢泉, 勇泉, 創校紀念公園, 運動場 and 小艇碼頭, in any order |
| 找回腳踏車 | 小安 at the 第四宿舍 park | any time | a pink bike at a random other park |
| 夜釣之約 | 阿海 at 第二餐廳 | 19–04 | three friends with rods at `G.pier`; stay 30 s |
| 球場補一咖 | 阿凱 at the court | 07–22 | stand on the court for 45 s; `C.mis` keeps 5 players there |
| 第一場比賽 | 學長 at the race start | any time | start and finish a race; `finishRace` sets `RACE.lastPlace` |
| 代駕學長 | 阿德 at 郵局 | any time | get a car or scooter, pick him up, drop him at `G.drop` near 海空大樓; `missionCrash` counts bumps |

4. Saving: progress is in localStorage `ntou-walk-missions-v1` as `{done,act,step}`. The old `ntou-walk-mission1`
   key is migrated. A mission other than 新生報到 restarts at step 1 after a reload. New Game calls `msReset`.
5. UI: the card is `#mission` and is hidden during races. The pause menu lists missions in `#missions`, built by
   `openMissions`, and can drop the current one. Mission toasts pass `pri` so a newly discovered place doesn't cover
   them. Mission targets and available givers appear on the minimap and the big map (`drawMissionOnMini`).

## Solid paving (`PAVE`, `pave`, `surf`)

`pave(x,z)` gives the height of the paved surface above the terrain:
- sidewalks and corner paving: `SW_LIFT` (0.2);
- carriageways and junctions: `RN_LIFT` (0.08);
- steps: 0.15; footpaths: 0.1.

It is indexed by `paveIndex()` after `rnIndex()`, and `surf(x,z)` = `ground` + `pave`. These use it:
- `floorAt`, so walking and bikes stand on the surface;
- `placeBike`, `placeFree` (parked vehicles), pedestrians and mission NPCs.

The driven vehicle keeps its jump physics on the bare terrain. `wheelGround` adds the kerb as `W.kerb` (eased into
`v.kS`) and as extra pitch/roll, so a car rolls up onto a sidewalk without launching off the kerb.

## Traffic drivers (`spawnVehicle`, `updateVehicles`)

**Tempers.** Each spawned driver gets a temperament:
- **Speeders** (`v.fast`): about 17% of cars, 26% of scooters and 5% of trucks, never buses. They drive at 1.3–1.65×
  the usual speed (capped at 21 m/s, about 75 km/h), accelerate harder (`v.acc` 3.4), follow closer (`v.T` 0.6) and
  honk sooner.
- **Dawdlers** (`v.slow`): about 10%, at 0.75–0.85× speed.

`v.acc` and `v.T` feed the IDM car-following rule.

**The player on foot.**
1. Traffic reacts only when you are in its path, within half its width plus 0.35 m, and close enough to need
   stopping: `d < v²/17 + reaction + 1 + 3`. There is no gentle slow-down from 18 m away any more.
2. It then emergency-brakes (`v.emerg`, which stays set until stopped). The deceleration is just enough to stop
   about a metre short of you (`v.emD`, 4–9.5 m/s²).
3. The tyres squeal (`skidSound`), the nose dips (`v.dive`) and it usually honks; speeders always do.
4. It stays stopped while you stand within 12 m in front, then drives on.

Crossing students still get the normal anticipatory stop.

## Police and ambulances (`COP`, `updatePolice`, `updateSirens`, user request)

**Spawning.** `spawnVehicle` turns about 3% of non-bus spawns into `police` (two at most). About 2.5% become an
`ambulance` (one at most), and half of those are on a call: `v.siren`, `vmax` 25 m/s (90 km/h), harder acceleration.

**Look.** `makeVehicle` builds both with livery textures (`liveryTex`) and a roof `lightBar`. The lenses flash in
`setSirenLights` while `v.siren` is on.

**Sirens on the road.**
- Vehicles in the same lane up to 50 m ahead of a siren set `v.yield`: they slow to 4 m/s and ease toward the kerb
  (`v.lat`, kerb side is `+lane.dir`).
- The siren vehicle skips yielding leaders when it picks who it follows, and squeezes past on the inside.
- A siren vehicle runs red lights, slowing to 11 m/s through them.

**Police patrol.** Every 0.4 s a police car scans its own direction up to 70 m ahead for:
- speeders over `LIMIT` (15.3 m/s, 55 km/h);
- vehicles that ran a red in the last 4 s (`v.redT`). Some speeders run reds now (`v.runRed`).

It also watches the player within 55 m: driving over `LIMIT`, or crossing a red stop zone while driving or riding
(`watchMyLights`, which sets `COP.redT`).

**The chase.**
1. `startChase` puts on the siren, raises `vmax` to 22, and moves the police car into the target's lane.
2. An NPC target within 10 m sets `q.pulled`: it stops at the kerb, gets a short talk, and is then made a normal driver.
3. The player is stopped once they stay still within 22 m for 1.2 s. `ticketMe` charges NT$1,800 for speeding or
   NT$2,700 for a red light, with the total in localStorage `ntou-walk-fines`.
4. The police give up after 90 s, or after 8 s more than 170 m away.

**Audio and controls.** `updateSirens` runs two triangle-wave voices swept by an LFO: a fast yelp for police and a
slow wail for ambulances. Siren vehicles flash on the minimap. If the player drives a police car or ambulance, G
toggles its siren.

**Chasing the player off the lanes (`RG`, `rgBuild`, `rgNear`, `rgPath`, `goFree`, `freeDrive`).** Lane-bound police
could only speed up the way they were facing, so a police car chasing the player leaves its lane (`p.free`):
1. **Route.** Every 1.5 s it plans a shortest route over the road graph to the player's nearest road point. The graph's
   nodes are `RN.C` edge endpoints and its edges are `RN.edges`; `rgNear` uses a 16 m spatial index of 2 m samples.
2. **Steering.** It follows the route with a car's turning rate and slows for turns. Nearly stopped, it turns round
   on the spot. For the last 30 m it heads straight at the player.
3. **Braking.** It brakes with real stopping distances for the goal and for anything ahead that hasn't moved over.
4. **Other traffic.** Lane traffic treats free cars as obstacles (`FREE` in `updateVehicles`) and yields to a free
   siren ahead of or behind it within 45 m. Free cars are skipped by the chain hand-over and by culling.
5. **Giving up.** It gives up only when there is no road route, or the route is over 1.5 km for 10 s, or after 150 s.
6. **After the ticket** (`mode 'leave'`) it drives to a far road node and is removed once out of sight.

`removeVehicle` tolerates vehicles that are no longer in a lane.


## East: 碧砂漁港 and 八斗子 (user request; `EAST`, `buildEast`, `updateEast`, `townPave`, `FISH`)

**Map.**
- **Bounds:** the map is now x −600..2100, z −320..1250 (it was −600..760 × −320..400).
- **Ground texture tiles:** the ground is painted in three tiles (`GTILES`). The campus box is at its old resolution,
  so its texture is identical. The east strip is at 0.55× and the south hills at 0.35×. Each tile has its own canvas
  and terrain mesh.
- **Paving:** east of the campus, `townPave` paints quay concrete within 28 m of water and town paving within 20 m of
  buildings and streets.
- **Coast:** heights there are capped near the sea (`2 + 0.9·distance`), so real cliffs end as slopes, not walls.
- **Road levelling (`build.py`; user: "roads have even, flat, smooth surfaces; only off-road is hilly").** At 30 m
  the DEM smears hillsides onto roads at their foot, so every drivable road gets its own level:
  1. Take the lowest ground across it, floored at 2.5 m (the DEM reads the sea as below zero).
  2. Smooth it along the road over 60 m for main roads or 24 m for streets.
  3. Cap the gradient at 3% for main roads and 12% for streets.
  4. Make the ground flat 5 m past each kerb (no sideways tilt) and ease it back over 14 m.
  5. Stamp it on the 1 m raster every 0.5 m along and across, vectorised. Coarser steps left holes the hillside showed
     through, which caused the bumps.
  6. Major roads claim their ground first. Minor roads take the major road's level where they meet or run alongside
     it. Inside the campus box, roads take the stored campus level.

  Roads are always land, and the coastal slope cap skips them. The 4 m grid is a block average. Outside the box the
  terrain is the real DEM only.

  Checks used (`ground()` every 2 m along each road): 北寧路 east of campus has bumps ≤ 0.25 m, sideways tilt ≤ 7%
  and gradient ≤ 3%.
- **Zones:** `bs` (碧砂漁港, x < 1300) and `bd` (八斗子).
- **Places:** 11 new ones (`e_*` ids).
- **Traffic and buses:** they run the whole way to 八斗子 and 海科館 by themselves. The new bus stops come from OSM
  stops within 25 m of 北寧路; a terminus keeps its two farthest-apart nodes.

**Life there.**
- **Boats:** 26 fishing boats are moored in the two basins and bob.
- **碧砂 fish market:** a row of fish stalls along the market hall's long side that faces a road, open 06:30–19:30,
  with vendors calling out.
- **八斗子夜市:** 18 food stalls with glowing lanterns on both sides of the side street by the harbour (not 北寧路
  itself), open 17:00–00:30. A strolling crowd of 16 (8 on phones) walks along the street's curve while you're near.

**Fishing.**
1. You can fish standing on land with open water 1.5–7 m ahead (`fishWater`): on foot, outdoors, not racing.
2. Press C (or `#fishBtn` on touch) to cast. The bobber floats while you wait 4–14 s (shorter at dawn, at dusk and in
   the rain). Then it dips: 1.3 s to press again.
3. Fish are chosen by weight; 白帶魚 and 透抽 are mostly at night. Sizes skew small.
4. The catch log is in localStorage `ntou-walk-fish` and shown under 魚獲 in the pause menu.
5. Moving cancels.
6. The old fisherman on the 八斗子 fishing pier explains it once when you walk up; that keeps it diegetic, with no
   on-screen hint.


## West: 正濱漁港 and 和平島 (user request; `buildWest`, `hepingBridge`)

**Map.**
- **Bounds:** the map is now x −1552..2100, z −1520..1250. X0 and Z0 sit on the campus grid's 4 m lattice; the
  stored campus grid is placed at offset (238, 300) cells.
- **DEM:** `fetch_dem.py` covers the whole box.
- **Build:** about 2.6 GB peak memory and about 10 s.
- **Ground tiles (7):** campus (as before), 碧砂/八斗子, 正濱/和平島 (x < −600, z < −80), the 中正區 south-west, the
  hills south of campus, and two mostly-sea tiles (north of campus, north-east).
- **Paving:** `townPave` paints quays and town everywhere outside the campus box.
- **Zones:** `hp` 和平島 (z < −480), `zb` 正濱漁港, `zz` 中正區 (z > −80, x < −600).
- **Draw distance:** `camera.far` follows the fog (`fog.far + 60`). Nothing fully fogged is drawn; this took campus from
  ~2300 to ~1350 draw calls (8–9 ms).

**Bridges.** OSM `bridge=yes` road pieces carry `b:1` in the game data.
- In `build.py` a bridge deck gets the same flat strip as any road (road + 5 m each side) and a straight level from
  one end to the other (no sag). A narrow causeway was tried first: on the 4 m grid its edges blended into the sea
  and the deck came out jagged (user screenshot).
- `hepingBridge` dresses drivable bridges outside the campus (user request: solid sidewalks and fences):
  - a solid raised sidewalk each side (3.2 m wide, 0.25 m high, a stepping `lmSolid`, so you walk on it; cars stop
    at its kerb);
  - a solid railing at its outer edge (people, bikes and cars can't leave the bridge);
  - a 1.8 m edge beam with a face down to the water.

  社寮橋's arch ribs stand outside the railings.
  社寮橋 (和平島聯外道路) gets the yellow twin arches.
- The old stand-in at the map edge (fake island and houses) is gone.

**Landmarks.**
- **正濱漁港彩虹屋:** OSM has no footprints there, so the row is built by hand: 17 narrow 3–4 storey houses along the
  quay, facing the water.
- **Rainbow colours and temples:** town buildings within 110 m of the spot also take rainbow colours. Temples
  (`building=temple|shrine`) get red walls and orange roofs.
- **阿根納造船廠遺址:** roofless arched walls.
- **萬人堆:** 30 mushroom rocks.
- **千疊敷:** 26 rock slabs.
- **社寮東砲台:** a ring wall and a cannon.
- **和平島觀光魚市:** stalls via `marketNear`, opening and closing with 碧砂's.
- **Boats:** 16 moored in 正濱漁港 and 八尺門.
- **Places:** 13 new ones (`w_*`).

## 和平島公園 buildings (`parkBuilding`, user request: look like the real ones)

`buildingMesh` hands the park's own OSM footprints, picked out by position, to `parkBuilding`.

| Building | How it's built |
|---|---|
| 和平島遊客中心 | A 3-storey fort after 聖薩爾瓦多城 (the 1626 Spanish fort the visitor centre is modelled on): sandstone `castleTex` with arched windows, a dark plinth, a battlemented parapet (`merlons`), square towers at the sharpest corners, and an arched gate on the side facing the ticket booth |
| 售票口 | A one-storey gatehouse to match |
| 禾口丘咖啡 (the old radar station) | A concrete block with a white radome, a rooftop railing wall and a rainbow outside stair (solid steps) up the longest side |
| Annex beside it | A glass-fronted box |

Sources only say "castle-like, modelled on 聖薩爾瓦多城, three floors" and "radar station café, colourful stairs,
rooftop deck". The sandstone colour and the details are inferred.

## Generated row houses (`genHouses`, `GEN_HOUSES`; user: "you're missing a lot of residential buildings on the island")

OSM has only 33 buildings on 和平島 despite 15 km of streets. Its residential areas cover about 5% of the land out
west, so `genHouses` lines every street (service, residential, unclassified, tertiary) west of the campus box
(x < −600 or z < −320) with Taiwanese row houses (透天厝).

**Each house:** 4.5–6.5 m frontage, 9–14 m deep, 2–5 floors (mostly 3–4), set back half the road width + 1.4–2 m. 40%
carry a tin-roofed rooftop add-on (頂樓加蓋).

**Skipped spots:** OSM buildings, road areas, woods, bare rock, parks and 和平島公園 (x, z < −1140), car parks,
pitches, schools, beaches, water, ground below 0.8 m, and slopes over 4 m across the footprint.

**Neighbours:** row houses share walls; only a real footprint overlap (shrunk 7%) rules a spot out.

**Build:**
- Deterministic (seeded) and runs right after `buildStreets`; trees outside campus skip spots it filled.
- About 3,600 houses: ~1,700 on the island, ~240 at 正濱 and the rest in 中正區.
- **Ground floors** (user request): each house's street-facing ground floor (3.3 m) is a shopfront from a 4-tile
  atlas: closed rolling shutter, open shop with goods, half-raised shutter, glass-door shop, each under a coloured
  sign board. Half the houses have a tin canopy over it. Upper-floor windows start above the shop level. The front is
  whichever face looks at the street, on either side of it. The shop floor is the pavement level 1 m in front of the
  door (`surf`), not the lot's highest point: on slopes that had left doors floating above the street (user report).
  The roof still clears the back of hillside lots.
- **Draw calls:** walls/roofs/sheds/canopies are one merged mesh, the shopfronts a second and the outlines a third: 3
  draw calls in all.
- **Collision and map:** each house is a solid (`lmSolid`) and is drawn on the map (`paintMapBase`).
