"""BANNED 02: The Disgrace of Gijón -> PostDrive/Stories/BANNED series/02 Gijon/video/BANNED 02 - The Disgrace of Gijon.mp4

    ~/.venvs/poststudio/bin/python build.py            # full render
    ~/.venvs/poststudio/bin/python build.py 95 125     # preview slice (video seconds)
Every scene is anchored to a sentence of the recording with S("words from the sentence").
"""
import json, math, os, subprocess, sys
VDIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(VDIR, "..", "..", "..", "studio"))
from storykit import *

STORY = "/Volumes/PostDrive/Omnira Football/Videos/Gijon (BANNED)/"
C, M, G, A, AI = (STORY + p for p in ("media/commons/", "media/mike/", "graphics/", "audio/", "media/ai/"))
OUT = STORY + "video/"; FINAL = "BANNED 02 - The Disgrace of Gijon.mp4"
TRACKS = [A + "Mi Dispiace - Mini Vandals.mp3", A + "To Loom Is to Love - Mini Vandals.mp3"]   # YouTube Audio Library
MUSIC_GAIN = 0.35
GREEN, WHITE = (0, 122, 61), (245, 245, 240)          # Algeria green; West Germany white; Austria = RED

SENTS = json.load(open(A + "sentences.json"))
def sent(snip):
    for e in SENTS:
        if snip.lower() in e["text"].lower(): return e
    raise KeyError(snip)
TITLE_LEN = 0.0; INTRO = 5.0          # wordless open: stamp + title over the stadium, then the narration
TITLE_AT = sent("so it could never happen again")["out_end"] + 0.3
def vt(t): return t + (TITLE_LEN if t >= TITLE_AT else 0) + INTRO          # narration time -> video time
def S(snip, off=0.0): return vt(sent(snip)["out_start"] + off)
def at(snip, sc): return S(snip) - sc.start                               # a sentence's time inside a scene

_cr = {c["file"]: c for c in json.load(open(C + "credits.json"))}
def cc(f):
    c = _cr[f]; a = c["author"].split(" / ")[0].replace("Unknown authorUnknown author", "Unknown").strip()
    return f"Photo: {a[:40]} · {c['licence']}"
def PS(snip, f, off=-0.15, **kw):
    if os.path.exists(C + f): return Photo(S(snip, off), C + f, credit=cc(f), **kw)
    return Photo(S(snip, off), M + f, **kw)
def AS(snip, ai, fallback, off=-0.15, **kw):
    if os.path.exists(AI + ai): return Photo(S(snip, off), AI + ai, credit="AI illustration", **kw)
    return fallback
def has(ai): return os.path.exists(AI + ai)
def OPT(snip, ai, off=-0.15, **kw):
    """An AI scene-setter that only appears once Mike has saved the image."""
    return Photo(S(snip, off), AI + ai, credit="AI illustration", **kw) if has(ai) else None
def CaS(snip, items, off=-0.15, **kw):
    t0 = S(snip, off)
    for it in items:
        if isinstance(it.get("at"), str): it["at"] = S(it["at"]) - t0
    return Card(t0, items, **kw)
def CuS(snip, fn, off=-0.15, **kw): return Custom(S(snip, off), fn, **kw)
CH = lambda n, s: f"{n}  ·  {s}"
def with_alpha(im, a):
    if a >= 1: return im
    im = im.copy(); im.putalpha(im.getchannel("A").point(lambda v: int(v * a))); return im

# ---------------------------------------------------------------- pitch: the ball going nowhere
def pitch_base(d, a=1.0, x0=260, y0=200, x1=1660, y1=900):
    ln = rgba(CREAM, 0.55 * a)
    d.rectangle((x0, y0, x1, y1), outline=ln, width=4); xm = (x0 + x1) / 2; ym = (y0 + y1) / 2
    d.line((xm, y0, xm, y1), fill=ln, width=3); d.ellipse((xm - 95, ym - 95, xm + 95, ym + 95), outline=ln, width=3)
    for xa, sgn in ((x0, 1), (x1, -1)):
        d.rectangle((min(xa, xa + sgn * 210), ym - 220, max(xa, xa + sgn * 210), ym + 220), outline=ln, width=3)
        d.rectangle((min(xa, xa + sgn * 70), ym - 100, max(xa, xa + sgn * 70), ym + 100), outline=ln, width=3)
    return (x0, y0, x1, y1)

GER = [(420, 330), (420, 770), (560, 470), (560, 640), (760, 380), (760, 700), (860, 550)]
AUT = [(1500, 330), (1500, 770), (1360, 470), (1360, 640), (1160, 380), (1160, 700), (1060, 550)]
def ball_path(t, players, speed=1.1, seed=3):
    """Lazy passes between a team's players: (x, y) of the ball at time t."""
    import random
    rnd = random.Random(seed); order = [rnd.randrange(len(players)) for _ in range(200)]
    k = int(t * speed); f = t * speed - k; a, b = players[order[k % 200]], players[order[(k + 1) % 200]]
    if a == b: b = players[(order[(k + 1) % 200] + 1) % len(players)]
    f = 0.5 - 0.5 * math.cos(math.pi * min(1, f * 1.3))
    return a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f

