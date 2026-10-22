"""IMPOSSIBLE: Stanley Matthews, the man who refused to get old -> Omnira Football/Videos/Stanley Matthews (IMPOSSIBLE)/video/

    ~/.venvs/poststudio/bin/python build.py            # full render (+ review 720p)
    ~/.venvs/poststudio/bin/python build.py 95 125     # preview slice (video seconds)
    ~/.venvs/poststudio/bin/python build.py check      # shot check: every picture, its time, the words said over it

script.md v3 (approved by Mike 22 Oct), AI narration Boss (London, Eleven v4) in audio/v1/. First AI studio test project:
real Commons photos of Matthews where they exist, free AI stills/clips (Nano Banana 2 / Kling 2.5 Turbo) for what no camera
caught, labelled "AI reconstruction". The two 1953 goals are stills + reactions (Mike 22 Oct: no AI match action).
"""
import math, os, sys
from PIL import ImageFont
VDIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(VDIR, "..", "..", "..", "studio"))
import episode as E
E.init("/Volumes/PostDrive/Omnira Football/Videos/Stanley Matthews (IMPOSSIBLE)/", series="impossible", narration="audio/v1/")
from episode import *
from factcard import FactCard
E.AI_RATE = 0.6                                                               # AI clips at 60% speed (Mike 20 Oct)

FINAL = "IMPOSSIBLE - Stanley Matthews v2.mp4"
TANGERINE, BOLTON_W, STOKE_R, ENG_W = (236, 120, 40), (235, 235, 230), (200, 30, 45), (240, 240, 240)
MANU, NEWC, USA, GER, HUN = (218, 41, 28), (30, 30, 30), (20, 50, 120), (30, 30, 30), (200, 30, 45)
SFX = "/Volumes/PostDrive/Library/sound/sfx/"

def cm(f): return f.replace(" ", "_")
# photos (Wikimedia Commons)
AUTOGRAPHS, GRIN57 = "MatthewsRotterdam1957.jpg", "StanleyMatthewsRotterdam1957.jpg"
MATCH57A, MATCH57B = cm("Voetbal Sparta tegen Blackpool met Stanley Matthews, Bestanddeelnr 908-8707.jpg"), cm("Voetbal Sparta tegen Blackpool met Stanley Matthews, Bestanddeelnr 908-8708.jpg")
SPARTA57, STOKE62, STOKE62C = "SpartaBlackpoolRdam1957.jpg", "Stanley_Matthews_1962.jpg", "Stanley_Matthews_1962_(crop).jpg"
WILLS, DERBY1920 = "Wills_card_matthews.jpg", "Potteries_derby_March_1920.jpg"
STATUE_HANLEY = cm("Stanley Matthews statue, Hanley town centre - geograph.org.uk - 6302204.jpg")
STATUES_STOKE = cm("The Stanley Matthews Statues at the Bet 365 Stadium - geograph.org.uk - 7993644.jpg")
MORTY_STATUE, LOFT_STATUE = "Stan_Mortensen_statue_2024.jpg", "Nat_Lofthouse_statue.jpg"
BLOOMFIELD = cm("The Stanley Matthews west stand at Bloomfield Road - geograph.org.uk - 5545305.jpg")
WEMBLEY56, KILNS = "Wembley_Stadium_interior_1956.jpg", cm("Bottle kilns at the former Dresden Mills, Hanley - geograph.org.uk - 6437845.jpg")
MURAL = cm("Football match of the century mural in Budapest (1).jpg")
BALLON = "Zinedine_Zidane's_1998_Ballon_d'Or_trophy,_Real_Madrid_Museum,_Santiago_Bernabéu,_Madrid,_Spain_(Ank_Kumar,_Infosys_Limited)_01.jpg"
# AI stills / clips (Artlist website, free models)
F = {k: f"F{k:02d}" for k in range(1, 18)}
POTTERIES, BARBER, BOOTS, BEACH, TOWERS = "F01_potteries", "F02_barber", "F03_boots", "F04_beach", "F05_wembley_towers"
ROOM, ROOM_CHEER, CROWD53, WINGER, ERUPTS = "F06_front_room", "F07_front_room_cheer", "F08_wembley_crowd", "F09_winger", "F10_wembley_erupts"
QUEUE61, TOWNSHIP, STOKE2000, HALL, BERLIN = "F11_queue_1961", "F12_township", "F13_stoke_streets", "F14_hall_meeting", "F15_berlin_stadium"
FLOOD65, PAPER = "F16_floodlit_1965", "F17_newspaper.png"
MUD50, DRESSING70, FANS_WALK = "lib01_12_1950s-match", "lib01_13_1970s-dressing-room", "lib01_14_fans-walk"
G = "goals_v2/stills/"
FK_SETUP, FK_NET, W_NET, W_MOB = G + "A_setup.png", G + "FK4_net_v3.png", G + "W3_end.png", G + "W4_mobbed_v2.png"

def S_nth(snip, n, off=0.0):
    return vt([e for e in E.SENTS if e["text"].lower() == snip.lower()][n]["out_start"] + off)
def T(v, sc): return (at(v[0], sc) + v[1]) if isinstance(v, tuple) else v
def lt(snip, sc, off=0.0): return at(snip, sc) + off
def AR(snip, ai, off=-0.15, start=None, **kw):                 # realistic AI scene of a real event: labelled
    p = Photo(S(snip, off) if start is None else start, AI + ai + ("" if ai.endswith(".png") else ".png"), credit="AI reconstruction", **kw)
    return p
def AA(snip, ai, off=-0.15, start=None, **kw):                 # AI atmosphere (no real event shown)
    return Photo(S(snip, off) if start is None else start, AI + ai + ("" if ai.endswith(".png") else ".png"), credit="AI illustration", **kw)
def VR(snip, clip, off=-0.15, start=None, recon=False, **kw):
    return Clip(S(snip, off) if start is None else start, AI + clip + ".mp4", credit="AI reconstruction" if recon else "AI illustration",
                **({"max_rate": E.AI_RATE} | kw))
def FC(snip, path, name, role, facts=(), off=-0.15, start=None, **kw):
    full = next((d + path for d in (C, M, AI) if os.path.exists(d + path)), path)
    fs = [((lambda sc, v=f[0]: T(v, sc)),) + tuple(f[1:]) for f in facts]
    return FactCard(S(snip, off) if start is None else start, full, name, role, facts=fs, **kw)
def bgp(f, amt=0.85): return bg_of(C + f, amt)
def bga(f, amt=0.85): return bg_of(AI + f + ("" if f.endswith(".png") else ".png"), amt)
def tag(d, xy, text, a, colour=GOLD, size=40):
    if a <= 0: return
    x, y = xy; f = cond(size, 8); tw = sum(f.getlength(ch) for ch in text) + 6 * (len(text) - 1)
    bb = f.getbbox("H"); cap = bb[3] - bb[1]; pad = max(10, size * 0.32)
    d.rounded_rectangle((x - tw / 2 - 22, y - pad, x + tw / 2 + 22, y + cap + pad), 10, fill=rgba(NAVY_D, 0.86 * a), outline=rgba(colour, a), width=3)
    tracked(d, (x, y), text, f, rgba(colour, a), 6, "center")
