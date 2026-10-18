"""BANNED 05 v2: The Monte Carlo Minis, the detailed cut -> PostDrive/.../05 Monte Carlo Minis/video/BANNED 05 v2 - The Monte Carlo Minis.mp4

    ~/.venvs/poststudio/bin/python build_v2.py            # full render (+ review 720p)
    ~/.venvs/poststudio/bin/python build_v2.py 95 125     # preview slice (video seconds)

v2 (18 Oct): script_v2.md, narration audio/v2 (Rode, Voice H). Reuses the v1 graphics from build.py (result board, map,
telegram, gears, clock, skittles...) and adds the three explainers in explainers.py (how a Mini beat a V8, left-foot
braking, how the lights worked), fact cards and DID YOU KNOW panels. No memorial card (Mike 10-14).
"""
import os, sys
VDIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, VDIR); sys.path.insert(0, os.path.join(VDIR, "..", "..", "..", "studio"))
_argv = sys.argv; sys.argv = ["build"]
import build as V1                                   # the v1 graphics (it builds its own v1 timeline on import, unused)
sys.argv = _argv
import episode as E
E.init("/Volumes/PostDrive/Stories/BANNED series/05 Monte Carlo Minis/", narration="audio/v2/")
from episode import *
import explainers as X
from factcard import FactCard

FINAL = "BANNED 05 v2 - The Monte Carlo Minis.mp4"

# v1 graphics look up a few v1 lines: point them at the v2 wording
_sent = E.sent
ALIAS = {"The last night": "A final night in the mountains", "Others say": "Others say the best part"}
def sent2(snip): return _sent(ALIAS.get(snip, snip))
E.sent = sent2

class Explainer(Scene):
    """An explainers.py drawing as a scene (a frame function of local time)."""
    def __init__(self, start, fn, **kw): super().__init__(start, **kw); self.fn = fn
    def base(self, t): return self.fn(t)
def explainer(snip, maker, off=-0.15, **kw):
    t0 = S(snip, off); return Explainer(t0, maker(lambda k: S(k) - t0), **kw)

def T(v, sc):
    if isinstance(v, tuple): return at(v[0], sc) + v[1]
    return v
def FC(snip, path, name, role, facts=(), off=-0.15, start=None, **kw):
    """A fact card: the person, plus short facts landing one by one (True = DID YOU KNOW)."""
    full = C + path if os.path.exists(C + path) else (M + path if os.path.exists(M + path) else path)
    fs = [((lambda sc, v=f[0]: T(v, sc)),) + tuple(f[1:]) for f in facts]
    return FactCard(S(snip, off) if start is None else start, full, name, role, facts=fs, **kw)

def makinen_titles(d, L, t, sc):                    # v1's, without the dates
    tracked(d, (W / 2, 120), "TIMO MÄKINEN", cond(40, 8), rgba(GOLD, ramp(t, 0, 0.4)), 10, "center")
    cups = [("1000 LAKES", GOLD)] * 4 + [("RAC", V1.SILVER)] * 3
    for i, (lab, col) in enumerate(cups):
        k = 0.2 + i * 0.28; a = ramp(t, k, k + 0.1)
        if a <= 0: continue
        off, f = V1.drop(t, k, 0.35, 300); x = 260 + i * 233 + (60 if i >= 4 else 0)
        V1.trophy(d, x, 640 + off, 260, a, col, (t - k - 0.35) / 0.5 if t > k + 0.35 else -1)
    tracked(d, (260 + 1.5 * 233, 690), "FINLAND'S 1000 LAKES  ×4", cond(38, 8), rgba(GOLD, ramp(t, 1.3, 1.7)), 6, "center")
    tracked(d, (260 + 5 * 233 + 60, 690), "RAC  ×3 IN A ROW", cond(38, 8), rgba(V1.SILVER, ramp(t, 2.2, 2.6)), 6, "center")
    tracked(d, (W / 2, 860), "1965  ·  1966  ·  1967  ·  1969        1973  ·  1974  ·  1975", cond(36, 8), rgba(CREAM, ramp(t, 2.6, 3.0)), 6, "center")

