"""Gentlemen of Fuel: the Chrysler Turbine Car -> PostDrive/Stories/Gentlemen of Fuel/01 Chrysler Turbine/video/GoF - Chrysler Turbine Car.mp4

    ~/.venvs/poststudio/bin/python build.py            # full render (+ review 720p)
    ~/.venvs/poststudio/bin/python build.py 95 125     # preview slice (video seconds)

First video on the AI-narration production line (PLAYBOOK 20 Oct): script_v2.md (Mike's edits), AI narration in audio/v2/
(NARR=audio/est/ for the estimated timing used before the voice exists). The engine explainer is in explainers.py.
One AI clip at most (the returned cars, 1966), with the still as the fallback.
"""
import math, os, sys
VDIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, VDIR); sys.path.insert(0, os.path.join(VDIR, "..", "..", "..", "studio"))
import episode as E
E.init("/Volumes/PostDrive/Stories/Gentlemen of Fuel/01 Chrysler Turbine/", series="gof", narration=os.environ.get("NARR", "audio/v2/"))
from episode import *
import explainers as X
from factcard import FactCard
E.AI_RATE = 0.6                                                               # AI clips at 60% speed (Mike 20 Oct)

FINAL = "GoF - Chrysler Turbine Car.mp4"

class Explainer(Scene):
    def __init__(self, start, fn, **kw): super().__init__(start, **kw); self.fn = fn
    def base(self, t): return self.fn(t)
def explainer(snip, maker, off=-0.15, **kw):
    t0 = S(snip, off); return Explainer(t0, maker(lambda k: S(k) - t0), **kw)

def T(v, sc): return at(v[0], sc) + v[1] if isinstance(v, tuple) else v
def FC(snip, path, name, role, facts=(), off=-0.15, **kw):
    full = next((d + path for d in (C, M, AI) if os.path.exists(d + path)), path)
    fs = [((lambda sc, v=f[0]: T(v, sc)),) + tuple(f[1:]) for f in facts]
    return FactCard(S(snip, off), full, name, role, facts=fs, **kw)
def CP(snip, f, **kw): return PS(snip, f, **kw)
def bgp(f, amt=0.8): return bg_of((C if os.path.exists(C + f) else M) + f, amt)
def bga(f, amt=0.8): return bg_of(AI + f, amt)
def lt(snip, sc, off=0.0): return at(snip, sc) + off                       # a line's time inside a scene

def tag(d, xy, text, a, colour=GOLD, size=40): X.tag(d, xy, text, a, colour, size)
def drop(t, k, fall=0.35, h=240):
    """Falls in from above with a small bounce. -> (alpha, y offset)"""
    f = min(1.0, max(0.0, (t - k) / fall))
    return ramp(t, k, k + 0.12), -h * (1 - f) ** 2 + (12 * math.sin(f * math.pi) if f < 1 else 0)

_car = {}
def car_icon(w):
    """The real car: the side-on still lifted off its background (studio/cutout.swift), w pixels long."""
    if w not in _car:
        c = Image.open(AI + "ai_turbine_side_cutout.png").convert("RGBA"); c = c.crop(c.getbbox())
        _car[w] = c.resize((w, int(c.height * w / c.width)), Image.LANCZOS)
    return _car[w]
def faded(im, a): return im if a >= 1 else Image.fromarray((np.asarray(im) * np.array([1, 1, 1, max(0, a)])).astype(np.uint8))

def counter(d, x, y, n, label, a, col=GOLD, size=110):
    """A big number with its label under it."""
    if a <= 0: return
    f = pf(size, 900); s = f"{n:,}"; d.text((x - f.getlength(s) / 2, y), s, font=f, fill=rgba(col, a))
    tracked(d, (x, y + size + 20), label, cond(34, 8), rgba(CREAM, a), 8, "center")

# ---------------------------------------------------------------- graphics
def cold_numbers(d, L, t, sc):
    """50 cars, 203 families, 3 years, a million miles: each counts up as it's said."""
    d.rounded_rectangle((90, 300, W - 90, 700), 30, fill=rgba(NAVY_D, 0.78 * ramp(t, 0, 0.4)))
    k = lt("Two hundred and three families", sc)
    for i, (n, lab, lag) in enumerate([(203, "FAMILIES", 0.2), (3, "YEARS", 1.6), (1_000_000, "MILES +", 2.6)]):
        p = ease(min(1, max(0, t - k - lag) / 1.2)); counter(d, 380 + i * 580, 380, int(n * p), lab, ramp(t, k + lag, k + lag + 0.3))

