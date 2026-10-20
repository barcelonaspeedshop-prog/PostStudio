"""Standalone Shorts, batch 1: six vertical Shorts from one recording (script.md) -> PostDrive/Shorts/batch01/video/

    ~/.venvs/poststudio/bin/python docs/shorts/batch01/build.py            # all six
    ~/.venvs/poststudio/bin/python docs/shorts/batch01/build.py 1 4        # just those
    ~/.venvs/poststudio/bin/python docs/shorts/batch01/build.py sheet      # contact sheets (every scene, 3 frames) instead
"""
import math, os, sys, json, multiprocessing as mp
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, "..", "..", "..")
sys.path.insert(0, os.path.join(ROOT, "studio")); sys.path.insert(0, os.path.join(ROOT, "docs", "videos", "05-brawn-gp"))
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
import vshort as V
from vshort import VPhoto, VWide, VGraphic, Pop, Tag, Stamp, SW, SH, stroke_text, blur_cover
from storykit import pf, cond, ramp, ease, rgba, tracked, wrap, load, NAVY_D, GOLD, CREAM, RED

B1 = "/Volumes/PostDrive/Shorts/batch01/"; NA = B1 + "audio/edit/"; M = B1 + "conv/"; C = B1 + "commons/"
OUT = B1 + "video/"
IMP = "/Volumes/PostDrive/Stories/IMPOSSIBLE series/"
BR = IMP + "01 Brawn GP/media/"; IST = IMP + "02 Istanbul/media/"
MUS = "/Volumes/PostDrive/Music/"
SENTS = json.load(open(NA + "sentences.json"))
GREEN, BLUE = (70, 190, 110), (90, 170, 255)

def section(k): return [s for s in SENTS if s["section"] == k]
def T(sents, snip, off=0.0):
    """Seconds from the Short's first word to the start of the sentence containing snip."""
    s = next(s for s in sents if snip.lower() in s["text"].lower())
    return round(s["out_start"] - sents[0]["out_start"] + off, 3)
def E(sents, snip, off=0.0):
    s = next(s for s in sents if snip.lower() in s["text"].lower())
    return round(s["out_end"] - sents[0]["out_start"] + off, 3)

# ---------------------------------------------------------------- shared drawing bits
def bg_of(path, dark=0.62):
    return blur_cover(path, dark).copy()

def chip(d, xy, text, a, col=GOLD, size=46, fill=NAVY_D):
    x, y = xy; f = cond(size, 8); w = f.getlength(text) + 6 * len(text) + 40
    b = f.getbbox("H"); cap = b[3] - b[1]; pad = 0.42 * size                  # box centred on the capitals
    d.rounded_rectangle((x - w / 2, y - pad, x + w / 2, y + cap + pad), 10, fill=rgba(fill, 0.88 * a), outline=rgba(col, a), width=3)
    tracked(d, (x, y), text, f, rgba(col, a), 6, "center")

def title(d, y, text, a, size=50, col=GOLD):
    tracked(d, (SW / 2, y), text, cond(size, 8), rgba(col, a), 8, "center")

def arrow(d, p0, p1, a, col=GOLD, w=7, head=24):
    if a <= 0: return
    d.line([p0, p1], fill=rgba(col, a), width=w)
    ang = math.atan2(p1[1] - p0[1], p1[0] - p0[0])
    pts = [p1, (p1[0] - head * math.cos(ang - 0.45), p1[1] - head * math.sin(ang - 0.45)),
           (p1[0] - head * math.cos(ang + 0.45), p1[1] - head * math.sin(ang + 0.45))]
    d.polygon(pts, fill=rgba(col, a))

def tick(d, c, r, a, ok):
    x, y = c
    if ok:
        d.ellipse((x - r, y - r, x + r, y + r), fill=rgba(GREEN, a))
        d.line([(x - r * 0.45, y + r * 0.02), (x - r * 0.1, y + r * 0.38), (x + r * 0.5, y - r * 0.35)], fill=rgba(CREAM, a), width=8, joint="curve")
    else:
        d.ellipse((x - r, y - r, x + r, y + r), fill=rgba(RED, a))
        k = r * 0.42
        d.line([(x - k, y - k), (x + k, y + k)], fill=rgba(CREAM, a), width=8); d.line([(x - k, y + k), (x + k, y - k)], fill=rgba(CREAM, a), width=8)

# ---------------------------------------------------------------- F1-1: the airflow drawing from the Brawn episode
def airflow_short(s):
    import airflow as A
    c = {"Start with the floor": -1.5, "Air rushing under": 0.3, "And fast-moving air": T(s, "Squeezed air", 1.6) - T(s, "Air rushes"),
         "So you've got normal": T(s, "So the normal") - T(s, "Air rushes"), "It's the same trick": 999,
         "But there's a catch": T(s, "The trick is") - T(s, "Air rushes"), "That's the diffuser's job": T(s, "the ramp under", 0.4) - T(s, "Air rushes"),
         "It gives the air room": 999, "Think of it as": 999, "The bigger the diffuser": T(s, "Bigger diffuser") - T(s, "Air rushes")}
    return A.diffuser_scene(BR + "ai/ai_cutaway_side.png", lambda k: c[k])

