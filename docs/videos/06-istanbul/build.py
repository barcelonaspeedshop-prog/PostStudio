"""IMPOSSIBLE 02: Istanbul 2005 -> PostDrive/Stories/IMPOSSIBLE series/02 Istanbul/video/IMPOSSIBLE 02 - Istanbul.mp4

    ~/.venvs/poststudio/bin/python build.py            # full render (+ review 720p)
    ~/.venvs/poststudio/bin/python build.py 95 125     # preview slice (video seconds)

Mike speaks only easy English names; everyone else is described by role and named on screen here
(straps, diagram labels, the shoot-out board). Scorelines read MILAN – LIVERPOOL (Milan were the home side).
AI clips (media/ai/*.mp4) are 5 s Runway shots of the AI stills; the shoot-out clip is used to 2.9 s only.
"""
import math, os, sys
VDIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(VDIR, "..", "..", "..", "studio"))
import episode as E
E.init("/Volumes/PostDrive/Stories/IMPOSSIBLE series/02 Istanbul/", series="impossible")
from episode import *

FINAL = "IMPOSSIBLE 02 - Istanbul.mp4"
LFC, LFC_D = (206, 22, 40), (150, 12, 28)                # Liverpool red
WHITE = (245, 245, 240)                                   # Milan white
KEEPER = (240, 200, 60)
GREEN_OK = (90, 200, 120)

# photos
KOP_OUT, KOP_IN = "Kop_of_Anfield_Liverpool.jpg", "The_Kop_at_Anfield_Stadium_Liverpool_-_geograph.org.uk_-_5885064.jpg"
BENITEZ, GERRARD12 = "Rafael_Benitez_2009_Asia_Tour.jpg", "Steven_Gerrard_celebrating.jpg"
RIVALDO, PONGOLLE, MELLOR = "Rivaldo_full_version_.jpg", "Florent_Sinama-Pongolle_03-08-2011_.jpg", "Neil_Mellor_1.png"
MALDINI, NESTA, PIRLO, KAKA = "Paolo_Maldini_2009.jpg", "Alessandro_Nesta_06052007.jpg", "Andrea_Pirlo_in_2008.jpg", "Kaka_in_Moscow_2007.jpg"
SHEVA, CRESPO = "Andriy_Shevchenko_2007-2.jpg", "Hern_n_Crespo_-_07FEB2007_-_Francia_-_presidencia-govar.jpg"
STADIUM_OUT, STADIUM_IN = "Atat_rk_Olimpiyat.jpg", "Atat_rk_Olimpiyat_Stadyumu_14_5.JPG"
SMICER, RIISE, GATTUSO, DUDEK = "Vladimir_Smicer.jpg", "Riise_in_Liverpool_FC.jpg", "Gennaro_Gattuso_Audi_Cup_2009.jpg", "Jerzy_Dudek_2006.jpg"
CARRA, GROBBELAAR = "Jamie_Carragher_2005.jpg", "Jos_Jonker_rechts_AZ_67_in_duel_met_Liverpool-doelman_Bruce_Grobbelaar_links_Bestanddeelnr_931-7560.jpg"
CUP, PARADE, MEDAL = "Liverpool_European_Cup.jpg", "CL_parade_Lpool.jpg", "Liverpool_2005_ucl_medal.jpg"
ATHENS, YNWA = "Supporters_of_Liverpool_FC_at_Syntagma_Square_Athens_on_23_May_2007.jpg", "Liverpool_fans_singing_You_ll_Never_Walk_Alone_at_Anfield_Stadium_-_geograph.org.uk_-_5885060.jpg"
# Mike's photos
M_HURDLE = "7e770650-2501-11f0-8f57-b7237f6a66e6.jpg"            # Gerrard on the floor, a Milan player stepping over him
M_RAFA = "MV5BZTQ5MzNhNzMtMzdhZS00Mzc2LWFmODItZTFlZTgxNDI4NDdhXkEyXkFqcGc@._V1_.jpg"   # Gerrard + Benítez with the cup
M_ALONSO = "NINTCHDBPICT000650371100.jpg"                       # Alonso in red, a Milan player in white
M_CONFETTI, M_LIFT, M_KISS = "blt0f4d35fb58437a55.jpg", "soccer_-_uefa_champions_league_-_final_-_ac_milan_v_liverpool_-_ataturk_olympic_stadium.jpg", "3838.jpg"
# AI
DRESSING, RED_END, SHOOTOUT = AI + "ai_dressing_room.png", AI + "ai_red_end_halftime.png", AI + "ai_shootout_behind_goal.png"
DUSK, NIGHT, FIREWORKS = AI + "ai_stadium_dusk.png", AI + "ai_istanbul_night.png", AI + "ai_trophy_fireworks.png"

def T(v, sc):
    """A time inside a scene: a number (local seconds), (snippet, offset) or (snippet, offset, fraction)."""
    if isinstance(v, tuple):
        return (atf(v[0], v[2], sc) if len(v) > 2 else at(v[0], sc)) + v[1]
    return v

def AF(snip, frac, ai, **kw):                                     # an AI still starting part-way through a sentence
    p = AS(snip, ai, **kw); p.start = SF(snip, frac); return p

# ---------------------------------------------------------------- scoreboard with the goal smashing in
def score_at(events, t):
    """events [(t, left, right)] -> current (left, right, hit 0..1 just after a goal)."""
    cur, hit = (events[0][1], events[0][2]), 0.0
    for te, l, r in events:
        if t >= te: cur = (l, r); hit = max(0.0, 1 - (t - te) / 0.45)
    return cur[0], cur[1], hit

def board(d, cx, cy, left, right, sl, sr, a, hit=0.0, s=1.0, lcol=WHITE, rcol=LFC):
    if a <= 0: return
    sh = 26 * s * hit ** 2; jx, jy = sh * math.sin(hit * 41), sh * math.cos(hit * 37)
    cx += jx; cy += jy
    d.rounded_rectangle((cx - 780 * s, cy - 125 * s, cx + 780 * s, cy + 125 * s), int(22 * s), fill=rgba(NAVY_D, 0.92 * a), outline=rgba(GOLD, a), width=max(2, int(5 * s)))
    d.rectangle((cx - 780 * s + 6, cy - 125 * s + 6, cx - 760 * s, cy + 125 * s - 6), fill=rgba(lcol, a))
    d.rectangle((cx + 760 * s, cy - 125 * s + 6, cx + 780 * s - 6, cy + 125 * s - 6), fill=rgba(rcol, a))
    tracked(d, (cx - 270 * s, cy - 34 * s), left, cond(int(76 * s), 8), rgba(CREAM, a), int(8 * s), "right")
    tracked(d, (cx + 270 * s, cy - 34 * s), right, cond(int(76 * s), 8), rgba(CREAM, a), int(8 * s), "left")
    if hit > 0:                                                    # flash ring behind the score
        r = (1 - hit) * 520 * s + 60 * s
        d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=rgba(GOLD, 0.8 * hit * a), width=max(2, int(14 * s * hit)))
    g = 1 + 0.35 * hit ** 2; f = pf(int(150 * s * g), 900)
    text_top(d, (cx, cy - 78 * s * g), f"{sl}–{sr}", f, rgba(GOLD if hit > 0.05 else CREAM, a), "center")

def scoreboard(kicker, events, left="MILAN", right="LIVERPOOL", clock=None, sub=None, lcol=WHITE, rcol=LFC, scorers=None):
    """Full-frame scoreboard. events [(time, l, r)] with time a number or (snippet, offset)."""
    def draw(d, L, t, sc):
        a = ramp(t, 0, 0.4)
        tracked(d, (W / 2, 250), kicker, cond(46, 8), rgba(GOLD, a), 10, "center")
        ev = [(T(te, sc), l, r) for te, l, r in events]
        sl, sr, hit = score_at(ev, t)
        board(d, W / 2, 500, left, right, sl, sr, a, hit, 1.12, lcol, rcol)
        if scorers:
            for i, (te, txt) in enumerate(scorers):
                b = ramp(t, T(te, sc), T(te, sc) + 0.3)
                if b > 0: tracked(d, (W / 2 + (i - (len(scorers) - 1) / 2) * 520, 680 + 20 * (1 - b)), txt, cond(44, 8), rgba(CREAM, b), 6, "center")
        if clock:
            m0, m1, c0, c1 = clock; f = ramp(t, T(c0, sc), T(c1, sc)); mins = int(m0 + (m1 - m0) * f)
            tracked(d, (W / 2, 790), f"{mins}'", cond(80, 8), rgba(CREAM, a), 6, "center")
        if sub:
            txt, s0 = sub; b = ramp(t, T(s0, sc), T(s0, sc) + 0.4)
            tracked(d, (W / 2, 900), txt, cond(52, 8), rgba(GOLD, b), 8, "center")
    return draw

# ---------------------------------------------------------------- pitch diagrams (attacking to the right)
PX0, PX1, PY0, PY1 = 250, 1690, 175, 905; PYM = (PY0 + PY1) / 2       # 29 px per metre: box 478, spot 319
def area(d, a):
    ln = rgba(CREAM, 0.5 * a)
    d.rectangle((PX0, PY0, PX1, PY1), outline=ln, width=4)
    d.arc((PX0 - 270, PYM - 270, PX0 + 270, PYM + 270), 270, 90, fill=ln, width=3)
    d.rectangle((PX1 - 478, PYM - 320, PX1, PYM + 320), outline=ln, width=3)
    d.rectangle((PX1 - 160, PYM - 135, PX1, PYM + 135), outline=ln, width=3)
    d.arc((PX1 - 319 - 265, PYM - 265, PX1 - 319 + 265, PYM + 265), 127, 233, fill=ln, width=3)
    d.ellipse((PX1 - 324, PYM - 5, PX1 - 314, PYM + 5), fill=ln)
    for k in range(7):                                                   # the net
        y = PYM - 70 + k * 140 / 6; d.line((PX1, y, PX1 + 34, y), fill=rgba(CREAM, 0.25 * a), width=2)
    d.rectangle((PX1, PYM - 72, PX1 + 34, PYM + 72), outline=rgba(CREAM, 0.85 * a), width=5)

