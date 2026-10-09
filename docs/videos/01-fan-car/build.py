"""Video 01: The Fan Car. Builds video/fan_car.mp4 from the narration + media.

    ~/.venvs/poststudio/bin/python build.py            # full render -> PostDrive/Stories/01 Fan Car/video/BANNED 01 - The Fan Car.mp4
    ~/.venvs/poststudio/bin/python build.py test.mp4   # full render under another name
    ~/.venvs/poststudio/bin/python build.py 95 125     # preview slice (video seconds)
Scene times below are NARRATION seconds (audio/narration_words.json); V() shifts them
past the silent title card inserted after the cold open.
"""
import json, math, os, subprocess, sys
VDIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(VDIR, "..", "..", "..", "studio"))
from storykit import *

# all media, audio and renders live on the PostDrive; this folder holds only the code and the script
STORY = "/Volumes/PostDrive/Stories/01 Fan Car/"
C, M, G, A, AI = (STORY + p for p in ("media/commons/", "media/mike/", "graphics/", "audio/", "media/ai/"))
OUT = STORY + "video/"
FINAL = "BANNED 01 - The Fan Car.mp4"                      # the one published file; intermediates are deleted after a render
MUSIC, MUSIC_GAIN = "/Volumes/PostDrive/Music/", 0.35     # FanCar1/2.mp3 = Mike's soundtracks
# Scene times are written against the first recording. A new recording (made with
# studio/narration.py, which writes audio/sentences.json) stretches them sentence by sentence.
REF = json.load(open(A + "reference_sentences.json"))
NEW = {e["i"]: e["out_start"] for e in json.load(open(A + "sentences.json"))} if os.path.exists(A + "sentences.json") else None
PAIRS = [(t, NEW[i]) for i, t in REF if NEW and i in NEW]
def warp(t):
    if not PAIRS: return t
    if t <= PAIRS[0][0]: return PAIRS[0][1] + t - PAIRS[0][0]
    for (r0, n0), (r1, n1) in zip(PAIRS, PAIRS[1:]):
        if t < r1: return n0 + (t - r0) * (n1 - n0) / (r1 - r0)
    return PAIRS[-1][1] + t - PAIRS[-1][0]
def unwarp(t):                                   # new narration time -> first-recording time
    if not PAIRS: return t
    if t <= PAIRS[0][1]: return PAIRS[0][0] + t - PAIRS[0][1]
    for (r0, n0), (r1, n1) in zip(PAIRS, PAIRS[1:]):
        if t < n1: return r0 + (t - n0) * (r1 - r0) / (n1 - n0)
    return PAIRS[-1][0] + t - PAIRS[-1][1]
SENTS = json.load(open(A + "sentences.json"))
def sent(snip):
    for e in SENTS:
        if snip.lower() in e["text"].lower(): return e
    raise KeyError(snip)
REF_TITLE, TITLE_LEN = 32.95, 3.0
INTRO = STING_LEN                                     # the BANNED stamp sting runs first; everything else follows it
TITLE_AT = sent("if you only count the races")["out_end"] + 0.3
def V(n): return warp(n) + (TITLE_LEN if n >= REF_TITLE else 0) + INTRO
def S(snip, off=0.0):
    """Video time of a sentence in the current narration (new scenes are anchored to words, not seconds)."""
    t = sent(snip)["out_start"] + off; return t + (TITLE_LEN if t >= TITLE_AT else 0) + INTRO

_cr = {c["file"]: c for c in json.load(open(C + "credits.json"))}
def cc(f):
    c = _cr[f]; a = c["author"].split(" from ")[0].split("/")[0].split("Quelle:")[-1].strip()
    return f"Photo: {a[:40]} · {c['licence']}"
def P(t, f, **kw):
    """Photo from Wikimedia (credited) or Mike's folder."""
    if os.path.exists(C + f): return Photo(V(t), C + f, credit=cc(f), **kw)
    return Photo(V(t), M + f, **kw)
def AIorP(t, ai, fallback, **kw):
    if os.path.exists(AI + ai): return Photo(V(t), AI + ai, credit="AI illustration", **kw)
    return P(t, fallback, **kw)

BP = G + "fan_car_tech_drawing_4k.png"; K = 1.92        # overlay coords are in the 2000-wide preview space
SIDE, TOP, REAR = (200, 15, 3515, 855), (190, 880, 3515, 2430), (55, 2715, 1650, 3510)
def Q(Pm, x, y): return Pm(x * K, y * K)

# ---------------------------------------------------------------- diagram overlays
def ov_tunnels(d, L, t, Pm):
    a = ramp(t, 0.3, 1.0)
    for sgn in (1, -1):
        y = lambda v: v if sgn == 1 else 1730 - v
        poly = [Q(Pm, 1230, y(615)), Q(Pm, 760, y(615)), Q(Pm, 520, y(600)), Q(Pm, 520, y(790)), Q(Pm, 800, y(705)), Q(Pm, 1230, y(690))]
        if a > 0:
            d.polygon(poly, fill=rgba(GOLD, 0.22 * a))
            d.line(poly + [poly[0]], fill=rgba(GOLD, a), width=5)
    label(d, (Q(Pm, 880, 560)[0], Q(Pm, 880, 560)[1] - 40), "VENTURI TUNNELS GO HERE", a, GOLD, 32, "center")
    g = ramp(t, 5.2, 6.4)                                    # the wide flat-12 arrives
    if g > 0:
        cx, cy = Q(Pm, 650, 865); hw = (Q(Pm, 790, 0)[0] - Q(Pm, 500, 0)[0]) / 2; hh = (Q(Pm, 0, 1100)[1] - Q(Pm, 0, 630)[1]) / 2 * (0.35 + 0.65 * g)
        d.rectangle((cx - hw, cy - hh, cx + hw, cy + hh), fill=rgba(RED, 0.45), outline=rgba(RED, 1), width=6)
        label(d, (cx, cy - 18), "FLAT-12", g, CREAM, 40, "center")
        arrow(d, (cx, cy + 40), (cx, cy + hh - 10), g, CREAM, 4); arrow(d, (cx, cy - 40), (cx, cy - hh + 10), g, CREAM, 4)
    s = ramp(t, 9.0, 9.3)
    if s > 0:
        cx, cy = Q(Pm, 650, 865); f = cond(int(96 * (1.5 - 0.5 * s)), 3)
        w = sum(f.getlength(c) for c in "NO ROOM") + 8 * 6
        d.rectangle((cx - w / 2 - 30, cy - 75, cx + w / 2 + 30, cy + 75), fill=rgba(NAVY_D, 0.9 * s), outline=rgba(RED, s), width=8)
        tracked(d, (cx, cy - f.getbbox("H")[3] / 2 + f.getbbox("H")[1] / 2), "NO ROOM", f, rgba(RED, s), 8, "center")