def passing(d, L, t, sc, clock=(10, 90), score=True, label=True):
    a = ramp(t, 0, 0.6); pitch_base(d, a)
    swap = int(t // 6) % 2                                  # Germany keep it, then Austria keep it
    for (x, y) in GER: d.ellipse((x - 16, y - 16, x + 16, y + 16), fill=rgba(WHITE, a), outline=rgba(NAVY_D, a), width=3)
    for (x, y) in AUT: d.ellipse((x - 16, y - 16, x + 16, y + 16), fill=rgba(RED, a))
    bx, by = ball_path(t, AUT if swap else GER, 1.0, 7 if swap else 3)
    for k in range(1, 6):                                    # a short trail so the eye can follow it
        tx, ty = ball_path(max(0, t - k * 0.05), AUT if swap else GER, 1.0, 7 if swap else 3)
        d.ellipse((tx - 12 + k, ty - 12 + k, tx + 12 - k, ty + 12 - k), fill=rgba(GOLD, a * (0.5 - k * 0.08)))
    d.ellipse((bx - 14, by - 14, bx + 14, by + 14), fill=rgba(GOLD, a), outline=rgba(NAVY_D, a), width=3)
    mins = clock[0] + (clock[1] - clock[0]) * min(1, t / max(sc.dur, 0.1))
    tracked(d, (1660, 150), f"{int(mins)}'", cond(52, 8), rgba(CREAM, a), 3, "right")
    if score: tracked(d, (260, 150), "W. GERMANY 1 – 0 AUSTRIA", cond(34, 2), rgba(GOLD, a), 5)
    if label:
        label_ = "BACKWARDS  ·  SIDEWAYS  ·  NOWHERE"
        tracked(d, (960, 960), label_, cond(34, 2), rgba(CREAM, ramp(t, 1.0, 1.6) * a), 7, "center")

# ---------------------------------------------------------------- group 2 table
ROWS_BEFORE = [("Austria", RED, 2, 2, 0, 3, 0, 4), ("Algeria", GREEN, 3, 2, 1, 5, 5, 4), ("West Germany", WHITE, 2, 1, 1, 5, 3, 2), ("Chile", (120, 120, 140), 3, 0, 3, 3, 8, 0)]
ROWS_AFTER = [("West Germany", WHITE, 3, 2, 1, 6, 3, 4), ("Austria", RED, 3, 2, 1, 3, 1, 4), ("Algeria", GREEN, 3, 2, 1, 5, 5, 4), ("Chile", (120, 120, 140), 3, 0, 3, 3, 8, 0)]
def table(d, rows, a, y0=300, marks=None, dim=None):
    x0 = 330; cols = [("P", 1010), ("W", 1100), ("L", 1190), ("GF", 1290), ("GA", 1390), ("PTS", 1520)]
    for name, x in cols: tracked(d, (x, y0 - 60), name, cond(28, 2), rgba(GOLD, a), 4, "center")
    for i, (team, col, p, w, l, gf, ga, pts) in enumerate(rows):
        y = y0 + i * 120; al = a * (0.35 if dim and team in dim else 1)
        d.rectangle((x0 - 20, y, 1600, y + 96), fill=rgba(NAVY_D, 0.85 * al), outline=rgba(col, 0.7 * al), width=2)
        d.rectangle((x0 - 20, y, x0 - 8, y + 96), fill=rgba(col, al))
        text_top(d, (x0 + 20, y + 26), team, pf(52, 700), rgba(CREAM, al))
        for (name, x), v in zip(cols, (p, w, l, gf, ga, pts)):
            tracked(d, (x, y + 32), str(v), cond(40, 8) if name == "PTS" else cond(38, 2), rgba(CREAM, al), 2, "center")
        if marks and team in marks:
            ok = marks[team]; mx = 1680
            if ok: d.line((mx - 26, y + 50, mx - 6, y + 70, mx + 30, y + 26), fill=rgba((90, 200, 120), al), width=9)
            else: d.line((mx - 24, y + 26, mx + 24, y + 70), fill=rgba(RED, al), width=9); d.line((mx + 24, y + 26, mx - 24, y + 70), fill=rgba(RED, al), width=9)

def maths(d, L, t, sc):
    tracked(d, (W / 2, 120), "WORLD CUP 1982  ·  GROUP 2", cond(34, 2), rgba(GOLD, ramp(t, 0, 0.5)), 8, "center")
    r1 = at("Then they beat Chile", sc); r2 = at("Algeria's last game finished", sc); r3 = at("If West Germany won by one or two", sc)
    rows = [list(r) for r in ROWS_BEFORE]
    if t < r1:                                                   # before the Chile game: Algeria on 2 games, 2 pts
        rows[1][2:] = [2, 1, 1, 2, 3, 2]; rows[3][2:] = [2, 0, 2, 1, 5, 0]
    table(d, rows, ramp(t, 0.2, 0.8))
    p = ramp(t, r2, r2 + 0.5)
    if p > 0:
        d.rounded_rectangle((560, 820, 1360, 900), 12, fill=rgba(RED, 0.9 * p))
        tracked(d, (960, 846), "STILL TO PLAY:  W. GERMANY  v  AUSTRIA  ·  25 JUNE", cond(32, 8), rgba(CREAM, p), 4, "center")
    q = ramp(t, r3, r3 + 0.5)
    if q > 0:
        d.rectangle((0, 0, W, H), fill=rgba(NAVY_D, 0.86 * q))
        text_top(d, (W / 2, 260), "If West Germany win by 1 or 2…", pf(80, 800), rgba(CREAM, q), "center")
        for i, (team, ok, col) in enumerate((("West Germany", True, WHITE), ("Austria", True, RED), ("Algeria", False, GREEN))):
            a2 = ramp(t, r3 + 1.0 + 0.8 * i, r3 + 1.4 + 0.8 * i); y = 460 + i * 130
            if a2 <= 0: continue
            d.rectangle((560, y, 1360, y + 100), fill=rgba(NAVY, a2), outline=rgba(col, a2), width=3)
            text_top(d, (610, y + 28), team, pf(56, 700), rgba(CREAM, a2))
            tracked(d, (1320, y + 34), "THROUGH" if ok else "OUT", cond(40, 8), rgba((90, 200, 120) if ok else RED, a2), 6, "right")

# ---------------------------------------------------------------- Algeria 2-1 West Germany
def goals(d, L, t, sc):
    tracked(d, (W / 2, 140), "16 JUNE 1982  ·  GIJÓN", cond(34, 2), rgba(GOLD, ramp(t, 0, 0.5)), 8, "center")
    x0, x1, y = 260, 1660, 780
    d.rectangle((x0, y - 4, x1, y + 4), fill=rgba(CREAM, 0.35))
    for m in (0, 45, 90): tracked(d, (x0 + (x1 - x0) * m / 90, y + 40), f"{m}'", cond(26, 2), rgba(CREAM, 0.6), 2, "center")
    ev = [(54, "MADJER", GREEN, "Early in the second half"), (67, "RUMMENIGGE", WHITE, "Karl-Heinz Rummenigge"), (68, "BELLOUMI", GREEN, "And a minute later")]
    alg = ger = 0
    for k, (m, who, col, snip) in enumerate(ev):
        a = ramp(t, at(snip, sc) + 0.8, at(snip, sc) + 1.2)
        if a <= 0: continue
        x = x0 + (x1 - x0) * m / 90; up = -1 if col == GREEN else 1
        d.ellipse((x - 16, y - 16, x + 16, y + 16), fill=rgba(col, a))
        yy = y + up * (90 + 60 * (k == 2))
        d.line((x, y + up * 18, x, yy - up * 10), fill=rgba(col, a), width=3)
        tracked(d, (x, yy - (44 if up < 0 else -10)), f"{m}'  {who}", cond(32, 8), rgba(CREAM, a), 4, "center")
        if col == GREEN: alg += 1
        else: ger += 1
    a0 = ramp(t, 0.2, 0.6)
    tracked(d, (W / 2 - 250, 330), "ALGERIA", cond(50, 8), rgba(GREEN if False else CREAM, a0), 6, "right")
    text_top(d, (W / 2, 280), f"{alg}–{ger}", pf(150, 900), rgba(GOLD, a0), "center")
    tracked(d, (W / 2 + 250, 330), "WEST GERMANY", cond(50, 8), rgba(CREAM, a0), 6, "left")
    s = ramp(t, at("One of the greatest shocks", sc), at("One of the greatest shocks", sc) + 0.4)
    if s > 0: tracked(d, (W / 2, 500), "ONE OF THE GREATEST SHOCKS IN WORLD CUP HISTORY", cond(36, 8), rgba(GOLD, s), 6, "center")

# ---------------------------------------------------------------- the goal that suited everyone
def hrubesch(d, L, t, sc):
    tracked(d, (W / 2, 200), "25 JUNE 1982  ·  EL MOLINÓN", cond(34, 2), rgba(GOLD, ramp(t, 0, 0.4)), 8, "center")
    text_top(d, (W / 2, 290), "10'", pf(200, 900), rgba(GOLD, ramp(t, 0.2, 0.6)), "center")
    text_top(d, (W / 2, 560), "W. Germany 1 – 0 Austria", pf(96, 800), rgba(CREAM, ramp(t, 0.5, 0.9)), "center")
    tracked(d, (W / 2, 700), "HORST HRUBESCH", cond(40, 8), rgba(CREAM, ramp(t, 0.8, 1.2)), 8, "center")
    a = ramp(t, at("Exactly the result", sc), at("Exactly the result", sc) + 0.4)
    if a > 0:
        d.rounded_rectangle((560, 820, 1360, 900), 12, fill=rgba(GOLD, a))
        tracked(d, (960, 846), "EXACTLY WHAT BOTH TEAMS NEEDED", cond(34, 8), rgba(NAVY_D, a), 5, "center")

# ---------------------------------------------------------------- the crowd
def chants(d, L, t, sc):
    lines = [("¡Fuera, fuera!", "OUT, OUT!", "They chanted \"Fuera"), ("¡Argelia, Argelia!", "ALGERIA, ALGERIA!", "They chanted \"Argelia"), ("¡Que se besen!", "LET THEM KISS!", "And then, \"Que se besen")]
    tracked(d, (W / 2, 150), "THE CROWD AT EL MOLINÓN", cond(34, 2), rgba(GOLD, ramp(t, 0, 0.5)), 8, "center")
    for i, (es, en, snip) in enumerate(lines):
        a = ramp(t, at(snip, sc) + 0.3, at(snip, sc) + 0.7); y = 270 + i * 230
        if a <= 0: continue
        text_top(d, (W / 2, y + 20 * (1 - a)), es, pf(110, 900), rgba(CREAM if i < 2 else GOLD, a), "center")
        tracked(d, (W / 2, y + 150), en, cond(32, 2), rgba(CREAM, 0.75 * a), 7, "center")

# ---------------------------------------------------------------- the commentators
def tv(d, L, box, a, label, sub, state, t):
    """A 1980s TV: state 'on' (pitch flicker), 'mute' (pitch, flat sound line), or a 0..1 switch-off progress."""
    x0, y0, x1, y1 = box; d.rounded_rectangle(box, 30, fill=rgba((52, 38, 30), a), outline=rgba((20, 14, 10), a), width=6)
    sx0, sy0, sx1, sy1 = x0 + 40, y0 + 40, x1 - 40, y1 - 120; cx, cy = (sx0 + sx1) / 2, (sy0 + sy1) / 2
    d.rounded_rectangle((sx0, sy0, sx1, sy1), 40, fill=rgba((12, 14, 16), a))
    off = state if isinstance(state, float) else 0.0
    if off < 1:
        h = (sy1 - sy0) * max(0.012, 1 - off * 1.3) if off < 0.77 else 3; w = (sx1 - sx0) * (1 if off < 0.77 else max(0.02, 1 - (off - 0.77) / 0.23))
        g = (40, 110, 60) if off < 0.77 else (230, 240, 255)
        d.rectangle((cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2), fill=rgba(g, a))
        if off < 0.6:
            for k in range(4):
                px = cx - w / 2 + ((t * 40 + k * 97) % max(1, w)); d.ellipse((px - 7, cy - 7, px + 7, cy + 7), fill=rgba(WHITE, a))
    elif off >= 1:
        pass
    for k in range(2): d.ellipse((x1 - 110 + k * 50, y1 - 80, x1 - 80 + k * 50, y1 - 50), fill=rgba((30, 22, 16), a))
    tracked(d, ((x0 + x1) / 2, y1 + 40), label, cond(32, 8), rgba(CREAM, a), 5, "center")
    tracked(d, ((x0 + x1) / 2, y1 + 90), sub, cond(28, 2), rgba(GOLD, a), 5, "center")
    if state == "mute":                                            # sound bars flat
        for k in range(12): d.rectangle((x0 + 60 + k * 26, y1 - 72, x0 + 74 + k * 26, y1 - 66), fill=rgba(CREAM, 0.5 * a))

def commentators(d, L, t, sc):
    r2 = at("On Austrian television", sc); a1 = ramp(t, 0.1, 0.6); a2 = ramp(t, r2, r2 + 0.5)
    tv(d, L, (180, 200, 900, 760), a1, "WEST GERMAN TV", "EBERHARD STANJEK STOPS TALKING", "mute" if (t > 2.5 or r2 < 1) else "on", t)
    if a2 > 0:
        off = ramp(t, r2 + 3.2, r2 + 4.4) if t > r2 + 3.2 else 0.0
        tv(d, L, (1020, 200, 1740, 760), a2, "AUSTRIAN TV", "ROBERT SEEGER: “SWITCH OFF”", float(off), t)

# ---------------------------------------------------------------- final whistle
def whistle(d, L, t, sc):
    tracked(d, (W / 2, 140), "FINAL TABLE  ·  GROUP 2", cond(34, 2), rgba(GOLD, ramp(t, 0, 0.5)), 8, "center")
    m = {}
    if t > at("West Germany through", sc) + 0.3: m["West Germany"] = True
    if t > at("Austria through", sc) + 0.3: m["Austria"] = True
    if t > at("Algeria out", sc) + 0.3: m["Algeria"] = False
    table(d, ROWS_AFTER, ramp(t, 0.1, 0.6), marks=m, dim=["Chile"])
    tracked(d, (W / 2, 840), "LEVEL ON POINTS  ·  SPLIT ON GOAL DIFFERENCE", cond(30, 2), rgba(CREAM, 0.7 * ramp(t, 1.5, 2.0)), 6, "center")

# ---------------------------------------------------------------- the ban: kick-offs in sync
def clock(d, cx, cy, r, mins, a, label):
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=rgba(NAVY_D, a), outline=rgba(CREAM, a), width=6)
    for k in range(12):
        an = k * math.pi / 6; d.line((cx + 0.82 * r * math.sin(an), cy - 0.82 * r * math.cos(an), cx + 0.94 * r * math.sin(an), cy - 0.94 * r * math.cos(an)), fill=rgba(CREAM, a), width=4)
    an = mins / 90 * 2 * math.pi
    d.line((cx, cy, cx + 0.75 * r * math.sin(an), cy - 0.75 * r * math.cos(an)), fill=rgba(GOLD, a), width=8)
    d.ellipse((cx - 10, cy - 10, cx + 10, cy + 10), fill=rgba(GOLD, a))
    tracked(d, (cx, cy + r + 40), label, cond(32, 8), rgba(CREAM, a), 6, "center")

