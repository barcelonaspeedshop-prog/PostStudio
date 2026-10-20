# Chrysler Turbine Car: AI video clips (proposal, waiting for Mike's OK)

These are made from the **new v3 stills** once they're in. Each clip is image-to-video from its still, 5 seconds long, with a slow camera move. Nothing else changes in the edit: each clip replaces its still in the same place.

| # | Still | Where it plays | What moves | Length |
|---|---|---|---|---|
| 1 | `ai_turbine_gas_station.png` | "Some drivers said they couldn't fill up without a crowd…" (about 4:00) | The attendant holds the nozzle, people lean in and turn to each other, heat shimmer from the jet-exhaust lights, slow push-in | 5 s |
| 2 | `ai_turbine_driveway.png` | "Neighbours came out to stare." (about 3:55) | The neighbours walk up, a child points, the family steps back to look, slow push-in | 5 s |
| 3 | `ai_turbine_row.png` | "The families gave the cars back." (about 5:02) | Slow sideways dolly along the row, light snow starting to fall, grey winter light | 5 s |
| 4 (optional) | `ai_turbine_jet_age.png` | The opening, under the Gentlemen of Fuel title | The airliner rolls slowly behind, the sun flares, the car stays still | 5 s |

**Cost (we have 1,442 credits):**
- **Test first:** clip 3 on the cheaper model, about 25 credits (720p, about 5 credits a second). If the car keeps its shape (round rear lights, turbine wheels), use that model for the rest.
- **If the cheap model blurs the car:** use the better model, about 60 credits a clip (1080p, 12 credits a second).
- **Totals:**
  - clips 1–3: about 75 credits (cheap model) or 180 (better model), plus one retry each at most;
  - with clip 4: about 100 or 240.

**Prompt rules** (lessons from Brawn): the camera move only, the car stays exactly as it is, people move naturally, clear air indoors. Each clip shows what the narration is saying. No filler.
