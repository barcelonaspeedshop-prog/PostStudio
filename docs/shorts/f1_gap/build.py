"""Omnira F1 Shorts for the Austin weekend (Fri 23 – Sun 25 Oct): COTA Turn 1 explained, the six-car race (Indy 2005),
Surtees on this day. narration.md (from script.md) + AI narration (Bernard, Kirk, Kirk) -> PostDrive/Shorts/f1_gap/video/

    ~/.venvs/poststudio/bin/python docs/shorts/f1_gap/build.py            # all three
    ~/.venvs/poststudio/bin/python docs/shorts/f1_gap/build.py 2          # just Indy
    ~/.venvs/poststudio/bin/python docs/shorts/f1_gap/build.py sheet      # contact sheets instead
"""
import importlib.util, json, math, os, sys, multiprocessing as mp
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, "..", "..", "..")
sys.path.insert(0, os.path.join(ROOT, "studio"))
from PIL import Image, ImageDraw
import vshort as V
from vshort import VPhoto, VGraphic, Pop, Tag, Stamp, SW, SH, stroke_text, blur_cover
from storykit import pf, cond, ramp, ease, rgba, tracked, NAVY_D, GOLD, CREAM, RED
_spec = importlib.util.spec_from_file_location("b1", os.path.join(HERE, "..", "batch01", "build.py"))
B1 = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(B1)
chip, title, arrow = B1.chip, B1.title, B1.arrow

R = "/Volumes/PostDrive/Shorts/f1_gap/"; NA = R + "audio/"; C = R + "commons/"; OUT = R + "video/"
MUS = "/Volumes/PostDrive/Music/"
HILL = C + "Main_straight_and_turn_1_hill,_Circuit_of_the_Americas.jpg"
GP18 = C + "2018 US Grand Prix at the Circuit of the Americas.jpg"
GP13 = C + "United_states_grand_prix_2013.jpg"
AERIAL = C + "Circuit_of_the_Americas,_Austin,_TX_(30066328424).jpg"
CROWD = C + "Crowds_at_Circuit_of_the_Americas.jpg"
INDY = C + "Schumacher_(Ferrari)_in_practice_at_USGP_2005.jpg"
R25 = C + "Renault_R25_2005_United_States_GP_(19887965).jpg"
MICH = C + "Michelin_2005_United_States_GP_(20413746).jpg"
MSC = C + "Michael_Schumacher_2005_United_States_GP_(19872855).jpg"
MSC_W = C + "Michael_Schumacher_after_2005_United_States_GP_(20413937).jpg"
MONT = C + "Monteiro_(Jordan)_qualifying_at_USGP_2005.jpg"
S56 = C + "John_Surtees,_winnaar_500CC,_Bestanddeelnr_907-8597.jpg"
SMV = C + "John_Surlees_op_MV_Agusta_tijden_de_500cc_race,_Bestanddeelnr_910-4761.jpg"
S64 = C + "Surtees_at_1964_Dutch_Grand_Prix.jpg"
START64 = C + "Start_of_1964_Dutch_Grand_Prix.jpg"
CLARK = C + "Grand_Prix_van_Nederland,_het_rennersveld_Jim_Clark_in_zijn_Lotus_in_actie,_Bestanddeelnr_916-4688.jpg"
F158 = C + "Ferrari_158_F1_1964.jpg"
F158G = C + "Surtees_Ferrari_158_Goodwood_July_2010.jpg"
FERRARI, GREEN, BLUE, BRIDGE = (220, 30, 40), (70, 190, 110), (40, 90, 200), (230, 60, 50)
MICH_BLUE, NART_BLUE, WHITE = (30, 80, 180), (25, 60, 160), (245, 245, 245)

SENTS = json.load(open(NA + "sentences.json"))
def section(k): return [s for s in SENTS if s["section"] == k]
def T(s, snip, off=0.0):
    e = next(x for x in s if snip.lower() in x["text"].lower()); return round(e["out_start"] - s[0]["out_start"] + off, 3)

class Canvas:
    def __init__(self, path, dark=0.72):
        self.bg = blur_cover(path, dark).copy(); self.L = Image.new("RGBA", self.bg.size, (0, 0, 0, 0))
    def done(self): self.bg.alpha_composite(self.L); return self.bg

