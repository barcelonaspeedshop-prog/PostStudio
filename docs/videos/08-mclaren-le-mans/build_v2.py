"""IMPOSSIBLE 03 v2: McLaren F1 at Le Mans, the detailed cut -> PostDrive/.../03 McLaren Le Mans/video/IMPOSSIBLE 03 v2 - McLaren F1.mp4

    ~/.venvs/poststudio/bin/python build_v2.py            # full render (+ review 720p)
    ~/.venvs/poststudio/bin/python build_v2.py 95 125     # preview slice (video seconds)

v2 (19 Oct): script_v2.md (with Mike's edits), narration audio/v2. Reuses the v1 graphics from build.py and adds the
two explainers in explainers.py (how the F1 was built; aquaplaning), fact cards and DID YOU KNOW panels.
Dropped from v1: "three quarters of a lap", "five minutes" and Murray's "harder than an F1 title" (not confirmed).
"""
import os, sys
VDIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, VDIR); sys.path.insert(0, os.path.join(VDIR, "..", "..", "..", "studio"))
_argv = sys.argv; sys.argv = ["build"]
import build as V1                                   # the v1 graphics (builds its own v1 timeline on import, unused)
sys.argv = _argv
import episode as E
E.init("/Volumes/PostDrive/Stories/IMPOSSIBLE series/03 McLaren Le Mans/", series="impossible", narration="audio/v2/")
from episode import *
import explainers as X
from factcard import FactCard

FINAL = "IMPOSSIBLE 03 v2 - McLaren F1.mp4"
_sent = E.sent
ALIAS = {"And it was up against": "And it's up against", "Not even in testing": "Nobody knew whether"}
E.sent = lambda snip: _sent(ALIAS.get(snip, snip))

class Explainer(Scene):
    def __init__(self, start, fn, **kw): super().__init__(start, **kw); self.fn = fn
    def base(self, t): return self.fn(t)
def explainer(snip, maker, off=-0.15, **kw):
    t0 = S(snip, off); return Explainer(t0, maker(lambda k: S(k) - t0), **kw)

def T(v, sc): return at(v[0], sc) + v[1] if isinstance(v, tuple) else v
def FC(snip, path, name, role, facts=(), off=-0.15, start=None, **kw):
    full = C + path if os.path.exists(C + path) else (M + path if os.path.exists(M + path) else path)
    fs = [((lambda sc, v=f[0]: T(v, sc)),) + tuple(f[1:]) for f in facts]
    return FactCard(S(snip, off) if start is None else start, full, name, role, facts=fs, **kw)

def AF(snip, frac, ai, **kw):
    p = AS(snip, ai, **kw); p.start = SF(snip, frac); return p
CP, bgp, bga = V1.CP, V1.bgp, V1.bga
def split(title, left, right, sub=None):
    """Two real photos side by side (no drawn cars, Mike 10-18), each with a label; slides in, keeps moving."""
    def draw(d, L, t, sc):
        a = ramp(t, 0, 0.4)
        tracked(d, (W / 2, 90), title, cond(42, 8), rgba(GOLD, a), 10, "center")
        for i, (f, lab, col) in enumerate((left, right)):
            src = load(C + f); w, h = src.size; ww, wh = 860, 640; ar = ww / wh
            bw, bh = (h * ar, h) if w / h > ar else (w, w / ar); z = 1 + 0.08 * min(1, t / 6); bw, bh = bw / z, bh / z
            pic = src.transform((ww, wh), Image.EXTENT, ((w - bw) / 2, (h - bh) / 2, (w + bw) / 2, (h + bh) / 2), Image.BICUBIC)
            k = ramp(t, 0.1 + 0.25 * i, 0.6 + 0.25 * i); x = 80 + i * 900 + (1 if i else -1) * 200 * (1 - ease(k)); y = 200
            if k <= 0: continue
            ph = pic.convert("RGBA"); ph.putalpha(int(255 * k)); L.alpha_composite(ph, (int(x), y))
            d.rectangle((x, y + wh, x + ww, y + wh + 90), fill=rgba(NAVY_D, 0.92 * k))
            tracked(d, (x + ww / 2, y + wh + 26), lab, cond(42, 8), rgba(col, k), 8, "center")
        if sub: tracked(d, (W / 2, 1000), sub[0], cond(36, 8), rgba(CREAM, ramp(t, T(sub[1], sc), T(sub[1], sc) + 0.4)), 8, "center")
    return draw

GRID = AI + "ai_grid_1995.png"

