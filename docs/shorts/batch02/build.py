"""Standalone Shorts, batch 2: six vertical Shorts from one recording (script.md) -> PostDrive/Shorts/batch02/video/

    ~/.venvs/poststudio/bin/python docs/shorts/batch02/build.py            # all six
    ~/.venvs/poststudio/bin/python docs/shorts/batch02/build.py 1 4        # just those
    ~/.venvs/poststudio/bin/python docs/shorts/batch02/build.py sheet      # contact sheets instead
"""
import importlib.util, json, math, os, sys, multiprocessing as mp
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, "..", "..", "..")
sys.path.insert(0, os.path.join(ROOT, "studio"))
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
import vshort as V
from vshort import VPhoto, VGraphic, Pop, Tag, Stamp, SW, SH, stroke_text, blur_cover
from storykit import pf, cond, ramp, ease, rgba, tracked, load, NAVY_D, GOLD, CREAM, RED
_spec = importlib.util.spec_from_file_location("b1", os.path.join(HERE, "..", "batch01", "build.py"))
B1 = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(B1)        # shared drawing helpers
chip, title, arrow, tick = B1.chip, B1.title, B1.arrow, B1.tick
class Canvas:
    """The blurred photo plus a drawing layer: everything is drawn on the layer and composited at the end,
    so fading text and shapes blend with the picture (drawing translucent text straight onto it doesn't)."""
    def __init__(self, path, dark=0.62):
        self.bg = blur_cover(path, dark).copy(); self.L = Image.new("RGBA", self.bg.size, (0, 0, 0, 0))
    def done(self): self.bg.alpha_composite(self.L); return self.bg

B2 = "/Volumes/PostDrive/Shorts/batch02/"; NA = B2 + "audio/edit/"; C = B2 + "commons/"; M = B2 + "media/"; OUT = B2 + "video/"
MCL = "/Volumes/PostDrive/Stories/IMPOSSIBLE series/03 McLaren Le Mans/media/ai/"
MUS = "/Volumes/PostDrive/Music/"
SENTS = json.load(open(NA + "sentences.json"))
BLUE, GREEN, RUBBER = (90, 170, 255), (70, 190, 110), (26, 26, 30)

def section(k): return [s for s in SENTS if s["section"] == k]
def T(s, snip, off=0.0):
    e = next(x for x in s if snip.lower() in x["text"].lower()); return round(e["out_start"] - s[0]["out_start"] + off, 3)