# ---------------------------------------------------------------- F1-2: the plank, its titanium skids, and the ruler
def plank_graphic(s, t0):
    tk = {k: T(s, k) - t0 for k in ["Set into it", "When the car", "But the plank", "It's a ruler", "Teams want", "Wear it down"]}
    GY = 1060                                                                  # the road
    def fn(t, dur):
        im = bg_of(M + "F1-2_3.jpg", 0.78); d = ImageDraw.Draw(im)
        for x in range(0, SW, 60): d.line([(x, 640), (x, 1440)], fill=rgba(CREAM, 0.05))
        for y in range(640, 1440, 60): d.line([(0, y), (SW, y)], fill=rgba(CREAM, 0.05))
        sq = ramp(t, tk["When the car"], tk["When the car"] + 0.8) * (1 - ramp(t, tk["But the plank"], tk["But the plank"] + 0.6))
        dy = 14 * sq; spd = 1 + 5 * sq
        for k in range(14):                                                    # the road moving underneath
            x = (k * 120 + t * 260 * spd) % (SW + 120) - 60
            d.line([(x, GY + 6), (x + 50, GY + 6)], fill=rgba(CREAM, 0.35), width=4)
        d.line([(0, GY), (SW, GY)], fill=rgba(CREAM, 0.6), width=3)
        fl = GY - 30 + dy                                                      # floor underside
        body = [(70, fl - 6), (150, fl - 40), (330, fl - 70), (470, fl - 92), (520, fl - 170), (600, fl - 190), (690, fl - 150),
                (820, fl - 120), (930, fl - 115), (930, fl - 250), (1010, fl - 250), (1010, fl), (70, fl)]
        d.polygon(body, fill=rgba((34, 40, 58), 1), outline=rgba(CREAM, 0.8))
        d.line([(150, fl), (960, fl)], fill=rgba(CREAM, 0.9), width=4)
        for cx, r in ((235, 62), (865, 68)):
            d.ellipse((cx - r, GY - 2 * r + dy * 0.2, cx + r, GY + dy * 0.2), fill=rgba((20, 20, 24), 1), outline=rgba(CREAM, 0.7), width=4)
        pa = ramp(t, 0.2, 0.8)                                                 # the plank
        if pa:
            d.rectangle((330, fl, 330 + 430 * ease(pa), fl + 12), fill=rgba((176, 122, 62), 1))
            if t < tk["Set into it"]:
                chip(d, (450, 1180), "THE PLANK", pa); arrow(d, (450, 1172), (450, fl + 18), pa)
        sk = ramp(t, tk["Set into it"], tk["Set into it"] + 0.6)               # titanium skids
        for x in (380, 540, 700):
            if sk: d.rectangle((x, fl + 10, x + 30, fl + 16), fill=rgba((205, 210, 220), sk))
        if tk["Set into it"] <= t < tk["When the car"]:
            chip(d, (640, 1180), "TITANIUM BLOCKS", sk, CREAM); arrow(d, (640, 1172), (555, fl + 20), sk, CREAM)
        if sq > 0.3:                                                           # sparks streaming back
            rng = np.random.default_rng(int(t * 25))
            for x in (380, 540, 700):
                for j in range(26):
                    u = rng.random(); L = 40 + 180 * u
                    px, py = x + 30 + L, fl + 14 - 70 * u * rng.random()
                    col = (255, int(200 + 55 * rng.random()), int(80 + 120 * rng.random()))
                    d.line([(x + 30 + L * 0.4, fl + 14 - 30 * u * 0.4), (px, py)], fill=rgba(col, sq * (1 - u * 0.6)), width=3)
            for k in range(5):
                x = 200 + k * 160; yy = 700 + 30 * math.sin(t * 6 + k)
                arrow(d, (x, yy), (x, yy + 90), sq * 0.9, CREAM, 6, 22)
            chip(d, (SW / 2, 1180), "SQUASHED DOWN AT SPEED", sq, CREAM)
        ra = ramp(t, tk["But the plank"] + 0.3, tk["But the plank"] + 0.9)    # the ruler: a cross-section of the plank
        if ra:
            x0, x1, y0, mm = 240, 840, 1150, 10
            wear = 0.4 * ramp(t, tk["Teams want"] + 1.0, tk["Teams want"] + 3.5) + 1.3 * ramp(t, tk["Wear it down"], tk["Wear it down"] + 1.2)
            th = mm * (1 - wear / 10); bad = th < 9
            d.rounded_rectangle((x0 - 150, y0 - 70, x1 + 160, y0 + 230), 14, fill=rgba(NAVY_D, 0.92 * ra), outline=rgba(GOLD, ra), width=3)
            d.rectangle((x0, y0, x1, y0 + th * 14), fill=rgba(RED if bad else (176, 122, 62), ra))
            for i in range(11):
                y = y0 + i * 14; d.line([(x0 - 40, y), (x0 - (22 if i % 5 else 6), y)], fill=rgba(CREAM, ra), width=3)
            tracked(d, (x0 - 60, y0 + 40), "10 MM", cond(34, 8), rgba(CREAM, ra), 2, "right")
            ly = y0 + 9 * 14
            for x in range(x0 - 10, x1 + 20, 30): d.line([(x, ly), (x + 16, ly)], fill=rgba(GOLD, ra), width=4)
            tracked(d, (x1 + 30, ly - 14), "9 MM", cond(34, 8), rgba(GOLD, ra), 2)
            msg = "WORN TOO THIN: OUT" if bad else ("MEASURED AFTER THE RACE" if t >= tk["Teams want"] + 1 else "IT'S A RULER")
            title(d, y0 + 180, msg, ra, 44, RED if bad else GOLD)
        return im
    return fn

