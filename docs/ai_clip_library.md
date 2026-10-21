# AI clip library

Reusable photoreal clips for any story: no club badges, no sponsor logos, no real people's faces. Each one is made once and reused wherever it fits. Files live in **PostDrive › Library › ai_clips** (one folder per clip: the start frame, the clip, the prompt).

How each clip is made: a still start frame first (cheap, about 20 credits, checked and cleaned of any logos), then 8 seconds of 1080p video from it (about 160 credits). Budget about 1,000 credits per long video: three or four new clips, plus library reuse.

## Football

| Clip | Use for | Status |
|---|---|---|
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