def sync_clocks(d, L, t, sc, snip_rule=None, snip_ban=None, kicker="SINCE 1986  ·  EVERY WORLD CUP"):
    a = ramp(t, 0.1, 0.6); mins = (t * 6) % 90
    clock(d, 640, 470, 210, mins, a, "GAME 1"); clock(d, 1280, 470, 210, mins, a, "GAME 2")
    if snip_rule:
        r = ramp(t, at(snip_rule, sc), at(snip_rule, sc) + 0.5)
        tracked(d, (W / 2, 830), "LAST GROUP GAMES  ·  SAME KICK-OFF", cond(44, 8), rgba(GOLD, r), 7, "center")
        tracked(d, (W / 2, 900), kicker, cond(30, 2), rgba(CREAM, 0.8 * r), 6, "center")
    if snip_ban:
        b = ramp(t, at(snip_ban, sc), at(snip_ban, sc) + 0.25)
        if b > 0:
            d.rectangle((0, 0, W, H), fill=rgba(NAVY_D, 0.7 * b))
            text_top(d, (W / 2, 330), "Watching the other game first.", pf(84, 800), rgba(CREAM, b), "center")
            place_stamp(L, W / 2, 640, b, size=150, rot=-8)

def ban_scene(d, L, t, sc): sync_clocks(d, L, t, sc, "From the 1986 World Cup", "Watching the other game first")
def sync_2026(d, L, t, sc): sync_clocks(d, L, t, sc, "But this time, the other game", None, "WORLD CUP 2026  ·  GROUP J")