def ov_side(d, L, t, Pm):
    a = ramp(t, 0.3, 1.0)                                    # radiator laid flat on the engine
    if a > 0:
        d.rectangle((*Q(Pm, 580, 160), *Q(Pm, 880, 196)), fill=rgba(GOLD, 0.35 * a), outline=rgba(GOLD, a), width=5)
        x, y = Q(Pm, 730, 160); label(d, (x, y - 70), "RADIATOR", a, GOLD, 34, "center")
    f = ramp(t, 4.2, 5.0)                                    # the fan at the back
    if f > 0:
        cx, cy = Q(Pm, 175, 280); r = 70 * Pm.s * K
        d.ellipse((cx - r * 0.35, cy - r, cx + r * 0.35, cy + r), fill=rgba(RED, 0.5 * f), outline=rgba(RED, f), width=6)
        label(d, (130, 230), "FAN  ·  DRIVEN FROM THE GEARBOX", f, RED, 34, "left")
        arrow(d, (300, 280), (cx, cy - r - 10), f, RED, 4, 14)
    c = ramp(t, 9.4, 10.2) * (1 - 0.7 * ramp(t, 20.6, 21.5))  # cooling air: in the top, through the radiator, out the fan
    flow(d, [Q(Pm, 1000, 110), Q(Pm, 880, 150), Q(Pm, 700, 178), Q(Pm, 560, 215), Q(Pm, 330, 255), Q(Pm, 175, 280), Q(Pm, 40, 280)], t, c, CREAM, 16, 0.32, 7)
    label(d, Q(Pm, 1000, 40), "COOLING", c, CREAM, 30)
    o = min(ramp(t, 11.5, 12.0), 1 - ramp(t, 14.2, 14.6))
    if o > 0:
        x, y = Q(Pm, 1250, 120); tracked(d, (x, y), "“THE OFFICIAL STORY”", cond(44, 3), rgba(GOLD, o), 6)
    u = ramp(t, 14.6, 15.4) * (1 + 0.6 * ramp(t, 20.6, 21.5))  # air from under the car
    flow(d, [Q(Pm, 1260, 378), Q(Pm, 900, 376), Q(Pm, 600, 370), Q(Pm, 480, 340), Q(Pm, 300, 300), Q(Pm, 175, 285), Q(Pm, 40, 285)], t, min(1, u), RED, int(14 + 10 * ramp(t, 20.6, 21.5)), 0.42, 7)
    label(d, (1790, 880), "AIR FROM UNDER THE CAR", ramp(t, 14.6, 15.4), RED, 34, "right")
    s = ramp(t, 17.9, 18.6)                                  # sliding skirts
    if s > 0:
        x0, y0 = Q(Pm, 575, 386); x1, _ = Q(Pm, 1240, 386)
        d.line((x0, y0, x0 + (x1 - x0) * s, y0), fill=rgba(GOLD, 1), width=12)
        label(d, ((x0 + x1) / 2, 950), "SLIDING SKIRTS SEAL THE SIDES", s, GOLD, 34, "center")

def ov_rear(d, L, t, Pm):
    rpm = 0.6 + 4.0 * ramp(t, 5.0, 8.0)                      # fan speed follows the revs
    ang = 0.6 * t + 1.7 * max(0, t - 5.0) ** 1.6 if t > 5 else 0.6 * t
    cx, cy = Q(Pm, 437, 1655); r = 100 * Pm.s * K
    fan(d, (cx, cy), r, ang, ramp(t, 0.2, 0.8))
    a = ramp(t, 2.2, 2.9)
    label(d, (1100, cy - 160), "GEARED TO THE ENGINE", a, GOLD, 38)
    g = ramp(t, 5.0, 5.6)                                    # rev counter
    if g > 0:
        x, y = 1100, cy - 80; v = ramp(t, 5.0, 8.0)
        d.rectangle((x, y, x + 520, y + 26), outline=rgba(CREAM, g), width=3)
        d.rectangle((x + 4, y + 4, x + 4 + 512 * v, y + 22), fill=rgba(RED, g))
        label(d, (x, y + 50), "MORE REVS  ·  FASTER FAN", g, CREAM, 32)
    dn = ramp(t, 8.3, 9.0)                                   # downforce
    for x in (-0.9, 0, 0.9):
        arrow(d, (cx + x * r * 1.6, cy - r * 4.4), (cx + x * r * 1.6, cy - r * 3.2), dn, GOLD, 8, 24)
    label(d, (1100, cy + 80), "SUCKED TO THE GROUND", dn, GOLD, 38)

def ov_bt47(d, L, t, Pm):
    for x in (365, 510):
        cx, cy = Q(Pm, x, 1660); fan(d, (cx, cy), 62 * Pm.s * K, 0.9 * t + x, ramp(t, 0.5, 1.2))
    cx, cy = Q(Pm, 437, 1655)
    label(d, (1100, cy - 120), "BT47  ·  TWIN FANS", ramp(t, 0.8, 1.4), GOLD, 40)
    s = ramp(t, 4.5, 4.75)
    if s > 0: tracked(d, (1100, cy - 40), "NEVER BUILT", cond(96, 3), rgba(RED, s), 8)

# ---------------------------------------------------------------- one-off graphics
def foil(n=60, chord=1.0, th=0.16, camber=0.07):
    """Inverted cambered aerofoil outline, unit chord, nose at x=0."""
    up, lo = [], []
    for i in range(n + 1):
        x = (1 - math.cos(math.pi * i / n)) / 2
        yt = 5 * th * (0.2969 * math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1015 * x ** 4)
        yc = camber * (1 - (2 * x - 1) ** 2)
        up.append((x, yc - yt)); lo.append((x, yc + yt))
    return up + lo[::-1]                     # screen y points down, so the camber bulges toward the track