def checklist(d, L, t, sc):
    """The scrutineers' list: engine and gearbox pass, then the lights get a question mark."""
    tracked(d, (W / 2, 140), "THE SCRUTINEERS' CHECKS", cond(38, 2), rgba(GOLD, ramp(t, 0, 0.4)), 8, "center")
    items = [("ENGINES", "The engines were legal."), ("GEARBOXES", "The gearboxes were legal."), ("SUSPENSION", "The engines were legal."), ("LIGHTS", "In the end, it came down")]
    for i, (lab, snip) in enumerate(items):
        k = at(snip, sc) + (0.5 if lab == "SUSPENSION" else 0.2); y = 290 + i * 160; a = ramp(t, 0.1 + i * 0.12, 0.4 + i * 0.12)
        d.rounded_rectangle((520, y, 1400, y + 120), 14, fill=rgba(NAVY_D, 0.9 * a), outline=rgba(GOLD if lab == "LIGHTS" else CREAM, a * 0.7), width=3)
        tracked(d, (580, y + 36), lab, cond(56, 8), rgba(CREAM, a), 8)
        m = ramp(t, k, k + 0.25)
        if m and lab != "LIGHTS":
            d.line([(1250, y + 62), (1285, y + 95), (1350, y + 25)], fill=rgba((80, 200, 120), m), width=14, joint="curve")
        if m and lab == "LIGHTS":
            text_top(d, (1300, y + 10), "?", pf(110, 900), rgba(RED, m), "center")

# ---------------------------------------------------------------- media
NIGHT, HAIR, SCRUT, POD = AI + "ai_turini_night.png", AI + "ai_turini_hairpin.png", AI + "ai_scrutineers.png", AI + "ai_lonely_podium.png"
FACTORY, GEARS, WAITING, LAMPS = AI + "ai_factory_line.png", AI + "ai_gearbox_bench.png", AI + "ai_crews_waiting.png", AI + "ai_minis_lamps_night.png"
LINEUP, MAK66, SNOW66 = M + "MonteCarlo_1966.jpg", M + "classic_and_sports_car_MAKINEN_MONTE_carlo_66_LAT_3.jpg", M + "rep00125.jpg"
ARNHEM, SMITH66, CORTINA, DS_GREY, DS_BLACK = V1.ARNHEM, V1.SMITH66, V1.CORTINA, V1.DS_GREY, V1.DS_BLACK
S4 = "1985_Lancia_Delta_S4_(ex-Toivonen),_front_left_-_Greenwich_2021.jpg"
dimmed = V1.dimmed