def dot(d, x, y, col, a, r=19, ring=None):
    d.ellipse((x - r, y - r, x + r, y + r), fill=rgba(col, a), outline=rgba(NAVY_D, a), width=3)
    if ring: d.ellipse((x - r - 9, y - r - 9, x + r + 9, y + r + 9), outline=rgba(ring, a), width=5)
def ball(d, x, y, a, lift=0.0):
    if lift: d.ellipse((x - 11, y + 6, x + 11, y + 14), fill=rgba((0, 0, 0), 0.35 * a))
    d.ellipse((x - 13, y - 13 - lift, x + 13, y + 13 - lift), fill=rgba(CREAM, a), outline=rgba(NAVY_D, a), width=3)

def kf(pts, t):
    """Keyframes [(t, x, y[, lift])] -> (x, y, lift), eased between keys."""
    if t <= pts[0][0]: p = pts[0]; return p[1], p[2], (p[3] if len(p) > 3 else 0)
    for p, q in zip(pts, pts[1:]):
        if t <= q[0]:
            f = (t - p[0]) / max(q[0] - p[0], 1e-6); f = 0.5 - 0.5 * math.cos(math.pi * f)
            lp, lq = (p[3] if len(p) > 3 else 0), (q[3] if len(q) > 3 else 0)
            arc = 0
            if len(q) > 4: arc = q[4] * math.sin(math.pi * f)                   # lofted ball
            return p[1] + (q[1] - p[1]) * f, p[2] + (q[2] - p[2]) * f, lp + (lq - lp) * f + arc
    p = pts[-1]; return p[1], p[2], (p[3] if len(p) > 3 else 0)

def play(caption, actors, ball_pts, events=(), score=None, others=()):
    """actors [(LABEL, colour, keyframes)], ball keyframes, events [(time, TEXT, colour, x, y)],
    score (left, right, [(time, l, r)]) shown as a small board at the top. Times: numbers or (snippet, offset)."""
    def draw(d, L, t, sc):
        a = ramp(t, 0, 0.4); area(d, a)
        R = lambda pts: [(T(p[0], sc),) + tuple(p[1:]) for p in pts]
        for col, x, y in others: dot(d, x, y, col, a * 0.75, 15)
        for lab, col, pts in actors:
            x, y, _ = kf(R(pts), t); dot(d, x, y, col, a, ring=GOLD if lab and lab[0] == "*" else None)
            if lab: tracked(d, (x, y + 36 if lab[0] == "_" else y - 62), lab.lstrip("*_"), cond(30, 8), rgba(CREAM, a), 4, "center")
        bp = R(ball_pts); trail = [(p[1], p[2]) for p in bp if p[0] <= t]
        bx, by, lift = kf(bp, t)
        if trail: d.line(trail + [(bx, by)], fill=rgba(GOLD, 0.45 * a), width=4)
        ball(d, bx, by, a, lift)
        for te, txt, col, x, y in events:
            te = T(te, sc); b = ramp(t, te, te + 0.15) * (1 - ramp(t, te + 1.6, te + 2.0))
            if b > 0: tracked(d, (x, y - 30 * (1 - ramp(t, te, te + 0.3))), txt, cond(66, 8), rgba(col, b), 10, "center")
        if score:
            l, r, ev = score; sl, sr, hit = score_at([(T(te, sc), x, y) for te, x, y in ev], t)
            board(d, W / 2, 95, l, r, sl, sr, a, hit, 0.42)
        tracked(d, (W / 2, 950), caption, cond(42, 8), rgba(GOLD, ramp(t, 0.3, 0.8)), 7, "center")
    return draw

# ---------------------------------------------------------------- shared bits
def stopwatch(d, cx, cy, r, secs, a, col=GOLD, face=None):
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=rgba(NAVY_D, a), outline=rgba(CREAM, a), width=8)
    d.rectangle((cx - 22, cy - r - 46, cx + 22, cy - r - 8), fill=rgba(CREAM, a))
    for k in range(60):
        an = k * math.pi / 30; r0 = 0.86 if k % 5 else 0.78
        d.line((cx + r0 * r * math.sin(an), cy - r0 * r * math.cos(an), cx + 0.94 * r * math.sin(an), cy - 0.94 * r * math.cos(an)), fill=rgba(CREAM, 0.7 * a), width=3 if k % 5 else 5)
    an = (secs % 60) / 60 * 2 * math.pi
    d.line((cx, cy, cx + 0.8 * r * math.sin(an), cy - 0.8 * r * math.cos(an)), fill=rgba(col, a), width=8)
    d.ellipse((cx - 12, cy - 12, cx + 12, cy + 12), fill=rgba(col, a))

def shatter(d, cx, cy, r, f):
    """The stopwatch blowing apart, f 0..1."""
    d.ellipse((cx - r * 1.6 * f, cy - r * 1.6 * f, cx + r * 1.6 * f, cy + r * 1.6 * f), fill=rgba(CREAM, 0.85 * (1 - f) ** 2))
    for k in range(28):
        an = k * 2 * math.pi / 28 + 0.3 * math.sin(k * 7.1); v = 500 + 380 * ((k * 37) % 11) / 11
        x = cx + math.cos(an) * v * f; y = cy + math.sin(an) * v * f + 700 * f * f
        s_ = 26 + (k % 5) * 9; rot = an + f * (6 + k % 4)
        d.polygon([(x + s_ * math.cos(rot + q), y + s_ * math.sin(rot + q)) for q in (0, 2.3, 4.1)], fill=rgba(CREAM if k % 3 else LFC, 1 - f))
    for k in range(40):
        an = k * 2.399; v = 300 + 700 * ((k * 13) % 17) / 17
        x = cx + math.cos(an) * v * f; y = cy + math.sin(an) * v * f
        d.ellipse((x - 5, y - 5, x + 5, y + 5), fill=rgba(GOLD, 1 - f))

def trophy(d, cx, base, h, a, col=(200, 205, 212), shine=-1.0):
    """The big-eared cup, `h` tall, standing on `base`."""
    w = h * 0.62; top = base - h
    d.rounded_rectangle((cx - w * 0.36, base - h * 0.12, cx + w * 0.36, base), 6, fill=rgba(NAVY_D, a), outline=rgba(col, a), width=4)
    d.rectangle((cx - w * 0.26, base - h * 0.20, cx + w * 0.26, base - h * 0.12), fill=rgba(col, a))
    d.rectangle((cx - w * 0.07, base - h * 0.42, cx + w * 0.07, base - h * 0.20), fill=rgba(col, a))
    d.pieslice((cx - w * 0.42, top - h * 0.14, cx + w * 0.42, base - h * 0.30), 0, 180, fill=rgba(col, a))
    d.rectangle((cx - w * 0.42, top, cx + w * 0.42, top + h * 0.28), fill=rgba(col, a))
    for sgn in (-1, 1):                                             # the famous big ears
        hx = cx + sgn * w * 0.50
        d.ellipse((hx - w * 0.20, top - h * 0.02, hx + w * 0.20, top + h * 0.50), outline=rgba(col, a), width=max(4, int(h * 0.045)))
    if 0 <= shine <= 1:
        y = base - h * shine
        d.line((cx - w * 0.3, y + 12, cx + w * 0.3, y - 12), fill=rgba(GOLD, 0.9 * a), width=7)

def drop_in(t, k, dur=0.35, height=260):
    """Fall-and-bounce offset for something landing at time k."""
    f = min(1.0, max(0.0, (t - k) / dur))
    return -height * (1 - f) ** 2 + (14 * math.sin(f * math.pi) if f < 1 else 0)

def paste_box(L, path, x0, y0, w, h, a=1.0, fy=0.35, fx=0.5):
    """A photo cropped to fill a box (cover), focus point (fx, fy)."""
    key = ("box", path, w, h, fx, fy)
    if key not in E.__dict__.setdefault("_boxes", {}):
        im = load(path); s_ = max(w / im.width, h / im.height); im = im.resize((int(im.width * s_) + 1, int(im.height * s_) + 1), Image.LANCZOS)
        cx = min(max(fx * im.width - w / 2, 0), im.width - w); cy = min(max(fy * im.height - h / 2, 0), im.height - h)
        E._boxes[key] = im.crop((int(cx), int(cy), int(cx) + w, int(cy) + h)).convert("RGBA")
    im = E._boxes[key]
    if a < 1: im = im.copy(); im.putalpha(int(255 * a))
    L.alpha_composite(im, (int(x0), int(y0)))

def tick(d, x, y, s, col, a):
    d.line((x - s * 0.5, y, x - s * 0.12, y + s * 0.4, x + s * 0.55, y - s * 0.45), fill=rgba(col, a), width=max(4, int(s * 0.16)), joint="curve")
def cross(d, x, y, s, col, a):
    w = max(4, int(s * 0.16)); d.line((x - s / 2, y - s / 2, x + s / 2, y + s / 2), fill=rgba(col, a), width=w); d.line((x + s / 2, y - s / 2, x - s / 2, y + s / 2), fill=rgba(col, a), width=w)

# ---------------------------------------------------------------- I. the outsiders
TABLE = [("1", "Chelsea", 95), ("2", "Arsenal", 83), ("3", "Manchester United", 77), ("4", "Everton", 61), ("5", "Liverpool", 58)]
def league_table(d, L, t, sc):
    tracked(d, (W / 2, 150), "PREMIER LEAGUE  ·  2004–05", cond(40, 8), rgba(GOLD, ramp(t, 0, 0.4)), 10, "center")
    x0, x1 = 260, 1400
    for i, (pos, team, pts) in enumerate(TABLE):
        k = 0.2 + i * 0.22; a = ramp(t, k, k + 0.3); off = 900 * (1 - a)
        if a <= 0: continue
        y = 240 + i * 125; lfc = team == "Liverpool"
        sh = 0
        if lfc:
            hb = ramp(t, at("Not even good enough", sc), at("Not even good enough", sc) + 0.2)
            sh = 10 * math.sin(t * 40) * hb * (1 - ramp(t, at("Not even good enough", sc) + 0.4, at("Not even good enough", sc) + 0.8))
        d.rounded_rectangle((x0 + off + sh, y, x1 + off + sh, y + 100), 10, fill=rgba(LFC if lfc else NAVY_D, 0.92 * a), outline=rgba(GOLD if lfc else CREAM, 0.5 * a), width=3)
        text_top(d, (x0 + 50 + off + sh, y + 24), pos, pf(60, 900), rgba(GOLD if not lfc else CREAM, a), "center")
        tracked(d, (x0 + 130 + off + sh, y + 30), team.upper(), cond(48, 8), rgba(CREAM, a), 6)
        tracked(d, (x1 - 40 + off + sh, y + 30), f"{pts} PTS", cond(44, 8), rgba(CREAM, 0.85 * a), 4, "right")
    k = ramp(t, at("Not even good enough", sc) - 0.3, at("Not even good enough", sc) + 0.2)
    if k > 0:
        y = 240 + 4 * 125 - 12; d.line((x0 - 40, y, x0 - 40 + (x1 - x0 + 80) * k, y), fill=rgba(GOLD, 1), width=8)
        tracked(d, (W / 2, 885), "TOP FOUR ONLY  ·  NEXT SEASON'S CHAMPIONS LEAGUE", cond(40, 8), rgba(GOLD, k), 6, "center")
        place_stamp(L, 1650, 770, ramp(t, at("Not even good enough", sc) + 0.9, at("Not even good enough", sc) + 1.1), text="5TH", size=110, color=STAMP_RED, rot=-8)

