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
from PIL import ImageFilter

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
            src = load(C + f if os.path.exists(C + f) else M + f); w, h = src.size; ww, wh = 860, 640; ar = ww / wh
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
_icon = {}
def f1_icon(w):
    """The real F1 (the side-on still), cut out with soft edges, w pixels long."""
    if w not in _icon:
        im = load(AI + "ai_f1_side.png"); W0, H0 = im.size
        c = im.crop((int(0.02 * W0), int(0.27 * H0), int(0.97 * W0), int(0.74 * H0))).convert("RGBA")
        m = Image.new("L", c.size, 0); ImageDraw.Draw(m).rounded_rectangle((10, 10, c.width - 10, c.height - 10), 40, fill=255)
        c.putalpha(m.filter(ImageFilter.GaussianBlur(12))); _icon[w] = c.resize((w, int(c.height * w / c.width)), Image.LANCZOS)
    return _icon[w]
def hundred_six2(d, L, t, sc):
    """106 real McLaren F1s filling the screen, with the count."""
    n = int(106 * ease(min(1, max(0, t - 0.2) / 3.0))); ic = f1_icon(150)
    for i in range(n):
        c, r = i % 11, i // 11; x = 30 + c * 170 + (40 if r % 2 else 0); y = 210 + r * 78
        k = min(1, (t - 0.2 - i * 3.0 / 106) / 0.25)
        if k <= 0: continue
        im = ic if k >= 1 else Image.fromarray((np.asarray(ic) * np.array([1, 1, 1, k])).astype(np.uint8))
        L.alpha_composite(im, (int(x), int(y - 30 * (1 - k))))
    d.rounded_rectangle((W / 2 - 300, 40, W / 2 + 300, 190), 24, fill=rgba(NAVY_D, 0.92), outline=rgba(GOLD, 1), width=4)
    text_top(d, (W / 2, 62), f"{n}", pf(110, 900), rgba(GOLD if n >= 106 else CREAM, 1), "center")
    tracked(d, (W / 2, 1010), "McLAREN F1s EVER BUILT  ·  RACING CARS INCLUDED", cond(40, 8), rgba(CREAM, ramp(t, 1.0, 1.4)), 8, "center")