# ---------------------------------------------------------------- F1-4: slick v tread, aquaplaning, the wet tyre
def tyre_graphic(s, t0):
    k = {n: T(s, n) - t0 for n in ["Tread grooves", "So a dry tyre", "But in the rain", "A slick can't", "That's aquaplaning",
                                    "So when it rains", "A full wet tyre", "That's a full bath"]}
    def fn(t, dur):
        cv = Canvas(MCL + "ai_tyre_water.png", 0.8); im, d = cv.L, ImageDraw.Draw(cv.L)
        A = lambda n, lag=0.0, du=0.4: ramp(t, k[n] + lag, k[n] + lag + du)
        p1 = 1 - A("But in the rain")
        if p1 > 0:                                                                   # 1. contact patches from below
            for i, (lab, grooves) in enumerate((("TREAD", True), ("SLICK", False))):
                x0 = 140 + i * 440; a = p1 * ramp(t, 0.1 + 0.3 * i, 0.5 + 0.3 * i)
                d.rounded_rectangle((x0, 700, x0 + 360, 1180), 30, fill=rgba(RUBBER, a), outline=rgba(CREAM, a), width=4)
                if grooves:
                    for g in range(4): d.rectangle((x0 + 50 + g * 80, 700, x0 + 70 + g * 80, 1180), fill=rgba((60, 64, 80), a))
                fill = A("Tread grooves") if grooves else A("So a dry tyre")
                if fill: tracked(d, (x0 + 180, 1210), "LESS RUBBER" if grooves else "ALL RUBBER", cond(40, 8), rgba(RED if grooves else GREEN, fill * p1), 6, "center")
                tracked(d, (x0 + 180, 640), lab, cond(52, 8), rgba(GOLD, a), 8, "center")
            title(d, 560, "SEEN FROM UNDERNEATH", p1 * ramp(t, 0.2, 0.6), 34, CREAM)
        p2 = A("But in the rain") * (1 - A("So when it rains"))
        if p2 > 0:                                                                   # 2. side view: the water wedge
            gy = 1100; cx = 540; r = 220; lift = 40 * A("A slick can't", 1.5, 1.2)
            wedge = 30 + 170 * A("A slick can't", 0.3, 1.8)
            d.rectangle((0, gy, SW, gy + 30), fill=rgba(BLUE, 0.55 * p2))
            d.polygon([(cx - 40, gy), (cx - 40 - wedge * 1.6, gy), (cx - 40, gy - wedge * 0.45)], fill=rgba(BLUE, 0.8 * p2))
            d.ellipse((cx - r, gy - 2 * r - lift, cx + r, gy - lift), fill=rgba(RUBBER, p2), outline=rgba(CREAM, p2), width=5)
            d.ellipse((cx - r * 0.55, gy - r - lift - r * 0.55, cx + r * 0.55, gy - r - lift + r * 0.55), fill=rgba((150, 150, 160), p2))
            an = t * 6
            for j in range(6): d.line([(cx + r * 0.2 * math.cos(an + j), gy - r - lift + r * 0.2 * math.sin(an + j)),
                                       (cx + r * 0.5 * math.cos(an + j), gy - r - lift + r * 0.5 * math.sin(an + j))], fill=rgba(NAVY_D, p2), width=6)
            arrow(d, (cx + 330, gy - r - lift), (cx + 120 - 300, gy - r - lift), p2 * 0.0)
            tracked(d, (SW / 2, 620), "DIRECTION OF TRAVEL: LEFT", cond(36, 8), rgba(CREAM, p2 * 0.8), 6, "center")
            aq = A("That's aquaplaning")
            if aq: chip(d, (SW / 2, 1220), "AQUAPLANING: NO GRIP", aq * p2, RED, 52)
            elif A("A slick can't"): chip(d, (SW / 2, 1220), "WATER BUILDS UP IN FRONT", A("A slick can't") * p2, BLUE, 44)
        p3 = A("So when it rains")
        if p3 > 0:                                                                   # 3. the wet tyre throws the water out
            cx, cy = 540, 860; r = 230
            d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=rgba(RUBBER, p3), outline=rgba(CREAM, p3), width=5)
            for g in range(14):
                an = g * math.pi / 7 + t * 2.5
                d.line([(cx + r * 0.7 * math.cos(an), cy + r * 0.7 * math.sin(an)), (cx + r * math.cos(an + 0.25), cy + r * math.sin(an + 0.25))], fill=rgba((70, 74, 90), p3), width=12)
            rng = np.random.default_rng(int(t * 25))
            for j in range(90):                                                     # spray off both sides
                side = -1 if j % 2 else 1; u = rng.random()
                x = cx + side * (r + 40 + 380 * u); y = cy + 120 - 260 * u * rng.random()
                d.ellipse((x - 6, y - 6, x + 6, y + 6), fill=rgba(BLUE, p3 * (1 - u * 0.7)))
            lit = A("A full wet tyre", 0.3, 0.3)
            if lit:
                n = int(85 * ease(min(1, (t - k["A full wet tyre"]) / 1.5)))
                stroke_text(d, (SW / 2, 1150), f"{n} LITRES", pf(110, 900), rgba(GOLD, lit), sw=0)
                tracked(d, (SW / 2, 1290), "EVERY SECOND", cond(46, 8), rgba(CREAM, lit), 8, "center")
            bath = A("That's a full bath")
            if bath:                                                                 # a bath filling, every two seconds
                fill = ((t - k["That's a full bath"]) % 2.0) / 2.0
                d.rounded_rectangle((330, 1360, 750, 1460), 30, outline=rgba(CREAM, bath), width=5)
                d.rounded_rectangle((336, 1460 - 94 * fill, 744, 1454), 24, fill=rgba(BLUE, bath))
        return cv.done()
    return fn

