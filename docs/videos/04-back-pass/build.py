"""BANNED 04: The Back-Pass -> PostDrive/Stories/BANNED series/04 Back-pass/video/BANNED 04 - The Back-Pass.mp4

    ~/.venvs/poststudio/bin/python build.py            # full render (+ review 720p)
    ~/.venvs/poststudio/bin/python build.py 95 125     # preview slice (video seconds)
"""
import math, os, sys
VDIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(VDIR, "..", "..", "..", "studio"))
import episode as E
E.init("/Volumes/PostDrive/Stories/BANNED series/04 Back-pass/")
from episode import *

FINAL = "BANNED 04 - The Back-Pass.mp4"
TEAM, OPP, GREEN_OK = (245, 245, 240), RED, (90, 200, 120)

# ---------------------------------------------------------------- pitch
def pitch_base(d, a=1.0, x0=260, y0=200, x1=1660, y1=900):
    ln = rgba(CREAM, 0.55 * a)
    d.rectangle((x0, y0, x1, y1), outline=ln, width=4); xm = (x0 + x1) / 2; ym = (y0 + y1) / 2
    d.line((xm, y0, xm, y1), fill=ln, width=3); d.ellipse((xm - 95, ym - 95, xm + 95, ym + 95), outline=ln, width=3)
    for xa, sgn in ((x0, 1), (x1, -1)):
        d.rectangle((min(xa, xa + sgn * 210), ym - 220, max(xa, xa + sgn * 210), ym + 220), outline=ln, width=3)
        d.rectangle((min(xa, xa + sgn * 70), ym - 100, max(xa, xa + sgn * 70), ym + 100), outline=ln, width=3)
        d.rectangle((min(xa, xa - sgn * 18), ym - 50, max(xa, xa - sgn * 18), ym + 50), outline=ln, width=3)   # goal

def dot(d, x, y, col, a, r=17, ring=None):
    d.ellipse((x - r, y - r, x + r, y + r), fill=rgba(col, a), outline=rgba(NAVY_D, a), width=3)
    if ring: d.ellipse((x - r - 9, y - r - 9, x + r + 9, y + r + 9), outline=rgba(ring, a), width=5)
def ball(d, x, y, a, lift=0.0):
    if lift: d.ellipse((x - 11, y + 6, x + 11, y + 14), fill=rgba((0, 0, 0), 0.35 * a))
    d.ellipse((x - 13, y - 13 - lift, x + 13, y + 13 - lift), fill=rgba(GOLD, a), outline=rgba(NAVY_D, a), width=3)

K, DF = (320, 550), (700, 400)                                       # our keeper, our defender
OUR = [(700, 700), (900, 300), (980, 560), (900, 800)]
THEM = [(1100, 380), (1150, 640), (1300, 520), (1000, 470)]
def lerp(p, q, f): f = 0.5 - 0.5 * math.cos(math.pi * max(0, min(1, f))); return p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f

def loop_state(t, P=3.6):
    """The back-pass loop: pass back, pick up, bounce, roll out, wait. -> (ball xy, lift, held)"""
    f = t % P
    if f < 0.9: return lerp(DF, K, f / 0.9), 0, False
    if f < 1.5: return (K[0] + 16, K[1] - 6), 0, True
    if f < 2.1: g = (f - 1.5) / 0.6; return (K[0] + 22, K[1]), 40 * abs(math.sin(g * 2 * math.pi)), True
    if f < 2.9: return lerp((K[0] + 20, K[1]), DF, (f - 2.1) / 0.8), 0, False
    return (DF[0] - 18, DF[1] + 6), 0, False