scenes = [
    opening(NIGHT, "The Monte Carlo Minis.", "EPISODE FIVE  ·  MONTE CARLO RALLY 1966", credit="AI illustration"),
    # cold open
    VS("January 1966.", "ai_hairpin_clip.mp4", off=0, chapter="MONTE CARLO RALLY  ·  JANUARY 1966",
       fallback=AS("January 1966.", "ai_turini_night.png", off=0, zoom=(1.0, 1.15))),
    FC("Three little red Minis", "MonteCarlo_1966.jpg", "The works Minis", "BMC  ·  MONTE CARLO RALLY 1966",
       facts=[(1.0, "Mini Cooper S, red with white roofs"), (2.6, "Beating the best drivers in Europe")]),
    CuS("First, second and third", V1.podium_board, bg=dimmed(MAK66)),
    CuS("It's the third year running", V1.three_running, bg=dimmed(NIGHT)),
    VS("Then the officials take", "ai_scrutineers_clip.mp4"),
    Custom(S("And when they're done", -0.15), V1.board_dq(lambda sc: at("Over their light bulbs", sc) + 0.4, lambda sc: atf("And when they're done", 0.45, sc)), bg=dimmed(SCRUT)),
    PS("This is the story of the Monte", "Monte_Carlo_Minis_(51381400422).jpg", zoom=(1.0, 1.12),
       texts=[(0.3, "The Monte Carlo Minis.", "big"), (S("The cars that won") - S("This is the story of the Monte", -0.15), "They won. They went home with nothing.", "mid+")]),
    # I. the rally
    AS("The Monte Carlo Rally was the most", "monaco_finish.png", zoom=(1.0, 1.12), chapter=CH("I", "THE RALLY"),
       dyk=(1.8, "It was first run in 1911, to bring winter visitors to Monaco")),
    PS("Crews set off", ARNHEM, zoom=(1.0, 1.1), strap=("Arnhem, the Netherlands", "A WORKS MINI AT A CONTROL  ·  JANUARY 1966", 0.4)),
    Custom(SF("Crews set off", 0.45), V1.europe_map),
    AS("A final night in the mountains", "ai_turini_night.png", zoom=(1.0, 1.15), focus=((0.45, 0.5), (0.6, 0.55))),
    PS("The most famous pass", "Col_de_Turini_06PF.jpg", zoom=(1.0, 1.1), strap=("Col de Turini", "THE PASS TODAY", 0.2),
       dyk=(1.0, "The Turini is still often a stage of the Monte today")),
    # II. the giant killer
    PS("In 1964, a Northern", "1963_Morris_Mini_Cooper_S_1964_Monte_Carlo_Rally_winner.jpg", zoom=(1.0, 1.1), chapter=CH("II", "THE GIANT KILLER"),
       strap=("33 EJB", "THE 1964 WINNER  ·  TODAY", 0.4)),
    FC("In 1964, a Northern", "paddy-hopkirk-1964.jpg", "Paddy Hopkirk", "NORTHERN IRELAND  ·  1964 WINNER", start=SF("In 1964, a Northern", 0.45),
       facts=[(0.6, "Car number 37: 33 EJB"), (2.0, "His co-driver was Henry Liddon", True)]),
    CuS("The Mini was a tiny", V1.size_card),
    CuS("Hopkirk came home", V1.telegram, bg=dimmed(M + "P90141926_highRes.jpg")),
    FC("In 1965, a Finn", "Timo-Makinen-1966.jpg", "Timo Mäkinen", "FINLAND  ·  1965 WINNER", focus=(0.6, 0.35),
       facts=[(1.2, "Won it in a blizzard"), (3.0, "Co-driver: Paul Easter")]),
    PF("In 1965, a Finn", 0.7, "1964_Morris_Mini-Cooper_Monte_Carlo_(AJB_44B)_Heritage_Motor_Centre,_Gaydon.jpg", zoom=(1.0, 1.1),
       strap=("The 1965 winner", "MINI COOPER S  ·  AJB 44B  ·  TODAY", 0.3)),
    CuS("More than two hundred", V1.survivors, bg=dimmed(NIGHT, 0.85)),
    # III. how a Mini beat a V8 (one continuous explainer, then left-foot braking)
    explainer("So how does a car that small", X.mini_v8_scene, chapter=CH("III", "HOW A MINI BEAT A V8")),
    explainer("And the Finns had a trick", X.left_foot_scene),
    FC("Rauno Aaltonen is usually credited", "Rauno-Aaltonen-1967.jpg", "Rauno Aaltonen", "FINLAND  ·  'THE RALLY PROFESSOR'", focus=(0.6, 0.35),
       facts=[(0.8, "European Rally Champion, 1965"), (("Today, almost every rally driver", 0.2), "Almost every rally driver brakes with the left foot today", True)]),
    # IV. the new rules
    PS("For 1966, the rules changed", "classic_and_sports_car_MAKINEN_MONTE_carlo_66_LAT_3.jpg", zoom=(1.0, 1.1), chapter=CH("IV", "THE NEW RULES"), texts=[(0.4, "1966: new rules.", "big")]),
    CuS("Cars that had been modified", V1.handicap, bg=dimmed(SNOW66, 0.82)),
    PS("The way to win", "Mini_Cooper_S_1964_(AJB_44B)_-_2016.jpg", zoom=(1.0, 1.1), texts=[(0.4, "The way to win: a standard car.", "mid")]),
    CuS("One that had been built", V1.five_thousand, bg=dimmed(FACTORY, 0.8)),
    AS("So BMC built and sold", "ai_factory_line.png", zoom=(1.0, 1.15), focus=((0.5, 0.5), (0.7, 0.45)),
       texts=[(0.6, "5,000 Cooper S, built and sold.", "mid")]),
    CuS("But there was a catch", V1.small_print),
    PS("On a standard car", "Monte_Carlo_Minis_(51382901609).jpg", zoom=(1.0, 1.15), texts=[(0.5, "The lights had to be standard too.", "mid")]),
    # V. the run
    PS("The works team sent", "Monte_Carlo_Minis_(51381403052).jpg", zoom=(1.0, 1.1), chapter=CH("V", "THE RUN"), strap=("Red, with white roofs", "THE BMC WORKS MINIS  ·  TODAY", 0.6)),
    FC("Mäkinen, Hopkirk, and another", "Aaltonen,_Mäkinen_and_Hopkirk_-_1965_Rally_Finland.jpg", "Aaltonen · Mäkinen · Hopkirk", "BMC WORKS DRIVERS  ·  FINLAND 1965",
       facts=[(0.8, "With their co-drivers"), (2.2, "Two Finns, and a driver from Belfast", True)]),
    AS("On the final night in the mountains", "ai_turini_hairpin.png", zoom=(1.0, 1.15), focus=((0.45, 0.55), (0.6, 0.5))),
    CuS("Mäkinen won.", V1.classification, bg=dimmed(NIGHT)),
    PS("Roger Clark's", CORTINA, zoom=(1.0, 1.1), strap=("Ford Lotus Cortina", "ROGER CLARK  ·  4TH ON THE ROAD", 0.4)),
    PS("The Citroën of Pauli", DS_GREY, zoom=(1.0, 1.1), crop=(0, 0, 1, 0.86), strap=("Citroën DS21", "PAULI TOIVONEN  ·  ONLY 5TH", 0.5)),
    AS("The crews celebrated in Monaco", "monaco_finish.png", zoom=(1.12, 1.25), focus=((0.4, 0.6), (0.45, 0.65)),
       texts=[(0.4, "A hat-trick.", "big"), (S("A hat-trick of wins") - S("The crews celebrated in Monaco", -0.15) + 0.6, "1st, 2nd, 3rd.", "mid+")]),
    # VI. the longest night
    VS("Then the scrutineers moved in", "ai_scrutineers_clip.mp4", chapter=CH("VI", "THE LONGEST NIGHT"),
       fallback=AS("Then the scrutineers moved in", "ai_scrutineers.png", zoom=(1.05, 1.2))),
    AS("The cars were taken into a garage", "ai_scrutineers.png", zoom=(1.05, 1.22), focus=((0.5, 0.5), (0.68, 0.45)), texts=[(1.6, "The doors were shut.", "mid")]),
    AS("They stripped the Minis down", "ai_gearbox_bench.png", zoom=(1.0, 1.18), focus=((0.4, 0.6), (0.35, 0.65)),
       texts=[(0.3, "Engines. Gearboxes. Suspension.", "mid")]),
    CuS("Hopkirk later said", V1.teeth, bg=dimmed(GEARS, 0.8)),
    AS("Outside, the crews waited", "ai_crews_waiting.png", zoom=(1.0, 1.15), focus=((0.6, 0.5), (0.7, 0.5)), texts=[(1.8, "Hour after hour.", "mid")]),
    CuS("Some accounts say the checks", V1.long_night, bg=dimmed(WAITING, 0.82)),
    CuS("The engines were legal", checklist, bg=dimmed(SCRUT, 0.84)),
    # VII. how the lights worked
    explainer("A normal headlight bulb", X.headlights_scene, chapter=CH("VII", "HOW THE LIGHTS WORKED")),
    PS("BMC said the same bulbs", "1963_Morris_Mini_Cooper_S_1964_Monte_Carlo_Rally_winner.jpg", zoom=(1.0, 1.12),
       texts=[(0.4, "Two years on the Monte.", "mid"), (3.2, "Not a word.", "big+")],
       dyk=(1.4, "This is 33 EJB, the car that won the 1964 Monte")),
    CuS("It was said the British", V1.final_rule, bg=dimmed(LINEUP, 0.85)),
    # VIII. thrown out
    Custom(S("Then the result came out", -0.15), V1.board_dq(lambda sc: atf("All three Minis were", 0.65, sc), lambda sc: at("All three Minis were", sc), "THE RESULT"),
           bg=dimmed(LINEUP), chapter=CH("VIII", "THROWN OUT")),
    PS("Clark's Cortina was out", CORTINA, zoom=(1.15, 1.3), focus=((0.5, 0.6), (0.5, 0.55)), texts=[(0.3, "Clark's Lotus Cortina: out.", "mid")]),
    FC("So was Rosemary Smith", SMITH66, "Rosemary Smith", "HILLMAN IMP  ·  LADIES' PRIZE  ·  OUT", focus=(0.5, 0.35),
       facts=[(0.8, "Monte Carlo, January 1966"), (2.4, "In 1965 she won the Tulip Rally outright, in an Imp", True)]),
    Custom(SF("In all, ten cars", 0.1), V1.skittles, bg=dimmed(SNOW66, 0.86)),
    # IX. the winner nobody wanted
    CuS("The new winner was", V1.reshuffle, bg=dimmed(POD), chapter=CH("IX", "THE WINNER NOBODY WANTED")),
    PS("His Citroën reportedly", DS_BLACK, zoom=(1.05, 1.25), focus=((0.4, 0.6), (0.3, 0.68)), texts=[(0.5, "Iodine lamps too?", "mid")]),
    PS("But on some DS models", DS_GREY, zoom=(1.1, 1.3), crop=(0, 0, 1, 0.86), focus=((0.5, 0.6), (0.62, 0.7)),
       texts=[(0.8, "Fitted at the factory: allowed.", "mid")]),
    FC("Toivonen was said to be", "Pauli_Toivonen_(1969)_(cropped).jpg", "Pauli Toivonen", "FINLAND  ·  THE NEW WINNER",
       facts=[(0.8, "Citroën DS21"), (2.2, "Co-driver: Ensio Mikander")]),
    VS("In the newsreels", "ai_podium_clip.mp4", fallback=AS("In the newsreels", "ai_lonely_podium.png", zoom=(1.0, 1.12))),
    CuS("Monaco's Prince Rainier", V1.rainier, bg=dimmed(POD, 0.82)),
    # X. the backfire
    PS("The organisers had their result", "Monte_Carlo_Minis_(51381402362).jpg", zoom=(1.0, 1.15), focus=((0.5, 0.5), (0.45, 0.6)), chapter=CH("X", "THE BACKFIRE"),
       texts=[(0.4, "They had their result.", "mid"), (S("But they lost the argument") - S("The organisers had their result", -0.15), "They lost the argument.", "big+")]),
    CuS("Back in Britain", V1.fiasco, bg=dimmed(LINEUP, 0.82)),
    VS("The disqualified Minis reportedly", "ai_palladium_clip.mp4", strap=("The London Palladium", "REPORTEDLY  ·  LIVE ON TELEVISION", 2.0),
       fallback=AS("The disqualified Minis reportedly", "ai_palladium_stage.png", zoom=(1.0, 1.12))),
    CuS("Hopkirk said the row", V1.publicity),
    PS("BMC appealed.", "Monte_Carlo_Minis_(51381400422).jpg", zoom=(1.2, 1.35), focus=((0.6, 0.5), (0.7, 0.5))),
    CuS("In October 1966", V1.appeal, bg=dimmed(LINEUP, 0.84)),
    FC("A year later, in 1967", "Aaaltonen_1967.jpg", "Rauno Aaltonen", "MONTE CARLO RALLY WINNER  ·  1967",
       facts=[(0.8, "Monte Carlo Rally, 1967"), (2.4, "Co-driver: Henry Liddon, Hopkirk's 1964 partner", True)]),
    PS("In a Mini.", "Mini_Cooper_S_1966.jpg", zoom=(1.0, 1.12), texts=[(0.2, "In a Mini.", "big")], strap=("LBL 6D", "THE 1967 WINNER  ·  TODAY", 0.3)),
    # XI. what happened next
    FC("Timo Mäkinen won Finland", "Timo_Mäkinen_(1966)_(cropped).jpg", "Timo Mäkinen", "THE FLYING FINN", chapter=CH("XI", "WHAT HAPPENED NEXT"),
       facts=[(0.8, "1000 Lakes Rally: 4 wins"), (3.4, "RAC Rally: 3 in a row")]),
    Custom(SF("Timo Mäkinen won Finland", 0.55), makinen_titles, bg=dimmed(MAK66, 0.84)),
    FC("Paddy Hopkirk was made", "Paddy_Hopkirk.jpg", "Paddy Hopkirk", "MBE  ·  2016",
       facts=[(0.8, "Made an MBE in 2016"), (2.2, "33 EJB is now in the British Motor Museum", True)]),
    FC("Rauno Aaltonen, the man", "Rauno_Aaltonen_Race_Retro_2025.jpg", "Rauno Aaltonen", "THE RALLY PROFESSOR", focus=(0.5, 0.35),
       facts=[(1.0, "Rallying into the 1980s"), (3.2, "Still a guest at classic events in 2025", True)]),
    FC("Pauli Toivonen became", "1968_Rallye_Sanremo_-_Toivonen-Tiukkanen's_Porsche_911_T.jpg", "Pauli Toivonen", "EUROPEAN RALLY CHAMPION  ·  1968",
       facts=[(0.8, "In a Porsche 911"), (2.8, "Sanremo Rally, 1968")]),
    FC("Twenty years after", "Pauli-Toivonen-1963.jpg", "The Toivonens", "1963",
       facts=[(0.8, "Pauli with his family"), (2.6, "His son Henri won the Monte in 1986", True)]),
    PS("Pauli reportedly said", S4, zoom=(1.0, 1.1), strap=("Henri Toivonen's Lancia", "MONTE CARLO RALLY WINNER  ·  1986", 0.2),
       texts=[(0.6, "The family name, cleared.", "mid")]),
    PS("And the Mini?", "Mini_Cooper_33_EJB_(6720779419).jpg", zoom=(1.0, 1.15), focus=((0.5, 0.5), (0.5, 0.45))),
    CuS("More than five million", V1.five_million),
    # XII. what if
    PS("So here's the question", "Monte_Carlo_Minis_(51381403052).jpg", zoom=(1.1, 1.25), chapter=CH("XII", "WHAT IF"),
       texts=[(S("Was it a fair rule") - S("So here's the question", -0.15), "A fair rule, applied to the letter?", "mid")]),
    AS("Or did the organisers", "ai_lonely_podium.png", zoom=(1.0, 1.15), texts=[(0.4, "Or a way to hand it to a French car?", "mid")]),
    CuS("Tell me what you think", what_if("A fair rule?", "Tell me what you think", "Or a French win?", "Tell me what you think"), bg=dimmed(NIGHT, 0.84)),
    CuS("This was Banned", banned_end("The Monte Carlo Minis.")),
]

if __name__ == "__main__":
    main(scenes, FINAL)
