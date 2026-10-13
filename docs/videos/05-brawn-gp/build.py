"""IMPOSSIBLE 01: Brawn GP -> PostDrive/Stories/IMPOSSIBLE series/01 Brawn GP/video/IMPOSSIBLE 01 - Brawn GP.mp4

    ~/.venvs/poststudio/bin/python build.py            # full render (+ review 720p)
    ~/.venvs/poststudio/bin/python build.py 95 125     # preview slice (video seconds)

First episode with AI video: media/ai/*.mp4 are 5 s Runway clips (VS); the stills are Runway images (AS).
"""
import math, os, sys
VDIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(VDIR, "..", "..", "..", "studio"))
import episode as E
E.init("/Volumes/PostDrive/Stories/IMPOSSIBLE series/01 Brawn GP/", series="impossible")
from episode import *

FINAL = "IMPOSSIBLE 01 - Brawn GP.mp4"
YEL = (214, 240, 40)                                   # Brawn fluorescent yellow
SILVER = (200, 205, 212)

def CP(snip, query, n=0, fallback=None, **kw):
    """The n-th Commons photo found for `query` (see commons/credits.json), else the fallback scene."""
    hits = [f for f, c in E._cr.items() if c.get("query", "").lower() == query.lower()]
    return PS(snip, hits[n], **kw) if len(hits) > n else fallback

def headline(kicker, title, sub=None):
    def draw(d, L, t, sc):
        tracked(d, (W / 2, 330), kicker, cond(36, 2), rgba(GOLD, ramp(t, 0.1, 0.5)), 8, "center")
        text_top(d, (W / 2, 410), title, pf(128, 900), rgba(CREAM, ramp(t, 0.4, 0.9)), "center")
        if sub: tracked(d, (W / 2, 640), sub, cond(36, 8), rgba(CREAM, 0.8 * ramp(t, 1.2, 1.6)), 6, "center")
    return draw

# ---------------------------------------------------------------- cold open
def nothing_left(d, L, t, sc):
    rows = [("No owner.", "NO OWNER"), ("No money.", "NO MONEY"), ("No engine.", "NO ENGINE"), ("Seven hundred people", "700 JOBS")]
    for i, (snip, txt) in enumerate(rows):
        a = ramp(t, at(snip, sc) - 0.05, at(snip, sc) + 0.25)
        if a <= 0: continue
        y = 260 + i * 150
        tracked(d, (W / 2, y + 16 * (1 - a)), txt, cond(96, 8), rgba(RED if i == 3 else CREAM, a), 14, "center")

# ---------------------------------------------------------------- I. the end
def family_tree(d, L, t, sc):
    tracked(d, (W / 2, 220), "BRACKLEY, ENGLAND  ·  ONE FACTORY, MANY NAMES", cond(34, 2), rgba(GOLD, ramp(t, 0, 0.5)), 8, "center")
    names = [("Tyrrell.", "TYRRELL"), ("BAR.", "BAR"), ("And then Honda.", "HONDA"), ("Honda had spent a fortune", "?")]
    xs = [310, 770, 1210, 1620]
    for i, ((snip, txt), x) in enumerate(zip(names, xs)):
        a = ramp(t, at(snip, sc) - 0.1, at(snip, sc) + 0.3)
        if a <= 0: continue
        if i: m = (xs[i - 1] + x) / 2 + (25 if txt == "?" else 0); arrow(d, (m - 30, 535), (m + 30, 535), a, GOLD, 4, 14)
        col = GOLD if txt == "?" else CREAM
        text_top(d, (x, 480 + 20 * (1 - a)), txt, pf(76 if txt != "?" else 140, 900), rgba(col, a), "center")

def three_points(d, L, t, sc):
    tracked(d, (W / 2, 260), "JENSON BUTTON  ·  POINTS IN 2008", cond(36, 2), rgba(GOLD, ramp(t, 0, 0.5)), 8, "center")
    n = min(3, int(max(0, t - 0.4) * 4))
    text_top(d, (W / 2, 330), str(n), pf(380, 900), rgba(CREAM, ramp(t, 0.3, 0.6)), "center")
    tracked(d, (W / 2, 820), "ALL YEAR", cond(40, 8), rgba(RED, ramp(t, 1.4, 1.8)), 10, "center")