def backpass(clock=(84, 90), words=(), score=True):
    """Pitch with the loop running. words: [(snippet, TEXT)] captions that appear on each line."""
    def draw(d, L, t, sc):
        a = ramp(t, 0, 0.5); pitch_base(d, a)
        for p in OUR: dot(d, *p, TEAM, a)
        for p in THEM: dot(d, *p, OPP, a)
        (bx, by), lift, held = loop_state(t)
        dot(d, *DF, TEAM, a); dot(d, *K, (240, 200, 60), a, ring=GOLD if held else None)
        ball(d, bx, by, a, lift)
        mins = clock[0] + (clock[1] - clock[0]) * min(1, t / max(sc.dur, 0.1))
        tracked(d, (1660, 150), f"{int(mins)}'", cond(52, 8), rgba(CREAM, a), 3, "right")
        if score: tracked(d, (260, 150), "1 – 0", cond(46, 8), rgba(GOLD, a), 5)
        cur = [txt for snip, txt in words if t >= at(snip, sc)]
        if cur:
            snip = [s for s, x in words if x == cur[-1]][0]; b = ramp(t, at(snip, sc), at(snip, sc) + 0.25)
            tracked(d, (960, 965), cur[-1], cond(46, 8), rgba(CREAM, b), 8, "center")
    return draw

# ---------------------------------------------------------------- cards
def legal_boring(d, L, t, sc):
    for i, (snip, txt) in enumerate((("It was legal", "Legal."), ("It was boring", "Boring."))):
        a = ramp(t, at(snip, sc), at(snip, sc) + 0.3)
        text_top(d, (W / 2 + (i * 2 - 1) * 330, 330), txt, pf(150, 900), rgba(CREAM, a), "center")
    b = ramp(t, at("And in 1992", sc), at("And in 1992", sc) + 0.4)
    text_top(d, (W / 2, 560), "1992.", pf(180, 900), rgba(GOLD, b), "center")
    k = atf("And in 1992", 0.9, sc)                                   # stamp lands on "banned"
    place_stamp(L, W / 2, 860, ramp(t, k - 0.05, k + 0.2), size=120, rot=-7)

def law12(d, L, t, sc):
    tracked(d, (W / 2, 250), "THE LAWS OF THE GAME  ·  BEFORE 1992", cond(34, 2), rgba(GOLD, ramp(t, 0, 0.5)), 8, "center")
    text_top(d, (W / 2, 360), "A teammate passes back?", pf(90, 800), rgba(CREAM, ramp(t, 0.5, 1.0)), "center")
    text_top(d, (W / 2, 500), "The keeper can pick it up.", pf(90, 800), rgba(CREAM, ramp(t, 1.6, 2.1)), "center")
    a = ramp(t, at("Most of the time", sc), at("Most of the time", sc) + 0.4)
    tracked(d, (W / 2, 720), "NOBODY MINDED", cond(40, 8), rgba(GOLD, a), 8, "center")

WC = [(1930, 3.89), (1934, 4.12), (1938, 4.67), (1950, 4.00), (1954, 5.38), (1958, 3.60), (1962, 2.78), (1966, 2.78), (1970, 2.97), (1974, 2.55), (1978, 2.68),
      (1982, 2.81), (1986, 2.54), (1990, 2.21), (1994, 2.71), (1998, 2.67), (2002, 2.52), (2006, 2.30), (2010, 2.27), (2014, 2.67), (2018, 2.64), (2022, 2.69)]
def goals_chart(d, L, t, sc):
    tracked(d, (W / 2, 140), "GOALS PER GAME  ·  EVERY WORLD CUP", cond(34, 2), rgba(GOLD, ramp(t, 0, 0.5)), 8, "center")
    x0, x1, base, top = 200, 1720, 860, 260; bw = (x1 - x0) / len(WC)
    for i, (yr, g) in enumerate(WC):
        a = ramp(t, 0.3 + i * 0.06, 0.6 + i * 0.06)
        if a <= 0: continue
        h = (base - top) * g / 5.6 * a; x = x0 + i * bw; hot = yr == 1990
        d.rectangle((x + 8, base - h, x + bw - 8, base), fill=rgba(RED if hot else CREAM, 1 if hot else 0.35))
        tracked(d, (x + bw / 2, base + 16), f"'{str(yr)[2:]}", cond(22, 2), rgba(CREAM if not hot else RED, 0.8), 1, "center")
    s = ramp(t, 2.2, 2.7)
    if s > 0:
        i = 13; x = x0 + i * bw + bw / 2; h = (base - top) * 2.95 / 5.6           # label clears the taller bars either side
        text_top(d, (x, base - h - 130), "2.21", pf(80, 900), rgba(RED, s), "center")
        tracked(d, (x, base - h - 40), "ITALIA 90  ·  THE LOWEST EVER", cond(26, 8), rgba(CREAM, s), 4, "center")

