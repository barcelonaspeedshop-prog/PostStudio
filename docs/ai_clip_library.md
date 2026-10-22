# AI clip library

**22 Oct: this list is now part of the whole media library.** Search everything (images, clips, sounds, diagrams) in `PostDrive/Library/index.html` or with `python3 scripts/ailib.py find …`; test-period plan in docs/ai_studio.md.

Reusable photoreal clips for any story: no club badges, no sponsor logos, no real people's faces. Each one is made once and reused wherever it fits. Files live in **PostDrive › Library › ai_clips** (one folder per clip: the start frame, the clip, the prompt).

How each clip is made: a still start frame first (cheap, about 20 credits, checked and cleaned of any logos), then 8 seconds of 1080p video from it (about 160 credits). Budget about 1,000 credits per long video: three or four new clips, plus library reuse.

## Football

| Clip | Use for | Status |
|---|---|---|
| **Goal from behind the shooter** (approved by Mike 21 Oct, Leicester v6): start still behind the No. on his back, goal centred, ball already under the bar; end still made FROM the start still; seedance-2.5 draft, 10-fps check, enhance | any goal story | done (Hazard, 04 Leicester media/ai/ai_hazard_goal.mp4) |
| Hands placing the ball on the penalty spot, white sleeves, keeper bouncing behind | any shoot-out or penalty | test, Istanbul |
| Keeper bouncing and waving on his line, seen from behind the taker | any shoot-out | planned |
| Players sprinting and piling on the keeper, seen from distance | any shoot-out win, any late winner | planned |
| A packed pub erupting, fans in red, beer flying | any big win (kit colour is the only change) | planned |
| Fans at a bar staring at a screen, hands on heads | any shock defeat | planned |
| Fans walking to a stadium at dusk | any final or away trip | done as a still (ai_fans_road) |

## Motorsport

| Clip | Use for | Status |
|---|---|---|
| Low pass under a car with glowing airflow | any aero explainer | planned |
| Wet track at night, spray off a single car | any rain race | planned |
| Empty factory at night, car under a dust sheet | any team in crisis | done (Brawn) |
| Chase cam behind a 2026 car on a floodlit straight | any night race, any 2026 explainer | done (Superclipping, 02 Superclipping media/ai/ai_bahrain_clip.mp4) |
| Side-on tracking shot, Mercedes flat out | any speed/straight-line explainer | done (Superclipping, ai_straight_clip.mp4) |
| Race start from high behind the grid | any race start | done (Superclipping, ai_grid_clip.mp4) |
| Podium silhouettes, champagne spray | any win | done (Brawn) |

## Attempt log (what worked, what didn't)

| Date | Clip | Model / inputs | Cost | Result |
|---|---|---|---|---|
| 21 Oct | Elvis cartoon wink (Leicester) | gen-4-turbo, start frame | 25 | Good. Cartoons animate cleanly |
| 21 Oct | Parade drone drift (Leicester) | gen-4-turbo, start frame | 25 | Good. Slow crowd/camera moves work |
| 21 Oct | Players' sofa celebration | gen-4-turbo, start frame | 25 | First 2 s clean, then people shift and morph: use `end=2.0` |
| 21 Oct | Hazard curler #1 | gen-4-turbo, start frame | 25 | Ball flew away from goal. Start frame alone leaves the path to chance |
| 21 Oct | Hazard curler #2 | gen-4-turbo, start frame, "moving to the RIGHT" | 25 | Ball went past the top of the bar |
| 21 Oct | Hazard curler #3 | seedance-2-mini, start + end frame | 75 | Net bulged but the ball passed OUTSIDE the near post (0.4-0.7 s); Hazard's shirt became No. 9. Missed by 1-fps check |
| 21 Oct | Hazard, players only (ball removed) | gen-4-turbo | 25 | People morphed; the hand-animated ball over it looked like a comic (Mike) |
| 21 Oct | Hazard curler #4 | seedance-2.5 draft 480p, 4 s, start + end frame, path spelled out ("between the posts, under the bar, never above") | 80 | FAIL at 0.8-1.5 s: ball goes over the bar and out of frame, then pops up in the net at 3.5 s (the end frame forcing it). Not finished |

**What the four Hazard attempts teach:** from a side-on angle with the goal at the frame's edge, every model loses the ball near the frame edge and the crossbar. Next time, set the shot up so it can't: start still from BEHIND the shooter (or behind the goal), goal in the middle of the frame with space round it, ball path fully inside the picture; shorter path (ball already near the goal at frame 1); 3 s clips. Draft that first.
| 21 Oct | Hazard curler #5 | NEW SET-UP: start still from BEHIND the shooter, goal centred, ball already below the bar in the goal mouth; end still made FROM the start still (ball top right corner, keeper at full stretch); seedance-2.5 draft 480p 4 s, then enhance 1080p | 12 stills + 80 draft + 272 final | PASS at 10 fps: ball inside the posts and under the bar in every frame. The angle was the fix |
| 21 Oct | Superclipping: Bahrain chase (car from behind, night straight) | Mike's ChatGPT still cropped to 16:9 as start frame; seedance-2.5 draft 4 s, then enhance | 80 + 272 | PASS at 10 fps first time: car centred, never turns. Chase-from-behind is a safe F1 angle |
| 21 Oct | Superclipping: side-on tracking, car flat out | same | 80 + 272 | PASS; the camera settles in the first 0.5 s, so the build skips it (`skip=0.5`) |
| 21 Oct | Superclipping: Haas closing on the Alpine, from behind | same, prompt says "never touch, clear gap" | 80 + 272 | PASS to 3.4 s; after 3.5 s the cars look touching, so the build uses `end=3.4`. Ask for a 4 s clip, plan to use 3 |
| 21 Oct | Superclipping: Miami race start from behind the grid | same, "fixed camera" | 80 + 272 | PASS: rows stay in lane, a little tyre smoke |