# ---------------------------------------------------------------- F1-5: the 1.8-second pit stop
def pitstop_graphic(s, t0):
    k = {n: T(s, n) - t0 for n in ["In 2023", "A world record", "It takes around", "Three on each wheel", "Then two on the jacks"]}
    def fn(t, dur):
        cv = Canvas(C + "Aston_Martin_pit_USGP_2021.jpg", 0.82); im, d = cv.L, ImageDraw.Draw(cv.L)
        A = lambda n, lag=0.0, du=0.4: ramp(t, k[n] + lag, k[n] + lag + du)
        sw = min(1.80, max(0, t - k["In 2023"] - 1.0) * 0.45)                         # the clock runs, slowed down
        a = ramp(t, 0, 0.3)
        d.rounded_rectangle((260, 560, 820, 720), 20, fill=rgba(NAVY_D, 0.92 * a), outline=rgba(GOLD, a), width=4)
        stroke_text(d, (SW / 2, 588), f"{sw:.2f} s", pf(110, 900), rgba(GOLD if sw >= 1.8 else CREAM, a), sw=0)
        if A("A world record"): chip(d, (SW / 2, 760), "WORLD RECORD  ·  QATAR 2023", A("A world record"), GOLD, 40)
        cx, cy = 540, 1130                                                             # the car from above
        d.rounded_rectangle((cx - 60, cy - 300, cx + 60, cy + 300), 40, fill=rgba((230, 120, 30), a), outline=rgba(CREAM, a), width=3)
        d.rectangle((cx - 170, cy - 330, cx + 170, cy - 300), fill=rgba((230, 120, 30), a))
        d.rectangle((cx - 150, cy + 300, cx + 150, cy + 330), fill=rgba((230, 120, 30), a))
        crew = A("It takes around")
        for wx, wy in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
            x, y = cx + wx * 150, cy + wy * 200
            d.rounded_rectangle((x - 40, y - 70, x + 40, y + 70), 14, fill=rgba(RUBBER, a), outline=rgba(CREAM, a), width=3)
            if crew:
                for j, lab in enumerate(("GUN", "OFF", "ON")):
                    px = x + wx * (110 + 0 * j); py = y + (j - 1) * 64
                    d.ellipse((px - 26, py - 26, px + 26, py + 26), fill=rgba(GOLD if j == 0 else CREAM, crew))
                    if A("Three on each wheel", 0.4) and wx < 0 and wy < 0:
                        tracked(d, (px - 40, py - 14), lab, cond(28, 8), rgba(GOLD, A("Three on each wheel", 0.4)), 3, "right")
        jk = A("Then two on the jacks")
        if jk:
            for yy in (cy - 400, cy + 400):
                d.rectangle((cx - 16, yy - 40, cx + 16, yy + 40), fill=rgba(RED, jk)); d.ellipse((cx - 28, yy - 28, cx + 28, yy + 28), outline=rgba(CREAM, jk), width=4)
            tracked(d, (cx + 60, cy - 420), "JACK", cond(30, 8), rgba(RED, jk), 4); tracked(d, (cx + 60, cy + 380), "JACK", cond(30, 8), rgba(RED, jk), 4)
        if crew: chip(d, (SW / 2, 1400), "AROUND 20 PEOPLE", crew * (1 - jk), CREAM, 40)
        return cv.done()
    return fn