# ---------------------------------------------------------------- F1-3: why four small front wheels (top view)
def p34_graphic(s, t0):
    tk = {k: T(s, k) - t0 for k in ["Small front wheels", "Four of them"]}
    def fn(t, dur):
        im = bg_of(C + "Tyrrell_P34_at_Goodwood_2012.jpg", 0.8); d = ImageDraw.Draw(im)
        m = ramp(t, tk["Small front wheels"] + 0.3, tk["Small front wheels"] + 1.6)        # morph: normal car -> P34
        g = ramp(t, tk["Four of them"], tk["Four of them"] + 0.6)
        cx = SW / 2; WX0, WX1, WY = 330, 750, 610
        d.polygon([(cx - 40, 560), (cx + 40, 560), (cx + 95, 820), (cx + 120, 1120), (cx + 90, 1330), (cx - 90, 1330),
                   (cx - 120, 1120), (cx - 95, 820)], fill=rgba((40, 90, 190), 1), outline=rgba(CREAM, 0.8))
        d.rectangle((cx - 160, 1300, cx + 160, 1350), fill=rgba((40, 90, 190), 1), outline=rgba(CREAM, 0.8))   # rear wing
        for sx in (-1, 1):                                                                 # rear wheels
            x = cx + sx * 215; d.rounded_rectangle((x - 55, 1110, x + 55, 1290), 14, fill=rgba((18, 18, 22), 1), outline=rgba(CREAM, 0.6), width=3)
        fronts = []
        for sx in (-1, 1):
            big = (cx + sx * 255, 720, 50, 75)                                             # centre x, centre y, half w, half h
            for k, yc in enumerate((690, 820)):
                sm = (cx + sx * 160, yc, 28, 50)
                fronts.append(tuple(b + (q - b) * ease(m) for b, q in zip(big, sm)))
        for (x, y, hw, hh) in fronts:
            col = GOLD if g else CREAM
            d.rounded_rectangle((x - hw, y - hh, x + hw, y + hh), 10, fill=rgba((18, 18, 22), 1), outline=rgba(col, 0.6 + 0.4 * g), width=3 + 3 * int(g > 0))
        d.rectangle((WX0, WY - 22, WX1, WY + 22), fill=rgba((40, 90, 190), 1), outline=rgba(CREAM, 0.9), width=3)   # front wing
        exposed = lambda x: (x < WX0 or x > WX1) and abs(abs(x - cx) - 255) < 60 * (1 - m)
        for k in range(17):                                                                # air coming at the car
            x = 150 + k * 48
            for j in range(6):
                y = (t * 520 + j * 150 + k * 37) % 900 + 380
                if exposed(x) and y > 640:
                    wob = 26 * math.sin(y / 18 + k); a = max(0, 1 - (y - 640) / 400)
                    d.ellipse((x + wob - 9, y - 9, x + wob + 9, y + 9), outline=rgba(RED, a), width=3)
                else:
                    if WX0 - 10 < x < WX1 + 10 and 570 < y < 660: continue                  # over the wing
                    d.line([(x, y), (x, y + 34)], fill=rgba(BLUE if m > 0.5 else CREAM, 0.75), width=4)
        if m < 0.2 and t < tk["Small front wheels"] + 0.3:
            chip(d, (SW / 2, 1420), "BIG WHEELS STICK OUT: DRAG", 1 - m * 5, RED)
        elif g == 0:
            chip(d, (SW / 2, 1420), "HIDDEN BEHIND THE WING", m, BLUE)
        else:
            chip(d, (SW / 2, 1420), "FOUR TYRES ON THE ROAD, NOT TWO", g, GOLD)
        return im
    return fn

# ---------------------------------------------------------------- football: penalty shootout tally
def shootout(bgpath, head, teams, kicks, result, dur_kicks):
    """kicks: [(row 0/1, scored)], in order. They land evenly over dur_kicks, then the result."""
    def fn(t, dur):
        im = bg_of(bgpath, 0.7); d = ImageDraw.Draw(im)
        a = ramp(t, 0, 0.35)
        title(d, 640, head, a, 50)
        for r, name in enumerate(teams):
            y = 800 + r * 190; tracked(d, (70, y - 22), name, cond(56, 8), rgba(CREAM, a), 4)
            for i in range(5): d.ellipse((440 + i * 118 - 44, y - 44 + 28, 440 + i * 118 + 44, y + 44 + 28), outline=rgba(CREAM, 0.35 * a), width=3)
        step = dur_kicks / len(kicks); n = [0, 0]
        for k, (r, ok) in enumerate(kicks):
            tk = 0.3 + k * step; p = ramp(t, tk, tk + 0.18)
            if p:
                y = 800 + r * 190 + 28; x = 440 + n[r] * 118; rr = 44 * (1 + 0.5 * (1 - p))
                tick(d, (x, y), rr, p, ok)
            n[r] += 1
        ra = ramp(t, 0.3 + dur_kicks, 0.6 + dur_kicks)
        if ra: chip(d, (SW / 2, 1200), result, ra, GOLD, 64)
        return im
    return fn

def split_1984_2005(top, bottom):
    def fn(t, dur):
        im = bg_of(top, 0.75); p = ease(min(1, t / max(dur, 0.1)))
        for k, (path, y0, lab) in enumerate(((top, 330, "ROME 1984"), (bottom, 900, "ISTANBUL 2005"))):
            src = load(path); w, h = src.size; ww, wh = SW - 80, 540; a = ww / wh
            bw, bh = (h * a, h) if w / h > a else (w, w / a); z = 1 + 0.08 * p; bw, bh = bw / z, bh / z
            x0, y0s = (w - bw) / 2, (h - bh) * (0.35 if k else 0.3)
            pic = src.transform((ww, wh), Image.EXTENT, (x0, y0s, x0 + bw, y0s + bh), Image.BICUBIC)
            sl = 1 - ease(ramp(t, 0.15 * k, 0.15 * k + 0.4)); im.paste(pic, (40 + int((1 if k else -1) * 300 * sl), y0))
            chip(ImageDraw.Draw(im), (SW / 2, y0 + wh - 70), lab, ramp(t, 0.3 + 0.15 * k, 0.6 + 0.15 * k))
        return im
    return fn