def big(d, y, text, a, col=GOLD, size=200):
    if a > 0: text_top(d, (W / 2, y), text, pf(size, 900), rgba(col, a), "center")

# ---------------------------------------------------------------- scoreboard (from Leicester / Istanbul)
def score_at(events, t):
    cur, hit = (events[0][1], events[0][2]), 0.0
    for te, l, r in events:
        if t >= te: cur = (l, r); hit = max(0.0, 1 - (t - te) / 0.45)
    return cur[0], cur[1], hit

def board(d, cx, cy, left, right, sl, sr, a, hit=0.0, s=1.0, lcol=TANGERINE, rcol=BOLTON_W):
    if a <= 0: return
    sh = 26 * s * hit ** 2; cx += sh * math.sin(hit * 41); cy += sh * math.cos(hit * 37)
    d.rounded_rectangle((cx - 780 * s, cy - 125 * s, cx + 780 * s, cy + 125 * s), int(22 * s), fill=rgba(NAVY_D, 0.92 * a), outline=rgba(GOLD, a), width=max(2, int(5 * s)))
    d.rectangle((cx - 780 * s + 6, cy - 125 * s + 6, cx - 760 * s, cy + 125 * s - 6), fill=rgba(lcol, a))
    d.rectangle((cx + 760 * s, cy - 125 * s + 6, cx + 780 * s - 6, cy + 125 * s - 6), fill=rgba(rcol, a))
    for txt, x, al in ((left, cx - 270 * s, "right"), (right, cx + 270 * s, "left")):
        fs = int(76 * s)
        while fs > 30 and cond(fs, 8).getlength(txt) + 8 * s * len(txt) > 460 * s: fs -= 2
        b_ = cond(fs, 8).getbbox("H"); tracked(d, (x, cy - (b_[3] - b_[1]) / 2 - b_[1]), txt, cond(fs, 8), rgba(CREAM, a), int(8 * s), al)
    if hit > 0:
        r = (1 - hit) * 520 * s + 60 * s
        d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=rgba(GOLD, 0.8 * hit * a), width=max(2, int(14 * s * hit)))
    g = 1 + 0.35 * hit ** 2
    text_top(d, (cx, cy - 78 * s * g), f"{sl}–{sr}", pf(int(150 * s * g), 900), rgba(GOLD if hit > 0.05 else CREAM, a), "center")

def scoreboard(kicker, events, left, right, lcol, rcol, scorers=None, sub=None):
    """events [(time, l, r)], scorers [(time, "NAME 35'")], sub (text, time). Times: numbers or (snippet, offset)."""
    def draw(d, L, t, sc):
        a = ramp(t, 0, 0.4)
        tracked(d, (W / 2, 250), kicker, cond(46, 8), rgba(GOLD, a), 10, "center")
        sl, sr, hit = score_at([(T(te, sc), l, r) for te, l, r in events], t)
        board(d, W / 2, 500, left, right, sl, sr, a, hit, 1.12, lcol, rcol)
        sh = [(T(te, sc), txt) for te, txt in (scorers or []) if t >= T(te, sc)][-3:]
        for i, (te, txt) in enumerate(sh):
            b = ramp(t, te, te + 0.3)
            tracked(d, (W / 2 + (i - (len(sh) - 1) / 2) * 470, 690 + 20 * (1 - b)), txt, cond(40, 8), rgba(CREAM, b), 6, "center")
        if sub:
            txt, s0 = sub; b = ramp(t, T(s0, sc), T(s0, sc) + 0.4)
            tracked(d, (W / 2, 880), txt, cond(52, 8), rgba(GOLD, b), 8, "center")
    return draw

# ---------------------------------------------------------------- cold open
def fifty(d, L, t, sc):
    """'He was fifty years old.' The number lands, then the knighthood and the Ballon d'Or stack under it."""
    a = ramp(t, 0.1, 0.3); s = 1 + 0.5 * (1 - ease(min(1, max(0, t - 0.1) / 0.25)))
    if a > 0: text_top(d, (W / 2, 250 - 40 * (s - 1)), "50", pf(int(300 * s), 900), rgba(GOLD, a), "center")
    tag(d, (W / 2, 640), "AGED 50  ·  STILL PLAYING IN ENGLAND'S TOP DIVISION", ramp(t, 0.6, 1.0), CREAM, 42)
    k = lt("A month earlier, the Queen", sc)
    tag(d, (W / 2, 760), "KNIGHTED WHILE STILL PLAYING  ·  THE FIRST EVER", ramp(t, k + 0.6, k + 1.0), GOLD, 38)
    b = lt("Nine years before that", sc)
    tag(d, (W / 2, 880), "THE FIRST BALLON D'OR  ·  AGED 41", ramp(t, b + 1.0, b + 1.4), GOLD, 38)

def resume(d, L, t, sc):
    """The three-line life: through a war, sold for being old, two lost finals then the greatest one."""
    rows = [("He played through a world war", "PLAYED THROUGH A WORLD WAR"), ("He was sold because he was too old", "SOLD FOR BEING TOO OLD"),
            ("He lost two Cup finals", "LOST TWO CUP FINALS"), ("He lost two Cup finals", "THEN WON THE MOST FAMOUS ONE, AT 38")]
    for i, (snip, txt) in enumerate(rows):
        k = lt(snip, sc, 2.3 if i == 3 else 0.1); a = ramp(t, k, k + 0.35)
        if a <= 0: continue
        y = 260 + i * 150; x = W / 2 + 80 * (1 - a)
        d.rounded_rectangle((x - 640, y, x + 640, y + 110), 14, fill=rgba(NAVY_D, 0.9 * a), outline=rgba(GOLD if i == 3 else CREAM, 0.6 * a), width=3)
        tracked(d, (x, y + 32), txt, cond(50, 8), rgba(GOLD if i == 3 else CREAM, a), 8, "center")
    m = lt("And he did it all for a few pounds", sc)
    place_stamp(L, W / 2, 930, ramp(t, m + 0.4, m + 0.65), text="£5 A WEEK", size=110, color=GOLD, rot=-5)

# ---------------------------------------------------------------- I. the barber's son
def wage(d, L, t, sc):
    k = lt("Even as a teenager", sc)
    tracked(d, (W / 2, 220), "THE MAXIMUM WAGE  ·  1930s", cond(44, 8), rgba(GOLD, ramp(t, k, k + 0.4)), 10, "center")
    big(d, 300, "£5", ramp(t, k + 1.2, k + 1.5), CREAM, 260)
    tag(d, (W / 2, 640), "A WEEK  ·  THE MOST ANY PLAYER IN ENGLAND COULD EARN", ramp(t, k + 1.6, k + 2.0), CREAM, 40)
    s = lt("His father made him save it", sc)
    place_stamp(L, W / 2, 820, ramp(t, s + 0.2, s + 0.45), text="SAVE IT", size=120, color=GOLD, rot=-6)
    r = lt("Discipline.", sc)
    tag(d, (W / 2, 990), "DISCIPLINE", ramp(t, r, r + 0.3), GOLD, 56)

