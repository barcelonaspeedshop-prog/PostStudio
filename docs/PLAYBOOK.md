# PostStudio playbook: how a long video is made (banked 17 Oct 2026)

Brawn v2 and Istanbul v2 are the reference videos. Every long video follows this, and every review adds to it.

## The production line (agreed 20 Oct 2026)
1. Claude researches the story and writes the script. **Mike approves the wording** before anything is made.
2. Claude builds the video. **Mike reviews it** (step 5) before release.
- **Runway for everything we generate** (AI video, stills when ChatGPT can't, voice, music). **ChatGPT first for every still** it can do: it costs no credits.
- **Save credits at all costs, but never at the cost of quality.** Spend credits only where they show on screen. Test on a short piece before a long generation. No speculative batches.
- Same system and workflow for every video; each video's research, script and explanation are its own. Generic only ever in the back end, never in the final product (YouTube's "inauthentic content" rule targets same-template videos).

## 1. Script (Claude)
- Title and thumbnail idea first. If they aren't clickable, change the angle.
- Cold open: the surprising fact and a promise ("the reason started with a change most people never noticed").
- A **"how it works" explainer** at the heart of it (Brawn: the diffuser; Istanbul: the gap and the back three), drawn as an animated diagram that runs as long as it needs.
- **The deciding moment gets a full build-up**: the walk-up, the detail, what exactly happened, then the reaction in the stadium and at home.
- Detail that fans of the story don't know. Only facts we're sure of; "reportedly" where it's reported, not proven. Fact notes at the bottom of the script.
- Names spoken, with a pronunciation guide and a [role] fallback for hard ones.
- 1,300 to 1,700 words, 9 to 11 minutes.

## 2. Pictures (Mike + Claude)
- Real photos from Wikimedia Commons (`studio/commons.py`), Mike's own finds in `media/mike`.
- AI stills for places, crowds, atmosphere and moments with no photo: ChatGPT (Mike) or Runway nano-banana (~20 credits). One image per prompt, 16:9. **Don't write "no faces / no logos / no text" in prompts** (Mike 20 Oct: it dominates the image and distorts the people); paint out any logo or text in the edit. Never a real, named person as the subject.
- **AI video in every long video (Mike 20 Oct: "adds movement and gives us the edge over just stills"): 3–4 clips of 5 s** at the
  strongest moments, image-to-video from the (correct) AI stills. Test one clip on the cheap model first (~5 cr/s, 720p); use the
  better model (~12 cr/s, 1080p) only if the cheap one loses the car's details. Propose the batch with costs; Mike confirms before
  any credits are spent. Each clip shows what the narration says; never filler.
- **Playing clips** (Mike 20 Oct, "looks very AI" / "rushed"): never two clips back to back (a photo or graphic between),
  at 60% speed (`E.AI_RATE = 0.6` in the build), and on screen for at least 3–4 s. Use only the clean part of a clip (`end=`).
- **Real cars in AI stills: attach real photos** (front, rear, side, details) in a fresh ChatGPT chat per image and describe the
  car's real details; when one is wrong, start a new chat rather than asking for a fix (Mike 20 Oct: fixes "go a tad crazy").
  Check against the photos before using it (Turbine v2 had wire wheels and stacked tail lights).
- Check every AI image at full size for logos (paint them out) and anything physically wrong (smoke blowing the wrong way, the save with the wrong hand).
- **Picture quality gate** (Mike 10-19: "if nothing works go automatically to AI"): `studio/media_check.py <build>` before every render.
  It flags anything blown up more than 1.5x and scores **clarity** (edge strength over grain at screen size; every photo Mike
  rejected on McLaren scored 22 or less, mostly grainy 1995 slide scans).
  - **POOR** (clarity < 11, or blown up): don't show it full screen. Use a better photo if one exists; otherwise make an AI still
    straight away (Runway still, ~20 credits, no waiting) and use that. Small but clean photos go on a fact card instead.
  - **CHECK** (clarity 11–22): Claude looks at it full size before the cut goes to Mike; replace it the same way if it looks soft or grainy.
  - Never show a drawn car or a drawn person where a real (or AI) picture can carry it.

## 3. Narration (AI, from 20 Oct 2026)