def scoreboard(s, t0):
    g = [0.3] + [T(s, "Two goals for AC Milan", 0.4) - t0 + k * 0.8 for k in range(2)]
    def fn(t, dur):
        im = bg_of(IST + "commons/Istanbul_Atat_rk_Olympic_Stadium_1.jpg", 0.72); d = ImageDraw.Draw(im)
        a = ramp(t, 0, 0.3); n = sum(t >= x for x in g)
        d.rounded_rectangle((70, 640, SW - 70, 800), 16, fill=rgba(NAVY_D, 0.92 * a), outline=rgba(GOLD, a), width=3)
        tracked(d, (110, 690), "LIVERPOOL", cond(58, 8), rgba(CREAM, a), 4)
        tracked(d, (SW - 110, 690), "MILAN", cond(58, 8), rgba(CREAM, a), 4, "right")
        stroke_text(d, (SW / 2, 676), f"0 – {n}", pf(84, 800), rgba(GOLD, a), sw=0)
        chip(d, (SW / 2, 830), "ISTANBUL 2005 · FIRST HALF", a, CREAM, 36)
        for k, (mn, who) in enumerate((("1'", "MALDINI"), ("39'", "CRESPO"), ("44'", "CRESPO"))):
            p = ramp(t, g[k], g[k] + 0.3)
            if p:
                y = 950 + k * 150; col = GOLD if who == "CRESPO" else CREAM
                d.rounded_rectangle((150 - 40 * (1 - p), y - 24, SW - 150, y + 100), 12, fill=rgba(NAVY_D, 0.85 * p))
                tracked(d, (330 - 40 * (1 - p), y), mn, cond(76, 8), rgba(col, p), 4, "right")
                tracked(d, (380 - 40 * (1 - p), y), who, cond(76, 8), rgba(col, p), 8)
        if t >= g[2] + 0.6: chip(d, (SW / 2, 1400), "HALF-TIME: 3–0", ramp(t, g[2] + 0.6, g[2] + 0.9), GOLD, 52)
        return im
    return fn

def loan_graphic(s, t0):
    tl = T(s, "He was on loan") - t0
    def fn(t, dur):
        im = bg_of(M + "FB_2_1.jpg", 0.7); d = ImageDraw.Draw(im); a = ramp(t, 0, 0.3)
        for x, name, col in ((270, "CHELSEA", (30, 70, 160)), (810, "MILAN", (170, 20, 30))):
            d.rounded_rectangle((x - 200, 700, x + 200, 860), 18, fill=rgba(col, a), outline=rgba(CREAM, a), width=4)
            tracked(d, (x, 752), name, cond(60, 8), rgba(CREAM, a), 6, "center")
        p = ramp(t, tl, tl + 0.8)
        if p:
            arrow(d, (360, 940), (360 + 360 * ease(p), 940), p, GOLD, 9, 30)
            chip(d, (SW / 2, 1010), "ON LOAN · 2004–05", p)
        src = load(M + "FB_2_1.jpg"); ph = src.resize((560, 420), Image.LANCZOS)
        im.paste(ph, (int(SW / 2 - 280), 1090 + int(40 * (1 - ramp(t, 0.1, 0.5)))))
        return im
    return fn

def semifinal(s, t0):
    tw = T(s, "Liverpool.") - t0
    def fn(t, dur):
        im = bg_of(IST + "commons/Kop_of_Anfield_Liverpool.jpg", 0.72); d = ImageDraw.Draw(im); a = ramp(t, 0, 0.3)
        title(d, 640, "CHAMPIONS LEAGUE SEMI-FINAL 2005", a, 44)
        w = ramp(t, tw, tw + 0.4)
        for k, (name, col) in enumerate((("CHELSEA", (30, 70, 160)), ("LIVERPOOL", (190, 20, 40)))):
            y = 760 + k * 200; out = k == 0 and w > 0
            d.rounded_rectangle((120, y, 760, y + 150), 16, fill=rgba(tuple(int(c * (1 - 0.6 * w)) for c in col) if out else col, a),
                                outline=rgba(GOLD if (k == 1 and w) else CREAM, a), width=4 + 4 * int(k == 1 and w > 0))
            tracked(d, (160, y + 48), name, cond(66, 8), rgba(CREAM, a * (0.5 if out else 1)), 6)
            for j, sc in enumerate(("0", "0") if k == 0 else ("0", "1")):
                tracked(d, (840 + j * 110, y + 48), sc, cond(66, 8), rgba(GOLD if (k == 1 and j == 1) else CREAM, a), 4, "center")
        for j, lab in enumerate(("1ST", "2ND")): tracked(d, (840 + j * 110, 712), lab, cond(30, 8), rgba(CREAM, 0.8 * a), 3, "center")
        if w: chip(d, (SW / 2, 1210), "LIVERPOOL THROUGH, 1–0", w, GOLD, 52)
        return im
    return fn

