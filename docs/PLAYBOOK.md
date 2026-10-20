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

## Next improvements to try
- A short animated "previously / coming up" moment in the first 30 seconds of each chapter, so viewers who skip still get hooked.
- Sound design under key moments (crowd swell, a whistle, a camera shutter on photos), very low under the voice.
- Real 2005-era TV graphics style for scorelines in football stories.
- A recurring end-of-episode "what if" poll in the YouTube community tab, to feed comments.
