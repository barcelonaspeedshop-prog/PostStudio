"""IMPOSSIBLE 03: McLaren F1 -> PostDrive/Stories/IMPOSSIBLE series/03 McLaren Le Mans/video/IMPOSSIBLE 03 - McLaren F1.mp4

    ~/.venvs/poststudio/bin/python build.py            # full render (+ review 720p)
    ~/.venvs/poststudio/bin/python build.py 95 125     # preview slice (video seconds)

Photos: media/commons (credits.json, mostly Martin Lee's 1995 race slides). AI: media/ai stills + three 5 s Runway clips.
"""
import math, os, subprocess, sys
VDIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(VDIR, "..", "..", "..", "studio"))
import episode as E
STORY = "/Volumes/PostDrive/Stories/IMPOSSIBLE series/03 McLaren Le Mans/"
E.init(STORY, series="impossible")

# ---------------------------------------------------------------- voice fix (render-time only; narration.wav is untouched)
# narration.wav still holds two fluffs the editor kept: the tail of a "stop" before "Its designer..." and a
# failed take + a full repeat of "A road car, built for the road..." after "...fourth and fifth."
# Both are cut here (narration seconds, at silences) and every later sentence is shifted to match.
CUTS = [(6.62, 7.42), (227.95, 238.50)]
def _shift(t):
    s = 0.0
    for a, b in CUTS:
        if t >= b: s += b - a
        elif t > a: return a - s
    return t - s
for _e in E.SENTS: _e["out_start"], _e["out_end"] = _shift(_e["out_start"]), _shift(_e["out_end"])
_VA = E.OUT + "_voice/"
os.makedirs(_VA, exist_ok=True)
if not os.path.exists(_VA + "narration.wav") or os.path.getmtime(_VA + "narration.wav") < os.path.getmtime(E.A + "narration.wav"):
    edges = [0.0] + [x for c in CUTS for x in c] + [None]
    parts = [(edges[i], edges[i + 1]) for i in range(0, len(edges), 2)]
    fc = "".join(f"[0]atrim={a}" + (f":{b}" if b else "") + f",asetpts=PTS-STARTPTS[p{i}];" for i, (a, b) in enumerate(parts))
    fc += "".join(f"[p{i}]" for i in range(len(parts))) + f"concat=n={len(parts)}:v=0:a=1[o]"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", E.A + "narration.wav", "-filter_complex", fc, "-map", "[o]", _VA + "narration.wav"], check=True)
for _m in os.listdir(E.A):                                                 # music beside it (main() reads A/*.mp3)
    if _m.endswith(".mp3") and not _m.startswith(("narration", "._")) and not os.path.exists(_VA + _m): os.symlink(E.A + _m, _VA + _m)
E.A = _VA

from episode import *

FINAL = "IMPOSSIBLE 03 - McLaren F1.mp4"
GREY = (150, 154, 160); HGRN = (22, 92, 60); HYEL = (238, 196, 30); BLUE = (70, 140, 220); WATER = (120, 180, 235)

def CP(snip, f, **kw): return PS(snip, f, **kw)
def sent_i(i): return E.SENTS[i]
def Si(i, off=0.0): return vt(E.SENTS[i]["out_start"] + off)
FIRST2 = next(i for i, e in enumerate(E.SENTS) if e["text"] == "At the first attempt." and i > 10)   # the second one
def bgp(f, amt=0.78): return bg_of(C + f, amt)
def bga(f, amt=0.78): return bg_of(AI + f, amt)
def drop(t, k, fall=0.35, h=260):
    """Falls in from above with a small bounce. -> (alpha, y offset, landed)"""
    a = ramp(t, k, k + 0.12)
    f = min(1.0, max(0.0, (t - k) / fall))
    return a, -h * (1 - f) ** 2 + (14 * math.sin(f * math.pi) if f < 1 else 0), f >= 1

# ---------------------------------------------------------------- drawn objects
def wheel(d, cx, cy, r, a, spin, col=CREAM):
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=rgba((20, 20, 24), a), outline=rgba(col, a), width=5)
    d.ellipse((cx - r * 0.55, cy - r * 0.55, cx + r * 0.55, cy + r * 0.55), outline=rgba(col, 0.8 * a), width=3)
    for k in range(5):
        an = spin + k * 2 * math.pi / 5
        d.line((cx + 0.15 * r * math.cos(an), cy + 0.15 * r * math.sin(an), cx + 0.55 * r * math.cos(an), cy + 0.55 * r * math.sin(an)), fill=rgba(col, 0.8 * a), width=4)

def gtr_side(d, x0, y0, s, a, col=GREY, spin=0.0, num="59"):
    """McLaren F1 GTR side-on, nose left. 1000 x 300 at s=1, ground at y0+290*s."""
    P = lambda x, y: (x0 + x * s, y0 + y * s)
    d.polygon([P(0, 212), P(30, 188), P(250, 168), P(360, 124), P(440, 86), P(540, 78), P(620, 98), P(720, 134), P(905, 144), P(965, 157),
               P(985, 215), P(978, 245), P(0, 245)], fill=rgba(col, a))
    d.polygon([P(448, 92), P(535, 86), P(603, 103), P(640, 130), P(405, 130)], fill=rgba((30, 34, 44), a))              # glasshouse
    d.rectangle((*P(500, 62), *P(552, 80)), fill=rgba(col, a))                                                          # roof scoop
    d.rectangle((*P(870, 90), *P(1010, 105)), fill=rgba((40, 40, 46), a)); d.rectangle((*P(930, 105), *P(946, 145)), fill=rgba((40, 40, 46), a))
    if num:
        d.ellipse((*P(660, 150), *P(735, 225)), fill=rgba(CREAM, a))
        tracked(d, P(697, 167), num, cond(max(12, int(50 * s)), 8), rgba(INK, a), 2, "center")
    for wx, r in ((195, 58), (805, 62)): wheel(d, *P(wx, 245), r * s, a, spin)

def proto_side(d, x0, y0, s, a, col=(235, 235, 240), spin=0.0):
    """Low open prototype, nose left."""
    P = lambda x, y: (x0 + x * s, y0 + y * s)
    d.polygon([P(0, 222), P(70, 200), P(330, 188), P(410, 168), P(470, 160), P(600, 172), P(880, 176), P(985, 196), P(990, 248), P(0, 248)], fill=rgba(col, a))
    d.ellipse((*P(470, 128), *P(530, 182)), fill=rgba(CREAM, a)); d.rectangle((*P(470, 150), *P(530, 160)), fill=rgba((30, 34, 44), a))  # helmet
    d.polygon([P(560, 175), P(600, 130), P(625, 130), P(615, 175)], fill=rgba((60, 60, 66), a))                       # roll hoop
    d.rectangle((*P(890, 132), *P(1010, 146)), fill=rgba((40, 40, 46), a)); d.rectangle((*P(940, 146), *P(955, 180)), fill=rgba((40, 40, 46), a))
    d.polygon([P(300, 200), P(700, 196), P(700, 210), P(300, 214)], fill=rgba(BLUE, a))
    for wx in (205, 815): wheel(d, *P(wx, 248), 54 * s, a, spin)