def usa(d, L, t, sc):
    """The map of America; 203 dots light up across it as the cars go out; the deal underneath."""
    mp = _usa(); L.alpha_composite(faded(mp, ramp(t, 0, 0.6)), (int(W / 2 - mp.width / 2) + 80, 110))
    k = lt("Chrysler picked two hundred", sc); n = int(203 * ease(min(1, max(0, t - k) / 3.0)))
    for i in range(n):
        x, y = _dots[i]; a = min(1, (t - k - i * 3.0 / 203) / 0.3)
        if a > 0: d.ellipse((x - 9, y - 9, x + 9, y + 9), fill=rgba(GOLD, a)); d.ellipse((x - 18, y - 18, x + 18, y + 18), outline=rgba(GOLD, 0.35 * a), width=3)
    counter(d, 230, 760, n, "DRIVERS", ramp(t, k, k + 0.3), GOLD, 100)
    tag(d, (W / 2, 990), "3 MONTHS EACH", ramp(t, lt("Each family got", sc), lt("Each family got", sc) + 0.4) * (1 - ramp(t, lt("Chrysler paid for", sc) - 0.3, lt("Chrysler paid for", sc))), CREAM, 44)
    tag(d, (W / 2, 990), "CHRYSLER PAID: INSURANCE  ·  SERVICING", ramp(t, lt("Chrysler paid for", sc), lt("Chrysler paid for", sc) + 0.4) * (1 - ramp(t, lt("All they paid for", sc) - 0.3, lt("All they paid for", sc))), CREAM, 44)
    tag(d, (W / 2, 990), "THE FAMILIES PAID FOR: FUEL", ramp(t, lt("All they paid for", sc), lt("All they paid for", sc) + 0.4), GOLD, 48)
_usa_img, _dots = [], []
def _usa():
    if not _usa_img:
        m = Image.open(C + "us_map.png").convert("LA"); s = 1560 / m.width; m = m.resize((1560, int(m.height * s)), Image.LANCZOS)
        g, a = np.asarray(m)[..., 0], np.asarray(m)[..., 1]                   # grey states, white borders, clear sea
        a = a.copy(); a[int(0.6 * a.shape[0]):, :int(0.34 * a.shape[1])] = 0          # the lower 48 only (no Alaska / Hawaii insets)
        land = Image.fromarray(((a > 128) * 255).astype(np.uint8))
        im = Image.new("RGBA", m.size, (0, 0, 0, 0)); im.paste(Image.new("RGBA", m.size, (44, 66, 110, 245)), (0, 0), land)
        line = Image.fromarray(((g > 235) & (a > 128)).astype(np.uint8) * 200).filter(ImageFilter.MaxFilter(3))
        coast = land.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.MaxFilter(3))
        for mk, al in ((line, 0.45), (coast, 0.9)): im.paste(Image.new("RGBA", m.size, rgba(CREAM, al)), (0, 0), mk)
        _usa_img.append(im)
        rng = np.random.default_rng(63); x0 = W / 2 - m.width / 2 + 80
        while len(_dots) < 203:                                               # spread over the lower 48 (not the insets)
            x, y = rng.uniform(0.02, 0.98) * m.width, rng.uniform(0.02, 0.7) * m.height
            if a[int(y), int(x)] > 128 and not (x < 0.32 * m.width and y > 0.62 * m.height): _dots.append((x0 + x, 110 + y))
    return _usa_img[0]

def fuels(d, L, t, sc):
    """Diesel, kerosene, jet fuel, unleaded: four cans drop in; then perfume."""
    for i, (snip, txt, col) in enumerate([("Diesel.", "DIESEL", CREAM), ("Kerosene.", "KEROSENE", CREAM), ("Jet fuel.", "JET FUEL", GOLD), ("Unleaded petrol.", "UNLEADED", CREAM)]):
        a, dy = drop(t, lt(snip, sc, -0.1)); x = 330 + i * 420; y = 380 + dy
        if a <= 0: continue
        d.rounded_rectangle((x - 140, y, x + 140, y + 330), 22, fill=rgba(RED if i != 2 else NAVY, 0.92 * a), outline=rgba(GOLD, a), width=5)
        d.rounded_rectangle((x + 40, y - 50, x + 110, y + 4), 10, fill=rgba(STEEL, a))                   # spout cap
        d.line([(x - 90, y + 40), (x + 90, y + 290)], fill=rgba(NAVY_D, 0.35 * a), width=8)              # the pressed X on a jerrycan
        d.line([(x + 90, y + 40), (x - 90, y + 290)], fill=rgba(NAVY_D, 0.35 * a), width=8)
        tag(d, (x, y + 360), txt, a, col, 38)
    p = lt("Even, they said, perfume.", sc)
    tag(d, (W / 2, 150), "EVEN PERFUME?", ramp(t, p + 0.6, p + 1.0), GOLD, 64)
    tag(d, (W / 2, 245), "SO THEY SAID", ramp(t, p + 1.2, p + 1.6), CREAM, 34)