def league_table(s, t0):
    rows = [("1", "CHELSEA", "95"), ("2", "ARSENAL", "83"), ("3", "MAN UTD", "77"), ("4", "EVERTON", "61"), ("5", "LIVERPOOL", "58")]
    def fn(t, dur):
        im = bg_of(M + "FB3.jpg", 0.75); d = ImageDraw.Draw(im); a = ramp(t, 0, 0.3)
        title(d, 600, "PREMIER LEAGUE 2004–05", a, 46)
        for k, (pos, name, pts) in enumerate(rows):
            p = ramp(t, 0.2 + k * 0.25, 0.5 + k * 0.25); y = 700 + k * 120; lv = k == 4
            if not p: continue
            x = 80 + 60 * (1 - p)
            d.rounded_rectangle((x, y, x + 920, y + 100), 12, fill=rgba(RED if lv else NAVY_D, 0.9 * p))
            tracked(d, (x + 40, y + 28), pos, cond(54, 8), rgba(GOLD, p), 2)
            tracked(d, (x + 120, y + 28), name, cond(54, 8), rgba(CREAM, p), 6)
            tracked(d, (x + 880, y + 28), pts, cond(54, 8), rgba(CREAM, p), 2, "right")
        q = ramp(t, 1.8, 2.3)
        if q:
            y = 700 + 4 * 120 - 10
            for x in range(80, 1000, 34): d.line([(x, y), (x + 18, y)], fill=rgba(GOLD, q), width=5)
            chip(d, (SW / 2, 1340), "TOP 4 GO INTO THE CHAMPIONS LEAGUE", q, GOLD, 40)
        return im
    return fn

def ladder(s, t0):
    rounds = ["THE FINAL", "KNOCKOUT ROUNDS", "GROUP STAGE", "3RD QUALIFYING ROUND", "2ND QUALIFYING ROUND", "1ST QUALIFYING ROUND · JULY"]
    def fn(t, dur):
        im = bg_of(IST + "commons/Liverpool_European_Cup.jpg", 0.75); d = ImageDraw.Draw(im)
        for k, r in enumerate(rounds):
            p = ramp(t, 0.1 + k * 0.15, 0.4 + k * 0.15); y = 560 + k * 140; low = k == len(rounds) - 1
            hi = low and ramp(t, 1.4, 1.8)
            d.rounded_rectangle((110, y, SW - 110, y + 110), 12, fill=rgba(RED if hi else NAVY_D, 0.88 * p),
                                outline=rgba(GOLD if hi else CREAM, (0.9 if hi else 0.35) * p), width=3)
            tracked(d, (SW / 2, y + 34), r, cond(46, 8), rgba(CREAM, p), 5, "center")
        if ramp(t, 1.8, 2.2): chip(d, (SW / 2, 1440), "THE HOLDERS STARTED HERE", ramp(t, 1.8, 2.2), GOLD, 46)
        return im
    return fn

def dsq_cards(s, t0):
    def fn(t, dur):
        im = bg_of(C + "FIA_F1_Austria_2023_Nr._16_(4).jpg", 0.7); d = ImageDraw.Draw(im)
        title(d, 600, "UNITED STATES GP 2023", ramp(t, 0, 0.3), 50)
        for k, (name, pos, path) in enumerate((("HAMILTON", "FINISHED 2ND", C + "FIA_F1_Austria_2023_Nr._44_(2).jpg"),
                                                ("LECLERC", "FINISHED 6TH", C + "FIA_F1_Austria_2023_Nr._16_(4).jpg"))):
            p = ramp(t, 0.3 + 0.3 * k, 0.7 + 0.3 * k); y = 700 + k * 380
            if not p: continue
            src = load(path); w, h = src.size; bw, bh = h * 1.0, h * 1.0 * 360 / 420
            fx = 0.5 if k == 0 else 0.3
            x0 = min(max(fx * w - bw / 2, 0), w - bw); pic = src.transform((420, 360), Image.EXTENT, (x0, (h - bh) / 2, x0 + bw, (h + bh) / 2), Image.BICUBIC)
            im.paste(pic, (90 - int(80 * (1 - p)), y))
            tracked(d, (560, y + 90), name, cond(70, 8), rgba(CREAM, p), 6)
            tracked(d, (560, y + 190), pos, cond(44, 8), rgba(GOLD, p), 4)
            if ramp(t, 1.6 + 0.4 * k, 1.8 + 0.4 * k): tracked(d, (560, y + 260), "DISQUALIFIED", cond(50, 8), rgba(RED, 1), 5)
        return im
    return fn

# ---------------------------------------------------------------- the six Shorts
def short_f1_1():
    s = section(0); ta = T(s, "Air rushes")
    scenes = [VPhoto(0, M + "F1-1_3.jpg", ((0.5, 0.55), (0.45, 0.6)), (1.0, 1.15)),
              VWide(ta - 0.2, airflow_short(s), crop=(480, 80, 1920, 1060), cy=900),
              VPhoto(T(s, "In 2009"), BR + "commons/2009_Brawn_BGP_001_Goodwood,_2009_(01).jpg", ((0.5, 0.5), (0.6, 0.55)), (1.0, 1.12))]
    ov = [Pop(0, ["AN F1 CAR IS", "SUCKED ONTO", "THE TRACK"], T(s, "Air rushes") - 0.1, y=250),
          Pop(ta, ["SQUEEZED AIR", "SPEEDS UP"], T(s, "Squeezed") - ta + 1.4, size=84, y=260),
          Pop(T(s, "Squeezed", 1.5), ["FAST AIR =", "LOW PRESSURE"], T(s, "So the normal") - T(s, "Squeezed", 1.5), size=84, y=260),
          Pop(T(s, "So the normal"), ["THE AIR ON TOP", "PUSHES IT DOWN"], T(s, "The trick") - T(s, "So the normal"), size=84, y=260),
          Pop(T(s, "The trick"), ["GET THE FAST AIR", "OUT AT THE BACK"], T(s, "ramp under") - T(s, "The trick"), size=84, y=260),
          Pop(T(s, "ramp under"), ["THE DIFFUSER"], T(s, "Bigger") - T(s, "ramp under"), size=96, y=280),
          Pop(T(s, "Bigger"), ["BIGGER DIFFUSER", "= MORE GRIP"], T(s, "In 2009") - T(s, "Bigger"), size=84, y=260),
          Pop(T(s, "In 2009"), ["2009: ONE TEAM", "FITTED TWO"], 99, size=88, y=260),
          Tag(T(s, "And it won"), "BRAWN GP", sub="WORLD CHAMPIONS 2009", dur=4)]
    return dict(n=1, name="f1_1_sucked_down", s=s, scenes=scenes, ov=ov, line="OMNIRA F1  ·  EXPLAINED",
                slate=("How did they fit two diffusers?", "THE FULL BRAWN GP STORY IS ON THE CHANNEL"), music=[MUS + "Energetic/ANBR - Seasons.mp3"])