def speed_lines(d, x0, x1, y0, y1, t, a, n=10):
    for k in range(n):
        y = y0 + (y1 - y0) * ((k * 37) % n) / n; u = (t * 2.2 + k * 0.17) % 1.0; L = 160 + 120 * (k % 3)
        x = x1 - (x1 - x0 + L) * u
        d.line((x, y, x + L, y), fill=rgba(CREAM, 0.35 * a), width=3)

def rain(d, t, a, n=90, slant=0.25, col=WATER):
    for k in range(n):
        x = (k * 211.3 + t * 380 * slant) % (W + 200) - 100; y = ((k * 97.7) % H + t * (900 + 300 * (k % 4))) % (H + 120) - 60
        d.line((x, y, x + 34 * slant, y + 34), fill=rgba(col, 0.45 * a), width=2)

def dial24(d, cx, cy, r, a, col=CREAM):
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=rgba(NAVY_D, 0.85 * a), outline=rgba(col, a), width=7)
    for h in range(24):
        an = h / 24 * 2 * math.pi; r0 = 0.84 if h % 6 else 0.76
        d.line((cx + r0 * r * math.sin(an), cy - r0 * r * math.cos(an), cx + 0.94 * r * math.sin(an), cy - 0.94 * r * math.cos(an)), fill=rgba(col, 0.8 * a), width=4 if h % 6 else 7)
        if h % 6 == 0: tracked(d, (cx + 0.62 * r * math.sin(an), cy - 0.62 * r * math.cos(an) - 18), str(h if h else 24), cond(38, 8), rgba(col, a), 2, "center")

def hand(d, cx, cy, r, frac, a, col=GOLD, w=9):
    an = frac * 2 * math.pi; d.line((cx, cy, cx + r * math.sin(an), cy - r * math.cos(an)), fill=rgba(col, a), width=w)
    d.ellipse((cx - 13, cy - 13, cx + 13, cy + 13), fill=rgba(col, a))

def stopwatch(d, cx, cy, r, secs, a, col=GOLD):
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=rgba(NAVY_D, a), outline=rgba(CREAM, a), width=8)
    d.rectangle((cx - 22, cy - r - 46, cx + 22, cy - r - 8), fill=rgba(CREAM, a))
    for k in range(60):
        an = k * math.pi / 30; r0 = 0.86 if k % 5 else 0.78
        d.line((cx + r0 * r * math.sin(an), cy - r0 * r * math.cos(an), cx + 0.94 * r * math.sin(an), cy - 0.94 * r * math.cos(an)), fill=rgba(CREAM, 0.7 * a), width=3 if k % 5 else 5)
    hand(d, cx, cy, 0.8 * r, (secs % 60) / 60, a, col, 8)

def trophy(d, cx, base, h, a, col=GOLD, shine=-1.0):
    w = h * 0.62; top = base - h
    d.rounded_rectangle((cx - w * 0.42, base - h * 0.12, cx + w * 0.42, base), 6, fill=rgba(NAVY_D, a), outline=rgba(col, a), width=4)
    d.rectangle((cx - w * 0.30, base - h * 0.20, cx + w * 0.30, base - h * 0.12), fill=rgba(col, a))
    d.rectangle((cx - w * 0.07, base - h * 0.42, cx + w * 0.07, base - h * 0.20), fill=rgba(col, a))
    d.pieslice((cx - w * 0.5, top - h * 0.18, cx + w * 0.5, base - h * 0.30), 0, 180, fill=rgba(col, a))
    d.rectangle((cx - w * 0.5, top, cx + w * 0.5, top + h * 0.26), fill=rgba(col, a))
    for sgn in (-1, 1):
        hx = cx + sgn * w * 0.5
        d.arc((hx - w * 0.22, top + h * 0.04, hx + w * 0.22, top + h * 0.40), 270 if sgn > 0 else 90, 90 if sgn > 0 else 270, fill=rgba(col, a), width=7)
    if 0 <= shine <= 1:
        y = base - h * shine; d.line((cx - w * 0.36, y + 12, cx + w * 0.36, y - 12), fill=rgba(CREAM, 0.9 * a), width=7)

def flag(d, x, y, w, h, t, a, chequer=True, col=(40, 170, 70)):
    """A flag on a pole, waving."""
    d.line((x, y - 10, x, y + h * 2.4), fill=rgba(CREAM, a), width=8)
    n = 8
    for i in range(n):
        for j in range(5):
            u0, u1 = i / n, (i + 1) / n
            def pt(u, v): return (x + u * w, y + v * h + 22 * u * math.sin(t * 7 - u * 5))
            c = (CREAM if (i + j) % 2 else INK) if chequer else col
            d.polygon([pt(u0, j / 5), pt(u1, j / 5), pt(u1, (j + 1) / 5), pt(u0, (j + 1) / 5)], fill=rgba(c, a))

# Le Mans (stylised): start/finish top-left, the Mulsanne straight running down to the right
TRACK = [(0.14, 0.24), (0.17, 0.13), (0.24, 0.12), (0.27, 0.19), (0.33, 0.24), (0.52, 0.45), (0.56, 0.47), (0.58, 0.52), (0.74, 0.70),
         (0.77, 0.71), (0.79, 0.76), (0.88, 0.86), (0.85, 0.93), (0.66, 0.84), (0.57, 0.79), (0.53, 0.83), (0.47, 0.76), (0.37, 0.66),
         (0.31, 0.60), (0.26, 0.62), (0.22, 0.53), (0.15, 0.45), (0.10, 0.38), (0.12, 0.33), (0.14, 0.24)]
def track_pts(box):
    x0, y0, x1, y1 = box; return [(x0 + (x1 - x0) * u, y0 + (y1 - y0) * v) for u, v in TRACK]
def along(pts, f):
    seg = [math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1)]; L = sum(seg); u = (f % 1.0) * L
    for i, sl in enumerate(seg):
        if u <= sl: q = u / sl; return (pts[i][0] + (pts[i + 1][0] - pts[i][0]) * q, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * q)
        u -= sl
    return pts[-1]
def draw_track(d, pts, a, upto=1.0, col=CREAM, w=12):
    n = max(2, int(200 * upto)); line = [along(pts, k / 200) for k in range(n)]
    d.line(line, fill=rgba(col, a), width=w, joint="curve")

def chip(d, x, y, num, col, txt_col, a, label=None, w=150):
    d.rounded_rectangle((x - w / 2, y - 34, x + w / 2, y + 34), 16, fill=rgba(col, a), outline=rgba(CREAM, a), width=3)
    tracked(d, (x, y - 22), num, cond(44, 8), rgba(txt_col, a), 3, "center")
    if label: tracked(d, (x, y + 50), label, cond(30, 8), rgba(CREAM, a), 4, "center")