# ---------------------------------------------------------------- scores
def score_card(kicker, left, sl, sr, right, sub=None, sub_at=None, lcol=CREAM, rcol=CREAM):
    def draw(d, L, t, sc):
        tracked(d, (W / 2, 250), kicker, cond(34, 2), rgba(GOLD, ramp(t, 0, 0.4)), 8, "center")
        a = ramp(t, 0.2, 0.7)
        text_top(d, (W / 2 - 200, 400), left, pf(84, 800), rgba(lcol, a), "right")
        text_top(d, (W / 2, 370), f"{sl}–{sr}", pf(150, 900), rgba(GOLD, a), "center")
        text_top(d, (W / 2 + 200, 400), right, pf(84, 800), rgba(rcol, a), "left")
        if sub:
            b = ramp(t, (at(sub_at, sc) if sub_at else 1.0), (at(sub_at, sc) if sub_at else 1.0) + 0.4)
            tracked(d, (W / 2, 640), sub, cond(40, 8), rgba(CREAM, b), 7, "center")
    return draw

def porto(d, L, t, sc):
    tracked(d, (W / 2, 250), "EUROPEAN CUP FINAL  ·  VIENNA  ·  1987", cond(34, 2), rgba(GOLD, ramp(t, 0, 0.4)), 8, "center")
    flip = at("Then Madjer scored", sc)
    p, b = (2, 1) if t > flip + 0.8 else (0, 1)
    a = ramp(t, 0.2, 0.7)
    text_top(d, (W / 2 - 200, 400), "Porto", pf(84, 800), rgba(CREAM, a), "right")
    text_top(d, (W / 2, 370), f"{p}–{b}", pf(150, 900), rgba(GOLD, a), "center")
    text_top(d, (W / 2 + 200, 400), "Bayern", pf(84, 800), rgba(CREAM, a), "left")
    tracked(d, (W / 2, 640), "78'  MADJER  ·  THE BACK-HEEL" if t > flip + 0.8 else "78' TO GO: BAYERN LEAD", cond(40, 8), rgba(CREAM, a), 7, "center")