def stopwatch(d, cx, cy, r, secs, a, col=GOLD):
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=rgba(NAVY_D, a), outline=rgba(CREAM, a), width=8)
    d.rectangle((cx - 22, cy - r - 46, cx + 22, cy - r - 8), fill=rgba(CREAM, a))
    for k in range(60):
        an = k * math.pi / 30; r0 = 0.86 if k % 5 else 0.78
        d.line((cx + r0 * r * math.sin(an), cy - r0 * r * math.cos(an), cx + 0.94 * r * math.sin(an), cy - 0.94 * r * math.cos(an)), fill=rgba(CREAM, 0.7 * a), width=3 if k % 5 else 5)
    an = (secs % 60) / 60 * 2 * math.pi
    d.line((cx, cy, cx + 0.8 * r * math.sin(an), cy - 0.8 * r * math.cos(an)), fill=rgba(col, a), width=8)
    d.ellipse((cx - 12, cy - 12, cx + 12, cy + 12), fill=rgba(col, a))

def bonner(d, L, t, sc):
    a = ramp(t, 0.1, 0.6); secs = min(5 * 60 + 52, max(0, t - 2.0) * 45)
    tracked(d, (W / 2, 120), "IRELAND  v  EGYPT  ·  ITALIA 90", cond(34, 2), rgba(GOLD, a), 8, "center")
    stopwatch(d, 700, 560, 280, secs, a)
    text_top(d, (1300, 420), f"{int(secs // 60)}:{int(secs % 60):02d}", pf(170, 900), rgba(CREAM, a), "center")
    tracked(d, (1300, 650), "PACKIE BONNER  ·  BALL IN HAND", cond(32, 8), rgba(CREAM, ramp(t, 3.0, 3.5)), 5, "center")
    tracked(d, (1300, 710), "REPORTEDLY  ·  ALMOST SIX MINUTES", cond(28, 2), rgba(GOLD, ramp(t, 4.0, 4.5)), 5, "center")
    f = ramp(t, at("The game finished nil", sc), at("The game finished nil", sc) + 0.4)
    if f > 0:
        d.rectangle((0, 0, W, H), fill=rgba(NAVY_D, 0.9 * f))
        text_top(d, (W / 2 - 200, 430), "Ireland", pf(84, 800), rgba(CREAM, f), "right"); text_top(d, (W / 2, 400), "0–0", pf(150, 900), rgba(GOLD, f), "center")
        text_top(d, (W / 2 + 200, 430), "Egypt", pf(84, 800), rgba(CREAM, f), "left")

def denmark_in(d, L, t, sc):
    tracked(d, (W / 2, 200), "EURO 92  ·  SWEDEN", cond(34, 2), rgba(GOLD, ramp(t, 0, 0.5)), 8, "center")
    a = ramp(t, 0.2, 0.6); y = 360; f = pf(130, 900)
    s = ramp(t, atf("Then, with barely ten days", 0.4, sc), atf("Then, with barely ten days", 0.4, sc) + 0.5)
    w = f.getlength("Yugoslavia")
    text_top(d, (W / 2, y), "Yugoslavia", f, rgba(CREAM, a * (1 - 0.6 * s)), "center")
    if s > 0: d.line((W / 2 - w / 2 - 20, y + 80, W / 2 - w / 2 - 20 + (w + 40) * s, y + 62), fill=rgba(RED, 1), width=12)
    k = ramp(t, atf("Then, with barely ten days", 0.8, sc), atf("Then, with barely ten days", 0.8, sc) + 0.5)
    text_top(d, (W / 2, 560 + 30 * (1 - k)), "Denmark", pf(130, 900), rgba(GOLD, k), "center")
    tracked(d, (W / 2, 760), "10 DAYS' NOTICE", cond(40, 8), rgba(CREAM, ramp(t, atf("Then, with barely ten days", 0.2, sc), atf("Then, with barely ten days", 0.2, sc) + 0.4)), 8, "center")
    tracked(d, (W / 2, 120 + 0 * a), "FAILED TO QUALIFY", cond(30, 2), rgba(RED, ramp(t, 0.3, 0.8) * (1 - k)), 7, "center")