# ---------------------------------------------------------------- graphics
def vs_protos(d, L, t, sc):
    tracked(d, (W / 2, 150), "LE MANS 1995", cond(40, 2), rgba(GOLD, ramp(t, 0, 0.4)), 10, "center")
    a = ramp(t, 0.1, 0.6); x = -1400 + 1700 * ease(t / 0.9)
    speed_lines(d, 0, W, 240, 520, t, a, 14)
    gtr_side(d, x, 200, 1.2, a, GREY, spin=t * 14, num="59")
    tracked(d, (x + 600, 540), "A ROAD CAR", cond(52, 8), rgba(CREAM, a), 12, "center")
    k = at("And it was up against", sc); b = ramp(t, k, k + 0.4); xb = W + 200 - (W + 200 - 320) * ease((t - k) / 0.9) if t > k else W + 300
    if b > 0:
        speed_lines(d, 0, W, 640, 900, t + 0.3, b, 14)
        proto_side(d, xb, 600, 1.2, b, spin=t * 16)
        tracked(d, (xb + 600, 950), "PROTOTYPES  ·  BUILT ONLY TO WIN THIS RACE", cond(46, 8), rgba(GOLD, b), 8, "center")

def seat_plan(d, L, t, sc):
    """Top-down F1: three seats, the driver in the middle."""
    a = ramp(t, 0, 0.35); cx, cy = W / 2 + 40, 600
    for wx in (-560, 520):                                                                    # tyres
        for sy in (-1, 1): d.rounded_rectangle((cx + wx - 110, cy + sy * 345 - 55, cx + wx + 110, cy + sy * 345 + 55), 18, fill=rgba((20, 20, 24), a))
    body = [(cx - 860, cy - 170), (cx - 700, cy - 330), (cx + 560, cy - 350), (cx + 820, cy - 280), (cx + 860, cy), (cx + 820, cy + 280),
            (cx + 560, cy + 350), (cx - 700, cy + 330), (cx - 860, cy + 170), (cx - 900, cy)]
    d.polygon(body, fill=rgba((150, 154, 160), 0.95 * a), outline=rgba(CREAM, a), width=5)
    d.polygon([(cx - 380, cy - 270), (cx + 300, cy - 285), (cx + 300, cy + 285), (cx - 380, cy + 270)], fill=rgba(NAVY_D, a))
    seats = [(-90, 0, GOLD, 0.25), (170, -170, CREAM, 0.7), (170, 170, CREAM, 0.95)]
    for dx, dy, col, k in seats:
        al, off, _ = drop(t, k, 0.3, 160); x, y = cx + dx, cy + dy + off
        if al <= 0: continue
        d.rounded_rectangle((x - 90, y - 80, x + 110, y + 80), 26, fill=rgba(col, al), outline=rgba(CREAM, al), width=4)
        d.rounded_rectangle((x + 80, y - 76, x + 140, y + 76), 18, fill=rgba(col, al))
    s = ramp(t, 0.5, 0.8)
    if s > 0:
        x = cx - 270; d.ellipse((x - 80, cy - 80, x + 80, cy + 80), outline=rgba(GOLD, s), width=14)
        an = 0.4 * math.sin(t * 3)
        d.line((x - 72 * math.cos(an), cy - 72 * math.sin(an), x + 72 * math.cos(an), cy + 72 * math.sin(an)), fill=rgba(GOLD, s), width=12)
        label(d, (cx - 90, cy + 120), "DRIVER", s, GOLD, 34, "center")
    tracked(d, (W / 2, 110), "THREE SEATS  ·  THE DRIVER IN THE MIDDLE", cond(48, 8), rgba(CREAM, ramp(t, 0.3, 0.7)), 8, "center")