scenes = [
    opening(GRID, "McLaren F1.", "EPISODE THREE  ·  THE ROAD CAR THAT WON LE MANS", credit="AI illustration", focus=((0.5, 0.5), (0.42, 0.45))),
    # cold open
    AS("June 1995.", "ai_grid_1995.png", off=0, zoom=(1.12, 1.3), focus=((0.42, 0.45), (0.42, 0.42)), chapter="LE MANS  ·  JUNE 1995"),
    CP("A road car lines up", "f1_road_silver.jpg", zoom=(1.0, 1.1), texts=[(0.4, "A road car.", "big")]),
    CP("Its designer never wanted", "f1_road_open.jpg", zoom=(1.0, 1.1), texts=[(0.3, "Never meant to race.", "mid"),
                                                                               (S("It has never run") - S("Its designer never wanted", -0.15), "Never run for 24 hours.", "mid+")]),
    CuS("And it's up against", split("LE MANS 1995", ("no59_ford_b.jpg", "A ROAD CAR", CREAM), ("courage_c34.jpg", "PROTOTYPES  ·  BUILT TO WIN", GOLD)), off=-0.4, bg=bgp("courage_c34.jpg", 0.86)),
    VS("Twenty-four hours later", "ai_finish_clip.mp4", texts=[(S("At the first attempt.") - S("Twenty-four hours later", -0.15), "At the first attempt.", "big")]),
    CP("This is the story of the McLaren F1", "no59_ford_b.jpg", zoom=(1.0, 1.12), strap=("McLaren F1 GTR  ·  No. 59", "LE MANS  ·  1995", 0.5)),
    # I. the idea
    FC("In 1988, Gordon Murray", "gordon_murray_lemans_1996.jpg", "Gordon Murray", "DESIGNER  ·  McLAREN", chapter=CH("I", "THE IDEA"), focus=(0.4, 0.35),
       facts=[(1.0, "1988: McLaren won 15 of 16 races"), (("On the way home", 0.4), "Born in South Africa, he built his own racing car there", True)]),
    AS("On the way home", "ai_sketch_1988.png", zoom=(1.0, 1.2), focus=((0.6, 0.6), (0.72, 0.72)),
       texts=[(S("A car with three seats") - S("On the way home", -0.15), "Three seats. The driver in the middle.", "mid")]),
    CP("He wanted it to be the greatest", "f1_road_silver_doors.jpg", zoom=(1.0, 1.12),
       texts=[(S("No compromise.") - S("He wanted it to be the greatest", -0.15), "No compromise.", "big"),
              (S("Light, fast, and easy") - S("He wanted it to be the greatest", -0.15), "Light. Fast. Easy to drive.", "mid+")]),
    # II. how the F1 was built (one continuous explainer)
    explainer("So what made the McLaren F1", X.f1_build_scene, chapter=CH("II", "HOW THE F1 WAS BUILT")),
    CP("And Murray was clear", "f1_motorshow_1994.jpg", zoom=(1.0, 1.12), strap=("McLaren F1", "MOTOR SHOW  ·  1994", 0.4),
       texts=[(S("It was a road car.") - S("And Murray was clear", -0.15), "A road car.", "big"), (S("It was not going racing") - S("And Murray was clear", -0.15), "Not a racing car.", "mid+")]),
    # III. the customers
    CP("But the people who bought", "f1_road_silver.jpg", zoom=(1.1, 1.25), chapter=CH("III", "THE CUSTOMERS"),
       texts=[(S("Some of them wanted") - S("But the people who bought", -0.15), "Some of them wanted to race.", "mid")]),
    CuS("And they told McLaren", V1.letter, bg=bgp("f1_road_silver.jpg", 0.82)),
    CP("So McLaren gave in", "gtr_24_lemans95.jpg", zoom=(1.0, 1.1), strap=("McLaren F1 GTR", "THE RACING VERSION", S("The F1 GTR.") - S("So McLaren gave in", -0.15))),
    CP("In 1995, it won race after race", "gtr_49_lemans95.jpg", zoom=(1.05, 1.15), texts=[(0.5, "1995: race after race.", "mid")],
       dyk=(1.4, "The GTR kept the road car's central driving seat")),
    CP("But Le Mans?", "circuit_corner.jpg", zoom=(1.0, 1.12), texts=[(0.3, "But Le Mans?", "big")]),
    # IV. the mountain
    CuS("Le Mans is twenty-four hours", V1.lemans_map, chapter=CH("IV", "THE MOUNTAIN"), bg=bgp("circuit_corner.jpg", 0.85)),
    CP("The fastest cars there", "courage_c34.jpg", zoom=(1.0, 1.12), strap=("Courage C34", "PROTOTYPE  ·  LE MANS 1995", 0.4)),
    CP("Purpose-built racing machines", "courage_c34_pan.jpg", zoom=(1.0, 1.1), texts=[(0.6, "Lower. Lighter.", "big")]),
    CuS("The McLarens had never run", V1.never_24, bg=bgp("gtr_pits_lemans95.jpg")),
    CP("One of them, number", "no59_ford_a.jpg", zoom=(1.0, 1.14), strap=("No. 59", "THE ORIGINAL TEST CAR", S("The original test car") - S("One of them, number", -0.15))),
    CP("Painted grey", "no59_leads_42.jpg", zoom=(1.0, 1.12), focus=((0.4, 0.6), (0.4, 0.6)), strap=("Kokusai Kaihatsu Racing", "A SMALL, JAPANESE-BACKED PRIVATE TEAM", 0.6),
       dyk=(1.6, "Lanzante, a small British firm, ran the car")),
    CuS("Its drivers were", V1.drivers, bg=bgp("no59_ford_b.jpg", 0.82)),
    CuS("On Saturday afternoon", V1.start_clock, bg=bga("ai_grid_1995.png", 0.8)),
    PF("The little prototypes", 0.3, "wr_lm94.jpg", zoom=(1.0, 1.12), strap=("WR", "PROTOTYPE  ·  FRONT ROW", 0.4)),
    CP("The McLarens were down", "no51_pit_straight.jpg", zoom=(1.0, 1.1), texts=[(0.3, "The McLarens: in the pack.", "mid")]),
    # V. the rain
    CP("Then, at the end of the first hour", "no59_dunlop_rain.jpg", zoom=(1.0, 1.14), chapter=CH("V", "THE RAIN"), strap=("The rain", "LE MANS 1995  ·  THE DUNLOP BRIDGE", 1.2)),
    CuS("For around sixteen hours", V1.rain_clock, bg=bga("ai_rain_night.png", 0.82)),
    AS("In the dark, at close", "ai_rain_night.png", zoom=(1.0, 1.15), focus=((0.5, 0.5), (0.35, 0.55))),
    explainer("Here's why that changed", X.aqua_scene),
    CuS("The prototypes were light", V1.order_tower, bg=bga("ai_pit_night.png", 0.84)),
    CP("The McLaren was a heavier car", "no51_dusk_rain.jpg", zoom=(1.0, 1.15), texts=[(0.4, "Heavier. A roof. A windscreen.", "mid")]),
    VS("JJ Lehto was on another level", "ai_rain_night_clip.mp4", strap=("JJ Lehto", "No. 59  ·  THE NIGHT IN THE RAIN", 0.4)),
    AF("In the middle of the night", 0.32, "ai_rain_night.png", zoom=(1.15, 1.3), focus=((0.4, 0.5), (0.3, 0.55)),
       texts=[(0.3, "Up to 20 seconds a lap faster.", "big"), (2.0, "Reportedly.", "mid+")]),
    VS("But number fifty-nine still", "ai_pit_night_clip.mp4", texts=[(0.4, "No. 59: still not leading.", "mid")]),
    CP("Another McLaren led", "gtr_gulf.jpg", zoom=(1.0, 1.12), texts=[(SF("Another McLaren led", 0.55) - S("Another McLaren led", -0.15), "Early Sunday: clutch broken.", "mid")]),
    CP("Then the Harrods McLaren", "no51_pan.jpg", zoom=(1.0, 1.12), strap=("The Harrods McLaren", "No. 51", 0.5)),
    FC("Derek Bell, a five-time", "no51_dusk_rain.jpg", "The Harrods McLaren", "DEREK BELL  ·  JUSTIN BELL  ·  ANDY WALLACE",
       facts=[(0.6, "Derek Bell: five Le Mans wins"), (2.4, "Wallace later drove the F1 to 240 mph", True)]),
    # VI. the last hours
    AS("As the sun came up", "ai_dawn_sunday.png", zoom=(1.0, 1.15), focus=((0.5, 0.5), (0.7, 0.6)), chapter=CH("VI", "THE LAST HOURS")),
    CuS("Number fifty-nine was second", split("SUNDAY MORNING", ("no59_leads_42.jpg", "P2  ·  No. 59", CREAM), ("no51_pan.jpg", "P1  ·  THE HARRODS McLAREN", GOLD)), bg=bga("ai_dawn_sunday.png", 0.84)),
    FC("Behind them, a prototype", "courage_c34_pan.jpg", "The Courage C34", "WOLLEK  ·  HÉLARY  ·  ANDRETTI",
       facts=[(1.4, "The fastest prototype left"), (3.4, "Andretti: F1 world champion, 1978", True)]),
    CP("Then, in the final hours", "no51_pit_straight.jpg", zoom=(1.1, 1.25), texts=[(0.8, "Gearbox failing.", "big")]),
    CP("At one pit stop", "gtr_pits_lemans95.jpg", zoom=(1.0, 1.15), texts=[(0.6, "Stuck in the pits, trying to find a gear.", "mid")]),
    CP("The grey car didn't need", "no59_leads_courage.jpg", zoom=(1.15, 1.3), focus=((0.45, 0.65), (0.4, 0.62)), strap=("Yannick Dalmas", "No. 59  ·  INTO THE LEAD", S("Yannick Dalmas swept") - S("The grey car didn't need", -0.15))),
    AS("Now it was all about the gearbox", "ai_pit_night.png", zoom=(1.05, 1.22), focus=((0.5, 0.55), (0.45, 0.6)),
       texts=[(0.5, "One missed gear...", "mid"), (S("The minutes ticked down") - S("Now it was all about the gearbox", -0.15), "The minutes ticked down.", "mid+")]),
    VS("At four o'clock in the afternoon", "ai_finish_clip.mp4", texts=[(1.2, "No. 59 wins Le Mans.", "big")]),
    CP("In the pit lane, the mechanics", "gtr_pits_lemans95.jpg", zoom=(1.1, 1.25), focus=((0.5, 0.5), (0.55, 0.45)),
       texts=[(0.4, "Over the pit wall.", "mid"), (S("The crowd poured") - S("In the pit lane, the mechanics", -0.15), "The crowd on the track.", "mid+")]),
    CuS("And it wasn't alone", V1.results, bg=bga("ai_finish.png", 0.84)),
    CP("A road car, built for the road", "no59_podium.jpg", zoom=(1.0, 1.1), strap=("Sekiya  ·  Dalmas  ·  Lehto", "WINNERS  ·  LE MANS 1995", 0.5),
       texts=[(vt(E.SENTS[103]["out_start"]) - S("A road car, built for the road", -0.15), "At the first attempt.", "big")]),
    # VII. what happened next
    FC("Masanori Sekiya became", "no59_podium.jpg", "Masanori Sekiya", "THE FIRST JAPANESE WINNER", chapter=CH("VII", "WHAT HAPPENED NEXT"),
       facts=[(0.8, "Le Mans winner, 1995"), (("Yannick Dalmas went on", 0.2), "Dalmas: four Le Mans wins, 1992–1999")]),
    CP("The win gave McLaren", "hall_of_fame_1995.jpg", zoom=(1.0, 1.15), strap=("Le Mans", "THE 1995 WINNERS' HANDPRINTS", 0.8)),
    CuS("Victory at the Monaco", V1.triple_crown, off=-0.5, bg=bgp("no59_goodwood_display.jpg", 0.84)),
    CuS("Only one hundred and six", V1.hundred_six, bg=bgp("f1_road_silver.jpg", 0.86)),
    CP("In August 2026", "f1_road_silver_doors.jpg", zoom=(1.0, 1.15), texts=[(0.6, "August 2026: $34.7 million.", "mid"),
                                                                  (S("The most valuable British car") - S("In August 2026", -0.15), "The most valuable British car ever sold at auction.", "mid+")],
       dyk=(2.5, "It was a 1996 GTR, later converted for the road")),
    CP("And number fifty-nine, the grey", "no59_goodwood_display.jpg", zoom=(1.0, 1.15), focus=((0.5, 0.5), (0.47, 0.5)), strap=("No. 59", "THE GREY TEST CAR THAT WON LE MANS", 0.6)),
    # VIII. what if
    AS("So here's the question", "ai_finish.png", zoom=(1.0, 1.12), chapter=CH("VIII", "WHAT IF"),
       texts=[(S("Was it the car?") - S("So here's the question", -0.15), "Was it the car?", "big"),
              (S("Lehto in the rain?") - S("So here's the question", -0.15), "Lehto in the rain?", "big+")]),
    CuS("Or was Le Mans just meant", what_if("The car? Lehto in the rain?", "Or was Le Mans just meant", "Or was it meant to be?", "Or was Le Mans just meant"),
        bg=bga("ai_rain_night.png", 0.84)),
    CuS("This was Impossible", impossible_end("McLaren F1.")),
]

if __name__ == "__main__":
    main(scenes, FINAL)
