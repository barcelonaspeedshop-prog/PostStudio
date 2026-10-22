"""IMPOSSIBLE 04: Leicester City, 5000-1 -> PostDrive/Stories/IMPOSSIBLE series/04 Leicester/video/IMPOSSIBLE 04 - Leicester.mp4

    ~/.venvs/poststudio/bin/python build.py            # full render (+ review 720p)
    ~/.venvs/poststudio/bin/python build.py 95 125     # preview slice (video seconds)
    ~/.venvs/poststudio/bin/python build.py check      # shot check: every picture, its time, the words said over it

script_v2.md (approved by Mike 21 Oct, "script is perfect"), AI narration (Kirk) in audio/v2/. Pictures follow the narration
line by line (PLAYBOOK 21 Oct); the two fun cartoons (Elvis, the pizza Vespa) were Mike's idea.
"""
import math, os, sys
VDIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(VDIR, "..", "..", "..", "studio"))
import episode as E
E.init("/Volumes/PostDrive/Omnira Football/Videos/Leicester (IMPOSSIBLE)/", series="impossible", narration="audio/v2/")
from episode import *
from factcard import FactCard
E.AI_RATE = 0.6                                                               # AI clips at 60% speed (Mike 20 Oct)

FINAL = "IMPOSSIBLE 04 - Leicester v6.mp4"
LCFC, LCFC_D = (0, 83, 160), (0, 50, 110)                 # Leicester royal blue
SPURS, CHELSEA, CITY = (245, 245, 240), (3, 70, 148), (108, 171, 221)
KEEPER = (240, 200, 60)
RED_T = (200, 40, 50)                                     # the opposition in the pitch diagrams

def cm(f): return f.replace(" ", "_")
# photos (Wikimedia Commons)
CHELSEA_LINEUP = cm("2016-17 Premier League - Chelsea v Swansea City.jpg")
WALL = cm("Albrighton, Vardy, Drinkwater & Chilwell.jpg")
HAZARD = cm("Chelsea FC vs Paris Saint-Germain, 9 March 2016 (25641807866).jpg")
ETIHAD = cm("City of Manchester Stadium 2023 cropped.jpg")
RANIERI_SUIT, RANIERI_INTER = "Claudio_Ranieri.jpg", "Claudio_Ranieri_Inter.jpg"
RANIERI_ARSENAL, RANIERI_WATCH = cm("Claudio Ranieri appeals for a decision (25027423845).jpg"), cm("Claudio Ranieri watches on (24731897220).jpg")
LINEKER, VARDY, VARDY_FAMILY = cm("Gary Lineker (cropped).jpg"), cm("Jamie Vardy 08 sierpnia 2015.jpg"), cm("Jamie Vardy and family after victory versus Everton at the King Power Stadium. (26831224691).jpg")
JUVE = cm("Juventus v Chievo, 5 April 2009 - Ranieri and Trezeguet.jpg")
KANTE = cm("Kante Leicester City v Southampton.jpg")
KASPER, PETER = cm("Kasper Schmeichel 2016.jpg"), cm("Peter Schmeichel juli 1991.JPG")
KP_IN, KP_WIDE = cm("King Power Stadium.JPG"), cm("King Power Stadium wide view.jpg")
LIFT, CELEBRATE = cm("LCFC lift the Premier League Trophy (26943755296).jpg"), cm("LCFC players celebrate after victory vs Everton (27859481336).jpg")
SOTON = cm("Leicester City FC - Southampton FC 03-Apr-2016, King Power Stadium 02.jpg")
CLOCK, MAHREZ_FK, MAHREZ = cm("Leicester Clock Tower wide view.jpg"), cm("Mahrez free kick 1 (16476351346).jpg"), "Riyad_Mahrez.jpg"
SPURS_PIC, PEARSON, BRIDGE = cm("Manchester United v Tottenham Hotspur, December 2016 (12).JPG"), "Nigel_Pearson.jpg", cm("Stamford Bridge Chelsea v Spurs.jpg")
# AI stills (Runway)
BOOKIE, ELVIS, PIZZA, BELL = "ai_bookmaker.png", "ai_elvis.png", "ai_pizza_vespa.png", "ai_training_bell.png"
HOUSE_TENSE, HOUSE_MAD, HAZARD_AI = "ai_vardys_house_tense2.png", "ai_vardys_house.png", "ai_stamford_bridge_night.png"
TROPHY_AI, PARADE, BOCELLI, FACTORY = "ai_trophy_lift.png", "ai_parade.png", "ai_bocelli.png", "ai_vardy_factory.png"
WHISTLE, KANTE_AI, RANIERI_FANS = "ai_final_whistle.png", "ai_kante_tackle.png", "ai_ranieri_fans.png"

def T(v, sc):
    """A time inside a scene: a number (local seconds), (snippet, offset) or (snippet, offset, fraction)."""
    if isinstance(v, tuple):
        return (atf(v[0], v[2], sc) if len(v) > 2 else at(v[0], sc)) + v[1]
    return v
def lt(snip, sc, off=0.0): return at(snip, sc) + off
def S_nth(snip, n, off=0.0):
    """The n-th (0-based) sentence that is exactly `snip` ("Five thousand to one." is said twice)."""
    return vt([e for e in E.SENTS if e["text"].lower() == snip.lower()][n]["out_start"] + off)
def FC(snip, path, name, role, facts=(), off=-0.15, start=None, **kw):
    full = next((d + path for d in (C, M, AI) if os.path.exists(d + path)), path)
    fs = [((lambda sc, v=f[0]: T(v, sc)),) + tuple(f[1:]) for f in facts]
    return FactCard(S(snip, off) if start is None else start, full, name, role, facts=fs, **kw)
def AF(snip, frac, ai, **kw):
    p = AS(snip, ai, **kw); p.start = SF(snip, frac); return p
def bgp(f, amt=0.8): return bg_of(C + f, amt)
def bga(f, amt=0.8): return bg_of(AI + f, amt)
def tag(d, xy, text, a, colour=GOLD, size=40):
    if a <= 0: return
    x, y = xy; f = cond(size, 8); tw = sum(f.getlength(ch) for ch in text) + 6 * (len(text) - 1)
    bb = f.getbbox("H"); cap = bb[3] - bb[1]; pad = max(10, size * 0.32)
    d.rounded_rectangle((x - tw / 2 - 22, y - pad, x + tw / 2 + 22, y + cap + pad), 10, fill=rgba(NAVY_D, 0.86 * a), outline=rgba(colour, a), width=3)
    tracked(d, (x, y), text, f, rgba(colour, a), 6, "center")
def big(d, y, text, a, col=GOLD, size=200):
    if a > 0: text_top(d, (W / 2, y), text, pf(size, 900), rgba(col, a), "center")

# ---------------------------------------------------------------- scoreboard (from Istanbul)
def score_at(events, t):
    cur, hit = (events[0][1], events[0][2]), 0.0
    for te, l, r in events:
        if t >= te: cur = (l, r); hit = max(0.0, 1 - (t - te) / 0.45)
    return cur[0], cur[1], hit