def v12(d, L, t, sc):
    """Front view of the V: crank turning, pistons pumping, plugs firing; twelve cylinder lamps firing in turn."""
    a = ramp(t, 0, 0.35); cx, cy = 620, 800; th = t * 9; r, l = 70, 250
    for phi in (-0.52, 0.52):
        ux, uy = math.sin(phi), -math.cos(phi); px_, py_ = -uy, ux
        top = 560
        wall = [(cx + ux * 140 + px_ * 95, cy + uy * 140 + py_ * 95), (cx + ux * top + px_ * 95, cy + uy * top + py_ * 95),
                (cx + ux * top - px_ * 95, cy + uy * top - py_ * 95), (cx + ux * 140 - px_ * 95, cy + uy * 140 - py_ * 95)]
        d.polygon(wall, fill=rgba(NAVY_D, a), outline=rgba((150, 156, 168), a), width=10)
        q = th - phi; sp = r * math.cos(q) + math.sqrt(l * l - (r * math.sin(q)) ** 2)
        pin = (cx + r * math.sin(th), cy - r * math.cos(th)); pist = (cx + ux * (sp + 60), cy + uy * (sp + 60))
        d.line((pin, pist), fill=rgba(CREAM, 0.8 * a), width=18)
        d.polygon([(pist[0] + px_ * 82 + ux * 10, pist[1] + py_ * 82 + uy * 10), (pist[0] + px_ * 82 + ux * 90, pist[1] + py_ * 82 + uy * 90),
                   (pist[0] - px_ * 82 + ux * 90, pist[1] - py_ * 82 + uy * 90), (pist[0] - px_ * 82 + ux * 10, pist[1] - py_ * 82 + uy * 10)], fill=rgba(CREAM, a))
        if math.cos(q) > 0.9:                                                       # spark at the top of the stroke
            sx, sy = cx + ux * (top - 20), cy + uy * (top - 20)
            d.ellipse((sx - 34, sy - 34, sx + 34, sy + 34), fill=rgba(GOLD, a))
    d.ellipse((cx - 130, cy - 130, cx + 130, cy + 130), fill=rgba((90, 96, 108), a))
    d.line((cx, cy, cx + r * math.sin(th), cy - r * math.cos(th)), fill=rgba(GOLD, a), width=26)
    tracked(d, (1430, 230), "BMW V12", cond(96, 8), rgba(CREAM, a), 12, "center")
    tracked(d, (1430, 360), "6,064 cc", cond(60, 8), rgba(GOLD, ramp(t, 0.3, 0.6)), 10, "center")
    fire = int(t * 12) % 12
    for i in range(12):
        x = 1130 + (i % 6) * 120; y = 560 + (i // 6) * 150; on = i == fire
        d.ellipse((x - 46, y - 46, x + 46, y + 46), fill=rgba(GOLD if on else NAVY_D, a), outline=rgba(CREAM, a), width=5)
    tracked(d, (1430, 820), "TWELVE CYLINDERS", cond(44, 8), rgba(CREAM, ramp(t, 0.5, 0.9)), 10, "center")

def speedo(d, L, t, sc):
    a = ramp(t, 0, 0.35); cx, cy, r = W / 2, 640, 430
    d.pieslice((cx - r, cy - r, cx + r, cy + r), 180, 360, fill=rgba(NAVY_D, 0.85 * a))
    d.arc((cx - r, cy - r, cx + r, cy + r), 180, 360, fill=rgba(CREAM, a), width=8)
    top = 260
    for v in range(0, top + 1, 10):
        an = math.pi + math.pi * v / top; r0 = 0.84 if v % 50 else 0.76
        d.line((cx + r0 * r * math.cos(an), cy + r0 * r * math.sin(an), cx + 0.96 * r * math.cos(an), cy + 0.96 * r * math.sin(an)), fill=rgba(CREAM, 0.8 * a), width=4 if v % 50 else 7)
        if v % 50 == 0: tracked(d, (cx + 0.64 * r * math.cos(an), cy + 0.64 * r * math.sin(an) - 18), str(v), cond(36, 8), rgba(CREAM, a), 2, "center")
    f = ease(max(0, t - 0.4) / 2.2); v = 240.1 * f + (1.2 * math.sin(t * 40) if f > 0.98 else 0)
    an = math.pi + math.pi * v / top; col = RED if v > 200 else GOLD
    d.line((cx, cy, cx + 0.9 * r * math.cos(an), cy + 0.9 * r * math.sin(an)), fill=rgba(col, a), width=12)
    d.ellipse((cx - 24, cy - 24, cx + 24, cy + 24), fill=rgba(col, a))
    text_top(d, (cx, cy + 50), f"{v:5.1f} mph", pf(110, 900), rgba(CREAM, a), "center")
    tracked(d, (cx, 120), "FASTEST PRODUCTION CAR IN THE WORLD", cond(44, 8), rgba(GOLD, ramp(t, 0.2, 0.6)), 8, "center")

def letter(d, L, t, sc):
    """A note from the owners slides in; the words write themselves."""
    a = ramp(t, 0, 0.4); off = 80 * (1 - ease(t / 0.6)); cx, cy = W / 2, 540 + off
    rot = -3
    pts = [(-560, -360), (560, -360), (560, 360), (-560, 360)]
    c, s_ = math.cos(math.radians(rot)), math.sin(math.radians(rot))
    d.polygon([(cx + x * c - y * s_, cy + x * s_ + y * c) for x, y in pts], fill=rgba((242, 236, 220), a))
    lines = [("THE OWNERS, IN SHORT:", 0.3), ("We'll race them.", 0.9), ("With your help –", 1.9), ("or without it.", 2.6)]
    for i, (txt, k) in enumerate(lines):
        n = int(max(0, t - k) * 28)
        if n <= 0: continue
        text_top(d, (cx - 470, cy - 270 + i * 130 + i * 2), txt[:n], pf(76 if i else 60, 600), rgba(INK, a), "left")

def lemans_map(d, L, t, sc):
    a = ramp(t, 0, 0.3); pts = track_pts((330, 90, 1590, 1010))
    draw_track(d, pts, 0.35 * a, 1.0, CREAM, 26)
    draw_track(d, pts, a, min(1.0, t / 1.4), CREAM, 10)
    if t > 1.4:
        f = (t - 1.4) * 0.9
        for k in range(14):                                                      # glowing trail
            x, y = along(pts, f - k * 0.008); r = 16 - k
            d.ellipse((x - r, y - r, x + r, y + r), fill=rgba(GOLD, a * (1 - k / 14)))
        laps = min(298, int((t - 1.4) ** 2 * 40))
        text_top(d, (1600, 420), f"{laps}", pf(150, 900), rgba(CREAM, a), "center")
        tracked(d, (1600, 600), "LAPS", cond(40, 8), rgba(GOLD, a), 10, "center")
    label(d, (1150, 545), "MULSANNE STRAIGHT", ramp(t, 0.8, 1.2), GOLD, 32)
    tracked(d, (90, 780), "CIRCUIT DE LA SARTHE", cond(40, 8), rgba(GOLD, a), 8)
    tracked(d, (90, 840), "13.6 KM A LAP", cond(56, 8), rgba(CREAM, ramp(t, 0.4, 0.8)), 8)
    tracked(d, (90, 930), "24 HOURS  ·  FLAT OUT", cond(56, 8), rgba(CREAM, ramp(t, 1.0, 1.4)), 8)

def never_24(d, L, t, sc):
    a = ramp(t, 0, 0.35); cx, cy, r = 700, 560, 360
    dial24(d, cx, cy, r, a)
    hand(d, cx, cy, 0.78 * r, t * 1.3, a, GOLD)                                   # hand racing round, never settling
    for k in range(48):                                                         # the 24 hours it never did, dashed
        if k % 2: continue
        a0 = k / 48 * 360 - 90
        d.arc((cx - r - 40, cy - r - 40, cx + r + 40, cy + r + 40), a0, a0 + 360 / 48, fill=rgba(GOLD, 0.7 * a), width=10)
    tracked(d, (1420, 300), "24 HOURS", cond(70, 8), rgba(CREAM, a), 10, "center")
    tracked(d, (1420, 390), "NON-STOP", cond(44, 8), rgba(GOLD, a), 10, "center")
    k1 = at("Not once.", sc); k2 = at("Not even in testing", sc)
    if t > k1 - 0.05: place_stamp(L, 1420, 600, ramp(t, k1 - 0.05, k1 + 0.2), text="NEVER", size=150, color=RED, rot=-8)
    tracked(d, (1420, 800), "NOT EVEN IN TESTING", cond(46, 8), rgba(CREAM, ramp(t, k2, k2 + 0.4)), 8, "center")

def helmet(d, cx, cy, r, a, cols):
    d.chord((cx - r, cy - r, cx + r, cy + r * 1.1), 150, 390, fill=rgba(cols[0], a))
    d.rectangle((cx - r, cy + r * 0.25, cx + r * 0.95, cy + r * 0.55), fill=rgba(cols[0], a))
    d.rounded_rectangle((cx - r * 0.15, cy - r * 0.25, cx + r * 1.0, cy + r * 0.2), 18, fill=rgba((25, 28, 36), a))      # visor
    d.rectangle((cx - r * 0.9, cy - r * 0.62, cx + r * 0.6, cy - r * 0.5), fill=rgba(cols[1], a))
    d.rectangle((cx - r * 0.95, cy - r * 0.48, cx + r * 0.62, cy - r * 0.36), fill=rgba(cols[2], a))

def drivers(d, L, t, sc):
    tracked(d, (W / 2, 140), "No. 59  ·  THE DRIVERS", cond(40, 2), rgba(GOLD, ramp(t, 0, 0.4)), 10, "center")
    crew = [("DALMAS", "FRANCE", ((30, 60, 160), CREAM, RED), 0.40), ("LEHTO", "FINLAND", (CREAM, (0, 53, 128), CREAM), 0.62),
            ("SEKIYA", "JAPAN", (CREAM, RED, CREAM), 0.84)]
    for i, (nm, ctry, cols, f) in enumerate(crew):
        k = atf("Its drivers were", f, sc) - 0.5; al, off, landed = drop(t, k, 0.4, 300); x = 380 + i * 580
        if al <= 0: continue
        helmet(d, x, 470 + off, 170, al, cols)
        tracked(d, (x, 720), nm, cond(72, 8), rgba(CREAM, al), 10, "center")
        tracked(d, (x, 810), ctry, cond(34, 8), rgba(GOLD, al), 8, "center")

def start_clock(d, L, t, sc):
    a = ramp(t, 0, 0.3); cx, cy, r = 620, 560, 330
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=rgba(NAVY_D, 0.9 * a), outline=rgba(CREAM, a), width=8)
    for h in range(12):
        an = h / 12 * 2 * math.pi
        d.line((cx + 0.82 * r * math.sin(an), cy - 0.82 * r * math.cos(an), cx + 0.94 * r * math.sin(an), cy - 0.94 * r * math.cos(an)), fill=rgba(CREAM, a), width=8)
    f = ease(t / 1.4); hrs = 1 + 3 * f                                                  # spin round to four o'clock
    hand(d, cx, cy, 0.55 * r, hrs / 12, a, CREAM, 14); hand(d, cx, cy, 0.85 * r, hrs % 1, a, GOLD, 8)
    tracked(d, (1350, 330), "SATURDAY", cond(56, 8), rgba(GOLD, a), 10, "center")
    tracked(d, (1350, 410), "17 JUNE 1995  ·  16:00", cond(44, 8), rgba(CREAM, a), 8, "center")
    g = ramp(t, 1.4, 1.7)
    if g > 0: flag(d, 1150, 540, 400, 260, t, g, chequer=False)
    tracked(d, (1350, 920), "THE START  ·  IN THE DRY", cond(40, 8), rgba(CREAM, g), 8, "center")

