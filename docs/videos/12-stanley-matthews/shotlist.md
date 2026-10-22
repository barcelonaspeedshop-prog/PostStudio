# Stanley Matthews: AI shot plan (test project, feature cut v2)

The test: how far free models carry a 14-minute history film, and how few premium shots it really needs.
Real photos of Matthews come first (Wikimedia Commons and Mike's finds); AI fills only what no camera caught.
Every realistic AI scene of a real event gets an on-screen "AI reconstruction" label.

## Already in the library (0 credits)

| Shot | Chapter |
|---|---|
| lib01_12 1950s muddy match (B&W) | Cold open |
| lib01_13 1970s dressing room | 10 |
| lib01_14 fans walking to the ground at dusk | 9 |
| terrace_1970s crowd stills and clips | 7 |

## Free, made in the Artlist website (Nano Banana 2 still → Kling 2.5 Turbo 1080p clip)

| # | Shot | Chapter |
|---|---|---|
| F1 | 1920s Potteries: bottle kilns, smoke, terraced streets | 1 |
| F2 | 1920s barber's shop with boxing posters on the wall | 1 |
| F3 | Grey-haired man lacing old leather boots, 1960s dressing room (reconstruction) | Cold open |
| F4 | Blackpool beach at dawn, 1950s, a lone man running at the water's edge | 5 |
| F5 | Wembley twin towers, early 1950s, crowds outside | 6 |
| F6 | 1953 front room: a family and neighbours round a tiny television, curtains drawn on a sunny afternoon | 7 |
| F7 | The same front room, everyone on their feet cheering (made FROM F6, so the room matches) | 7 |
| F8 | Wembley 1953, 100,000 crowd, packed terraces | 7 |
| F9 | 1950s winger on the right wing with the ball, full-back backing off (reconstruction) | 2, 7 |
| F10 | Wembley crowd erupting, hats in the air | 7 |
| F11 | 1961 crowd queuing outside a northern football ground | 9 |
| F12 | 1970s township pitch, boys playing barefoot | Epilogue |
| F13 | Stoke-on-Trent streets lined with people, 2000 | Epilogue |
| F14 | A packed 1930s public hall meeting, men in caps and coats, a banner on the stage | 3 |
| F15 | A 1930s Olympic stadium, huge crowd, wide (paint out any symbols the model adds) | 4 |
| F16 | A 1965 floodlit stadium at night, packed | 10 |
| F17 | A period newspaper front page (text added in the edit: STOKE STAR ASKS TO LEAVE) | 3 |

### Clips made 22 Oct (Kling 2.5 Turbo Pro, 1080p, 5 s, 0 credits): frame-checked at 10 fps

All 16 sit in `media/ai/` as `F01_…mp4` to `F16_…mp4` beside their stills; first tries of F09 and F14 are in `_rejected/`.

| Clip | Verdict | Edit note |
|---|---|---|
| F01 Potteries, F02 barber, F03 boots, F04 beach, F06 front room, F07 cheer, F08 Wembley crowd, F11 queue, F12 township, F13 Stoke streets, F15 stadium | Good | Full 5 s usable |
| F05 Wembley towers | Good | Use 0–3.8 s: a rattle swings into the lens at the end. "WEMBLEY STADIUM / EMPIRE STADIUM" text is correct |
| F09 winger | Redo good | First try lost the ball and changed shirt numbers; v2 keeps the ball at his feet (no burst past, so the beat-the-man move stays in the drawn explainer) |
| F10 crowd erupts | Good | Use 0–3 s: rattles fill the frame after |
| F14 public hall | Redo good | First try had puffs of smoke like an explosion; v2 is clean |
| F16 floodlit 1965 | Check | A "SPION KOP" sign and a garbled scoreboard: Stoke's end was the Boothen End. Crop or blur the top left, or use only as a generic floodlit crowd |

Website tip: uploading a start frame from disk stopped working on 22 Oct; pick the still from **Start Frame → My Library** and search a word from its prompt.

## Premium (credits, through Claude, Mike approves the total)

| # | Shot | Model | Credits |
|---|---|---|---|
| P1 | **The winner**: start frame = winger at the goal line about to pull the ball back; end frame = the ball arriving at a late runner in the six-yard box. Camera behind the winger (our approved goal template) | 2 GPT Image 2.5 stills + Kling 4.0 start/end clip | ~280 + 1,375 |
| P2 | Mortensen's 89th-minute free-kick into the top corner, camera behind the kicker, start and end frames | 2 stills + Kling 4.0 | ~280 + 1,375 |

**Premium total: about 3,300 credits.** Everything else is free.

**REJECTED by Mike 22 Oct (moved to `_rejected`): clips cheapen the story. Made on Kling v3 Pro, start + end frames, 1080p, 5 s, no audio: 500 each, 1,000 total (Mike approved; balance 166,401).**

| Clip | What works | Problem | Edit note |
|---|---|---|---|
| P1_winner_pullback.mp4 | 0–2.9 s: the winger reaches the line and pulls the ball back across the box, camera follows | From about 3 s it jumps to a wide side view; the runner never shoots and the end frame is not reached | Use 0–2.9 s; narration carries the finish |
| P2_freekick.mp4 | 0–3.2 s: run-up and strike; 4.2–5 s: the keeper dives and is beaten | 3.2–4.2 s the kicker walks into his own wall; the ball is never seen in the net | Two cuts: 0–3.2 s, then 4.2–5 s |

Lesson: Kling v3 Pro holds about 3 s of real action, then morphs to hit the end frame. For a full goal, try a longer duration (8 s) or Kling 4.0.

## Graphics (the "next level" brief)

- Chapter title cards: an AI-made period texture behind each (newsprint, a Wembley programme cover, a 1950s match ticket), our type on top.
- The dribble explainer (Ch 2) and the minute-by-minute final (Ch 7) are drawn by us so the geometry is exactly right, set on an AI-made pitch (muddy 1950s grass, chalk lines, floodlight glow) instead of flat green.
- Fact cards sit on AI-made period paper (a 1950s match programme page, a telegram), not plain navy.
- Scoreboards as a recreated 1950s Wembley scoreboard (AI background, our numbers).

## Real footage: British Pathé (checked 22 Oct)

- Film: **"Cup Final – Blackpool 4 v Bolton 3" (1953)**, Film ID 76.07, britishpathe.com/asset/54486, 4 min 58 s, black and white with sound, SD (HD scan on request). Its shot list includes Mortensen's free-kick goal, Matthews beating Barrass and crossing, Perry's winner, Matthews mobbed, the Queen presenting the cup. Pathé also holds "Selected Originals" (extra unused material) from the same reels.
- **Online "License Film" button:** Online → Digital = **£2,825 + VAT** for the whole film, web, worldwide, 5 years, SD file (720×576). Too much for one video.
- **Cheaper routes, quote only:** (1) per-second licence for just the seconds we use (60 s minimum, can mix clips); (2) Pathé's new **Content Creator Programme** for YouTube creators, terms not published ("enquire to see if you meet eligibility").
- Same match also filmed by British Movietone (issue 1248), held by AP Archive: quote only.

## The two goals, v2 plan (Mike, 22 Oct): short live shots + "ball-cam"

No archive licence. Each goal is cut into short shots that each do ONE thing; the ball's flight is a "ball-cam" (the camera travels like the ball) instead of players acting it out. Every shot is made on the free website models first; paid only with Mike's OK.

**What really happened (sources: Wikipedia 1953 FA Cup final; the42.ie; sportsclub.co.za)**
- Free-kick, 89th minute, 3–3: Mortensen scored directly from a free-kick about 20 yards out, into the top corner; the keeper was left standing. No source says it went over the wall, so the ball-cam goes **past the wall** into the top corner, not a clear lob.
- Winner, 90+2: Matthews went past Banks on the outside down the right, reached the byline and pulled the ball back; it passed just behind Mortensen and Perry drove it in. Perry said Matthews slipped as he crossed.

### Free-kick (replaces P2)
| # | Shot | How | Rule |
|---|---|---|---|
| FK1 | Ball placed on the grass, Mortensen steps back, wall lining up | AI clip from a new still | Ball does not move |
| FK2 | From behind: run-up and strike | AI clip, start frame only (no end frame), 3–4 takes on free models | **Cut on the frame his boot meets the ball.** Reject any take where the ball moves first |
| FK3 | **Ball-cam:** camera leaves the boot at ball height, rises and bends past the edge of the wall, dives into the top corner, net bulges | AI camera move through a frozen scene ("time frozen, players still, only the camera moves"), start still = behind the ball looking at the wall, end still = inside the top corner | Our drawn flight line and a whoosh on top. Fallback if AI fails: we build it ourselves from two stills with a parallax push (exact, free) |
| FK4 | Net still rippling, keeper standing beaten, crowd erupts | AI still + slow move, then F10 crowd clip | |

### Winner (P1)
| # | Shot | How | Rule |
|---|---|---|---|
| W1 | Matthews at the byline pulls the ball back | **P1a_cutback.mp4** (first 2.9 s of the Kling v3 Pro clip, kept) | Already made |
| W2 | Angle change: behind Perry as the ball comes across to him, goal and keeper ahead | AI still + short clip, ball rolling towards him | Cut before he strikes |
| W3 | **Ball-cam:** from Perry's boot, low and fast past the keeper into the net | Same frozen-scene camera move as FK3 | Drawn line + whoosh |
| W4 | Matthews and Perry mobbed by team-mates; crowd | AI clip + F10 | |

All of these carry the "AI reconstruction" label.