def centred(d, xy, text, f, fill, track=6):                                  # cap-height centred on y
    b = f.getbbox("H"); tracked(d, (xy[0], xy[1] - (b[3] - b[1]) / 2), text, f, fill, track, "center")

# ================================================================ F1-7: Austin's Turn 1
def climb():
    """The start straight rising to Turn 1, a ten-storey block beside it for scale."""
    def fn(t, dur):
        cv = Canvas(HILL, 0.7); d = ImageDraw.Draw(cv.L); a = ramp(t, 0, 0.3)
        title(d, 600, "START LINE TO TURN 1", a, 46)
        x0, x1, yb, rise = 110, 820, 1250, 380                                  # rise drawn to the block's scale
        g = ease(ramp(t, 0.2, 1.6)); xe = x0 + (x1 - x0) * g
        pts = [(x, yb - rise * ((x - x0) / (x1 - x0)) ** 1.6) for x in range(x0, int(xe) + 1, 6)]
        if len(pts) > 1:
            d.polygon(pts + [(pts[-1][0], yb), (x0, yb)], fill=rgba(GOLD, 0.28 * a))
            d.line(pts, fill=rgba(GOLD, a), width=10)
            d.ellipse((pts[-1][0] - 16, pts[-1][1] - 16, pts[-1][0] + 16, pts[-1][1] + 16), fill=rgba(CREAM, a))
        d.line([(x0 - 20, yb), (990, yb)], fill=rgba(CREAM, 0.6 * a), width=4)
        tracked(d, (x0, yb + 24), "START", cond(36, 8), rgba(CREAM, 0.8 * a), 6)
        b = ramp(t, 1.0, 1.4)                                                    # ten storeys, one band each
        if b:
            bx = 870; h = rise / 10
            for i in range(10):
                p = ramp(t, 1.0 + i * 0.08, 1.2 + i * 0.08)
                d.rectangle((bx, yb - (i + 1) * h + 4, bx + 100, yb - i * h), fill=rgba(NAVY_D, 0.9 * p), outline=rgba(CREAM, 0.8 * p), width=3)
            tracked(d, (bx + 50, yb + 24), "10 FLOORS", cond(32, 8), rgba(CREAM, 0.8 * b), 4, "center")
        c = ramp(t, 2.2, 2.6)
        if c: chip(d, (SW / 2, 1420), "MORE THAN 30 METRES UP", c, GOLD, 54)
        return cv.done()
    return fn

def brakes(t1):
    """Flat v uphill: the uphill car can brake later."""
    def fn(t, dur):
        cv = Canvas(GP13, 0.72); d = ImageDraw.Draw(cv.L)
        title(d, 600, "WHERE THEY BRAKE", ramp(t, 0, 0.3), 46)
        for i, (lab, at, k) in enumerate((("ON THE FLAT", 0.38, 0.2), ("UPHILL", 0.6, t1))):
            p = ramp(t, k, k + 0.35)
            if not p: continue
            y = 820 + i * 260; x0, x1 = 110, 970; xb = x0 + (x1 - x0) * at
            tracked(d, (x0, y - 70), lab, cond(46, 8), rgba(CREAM, p), 8)
            d.rounded_rectangle((x0, y, x1, y + 90), 14, fill=rgba(NAVY_D, 0.9 * p), outline=rgba(CREAM, 0.4 * p), width=3)
            d.rounded_rectangle((xb, y, x1, y + 90), 14, fill=rgba(RED, 0.85 * p))
            tracked(d, (xb + 20, y + 26), "BRAKE", cond(38, 8), rgba(CREAM, p), 6)
            d.rectangle((x1 - 14, y - 20, x1, y + 110), fill=rgba(GOLD, p))
        c = ramp(t, t1 + 0.9, t1 + 1.3)
        if c: chip(d, (SW / 2, 1370), "GRAVITY HELPS SLOW THE CAR", c, GREEN, 48)
        return cv.done()
    return fn