def rain_clock(d, L, t, sc):
    a = ramp(t, 0, 0.3); cx, cy, r = W / 2, 560, 360
    rain(d, t, a)
    dial24(d, cx, cy, r, a)
    f = ease(max(0, t - 0.3) / 1.8); wet0 = 1 / 24
    if f > 0:
        d.pieslice((cx - r * 0.92, cy - r * 0.92, cx + r * 0.92, cy + r * 0.92), -90 + wet0 * 360, -90 + (wet0 + 16 / 24 * f) * 360, fill=rgba(BLUE, 0.75 * a))
    tracked(d, (cx, cy + r + 50), f"{int(round(16 * f))} HOURS OF RAIN", cond(56, 8), rgba(CREAM, a), 10, "center")
    tracked(d, (cx, 100), "THE RACE IN HOURS", cond(36, 8), rgba(GOLD, a), 8, "center")

def order_tower(d, L, t, sc):
    """Running order in the wet: prototypes sink, McLarens rise."""
    tracked(d, (W / 2, 110), "IN THE WET", cond(48, 2), rgba(GOLD, ramp(t, 0, 0.4)), 14, "center")
    rain(d, t, 0.7)
    cars = [("PROTOTYPE", (235, 235, 240)), ("PROTOTYPE", (235, 235, 240)), ("PROTOTYPE", (235, 235, 240)),
            ("McLAREN", GREY), ("McLAREN", HYEL), ("McLAREN", (240, 240, 240))]
    before = [0, 1, 2, 3, 4, 5]; after = [3, 4, 5, 0, 1, 2]
    s = ease(max(0, t - 0.9) / 1.6)
    for i, (nm, col) in enumerate(cars):
        a = ramp(t, 0.1 + 0.08 * i, 0.4 + 0.08 * i); p = before[i] + (after[i] - before[i]) * s
        y = 200 + p * 138; x = W / 2 + (90 if nm == "McLAREN" else -90) * math.sin(math.pi * s)
        mc = nm == "McLAREN"
        d.rounded_rectangle((x - 720, y, x + 720, y + 120), 16, fill=rgba(NAVY_D, 0.92 * a), outline=rgba(GOLD if mc else (150, 160, 180), a), width=4)
        text_top(d, (x - 640, y + 22), f"{int(round(p)) + 1}", pf(80, 900), rgba(GOLD, a), "center")
        if mc: gtr_side(d, x - 520, y + 10, 0.33, a, col, spin=t * 20, num="")
        else: proto_side(d, x - 520, y + 10, 0.33, a, col, spin=t * 20)
        tracked(d, (x - 80, y + 36), nm, cond(58, 8), rgba(CREAM, a), 10)
        if mc and s > 0.3: arrow(d, (x + 620, y + 100), (x + 620, y + 20), ramp(s, 0.3, 0.6), GOLD, 9, 24)
        if not mc and s > 0.3: arrow(d, (x + 620, y + 20), (x + 620, y + 100), ramp(s, 0.3, 0.6), RED, 9, 24)

def lap_gap(d, L, t, sc):
    rain(d, t, 0.8)
    tracked(d, (W / 2, 120), "ONE LAP IN THE RAIN", cond(44, 2), rgba(GOLD, ramp(t, 0, 0.4)), 12, "center")
    a = ramp(t, 0, 0.3); x0, x1 = 140, 1780
    for i, (nm, col, speed) in enumerate((("LEHTO  ·  No. 59", GREY, 0.42), ("EVERYONE ELSE", (235, 235, 240), 0.33))):
        y = 260 + i * 300
        d.line((x0, y + 245, x1, y + 245), fill=rgba(CREAM, 0.4 * a), width=6)
        for k in range(10): d.rectangle((x1 - 20, y + 120 + k * 13, x1, y + 133 + k * 13), fill=rgba(CREAM if k % 2 else INK, a))
        f = min(1.0, max(0, t - 0.3) * speed); x = x0 + (x1 - x0 - 560) * f
        if i == 0: gtr_side(d, x, y, 0.56, a, col, spin=t * 20, num="59")
        else: proto_side(d, x, y + 10, 0.56, a, col, spin=t * 20)
        tracked(d, (x0, y - 10), nm, cond(42, 8), rgba(CREAM, a), 8)
    k = 0.3 + 1 / 0.42
    b = ramp(t, k, k + 0.3)
    text_top(d, (W / 2, 850), "up to 20 s a lap faster", pf(96, 900), rgba(GOLD, b), "center")
    tracked(d, (W / 2, 990), "REPORTEDLY", cond(36, 8), rgba(CREAM, b), 12, "center")

