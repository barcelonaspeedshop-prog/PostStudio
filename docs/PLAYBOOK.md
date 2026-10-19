# PostStudio playbook: how a long video is made (banked 17 Oct 2026)

Brawn v2 and Istanbul v2 are the reference videos. Every long video follows this, and every review adds to it.

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
- AI stills for places, crowds, atmosphere and moments with no photo: ChatGPT (Mike) or Runway nano-banana (~20 credits). One image per prompt, 16:9, no text, no badges or sponsor logos, never a real person's face as the subject.
- **One AI video clip per long video, for the moment that decides the story** (~160 credits for 8 s at 1080p). Everything else is carried by photos, graphics and facts.
- Check every AI image at full size for logos (paint them out) and anything physically wrong (smoke blowing the wrong way, the save with the wrong hand).
- **Picture quality gate** (Mike 10-19: "if nothing works go automatically to AI"): `studio/media_check.py <build>` before every render.
  It flags anything blown up more than 1.5x and scores **clarity** (edge strength over grain at screen size; every photo Mike
  rejected on McLaren scored 22 or less, mostly grainy 1995 slide scans).
  - **POOR** (clarity < 11, or blown up): don't show it full screen. Use a better photo if one exists; otherwise make an AI still
    straight away (Runway still, ~20 credits, no waiting) and use that. Small but clean photos go on a fact card instead.
  - **CHECK** (clarity 11–22): Claude looks at it full size before the cut goes to Mike; replace it the same way if it looks soft or grainy.
  - Never show a drawn car or a drawn person where a real (or AI) picture can carry it.

## 3. Recording (Mike)
- Rode NT-USB+, packaging off, a fist from the mouth, the same spot every time (pickups too), Voice Memos set to Lossless.
- Say "stop" after a fluff and restart the sentence.
- Pickups: one file, then Claude splices it into the main take where the old lines were (never just appended).

## 4. Narration edit (Claude)
- `studio/narration.py` (Voice H: light room clean-up + warm EQ).
- Transcribe the finished track line by line against the script, and listen to the raw take around anything flagged: stops, coughs, breaths and dropped words are fixed in `audio/v2/manual_cuts.json`.

## 5. Build (Claude)
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

## 6. Review (Mike)
- Notes with times. Claude maps each time to the scene and the raw recording before changing anything, fixes all of them, re-checks, re-renders.

## 7. Release
- One video on one channel. Shorts cut from the finished video (end-slate question, captions), thumbnails A/B with Test & Compare, an upload pack with chapters, credits, tags and the AI disclosure, and Instagram/Facebook scheduled on the VPS at the same times as YouTube.

## Next improvements to try
- A short animated "previously / coming up" moment in the first 30 seconds of each chapter, so viewers who skip still get hooked.
- Sound design under key moments (crowd swell, a whistle, a camera shutter on photos), very low under the voice.
- Real 2005-era TV graphics style for scorelines in football stories.
- A recurring end-of-episode "what if" poll in the YouTube community tab, to feed comments.