def board(d, cx, cy, left, right, sl, sr, a, hit=0.0, s=1.0, lcol=CHELSEA, rcol=SPURS):
    if a <= 0: return
    sh = 26 * s * hit ** 2; cx += sh * math.sin(hit * 41); cy += sh * math.cos(hit * 37)
    d.rounded_rectangle((cx - 780 * s, cy - 125 * s, cx + 780 * s, cy + 125 * s), int(22 * s), fill=rgba(NAVY_D, 0.92 * a), outline=rgba(GOLD, a), width=max(2, int(5 * s)))
    d.rectangle((cx - 780 * s + 6, cy - 125 * s + 6, cx - 760 * s, cy + 125 * s - 6), fill=rgba(lcol, a))
    d.rectangle((cx + 760 * s, cy - 125 * s + 6, cx + 780 * s - 6, cy + 125 * s - 6), fill=rgba(rcol, a))
    for txt, x, al in ((left, cx - 270 * s, "right"), (right, cx + 270 * s, "left")):
        fs = int(76 * s)
        while fs > 30 and cond(fs, 8).getlength(txt) + 8 * s * len(txt) > 460 * s: fs -= 2   # long names shrink to fit the board
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
        for i, (te, txt) in enumerate(scorers or []):
            b = ramp(t, T(te, sc), T(te, sc) + 0.3)
            if b > 0: tracked(d, (W / 2 + (i - (len(scorers) - 1) / 2) * 460, 690 + 20 * (1 - b)), txt, cond(42, 8), rgba(CREAM, b), 6, "center")
        if sub:
            txt, s0 = sub; b = ramp(t, T(s0, sc), T(s0, sc) + 0.4)
            tracked(d, (W / 2, 880), txt, cond(52, 8), rgba(GOLD, b), 8, "center")
    return draw

# ---------------------------------------------------------------- I. 5000-1
def odds_slam(d, L, t, sc):
    """'Five thousand to one.' The number slams in and shakes."""
    a = ramp(t, 0.15, 0.3); s = 1 + 0.6 * (1 - ease(min(1, max(0, t - 0.15) / 0.25)))
    if a > 0: text_top(d, (W / 2, 330 - 60 * (s - 1)), "5000–1", pf(int(260 * s), 900), rgba(GOLD, a), "center")
    tag(d, (W / 2, 720), "LEICESTER CITY TO WIN THE PREMIER LEAGUE", ramp(t, 0.5, 0.9), CREAM, 44)
    tag(d, (W / 2, 830), "BOOKMAKERS' ODDS  ·  SUMMER 2015", ramp(t, 0.9, 1.3), GOLD, 36)

def dots(d, L, t, sc):
    """5,001 seasons: one dot each. They fill in as the count runs; one turns gold."""
    k = lt("It means the bookmakers thought", sc); p = ease(min(1, max(0, t - k - 0.3) / 3.2)); n = int(5001 * p)
    cols, x0, y0, step = 100, 160, 210, 16
    for i in range(n):
        r, c = divmod(i, cols); x = x0 + c * step; y = y0 + r * step
        d.rectangle((x, y, x + 10, y + 10), fill=rgba((90, 104, 140), 0.85))
    if p >= 1:                                                                # the one
        g = ramp(t, k + 3.6, k + 4.0); x = x0 + 37 * step; y = y0 + 31 * step
        d.rectangle((x - 3, y - 3, x + 13, y + 13), fill=rgba(GOLD, g))
        r_ = 30 + 40 * (1 - g); d.ellipse((x + 5 - r_, y + 5 - r_, x + 5 + r_, y + 5 + r_), outline=rgba(GOLD, g), width=6)
        tag(d, (x + 360, y - 120), "LEICESTER WIN IT", g, GOLD, 44)
    tag(d, (W / 2, 110), f"SEASONS PLAYED: {n:,}", ramp(t, k, k + 0.3), CREAM, 44)
    tag(d, (W / 2, 1010), "5,000 TIMES SOMEONE ELSE  ·  ONCE LEICESTER", ramp(t, k + 4.2, k + 4.6), GOLD, 38)

WAGES = [("MAN UNITED", 241, (218, 41, 28)), ("CHELSEA", 232, CHELSEA), ("MAN CITY", 198, CITY), ("ARSENAL", 195, (239, 1, 7)), ("LEICESTER", 80, LCFC)]
def wages(d, L, t, sc):
    """2015-16 wage bills (Sky Sports): the big four towering over Leicester."""
    tracked(d, (W / 2, 95), "WAGE BILLS  ·  2015–16  ·  £ MILLION", cond(44, 8), rgba(GOLD, ramp(t, 0, 0.4)), 10, "center")
    base, top = 900, 230
    for i, (club, m, col) in enumerate(WAGES):
        k = 0.3 + i * 0.35 if i < 4 else lt("Big clubs spend the most", sc, 2.2)
        g = ease(min(1, max(0, t - k) / 0.9)); a = ramp(t, k, k + 0.2)
        if a <= 0: continue
        x = 330 + i * 320; h = (base - top) * m / 241 * g
        d.rectangle((x - 110, base - h, x + 110, base), fill=rgba(col, 0.95 * a), outline=rgba(CREAM if club == "LEICESTER" else NAVY_D, a), width=3)
        text_top(d, (x, base - h - 90), f"£{int(m * g)}m", pf(64, 800), rgba(CREAM, a), "center")
        tracked(d, (x, base + 30), club, cond(40, 8), rgba(GOLD if club == "LEICESTER" else CREAM, a), 6, "center")
    b = lt("Big clubs spend the most", sc, 3.4)
    tag(d, (1590, 470), "15TH-HIGHEST", ramp(t, b, b + 0.4), GOLD, 36)
    tracked(d, (W / 2, 1035), "SOURCE: CLUB ACCOUNTS VIA SKY SPORTS  ·  LEICESTER'S FIGURE INCLUDES TITLE BONUSES", cond(24, 4), rgba(CREAM, 0.6 * ramp(t, 0.5, 1.0)), 3, "center")

# ---------------------------------------------------------------- II. the great escape
def escape(d, L, t, sc):
    """League position 2014-15: 20th from November to April, then the climb to 14th."""
    x0, x1, y0, y1 = 220, 1700, 200, 900                                      # y0 = 1st, y1 = 20th
    tracked(d, (W / 2, 110), "LEICESTER  ·  LEAGUE POSITION  ·  2014–15", cond(42, 8), rgba(GOLD, ramp(t, 0, 0.4)), 10, "center")
    for p in (1, 5, 10, 15, 20):
        y = y0 + (y1 - y0) * (p - 1) / 19; d.line((x0, y, x1, y), fill=rgba(CREAM, 0.15), width=2)
        tracked(d, (x0 - 30, y - 14), f"{p}", cond(30, 4), rgba(CREAM, 0.6), 2, "right")
    months = ["AUG", "SEP", "OCT", "NOV", "DEC", "JAN", "FEB", "MAR", "APR", "MAY"]
    for i, mth in enumerate(months): tracked(d, (x0 + i * (x1 - x0) / 9, y1 + 30), mth, cond(28, 6), rgba(CREAM, 0.7), 4, "center")
    path = [(0, 9), (0.6, 14), (1.3, 17), (2.2, 20), (4, 20), (6, 20), (7.9, 20), (8.3, 18), (8.7, 16), (9, 14)]   # month index, position
    k = lt("In 2014–15", sc); e = lt("Then they won seven", sc)
    p1 = ease(min(1, max(0, t - k) / max(0.1, e - k))); p2 = ease(min(1, max(0, t - e) / 2.6))
    pts = []
    for mi, pos in path:
        if mi <= 7.9 * p1 or (mi > 7.9 and mi <= 7.9 + 1.1 * p2): pts.append((x0 + mi * (x1 - x0) / 9, y0 + (y1 - y0) * (pos - 1) / 19))
    if len(pts) > 1: d.line(pts, fill=rgba(LCFC if p2 <= 0 else GOLD, 1), width=10, joint="curve")
    if pts: d.ellipse((pts[-1][0] - 16, pts[-1][1] - 16, pts[-1][0] + 16, pts[-1][1] + 16), fill=rgba(CREAM, 1))
    c = atf("In 2014–15", 0.75, sc)
    tag(d, (x0 + 4.0 * (x1 - x0) / 9, y1 - 90), "BOTTOM AT CHRISTMAS", ramp(t, c, c + 0.4) * (1 - ramp(t, e - 0.3, e)), RED_T, 38)
    tag(d, (x0 + 7.3 * (x1 - x0) / 9, y1 - 190), "STILL BOTTOM IN APRIL", ramp(t, lt("They were still bottom", sc), lt("They were still bottom", sc) + 0.4) * (1 - ramp(t, e - 0.3, e)), RED_T, 38)
    tag(d, (x0 + 6.2 * (x1 - x0) / 9, y0 + 330), "7 WINS IN THE LAST 9", ramp(t, e + 0.8, e + 1.2), GOLD, 44)
    g = lt("Football people called it", sc)
    tag(d, (x0 + 6.2 * (x1 - x0) / 9, y0 + 450), "THE GREAT ESCAPE  ·  14TH", ramp(t, g, g + 0.4), CREAM, 44)