STEEL = (150, 158, 172)

def tequila(d, L, t, sc):
    k = lt("The story goes", sc); w = lt("That hadn't been tried", sc)
    tag(d, (W / 2, 200), "THE STORY GOES...", ramp(t, k, k + 0.4), CREAM, 40)
    tag(d, (W / 2, 330), "THE PRESIDENT OF MEXICO ASKED:", ramp(t, k + 1.0, k + 1.4), CREAM, 44)
    a = ramp(t, k + 2.6, k + 3.0)
    if a: text_top(d, (W / 2, 420), "Tequila?", pf(170, 900), rgba(GOLD, a), "center")
    place_stamp(L, W / 2, 800, ramp(t, w + 2.6, w + 2.85), text="IT WORKED", size=110, color=GOLD, rot=-6)

def letters(d, L, t, sc):
    """30,000 people wrote in: envelopes pile up and the count runs."""
    k = lt("More than thirty thousand", sc); p = ease(min(1, max(0, t - k) / 2.5)); n = int(140 * p)
    rng = np.random.default_rng(30)
    for i in range(n):
        x, y, r = rng.uniform(220, W - 220), rng.uniform(380, 980), rng.uniform(-14, 14)
        env = Image.new("RGBA", (190, 120), rgba(CREAM, 0.95)); ed = ImageDraw.Draw(env)
        ed.rectangle((0, 0, 189, 119), outline=rgba((150, 140, 120), 1), width=3); ed.line([(0, 0), (95, 64), (189, 0)], fill=rgba((150, 140, 120), 1), width=3)
        ed.rectangle((150, 10, 178, 44), fill=rgba(RED, 0.9))
        env = env.rotate(r, expand=True, resample=Image.BICUBIC); L.alpha_composite(env, (int(x - 95), int(y - 60)))
    d.rounded_rectangle((W / 2 - 420, 70, W / 2 + 420, 330), 26, fill=rgba(NAVY_D, 0.92 * ramp(t, k, k + 0.3)), outline=rgba(GOLD, ramp(t, k, k + 0.3)), width=4)
    counter(d, W / 2, 95, int(30000 * p), "APPLICATIONS  ·  MORE THAN", ramp(t, k, k + 0.3), GOLD, 120)

def miles(d, L, t, sc):
    """An odometer rolling past a million."""
    k = lt("Between them", sc); p = ease(min(1, max(0, t - k - 0.3) / 3.0)); v = 1_000_000 * p
    d.rounded_rectangle((W / 2 - 520, 380, W / 2 + 520, 640), 24, fill=rgba((12, 12, 14), 0.95 * ramp(t, k, k + 0.3)), outline=rgba(STEEL, ramp(t, k, k + 0.3)), width=6)
    s = f"{int(v):07d}"
    for i, ch in enumerate(s):                                                 # each wheel rolls, the last one smoothly
        x = W / 2 - 455 + i * 130; frac = 0
        d.rounded_rectangle((x, 410, x + 110, 610), 10, fill=rgba(CREAM if i < 6 else GOLD, ramp(t, k, k + 0.3)))
        f = pf(130, 800); y = 432 - 140 * frac
        d.text((x + 55 - f.getlength(ch) / 2, y - f.getbbox("0")[1] + 10), ch, font=f, fill=rgba(NAVY_D, ramp(t, k, k + 0.3)))
    tracked(d, (W / 2, 680), "MILES  ·  ALL 203 DRIVERS", cond(40, 8), rgba(CREAM, ramp(t, k + 0.5, k + 0.9)), 8, "center")