def calendar(d, L, t, sc):
    """Pages tear off: SEPTEMBER, OCTOBER, NOVEMBER ... DECEMBER, then the 8th is ringed."""
    months = ["SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"]
    tracked(d, (W / 2, 150), "THE GROUP STAGE  ·  2004", cond(40, 8), rgba(GOLD, ramp(t, 0, 0.4)), 10, "center")
    k = min(3, int(max(0, t - 0.2) / 0.45)); f = (max(0, t - 0.2) % 0.45) / 0.45 if k < 3 else 1
    cx, cy, w, h = W / 2, 560, 700, 640
    def page(name, dx, dy, rot, a):
        d.rounded_rectangle((cx - w / 2 + dx, cy - h / 2 + dy, cx + w / 2 + dx, cy + h / 2 + dy), 16, fill=rgba(CREAM, a))
        d.rectangle((cx - w / 2 + dx, cy - h / 2 + dy, cx + w / 2 + dx, cy - h / 2 + 140 + dy), fill=rgba(LFC, a))
        tracked(d, (cx + dx, cy - h / 2 + 46 + dy), name, cond(64, 8), rgba(CREAM, a), 10, "center")
        if name == "DECEMBER":
            text_top(d, (cx + dx, cy - 110 + dy), "8", pf(300, 900), rgba(NAVY_D, a), "center")
            tracked(d, (cx + dx, cy + 200 + dy), "LIVERPOOL v OLYMPIACOS", cond(40, 8), rgba(NAVY_D, a), 4, "center")
    a = ramp(t, 0, 0.3)
    page(months[k], 0, 0, 0, a)
    if k < 3 and f > 0: page(months[k], 0, -900 * f ** 2, 0, a * (1 - f))     # the page flying off
    ring = ramp(t, 2.0, 2.4)
    if ring > 0 and k == 3:
        d.arc((cx - 210, cy - 150, cx + 210, cy + 170), -90, -90 + 360 * ring, fill=rgba(LFC, 1), width=14)
        tracked(d, (W / 2, 925), "ONE GAME FROM GOING OUT", cond(44, 8), rgba(CREAM, ring), 8, "center")

def win_by_two(d, L, t, sc):
    tracked(d, (W / 2, 170), "THE MATHS  ·  GROUP A", cond(40, 8), rgba(GOLD, ramp(t, 0, 0.4)), 10, "center")
    a = ramp(t, 0.1, 0.5)
    tracked(d, (W / 2, 270), "AWAY GAME  ·  IN GREECE", cond(40, 8), rgba(CREAM, 0.8 * a), 8, "center")
    board(d, W / 2, 440, "OLYMPIACOS", "LIVERPOOL", 1, 0, a, 0, 0.95, (220, 30, 40), LFC)
    s0 = atf("And because they'd lost", 0.42, sc); b = ramp(t, s0, s0 + 0.4)
    if b > 0:
        text_top(d, (W / 2, 620 + 20 * (1 - b)), "If Olympiacos score…", pf(100, 800), rgba(CREAM, b), "center")
        k = atf("And because they'd lost", 0.82, sc)
        place_stamp(L, W / 2, 880, ramp(t, k - 0.05, k + 0.2), text="WIN BY TWO", size=140, color=GOLD, rot=-6)

def tracker(kicker, events, needed, needed_at=None, clock=None, note=None, stamp=None):
    """The Olympiacos comeback: LIVERPOOL x–y OLYMPIACOS, and three balls for the goals they needed."""
    def draw(d, L, t, sc):
        a = ramp(t, 0, 0.4)
        tracked(d, (W / 2, 160), kicker, cond(40, 8), rgba(GOLD, a), 10, "center")
        ev = [(T(te, sc), l, r) for te, l, r in events]; sl, sr, hit = score_at(ev, t)
        board(d, W / 2, 360, "LIVERPOOL", "OLYMPIACOS", sl, sr, a, hit, 1.0, LFC, (220, 30, 40))
        if clock:
            m0, m1 = clock; mins = int(m0 + (m1 - m0) * min(1, t / max(sc.dur, 0.1)))
            tracked(d, (W / 2, 525), f"{mins}'", cond(60, 8), rgba(CREAM, a), 6, "center")
        nb = ramp(t, T(needed_at, sc), T(needed_at, sc) + 0.4) if needed_at else a
        if nb > 0:
            tracked(d, (W / 2, 615), "GOALS NEEDED", cond(40, 8), rgba(CREAM, 0.8 * nb), 10, "center")
            for i in range(3):
                x = W / 2 + (i - 1) * 280; y = 780; filled = i < needed
                k = (needed_at and T(needed_at, sc) + 0.2 + i * 0.25) or 0.2 + i * 0.2
                yy = y + drop_in(t, k, 0.35, 200)
                if t < k: continue
                pulse = 1 + 0.08 * math.sin(t * 9) if (not filled and i == needed) else 1
                r = 100 * pulse
                d.ellipse((x - r, yy - r, x + r, yy + r), fill=rgba(GOLD if filled else NAVY_D, nb), outline=rgba(GOLD if filled else CREAM, nb), width=6)
                if filled: tick(d, x, yy, 90, NAVY_D, nb)
        if note:
            txt, n0, col = note; b = ramp(t, T(n0, sc), T(n0, sc) + 0.3)
            tracked(d, (W / 2, 940), txt, cond(46, 8), rgba(col, b), 8, "center")
        if stamp:
            txt, s0, col = stamp; place_stamp(L, 1500, 760, ramp(t, T(s0, sc), T(s0, sc) + 0.2), text=txt, size=110, color=col, rot=-7)
    return draw

def gerrard_goal(d, L, t, sc):
    """Mellor heads it down, Gerrard hits it first time from 25 yards."""
    a = ramp(t, 0, 0.4); area(d, a)
    t0 = 0.3; MEL, GER = (1270, 470), (1036, 610)
    for x, y in ((1450, 380), (1500, 560), (1400, 690), (1560, 460)): dot(d, x, y, (220, 30, 40), a * 0.8, 15)
    dot(d, PX1 - 20, PYM, (90, 90, 90), a, 17)
    dot(d, *MEL, LFC, a); tracked(d, (MEL[0], MEL[1] - 64), "MELLOR", cond(30, 8), rgba(CREAM, a), 4, "center")
    dot(d, *GER, LFC, a, ring=GOLD); tracked(d, (GER[0], GER[1] - 64), "GERRARD", cond(30, 8), rgba(CREAM, a), 4, "center")
    pts = [(t0, 900, 250, 0), (t0 + 1.2, MEL[0] + 10, MEL[1] - 10, 0, 160), (t0 + 1.8, GER[0] + 20, GER[1] - 8, 0, 40),
           (t0 + 2.3, PX1 + 20, PYM + 52, 0), (t0 + 2.6, PX1 + 26, PYM + 56, 0)]
    trail = [(p[1], p[2]) for p in pts if p[0] <= t]; bx, by, lift = kf(pts, t)
    if trail: d.line(trail + [(bx, by)], fill=rgba(GOLD, 0.5 * a), width=4)
    ball(d, bx, by, a, lift)
    m = ramp(t, t0 + 1.7, t0 + 2.0)
    if m > 0:                                                       # the 25 yards
        y = 860; d.line((GER[0], y, PX1, y), fill=rgba(GOLD, m), width=4)
        for x in (GER[0], PX1): d.line((x, y - 16, x, y + 16), fill=rgba(GOLD, m), width=4)
        tracked(d, ((GER[0] + PX1) / 2, y - 50), "25 YARDS", cond(40, 8), rgba(GOLD, m), 8, "center")
    g = t0 + 2.3; b = ramp(t, g, g + 0.15) * (1 - ramp(t, g + 1.4, g + 1.8))
    if b > 0: tracked(d, (1450, 300), "GOAL", cond(90, 8), rgba(GOLD, b), 14, "center")
    tracked(d, (W / 2, 950), "86'  ·  MELLOR HEADS DOWN  ·  GERRARD, FIRST TIME", cond(42, 8), rgba(GOLD, ramp(t, 0.3, 0.8)), 7, "center")

ROUTE = [("LAST 16", "BAYER LEVERKUSEN", 0.36), ("QUARTER-FINAL", "JUVENTUS", 0.6), ("SEMI-FINAL", "CHELSEA", 0.86), ("THE FINAL", "ISTANBUL", 1.0)]
def route(d, L, t, sc):
    tracked(d, (W / 2, 150), "THE ROAD TO ISTANBUL", cond(40, 8), rgba(GOLD, ramp(t, 0, 0.4)), 10, "center")
    for i, (stage, team, fr) in enumerate(ROUTE):
        k = atf("After that, they knocked out", fr, sc) - (0.6 if i == 3 else 0.3); a = ramp(t, k, k + 0.3)
        if a <= 0: continue
        x = 280 + i * 455; y = 330 + i * 120 + drop_in(t, k, 0.35, 160)
        fin = i == 3
        d.rounded_rectangle((x - 200, y, x + 200, y + 260), 16, fill=rgba(LFC if fin else NAVY_D, 0.94 * a), outline=rgba(GOLD, a), width=4)
        tracked(d, (x, y + 30), stage, cond(30, 8), rgba(GOLD if not fin else CREAM, a), 6, "center")
        f = cond(46 if len(team) < 12 else 36, 8)
        tracked(d, (x, y + 110), team, f, rgba(CREAM, a), 5, "center")
        if not fin:
            tick(d, x, y + 205, 50, GREEN_OK, ramp(t, k + 0.3, k + 0.5))
            if i < 3: arrow(d, (x + 210, y + 130), (x + 245, y + 175), ramp(t, k + 0.4, k + 0.7), GOLD, 6, 16)
        else:
            tracked(d, (x, y + 190), "25 MAY 2005", cond(32, 8), rgba(GOLD, a), 6, "center")