# ---------------------------------------------------------------- II. how he beat you (drawn explainer)
PX0, PX1, PY0, PY1 = 140, 1780, 140, 960                       # right touchline across the top, goal line on the right
def half_pitch(d, a):
    ln = rgba(CREAM, 0.6 * a)
    d.rectangle((PX0 - 30, PY0 - 30, PX1 + 30, PY1 + 30), fill=rgba((24, 70, 40), 0.7 * a))
    for k in range(9):
        if k % 2: d.rectangle((PX0 + k * 182, PY0, PX0 + (k + 1) * 182, PY1), fill=rgba((40, 95, 55), 0.35 * a))
    d.rectangle((PX0, PY0, PX1, PY1), outline=ln, width=4)
    d.rectangle((PX1 - 300, PY0 + 210, PX1, PY1 - 30), outline=ln, width=3)           # penalty area
    d.rectangle((PX1 - 110, PY0 + 400, PX1, PY1 - 220), outline=ln, width=3)          # six-yard box
    d.rectangle((PX1, PY0 + 500, PX1 + 22, PY1 - 320), fill=rgba(CREAM, 0.9 * a))     # goal
    tracked(d, (PX0 + 20, PY0 - 70), "RIGHT TOUCHLINE", cond(26, 6), rgba(CREAM, 0.7 * a), 4)
    tracked(d, (PX1 - 20, PY1 + 40), "GOAL LINE", cond(26, 6), rgba(CREAM, 0.7 * a), 4, "right")
def disc(d, x, y, col, a, r=24, ring=None, name=None, num=None, below=False):
    if a <= 0.01: return
    d.ellipse((x - r, y - r, x + r, y + r), fill=rgba(col, a), outline=rgba(NAVY_D, a), width=3)
    if num: tracked(d, (x, y - 14), num, cond(24, 8), rgba(NAVY_D if col != NAVY_D else CREAM, a), 2, "center")
    if ring: d.ellipse((x - r - 10, y - r - 10, x + r + 10, y + r + 10), outline=rgba(ring, a), width=5)
    if name: tracked(d, (x, y + 44 if below else y - 70), name, cond(28, 8), rgba(CREAM, a), 4, "center")
def ball_(d, x, y, a): d.ellipse((x - 11, y - 11, x + 11, y + 11), fill=rgba(CREAM, a), outline=rgba(NAVY_D, a), width=3)
def lerp(p, q, f): return (p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f)
def dribble(d, L, t, sc):
    a = ramp(t, 0, 0.5); half_pitch(d, a)
    c = lambda s, o=0.0: lt(s, sc, o)
    tracked(d, (W / 2, 40), "HOW MATTHEWS BEAT YOU", cond(42, 8), rgba(GOLD, a), 10, "center")
    walk = ease(min(1, max(0, t - c("He'd walk the ball up")) / 4.5))
    lean = ease(min(1, max(0, t - c("A drop of the shoulder")) / 1.2))
    gone = ease(min(1, max(0, t - c("And in that half a second")) / 1.6))
    line = ease(min(1, max(0, t - c("He ran to the goal line")) / 2.4))
    back = ease(min(1, max(0, t - c("He ran to the goal line", 4.0)) / 1.3))
    # Matthews: walk up to the full-back, lean inside, burst outside down the line, to the goal line
    m = lerp((420, 260), (900, 260), walk)
    m = lerp(m, (900, 330), lean * (1 - gone))
    m = lerp(m, (1350, 230), gone); m = lerp(m, (1720, 260), line)
    # the full-back: waits, then his weight goes inside with the lean, then he's left behind
    fb = lerp((1010, 270), (1010, 380), lean)
    disc(d, *fb, BOLTON_W, a, 26, name="FULL-BACK", below=True)
    run = lerp((1250, 760), (1560, 640), ease(min(1, max(0, t - c("He ran to the goal line", 1.5)) / 2.5)))
    disc(d, *run, TANGERINE, a * ramp(t, c("He ran to the goal line", 1.0), c("He ran to the goal line", 1.5)), 22, name="TEAM-MATE")
    gk = lerp((1745, 560), (1720, 470), line)
    disc(d, *gk, (40, 120, 70), a, 22)
    for (x, y) in ((1500, 520), (1450, 690)): disc(d, x, y, BOLTON_W, a * 0.9, 22)
    disc(d, *m, TANGERINE, a, 28, ring=GOLD, name="MATTHEWS", num="7")
    if back <= 0: ball_(d, m[0] + 34, m[1] + 18, a)
    else:
        bx, by = lerp((m[0] - 10, m[1] + 30), (run[0] + 20, run[1] - 10), back)
        d.line([(m[0] - 10, m[1] + 30), (bx, by)], fill=rgba(GOLD, 0.6 * a), width=5); ball_(d, bx, by, a)
    if lean > 0 and gone < 1:                                      # the lean: an arrow inside, the defender's weight follows
        x, y = 900, 330; d.line((x, y, x, y + 110 * lean), fill=rgba(GOLD, lean), width=6)
    if gone > 0:
        d.line([(900, 260), (1350, 230), (1720, 260)][: 2 + (line > 0)], fill=rgba(GOLD, 0.35 * a), width=4)
    steps = [("He'd walk the ball up", "1  ·  WALK UP. SLOWLY."), ("Then Matthews leaned.", "2  ·  LEAN INSIDE"),
             ("And in that half a second", "3  ·  GO OUTSIDE"), ("He ran to the goal line", "4  ·  TO THE GOAL LINE, PULL IT BACK")]
    cur = [txt for s, txt in steps if t >= c(s)]
    if cur:
        k = max(c(s) for s, _ in steps if t >= c(s))
        tag(d, (W / 2, 1010), cur[-1], ramp(t, k, k + 0.3), GOLD, 40)

def wizard(d, L, t, sc):
    big(d, 330, "The Wizard", ramp(t, 0.6, 1.0), GOLD, 170)
    big(d, 560, "of the Dribble", ramp(t, 0.9, 1.3), CREAM, 120)

# ---------------------------------------------------------------- III. the town
_TNR = "/System/Library/Fonts/Supplemental/Times New Roman Bold.ttf"
def headline(d, L, t, sc):
    """The newspaper (AI still): its wrong date and its Everton-v-Chelsea caption are papered over; our headline types
    into the blank strip in a newspaper face."""
    paper = (222, 208, 182)
    for box in ((838, 170, 1112, 198), (812, 826, 1158, 856), (796, 860, 1180, 916)):    # date, photo caption, sub-headline
        d.rectangle(box, fill=paper + (255,))
    d.rectangle((428, 205, 1515, 356), fill=paper + (255,))
    f = ImageFont.truetype(_TNR, 64); g = ImageFont.truetype(_TNR, 22)
    d.text((975, 184), "FEBRUARY 1938", font=g, fill=(60, 50, 40, 255), anchor="mm")
    k = lt("In February 1938", sc, 1.2); txt = "STOKE STAR ASKS TO LEAVE"; n = int(len(txt) * min(1, max(0, t - k) / 1.4))
    if n: d.text((972, 280), txt[:n] if n == len(txt) else txt[:n], font=f, fill=(28, 24, 20, 240), anchor="mm")
    tag(d, (W / 2, 1000), "FEBRUARY 1938  ·  AGED 23", ramp(t, k + 1.5, k + 1.9), GOLD, 36)

