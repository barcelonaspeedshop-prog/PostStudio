"""IMPOSSIBLE 01 v2: Brawn GP, the detailed cut -> PostDrive/Stories/IMPOSSIBLE series/01 Brawn GP/video/IMPOSSIBLE 01 v2 - Brawn GP.mp4

    ~/.venvs/poststudio/bin/python build_v2.py            # full render (+ review 720p)
    ~/.venvs/poststudio/bin/python build_v2.py 95 125     # preview slice (video seconds)

Script: script_v2.md. Narration: audio/v2 (Mike, Rode NT-USB+ unwrapped, Voice F). The diffuser explainer is airflow.py,
one continuous animated piece (Mike 10-14: an active graphic runs as long as it needs).
The helpers between the markers below are copied unchanged from build.py (v1).
"""
import math, os, sys
VDIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(VDIR, "..", "..", "..", "studio")); sys.path.insert(0, VDIR)
import episode as E
E.init("/Volumes/PostDrive/Omnira F1/Videos/Brawn GP (IMPOSSIBLE)/", series="impossible", narration="audio/v2/")
from episode import *
import airflow as AF

FINAL = "IMPOSSIBLE 01 v2 - Brawn GP.mp4"
YEL = (214, 240, 40)                                   # Brawn fluorescent yellow
SILVER = (200, 205, 212)
BLUE = (90, 170, 255)

# ---------------------------------------------------------------- v1 helpers (from build.py)
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
        k = 0.3 + i * 0.26; a = ramp(t, k, k + 0.12)
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

# ---------------------------------------------------------------- end of v1 helpers