# ---------------------------------------------------------------- II. the giants
def milan(d, L, t, sc):
    a = ramp(t, 0, 0.12); hit = max(0, 1 - t / 0.4)
    sh = 30 * hit ** 2; jx, jy = sh * math.sin(t * 50), sh * math.cos(t * 43)
    if a > 0:
        tracked(d, (W / 2 + jx, 170 + jy), "THE GOLIATH", cond(40, 8), rgba(GOLD, ramp(t, 0.2, 0.6)), 12, "center")
        text_top(d, (W / 2 + jx, 250 + jy - 60 * hit), "AC Milan", pf(int(200 * (1 + 0.8 * hit ** 2)), 900), rgba(CREAM, a), "center")
    k = at("Champions of Europe two years", sc); b = ramp(t, k, k + 0.15)
    if b > 0:
        trophy(d, W / 2, 860 + drop_in(t, k, 0.4, 320), 360, b, (200, 205, 212), (t - k - 0.4) / 0.6 if t > k + 0.4 else -1)
        tracked(d, (W / 2 - 520, 690), "EUROPEAN", cond(52, 8), rgba(GOLD, ramp(t, k + 0.4, k + 0.7)), 10, "center")
        tracked(d, (W / 2 - 520, 760), "CHAMPIONS", cond(52, 8), rgba(GOLD, ramp(t, k + 0.4, k + 0.7)), 10, "center")
        text_top(d, (W / 2 + 520, 680), "2003", pf(130, 900), rgba(CREAM, ramp(t, k + 0.5, k + 0.8)), "center")
    s = ramp(t, atf("Champions of Europe two years", 0.6, sc), atf("Champions of Europe two years", 0.6, sc) + 0.4)
    if s > 0: tracked(d, (W / 2, 950), "WORLD-CLASS IN EVERY POSITION", cond(44, 8), rgba(CREAM, s), 8, "center")

PAIRS = [("Two of the best defenders", "DEFENCE", [("3", "Paolo Maldini", "CAPTAIN"), ("13", "Alessandro Nesta", "CENTRE-BACK")]),
         ("Two of the finest midfielders", "MIDFIELD", [("21", "Andrea Pirlo", "PLAYMAKER"), ("22", "Kaká", "ATTACKING MIDFIELD")]),
         ("And up front, the European", "ATTACK", [("7", "Andriy Shevchenko", "EUROPEAN FOOTBALLER OF THE YEAR"), ("11", "Hernán Crespo", "STRIKER")])]
def portraits(d, L, t, sc):
    """Milan's stars as their white 2005 shirts with name and number, two at a time, sliding in."""
    ks = [at(p[0], sc) for p in PAIRS]; ks[0] = min(ks[0], 0.0)
    cur = max(i for i, k in enumerate(ks) if t >= k - 0.35 or i == 0)
    for i in (cur - 1, cur):
        if i < 0: continue
        k = ks[i]; enter = ramp(t, k - 0.35, k + 0.15) if i > 0 else 1.0
        leave = ramp(t, ks[i + 1] - 0.35, ks[i + 1] + 0.15) if i + 1 < len(ks) else 0
        off = 1920 * (1 - enter) - 1920 * leave
        if abs(off) >= 1920: continue
        _, line, people = PAIRS[i]
        for j, (num, name, role) in enumerate(people):
            cx = 560 + j * 800 + off; bob = 8 * math.sin(t * 2.2 + j)
            shirt(d, cx, 470 + bob, 330, WHITE, (20, 20, 20), 1.0, stripes=[(200, 16, 46), (20, 20, 20)])
            text_top(d, (cx, 330 + bob), num, pf(170, 900), rgba((200, 16, 46), 1), "center")
            text_top(d, (cx, 760), name, pf(66, 800), rgba(CREAM, 1), "center")
            tracked(d, (cx, 860), role, cond(30, 8), rgba(GOLD, 1), 5, "center")
        tracked(d, (W / 2 + off, 105), f"AC MILAN  ·  {line}", cond(40, 8), rgba(GOLD, 1), 10, "center")

def player_card(path, name, sub):
    """A small original photo shown at (near) its own size in a frame, never blown up, with the name beside it."""
    def draw(d, L, t, sc):
        im = load(C + path); h = min(760, int(im.height * 1.15)); w_ = int(im.width * h / im.height)
        if w_ > 900: w_ = 900; h = int(im.height * w_ / im.width)
        a = ramp(t, 0, 0.4); x0 = 640 - w_ // 2 - int(60 * (1 - ease(min(1, t / 0.6)))); y0 = 540 - h // 2
        d.rectangle((x0 - 14, y0 - 14, x0 + w_ + 14, y0 + h + 14), fill=rgba(CREAM, a))
        key = ("card", path, w_, h)
        if key not in E.__dict__.setdefault("_cards", {}): E._cards[key] = im.resize((w_, h), Image.LANCZOS).convert("RGBA")
        ph = E._cards[key]
        if a < 1: ph = ph.copy(); ph.putalpha(int(255 * a))
        L.alpha_composite(ph, (x0, y0))
        b = ramp(t, 0.3, 0.8); x = max(1120, x0 + w_ + 90)
        text_top(d, (x, 430), name, pf(84, 900), rgba(CREAM, b), "left")
        tracked(d, (x + 4, 560), sub, cond(34, 8), rgba(GOLD, b), 6)
    return draw
def PC(snip, path, name, sub, bg=None, off=-0.15, **kw):
    return Custom(S(snip, off), player_card(path, name, sub), bg=bg_of(bg or (C + STADIUM_IN), 0.78), **kw)

def shirt(d, cx, cy, s, body, trim, a, stripes=None):
    pts = [(-0.5, -0.62), (-0.18, -0.72), (0.18, -0.72), (0.5, -0.62), (0.95, -0.25), (0.72, 0.02), (0.5, -0.15), (0.5, 0.72), (-0.5, 0.72), (-0.5, -0.15), (-0.72, 0.02), (-0.95, -0.25)]
    P = [(cx + x * s, cy + y * s) for x, y in pts]
    d.polygon(P, fill=rgba(body, a), outline=rgba(trim, a))
    d.line(P + [P[0]], fill=rgba(trim, a), width=max(3, int(s * 0.02)))
    d.arc((cx - 0.2 * s, cy - 0.86 * s, cx + 0.2 * s, cy - 0.5 * s), 20, 160, fill=rgba(trim, a), width=max(4, int(s * 0.03)))
    if stripes:
        for k, col in enumerate(stripes): d.line((cx - 0.5 * s, cy + (0.55 + k * 0.05) * s, cx + 0.5 * s, cy + (0.55 + k * 0.05) * s), fill=rgba(col, a), width=max(3, int(s * 0.025)))

def kits(d, L, t, sc):
    a = ramp(t, 0, 0.3); r = at("Milan in white.", sc)
    k1 = ramp(t, 0.0, 0.45); k2 = ramp(t, r - 0.1, r + 0.35)
    shirt(d, 520 - 900 * (1 - k1), 520, 430, LFC, CREAM, k1)
    tracked(d, (520 - 900 * (1 - k1), 900), "LIVERPOOL", cond(56, 8), rgba(CREAM, k1), 10, "center")
    if k2 > 0:
        shirt(d, 1400 + 900 * (1 - k2), 520, 430, WHITE, (30, 30, 30), k2, [LFC, (20, 20, 20)])
        tracked(d, (1400 + 900 * (1 - k2), 900), "AC MILAN", cond(56, 8), rgba(CREAM, k2), 10, "center")
        text_top(d, (W / 2, 430), "v", pf(150, 800), rgba(GOLD, k2), "center")
    tracked(d, (W / 2, 160), "25 MAY 2005  ·  THE KITS", cond(40, 8), rgba(GOLD, a), 10, "center")

# ---------------------------------------------------------------- III. the first half
def fifty_seconds(d, L, t, sc):
    """The stopwatch runs to 0:50, then blows apart for the record."""
    tracked(d, (W / 2, 140), "MALDINI  ·  THE OPENING GOAL", cond(40, 8), rgba(GOLD, ramp(t, 0, 0.4)), 10, "center")
    boom = at("It's still the fastest goal", sc) + 0.3; cx, cy, r = 700, 560, 290
    secs = min(50, max(0, t - 0.2) * 25)
    if t < boom:
        a = ramp(t, 0, 0.3); sh = 10 * ramp(t, boom - 1.0, boom) ** 2; jx, jy = sh * math.sin(t * 61), sh * math.cos(t * 47)
        stopwatch(d, cx + jx, cy + jy, r, secs, a, LFC if secs >= 50 else GOLD)
        text_top(d, (1360, 420), f"0:{int(secs):02d}", pf(220, 900), rgba(CREAM, a), "center")
        tracked(d, (1360, 700), "SECONDS ON THE CLOCK", cond(40, 8), rgba(GOLD, a), 8, "center")
        return
    f = min(1.0, (t - boom) / 0.9); shatter(d, cx, cy, r, f)
    b = ramp(t, boom + 0.1, boom + 0.5)
    tracked(d, (W / 2, 300), "THE FASTEST GOAL EVER SCORED", cond(56, 8), rgba(CREAM, b), 10, "center")
    tracked(d, (W / 2, 380), "IN A CHAMPIONS LEAGUE FINAL", cond(56, 8), rgba(CREAM, b), 10, "center")
    text_top(d, (W / 2, 500), "≈ 50 seconds", pf(150, 900), rgba(GOLD, b), "center")
    place_stamp(L, W / 2, 830, ramp(t, boom + 0.7, boom + 0.9), text="STILL THE RECORD", size=90, color=STAMP_RED, rot=-5)