def results(d, L, t, sc):
    tracked(d, (W / 2, 180), "DENMARK  ·  EURO 92", cond(34, 2), rgba(GOLD, ramp(t, 0, 0.5)), 8, "center")
    rows = [("Denmark 2–1 France", "GROUP", "They beat France"), ("Denmark 2–2 Netherlands", "SEMI-FINAL  ·  WON 5–4 ON PENALTIES", "They beat the Netherlands"),
            ("Denmark 2–0 Germany", "THE FINAL", "And in the final")]
    for i, (txt, sub, snip) in enumerate(rows):
        a = ramp(t, at(snip, sc), at(snip, sc) + 0.4); y = 300 + i * 190
        if a <= 0: continue
        text_top(d, (W / 2, y + 20 * (1 - a)), txt, pf(86, 800), rgba(GOLD if i == 2 else CREAM, a), "center")
        tracked(d, (W / 2, y + 112), sub, cond(28, 2), rgba(CREAM, 0.7 * a), 6, "center")

def law_change(d, L, t, sc):
    tracked(d, (W / 2, 120), "THE LAWS OF THE GAME  ·  SUMMER 1992", cond(34, 2), rgba(GOLD, ramp(t, 0, 0.5)), 8, "center")
    a = ramp(t, 0.2, 0.6); pitch_base(d, a * 0.8, 260, 200, 1660, 900)
    s0 = at("If a player deliberately", sc); f = ramp(t, s0 + 1.0, s0 + 2.4)
    dot(d, *K, (240, 200, 60), a); dot(d, *DF, TEAM, a)
    bx, by = lerp(DF, (K[0] + 22, K[1] - 4), f); ball(d, bx, by, a)
    if f > 0: d.line((DF[0], DF[1], bx, by), fill=rgba(GOLD, 0.5 * a), width=4)
    x = ramp(t, atf("If a player deliberately", 0.62, sc), atf("If a player deliberately", 0.62, sc) + 0.3)
    if x > 0:                                                        # no hands: red cross over the keeper
        cx, cy = K[0] + 10, K[1] - 70; r = 40
        d.line((cx - r, cy - r, cx + r, cy + r), fill=rgba(RED, x), width=12); d.line((cx + r, cy - r, cx - r, cy + r), fill=rgba(RED, x), width=12)
        tracked(d, (cx + 70, cy - 20), "NO HANDS", cond(40, 8), rgba(RED, x), 6)
    k = ramp(t, at("If he does", sc), at("If he does", sc) + 0.4)
    if k > 0:
        d.rounded_rectangle((760, 760, 1600, 850), 14, fill=rgba(RED, k))
        tracked(d, (1180, 786), "FREE KICK  ·  INSIDE THE PENALTY AREA", cond(36, 8), rgba(CREAM, k), 5, "center")
    b = ramp(t, at("Picking up a back-pass", sc), at("Picking up a back-pass", sc) + 0.3)
    if b > 0:
        d.rectangle((0, 0, W, H), fill=rgba(NAVY_D, 0.85 * b))
        text_top(d, (W / 2, 330), "Picking up a back-pass.", pf(100, 800), rgba(CREAM, b), "center")
        place_stamp(L, W / 2, 660, ramp(t, at("Banned.", sc) - 0.05, at("Banned.", sc) + 0.2), size=160, rot=-8)

def striker(d, L, t, sc):
    """Keeper with the ball at his feet, a striker closing in, and the ball skewing off."""
    a = ramp(t, 0, 0.5); pitch_base(d, a); P = 3.2; f = t % P
    sx, sy = lerp((900, 420), (K[0] + 70, K[1] - 20), min(1, f / 2.0))
    dot(d, *K, (240, 200, 60), a); dot(d, sx, sy, OPP, a)
    if f < 1.6: bx, by = lerp(DF, (K[0] + 40, K[1]), f / 1.0)
    else: bx, by = lerp((K[0] + 40, K[1]), (520, 160), (f - 1.6) / 0.9)
    dot(d, *DF, TEAM, a); ball(d, bx, by, a, 0 if f < 1.6 else 30 * math.sin(min(1, (f - 1.6) / 0.9) * math.pi))
    tracked(d, (960, 965), "FEET ONLY", cond(46, 8), rgba(CREAM, ramp(t, 0.8, 1.2)), 8, "center")