def what_if(d, L, t, sc):
    tracked(d, (W / 2, 220), "WHAT DO YOU THINK?", cond(40, 8), rgba(GOLD, ramp(t, 0, 0.5)), 8, "center")
    text_top(d, (W / 2, 330), "No deal was ever proven.", pf(80, 700), rgba(CREAM, ramp(t, at("Nobody ever proved", sc), at("Nobody ever proved", sc) + 0.5)), "center")
    a = ramp(t, at("Was it a fix", sc), at("Was it a fix", sc) + 0.5)
    text_top(d, (W / 2, 470), "A fix — or just football?", pf(110, 900), rgba(GOLD, a), "center")
    place_stamp(L, W / 2, 760, ramp(t, at("Tell me what you think", sc), at("Tell me what you think", sc) + 0.25), text="YOU DECIDE", size=110, color=GOLD, rot=-5)

def banned_end(d, L, t, sc):
    place_stamp(L, W / 2, 200, ramp(t, 0.1, 0.35), size=140, rot=-6)
    tracked(d, (W / 2, 350), "TOO FAST  ·  TOO CLEVER  ·  TOO SHAMEFUL TO BE ALLOWED", cond(30), rgba(GOLD, ramp(t, 1.0, 1.5)), 7, "center")
    tracked(d, (W / 2, 470), "MORE ON BANNED", cond(30), rgba(CREAM, ramp(t, 2.2, 2.7)), 8, "center")
    for i, (a_, b_) in enumerate((("The Fan Car.", "TOO GOOD TO RACE"), ("Group B.", "TOO FAST TO SURVIVE"), ("The back-pass.", "THE RULE THAT SAVED FOOTBALL"))):
        al = ramp(t, 2.6 + 0.4 * i, 3.1 + 0.4 * i); x = 360 + i * 600; y = 540
        if al <= 0: continue
        d.rectangle((x - 270, y, x + 270, y + 190), fill=rgba(NAVY_D, 0.9 * al), outline=rgba(GOLD, al), width=3)
        d.rectangle((x - 270, y, x + 270, y + 8), fill=rgba(RED, al))
        text_top(d, (x, y + 52), a_, pf(58, 700), rgba(CREAM, al), "center")
        tracked(d, (x, y + 132), b_, cond(24), rgba(GOLD, al), 5, "center")
    s_ = ramp(t, at("Subscribe so you", sc), at("Subscribe so you", sc) + 0.4)
    if s_ > 0:
        d.rounded_rectangle((W / 2 - 220, 830, W / 2 + 220, 920), 14, fill=rgba(RED, s_))
        tracked(d, (W / 2, 858), "SUBSCRIBE", cond(44, 3), rgba(CREAM, s_), 8, "center")