# ---------------------------------------------------------------- F1-6: downforce v weight, then the ceiling
def downforce_graphic(s, t0):
    k = {n: T(s, n) - t0 for n in ["That's downforce", "And at high speed", "So in theory", "Engineers reckon"]}
    def fn(t, dur):
        cv = Canvas(M + "ai_upside_down.png", 0.8); im, d = cv.L, ImageDraw.Draw(cv.L)
        A = lambda n, lag=0.0, du=0.4: ramp(t, k[n] + lag, k[n] + lag + du)
        v = 300 * ease(min(1, t / max(1, k["So in theory"] - 0.5)))                      # speed climbs to 300 km/h
        df = 1.4 * (v / 300) ** 2                                                         # downforce v weight (weight = 1)
        flip = ease(A("So in theory", 0.6, 1.2))
        a = ramp(t, 0, 0.3); GY, ROOF = 1330, 600
        stroke_text(d, (SW / 2, 540), f"{int(v)} km/h", pf(110, 900), rgba(CREAM, a * (1 - flip)), sw=0)
        car = Image.new("RGBA", (980, 300), (0, 0, 0, 0)); cd = ImageDraw.Draw(car)
        P = [(10, 195), (155, 155), (425, 130), (490, 78), (605, 78), (670, 130), (900, 143), (900, 52), (965, 52), (965, 208), (10, 214)]
        cd.polygon(P, fill=(30, 30, 36, 255), outline=(239, 233, 219, 255))
        for wx in (195, 800): cd.ellipse((wx - 72, 156, wx + 72, 300), fill=(14, 14, 16, 255), outline=(239, 233, 219, 255), width=4)
        car = car.rotate(180 * flip, resample=Image.BICUBIC)
        y = (GY - 300) + (ROOF - (GY - 300)) * flip
        im.alpha_composite(car, (int(SW / 2 - 490), int(y)))
        d.line([(0, GY), (SW, GY)], fill=rgba(CREAM, 0.7 * (1 - flip)), width=5)
        d.line([(0, ROOF), (SW, ROOF)], fill=rgba(CREAM, 0.7 * flip), width=5)
        if flip < 0.1:
            wa = ramp(t, 0.5, 0.9)
            for j, (lab, val, col, x) in enumerate((("WEIGHT", 1.0, CREAM, 360), ("DOWNFORCE", df, GOLD, 720))):
                if j == 1 and t < k["That's downforce"] - 1: continue
                h = 90 + 160 * min(val, 1.5)
                arrow(d, (x, GY - 330 - h), (x, GY - 310), wa, col, 16, 44)
                tracked(d, (x, GY - 380 - h), lab, cond(40, 8), rgba(col, wa), 6, "center")
            if A("And at high speed", 1.0) and df > 1:
                chip(d, (SW / 2, 1370), "DOWNFORCE  >  WEIGHT", A("And at high speed", 1.0), GOLD, 50)
        else:
            for x in (360, 720): arrow(d, (x, ROOF + 520), (x, ROOF + 320), flip, GOLD, 16, 44)
            tracked(d, (SW / 2, ROOF + 560), "DOWNFORCE PUSHES IT UP", cond(40, 8), rgba(GOLD, flip), 6, "center")
            chip(d, (SW / 2, 1370), "STUCK TO THE TUNNEL ROOF", flip * (1 - A("Engineers reckon")), GOLD, 46)
            if A("Engineers reckon"): chip(d, (SW / 2, 1370), "ABOUT 150–200 KM/H", A("Engineers reckon"), GOLD, 54)
        return cv.done()
    return fn