def ground_effect(d, L, t, sc):
    """Side view of an upside-down wing, then (at "seal the sides") a front view of the car
    with the skirts dropping to the track and the low-pressure zone forming underneath."""
    aw = ramp(t, 0.2, 0.9) * (1 - ramp(t, 4.0, 4.6))         # wing (side view)
    if aw > 0:
        cx, cy, ch = 960, 470, 900
        d.polygon([(cx - ch / 2 + x * ch, cy + y * ch) for x, y in foil()], fill=rgba(NAVY_D, aw), outline=rgba(CREAM, aw), width=5)
        label(d, (cx, 230), "AN UPSIDE-DOWN WING", aw, GOLD, 40, "center")
        flow(d, [(80, cy - 120), (cx - ch / 2, cy - 110), (cx + ch / 2, cy - 120), (1840, cy - 110)], t, aw, CREAM, 10, 0.18, 6)
        lo = foil()[61:][::-1]
        flow(d, [(80, cy + 40)] + [(cx - ch / 2 + x * ch, cy + y * ch + 28) for x, y in lo[::6]] + [(1840, cy + 40)], t, aw, GOLD, 22, 0.3, 6)
        label(d, (cx, cy + 200), "FAST AIR UNDERNEATH  ·  LOW PRESSURE", aw, GOLD, 32, "center")
    af = ramp(t, 4.0, 4.6)                                    # car (front view)
    if af <= 0: return
    gy = 800; sq = 10 * ramp(t, 8.1, 9.0)                     # the car squats as the suction builds
    fl = 720 + sq                                             # floor height
    d.line((140, gy, 1780, gy), fill=rgba(CREAM, af), width=4)
    for x in range(150, 1780, 60): d.line((x, gy + 4, x - 30, gy + 40), fill=rgba(CREAM, 0.35 * af), width=3)
    label(d, (960, gy + 60), "THE TRACK", af, CREAM, 28, "center")
    label(d, (960, 150), "SEEN FROM THE FRONT", af, GOLD, 34, "center")
    ln = rgba(CREAM, af)
    for x0, x1 in ((330, 520), (1400, 1590)):                 # tyres
        d.rounded_rectangle((x0, 560 + sq * 0.3, x1, gy), 28, fill=rgba(NAVY_D, af), outline=ln, width=5)
    for xa, xb in ((860, 520), (1060, 1400)):                 # wishbones
        d.line((xa, 610 + sq, xb, 640), fill=ln, width=4); d.line((xa, 690 + sq, xb, 720), fill=ln, width=4)
    d.rounded_rectangle((560, 600 + sq, 1360, fl), 18, fill=rgba(NAVY_D, af), outline=ln, width=5)   # sidepods + floor
    d.polygon([(870, fl - 4), (890, 470 + sq), (1030, 470 + sq), (1050, fl - 4)], fill=rgba(NAVY_D, af), outline=ln)  # tub
    d.polygon([(925, 470 + sq), (960, 370 + sq), (995, 470 + sq)], outline=ln)                                       # roll hoop
    d.ellipse((928, 412 + sq, 992, 476 + sq), fill=rgba(NAVY, af), outline=ln, width=4)                             # helmet
    sk = ramp(t, 5.0, 6.0)                                    # skirts slide down to the track
    for x in (562, 1344):
        if sk > 0: d.rectangle((x, fl, x + 14, fl + (gy - fl) * sk), fill=rgba(RED, af))
    ks = sk * af * (1 - ramp(t, 11.6, 12.0))                 # one label under the track, pointing at both skirts
    if ks > 0:
        label(d, (960, 905), "SKIRTS SEAL THE SIDES", ks, RED, 34, "center")
        d.line((760, 898, 569, gy + 6), fill=rgba(RED, ks), width=3); d.line((1160, 898, 1351, gy + 6), fill=rgba(RED, ks), width=3)
    lp = ramp(t, 7.0, 7.8)                                    # low pressure under the car
    if lp > 0:
        d.rectangle((577, fl + 2, 1343, gy - 2), fill=rgba(GOLD, 0.22 * lp))
        for k in range(18):
            x = 600 + ((k * 97 + t * 160) % 720); y = fl + 12 + (k * 37) % max(8, int(gy - fl - 24))
            d.ellipse((x - 5, y - 5, x + 5, y + 5), fill=rgba(GOLD, lp))
        label(d, (960, fl + (gy - fl) / 2 - 12), "LOW PRESSURE", lp, CREAM, 30, "center")
    dn = ramp(t, 8.1, 8.9)
    for x in (-320, 0, 320): arrow(d, (960 + x, 200), (960 + x, 330), dn, CREAM, 8, 26)
    label(d, (1340, 250), "DOWNFORCE", dn, CREAM, 36)
    s = ramp(t, 12.1, 12.6)
    if s > 0: text_top(d, (960, 900), "Ground effect.", pf(110, 900), rgba(CREAM, s), "center")

def track_pts():
    """Ordered outline of the 1978 circuit (from the Wikimedia SVG, rendered and traced)."""
    import cv2, numpy as np
    m = cv2.imread(G + "anderstorp_track_mask.png", 0)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (41, 41)))
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cs, key=cv2.contourArea)[:, 0, :].astype(float)[::4]
    k = int(np.argmin((c[:, 0] - 1060) ** 2 + (c[:, 1] - 520) ** 2)); c = np.roll(c, -k, 0)   # start at the finish line
    s = min(780 / m.shape[1], 340 / m.shape[0]); ox, oy = 1020, 560 - m.shape[0] * s / 2
    return [(x * s + ox, y * s + oy) for x, y in c] + [(c[0][0] * s + ox, c[0][1] * s + oy)]
_TRACK = []
def track_map(d, L, t, sc):
    if not _TRACK: _TRACK.extend(track_pts())
    pts = _TRACK; a = ramp(t, 0.2, 1.4); n = int(len(pts) * a)
    if n > 2: d.line(pts[:n], fill=rgba(CREAM, 1), width=8, joint="curve")
    if a >= 1:
        k = int((t * 60) % len(pts)); x, y = pts[k]; d.ellipse((x - 13, y - 13, x + 13, y + 13), fill=rgba(RED, 1))
    tracked(d, (160, 330), "SWEDISH GRAND PRIX", cond(34), rgba(GOLD, ramp(t, 0.3, 0.8)), 7)
    text_top(d, (152, 400), "Anderstorp.", pf(130, 900), rgba(CREAM, ramp(t, 0.5, 1.0)))
    d.rectangle((160, 590, 160 + 420 * ramp(t, 0.9, 1.4), 593), fill=rgba(GOLD, 1))
    text_top(d, (160, 630), "17 June 1978", pf(60), rgba(CREAM, ramp(t, 1.1, 1.6)))
    tracked(d, (160, 730), "70 LAPS  ·  4.031 KM", cond(30), rgba(GOLD, ramp(t, 1.3, 1.8)), 6)

def grid_box(d, x, y, pos, name, team, col, a):
    if a <= 0: return
    oy = 30 * (1 - a)
    d.rectangle((x, y + oy, x + 560, y + 130 + oy), fill=rgba(NAVY_D, 0.9 * a), outline=rgba(col, a), width=4)
    d.rectangle((x, y + oy, x + 14, y + 130 + oy), fill=rgba(col, a))
    tracked(d, (x + 40, y + 24 + oy), f"P{pos}", cond(40, 3), rgba(col, a), 4)
    text_top(d, (x + 150, y + 26 + oy), name, pf(54, 700), rgba(CREAM, a))
    tracked(d, (x + 152, y + 94 + oy), team, cond(24), rgba(GOLD, a), 5)