def short_f1_2():
    s = section(1); tp = T(s, "Under every car"); t23 = T(s, "In 2023")
    scenes = [VPhoto(0, M + "F1-2_1.jpg", ((0.5, 0.5), (0.5, 0.6)), (1.0, 1.15)),
              VGraphic(tp - 0.1, plank_graphic(s, tp - 0.1)),
              VGraphic(t23, dsq_cards(s, t23))]
    ov = [Pop(0, ["WHY DO F1 CARS", "THROW SPARKS?"], tp - 0.2, y=280),
          Pop(tp, ["A PLANK UNDER", "EVERY CAR"], T(s, "When the car") - tp, size=84, y=300),
          Pop(T(s, "When the car"), ["TITANIUM SCRAPES", "THE TRACK"], T(s, "But the plank") - T(s, "When the car"), size=84, y=300),
          Pop(T(s, "But the plank"), ["JOB TWO:", "IT'S A RULER"], T(s, "Wear it") - T(s, "But the plank"), size=84, y=300),
          Pop(T(s, "Wear it"), ["TOO WORN?", "YOU'RE OUT"], t23 - T(s, "Wear it"), size=88, y=300),
          Stamp(T(s, "One of them", 0.6), "DISQUALIFIED", (SW / 2, 1000), 2.4, 100)]
    return dict(n=2, name="f1_2_sparks", s=s, scenes=scenes, ov=ov, line="OMNIRA F1  ·  EXPLAINED",
                slate=("Was disqualifying Hamilton fair?", "FOLLOW FOR MORE F1, EXPLAINED"), music=[MUS + "Energetic/LaFaye - Hidden.mp3"])

def short_f1_3():
    s = section(2); ti = T(s, "The idea"); t76 = T(s, "In 1976")
    scenes = [VPhoto(0, M + "F1-3_2.jpg", ((0.45, 0.55), (0.55, 0.6)), (1.0, 1.15)),
              VPhoto(T(s, "It was the Tyrrell"), M + "F1-3_3.jpg", ((0.35, 0.5), (0.6, 0.5)), (1.0, 1.08)),
              VPhoto(T(s, "Four tiny wheels"), C + "Tyrrell_P34_at_Goodwood_2012.jpg", ((0.5, 0.75), (0.5, 0.8)), (1.0, 1.08), window=True),
              VGraphic(ti - 0.1, p34_graphic(s, ti - 0.1)),
              VPhoto(t76, M + "F1-3_4.jpg", ((0.5, 0.5), (0.5, 0.45)), (1.0, 1.1)),
              VPhoto(T(s, "But the tiny"), M + "F1-3_1.jpg", ((0.6, 0.6), (0.66, 0.62)), (1.0, 1.12)),
              VPhoto(T(s, "And a few years"), C + "Tyrrell_P34_(52676401947).jpg", ((0.33, 0.7), (0.38, 0.72)), (1.0, 1.1))]
    ov = [Pop(0, ["SIX WHEELS.", "AND IT WON."], T(s, "It was the Tyrrell") - 0.1, y=280, size=104),
          Tag(T(s, "It was the Tyrrell"), "TYRRELL P34", sub="1976–77", dur=3.4),
          Pop(T(s, "Four tiny wheels"), ["4 TINY WHEELS", "AT THE FRONT"], ti - T(s, "Four tiny wheels"), size=84, y=300),
          Pop(ti, ["THE IDEA"], T(s, "Small front") - ti, size=96, y=300),
          Pop(T(s, "Small front"), ["LESS DRAG"], T(s, "Four of them") - T(s, "Small front"), size=96, y=300),
          Pop(T(s, "Four of them"), ["MORE GRIP"], t76 - T(s, "Four of them"), size=96, y=300),
          Pop(t76, ["SWEDEN, 1976", "1ST AND 2ND"], T(s, "But the tiny") - t76, size=88, y=280),
          Tag(t76 + 1.2, "SCHECKTER · DEPAILLER", dur=3.0),
          Pop(T(s, "But the tiny"), ["TYRES MADE", "FOR ONE CAR"], T(s, "And a few years") - T(s, "But the tiny"), size=88, y=280),
          Stamp(T(s, "And a few years", 1.6), "4 WHEELS ONLY", (SW / 2, 1300), 3.5, 100)]
    return dict(n=3, name="f1_3_six_wheels", s=s, scenes=scenes, ov=ov, line="OMNIRA F1  ·  DID YOU KNOW?",
                slate=("Should F1 let teams try ideas this wild again?", "FOLLOW FOR MORE F1 STORIES"), music=[MUS + "Energetic/ANBR - Seasons.mp3"])