# ---------------------------------------------------------------- III. the man nobody wanted
def cv(d, L, t, sc):
    """Chelsea, Juventus, Valencia... league titles: 0."""
    rows = [("Chelsea", "CHELSEA", 0.0), ("Juventus", "JUVENTUS", 0.0), ("Valencia.", "VALENCIA", 0.0)]
    tracked(d, (W / 2, 130), "CLAUDIO RANIERI  ·  BEFORE LEICESTER", cond(42, 8), rgba(GOLD, ramp(t, 0, 0.4)), 10, "center")
    k0 = lt("He'd managed Chelsea", sc)
    for i, (w, club, _) in enumerate(rows):
        k = k0 + 0.3 + i * 0.7; a = ramp(t, k, k + 0.3)
        if a <= 0: continue
        y = 260 + i * 150
        d.rounded_rectangle((420, y, 1500, y + 120), 14, fill=rgba(NAVY_D, 0.9 * a), outline=rgba(CREAM, 0.4 * a), width=3)
        tracked(d, (470, y + 34), club, cond(56, 8), rgba(CREAM, a), 8)
    n = lt("But he had never won", sc)
    for i in range(3):
        a = ramp(t, n + 0.2 * i, n + 0.2 * i + 0.3); y = 260 + i * 150
        tracked(d, (1450, y + 34), "LEAGUE TITLES: 0", cond(48, 8), rgba(RED_T, a), 6, "right")
    z = lt("Not in thirty years.", sc)
    place_stamp(L, W / 2, 850, ramp(t, z + 0.1, z + 0.35), text="0 IN 30 YEARS", size=120, rot=-6)

def greece(d, L, t, sc):
    k = lt("He'd been sacked as manager", sc)
    tracked(d, (W / 2, 250), "EURO 2016 QUALIFIER  ·  PIRAEUS  ·  NOVEMBER 2014", cond(42, 8), rgba(GOLD, ramp(t, k, k + 0.4)), 8, "center")
    sl, sr, hit = score_at([(k + 0.2, 0, 0), (k + 2.0, 0, 1)], t)
    board(d, W / 2, 500, "GREECE", "FAROE ISLANDS", sl, sr, ramp(t, k, k + 0.4), hit, 1.12, (13, 94, 175), (230, 230, 230))
    place_stamp(L, W / 2, 820, ramp(t, k + 3.0, k + 3.25), text="SACKED", size=130, rot=-7)

def tweet(d, L, t, sc):
    """Lineker's two words: "Claudio Ranieri?" ends one sentence, "Really?" is the next."""
    a = ramp(t, 0.2, 0.6)
    d.rounded_rectangle((360, 300, 1560, 760), 30, fill=rgba(CREAM, 0.97 * a))
    paste_box(L, C + LINEKER, 420, 350, 130, 130, a, 0.3)
    text_top(d, (590, 360), "Gary Lineker", pf(54, 800), rgba(NAVY_D, a), "left")
    tracked(d, (592, 440), "LEICESTER LEGEND  ·  JULY 2015", cond(28, 6), rgba((90, 100, 120), a), 4)
    w1 = atf("When Leicester announced him", 0.82, sc); w2 = lt("Really?", sc)
    text_top(d, (W / 2 - 200, 540), "“Claudio Ranieri?", pf(92, 800), rgba(NAVY_D, ramp(t, w1, w1 + 0.4)), "center")
    text_top(d, (W / 2 + 390, 540), "Really?”", pf(92, 800), rgba((200, 40, 50), ramp(t, w2, w2 + 0.3)), "center")

def paste_box(L, path, x0, y0, w, h, a=1.0, fy=0.35, fx=0.5):
    key = ("box", path, w, h, fx, fy); boxes = E.__dict__.setdefault("_boxes", {})
    if key not in boxes:
        im = load(path); s_ = max(w / im.width, h / im.height); im = im.resize((int(im.width * s_) + 1, int(im.height * s_) + 1), Image.LANCZOS)
        cx = min(max(fx * im.width - w / 2, 0), im.width - w); cy = min(max(fy * im.height - h / 2, 0), im.height - h)
        boxes[key] = im.crop((int(cx), int(cy), int(cx) + w, int(cy) + h)).convert("RGBA")
    im = boxes[key]
    if a < 1: im = im.copy(); im.putalpha(int(255 * a))
    L.alpha_composite(im, (int(x0), int(y0)))

# ---------------------------------------------------------------- V. how Leicester played (one continuous pitch explainer)
FX0, FX1, FY0, FY1 = 210, 1710, 150, 930; FXM, FYM = (FX0 + FX1) / 2, (FY0 + FY1) / 2
def pitch(d, a):
    ln = rgba(CREAM, 0.55 * a)
    d.rectangle((FX0 - 30, FY0 - 30, FX1 + 30, FY1 + 30), fill=rgba((24, 70, 40), 0.6 * a))
    for k in range(10):
        if k % 2: d.rectangle((FX0 + k * 150, FY0, FX0 + (k + 1) * 150, FY1), fill=rgba((40, 95, 55), 0.35 * a))
    d.rectangle((FX0, FY0, FX1, FY1), outline=ln, width=4); d.line((FXM, FY0, FXM, FY1), fill=ln, width=3)
    d.ellipse((FXM - 130, FYM - 130, FXM + 130, FYM + 130), outline=ln, width=3)
    for x0_, x1_ in ((FX0, FX0 + 240), (FX1 - 240, FX1)): d.rectangle((x0_, FYM - 300, x1_, FYM + 300), outline=ln, width=3)
def dot(d, x, y, col, a, r=21, ring=None, name=None):
    d.ellipse((x - r, y - r, x + r, y + r), fill=rgba(col, a), outline=rgba(NAVY_D, a), width=3)
    if ring: d.ellipse((x - r - 9, y - r - 9, x + r + 9, y + r + 9), outline=rgba(ring, a), width=5)
    if name: tracked(d, (x, y - 64), name, cond(28, 8), rgba(CREAM, a), 4, "center")