def hall_count(d, L, t, sc):
    k = lt("More than three thousand", sc); p = ease(min(1, max(0, t - k - 0.3) / 2.0))
    big(d, 290, f"{int(3000 * p):,}", ramp(t, k, k + 0.3), GOLD, 210)
    tag(d, (W / 2, 610), "INSIDE THE KING'S HALL  ·  'KEEP STANLEY MATTHEWS'", ramp(t, k + 1.0, k + 1.4), CREAM, 40)
    o = lt("Another thousand stood", sc)
    tag(d, (W / 2, 740), "+ ABOUT 1,000 OUTSIDE IN THE STREETS", ramp(t, o + 0.3, o + 0.7), GOLD, 40)

# ---------------------------------------------------------------- IV. Berlin
def salute(d, L, t, sc):
    k = lt("Before kick-off", sc)
    tracked(d, (W / 2, 220), "BERLIN  ·  14 MAY 1938", cond(46, 8), rgba(GOLD, ramp(t, 0, 0.4)), 10, "center")
    tag(d, (W / 2, 380), "ORDERED TO GIVE THE NAZI SALUTE", ramp(t, k + 0.5, k + 0.9), CREAM, 50)
    l = lt("Matthews later wrote", sc)
    text_top(d, (W / 2, 520), "“All the team were livid.”", pf(92, 700), rgba(CREAM, ramp(t, l + 1.0, l + 1.4)), "center")
    tracked(d, (W / 2, 680), "STANLEY MATTHEWS, IN HIS MEMOIRS", cond(30, 6), rgba(GOLD, ramp(t, l + 1.4, l + 1.8)), 6, "center")

# ---------------------------------------------------------------- V. too old at 32
def habits(d, L, t, sc):
    rows = [("He never smoked.", "NEVER SMOKED"), ("He hardly drank.", "HARDLY DRANK"), ("He ate an almost vegetarian", "ALMOST VEGETARIAN"),
            ("He ate an almost vegetarian", "FASTED ONE DAY A WEEK")]
    tracked(d, (W / 2, 180), "THE MATTHEWS RULES", cond(46, 8), rgba(GOLD, ramp(t, 0, 0.4)), 10, "center")
    for i, (snip, txt) in enumerate(rows):
        k = lt(snip, sc, 2.4 if i == 3 else 0.2); a = ramp(t, k, k + 0.3)
        if a <= 0: continue
        y = 300 + i * 150
        d.rounded_rectangle((W / 2 - 520, y, W / 2 + 520, y + 110), 14, fill=rgba(NAVY_D, 0.9 * a), outline=rgba(CREAM, 0.5 * a), width=3)
        d.line((W / 2 - 470, y + 55, W / 2 - 445, y + 80, W / 2 - 405, y + 30), fill=rgba(GOLD, a), width=8)
        tracked(d, (W / 2 - 360, y + 32), txt, cond(50, 8), rgba(CREAM, a), 8)

def sold(d, L, t, sc):
    k = lt("In 1947, Stoke sold him", sc)
    tracked(d, (W / 2, 230), "MAY 1947", cond(46, 8), rgba(GOLD, ramp(t, 0, 0.4)), 10, "center")
    tag(d, (W / 2, 380), "STOKE CITY  →  BLACKPOOL", ramp(t, k + 0.6, k + 1.0), CREAM, 54)
    big(d, 470, "£11,500", ramp(t, k + 2.0, k + 2.3), GOLD, 190)
    a2 = lt("He was thirty-two.", sc)
    place_stamp(L, W / 2, 860, ramp(t, a2, a2 + 0.25), text="AGED 32", size=120, color=RED, rot=-6)

# ---------------------------------------------------------------- VI. finals he couldn't win
def fwa(d, L, t, sc):
    tracked(d, (W / 2, 260), "FOOTBALL WRITERS' ASSOCIATION  ·  1948", cond(42, 8), rgba(GOLD, ramp(t, 0, 0.4)), 8, "center")
    big(d, 340, "Footballer of the Year", ramp(t, 0.4, 0.8), CREAM, 110)
    k = lt("Stanley Matthews.", sc)
    tag(d, (W / 2, 620), "THE FIRST WINNER  ·  STANLEY MATTHEWS", ramp(t, k, k + 0.3), GOLD, 50)

# ---------------------------------------------------------------- VII. the Matthews Final
FINAL53 = [(0, 0, 0), (("After seventy-five seconds", 2.2), 0, 1), (("Blackpool's Stan Mortensen equalised", 1.0), 1, 1), (("But Bolton scored again", 0.5), 1, 2),
           (("Ten minutes into the second half", 2.6), 1, 3)]
SC53 = [(("After seventy-five seconds", 2.2), "LOFTHOUSE 2'"), (("Blackpool's Stan Mortensen equalised", 1.0), "MORTENSEN 35'"),
        (("But Bolton scored again", 0.5), "MOIR 39'"), (("Ten minutes into the second half", 2.6), "BELL 55'")]

def clock(d, L, t, sc):
    """The minutes go: 80, 85, 88, 89 ... a big match clock."""
    marks = [("Eighty.", "80'"), ("Eighty-five.", "85'"), ("Eighty-eight.", "88'"), ("In the eighty-ninth minute", "89'")]
    cur = [m for s, m in marks if t >= lt(s, sc, -0.1)]
    txt = cur[-1] if cur else "68'"
    k = max([lt(s, sc, -0.1) for s, _ in marks if t >= lt(s, sc, -0.1)] or [0])
    s = 1 + 0.25 * (1 - ease(min(1, max(0, t - k) / 0.25)))
    big(d, 270 - 30 * (s - 1), txt, ramp(t, 0, 0.3), GOLD, int(260 * s))
    tag(d, (W / 2, 650), "BLACKPOOL 2–3 BOLTON", ramp(t, 0.2, 0.6), CREAM, 50)

def tv(d, L, t, sc):
    k = lt("So millions of people", sc)
    tag(d, (W / 2, 900), "THE FIRST CUP FINAL MOST OF BRITAIN WATCHED LIVE", ramp(t, k + 0.6, k + 1.0), GOLD, 40)

# ---------------------------------------------------------------- VIII. forty-one
def ballon(d, L, t, sc):
    k = lt("They called it the Ballon d'Or", sc)
    tracked(d, (W / 2, 130), "BALLON D'OR  ·  1956  ·  THE FIRST ONE", cond(44, 8), rgba(GOLD, ramp(t, k, k + 0.4)), 8, "center")
    w = lt("Stanley Matthews.", sc) if False else S_nth("Stanley Matthews.", 1) - sc.start
    big(d, 800, "Stanley Matthews", ramp(t, w, w + 0.3), CREAM, 110)
    f = S_nth("He was forty-one.", 1) - sc.start
    place_stamp(L, 1540, 560, ramp(t, f, f + 0.25), text="AGED 41", size=110, color=GOLD, rot=-8)