def risky_backpass(d, L, t, sc):
    """A soft back-pass, an attacker reading it, the keeper can't pick it up: goal."""
    a = ramp(t, 0, 0.5); pitch_base(d, a); P = 4.2; f = t % P
    for p in OUR: dot(d, *p, TEAM, a)
    for p in THEM[1:]: dot(d, *p, OPP, a)
    goal = (262, 550); meet = (430, 515)
    if f < 1.9: bx, by = lerp(DF, meet, f / 1.9 * 0.97)                     # slow pass back
    elif f < 2.6: bx, by = lerp(meet, goal, (f - 1.9) / 0.7)                # attacker gets there first
    else: bx, by = goal
    sx, sy = lerp(THEM[0], (meet[0] + 18, meet[1] - 10), min(1, f / 1.9))
    if f >= 1.9: sx, sy = lerp((meet[0] + 18, meet[1] - 10), (330, 530), min(1, (f - 1.9) / 0.8))
    kx, ky = lerp(K, (360, 600), min(1, f / 2.2))
    dot(d, *DF, TEAM, a); dot(d, kx, ky, (240, 200, 60), a); dot(d, sx, sy, OPP, a, ring=RED if f > 1.2 else None)
    ball(d, bx, by, a)
    if f < 1.9: d.line((DF[0], DF[1], bx, by), fill=rgba(GOLD, 0.35 * a), width=3)
    if f >= 2.6: tracked(d, (420, 440), "GOAL", cond(54, 8), rgba(RED, a * ramp(f, 2.6, 2.8) * (1 - ramp(f, 3.9, 4.2))), 8, "center")
    caps = [("Defenders weren't safe either", "DEFENDERS WEREN'T SAFE EITHER", CREAM), ("For years, a pass back", "THE SAFE OPTION?", CREAM), ("Now it was a risk", "NOW IT WAS A RISK", RED)]
    cur = [c for c in caps if t >= at(c[0], sc) - 0.15]
    if cur:
        sn, txt, col = cur[-1]; b = ramp(t, at(sn, sc) - 0.15, at(sn, sc) + 0.2)
        tracked(d, (960, 965), txt, cond(46, 8), rgba(col, b), 8, "center")

def rule_timeline(d, L, t, sc):
    tracked(d, (W / 2, 200), "THE KEEPER'S RULEBOOK", cond(34, 2), rgba(GOLD, ramp(t, 0, 0.5)), 8, "center")
    x0, x1, y = 300, 1620, 560
    d.rectangle((x0, y - 3, x1, y + 3), fill=rgba(CREAM, 0.35 * ramp(t, 0, 0.5)))
    ev = [(1992, "NO BACK-PASSES", "But the game got faster"), (1997, "NO THROW-INS EITHER", "A few years later, throw-ins"), (2000, "SIX SECONDS", "Then keepers were given")]
    for i, (yr, txt, snip) in enumerate(ev):
        a = ramp(t, at(snip, sc) + 0.3, at(snip, sc) + 0.7)
        if a <= 0: continue
        x = x0 + (x1 - x0) * i / 2
        d.ellipse((x - 18, y - 18, x + 18, y + 18), fill=rgba(RED if i == 0 else GOLD, a))
        text_top(d, (x, y - 170), str(yr), pf(96, 900), rgba(CREAM, a), "center")
        tracked(d, (x, y + 60), txt, cond(32, 8), rgba(GOLD, a), 5, "center")

