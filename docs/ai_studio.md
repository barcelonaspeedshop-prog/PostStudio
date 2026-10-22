# AI studio: test period to 7 November 2026

**Vision (Mike, 22 Oct):** a media company making high-quality documentaries on any topic, never standing still. That covers every channel, the website, social media and every outlet we can reach. The story, the facts and the quality come first. AI is there to show what no camera caught, never to pad a video.

**Plan:** Artlist Max Pro, 180,000 credits a month, renews **7 Nov**. Until then we use AI freely on real projects. Every credit goes in the ledger, so on 5 Nov we can decide on facts which tier we really need.

## Rules that don't change

- **Story and facts first.** AI pictures follow the narration line by line ([Pictures follow narration]). They never invent an event, a result or a quote.
- **Label reconstructions.** A realistic AI scene of a real event gets "AI reconstruction" on screen. Tick YouTube's "altered or synthetic content" box when it could pass for real footage. Credibility is the brand.
- **No logos, badges or watermarks** generated in. Real people are fine as AI stills ([AI images]), but not in invented situations.
- **Quality gate as before:** 10-fps frame check on every clip, clarity score on every still, Mike hears every read.
- **Everything goes in the library** (below), so nothing is made twice.

## Test projects (Mike's list)

Each one is a real video, not a demo. Each test asks one question.

| Channel | Project | What AI does | The question |
|---|---|---|---|
| GoF | Ferrari V12 | Cutaway diagrams, exploded parts, animated pistons and cams | Can AI diagrams be accurate enough to explain engineering? |
| GoF | Jaguar E-Type, swinging-sixties London | Photoreal 1960s street scenes, moving | Can we recreate a period convincingly? |
| GoF | Group B / Le Mans tech | Tech diagrams plus period racing reconstructions | Do diagrams and action mix well in one film? |
| F1 | People of F1, past and present | Portrait stills, workshop and paddock scenes | Do AI people hold up without looking fake? |
| F1 | F1 tech stories | Diagram series (airflow, ground effect, power unit) | Can we build a reusable diagram style? |
| F1 | Driver tactics | Top-down and chase-cam overtakes, defending, undercut | Can AI show race craft that TV angles can't? |
| Football | Player tactics | Top-down pitch animations (pressing, keeping the ball, attacking) | Can AI replace hand-made tactic boards? |
| Football | People of the game | Portraits and life scenes | Same as F1 people |
| Football | Club history | Old grounds, terraces, 1950s–80s matchdays in period film looks | Can AI give us the "back in the day" footage we can't license? |

First step for each: a **model shoot-out**. The same prompt goes to 3–4 image or video models, and we keep the winner as the house model for that kind of shot.

## The library

Everything we make or license is in one searchable catalogue on PostDrive:

- **Browse:** open `PostDrive/Library/index.html` in a browser. Search box, plus filters for images, video and sound.
- **Find from the terminal:** `python3 scripts/ailib.py find rain night`
- **New files** go to `PostDrive/Library/<kind>/<category>/` (for example `video/motorsport/night`), with the prompt, model and credits recorded.
- **Older AI media** stays in its story folder and is indexed where it is (211 files on 22 Oct).
- **Generic shots** to build up (made once, used everywhere): crowds and stadiums by era, pit lanes, rain, night, factory floors, period streets, engine close-ups, diagram backgrounds, title cards, transition sounds.
- **Sound:** Artlist's stock catalogue (sound effects and music) is part of the plan. Downloads are logged the same way.

## The 7 November decision

The ledger (`python3 scripts/ailib.py ledger`) shows credits by day, channel and model. On **Wed 5 Nov** we look at:

1. **Credits used** in the 16 days, scaled up to a month.
2. **Cost per finished minute** of video, per channel.
3. **Pass rate:** how many generations we actually used versus threw away.
4. **Which models won.** Are they premium (credits) or on the "unlimited" list?
5. **Unlimited check:** on 22 Oct the connector charged credits for models the plan calls unlimited (GPT Image 2.0 at 600, Nano Banana 2 at 130). Ask Artlist whether "unlimited" applies to Claude-connector generations, or only in the Artlist web app.

| Tier | Credits / month | Choose it if a month's use is… |
|---|---|---|
| 40,000 | 40k | under ~35k |
| 80,000 | 80k | ~35–75k |
| 180,000 | 180k | over ~75k, or the winners are premium video models we'd otherwise ration |

## Never stop improving

After every video, add what worked and what failed to the attempt log in `docs/ai_clip_library.md`, and any lasting rule to `docs/PLAYBOOK.md`.

## Shoot-out results

**22 Oct, stills (2,040 credits).** Grids in PostDrive/Library/_shootouts. Order in each grid: GPT Image 2.0 · GPT Image 2.5 Flare / Nano Banana 2 · Seedream 5.0 Pro.

| Test | Winner | Why | Lesson |
|---|---|---|---|
| E-Type, 1965 Carnaby Street | **GPT Image 2.5 Flare** (140 cr); Seedream 5.0 Pro close second (150) | Most photoreal; the car is right | GPT Image 2.0 makes 4K for 600 cr: not 4× better. Watch the signage: models write real shop names (Biba, Dandie Fashions, Lady Jane, partly real but in the wrong street) and fake plates (CAR 1965). Groups of four young men in suits come out looking like the Beatles: prompt them away. |
| Ferrari V12 cutaway | **none passed** | All four drew an inline engine (one row of pistons), not a V12. Nano Banana 2 has the best illustration style | AI makes cutaways that look right and are wrong. Engineering diagrams need a real reference image as input (image-to-image), or we draw the structure ourselves and use AI only for finish. Next test: a reference-led V12. |

Settings note: the connector resolves "High 2K" GPT Image 2.5 to medium 1K and Seedream 5 Pro to 1K. Ask for the size explicitly next time.

**22 Oct, E-Type clips (5,000 credits).** Same start still (GPT Image 2.5 winner), same prompt: slow push-in, car parked, people walk, bunting moves. Seedance 2.5 left out (5,000 credits alone at 1080p). Side-by-side in PostDrive/Library/_shootouts/2026-10-22_etype_clips_compare.mp4.

| Model | Credits | Delivered | Result |
|---|---|---|---|
| Kling 4.0 | 1,375 | 1080p, 5 s, with sound | PASS. Natural walking crowd, car and plate rock-steady. Best all-round street scene |
| Veo 3.1 | 1,000 | 1080p, 4 s, with sound | PASS. Same quality as Kling for less; a little less movement |
| Luma Ray 3.2 | 2,225 | **720p** (asked 1080p), 5 s, silent | PASS and the most cinematic: real dolly-in to a close-up of the car. Dearest, and lower resolution than asked |
| Veo 3.1 Lite | 400 | 720p, 4 s, silent | PASS but plain: barely moves. Fine for background, 720p only |

No morphing at 10 fps on any of the four: a parked car with walkers is an easy shot. **Lesson:** for realistic street/period scenes, any premium model works, so pick on price and resolution. **Veo 3.1 is the value pick** (1080p, 1,000 cr). Pay for Luma only when we want a real camera move. The hard tests (fast cars, ball physics, people's faces up close) are where the models will separate.