# ---------------------------------------------------------------- v2 graphics
def split_bg(left, right, amount=0.45):
    """Two photos side by side (each cover-cropped to half the frame), dimmed, with a slow push-in."""
    def half(path, t):
        im = load(path); w, h = W // 2, H; z = 1.0 + 0.004 * t
        s_ = max(w / im.width, h / im.height) * z; vw, vh = w / s_, h / s_      # sub-pixel push-in (whole-pixel steps shook)
        x0, y0 = (im.width - vw) / 2, (im.height - vh) / 2
        return im.transform((w, h), Image.EXTENT, (x0, y0, x0 + vw, y0 + vh), Image.BICUBIC)
    def bg(t):
        im = Image.new("RGB", (W, H)); im.paste(half(left, t), (0, 0)); im.paste(half(right, t), (W // 2, 0))
        im = Image.blend(im, Image.new("RGB", (W, H), NAVY_D), amount)
        ImageDraw.Draw(im).line((W // 2, 0, W // 2, H), fill=GOLD, width=4)
        return im
    return bg

def crisis(d, L, t, sc):
    """2008: the market line crashes, then Honda quits."""
    k0 = at("Banks were collapsing", sc); q = atf("Banks were collapsing", 0.72, sc)
    tracked(d, (W / 2, 120), "THE FINANCIAL CRISIS  ·  2008", cond(38, 8), rgba(GOLD, ramp(t, 0, 0.4)), 8, "center")
    pts = [(200 + 1520 * i / 40, 300 + 520 * (i / 40) ** 1.6 + 26 * math.sin(i * 1.7) * (1 - i / 60)) for i in range(41)]
    p = max(0.0, min(1.0, (t - 0.2) / max(0.5, q - 0.4)))
    n = max(2, int(p * len(pts)))
    d.line((200, 860, 1740, 860), fill=rgba(CREAM, 0.35), width=3); d.line((200, 260, 200, 860), fill=rgba(CREAM, 0.35), width=3)
    d.line(pts[:n], fill=rgba(RED, 1), width=10, joint="curve")
    x, y = pts[n - 1]; d.ellipse((x - 14, y - 14, x + 14, y + 14), fill=rgba(RED, 1))
    for i, (lab, at_) in enumerate((("BANKS COLLAPSE", k0), ("CAR SALES FALL OFF A CLIFF", atf("Banks were collapsing", 0.35, sc)))):
        a = ramp(t, at_, at_ + 0.3) * (1 - ramp(t, q, q + 0.3))
        tracked(d, (1260, 330 + i * 90), lab, cond(46, 8), rgba(CREAM, a), 6, "center")
    b = ramp(t, q, q + 0.4)
    if b > 0:
        d.rectangle((0, 0, W, H), fill=rgba(NAVY_D, 0.86 * b))
        tracked(d, (W / 2, 290), "5 DECEMBER 2008", cond(44, 8), rgba(GOLD, b), 10, "center")
        text_top(d, (W / 2, 370), "Honda quits", pf(150, 900), rgba(CREAM, b), "center")
        text_top(d, (W / 2, 560), "Formula One.", pf(150, 900), rgba(CREAM, ramp(t, q + 0.3, q + 0.7)), "center")

def card_row(d, y, label, value, a, col=CREAM, vcol=YEL):
    if a <= 0: return
    x0, x1 = W / 2 - 560, W / 2 + 560; dy = 24 * (1 - a)
    d.rounded_rectangle((x0, y + dy, x1, y + 84 + dy), 12, fill=rgba(NAVY_D, 0.9 * a), outline=rgba(GOLD, a), width=3)
    tracked(d, (x0 + 40, y + 20 + dy), label, cond(42, 8), rgba(col, a), 6)
    tracked(d, (x1 - 40 - cond(42, 8).getlength(value) - 6 * len(value), y + 20 + dy), value, cond(42, 8), rgba(vcol, a), 6)

def gauge(d, cx, cy, r, frac, a, label="DOWNFORCE"):
    if a <= 0: return
    d.pieslice((cx - r, cy - r, cx + r, cy + r), 180, 360, fill=rgba(NAVY_D, 0.95 * a), outline=rgba(CREAM, a), width=6)
    for k in range(11):
        an = math.pi + k * math.pi / 10
        d.line((cx + 0.82 * r * math.cos(an), cy + 0.82 * r * math.sin(an), cx + 0.95 * r * math.cos(an), cy + 0.95 * r * math.sin(an)), fill=rgba(CREAM, a), width=5)
    an = math.pi + frac * math.pi
    d.line((cx, cy, cx + 0.78 * r * math.cos(an), cy + 0.78 * r * math.sin(an)), fill=rgba(RED, a), width=12)
    d.ellipse((cx - 22, cy - 22, cx + 22, cy + 22), fill=rgba(RED, a))
    tracked(d, (cx, cy + 40), label, cond(46, 8), rgba(GOLD, a), 10, "center")

def rules_2009(d, L, t, sc):
    """2008 car (fins everywhere) | 2009 car: each change ticks in, the winglets get BANNED, downforce halves."""
    a = ramp(t, 0.1, 0.5)
    tracked(d, (W / 4, 70), "2008", cond(64, 8), rgba(CREAM, a), 12, "center")
    tracked(d, (3 * W / 4, 70), "2009", cond(64, 8), rgba(YEL, a), 12, "center")
    rows = [("The front wings got wider", "FRONT WING", "WIDER, LOWER"), ("The rear wings got tall", "REAR WING", "TALL, SKINNY"),
            ("All the little fins", "FINS AND WINGLETS", "BANNED"), ("Slick tyres came back", "SLICK TYRES", "BACK")]
    g0 = at("And the whole point", sc); fade = 1 - ramp(t, g0, g0 + 0.4)
    for i, (snip, lab, val) in enumerate(rows):
        k = at(snip, sc); card_row(d, 520 + i * 104, lab, val, ramp(t, k, k + 0.35) * fade, vcol=RED if val == "BANNED" else YEL)
    kb = at("All the little fins", sc)
    if t > kb + 0.6: place_stamp(L, W / 4, 300, ramp(t, kb + 0.6, kb + 0.85) * fade, text="BANNED", size=120, color=RED, rot=-9)
    g = ramp(t, g0, g0 + 0.4)
    if g > 0:
        d.rectangle((0, 0, W, H), fill=rgba(NAVY_D, 0.75 * g))
        drop = ramp(t, atf("And the whole point", 0.55, sc), atf("And the whole point", 0.85, sc))
        gauge(d, W / 2, 640, 360, 1.0 - 0.5 * drop + 0.015 * math.sin(t * 9) * (1 - drop), g)
        tracked(d, (W / 2, 150), "THE WHOLE POINT OF 2009", cond(40, 8), rgba(GOLD, g), 8, "center")
        text_top(d, (W / 2, 760), "Roughly half.", pf(96, 900), rgba(CREAM, drop), "center")

TEAMS8 = [("FERRARI", 1.0), ("McLAREN", 0.96), ("BMW", 0.74), ("RENAULT", 0.66), ("TOYOTA", 0.58), ("HONDA", 0.30)]
def head_start(d, L, t, sc):
    tracked(d, (W / 2, 140), "WHO HAD THE HEAD START?", cond(44, 8), rgba(GOLD, ramp(t, 0, 0.4)), 8, "center")
    k = at("Which meant the big teams", sc); z = ramp(t, k + 0.6, k + 1.6)
    for i, (team, v) in enumerate(TEAMS8):
        a = ramp(t, 0.2 + 0.15 * i, 0.5 + 0.15 * i)
        if a <= 0: continue
        y = 260 + i * 110; grow = ramp(t, 0.3 + 0.15 * i, 1.1 + 0.15 * i)
        w = 1000 * (v * (1 - z) + 0.08 * z) * grow
        tracked(d, (560, y + 22), team, cond(44, 8), rgba(CREAM, a), 6, "right")
        d.rounded_rectangle((600, y + 10, 600 + max(12, w), y + 78), 10, fill=rgba(YEL if team == "HONDA" else GOLD, a))
    s = ramp(t, k + 1.4, k + 1.8)
    tracked(d, (W / 2, 960), "2009  ·  EVERYONE STARTS AGAIN", cond(48, 8), rgba(YEL, s), 10, "center")

def seven_titles(d, L, t, sc):
    tracked(d, (W / 2, 140), "ROSS BRAWN  ·  THE ENGINEER BEHIND SCHUMACHER'S TITLES", cond(36, 8), rgba(GOLD, ramp(t, 0, 0.4)), 6, "center")
    yrs = [1994, 1995, 2000, 2001, 2002, 2003, 2004]; x0 = W / 2 - 3 * 220; base = 640; landed = 0
    for i, yr in enumerate(yrs):
        k = 0.3 + i * 0.28; a = ramp(t, k, k + 0.12)
        if a <= 0: continue
        f = min(1.0, (t - k) / 0.35); drop = -280 * (1 - f) ** 2 + (14 * math.sin(f * math.pi) if f < 1 else 0)
        x = x0 + i * 220; landed += f >= 1
        trophy(d, x, base + drop, 200, a, GOLD if yr < 2000 else RED, ((t - k - 0.35) / 0.5) if t > k + 0.35 else -1)
        tracked(d, (x, base + 30), str(yr), cond(34, 8), rgba(CREAM, a), 4, "center")
    tracked(d, (W / 2, 720), "BENETTON  ·  1994–95          FERRARI  ·  2000–04", cond(34, 8), rgba(CREAM, 0.8 * ramp(t, 2.4, 2.8)), 6, "center")
    c = at("And he was convinced", sc); b = ramp(t, c, c + 0.4)
    text_top(d, (W / 2, 820), "And he was sure the new car was fast.", pf(70, 800), rgba(YEL, b), "center")

def engine_swap2(d, L, t, sc):
    tracked(d, (W / 2, 140), "THE ENGINE", cond(36, 2), rgba(GOLD, ramp(t, 0, 0.5)), 8, "center")
    a = ramp(t, 0.1, 0.5); k = at("The team did a deal", sc); m = ramp(t, k, k + 0.6)
    g = ramp(t, at("And Honda were gone", sc), at("And Honda were gone", sc) + 0.4)
    paste_fit(L, AI + "ai_engine_honda.png", 500, 520, 700, a * (1 - 0.55 * max(g, m)))
    tracked(d, (500, 830), "HONDA", cond(52, 8), rgba(CREAM, a * (1 - 0.55 * max(g, m))), 10, "center")
    if g > 0: d.line((230, 800, 230 + 540 * g, 800 - 540 * g), fill=rgba(RED, 1), width=14)
    if m > 0:
        arrow(d, (880, 520), (1040, 520), m, GOLD, 8, 26)
        paste_fit(L, AI + "ai_engine_mercedes.png", 1420, 520, 700, m)
        tracked(d, (1420, 830), "MERCEDES", cond(52, 8), rgba(SILVER, m), 10, "center")

def bolt_on(d, L, t, sc):
    """Why an engine swap is hard: engine and gearbox are part of the car's structure. Words pop on the AI workshop photo."""
    k = at("It bolts straight onto", sc)
    parts = [(k, "CHASSIS"), (atf("It bolts straight onto", 0.3, sc), "+  ENGINE"), (atf("It bolts straight onto", 0.65, sc), "+  GEARBOX")]
    for i, (k_, lab) in enumerate(parts):
        a = ramp(t, k_, k_ + 0.3)
        if a <= 0: continue
        x = 330 + i * 620; y = 160
        d.rounded_rectangle((x - 250, y + 20 * (1 - a), x + 250, y + 110 + 20 * (1 - a)), 14, fill=rgba(NAVY_D, 0.88 * a), outline=rgba(YEL, a), width=4)
        tracked(d, (x, y + 30 + 20 * (1 - a)), lab, cond(52, 8), rgba(CREAM, a), 8, "center")
    s0 = at("Different shape", sc)
    for i, (f, w) in enumerate(((0.0, "DIFFERENT SHAPE"), (0.33, "DIFFERENT MOUNTS"), (0.66, "DIFFERENT COOLING"))):
        k_ = atf("Different shape", f, sc); a = ramp(t, k_, k_ + 0.25)
        if a > 0: place_stamp(L, W / 2, 520 + i * 150, a, text=w, size=78, color=RED if i == 2 else GOLD, rot=-4 + 3 * i)

TEAMS_T = ["FERRARI", "McLAREN", "TOYOTA", "BMW", "WILLIAMS", "RENAULT", "RED BULL", "FORCE INDIA", "TORO ROSSO", "BRAWN"]
def timesheet(d, L, t, sc):
    """Barcelona test: Brawn jumps from the bottom of the timesheet to the top; the paddock scribbles doubts."""
    tracked(d, (W / 2, 90), "BARCELONA TEST  ·  MARCH 2009  ·  TIMESHEET", cond(38, 8), rgba(GOLD, ramp(t, 0, 0.4)), 8, "center")
    j = ramp(t, 0.6, 1.6)
    for i, team in enumerate(TEAMS_T):
        a = ramp(t, 0.05 * i, 0.05 * i + 0.3)
        pos = (9 - 9 * j) if team == "BRAWN" else (i + j)
        y = 170 + pos * 84; br = team == "BRAWN"
        d.rounded_rectangle((420, y, 1500, y + 70), 10, fill=rgba(YEL if br else NAVY_D, 0.92 * a), outline=rgba(GOLD, 0.6 * a), width=2)
        tracked(d, (470, y + 14), f"P{int(round(pos)) + 1}", cond(40, 8), rgba(NAVY_D if br else GOLD, a), 4)
        tracked(d, (600, y + 14), team, cond(40, 8), rgba(NAVY_D if br else CREAM, a), 6)
    for snip, txt, x, y, rot in (("The talk in the paddock", "LOW FUEL?", 1560, 260, 8), ("A publicity stunt", "STUNT?", 1580, 470, -6)):
        k = at(snip, sc); a = ramp(t, k + 0.5, k + 0.8)
        if a > 0:
            text_top(d, (x, y), txt, pf(84, 900), rgba(RED, a), "center")
    k = at("It wasn't a stunt", sc)
    if t > k: place_stamp(L, 1580, 700, ramp(t, k, k + 0.25), text="FAST", size=130, color=YEL, rot=-8)

def diffuser_cartoon(d, L, t, sc):
    """v1's cartoon double-decker, after the technical explainer."""
    tracked(d, (W / 2, 120), "THE DOUBLE DIFFUSER", cond(36, 2), rgba(GOLD, ramp(t, 0, 0.5)), 8, "center")
    a = ramp(t, 0.1, 0.5); x0, y0 = 300, 360
    car_side(d, x0, y0, a)
    ground = y0 + 305; d.line((150, ground, 1770, ground), fill=rgba(CREAM, 0.4 * a), width=3)
    two = ramp(t, 0.6, 1.1)
    d.polygon([(x0 + 930, y0 + 205), (x0 + 1100, y0 + 160), (x0 + 1100, y0 + 175), (x0 + 940, y0 + 215)], fill=rgba(GOLD, a))
    if two: d.polygon([(x0 + 930, y0 + 175), (x0 + 1100, y0 + 105), (x0 + 1100, y0 + 120), (x0 + 940, y0 + 188)], fill=rgba(YEL, two))
    flow(d, [(150, ground - 30), (x0 + 900, ground - 30), (x0 + 1180, y0 + 140)], t, a, CREAM, n=14, speed=0.45, r=5)
    if two: flow(d, [(x0 + 700, y0 + 180), (x0 + 940, y0 + 180), (x0 + 1180, y0 + 80)], t, two, YEL, n=10, speed=0.45, r=5)
    s = ramp(t, 1.3, 1.8)
    for k in range(5):
        x = 500 + k * 220; arrow(d, (x, y0 - 60 + 8 * math.sin(t * 5 + k)), (x, y0 + 40 + 8 * math.sin(t * 5 + k)), s, GOLD, 6, 20)
    label(d, (x0 + 1130, y0 + 210), "TWO LAYERS", two, YEL, 34)
    e = at("In Formula One, that's", sc); b = ramp(t, e - 1.2, e - 0.8)
    text_top(d, (W / 2, 790), "+0.5 s a lap", pf(110, 900), rgba(YEL, b), "center")
    tracked(d, (W / 2, 950), "AN ETERNITY", cond(48, 8), rgba(CREAM, ramp(t, e + 0.3, e + 0.7)), 12, "center")

def battery(d, x, y, w, h, level, a, col=YEL):
    d.rounded_rectangle((x, y, x + w, y + h), 18, outline=rgba(CREAM, a), width=8, fill=rgba(NAVY_D, 0.9 * a))
    d.rectangle((x + w, y + h * 0.32, x + w + 30, y + h * 0.68), fill=rgba(CREAM, a))
    if level > 0: d.rounded_rectangle((x + 14, y + 14, x + 14 + (w - 28) * level, y + h - 14), 10, fill=rgba(col, a))

def kers(d, L, t, sc):
    """KERS: battery charges under braking, BOOST drains it; then the scales tip towards the lighter Brawn."""
    tracked(d, (W / 2, 110), "NEW FOR 2009  ·  KERS", cond(44, 8), rgba(GOLD, ramp(t, 0, 0.4)), 8, "center")
    s0 = at("It stored energy", sc); b0 = atf("It stored energy", 0.55, sc); sc0 = at("Brawn didn't have one", sc)
    ph = 1 - ramp(t, sc0 - 0.3, sc0)
    if ph > 0:
        lvl = 0.15 + 0.85 * ramp(t, s0, b0) - 0.85 * ramp(t, b0 + 0.2, b0 + 1.6) if t < b0 + 1.6 else 0.15 + 0.85 * (0.5 + 0.5 * math.sin((t - b0) * 1.6))
        battery(d, 560, 330, 800, 300, max(0.05, lvl), ph)
        lab = "BRAKING CHARGES IT" if t < b0 else "BOOST  ·  ABOUT 80 HP"
        tracked(d, (W / 2, 690), lab, cond(52, 8), rgba(YEL if t >= b0 else CREAM, ph * ramp(t, s0, s0 + 0.4)), 8, "center")
        if t >= b0 + 0.2:
            for k in range(3):                                                   # lightning while boosting
                fl = 0.5 + 0.5 * math.sin(t * 20 + k * 2)
                x = 700 + k * 260; pts = [(x, 220), (x - 40, 300), (x + 10, 300), (x - 30, 380)]
                d.line(pts, fill=rgba(YEL, ph * fl), width=10)
        m0 = at("Several of the big teams", sc); m = ramp(t, m0, m0 + 0.3) * ph
        if m > 0:
            for k in range(14):                                                  # money raining
                x = 200 + (k * 137) % 1520; y = ((t - m0) * 420 + k * 97) % 900 + 140
                text_top(d, (x, y), "£", pf(70, 900), rgba(GOLD, m), "center")
            tracked(d, (W / 2, 800), "BIG TEAMS SPENT FORTUNES ON IT", cond(46, 8), rgba(CREAM, m), 8, "center")
    q = ramp(t, sc0 - 0.2, sc0 + 0.3)
    if q > 0:                                                                    # the scales
        tilt = 0.22 * ramp(t, sc0 + 0.4, sc0 + 1.4) + 0.02 * math.sin(t * 3)
        cx, cy, half = W / 2, 420, 560
        d.polygon([(cx, cy), (cx - 70, 860), (cx + 70, 860)], fill=rgba(CREAM, q))
        lx, ly = cx - half * math.cos(tilt), cy + half * math.sin(tilt); rx, ry = cx + half * math.cos(tilt), cy - half * math.sin(tilt)
        d.line((lx, ly, rx, ry), fill=rgba(CREAM, q), width=12)
        for (px, py, lab, col, heavy) in ((lx, ly, "KERS CARS", RED, True), (rx, ry, "BRAWN", YEL, False)):
            d.line((px, py, px - 120, py + 160), fill=rgba(CREAM, q), width=4); d.line((px, py, px + 120, py + 160), fill=rgba(CREAM, q), width=4)
            d.rounded_rectangle((px - 170, py + 160, px + 170, py + 190), 10, fill=rgba(CREAM, q))
            if heavy: battery(d, px - 110, py + 70, 200, 80, 0.8, q, RED)
            tracked(d, (px, py + 215), lab, cond(46, 8), rgba(col, q), 8, "center")
        for i, w in enumerate(("LIGHTER", "SIMPLER", "BETTER BALANCED")):
            k = atf("Their car was lighter", 0.25 * i, sc); a = ramp(t, k, k + 0.3)
            if a > 0: place_stamp(L, 380 + i * 580, 980, a, text=w, size=64, color=YEL, rot=-5 + 4 * i)

RIVALS = [("FERRARI", 0.9), ("McLAREN", 0.8), ("RED BULL", 1.0), ("RENAULT", 0.7), ("BMW", 0.55)]
def copying(d, L, t, sc):
    tracked(d, (W / 2, 120), "COPYING THE DOUBLE DIFFUSER ...", cond(44, 8), rgba(GOLD, ramp(t, 0, 0.4)), 8, "center")
    end = at("And months were all Brawn", sc); p = max(0.0, min(1.0, (t - 0.5) / max(1.0, end - 0.5)))
    months = ["APRIL", "MAY", "JUNE", "JULY"]; mi = min(3, int(p * 4))
    tracked(d, (W / 2, 200), months[mi], cond(64, 8), rgba(CREAM, ramp(t, 0.3, 0.6)), 14, "center")
    for i, (team, sp) in enumerate(RIVALS):
        a = ramp(t, 0.2 + 0.1 * i, 0.5 + 0.1 * i); y = 320 + i * 110
        if a <= 0: continue
        tracked(d, (560, y + 18), team, cond(44, 8), rgba(CREAM, a), 6, "right")
        d.rounded_rectangle((600, y + 10, 1600, y + 74), 10, outline=rgba(CREAM, 0.6 * a), width=3)
        f = min(1.0, p * sp * 1.05) + 0.01 * math.sin(t * 7 + i)
        d.rounded_rectangle((608, y + 18, 608 + 984 * max(0.02, f), y + 66), 8, fill=rgba(GOLD if f < 0.98 else YEL, a))
    b = ramp(t, end, end + 0.4)
    if b > 0:
        d.rectangle((0, 0, W, H), fill=rgba(NAVY_D, 0.8 * b))
        text_top(d, (W / 2, 380), "Brawn were already winning.", pf(100, 900), rgba(YEL, b), "center")

WINS2 = [("Melbourne.", "AUS"), ("Malaysia, where", "MAL"), (None, "CHN"), ("Bahrain.", "BHR"), ("Spain.", "ESP"), ("Monaco, where", "MON"), ("And Turkey.", "TUR")]
def win_tally2(d, L, t, sc):
    tracked(d, (W / 2, 200), "2009  ·  THE FIRST SEVEN RACES", cond(36, 2), rgba(GOLD, ramp(t, 0, 0.5)), 8, "center")
    x0 = W / 2 - 3 * 230
    rain = ramp(t, at("Malaysia, where", sc), at("Malaysia, where", sc) + 0.3) * (1 - ramp(t, at("Bahrain.", sc) - 0.3, at("Bahrain.", sc)))
    if rain > 0:                                                                 # Malaysia: the rain
        for k in range(70):
            x = (k * 151) % W; y = ((t * 900 + k * 233) % (H + 100)) - 50
            d.line((x, y, x - 10, y + 40), fill=rgba(BLUE, 0.6 * rain), width=3)
    for i, (snip, code) in enumerate(WINS2):
        x = x0 + i * 230
        if snip == "Melbourne.": k = 0.2
        elif snip: k = at(snip, sc)
        else: k = at("Bahrain.", sc) - 0.3
        a = ramp(t, k, k + 0.3)
        if a <= 0: continue
        win = snip is not None; sq = 1 + 0.25 * (1 - ramp(t, k, k + 0.25))
        r = 85 * sq
        d.ellipse((x - r, 485 - r, x + r, 485 + r), fill=rgba(YEL if win else NAVY_D, a), outline=rgba(YEL if win else CREAM, a), width=5)
        tracked(d, (x, 462), "WIN" if win else "–", cond(48, 8), rgba(NAVY_D if win else CREAM, a), 4, "center")
        tracked(d, (x, 610), code, cond(40, 8), rgba(CREAM, a), 6, "center")
        if code == "MAL": tracked(d, (x, 660), "HALF POINTS", cond(32, 8), rgba(BLUE, ramp(t, atf("Malaysia, where", 0.6, sc), atf("Malaysia, where", 0.6, sc) + 0.3)), 4, "center")
    m0 = atf("Monaco, where", 0.45, sc); m1 = at("And Turkey.", sc)
    if m0 < t < m1 + 0.5:                                                        # Monaco: the jog to the podium
        f = (t - m0) / max(0.5, m1 - m0); x = 200 + 1500 * min(1, f); y = 800; ph = t * 14
        a = 1 - ramp(t, m1, m1 + 0.5)
        d.ellipse((x - 16, y - 120, x + 16, y - 88), fill=rgba(CREAM, a))
        d.line((x, y - 88, x, y - 30), fill=rgba(CREAM, a), width=8)
        for s_ in (1, -1):
            d.line((x, y - 30, x + 26 * math.sin(ph) * s_, y + 10), fill=rgba(CREAM, a), width=8)
            d.line((x, y - 75, x + 30 * math.sin(ph + 3) * s_, y - 45), fill=rgba(CREAM, a), width=6)
        tracked(d, (1700, 720), "TO THE PODIUM", cond(40, 8), rgba(GOLD, a), 6, "center")
    s = ramp(t, at("Six wins from", sc), at("Six wins from", sc) + 0.4)
    text_top(d, (W / 2, 830), "Six wins from seven.", pf(100, 900), rgba(GOLD, s), "center")

def cold_tyre(d, L, t, sc):
    """Over the AI tyre photo: a thermometer stuck in the blue."""
    g = at("The Brawn was gentle", sc); c = at("But on cold days", sc); n = at("And a cold tyre", sc)
    tracked(d, (W / 2, 80), "GENTLE ON ITS TYRES", cond(46, 8), rgba(CREAM, ramp(t, g, g + 0.4) * (1 - ramp(t, c - 0.2, c + 0.2))), 8, "center")
    x, y0, y1 = 1640, 200, 820; a = ramp(t, 0.2, 0.6)
    d.rounded_rectangle((x - 40, y0, x + 40, y1), 40, fill=rgba(NAVY_D, 0.85 * a), outline=rgba(CREAM, a), width=6)
    d.ellipse((x - 75, y1 - 60, x + 75, y1 + 90), fill=rgba(NAVY_D, 0.85 * a), outline=rgba(CREAM, a), width=6)
    warm = 0.75 - 0.55 * ramp(t, c, c + 1.2) + 0.03 * math.sin(t * 6)
    col = tuple(int(BLUE[j] + (RED[j] - BLUE[j]) * max(0, min(1, (warm - 0.2) / 0.55))) for j in range(3))
    d.ellipse((x - 55, y1 - 40, x + 55, y1 + 70), fill=rgba(col, a)); d.rectangle((x - 20, y1 - (y1 - y0 - 40) * warm, x + 20, y1), fill=rgba(col, a))
    tracked(d, (x - 120, y0 + 20), "HOT  ·  GRIP", cond(30, 8), rgba(RED, a), 4, "right")
    tracked(d, (x - 120, y1 - 60), "COLD", cond(30, 8), rgba(BLUE, a), 4, "right")
    b = ramp(t, n, n + 0.3)
    if b > 0: place_stamp(L, 700, 860, b, text="NO GRIP", size=120, color=BLUE, rot=-7)

def lead_countdown(d, L, t, sc):
    """Button's lead: +26 after Turkey (61 v 35) counting down to +14 before Brazil (85 v 71)."""
    tracked(d, (W / 2, 160), "BUTTON'S CHAMPIONSHIP LEAD", cond(36, 2), rgba(GOLD, ramp(t, 0, 0.5)), 8, "center")
    a = ramp(t, 0.2, 0.6)
    tracked(d, (W / 2, 820), "WINS SINCE TURKEY:  0", cond(44, 8), rgba(RED, ramp(t, 0.8, 1.2)), 10, "center")
    k0 = at("Barrichello won twice", sc); f = ramp(t, k0, sc.dur - 0.8) if t > k0 else 0
    v = round(26 - 12 * f)
    sh = 6 * math.sin(t * 40) if 0 < f < 1 else 0
    text_top(d, (W / 2 + sh, 300), f"+{v}", pf(300, 900), rgba(YEL if v > 20 else RED, a), "center")
    tracked(d, (W / 2, 690), "AFTER TURKEY  ·  RACE 7" if f < 0.05 else ("BEFORE BRAZIL  ·  RACE 16" if f >= 1 else "RACE BY RACE ..."), cond(40, 8), rgba(CREAM, a), 8, "center")

def brazil_grid(d, L, t, sc):
    """Brazil 2009: the grid after the rain. Barrichello on pole, Button 14th; the podium is a long way up."""
    tracked(d, (W / 2, 60), "BRAZIL 2009  ·  THE GRID", cond(40, 8), rgba(GOLD, ramp(t, 0, 0.4)), 8, "center")
    p1 = at("Barrichello, at home", sc); pod = at("A podium would", sc); far = at("From fourteenth", sc)
    for p in range(1, 21):
        a = ramp(t, 0.05 * p, 0.05 * p + 0.25)
        if a <= 0: continue
        row = (p - 1) // 2; col = (p - 1) % 2
        x = 640 + col * 520; y = 140 + row * 86 + (40 if col else 0)
        me = p == 14; bar = p == 1
        hl = (me and 1.0) or (bar and ramp(t, p1, p1 + 0.3)) or 0
        fill = YEL if me else (CREAM if bar and hl else NAVY_D)
        glow = 0.5 + 0.5 * math.sin(t * 6) if me else 0
        d.rounded_rectangle((x - 200, y, x + 200, y + 70), 10, fill=rgba(fill, (0.9 if (me or (bar and hl)) else 0.75) * a), outline=rgba(GOLD, a), width=3 + int(4 * glow))
        name = "BUTTON" if me else ("BARRICHELLO" if bar and hl else "")
        tracked(d, (x - 175, y + 14), f"P{p}", cond(38, 8), rgba(NAVY_D if (me or (bar and hl)) else GOLD, a), 4)
        if name: tracked(d, (x + 40, y + 14), name, cond(38, 8), rgba(NAVY_D, a), 6, "center")
    q = ramp(t, pod, pod + 0.4)
    if q > 0:
        d.rectangle((410, 128, 1430, 128 + 2 * 86 + 4), outline=rgba(YEL, q), width=6)
        tracked(d, (1440 + 40, 160), "PODIUM", cond(40, 8), rgba(YEL, q), 6)
        tracked(d, (1440 + 40, 206), "= THE TITLE", cond(40, 8), rgba(YEL, q), 6)
    r = ramp(t, far, far + 0.8)
    if r > 0: arrow(d, (1500, 140 + 6 * 86 + 60), (1500, 140 + 2 * 86 + 30), r, RED, 8, 28); tracked(d, (1530, 140 + 5 * 86), "A LONG WAY", cond(36, 8), rgba(RED, r), 4)

def p14_to_p5_2(d, L, t, sc):
    tracked(d, (W / 2, 160), "BRAZILIAN GRAND PRIX  ·  2009", cond(36, 2), rgba(GOLD, ramp(t, 0, 0.5)), 8, "center")
    a = ramp(t, 0.1, 0.5); s0 = 0.4
    p = 14 - min(9, int(max(0, t - s0) * 2.2))
    jig = 10 * math.sin(t * 30) if 5 < p < 14 else 0
    text_top(d, (W / 2 + jig, 290), f"P{p}", pf(300, 900), rgba(YEL if p <= 5 else CREAM, a), "center")
    tracked(d, (W / 2, 660), "BUTTON  ·  STARTED" if p == 14 else ("BUTTON  ·  FINISHED" if p == 5 else "BUTTON  ·  PASSING CAR AFTER CAR"), cond(40, 8), rgba(CREAM, a), 8, "center")
    k = at("Barrichello picked up", sc); b = ramp(t, k, k + 0.4)
    tracked(d, (W / 2, 760), "BARRICHELLO  ·  PUNCTURE  ·  8TH", cond(40, 8), rgba(GOLD, b), 8, "center")
    e = at("It was enough", sc); c = ramp(t, e, e + 0.3)
    if c > 0: place_stamp(L, W / 2, 900, c, text="ENOUGH", size=110, color=YEL, rot=-6)

def record4(d, L, t, sc):
    tracked(d, (W / 2, 240), "BRAWN GP", cond(48, 8), rgba(YEL, ramp(t, 0.1, 0.5)), 14, "center")
    cols = [("One season.", "1", "SEASON"), ("Eight wins.", "8", "WINS"), ("Two championships.", "2", "TITLES"), ("A perfect record", "100%", "PERFECT")]
    for i, (snip, big, lab) in enumerate(cols):
        a = ramp(t, at(snip, sc), at(snip, sc) + 0.35); x = W / 2 + (i - 1.5) * 420
        if a <= 0: continue
        sq = 1 + 0.2 * (1 - ramp(t, at(snip, sc), at(snip, sc) + 0.3))
        text_top(d, (x, 380), big, pf(int(180 * sq), 900), rgba(CREAM if i < 3 else GOLD, a), "center")
        tracked(d, (x, 680), lab, cond(40, 8), rgba(GOLD, a), 10, "center")


def family_tree2(d, L, t, sc):
    """One factory, many names: big and on the factory picture from the first frame."""
    tracked(d, (W / 2, 200), "BRACKLEY, ENGLAND  ·  ONE FACTORY, MANY NAMES", cond(40, 8), rgba(GOLD, ramp(t, 0.1, 0.5)), 8, "center")
    text_top(d, (W / 2, 290), "Brackley.", pf(110, 900), rgba(CREAM, ramp(t, 0.2, 0.6) * (1 - ramp(t, at("Tyrrell.", sc) - 0.3, at("Tyrrell.", sc)))), "center")
    names = [("Tyrrell.", "Tyrrell"), ("BAR.", "BAR"), ("And then Honda.", "Honda")]
    xs = [420, 960, 1500]
    for i, ((snip, txt), x) in enumerate(zip(names, xs)):
        a = ramp(t, at(snip, sc) - 0.1, at(snip, sc) + 0.25)
        if a <= 0: continue
        if i: arrow(d, (xs[i - 1] + 170, 560), (x - 170, 560), a, GOLD, 6, 20)
        sq = 1 + 0.25 * (1 - a)
        text_top(d, (x, 480 + 30 * (1 - a)), txt, pf(int(120 * sq), 900), rgba(YEL if txt == "Honda" else CREAM, a), "center")

RACES08 = ["AUS", "MAL", "BHR", "ESP", "TUR", "MON", "CAN", "FRA", "GBR", "GER", "HUN", "EUR", "BEL", "ITA", "SIN", "JPN", "CHN", "BRA"]
def points_2008(d, L, t, sc):
    """Button's 2008, race by race: 18 boxes, one 6th place (3 points) in Spain, the rest zero."""
    tracked(d, (W / 2, 150), "JENSON BUTTON  ·  2008  ·  POINTS, RACE BY RACE", cond(40, 8), rgba(GOLD, ramp(t, 0, 0.4)), 8, "center")
    span = max(2.0, sc.dur - 2.6); tot = 0
    for i, code in enumerate(RACES08):
        k = 0.3 + span * i / 18; a = ramp(t, k, k + 0.2)
        if a <= 0: continue
        x = W / 2 + (i % 9 - 4) * 190; y = 300 + (i // 9) * 230; pts = 3 if code == "ESP" else 0; tot += pts
        sq = 1 + 0.2 * (1 - a)
        d.rounded_rectangle((x - 80 * sq, y, x + 80 * sq, y + 150 * sq), 12, fill=rgba(YEL if pts else NAVY_D, 0.92 * a), outline=rgba(GOLD, a), width=3)
        text_top(d, (x, y + 18), str(pts), pf(76, 900), rgba(NAVY_D if pts else CREAM, a), "center")
        tracked(d, (x, y + 112), code, cond(30, 8), rgba(NAVY_D if pts else GOLD, a), 4, "center")
    tracked(d, (W / 2, 820), "TOTAL", cond(40, 8), rgba(CREAM, ramp(t, 0.3, 0.6)), 10, "center")
    text_top(d, (W / 2, 860), str(tot), pf(130, 900), rgba(RED, ramp(t, 0.3, 0.6)), "center")

def jobs_cut(d, L, t, sc):
    """700 people; 270 of them turn red and drop away."""
    tracked(d, (W / 2, 110), "THE TEAM  ·  ABOUT 700 PEOPLE", cond(44, 8), rgba(GOLD, ramp(t, 0, 0.3)), 8, "center")
    cut = ramp(t, 0.5, 0.9); fall0 = 1.0
    import random
    rnd = random.Random(4); gone = set(rnd.sample(range(700), 270))
    for i in range(700):
        a = ramp(t, i / 700 * 0.4, i / 700 * 0.4 + 0.15)
        if a <= 0: continue
        cx = 260 + (i % 35) * 40; cy = 220 + (i // 35) * 32
        if i in gone:
            f = max(0.0, t - fall0 - (i % 37) * 0.03); cy += 900 * f * f
            if cy > H + 20: continue
            col = tuple(int(CREAM[j] + (RED[j] - CREAM[j]) * cut) for j in range(3))
        else: col = CREAM
        d.ellipse((cx - 11, cy - 11, cx + 11, cy + 11), fill=rgba(col, a))
    b = ramp(t, 1.2, 1.6)
    if b > 0:
        d.rounded_rectangle((W / 2 - 420, 900, W / 2 + 420, 1010), 16, fill=rgba(NAVY_D, 0.9 * b), outline=rgba(RED, b), width=4)
        tracked(d, (W / 2, 928), "ABOUT 270 JOBS LOST", cond(56, 8), rgba(RED, b), 10, "center")

class Explainer(Scene):
    """The airflow.py explainer as a scene (a frame function of local time)."""
    def __init__(self, start, fn, **kw): super().__init__(start, **kw); self.fn = fn
    def base(self, t): return self.fn(t)

def explainer(snip, maker, off=-0.15, **kw):
    t0 = S(snip, off)
    return Explainer(t0, maker(AI + "ai_cutaway_side.png", lambda k: S(k) - t0), **kw)

# ---------------------------------------------------------------- timeline
FACTORY = AI + "ai_empty_factory.png"
BRAWN09 = C + "2009_Brawn_BGP_001_Goodwood,_2009_(01).jpg"
scenes = [
    opening(FACTORY, "Brawn GP.", "EPISODE ONE  ·  THE TEAM BOUGHT FOR £1", credit="AI illustration"),
    # cold open
    VS("In December 2008", "ai_empty_factory_clip_v2.mp4", off=0, chapter="BRACKLEY  ·  DECEMBER 2008"),
    CuS("No owner.", nothing_left, bg=bg_of(FACTORY, 0.8)),
    VS("Less than a year later", "ai_champagne_clip.mp4", texts=[(0.4, "Champions of the world.", "big"),
                                                                 (S("Both titles.") - S("Less than a year later", -0.15), "Both titles.", "big+"),
                                                                 (S("In its only season.") - S("Less than a year later", -0.15), "In its only season.", "mid+")]),
    AS("And the secret was hidden", "ai_diffuser_closeup.png", zoom=(1.0, 1.15), focus=((0.5, 0.6), (0.5, 0.7)),
       texts=[(SF("And the secret was hidden", 0.55) - S("And the secret was hidden", -0.15), "A part most fans had never heard of.", "mid")]),
    CP("This is the story of Brawn GP", "Brawn BGP 001", zoom=(1.0, 1.1), strap=("Brawn GP", "2009", 0.6)),
    # I. the end
    CuS("The team at Brackley", family_tree2, chapter=CH("I", "THE END"), bg=bg_of(AI + "ai_for_sale.png", 0.7)),
    CP("Honda had spent a fortune", "Honda RA108", zoom=(1.0, 1.1), strap=("Honda RA108", "2008", 0.8),
       texts=[(SF("Wind tunnels, hundreds", 0.0) - S("Honda had spent a fortune", -0.15), "One of the biggest budgets in F1.", "mid")]),
    CuS("And in 2008, the car was", points_2008, bg=bg_of(C + "Jenson_Button_2008_Britain.jpg", 0.85)),
    CuS("Then the financial crisis hit", crisis),
    AS("The factory was up for sale", "ai_for_sale.png", zoom=(1.0, 1.12), texts=[(S("And nobody wanted to buy it") - S("The factory was up for sale", -0.15), "Nobody wanted to buy it.", "mid")]),
    # II. the car nobody had seen
    AS("But inside the factory", "ai_pit_garage_alt.png", zoom=(1.05, 1.18), focus=((0.55, 0.55), (0.6, 0.6)), chapter=CH("II", "THE CAR NOBODY HAD SEEN")),
    CP("For 2009, Formula One was tearing", "2008 car", zoom=(1.0, 1.12), strap=("McLaren MP4-23", "2008  ·  FINS EVERYWHERE", 0.6)),
    CuS("The front wings got wider", rules_2009, off=-0.6, bg=split_bg(C + "McLaren_MP4-23_2008.jpg", BRAWN09)),
    CuS("Every team was starting again", head_start, bg=bg_of(AI + "ai_rule_book.png", 0.82)),
    CP("And Honda had seen it coming", "Honda RA108", n=1, zoom=(1.0, 1.1), strap=("Honda", "GAVE UP ON 2008 EARLY", 0.8)),
    AS("Wind tunnels running day and night", "ai_wind_tunnel.png", zoom=(1.0, 1.14), focus=((0.45, 0.5), (0.55, 0.5)), texts=[(0.8, "Day and night, for over a year.", "mid")]),
    CP("The man in charge was Ross Brawn", "Ross Brawn", zoom=(1.0, 1.08), strap=("Ross Brawn", "TECHNICAL GENIUS", 0.6)),
    CuS("He was the engineer behind seven", seven_titles),
    # III. the gamble
    CP("So Ross Brawn refused to let it die", "Ross Brawn", zoom=(1.12, 1.0), chapter=CH("III", "THE GAMBLE")),
    PS("With the chief executive, Nick Fry", "nick-fry-2.jpg", zoom=(1.0, 1.08), focus=((0.45, 0.45), (0.45, 0.42)), strap=("Nick Fry", "CHIEF EXECUTIVE", 0.4)),
    CuS("The price?", price_tag),
    AS("It wasn't quite as good a deal", "ai_for_sale_b.png", zoom=(1.0, 1.1),
       texts=[(S("Honda helped with the bills") - S("It wasn't quite as good a deal", -0.15), "Honda paid some of the bills.", "mid")]),
    CuS("About two hundred and seventy", jobs_cut, bg=bg_of(AI + "ai_for_sale_b.png", 0.85)),
    CP("And Jenson Button reportedly took", "Jenson Button 2009", zoom=(1.0, 1.1), strap=("Jenson Button", "TOOK A PAY CUT TO STAY", 0.5)),
    CuS("Then there was the engine", engine_swap2),
    CuS("But an engine isn't a battery", bolt_on, bg=bg_of(AI + "ai_engine_swap.png", 0.45)),
    Custom(S("The back of the car had to be reworked", -0.15), clock_bomb),
    CuS("On the sixth of March", countdown),
    # IV. the first test
    AS("Three days later", "ai_barcelona_test.png", zoom=(1.0, 1.12), chapter=CH("IV", "THE FIRST TEST"), strap=("Barcelona", "FIRST TEST  ·  MARCH 2009", 1.0)),
    CuS("It went straight to the top", timesheet, bg=bg_of(AI + "ai_barcelona_test.png", 0.85)),
    PS("The car was almost completely white", "Button_Spain_2009.jpg", zoom=(1.0, 1.12), texts=[(1.6, "No money for sponsors.", "mid")]),
    PS("Just a few days before the first race", "2009_Brawn_BGP_001_Goodwood,_2009_(01).jpg", zoom=(1.0, 1.12), texts=[(1.8, "Then Virgin signed up.", "mid")]),
    AS("But the real reason it was so fast", "ai_underside.png", zoom=(1.0, 1.15)),
    # V. the secret: one continuous explainer, then the cartoon
    explainer("Okay.", AF.diffuser_scene, chapter=CH("V", "THE SECRET")),
    explainer("Now remember those new rules", AF.double_diffuser_scene),
    CuS("Some reckoned", diffuser_cartoon),
    CuS("And there was one more thing", kers, bg=bg_of(BRAWN09, 0.85)),
    PS("Sometimes the smartest upgrade", "Button_Spain_2009.jpg", zoom=(1.1, 1.0), texts=[(0.6, "Less was more.", "big")]),
    PS("Brawn weren't the only team", "brawn_chassis_topdown.jpg", zoom=(1.0, 1.12), texts=[(S("Two other teams") - S("Brawn weren't the only team", -0.15), "Williams and Toyota had one too.", "mid"),
                                                                                         (S("But Brawn had done it best") - S("Brawn weren't the only team", -0.15), "Brawn did it best.", "big")]),
    CuS("The rival teams were furious", protest, bg=bg_of(M + "Button_Spain_2009.jpg", 0.78)),
    CuS("By then, everyone else", copying, bg=bg_of(AI + "ai_wind_tunnel.png", 0.85)),
    # VI. the impossible
    CP("Melbourne.", "Albert Park circuit", zoom=(1.0, 1.1), chapter=CH("VI", "THE IMPOSSIBLE"), strap=("Albert Park", "MELBOURNE  ·  29 MARCH 2009", 1.2)),
    VS("The team's first ever race", "ai_pit_garage_clip.mp4"),
    PS("Jenson Button put the car on pole", "brawn_melbourne_2009.jpg", zoom=(1.0, 1.1), strap=("Jenson Button", "POLE POSITION  ·  MELBOURNE", 0.5)),
    CP("Rubens Barrichello qualified second", "Rubens Barrichello 2009", zoom=(1.0, 1.08), strap=("Rubens Barrichello", "SECOND", 0.4)),
    CuS("On Sunday, they finished", grid, bg=bg_of(M + "brawn_melbourne_2009.jpg", 0.8)),
    PS("A team that hadn't existed", "Rubens-Barrichello-Ross-Brawn-Jenson-Button-A_2079770.jpg", zoom=(1.0, 1.08), strap=("Barrichello  ·  Brawn  ·  Button", "MELBOURNE  ·  29 MARCH 2009", 0.6)),
    CuS("And Button kept winning", win_tally2),
    # VII. the fight
    AS("But the money was running out", "ai_for_sale.png", zoom=(1.12, 1.0), chapter=CH("VII", "THE FIGHT"),
       texts=[(S("And the big teams were catching up") - S("But the money was running out", -0.15), "The big teams were catching up.", "mid")]),
    CP("Red Bull brought their own", "Sebastian Vettel 2009", zoom=(1.0, 1.1), strap=("Sebastian Vettel", "RED BULL  ·  2009", 1.2),
       texts=[(S("And Brawn simply couldn't afford") - S("Red Bull brought their own", -0.15), "Brawn couldn't afford to keep up.", "mid")]),
    CuS("There was another problem, too", cold_tyre, bg=bg_of(AI + "ai_cold_tyre.png", 0.25)),
    CuS("In the second half of the season", lead_countdown, bg=bg_of(C + "Sebastian_Vettel_2009_Italy.jpg", 0.85)),
    CP("It all came down to Brazil", "Interlagos", zoom=(1.0, 1.1), strap=("Interlagos", "SÃO PAULO  ·  18 OCTOBER 2009", 0.6)),
    AS("Qualifying was hit by rain", "ai_brazil_rain.png", zoom=(1.0, 1.15), focus=((0.5, 0.55), (0.55, 0.6))),
    CuS("Button would start fourteenth", brazil_grid),
    VS("But this time, Button didn't need luck", "ai_interlagos_clip.mp4", skip=1.7, fallback=AS("But this time, Button didn't need luck", "ai_interlagos_b.png", zoom=(1.0, 1.15))),
    AS("He drove one of the best races", "ai_brazil_overtake.png", zoom=(1.0, 1.15), focus=((0.4, 0.55), (0.5, 0.55))),
    Custom(SF("He drove one of the best races", 0.6), p14_to_p5_2),
    PS("Jenson Button was world champion", "button_brazil_celebrates.jpg", zoom=(1.0, 1.1), strap=("Jenson Button", "2009 WORLD CHAMPION", 0.3)),
    PS("And on the same day", "brawn-gp_63z6lxym2iob1ts8v86khmdyh.jpeg", zoom=(1.0, 1.08), texts=[(1.6, "Constructors' champions too.", "mid")]),
    # VIII. what happened next
    CaS("And then, Brawn GP was gone", [{"k": "title", "text": "And then, it was gone.", "y": 450, "size": 120, "at": 0.3}], align="center",
        bg=FACTORY, chapter=CH("VIII", "WHAT HAPPENED NEXT")),
    PS("At the end of the year, Mercedes", "2009_Brawn_BGP_001_Goodwood,_2009_(01).jpg", zoom=(1.12, 1.0), texts=[(0.8, "Mercedes bought the team.", "mid")]),
    CP("The next season, the cars were silver", "Michael Schumacher 2010", zoom=(1.0, 1.12),
       strap=("Michael Schumacher", "MERCEDES  ·  2010  ·  BACK WITH ROSS BRAWN", S("Michael Schumacher.") - S("The next season, the cars were silver", -0.15))),
    CP("A few years later, Lewis Hamilton", "Lewis Hamilton Mercedes", zoom=(1.0, 1.1), strap=("Lewis Hamilton", "MERCEDES  ·  FROM 2013", 0.6)),
    CuS("And that team won eight", eight_titles),
    CuS("The team that was worth one pound", one_pound, bg=bg_of(C + "Lewis_Hamilton_2014_Singapore_FP1.jpg", 0.82)),
    CuS("And Brawn GP?", record4, bg=bg_of(M + "brawn-gp_63z6lxym2iob1ts8v86khmdyh.jpeg", 0.84)),
    # IX. what if
    CuS("So here's the question", what_if("The diffuser? Honda's car?", "Was it the double diffuser", "Or Ross Brawn?", "Or Ross Brawn"), chapter=CH("IX", "WHAT IF"), bg=bg_of(BRAWN09, 0.8)),
    CuS("This was Impossible", impossible_end("Brawn GP."), bg=bg_of(FACTORY, 0.85)),
]

if __name__ == "__main__":
    main(scenes, FINAL)