def blind(t_reveal):
    """Driver's-eye view up the hill: the road ends in sky, then the hairpin the driver can't see."""
    def fn(t, dur):
        im = Image.new("RGBA", (SW, SH), (0, 0, 0, 255)); d = ImageDraw.Draw(im)
        for y in range(0, 1100):                                                 # sky
            k = y / 1100; d.line([(0, y), (SW, y)], fill=(int(70 + 90 * k), int(110 + 80 * k), int(170 + 60 * k), 255))
        d.rectangle((0, 1100, SW, SH), fill=(46, 52, 64, 255))
        crest = 1000
        d.polygon([(120, SH), (960, SH), (600, crest), (480, crest)], fill=(70, 74, 84, 255))   # the road up to the crest
        for k in range(6):                                                       # centre dashes
            y0 = SH - k * 160; y1 = y0 - 80; w = 1 - k * 0.14
            d.line([(SW / 2, y0), (SW / 2, max(crest + 10, y1))], fill=(235, 235, 235, 255), width=max(3, int(12 * w)))
        d.line([(480, crest), (600, crest)], fill=(235, 235, 235, 255), width=4)
        L = Image.new("RGBA", (SW, SH), (0, 0, 0, 0)); g = ImageDraw.Draw(L)
        a = ramp(t, 0.3, 0.7)
        title(g, 600, "WHAT THE DRIVER SEES", a, 46, CREAM)
        if a and t < t_reveal: chip(g, (SW / 2, 860), "THE ROAD JUST ENDS", a, GOLD, 50)
        r = ramp(t, t_reveal, t_reveal + 0.8)
        if r:                                                                    # the hidden hairpin, dashed over the crest
            pts = [(540 - 340 * math.sin(math.pi * u) * ease(r), crest - 40 - 260 * u) for u in [i / 30 for i in range(31)]]
            for i in range(0, len(pts) - 1, 2): g.line([pts[i], pts[i + 1]], fill=rgba(GOLD, r), width=12)
            ax, ay = 540 - 340, crest - 170
            g.ellipse((ax - 22, ay - 22, ax + 22, ay + 22), fill=rgba(RED, r), outline=rgba(CREAM, r), width=4)
            chip(g, (SW / 2, 1240), "APEX: HIDDEN BEHIND THE CREST", r, RED, 46)
            chip(g, (SW / 2, 1360), "FIRST GEAR HAIRPIN", ramp(t, t_reveal + 1.0, t_reveal + 1.4), GOLD, 46)
        im.alpha_composite(L); return im
    return fn

def short_cota():
    s = section(0)
    t_aus, t_cl, t_up, t_top, t_hair, t_aim, t_wide, t_watch = (T(s, x) for x in ("At the start in Austin", "They climb", "Going uphill", "But at the top",
        "It's a hairpin", "So the drivers aim", "And it's built", "Watch the start"))
    scenes = [VPhoto(0, GP13, ((0.5, 0.45), (0.6, 0.4)), (1.0, 1.18)),
              VPhoto(t_aus, HILL, ((0.55, 0.97), (0.5, 0.9)), (1.45, 1.3)),
              VGraphic(t_cl - 0.1, climb()),
              VGraphic(t_up - 0.1, brakes(T(s, "Gravity slows") - t_up + 0.3)),
              VGraphic(t_top - 0.1, blind(t_hair - t_top + 0.2)),
              VPhoto(t_aim, GP18, ((0.4, 0.6), (0.55, 0.6)), (1.1, 1.25)),
              VPhoto(t_wide, AERIAL, ((0.5, 0.5), (0.45, 0.5)), (1.0, 1.15)),
              VPhoto(t_watch, CROWD, ((0.45, 0.5), (0.55, 0.45)), (1.0, 1.15))]
    ov = [Pop(0, ["THE CORNER", "YOU CAN'T SEE"], t_aus - 0.2, y=280, size=110),
          Tag(t_aus + 0.3, "LOOKING DOWN FROM TURN 1", sub="CIRCUIT OF THE AMERICAS  ·  AUSTIN", dur=t_cl - t_aus - 0.4),
          Pop(t_aim, ["AIM AT A POINT", "YOU CAN'T SEE"], t_wide - t_aim - 0.1, y=280, size=96),
          Pop(t_wide, ["BUILT WIDE", "ON PURPOSE"], t_watch - t_wide - 0.1, y=280, size=110),
          Pop(t_watch, ["WATCH THE START", "ON SUNDAY"], 99, y=280, size=100)]
    return dict(n=1, name="F1-7 The corner drivers can't see", s=s, scenes=scenes, ov=ov, line="OMNIRA F1  ·  EXPLAINED",
                slate=("Count the places at Turn 1 on Sunday.", "FOLLOW FOR MORE F1, EXPLAINED"), music=[MUS + "Energetic/ANBR - Seasons.mp3"])