def short_fb_1():
    s = section(3); tr = T(s, "Roma miss"); tm = T(s, "Milan miss")
    rome = [(0, False), (1, True), (0, True), (1, False), (0, True), (1, True), (0, True), (1, False), (0, True)]
    ist = [(1, False), (0, True), (1, False), (0, True), (1, True), (0, False), (1, True), (0, True), (1, False)]
    scenes = [VPhoto(0, IST + "ai/ai_keeper_legs.png", ((0.5, 0.6), (0.5, 0.7)), (1.0, 1.15)),
              VPhoto(T(s, "Rome, 1984"), M + "FB_1_1.jpg", ((0.55, 0.45), (0.6, 0.4)), (1.0, 1.12)),
              VPhoto(T(s, "Liverpool's keeper"), M + "FB_1_2.jpg", ((0.72, 0.45), (0.74, 0.4)), (1.0, 1.08)),
              VGraphic(tr - 0.1, shootout(M + "FB_1_1.jpg", "ROME 1984 · PENALTIES", ["LIVERPOOL", "ROMA"], rome, "LIVERPOOL WIN 4–2", 2.6)),
              VPhoto(T(s, "Twenty-one years"), IST + "commons/Istanbul_Atat_rk_Olympic_Stadium_1.jpg", ((0.5, 0.5), (0.55, 0.5)), (1.0, 1.12)),
              VPhoto(T(s, "Jamie Carragher"), IST + "commons/Jamie_Carragher_2005.jpg", ((0.5, 0.35), (0.5, 0.3)), (1.0, 1.1)),
              VPhoto(T(s, "Jamie Carragher", 2.6), IST + "commons/Jerzy_Dudek_2006.jpg", ((0.5, 0.35), (0.5, 0.3)), (1.0, 1.1)),
              VPhoto(T(s, "So he does"), IST + "ai/ai_keeper_legs.png", ((0.45, 0.4), (0.5, 0.55)), (1.15, 1.3)),
              VGraphic(tm - 0.1, shootout(IST + "ai/ai_shootout_behind_goal.png", "ISTANBUL 2005 · PENALTIES", ["MILAN", "LIVERPOOL"],
                                          [(1 - r, ok) for r, ok in ist], "LIVERPOOL WIN 3–2", 2.6)),
              VGraphic(T(s, "Same trick"), split_1984_2005(M + "FB_1_1.jpg", IST + "ai/ai_save.png"))]
    ov = [Pop(0, ["THE KEEPER WHO", "DANCED A FINAL", "AWAY"], T(s, "Rome, 1984") - 0.1, y=250),
          Pop(T(s, "Rome, 1984"), ["ROME, 1984"], T(s, "Liverpool's keeper") - T(s, "Rome, 1984"), size=100, y=300),
          Tag(T(s, "Liverpool against Roma"), "LIVERPOOL v ROMA", sub="IN ROMA'S OWN STADIUM", dur=3.6),
          Tag(T(s, "Liverpool's keeper", 0.4), "BRUCE GROBBELAAR", sub="SPAGHETTI LEGS", dur=4.4),
          Pop(T(s, "Twenty-one years"), ["21 YEARS LATER", "ISTANBUL"], T(s, "Jamie Carragher") - T(s, "Twenty-one years"), size=88, y=280),
          Tag(T(s, "Jamie Carragher", 0.2), "JAMIE CARRAGHER", dur=2.3),
          Tag(T(s, "Jamie Carragher", 2.7), "JERZY DUDEK", sub="DO THE SAME", dur=2.6),
          Pop(T(s, "So he does"), ["SO HE DOES"], tm - T(s, "So he does"), size=100, y=300),
          Pop(tr, ["ROMA MISS", "TWICE"], T(s, "Twenty-one years") - tr, size=96, y=300, colors=[CREAM, RED]),
          Pop(tm, ["MILAN MISS", "THREE"], T(s, "Same trick") - tm, size=96, y=300, colors=[CREAM, RED])]
    return dict(n=4, name="fb_1_dancing_keeper", s=s, scenes=scenes, ov=ov, line="OMNIRA FOOTBALL  ·  DID YOU KNOW?",
                slate=("Best penalty trick you've ever seen?", "THE FULL ISTANBUL STORY IS ON THE CHANNEL"), music=[MUS + "Impossible/Level - The Grey Room _ Density & Time.mp3"])