def honda_quits(d, L, t, sc):
    tracked(d, (W / 2, 250), "5 DECEMBER 2008", cond(40, 8), rgba(GOLD, ramp(t, at("And on the fifth", sc), at("And on the fifth", sc) + 0.4)), 10, "center")
    text_top(d, (W / 2, 340), "Honda quits", pf(150, 900), rgba(CREAM, ramp(t, atf("And on the fifth", 0.5, sc), atf("And on the fifth", 0.5, sc) + 0.4)), "center")
    text_top(d, (W / 2, 530), "Formula One.", pf(150, 900), rgba(CREAM, ramp(t, atf("And on the fifth", 0.7, sc), atf("And on the fifth", 0.7, sc) + 0.4)), "center")
    tracked(d, (W / 2, 160), "THE FINANCIAL CRISIS", cond(30, 2), rgba(CREAM, 0.6 * ramp(t, 0.1, 0.5) * (1 - ramp(t, at("And on the fifth", sc), at("And on the fifth", sc) + 0.3))), 8, "center")

# ---------------------------------------------------------------- II. the gamble
def price_tag(d, L, t, sc):
    a = ramp(t, 0.1, 0.5); sw = math.sin(t * 1.6) * 3                      # tag swings gently on its string
    cx, cy = W / 2 + sw * 6, 560
    d.line((W / 2, 140, cx - 300, cy - 150), fill=rgba(CREAM, 0.6 * a), width=3)
    d.polygon([(cx - 330, cy - 160), (cx + 330, cy - 160), (cx + 330, cy + 160), (cx - 330, cy + 160), (cx - 420, cy)], fill=rgba(CREAM, a))
    d.ellipse((cx - 330, cy - 18, cx - 294, cy + 18), fill=rgba(NAVY_D, a))
    k = ramp(t, at("Reportedly, one", sc), at("Reportedly, one", sc) + 0.4)
    tracked(d, (cx + 20, cy - 120), "THE PRICE", cond(36, 8), rgba(NAVY_D, a), 8, "center")
    text_top(d, (cx + 20, cy - 70), "£1", pf(220, 900), rgba(RED, k), "center")
    tracked(d, (cx + 20, cy + 190), "REPORTEDLY", cond(34, 8), rgba(GOLD, k), 10, "center")

_masks = {}
def paste_fit(L, path, cx, cy, w, a=1.0):
    """An AI studio shot, edges feathered into the navy so it doesn't sit in a box."""
    im = load(path).convert("RGBA"); s_ = w / im.width; im = im.resize((int(im.width * s_), int(im.height * s_)), Image.BICUBIC)
    if im.size not in _masks:
        yy, xx = np.mgrid[0:im.height, 0:im.width]; r = np.hypot((xx / im.width - 0.5) / 0.5, (yy / im.height - 0.5) / 0.5)
        _masks[im.size] = np.clip((1.0 - r) / 0.35, 0, 1)
    im.putalpha(Image.fromarray((255 * _masks[im.size] * a).astype(np.uint8)))
    L.alpha_composite(im, (int(cx - im.width / 2), int(cy - im.height / 2)))

def engine_swap(d, L, t, sc):
    tracked(d, (W / 2, 140), "THE ENGINE", cond(36, 2), rgba(GOLD, ramp(t, 0, 0.5)), 8, "center")
    a = ramp(t, 0.1, 0.5); m = ramp(t, at("Now it needed a Mercedes", sc), atf("Now it needed a Mercedes", 0.25, sc))
    paste_fit(L, AI + "ai_engine_honda.png", 500, 520, 700, a * (1 - 0.55 * m))
    tracked(d, (500, 830), "HONDA", cond(52, 8), rgba(CREAM, a * (1 - 0.55 * m)), 10, "center")
    if m > 0:
        d.line((230, 800, 770, 260), fill=rgba(RED, m), width=14)
        arrow(d, (880, 520), (1040, 520), m, GOLD, 8, 26)
        paste_fit(L, AI + "ai_engine_mercedes.png", 1420, 520, 700, m)
        tracked(d, (1420, 830), "MERCEDES", cond(52, 8), rgba(SILVER, m), 10, "center")

