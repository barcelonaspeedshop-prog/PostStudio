"""IMPOSSIBLE 02 v2: Istanbul 2005, the detailed cut -> PostDrive/.../02 Istanbul/video/IMPOSSIBLE 02 v2 - Istanbul.mp4

    ~/.venvs/poststudio/bin/python build_v2.py            # full render (+ review 720p)
    ~/.venvs/poststudio/bin/python build_v2.py 95 125     # preview slice (video seconds)

v2 (14 Oct): script_v2.md, narration audio/v2 (Rode unwrapped, Voice F), names spoken again. The half-time explainer
is tactics_wrong / tactics_change (full-pitch animations, one continuous piece each). Scorelines read MILAN – LIVERPOOL (Milan were the home side).
AI clips (media/ai/*.mp4) are 5 s Runway shots of the AI stills; the shoot-out clip is used to 2.9 s only.
"""
import math, os, sys
VDIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(VDIR, "..", "..", "..", "studio"))
import episode as E
E.init("/Volumes/PostDrive/Omnira Football/Videos/Istanbul (IMPOSSIBLE)/", series="impossible", narration="audio/v2/")
from episode import *

FINAL = "IMPOSSIBLE 02 v2 - Istanbul.mp4"
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
            txt, s0, col = stamp; place_stamp(L, W / 2, 965, ramp(t, T(s0, sc), T(s0, sc) + 0.2), text=txt, size=120, color=col, rot=-5)   # below the balls (Mike 10-15: was half hidden)
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
        im = load(C + path if os.path.exists(C + path) else M + path); h = min(760, int(im.height * 1.15)); w_ = int(im.width * h / im.height)
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

from factcard import FactCard
def FC(snip, path, name, role, facts=(), off=-0.15, start=None, **kw):
    """A fact card (Mike 10-16): the person, plus short facts landing one by one. Fact times: seconds or (snippet, offset)."""
    full = C + path if os.path.exists(C + path) else (M + path if os.path.exists(M + path) else path)
    fs = [((lambda sc, v=f[0]: T(v, sc)),) + tuple(f[1:]) for f in facts]
    return FactCard(S(snip, off) if start is None else start, full, name, role, facts=fs, **kw)

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
    k = at("For a second, nobody moved", sc) + 0.9
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

# ---------------------------------------------------------------- v2: the half-time explainer (full pitch, Liverpool attack right)
FX0, FX1, FY0, FY1 = 210, 1710, 130, 950
FXM, FYM = (FX0 + FX1) / 2, (FY0 + FY1) / 2
HAMANN_P = "Dietmar_hamann.jpg"

def full_pitch(d, a):
    ln = rgba(CREAM, 0.55 * a)
    d.rectangle((FX0 - 30, FY0 - 30, FX1 + 30, FY1 + 30), fill=rgba((24, 70, 40), 0.55 * a))
    for k in range(10):                                                   # mown stripes
        if k % 2: d.rectangle((FX0 + k * 150, FY0, FX0 + (k + 1) * 150, FY1), fill=rgba((40, 95, 55), 0.35 * a))
    d.rectangle((FX0, FY0, FX1, FY1), outline=ln, width=4)
    d.line((FXM, FY0, FXM, FY1), fill=ln, width=3)
    d.ellipse((FXM - 130, FYM - 130, FXM + 130, FYM + 130), outline=ln, width=3)
    for big, small in (((FX0, FX0 + 240), (FX0, FX0 + 85)), ((FX1 - 240, FX1), (FX1 - 85, FX1))):
        d.rectangle((big[0], FYM - 300, big[1], FYM + 300), outline=ln, width=3)
        d.rectangle((small[0], FYM - 130, small[1], FYM + 130), outline=ln, width=3)

def lerp(p, q, f): return (p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f)

def label_dot(d, x, y, col, a, name=None, ring=None, below=False, r=21):
    dot(d, x, y, col, a, r, ring)
    if name: tracked(d, (x, y + 34 if below else y - 64), name, cond(28, 8), rgba(CREAM, a), 4, "center")

def moving_ball(d, pts, t0, seg, t, a):
    """A ball passed along pts, one segment every `seg` seconds from t0; trail behind it."""
    if t < t0 or a <= 0: return
    u = (t - t0) / seg; i = min(int(u), len(pts) - 2); f = min(1.0, u - i)
    f = 0.5 - 0.5 * math.cos(math.pi * f)
    p = lerp(pts[i], pts[i + 1], f)
    d.line(list(pts[:i + 1]) + [p], fill=rgba(GOLD, 0.55 * a), width=5)
    ball(d, p[0], p[1], a)

# first half: Liverpool 4-4-2 (attacking right; top of the screen = Liverpool's left), Milan's diamond (attacking left)
LFC1 = {"GK": (260, FYM), "TRAORÉ": (470, 290), "HYYPIÄ": (450, 450), "CARRAGHER": (450, 630), "FINNAN": (470, 790),
        "RIISE": (760, 260), "ALONSO": (740, 455), "GERRARD": (740, 625), "GARCÍA": (760, 820), "F1": (1050, 470), "F2": (1050, 630)}
MILAN = {"DIDA": (1660, FYM), "M1": (1440, 290), "M2": (1420, 450), "M3": (1420, 630), "M4": (1440, 790),
         "GATTUSO": (1130, 390), "PIRLO": (1230, FYM), "SEEDORF": (1130, 690), "KAKÁ": (930, FYM), "SHEVCHENKO": (500, 380), "CRESPO": (500, 700)}
GAP = (545, 330, 715, 750)                                                # between Liverpool's back four and midfield four

def draw_side(d, pos, col, a, names=(), keeper=KEEPER):
    for k, (x, y) in pos.items():
        lab = k if k in names else None
        label_dot(d, x, y, keeper if k in ("GK", "DIDA") else col, a, lab)