def sub_board(kicker, off, on, note=None, extra=None):
    """A fourth official's board: OFF in red, ON in green, LED dots."""
    def draw(d, L, t, sc):
        a = ramp(t, 0, 0.3); lift = drop_in(t, 0.1, 0.4, -500)
        tracked(d, (W / 2, 150), kicker, cond(40, 8), rgba(GOLD, a), 10, "center")
        x0, x1, y0, y1 = 460, 1460, 250 - lift, 790 - lift
        d.rounded_rectangle((x0, y0, x1, y1), 24, fill=rgba((12, 12, 16), 0.96 * a), outline=rgba(CREAM, 0.6 * a), width=6)
        d.rectangle((W / 2 - 40, y1, W / 2 + 40, y1 + 180), fill=rgba((40, 40, 46), a))
        for row, (who, col, arrowdir, k) in enumerate(((off, LFC, 1, 0.3), (on, GREEN_OK, -1, 0.7))):
            b = ramp(t, k, k + 0.25); y = y0 + 60 + row * 250
            tracked(d, (x0 + 60, y + 10), "OFF" if row == 0 else "ON", cond(40, 8), rgba(col, b), 8)
            ax = x0 + 110; ay = y + 120
            arrow(d, (ax, ay - 40 * arrowdir), (ax, ay + 40 * arrowdir), b, col, 12, 28)
            tracked(d, (x0 + 210, y + 70), who, cond(110, 8), rgba(col, b), 10)
        if note:
            txt, n0 = note; tracked(d, (W / 2, 1010 - lift), txt, cond(40, 8), rgba(CREAM, ramp(t, T(n0, sc), T(n0, sc) + 0.4)), 8, "center")
    return draw

def formation(d, L, t, sc):
    """Back four -> back three, Gerrard pushed forward. Liverpool attack to the right."""
    a = ramp(t, 0, 0.4); area(d, a * 0.6)
    tracked(d, (W / 2, 120), "SECOND HALF  ·  THE NEW SHAPE", cond(40, 8), rgba(GOLD, a), 10, "center")
    f = ramp(t, 0.6, 2.0)
    four = [(420, 300), (400, 460), (400, 640), (420, 800)]; three = [(430, 380), (410, 550), (430, 720)]
    for i, p in enumerate(four):
        q = three[min(i, 2)] if i < 3 else three[2]
        x = p[0] + (q[0] - p[0]) * f; y = p[1] + (q[1] - p[1]) * f
        if i == 3:                                                       # Finnan's place goes; it fades off
            dot(d, p[0] - 200 * f, p[1], LFC, a * (1 - f)); continue
        dot(d, x, y, LFC, a)
    hb = ramp(t, 0.9, 1.6); dot(d, 640, 550, LFC, hb, ring=GOLD); tracked(d, (640, 488), "HAMANN", cond(28, 8), rgba(CREAM, hb), 4, "center")
    for p in ((700, 330), (700, 770), (900, 420)): dot(d, *p, LFC, a)
    g = ramp(t, 1.8, 3.2); gx = 820 + 420 * g; gy = 600 - 30 * g
    dot(d, gx, gy, LFC, a, ring=GOLD); tracked(d, (gx, gy - 62), "GERRARD", cond(30, 8), rgba(CREAM, a), 4, "center")
    if g > 0: arrow(d, (840, 640), (840 + 380 * g, 610), g, GOLD, 6, 20)
    for p in ((1300, 420), (1340, 680)): dot(d, *p, LFC, a)
    k = ramp(t, 0.5, 1.0)
    tracked(d, (W / 2, 950), "FOUR AT THE BACK BECOMES THREE  ·  GERRARD FURTHER FORWARD", cond(40, 8), rgba(GOLD, k), 7, "center")

# ---------------------------------------------------------------- IV. half-time
def odds(d, L, t, sc, v0, v1, k0, k1, kicker, sub, cx=W / 2, cy=700, r=440, a=1.0):
    """A big dial, 0-100 %, needle swinging from v0 to v1 between k0 and k1; the number counts."""
    f = ramp(t, k0, k1); v = v0 + (v1 - v0) * f
    d.pieslice((cx - r, cy - r, cx + r, cy + r), 180, 360, fill=rgba(NAVY_D, 0.92 * a), outline=rgba(CREAM, a), width=6)
    for i in range(11):
        an = math.pi + i * math.pi / 10
        d.line((cx + 0.86 * r * math.cos(an), cy + 0.86 * r * math.sin(an), cx + 0.97 * r * math.cos(an), cy + 0.97 * r * math.sin(an)), fill=rgba(CREAM, 0.7 * a), width=5)
        if i % 5 == 0: tracked(d, (cx + 0.74 * r * math.cos(an), cy + 0.74 * r * math.sin(an) - 14), f"{i * 10}%", cond(30, 8), rgba(CREAM, 0.7 * a), 3, "center")
    d.arc((cx - 0.93 * r, cy - 0.93 * r, cx + 0.93 * r, cy + 0.93 * r), 180, 180 + 180 * v / 100 + 0.01, fill=rgba(LFC, a), width=22)
    wob = 1.5 * math.sin(t * 13) * (1 - f) if 0 < f < 1 else 0
    an = math.pi + math.pi * (v + wob) / 100
    d.line((cx, cy, cx + 0.84 * r * math.cos(an), cy + 0.84 * r * math.sin(an)), fill=rgba(GOLD, a), width=12)
    d.ellipse((cx - 26, cy - 26, cx + 26, cy + 26), fill=rgba(GOLD, a))
    tracked(d, (W / 2, 120), kicker, cond(40, 8), rgba(GOLD, a), 10, "center")
    num = f"{v:.2f}%" if v < 1 else f"{v:.1f}%"
    text_top(d, (cx, cy + 50), num, pf(150, 900), rgba(CREAM, a), "center")
    tracked(d, (W / 2, 1000), sub, cond(36, 8), rgba(CREAM, 0.8 * a), 7, "center")

def odds_low(d, L, t, sc):
    a = ramp(t, 0, 0.4); k = at("Just over half of one per cent", sc)
    v0 = 50 - 49.45 * ramp(t, 0.3, k + 0.4)                              # the needle sinks to 0.55
    odds(d, L, t, sc, v0, v0, 0, 0.01, "OPTA  ·  LIVERPOOL'S CHANCE OF WINNING", "3–0 DOWN AT HALF-TIME", a=a)
    if t > k + 0.5: place_stamp(L, 1560, 300, ramp(t, k + 0.5, k + 0.7), text="0.55%", size=100, color=STAMP_RED, rot=-8)

def ynwa(d, L, t, sc):
    a = ramp(t, 0.05, 0.4)
    tracked(d, (W / 2, 380), "THE LIVERPOOL END  ·  HALF-TIME", cond(36, 8), rgba(GOLD, a), 10, "center")
    text_top(d, (W / 2, 470 + 20 * (1 - a)), "“You'll Never Walk Alone.”", pf(110, 800), rgba(CREAM, a), "center")
    w = 1100 * ramp(t, 0.4, 1.0)
    for k, col in enumerate((LFC, CREAM, LFC, CREAM, LFC)):         # a scarf stretching out
        d.rectangle((W / 2 - w / 2 + k * w / 5, 680, W / 2 - w / 2 + (k + 1) * w / 5, 730), fill=rgba(col, 0.9 * a))

# ---------------------------------------------------------------- V. six minutes
def six_minutes(d, L, t, sc):
    """A 54'-60' timeline: three goals drop onto it, the score smashes to 3-3, then the odds needle leaps."""
    a = ramp(t, 0, 0.3)
    tracked(d, (560, 250), "SIX MINUTES", cond(64, 8), rgba(GOLD, a), 16, "center")
    x0, x1, y = 130, 990, 640
    sweep = ramp(t, 0.2, 2.0); xm = x0 + (x1 - x0) * sweep
    d.rounded_rectangle((x0, y - 14, x1, y + 14), 14, fill=rgba(NAVY_D, 0.9 * a), outline=rgba(CREAM, 0.6 * a), width=3)
    d.rounded_rectangle((x0, y - 14, max(x0 + 28, xm), y + 14), 14, fill=rgba(LFC, a))
    for m in range(54, 61):
        x = x0 + (x1 - x0) * (m - 54) / 6
        d.line((x, y + 22, x, y + 44), fill=rgba(CREAM, 0.7 * a), width=3)
        tracked(d, (x, y + 60), f"{m}'", cond(30, 8), rgba(CREAM, 0.7 * a), 3, "center")
    for i, (m, who, how) in enumerate(((54, "GERRARD", "HEADER"), (56, "ŠMICER", "LOW SHOT"), (60, "ALONSO", "REBOUND"))):
        x = x0 + (x1 - x0) * (m - 54) / 6; k = 0.2 + 1.8 * (m - 54) / 6
        if t < k: continue
        b = ramp(t, k, k + 0.15); yy = y - 90 + drop_in(t, k, 0.35, 300)
        d.ellipse((x - 46, yy - 46, x + 46, yy + 46), fill=rgba(GOLD, b), outline=rgba(NAVY_D, b), width=4)
        text_top(d, (x, yy - 30), str(i + 1), pf(60, 900), rgba(NAVY_D, b), "center")
        tracked(d, (x, y + 130), who, cond(38, 8), rgba(CREAM, b), 5, "center")
        tracked(d, (x, y + 180), how, cond(26, 8), rgba(GOLD, b), 5, "center")
    k = at("Three–three.", sc); sl, sr, hit = score_at([(0, 3, 2), (k, 3, 3)], t)
    board(d, 1440, 200, "MILAN", "LIVERPOOL", sl, sr, a, hit, 0.52)
    b = ramp(t, k + 0.2, k + 0.6)
    f = ramp(t, k + 0.5, k + 1.8); v = 0.55 + (36.7 - 0.55) * f; R = 330; ox, oy = 1440, 780
    d.pieslice((ox - R, oy - R, ox + R, oy + R), 180, 360, fill=rgba(NAVY_D, 0.92 * b), outline=rgba(CREAM, b), width=5)
    d.arc((ox - 0.92 * R, oy - 0.92 * R, ox + 0.92 * R, oy + 0.92 * R), 180, 180 + 180 * v / 100 + 0.01, fill=rgba(LFC, b), width=20)
    an2 = math.pi + math.pi * v / 100
    d.line((ox, oy, ox + 0.84 * R * math.cos(an2), oy + 0.84 * R * math.sin(an2)), fill=rgba(GOLD, b), width=10)
    d.ellipse((ox - 20, oy - 20, ox + 20, oy + 20), fill=rgba(GOLD, b))
    tracked(d, (ox, 380), "OPTA  ·  LIVERPOOL'S WIN CHANCE", cond(32, 8), rgba(GOLD, b), 6, "center")
    text_top(d, (ox, oy + 40), f"{v:.2f}%" if v < 1 else f"{v:.1f}%", pf(110, 900), rgba(CREAM, b), "center")
    tracked(d, (ox, oy + 200), "UP FROM 0.55%", cond(36, 8), rgba(GOLD, ramp(t, k + 1.8, k + 2.2)), 6, "center")