# ---------------------------------------------------------------- football graphics
def odds_board(s, t0, elvis=False):
    def fn(t, dur):
        cv = Canvas(C + "King_Power_Stadium.JPG", 0.8); im, d = cv.L, ImageDraw.Draw(cv.L); a = ramp(t, 0, 0.3)
        title(d, 600, "PRE-SEASON ODDS  ·  2015–16" if not elvis else "THE BOOKMAKERS' ODDS  ·  REPORTEDLY", a, 38)
        rows = [("LEICESTER CITY", "TO WIN THE PREMIER LEAGUE", "5000/1", True)] if not elvis else \
               [("ELVIS", "FOUND ALIVE", "2000/1", False), ("LEICESTER", "TO WIN THE LEAGUE", "5000/1", True)]
        h = 640 if not elvis else 330
        for i, (n, sub, o, lv) in enumerate(rows):
            p = ramp(t, 0.2 + i * 0.6, 0.6 + i * 0.6); y = 700 + i * (h + 40)
            if not p: continue
            yy = y + 60 * (1 - ease(p))
            d.rounded_rectangle((90, yy, 990, yy + h), 24, fill=rgba(RED if lv else NAVY_D, 0.93 * p), outline=rgba(GOLD, p), width=4)
            tracked(d, (SW / 2, yy + 40), n, cond(70, 8), rgba(CREAM, p), 8, "center")
            tracked(d, (SW / 2, yy + 130), sub, cond(38, 8), rgba(CREAM, 0.8 * p), 6, "center")
            stroke_text(d, (SW / 2, yy + (260 if not elvis else 190)), o, pf(200 if not elvis else 110, 900), rgba(GOLD, p), sw=0)
        return cv.done()
    return fn

def goals_counter(s, t0):
    k = T(s, "By the time he retired") - t0
    def fn(t, dur):
        cv = Canvas(C + "Rogério_Ceni_2008.jpg", 0.8); im, d = cv.L, ImageDraw.Draw(cv.L)
        n = int(131 * ease(min(1, max(0, t - 0.3) / max(1.0, k + 1.2))))
        for i in range(n):                                                           # a ball for every goal
            c, r = i % 12, i // 12; x, y = 120 + c * 76, 1450 - r * 70
            d.ellipse((x - 26, y - 26, x + 26, y + 26), fill=rgba(CREAM, 1), outline=rgba(NAVY_D, 1), width=3)
            d.regular_polygon((x, y, 10), 5, fill=rgba(NAVY_D, 1))
        d.rounded_rectangle((260, 560, 820, 760), 24, fill=rgba(NAVY_D, 0.92), outline=rgba(GOLD, 1), width=4)
        stroke_text(d, (SW / 2, 580), str(n), pf(150, 900), rgba(GOLD if n >= 131 else CREAM, 1), sw=0)
        tracked(d, (SW / 2, 790), "GOALS  ·  BY A GOALKEEPER", cond(40, 8), rgba(CREAM, 1), 8, "center")
        return cv.done()
    return fn

def wickets(s, t0):
    k = T(s, "Stephenson took") - t0
    def fn(t, dur):
        cv = Canvas(C + "Cricket_ball_and_wicket_at_Takeley_Cricket_Club_ground,_Essex,_England_02.jpg", 0.78); im, d = cv.L, ImageDraw.Draw(cv.L)
        title(d, 600, "1858  ·  H. H. STEPHENSON", ramp(t, 0, 0.3), 44)
        for i in range(3):
            x = 220 + i * 320; kk = k + 0.6 + i * 0.7; f = ease(ramp(t, kk, kk + 0.35))
            for j in (-40, 0, 40):                                                   # three stumps, knocked flying
                an = math.radians(-60 * f * (1 if j >= 0 else -1) + j * 0.2 * f)
                x0, y0 = x + j, 1250; x1, y1 = x0 + 360 * math.sin(an), y0 - 360 * math.cos(an)
                d.line([(x0, y0), (x1, y1)], fill=rgba((230, 210, 160), 1), width=16)
            if f: tracked(d, (x, 1300), str(i + 1), cond(70, 8), rgba(GOLD, f), 4, "center")
        if ramp(t, k + 2.6, k + 3.0): chip(d, (SW / 2, 1370), "THREE WICKETS, THREE BALLS", ramp(t, k + 2.6, k + 3.0), GOLD, 44)
        return cv.done()
    return fn