def stopwatch(d, cx, cy, r, secs, a, col=GOLD):
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=rgba(NAVY_D, a), outline=rgba(CREAM, a), width=8)
    d.rectangle((cx - 22, cy - r - 46, cx + 22, cy - r - 8), fill=rgba(CREAM, a))
    for k in range(60):
        an = k * math.pi / 30; r0 = 0.86 if k % 5 else 0.78
        d.line((cx + r0 * r * math.sin(an), cy - r0 * r * math.cos(an), cx + 0.94 * r * math.sin(an), cy - 0.94 * r * math.cos(an)), fill=rgba(CREAM, 0.7 * a), width=3 if k % 5 else 5)
    an = (secs % 60) / 60 * 2 * math.pi
    d.line((cx, cy, cx + 0.8 * r * math.sin(an), cy - 0.8 * r * math.cos(an)), fill=rgba(col, a), width=8)
    d.ellipse((cx - 12, cy - 12, cx + 12, cy + 12), fill=rgba(col, a))

def clock_bomb(d, L, t, sc):
    """A stopwatch ticking ever faster and shaking, then it blows apart."""
    boom = sc.dur - 0.9; cx, cy, r = W / 2, 540, 300
    if t < boom:
        a = ramp(t, 0, 0.3); speed = 1 + 8 * (t / boom) ** 2; secs = 60 * (t * speed) / 4
        sh = 14 * (t / boom) ** 3; jx, jy = sh * math.sin(t * 61), sh * math.cos(t * 47)
        stopwatch(d, cx + jx, cy + jy, r, secs, a, RED if t > boom - 1.2 else GOLD)
        return
    f = min(1.0, (t - boom) / 0.9)
    d.ellipse((cx - r * 1.6 * f, cy - r * 1.6 * f, cx + r * 1.6 * f, cy + r * 1.6 * f), fill=rgba(CREAM, 0.85 * (1 - f) ** 2))   # flash
    for k in range(28):                                                      # shards
        an = k * 2 * math.pi / 28 + 0.3 * math.sin(k * 7.1); v = 500 + 380 * ((k * 37) % 11) / 11
        x = cx + math.cos(an) * v * f; y = cy + math.sin(an) * v * f + 700 * f * f
        s_ = 26 + (k % 5) * 9; rot = an + f * (6 + k % 4)
        pts = [(x + s_ * math.cos(rot + q), y + s_ * math.sin(rot + q)) for q in (0, 2.3, 4.1)]
        d.polygon(pts, fill=rgba(CREAM if k % 3 else RED, 1 - f))
    for k in range(40):                                                      # sparks
        an = k * 2.399; v = 300 + 700 * ((k * 13) % 17) / 17
        x = cx + math.cos(an) * v * f; y = cy + math.sin(an) * v * f
        d.ellipse((x - 5, y - 5, x + 5, y + 5), fill=rgba(GOLD, 1 - f))

def countdown(d, L, t, sc):
    born = at("On the sixth of March", sc); first = at("The first race was", sc)
    a = ramp(t, born, born + 0.4)
    text_top(d, (520, 330), "6 March", pf(110, 900), rgba(CREAM, a), "center")
    tracked(d, (520, 480), "BRAWN GP IS BORN", cond(34, 8), rgba(GOLD, a), 6, "center")
    b = ramp(t, first, first + 0.4)
    text_top(d, (1400, 330), "29 March", pf(110, 900), rgba(CREAM, b), "center")
    tracked(d, (1400, 480), "FIRST RACE  ·  MELBOURNE", cond(34, 8), rgba(GOLD, b), 6, "center")
    if b > 0:
        days = min(23, int(max(0, t - first) * 14)); x0, x1 = 520, 1400
        d.line((x0, 580, x0 + (x1 - x0) * days / 23, 580), fill=rgba(YEL, b), width=6)
        text_top(d, (W / 2, 620), str(days), pf(180, 900), rgba(YEL, b), "center")
        tracked(d, (W / 2, 860), "DAYS", cond(44, 8), rgba(CREAM, b), 12, "center")