def oldest(d, L, t, sc):
    tracked(d, (W / 2, 220), "LAST ENGLAND GAME  ·  MAY 1957", cond(44, 8), rgba(GOLD, ramp(t, 0, 0.4)), 10, "center")
    k = lt("He was forty-two years", sc)
    big(d, 320, "42 years, 104 days", ramp(t, k + 0.2, k + 0.6), CREAM, 130)
    s = lt("He's still the oldest man ever to play for England", sc)
    place_stamp(L, W / 2, 760, ramp(t, s + 0.2, s + 0.45), text="OLDEST ENGLAND PLAYER EVER", size=80, color=GOLD, rot=-5)

# ---------------------------------------------------------------- IX. coming home
def crowd_count(d, L, t, sc):
    k = lt("For his first game back", sc); p = ease(min(1, max(0, t - k - 1.0) / 2.6))
    tracked(d, (W / 2, 210), "STOKE CITY v HUDDERSFIELD  ·  OCTOBER 1961", cond(40, 8), rgba(GOLD, ramp(t, k, k + 0.4)), 8, "center")
    big(d, 300, f"{int(35974 * p):,}", ramp(t, k + 0.8, k + 1.1), CREAM, 210)
    m = lt("More than three times", sc)
    tag(d, (W / 2, 640), "THE GAME BEFORE: ABOUT 8,400", ramp(t, m + 0.2, m + 0.6), GOLD, 44)

def promoted(d, L, t, sc):
    tracked(d, (W / 2, 230), "SECOND DIVISION  ·  1962–63", cond(44, 8), rgba(GOLD, ramp(t, 0, 0.4)), 10, "center")
    place_stamp(L, W / 2, 440, ramp(t, 0.5, 0.75), text="CHAMPIONS", size=150, color=GOLD, rot=-6)
    k = lt("In the last home game", sc)
    tag(d, (W / 2, 680), "THE GOAL THAT SEALED IT v LUTON  ·  MATTHEWS", ramp(t, k + 0.8, k + 1.2), CREAM, 42)
    f = lt("He was forty-eight.", sc)
    tag(d, (W / 2, 800), "AGED 48", ramp(t, f, f + 0.3), GOLD, 52)
    v = lt("The football writers voted him", sc)
    tag(d, (W / 2, 920), "FOOTBALLER OF THE YEAR, AGAIN  ·  15 YEARS LATER", ramp(t, v + 0.5, v + 0.9), GOLD, 38)

# ---------------------------------------------------------------- X. fifty
def knight(d, L, t, sc):
    tracked(d, (W / 2, 230), "1 JANUARY 1965", cond(46, 8), rgba(GOLD, ramp(t, 0, 0.4)), 10, "center")
    big(d, 300, "Sir Stanley Matthews", ramp(t, 0.5, 0.9), CREAM, 120)
    k = lt("No footballer had ever been knighted", sc)
    tag(d, (W / 2, 560), "THE ONLY PLAYER EVER KNIGHTED WHILE STILL PLAYING", ramp(t, k + 0.4, k + 0.8), GOLD, 40)

def last_game(d, L, t, sc):
    tracked(d, (W / 2, 230), "LAST FIRST DIVISION GAME  ·  6 FEBRUARY 1965", cond(42, 8), rgba(GOLD, ramp(t, 0, 0.4)), 8, "center")
    big(d, 300, "50 years, 5 days", ramp(t, 0.4, 0.8), CREAM, 130)
    k = lt("He's still the oldest man ever to play in England's top flight", sc)
    place_stamp(L, W / 2, 740, ramp(t, k + 0.3, k + 0.55), text="OLDEST TOP-FLIGHT PLAYER EVER", size=76, color=GOLD, rot=-5)

def world_xi(d, L, t, sc):
    k = lt("The opposition was a World Eleven", sc)
    tracked(d, (W / 2, 150), "FAREWELL MATCH  ·  STOKE  ·  28 APRIL 1965", cond(42, 8), rgba(GOLD, ramp(t, 0, 0.4)), 8, "center")
    names = [("Lev Yashin", "Lev Yashin in goal"), ("Ferenc Puskás", "Ferenc Puskás"), ("Alfredo Di Stéfano", "Alfredo Di Stéfano"), ("Eusébio", "Eusébio")]
    tag(d, (W / 2, 280), "THE WORLD XI", ramp(t, k + 0.3, k + 0.7), CREAM, 54)
    for i, (nm, _) in enumerate(names):
        b = ramp(t, k + 2.0 + i * 1.3, k + 2.3 + i * 1.3)
        if b > 0: text_top(d, (W / 2, 400 + i * 120), nm, pf(84, 800), rgba(GOLD if i else CREAM, b), "center")

def never(d, L, t, sc):
    tracked(d, (W / 2, 260), "33 YEARS OF PROFESSIONAL FOOTBALL", cond(46, 8), rgba(GOLD, ramp(t, 0, 0.4)), 10, "center")
    tag(d, (W / 2, 450), "SENT OFF: NEVER", ramp(t, 1.4, 1.8), CREAM, 70)
    k = lt("Most accounts say", sc)
    tag(d, (W / 2, 620), "BOOKED: NEVER, MOST ACCOUNTS SAY", ramp(t, k + 0.6, k + 1.0), GOLD, 50)

# ---------------------------------------------------------------- epilogue, what if, end
def stans_men(d, L, t, sc):
    k = lt("They called themselves Stan's Men", sc)
    tag(d, (W / 2, 880), "SOWETO  ·  1975  ·  \"STAN'S MEN\"", ramp(t, k, k + 0.4), GOLD, 46)

def pele(d, L, t, sc):
    a = ramp(t, 0.3, 0.8)
    text_top(d, (W / 2, 330), "“The man who taught us the way", pf(84, 700), rgba(CREAM, a), "center")
    text_top(d, (W / 2, 450), "football should be played.”", pf(84, 700), rgba(CREAM, ramp(t, 0.8, 1.3)), "center")
    tracked(d, (W / 2, 640), "PELÉ ON SIR STANLEY MATTHEWS  ·  1915–2000", cond(34, 6), rgba(GOLD, ramp(t, 1.4, 1.8)), 6, "center")

def what_if_card(d, L, t, sc):
    tracked(d, (W / 2, 220), "WHAT DO YOU THINK?", cond(40, 8), rgba(GOLD, ramp(t, 0, 0.5)), 8, "center")
    k = lt("Could anyone today", sc)
    text_top(d, (W / 2, 340), "Could anyone play top-flight", pf(84, 700), rgba(CREAM, ramp(t, k, k + 0.5)), "center")
    text_top(d, (W / 2, 450), "football at fifty?", pf(110, 900), rgba(GOLD, ramp(t, k + 0.4, k + 0.9)), "center")
    o = lt("And who's the oldest player", sc)
    tag(d, (W / 2, 660), "THE OLDEST PLAYER YOU'VE SEEN WHO WAS STILL THE BEST ON THE PITCH?", ramp(t, o + 0.5, o + 0.9), CREAM, 34)
    c = lt("Tell us in the comments", sc)
    place_stamp(L, W / 2, 850, ramp(t, c, c + 0.25), text="TELL US BELOW", size=100, color=GOLD, rot=-5)