def gap_51_59(d, L, t, sc):
    a = ramp(t, 0, 0.3)
    tracked(d, (W / 2, 160), "SUNDAY MORNING", cond(40, 2), rgba(GOLD, a), 10, "center")
    for k in range(12):                                                         # track lines streaming past
        x = W - ((t * 900 + k * 180) % (W + 200))
        d.line((x, 560, x + 90, 560), fill=rgba(CREAM, 0.5 * a), width=6)
    gtr_side(d, 1000 + 20 * math.sin(t * 2), 300, 0.62, a, HYEL, spin=t * 20, num="51")
    gtr_side(d, 240 + 30 * math.sin(t * 2 + 1), 600, 0.62, a, GREY, spin=t * 20, num="59")
    tracked(d, (1310, 260), "P1  ·  HARRODS McLAREN", cond(42, 8), rgba(HYEL, a), 8, "center")
    tracked(d, (550, 930), "P2  ·  No. 59", cond(42, 8), rgba(CREAM, a), 8, "center")

def five_minutes(d, L, t, sc):
    a = ramp(t, 0, 0.3); f = min(1.0, max(0, t - 0.3) / 3.6); mins = 5 * f
    sh = 10 * f ** 3; jx, jy = sh * math.sin(t * 57), sh * math.cos(t * 43)
    stopwatch(d, 680 + jx, 560 + jy, 330, mins * 60 * 12 / 5, a, RED if f > 0.95 else GOLD)
    m, s = int(mins), int((mins % 1) * 60)
    text_top(d, (1400, 380), f"{m}:{s:02d}", pf(220, 900), rgba(RED if f > 0.95 else CREAM, a), "center")
    tracked(d, (1400, 660), "IN THE PITS", cond(48, 8), rgba(GOLD, a), 10, "center")
    tracked(d, (1400, 740), "TRYING TO FIND A GEAR", cond(40, 8), rgba(CREAM, ramp(t, 1.0, 1.4)), 8, "center")

def three_quarters(d, L, t, sc):
    a = ramp(t, 0, 0.3); pts = track_pts((330, 110, 1590, 1010))
    draw_track(d, pts, a, 1.0, CREAM, 10)
    g = ease(max(0, t - 0.3) / 1.3)
    if g > 0:                                                                     # the 3/4 lap the Courage still had to run
        line = [along(pts, 0.25 + 0.75 * k / 120) for k in range(int(120 * g) + 2)]
        d.line(line, fill=rgba(GOLD, a), width=16, joint="curve")
    x, y = along(pts, 0.0); d.ellipse((x - 28, y - 28, x + 28, y + 28), fill=rgba(GREY, a), outline=rgba(CREAM, a), width=5)
    tracked(d, (x + 50, y - 16), "No. 59  ·  FINISHED", cond(36, 8), rgba(CREAM, a), 6)
    x, y = along(pts, 0.25); d.ellipse((x - 24, y - 24, x + 24, y + 24), fill=rgba(BLUE, a), outline=rgba(CREAM, a), width=5)
    tracked(d, (x + 40, y - 16), "BEST PROTOTYPE", cond(34, 8), rgba(CREAM, a), 6)
    flag(d, 150, 160, 180, 120, t, a)
    text_top(d, (120, 800), "¾ of a lap", pf(100, 900), rgba(GOLD, ramp(t, 1.2, 1.6)), "left")
    tracked(d, (130, 950), "≈ 10 KM AHEAD OF THE BEST PROTOTYPE", cond(36, 8), rgba(CREAM, ramp(t, 1.4, 1.8)), 8)

def results(d, L, t, sc):
    tracked(d, (W / 2, 110), "LE MANS 1995  ·  RESULT", cond(40, 2), rgba(GOLD, ramp(t, 0, 0.4)), 10, "center")
    rows = [("1", "McLAREN F1 GTR", "No. 59", True, 0.5), ("2", "COURAGE C34", "PROTOTYPE", False, at("McLarens finished", sc) + 0.7),
            ("3", "McLAREN F1 GTR", "HARRODS  ·  No. 51", True, atf("McLarens finished", 0.42, sc)), ("4", "McLAREN F1 GTR", "", True, atf("McLarens finished", 0.62, sc)),
            ("5", "McLAREN F1 GTR", "", True, atf("McLarens finished", 0.82, sc))]
    for i, (p, car, sub, mc, k) in enumerate(rows):
        al, off, landed = drop(t, k - 0.25, 0.35, 200)
        if al <= 0: continue
        y = 200 + i * 160 + off; col = GOLD if mc else (150, 160, 180)
        d.rounded_rectangle((300, y, 1620, y + 130), 16, fill=rgba(NAVY_D, 0.92 * al), outline=rgba(col, al), width=5)
        text_top(d, (380, y + 28), p, pf(84, 900), rgba(col, al), "center")
        tracked(d, (480, y + 42), car, cond(56, 8), rgba(CREAM if mc else (190, 196, 210), al), 8)
        tracked(d, (1560, y + 50), sub, cond(36, 8), rgba(col, al), 6, "right")
        if mc and landed:                                                           # McLaren rows flash gold as they land
            fl = 1 - ramp(t, k + 0.1, k + 0.7)
            if fl > 0: d.rounded_rectangle((300, y, 1620, y + 130), 16, outline=rgba(CREAM, fl), width=9)

def crown(d, cx, cy, s, a, col=GOLD):
    pts = [(-1, 0.5), (-1, -0.5), (-0.55, 0.0), (0, -0.75), (0.55, 0.0), (1, -0.5), (1, 0.5)]
    d.polygon([(cx + x * s, cy + y * s) for x, y in pts], fill=rgba(col, a))
    d.rectangle((cx - s, cy + 0.5 * s, cx + s, cy + 0.72 * s), fill=rgba(col, a))
    for x, y in ((-1, -0.5), (0, -0.75), (1, -0.5)): d.ellipse((cx + x * s - 16, cy + y * s - 16, cx + x * s + 16, cy + y * s + 16), fill=rgba(RED, a))

def triple_crown(d, L, t, sc):
    tracked(d, (W / 2, 140), "THE TRIPLE CROWN", cond(52, 8), rgba(GOLD, ramp(t, 0, 0.4)), 14, "center")
    races = [("MONACO", "GRAND PRIX", "the Monaco Grand Prix"), ("INDY 500", "INDIANAPOLIS", "the Indianapolis 500"), ("LE MANS", "24 HOURS", "and the Le Mans 24")]
    fr = [0.2, 0.5, 0.75]
    for i, (big, sub, _) in enumerate(races):
        k = atf("Victory at the Monaco", fr[i], sc) - 0.3; al, off, landed = drop(t, k, 0.4, 320); x = 400 + i * 560
        if al <= 0: continue
        crown(d, x, 420 + off, 150, al)
        tracked(d, (x, 620), big, cond(64, 8), rgba(CREAM, al), 8, "center")
        tracked(d, (x, 710), sub, cond(32, 8), rgba(GOLD, al), 8, "center")
        if landed:
            c = ramp(t, k + 0.4, k + 0.7); d.line((x - 50, 830, x - 10, 870, x + 70, 780), fill=rgba(GOLD, c), width=16, joint="curve")
    tracked(d, (W / 2, 950), "ONLY McLAREN HAS WON ALL THREE", cond(40, 8), rgba(CREAM, ramp(t, 3.6, 4.0)), 8, "center")