# ================================================================ F1-8: the race with six cars
def countdown(t0):
    """20 grid dots; 14 go grey, the number falls to 6."""
    def fn(t, dur):
        cv = Canvas(INDY, 0.74); d = ImageDraw.Draw(cv.L); a = ramp(t, 0, 0.3)
        g = ease(ramp(t, 1.0, 2.6)); n = 20 - round(14 * g)
        for i in range(20):
            c, r = i % 2, i // 2; x, y = 330 + c * 420 + (60 if c else 0), 640 + r * 48
            bridgestone = i < 6; col = BRIDGE if bridgestone else MICH_BLUE
            alpha = a if bridgestone else a * (1 - 0.8 * ease(ramp(t, 1.0 + (i - 6) * 0.1, 1.3 + (i - 6) * 0.1)))
            d.rounded_rectangle((x - 70, y - 20, x + 70, y + 20), 10, fill=rgba(col, alpha))
        d.rounded_rectangle((330, 1120, 750, 1360), 26, fill=rgba(NAVY_D, 0.92 * a), outline=rgba(GOLD, a), width=4)
        stroke_text(d, (SW / 2, 1126), str(n), pf(170, 900), rgba(GOLD if n == 6 else CREAM, a), sw=0)
        centred(d, (SW / 2, 1332), "CARS ON THE GRID", cond(34, 8), rgba(CREAM, a))
        return cv.done()
    return fn

def tyres():
    """Who used which tyres: 14 Michelin cars, 6 Bridgestone."""
    def fn(t, dur):
        cv = Canvas(MICH, 0.72); d = ImageDraw.Draw(cv.L)
        title(d, 600, "2005  ·  WHO MADE THE TYRES", ramp(t, 0, 0.3), 42)
        for i, (n, cars, teams, col, k) in enumerate((("MICHELIN", 14, "7 TEAMS", MICH_BLUE, 0.2), ("BRIDGESTONE", 6, "FERRARI · JORDAN · MINARDI", BRIDGE, 0.9))):
            p = ramp(t, k, k + 0.35)
            if not p: continue
            y = 760 + i * 300; w = 840 * cars / 14 * ease(ramp(t, k, k + 1.0))
            tracked(d, (120, y - 66), n, cond(56, 8), rgba(CREAM, p), 8)
            d.rounded_rectangle((120, y, 120 + max(w, 14), y + 140), 14, fill=rgba(col, 0.95 * p))
            f = cond(60, 8); b = f.getbbox("H")
            tracked(d, (120 + max(w, 14) - 24, y + 70 - (b[3] - b[1]) / 2), f"{cars} CARS", f, rgba(CREAM, p), 6, "right")
            tracked(d, (120, y + 166), teams, cond(36, 6), rgba(GOLD, p), 4)
        return cv.done()
    return fn