def lag(d, L, t, sc):
    """Throttle lag: the pedal goes down, nothing... then the needle rises."""
    k = lt("Press the accelerator", sc); press = ease(min(1, max(0, t - k - 0.3) / 0.3))
    rise = ease(min(1, max(0, t - k - 2.4) / 1.4))
    cx, cy, R = 1240, 560, 300
    d.ellipse((cx - R, cy - R, cx + R, cy + R), fill=rgba((14, 14, 18), 0.95), outline=rgba(STEEL, 1), width=10)
    for i in range(9):                                                          # dial marks, 0..8 (x1000 rpm)
        an = math.radians(225 - i * 33.75)
        d.line([(cx + (R - 30) * math.cos(an), cy - (R - 30) * math.sin(an)), (cx + (R - 70) * math.cos(an), cy - (R - 70) * math.sin(an))], fill=rgba(CREAM, 1), width=6)
    an = math.radians(225 - 5.2 * 33.75 * rise - 4 * math.sin(t * 9) * rise * (1 - rise))
    d.line([(cx, cy), (cx + (R - 60) * math.cos(an), cy - (R - 60) * math.sin(an))], fill=rgba(RED, 1), width=12); d.ellipse((cx - 26, cy - 26, cx + 26, cy + 26), fill=rgba(STEEL, 1))
    px, py = 470, 560 + 140 * press                                             # the pedal
    d.rounded_rectangle((px - 110, py - 170, px + 110, py + 170), 26, fill=rgba((40, 40, 44), 1), outline=rgba(STEEL, 1), width=6)
    for j in range(5): d.line([(px - 70, py - 120 + j * 60), (px + 70, py - 120 + j * 60)], fill=rgba(STEEL, 1), width=6)
    tag(d, (px, 260), "PRESS", ramp(t, k + 0.2, k + 0.5), CREAM, 44)
    wait = ramp(t, k + 0.8, k + 1.1) * (1 - rise)
    tag(d, (cx, 160), "WAITING..." if t < k + 1.9 else "SPINNING UP...", wait, GOLD, 48)
    tag(d, (cx, 160), "GO", rise, GOLD, 60)
    j = lt("At a junction", sc); tag(d, (W / 2, 990), "AT A JUNCTION, IT FELT LIKE FOREVER", ramp(t, j, j + 0.4), CREAM, 40)

def problems(d, L, t, sc):
    rows = [("Press the accelerator", "SLOW TO RESPOND", 0.0), ("It wasn't economical", "THIRSTY", 0.0), ("It used much more fuel", "HARD STARTS AT HIGH ALTITUDE", 2.6)]
    tag(d, (W / 2, 180), "THE PROBLEMS", ramp(t, 0, 0.4), RED, 56)
    for i, (snip, txt, lag_) in enumerate(rows):
        try: k = lt(snip, sc) + lag_
        except Exception: k = 0.4 + i * 0.4
        k = max(k, 0.3 + 0.35 * i)
        tag(d, (W / 2, 380 + i * 150), txt, ramp(t, k, k + 0.4), CREAM, 50)
    f = lt("None of it was fatal", sc); tag(d, (W / 2, 880), "NOTHING THAT COULDN'T BE FIXED", ramp(t, f, f + 0.4), GOLD, 44)

def fifty_five(d, L, t, sc):
    """55 cars built: 46 go dark and fall away, 9 stay gold."""
    k = lt("Of the fifty-five cars built", sc); ic = car_icon(205)
    gold = Image.fromarray(np.dstack([(np.asarray(ic)[..., :3] * 0.55 + np.array(GOLD) * 0.45).astype(np.uint8), np.asarray(ic)[..., 3]]))
    keep = {3, 9, 16, 22, 28, 33, 40, 46, 51}
    for i in range(55):
        c, r = i % 8, i // 8; x = 50 + c * 230; y = 250 + r * 100
        a = min(1, (t - i * 1.2 / 55) / 0.25)
        if a <= 0: continue
        if i in keep: L.alpha_composite(faded(gold if t > k + 2.6 else ic, a), (int(x), int(y))); continue
        g = ease(min(1, max(0, t - k - 0.4 - (i % 7) * 0.12) / 0.7))           # crushed: darkens, sinks, fades
        im = ic if g <= 0 else Image.fromarray(np.dstack([(np.asarray(ic)[..., :3] * (1 - 0.8 * g)).astype(np.uint8), (np.asarray(ic)[..., 3] * (1 - g)).astype(np.uint8)]))
        L.alpha_composite(faded(im, a), (int(x), int(y + 40 * g)))
    n = 55 - int(46 * ease(min(1, max(0, t - k - 0.4) / 1.6)))
    d.rounded_rectangle((W / 2 - 300, 50, W / 2 + 300, 210), 24, fill=rgba(NAVY_D, 0.92), outline=rgba(GOLD, 1), width=4)
    text_top(d, (W / 2, 66), f"{n}", pf(110, 900), rgba(GOLD if n <= 9 else CREAM, 1), "center")
    tag(d, (W / 2, 990), "46 CRUSHED OR BURNED", ramp(t, k + 1.2, k + 1.6) * (1 - ramp(t, k + 2.4, k + 2.7)), RED, 46)
    tag(d, (W / 2, 990), "TURBINE CARS BUILT", ramp(t, 0.3, 0.7) * (1 - ramp(t, k + 0.9, k + 1.2)), CREAM, 40)
    tag(d, (W / 2, 990), "9 LEFT", ramp(t, k + 2.7, k + 3.0), GOLD, 50)