FB_IMP = [("Istanbul.", "3–0 DOWN AT HALF-TIME"), ("Leicester.", "5000–1")]
def end_card(d, L, t, sc):
    """IMPOSSIBLE end card for Omnira Football: the mark, the football episodes, subscribe on 'subscribe'."""
    a, b = ramp(t, 0.1, 0.5), ramp(t, 0.6, 1.0)
    if a > 0:
        mk = impossible_mark(130, strike=b, dim=ramp(t, 1.0, 1.4))
        mk = Image.fromarray((np.asarray(mk) * np.array([1, 1, 1, a])).astype(np.uint8))
        L.alpha_composite(mk, (int(W / 2 - mk.width / 2), int(200 - mk.height / 2)))
    tracked(d, (W / 2, 350), "THE DAYS THE ODDS GOT IT WRONG  ·  ON OMNIRA FOOTBALL", cond(30), rgba(GOLD, ramp(t, 1.2, 1.7)), 6, "center")
    tracked(d, (W / 2, 470), "MORE ON IMPOSSIBLE", cond(30), rgba(CREAM, ramp(t, 2.0, 2.5)), 8, "center")
    for i, (a_, b_) in enumerate(FB_IMP):
        al = ramp(t, 2.4 + 0.4 * i, 2.9 + 0.4 * i); x = W / 2 + (i - 0.5) * 600; y = 540
        if al <= 0: continue
        d.rectangle((x - 270, y, x + 270, y + 190), fill=rgba(NAVY_D, 0.9 * al), outline=rgba(GOLD, al), width=3)
        d.rectangle((x - 270, y, x + 270, y + 8), fill=rgba(RED, al))
        text_top(d, (x, y + 52), a_, pf(54, 700), rgba(CREAM, al), "center")
        tracked(d, (x, y + 132), b_, cond(24), rgba(GOLD, al), 4, "center")
    s_ = ramp(t, atf("If you love the stories", 0.75, sc), atf("If you love the stories", 0.75, sc) + 0.4)
    if s_ > 0:
        d.rounded_rectangle((W / 2 - 220, 830, W / 2 + 220, 920), 14, fill=rgba(RED, s_))
        tracked(d, (W / 2, 858), "SUBSCRIBE", cond(44, 3), rgba(CREAM, s_), 8, "center")

def CHC(n, s): return CH(n, s)