def both_done(d, L, t, sc):
    tracked(d, (W / 2, 150), "GORDON MURRAY HAS WON BOTH", cond(42, 8), rgba(GOLD, ramp(t, 0, 0.4)), 10, "center")
    for i, (lab, sub, k) in enumerate((("F1 WORLD TITLES", "BRABHAM  ·  McLAREN", 0.2), ("LE MANS", "1995", 0.7))):
        al, off, landed = drop(t, k, 0.35, 300); x = 620 + i * 680
        if al <= 0: continue
        trophy(d, x, 760 + off, 420, al, GOLD if i else (200, 205, 212), ((t - k - 0.35) / 0.5) if t > k + 0.35 else -1)
        tracked(d, (x, 810), lab, cond(52, 8), rgba(CREAM, al), 8, "center")
        tracked(d, (x, 890), sub, cond(34, 8), rgba(GOLD, al), 8, "center")

def mini_car(d, x, y, s, a, col):
    d.polygon([(x, y + 20 * s), (x + 4 * s, y + 14 * s), (x + 24 * s, y + 12 * s), (x + 36 * s, y + 4 * s), (x + 56 * s, y + 4 * s), (x + 70 * s, y + 12 * s),
               (x + 96 * s, y + 14 * s), (x + 100 * s, y + 22 * s), (x, y + 24 * s)], fill=rgba(col, a))
    for wx in (20, 80): d.ellipse((x + (wx - 9) * s, y + 16 * s, x + (wx + 9) * s, y + 34 * s), fill=rgba((25, 25, 30), a))

def hundred_six(d, L, t, sc):
    a = ramp(t, 0, 0.3); n = min(106, int(max(0, t - 0.2) * 45))
    cols = [(200, 205, 212), (230, 120, 40), (200, 30, 40), (30, 30, 34), HYEL, BLUE, GREY]
    for i in range(n):
        r_, c_ = divmod(i, 15); x = 170 + c_ * 108; y = 250 + r_ * 92
        pop = ramp(t, 0.2 + i / 45, 0.2 + i / 45 + 0.12)
        mini_car(d, x + 10 * (1 - pop), y, 0.95, pop, cols[(i * 5) % len(cols)])
    text_top(d, (W / 2, 70), f"{n}", pf(120, 900), rgba(GOLD, a), "center")
    tracked(d, (W / 2, 960), "McLAREN F1s EVER BUILT  ·  RACING CARS INCLUDED", cond(40, 8), rgba(CREAM, ramp(t, 1.0, 1.4)), 8, "center")