# ---------------------------------------------------------------- III. the secret
def car_side(d, x0, y0, a, col=CREAM):
    """Side-on 2009 F1 car, nose left, rear wing right. About 1100 x 260."""
    d.polygon([(x0, y0 + 190), (x0 + 60, y0 + 160), (x0 + 380, y0 + 140), (x0 + 470, y0 + 90), (x0 + 560, y0 + 80), (x0 + 600, y0 + 40),
               (x0 + 700, y0 + 40), (x0 + 760, y0 + 100), (x0 + 980, y0 + 130), (x0 + 1010, y0 + 200), (x0, y0 + 205)], fill=rgba(col, 0.9 * a))
    d.rectangle((x0 + 1000, y0 - 10, x0 + 1110, y0 + 12), fill=rgba(col, a)); d.rectangle((x0 + 1040, y0 + 10, x0 + 1056, y0 + 140), fill=rgba(col, a))
    d.polygon([(x0 + 300, y0 + 150), (x0 + 900, y0 + 135), (x0 + 900, y0 + 150), (x0 + 300, y0 + 160)], fill=rgba(YEL, a))
    for wx in (x0 + 210, x0 + 880):
        d.ellipse((wx - 95, y0 + 115, wx + 95, y0 + 305), fill=rgba(NAVY_D, a), outline=rgba(col, a), width=6)

def diffuser(d, L, t, sc):
    tracked(d, (W / 2, 120), "THE DOUBLE DIFFUSER", cond(36, 2), rgba(GOLD, ramp(t, 0, 0.5)), 8, "center")
    a = ramp(t, 0.2, 0.7); x0, y0 = 300, 360
    car_side(d, x0, y0, a)
    ground = y0 + 305; d.line((150, ground, 1770, ground), fill=rgba(CREAM, 0.4 * a), width=3)
    two = ramp(t, at("Two layers where", sc), at("Two layers where", sc) + 0.5)
    # the diffuser: one ramp under the rear, then a second deck above it
    d.polygon([(x0 + 930, y0 + 205), (x0 + 1100, y0 + 160), (x0 + 1100, y0 + 175), (x0 + 940, y0 + 215)], fill=rgba(GOLD, a))
    if two: d.polygon([(x0 + 930, y0 + 175), (x0 + 1100, y0 + 105), (x0 + 1100, y0 + 120), (x0 + 940, y0 + 188)], fill=rgba(YEL, two))
    flow(d, [(150, ground - 30), (x0 + 900, ground - 30), (x0 + 1180, y0 + 140)], t, a, CREAM, n=14, speed=0.45, r=5)
    if two: flow(d, [(x0 + 700, y0 + 180), (x0 + 940, y0 + 180), (x0 + 1180, y0 + 80)], t, two, YEL, n=10, speed=0.45, r=5)
    s = ramp(t, atf("Two layers where", 0.6, sc), atf("Two layers where", 0.6, sc) + 0.5)
    if s > 0:
        for k in range(5):
            x = 500 + k * 220; arrow(d, (x, y0 - 60), (x, y0 + 40), s, GOLD, 6, 20)
        tracked(d, (W / 2, 880), "MORE DOWNFORCE  ·  SUCKED ONTO THE TRACK", cond(40, 8), rgba(CREAM, s), 6, "center")
    label(d, (x0 + 1130, y0 + 210), "ONE LAYER" if not two else "TWO LAYERS", a, GOLD if not two else YEL, 34)

def protest(d, L, t, sc):
    a = ramp(t, at("They protested", sc) - 0.1, at("They protested", sc) + 0.2)
    text_top(d, (W / 2, 240), "The rivals protested.", pf(100, 800), rgba(CREAM, ramp(t, 0.1, 0.5)), "center")
    if a > 0: place_stamp(L, W / 2, 470, a, text="PROTESTED", size=110, color=RED, rot=-6)
    c0 = at("And in April", sc); b = ramp(t, c0, c0 + 0.4)
    if b > 0:
        d.rectangle((0, 0, W, H), fill=rgba(NAVY_D, 0.88 * b))
        tracked(d, (W / 2, 300), "COURT OF APPEAL  ·  15 APRIL 2009", cond(40, 8), rgba(GOLD, b), 8, "center")
        text_top(d, (W / 2, 380), "The double diffuser:", pf(100, 800), rgba(CREAM, b), "center")
        k = atf("And in April", 0.85, sc)
        place_stamp(L, W / 2, 700, ramp(t, k - 0.05, k + 0.2), text="LEGAL", size=170, color=GOLD, rot=-7)