def grid(d, L, t, sc):
    tracked(d, (W / 2, 120), "STARTING GRID  ·  SWEDISH GRAND PRIX 1978", cond(32), rgba(GOLD, ramp(t, 0.1, 0.6)), 7, "center")
    LOT, BRA = GOLD, RED
    grid_box(d, 330, 250, 1, "Andretti", "LOTUS 79", LOT, ramp(t, 0.4, 0.9))
    grid_box(d, 1030, 390, 2, "Watson", "BRABHAM BT46B", BRA, ramp(t, 6.0, 6.5))
    grid_box(d, 330, 560, 3, "Lauda", "BRABHAM BT46B", BRA, ramp(t, 7.2, 7.7))
    grid_box(d, 1030, 700, 4, "Peterson", "LOTUS 79", LOT, 0.55 * ramp(t, 0.6, 1.1))

def tower(d, t, order, lap, notes=()):
    """Position tower: order = [(name, team_colour, out_bool)], animated by caller."""
    x, y = 1180, 330
    tracked(d, (x, y - 80), f"LAP {lap} / 70", cond(40, 3), rgba(CREAM, 1), 6)
    for i, (name, col, out, yy) in enumerate(order):
        top = y + yy * 120
        d.rectangle((x, top, x + 560, top + 100), fill=rgba(NAVY_D, 0.92), outline=rgba(col, 0.9), width=3)
        d.rectangle((x, top, x + 12, top + 100), fill=rgba(col, 1))
        text_top(d, (x + 40, top + 26), name, pf(52, 700), rgba(CREAM, 0.35 if out else 1))
        if out:
            d.line((x + 36, top + 50, x + 40 + pf(52, 700).getlength(name), top + 50), fill=rgba(RED, 1), width=5)
            tracked(d, (x + 400, top + 38), "OUT", cond(30, 3), rgba(RED, 1), 4)
    for (txt, a) in notes:
        if a > 0: tracked(d, (180, 760), txt, cond(36, 3), rgba(GOLD, a), 6)

def lapbar(d, frac):
    d.rectangle((180, 900, 1740, 906), fill=rgba(CREAM, 0.3))
    d.rectangle((180, 900, 180 + 1560 * frac, 906), fill=rgba(RED, 1))
    d.ellipse((180 + 1560 * frac - 12, 891, 180 + 1560 * frac + 12, 915), fill=rgba(RED, 1))
    tracked(d, (180, 940), "START", cond(24), rgba(CREAM, 0.7), 5); tracked(d, (1740, 940), "FLAG", cond(24), rgba(CREAM, 0.7), 5, "right")

def race1(d, L, t, sc):
    lap = 1 + int(18 * ramp(t, 0.5, 8.0))
    text_top(d, (180, 330), "70 laps.", pf(140, 900), rgba(CREAM, ramp(t, 0, 0.5)))
    w = ramp(t, 4.9, 5.5)
    tower(d, t, [("Andretti", GOLD, False, 0), ("Lauda", RED, False, 1), ("Watson", RED, w > 0.5, 2)], lap,
          [("WATSON  ·  THROTTLE PROBLEM, SPINS OFF", w)])
    lapbar(d, lap / 70)

def race2(d, L, t, sc):
    s = ramp(t, 3.2, 4.2)                                    # Lauda passes, around lap 20
    tower(d, t, [("Andretti", GOLD, False, s), ("Lauda", RED, False, 1 - s)], 19 + int(ramp(t, 0, 4.2) * 2),
          [("ANDRETTI MAKES A MISTAKE", ramp(t, 0.2, 0.7) * (1 - s)), ("LAUDA LEADS", s)])
    lapbar(d, (19 + 2 * ramp(t, 0, 4.2)) / 70)

def race3(d, L, t, sc):
    lap = 21 + int(25 * ramp(t, 0, 1.6)) if t < 3.5 else 46 + int(24 * ramp(t, 3.5, 5.2))
    o = ramp(t, 1.4, 1.9)
    tower(d, t, [("Lauda", RED, False, 0), ("Andretti", GOLD, o > 0.5, 1)], lap,
          [("LAP 46  ·  ANDRETTI OUT, BROKEN VALVE", o)])
    lapbar(d, lap / 70)

def results(d, L, t, sc):
    tracked(d, (W / 2, 170), "WINNING MARGIN", cond(36), rgba(GOLD, ramp(t, 0, 0.5)), 8, "center")
    text_top(d, (W / 2, 250), "34.6s", pf(260, 900), rgba(CREAM, ramp(t, 0.1, 0.7)), "center")
    rows = [("1", "Niki Lauda", "BRABHAM BT46B", RED, 3.0), ("2", "Riccardo Patrese", "ARROWS", GOLD, 3.4), ("3", "Ronnie Peterson", "LOTUS 79", GOLD, 4.6)]
    for i, (p, n, tm, col, at) in enumerate(rows):
        a = ramp(t, at, at + 0.4); y = 620 + i * 110 + 20 * (1 - a)
        if a <= 0: continue
        tracked(d, (560, y + 8), p, cond(52, 3), rgba(col, a), 0)
        text_top(d, (640, y + 6), n, pf(60, 700), rgba(CREAM, a))
        tracked(d, (1360, y + 22), tm, cond(28), rgba(GOLD, a), 6, "right")

def choice(d, L, t, sc):
    tracked(d, (W / 2, 200), "THE OFFER", cond(36), rgba(GOLD, ramp(t, 0, 0.5)), 8, "center")
    a1 = ramp(t, 0.2, 0.7); a2 = ramp(t, 1.4, 1.9); pick = ramp(t, 7.0, 7.6)
    for x, top, bot, a, chosen in ((560, "Keep the", "fan car.", a1, False), (1360, "Keep the", "whole sport.", a2, True)):
        dim = 1 - 0.65 * pick if not chosen else 1
        col = GOLD if chosen and pick > 0.5 else CREAM
        text_top(d, (x, 420), top, pf(70), rgba(CREAM, a * dim), "center")
        text_top(d, (x, 520), bot, pf(110, 900), rgba(col, a * dim), "center")
        if chosen and pick > 0: d.rectangle((x - 300, 690, x - 300 + 600 * pick, 696), fill=rgba(GOLD, 1))
    tracked(d, (W / 2, 520), "OR", cond(40, 3), rgba(RED, a2), 6, "center")
    tracked(d, (W / 2, 860), "ONE BRILLIANT CAR  —  OR THE WHOLE SPORT", cond(30), rgba(CREAM, ramp(t, 5.6, 6.2) * 0.8), 6, "center")

def record(d, L, t, sc):
    tracked(d, (W / 2, 220), "BRABHAM BT46B  ·  CAREER RECORD", cond(36), rgba(GOLD, ramp(t, 0.2, 0.7)), 8, "center")
    text_top(d, (W / 2, 300), "A perfect record.", pf(90, 700), rgba(CREAM, ramp(t, 3.4, 4.0)), "center")
    for i, (num, lab, at) in enumerate((("1", "RACE", 6.0), ("1", "WIN", 6.7), ("100%", "WIN RATE", 7.4))):
        a = ramp(t, at, at + 0.4); x = 480 + i * 480
        text_top(d, (x, 520 + 30 * (1 - a)), num, pf(220, 900), rgba(CREAM if i < 2 else GOLD, a), "center")
        tracked(d, (x, 820), lab, cond(34), rgba(GOLD, a), 8, "center")