def ballp(d, x, y, a, lift=0.0):
    if lift: d.ellipse((x - 11, y + 6, x + 11, y + 14), fill=rgba((0, 0, 0), 0.35 * a))
    d.ellipse((x - 13, y - 13 - lift, x + 13, y + 13 - lift), fill=rgba(CREAM, a), outline=rgba(NAVY_D, a), width=3)
def lerp(p, q, f): return (p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f)

# Leicester defend the left goal, attack right. Spread 4-4-2, then the two banks of four squeezed together.
DEF_WIDE = [(420, 260), (400, 450), (400, 630), (420, 820)]; MID_WIDE = [(760, 230), (720, 440), (720, 640), (760, 850)]
DEF_TIGHT = [(470, 330), (450, 470), (450, 610), (470, 750)]; MID_TIGHT = [(610, 320), (590, 470), (590, 610), (610, 760)]
FWD = [(980, 450), (1000, 640)]
OPP = [(880, 300), (820, 540), (880, 780), (1050, 420), (1050, 660), (1250, 260), (1230, 540), (1250, 820), (1400, 400), (1400, 680)]
def tactics(d, L, t, sc):
    a = ramp(t, 0, 0.5); pitch(d, a)
    c = lambda s, o=0.0: lt(s, sc, o)
    tracked(d, (W / 2, 55), "HOW LEICESTER PLAYED", cond(42, 8), rgba(GOLD, a), 10, "center")
    sq = ease(min(1, max(0, t - c("Instead, they sat in two banks")) / 1.6))
    press = ease(min(1, max(0, t - c("When the other team came forward")) / 1.4))
    win = c("And when Leicester won the ball"); lob = c("One pass from Kanté")
    run = ease(min(1, max(0, t - lob - 0.3) / 2.2))
    # possession bar (first two lines)
    pb = ramp(t, c("They didn't try to keep the ball"), c("They didn't try to keep the ball", 0.4)) * (1 - ramp(t, c("Instead, they sat in two banks", -0.3), c("Instead, they sat in two banks")))
    if pb > 0:
        d.rounded_rectangle((460, 960, 1460, 1030), 14, fill=rgba(NAVY_D, 0.92 * pb))
        d.rectangle((470, 970, 470 + 980 * 0.42, 1020), fill=rgba(LCFC, pb)); d.rectangle((470 + 980 * 0.42, 970, 1450, 1020), fill=rgba(RED_T, pb))
        tracked(d, (480, 980), "LEICESTER", cond(30, 8), rgba(CREAM, pb), 6); tracked(d, (1440, 980), "OPPONENTS", cond(30, 8), rgba(CREAM, pb), 6, "right")
    # opponents push forward when they attack, and push up again before the long ball
    for i, (x, y) in enumerate(OPP):
        dx = -260 * press if i < 8 else -120 * press
        dot(d, x + dx, y, RED_T, a * 0.9, 18)
    # Leicester
    for i in range(4):
        dx, dy = lerp(DEF_WIDE[i], DEF_TIGHT[i], sq); mx, my = lerp(MID_WIDE[i], MID_TIGHT[i], sq)
        dot(d, dx, dy, LCFC, a); dot(d, mx, my, LCFC, a, ring=GOLD if i == 2 and t > c("And Kanté was the key") else None, name="KANTÉ" if i == 2 else None)
    vx, vy = lerp(FWD[0], (1500, 360), run)
    dot(d, vx, vy, LCFC, a, ring=GOLD if run > 0 else None, name="VARDY"); dot(d, *FWD[1], LCFC, a)
    if sq > 0.6:                                                             # the gaps close: no way through
        tag(d, (W / 2, 990), "TWO BANKS OF FOUR  ·  NO GAPS", ramp(t, c("Instead, they sat in two banks", 1.0), c("Instead, they sat in two banks", 1.4)) * (1 - ramp(t, c("When the other team came forward", 0.5), c("When the other team came forward", 0.8))), GOLD, 38)
    nb = ramp(t, c("When the other team came forward", 0.8), c("When the other team came forward", 1.2)) * (1 - ramp(t, win - 0.3, win))
    if nb > 0:
        for (x, y) in ((560, 400), (560, 540), (560, 680)):
            d.line((x - 22, y - 22, x + 22, y + 22), fill=rgba(RED_T, nb), width=8); d.line((x + 22, y - 22, x - 22, y + 22), fill=rgba(RED_T, nb), width=8)
        tag(d, (W / 2, 990), "NOWHERE TO GO", nb, RED_T, 40)
    # the ball: won by Kanté, then over the top to Vardy
    if t >= win:
        kx, ky = lerp(MID_WIDE[2], MID_TIGHT[2], sq)
        if t < lob: ballp(d, kx + 30, ky, a); tag(d, (W / 2, 990), "BALL WON  ·  STRAIGHT FOR GOAL", ramp(t, win, win + 0.4), GOLD, 38)
        else:
            f = ease(min(1, max(0, t - lob) / 1.4)); bx, by = lerp((kx + 30, ky), (1480, 380), f)
            d.line([(kx + 30, ky), (bx, by)], fill=rgba(GOLD, 0.5 * a), width=5); ballp(d, bx, by, a, 120 * math.sin(math.pi * f))
            tag(d, (W / 2, 990), "OVER THE TOP  ·  VARDY GONE", ramp(t, lob + 0.6, lob + 1.0) * (1 - ramp(t, c("And Kanté was the key", -0.2), c("And Kanté was the key"))), GOLD, 38)
    ev = c("He seemed to be everywhere")
    if t > ev:                                                               # Kanté races about winning it back
        for j, (x, y) in enumerate([(820, 300), (700, 780), (900, 560)]):
            b = ramp(t, ev + 0.5 + j * 0.8, ev + 0.8 + j * 0.8)
            if b > 0: d.ellipse((x - 36, y - 36, x + 36, y + 36), outline=rgba(GOLD, b), width=6); tracked(d, (x, y + 46), "WON IT", cond(26, 6), rgba(GOLD, b), 4, "center")
        tag(d, (W / 2, 990), "WON THE BALL BACK MORE THAN ANYONE IN THE LEAGUE", ramp(t, c("He won the ball back"), c("He won the ball back", 0.4)), GOLD, 34)

_kd = {}
def _kante_disc(size):
    """Kanté's photo (Mike's), cropped square on his head and shoulders, at the globe's size; the slice is cut from it."""
    if size not in _kd:
        im = load(M + "mike_kante.jpg"); s_ = min(im.width, im.height) * 0.62; cx_, cy_ = im.width * 0.49, im.height * 0.36
        _kd[size] = im.crop((int(cx_ - s_ / 2), int(cy_ - s_ / 2), int(cx_ + s_ / 2), int(cy_ + s_ / 2))).resize((size, size), Image.LANCZOS).convert("RGBA")
    return _kd[size].copy()

