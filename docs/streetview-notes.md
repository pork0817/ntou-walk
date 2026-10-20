# Street View reference notes (2026-10-20)

Key features read from the user's Street View screenshots (`../../reference/`, kept outside the game files).
Reference only: rebuild by hand in toon style, no textures, no tracing (see CLAUDE.md item 6).
Squares are the 50 m grid of `docs/ntou-game-map.png`. x/z are game metres. Screenshot numbers in brackets.

## Along the whole of 北寧路 (repeated everywhere)

- Sidewalks: red/grey brick-pattern paving, red kerb paint, drainage grates in the gutter.
- Fan palms (short, shaggy trunks) in a row along both sidewalks from J4 to U7.
- Sea side (north) from K4 to N4: low ochre-yellow concrete planter wall (~0.6 m) with a dense hedge behind it.
- Campus side (south) in D5–G5 and S6–U7: low dark brick/stone wall (~0.8 m) with a metal railing on top, hedge behind.
- Scooters parked in long rows along the campus kerb (E4, G5, Q5, U7).
- Utility poles with yellow-black striped bases in the town section (C5–E4); tall curved street lamps elsewhere.
- Yellow-on-black chevron curve signs at the bends (I5, K4, L4).
- Zebra crossings with a green bike band (already in the game): E4, K4, Q5, U7.

## Spots

| Spot | Square | x, z | Key features |
|---|---|---|---|
| P1 | C6 | −483, −69 | 中正路/祥豐街 junction. West side: old 3–4 storey shophouses, metal awnings, scooters packed on the arcade, grey transformer box. East: terracotta brick campus block with horizontal sunshade bands, low wall + green metal fence. Road climbs to the south. [02–06] |
| P2 | C5 | −474, −103 | 祥豐校門: white concrete portal frame (two posts + beam) beside a brick building. Row of white tents (flower stalls) along the campus fence. Town side: 4–6 storey shophouses with big banners, traffic lights, blue direction signs to 海洋大學. North: power substation lattice towers. [07–10] |
| P3 | D5 | −419, −118 | Town shophouses on the north (YAMAHA shop). South: concrete bus shelter with tiled back wall (基隆市公車候車亭), 3–4 storey grey-beige campus building behind a low wall + white railing + hedge, palms. [11–14] |
| P4 | E4 | −365, −122 | Green-band zebra at the junction. North: shophouses (SYM shop), tin-roof shacks, green construction hoarding. South: low brick wall with railing, cream 4-storey buildings, blue container, long scooter row. [15–18] |
| P5 | G5 | −271, −114 | North: walled parking lot with gate, old 3-storey beige building. South: scooter parking along the sidewalk, palms, a black ring-shaped sculpture, cream 5-storey building; large brown building further east. Electronic sign gantry over the road to the west. [19–22] |
| P6 | I5 | −172, −104 | 濱海校門 area. North: concrete wall with square relief panels, red low railing + hedge, greenhouse-roofed sheds, yellow arch bridge to the NW. South: curved white building with teal ribbon windows + dark brown 5-storey block. Traffic signals, chevron sign. [23–26] |
| P7 | K4 | −84, −124 | North: ochre planter wall + hedge + palms. South: campus entrance with a raised island (yellow kerbs), small guard booth, lawn. [27–30] |
| P8 | K4 | −58, −138 | North: large "NTOU" letters on the lawn (N blue, T yellow, ♥ red, U green), wind turbine behind. South: white portal gate, roundabout island with flowers, LED billboard on two posts, blue sculpture. [31–34] |
| P9 | M4 | 30, −143 | North: wide stepped concrete terraces up to a dark navy-blue box building, palms. South: blue/red courts behind a tall chain-link fence, lawn with young trees. No east view. [35–38] |
| P10 | L4 | −9, −149 | West only: seaside lawn slope, chevron sign, junction with signals and the LED billboard. [39] |
| P11 | N4 | 60, −134 | North: very long dark navy concrete wall (~6 m high) right behind the sidewalk, palms. South: blue/red courts with tall fence, football pitch beyond. [40–43] |
| P12 | Q5 | 207, −88 | North: red-brick 3-storey building with grey trim, brown metal fence, blue water tanks. South: 體育館 with curved roof edged in red, glass gable, brick base; football pitch behind a fence. [44–47] |
| P13 | Q5 | 246, −76 | North: red-brick building with grey entrance canopy, tall tan 10-storey dorm tower. South: 體育館 curved roof, brick base with small square windows, covered walkway. Green zebras. [48–51] |
| P14 | S6 | 342, −42 | North: tan buildings with curved corners, campus driveway with a low wall and bollard rails. South: grey angular building with a yellow/red banner, rocky green hill right behind it. [52–55] |
| P15 | U7 | 416, −4 | North: dark stone wall with railing, palms, car park, tan 6–8 storey blocks. South: steep green cliff, long scooter parking strip, noise barrier fence to the east. Green zebra. [56–59] |
| P16 | Q7 | 243, 30 | Inside campus. North: big building with red pillars and a long glass top floor, grass bank, scooter row. East: stone retaining wall + dark sheds + 正安宮 sign. South/west: brick-and-tan 6-storey buildings, one under scaffolding. Yellow box junction markings. [60–63] |
| P17 | S7 | 313, 14 | Inside campus. North: tan/grey-panel dorm block with a planter terrace and railing, angled car parking. East: road between the building and a steep grassy cliff, red no-parking edge lines. No south view. [64–67] |

## Gaps

P9 (no east), P10 (west only), P17 (no south). Nothing yet on 祥豐 campus interior, 濱海 campus interior or the hill paths.

## Built so far

- 2026-10-20: everything under "Along the whole of 北寧路" (`buildRoadside`) and the landmarks (`buildLandmarks`, `raiseEastCliff`,
  體育館 barrel roof). Not yet: town shophouse facades and signs (C5–E4), the P16/P17 campus-interior details.