# ---------------------------------------------------------------- IV. the impossible
def grid(d, L, t, sc):
    tracked(d, (W / 2, 160), "AUSTRALIAN GRAND PRIX  ·  2009", cond(36, 2), rgba(GOLD, ramp(t, 0, 0.5)), 8, "center")
    fin = ramp(t, at("First and second", sc), at("First and second", sc) + 0.4)
    for i, (who, snip) in enumerate((("BUTTON", None), ("BARRICHELLO", None))):
        a = ramp(t, 0.2 + i * 0.4, 0.6 + i * 0.4); y = 330 + i * 200; x = 600 + i * 140
        d.rounded_rectangle((x - 40, y, x + 640, y + 140), 12, fill=rgba(NAVY_D, 0.9 * a), outline=rgba(YEL, a), width=4)
        text_top(d, (x + 20, y + 22), f"P{i + 1}", pf(84, 900), rgba(YEL, a), "left")
        tracked(d, (x + 170, y + 52), who, cond(52, 8), rgba(CREAM, a), 6)
    tracked(d, (W / 2, 330 + 2 * 200 + 40), "QUALIFYING", cond(34, 8), rgba(CREAM, 0.7 * ramp(t, 0.8, 1.2) * (1 - fin)), 8, "center")
    if fin > 0:
        tracked(d, (W / 2, 770), "FINISH:  1ST  ·  2ND", cond(56, 8), rgba(YEL, fin), 10, "center")

WINS = [("Melbourne.", "AUS"), ("Malaysia.", "MAL"), (None, "CHN"), ("Bahrain.", "BHR"), ("Spain.", "ESP"), ("Spain.", "MON"), ("Turkey.", "TUR")]
def win_tally(d, L, t, sc):
    tracked(d, (W / 2, 200), "2009  ·  THE FIRST SEVEN RACES", cond(36, 2), rgba(GOLD, ramp(t, 0, 0.5)), 8, "center")
    x0 = W / 2 - 3 * 230
    for i, (snip, code) in enumerate(WINS):
        x = x0 + i * 230
        if snip == "Melbourne.": k = 0.2
        elif code == "MON": k = atf("Spain.", 0.55, sc)
        elif snip: k = at(snip, sc)
        else: k = at("Bahrain.", sc) - 0.2
        a = ramp(t, k, k + 0.3)
        if a <= 0: continue
        win = snip is not None
        d.ellipse((x - 85, 400, x + 85, 570), fill=rgba(YEL if win else NAVY_D, a), outline=rgba(YEL if win else CREAM, a), width=5)
        tracked(d, (x, 462), "WIN" if win else "–", cond(48, 8), rgba(NAVY_D if win else CREAM, a), 4, "center")
        tracked(d, (x, 610), code, cond(40, 8), rgba(CREAM, a), 6, "center")
    s = ramp(t, at("Six wins from", sc), at("Six wins from", sc) + 0.4)
    text_top(d, (W / 2, 720), "Six wins from seven.", pf(100, 900), rgba(GOLD, s), "center")

# ---------------------------------------------------------------- V. the fight
def lead_shrinks(d, L, t, sc):
    tracked(d, (W / 2, 200), "BUTTON'S CHAMPIONSHIP LEAD", cond(36, 2), rgba(GOLD, ramp(t, 0, 0.5)), 8, "center")
    a = ramp(t, 0.2, 0.6)
    text_top(d, (560, 360), "+26", pf(220, 900), rgba(YEL, a), "center")
    tracked(d, (560, 650), "AFTER TURKEY  ·  RACE 7", cond(36, 8), rgba(CREAM, a), 6, "center")
    k0 = at("In the second half", sc); b = ramp(t, k0, k0 + 0.5)
    tracked(d, (W / 2, 790), "WINS SINCE: 0", cond(44, 8), rgba(RED, b), 10, "center")
    c0 = at("His lead shrank", sc); c = ramp(t, c0, c0 + 0.5)
    if c > 0:
        arrow(d, (820, 480), (1100, 480), c, CREAM, 6, 22)
        text_top(d, (1360, 360), "+14", pf(220, 900), rgba(RED, c), "center")
        tracked(d, (1360, 650), "BEFORE BRAZIL  ·  RACE 16", cond(36, 8), rgba(CREAM, c), 6, "center")