def globe(d, L, t, sc):
    """'Seventy per cent of the Earth is covered by water... the rest by Kanté.'"""
    cx, cy, r = W / 2, 560, 330; a = ramp(t, 0, 0.4)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=rgba((30, 90, 170), a), outline=rgba(CREAM, a), width=6)
    k = atf("People joked that seventy", 0.62, sc)
    g = ease(min(1, max(0, t - k) / 0.8))
    if g > 0:                                                                # the slice is filled with Kanté himself
        mask = Image.new("L", (2 * r, 2 * r), 0); ImageDraw.Draw(mask).pieslice((0, 0, 2 * r, 2 * r), -90, -90 + 108 * g, fill=int(255 * a))
        face = _kante_disc(2 * r); face.putalpha(mask); L.alpha_composite(face, (int(cx - r), int(cy - r)))
        d.pieslice((cx - r, cy - r, cx + r, cy + r), -90, -90 + 108 * g, outline=rgba(GOLD, a), width=6)
    tag(d, (cx - 520, 330), "70% WATER", ramp(t, 0.6, 1.0), CREAM, 46)
    tag(d, (cx + 520, 330), "30% KANTÉ", ramp(t, k + 0.4, k + 0.8), GOLD, 52)


# ---------------------------------------------------------------- VI. the run
STREAK = ["BOURNEMOUTH", "ASTON VILLA", "STOKE", "ARSENAL", "NORWICH", "SOUTHAMPTON", "CRYSTAL PALACE", "WEST BROM", "WATFORD", "NEWCASTLE", "MAN UNITED"]
def streak(d, L, t, sc):
    k = lt("He scored in eleven", sc); n = min(11, int((t - k + 0.2) / 0.32)) if t > k - 0.2 else 0
    tracked(d, (W / 2, 120), "JAMIE VARDY  ·  SCORED IN 11 PREMIER LEAGUE GAMES IN A ROW", cond(40, 8), rgba(GOLD, ramp(t, 0, 0.4)), 8, "center")
    for i in range(n):
        c_, r_ = i % 4, i // 4; x = 330 + c_ * 420; y = 260 + r_ * 200
        b = ramp(t, k - 0.2 + i * 0.32, k + i * 0.32); last = i == 10
        d.rounded_rectangle((x - 190, y, x + 190, y + 150), 16, fill=rgba(GOLD if last else LCFC, 0.95 * b), outline=rgba(CREAM, b), width=3)
        text_top(d, (x, y + 10), f"{i + 1}", pf(70, 900), rgba(NAVY_D if last else CREAM, b), "center")
        tracked(d, (x, y + 104), STREAK[i], cond(28, 6), rgba(NAVY_D if last else CREAM, b), 4, "center")
    tag(d, (1500, 960), "A NEW RECORD", ramp(t, lt("A new record.", sc), lt("A new record.", sc) + 0.4), GOLD, 48)

def christmas(d, L, t, sc):
    big(d, 300, "TOP", ramp(t, 0.3, 0.6), GOLD, 220)
    tag(d, (W / 2, 640), "CHRISTMAS DAY 2015  ·  1ST IN THE PREMIER LEAGUE", ramp(t, 0.7, 1.1), CREAM, 44)

def bell_fun(d, L, t, sc):
    """'Dilly ding, dilly dong!' with a bouncing bell."""
    w = atf("In training, when someone", 0.74, sc)
    s = math.sin(max(0, t - w) * 12) * 18 * ramp(t, w, w + 0.2)
    cx, cy = 1520, 330; a = ramp(t, w - 0.3, w)
    if a > 0:
        d.polygon([(cx - 90 + s, cy + 110), (cx + 90 + s, cy + 110), (cx + 60 + s * 0.6, cy - 40), (cx - 60 + s * 0.6, cy - 40)], fill=rgba(GOLD, a))
        d.ellipse((cx - 62 + s * 0.6, cy - 110, cx + 62 + s * 0.6, cy + 10), fill=rgba(GOLD, a))
        d.ellipse((cx - 20 + s * 1.3, cy + 100, cx + 20 + s * 1.3, cy + 140), fill=rgba(NAVY_D, a))
        d.rectangle((cx - 12 + s * 0.4, cy - 150, cx + 12 + s * 0.4, cy - 100), fill=rgba(GOLD, a))
    b = ramp(t, w, w + 0.3)
    if b > 0: text_top(d, (W / 2 - 200, 760), "“Dilly ding, dilly dong!”", pf(96, 800), rgba(CREAM, b), "center")

# ---------------------------------------------------------------- VII. the night
def only_spurs(d, L, t, sc):
    tracked(d, (W / 2, 230), "END OF APRIL 2016", cond(44, 8), rgba(GOLD, ramp(t, 0, 0.4)), 10, "center")
    tag(d, (W / 2, 400), "ONLY ONE TEAM CAN STILL CATCH LEICESTER", ramp(t, 0.6, 1.0), CREAM, 48)
    k = lt("Tottenham.", sc)
    big(d, 560, "TOTTENHAM", ramp(t, k, k + 0.3), CREAM, 170)

def champions(d, L, t, sc):
    """The final whistle: champions."""
    place_stamp(L, W / 2, 470, ramp(t, 0.6, 0.85), text="CHAMPIONS", size=170, color=GOLD, rot=-6)
    tag(d, (W / 2, 760), "LEICESTER CITY  ·  CHAMPIONS OF ENGLAND  ·  2 MAY 2016", ramp(t, 1.2, 1.6), CREAM, 40)

def odds_again(d, L, t, sc):
    a = ramp(t, 0.1, 0.3); s = 1 + 0.5 * (1 - ease(min(1, max(0, t - 0.1) / 0.25)))
    if a > 0: text_top(d, (W / 2, 330 - 50 * (s - 1)), "5000–1", pf(int(260 * s), 900), rgba(GOLD, a), "center")
    place_stamp(L, W / 2, 800, ramp(t, 0.9, 1.15), text="DONE", size=140, color=GOLD, rot=-6)

# ---------------------------------------------------------------- VIII. the party
TABLE = [("1", "LEICESTER CITY", 81, LCFC), ("2", "ARSENAL", 71, (239, 1, 7)), ("3", "TOTTENHAM", 70, SPURS), ("4", "MAN CITY", 66, CITY)]
def final_table(d, L, t, sc):
    tracked(d, (W / 2, 120), "PREMIER LEAGUE  ·  FINAL TABLE  ·  2015–16", cond(42, 8), rgba(GOLD, ramp(t, 0, 0.4)), 10, "center")
    x0, x1 = 300, 1620
    for i, (pos, team, pts, col) in enumerate(TABLE):
        k = 0.2 + i * 0.25; a = ramp(t, k, k + 0.3); off = 900 * (1 - a)
        if a <= 0: continue
        y = 230 + i * 130; top = i == 0
        d.rounded_rectangle((x0 + off, y, x1 + off, y + 105), 12, fill=rgba(LCFC if top else NAVY_D, 0.93 * a), outline=rgba(GOLD if top else CREAM, 0.5 * a), width=3)
        d.rectangle((x0 + off, y, x0 + off + 14, y + 105), fill=rgba(col, a))
        text_top(d, (x0 + 70 + off, y + 22), pos, pf(62, 900), rgba(GOLD if not top else CREAM, a), "center")
        tracked(d, (x0 + 150 + off, y + 32), team, cond(50, 8), rgba(CREAM, a), 6)
        tracked(d, (x1 - 40 + off, y + 32), f"{pts} PTS", cond(48, 8), rgba(CREAM, a), 4, "right")
    k = lt("Ten points clear.", sc)
    tag(d, (W / 2, 800), "10 POINTS CLEAR", ramp(t, k, k + 0.4), GOLD, 50)
    l3 = lt("They lost just three", sc)
    tag(d, (W / 2, 930), "WON 23  ·  DREW 12  ·  LOST 3", ramp(t, l3 + 0.2, l3 + 0.6), CREAM, 46)