def eight_seconds(d, L, t, sc):
    tracked(d, (W / 2, 140), "THE LAWS OF THE GAME  ·  2025", cond(34, 2), rgba(GOLD, ramp(t, 0, 0.5)), 8, "center")
    s0 = at("Hold the ball in your hands", sc); left = max(0, 8 - max(0, t - s0 - 0.3) * 2.2)
    a = ramp(t, 0.1, 0.6)
    text_top(d, (W / 2, 280), "2025", pf(150, 900), rgba(CREAM, a * (1 - ramp(t, s0, s0 + 0.3))), "center")
    if t > s0:
        b = ramp(t, s0, s0 + 0.3)
        stopwatch(d, 700, 580, 260, (8 - left) * 7.5, b, RED if left == 0 else GOLD)
        text_top(d, (1300, 420), f"{left:.0f}" if left > 0 else "0", pf(200, 900), rgba(CREAM, b), "center")
        tracked(d, (1300, 680), "SECONDS IN HAND", cond(34, 8), rgba(CREAM, 0.8 * b), 6, "center")
        if left == 0: place_stamp(L, 1300, 820, ramp(t, s0 + 0.3 + 8 / 2.2, s0 + 0.55 + 8 / 2.2), text="CORNER", size=100, color=RED, rot=-6)

def then_now(d, L, t, sc):
    a = ramp(t, 0.1, 0.6); secs = min(5 * 60 + 52, t * 80)
    stopwatch(d, 560, 520, 230, secs, a)
    text_top(d, (560, 800), f"{int(secs // 60)}:{int(secs % 60):02d}", pf(90, 900), rgba(CREAM, a), "center")
    tracked(d, (560, 930), "1990  ·  PACKIE BONNER", cond(30, 8), rgba(GOLD, a), 5, "center")
    b = ramp(t, at("These days", sc), at("These days", sc) + 0.4); s2 = min(8, max(0, t - at("These days", sc)) * 3)
    if b > 0:
        stopwatch(d, 1360, 520, 230, s2 * 7.5, b, RED)
        text_top(d, (1360, 800), f"0:{int(s2):02d}", pf(90, 900), rgba(CREAM, b), "center")
        tracked(d, (1360, 930), "TODAY  ·  CORNER AFTER 8", cond(30, 8), rgba(RED, b), 5, "center")