# ---------------------------------------------------------------- the six Shorts
F1L, FBL = "OMNIRA F1  ·  EXPLAINED", "OMNIRA FOOTBALL  ·  DID YOU KNOW?"
def short_f1_4():
    s = section(0); t1 = T(s, "On a dry track")
    scenes = [VPhoto(0, C + "Pirelli_F1_Tyre_2012.jpg", ((0.5, 0.4), (0.5, 0.55)), (1.0, 1.12)),
              VGraphic(t1 - 0.1, tyre_graphic(s, t1 - 0.1)),
              VPhoto(T(s, "From 1998"), C + "Used_slick_tyres_Austrian_GP_2016.jpg", ((0.4, 0.5), (0.6, 0.5)), (1.0, 1.12))]
    ov = [Pop(0, ["WHY DO F1 TYRES", "HAVE NO TREAD?"], t1 - 0.2, y=280),
          Pop(t1, ["GRIP = RUBBER", "ON THE ROAD"], T(s, "But in the rain") - t1, size=84, y=300),
          Pop(T(s, "But in the rain"), ["RAIN: A PROBLEM"], T(s, "So when it rains") - T(s, "But in the rain"), size=90, y=300),
          Pop(T(s, "So when it rains"), ["WET TYRES:", "DEEP GROOVES"], T(s, "From 1998") - T(s, "So when it rains"), size=84, y=300),
          Pop(T(s, "From 1998"), ["1998–2008:", "GROOVED, IN THE DRY"], 99, size=80, y=280)]
    return dict(n=1, name="f1_4_no_tread", s=s, scenes=scenes, ov=ov, line=F1L,
                slate=("Slicks or grooves: which era was better?", "FOLLOW FOR MORE F1, EXPLAINED"), music=[MUS + "Energetic/LaFaye - Hidden.mp3"])

def short_f1_5():
    s = section(1); t1 = T(s, "In 2023")
    scenes = [VPhoto(0, C + "Aston_Martin_pit_USGP_2021.jpg", ((0.5, 0.4), (0.5, 0.5)), (1.0, 1.12)),
              VGraphic(t1 - 0.1, pitstop_graphic(s, t1 - 0.1)),
              VPhoto(T(s, "They practise"), C + "McLaren_mechanic_on_2010_Canadian_GP.jpg", ((0.5, 0.5), (0.55, 0.45)), (1.0, 1.12)),
              VPhoto(T(s, "And the driver"), C + "Aston_Martin_pit_USGP_2021.jpg", ((0.4, 0.3), (0.35, 0.25)), (1.25, 1.4))]
    ov = [Pop(0, ["4 NEW TYRES", "IN UNDER 2 SECONDS"], t1 - 0.2, y=270),
          Pop(T(s, "They practise"), ["HUNDREDS OF", "PRACTICE STOPS"], T(s, "And the driver") - T(s, "They practise"), size=84, y=300),
          Pop(T(s, "And the driver"), ["THE DRIVER?", "HIT THE MARKS"], 99, size=88, y=300)]
    return dict(n=2, name="f1_5_pit_stop", s=s, scenes=scenes, ov=ov, line=F1L,
                slate=("Could you change a tyre in 2 seconds?", "FOLLOW FOR MORE F1, EXPLAINED"), music=[MUS + "Energetic/ANBR - Seasons.mp3"])

def short_f1_6():
    s = section(2); t1 = T(s, "At speed")
    scenes = [VPhoto(0, M + "ai_upside_down.png", ((0.5, 0.35), (0.5, 0.45)), (1.0, 1.12)),
              VGraphic(t1 - 0.1, downforce_graphic(s, t1 - 0.1)),
              VPhoto(T(s, "Nobody has ever"), M + "ai_upside_down.png", ((0.5, 0.3), (0.5, 0.4)), (1.15, 1.3))]
    ov = [Pop(0, ["COULD AN F1 CAR", "DRIVE UPSIDE DOWN?"], t1 - 0.2, y=260),
          Pop(T(s, "Nobody has ever"), ["NEVER TRIED.", "BUT ON PAPER..."], 99, size=88, y=280)]
    return dict(n=3, name="f1_6_upside_down", s=s, scenes=scenes, ov=ov, line=F1L,
                slate=("Should someone actually try it?", "FOLLOW FOR MORE F1, EXPLAINED"), music=[MUS + "Energetic/LaFaye - Hidden.mp3"])