# ---------------------------------------------------------------- the video
scenes = [
    opening(AI + BOOTS + ".png", "Stanley Matthews.", "THE MAN WHO REFUSED TO GET OLD", credit="AI reconstruction", focus=((0.5, 0.45), (0.55, 0.5))),
    # cold open
    VR("On the sixth of February 1965", MUD50, end=3.0),
    AR("On the sixth of February 1965", BOOTS, start=S("On the sixth of February 1965", 3.2), zoom=(1.0, 1.12), focus=((0.5, 0.5), (0.45, 0.55))),
    CuS("He was fifty years old.", fifty, off=0.0, bg=bga(BOOTS, 0.88)),
    PS("His name was Stanley Matthews.", GRIN57, zoom=(1.0, 1.12), focus=((0.5, 0.4), (0.5, 0.35)), strap=("Stanley Matthews", "1915–2000", 0.4)),
    PS("Pelé said he was the man", MATCH57A, zoom=(1.0, 1.12), focus=((0.5, 0.5), (0.55, 0.5))),
    CuS("He played through a world war", resume, bg=bgp(AUTOGRAPHS, 0.88)),
    PS("This is the story of the man", STOKE62, zoom=(1.0, 1.12), focus=((0.55, 0.45), (0.6, 0.4))),
    # I. the barber's son
    VR("Stanley Matthews was born", POTTERIES, chapter=CHC("I", "THE BARBER'S SON")),
    FC("This was the Potteries.", KILNS, "Hanley, Stoke-on-Trent", "BORN 1 FEBRUARY 1915", focus=(0.5, 0.45),
       facts=[(0.6, "One of the six towns of the Potteries"), (("Hundreds of bottle-shaped kilns", 3.0), "The kilns fired the country's plates and cups", True)]),
    VR("His father, Jack, ran a barber's shop", BARBER),
    AA("He was strict, he was fit", BARBER, zoom=(1.08, 1.2), focus=((0.6, 0.45), (0.65, 0.4)), texts=[(0.4, "“The Fighting Barber of Hanley”", "mid")]),
    PS("But Stanley's passion wasn't boxing", DERBY1920, zoom=(1.0, 1.12), strap=("Stoke v Port Vale", "THE POTTERIES DERBY  ·  1920", 0.5)),
    AA("He'd dribble a ball through the streets", POTTERIES, zoom=(1.15, 1.3), focus=((0.4, 0.65), (0.55, 0.65))),
    FC("On his fifteenth birthday", WILLS, "Stanley Matthews", "STOKE CITY", focus=(0.5, 0.35),
       facts=[(0.5, "Office boy at 15: £1 a week"), (("On his seventeenth birthday", 0.3), "Professional at 17"), (("Seven weeks later", 0.5), "Debut at Bury, March 1932")]),
    CuS("Even as a teenager", wage, off=-0.3, bg=bgp(WILLS, 0.9)),
    # II. how he beat you
    PS("So what made Matthews different?", MATCH57B, zoom=(1.0, 1.12), chapter=CHC("II", "HOW HE BEAT YOU")),
    VR("He played outside right", WINGER, recon=True),
    CuS("Here's how.", dribble, off=-0.3),
    PS("Full-backs knew exactly", SPARTA57, zoom=(1.0, 1.12)),
    CuS("That's why they called him", wizard, bg=bgp(MATCH57A, 0.88)),
    # III. the town that wouldn't let him go
    FC("By his early twenties", WILLS, "Stanley Matthews", "ENGLAND", focus=(0.5, 0.35), chapter=CHC("III", "THE TOWN THAT WOULDN'T LET HIM GO"),
       facts=[(("He won his first cap in 1934", 0.2), "First England cap: 1934"), (("He won his first cap in 1934", 3.5), "Scored in his second game, v Wales", True)]),
    Custom(S("But at Stoke, things weren't going", -0.15), headline, bg=lambda t: dim_bg(AI + PAPER, 0.05)),
    VR("More than three thousand people", HALL, recon=True),
    CuS("Another thousand stood", hall_count, off=-2.0, bg=bga(HALL, 0.88)),
    AA("The local pottery owners joined in", POTTERIES, zoom=(1.0, 1.15), focus=((0.6, 0.5), (0.5, 0.5)), texts=[(1.6, "Factory output dropped, the owners said.", "mid")]),
    PS("Stoke turned the request down", STATUE_HANLEY, zoom=(1.0, 1.12), strap=("Hanley town centre", "HIS STATUE TODAY", 0.5)),
    AR("He was twenty-three, and a whole", HALL, zoom=(1.12, 1.25), focus=((0.5, 0.4), (0.5, 0.35))),
    # IV. Berlin
    VR("Three months later, Matthews was in Berlin", BERLIN, recon=True, chapter=CHC("IV", "BERLIN")),
    CuS("Before kick-off, the England players", salute, bg=bga(BERLIN, 0.88)),
    AR("Then an order came", BERLIN, zoom=(1.15, 1.35), focus=((0.5, 0.55), (0.5, 0.6)), texts=[(0.8, "The order: from the British ambassador, backed by the FA.", "mid")]),
    Custom(S("Then they went out and won", -0.15), scoreboard("BERLIN  ·  14 MAY 1938", [(0, 0, 0), (0.4, 3, 6)], "GERMANY", "ENGLAND", GER, ENG_W,
           sub=("MATTHEWS SCORED ONE OF THE SIX", ("Matthews scored one of the six", 0.2))), bg=bga(BERLIN, 0.88)),
    AA("Fifteen months later, the war began.", MUD50, zoom=(1.0, 1.1), grade=True, dim=0.35),
    # V. too old at thirty-two
    FC("The war took six years", AUTOGRAPHS, "Corporal Matthews", "RAF  ·  1939–45", focus=(0.45, 0.35), chapter=CHC("V", "TOO OLD AT 32"),
       facts=[(("Matthews joined the RAF", 0.4), "Based near Blackpool"), (("He played whenever he could", 2.5), "29 games for England"),
              (("None of them counted", 0.0), "Wartime games: no caps", True)]),
    PS("When peace came, he was thirty", MATCH57B, zoom=(1.1, 1.22), focus=((0.5, 0.5), (0.55, 0.45)), texts=[(2.4, "Most wingers were finished at 32.", "mid")]),
    CuS("He never smoked.", habits, off=-1.0, bg=bga(BEACH, 0.9)),
    VR("He was up at dawn", BEACH, recon=True),
    AR("Team-mates thought he was eccentric", BEACH, zoom=(1.15, 1.3), focus=((0.45, 0.6), (0.5, 0.6)), texts=[(0.4, "Sports science, before it had a name.", "mid")]),
    CuS("In 1947, Stoke sold him", sold, bg=bgp(BLOOMFIELD, 0.86)),
    PS("Plenty of people in Stoke thought", BLOOMFIELD, zoom=(1.0, 1.12), strap=("Bloomfield Road, Blackpool", "THE STANLEY MATTHEWS STAND TODAY", 0.5)),
    # VI. the final he couldn't win
    VR("At Blackpool, he got to the FA Cup final", TOWERS, chapter=CHC("VI", "THE FINAL HE COULDN'T WIN")),
    Custom(S("In 1948, they lost it", -0.15), scoreboard("FA CUP FINAL  ·  WEMBLEY  ·  1948", [(0, 0, 0), (0.5, 2, 4)], "BLACKPOOL", "MAN UNITED", TANGERINE, MANU), bg=bgp(WEMBLEY56, 0.86)),
    CuS("That same year, the football writers", fwa, bg=bgp(GRIN57, 0.86)),
    PS("In 1950, England went to their first World Cup", MATCH57B, zoom=(1.2, 1.35), focus=((0.6, 0.5), (0.55, 0.5)), texts=[(1.2, "World Cup, Brazil, 1950.", "mid")]),
    Custom(S("So he was sitting with the reserves", -0.15), scoreboard("WORLD CUP  ·  BRAZIL  ·  1950", [(0, 0, 0), (2.0, 0, 1)], "ENGLAND", "USA", ENG_W, USA,
           sub=("MATTHEWS: LEFT OUT, WATCHING", ("So he was sitting with the reserves", 0.3))), bg=bga(TOWERS, 0.9)),
    Custom(S("In 1951, Blackpool reached", -0.15), scoreboard("FA CUP FINAL  ·  WEMBLEY  ·  1951", [(0, 0, 0), (("In 1951, Blackpool reached", 3.5), 0, 2)], "BLACKPOOL", "NEWCASTLE", TANGERINE, NEWC,
           sub=("MATTHEWS: 36  ·  TWO FINALS LOST", ("Matthews was thirty-six.", 0.0))), bg=bgp(WEMBLEY56, 0.88)),
    PS("The FA Cup was the one trophy", WEMBLEY56, zoom=(1.0, 1.15), focus=((0.5, 0.55), (0.5, 0.6))),
    # VII. the Matthews Final
    AA("Two years later, Blackpool reached", TOWERS, zoom=(1.0, 1.12), chapter=CHC("VII", "THE MATTHEWS FINAL"), strap=("Wembley", "SATURDAY 2 MAY 1953", 3.0)),
    VR("One hundred thousand people inside.", CROWD53, recon=True),
    AA("That spring, families all over Britain", ROOM, zoom=(1.0, 1.1), focus=((0.45, 0.5), (0.5, 0.5))),
    VR("So millions of people were about to watch", ROOM),
    PS("What they saw first was a disaster.", LOFT_STATUE, zoom=(1.0, 1.12), focus=((0.5, 0.35), (0.5, 0.3)), strap=("Nat Lofthouse", "BOLTON'S CENTRE-FORWARD", 3.4)),
    Custom(S("One–nil.", -0.3), scoreboard("FA CUP FINAL  ·  2 MAY 1953", [(0, 0, 1)] + FINAL53[2:], "BLACKPOOL", "BOLTON", TANGERINE, BOLTON_W, scorers=SC53,
           sub=("BELL SCORED ON A TORN HAMSTRING", ("And he scored it while playing", 0.3))), bg=bga(CROWD53, 0.88)),
    PS("Matthews was thirty-eight.", MATCH57A, zoom=(1.15, 1.3), focus=((0.5, 0.5), (0.5, 0.45)), texts=[(2.0, "Two finals lost already.", "mid")]),
    VR("So Blackpool did the only thing left", WINGER, recon=True),
    PS("Walk up.", SPARTA57, zoom=(1.05, 1.2), focus=((0.45, 0.5), (0.55, 0.5))),
    Custom(S("With twenty-two minutes left", -0.15), scoreboard("68 MINUTES", [(0, 2, 3), (("With twenty-two minutes left", 2.6), 2, 3)], "BLACKPOOL", "BOLTON", TANGERINE, BOLTON_W,
           scorers=[(("With twenty-two minutes left", 2.6), "MORTENSEN 68'")]) if False else
           scoreboard("68 MINUTES", [(0, 1, 3), (("With twenty-two minutes left", 2.6), 2, 3)], "BLACKPOOL", "BOLTON", TANGERINE, BOLTON_W,
           scorers=[(("With twenty-two minutes left", 2.6), "MORTENSEN 68'")]), bg=bga(CROWD53, 0.88)),
    CuS("The minutes went.", clock, bg=bga(CROWD53, 0.9)),
    # the free-kick: set-up still, then the ball in the top corner, then the crowd
    # the goals (Mike 22 Oct): real-look AI video up to the strike, then the hologram finish (free model)
    VR("In the eighty-ninth minute", "G_freekick", recon=True, min_rate=1.0, max_rate=1.0),
    Custom(S("Three–three.", -0.15), scoreboard("89 MINUTES", [(0, 2, 3), (0.2, 3, 3)], "BLACKPOOL", "BOLTON", TANGERINE, BOLTON_W,
           scorers=[(0.2, "MORTENSEN 89'")], sub=("HIS HAT-TRICK", ("It completed his hat-trick", 0.2))), bg=bga(CROWD53, 0.88)),
    PS("It's still the only hat-trick", MORTY_STATUE, zoom=(1.0, 1.12), focus=((0.5, 0.35), (0.5, 0.3)), strap=("Stan Mortensen", "THE ONLY CUP FINAL HAT-TRICK AT THE OLD WEMBLEY", 0.6)),
    # the winner: the pull-back (AI clip, clean first 2.9 s), the ball in the net, the front room, the mob
    AR("And then, in stoppage time", WINGER, zoom=(1.0, 1.12), focus=((0.5, 0.55), (0.6, 0.55))),
    VR("And he pulled the ball back", "G_winner", recon=True, min_rate=1.0, max_rate=1.0),
    Custom(S("Four–three.", -0.15), scoreboard("90+2 MINUTES", [(0, 3, 3), (0.2, 4, 3)], "BLACKPOOL", "BOLTON", TANGERINE, BOLTON_W,
           scorers=[(0.2, "PERRY 90+2'")], sub=("WEMBLEY WENT MAD", ("Wembley went mad.", 0.0))), bg=bga(ERUPTS, 0.8)),
    VR("In front rooms all over the country", ROOM_CHEER),
    AR("Mortensen had scored three.", W_MOB, zoom=(1.0, 1.1), focus=((0.5, 0.45), (0.5, 0.4))),
    PS("But from that day to this", GRIN57, zoom=(1.0, 1.12), texts=[(1.6, "The Matthews Final", "big")]),
    # VIII. forty-one
    PS("Six months later, he was back at Wembley", MURAL, zoom=(1.0, 1.12), chapter=CHC("VIII", "FORTY-ONE"), strap=("England 3–6 Hungary", "WEMBLEY  ·  25 NOVEMBER 1953", 0.6)),
    Custom(S("They won six–three.", -0.15), scoreboard("WEMBLEY  ·  25 NOVEMBER 1953", [(0, 0, 0), (0.4, 3, 6)], "ENGLAND", "HUNGARY", ENG_W, HUN,
           sub=("MATTHEWS AND MORTENSEN BOTH PLAYED", ("Matthews and Mortensen both played", 0.2))), bg=bgp(MURAL, 0.88)),
    PS("But Matthews kept going.", MATCH57B, zoom=(1.1, 1.25), focus=((0.55, 0.5), (0.6, 0.5))),
    Custom(S("In 1956, a French football magazine", -0.15), ballon, bg=lambda t: dim_bg(C + BALLON, 0.55)),
    PS("No player that age has won it since", AUTOGRAPHS, zoom=(1.0, 1.12)),
    CuS("He played his last game for England", oldest, bg=bgp(GRIN57, 0.88)),
    # IX. coming home
    PS("In 1961, he was forty-six.", SPARTA57, zoom=(1.0, 1.12), chapter=CHC("IX", "COMING HOME")),
    VR("Stoke City were near the bottom", QUEUE61, recon=True),
    CuS("For his first game back", crowd_count, bg=bga(QUEUE61, 0.88)),
    PS("Two seasons later, Stoke were champions", STOKE62, zoom=(1.0, 1.15), focus=((0.55, 0.45), (0.6, 0.4)), strap=("Stoke City", "BACK IN THE STRIPES  ·  1962", 0.5)),
    CuS("In the last home game", promoted, off=-1.0, bg=bgp(STOKE62C, 0.88)),
    # X. fifty
    Custom(S("On New Year's Day 1965", -0.15), knight, bg=bgp(STOKE62C, 0.86), chapter=CHC("X", "FIFTY")),
    VR("Five weeks later, on the sixth of February", DRESSING70),
    Custom(SF("Five weeks later, on the sixth of February", 0.5), last_game, bg=bga(DRESSING70, 0.88)),
    VR("But Stoke weren't letting him go quietly", FLOOD65, recon=True),
    CuS("The opposition was a World Eleven", world_xi, bg=bga(FLOOD65, 0.88)),
    AR("At the end, they carried him off", FLOOD65, zoom=(1.12, 1.25), focus=((0.6, 0.6), (0.6, 0.55))),
    CuS("In thirty-three years", never, bg=bgp(STOKE62C, 0.88)),
    # epilogue
    PS("He didn't stop.", AUTOGRAPHS, zoom=(1.0, 1.12), chapter=CHC("", "STAN'S MEN").lstrip(" ·")),
    VR("In 1975, in apartheid South Africa", TOWNSHIP, recon=True),
    CuS("They called themselves Stan's Men", stans_men, bg=bga(TOWNSHIP, 0.6)),
    PS("He kept fit into his seventies", STATUES_STOKE, zoom=(1.0, 1.12), strap=("Stoke City's ground", "THE MATTHEWS STATUES", 0.5)),
    VR("On the day of his funeral", STOKE2000, recon=True),
    CuS("the man who taught us", pele, bg=bgp(GRIN57, 0.88)),
    AR("And the boy who beat lamp-posts", POTTERIES, zoom=(1.0, 1.15), focus=((0.5, 0.6), (0.45, 0.6))),
    # what if
    PS("So here's the question.", STOKE62C, zoom=(1.0, 1.12), chapter="WHAT IF", texts=[(S("And still, almost nobody") - S("So here's the question.", -0.15), "Almost nobody plays at the top past 40.", "mid")]),
    CuS("Could anyone today", what_if_card, bg=bgp(STATUES_STOKE, 0.86)),
    CuS("This was IMPOSSIBLE, on Omnira Football", end_card, bg=bga(CROWD53, 0.86)),
]
scenes = [s for s in scenes if s is not None]
# sound under the two goals (library/sfx): kick on the strike, the roar as it goes in
EFFECTS = [(S("In the eighty-ninth minute", -0.15 + 3.6), SFX + "football_kick_thud.wav", -6), (S("In the eighty-ninth minute", -0.15 + 5.6), SFX + "crowd_cheer_huge.wav", -14),
           (S("And he pulled the ball back", -0.15 + 4.6), SFX + "football_kick_thud.wav", -6), (S("And he pulled the ball back", -0.15 + 5.9), SFX + "crowd_cheer_huge.wav", -12)]

if __name__ == "__main__":
    if sys.argv[1:] == ["check"]: print(shot_check(scenes, OUT.replace("video/", "sheets/") + "check.jpg"))
    else: main(scenes, FINAL, effects=EFFECTS)