def duty(d, L, t, sc):
    """The bodies came from Italy; the import duty was never paid."""
    k = lt("The bodies had been built in Italy", sc)
    tag(d, (420, 300), "TURIN, ITALY", ramp(t, k, k + 0.4), CREAM, 48); tag(d, (1500, 300), "DETROIT, USA", ramp(t, k + 0.6, k + 1.0), CREAM, 48)
    p = ease(min(1, max(0, t - k - 0.5) / 1.6)); ic = car_icon(560).transpose(Image.FLIP_LEFT_RIGHT)
    if ramp(t, k + 0.3, k + 0.6) > 0: L.alpha_composite(faded(ic, ramp(t, k + 0.3, k + 0.6)), (int(150 + 1060 * p), 400))
    X.arrow(d, (420, 600), (420 + 1080 * p, 600), ramp(t, k + 0.4, k + 0.7), GOLD, 8, 26)
    tag(d, (W / 2, 760), "IMPORT DUTY", ramp(t, k + 2.0, k + 2.4), GOLD, 50)
    place_stamp(L, W / 2, 890, ramp(t, k + 3.2, k + 3.45), text="UNPAID", size=100, rot=-6)
    m = lt("Keeping the cars meant", sc); tag(d, (W / 2, 160), "KEEP A CAR = PAY THE DUTY", ramp(t, m, m + 0.4), RED, 44)

def survivors(d, L, t, sc):
    """Nine left: where they went."""
    ic = car_icon(260)
    gold = Image.fromarray(np.dstack([(np.asarray(ic)[..., :3] * 0.55 + np.array(GOLD) * 0.45).astype(np.uint8), np.asarray(ic)[..., 3]]))
    for i in range(9):
        a = ramp(t, 0.1 + i * 0.12, 0.4 + i * 0.12); c, r = i % 3, i // 3
        L.alpha_composite(faded(gold, a), (int(W / 2 - 150 - 420 + c * 300 + (40 if r % 2 else 0)), int(250 + r * 150)))
    tag(d, (W / 2, 120), "9 SURVIVED", ramp(t, 0, 0.4), GOLD, 60)
    for i, (snip, txt) in enumerate([("Chrysler kept two", "CHRYSLER KEPT 2"), ("Most of the rest", "MOST WENT TO MUSEUMS"), ("And one of them ended up", "ONE IS NOW JAY LENO'S")]):
        k = lt(snip, sc); x = W / 2 + (i - 1) * 600
        tag(d, (x, 860 + (i % 2) * 90), txt, ramp(t, k, k + 0.4), CREAM if i != 2 else GOLD, 40)

def rescue(d, L, t, sc):
    k = lt("But at the end of the seventies", sc); g = lt("The government rescued it", sc)
    text_top(d, (W / 2, 220), "1979", pf(200, 900), rgba(GOLD, ramp(t, k, k + 0.4)), "center")
    tag(d, (W / 2, 520), "CHRYSLER NEARLY GOES BUST", ramp(t, k + 0.8, k + 1.2), RED, 50)
    tag(d, (W / 2, 640), "A GOVERNMENT-BACKED RESCUE", ramp(t, g, g + 0.4), CREAM, 46)
    tag(d, (W / 2, 760), "THE TURBINE PROGRAMME ENDS", ramp(t, g + 2.2, g + 2.6), GOLD, 46)