def p14_to_p5(d, L, t, sc):
    tracked(d, (W / 2, 160), "BRAZILIAN GRAND PRIX  ·  2009", cond(36, 2), rgba(GOLD, ramp(t, 0, 0.5)), 8, "center")
    a = ramp(t, 0.1, 0.5); s0 = at("He fought his way up", sc)
    p = 14 - min(9, int(max(0, t - s0) * 5)) if t > s0 else 14
    text_top(d, (W / 2, 290), f"P{p}", pf(300, 900), rgba(YEL if p <= 5 else CREAM, a), "center")
    tracked(d, (W / 2, 660), "BUTTON  ·  STARTING POSITION" if p == 14 else "BUTTON  ·  FINISHED", cond(40, 8), rgba(CREAM, a), 8, "center")
    b = ramp(t, atf("He fought his way up", 0.55, sc), atf("He fought his way up", 0.55, sc) + 0.4)
    tracked(d, (W / 2, 760), "BARRICHELLO  ·  8TH", cond(36, 8), rgba(GOLD, b), 8, "center")

def champions(d, L, t, sc):
    tracked(d, (W / 2, 260), "2009 WORLD CHAMPIONS", cond(44, 8), rgba(GOLD, ramp(t, 0.1, 0.5)), 10, "center")
    text_top(d, (W / 2, 350), "Jenson Button", pf(130, 900), rgba(CREAM, ramp(t, 0.3, 0.8)), "center")
    tracked(d, (W / 2, 530), "DRIVERS", cond(36, 8), rgba(YEL, ramp(t, 0.6, 1.0)), 10, "center")
    k = at("And on the same day", sc); b = ramp(t, k, k + 0.5)
    text_top(d, (W / 2, 630), "Brawn GP", pf(130, 900), rgba(CREAM, b), "center")
    tracked(d, (W / 2, 810), "CONSTRUCTORS", cond(36, 8), rgba(YEL, ramp(t, k + 0.4, k + 0.8)), 10, "center")

# ---------------------------------------------------------------- VI. what happened next
def trophy(d, cx, base, h, a, col=SILVER, shine=-1.0):
    """A championship cup, `h` tall, standing on `base`. shine: 0..1 position of a gold glint sweeping up it."""
    w = h * 0.62; top = base - h
    d.rounded_rectangle((cx - w * 0.42, base - h * 0.12, cx + w * 0.42, base), 6, fill=rgba(NAVY_D, a), outline=rgba(col, a), width=4)   # plinth
    d.rectangle((cx - w * 0.30, base - h * 0.20, cx + w * 0.30, base - h * 0.12), fill=rgba(col, a))                                     # foot
    d.rectangle((cx - w * 0.07, base - h * 0.42, cx + w * 0.07, base - h * 0.20), fill=rgba(col, a))                                     # stem
    d.pieslice((cx - w * 0.5, top - h * 0.18, cx + w * 0.5, base - h * 0.30), 0, 180, fill=rgba(col, a))                               # bowl
    d.rectangle((cx - w * 0.5, top, cx + w * 0.5, top + h * 0.26), fill=rgba(col, a))
    for sgn in (-1, 1):                                                                                                                   # handles
        hx = cx + sgn * w * 0.5
        d.arc((hx - w * 0.22, top + h * 0.04, hx + w * 0.22, top + h * 0.40), 270 if sgn > 0 else 90, 90 if sgn > 0 else 270, fill=rgba(col, a), width=7)
    if 0 <= shine <= 1:
        y = base - h * shine
        d.line((cx - w * 0.36, y + 12, cx + w * 0.36, y - 12), fill=rgba(GOLD, 0.9 * a), width=7)

def eight_titles(d, L, t, sc):
    tracked(d, (W / 2, 160), "MERCEDES  ·  CONSTRUCTORS' CHAMPIONS", cond(36, 2), rgba(GOLD, ramp(t, 0, 0.5)), 8, "center")
    x0 = W / 2 - 3.5 * 200; base = 700; landed = 0
    for i, yr in enumerate(range(2014, 2022)):
        k = 0.4 + i * 0.32; a = ramp(t, k, k + 0.12)
        if a <= 0: continue
        f = min(1.0, (t - k) / 0.35); drop = -260 * (1 - f) ** 2 + (14 * math.sin(f * math.pi) if f < 1 else 0)   # falls in, small bounce
        x = x0 + i * 200; landed += f >= 1
        trophy(d, x, base + drop, 200, a, SILVER, ((t - k - 0.35) / 0.5) if t > k + 0.35 else -1)
        tracked(d, (x, base + 30), str(yr), cond(34, 8), rgba(CREAM, a), 4, "center")
    if landed:
        text_top(d, (W / 2, 800), f"{landed}", pf(150, 900), rgba(GOLD if landed == 8 else CREAM, 1), "center")
    tracked(d, (W / 2, 970), "IN A ROW", cond(40, 8), rgba(GOLD, ramp(t, 3.2, 3.6)), 12, "center")