def tactics_wrong(d, L, t, sc):
    """Section 5: the gap between Liverpool's lines, Kaká living in it, Pirlo free to pass."""
    a = ramp(t, 0, 0.5); full_pitch(d, a)
    tracked(d, (W / 2, 55), "FIRST HALF  ·  WHAT WAS GOING WRONG", cond(40, 8), rgba(GOLD, a), 10, "center")
    c = lambda s: at(s, sc)
    lines = ramp(t, c("Liverpool were playing four"), c("Liverpool were playing four") + 0.6)
    gap = ramp(t, c("And between those two lines"), c("And between those two lines") + 0.5)
    kk = ramp(t, c("That gap was where Kaká"), c("That gap was where Kaká") + 1.0)
    run0 = c("He'd drift into it")
    pir0 = c("Milan's midfield was full"); pir = ramp(t, pir0, pir0 + 0.5)
    if gap:                                                               # the gap pulses
        pulse = 0.5 + 0.5 * math.sin(t * 5)
        g = Image.new("RGBA", (W, H), (0, 0, 0, 0)); ImageDraw.Draw(g).rectangle(GAP, fill=rgba(LFC, (0.25 + 0.2 * pulse) * gap))
        L.alpha_composite(g.filter(ImageFilter.GaussianBlur(8)))
        tracked(d, ((GAP[0] + GAP[2]) / 2, GAP[3] + 20), "THE GAP", cond(36, 8), rgba(CREAM, gap), 8, "center")
    for x, lab in ((460, "BACK FOUR"), (750, "MIDFIELD FOUR")):
        if lines:
            d.line((x, 240, x, 860), fill=rgba(GOLD, 0.8 * lines), width=4)
            tracked(d, (x, 880), lab, cond(28, 8), rgba(GOLD, lines), 5, "center")
    draw_side(d, LFC1, LFC, a)
    mil = dict(MILAN); kx, ky = lerp(MILAN["KAKÁ"], (610, 520), kk)
    if t > run0:                                                          # drift, turn, run at the defence; repeat
        u = ((t - run0) % 4.0) / 4.0
        kx, ky = lerp((610, 520), (520, 560), ramp(u, 0.2, 0.6))
    mil["KAKÁ"] = (kx, ky)
    draw_side(d, mil, WHITE, a, names=("KAKÁ", "PIRLO") if pir else ("KAKÁ",))
    if kk: d.ellipse((kx - 40, ky - 40, kx + 40, ky + 40), outline=rgba(GOLD, kk), width=5)
    if t > run0 and t < pir0:
        u = (t - run0) % 4.0
        moving_ball(d, [MILAN["PIRLO"], (610, 520), (520, 560), (330, 690)], run0 + (t - run0) // 4.0 * 4.0, 0.9, t, a)
        if u > 2.6: arrow(d, (520, 600), (360, 690), ramp(u, 2.6, 3.0), RED, 5, 18)
        if c("Every time he got the ball") < t: tracked(d, (W / 2, 990), "EVERY TIME: TROUBLE", cond(40, 8), rgba(RED, ramp(t, c("Every time he got the ball"), c("Every time he got the ball") + 0.3)), 8, "center")
    if pir:                                                               # Pirlo sprays it around, nobody near him
        px, py = MILAN["PIRLO"]
        d.ellipse((px - 120, py - 120, px + 120, py + 120), outline=rgba(GOLD, 0.6 * pir), width=4)
        tracked(d, (px, py + 130), "TIME ON THE BALL", cond(28, 8), rgba(GOLD, pir), 5, "center")
        targets = [MILAN["GATTUSO"], MILAN["M1"], MILAN["SEEDORF"], MILAN["M4"], mil["KAKÁ"]]
        k = int((t - pir0) / 1.1) % len(targets); f = ((t - pir0) % 1.1) / 1.1
        q = targets[k]; p = lerp((px, py), q, min(1, f * 1.4))
        d.line(((px, py), p), fill=rgba(GOLD, 0.6 * pir), width=4); ball(d, p[0], p[1], pir)
    s = ramp(t, c("Too much space"), c("Too much space") + 0.3)
    if s > 0: place_stamp(L, W / 2, 1000 - 40, s, text="TOO MUCH SPACE  ·  TOO MUCH TIME", size=60, color=RED, rot=-3)

# second half: back three, Hamann in the gap, wing-backs, Gerrard forward
LFC2 = {"GK": (260, FYM), "TRAORÉ": (470, 330), "HYYPIÄ": (450, FYM), "CARRAGHER": (470, 750),
        "RIISE": (820, 200), "ALONSO": (790, 600), "GERRARD": (1150, 560), "ŠMICER": (820, 880), "F1": (1250, 430), "F2": (1250, 680)}
def tactics_change(d, L, t, sc):
    """Section 7: Finnan off, Hamann into the gap, back three, wing-backs, Gerrard forward."""
    a = ramp(t, 0, 0.5); full_pitch(d, a)
    tracked(d, (W / 2, 55), "SECOND HALF  ·  THE NEW SHAPE", cond(40, 8), rgba(GOLD, a), 10, "center")
    c = lambda s: at(s, sc)
    three = ramp(t, c("Liverpool went to three"), c("Liverpool went to three") + 1.2)
    ham = ramp(t, c("Hamann sat right in front"), c("Hamann sat right in front") + 1.0)
    shadow0 = c("Every time Kaká turned")
    ger = ramp(t, c("And with Hamann doing"), c("And with Hamann doing") + 1.6)
    wb0 = c("The wide players became"); wb = ramp(t, wb0, wb0 + 0.6)
    nogap = ramp(t, c("But now there was no gap"), c("But now there was no gap") + 0.4)
    close = ramp(t, c("And Gerrard was suddenly"), c("And Gerrard was suddenly") + 0.4)
    # the gap: red, then closed (gold) once Hamann is in it
    g = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(g).rectangle(GAP, fill=rgba(LFC, 0.3 * a * (1 - ham)) if ham < 1 else rgba(GOLD, 0.18 * a))
    L.alpha_composite(g.filter(ImageFilter.GaussianBlur(8)))
    if ham <= 0 or ham >= 1:                                              # hidden while Hamann walks through it (Mike 10-15)
        tracked(d, ((GAP[0] + GAP[2]) / 2, GAP[3] + 20), "GAP CLOSED" if ham >= 1 else "THE GAP", cond(36, 8), rgba(GOLD if ham >= 1 else CREAM, a), 8, "center")
    # Finnan leaves (already gone by the start of this scene, fading out over the first second)
    fx, fy = LFC1["FINNAN"]; fo = ramp(t, 0, 1.0)
    if fo < 1: label_dot(d, fx, fy + 200 * fo, LFC, a * (1 - fo), "FINNAN OFF", below=True)
    names = ["TRAORÉ", "HYYPIÄ", "CARRAGHER"] if three else []
    for k in ("GK", "TRAORÉ", "HYYPIÄ", "CARRAGHER", "RIISE", "ALONSO", "GERRARD", "F1", "F2"):
        p1 = LFC1[k]; p2 = LFC2[k]
        f = three if k in ("TRAORÉ", "HYYPIÄ", "CARRAGHER") else (ger if k == "GERRARD" else (wb if k == "RIISE" else three))
        x, y = lerp(p1, p2, f)
        if k == "RIISE" and wb >= 1: x += 230 * math.sin((t - wb0) * 1.6)               # up and down the line
        nm = k if (k in names or (k == "GERRARD" and ger) or (k == "RIISE" and wb)) else None
        label_dot(d, x, y, KEEPER if k == "GK" else LFC, a, nm, ring=GOLD if (k == "GERRARD" and close) else None)
    # Šmicer moves from midfield-right (García's spot) to right wing-back
    sx, sy = lerp(LFC1["GARCÍA"], LFC2["ŠMICER"], wb)
    if wb >= 1: sx += 230 * math.sin((t - wb0) * 1.6 + 2.5)
    label_dot(d, sx, sy, LFC, a, "ŠMICER" if wb else None, below=True)
    # Hamann comes on from the touchline into the gap, then shadows Kaká
    on = ramp(t, 0.3, 1.3); hx, hy = lerp((600, FY1 + 50), (630, 560), ham)          # waits on the touchline, then walks in
    kx, ky = MILAN["KAKÁ"]
    if t > shadow0:                                                       # Kaká tries the gap; Hamann is always there
        u = ((t - shadow0) % 3.0) / 3.0; kx, ky = lerp((930, FYM), (690, 470 + 140 * (int((t - shadow0) / 3.0) % 2)), ramp(u, 0.1, 0.5))
        hx, hy = lerp((630, 560), (kx - 55, ky + 10), ramp(u, 0.25, 0.6))
    label_dot(d, hx, hy, LFC, a * on, "HAMANN", ring=GOLD, below=hy > FY1 - 40)
    mil = dict(MILAN); mil["KAKÁ"] = (kx, ky)
    draw_side(d, mil, WHITE, a, names=("KAKÁ",) if t > c("Hamann sat right in front") else ())
    if t > shadow0 and ((t - shadow0) % 3.0) / 3.0 > 0.55:
        cross(d, kx - 110, ky - 60, 46, RED, ramp(((t - shadow0) % 3.0) / 3.0, 0.55, 0.65))
    if ger:
        gx, gy = lerp(LFC1["GERRARD"], LFC2["GERRARD"], ger)
        arrow(d, (LFC1["GERRARD"][0] + 30, LFC1["GERRARD"][1]), (gx - 30, gy), min(1, ger * 1.2), GOLD, 6, 22)
    if nogap: place_stamp(L, 610, 250, nogap, text="NO GAP", size=90, color=GOLD, rot=-7)
    if close:
        gx, gy = LFC2["GERRARD"]; d.line((gx + 30, gy, FX1, FYM), fill=rgba(GOLD, 0.7 * close), width=4)
        tracked(d, ((gx + FX1) / 2, gy - 90), "CLOSER TO GOAL", cond(34, 8), rgba(GOLD, close), 6, "center")


def penalty_save(d, L, t, sc):
    """The fifth penalty, from behind the taker: the goal fills the frame, Dudek dives to his right (screen left),
    the ball comes down the middle in slow motion and hits his trailing left hand."""
    k0, k1, k2 = at("Shevchenko ran up", sc), at("Dudek did dive", sc), at("But he left his left hand up", sc)
    a = ramp(t, 0, 0.4)
    tracked(d, (W / 2, 70), "THE FIFTH PENALTY  ·  SHEVCHENKO  v  DUDEK", cond(40, 8), rgba(GOLD, a), 10, "center")
    gx0, gx1, gy0, gy1 = 380, 1540, 250, 770
    for k in range(13):                                                    # the net
        x = gx0 + (gx1 - gx0) * k / 12; d.line((x, gy0, x, gy1), fill=rgba(CREAM, 0.18 * a), width=2)
    for k in range(7):
        y = gy0 + (gy1 - gy0) * k / 6; d.line((gx0, y, gx1, y), fill=rgba(CREAM, 0.18 * a), width=2)
    d.line((gx0, gy1, gx0, gy0, gx1, gy0, gx1, gy1), fill=rgba(CREAM, a), width=16, joint="curve")
    d.line((200, gy1 + 4, 1720, gy1 + 4), fill=rgba(CREAM, 0.6 * a), width=5)
    # keeper: standing and waving, then the dive to his right (screen left), his left hand trailing in the middle
    dv = ease(ramp(t, k1, k1 + 0.6)); wave = 0 if dv else 22 * math.sin(t * 7)
    stand = {"lf": (900, 765), "rf": (1020, 765), "hip": (960, 650), "sh": (960, 540), "head": (960, 495), "rh": (850, 455 + wave), "lh": (1070, 455 - wave)}
    dive = {"lf": (1000, 765), "rf": (1060, 745), "hip": (905, 640), "sh": (790, 575), "head": (745, 552), "rh": (640, 545), "lh": (965, 585)}
    P = {k: lerp(stand[k], dive[k], dv) for k in stand}
    kc = KEEPER
    for a_, b_, w in (("lf", "hip", 26), ("rf", "hip", 26), ("hip", "sh", 46), ("sh", "rh", 20), ("sh", "lh", 20)):
        d.line((P[a_], P[b_]), fill=rgba(kc, a), width=w)
    hx, hy = P["head"]; d.ellipse((hx - 30, hy - 30, hx + 30, hy + 30), fill=rgba(kc, a))
    for h in ("rh", "lh"):
        x, y = P[h]; d.ellipse((x - 16, y - 16, x + 16, y + 16), fill=rgba(CREAM, a))
    tracked(d, (P["head"][0], P["head"][1] - 80), "DUDEK", cond(34, 8), rgba(CREAM, a), 6, "center")
    # the ball: on the spot (close to us), then down the middle in slow motion, onto the left hand, then away
    hit = k2 + 1.3
    if t < k1 + 0.3: bx, by, r = W / 2, 975, 46
    elif t < hit:
        f = ease((t - (k1 + 0.3)) / max(0.5, hit - (k1 + 0.3))); bx, by = lerp((W / 2, 975), (965, 585), f); r = 46 - 28 * f
    else:
        f = min(1.0, (t - hit) / 0.7); bx, by = lerp((965, 585), (1290, 260), ease(f)); r = 18 - 4 * f
    if k1 + 0.3 < t < hit: d.line((W / 2, 975, bx, by), fill=rgba(GOLD, 0.35 * a), width=6)
    d.ellipse((bx - r, by - r, bx + r, by + r), fill=rgba(CREAM, a), outline=rgba(NAVY_D, a), width=4)
    if t < k1: tracked(d, (W / 2, 1020), "SHEVCHENKO  ·  STRAIGHT DOWN THE MIDDLE", cond(38, 8), rgba(CREAM, ramp(t, k0, k0 + 0.5)), 8, "center")
    if k1 < t < hit: tracked(d, (W / 2, 1020), "SLOW MOTION", cond(32, 8), rgba(GOLD, 0.8), 14, "center")
    lb = ramp(t, k2, k2 + 0.4)
    if lb > 0 and t < hit + 2:
        x, y = dive["lh"]; rr = 44 + 10 * math.sin(t * 8)
        d.ellipse((x - rr, y - rr, x + rr, y + rr), outline=rgba(GOLD, lb), width=6)
        tracked(d, (x + 70, y + 40), "HIS LEFT HAND", cond(36, 8), rgba(GOLD, lb), 6)
    if t > hit:
        fl = max(0.0, 1 - (t - hit) / 0.4)
        if fl > 0: d.ellipse((965 - 120 * (1 - fl), 585 - 120 * (1 - fl), 965 + 120 * (1 - fl), 585 + 120 * (1 - fl)), outline=rgba(CREAM, fl), width=8)
        place_stamp(L, W / 2, 930, ramp(t, hit + 0.2, hit + 0.45), text="SAVED", size=150, color=GOLD, rot=-6)


GOLIATH = [("6", "EUROPEAN CUPS"), ("2003", "CHAMPIONS OF EUROPE"), ("17", "LEAGUE TITLES"), ("2004", "CHAMPIONS OF ITALY"),
           ("3", "WORLD CLUB TITLES"), ("No. 1", "THEIR STRIKER: BEST PLAYER IN THE WORLD, 2004")]
GOL_POS = [(470, 300, -6), (1420, 260, 5), (760, 610, 3), (1250, 640, -4), (520, 880, 6), (1330, 900, -3)]
def goliath(d, L, t, sc):
    """Mike 10-16: Milan's honours pile up fast until they almost cover the picture; the name comes on the next card."""
    end = max(2.5, sc.dur - 0.6); step = (end - 0.5) / len(GOLIATH)
    tracked(d, (W / 2, 70), "THE GOLIATH", cond(44, 8), rgba(GOLD, ramp(t, 0, 0.4)), 14, "center")
    for i, ((big, lab), (cx, cy, rot)) in enumerate(zip(GOLIATH, GOL_POS)):
        k = 0.4 + i * step; a = ramp(t, k, k + 0.12)
        if a <= 0: continue
        f = min(1.0, (t - k) / 0.25); sq = 1 + 0.35 * (1 - ease(f))
        w, h = int(660 * sq), int(250 * sq)
        card = Image.new("RGBA", (w, h), (0, 0, 0, 0)); cd = ImageDraw.Draw(card)
        cd.rounded_rectangle((0, 0, w - 1, h - 1), 14, fill=rgba(NAVY_D, 0.94 * a), outline=rgba(GOLD, a), width=5)
        cd.rectangle((0, 0, 14, h), fill=rgba(RED, a))
        text_top(cd, (44, int(30 * sq)), big, pf(int(110 * sq), 900), rgba(CREAM, a), "left")
        for j, ln in enumerate(wrap(lab, cond(int(34 * sq), 8), w - 90)):
            tracked(cd, (46, int((160 + 40 * j) * sq)), ln, cond(int(34 * sq), 8), rgba(GOLD, a), 5)
        card = card.rotate(rot, resample=Image.BICUBIC, expand=True)
        sh = 10 * (1 - f) * math.sin(t * 60)
        L.alpha_composite(card, (int(cx - card.width / 2 + sh), int(cy - card.height / 2)))

# ---------------------------------------------------------------- v2 helpers (new lines in the script)
PAIRS[:] = [("Maldini and Nesta at the back", "DEFENCE", [("3", "Paolo Maldini", "CAPTAIN"), ("13", "Alessandro Nesta", "CENTRE-BACK")]),
            ("Pirlo, who could pass", "MIDFIELD", [("21", "Andrea Pirlo", "PLAYMAKER"), ("22", "Kaká", "ATTACKING MIDFIELD")]),
            ("And up front, Crespo", "ATTACK", [("7", "Andriy Shevchenko", "EUROPEAN FOOTBALLER OF THE YEAR"), ("11", "Hernán Crespo", "STRIKER")])]
KICKS[:] = [("SERGINHO", 0, False, ("Milan's first taker blazed", 1.2)), ("HAMANN", 1, True, ("Hamann scored.", 0.2)),
            ("PIRLO", 0, False, ("Then Pirlo stepped up", 1.3)), ("CISSÉ", 1, True, ("Both teams scored.", 0.1)),
            ("TOMASSON", 0, True, ("Both teams scored.", 0.8)), ("RIISE", 1, False, ("Then Dida saved one", 0.6)),
            ("KAKÁ", 0, True, ("Then both teams scored again", 0.1)), ("ŠMICER", 1, True, ("Then both teams scored again", 0.9)),
            ("SHEVCHENKO", 0, False, ("For a second, nobody moved", 0.0))]

def what_next2(d, L, t, sc):
    """Three panels: the change at half-time, the fans, the dancing keeper. Then YOU DECIDE."""
    tracked(d, (W / 2, 120), "WHAT DO YOU THINK?", cond(44, 8), rgba(GOLD, ramp(t, 0, 0.4)), 10, "center")
    panels = [(AI + "ai_tactics_board.png", "THE CHANGE AT HALF-TIME?", "Was it the change at half-time", 0.5, 0.45), (RED_END, "THE FANS SINGING?", "The fans singing", 0.5, 0.45),
              (AI + "ai_keeper_legs.png", "WOBBLY LEGS?", "Or a goalkeeper with wobbly", 0.5, 0.35)]
    for i, (path, lab, snip, fy, fx) in enumerate(panels):
        k = at(snip, sc) - 0.1 if i else min(0.1, at(snip, sc)); b = ramp(t, k, k + 0.35)
        if b <= 0: continue
        x0 = 90 + i * 590; y0 = 220 + 160 * (1 - b)
        paste_box(L, path, x0, y0, 560, 620, b, fy, fx)
        d.rectangle((x0, y0 + 620, x0 + 560, y0 + 720), fill=rgba(NAVY_D, 0.92 * b))
        tracked(d, (x0 + 280, y0 + 650), lab, cond(36, 8), rgba(CREAM, b), 5, "center")
    k = at("Tell me what you think", sc)
    place_stamp(L, W / 2, 560, ramp(t, k, k + 0.25), text="YOU DECIDE", size=130, color=GOLD, rot=-5)

def fans_count(d, L, t, sc):
    k = at("Around forty thousand", sc); a = ramp(t, k, k + 0.4)
    if a <= 0: return
    n = int(40000 * ramp(t, k, k + 1.6))
    text_top(d, (W / 2, 330), f"{n:,}", pf(200, 900), rgba(CREAM, a), "center")
    tracked(d, (W / 2, 600), "LIVERPOOL FANS  ·  AROUND", cond(44, 8), rgba(GOLD, a), 10, "center")

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
    AS("And the reason started with a change", "ai_tactics_board.png", zoom=(1.0, 1.15), focus=((0.45, 0.45), (0.5, 0.4)),
       texts=[(SF("And the reason started with a change", 0.55) - S("And the reason started with a change", -0.15), "A change most people never noticed.", "mid")]),
    PS("This is the story of Liverpool's", M_CONFETTI, zoom=(1.0, 1.1), focus=((0.5, 0.45), (0.52, 0.4))),
    # I. the outsiders
    PS("Liverpool shouldn't really", KOP_OUT, zoom=(1.0, 1.1), chapter=CH("I", "THE OUTSIDERS"), strap=("Anfield", "LIVERPOOL FC", 0.6)),
    FC("They had a new Spanish manager", BENITEZ, "Rafael Benítez", "MANAGER  ·  FIRST SEASON", focus=(0.45, 0.4),
       facts=[(1.0, "Won La Liga twice with Valencia"), (3.2, "And the UEFA Cup, the season before he arrived", True)]),
    CuS("In the Premier League, they finished", league_table, bg=bg_of(C + KOP_IN, 0.84)),
    CuS("And in Europe, they nearly", calendar, bg=bg_of(C + KOP_IN, 0.84)),
    PS("In their last group game", KOP_IN, zoom=(1.0, 1.12), strap=("Liverpool v Olympiacos", "ANFIELD  ·  8 DECEMBER 2004", 0.5)),
    Custom(SF("And because they'd lost", 0.15), win_by_two, bg=bg_of(C + KOP_IN, 0.84)),
    FC("Then a Brazilian World Cup winner", RIVALDO, "Rivaldo", "OLYMPIACOS  ·  WORLD CUP WINNER",
       facts=[(0.9, "World Player of the Year, 1999"), (2.8, "World Cup winner with Brazil, 2002"), (("At half-time, Liverpool were losing", -0.2), "Half-time: Liverpool 0–1")]),
    Custom(SF("At half-time, Liverpool were losing", 0.55), tracker("HALF-TIME  ·  " + "ANFIELD", [(0, 0, 1)], 0, needed_at=("Now they needed three", 0.2),
           note=("THREE GOALS  ·  45 MINUTES", ("Now they needed three", 1.4), CREAM)), bg=bg_of(C + KOP_IN, 0.84)),
    PS("Benítez sent on a young French", PONGOLLE, zoom=(1.0, 1.1), strap=("Florent Sinama-Pongolle", "SUBSTITUTE", 0.4)),
    CuS("Two minutes after the restart", tracker("47'  ·  SINAMA-PONGOLLE", [(0, 0, 1), (("One–one.", -0.1), 1, 1)], 1), bg=bg_of(C + KOP_IN, 0.84)),
    FC("With nine minutes left", "mellor_celebrates.jpg", "Neil Mellor", "SUBSTITUTE  ·  81'  ·  2–1", focus=(0.4, 0.35),
       facts=[(1.0, "Came off the bench to score"), (2.8, "Injuries ended his career at 29", True)]),
    CuS("But that still wasn't enough", tracker("81'  ·  NEIL MELLOR", [(0, 2, 1)], 2, clock=(81, 86), note=("STILL ONE SHORT", 0.4, LFC)), bg=bg_of(C + KOP_IN, 0.84)),
    PS("Then, with four minutes to go", "gerrard_2005.jpg", zoom=(1.0, 1.1), focus=((0.55, 0.4), (0.55, 0.35)), dyk=(2.5, "That summer, Gerrard nearly left for Chelsea"), strap=("Steven Gerrard", "CAPTAIN", 0.5)),
    Custom(SF("Then, with four minutes to go", 0.55), gerrard_goal),
    CuS("Three–one.", tracker("86'  ·  STEVEN GERRARD", [(0, 2, 1), (0.15, 3, 1)], 3, stamp=("THROUGH", ("Liverpool were through", 0.0), GOLD)), bg=bg_of(C + KOP_IN, 0.84)),
    AS("Looking back, it was a sign", "ai_trophy_fireworks.png", zoom=(1.0, 1.12), texts=[(0.6, "A sign of things to come.", "mid")]),
    CuS("After that, they knocked out", route, bg=bg_of(NIGHT, 0.82)),
    PS("And somehow, they were in the final", STADIUM_IN, zoom=(1.0, 1.1)),
    # II. the giants
    CuS("Waiting for them in Istanbul", goliath, bg=bg_of(AI + "ai_istanbul_night.png", 0.3), chapter=CH("II", "THE GIANTS")),
    CuS("AC Milan.", milan, bg=bg_of(C + STADIUM_IN, 0.84)),
    Custom(S("Maldini and Nesta at the back", -0.35), portraits),
    PS("The final was at the national stadium", STADIUM_OUT, zoom=(1.0, 1.1), dyk=(2.2, "It was built for Istanbul's bid to host the 2008 Olympics"), strap=("Atatürk Olympic Stadium", "ISTANBUL  ·  25 MAY 2005", 0.8)),
    AS("It was so far out", "ai_fans_road.png", zoom=(1.0, 1.15), focus=((0.45, 0.6), (0.6, 0.35))),
    CuS("Around forty thousand", fans_count, bg=bg_of(AI + "ai_fans_road.png", 0.6)),
    CuS("Liverpool in red.", kits, bg=bg_of(DUSK, 0.84)),
    # III. the first half
    CuS("It took Milan less than a minute", scoreboard("KICK-OFF", [(0, 0, 0), (1.4, 1, 0)], sub=("LESS THAN A MINUTE", 2.2)),
        bg=bg_of(C + STADIUM_IN, 0.82), chapter=CH("III", "THE FIRST HALF")),
    FC("A free kick came in, and the Milan captain", MALDINI, "Paolo Maldini", "MILAN CAPTAIN  ·  0:50",
       facts=[(1.0, "36 years old in Istanbul"), (3.0, "His father captained Milan to the European Cup in 1963", True)]),
    CuS("About fifty seconds on the clock", fifty_seconds),
    CuS("Then Liverpool lost Harry Kewell", sub_board("23'  ·  INJURY", "KEWELL", "ŠMICER")),
    PS("A Czech midfielder", "smicer_celebrates.jpg", zoom=(1.15, 1.3), focus=((0.75, 0.4), (0.75, 0.35)), strap=("Vladimír Šmicer", "ON FOR KEWELL", 0.4),
       texts=[(S("Remember him.") - S("A Czech midfielder", -0.15), "Remember him.", "big")]),
    CuS("Six minutes before the break", play("39'  ·  SHEVCHENKO CROSSES  ·  CRESPO SCORES",
        [("SHEVCHENKO", WHITE, [(0.2, 1250, 260), (1.4, 1530, 230)]), ("CRESPO", WHITE, [(0.2, 1300, 640), (2.2, 1600, 580)]),
         ("", KEEPER, [(0, PX1 - 25, PYM), (2.3, PX1 - 30, PYM - 30)])],
        [(0.2, 1100, 300), (1.4, 1530, 245), (2.2, 1585, 575, 0, 40), (2.6, PX1 + 22, PYM + 30)],
        events=[(2.6, "GOAL", GOLD, 1420, 820)], score=("MILAN", "LIVERPOOL", [(0, 1, 0), (2.7, 2, 0)]),
        others=[(LFC, 1450, 420), (LFC, 1480, 640), (LFC, 1380, 520), (LFC, 1200, 740)])),
    FC("Six minutes before the break", "crespo_milan.jpg", "Hernán Crespo", "39'  ·  2–0", start=SF("Six minutes before the break", 0.74), focus=(0.5, 0.35),
       facts=[(0.8, "On loan at Milan from Chelsea...", True), (2.6, "...the club Liverpool knocked out in the semi-final")]),
    FC("Right on half-time, Kaká", KAKA, "Kaká", "MILAN'S PLAYMAKER", focus=(0.5, 0.35),
       facts=[(0.6, "Only 23"), (1.8, "World Player of the Year two years later", True)]),
    Custom(SF("Right on half-time, Kaká", 0.5), play("44'  ·  KAKÁ'S PASS  ·  CRESPO'S CHIP",
        [("KAKÁ", WHITE, [(0, 760, 600)]), ("CRESPO", WHITE, [(0.3, 1050, 360), (1.9, 1450, 440), (2.6, 1560, 470)]),
         ("", KEEPER, [(0, PX1 - 25, PYM), (2.0, 1560, 520), (3.0, 1570, 520)])],
        [(0.6, 775, 590), (1.9, 1440, 450), (2.5, 1500, 455), (3.3, PX1 + 20, PYM - 20, 0, 150)],
        events=[(3.3, "GOAL", GOLD, 1420, 820), (2.6, "CHIPPED", CREAM, 1500, 300)], score=("MILAN", "LIVERPOOL", [(0, 2, 0), (3.4, 3, 0)]),
        others=[(LFC, 1250, 380), (LFC, 1180, 560), (LFC, 1250, 720), (LFC, 1000, 470)])),
    # IV. what was going wrong (one continuous explainer)
    AS("Three–nil to Milan at the break", "ai_istanbul_night.png", zoom=(1.1, 1.22), focus=((0.4, 0.45), (0.35, 0.45)), chapter=CH("IV", "WHAT WAS GOING WRONG"),
       texts=[(0.4, "Half-time. Milan 3–0 Liverpool.", "mid")]),
    CuS("So what was going wrong", tactics_wrong),
    Custom(S("Years later, the data company", -0.15), odds_low, bg=bg_of(DRESSING, 0.85)),
    # V. the change
    AS("In the dressing room, Benítez", "ai_dressing_room.png", zoom=(1.1, 1.25), focus=((0.6, 0.5), (0.62, 0.45)), chapter=CH("V", "THE CHANGE"),
       texts=[(S("He changed the plan.") - S("In the dressing room, Benítez", -0.15), "He changed the plan.", "big")]),
    CuS("And it nearly went a different way", sub_board("HALF-TIME  ·  THE PLAN", "TRAORÉ", "?", note=("TRAORÉ: ALREADY HEADING FOR THE SHOWERS", ("Traoré was reportedly", 0.3))), bg=bg_of(DRESSING, 0.86)),
    AS("But then the physio told him", "ai_physio_boot.png", zoom=(1.0, 1.12), focus=((0.5, 0.6), (0.55, 0.65)),
       texts=[(0.8, "Finnan: injured.", "mid"), (S("So Finnan came off instead") - S("But then the physio told him", -0.15), "Finnan off. Traoré stays.", "mid")]),
    CuS("On came Didi Hamann", sub_board("HALF-TIME", "FINNAN", "HAMANN", note=("DIETMAR HAMANN ON  ·  STEVE FINNAN OFF", 0.5)), bg=bg_of(DRESSING, 0.86)),
    CuS("Here's what that did", tactics_change),
    VS("Meanwhile, up in the stands", "ai_red_end_clip.mp4"),
    CuS("Never Walk Alone", ynwa, bg=bg_of(RED_END, 0.8)),
    PS("Some of the players say", YNWA, crop=(0.0, 0.2, 1.0, 0.92), zoom=(1.0, 1.1), focus=((0.4, 0.5), (0.35, 0.55))),
    AS("Either way, the fans hadn't", "ai_red_end_halftime.png", zoom=(1.12, 1.25), focus=((0.25, 0.55), (0.3, 0.5)),
       texts=[(S("So why should the team?") - S("Either way, the fans hadn't", -0.15), "So why should the team?", "big")]),
    # VI. six minutes
    PS("Nine minutes into the second half", RIISE, zoom=(1.0, 1.1), focus=((0.6, 0.45), (0.6, 0.4)), chapter=CH("VI", "SIX MINUTES"),
       strap=("John Arne Riise", "LEFT-BACK  ·  THE CROSS", 0.5)),
    CuS("Gerrard rose and headed it in", scoreboard("54'  ·  GERRARD  ·  HEADER", [(0, 3, 0), (0.5, 3, 1)], sub=("GAME ON?", 1.4)), bg=bg_of(RED_END, 0.8)),
    AS("He jogged back to the halfway line", "ai_red_end_halftime.png", zoom=(1.0, 1.15), focus=((0.4, 0.5), (0.3, 0.5)), texts=[(0.9, "Come on.", "big"), (2.4, "Make some noise.", "big+")]),
    PS("Two minutes later, Šmicer", "smicer_celebrates.jpg", zoom=(1.0, 1.12), focus=((0.6, 0.45), (0.65, 0.4)), strap=("Vladimír Šmicer", "56'", 0.4)),
    CuS("It skidded past the Milan keeper", play("56'  ·  ŠMICER  ·  PAST DIDA",
        [("ŠMICER", LFC, [(0, 1080, 640)]), ("DIDA", KEEPER, [(0, PX1 - 25, PYM), (0.9, PX1 - 30, PYM + 40)])],
        [(0.1, 1095, 635), (1.0, PX1 + 20, PYM + 58)], events=[(1.0, "GOAL", GOLD, 1420, 300)],
        score=("MILAN", "LIVERPOOL", [(0, 3, 1), (("Three–two.", 0), 3, 2)]),
        others=[(WHITE, 1300, 520), (WHITE, 1350, 700), (WHITE, 1250, 380), (LFC, 1450, 470)])),
    PS("Then Gerrard burst into the box", GATTUSO, zoom=(1.0, 1.1), focus=((0.5, 0.3), (0.5, 0.25)), strap=("Gennaro Gattuso", "FOULS GERRARD", 0.4),
       texts=[(1.0, "Where the new shape put him.", "mid"), (S("Penalty.") - S("Then Gerrard burst into the box", -0.15), "Penalty.", "big")]),
    PS("Xabi Alonso", M_ALONSO, zoom=(1.0, 1.1), focus=((0.4, 0.3), (0.4, 0.25)), strap=("Xabi Alonso", "60'  ·  PENALTY", 0.4)),
    CuS("The keeper saved it", play("60'  ·  XABI ALONSO  ·  SAVED BY DIDA  ·  THE REBOUND",
        [("ALONSO", LFC, [(0, 1360, PYM), (("But the ball came straight", 0.3), 1360, PYM), (("But the ball came straight", 1.3), 1575, 640)]),
         ("DIDA", KEEPER, [(0, PX1 - 25, PYM), (0.55, PX1 - 30, 485), (("But the ball came straight", 1.4), PX1 - 35, 495)])],
        [(0.1, 1380, PYM), (0.55, PX1 - 30, 495), (("But the ball came straight", 0.6), 1590, 630),
         (("But the ball came straight", 1.4), 1590, 630), (("But the ball came straight", 1.8), PX1 + 20, PYM + 50)],
        events=[(0.6, "SAVED", CREAM, 1420, 300), (("But the ball came straight", 1.8), "GOAL", GOLD, 1420, 820)],
        score=("MILAN", "LIVERPOOL", [(0, 3, 2), (("But the ball came straight", 1.9), 3, 3)]),
        others=[(WHITE, 1150, 420), (WHITE, 1150, 680), (LFC, 1170, 550)])),
    CuS("Three goals in six minutes", six_minutes),
    # VII. the save
    AS("After that, Milan took control", "ai_extra_time.png", zoom=(1.0, 1.04), chapter=CH("VII", "THE SAVE")),
    AS("Liverpool clung on into extra time", "ai_cramp.png", zoom=(1.0, 1.12), focus=((0.45, 0.55), (0.5, 0.5)), texts=[(0.5, "Extra time. Cramp everywhere.", "mid")]),
    AS("With three minutes left", "ai_sheva_close.png", zoom=(1.0, 1.12), strap=("Andriy Shevchenko", "117'  ·  IN FRONT OF GOAL", 0.5),
       fallback=AS("With three minutes left", "ai_shootout_behind_goal.png", zoom=(1.05, 1.18), strap=("Andriy Shevchenko", "117'  ·  IN FRONT OF GOAL", 0.5))),
    Custom(SF("With three minutes left", 0.75), play("117'  ·  SHEVCHENKO  v  DUDEK",
        [("SHEVCHENKO", WHITE, [(0, 1540, 520), (("Liverpool's Polish goalkeeper", 0.6), 1560, 540), (("Liverpool's Polish goalkeeper", 2.4), 1610, 520)]),
         ("_DUDEK", KEEPER, [(0, PX1 - 25, PYM), (("Liverpool's Polish goalkeeper", 0.8), PX1 - 60, 545), (("Liverpool's Polish goalkeeper", 2.6), PX1 - 50, 520)])],
        [(0, 1300, 330), (("Liverpool's Polish goalkeeper", 0.3), 1545, 525, 0, 80), (("Liverpool's Polish goalkeeper", 0.8), PX1 - 70, 540),
         (("Liverpool's Polish goalkeeper", 1.6), 1615, 515)],
        events=[(("Liverpool's Polish goalkeeper", 0.8), "BLOCKED", CREAM, 1420, 300), (("Liverpool's Polish goalkeeper", 2.2), "IT COMES BACK...", GOLD, 1420, 820)],
        score=("MILAN", "LIVERPOOL", [(0, 3, 3)]),
        others=[(LFC, 1450, 640), (LFC, 1420, 420), (WHITE, 1350, 520)])),
    FC("The ball came straight back to Shevchenko", DUDEK, "Jerzy Dudek", "v ANDRIY SHEVCHENKO  ·  117'", focus=(0.5, 0.4),
       facts=[(0.8, "Signed from Feyenoord in 2001"), (("Somehow, Dudek threw up", 0.6), "Over the bar. From two yards.")]),
    CuS("He later called it the save", save_quote, bg=bg_of(C + DUDEK, 0.8)),
    # VIII. penalties
    AS("And so the game was going to penalties", "ai_shootout_behind_goal.png", zoom=(1.0, 1.12), chapter=CH("VIII", "PENALTIES")),
    PS("Before the shoot-out, Jamie Carragher", "carragher_0607.jpg", zoom=(1.0, 1.1), focus=((0.45, 0.35), (0.45, 0.3)), dyk=(2.8, "He spent his whole career at Liverpool: 737 games"), strap=("Jamie Carragher", "LIVERPOOL DEFENDER", 0.6),
       texts=[(S("Put them off, he said.") - S("Before the shoot-out, Jamie Carragher", -0.15), "“Put them off.”", "big")]),
    PS("Do what Bruce Grobbelaar", GROBBELAAR, zoom=(1.0, 1.1), focus=((0.35, 0.45), (0.32, 0.4)), dyk=(1.8, "Rome 1984: Liverpool beat Roma on penalties, in Roma's own stadium"), strap=("Bruce Grobbelaar", "LIVERPOOL KEEPER  ·  ROME 1984", 0.5)),
    VS("So Dudek danced on his line", "ai_shootout_clip.mp4", end=1.6),
    AS("Wobbly legs.", "ai_keeper_legs.png", zoom=(1.05, 1.2), focus=((0.4, 0.6), (0.4, 0.62)),
       texts=[(0.15, "Wobbly legs.", "mid"), (S("Arms everywhere.") - S("Wobbly legs.", -0.15), "Arms everywhere.", "mid+")]),
    CuS("Milan's first taker blazed", shootout, bg=bg_of(SHOOTOUT, 0.84)),
    PS("And he took that penalty", "hamann_final.jpg", zoom=(1.0, 1.12), focus=((0.6, 0.45), (0.68, 0.4)), dyk=(1.5, "Three years earlier he played in a World Cup final for Germany"), strap=("Dietmar Hamann", "SCORED  ·  REPORTEDLY WITH A BROKEN FOOT", 0.4)),
    FC("Then Pirlo stepped up", PIRLO, "Andrea Pirlo", "SAVED BY DUDEK", focus=(0.5, 0.35),
       facts=[(0.8, "Started out as an attacking midfielder"), (2.4, "Moved back to be a deep playmaker, it made him", True)]),
    CuS("Both teams scored.", shootout, bg=bg_of(SHOOTOUT, 0.84)),
    PS("Which left Shevchenko", "Andriy_Shevchenko_-_2004_-_AC_Milan_(1).jpg", zoom=(1.0, 1.12), focus=((0.5, 0.4), (0.52, 0.35)),
       strap=("Andriy Shevchenko", "EUROPEAN FOOTBALLER OF THE YEAR", 0.5), dyk=(2.2, "Two years earlier, he scored the winning penalty in the final")),
    AS("He walked up from the halfway line", "ai_sheva_walk.png", zoom=(1.0, 1.12), strap=("Andriy Shevchenko", "THE FIFTH PENALTY", 0.6)),
    VS("He bent down and placed the ball", "ai_ball_on_spot_clip.mp4", skip=3.4, fallback=AS("He bent down and placed the ball", "ai_shootout_behind_goal.png", zoom=(1.0, 1.15), focus=((0.55, 0.6), (0.55, 0.62)))),
    VS("And on his line, Dudek was dancing", "ai_keeper_dance_clip.mp4", fallback=AS("And on his line, Dudek was dancing", "ai_keeper_legs.png", zoom=(1.15, 1.0), focus=((0.4, 0.55), (0.4, 0.5)))),
    AS("Shevchenko ran up and went straight", "ai_save.png", zoom=(1.0, 1.22), focus=((0.45, 0.5), (0.3, 0.45)),
       texts=[(0.8, "Straight down the middle.", "mid"), (S("Dudek did dive") - S("Shevchenko ran up and went straight", -0.15), "Dudek dives right...", "mid"),
              (S("But he left his left hand up") - S("Shevchenko ran up and went straight", -0.15), "...but his left hand stays up.", "mid+")]),
    CuS("For a second, nobody moved", shootout, bg=bg_of(SHOOTOUT, 0.84)),
    AS("Then the Liverpool end exploded", "ai_end_explodes.png", zoom=(1.0, 1.15), focus=((0.6, 0.45), (0.7, 0.4))),
    AS("The players sprinted from the halfway line", "ai_pile_on.png", zoom=(1.0, 1.2), focus=((0.45, 0.6), (0.55, 0.65))),
    AS("Back home, pubs all over Liverpool", "ai_pub.png", zoom=(1.0, 1.15), focus=((0.5, 0.5), (0.6, 0.55))),
    AS("In Milan, people just stared", "ai_milan_bar.png", zoom=(1.0, 1.15), focus=((0.45, 0.5), (0.35, 0.45))),
    VS("The Istanbul miracle was complete", "ai_trophy_fireworks_clip.mp4", texts=[(0.4, "The Istanbul miracle.", "big"), (S("Liverpool were champions of Europe") - S("The Istanbul miracle was complete", -0.15), "Champions of Europe.", "big+")]),
    # IX. what happened next
    PS("It was Liverpool's fifth European Cup", MEDAL, zoom=(1.0, 1.1), focus=((0.5, 0.6), (0.5, 0.7)), chapter=CH("IX", "WHAT HAPPENED NEXT"),
       strap=("The winners' medal", "ISTANBUL  ·  2005", 0.4)),
    CuS("Under the rules of the time", five_cups, bg=bg_of(C + CUP, 0.84)),
    PS("They were the last club ever", CUP, zoom=(1.0, 1.12), focus=((0.5, 0.45), (0.5, 0.4)), texts=[(0.5, "The original. Theirs for good.", "mid")]),
    PS("But there was a problem", M_LIFT, zoom=(1.0, 1.1), focus=((0.55, 0.35), (0.55, 0.3)),
       texts=[(S("Liverpool's fifth place in the league") - S("But there was a problem", -0.15), "5th in the league.", "mid"),
              (S("Liverpool's fifth place in the league") - S("But there was a problem", -0.15) + 2.0, "No place next season.", "mid+")]),
    CuS("UEFA made an exception", qualifying, bg=bg_of(M + "parade_bus.jpg", 0.84)),
    PS("And Šmicer never played", "smicer_celebrates.jpg", zoom=(1.2, 1.35), focus=((0.72, 0.42), (0.74, 0.38)), strap=("Vladimír Šmicer", "NEXT CLUB: BORDEAUX", 0.6),
       texts=[(S("That penalty in Istanbul") - S("And Šmicer never played", -0.15), "His last kick for Liverpool.", "mid")]),
    PS("Two years later, the same two teams", ATHENS, zoom=(1.0, 1.1), strap=("Athens", "LIVERPOOL FANS  ·  23 MAY 2007", 0.8)),
    CuS("Milan won it, two–one.", scoreboard("THE 2007 FINAL  ·  ATHENS", [(0, 0, 0), (0.3, 2, 1)]), bg=bg_of(C + ATHENS, 0.82)),
    FC("But in Liverpool, one word", "parade_bus.jpg", "The parade", "LIVERPOOL  ·  26 MAY 2005", focus=(0.5, 0.45),
       facts=[(1.0, "Liverpool kept the original trophy for good"), (3.0, "UEFA had to make a new one", True)]),
    PF("But in Liverpool, one word", 0.8, M_KISS, zoom=(1.0, 1.1), focus=((0.6, 0.45), (0.62, 0.4)), texts=[(0.5, "Istanbul.", "big")]),
    # X. what if
    AS("So here's the question", "ai_tactics_board.png", zoom=(1.12, 1.0), chapter=CH("X", "WHAT IF"),
       texts=[(S("What if Benítez had taken") - S("So here's the question", -0.15), "Traoré off instead of Finnan?", "mid"),
              (S("What if that save in extra time") - S("So here's the question", -0.15), "No save in extra time?", "mid")]),
    CuS("Was it the change at half-time", what_next2, bg=bg_of(RED_END, 0.84)),
    CuS("This was Impossible", impossible_end("Istanbul."), bg=bg_of(DUSK, 0.85)),
]

if __name__ == "__main__":
    main(scenes, FINAL)