def short_fb_2():
    s = section(4); tg = T(s, "Hernán"); tl = T(s, "But Crespo"); tw = T(s, "And who had")
    scenes = [VPhoto(0, M + "FB_2_2.jpg", ((0.5, 0.35), (0.5, 0.3)), (1.0, 1.08)),
              VGraphic(tg - 0.1, scoreboard(s, tg - 0.1)),
              VGraphic(tl, loan_graphic(s, tl)),
              VGraphic(tw, semifinal(s, tw)),
              VPhoto(T(s, "The team he"), M + "FB_2_2.jpg", ((0.5, 0.3), (0.5, 0.35)), (1.08, 1.2)),
              VPhoto(T(s, "You probably"), IST + "ai/ai_trophy_fireworks.png", ((0.5, 0.5), (0.5, 0.45)), (1.0, 1.12)),
              VPhoto(T(s, "Crespo's two"), M + "FB_2_1.jpg", ((0.5, 0.4), (0.5, 0.35)), (1.0, 1.1))]
    ov = [Pop(0, ["TWO GOALS IN A", "FINAL... WHILE", "ON LOAN"], tg - 0.1, y=250),
          Tag(tg + 0.2, "HERNÁN CRESPO", sub="AC MILAN", dur=2.6, y=1340),
          Pop(tl, ["NOT REALLY", "A MILAN PLAYER"], tw - tl, size=84, y=300),
          Pop(tw, ["WHO KNOCKED", "CHELSEA OUT?"], T(s, "Liverpool.") - tw, size=88, y=300),
          Pop(T(s, "Liverpool."), ["LIVERPOOL."], T(s, "The team he") - T(s, "Liverpool."), size=110, y=300, colors=[GOLD]),
          Pop(T(s, "The team he"), ["AND NOW HE WAS", "BEATING THEM 3–0"], T(s, "You probably") - T(s, "The team he"), size=84, y=280),
          Pop(T(s, "Liverpool came"), ["3–3.", "WON ON PENALTIES."], T(s, "Crespo's two") - T(s, "Liverpool came"), size=88, y=280),
          Tag(T(s, "And he went"), "BACK TO CHELSEA", sub="2005–06", dur=3.0)]
    return dict(n=5, name="fb_2_crespo_on_loan", s=s, scenes=scenes, ov=ov, line="OMNIRA FOOTBALL  ·  DID YOU KNOW?",
                slate=("Did you know Crespo was on loan?", "THE FULL ISTANBUL STORY IS ON THE CHANNEL"), music=[MUS + "Impossible/Scale The Mountain - Density & Time.mp3"])

def short_fb_3():
    s = section(5); tb = T(s, "But they finished"); tq = T(s, "Liverpool could"); tn = T(s, "Their first")
    scenes = [VPhoto(0, M + "FB3_2.jpg", ((0.5, 0.45), (0.5, 0.4)), (1.0, 1.12)),
              VPhoto(T(s, "Liverpool, 2005"), M + "FB3.jpg", ((0.5, 0.5), (0.5, 0.45)), (1.0, 1.1)),
              VGraphic(tb - 0.1, league_table(s, tb - 0.1)),
              VPhoto(T(s, "UEFA made"), IST + "commons/Liverpool_European_Cup.jpg", ((0.5, 0.45), (0.5, 0.4)), (1.0, 1.12)),
              VGraphic(tq, ladder(s, tq)),
              VPhoto(tn, M + "FB3_3.jpg", ((0.5, 0.5), (0.5, 0.45)), (1.0, 1.15)),
              VPhoto(T(s, "And after that"), IST + "commons/Liverpool_2005_ucl_medal.jpg", ((0.5, 0.5), (0.5, 0.45)), (1.0, 1.12))]
    ov = [Pop(0, ["CHAMPIONS OF", "EUROPE... AND", "NOT ALLOWED IN"], T(s, "Liverpool, 2005") - 0.1, y=250),
          Tag(T(s, "Liverpool, 2005", 0.2), "LIVERPOOL · 2005", sub="CHAMPIONS OF EUROPE", dur=3.6),
          Pop(tb, ["5TH IN THE", "LEAGUE"], T(s, "So under") - tb, size=96, y=300, colors=[CREAM, RED]),
          Stamp(T(s, "So under", 1.6), "NOT QUALIFIED", (SW / 2, 420), 2.4, 96),
          Pop(T(s, "UEFA made"), ["UEFA MADE", "AN EXCEPTION"], tq - T(s, "UEFA made"), size=88, y=280),
          Pop(tq, ["START FROM THE", "VERY BOTTOM"], tn - tq, size=84, y=300),
          Tag(T(s, "The New Saints"), "THE NEW SAINTS", sub="WELSH PREMIER LEAGUE", dur=3.0),
          Pop(T(s, "Liverpool won both"), ["3–0", "AND 3–0"], T(s, "And after that") - T(s, "Liverpool won both"), size=110, y=300),
          Pop(T(s, "And after that"), ["NOW THE HOLDERS", "ALWAYS GET IN"], 99, size=84, y=280)]
    return dict(n=6, name="fb_3_from_the_bottom", s=s, scenes=scenes, ov=ov, line="OMNIRA FOOTBALL  ·  DID YOU KNOW?",
                slate=("Should the holders always get in?", "FOLLOW FOR MORE FOOTBALL STORIES"), music=[MUS + "Impossible/Time to Spare - An Jone.mp3"])

ALL = [short_f1_1, short_f1_2, short_f1_3, short_fb_1, short_fb_2, short_fb_3]

def job(k):
    j = ALL[k - 1](); os.makedirs(OUT, exist_ok=True); out = OUT + f"short_{j['name']}.mp4"
    dur = V.render(out, NA, j["s"], j["scenes"], j["ov"], j["line"], j["slate"], j["music"])
    return out, round(dur, 1), [(type(x).__name__, os.path.basename(getattr(x, "path", "")), round(getattr(x, "upscale", 0), 2))
                                for x in j["scenes"] if getattr(x, "upscale", 0) > 1.4]

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
    os.makedirs(B1 + "sheets", exist_ok=True); g.save(B1 + f"sheets/short{k}.jpg", quality=82); return B1 + f"sheets/short{k}.jpg"

if __name__ == "__main__":
    args = sys.argv[1:]; mode = "sheet" if args and args[0] == "sheet" else "render"
    pick = [int(x) for x in args if x.isdigit()] or range(1, len(ALL) + 1)
    V.caption_words(NA, SENTS)          # Whisper (MLX) hangs inside forked workers: fill the cache here first
    with mp.get_context("fork").Pool(len(pick)) as pool:
        for r in pool.map(sheet if mode == "sheet" else job, pick): print(r)