# ---------------------------------------------------------------- VII. penalties
KICKS = [("SERGINHO", 0, False, ("Milan's first taker blazed", 1.2)), ("HAMANN", 1, True, ("Liverpool scored.", 0.2)),
         ("PIRLO", 0, False, ("Then Milan missed again", 1.3)), ("CISSÉ", 1, True, ("Both teams scored.", 0.1)),
         ("TOMASSON", 0, True, ("Both teams scored.", 0.8)), ("RIISE", 1, False, ("Then Milan's keeper saved one", 0.6)),
         ("KAKÁ", 0, True, ("Then both teams scored again", 0.1)), ("ŠMICER", 1, True, ("Then both teams scored again", 0.9)),
         ("SHEVCHENKO", 0, False, ("The keeper dived", 1.3))]
def shootout(d, L, t, sc):
    a = ramp(t, 0, 0.3)
    tracked(d, (W / 2, 130), "THE SHOOT-OUT", cond(44, 8), rgba(GOLD, a), 12, "center")
    for row, (team, col) in enumerate((("MILAN", WHITE), ("LIVERPOOL", LFC))):
        y = 330 + row * 330
        d.rounded_rectangle((90, y - 110, 1830, y + 150), 18, fill=rgba(NAVY_D, 0.85 * a), outline=rgba(col, 0.6 * a), width=4)
        tracked(d, (140, y - 30), team, cond(54, 8), rgba(col, a), 8)
    tally = [0, 0]; slot = [0, 0]
    for name, side, ok, when in KICKS:
        k = T(when, sc); i = slot[side]; slot[side] += 1
        if t < k: continue
        x = 600 + i * 270; y = 330 + side * 330; b = ramp(t, k, k + 0.15)
        s_ = 1 + 0.6 * max(0, 1 - (t - k) / 0.3)
        r = 70 * s_
        d.ellipse((x - r, y - 20 - r, x + r, y - 20 + r), fill=rgba(GOLD if ok else NAVY_D, b), outline=rgba(GOLD if ok else LFC, b), width=6)
        (tick if ok else cross)(d, x, y - 20, 64 * s_, NAVY_D if ok else LFC, b)
        tracked(d, (x, y + 75), name, cond(30 if len(name) < 9 else 26, 8), rgba(CREAM, b), 4, "center")
        tally[side] += ok
    text_top(d, (W / 2, 780), f"{tally[0]}–{tally[1]}", pf(110, 900), rgba(CREAM, a), "center")
    tracked(d, (W / 2 - 150, 820), "MILAN", cond(40, 8), rgba(CREAM, 0.8 * a), 6, "right")
    tracked(d, (W / 2 + 150, 820), "LIVERPOOL", cond(40, 8), rgba(CREAM, 0.8 * a), 6, "left")
    k = at("The keeper dived", sc) + 1.6
    if t > k:
        place_stamp(L, W / 2, 1000, ramp(t, k, k + 0.2), text="LIVERPOOL WIN 3–2", size=70, color=GOLD, rot=-6)

def save_quote(d, L, t, sc):
    a = ramp(t, 0.1, 0.5)
    tracked(d, (W / 2, 320), "JERZY DUDEK  ·  117TH MINUTE", cond(40, 8), rgba(GOLD, a), 10, "center")
    text_top(d, (W / 2, 420 + 20 * (1 - a)), "The save of his career.", pf(120, 800), rgba(CREAM, a), "center")
    place_stamp(L, W / 2, 760, ramp(t, 0.9, 1.1), text="SAVED", size=150, color=GOLD, rot=-7)

# ---------------------------------------------------------------- VIII. what happened next
def five_cups(d, L, t, sc):
    tracked(d, (W / 2, 140), "LIVERPOOL  ·  EUROPEAN CUPS", cond(40, 8), rgba(GOLD, ramp(t, 0, 0.4)), 10, "center")
    years = ["1977", "1978", "1981", "1984", "2005"]; landed = 0
    for i, yr in enumerate(years):
        k = 0.2 + i * 0.3; b = ramp(t, k, k + 0.1)
        if b <= 0: continue
        x = W / 2 + (i - 2) * 330; gold = yr == "2005"; landed += t >= k + 0.35
        trophy(d, x, 640 + drop_in(t, k, 0.35, 300), 300 if gold else 250, b, GOLD if gold else (200, 205, 212), (t - k - 0.35) / 0.5 if t > k + 0.35 else -1)
        tracked(d, (x, 680), yr, cond(44, 8), rgba(GOLD if gold else CREAM, b), 6, "center")
    s = at("Under the rules of the time", sc) + 0.8
    if t > s:
        tracked(d, (W / 2, 790), "THE RULE: WIN IT FIVE TIMES", cond(48, 8), rgba(CREAM, ramp(t, s, s + 0.4)), 8, "center")
        place_stamp(L, W / 2, 960, ramp(t, s + 0.6, s + 0.8), text="KEEP THE CUP", size=100, color=GOLD, rot=-6)

def qualifying(d, L, t, sc):
    a = ramp(t, 0, 0.3)
    tracked(d, (W / 2, 120), "2005–06  ·  THE HOLDERS' ROUTE", cond(40, 8), rgba(GOLD, a), 10, "center")
    place_stamp(L, W / 2, 270, ramp(t, 0.15, 0.35) * (1 - ramp(t, 2.2, 2.5)), text="EXCEPTION", size=130, color=GOLD, rot=-6)
    k = at("The holders could defend", sc)
    steps = ["1ST QUALIFYING ROUND", "2ND QUALIFYING ROUND", "3RD QUALIFYING ROUND", "GROUP STAGE"]
    for i, s_ in enumerate(steps):
        b = ramp(t, k + i * 0.25, k + i * 0.25 + 0.3)
        if b <= 0: continue
        y = 880 - i * 150; x0 = 380 + i * 170
        d.rectangle((x0, y, x0 + 820, y + 120), fill=rgba(NAVY_D, 0.92 * b), outline=rgba(GOLD if i == 3 else CREAM, b), width=4)
        tracked(d, (x0 + 40, y + 40), s_, cond(44, 8), rgba(CREAM if i else GOLD, b), 6)
    m = ramp(t, atf("The holders could defend", 0.7, sc), atf("The holders could defend", 0.7, sc) + 0.3)
    if m > 0:
        bx = 380 + 820 + 60; by = 880 + 60 + drop_in(t, atf("The holders could defend", 0.7, sc), 0.35, 400)
        d.ellipse((bx - 85, by - 85, bx + 85, by + 85), fill=rgba(LFC, m), outline=rgba(GOLD, m), width=6)
        tracked(d, (bx, by - 14), "HOLDERS", cond(24, 8), rgba(CREAM, m), 3, "center")
        tracked(d, (bx + 110, by - 18), "START HERE", cond(36, 8), rgba(GOLD, m), 6)

def what_next(d, L, t, sc):
    """Three panels: the manager, the fans, the dancing keeper. Then YOU DECIDE."""
    tracked(d, (W / 2, 120), "WHAT DO YOU THINK?", cond(44, 8), rgba(GOLD, ramp(t, 0, 0.4)), 10, "center")
    panels = [(M + M_RAFA, "THE MANAGER'S CHANGES?", "Was it the manager's", 0.5, 0.35), (RED_END, "THE FANS SINGING?", "The fans singing", 0.5, 0.45),
              (SHOOTOUT, "WOBBLY LEGS?", "Or a goalkeeper with wobbly", 0.5, 0.3)]
    for i, (path, lab, snip, fy, fx) in enumerate(panels):
        k = at(snip, sc) - 0.1 if i else min(0.1, at(snip, sc)); b = ramp(t, k, k + 0.35)
        if b <= 0: continue
        x0 = 90 + i * 590; y0 = 220 + 160 * (1 - b)
        paste_box(L, path, x0, y0, 560, 620, b, fy, fx if i else 0.78)
        d.rectangle((x0, y0 + 620, x0 + 560, y0 + 720), fill=rgba(NAVY_D, 0.92 * b))
        tracked(d, (x0 + 280, y0 + 650), lab, cond(36, 8), rgba(CREAM, b), 5, "center")
    k = at("Tell me what you think", sc)
    place_stamp(L, W / 2, 560, ramp(t, k, k + 0.25), text="YOU DECIDE", size=130, color=GOLD, rot=-5)