# ---------------------------------------------------------------- timeline
SANSIRO, ULLEVI = "San_Siro_Stadium_in_the_2009-10_derby_bw.jpg", "Ullevi_stadium_in_gothenburg_20060510_bw.jpg"   # modern stadiums: black and white
scenes = [
    opening(AI + "ai_keeper_hands.png", "The Back-Pass.", "EPISODE FOUR  ·  THE LAWS OF THE GAME", credit="AI illustration"),
    # cold open
    AS("There was a time when a team", "ai_keeper_hands.png", off=0, zoom=(1.1, 1.22), focus=((0.45, 0.6), (0.45, 0.7)), chapter="FOOTBALL  ·  BEFORE 1992"),
    CuS("Get one goal ahead", backpass((84, 90), [("Get one goal ahead", "PASS IT BACK"), ("He picks it up", "PICK IT UP"), ("Bounces it", "BOUNCE IT"),
                                                  ("Rolls it out", "ROLL IT OUT"), ("And you pass it straight back", "PASS IT BACK"), ("Again.", "AGAIN"),
                                                  ("And again", "AND AGAIN"), ("Until the referee", "UNTIL THE FINAL WHISTLE")])),
    CuS("It was legal", legal_boring),
    # I. the problem
    CuS("For more than a hundred years", law12, chapter=CH("I", "THE PROBLEM")),
    CuS("But as teams perfected", backpass((60, 90), [("One goal up", "ONE GOAL UP?"), ("Kill the game", "KILL THE GAME"), ("Pass it back.", "PASS IT BACK")])),
    # II. Italia 90
    PS("The 1990 World Cup in Italy", SANSIRO, zoom=(1.0, 1.12), chapter=CH("II", "ITALIA 90"), strap=("Italia 90", "SAN SIRO, MILAN", 0.8)),
    AS("Instead, it's remembered", "ai_bored_crowd.png", zoom=(1.0, 1.1)),
    CuS("Fewer goals per game", goals_chart),
    CuS("In one game, between the Republic", bonner),
    CaS("Football's lawmakers watched it", [{"k": "kicker", "text": "FOOTBALL'S LAWMAKERS", "y": 400, "at": 0.1},
                                            {"k": "title", "text": "Something had to change.", "y": 470, "size": 120, "at": 1.5}], align="center"),
    # III. the last dance
    PS("But before the new rule came in", ULLEVI, zoom=(1.0, 1.12), chapter=CH("III", "THE LAST DANCE"), strap=("Euro 92", "SWEDEN", 4.3)),
    CaS("And the team that won it", [{"k": "title", "text": "The team that won it…", "y": 400, "size": 110, "at": 0.2},
                                     {"k": "line", "text": "…wasn't supposed to be there.", "y": 560, "size": 70, "at": 1.4, "color": GOLD}], align="center"),
    CuS("Denmark had failed to qualify", denmark_in),
    CuS("They beat France", results),
    CaS("How did they pull off", [{"k": "title", "text": "The shock of the century.", "y": 450, "size": 120, "at": 0.3}], align="center", bg=C + ULLEVI),
    PS("Well, a big part of it was their keeper", "Peter_Schmeichel_2012-01-25_001.jpg", zoom=(1.0, 1.06), strap=("Peter Schmeichel", "DENMARK", 2.6),
       texts=[(5.5, "Back-pass after back-pass.", "mid")]),
    CaS("It was the last major tournament", [{"k": "kicker", "text": "EURO 92", "y": 400, "at": 0.1},
                                              {"k": "title", "text": "The last one.", "y": 470, "size": 150, "at": 0.4}], align="center", bg=C + ULLEVI),
    # IV. the ban
    CuS("That summer, the law changed", law_change, chapter=CH("IV", "THE BAN")),
    # V. chaos
    AS("At first, it was carnage", "ai_keeper_miskick.png", zoom=(1.0, 1.12), chapter=CH("V", "CHAOS")),
    AS("Goalkeepers had spent their whole careers", "ai_keeper_hands.png", zoom=(1.0, 1.1)),
    CuS("Now, with a striker charging", striker),
    AS("Some of them panicked", "ai_keeper_miskick.png", zoom=(1.15, 1.3), focus=((0.6, 0.5), (0.7, 0.55)),
       texts=[(0.3, "Into the stands.", "mid"), (S("Some of them miskicked") - S("Some of them panicked", -0.15), "Miskicked.", "mid"),
              (S("Some of them got caught") - S("Some of them panicked", -0.15), "Caught on the ball.", "mid")]),
    CuS("Defenders weren't safe either", risky_backpass),
    # VI. what happened next
    CuS("But the game got faster", rule_timeline, chapter=CH("VI", "WHAT HAPPENED NEXT")),
    CaS("And something nobody expected", [{"k": "title", "text": "A new kind of goalkeeper.", "y": 450, "size": 120, "at": "A whole new kind"}], align="center"),
    PS("Keepers who could pass like midfielders", "Ederson_Moraes_(36243872090)_(cropped).jpg", zoom=(1.0, 1.08), strap=("Ederson", "THE KEEPER AS PLAYMAKER", 0.6)),
    PS("Keepers who start attacks", "20180602_FIFA_Friendly_Match_Austria_vs._Germany_Manuel_Neuer_850_0723.jpg", zoom=(1.0, 1.06), strap=("Manuel Neuer", "THE SWEEPER-KEEPER", 0.8)),
    PS("Today, a goalkeeper who can't", "20180610_FIFA_Friendly_Match_Austria_vs._Brazil_850_1625.jpg", zoom=(1.0, 1.06), strap=("Alisson", "BRAZIL", 0.8)),
    CaS("The rule that was meant to stop", [{"k": "kicker", "text": "THE BACK-PASS RULE", "y": 330, "at": 0.1},
                                            {"k": "title", "text": "It invented the modern goalkeeper.", "y": 400, "size": 100, "at": 1.6, "width": 1500}], align="center"),
    # VII. thirty-three years later
    CuS("And it still isn't over", eight_seconds, chapter=CH("VII", "THIRTY-THREE YEARS LATER")),
    CuS("Packie Bonner's six minutes", then_now),
    # VIII. what if
    CuS("So here's the question", what_if("Did it save football?", "Did the back-pass rule", "Or ruin goalkeepers?", "Or did it just make"), chapter=CH("VIII", "WHAT IF")),
    CuS("This was Banned", banned_end("The Back-Pass.")),
]

if __name__ == "__main__":
    main(scenes, FINAL)