def ghia(d, L, t, sc):
    """Built by hand in Italy: 55 bodies."""
    k = lt("The coachbuilder Ghia", sc); p = ease(min(1, max(0, t - k - 0.6) / 1.4))
    tag(d, (W / 2, 140), "GHIA  ·  TURIN, ITALY", ramp(t, 0.2, 0.6), GOLD, 50)
    counter(d, W / 2, 820, int(55 * p), "BODIES BUILT BY HAND", ramp(t, k + 0.4, k + 0.8), GOLD, 120)

def ended(d, L, t, sc):
    """January 1966: the calendar page, then what the experiment added up to."""
    a = ramp(t, 0.1, 0.5); x0, y0 = W / 2 - 260, 170
    d.rounded_rectangle((x0, y0, x0 + 520, y0 + 420), 20, fill=rgba(CREAM, 0.97 * a))
    d.rounded_rectangle((x0, y0, x0 + 520, y0 + 110), 20, fill=rgba(RED, a)); d.rectangle((x0, y0 + 80, x0 + 520, y0 + 110), fill=rgba(RED, a))
    tracked(d, (W / 2, y0 + 30), "JANUARY", cond(54, 8), rgba(CREAM, a), 10, "center")
    text_top(d, (W / 2, y0 + 150), "1966", pf(170, 900), rgba(NAVY_D, a), "center")
    tag(d, (W / 2, 690), "THE EXPERIMENT ENDS", ramp(t, 0.8, 1.2), GOLD, 50)
    tag(d, (W / 2, 800), "50 CARS  ·  203 FAMILIES  ·  OVER 1,000,000 MILES", ramp(t, 1.6, 2.0), CREAM, 36)

def destroyed(d, L, t, sc):
    """Something that still upsets car fans: then the stamp lands on 'It destroyed them.'"""
    tag(d, (W / 2, 300), "WHAT CHRYSLER DID NEXT", ramp(t, 0.2, 0.6), CREAM, 44)
    tag(d, (W / 2, 400), "STILL UPSETS CAR FANS TODAY", ramp(t, 1.4, 1.8), GOLD, 40)
    k = lt("It destroyed them.", sc)
    place_stamp(L, W / 2, 640, ramp(t, k + 0.1, k + 0.35), text="DESTROYED", size=150, rot=-6)