def one_pound(d, L, t, sc):
    a = ramp(t, 0.1, 0.5)
    text_top(d, (W / 2, 260), "£1", pf(220, 900), rgba(RED, a), "center")
    b = ramp(t, atf("The team that was worth", 0.45, sc), atf("The team that was worth", 0.45, sc) + 0.5)
    text_top(d, (W / 2, 560), "The most successful team", pf(96, 800), rgba(CREAM, b), "center")
    text_top(d, (W / 2, 680), "of its generation.", pf(96, 800), rgba(CREAM, b), "center")

def record(d, L, t, sc):
    tracked(d, (W / 2, 240), "BRAWN GP", cond(48, 8), rgba(YEL, ramp(t, 0.1, 0.5)), 14, "center")
    cols = [("One season.", "1", "SEASON"), ("Two championships.", "2", "TITLES"), ("A perfect record", "100%", "PERFECT")]
    for i, (snip, big, lab) in enumerate(cols):
        a = ramp(t, at(snip, sc), at(snip, sc) + 0.35); x = W / 2 + (i - 1) * 480
        if a <= 0: continue
        text_top(d, (x, 380), big, pf(200, 900), rgba(CREAM if i < 2 else GOLD, a), "center")
        tracked(d, (x, 680), lab, cond(40, 8), rgba(GOLD, a), 10, "center")