def dim_bg(path, amount):
    key = ("dim", path, amount)
    if key not in _bgs:
        im = load(path); s_ = max(W / im.width, H / im.height); im = im.resize((int(im.width * s_) + 1, int(im.height * s_) + 1), Image.BICUBIC)
        im = im.crop(((im.width - W) // 2, (im.height - H) // 2, (im.width - W) // 2 + W, (im.height - H) // 2 + H))
        _bgs[key] = Image.blend(im, Image.new("RGB", (W, H), NAVY_D), amount)
    return _bgs[key]
_bgs = {}

def tv_fallback(d, L, t, sc):                                    # used if the AI TV image isn't there
    tv(d, L, (560, 180, 1360, 800), ramp(t, 0, 0.4), "", "", float(ramp(t, 1.5, 2.6)), t)

# ---------------------------------------------------------------- timeline
MOL = "Interior_de_El_Molinón_bw.jpg"; MOL2 = "Estadio_El_Molinón_bw.jpg"     # modern stadium, so shown in archive black and white
ALG = "Algerie1982.jpg"
scenes = [
    Sting(0.0, bg=Photo(0, C + MOL, credit=cc(MOL), zoom=(1.0, 1.18), focus=((0.45, 0.5), (0.55, 0.45))),
          cy=395, size=290, length=INTRO,
          items=[{"k": "title", "text": "The Disgrace of Gijón.", "y": 655, "size": 130, "at": 1.0},
                 {"k": "rule", "y": 830, "w": 560, "at": 1.4},
                 {"k": "kicker", "text": "EPISODE TWO  ·  WORLD CUP 1982", "y": 868, "at": 1.6}]),
    # cold open
    CuS("In 1982, two of Europe", lambda d, L, t, sc: passing(d, L, t, sc, (62, 75), score=False), off=0, chapter="WORLD CUP  ·  SPAIN 1982"),
    AS("The crowd waved money", "ai_banknotes.png", Photo(S("The crowd waved money", -0.15), C + MOL, credit=cc(MOL), zoom=(1.0, 1.15)), zoom=(1.0, 1.12)),
    AS("A television commentator told", "ai_tv_switch_off.png", CuS("A television commentator told", tv_fallback), zoom=(1.0, 1.1)),
    PS("And the team that paid the price", ALG, zoom=(1.0, 1.12), dim=0.15),
    PS("What happened in Gijón was so shameful", MOL2, zoom=(1.0, 1.1)),
    # I. the underdogs
    OPT("Spain, 1982", "ai_spain_1982.png", zoom=(1.0, 1.1), chapter=CH("I", "THE UNDERDOGS"), texts=[(0.3, "Spain, 1982.", "big")]) or
    CaS("Spain, 1982", [{"k": "kicker", "text": "FIFA WORLD CUP", "y": 400, "at": 0.1}, {"k": "title", "text": "Spain, 1982.", "y": 470, "size": 160, "at": 0.2}], align="center", chapter=CH("I", "THE UNDERDOGS")),
    PS("Algeria are at their first ever", ALG, zoom=(1.0, 1.1), strap=("Algeria", "FIRST WORLD CUP  ·  1982", 0.8)),
    PS("Their first opponents", "Karl-Heinz_Rummenigge.jpg", zoom=(1.0, 1.06), strap=("West Germany", "CHAMPIONS OF EUROPE  ·  1980", 1.6)),
    CaS("The Germans had won every one", [{"k": "kicker", "text": "WEST GERMANY  ·  QUALIFYING", "y": 260, "at": 0.1},
                                          {"k": "big", "text": "8 / 8", "y": 330, "size": 220, "at": "Eight out of eight"},
                                          {"k": "line", "text": "33 scored  ·  3 conceded", "y": 640, "size": 70, "at": "Thirty-three goals"}], align="center"),
    PS("Their coach, Jupp Derwall", "Derwall1.jpg", zoom=(1.0, 1.06), strap=("Jupp Derwall", "WEST GERMANY COACH", 0.6),
       texts=[(4.2, "“…the first train home.”", "mid")]),
    CaS("Sixteenth of June", [{"k": "kicker", "text": "ALGERIA  v  WEST GERMANY", "y": 380, "at": 0.1}, {"k": "title", "text": "16 June. Gijón.", "y": 450, "size": 150, "at": 0.2}],
        align="center", bg=C + MOL),
    PS("Algeria didn't sit back", "L._Belloumi_(GC_Mascara)_1984.jpg", zoom=(1.0, 1.08), strap=("Lakhdar Belloumi", "ALGERIA", 0.6)),
    PS("Fast, one-touch football", ALG, crop=(0.0, 0.0, 1.0, 1.0), zoom=(1.12, 1.25), focus=((0.5, 0.4), (0.5, 0.55))),
    CuS("Early in the second half", goals),
    OPT("One of the greatest shocks", "ai_algeria_celebrate.png", zoom=(1.0, 1.12), texts=[(0.4, "One of the greatest shocks in World Cup history.", "mid")]),
    # II. the maths
    CuS("Algeria lost their next game", maths, chapter=CH("II", "THE MATHS")),
    # III. the match
    CaS("Twenty-fifth of June", [{"k": "kicker", "text": "WEST GERMANY  v  AUSTRIA", "y": 380, "at": 0.1},
                                 {"k": "title", "text": "25 June 1982.", "y": 450, "size": 150, "at": 0.2},
                                 {"k": "line", "text": "El Molinón, Gijón  ·  41,000", "y": 660, "size": 64, "at": "El Molinón"}],
        align="center", bg=C + MOL, chapter=CH("III", "THE MATCH")),
    CuS("After ten minutes, Horst Hrubesch", hrubesch),
    OPT("almost nothing happened", "ai_empty_pitch_dusk.png", zoom=(1.0, 1.08)),
    CuS("For eighty minutes" if has("ai_empty_pitch_dusk.png") else "almost nothing happened", lambda d, L, t, sc: passing(d, L, t, sc, (10, 90))),
    CuS("The Spanish crowd turned on them", chants, bg=lambda t: dim_bg(C + MOL, 0.82)),
    AS("Algerian fans in the stadium", "ai_banknotes.png", PS("Algerian fans in the stadium", MOL2, zoom=(1.1, 1.25)), zoom=(1.12, 1.22), focus=((0.3, 0.5), (0.6, 0.5))),
    OPT("On German television", "ai_empty_commentary.png", zoom=(1.0, 1.1), strap=("Eberhard Stanjek", "WEST GERMAN TV  ·  STOPPED COMMENTATING", 1.5)),
    CuS("On Austrian television" if has("ai_empty_commentary.png") else "On German television", commentators),
    CuS("The final whistle went", whistle),
    # IV. the fallout
    AS("Algeria lodged an official protest", "ai_officials_meeting.png",
       CaS("Algeria lodged an official protest", [{"k": "kicker", "text": "ALGERIA", "y": 400, "at": 0.1}, {"k": "title", "text": "Official protest.", "y": 470, "size": 140, "at": 0.2}], align="center"),
       zoom=(1.0, 1.1), chapter=CH("IV", "THE FALLOUT")),
    CaS("FIFA looked at it", [{"k": "kicker", "text": "FIFA  ·  1982", "y": 300, "at": 0.1},
                              {"k": "title", "text": "No rules broken.", "y": 370, "size": 140, "at": 0.2},
                              {"k": "line", "text": "No agreement was ever proven.", "y": 590, "size": 64, "at": "No agreement between"},
                              {"k": "stamp", "text": "RESULT STANDS", "x": 960, "y": 800, "at": "The result stood", "color": GOLD, "size": 80, "rot": -5}], align="center"),
    CaS("But the Germans had a name", [{"k": "kicker", "text": "IN GERMANY THEY CALLED IT", "y": 330, "at": 0.1},
                                       {"k": "title", "text": "Nichtangriffspakt von Gijón", "y": 410, "size": 96, "at": 1.5},
                                       {"k": "line", "text": "the non-aggression pact of Gijón", "y": 590, "size": 64, "at": "The non-aggression pact"}], align="center"),
    CaS("The rest of the world just called it", [{"k": "title", "text": "The Disgrace of Gijón.", "y": 470, "size": 130, "at": 0.4}], align="center", bg=C + MOL2),
    # V. the ban
    CuS("FIFA couldn't change the result", ban_scene, chapter=CH("V", "THE BAN")),
    # VI. what happened next
    PS("West Germany went all the way to the final", "Italy_v_germany_1982_02.jpg", zoom=(1.0, 1.12), chapter=CH("VI", "WHAT HAPPENED NEXT"),
       strap=("World Cup final, 1982", "ITALY 3–1 WEST GERMANY", 3.0)),
    CaS("Austria went out in the next round", [{"k": "kicker", "text": "AUSTRIA", "y": 400, "at": 0.1}, {"k": "title", "text": "Out in the next round.", "y": 470, "size": 120, "at": 0.2}], align="center"),
    OPT("And Algeria went home", "ai_team_bus.png", zoom=(1.0, 1.1)) or PS("And Algeria went home", ALG, zoom=(1.2, 1.0), dim=0.3),
    PS("But five years later, Rabah Madjer", "FC_Porto_(in_verband_met_wedstrijd_om_Super_Cup_tegen_Ajax)_speler_Madjer_(l)_e,_Bestanddeelnr_934-1340_(cropped).jpg",
       zoom=(1.0, 1.08), strap=("Rabah Madjer", "FC PORTO  ·  1987", 0.8)),
    CuS("Bayern were winning one–nil", porto),
    OPT("The final was played in Vienna", "ai_vienna_1987.png", zoom=(1.0, 1.12), strap=("Vienna", "EUROPEAN CUP FINAL  ·  1987", 0.3)) or
    PS("The final was played in Vienna", "Ernst-happel-stadion_vienna.jpg", zoom=(1.0, 1.15), strap=("Vienna", "AUSTRIA", 0.3)),
    PS("In 2014, Algeria finally met Germany", "Algérie_-_Arménie_-_20140531_-_31.jpg", zoom=(1.0, 1.1), strap=("Algeria", "2014", 0.6)),
    CuS("They took them all the way to extra time", score_card("WORLD CUP 2014  ·  ROUND OF 16", "Germany", 2, 1, "Algeria", "WORLD CHAMPIONS  ·  2014", "Germany went on to win")),
    # VII. forty-four years later
    OPT("And this summer, at the 2026 World Cup", "ai_stadium_2026.png", zoom=(1.0, 1.1), chapter=CH("VII", "FORTY-FOUR YEARS LATER"),
        strap=("Algeria v Austria", "WORLD CUP 2026  ·  FINAL GROUP GAME", 1.0)) or
    CaS("And this summer, at the 2026 World Cup", [{"k": "kicker", "text": "WORLD CUP 2026  ·  FINAL GROUP GAME", "y": 380, "at": 0.3},
                                                   {"k": "title", "text": "Algeria v Austria.", "y": 450, "size": 150, "at": 0.5},
                                                   {"k": "line", "text": "Again.", "y": 680, "size": 70, "at": 2.5, "color": GOLD}],
        align="center", chapter=CH("VII", "FORTY-FOUR YEARS LATER")),
    CaS("Both teams knew a draw", [{"k": "title", "text": "A draw might be enough.", "y": 400, "size": 120, "at": 0.2},
                                   {"k": "line", "text": "Sound familiar?", "y": 600, "size": 70, "at": "Sound familiar", "color": GOLD}], align="center"),
    CuS("But this time, the other game", sync_2026),
    CuS("They didn't play for a draw", score_card("WORLD CUP 2026  ·  GROUP J", "Algeria", 3, 3, "Austria", "BOTH THROUGH  ·  THE HONEST WAY", "And both went through")),
    # VIII. what if
    CuS("So here's the question", what_if, chapter=CH("VIII", "WHAT IF")),
    CuS("This was Banned", banned_end),
]

scenes = [x for x in scenes if x is not None]

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    nd = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", A + "narration.wav"]))
    total = INTRO + nd + TITLE_LEN + 3.0
    voice, audio = OUT + "voice.wav", OUT + "audio_mix.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", A + "narration.wav", "-filter_complex",
                    f"anullsrc=r=48000:cl=mono,atrim=0:{INTRO}[i];anullsrc=r=48000:cl=mono,atrim=0:3[e];"
                    f"[i][0:a][e]concat=n=3:v=0:a=1[o]", "-map", "[o]", voice], check=True)
    m0 = 0.0; mtot = total - m0                               # music runs from the first frame, under the stamp
    bed, order = music_bed(TRACKS, mtot, OUT + "music_bed.wav"); print("music:", " -> ".join(order))
    sfx = stamp_sfx(OUT + "sting_sfx.wav")
    fc = (f"[1:a]volume={MUSIC_GAIN * 1.6},adelay={int(m0 * 1000)}|{int(m0 * 1000)}[mus];"
          f"[0:a]aresample=48000,pan=stereo|c0=c0|c1=c0,asplit=2[v1][key];[mus][key]sidechaincompress=threshold=0.02:ratio=8:attack=40:release=600[duck];"
          f"[2:a]aresample=48000,pan=stereo|c0=c0|c1=c0,volume=0.8[fx];[v1][duck][fx]amix=inputs=3:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=11[o]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", voice, "-i", bed, "-i", sfx, "-filter_complex", fc, "-map", "[o]", "-ar", "48000", audio], check=True)
    only = (float(sys.argv[1]), float(sys.argv[2])) if len(sys.argv) > 2 else None
    out = OUT + ("preview.mp4" if only else sys.argv[1] if len(sys.argv) == 2 else FINAL)
    render(scenes, total, audio, out, workers=9, only=only)
    for f in (audio, voice, sfx, bed): os.remove(f)
    print(out)