def short_fb_4():
    s = section(3); t1 = T(s, "That's what the bookmakers")
    scenes = [VPhoto(0, C + "King_Power_Stadium.JPG", ((0.5, 0.5), (0.55, 0.5)), (1.0, 1.15)),
              VGraphic(t1, odds_board(s, t1)),
              VPhoto(T(s, "The season before"), C + "Claudio_Ranieri_watches_on_(24731897220).jpg", ((0.45, 0.5), (0.5, 0.45)), (1.0, 1.12)),
              VGraphic(T(s, "At those odds"), odds_board(s, T(s, "At those odds"), elvis=True)),
              VPhoto(T(s, "Leicester won"), C + "LCFC_lift_the_Premier_League_Trophy_(26943755296).jpg", ((0.5, 0.5), (0.55, 0.45)), (1.0, 1.15))]
    ov = [Pop(0, ["5,000–1"], t1 - 0.2, y=320, size=150),
          Pop(T(s, "The season before"), ["NEARLY", "RELEGATED"], T(s, "They had a new") - T(s, "The season before"), size=96, y=300, colors=[CREAM, RED]),
          Tag(T(s, "They had a new", 0.3), "CLAUDIO RANIERI", sub="NEW MANAGER  ·  JULY 2015", dur=4.0),
          Stamp(T(s, "Leicester won", 0.6), "CHAMPIONS", (SW / 2, 420), 3.0, 110, color=GOLD),
          Pop(T(s, "The full story"), ["FULL STORY", "COMING SOON"], 99, size=84, y=300)]
    return dict(n=4, name="fb_4_5000_to_1", s=s, scenes=scenes, ov=ov, line=FBL,
                slate=("Biggest shock in football history?", "THE FULL STORY IS COMING TO THIS CHANNEL"), music=[MUS + "Impossible/Level - The Grey Room _ Density & Time.mp3"])

def short_fb_5():
    s = section(4); t1 = T(s, "He took their free")
    scenes = [VPhoto(0, C + "Rogério_Ceni_2008.jpg", ((0.5, 0.35), (0.5, 0.3)), (1.0, 1.1)),
              VGraphic(t1 - 0.1, goals_counter(s, t1 - 0.1)),
              VPhoto(T(s, "And he still"), C + "Rogério_Ceni.jpg", ((0.5, 0.45), (0.5, 0.4)), (1.0, 1.08))]
    ov = [Pop(0, ["A GOALKEEPER", "WITH 100+ GOALS"], T(s, "Rogério Ceni") - 0.1, y=270),
          Tag(T(s, "Rogério Ceni", 0.3), "ROGÉRIO CENI", sub="SÃO PAULO  ·  1990–2015", dur=4.0),
          Pop(t1, ["FREE KICKS.", "PENALTIES."], T(s, "By the time") - t1, size=88, y=300),
          Pop(T(s, "More than many"), ["MORE THAN", "MANY STRIKERS"], T(s, "And he still") - T(s, "More than many"), size=84, y=300),
          Pop(T(s, "And he still"), ["AND HE STILL", "KEPT GOAL"], 99, size=88, y=300)]
    return dict(n=5, name="fb_5_keeper_131_goals", s=s, scenes=scenes, ov=ov, line=FBL,
                slate=("Should keepers take more penalties?", "FOLLOW FOR MORE FOOTBALL STORIES"), music=[MUS + "Impossible/Scale The Mountain - Density & Time.mp3"])

