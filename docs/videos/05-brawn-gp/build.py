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

def engine_swap(d, L, t, sc):
    tracked(d, (W / 2, 180), "THE ENGINE", cond(36, 2), rgba(GOLD, ramp(t, 0, 0.5)), 8, "center")
    a = ramp(t, at("The car had been designed", sc), at("The car had been designed", sc) + 0.4)
    m = ramp(t, at("Now it needed a Mercedes", sc), atf("Now it needed a Mercedes", 0.35, sc))
    def block(x, label, col, al):
        d.rounded_rectangle((x - 230, 360, x + 230, 640), 20, outline=rgba(col, al), width=6, fill=rgba(NAVY_D, 0.8 * al))
        for k in range(4): d.rectangle((x - 170 + k * 95, 400, x - 120 + k * 95, 470), fill=rgba(col, 0.5 * al))   # cylinders
        tracked(d, (x, 540), label, cond(56, 8), rgba(col, al), 8, "center")
    block(560, "HONDA", CREAM, a * (1 - 0.6 * m))
    if m > 0:
        d.line((360, 680, 760, 320), fill=rgba(RED, m), width=12)
        arrow(d, (840, 500), (1060, 500), m, GOLD, 8, 26)
        block(1360, "MERCEDES", SILVER, m)
    w = ramp(t, atf("Now it needed a Mercedes", 0.7, sc), atf("Now it needed a Mercedes", 0.7, sc) + 0.4)
    tracked(d, (W / 2, 790), "A FEW WEEKS TO MAKE IT FIT", cond(44, 8), rgba(CREAM, w), 8, "center")

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
        a = ramp(t, 0.2 + i * 0.4, 0.6 + i * 0.4); y = 330 + i * 200; x = 700 + i * 140
        d.rounded_rectangle((x - 40, y, x + 520, y + 140), 12, fill=rgba(NAVY_D, 0.9 * a), outline=rgba(YEL, a), width=4)
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
def eight_titles(d, L, t, sc):
    tracked(d, (W / 2, 220), "MERCEDES  ·  CONSTRUCTORS' CHAMPIONS", cond(36, 2), rgba(GOLD, ramp(t, 0, 0.5)), 8, "center")
    x0 = W / 2 - 3.5 * 190
    for i, yr in enumerate(range(2014, 2022)):
        a = ramp(t, 0.4 + i * 0.25, 0.7 + i * 0.25)
        if a <= 0: continue
        x = x0 + i * 190
        d.rounded_rectangle((x - 70, 400, x + 70, 600), 10, fill=rgba(SILVER, a))
        text_top(d, (x, 450), "1", pf(90, 900), rgba(NAVY_D, a), "center")
        tracked(d, (x, 640), str(yr), cond(34, 8), rgba(CREAM, a), 4, "center")
    tracked(d, (W / 2, 780), "EIGHT IN A ROW", cond(52, 8), rgba(GOLD, ramp(t, 2.6, 3.0)), 12, "center")

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
    CuS("On the sixth of March", countdown),
    # III. the secret
    CP("The car was almost completely white", "Brawn BGP 001", 1, zoom=(1.0, 1.12), chapter=CH("III", "THE SECRET"),
       fallback=AS("The car was almost completely white", "ai_empty_factory.png", zoom=(1.2, 1.35), focus=((0.4, 0.62), (0.42, 0.62)), chapter=CH("III", "THE SECRET"))),
    CuS("But at the back, under the rear wing", diffuser),
    CaS("Brawn weren't the only team", [{"k": "kicker", "text": "WILLIAMS AND TOYOTA HAD ONE TOO", "y": 380, "at": 0.3},
                                        {"k": "title", "text": "Brawn did it best.", "y": 450, "size": 130, "at": "But they'd done it best"}], align="center"),
    CuS("The rival teams were furious", protest),
    # IV. the impossible
    CP("Melbourne.", "Albert Park circuit", zoom=(1.0, 1.1), chapter=CH("IV", "THE IMPOSSIBLE"), strap=("Albert Park", "MELBOURNE  ·  29 MARCH 2009", 1.2)),
    VS("The team's first ever race", "ai_pit_garage_clip.mp4"),
    CP("Jenson Button put the car on pole", "Jenson Button 2009", zoom=(1.0, 1.08), strap=("Jenson Button", "POLE POSITION", 0.5)),
    CP("Rubens Barrichello qualified second", "Rubens Barrichello 2009", zoom=(1.0, 1.08), strap=("Rubens Barrichello", "SECOND", 0.4)),
    CuS("On Sunday, they finished", grid),
    AS("A team that hadn't existed", "ai_champagne.png", zoom=(1.0, 1.1), texts=[(0.6, "A month old.", "mid"), (2.4, "A race winner.", "big")]),
    CuS("And Button kept winning", win_tally),
    # V. the fight
    CuS("But the money was running out", lead_shrinks, chapter=CH("V", "THE FIGHT")),
    CP("It all came down to Brazil", "Interlagos", zoom=(1.0, 1.1), strap=("Interlagos", "SÃO PAULO  ·  18 OCTOBER 2009", 0.6),
       texts=[(S("A podium would guarantee") - S("It all came down to Brazil", -0.15) + 0.4, "A podium = the title.", "mid")]),
    CuS("But starting fourteenth", p14_to_p5),
    CuS("Jenson Button was world champion", champions, bg=bg_of(AI + "ai_champagne.png", 0.78)),
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