def endcard(d, L, t, sc):
    lg = logo(520); L.alpha_composite(with_alpha(lg, ramp(t, 0.2, 0.8)), ((W - lg.width) // 2, 70))
    text_top(d, (W / 2, 450), "More stories coming.", pf(84, 700), rgba(CREAM, ramp(t, 0.6, 1.1)), "center")
    for i, (a, b, at) in enumerate((("Group B.", "TOO FAST TO SURVIVE", 3.4), ("Tyrrell P34.", "SIX WHEELS", 4.0), ("Monte Carlo ’66.", "THE MINIS THAT WON AND LOST", 4.6))):
        al = ramp(t, at, at + 0.5); x = 360 + i * 600; y = 600
        if al <= 0: continue
        d.rectangle((x - 270, y, x + 270, y + 190), fill=rgba(NAVY_D, 0.9 * al), outline=rgba(GOLD, al), width=3)
        d.rectangle((x - 270, y, x + 270, y + 8), fill=rgba(RED, al))
        text_top(d, (x, y + 52), a, pf(58, 700), rgba(CREAM, al), "center")
        tracked(d, (x, y + 132), b, cond(24), rgba(GOLD, al), 5, "center")
    s = ramp(t, 8.0, 8.5)
    if s > 0:
        d.rounded_rectangle((W / 2 - 220, 880, W / 2 + 220, 970), 14, fill=rgba(RED, s))
        tracked(d, (W / 2, 908), "SUBSCRIBE", cond(44, 3), rgba(CREAM, s), 8, "center")

def with_alpha(im, a):
    if a >= 1: return im
    im = im.copy(); im.putalpha(im.getchannel("A").point(lambda v: int(v * a))); return im

def Cu(t, fn, **kw): return Custom(V(t), fn, **kw)
def Ca(t, items, **kw): return Card(V(t), items, **kw)

def anchored(sc): sc.anchored = True; return sc
def PS(snip, f, off=-0.15, **kw):
    sc = P(0, f, **kw); sc.start = S(snip, off); return anchored(sc)
def AS(snip, ai, fallback, off=-0.15, **kw):
    sc = AIorP(0, ai, fallback, **kw); sc.start = S(snip, off); return anchored(sc)
def CaS(snip, items, off=-0.15, **kw):
    """Card at a sentence; item 'at' may be a snippet string (= when that sentence starts)."""
    t0 = S(snip, off)
    for it in items:
        if isinstance(it.get("at"), str): it["at"] = S(it["at"]) - t0
    return anchored(Card(t0, items, **kw))
def CuS(snip, fn, off=-0.15, **kw): return anchored(Custom(S(snip, off), fn, **kw))

def record_card(d, L, t, sc):
    tracked(d, (W / 2, 220), "BRABHAM BT46B  ·  CAREER RECORD", cond(36), rgba(GOLD, ramp(t, 0.2, 0.7)), 8, "center")
    text_top(d, (W / 2, 300), "A perfect record.", pf(90, 700), rgba(CREAM, ramp(t, 1.6, 2.2)), "center")
    for i, (num, lab, snip) in enumerate((("1", "RACE", "One race."), ("1", "WIN", "One win."), ("100%", "WIN RATE", "One hundred per cent."))):
        at = S(snip) - sc.start; a = ramp(t, at, at + 0.4); x = 480 + i * 480
        text_top(d, (x, 520 + 30 * (1 - a)), num, pf(220, 900), rgba(CREAM if i < 2 else GOLD, a), "center")
        tracked(d, (x, 820), lab, cond(34), rgba(GOLD, a), 8, "center")

def banned_end(d, L, t, sc):
    """Series end card: BANNED stamp, next episodes, subscribe, channel logo."""
    place_stamp(L, W / 2, 200, ramp(t, 0.1, 0.35), size=140, rot=-6)
    tracked(d, (W / 2, 350), "TOO FAST  ·  TOO CLEVER  ·  TOO GOOD TO BE ALLOWED", cond(30), rgba(GOLD, ramp(t, 1.0, 1.5)), 7, "center")
    tracked(d, (W / 2, 470), "NEXT ON BANNED", cond(30), rgba(CREAM, ramp(t, 2.2, 2.7)), 8, "center")
    for i, (a, b) in enumerate((("Group B.", "TOO FAST TO SURVIVE"), ("Tyrrell P34.", "SIX WHEELS"), ("Monte Carlo ’66.", "THE MINIS THAT WON AND LOST"))):
        al = ramp(t, 2.6 + 0.4 * i, 3.1 + 0.4 * i); x = 360 + i * 600; y = 540
        if al <= 0: continue
        d.rectangle((x - 270, y, x + 270, y + 190), fill=rgba(NAVY_D, 0.9 * al), outline=rgba(GOLD, al), width=3)
        d.rectangle((x - 270, y, x + 270, y + 8), fill=rgba(RED, al))
        text_top(d, (x, y + 52), a, pf(58, 700), rgba(CREAM, al), "center")
        tracked(d, (x, y + 132), b, cond(24), rgba(GOLD, al), 5, "center")
    at = S("Subscribe so you") - sc.start; s_ = ramp(t, at, at + 0.4)
    if s_ > 0:
        d.rounded_rectangle((W / 2 - 220, 830, W / 2 + 220, 920), 14, fill=rgba(RED, s_))
        tracked(d, (W / 2, 858), "SUBSCRIBE", cond(44, 3), rgba(CREAM, s_), 8, "center")

# ---------------------------------------------------------------- timeline (narration seconds)
CH = lambda n, s: f"{n}  ·  {s}"
scenes = [
    anchored(Sting(0.0)),                                  # the BANNED stamp slams onto paper
    # cold open (anchored to the sentences of the current recording)
    PS("found a loophole", "04_anderstorp_lauda_front.jpg", off=0, zoom=(1.0, 1.15), focus=((0.5, 0.55), (0.46, 0.62)), chapter="ANDERSTORP  ·  17 JUNE 1978"),
    PS("They built a car", "12_fan_rear_quarter.webp", zoom=(1.0, 1.15), focus=((0.6, 0.6), (0.7, 0.68))),
    PS("Its rivals called it", "02_fan_rear_closeup.webp", zoom=(1.05, 1.22)),
    AS("threw stones", "ai_stones.png", "02_fan_rear_closeup.webp", zoom=(1.0, 1.1)),
    PS("it was cheating", "11_anderstorp_lauda_side.jpg", zoom=(1.0, 1.08)),
    CaS("It started third", [{"k": "kicker", "text": "SWEDISH GRAND PRIX  ·  1978", "y": 330, "at": 0.0},
                             {"k": "title", "text": "Started third.", "y": 420, "size": 130, "at": 0.1},
                             {"k": "title", "text": "Won by half a minute.", "y": 590, "size": 130, "at": "It won by", "color": GOLD}]),
    PS("And after one race", "2001_Goodwood_Festival_of_Speed_Brabham_BT46B_Fan_car.jpg", zoom=(1.15, 1.0), dim=0.3),
    CaS("Not because it broke", [{"k": "line", "text": "Not because it broke the rules.", "y": 380, "size": 80, "at": 0.1},
                                 {"k": "title", "text": "Because it was too good.", "y": 520, "size": 130, "at": "Because it was too good", "color": GOLD}], align="center"),
    PS("This is the story", "1978_Brabham-Alfa_Romeo_BT46B_Fan_Car.jpg", zoom=(1.0, 1.14), focus=((0.5, 0.5), (0.42, 0.55))),
    anchored(Card(TITLE_AT + INTRO - 0.05, [{"k": "stamp", "text": "BANNED", "x": 960, "y": 300, "at": 0.15, "size": 120},
                                    {"k": "title", "text": "The Fan Car.", "y": 470, "size": 190, "at": 0.8},
                                    {"k": "rule", "y": 720, "w": 640, "at": 1.1},
                                    {"k": "kicker", "text": "EPISODE ONE  ·  BRABHAM BT46B  ·  1978", "y": 770, "at": 1.3}], align="center")),
    # I. the problem
    P(33.15, "Mario_Andretti_-_Lotus_79_at_the_1978_British_Grand_Prix_(50049698533).jpg", zoom=(1.0, 1.12), focus=((0.45, 0.55), (0.55, 0.55)),
      chapter=CH("I", "THE PROBLEM"), strap=("Lotus 79", "TEAM LOTUS  ·  1978", 4.5)),
    P(41.8, "05_chapman_ecclestone.webp", crop=(0, 0, 0.56, 1), zoom=(1.0, 1.08), strap=("Colin Chapman", "FOUNDER  ·  TEAM LOTUS", 0.6)),
    Cu(46.9, ground_effect),
    P(59.9, "Mario_Andretti_1978_World_Championship_Winning_Lotus_79_(49379922591).jpg", zoom=(1.0, 1.1)),
    P(66.0, "Lotus_79_(Mario_Andretti)_001.jpg", zoom=(1.0, 1.12), strap=("Andretti & Peterson", "LOTUS  ·  WINNING ALMOST AT WILL", 0.6)),
    P(71.1, "Niki_Lauda_-_Brabham_BT46_at_Druids_at_the_1978_British_Grand_Prix_(50049697253).jpg", zoom=(1.0, 1.12), focus=((0.5, 0.5), (0.6, 0.5))),
    # II. Brabham's problem
    P(77.0, "05_chapman_ecclestone.webp", crop=(0.5, 0, 1, 1), zoom=(1.0, 1.08), chapter=CH("II", "BRABHAM"),
      strap=("Bernie Ecclestone", "OWNER  ·  BRABHAM", 0.6)),
    P(81.1, "07_murray_lauda.jpg", zoom=(1.0, 1.06), strap=("Gordon Murray", "DESIGNER  ·  BRABHAM", 0.5)),
    P(84.6, "Lauda_at_1978_Dutch_Grand_Prix.jpg", zoom=(1.0, 1.15), focus=((0.45, 0.5), (0.4, 0.45)), strap=("Niki Lauda", "WORLD CHAMPION  ·  1975 & 1977", 0.8)),
    P(89.9, "08_flat12_garage.jpg", zoom=(1.0, 1.1), strap=("Alfa Romeo flat-12", "BRABHAM'S ENGINE  ·  1978", 1.6)),
    P(95.3, "01_engine_cutaway_betti.jpg", zoom=(1.1, 0.98)),
    Blueprint(V(98.7), BP, TOP, ov_tunnels, erase=[(1650, 2240, 2300, 2430)]),
    P(111.1, "Lotus_79_(Mario_Andretti)_at_Snetterton_001.jpg", zoom=(1.0, 1.1)),
    P(116.0, "09_bt46_engine_bay.jpg", zoom=(1.0, 1.1)),
    # III. the idea
    P(120.4, "Chaparral_2J.jpg", zoom=(1.0, 1.12), focus=((0.5, 0.55), (0.45, 0.55)), chapter=CH("III", "THE IDEA"),
      strap=("Chaparral 2J", "CAN-AM  ·  1970", 1.0)),
    P(127.0, "Chaparral_2J_rear-left_2005_Monterey_Historic.jpg", zoom=(1.0, 1.25), focus=((0.5, 0.5), (0.6, 0.6))),
    Ca(136.1, [{"k": "kicker", "text": "CHAPARRAL 2J  ·  CAN-AM 1970", "y": 380, "at": 0.1},
               {"k": "title", "text": "Too good.", "y": 450, "size": 160, "at": 0.3},
               {"k": "stamp", "text": "BANNED", "x": 1340, "y": 720, "at": 2.4}], align="center", bg=C + "Chaparral_2J_front_2005_Monterey_Historic.jpg"),
    Ca(142.0, [{"k": "kicker", "text": "F1 TECHNICAL REGULATIONS  ·  1978", "y": 230, "at": 0.1},
               {"k": "line", "text": "Moving aerodynamic devices", "y": 400, "size": 80, "at": 0.4},
               {"k": "stamp", "text": "BANNED", "x": 1420, "y": 520, "at": 2.3},
               {"k": "line", "text": "Cooling fans", "y": 680, "size": 80, "at": 8.3},
               {"k": "stamp", "text": "ALLOWED", "x": 1420, "y": 800, "at": 9.9, "color": GOLD, "rot": 6}],
       bg=(AI + "ai_rulebook.png") if os.path.exists(AI + "ai_rulebook.png") else None),
    P(155.5, "Monaco_1978_-_Niki_Lauda_-_02.jpg", zoom=(1.0, 1.12)),
    Ca(162.0, [{"k": "line", "text": "So what if the fan's main job —", "y": 340, "size": 76, "at": 0.1},
               {"k": "title", "text": "on paper", "y": 470, "size": 150, "at": 1.4, "color": GOLD},
               {"k": "line", "text": "— was cooling?", "y": 680, "size": 76, "at": 2.6}], align="center"),
    # IV. the car
    Blueprint(V(166.9), BP, SIDE, ov_side, box=(120, 200, 1800, 860), chapter=CH("IV", "THE CAR")),
    Blueprint(V(191.3), BP, REAR, ov_rear, box=(100, 280, 1000, 1000), erase=[(1450, 2715, 1650, 2900)]),
    P(202.3, "12_fan_rear_quarter.webp", zoom=(1.0, 1.1), texts=[(3.3, "Slow corners.", "mid+"), (4.2, "Fast corners.", "mid+"), (5.1, "Even standing still.", "mid+")]),
    P(208.4, "1978_Brabham-Alfa_Romeo_BT46B.jpg", zoom=(1.0, 1.1), strap=("Brabham BT46B", "THE FAN CAR", 0.6)),
    P(211.8, "Brabham_BT46B_NEC_Aug_1994_(51896460067).jpg", crop=(0, 0.15, 1, 0.85), zoom=(1.0, 1.08), strap=("Two cars converted", "CHASSIS BT46/4 & BT46/6", 0.3)),
    AIorP(213.7, "ai_secret_garage.png", None, zoom=(1.0, 1.1)) if os.path.exists(AI + "ai_secret_garage.png") else
    Ca(213.7, [{"k": "kicker", "text": "BRABHAM  ·  SPRING 1978", "y": 380, "at": 0.1},
               {"k": "title", "text": "Kept secret.", "y": 450, "size": 150, "at": 0.3},
               {"k": "line", "text": "Until the Swedish Grand Prix.", "y": 680, "size": 60, "at": 1.2}], align="center"),
    # V. Anderstorp
    Cu(217.9, track_map, chapter=CH("V", "ANDERSTORP")),
    AIorP(223.1, "ai_paddock_stares.png", "Swedish_Grand_Prix_1973_(JOKAMAL3B08-14).jpg", zoom=(1.0, 1.1)),
    P(228.3, "Brabham_BT46B_Fan_Cover_at_Formula_1_Exhibition,_London.jpg", zoom=(1.0, 1.2), focus=((0.5, 0.5), (0.52, 0.48))),
    P(232.6, "Monaco_1978_-_Niki_Lauda_-_02.jpg", zoom=(1.15, 1.3), focus=((0.5, 0.5), (0.5, 0.45))),
    Cu(239.7, grid),
    QuoteCard(V(249.2), "It's like a bloody great vacuum cleaner.", "MARIO ANDRETTI", "LOTUS"),
    AIorP(254.6, "ai_stones.png", "02_fan_rear_closeup.webp", zoom=(1.0, 1.12)),
    Ca(257.7, [{"k": "kicker", "text": "GORDON MURRAY'S ANSWER", "y": 200, "at": 0.1},
               {"k": "big", "text": "55 mph", "y": 300, "size": 240, "at": 3.6},
               {"k": "line", "text": "Air leaving the fan.", "y": 600, "size": 64, "at": 3.9},
               {"k": "line", "text": "Stones would fly sideways — not backwards.", "y": 760, "size": 56, "at": 6.4, "color": GOLD}], align="center"),
    # VI. the race
    Cu(268.0, race1, chapter=CH("VI", "THE RACE")),
    P(276.5, "04_anderstorp_lauda_front.jpg", zoom=(1.15, 1.32), focus=((0.45, 0.6), (0.43, 0.62))),
    P(281.9, "11_anderstorp_lauda_side.jpg", zoom=(1.05, 1.15)),
    Cu(285.1, race2),
    P(289.8, "Mario_Andretti_-_Lotus_79_at_the_1978_British_Grand_Prix_(50049698533).jpg", zoom=(1.2, 1.3), focus=((0.5, 0.6), (0.45, 0.6))),
    Cu(292.2, race3),
    Cu(297.5, results),
    P(305.7, "04_anderstorp_lauda_front.jpg", zoom=(1.25, 1.0)),
    # VII. the fallout
    Ca(313.0, [{"k": "kicker", "text": "SWEDISH GRAND PRIX  ·  OFFICIAL RESULT", "y": 360, "at": 0.1},
               {"k": "title", "text": "The win stands.", "y": 440, "size": 150, "at": 0.2},
               {"k": "stamp", "text": "CONFIRMED", "x": 960, "y": 780, "at": 2.0, "color": GOLD, "rot": -5}], align="center"),
    P(317.7, "05_chapman_ecclestone.webp", zoom=(1.0, 1.1), chapter=CH("VII", "THE FALLOUT")),
    P(323.0, "05_chapman_ecclestone.webp", crop=(0.5, 0, 1, 1), zoom=(1.0, 1.12), strap=("Bernie Ecclestone", "PRESIDENT  ·  FOCA  ·  1978", 2.3)),
    AIorP(336.8, "ai_bosses_meeting.png", "05_chapman_ecclestone.webp", crop=None if os.path.exists(AI + "ai_bosses_meeting.png") else (0, 0, 0.56, 1),
          zoom=(1.0, 1.1), strap=("Colin Chapman", "LED THE OTHER TEAM BOSSES", 0.6)),
    Cu(343.2, choice),
    Ca(351.9, [{"k": "kicker", "text": "CSI RULING  ·  1978", "y": 360, "at": 0.1},
               {"k": "title", "text": "Fan cars banned.", "y": 440, "size": 150, "at": 2.2},
               {"k": "stamp", "text": "BANNED", "x": 960, "y": 780, "at": 3.0}], align="center"),
    Blueprint(V(358.5), BP, REAR, ov_bt47, box=(100, 280, 1000, 1000), erase=[(1450, 2715, 1650, 2900)]),
    # VIII. the legacy
    CuS("finished its career with a perfect record", record_card, chapter=CH("VIII", "THE LEGACY")),
    # IX. what happened next
    PS("Niki Lauda won once more", "Lauda_at_1978_Dutch_Grand_Prix.jpg", zoom=(1.15, 1.0), chapter=CH("IX", "WHAT HAPPENED NEXT"),
       strap=("Niki Lauda", "1978  ·  TWO WINS  ·  FOURTH OVERALL", 0.8)),
    PS("Halfway through 1979", "178am_-_Lauda_Air_Boeing_767-3Z9ER,_OE-LAE_ZRH,29.06.2002_-_Flickr_-_Aero_Icarus.jpg", zoom=(1.0, 1.12),
       strap=("Lauda Air", "HIS OWN AIRLINE", 1.2)),
    PS("Then he came back", "Lauda_McLaren_MP4-2_1984_Dallas_F1.jpg", zoom=(1.0, 1.12), strap=("Niki Lauda", "WORLD CHAMPION 1984  ·  BY HALF A POINT", 1.5)),
    PS("Mario Andretti became world champion", "Mario_Andretti_celebrating_at_1978_Dutch_Grand_Prix_(cropped).jpg", zoom=(1.0, 1.08),
       strap=("Mario Andretti", "WORLD CHAMPION  ·  1978", 0.6)),
    PS("His team-mate Ronnie Peterson", "Ronnie_Peterson_40077.jpg", zoom=(1.0, 1.06), strap=("Ronnie Peterson", "1944 – 1978", 1.0)),
    PS("Colin Chapman died in 1982", "Colin_Chapman_Lotus_dagWmC.jpg", zoom=(1.0, 1.08), strap=("Colin Chapman", "1928 – 1982", 0.6)),
    PS("Bernie Ecclestone's choice paid off", "Bernie_Ecclestone_2012_Bahrain.jpg", zoom=(1.0, 1.1), strap=("Bernie Ecclestone", "RAN FORMULA ONE UNTIL 2017", 1.5)),
    PS("And Gordon Murray?", "07_murray_lauda.jpg", zoom=(1.0, 1.06)),
    PS("He became technical director", "McLaren_MP4-4_at_Formula_1_Exhibition,_London_01.jpg", zoom=(1.0, 1.1), strap=("McLaren MP4/4", "1988  ·  15 WINS FROM 16", 1.2)),
    PS("Then he designed the McLaren F1", "1995_McLaren_F1_HCC24.jpg", zoom=(1.0, 1.1), strap=("McLaren F1", "DESIGNED BY GORDON MURRAY", 1.0)),
    PS("But he never forgot his fan", "02_fan_rear_closeup.webp", zoom=(1.0, 1.15)),
    PS("In 2020, he revealed", "2024_Gordon_Murray_Automotive_T.50.jpg", zoom=(1.0, 1.1), strap=("GMA T.50", "GORDON MURRAY AUTOMOTIVE  ·  2020", 1.5)),
    PS("And on the back, a fan", "GMA_T.50_engine_compartment_at_Quail_2023.jpg", zoom=(1.0, 1.15)),
    CaS("This time, nobody could ban it", [{"k": "title", "text": "This time, nobody could ban it.", "y": 470, "size": 110, "at": 0.2}], align="center",
        bg=C + "GMA_T.50_at_PB_2022.jpg"),
    # X. what if
    CaS("So here's the question", [{"k": "kicker", "text": "WHAT IF?", "y": 250, "at": 0.1, "size": 40},
                                   {"k": "line", "text": "One race. One win.", "y": 360, "size": 70, "at": "The fan car raced once"},
                                   {"k": "line", "text": "Lauda finished 1978 fourth.", "y": 470, "size": 70, "at": "Lauda finished that season"},
                                   {"k": "title", "text": "Champion?", "y": 600, "size": 170, "at": "could he have been champion", "color": GOLD}],
        align="center", chapter=CH("X", "WHAT IF")),
    CaS("And should it ever have been banned", [{"k": "title", "text": "Should it have been banned?", "y": 380, "size": 110, "at": 0.1},
                                                {"k": "stamp", "text": "YOU DECIDE", "x": 960, "y": 680, "at": "Tell me what you think", "color": GOLD, "rot": -4},
                                                {"k": "kicker", "text": "TELL ME IN THE COMMENTS", "y": 860, "at": "Tell me what you think"}], align="center"),
    CuS("This was Banned", banned_end),
]

for _sc in scenes:                                   # middle scenes: inner timings follow the narration stretch
    if not getattr(_sc, "anchored", False):
        _sc.tmap = (lambda r: (lambda T: unwarp(T - TITLE_LEN - INTRO) - r))(unwarp(_sc.start - TITLE_LEN - INTRO))

if __name__ == "__main__":
    audio_n = A + "narration.wav"; audio = OUT + "audio_mix.wav"; os.makedirs(OUT, exist_ok=True)
    nd = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", audio_n]))
    total = INTRO + nd + TITLE_LEN + 3.0
    # voice: narration with a silent gap for the title card
    voice = OUT + "voice.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", audio_n, "-filter_complex",
                    f"[0:a]atrim=0:{TITLE_AT},asetpts=PTS-STARTPTS[a];[0:a]atrim={TITLE_AT},asetpts=PTS-STARTPTS[b];"
                    f"anullsrc=r=48000:cl=mono,atrim=0:{INTRO}[i];"
                    f"anullsrc=r=48000:cl=mono,atrim=0:{TITLE_LEN}[s];anullsrc=r=48000:cl=mono,atrim=0:3[e];[i][a][s][b][e]concat=n=5:v=0:a=1[o]",
                    "-map", "[o]", voice], check=True)
    # music: FanCar1 from the top; FanCar2 placed so it ends with the video, entering as FanCar1 fades out
    m1, m2 = MUSIC + "FanCar1.mp3", MUSIC + "FanCar2.mp3"
    l1 = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", m1]))
    l2 = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", m2]))
    m0 = INTRO - 0.3; mtot = total - m0                       # music starts as the sting dissolves into the episode
    t2 = min(max(mtot - l2 - 0.5, l1 - 22), l1 - 8)           # within FanCar1's own fade-out
    t3 = t2 + l2 - 6                                          # if the video outlasts FanCar2, FanCar1 returns
    need3 = mtot > t2 + l2 - 2
    sfx = stamp_sfx(OUT + "sting_sfx.wav")
    fc = (f"[1:a]aresample=48000,volume={MUSIC_GAIN},asplit=2[m1][m1b];"
          f"[2:a]aresample=48000,volume={MUSIC_GAIN},adelay={int(t2 * 1000)}|{int(t2 * 1000)}[m2];"
          + (f"[m1b]afade=t=in:d=4,adelay={int(t3 * 1000)}|{int(t3 * 1000)}[m3];[m1][m2][m3]amix=inputs=3" if need3 else "[m1b]anullsink;[m1][m2]amix=inputs=2")
          + f":normalize=0:duration=longest,atrim=0:{mtot},afade=t=out:st={mtot - 4}:d=4,adelay={int(m0 * 1000)}|{int(m0 * 1000)}[mus];"
          f"[0:a]aresample=48000,pan=stereo|c0=c0|c1=c0,asplit=2[v1][key];"
          f"[mus][key]sidechaincompress=threshold=0.02:ratio=8:attack=40:release=600[duck];"
          f"[3:a]aresample=48000,pan=stereo|c0=c0|c1=c0,volume=0.8[fx];"
          f"[v1][duck][fx]amix=inputs=3:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=11[o]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", voice, "-i", m1, "-i", m2, "-i", sfx, "-filter_complex", fc,
                    "-map", "[o]", "-ar", "48000", audio], check=True)
    print(f"music: FanCar2 at {t2 + m0:.1f}s" + (f", FanCar1 returns at {t3 + m0:.1f}s" if need3 else ""))
    only = (float(sys.argv[1]), float(sys.argv[2])) if len(sys.argv) > 2 else None
    out = OUT + ("preview.mp4" if only else sys.argv[1] if len(sys.argv) == 2 else FINAL)
    render(scenes, total, audio, out, workers=9, only=only)
    for f in (audio, voice, sfx): os.remove(f)
    print(out)