# ---------------------------------------------------------------- timeline
FIRST = "At half-time in the 2005"
scenes = [
    opening(DUSK, "Istanbul 2005.", "EPISODE TWO  ·  3–0 DOWN AT HALF-TIME", credit="AI illustration"),
    # cold open
    VS(FIRST, "ai_stadium_dusk_clip.mp4", chapter="ISTANBUL  ·  25 MAY 2005"),
    Custom(SF(FIRST, 0.42), scoreboard("HALF-TIME  ·  2005 CHAMPIONS LEAGUE FINAL", [(0, 0, 0), (0.35, 1, 0), (0.95, 2, 0), (1.55, 3, 0)], scorers=[(0.35, "MALDINI 1'"), (0.95, "CRESPO 39'"), (1.55, "CRESPO 44'")]), bg=bg_of(RED_END, 0.8)),
    AS("Nobody comes back from that", "ai_dressing_room.png", zoom=(1.0, 1.12), focus=((0.45, 0.5), (0.4, 0.55))),
    CuS("Fifteen minutes into the second half", scoreboard("FIFTEEN MINUTES LATER", [(0, 3, 0), (1.3, 3, 1), (2.2, 3, 2), (3.1, 3, 3)], clock=(45, 60, 0.3, 3.4), scorers=[(1.3, "54'"), (2.2, "56'"), (3.1, "60'")]),
        bg=bg_of(RED_END, 0.8)),
    PS("This is the story of Liverpool's", M_CONFETTI, zoom=(1.0, 1.1), focus=((0.5, 0.45), (0.52, 0.4))),
    # I. the outsiders
    PS("Liverpool shouldn't really", KOP_OUT, zoom=(1.0, 1.1), chapter=CH("I", "THE OUTSIDERS"), strap=("Anfield", "LIVERPOOL FC", 0.6)),
    PS("They had a new Spanish manager", BENITEZ, zoom=(1.05, 1.18), focus=((0.45, 0.45), (0.42, 0.42)), strap=("Rafael Benítez", "MANAGER  ·  FIRST SEASON", 0.5)),
    CuS("In the Premier League, they finished", league_table, bg=bg_of(C + KOP_IN, 0.84)),
    CuS("And in Europe, they nearly", calendar, bg=bg_of(C + KOP_IN, 0.84)),
    PS("In their last group game", KOP_IN, zoom=(1.0, 1.12), strap=("Liverpool v Olympiacos", "ANFIELD  ·  8 DECEMBER 2004", 0.5)),
    Custom(SF("And because they'd lost", 0.15), win_by_two, bg=bg_of(C + KOP_IN, 0.84)),
    PC("Then a Brazilian World Cup winner", RIVALDO, "Rivaldo", "OLYMPIACOS  ·  WORLD CUP WINNER",
       texts=[(S("At half-time, Liverpool were losing") - S("Then a Brazilian World Cup winner", -0.15) - 0.2, "Half-time: 0–1.", "big")]),
    Custom(SF("At half-time, Liverpool were losing", 0.55), tracker("HALF-TIME  ·  " + "ANFIELD", [(0, 0, 1)], 0, needed_at=("Now they needed three", 0.2),
           note=("THREE GOALS  ·  45 MINUTES", ("Now they needed three", 1.4), CREAM)), bg=bg_of(C + KOP_IN, 0.84)),
    PS("The manager sent on a young French", PONGOLLE, zoom=(1.0, 1.1), strap=("Florent Sinama-Pongolle", "SUBSTITUTE", 0.4)),
    CuS("Two minutes after the restart", tracker("47'  ·  SINAMA-PONGOLLE", [(0, 0, 1), (("One–one.", -0.1), 1, 1)], 1),
        bg=bg_of(C + KOP_IN, 0.84)),
    PC("With nine minutes left", MELLOR, "Neil Mellor", "81'  ·  2–1"),
    CuS("But that still wasn't enough", tracker("81'  ·  NEIL MELLOR", [(0, 2, 1)], 2, clock=(81, 86), note=("STILL ONE SHORT", 0.4, LFC)),
        bg=bg_of(C + KOP_IN, 0.84)),
    PS("Then, with four minutes to go", GERRARD12, zoom=(1.0, 1.1), focus=((0.55, 0.45), (0.55, 0.4)), strap=("Steven Gerrard", "CAPTAIN", 0.5)),
    Custom(SF("Then, with four minutes to go", 0.55), gerrard_goal),
    CuS("Three–one.", tracker("86'  ·  STEVEN GERRARD", [(0, 2, 1), (0.15, 3, 1)], 3, stamp=("THROUGH", ("Liverpool were through", 0.0), GOLD)),
        bg=bg_of(C + KOP_IN, 0.84)),
    AS("Looking back, it was a sign", "ai_trophy_fireworks.png", zoom=(1.0, 1.12), texts=[(0.6, "A sign of things to come.", "mid")]),
    CuS("After that, they knocked out", route, bg=bg_of(NIGHT, 0.82)),
    PS("And somehow, they were in the final", STADIUM_IN, zoom=(1.0, 1.1)),
    # II. the giants
    AS("So to the final", "ai_istanbul_night.png", zoom=(1.0, 1.12), focus=((0.6, 0.4), (0.65, 0.35)), chapter=CH("II", "THE GIANTS")),
    CuS("AC Milan.", milan, bg=bg_of(C + STADIUM_IN, 0.84)),
    Custom(S("Two of the best defenders", -0.35), portraits),
    PS("The final was at the national stadium", STADIUM_OUT, zoom=(1.0, 1.1), strap=("Atatürk Olympic Stadium", "ISTANBUL  ·  25 MAY 2005", 0.8)),
    CuS("Liverpool in red.", kits, bg=bg_of(DUSK, 0.84)),
    # III. the first half
    CuS("It took Milan less than a minute", scoreboard("KICK-OFF", [(0, 0, 0), (1.4, 1, 0)],
        sub=("LESS THAN A MINUTE", 2.2)), bg=bg_of(C + STADIUM_IN, 0.82), chapter=CH("III", "THE FIRST HALF")),
    PC("A free kick came in, and the Milan captain", MALDINI, "Paolo Maldini", "MILAN CAPTAIN  ·  0:50"),
    CuS("About fifty seconds on the clock", fifty_seconds),
    CuS("Then Liverpool lost Harry Kewell", sub_board("23'  ·  INJURY", "KEWELL", "ŠMICER")),
    PS("A Czech midfielder came on", SMICER, zoom=(1.0, 1.1), focus=((0.5, 0.35), (0.5, 0.3)), strap=("Vladimír Šmicer", "ON FOR KEWELL", 0.4),
       texts=[(S("Remember him.") - S("A Czech midfielder came on", -0.15), "Remember him.", "big")]),
    CuS("Six minutes before the break", play("39'  ·  SHEVCHENKO CROSSES  ·  CRESPO SCORES",
        [("SHEVCHENKO", WHITE, [(0.2, 1250, 260), (1.4, 1530, 230)]), ("CRESPO", WHITE, [(0.2, 1300, 640), (2.2, 1600, 580)]),
         ("", KEEPER, [(0, PX1 - 25, PYM), (2.3, PX1 - 30, PYM - 30)])],
        [(0.2, 1100, 300), (1.4, 1530, 245), (2.2, 1585, 575, 0, 40), (2.6, PX1 + 22, PYM + 30)],
        events=[(2.6, "GOAL", GOLD, 1420, 820)], score=("MILAN", "LIVERPOOL", [(0, 1, 0), (2.7, 2, 0)]),
        others=[(LFC, 1450, 420), (LFC, 1480, 640), (LFC, 1380, 520), (LFC, 1200, 740)])),
    Custom(SF("Six minutes before the break", 0.74), player_card(CRESPO, "Hernán Crespo", "39'  ·  2–0"), bg=bg_of(C + STADIUM_IN, 0.78)),
    PC("Right on half-time, Milan's young Brazilian", KAKA, "Kaká", "MILAN'S PLAYMAKER"),
    Custom(SF("Right on half-time, Milan's young Brazilian", 0.6), play("44'  ·  KAKÁ'S PASS  ·  CRESPO'S CHIP",
        [("KAKÁ", WHITE, [(0, 760, 600)]), ("CRESPO", WHITE, [(0.3, 1050, 360), (1.9, 1450, 440), (2.6, 1560, 470)]),
         ("", KEEPER, [(0, PX1 - 25, PYM), (2.0, 1560, 520), (3.0, 1570, 520)])],
        [(0.6, 775, 590), (1.9, 1440, 450), (2.5, 1500, 455), (3.3, PX1 + 20, PYM - 20, 0, 150)],
        events=[(3.3, "GOAL", GOLD, 1420, 820), (2.6, "CHIPPED", CREAM, 1500, 300)], score=("MILAN", "LIVERPOOL", [(0, 2, 0), (3.4, 3, 0)]),
        others=[(LFC, 1250, 380), (LFC, 1180, 560), (LFC, 1250, 720), (LFC, 1000, 470)])),
    # IV. half-time
    PS("Three–nil to Milan at the break", M_HURDLE, zoom=(1.0, 1.1), focus=((0.5, 0.55), (0.55, 0.6)), chapter=CH("IV", "HALF-TIME"),
       texts=[(0.4, "Half-time. Milan 3–0 Liverpool.", "mid")]),
    Custom(SF("Years later, the data company", 0.6), odds_low, bg=bg_of(DRESSING, 0.85)),
    AS("In the dressing room, the manager", "ai_dressing_room.png", zoom=(1.1, 1.25), focus=((0.6, 0.5), (0.62, 0.45)),
       texts=[(S("He changed the plan.") - S("In the dressing room, the manager", -0.15), "He changed the plan.", "big")]),
    CuS("A German midfielder came on", sub_board("HALF-TIME", "FINNAN", "HAMANN", note=("DIETMAR HAMANN ON  ·  STEVE FINNAN OFF", 0.9)), bg=bg_of(DRESSING, 0.86)),
    CuS("Liverpool switched to three at the back", formation),
    VS("Meanwhile, up in the stands", "ai_red_end_clip.mp4"),
    CuS("Never Walk Alone", ynwa, bg=bg_of(RED_END, 0.8)),
    PS("Some of the players say", YNWA, crop=(0.0, 0.2, 1.0, 0.92), zoom=(1.0, 1.1), focus=((0.4, 0.5), (0.35, 0.55))),
    AS("Either way, the fans hadn't", "ai_red_end_halftime.png", zoom=(1.12, 1.25), focus=((0.25, 0.55), (0.3, 0.5)),
       texts=[(S("So why should the team?") - S("Either way, the fans hadn't", -0.15), "So why should the team?", "big")]),
    # V. six minutes
    PS("Nine minutes into the second half", RIISE, zoom=(1.0, 1.1), focus=((0.6, 0.45), (0.6, 0.4)), chapter=CH("V", "SIX MINUTES"),
       strap=("John Arne Riise", "LEFT-BACK  ·  THE CROSS", 0.5)),
    CuS("Gerrard rose and headed it in", scoreboard("54'  ·  GERRARD  ·  HEADER", [(0, 3, 0), (0.5, 3, 1)], sub=("GAME ON?", 1.4)), bg=bg_of(RED_END, 0.8)),
    PS("Two minutes later, the Czech", SMICER, zoom=(1.12, 1.25), focus=((0.5, 0.35), (0.5, 0.3)), strap=("Vladimír Šmicer", "56'", 0.4)),
    CuS("It skidded past the Milan keeper", play("56'  ·  ŠMICER  ·  PAST DIDA",
        [("ŠMICER", LFC, [(0, 1080, 640)]), ("DIDA", KEEPER, [(0, PX1 - 25, PYM), (0.9, PX1 - 30, PYM + 40)])],
        [(0.1, 1095, 635), (1.0, PX1 + 20, PYM + 58)], events=[(1.0, "GOAL", GOLD, 1420, 300)],
        score=("MILAN", "LIVERPOOL", [(0, 3, 1), (("Three–two.", 0), 3, 2)]),
        others=[(WHITE, 1300, 520), (WHITE, 1350, 700), (WHITE, 1250, 380), (LFC, 1450, 470)])),
    PS("Then Gerrard was brought down", GATTUSO, zoom=(1.0, 1.1), focus=((0.5, 0.3), (0.5, 0.25)), strap=("Gennaro Gattuso", "FOULS GERRARD", 0.4),
       texts=[(S("Penalty.") - S("Then Gerrard was brought down", -0.15), "Penalty.", "big")]),
    PS("Liverpool's Spanish midfielder", M_ALONSO, zoom=(1.0, 1.1), focus=((0.4, 0.3), (0.4, 0.25)), strap=("Xabi Alonso", "60'  ·  PENALTY", 0.4)),
    CuS("The keeper saved it", play("60'  ·  XABI ALONSO  ·  SAVED BY DIDA  ·  THE REBOUND",
        [("ALONSO", LFC, [(0, 1360, PYM), (("But the ball came straight", 0.3), 1360, PYM), (("But the ball came straight", 1.3), 1575, 640)]),
         ("DIDA", KEEPER, [(0, PX1 - 25, PYM), (0.55, PX1 - 30, 485), (("But the ball came straight", 1.4), PX1 - 35, 495)])],
        [(0.1, 1380, PYM), (0.55, PX1 - 30, 495), (("But the ball came straight", 0.6), 1590, 630),
         (("But the ball came straight", 1.4), 1590, 630), (("But the ball came straight", 1.8), PX1 + 20, PYM + 50)],
        events=[(0.6, "SAVED", CREAM, 1420, 300), (("But the ball came straight", 1.8), "GOAL", GOLD, 1420, 820)],
        score=("MILAN", "LIVERPOOL", [(0, 3, 2), (("But the ball came straight", 1.9), 3, 3)]),
        others=[(WHITE, 1150, 420), (WHITE, 1150, 680), (LFC, 1170, 550)])),
    CuS("Three goals in six minutes", six_minutes),
    # VI. the save
    AS("After that, Milan took control", "ai_extra_time.png", zoom=(1.0, 1.12), chapter=CH("VI", "THE SAVE"),
       texts=[(S("Liverpool clung on into extra time") - S("After that, Milan took control", -0.15), "Extra time.", "big")]),
    AS("With three minutes left", "ai_sheva_close.png", zoom=(1.0, 1.12), strap=("Andriy Shevchenko", "117'  ·  IN FRONT OF GOAL", 0.5),
       fallback=AS("With three minutes left", "ai_shootout_behind_goal.png", zoom=(1.05, 1.18), strap=("Andriy Shevchenko", "117'  ·  IN FRONT OF GOAL", 0.5))),
    Custom(SF("With three minutes left", 0.75), play("117'  ·  SHEVCHENKO  v  DUDEK",
        [("SHEVCHENKO", WHITE, [(0, 1540, 520), (("Liverpool's Polish goalkeeper", 0.6), 1560, 540), (("Liverpool's Polish goalkeeper", 2.4), 1610, 520)]),
         ("_DUDEK", KEEPER, [(0, PX1 - 25, PYM), (("Liverpool's Polish goalkeeper", 0.8), PX1 - 60, 545), (("Liverpool's Polish goalkeeper", 2.6), PX1 - 50, 520)])],
        [(0, 1300, 330), (("Liverpool's Polish goalkeeper", 0.3), 1545, 525, 0, 80), (("Liverpool's Polish goalkeeper", 0.8), PX1 - 70, 540),
         (("Liverpool's Polish goalkeeper", 1.6), 1615, 515)],
        events=[(("Liverpool's Polish goalkeeper", 0.8), "BLOCKED", CREAM, 1420, 300), (("Liverpool's Polish goalkeeper", 2.2), "IT COMES BACK…", GOLD, 1420, 820)],
        score=("MILAN", "LIVERPOOL", [(0, 3, 3)]),
        others=[(LFC, 1450, 640), (LFC, 1420, 420), (WHITE, 1350, 520)])),
    PC("The ball came straight back to the striker", DUDEK, "Jerzy Dudek", "v ANDRIY SHEVCHENKO",
       texts=[(S("Somehow, the keeper threw up") - S("The ball came straight back to the striker", -0.15) + 0.6, "Over the bar.", "big")]),
    CuS("He later called it the save", save_quote, bg=bg_of(C + DUDEK, 0.8)),
    # VII. penalties
    AS("And so the game was going to penalties", "ai_shootout_behind_goal.png", zoom=(1.0, 1.12), chapter=CH("VII", "PENALTIES")),
    PS("Before the shoot-out, Jamie Carragher", CARRA, zoom=(1.0, 1.08), focus=((0.5, 0.3), (0.5, 0.25)), strap=("Jamie Carragher", "LIVERPOOL DEFENDER", 0.6),
       texts=[(S("Put them off, he said.") - S("Before the shoot-out, Jamie Carragher", -0.15), "“Put them off.”", "big")]),
    PS("Do what Liverpool's keeper did", GROBBELAAR, zoom=(1.0, 1.1), focus=((0.35, 0.45), (0.32, 0.4)), strap=("Bruce Grobbelaar", "LIVERPOOL KEEPER  ·  ROME 1984", 0.5)),
    VS("So the keeper danced on his line", "ai_shootout_clip.mp4", end=1.6),   # after 1.6 s the striker just taps the ball (Mike)
    AS("Wobbly legs.", "ai_shootout_behind_goal.png", zoom=(1.05, 1.2), focus=((0.5, 0.6), (0.5, 0.62)),
       texts=[(0.15, "Wobbly legs.", "mid"), (S("Arms everywhere.") - S("Wobbly legs.", -0.15), "Arms everywhere.", "mid+")]),
    CuS("Milan's first taker blazed", shootout, bg=bg_of(SHOOTOUT, 0.84)),
    PC("Then Milan missed again", PIRLO, "Andrea Pirlo", "SAVED BY DUDEK"),
    CuS("Both teams scored.", shootout, bg=bg_of(SHOOTOUT, 0.84)),
    AS("Which left Milan's star striker", "ai_sheva_walk.png", zoom=(1.0, 1.1), strap=("Andriy Shevchenko", "EUROPEAN FOOTBALLER OF THE YEAR", 0.4),
       fallback=PC("Which left Milan's star striker", SHEVA, "Andriy Shevchenko", "EUROPEAN FOOTBALLER OF THE YEAR")),
    CuS("The keeper dived, and stopped it", shootout, bg=bg_of(SHOOTOUT, 0.84)),
    VS("Liverpool were champions of Europe", "ai_trophy_fireworks_clip.mp4", texts=[(0.4, "Champions of Europe.", "big")]),
    # VIII. what happened next
    PS("It was Liverpool's fifth European Cup", MEDAL, zoom=(1.0, 1.1), focus=((0.5, 0.6), (0.5, 0.7)), chapter=CH("VIII", "WHAT HAPPENED NEXT"),
       strap=("The winners' medal", "ISTANBUL  ·  2005", 0.4)),
    CuS("Under the rules of the time", five_cups, bg=bg_of(C + CUP, 0.84)),
    PS("They were the last club ever", CUP, zoom=(1.0, 1.12), focus=((0.5, 0.45), (0.5, 0.4)), texts=[(0.5, "The original. Theirs for good.", "mid")]),
    PS("But there was a problem", M_LIFT, zoom=(1.0, 1.1), focus=((0.55, 0.35), (0.55, 0.3)),
       texts=[(S("Liverpool's fifth place in the league") - S("But there was a problem", -0.15), "5th in the league.", "mid"),
              (S("Liverpool's fifth place in the league") - S("But there was a problem", -0.15) + 2.0, "No place next season.", "mid+")]),
    CuS("UEFA made an exception", qualifying, bg=bg_of(C + PARADE, 0.84)),
    PS("And that Czech substitute never", SMICER, zoom=(1.0, 1.1), focus=((0.5, 0.4), (0.5, 0.35)), strap=("Vladimír Šmicer", "NEXT CLUB: BORDEAUX", 0.6),
       texts=[(S("His penalty in Istanbul") - S("And that Czech substitute never", -0.15), "His last kick for Liverpool.", "mid")]),
    PS("Two years later, the same two teams", ATHENS, zoom=(1.0, 1.1), strap=("Athens", "LIVERPOOL FANS  ·  23 MAY 2007", 0.8)),
    CuS("Milan won it, two–one.", scoreboard("THE 2007 FINAL  ·  ATHENS", [(0, 0, 0), (0.3, 2, 1)]), bg=bg_of(C + ATHENS, 0.82)),
    PS("But in Liverpool, one word", PARADE, zoom=(1.0, 1.1), strap=("Liverpool", "THE PARADE  ·  26 MAY 2005", 0.5)),
    PF("But in Liverpool, one word", 0.8, M_KISS, zoom=(1.0, 1.1), focus=((0.6, 0.45), (0.62, 0.4)), texts=[(0.5, "Istanbul.", "big")]),
    # IX. what if
    PC("So here's the question", DUDEK, "Jerzy Dudek", "THE SAVE", bg=NIGHT, chapter=CH("IX", "WHAT IF"),
       texts=[(S("What if that save in extra time") - S("So here's the question", -0.15), "What if that save doesn't happen?", "mid")]),
    CuS("Was it the manager's changes?", what_next, bg=bg_of(RED_END, 0.84)),
    CuS("This was Impossible", impossible_end("Istanbul.")),
]

if __name__ == "__main__":
    main(scenes, FINAL)