# ---------------------------------------------------------------- timeline
FACTORY = AI + "ai_empty_factory.png"
scenes = [
    opening(FACTORY, "Brawn GP.", "EPISODE ONE  ·  THE TEAM BOUGHT FOR £1", credit="AI illustration"),
    # cold open
    VS("In December 2008", "ai_empty_factory_clip_v2.mp4", off=0, chapter="BRACKLEY  ·  DECEMBER 2008"),
    CuS("No owner.", nothing_left, bg=bg_of(FACTORY, 0.8)),
    VS("Less than a year later", "ai_champagne_clip.mp4", texts=[(0.4, "Champions of the world.", "big"),
                                                                 (S("Both titles.") - S("Less than a year later", -0.15), "Both titles.", "big+"),
                                                                 (S("In its only season.") - S("Less than a year later", -0.15), "In its only season.", "mid+")]),
    CP("This is the story of Brawn GP", "Brawn BGP 001", zoom=(1.0, 1.1), strap=("Brawn GP", "2009", 0.6),
       fallback=AS("This is the story of Brawn GP", "ai_pit_wall_night.png", zoom=(1.0, 1.1))),
    # I. the end
    CuS("The team at Brackley", family_tree, chapter=CH("I", "THE END")),
    CP("Honda had spent a fortune", "Honda RA108", zoom=(1.0, 1.1), strap=("Honda RA108", "2008", 0.8)),
    CuS("Jenson Button scored just three", three_points),
    CuS("Then the financial crisis hit", honda_quits),
    AS("The factory was up for sale", "ai_for_sale.png", zoom=(1.0, 1.12), texts=[(1.8, "Nobody wanted to buy it.", "mid")]),
    # II. the gamble
    AS("But inside the factory", "ai_pit_garage_alt.png", zoom=(1.05, 1.18), focus=((0.55, 0.55), (0.6, 0.6)), chapter=CH("II", "THE GAMBLE"),
       texts=[(S("And the new car was fast") - S("But inside the factory", -0.15), "And the new car was fast.", "mid")]),
    CP("The team principal, Ross Brawn", "Ross Brawn", zoom=(1.0, 1.08), strap=("Ross Brawn", "TEAM PRINCIPAL", 0.6)),
    CP("With chief executive Nick Fry", "Nick Fry", zoom=(1.0, 1.08), strap=("Nick Fry", "CHIEF EXECUTIVE", 0.4)),
    CuS("The price?", price_tag),
    AS("Honda helped with the bills", "ai_for_sale_b.png", zoom=(1.0, 1.1), texts=[(2.6, "Hundreds of jobs cut.", "mid")]),
    CuS("There was another problem", engine_swap),
    Custom(SF("Now it needed a Mercedes", 0.45), clock_bomb),
    CuS("On the sixth of March", countdown),
    # III. the secret
    PS("The car was almost completely white", "Button_Spain_2009.jpg", zoom=(1.0, 1.12), chapter=CH("III", "THE SECRET"), strap=("Brawn BGP 001", "SPAIN  ·  2009", 0.8)),
    CuS("But at the back, under the rear wing", diffuser),
    PS("Brawn weren't the only team", "brawn_chassis_topdown.jpg", zoom=(1.0, 1.12), texts=[(0.9, "Williams and Toyota had one too.", "mid"),
                                                                                         (S("But they'd done it best") - S("Brawn weren't the only team", -0.15), "Brawn did it best.", "big")]),
    CuS("The rival teams were furious", protest, bg=bg_of(M + "Button_Spain_2009.jpg", 0.78)),
    # IV. the impossible
    CP("Melbourne.", "Albert Park circuit", zoom=(1.0, 1.1), chapter=CH("IV", "THE IMPOSSIBLE"), strap=("Albert Park", "MELBOURNE  ·  29 MARCH 2009", 1.2)),
    VS("The team's first ever race", "ai_pit_garage_clip.mp4"),
    PS("Jenson Button put the car on pole", "brawn_melbourne_2009.jpg", zoom=(1.0, 1.1), strap=("Jenson Button", "POLE POSITION  ·  MELBOURNE", 0.5)),
    CP("Rubens Barrichello qualified second", "Rubens Barrichello 2009", zoom=(1.0, 1.08), strap=("Rubens Barrichello", "SECOND", 0.4)),
    CuS("On Sunday, they finished", grid),
    PS("A team that hadn't existed", "Rubens-Barrichello-Ross-Brawn-Jenson-Button-A_2079770.jpg", zoom=(1.0, 1.08), strap=("Barrichello  ·  Brawn  ·  Button", "MELBOURNE  ·  29 MARCH 2009", 0.6)),
    CuS("And Button kept winning", win_tally),
    # V. the fight
    CuS("But the money was running out", lead_shrinks, chapter=CH("V", "THE FIGHT")),
    CP("It all came down to Brazil", "Interlagos", zoom=(1.0, 1.1), strap=("Interlagos", "SÃO PAULO  ·  18 OCTOBER 2009", 0.6),
       texts=[(S("A podium would guarantee") - S("It all came down to Brazil", -0.15) + 0.4, "A podium = the title.", "mid")]),
    CuS("But starting fourteenth", p14_to_p5),
    VS("As though fate had decided", "ai_interlagos_clip.mp4", skip=1.7, fallback=AS("As though fate had decided", "ai_interlagos_b.png", zoom=(1.0, 1.15))),
    AS("He fought his way up", "ai_interlagos_a.png", zoom=(1.0, 1.15), focus=((0.55, 0.6), (0.6, 0.62)),
       texts=[(0.3, "P14  →  P5", "big"), (SF("He fought his way up", 0.55) - S("He fought his way up", -0.15), "Barrichello: 8th. Enough.", "mid+")]),
    PS("Jenson Button was world champion", "button_brazil_celebrates.jpg", zoom=(1.0, 1.1), strap=("Jenson Button", "2009 WORLD CHAMPION", 0.3)),
    PS("And on the same day", "brawn-gp_63z6lxym2iob1ts8v86khmdyh.jpeg", zoom=(1.0, 1.08), texts=[(1.6, "Constructors' champions too.", "mid")]),
    # VI. what happened next
    CaS("And then, Brawn GP was gone", [{"k": "title", "text": "And then, it was gone.", "y": 450, "size": 120, "at": 0.3}], align="center",
        bg=FACTORY, chapter=CH("VI", "WHAT HAPPENED NEXT")),
    CP("At the end of the year, Mercedes", "Mercedes MGP W01", zoom=(1.0, 1.1), strap=("Mercedes", "2010  ·  SILVER", 0.6)),
    CuS("That team went on to win", eight_titles),
    CuS("The team that was worth one pound", one_pound),
    CuS("And Brawn GP?", record),
    # VII. what if
    CuS("So here's the question", what_if("The diffuser? Honda's car?", "Was it the double diffuser", "Or Ross Brawn?", "Or Ross Brawn"), chapter=CH("VII", "WHAT IF")),
    CuS("This was Impossible", impossible_end("Brawn GP.")),
]

if __name__ == "__main__":
    main(scenes, FINAL)
