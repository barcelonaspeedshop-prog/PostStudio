# Narration voices (Mike, 20 Oct 2026)

## 22 Oct: ONE voice per content type (Artlist, replaces everything below)

Runway voices (Kirk, Malachi, Tom and the rest) are retired; we now voice on Artlist. One voice per content type, so every channel sounds consistent. Long video and its Shorts use the same voice.

| Content type | Voice (Artlist) |
|---|---|
| F1 tech explainers | Keen |
| F1 classic / history | Shadow |
| F1 modern / race news | Vision |
| GoF classic | Gravity |
| GoF modern | Keen |
| GoF tech | Keen |
| Football stories / tech | Mentor, Northern (see settings below) |
| Football history | Boss, London (see settings below) |

Settings for F1 and GoF: model **ElevenLabs Multilingual v2**, accent **British**, stability **0.6**, effect none. About 57 credits per 18-second read.

Settings for Football (the accent comes from a tag at the very start of the text):
- **Mentor:** model **Eleven v4**, accent British, stability **0.5**, text starts `[Northern English accent]`.
- **Boss:** model **Eleven v4**, accent British, stability **0.5**, text starts `[London accent]`.
- These models have drifted before, so Mike listens to every football read; a read that loses the accent is re-voiced. Test reads: PostDrive › voice_tests › artlist_2026-10-22. Before any full read, make a 10-second test on the real script.

---

*Older Runway notes, kept for history:*

**21 Oct: Bernard dropped ("sounds very AI").**

**21 Oct: the model changes the voice.** All the chosen samples were made on the default model (eleven_v3). On eleven_multilingual_v2 Malachi turns into an over-the-top action voice (Mike). Use the model the sample was made on unless that voice is known to drift (Kirk drifted American on v3 → Kirk on multilingual_v2). Before any full read, make a 10-second test and compare it with the sample.

| Voice | Model (Mike, 21 Oct) |
|---|---|
| Malachi | eleven_v3 (the sample model; multilingual_v2 makes him over the top) |
| Tom | eleven_multilingual_v2 (Surtees Short: "sounds fine") |
| Kirk | eleven_multilingual_v2 (v3 drifted American) |
| Others | eleven_v3 until tested |

The only voices we use for now. UK / US is Mike's ear, not Runway's labels (Runway calls Bernard and Malachi American). **Omnira F1 and Omnira Football use UK voices only.** GoF can use either, matched to the story (US story → US voice, British/European classic → UK voice).

| Voice | Accent | Best for |
|---|---|---|
| Kirk | UK | Good all round; works on anything |
| Malachi | UK | Upbeat but not too much; sport |
| Tom | UK | Very posh; classics (Bentley and the like) |
| Fish Adrian | US | Good for almost anything |
| Fish Jordan | US | Good for almost anything |
| Benjamin | US | Racing, energetic |
| Chad | US | Upbeat news, racing |
| Clint | US | Explaining and tech |
| Elias | US | Storytelling; a bit much, use for big American stories |
| Noah | US | Very relaxed; calm stories |

**Runway names** for generate_speech: Kirk, Malachi, Tom, Benjamin, Chad, Clint, Elias, Noah (**model eleven_multilingual_v2, languageCode en**: the steadier model holds the accent; eleven_v3 drifted American on the Como script with both Malachi and Kirk, Mike 20 Oct); Adrian and Jordan (model fish-drama-3, about a fifth of the cost).

## Picking a voice for each video (Claude proposes, Mike approves with the script)

- **Omnira F1:** modern F1, tech explainers (superclipping, diffusers), topical and race-weekend Shorts → Malachi; classic F1 and history stories (Surtees, Ascari) → Tom. Not Kirk: he suits football better (Mike 21 Oct).
- **Omnira Football:** big stories (Istanbul, Leicester, Matthews) → Kirk; stats, quizzes, Ballon d'Or and news Shorts → Malachi; tactics explainers → Malachi.
- **Gentlemen of Fuel:** British and European classics → Tom; American stories → Elias for the long video, Benjamin or Chad for its racing and news Shorts; modern car culture and JDM → Fish Adrian or Fish Jordan; engineering explainers → Clint; calm, reflective stories → Noah.
- A long video and its Shorts use the same voice, so the teaser sounds like the episode.
- **Accents can drift between reads** (20 Oct: Malachi came out American on the Como Short, British on Bayern). Mike listens to every read; a wrong accent is re-voiced, not kept. For football stories, Kirk first.
- Samples: PostDrive › Stories › Gentlemen of Fuel › 01 Chrysler Turbine › audio › voice_tests › chosen voices.