def pits():
    """All twenty on the formation lap, then fourteen peel off into the pit lane."""
    def fn(t, dur):
        cv = Canvas(R25, 0.74); d = ImageDraw.Draw(cv.L); a = ramp(t, 0, 0.3)
        title(d, 600, "AFTER THE FORMATION LAP", a, 44)
        d.rounded_rectangle((90, 1090, 990, 1250), 20, outline=rgba(GOLD, a), width=4, fill=rgba(NAVY_D, 0.6 * a))
        tracked(d, (SW / 2, 1262), "PIT LANE", cond(40, 8), rgba(GOLD, a), 8, "center")
        for i in range(20):
            mich = i >= 6; k = 1.4 + (i - 6) * 0.12; m = ease(ramp(t, k, k + 0.6)) if mich else 0
            c, r = i % 2, i // 2; x0, y0 = 330 + c * 420, 690 + r * 40
            j = i - 6; xp, yp = 150 + (j % 7) * 120, 1135 + (j // 7) * 70
            x, y = x0 + (xp - x0) * m, y0 + (yp - y0) * m
            d.rounded_rectangle((x - 50, y - 16, x + 50, y + 16), 8, fill=rgba(MICH_BLUE if mich else BRIDGE, a))
        c = ramp(t, 3.4, 3.8)
        if c: chip(d, (SW / 2, 1360), "14 PARKED  ·  6 RACED", c, RED, 52)
        return cv.done()
    return fn

def short_indy():
    s = section(1)
    t_ind, t_prac, t_mich, t_none, t_sun, t_14, t_six, t_boo, t_ms, t_mon, t_two = (T(s, x) for x in ("Indianapolis, 2005", "In practice", "Michelin, who",
        "And they had no", "So on Sunday", "Then fourteen", "Six cars raced", "The crowd booed", "Michael Schumacher won", "And a Jordan", "Two years later"))
    scenes = [VGraphic(0, countdown(0)),
              VPhoto(t_ind, INDY, ((0.45, 0.5), (0.6, 0.5)), (1.0, 1.12)),
              VPhoto(t_prac, R25, ((0.5, 0.5), (0.5, 0.45)), (1.0, 1.15)),
              VGraphic(t_mich - 0.1, tyres()),
              VGraphic(t_sun - 0.1, pits()),
              VPhoto(t_six, MSC, ((0.5, 0.45), (0.55, 0.45)), (1.0, 1.12)),
              VPhoto(t_boo, INDY, ((0.7, 0.5), (0.4, 0.5)), (1.1, 1.2)),
              VPhoto(t_ms, MSC_W, ((0.5, 0.4), (0.5, 0.35)), (1.0, 1.1)),
              VPhoto(t_mon, MONT, ((0.45, 0.5), (0.55, 0.5)), (1.0, 1.12)),
              VPhoto(t_two, INDY, ((0.3, 0.5), (0.5, 0.5)), (1.05, 1.18))]
    ov = [Pop(0, ["ONLY SIX CARS", "STARTED"], t_ind - 0.2, y=280, size=110),
          Tag(t_ind + 0.3, "UNITED STATES GRAND PRIX", sub="INDIANAPOLIS  ·  19 JUNE 2005", dur=t_prac - t_ind - 0.4),
          Pop(t_prac, ["FRIDAY: A BIG CRASH", "IN THE BANKING"], t_mich - t_prac - 0.1, y=280, size=88),
          Stamp(t_none + 0.3, "NO SAFE TYRE", (SW / 2, 400), t_sun - t_none - 0.4, 100),
          Pop(t_six, ["2 FERRARIS · 2 JORDANS", "2 MINARDIS"], t_boo - t_six - 0.1, y=280, size=76),
          Stamp(t_boo + 0.2, "BOOED", (SW / 2, 820), t_ms - t_boo - 0.3, 130),
          Tag(t_ms + 0.3, "MICHAEL SCHUMACHER", sub="WINNER  ·  FERRARI", dur=t_mon - t_ms - 0.4),
          Tag(t_mon + 0.3, "TIAGO MONTEIRO", sub="3RD  ·  JORDAN  ·  HIS ONLY PODIUM", dur=t_two - t_mon - 0.4),
          Pop(t_two, ["LAST F1 RACE", "AT INDY: 2007"], 99, y=280, size=100)]
    return dict(n=2, name="F1-8 The race with only six cars", s=s, scenes=scenes, ov=ov, line="OMNIRA F1  ·  DID YOU KNOW?",
                slate=("Should it have gone ahead with six cars?", "FOLLOW FOR MORE F1 STORIES"), music=[MUS + "Energetic/LaFaye - Hidden.mp3"])

# ================================================================ F1-9: Surtees, on this day
def titles():
    """Seven motorbike world titles, by year."""
    rows = [("500cc", ["1956", "1958", "1959", "1960"]), ("350cc", ["1958", "1959", "1960"])]
    def fn(t, dur):
        cv = Canvas(S56, 0.74); d = ImageDraw.Draw(cv.L)
        title(d, 600, "JOHN SURTEES  ·  MV AGUSTA", ramp(t, 0, 0.3), 44)
        k = 0
        for i, (cls, yrs) in enumerate(rows):
            y = 760 + i * 280
            tracked(d, (120, y - 64), cls.upper(), cond(50, 8), rgba(CREAM, ramp(t, 0.2, 0.5)), 8)
            for j, yr in enumerate(yrs):
                p = ramp(t, 0.4 + k * 0.22, 0.7 + k * 0.22); k += 1
                if not p: continue
                x = 120 + j * 215
                d.rounded_rectangle((x, y, x + 195, y + 130), 16, fill=rgba(GOLD, 0.95 * p))
                centred(d, (x + 97, y + 65), yr, cond(52, 8), rgba(NAVY_D, p))
        c = ramp(t, 2.2, 2.6)
        if c: chip(d, (SW / 2, 1400), "7 WORLD TITLES ON TWO WHEELS", c, GOLD, 50)
        return cv.done()
    return fn

def standings(bg, rows, head, t0, chip_at=None, chip_txt=""):
    def fn(t, dur):
        cv = Canvas(bg, 0.74); d = ImageDraw.Draw(cv.L)
        title(d, 600, head, ramp(t, 0, 0.3), 44)
        for i, (n, team, pts, col, k) in enumerate(rows):
            p = ramp(t, k, k + 0.3)
            if not p: continue
            y = 740 + i * 220; g = ease(ramp(t, k, k + 1.0)); w = 760 * pts / 40 * g
            tracked(d, (130, y - 56), n, cond(52, 8), rgba(CREAM, p), 8)
            tracked(d, (130 + cond(52, 8).getlength(n) + 8 * len(n) + 24, y - 48), team, cond(34, 8), rgba(col, p), 6)
            d.rounded_rectangle((130, y, 130 + max(w, 12), y + 120), 14, fill=rgba(col, 0.92 * p))
            stroke_text(d, (130 + max(w, 12) - 24, y + 10), str(round(pts * g)), pf(90, 900), rgba(NAVY_D if col != NART_BLUE else CREAM, p), "right", sw=0)
        if chip_at is not None and ramp(t, chip_at, chip_at + 0.4): chip(d, (SW / 2, 1290), chip_txt, ramp(t, chip_at, chip_at + 0.4), GOLD, 56)
        return cv.done()
    return fn

def livery():
    """Red crossed out, blue and white in."""
    def fn(t, dur):
        cv = Canvas(F158, 0.7); d = ImageDraw.Draw(cv.L)
        title(d, 600, "FERRARI  ·  MEXICO 1964", ramp(t, 0, 0.3), 46)
        a = ramp(t, 0.2, 0.5)
        d.rounded_rectangle((150, 740, 470, 1060), 24, fill=rgba(FERRARI, a), outline=rgba(CREAM, a), width=4)
        x = ramp(t, 0.8, 1.1)
        if x:
            d.line([(170, 760), (170 + 280 * x, 760 + 280 * x)], fill=rgba(CREAM, x), width=16)
            d.line([(450, 760), (450 - 280 * x, 760 + 280 * x)], fill=rgba(CREAM, x), width=16)
        b = ramp(t, 1.4, 1.8)
        if b:
            d.rounded_rectangle((610, 740, 930, 1060), 24, fill=rgba(WHITE, b), outline=rgba(CREAM, b), width=4)
            d.rounded_rectangle((610, 740, 770, 1060), 24, fill=rgba(NART_BLUE, b))
            d.rectangle((740, 740, 770, 1060), fill=rgba(NART_BLUE, b))
        tracked(d, (310, 1090), "RED", cond(40, 8), rgba(CREAM, a), 8, "center")
        tracked(d, (770, 1090), "BLUE + WHITE", cond(40, 8), rgba(CREAM, b), 8, "center")
        c = ramp(t, 2.4, 2.8)
        if c: chip(d, (SW / 2, 1300), "NORTH AMERICAN RACING TEAM", c, GOLD, 48)
        return cv.done()
    return fn

def short_surtees():
    s = section(2)
    t_js, t_now, t_three, t_hill, t_clark, t_tm, t_red, t_enzo, t_61 = (T(s, x) for x in ("John Surtees had", "Now, at the last", "Three drivers",
        "Hill was knocked", "Then Clark", "And the team-mate", "Oh, and his", "Enzo Ferrari", "Sixty-one years on"))
    before = [("HILL", "BRM", 39, GREEN, 0.2), ("SURTEES", "FERRARI", 34, FERRARI, 0.6), ("CLARK", "LOTUS", 30, (240, 200, 60), 1.0)]
    after = [("SURTEES", "FERRARI", 40, FERRARI, 0.2), ("HILL", "BRM", 39, GREEN, 0.5)]
    scenes = [VPhoto(0, SMV, ((0.5, 0.45), (0.55, 0.45)), (1.0, 1.15)),
              VGraphic(t_js - 0.1, titles()),
              VPhoto(t_now, S64, ((0.5, 0.45), (0.5, 0.4)), (1.0, 1.12)),
              VGraphic(t_three - 0.1, standings(START64, before, "BEFORE THE LAST RACE", 0)),
              VPhoto(t_hill, START64, ((0.5, 0.5), (0.45, 0.5)), (1.05, 1.18)),
              VPhoto(t_clark, CLARK, ((0.5, 0.5), (0.55, 0.5)), (1.0, 1.15)),
              VGraphic(t_tm - 0.1, standings(S64, after, "FINAL STANDINGS  ·  1964", 0, 1.4, "BY ONE POINT")),
              VGraphic(t_red - 0.1, livery()),
              VPhoto(t_61, F158G, ((0.5, 0.5), (0.5, 0.45)), (1.0, 1.12))]
    ov = [Pop(0, ["25 OCTOBER", "1964"], t_js - 0.2, y=280, size=120),
          Tag(t_now + 0.3, "JOHN SURTEES", sub="FERRARI  ·  1964", dur=t_three - t_now - 0.4),
          Stamp(t_hill + 0.6, "HILL: HIT FROM BEHIND", (SW / 2, 1220), t_clark - t_hill - 0.7, 76),
          Stamp(t_clark + 0.6, "CLARK: ENGINE GONE", (SW / 2, 1220), t_tm - t_clark - 0.7, 80, rot=7),
          Pop(t_enzo, ["ENZO v THE", "ITALIAN AUTHORITIES"], t_61 - t_enzo - 0.1, y=280, size=80),
          Pop(t_61, ["CHAMPION ON TWO", "WHEELS AND FOUR"], 99, y=280, size=90)]
    return dict(n=3, name="F1-9 Surtees, champion on two wheels and four", s=s, scenes=scenes, ov=ov, line="OMNIRA F1  ·  ON THIS DAY",
                slate=("Which MotoGP rider would you put in an F1 car?", "FOLLOW FOR MORE F1 STORIES"), music=[MUS + "Energetic/ANBR - Seasons.mp3"])

ALL = [short_cota, short_indy, short_surtees]

def job(k):
    j = ALL[k - 1](); os.makedirs(OUT, exist_ok=True); out = OUT + f"{j['name']}.mp4"
    return out, round(V.render(out, NA, j["s"], j["scenes"], j["ov"], j["line"], j["slate"], j["music"]), 1)

def sheet(k):
    j = ALL[k - 1](); s = j["s"]; body = s[-1]["out_end"] - s[0]["out_start"]
    scenes = sorted(j["scenes"], key=lambda x: x.start)
    for a, b in zip(scenes, scenes[1:]): a.dur = b.start - a.start
    scenes[-1].dur = body - scenes[-1].start
    ts = [x.start + f * x.dur for x in scenes for f in (0.15, 0.5, 0.9)] + [body + 1.0]
    caps = V.chunks([(t - s[0]["out_start"], w) for t, w in V.caption_words(NA, s)])
    ims = [V.compose(scenes, j["ov"], caps, j["line"], j["slate"], t, body, body + V.SLATE).convert("RGB").resize((270, 480)) for t in ts]
    g = Image.new("RGB", (270 * 8, 480 * math.ceil(len(ims) / 8)))
    for i, im in enumerate(ims):
        ImageDraw.Draw(im).text((4, 4), f"{ts[i]:.1f}", fill=(255, 255, 0)); g.paste(im, ((i % 8) * 270, (i // 8) * 480))
    os.makedirs(R + "sheets", exist_ok=True); g.save(R + f"sheets/short{k}.jpg", quality=82); return R + f"sheets/short{k}.jpg"

if __name__ == "__main__":
    args = sys.argv[1:]; mode = "sheet" if args and args[0] == "sheet" else "render"
    pick = [int(x) for x in args if x.isdigit()] or range(1, len(ALL) + 1)
    V.caption_words(NA, SENTS)          # Whisper (MLX) hangs inside forked workers: fill the cache here first
    with mp.get_context("fork").Pool(len(pick)) as pool:
        for r in pool.map(sheet if mode == "sheet" else job, pick): print(r)