# ---------------------------------------------------------------- the video
ROW = "ai_turbine_row.png"
scenes = [
    opening(AI + "ai_turbine_jet_age.png", "The Chrysler Turbine Car.", "THE JET CAR CHRYSLER LENT TO AMERICA", credit="AI illustration",
            focus=((0.55, 0.6), (0.5, 0.6))),
    # cold open
    CP("In 1963, Chrysler did something", "chrysler-turbine-car", zoom=(1.0, 1.12),
       texts=[(0.6, "1963.", "big")]),
    CP("It built fifty cars with jet engines", "Stahls_Automotive_Collection_December_2021_149_(1963_Chrysler_Turbine_engine).jpg", zoom=(1.0, 1.15),
       texts=[(0.4, "50 cars. Jet engines.", "big")]),
    VS("Then it handed them to ordinary", "ai_driveway_clip.mp4", end=1.8, max_rate=0.5, texts=[(1.0, "For free.", "big")],
       fallback=AS("Then it handed them to ordinary", "ai_turbine_driveway.png", zoom=(1.0, 1.15), texts=[(1.0, "For free.", "big")])),
    CuS("Two hundred and three families", cold_numbers, bg=bga("ai_turbine_driveway.png", 0.6)),
    AS("And then Chrysler took almost all", ROW, zoom=(1.0, 1.15), texts=[(1.6, "Destroyed.", "big")]),
    CP("This is the story of the Chrysler Turbine Car", "1963_Chrysler_Turbine_Ghia_Coupe_at_PB_2022.jpg", zoom=(1.0, 1.12),
       strap=("Chrysler Turbine Car", "1963  ·  BODY BY GHIA  ·  JET-ENGINED", 0.4)),
    # I. the jet age
    AS("In the early sixties", "ai_turbine_jet_age.png", zoom=(1.0, 1.18), focus=((0.45, 0.4), (0.5, 0.5)), chapter=CH("I", "THE JET AGE")),
    CP("Airliners had gone from propellers", "OrlyAirport1965-Boeing707-EL-AL.jpg", zoom=(1.0, 1.12), texts=[(0.5, "Propellers out. Jets in.", "mid")]),
    CP("Everything new had fins", "Chrysler_Turbine_Car_--_Walter_P_Chrysler_Museum_10-23-2010_107_N.jpg", zoom=(1.0, 1.15), focus=((0.5, 0.5), (0.6, 0.5)),
       texts=[(0.4, "Fins. Chrome. Rockets.", "mid")]),
    CP("And Chrysler's engineers had been working", "CHRYSLER_TURBINE_ENGINE_REGENERATOR_WHEEL_-_NARA_-_17443496.jpg", zoom=(1.0, 1.12),
       texts=[(0.8, "A gas turbine for cars. Since the 1940s.", "mid")]),
    CP("They believed it was the future", "chrysler-turbine-car3.jpeg", zoom=(1.0, 1.12), texts=[(SF("One day, they thought", 0.0) - S("They believed it was the future", -0.15), "Every car, one day.", "mid")]),
    # II. how it works (one continuous explainer)
    explainer("So how do you drive", X.turbine_scene, chapter=CH("II", "HOW A TURBINE DRIVES A CAR")),
    # III. runs on anything
    CuS("And because it just burned", fuels, chapter=CH("III", "IT RAN ON ANYTHING"), bg=bga("ai_turbine_gas_station.png", 0.82)),
    CuS("The story goes", tequila, bg=bga("ai_turbine_gas_station.png", 0.86)),
    # IV. the car
    CP("For the body, Chrysler went to Italy", "1963_Chrysler_Turbine_Ghia_Coupe_at_PB_2022.jpg", zoom=(1.1, 1.25), chapter=CH("IV", "THE CAR")),
    CuS("The coachbuilder Ghia", ghia, bg=bgp("1963_Chrysler_Turbine_Ghia_Coupe_at_PB_2022.jpg", 0.62)),
    CP("They were painted a special colour", "chrysler-turbine-car2.jpeg", zoom=(1.0, 1.12), strap=("Turbine Bronze", "THE ONLY COLOUR IT CAME IN", 0.6)),
    CP("Bronze on the outside", "Chrysler_Turbine_Car_interior_--_Walter_P_Chrysler_Museum_10-23-2010_109_N.jpg", zoom=(1.0, 1.15), texts=[(0.8, "Bronze leather inside.", "mid")]),
    CP("The design was by Chrysler's Elwood Engel", "chrysler-turbine-car4.jpeg", zoom=(1.0, 1.12), strap=("Elwood Engel", "DESIGNER  ·  CHRYSLER", 0.8)),
    CP("The headlights, the rear lights", "Chrysler_Turbine_exhaust.JPG", zoom=(1.0, 1.15), texts=[(0.6, "Rear lights like jet exhausts.", "mid")]),
    PF("The headlights, the rear lights", 0.55, "Chrysler_Turbine_Car_dashboard_--_Walter_P_Chrysler_Museum_10-23-2010_108_N.jpg", zoom=(1.0, 1.15), texts=[(0.3, "A console like a cockpit.", "mid")]),
    CP("And it sounded like nothing else", "chrysler-turbine-car", zoom=(1.15, 1.3),
       texts=[(S("Not the usual V8 roar") - S("And it sounded like nothing else", -0.15), "Not a V8 roar.", "mid"),
              (S("The turbine car was more like") - S("And it sounded like nothing else", -0.15), "A jet on the runway.", "big")]),
    # V. the experiment
    AS("But here's the part", "ai_turbine_driveway.png", zoom=(1.1, 1.25), chapter=CH("V", "THE EXPERIMENT"),
       texts=[(S("Instead of just showing it") - S("But here's the part", -0.15), "50 cars. Given to the public.", "mid")]),
    CuS("More than thirty thousand people", letters, bg=bga("ai_turbine_driveway.png", 0.85)),
    CuS("Chrysler picked two hundred", usa),
    CP("They drove them to work", "Chrysler_Turbine_Car_Worlds_Fair_1964.jpg", zoom=(1.0, 1.18), strap=("New York World's Fair", "1964", 0.6),
       texts=[(S("Neighbours came out to stare") - S("They drove them to work", -0.15), "Neighbours came out to stare.", "mid")]),
    VS("Some drivers said they couldn't fill up", "ai_gas_clip.mp4", texts=[(1.2, "A crowd at every pump.", "mid")],
       fallback=AS("Some drivers said they couldn't fill up", "ai_turbine_gas_station.png", zoom=(1.0, 1.15), texts=[(1.2, "A crowd at every pump.", "mid")])),
    CuS("Between them", miles, bg=bga("ai_turbine_gas_station.png", 0.84)),
    # VI. what the families found
    CP("So what was it actually like", "chrysler-turbine-car3.jpeg", zoom=(1.1, 1.25), chapter=CH("VI", "WHAT THE FAMILIES FOUND"),
       texts=[(S("It was smooth") - S("So what was it actually like", -0.15), "Smooth.", "mid"),
              (S("It started first time") - S("So what was it actually like", -0.15), "Started first time.", "mid+"),
              (S("It hardly ever needed") - S("So what was it actually like", -0.15), "Hardly ever serviced.", "mid+")]),
    CuS("But there were problems", lag, bg=bgp("Chrysler_Turbine_Car_dashboard_--_Walter_P_Chrysler_Museum_10-23-2010_108_N.jpg", 0.85)),
    CuS("It wasn't economical", problems, bg=bgp("1963_Chrysler_Turbine_Ghia_Coupe_at_PB_2022_engine.jpg", 0.85)),
    CP("Chrysler's engineers fixed what they could", "1963_Chrysler_Turbine_Ghia_Coupe_at_PB_2022_engine_2.jpg", zoom=(1.0, 1.12),
       texts=[(S("But it was clear") - S("Chrysler's engineers fixed", -0.15), "Not ready yet.", "big")]),
    # VII. the end
    CuS("In January 1966", ended, chapter=CH("VII", "THE END"), bg=bgp("Chrysler_Turbine_Car_Worlds_Fair_1964.jpg", 0.82)),
    VS("The families gave the cars back", "ai_row_clip.mp4", off=-1.4, fallback=AS("The families gave the cars back", ROW, zoom=(1.0, 1.12), focus=((0.3, 0.6), (0.45, 0.55)))),
    CuS("And then Chrysler did something", destroyed, bg=bgp("Chrysler_Turbine_exhaust.JPG", 0.8)),
    CuS("Of the fifty-five cars built", fifty_five, off=-0.6),
    CuS("The usual explanation is tax", duty, bg=bga(ROW, 0.86)),
    CP("Some say Chrysler also didn't want", "1963_Chrysler_Turbine_Ghia_Coupe_at_PB_2022_engine.jpg", zoom=(1.0, 1.15),
       texts=[(1.2, "No spare parts. No mechanics.", "mid")]),
    AS("Either way, the jet-age dream", "ai_turbine_jet_age.png", zoom=(1.15, 1.0), focus=((0.6, 0.6), (0.5, 0.5)), dim=0.35),
    # VIII. the survivors
    CuS("But not quite all of them", survivors, chapter=CH("VIII", "THE SURVIVORS"), bg=bgp("Chrysler_Turbine_Car_--_Walter_P_Chrysler_Museum_10-23-2010_107_N.jpg", 0.85)),
    (FC("And one of them ended up", "Jay_Leno_2019_crop.jpg", "Jay Leno", "TV HOST  ·  CAR COLLECTOR",
        facts=[(0.8, "Bought his Turbine Car from Chrysler in 2009", True)]) if os.path.exists(C + "Jay_Leno_2019_crop.jpg") else None),
    CP("Chrysler kept working on turbines", "CHRYSLER_TURBINE_REGENERATOR_IN_THE_SPECIAL_PROJECTS_LABORATORY_SPL_-_NARA_-_17423522.jpg", zoom=(1.0, 1.12),
       texts=[(0.8, "Newer, better turbines.", "mid")]),
    CuS("But at the end of the seventies", rescue, bg=bgp("CHRYSLER_TURBINE_REGENERATOR_IN_THE_SPECIAL_PROJECTS_LABORATORY_SPL_-_NARA_-_17423522.jpg", 0.86)),
    AS("A car that would run on tequila", "ai_turbine_gas_station.png", zoom=(1.0, 1.15), texts=[(0.8, "Never on sale.", "big")]),
    # IX. what if
    AS("So here's the question", "ai_turbine_jet_age.png", zoom=(1.0, 1.12), chapter=CH("IX", "WHAT IF"),
       texts=[(S("Was the turbine car a brilliant") - S("So here's the question", -0.15), "Killed too soon?", "big")]),
    CuS("Or was Chrysler right", what_if("A brilliant idea killed too soon?", "Or was Chrysler right", "Or never going to work?", "Tell me what you think"),
        bg=bga(ROW, 0.85)),
    CuS("This was a Gentlemen of Fuel story", gof_end(), bg=bga("ai_turbine_side.png", 0.7)),
]
scenes = [s for s in scenes if s is not None]

if __name__ == "__main__":
    main(scenes, FINAL)