scenes = [
    opening(GRID, "McLaren F1.", "EPISODE THREE  ·  THE ROAD CAR THAT WON LE MANS", credit="AI illustration", focus=((0.5, 0.5), (0.42, 0.45))),
    # cold open
    AS("June 1995.", "ai_grid_1995.png", off=0, zoom=(1.12, 1.3), focus=((0.42, 0.45), (0.42, 0.42)), chapter="LE MANS  ·  JUNE 1995"),
    CP("A road car lines up", "f1_road_silver.jpg", zoom=(1.0, 1.1), texts=[(0.4, "A road car.", "big")]),
    CP("Its designer never wanted", "f1_road_open.jpg", zoom=(1.0, 1.1), texts=[(0.3, "Never meant to race.", "mid"),
                                                                               (S("It has never run") - S("Its designer never wanted", -0.15), "Never run for 24 hours.", "mid+")]),
    CuS("And it's up against", split("LE MANS 1995", ("mcLaren F1.no59.webp", "A ROAD CAR", CREAM), ("Prototype2.jpg", "PROTOTYPES  ·  BUILT TO WIN", GOLD)), off=-0.4, bg=bg_of(M + "Prototype2.jpg", 0.86)),
    VS("Twenty-four hours later", "ai_finish_clip.mp4", texts=[(S("At the first attempt.") - S("Twenty-four hours later", -0.15), "At the first attempt.", "big")]),
    CP("This is the story of the McLaren F1", "mcLaren F1.no59:4.jpeg", zoom=(1.0, 1.12), focus=((0.5, 0.55), (0.45, 0.5)), strap=("McLaren F1 GTR  ·  No. 59", "THE CAR THAT WON LE MANS IN 1995", 0.5)),
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
    CP("And Murray was clear", "mcLaren F1. Road Carwebp", zoom=(1.0, 1.1), focus=((0.5, 0.55), (0.55, 0.55)),
       texts=[(S("It was a road car.") - S("And Murray was clear", -0.15), "A road car.", "big"), (S("It was not going racing") - S("And Murray was clear", -0.15), "Not a racing car.", "mid+")]),
    # III. the customers
    CP("But the people who bought", "f1_road_silver.jpg", zoom=(1.1, 1.25), chapter=CH("III", "THE CUSTOMERS"),
       texts=[(S("Some of them wanted") - S("But the people who bought", -0.15), "Some of them wanted to race.", "mid")]),
    CuS("And they told McLaren", V1.letter, bg=bgp("f1_road_silver.jpg", 0.82)),
    FC("So McLaren gave in", "mcLaren F1.3.jpeg", "McLaren F1 GTR", "THE RACING VERSION",
       facts=[(("The F1 GTR.", 0.2), "Built for the 1995 GT season"), (("The F1 GTR.", 1.4), "It kept the road car's central driving seat", True)]),
    CP("In 1995, it won race after race", "mcLaren F1.4.jpeg", zoom=(1.0, 1.12), focus=((0.55, 0.55), (0.5, 0.5)), texts=[(0.5, "1995: race after race.", "mid")]),
    CP("But Le Mans?", "circuit_corner.jpg", zoom=(1.0, 1.12), texts=[(0.3, "But Le Mans?", "big")]),
    # IV. the mountain
    CuS("Le Mans is twenty-four hours", V1.lemans_map, chapter=CH("IV", "THE MOUNTAIN"), bg=bgp("circuit_corner.jpg", 0.85)),
    CP("The fastest cars there", "Prototype.jpg", zoom=(1.0, 1.12), focus=((0.55, 0.6), (0.6, 0.6)), strap=("Courage C34", "PROTOTYPE  ·  LE MANS 1995", 0.4)),
    CP("Purpose-built racing machines", "Prototype2.jpg", zoom=(1.0, 1.12), focus=((0.45, 0.6), (0.5, 0.6)), texts=[(0.6, "Lower. Lighter.", "big")]),
    CuS("The McLarens had never run", V1.never_24, bg=bgp("gtr_pits_lemans95.jpg")),
    CP("One of them, number", "mcLaren F1.no59.webp", zoom=(1.0, 1.15), focus=((0.5, 0.55), (0.55, 0.55)), strap=("No. 59", "THE ORIGINAL TEST CAR", S("The original test car") - S("One of them, number", -0.15))),
    FC("Painted grey", "mcLaren F1.no59:2.jpeg", "Kokusai Kaihatsu Racing", "A SMALL, JAPANESE-BACKED PRIVATE TEAM",
       facts=[(0.8, "No. 59: chassis 01R, the test car"), (2.2, "Lanzante, a small British firm, ran the car", True)]),
    FC("Its drivers were", "podium.webp", "Dalmas  ·  Lehto  ·  Sekiya", "No. 59's THREE DRIVERS",
       facts=[(0.6, "Yannick Dalmas: France, already a Le Mans winner"), (("JJ Lehto, a Finn", 0.2), "JJ Lehto: Finland, ex-Benetton F1"),
              (("And Masanori Sekiya", 0.2), "Masanori Sekiya: Japan")]),
    CuS("On Saturday afternoon", V1.start_clock, bg=bga("ai_grid_1995.png", 0.8)),
    AF("The little prototypes", 0.0, "ai_front_row.png", zoom=(1.0, 1.12), texts=[(0.6, "Prototypes on the front row.", "mid")],
       fallback=PF("The little prototypes", 0.0, "Prototype2.jpg", zoom=(1.1, 1.25), texts=[(0.6, "Prototypes on the front row.", "mid")])),
    CP("The McLarens were down", "no51_pit_straight.jpg", zoom=(1.0, 1.1), texts=[(0.3, "The McLarens: in the pack.", "mid")]),
    # V. the rain
    CP("Then, at the end of the first hour", "no59_dunlop_rain.jpg", zoom=(1.0, 1.14), chapter=CH("V", "THE RAIN"), strap=("The rain", "LE MANS 1995  ·  THE DUNLOP BRIDGE", 1.2)),
    CuS("For around sixteen hours", V1.rain_clock, bg=bga("ai_rain_night.png", 0.82)),
    AS("In the dark, at close", "ai_rain_alone.png", zoom=(1.0, 1.15), fallback=AS("In the dark, at close", "ai_rain_night.png", zoom=(1.6, 1.75), focus=((0.36, 0.55), (0.33, 0.56)))),
    explainer("Here's why that changed", X.aqua_scene),
    CP("The prototypes were light", "Rain.webp", zoom=(1.0, 1.15), focus=((0.45, 0.5), (0.5, 0.5)),
       texts=[(0.4, "The prototypes: light.", "mid"), (S("Brilliant in the dry") - S("The prototypes were light", -0.15), "Nervous in the wet.", "mid+")]),
    CP("The McLaren was a heavier car", "no51_dusk_rain.jpg", zoom=(1.0, 1.15), texts=[(0.4, "Heavier. A roof. A windscreen.", "mid")]),
    AS("JJ Lehto was on another level", "ai_lehto_night.png", zoom=(1.0, 1.15), strap=("JJ Lehto", "No. 59  ·  THE NIGHT IN THE RAIN", 0.4),
       fallback=AS("JJ Lehto was on another level", "ai_rain_night.png", zoom=(1.5, 1.7), focus=((0.36, 0.55), (0.34, 0.55)), strap=("JJ Lehto", "No. 59  ·  THE NIGHT IN THE RAIN", 0.4))),
    VS("In the middle of the night", "ai_lehto_rain_clip.mp4", end=7.2,
       texts=[(S("In the middle of the night", 3.2) - S("In the middle of the night", -0.15), "Up to 20 seconds a lap faster.", "big"),
              (S("In the middle of the night", 5.2) - S("In the middle of the night", -0.15), "Reportedly.", "mid+"),
              (S("But number fifty-nine still", 0.2) - S("In the middle of the night", -0.15), "But No. 59 still wasn't leading.", "mid")]),
    CP("Another McLaren led", "gtr_gulf.jpg", zoom=(1.0, 1.12), texts=[(SF("Another McLaren led", 0.55) - S("Another McLaren led", -0.15), "Early Sunday: clutch broken.", "mid")]),
    CP("Then the Harrods McLaren", "no51_pan.jpg", zoom=(1.0, 1.12), strap=("The Harrods McLaren", "No. 51", 0.5)),
    FC("Derek Bell, a five-time", "no51_dusk_rain.jpg", "The Harrods McLaren", "DEREK BELL  ·  JUSTIN BELL  ·  ANDY WALLACE",
       facts=[(0.6, "Derek Bell: five Le Mans wins"), (2.4, "Wallace later drove the F1 to 240 mph", True)]),
    # VI. the last hours
    AS("As the sun came up", "ai_dawn_sunday.png", zoom=(1.0, 1.15), focus=((0.5, 0.5), (0.7, 0.6)), chapter=CH("VI", "THE LAST HOURS")),
    CP("Number fifty-nine was second", "mcLaren F1.4.jpeg", zoom=(1.1, 1.25), focus=((0.6, 0.55), (0.55, 0.5)),
       texts=[(0.3, "Sunday morning: No. 59 second.", "mid"), (S("The Harrods car was just ahead") - S("Number fifty-nine was second", -0.15), "The Harrods car just ahead.", "mid+")]),
    FC("Behind them, a prototype", "Prototype.jpg", "The Courage C34", "WOLLEK  ·  HÉLARY  ·  ANDRETTI",
       facts=[(1.4, "The fastest prototype left"), (3.4, "Andretti: F1 world champion, 1978", True)]),
    CP("Then, in the final hours", "no51_pit_straight.jpg", zoom=(1.1, 1.25), texts=[(0.8, "Gearbox failing.", "big")]),
    CP("At one pit stop", "gtr_pits_lemans95.jpg", zoom=(1.0, 1.15), texts=[(0.6, "Stuck in the pits, trying to find a gear.", "mid")]),
    CP("The grey car didn't need", "mcLaren F1.no59.webp", zoom=(1.3, 1.5), focus=((0.55, 0.6), (0.45, 0.6)), strap=("Yannick Dalmas", "No. 59  ·  INTO THE LEAD", S("Yannick Dalmas swept") - S("The grey car didn't need", -0.15))),
    AS("Now it was all about the gearbox", "ai_pit_night.png", zoom=(1.05, 1.22), focus=((0.5, 0.55), (0.45, 0.6)),
       texts=[(0.5, "One missed gear...", "mid"), (S("The minutes ticked down") - S("Now it was all about the gearbox", -0.15), "The minutes ticked down.", "mid+")]),
    VS("At four o'clock in the afternoon", "ai_finish_clip.mp4", texts=[(1.2, "No. 59 wins Le Mans.", "big")]),
    AS("In the pit lane, the mechanics", "ai_track_invasion.png", zoom=(1.0, 1.15),
       fallback=AS("In the pit lane, the mechanics", "ai_finish.png", zoom=(1.3, 1.45), focus=((0.25, 0.55), (0.3, 0.5)))),
    CuS("And it wasn't alone", V1.results, bg=bga("ai_finish.png", 0.84)),
    CP("A road car, built for the road", "podium2.jpeg", zoom=(1.0, 1.1), focus=((0.55, 0.45), (0.55, 0.4)), strap=("Sekiya  ·  Dalmas  ·  Lehto", "WINNERS  ·  LE MANS 1995", 0.5),
       texts=[(vt(E.SENTS[103]["out_start"]) - S("A road car, built for the road", -0.15), "At the first attempt.", "big")]),
    # VII. what happened next
    FC("Masanori Sekiya became", "podium.webp", "Masanori Sekiya", "THE FIRST JAPANESE WINNER", chapter=CH("VII", "WHAT HAPPENED NEXT"),
       facts=[(0.8, "Le Mans winner, 1995"), (("Yannick Dalmas went on", 0.2), "Dalmas: four Le Mans wins, 1992–1999")]),
    CP("The win gave McLaren", "hall_of_fame_1995.jpg", zoom=(1.0, 1.15), strap=("Le Mans", "THE 1995 WINNERS' HANDPRINTS", 0.8)),
    CuS("Victory at the Monaco", V1.triple_crown, off=-0.5, bg=bgp("no59_goodwood_display.jpg", 0.84)),
    CuS("Only one hundred and six", hundred_six2, bg=bg_of(AI + "ai_f1_side.png", 0.86)),
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