# ---------------------------------------------------------------- IX. what happened next
def award(title, who, path, fx=0.5, fy=0.3):
    full = next(d + path for d in (C, M, AI) if os.path.exists(d + path))
    def draw(d, L, t, sc):
        a = ramp(t, 0.1, 0.5)
        paste_box(L, full, 260, 200, 560, 680, a, fy, fx)
        d.rectangle((250, 190, 830, 890), outline=rgba(GOLD, a), width=6)
        tracked(d, (1350, 330), title, cond(44, 8), rgba(GOLD, ramp(t, 0.4, 0.8)), 8, "center")
        text_top(d, (1350, 420), who, pf(110, 900), rgba(CREAM, ramp(t, 0.7, 1.1)), "center")
        tracked(d, (1350, 580), "2015–16", cond(40, 8), rgba(CREAM, ramp(t, 1.0, 1.4)), 8, "center")
    return draw

def two_titles(d, L, t, sc):
    k = lt("Two titles in two years", sc)
    for i, (yr, club, col) in enumerate([("2016", "LEICESTER CITY", LCFC), ("2017", "CHELSEA", CHELSEA)]):
        a = ramp(t, k + i * 0.6, k + i * 0.6 + 0.3); x = W / 2 + (i - 0.5) * 640
        if a <= 0: continue
        d.rounded_rectangle((x - 280, 380, x + 280, 700), 24, fill=rgba(col, 0.93 * a), outline=rgba(GOLD, a), width=5)
        text_top(d, (x, 410), yr, pf(120, 900), rgba(CREAM, a), "center")
        tracked(d, (x, 580), club, cond(44, 8), rgba(CREAM, a), 6, "center")
        tracked(d, (x, 640), "CHAMPIONS", cond(32, 8), rgba(GOLD, a), 8, "center")
    tag(d, (W / 2, 840), "N'GOLO KANTÉ  ·  BACK-TO-BACK TITLES  ·  TWO DIFFERENT CLUBS", ramp(t, k + 1.4, k + 1.8), GOLD, 36)

def ucl(d, L, t, sc):
    big(d, 260, "2017", ramp(t, 0.2, 0.5), CREAM, 180)
    tag(d, (W / 2, 560), "CHAMPIONS LEAGUE  ·  FIRST TIME EVER", ramp(t, 0.6, 1.0), CREAM, 48)
    k = atf("Leicester played in the Champions League", 0.68, sc)
    tag(d, (W / 2, 690), "QUARTER-FINALS", ramp(t, k, k + 0.4), GOLD, 60)

# ---------------------------------------------------------------- Hazard's goal: our own ball over the AI players
class GoalShot(Scene):
    """Mike 21 Oct: AI clips kept putting the ball in the wrong place (past the outside of the post, over the bar).
    So the AI only moves the players (a clip made from the ball-free still) and the ball is ours: cut from the original
    still, flown on a curve we control (inside the far post, under the bar, high by the near post), behind the near post
    as it goes in, then dropping in the net while the net shakes. Coordinates are in the 2752x1536 still; `fit` maps
    them onto the frame. With no clip it plays over the still itself."""
    P0, C1, P2 = (2005, 667), (2250, 745), (2440, 705)          # strike point, curve, crossing the line just inside the far post
    DEEP, DROP = (2527, 690), (2527, 695)                       # up into the top corner by the near post: always BETWEEN the posts
    # (from this angle, anything right of the near post is the outside side-netting: Mike 21 Oct)
    NEAR_POST = (2580, 470, 2622, 1400)                         # repainted over the ball once it's behind it
    NET = (2395, 480, 2580, 1400)                               # the back net, seen through the mouth
    def __init__(self, start, plate, ball_src, clip=None, fly=(0.35, 1.25), **kw):
        super().__init__(start, **kw)
        self.plate, self.clip, self.fly = load(plate), clip, fly
        src = load(ball_src); bx, by, r = 2005, 667, 54
        b = src.crop((bx - r, by - r, bx + r, by + r)).convert("RGBA")
        m = Image.new("L", b.size, 0); ImageDraw.Draw(m).ellipse((4, 4, 2 * r - 4, 2 * r - 4), fill=255)
        b.putalpha(m.filter(ImageFilter.GaussianBlur(2))); self.ball = b
        self.post = self.plate.crop(self.NEAR_POST).convert("RGBA")
    def base(self, t):
        if self.clip is not None:
            self.clip.dur = self.dur; im = self.clip.base(t).convert("RGBA")
        else:
            im = cover(self.plate.convert("RGB"), 1.0 + 0.04 * min(1, t / max(self.dur or 4, 1))).convert("RGBA")
        s = max(W / 2752, H / 1536); ox, oy = (2752 * s - W) / 2, (1536 * s - H) / 2
        f = lambda x, y: (x * s - ox, y * s - oy)
        a, b = self.fly; L = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        def put(x, y, r, alpha=1.0, spin=0.0):
            bb = self.ball.resize((max(4, int(2 * r * s)),) * 2, Image.BICUBIC).rotate(spin, resample=Image.BICUBIC)
            if alpha < 1: bb.putalpha(bb.getchannel("A").point(lambda v: int(v * alpha)))
            X, Y = f(x, y); L.alpha_composite(bb, (int(X - bb.width / 2), int(Y - bb.height / 2)))
        behind = False
        if t < a: put(*self.P0, 54)
        elif t < b:                                              # the curl: quadratic bezier, shrinking as it goes away
            u = (t - a) / (b - a); q = lambda i: (1 - u) ** 2 * self.P0[i] + 2 * (1 - u) * u * self.C1[i] + u * u * self.P2[i]
            for k in range(3, 0, -1):                            # a short motion trail
                uu = max(0, u - 0.025 * k); qq = lambda i: (1 - uu) ** 2 * self.P0[i] + 2 * (1 - uu) * uu * self.C1[i] + uu * uu * self.P2[i]
                put(qq(0), qq(1), 54 - 14 * uu, 0.18 * (4 - k) / 3, -900 * uu)
            put(q(0), q(1), 54 - 14 * u, 1.0, -900 * u)
        else:                                                    # in: up into the roof of the net, then dropping
            v = t - b; behind = True
            if v < 0.3: g = ease(v / 0.3); x, y = self.P2[0] + (self.DEEP[0] - self.P2[0]) * g, self.P2[1] + (self.DEEP[1] - self.P2[1]) * g; r = 40 + 8 * g
            else: g = min(1, (v - 0.3) / 0.7); x, y = self.DEEP[0] + (self.DROP[0] - self.DEEP[0]) * g, self.DEEP[1] + (self.DROP[1] - self.DEEP[1]) * g; r = 49
            put(x, y, r, 1.0)
        im.alpha_composite(L)
        if behind:                                               # the near post stays in front of the ball; the net shakes
            v = t - b; amp = 7 * max(0, 1 - v / 0.9) * math.sin(v * 38)
            if abs(amp) > 0.3:
                n0 = f(self.NET[0], self.NET[1]); n1 = f(self.NET[2], self.NET[3])
                box = (int(n0[0]), int(n0[1]), int(n1[0]), int(n1[1])); piece = im.crop(box)
                im.paste(piece, (box[0] + int(amp), box[1] + int(amp * 0.4)))
            p0 = f(self.NEAR_POST[0], self.NEAR_POST[1]); p1 = f(self.NEAR_POST[2], self.NEAR_POST[3])
            post = self.post.resize((int(p1[0] - p0[0]), int(p1[1] - p0[1])), Image.BICUBIC)

        return im.convert("RGB")