# ---------------------------------------------------------------- timeline
GRID = AI + "ai_grid_1995.png"
scenes = [
    opening(GRID, "McLaren F1.", "EPISODE THREE  ·  THE ROAD CAR THAT WON LE MANS", credit="AI illustration", focus=((0.5, 0.5), (0.42, 0.45))),
    # cold open
    AS("In 1995, a road car", "ai_grid_1995.png", zoom=(1.12, 1.3), focus=((0.42, 0.45), (0.42, 0.42)), chapter="LE MANS  ·  JUNE 1995"),
    CP("Its designer had never", "f1_road_silver.jpg", zoom=(1.0, 1.1), texts=[(0.4, "Never meant to race.", "mid"),
                                                                                 (S("It had never run") - S("Its designer had never", -0.15), "Never run for 24 hours.", "mid+")]),
    CuS("And it was up against", vs_protos, off=-0.4, bg=bgp("courage_c34.jpg")),
    VS("Twenty-four hours later", "ai_finish_clip.mp4", end=3.0, texts=[(S("At the first attempt.") - S("Twenty-four hours later", -0.15), "At the first attempt.", "big")]),
    CP("This is the story of the McLaren F1", "no59_ford_b.jpg", zoom=(1.0, 1.12), strap=("McLaren F1 GTR  ·  No. 59", "LE MANS  ·  1995", 0.5)),
    # I. the road car
    CP("In the early nineties", "gordon_murray_lemans_1996.jpg", zoom=(1.0, 1.06), chapter=CH("I", "THE ROAD CAR"), strap=("Gordon Murray", "DESIGNER  ·  McLAREN F1", 0.6)),
    CuS("Three seats", seat_plan, bg=bgp("f1_interior_centre_seat.jpg")),
    CuS("A six-litre", v12, bg=bgp("f1_engine_gold.jpg", 0.85)),
    CP("This thing even had gold", "f1_engine_bay_gold.jpg", zoom=(1.0, 1.15), focus=((0.5, 0.35), (0.5, 0.42)), texts=[(2.2, "Gold foil: the best heat shield.", "mid")]),
    CuS("It was the fastest production", speedo, bg=bgp("f1_road_silver_doors.jpg", 0.82)),
    CP("It was a road car.", "f1_road_open.jpg", zoom=(1.0, 1.1), texts=[(0.3, "A road car.", "big"), (S("It was not going racing") - S("It was a road car.", -0.15), "Not a racing car.", "mid+")]),
    # II. the customers
    CP("But the people who bought", "f1_motorshow_1994.jpg", zoom=(1.0, 1.12), chapter=CH("II", "THE CUSTOMERS"), strap=("McLaren F1", "MOTOR SHOW  ·  1994", 1.0),
       texts=[(S("Some of them wanted") - S("But the people who bought", -0.15), "Some of them wanted to race.", "mid")]),
    CuS("And they told McLaren", letter, bg=bgp("f1_road_silver.jpg", 0.82)),
    CP("So McLaren gave in", "gtr_24_lemans95.jpg", zoom=(1.0, 1.1), strap=("McLaren F1 GTR", "THE RACING VERSION", S("The F1 GTR.") - S("So McLaren gave in", -0.15))),
    CP("It won races straight away", "gtr_49_lemans95.jpg", zoom=(1.05, 1.15), texts=[(0.5, "1995: winning from the start.", "mid")]),
    CP("But Le Mans?", "circuit_corner.jpg", zoom=(1.0, 1.12), texts=[(0.3, "But Le Mans?", "big")]),
    # III. the mountain
    CuS("Le Mans is twenty-four hours", lemans_map, chapter=CH("III", "THE MOUNTAIN"), bg=bgp("circuit_corner.jpg", 0.85)),
    CP("The fastest cars there", "courage_c34.jpg", off=-0.6, zoom=(1.0, 1.12), strap=("Courage C34", "PROTOTYPE  ·  LE MANS 1995", 0.4)),
    CP("Purpose-built racing machines", "courage_c34_pan.jpg", zoom=(1.0, 1.1), texts=[(0.6, "Lower. Lighter.", "big"), (SF("Purpose-built racing machines", 0.5) - S("Purpose-built racing machines", -0.15), "Built for one job.", "mid+")]),
    CuS("The McLarens had never run", never_24, bg=bgp("gtr_pits_lemans95.jpg")),
    CP("One of them, number", "no59_ford_a.jpg", zoom=(1.0, 1.14), strap=("No. 59", "THE ORIGINAL TEST CAR", S("The original test car") - S("One of them, number", -0.15))),
    CP("Painted plain grey", "no59_leads_42.jpg", zoom=(1.0, 1.12), focus=((0.4, 0.6), (0.4, 0.6)), strap=("Kokusai Kaihatsu Racing", "A SMALL, JAPANESE-BACKED PRIVATE TEAM", 0.6)),
    CuS("Its drivers were", drivers, bg=bgp("no59_ford_b.jpg", 0.82)),
    CP("The line-up certainly", "no59_leads_courage.jpg", zoom=(1.0, 1.12), texts=[(S("But did their untested") - S("The line-up certainly", -0.15), "But the car?", "big")]),
    # IV. the rain
    CuS("Saturday, four o'clock", start_clock, chapter=CH("IV", "THE RAIN"), bg=bga("ai_grid_1995.png", 0.8)),
    PF("The race started in the dry", 0.35, "wr_lm94.jpg", zoom=(1.0, 1.12), strap=("WR", "PROTOTYPE  ·  LE MANS 1995", 0.4)),
    CP("The McLarens were down", "no51_pit_straight.jpg", zoom=(1.0, 1.1), texts=[(0.3, "The McLarens: in the pack.", "mid")]),
    CP("Then, at the end of the first hour", "no59_dunlop_rain.jpg", zoom=(1.0, 1.14), strap=("The rain", "LE MANS 1995  ·  THE DUNLOP BRIDGE", 1.2)),
    CuS("For around sixteen hours", rain_clock, bg=bga("ai_rain_night.png", 0.82)),
    AS("Cars aquaplaned", "ai_rain_night.png", zoom=(1.0, 1.15), focus=((0.5, 0.5), (0.35, 0.55))),
    CuS("The light prototypes struggled", order_tower, bg=bga("ai_pit_night.png", 0.84)),
    VS("JJ Lehto was on another level", "ai_rain_night_clip.mp4", strap=("JJ Lehto", "No. 59  ·  THE NIGHT IN THE RAIN", 0.4)),
    Custom(SF("In the middle of the night", 0.32), lap_gap, bg=bga("ai_rain_night.png", 0.85)),
    VS("But number fifty-nine still", "ai_pit_night_clip.mp4", texts=[(0.4, "No. 59: still not leading.", "mid")]),
    CP("Another McLaren led", "gtr_pits_lemans95.jpg", zoom=(1.0, 1.12), texts=[(SF("Another McLaren led", 0.55) - S("Another McLaren led", -0.15), "3 a.m.: clutch broken.", "mid")]),
    CP("Then the Harrods McLaren", "no51_dusk_rain.jpg", zoom=(1.0, 1.12), strap=("Derek Bell  ·  Justin Bell  ·  Andy Wallace", "THE HARRODS McLAREN  ·  No. 51", 0.6)),
    # V. the impossible
    AS("As the sun came up", "ai_dawn_sunday.png", zoom=(1.0, 1.15), focus=((0.5, 0.5), (0.7, 0.6)), chapter=CH("V", "THE IMPOSSIBLE")),
    CuS("Number fifty-nine was second", gap_51_59, bg=bga("ai_dawn_sunday.png", 0.8)),
    CP("Then, in the final hours", "no51_pan.jpg", zoom=(1.0, 1.12), texts=[(0.8, "Gearbox failing.", "big")]),
    CuS("At one pit stop", five_minutes, bg=bgp("gtr_pits_lemans95.jpg", 0.82)),
    CP("Yannick Dalmas swept", "no59_leads_courage.jpg", zoom=(1.15, 1.3), focus=((0.45, 0.65), (0.4, 0.62)), strap=("Yannick Dalmas", "No. 59  ·  INTO THE LEAD", 0.3)),
    VS("At four o'clock in the afternoon", "ai_finish_clip.mp4", end=3.0, texts=[(1.2, "No. 59 wins Le Mans.", "big")]),
    Custom(SF("At four o'clock in the afternoon", 0.58), three_quarters, bg=bgp("circuit_corner.jpg", 0.86)),
    CuS("And it wasn't alone", results, bg=bga("ai_finish.png", 0.84)),
    CP("A road car, built for the road", "no59_podium.jpg", zoom=(1.0, 1.1), strap=("Sekiya  ·  Dalmas  ·  Lehto", "WINNERS  ·  LE MANS 1995", 0.5),
       texts=[(Si(FIRST2, -0.1) - S("A road car, built for the road", -0.15), "At the first attempt.", "big")]),
    # VI. what happened next
    CP("The win gave McLaren", "hall_of_fame_1995.jpg", zoom=(1.0, 1.15), chapter=CH("VI", "WHAT HAPPENED NEXT"), strap=("Le Mans", "THE 1995 WINNERS' HANDPRINTS", 0.8)),
    CuS("Victory at the Monaco", triple_crown, off=-0.5, bg=bgp("no59_goodwood_display.jpg", 0.84)),
    CP("Gordon Murray later said", "gordon_murray_lemans_1996.jpg", zoom=(1.1, 1.25), focus=((0.35, 0.4), (0.33, 0.36)),
       texts=[(1.4, "Le Mans: harder than an F1 title.", "mid")]),
    CuS("He should know", both_done, bg=bgp("no59_podium.jpg", 0.85)),
    CuS("Only one hundred and six", hundred_six, bg=bgp("f1_road_silver.jpg", 0.86)),
    CP("Today, they're some", "f1_road_silver_doors.jpg", zoom=(1.0, 1.12), texts=[(0.5, "One sold for over $20 million in 2021.", "mid")]),
    CP("And number fifty-nine, the grey", "no59_goodwood_display.jpg", zoom=(1.0, 1.15), focus=((0.5, 0.5), (0.47, 0.5)), strap=("No. 59", "THE GREY TEST CAR THAT WON LE MANS", 0.6)),
    # VII. what if
    AS("So here's the question", "ai_finish.png", zoom=(1.0, 1.12), chapter=CH("VII", "WHAT IF"),
       texts=[(S("Was it the car?") - S("So here's the question", -0.15), "Was it the car?", "big"),
              (S("Lehto in the rain?") - S("So here's the question", -0.15), "Lehto in the rain?", "big+")]),
    CuS("Or was Le Mans just meant", what_if("The car? Lehto in the rain?", "Or was Le Mans just meant", "Or was it meant to be?", "Or was Le Mans just meant"),
        bg=bga("ai_rain_night.png", 0.84)),
    CuS("This was Impossible", impossible_end("McLaren F1.")),
]

if __name__ == "__main__":
    main(scenes, FINAL)