def short_fb_6():
    s = section(5); t1 = T(s, "In 1858")
    scenes = [VPhoto(0, C + "Cricket_ball_and_wicket_at_Takeley_Cricket_Club_ground,_Essex,_England_02.jpg", ((0.5, 0.5), (0.55, 0.5)), (1.0, 1.15)),
              VGraphic(t1 - 0.1, wickets(s, t1 - 0.1)),
              VPhoto(T(s, "The crowd held"), M + "ai_hat_1858.png", ((0.5, 0.4), (0.5, 0.5)), (1.0, 1.12)),
              VPhoto(T(s, "Football borrowed"), C + "King_Power_Stadium.JPG", ((0.4, 0.5), (0.6, 0.5)), (1.0, 1.12))]
    ov = [Pop(0, ["WHY IS IT CALLED", "A HAT-TRICK?"], t1 - 0.2, y=270),
          Pop(T(s, "It started in cricket"), ["IT STARTED", "IN CRICKET"], t1 - T(s, "It started in cricket"), size=88, y=300),
          Pop(T(s, "Three in a row"), ["3 IN A ROW", "= A HAT"], T(s, "Football borrowed") - T(s, "Three in a row"), size=96, y=300),
          Pop(T(s, "And these days"), ["SCORE THREE:", "KEEP THE BALL"], 99, size=88, y=300)]
    return dict(n=6, name="fb_6_hat_trick", s=s, scenes=scenes, ov=ov, line=FBL,
                slate=("Best hat-trick you've ever seen?", "FOLLOW FOR MORE FOOTBALL STORIES"), music=[MUS + "Impossible/Time to Spare - An Jone.mp3"])

ALL = [short_f1_4, short_f1_5, short_f1_6, short_fb_4, short_fb_5, short_fb_6]

def job(k):
    j = ALL[k - 1](); os.makedirs(OUT, exist_ok=True); out = OUT + f"short_{j['name']}.mp4"
    return out, round(V.render(out, NA, j["s"], j["scenes"], j["ov"], j["line"], j["slate"], j["music"]), 1)

def sheet(k):
    j = ALL[k - 1](); s = j["s"]; body = s[-1]["out_end"] - s[0]["out_start"]
    scenes = sorted(j["scenes"], key=lambda x: x.start)
    for a, b in zip(scenes, scenes[1:]): a.dur = b.start - a.start
    scenes[-1].dur = body - scenes[-1].start
    ts = [x.start + f * x.dur for x in scenes for f in (0.15, 0.5, 0.85)] + [body + 1.0]
    caps = V.chunks([(t - s[0]["out_start"], w) for t, w in V.caption_words(NA, s)])
    ims = [V.compose(scenes, j["ov"], caps, j["line"], j["slate"], t, body, body + V.SLATE).convert("RGB").resize((270, 480)) for t in ts]
    g = Image.new("RGB", (270 * 8, 480 * math.ceil(len(ims) / 8)))
    for i, im in enumerate(ims):
        ImageDraw.Draw(im).text((4, 4), f"{ts[i]:.1f}", fill=(255, 255, 0)); g.paste(im, ((i % 8) * 270, (i // 8) * 480))
    os.makedirs(B2 + "sheets", exist_ok=True); g.save(B2 + f"sheets/short{k}.jpg", quality=82); return B2 + f"sheets/short{k}.jpg"

if __name__ == "__main__":
    args = sys.argv[1:]; mode = "sheet" if args and args[0] == "sheet" else "render"
    pick = [int(x) for x in args if x.isdigit()] or range(1, len(ALL) + 1)
    V.caption_words(NA, SENTS)          # Whisper (MLX) hangs inside forked workers: fill the cache here first
    with mp.get_context("fork").Pool(len(pick)) as pool:
        for r in pool.map(sheet if mode == "sheet" else job, pick): print(r)