def cover(im, z=1.0):
    s = max(W / im.width, H / im.height) * z; w, h = int(im.width * s), int(im.height * s)
    return im.resize((w, h), Image.BICUBIC).crop(((w - W) // 2, (h - H) // 2, (w - W) // 2 + W, (h - H) // 2 + H))

# ---------------------------------------------------------------- the video
scenes = [
    opening(AI + BOOKIE, "Leicester City.", "EPISODE FOUR  ·  5000–1", credit="AI illustration", focus=((0.7, 0.4), (0.75, 0.55))),
    # cold open
    CuS("Five thousand to one.", odds_slam, bg=bga(BOOKIE, 0.82)),
    AF("Those were the odds on Leicester", 0.45, BOOKIE, zoom=(1.25, 1.55), focus=((0.72, 0.62), (0.76, 0.76)), chapter="LEICESTER  ·  SUMMER 2015"),
    PS("The season before, they'd spent months", KP_IN, zoom=(1.0, 1.12), texts=[(0.6, "Bottom of the league.", "mid"),
       (S("Nearly everyone expected them") - S("The season before, they'd spent months", -0.15), "Expected to go down.", "mid")]),
    PS("Nine months later, they were champions", CELEBRATE, zoom=(1.0, 1.12), focus=((0.5, 0.4), (0.5, 0.35)), texts=[(0.6, "Champions of England.", "big")]),
    PS("This is the story of how Leicester", KP_WIDE, zoom=(1.0, 1.1), strap=("King Power Stadium", "LEICESTER CITY", 0.4)),
    # I. 5000-1
    CuS("So what does five thousand to one", dots, bg=bga(BOOKIE, 0.9), chapter=CH("I", "WHAT 5000–1 MEANS")),
    VS("For comparison, some bookmakers", "ai_elvis_clip.mp4", texts=[(1.6, "Elvis found alive: 2000–1", "mid")],
       fallback=AS("For comparison, some bookmakers", ELVIS, zoom=(1.0, 1.12), focus=((0.55, 0.45), (0.5, 0.4)), texts=[(1.6, "Elvis found alive: 2000–1", "mid")])),
    CuS("Bookmakers don't guess.", wages, bg=bga(BOOKIE, 0.9)),
    PS("Leicester's whole team reportedly cost", SOTON, zoom=(1.0, 1.15), texts=[(0.8, "A whole team for less than one star.", "mid")]),
    # II. the great escape
    PS("To understand how unlikely", KP_IN, zoom=(1.0, 1.06), focus=((0.48, 0.5), (0.52, 0.5)), chapter=CH("II", "THE GREAT ESCAPE"), dim=0.15),
    CuS("In 2014–15", escape, bg=bgp(KP_IN, 0.88)),
    FC("But that summer, the manager", PEARSON, "Nigel Pearson", "MANAGER WHO SAVED THEM", facts=[(1.0, "Left the club in June 2015")]),
    FC("And Leicester appointed Claudio Ranieri", RANIERI_SUIT, "Claudio Ranieri", "NEW MANAGER  ·  JULY 2015", facts=[(0.9, "Italian, from Rome")]),
    # III. the man nobody wanted
    FC("Ranieri was sixty-three", RANIERI_INTER, "Claudio Ranieri", "AGED 63", chapter=CH("III", "THE MAN NOBODY WANTED"),
       facts=[(0.8, "A gentleman, and a good coach"), (("He'd managed Chelsea", 0.2), "Chelsea · Juventus · Valencia · Inter")]),
    CuS("He'd managed Chelsea", cv, off=-0.3, bg=bgp(JUVE, 0.86)),
    CuS("And his last job had gone badly", greece, bg=bga(BOOKIE, 0.92)),
    FC("When Leicester announced him", LINEKER, "Gary Lineker", "LEICESTER LEGEND", facts=[(1.2, "Born in Leicester, started out at the club", True)]),
    Custom(SF("When Leicester announced him", 0.62), tweet, bg=bgp(KP_WIDE, 0.85)),
    # IV. the team
    PS("Ranieri didn't tear the team up", WALL, zoom=(1.0, 1.12), chapter=CH("IV", "THE TEAM"), texts=[(1.2, "He looked at what he had.", "mid")]),
    FC("Up front, Jamie Vardy.", VARDY, "Jamie Vardy", "STRIKER", focus=(0.5, 0.35), facts=[(0.8, "Joined from non-league Fleetwood in 2012")]),
    AS("Four years earlier he'd been playing", FACTORY, zoom=(1.0, 1.15), focus=((0.3, 0.45), (0.35, 0.4)), texts=[(1.2, "Non-league. Factory shifts.", "mid")]),
    FC("On the wing, Riyad Mahrez.", "mike_mahrez_portrait.jpg", "Riyad Mahrez", "WINGER", focus=(0.5, 0.3), facts=[(1.0, "From Le Havre, French second division"), (2.6, "About £400,000", True)]),
    FC("In goal, Kasper Schmeichel", KASPER, "Kasper Schmeichel", "GOALKEEPER", focus=(0.6, 0.3), facts=[(1.0, "Son of Peter Schmeichel", True)]),
    FC("And in the summer, they signed a quiet", "mike_kante.jpg", "N'Golo Kanté", "MIDFIELDER  ·  FROM CAEN", focus=(0.5, 0.3), facts=[(1.6, "Signed summer 2015, about £5.6m")]),
    PS("Hardly anyone in England had heard", "mike_kante_action.jpg", zoom=(1.0, 1.08), texts=[(0.6, "Who?", "big")]),
    # V. how Leicester played
    CuS("So how did a team like that", tactics, chapter=CH("V", "HOW LEICESTER PLAYED")),
    AS("And Kanté was the key", KANTE_AI, zoom=(1.0, 1.15), focus=((0.5, 0.5), (0.55, 0.45)), texts=[(S("He won the ball back") - S("And Kanté was the key", -0.15), "Won the ball back more than anyone.", "mid")]),
    CuS("People joked that seventy per cent", globe, bg=bgp(SOTON, 0.9)),
    # VI. the run
    PS("Leicester started well", RANIERI_ARSENAL, zoom=(1.0, 1.12), chapter=CH("VI", "THE RUN"), texts=[(1.4, "Surely it wouldn't last.", "mid")]),
    PS("Then Vardy started scoring", "mike_vardy_scores.jpg", zoom=(1.0, 1.1), focus=((0.55, 0.4), (0.55, 0.35))),
    CuS("He scored in eleven", streak, off=-0.4, bg=bgp(VARDY, 0.88)),
    PS("At Christmas, Leicester were top", CLOCK, zoom=(1.0, 1.12), strap=("Leicester", "CHRISTMAS 2015", 0.2), texts=[(0.5, "Top of the league at Christmas.", "mid")]),
    PS("And in February, they went to Manchester City", ETIHAD, zoom=(1.0, 1.15), strap=("Etihad Stadium", "MANCHESTER CITY  ·  6 FEBRUARY 2016", 0.5)),
    Custom(SF("And in February, they went to Manchester City", 0.7), scoreboard("6 FEBRUARY 2016", [(0, 0, 0), (0.3, 1, 3)], "MAN CITY", "LEICESTER", CITY, LCFC,
           scorers=[(0.8, "HUTH 3'"), (1.1, "MAHREZ 48'"), (1.4, "HUTH 60'")]), bg=bgp(ETIHAD, 0.85)),
    AS("Ranieri kept things light", PIZZA, zoom=(1.0, 1.12), focus=((0.45, 0.5), (0.55, 0.5)),
       texts=[(S("He promised the players pizza") - S("Ranieri kept things light", -0.15) + 0.8, "Clean sheet = pizza.", "mid")]),
    Custom(S("In training, when someone switched off", -0.15), bell_fun, bg=bga(BELL, 0.25)),
    PS("The pressure was enormous", RANIERI_WATCH, zoom=(1.0, 1.15), texts=[(S("Ranieri just kept smiling.") - S("The pressure was enormous", -0.15), "He just kept smiling.", "mid")]),
    # VII. the night it was decided
    CuS("By the end of April", only_spurs, bg=bgp(SPURS_PIC, 0.85), chapter=CH("VII", "THE NIGHT IT WAS DECIDED")),
    PS("On Monday the second of May", BRIDGE, zoom=(1.0, 1.12), strap=("Chelsea v Tottenham", "STAMFORD BRIDGE  ·  MONDAY 2 MAY 2016", 0.4),
       texts=[(S("If they didn't win") - S("On Monday the second of May", -0.15), "Spurs don't win: Leicester are champions.", "mid")]),
    AS("The Leicester players watched it together", HOUSE_TENSE, zoom=(1.0, 1.12), focus=((0.45, 0.5), (0.55, 0.5)), strap=("Jamie Vardy's house", "LEICESTER  ·  THE PLAYERS WATCH", 0.5)),
    CuS("At half-time, Tottenham were", scoreboard("CHELSEA v TOTTENHAM  ·  HALF-TIME", [(0, 0, 0), (0.3, 0, 1), (0.8, 0, 2)], "CHELSEA", "TOTTENHAM", CHELSEA, SPURS,
        scorers=[(0.3, "KANE 35'"), (0.8, "SON 44'")]), bg=bgp(BRIDGE, 0.85)),
    CuS("Then, in the second half", scoreboard("SECOND HALF", [(0, 0, 2), (0.9, 1, 2)], "CHELSEA", "TOTTENHAM", CHELSEA, SPURS, scorers=[(0.9, "CAHILL 58'")]), bg=bgp(BRIDGE, 0.85)),
    FC("Seven minutes from the end", HAZARD, "Eden Hazard", "CHELSEA  ·  83'", focus=(0.5, 0.3), facts=[(1.2, "PFA Player of the Year the season before", True)]),
    Clip(SF("Seven minutes from the end", 0.55), AI + "ai_hazard_goal.mp4", credit="AI illustration", max_rate=1.0,
         texts=[(S("Two–two.") - SF("Seven minutes from the end", 0.55), "Chelsea 2–2 Tottenham", "big")]) if has("ai_hazard_goal.mp4") else
    AS("He curled it into the top corner", "ai_hazard_endframe.png", off=0.5, zoom=(1.0, 1.05), focus=((0.62, 0.45), (0.64, 0.45)),
       texts=[(S("Two–two.") - S("He curled it into the top corner", 0.5), "Chelsea 2–2 Tottenham", "big")]),   # fallback: the two-still version
    # Hazard's goal (Mike 21 Oct): camera behind him, goal centred; seedance-2.5 draft passed the 10-fps check, then 1080p.   # cut: in the net
    # Mike 21 Oct: no animated ball (AI clips missed the goal three times; our own ball "looks like a comic"). Two stills, like press photos.
    VS("At Vardy's house, the room went mad", "ai_house_clip.mp4", end=2.0, fallback=AS("At Vardy's house, the room went mad", HOUSE_MAD, zoom=(1.0, 1.15), focus=((0.4, 0.4), (0.45, 0.45)))),
    AS("When the final whistle went", WHISTLE, zoom=(1.0, 1.12), focus=((0.5, 0.5), (0.55, 0.45))),
    Custom(SF("When the final whistle went", 0.55), champions, bg=bga(TROPHY_AI, 0.8)),
    Custom(S_nth("Five thousand to one.", 1, -0.1), odds_again, bg=bga(BOOKIE, 0.88)),
    # VIII. the party
    PS("Five days later, Leicester lifted", LIFT, zoom=(1.0, 1.15), focus=((0.6, 0.45), (0.62, 0.4)), chapter=CH("VIII", "THE PARTY"),
       strap=("Leicester v Everton", "KING POWER STADIUM  ·  7 MAY 2016", 0.6)),
    AS("The opera singer Andrea Bocelli", BOCELLI, zoom=(1.0, 1.12), focus=((0.6, 0.45), (0.62, 0.4)), strap=("Andrea Bocelli", "NESSUN DORMA  ·  RANIERI BESIDE HIM", 0.8)),
    VS("A week later, a quarter of a million", "ai_parade_clip.mp4", texts=[(1.0, "About 250,000 people.", "big")],
       fallback=AS("A week later, a quarter of a million", PARADE, zoom=(1.0, 1.15), focus=((0.5, 0.55), (0.5, 0.6)), texts=[(1.0, "About 250,000 people.", "big")])),
    CuS("They finished with eighty-one points", final_table, bg=bgp(LIFT, 0.88)),
    # IX. what happened next
    CuS("Riyad Mahrez was voted", award("PFA PLAYERS' PLAYER OF THE YEAR", "Riyad Mahrez", "mike_mahrez_action.jpg", fx=0.45, fy=0.4), bg=bgp(KP_WIDE, 0.88), chapter=CH("IX", "WHAT HAPPENED NEXT")),
    CuS("Jamie Vardy was the writers'", award("FWA FOOTBALLER OF THE YEAR", "Jamie Vardy", "mike_vardy_celebrates.jpg", fx=0.5, fy=0.4), bg=bgp(KP_WIDE, 0.88)),
    PS("N'Golo Kanté went to Chelsea", CHELSEA_LINEUP, zoom=(1.0, 1.15), focus=((0.45, 0.6), (0.4, 0.6)), strap=("N'Golo Kanté", "CHELSEA  ·  2016–17", 0.5)),
    CuS("Two titles in two years", two_titles, off=-0.3, bg=bgp(CHELSEA_LINEUP, 0.88)),
    CuS("Leicester played in the Champions League", ucl, bg=bgp(KP_IN, 0.86)),
    AS("And Claudio Ranieri, the man nobody wanted", RANIERI_FANS, zoom=(1.0, 1.12), focus=((0.45, 0.4), (0.45, 0.35)), texts=[(2.4, "One of the most loved managers in England.", "mid")]),
    # X. what if
    CuS("So here's the question", chapter=CH("X", "WHAT IF"), fn= what_if("Ranieri? Kanté? Vardy's goals?", "Was it Ranieri?", "Or did everyone else get it wrong?", "Or was it the season"), bg=bga(PARADE, 0.86)),
    CuS("This was Impossible", impossible_end("Leicester."), bg=bga(TROPHY_AI, 0.85)),
]
scenes = [s for s in scenes if s is not None]

if __name__ == "__main__":
    if sys.argv[1:] == ["check"]: print(shot_check(scenes, OUT.replace("video/", "sheets/") + "check.jpg"))
    else: main(scenes, FINAL)