- Voices: only the eleven in docs/voices.md (Mike 20 Oct). F1 and Football use UK voices only. Each script names its voice; Mike approves it with the wording.
- AI voice in Runway, chosen per channel and per mood (exciting / authoritative / soft), at least two voices per channel. Samples: PostDrive `Gentlemen of Fuel/01 Chrysler Turbine/audio/voice_tests/`.
- Generate one 60-second test of the opening first; the full script only once the test sounds right.
- Hard names: spell them phonetically in the voice text (the script keeps the real spelling).
- Generate one voice file per script section (`audio/v2/parts/01.mp3`, `02.mp3`, ...), same voice and seed, then
  `studio/ai_narration.py <script> <parts> <audio/v2>` builds narration.wav + sentences.json and lists any sentence Whisper
  heard differently (narration_check.txt). Don't use narration.py on AI voice: its retake logic gets confused.
- Regenerate only the section that is wrong, never the whole track.
- Cut-outs of a car or a person (for graphics): `studio/cutout.swift` (macOS Vision, free) instead of Runway credits.
- (Mike's own recording, if ever used again: Rode NT-USB+, packaging off, a fist from the mouth, Voice Memos Lossless, `studio/narration.py` Voice H.)

## 4. Build (Claude)

- Text in a box is centred on the capital letters (cap height from font.getbbox("H")), never top-aligned with padding below; check every chip, row and label on the contact sheet before rendering (Mike 20 Oct: text sitting at the top of boxes, again).
- Something on screen moves at all times; no graphic stops with half the screen empty.
- **Fact cards** (`studio/factcard.py`) for people: the photo, plus two or three short facts landing while Mike talks, one marked DID YOU KNOW.
- **DID YOU KNOW panels** (`dyk=`) on ordinary photos.
- Numbers that pile up, stamps, counters and diagrams over a dimmed photo, never plain navy.
- All zooms move by sub-pixel amounts (no shaking).
- `studio/contact_sheets.py <build> <dir>`: every scene at three points, checked before rendering.
- Cars in graphics are the real car (a side-on ChatGPT still cut out), never a drawn shape (Minis 10-18: drawn cars "look cheap"). Comparisons use real lengths.
- Anything that moves (cut-outs, zooms) moves by sub-pixel transforms, never resize + integer paste (it shakes).
- Labels in boxes are centred on the text as drawn, both ways; check long labels fit inside their panel.
- Don't cut from an AI clip to the still it was made from; let the clip run (slower) over both lines.
- Period cars on screen are the competition version when the story is the rally (a road car only when the narration says "production car").

## 5. Review (Mike)
- Notes with times. Claude maps each time to the scene and the raw recording before changing anything, fixes all of them, re-checks, re-renders.

## 6. Release
- One video on one channel. Shorts cut from the finished video (end-slate question, captions), thumbnails A/B with Test & Compare, an upload pack with chapters, credits, tags and the AI disclosure, and Instagram/Facebook scheduled on the VPS at the same times as YouTube.
- Playlists (Mike 20 Oct): every long video goes in "<Channel> stories", every Short in "<Channel> in Shorts", and either one also goes in BANNED or IMPOSSIBLE when it's in that series. A video can be in several playlists. Every upload pack names the playlists to tick.

## Next improvements to try
- A short animated "previously / coming up" moment in the first 30 seconds of each chapter, so viewers who skip still get hooked.
- Sound design under key moments (crowd swell, a whistle, a camera shutter on photos), very low under the voice.
- Real 2005-era TV graphics style for scorelines in football stories.
- A recurring end-of-episode "what if" poll in the YouTube community tab, to feed comments.


## Pictures follow the narration (Mike, 21 Oct 2026)
- Before building, write the shot list line by line: the place when the place is named, the person when the person is named, the event when it's told, each car or team as it's listed.
- No photo twice in a Short. A Short about a corner shows cars in that corner, right to the last shot.
- If Commons has nothing that fits, make an AI still at once (real people and faces are fine) or ask Mike to find one.
- Search Commons categories ("Category:2005 United States Grand Prix"), not just keywords: the event categories hold the best matches.
- **Shot check before every render** (Mike 21 Oct, after a 0.7 s Pagoda flash on the Indy Short): `build.py check` writes sheets/checkN.jpg, one row per picture with its time in the video, how long it's up, the words said over it and the on-screen text. Read every row: the picture must show what's being said. Anything under 1.5 s is flagged red unless it's a deliberate list cut marked `V.quick(...)`. Fix the flags, then render. Send Mike the check sheet with the review copy.
- **Pinned comments need a reminder** (Mike 21 Oct): YouTube won't take a comment on a scheduled video until it's public, and until the API audit passes we can't post it ourselves. For every Short or long video Mike schedules, add a Google Calendar event 5 minutes after it goes live (pop-up at the start) with the exact comment text in the description, ready to copy.
- **Same place, same picture** (Mike 21 Oct, Leicester): when two AI images show the same room or moment (before and after), make the second from the first as a reference ("the exact same room and people, now..."), so the room, people and TV match. People watching something face it.
- **AI clips where the ending matters** (a ball into the net, a car over the line): give the clip a start frame AND an end frame (an AI still of the finished moment), so it can't end wrong. A start frame alone sent Hazard's curler away from goal, then over the bar.
- **Photos in graphics are part of the graphic** (Mike 21 Oct): cut a photo into the shape it belongs in (the globe's slice) rather than a square pasted on top.
- **Small graphics lines need time**: anything written on a graphic stays up at least 2 s after it lands; if the line is short, start the next picture later rather than cut the text.
- **Award/fact boxes crop on the subject**: set the crop focus on the person (fx, fy) and check the frame; a central crop cut Mahrez out.
- **Great AI video for the big moments** (Mike 21 Oct: "we need really cool AI video... that shot to goal would have looked amazing"). We learn to get it right rather than avoid it:
  1. Start AND end frame, both AI stills of the real moment (the ball leaving the boot, the ball in the top corner).
  2. Describe the path in plain geometry and the camera: "the ball travels right, BETWEEN the two posts and UNDER the crossbar, into the top corner; camera still".
  3. Draft cheap first (seedance-2.5 draft 480p, or a 720p model), check it, then make the final at 1080p on a strong model only once the draft is right.
  4. `studio/clip_check.py` at 10 fps through the moment, read every frame, before it goes in the edit.
  5. Log every attempt (model, prompt, frames, cost, what went wrong) in docs/ai_clip_library.md, so the next one starts from what worked.
  Two stills (before, after) are the fallback while a clip isn't right yet, never the rule.
  Approved template for goals (Mike 21 Oct, "that's the release"): camera behind the shooter, goal centred with space round it (docs/ai_clip_library.md).
- **Check every AI clip at 10 frames a second through the moment that matters**: `studio/clip_check.py <clip> t0 t1 --crop ...` writes <clip>_check.jpg. One frame a second missed a ball passing outside the post. No clip goes to Mike without its check sheet read.
- **Football goals from the side**: anything beyond the near post is the side-netting outside the goal. The ball has to stay between the posts and under the bar.

## AI graphics: the next level (Mike, 22 Oct 2026)
- **Structure is drawn, surface is AI.** Anything that must be right (a pitch diagram, a cutaway, a score timeline) is drawn by us; AI supplies the world it sits in: period paper, a muddy 1950s pitch, a programme cover, a floodlit stadium, a wind-tunnel haze. The V12 test showed AI draws convincing but wrong engineering.
- Chapter title cards on AI period textures (newsprint, tickets, programmes); fact cards on AI period paper, not plain navy.
- Scoreboards and timing screens recreated in the era's style (AI background, our numbers).
- Backgrounds and textures are made free in the Artlist website and filed in the Library under `graphics/` so every video can reuse them.
- Long features run in chapters (title card + one-line hook + matching YouTube chapters), so a 14–20 minute film feels like episodes.

## AI video: what it is for (Mike, 22 Oct 2026)

AI video must follow the narration to the end and add to the story; a clip that looks wrong cheapens the film.
Tested 22 Oct on Matthews: 14 of 16 free atmosphere clips worked first time; both paid match-action clips failed (ball moved before the kick, scene morphed to reach the end frame).

- **Use AI video for the world around the story:** crowds, streets, weather, rooms, one person doing one simple thing.
- **Never for the key sporting moment** (a goal, a pass, a free-kick, an overtake): the models do not understand rules, cause and effect, or the ball.
- **Key moments instead:** real archive footage or photos where we can license them, our drawn animated explainer (exact), or an AI still of the moment with a slow move, crowd sound and narration.
- No paid video test without Mike's OK, and only for one simple motion.
