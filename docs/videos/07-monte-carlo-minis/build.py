"""BANNED 05: The Monte Carlo Minis -> PostDrive/Stories/BANNED series/05 Monte Carlo Minis/video/BANNED 05 - The Monte Carlo Minis.mp4

    ~/.venvs/poststudio/bin/python build.py            # full render (+ review 720p)
    ~/.venvs/poststudio/bin/python build.py 95 125     # preview slice (video seconds)

AI video: media/ai/ai_*_clip.mp4 are 5 s Runway clips (VS). graphics/europe_map.json is the coastline of
Commons' public-domain BlankMap-World-Equirectangular.svg, as lon/lat polygons.
"""
import json, math, os, sys
VDIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(VDIR, "..", "..", "..", "studio"))
import episode as E
E.init("/Volumes/PostDrive/Stories/BANNED series/05 Monte Carlo Minis/")
from episode import *

FINAL = "BANNED 05 - The Monte Carlo Minis.mp4"
MRED, WHITE, SILVER, INKC = (200, 28, 38), (244, 240, 230), (200, 205, 212), (40, 34, 30)
DS_CREAM = (226, 214, 190)

def dimmed(path, amount=0.78): return bg_of(path, amount)
def CP(snip, f, **kw): return PS(snip, f, **kw)

# ---------------------------------------------------------------- shapes
def _pts(x, y, L, pts, facing=1):
    return [((x + fx * L) if facing > 0 else (x + (1 - fx) * L), y + fy * L) for fx, fy in pts]

def mini_side(d, x, y, L, a, col=MRED, num=None, facing=1, lamps=True):
    """A 1960s Mini, side on, front to the right (facing=1). (x, y) = top-left of the roof line, L = length.
    About L x 0.45L."""
    if a <= 0: return
    P = lambda pts: _pts(x, y, L, pts, facing)
    d.polygon(P([(0.08, 0.16), (0.12, 0.025), (0.68, 0.025), (0.74, 0.16)]), fill=rgba(col, a))                 # glasshouse
    d.polygon(P([(0.0, 0.23), (0.02, 0.17), (0.10, 0.155), (0.72, 0.155), (0.80, 0.175), (0.97, 0.19), (1.0, 0.23),
                 (1.0, 0.34), (0.97, 0.375), (0.03, 0.375), (0.0, 0.34)]), fill=rgba(col, a))                 # body
    d.polygon(P([(0.105, 0.0), (0.695, 0.0), (0.70, 0.04), (0.10, 0.04)]), fill=rgba(WHITE, a))               # white roof
    d.polygon(P([(0.135, 0.15), (0.16, 0.055), (0.385, 0.055), (0.385, 0.15)]), fill=rgba(NAVY_D, a))         # windows
    d.polygon(P([(0.415, 0.15), (0.415, 0.055), (0.655, 0.055), (0.705, 0.15)]), fill=rgba(NAVY_D, a))
    d.line(P([(0.0, 0.30), (1.0, 0.30)]), fill=rgba((150, 18, 26), a), width=max(1, int(L * 0.008)))          # seam
    r = 0.075 * L
    for wx in (0.17, 0.83):
        cx, cy = P([(wx, 0.375)])[0]
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=rgba((22, 22, 26), a))
        d.ellipse((cx - r * 0.5, cy - r * 0.5, cx + r * 0.5, cy + r * 0.5), fill=rgba(SILVER, a))
    if num is not None:
        cx, cy = P([(0.47, 0.25)])[0]; rr = 0.065 * L
        d.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), fill=rgba(WHITE, a))
        f = cond(max(8, int(rr * 1.15)), 8); tracked(d, (cx, cy - rr * 0.42), str(num), f, rgba(INKC, a), 1, "center")
    if lamps:
        cx, cy = P([(0.985, 0.215)])[0]; rr = 0.03 * L
        d.ellipse((cx - rr * 0.6, cy - rr, cx + rr * 0.6, cy + rr), fill=rgba((255, 236, 170), a))

def ford_side(d, x, y, L, a, col=(120, 140, 170), facing=1):
    """A big early-60s American V8 saloon, side on. About L x 0.27L."""
    if a <= 0: return
    P = lambda pts: _pts(x, y, L, pts, facing)
    d.polygon(P([(0.0, 0.16), (0.02, 0.115), (0.27, 0.105), (0.35, 0.105), (0.42, 0.02), (0.66, 0.02), (0.74, 0.105),
                 (0.98, 0.11), (1.0, 0.15), (1.0, 0.215), (0.0, 0.215)]), fill=rgba(col, a))
    d.polygon(P([(0.37, 0.10), (0.435, 0.035), (0.53, 0.035), (0.53, 0.10)]), fill=rgba(NAVY_D, a))
    d.polygon(P([(0.55, 0.10), (0.55, 0.035), (0.645, 0.035), (0.71, 0.10)]), fill=rgba(NAVY_D, a))
    d.line(P([(0.0, 0.17), (1.0, 0.17)]), fill=rgba(SILVER, a), width=max(1, int(L * 0.004)))
    r = 0.052 * L
    for wx in (0.18, 0.80):
        cx, cy = P([(wx, 0.215)])[0]
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=rgba((22, 22, 26), a)); d.ellipse((cx - r * .5, cy - r * .5, cx + r * .5, cy + r * .5), fill=rgba(SILVER, a))

def small_car(d, x, y, s, a, col):
    """Generic little rally car icon, s wide, sitting on y."""
    pts = [(0, .62), (.05, .40), (.22, .36), (.33, .10), (.72, .10), (.85, .36), (1, .44), (1, .62)]
    d.polygon([(x + px * s, y - .75 * s + py * s * .75) for px, py in pts], fill=rgba(col, a))
    for wx in (.22, .78):
        cx, cy = x + wx * s, y - .75 * s + .62 * s * .75; r = .11 * s
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=rgba((20, 20, 24), a))

_icons = {}
def car_img(s, col, kind="small", num=None):
    key = (s, col, kind, num)
    if key not in _icons:
        im = Image.new("RGBA", (int(s * 1.1), int(s * 0.62)), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        if kind == "mini": mini_side(d, s * 0.05, s * 0.06, s, 1, col, num)
        else: small_car(d, s * 0.05, s * 0.58, s, 1, col)
        _icons[key] = im
    return _icons[key]

def trophy(d, cx, base, h, a, col=SILVER, shine=-1.0):
    """A cup `h` tall standing on `base`; shine 0..1 = a gold glint sweeping up it."""
    w = h * 0.62; top = base - h
    d.rounded_rectangle((cx - w * 0.42, base - h * 0.12, cx + w * 0.42, base), 6, fill=rgba(NAVY_D, a), outline=rgba(col, a), width=4)
    d.rectangle((cx - w * 0.30, base - h * 0.20, cx + w * 0.30, base - h * 0.12), fill=rgba(col, a))
    d.rectangle((cx - w * 0.07, base - h * 0.42, cx + w * 0.07, base - h * 0.20), fill=rgba(col, a))
    d.pieslice((cx - w * 0.5, top - h * 0.18, cx + w * 0.5, base - h * 0.30), 0, 180, fill=rgba(col, a))
    d.rectangle((cx - w * 0.5, top, cx + w * 0.5, top + h * 0.26), fill=rgba(col, a))
    for sgn in (-1, 1):
        hx = cx + sgn * w * 0.5
        d.arc((hx - w * 0.22, top + h * 0.04, hx + w * 0.22, top + h * 0.40), 270 if sgn > 0 else 90, 90 if sgn > 0 else 270, fill=rgba(col, a), width=7)
    if 0 <= shine <= 1:
        y = base - h * shine; d.line((cx - w * 0.36, y + 12, cx + w * 0.36, y - 12), fill=rgba(WHITE, 0.9 * a), width=7)

def drop(t, k, dur=0.35, height=300):
    """Fall-in offset with a small bounce, for things dropping in at local time k."""
    f = min(1.0, max(0.0, (t - k) / dur))
    return -height * (1 - f) ** 2 + (16 * math.sin(f * math.pi) if f < 1 else 0), f

def shake(t, k, amp=18, decay=0.12):
    if t < k: return 0, 0
    s = amp * math.exp(-(t - k) / decay); return s * math.sin(t * 91), s * math.cos(t * 77)

# ---------------------------------------------------------------- the result board (split-flap rows)
_rows = {}
def row_img(pos, name, car, gold=False, w=1300, h=150):
    key = (pos, name, car, gold, w, h)
    if key not in _rows:
        im = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        d.rounded_rectangle((0, 0, w - 1, h - 1), 14, fill=rgba(NAVY_D, 0.94), outline=rgba(GOLD, 1), width=3)
        d.rounded_rectangle((14, 14, h - 14, h - 14), 10, fill=rgba(GOLD if not gold else WHITE, 1))
        text_top(d, ((h) / 2, 30), str(pos), pf(84, 900), rgba(NAVY_D, 1), "center")
        tracked(d, (h + 30, h / 2 - 26), name, cond(64, 8), rgba(CREAM, 1), 6)
        tracked(d, (w - 40, h / 2 - 14), car, cond(32, 2), rgba(GOLD, 1), 5, "right")
        _rows[key] = im
    return _rows[key]

def paste_row(L, im, cx, cy, flip=1.0, alpha=1.0, dx=0):
    if flip <= 0 or alpha <= 0: return
    h = max(2, int(im.height * flip)); r = im.resize((im.width, h), Image.BILINEAR) if h != im.height else im
    if alpha < 1: r = Image.fromarray((np.asarray(r) * np.array([1, 1, 1, alpha])).astype(np.uint8))
    L.alpha_composite(r, (int(cx - r.width / 2 + dx), int(cy - r.height / 2)))

def strike(d, cx, cy, w, f, a=1.0, col=RED):
    if f <= 0: return
    x0 = cx - w / 2 + 30; d.line((x0, cy + 8, x0 + (w - 60) * f, cy - 8), fill=rgba(col, a), width=12)

MINIS = [(1, "MÄKINEN", "MINI COOPER S"), (2, "AALTONEN", "MINI COOPER S"), (3, "HOPKIRK", "MINI COOPER S")]
def podium_board(d, L, t, sc):
    """Cold open: 1-2-3 flip in."""
    tracked(d, (W / 2, 170), "MONTE CARLO RALLY  ·  JANUARY 1966", cond(38, 2), rgba(GOLD, ramp(t, 0, 0.4)), 8, "center")
    for i, row in enumerate(MINIS):
        k = 0.15 + i * 0.45; paste_row(L, row_img(*row), W / 2, 360 + i * 190, ramp(t, k, k + 0.35))
    tracked(d, (W / 2, 920), "FIRST  ·  SECOND  ·  THIRD", cond(40, 8), rgba(CREAM, ramp(t, 1.6, 2.0)), 10, "center")

def board_dq(stamp_at, strike_from, kicker="MONTE CARLO RALLY  ·  JANUARY 1966"):
    """The three Mini rows, struck out one by one, then DISQUALIFIED slams across the board."""
    def draw(d, L, t, sc):
        k = stamp_at(sc); s0 = strike_from(sc); dx, dy = shake(t, k + 0.12, 22)
        tracked(d, (W / 2 + dx, 170 + dy), kicker, cond(38, 2), rgba(GOLD, ramp(t, 0, 0.4)), 8, "center")
        for i, row in enumerate(MINIS):
            y = 360 + i * 190 + dy; paste_row(L, row_img(*row), W / 2, y, 1, 1 - 0.35 * ramp(t, s0 + i * 0.4, s0 + i * 0.4 + 0.3), dx)
            strike(d, W / 2 + dx, y, 1300, ramp(t, s0 + i * 0.4, s0 + i * 0.4 + 0.3))
        place_stamp(L, W / 2 + dx, 560 + dy, ramp(t, k - 0.05, k + 0.15), text="DISQUALIFIED", size=150, rot=-9)
    return draw

def classification(d, L, t, sc):
    tracked(d, (W / 2, 170), "FINAL NIGHT  ·  THE RESULT ON THE ROAD", cond(38, 2), rgba(GOLD, ramp(t, 0, 0.4)), 8, "center")
    for i, (row, snip) in enumerate(zip(MINIS, ("Mäkinen won.", "Aaltonen was second", "Hopkirk was third"))):
        k = max(0.1, at(snip, sc) - 0.1); paste_row(L, row_img(*row), W / 2, 360 + i * 190, ramp(t, k, k + 0.3))
    tracked(d, (W / 2, 930), "MINI  ·  MINI  ·  MINI", cond(44, 8), rgba(CREAM, ramp(t, at("Hopkirk was third", sc) + 0.4, at("Hopkirk was third", sc) + 0.8)), 14, "center")

ALL5 = MINIS + [(4, "CLARK", "LOTUS CORTINA"), (5, "TOIVONEN", "CITROËN DS21")]
def reshuffle(d, L, t, sc):
    """Five on the road; the first four knocked out sideways, Toivonen rises from fifth to first."""
    tracked(d, (W / 2, 120), "THE NEW RESULT", cond(38, 2), rgba(GOLD, ramp(t, 0, 0.4)), 8, "center")
    ys = [270 + i * 150 for i in range(5)]
    for i, row in enumerate(ALL5[:4]):
        k = 0.5 + i * 0.3; f = ramp(t, k, k + 0.45)
        im = row_img(*row, w=1200, h=130)
        paste_row(L, im, W / 2, ys[i] + 40 * f, 1, 1 - f, dx=1500 * f * f)
        strike(d, W / 2 + 1500 * f * f, ys[i], 1200, ramp(t, k - 0.25, k), 1 - f)
    k = 1.9; f = ramp(t, k, k + 0.7); y = ys[4] + (ys[0] - ys[4]) * f
    pos = 5 if f < 0.5 else 1
    paste_row(L, row_img(pos, "TOIVONEN", "CITROËN DS21", gold=f >= 1, w=1200, h=130), W / 2, y)
    if f >= 1:
        g = (t - k - 0.7) / 0.6
        if 0 <= g <= 1:                                                     # a glint sweeps the winning row
            x = W / 2 - 600 + 1200 * g; d.polygon([(x, ys[0] - 65), (x + 50, ys[0] - 65), (x - 10, ys[0] + 65), (x - 60, ys[0] + 65)], fill=rgba(WHITE, 0.5))
        text_top(d, (W / 2, 470), "Pauli Toivonen", pf(130, 900), rgba(CREAM, ramp(t, k + 0.8, k + 1.2)), "center")
        tracked(d, (W / 2, 680), "CITROËN DS21  ·  THE NEW WINNER", cond(52, 8), rgba(GOLD, ramp(t, k + 1.0, k + 1.4)), 10, "center")

# ---------------------------------------------------------------- cold open: three in a row
def three_running(d, L, t, sc):
    tracked(d, (W / 2, 170), "MONTE CARLO RALLY  ·  WON BY A MINI", cond(38, 2), rgba(GOLD, ramp(t, 0, 0.4)), 8, "center")
    for i, yr in enumerate((1964, 1965, 1966)):
        k = 0.4 + i * 0.6; a = ramp(t, k, k + 0.1)
        if a <= 0: continue
        off, f = drop(t, k, 0.4, 320); x = W / 2 + (i - 1) * 420
        trophy(d, x, 760 + off, 360, a, GOLD if yr == 1966 else SILVER, (t - k - 0.4) / 0.5 if t > k + 0.4 else -1)
        text_top(d, (x, 800), str(yr), pf(84, 900), rgba(GOLD if yr == 1966 else CREAM, a), "center")
    tracked(d, (W / 2, 950), "THREE YEARS RUNNING", cond(44, 8), rgba(CREAM, ramp(t, 2.4, 2.8)), 12, "center")

# ---------------------------------------------------------------- I. the giant killer: the map
MAPP = [np.array(p) for p in json.load(open(E.STORY + "graphics/europe_map.json"))]
MAPB = [(p[:, 0].min(), p[:, 0].max(), p[:, 1].min(), p[:, 1].max()) for p in MAPP]
MONACO, TURINI = (7.42, 43.73), (7.389, 43.977)
STARTS = [(-4.25, 55.86), (-0.13, 51.5), (2.35, 48.86), (10.75, 59.91), (18.07, 59.33), (21.0, 52.2), (23.7, 37.98), (-9.14, 38.72), (8.68, 50.11)]
def draw_map(d, view, a):
    cx, cy, span = view; s = W / span; ky = 1.4
    lon0, lon1 = cx - span / 2, cx + span / 2; lat0, lat1 = cy - H / s / ky / 2, cy + H / s / ky / 2
    for p, (x0, x1, y0, y1) in zip(MAPP, MAPB):
        if x1 < lon0 or x0 > lon1 or y1 < lat0 or y0 > lat1: continue
        xy = np.column_stack((W / 2 + (p[:, 0] - cx) * s, H / 2 - (p[:, 1] - cy) * s * ky))
        d.polygon([tuple(q) for q in xy], fill=rgba((46, 64, 104), a), outline=rgba(GOLD, 0.55 * a))
    return lambda lon, lat: (W / 2 + (lon - cx) * s, H / 2 - (lat - cy) * s * ky)

def europe_map(d, L, t, sc):
    z0 = at("The last night", sc) - 0.2; zf = ease((t - z0) / 1.8) if t > z0 else 0.0
    v0, v1 = (7.0, 48.5, 46.0), (7.6, 44.6, 8.0)
    span = math.exp(math.log(v0[2]) + (math.log(v1[2]) - math.log(v0[2])) * zf)
    g = (v0[2] - span) / (v0[2] - v1[2]); view = (v0[0] + (v1[0] - v0[0]) * g, v0[1] + (v1[1] - v0[1]) * g, span)
    d.rectangle((0, 0, W, H), fill=rgba(NAVY_D, 1)); P = draw_map(d, view, 1.0)
    mx, my = P(*MONACO)
    # routes: dots stream in from the start towns to Monaco
    ra = ramp(t, 0.3, 0.8) * (1 - zf)
    if ra > 0:
        for i, (lo, la) in enumerate(STARTS):
            sx, sy = P(lo, la); k = 0.3 + i * 0.15
            f = ramp(t, k, k + 1.6)
            mxp, myp = (sx + mx) / 2 + (sy - my) * 0.12, (sy + my) / 2 - (sx - mx) * 0.12      # gentle curve
            pts = [((1 - u) ** 2 * sx + 2 * (1 - u) * u * mxp + u * u * mx, (1 - u) ** 2 * sy + 2 * (1 - u) * u * myp + u * u * my) for u in np.linspace(0, f, 30)]
            if len(pts) > 1: d.line(pts, fill=rgba(CREAM, 0.7 * ra), width=4)
            d.ellipse((sx - 9, sy - 9, sx + 9, sy + 9), fill=rgba(CREAM, ra))
            u = (t * 0.45 + i * 0.13) % 1 * f
            px, py = (1 - u) ** 2 * sx + 2 * (1 - u) * u * mxp + u * u * mx, (1 - u) ** 2 * sy + 2 * (1 - u) * u * myp + u * u * my
            d.ellipse((px - 7, py - 7, px + 7, py + 7), fill=rgba(MRED, ra))
        tracked(d, (W / 2, 120), "FROM ALL OVER EUROPE  ·  TO MONACO", cond(38, 2), rgba(GOLD, ra), 8, "center")
    pr = 16 + 6 * math.sin(t * 6)
    d.ellipse((mx - pr, my - pr, mx + pr, my + pr), fill=rgba(RED, 1), outline=rgba(WHITE, 1), width=4)
    tracked(d, (mx + 34, my + 4), "MONACO", cond(44, 8), rgba(WHITE, 1), 6)
    if zf > 0.6:                                                            # the col, above the Riviera, with snow
        b = ramp(zf, 0.6, 1.0); tx, ty = P(*TURINI)
        for k in range(5):
            an = -math.pi / 2 + k * 2 * math.pi / 5; an2 = an + math.pi / 5
            pts = []
            for j in range(5):
                a1 = an + j * 2 * math.pi / 5; a2 = a1 + math.pi / 5
                pts += [(tx + 34 * math.cos(a1), ty + 34 * math.sin(a1)), (tx + 14 * math.cos(a2), ty + 14 * math.sin(a2))]
        d.polygon(pts, fill=rgba(GOLD, b))
        d.line((tx - 30, ty - 30, tx - 160, ty - 160), fill=rgba(WHITE, b), width=3)
        tracked(d, (tx - 180, ty - 260), "COL DE TURINI", cond(56, 8), rgba(WHITE, b), 8, "right")
        tracked(d, (tx - 180, ty - 190), "1,607 M  ·  THE LAST NIGHT", cond(32, 2), rgba(GOLD, b), 6, "right")
        rng = np.random.default_rng(3)
        for k in range(140):                                                # snow
            x0 = rng.uniform(0, W); sp = rng.uniform(60, 160); ph = rng.uniform(0, H)
            y = (ph + t * sp) % H; x = x0 + 30 * math.sin(t * 1.3 + k)
            r = rng.uniform(2, 5); d.ellipse((x - r, y - r, x + r, y + r), fill=rgba(WHITE, 0.6 * b))

# ---------------------------------------------------------------- size: Mini vs the V8 Ford
def size_card(d, L, t, sc):
    tracked(d, (W / 2, 140), "THE GIANT KILLER", cond(38, 2), rgba(GOLD, ramp(t, 0, 0.4)), 8, "center")
    ground = 760; a = ramp(t, 0.1, 0.5); ML = 700
    mx = -800 + 920 * ease(min(1, t / 1.0))                                 # the Mini drives in
    mini_side(d, mx, ground - 0.45 * ML + 6, ML, a, MRED, 37)
    d.line((120, ground + 30, 1800, ground + 30), fill=rgba(CREAM, 0.35 * a), width=3)
    m = ramp(t, 1.0, 1.6)                                                   # tape measure
    if m > 0:
        x0, x1 = mx, mx + ML * m; y = ground + 70
        d.line((x0, y, x1, y), fill=rgba(GOLD, 1), width=6)
        for k in range(11):
            xx = x0 + ML / 10 * k
            if xx <= x1: d.line((xx, y - 14, xx, y + 14), fill=rgba(GOLD, 1), width=4)
        tracked(d, (mx + ML / 2, y + 36), "ABOUT 10 FEET", cond(46, 8), rgba(GOLD, m), 8, "center")
    k = at("It beat big American", sc); f = ramp(t, k - 0.4, k + 0.6)
    g = ramp(t, 1.2, 1.6) * (1 - f)
    text_top(d, (1350, 330), "A family car.", pf(110, 900), rgba(CREAM, g), "center")
    tracked(d, (1350, 500), "TINY  ·  CHEAP  ·  FRONT-WHEEL DRIVE", cond(40, 8), rgba(GOLD, g), 8, "center")
    if f > 0:                                                               # the V8 Ford rolls in, half as long again
        Lf = ML * 1.5; fx = W + 40 - (W + 40 - 860) * f
        ford_side(d, fx, ground - 0.215 * Lf + 2, Lf, f, (110, 132, 168), facing=-1)
        tracked(d, (fx + Lf / 2, ground + 70), "AMERICAN V8 FORD", cond(46, 8), rgba(CREAM, f), 8, "center")
        tracked(d, (fx + Lf / 2, ground - 0.215 * Lf - 60), "BIGGER  ·  FAR MORE POWER", cond(30, 2), rgba(RED, ramp(t, k + 0.3, k + 0.7)), 6, "center")

def telegram(d, L, t, sc):
    a = ramp(t, 0, 0.35); y0 = 220 + 600 * (1 - ease(min(1, t / 0.5)))
    paper = Image.new("RGBA", (1100, 600), (0, 0, 0, 0)); pd = ImageDraw.Draw(paper)
    pd.rectangle((0, 0, 1099, 599), fill=(236, 226, 196, 255))
    pd.rectangle((0, 0, 1099, 110), fill=(196, 160, 70, 255))
    tracked(pd, (550, 32), "TELEGRAM", cond(64, 8), (60, 40, 20, 255), 22, "center")
    for k in range(4): pd.line((60, 330 + k * 60, 1040, 330 + k * 60), fill=(190, 180, 150, 255), width=2)
    lines = [("TO:", "PADDY HOPKIRK"), ("FROM:", "THE BEATLES")]
    n = int(max(0, t - 0.6) * 22)                                           # typewriter
    for i, (lab, txt) in enumerate(lines):
        tracked(pd, (70, 160 + i * 80), lab, cond(40, 2), (90, 70, 50, 255), 6)
        shown = txt[:max(0, n - i * 14)]
        tracked(pd, (260, 160 + i * 80), shown, cond(52, 8), (30, 24, 20, 255), 8)
    paper = paper.rotate(-3, expand=True, resample=Image.BICUBIC)
    if a < 1: paper = Image.fromarray((np.asarray(paper) * np.array([1, 1, 1, a])).astype(np.uint8))
    L.alpha_composite(paper, (int(W / 2 - paper.width / 2), int(y0)))
    tracked(d, (W / 2, 140), "1964  ·  HOME A HERO", cond(38, 2), rgba(GOLD, a), 8, "center")

def survivors(d, L, t, sc):
    """1965: a field of 200-plus cars; on 'Only thirty-five' all but 35 tumble away."""
    tracked(d, (W / 2, 110), "MONTE CARLO RALLY  ·  1965  ·  THE BLIZZARD", cond(36, 2), rgba(GOLD, ramp(t, 0, 0.4)), 8, "center")
    k = at("Only thirty-five", sc); rng = np.random.default_rng(65); keep = set(rng.choice(216, 35, replace=False).tolist())
    cols, s = 12, 70
    for i in range(216):
        c, r = i % cols, i // cols; x = 700 + c * 96; y = 210 + r * 44
        a = ramp(t, 0.1 + i * 0.006, 0.3 + i * 0.006)
        if a <= 0: continue
        if i in keep: col = GOLD if t > k else CREAM
        else:
            col = CREAM; u = t - k - (i % 17) * 0.03
            if u > 0: y += 900 * u * u; a *= max(0, 1 - u * 1.6); x += 60 * u * ((i % 5) - 2)
        if a > 0:
            im = car_img(76, MRED if col == GOLD else (150, 150, 160), "mini")
            if a < 1: im = Image.fromarray((np.asarray(im) * np.array([1, 1, 1, a])).astype(np.uint8))
            L.alpha_composite(im, (int(x), int(y)))
    b = ramp(t, 0.3, 0.7) * (1 - ramp(t, k - 0.1, k + 0.2))
    text_top(d, (350, 360), "200+", pf(190, 900), rgba(CREAM, b), "center")
    tracked(d, (350, 600), "STARTED", cond(48, 8), rgba(GOLD, b), 10, "center")
    c = ramp(t, k, k + 0.3)
    text_top(d, (350, 360), "35", pf(220, 900), rgba(GOLD, c), "center")
    tracked(d, (350, 620), "FINISHED", cond(48, 8), rgba(CREAM, c), 10, "center")

# ---------------------------------------------------------------- II. the new rules
def weight(d, cx, y, w, h, a, text="HANDICAP"):
    d.polygon([(cx - w * 0.38, y), (cx + w * 0.38, y), (cx + w / 2, y + h), (cx - w / 2, y + h)], fill=rgba((60, 62, 70), a), outline=rgba(SILVER, a))
    d.rounded_rectangle((cx - w * 0.16, y - h * 0.32, cx + w * 0.16, y + 6), 14, outline=rgba(SILVER, a), width=10)
    tracked(d, (cx, y + h * 0.42), text, cond(int(h * 0.26), 8), rgba(WHITE, a), 6, "center")

def stopwatch(d, cx, cy, r, secs, a, col=GOLD):
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=rgba(NAVY_D, a), outline=rgba(CREAM, a), width=8)
    d.rectangle((cx - 22, cy - r - 46, cx + 22, cy - r - 8), fill=rgba(CREAM, a))
    for k in range(60):
        an = k * math.pi / 30; r0 = 0.86 if k % 5 else 0.78
        d.line((cx + r0 * r * math.sin(an), cy - r0 * r * math.cos(an), cx + 0.94 * r * math.sin(an), cy - 0.94 * r * math.cos(an)), fill=rgba(CREAM, 0.7 * a), width=3 if k % 5 else 5)
    an = (secs % 60) / 60 * 2 * math.pi
    d.line((cx, cy, cx + 0.8 * r * math.sin(an), cy - 0.8 * r * math.cos(an)), fill=rgba(col, a), width=8)
    d.ellipse((cx - 12, cy - 12, cx + 12, cy + 12), fill=rgba(col, a))

def handicap(d, L, t, sc):
    tracked(d, (W / 2, 120), "THE NEW RULES  ·  1966", cond(38, 2), rgba(GOLD, ramp(t, 0, 0.4)), 8, "center")
    a = ramp(t, 0.1, 0.5); k = 2.0
    off, f = drop(t, k, 0.35, 700); sq = 14 * math.sin(min(1, max(0, t - k - 0.35) / 0.4) * math.pi) if t > k + 0.35 else 0
    dx, dy = shake(t, k + 0.35, 16)
    mini_side(d, 160 + dx, 560 + sq + dy, 760, a, MRED, None)
    tracked(d, (540 + dx, 940), "MODIFIED FOR COMPETITION", cond(40, 8), rgba(CREAM, a), 6, "center")
    if t > k - 0.4: weight(d, 520 + dx, 300 + off + dy + sq, 420, 260, ramp(t, k - 0.4, k - 0.1))
    b = ramp(t, k + 0.4, k + 0.8)
    if b > 0:
        secs = 10 + min(1, (t - k - 0.4) / 1.2) * 35
        stopwatch(d, 1480, 520, 230, secs, b, RED)
        tracked(d, (1480, 820), "+ TIME", cond(64, 8), rgba(RED, b), 10, "center")
        tracked(d, (1480, 905), "A HEAVY HANDICAP", cond(36, 8), rgba(CREAM, b), 8, "center")

def five_thousand(d, L, t, sc):
    tracked(d, (W / 2, 90), "TO RACE AS A STANDARD CAR", cond(36, 2), rgba(GOLD, ramp(t, 0, 0.4)), 8, "center")
    n = int(5000 * ease(min(1, max(0, t - 0.3) / 3.2)))
    cols, rows = 25, 14; cells = cols * rows; shown = int(cells * n / 5000)
    im = car_img(64, MRED, "mini")
    for i in range(shown):
        c, r = i % cols, i // cols
        L.alpha_composite(im, (int(150 + c * 66), int(150 + r * 58)))
    d.rounded_rectangle((W / 2 - 430, 380, W / 2 + 430, 760), 24, fill=rgba(NAVY_D, 0.9), outline=rgba(GOLD, 1), width=4)
    text_top(d, (W / 2, 410), f"{n:,}", pf(200, 900), rgba(CREAM, 1), "center")
    tracked(d, (W / 2, 680), "BUILT TO THE SAME SPEC", cond(44, 8), rgba(GOLD, ramp(t, 0.5, 0.9)), 10, "center")

def small_print(d, L, t, sc):
    """A page of rules scrolls up; a magnifier finds the line about the lights."""
    a = ramp(t, 0, 0.3); x0, x1 = 360, 1560
    d.rectangle((x0, 0, x1, H), fill=rgba((236, 229, 212), a))
    scroll = 260 * ease(min(1, t / 1.4)); rng = np.random.default_rng(9)
    tracked(d, (W / 2, 90 - scroll), "REGULATIONS  ·  1966  ·  STANDARD CARS", cond(40, 8), rgba(INKC, a), 8, "center")
    target = 9
    for k in range(26):
        y = 190 + k * 46 - scroll; w = rng.uniform(0.6, 1.0) * (x1 - x0 - 160)
        if k == target:
            hl = ramp(t, 1.5, 1.9)
            if hl > 0: d.rectangle((x0 + 70, y - 12, x0 + 90 + 820 * hl, y + 34), fill=rgba((250, 222, 90), 0.85 * a))
            tracked(d, (x0 + 80, y - 4), "… LIGHTS: AS STANDARD …", cond(36, 8), rgba(INKC, a), 6)
        else: d.rectangle((x0 + 80, y, x0 + 80 + w, y + 14), fill=rgba(INKC, 0.28 * a))
    m = ramp(t, 0.8, 1.6); y = 190 + target * 46 - scroll + 10
    if m > 0:                                                               # magnifier glides to the line
        cx = 1700 - (1700 - (x0 + 420)) * m; cy = 900 - (900 - y) * m
        d.ellipse((cx - 150, cy - 150, cx + 150, cy + 150), outline=rgba(GOLD, 1), width=16)
        d.line((cx + 105, cy + 105, cx + 230, cy + 230), fill=rgba(GOLD, 1), width=30)
    tracked(d, (W / 2, 990), "THE SMALL PRINT", cond(46, 8), rgba(RED, ramp(t, 1.9, 2.3)), 12, "center")

# ---------------------------------------------------------------- IV. the panic
def gear(d, cx, cy, r, n, rot, a, lit=0, col=SILVER):
    pts = []
    for k in range(n * 2):
        an = rot + k * math.pi / n; rr = r if k % 2 == 0 else r * 0.84
        for e in (-0.32, 0.32): pts.append((cx + rr * math.cos(an + e * math.pi / n), cy + rr * math.sin(an + e * math.pi / n)))
    d.polygon(pts, fill=rgba(col, a))
    for k in range(lit):                                                    # counted teeth glow gold
        an = rot + 2 * k * math.pi / n; tp = [(cx + rr_ * math.cos(an + e * math.pi / n), cy + rr_ * math.sin(an + e * math.pi / n))
                                               for rr_, e in ((r * 0.84, -0.32), (r, -0.32), (r, 0.32), (r * 0.84, 0.32))]
        d.polygon(tp, fill=rgba(GOLD, a))
    d.ellipse((cx - r * 0.5, cy - r * 0.5, cx + r * 0.5, cy + r * 0.5), fill=rgba(NAVY_D, a))
    d.ellipse((cx - r * 0.2, cy - r * 0.2, cx + r * 0.2, cy + r * 0.2), fill=rgba(col, a))

def teeth(d, L, t, sc):
    tracked(d, (W / 2, 110), "THE SCRUTINEERS  ·  MONACO", cond(38, 2), rgba(GOLD, ramp(t, 0, 0.4)), 8, "center")
    a = ramp(t, 0.1, 0.5); k = at("Hopkirk later said", sc)
    rot = -t * 0.35; lit = min(24, int(max(0, t - k) * 8))
    gear(d, 620, 560, 330, 24, rot, a, lit)
    gear(d, 1060, 330, 150, 12, t * 0.7, a * 0.8, 0, (150, 156, 166))
    text_top(d, (1420, 380), str(lit), pf(240, 900), rgba(GOLD if lit else CREAM, ramp(t, k, k + 0.3)), "center")
    tracked(d, (1420, 680), "TEETH COUNTED", cond(44, 8), rgba(CREAM, ramp(t, k, k + 0.3)), 8, "center")
    tracked(d, (W / 2, 960), "THEY EVEN COUNTED THE TEETH ON THE GEARS  ·  HOPKIRK, LATER", cond(36, 8), rgba(CREAM, ramp(t, k + 0.6, k + 1.0)), 6, "center")
    tracked(d, (1420, 300), "STRIPPED DOWN", cond(40, 8), rgba(RED, ramp(t, 0.3, 0.7) * (1 - ramp(t, k - 0.2, k))), 8, "center")

def long_night(d, L, t, sc):
    tracked(d, (W / 2, 110), "HOW LONG DID THE CHECKS TAKE?", cond(38, 2), rgba(GOLD, ramp(t, 0, 0.4)), 8, "center")
    a = ramp(t, 0.1, 0.5); k2 = at("Others say", sc)
    hrs = 8 * ease(min(1, t / 2.2)) + (12 * ease(min(1, (t - k2) / 2.2)) if t > k2 else 0)
    cx, cy, r = 620, 560, 330
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=rgba(NAVY_D, a), outline=rgba(CREAM, a), width=10)
    for k in range(12):
        an = k * math.pi / 6; d.line((cx + 0.82 * r * math.sin(an), cy - 0.82 * r * math.cos(an), cx + 0.94 * r * math.sin(an), cy - 0.94 * r * math.cos(an)), fill=rgba(CREAM, a), width=8)
    ah = hrs / 12 * 2 * math.pi; am = hrs * 2 * math.pi
    d.line((cx, cy, cx + 0.5 * r * math.sin(ah), cy - 0.5 * r * math.cos(ah)), fill=rgba(GOLD, a), width=16)
    d.line((cx, cy, cx + 0.8 * r * math.sin(am), cy - 0.8 * r * math.cos(am)), fill=rgba(CREAM, a), width=8)
    d.ellipse((cx - 18, cy - 18, cx + 18, cy + 18), fill=rgba(GOLD, a))
    b = ramp(t, 0.4, 0.8) * (1 - 0.6 * ramp(t, k2, k2 + 0.3))
    text_top(d, (1400, 330), "8 hours?", pf(130, 900), rgba(CREAM, b), "center")
    c = ramp(t, k2, k2 + 0.4)
    text_top(d, (1400, 520), "Almost a day?", pf(110, 900), rgba(GOLD, c), "center")
    tracked(d, (1400, 760), "ACCOUNTS DIFFER", cond(40, 8), rgba(RED, ramp(t, k2 + 0.8, k2 + 1.2)), 10, "center")

# ---------------------------------------------------------------- V. thrown out: the lamps
def beam(L, x, y, length, spread, a, col=(255, 240, 190), up=0.0):
    """A soft light cone from (x, y) to the right; up tilts it (radians, + = up)."""
    if a <= 0: return
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0)); bd = ImageDraw.Draw(lay)
    for k in range(6, 0, -1):
        s = spread * k / 6; ln = length * (0.6 + 0.4 * k / 6)
        ex = x + ln * math.cos(-up); ey = y + ln * math.sin(-up)
        nx, ny = -math.sin(-up), math.cos(-up)
        bd.polygon([(x, y - 10), (x, y + 10), (ex + nx * s, ey + ny * s), (ex - nx * s, ey - ny * s)], fill=col + (int(40 * a),))
    L.alpha_composite(lay.filter(ImageFilter.GaussianBlur(12)))

def bulb(d, L, cx, cy, r, a, glow, col=(255, 236, 170), filaments=1, lit=(1, 1)):
    if glow > 0:                                                            # glow on its own layer so it blends
        g = Image.new("RGBA", (W, H), (0, 0, 0, 0)); gd = ImageDraw.Draw(g); R = r * (1 + 1.8 * glow)
        gd.ellipse((cx - R, cy - R, cx + R, cy + R), fill=col + (int(150 * glow * a),))
        L.alpha_composite(g.filter(ImageFilter.GaussianBlur(r * 0.6)))
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=rgba((230, 235, 240), 0.25 * a), outline=rgba(WHITE, a), width=6)
    d.rectangle((cx - r * 1.55, cy - r * 0.42, cx - r * 0.8, cy + r * 0.42), fill=rgba(SILVER, a))
    for j in range(filaments):
        yy = cy + (j - (filaments - 1) / 2) * r * 0.5; on = lit[j] if j < len(lit) else 1
        pts = [(cx - r * 0.5 + i * r * 0.1, yy + (r * 0.07 if i % 2 else -r * 0.07)) for i in range(11)]
        d.line(pts, fill=rgba((255, 200, 80) if on else (120, 110, 100), a), width=max(4, int(r * 0.04)))

def iodine(d, L, t, sc):
    a = ramp(t, 0.1, 0.5)
    bulb(d, L, 330, 360, 110, a, 0.3); beam(L, 450, 360, 700, 110, a * 0.5)
    tracked(d, (330, 510), "ORDINARY BULB", cond(40, 8), rgba(CREAM, a), 6, "center")
    k = 1.2; b = ramp(t, k, k + 0.25); fl = 1 if t > k + 0.35 or (t > k and int(t * 20) % 2) else 0.4
    bulb(d, L, 330, 780, 110, b, 1.0 * fl, (255, 255, 235)); beam(L, 450, 780, 1500, 300, b * fl * 1.6, (255, 255, 240))
    tracked(d, (330, 930), "QUARTZ IODINE", cond(40, 8), rgba(RED, b), 6, "center")
    tracked(d, (1350, 560), "MUCH BRIGHTER", cond(80, 8), rgba(WHITE, ramp(t, k + 0.6, k + 1.0)), 14, "center")
    tracked(d, (W / 2, 110), "THE MINIS' LAMPS", cond(38, 2), rgba(GOLD, ramp(t, 0, 0.4)), 8, "center")

def no_dip(d, L, t, sc):
    a = ramp(t, 0.1, 0.5); bulb(d, L, 460, 540, 210, a, 0.9, (255, 255, 235), 1); beam(L, 680, 540, 1300, 240, a * 1.4, (255, 255, 240))
    tracked(d, (460, 830), "ONE FILAMENT  ·  ONE BEAM", cond(44, 8), rgba(CREAM, a), 8, "center")
    k = at("They couldn't dip", sc); sw = ramp(t, k, k + 0.15)
    x, y = 1500, 300                                                        # the dip switch flicks... and nothing changes
    d.rounded_rectangle((x - 130, y - 80, x + 130, y + 80), 24, fill=rgba(NAVY_D, a), outline=rgba(CREAM, a), width=6)
    lx = x - 60 + 120 * sw; d.ellipse((lx - 55, y - 55, lx + 55, y + 55), fill=rgba(GOLD, a))
    tracked(d, (x, y + 115), "DIP?", cond(60, 8), rgba(CREAM, a), 8, "center")
    c = ramp(t, k + 0.3, k + 0.5)
    if c > 0:
        r = 150; cx, cy = 1500, 680
        d.line((cx - r, cy - r, cx + r, cy + r), fill=rgba(RED, c), width=28); d.line((cx + r, cy - r, cx - r, cy + r), fill=rgba(RED, c), width=28)
        tracked(d, (cx, cy + 200), "CAN'T DIP", cond(60, 8), rgba(RED, c), 10, "center")
    tracked(d, (W / 2, 110), "QUARTZ IODINE  ·  ONE FILAMENT", cond(38, 2), rgba(GOLD, ramp(t, 0, 0.4)), 8, "center")

def twin(d, L, t, sc):
    a = ramp(t, 0.1, 0.5); dip = int(max(0, t - 0.8) / 1.1) % 2 == 1
    bulb(d, L, 460, 540, 210, a, 0.7, filaments=2, lit=(0, 1) if dip else (1, 0))
    beam(L, 680, 540, 1250, 200, a * 1.2, up=-0.22 if dip else 0.04)
    tracked(d, (460, 830), "ONE BULB  ·  TWO FILAMENTS", cond(44, 8), rgba(CREAM, a), 8, "center")
    tracked(d, (1450, 260), "DIPPED BEAM" if dip else "MAIN BEAM", cond(72, 8), rgba(GOLD if dip else WHITE, a), 12, "center")
    tracked(d, (W / 2, 960), "DIP THE WAY THE FACTORY BUILT IT", cond(48, 8), rgba(CREAM, ramp(t, 1.2, 1.6)), 10, "center")
    tracked(d, (W / 2, 110), "THE RULE FOR STANDARD CARS", cond(38, 2), rgba(GOLD, ramp(t, 0, 0.4)), 8, "center")

def doc(d, x, y, w, h, a, title, col=(236, 229, 212)):
    d.polygon([(x, y), (x + w - 50, y), (x + w, y + 50), (x + w, y + h), (x, y + h)], fill=rgba(col, a))
    d.polygon([(x + w - 50, y), (x + w - 50, y + 50), (x + w, y + 50)], fill=rgba((200, 190, 170), a))
    tracked(d, (x + w / 2, y + 40), title, cond(34, 8), rgba(INKC, a), 6, "center")
    for k in range(6): d.rectangle((x + 40, y + 110 + k * 40, x + w - 40 - (k % 3) * 40, y + 122 + k * 40), fill=rgba(INKC, 0.3 * a))

def final_rule(d, L, t, sc):
    tracked(d, (W / 2, 110), "THE FINAL VERSION OF THE RULE", cond(38, 2), rgba(GOLD, ramp(t, 0, 0.4)), 8, "center")
    a = ramp(t, 0.1, 0.5); kf = at("The French teams", sc)
    for i, (who, x) in enumerate((("BRITISH TEAMS", 480), ("FRENCH TEAMS", 1440))):
        d.rounded_rectangle((x - 300, 640, x + 300, 940), 20, fill=rgba(NAVY_D, 0.9 * a), outline=rgba(GOLD, a), width=4)
        tracked(d, (x, 870), who, cond(44, 8), rgba(CREAM, a), 8, "center")
    # the rule floats in the middle, then flies to the French side
    px = 960 + (1440 - 960) * ease(max(0.0, (t - kf + 0.6) / 0.8))
    py = 230 + 40 * math.sin(t * 2)
    doc(d, px - 160, py, 320, 380, a, "FINAL RULE")
    q = ramp(t, 1.2, 1.6)
    text_top(d, (480, 660), "?", pf(180, 900), rgba(RED, q), "center")
    c = ramp(t, kf, kf + 0.4)
    if c > 0:
        d.line((1380, 760, 1430, 820), fill=rgba(GOLD, c), width=18); d.line((1430, 820, 1530, 690), fill=rgba(GOLD, c), width=18)
    tracked(d, (W / 2, 1000), "IT WAS SAID  ·  REPORTEDLY", cond(32, 8), rgba(CREAM, 0.8 * ramp(t, 1.0, 1.4)), 8, "center")

def skittles(d, L, t, sc):
    """Ten cars standing in a row; a ball rolls through and knocks every one over. Then the stamp."""
    tracked(d, (W / 2, 140), "MONTE CARLO RALLY 1966  ·  THROWN OUT", cond(38, 2), rgba(GOLD, ramp(t, 0, 0.4)), 8, "center")
    ground = 700; s = 168; xs = [60 + i * 180 for i in range(10)]; down = 0
    bx = -120 + 2300 * ease(min(1, max(0, t - 0.6) / 2.4))
    for i, x in enumerate(xs):
        a = ramp(t, 0.05 * i, 0.2 + 0.05 * i)
        col = MRED if i < 3 else ((70, 110, 190) if i == 4 else (110, 120, 140) if i != 3 else (230, 230, 225))
        im = car_img(s, col)
        hit = bx > x + 40; u = min(1, max(0, (bx - x - 40) / 260)); down += hit
        if hit:
            im = im.rotate(-95 * ease(u), expand=True, resample=Image.BICUBIC)
            yo = -40 * math.sin(u * math.pi)
        else: yo = 0
        if a < 1: im = Image.fromarray((np.asarray(im) * np.array([1, 1, 1, a])).astype(np.uint8))
        L.alpha_composite(im, (int(x + s * 0.55 - im.width / 2 + (30 * u if hit else 0)), int(ground - im.height + yo + (30 if hit else 0))))
        tracked(d, (x + s * 0.55, ground + 60), str(i + 1), cond(40, 8), rgba(CREAM, a), 4, "center")
    if -100 < bx < W + 100:
        r = 80; d.ellipse((bx - r, ground - 2 * r + 20, bx + r, ground + 20), fill=rgba((24, 24, 30), 1), outline=rgba(SILVER, 0.6), width=3)
        for k in range(3):
            an = -bx / r + k * 2.1; d.ellipse((bx + 26 * math.cos(an) - 8, ground - r + 20 + 26 * math.sin(an) - 8, bx + 26 * math.cos(an) + 8, ground - r + 20 + 26 * math.sin(an) + 8), fill=rgba(SILVER, 0.7))
    d.line((60, ground + 22, 1860, ground + 22), fill=rgba(CREAM, 0.3), width=3)
    text_top(d, (W / 2, 230), str(down), pf(180, 900), rgba(RED if down == 10 else CREAM, ramp(t, 0.5, 0.9)), "center")
    k = 3.3
    place_stamp(L, W / 2, 900, ramp(t, k - 0.05, k + 0.18), text="10 CARS DISQUALIFIED", size=110, rot=-6)

# ---------------------------------------------------------------- VI. the winner nobody wanted
def crown(d, cx, cy, s, a, col=GOLD):
    pts = [(cx - s, cy + s * 0.5), (cx - s, cy - s * 0.3), (cx - s * 0.5, cy + s * 0.05), (cx, cy - s * 0.6), (cx + s * 0.5, cy + s * 0.05), (cx + s, cy - s * 0.3), (cx + s, cy + s * 0.5)]
    d.polygon(pts, fill=rgba(col, a))
    for px, py in pts[1:6:2] + [pts[3]]: d.ellipse((px - s * 0.1, py - s * 0.1, px + s * 0.1, py + s * 0.1), fill=rgba(WHITE, a))
    d.rectangle((cx - s, cy + s * 0.5, cx + s, cy + s * 0.7), fill=rgba(col, a))

def rainier(d, L, t, sc):
    a = ramp(t, 0.1, 0.5)
    crown(d, W / 2, 260, 110, a)
    if 0 < (t - 0.8) / 0.5 < 1:
        g = (t - 0.8) / 0.5; x = W / 2 - 110 + 220 * g; d.line((x, 200, x - 40, 330), fill=rgba(WHITE, 0.8), width=10)
    tracked(d, (W / 2, 420), "MONACO", cond(36, 2), rgba(GOLD, a), 10, "center")
    text_top(d, (W / 2, 470), "Prince Rainier", pf(130, 900), rgba(CREAM, a), "center")
    tracked(d, (W / 2, 660), "UNHAPPY TOO", cond(46, 8), rgba(CREAM, ramp(t, 0.8, 1.2) * (1 - ramp(t, at("He left", sc) - 0.2, at("He left", sc)))), 10, "center")
    k = at("He left", sc); b = ramp(t, k, k + 0.4)
    if b > 0:
        tracked(d, (W / 2, 660), "LEFT BEFORE THE PRIZE-GIVING", cond(52, 8), rgba(RED, b), 10, "center")
        x = W / 2 - 120 + 380 * ease(min(1, (t - k) / 1.4))                 # an EXIT arrow sweeps off
        arrow(d, (W / 2 - 200, 820), (x + 200, 820), 1, GOLD, 10, 30)

# ---------------------------------------------------------------- VII. the backfire
def fiasco(d, L, t, sc):
    rng = np.random.default_rng(66)
    for k in range(14):                                                     # papers flutter down
        x0 = rng.uniform(80, W - 80); sp = rng.uniform(90, 180); y = -120 + ((t * sp + rng.uniform(0, H)) % (H + 240))
        an = math.sin(t * 2 + k) * 0.6; w_, h_ = 90, 120
        pts = [(x0 + w_ / 2 * math.cos(an) * sx - h_ / 2 * math.sin(an) * sy, y + w_ / 2 * math.sin(an) * sx + h_ / 2 * math.cos(an) * sy) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
        d.polygon(pts, fill=rgba((70, 82, 112), 1))
    tracked(d, (W / 2, 250), "WHAT ONE BRITISH MAGAZINE CALLED IT", cond(38, 2), rgba(GOLD, ramp(t, 0, 0.4)), 8, "center")
    words = ["The", "Monte", "Carlo", "Fiasco."]; f = pf(150, 900); x = W / 2 - (sum(f.getlength(w_) for w_ in words) + 40 * 3) / 2
    for i, w_ in enumerate(words):
        k = 0.4 + i * 0.25; off, ff = drop(t, k, 0.3, 260); a = ramp(t, k, k + 0.1)
        text_top(d, (x, 420 + off), w_, f, rgba(CREAM if i < 3 else RED, a)); x += f.getlength(w_) + 40

def newspaper(d, x, y, w, a, rot=0.0):
    h = w * 1.3; c, s_ = math.cos(rot), math.sin(rot)
    P = lambda px, py: (x + px * c - py * s_, y + px * s_ + py * c)
    d.polygon([P(-w / 2, -h / 2), P(w / 2, -h / 2), P(w / 2, h / 2), P(-w / 2, h / 2)], fill=rgba((236, 229, 212), a))
    d.polygon([P(-w / 2 + 12, -h / 2 + 14), P(w / 2 - 12, -h / 2 + 14), P(w / 2 - 12, -h / 2 + 40), P(-w / 2 + 12, -h / 2 + 40)], fill=rgba(INKC, a))
    for k in range(5):
        yy = -h / 2 + 64 + k * 22; d.line([P(-w / 2 + 12, yy), P(w / 2 - 12 - (k % 2) * 30, yy)], fill=rgba(INKC, 0.4 * a), width=5)

def publicity(d, L, t, sc):
    n = min(10, 1 + int(max(0, t - 0.4) * 2.4))
    rng = np.random.default_rng(10)
    for k in range(n * 6):
        x = rng.uniform(80, W - 80); y = rng.uniform(120, H - 100); rot = rng.uniform(-0.5, 0.5); w_ = rng.uniform(110, 170)
        kk = k / 6 / 2.4 + 0.4; off, f = drop(t, kk, 0.3, 200)
        newspaper(d, x, y + off, w_, 0.85 * ramp(t, kk, kk + 0.1), rot)
    d.rounded_rectangle((W / 2 - 360, 300, W / 2 + 360, 780), 30, fill=rgba(NAVY_D, 0.92), outline=rgba(GOLD, 1), width=5)
    text_top(d, (W / 2, 330), f"×{n}", pf(260, 900), rgba(GOLD if n == 10 else CREAM, 1), "center")
    tracked(d, (W / 2, 640), "THE PUBLICITY OF A WIN", cond(40, 8), rgba(CREAM, 1), 8, "center")
    tracked(d, (W / 2, 700), "PADDY HOPKIRK", cond(32, 2), rgba(GOLD, 1), 8, "center")

def appeal(d, L, t, sc):
    tracked(d, (W / 2, 120), "BMC'S APPEAL", cond(38, 2), rgba(GOLD, ramp(t, 0, 0.4)), 8, "center")
    a = ramp(t, 0.1, 0.5); y = 200 + 60 * (1 - a)
    doc(d, W / 2 - 330, y, 660, 720, a, "APPEAL  ·  BMC")
    for k in range(4): d.rectangle((W / 2 - 290, y + 380 + k * 50, W / 2 + 200 - k * 40, y + 394 + k * 50), fill=rgba(INKC, 0.3 * a))
    tracked(d, (W / 2, y + 640), "OCTOBER 1966", cond(44, 8), rgba(RED, ramp(t, 0.6, 1.0)), 10, "center")
    k = atf("In October 1966", 0.7, sc); dx, dy = shake(t, k + 0.12, 16)
    place_stamp(L, W / 2 + dx, 560 + dy, ramp(t, k - 0.05, k + 0.15), text="APPEAL REJECTED", size=130, rot=-10)

# ---------------------------------------------------------------- VIII. what happened next
def makinen_titles(d, L, t, sc):
    tracked(d, (W / 2, 120), "TIMO MÄKINEN", cond(40, 8), rgba(GOLD, ramp(t, 0, 0.4)), 10, "center")
    cups = [("1000 LAKES", GOLD)] * 4 + [("RAC", SILVER)] * 3
    for i, (lab, col) in enumerate(cups):
        k = 0.2 + i * 0.28; a = ramp(t, k, k + 0.1)
        if a <= 0: continue
        off, f = drop(t, k, 0.35, 300); x = 260 + i * 233 + (60 if i >= 4 else 0)
        trophy(d, x, 640 + off, 260, a, col, (t - k - 0.35) / 0.5 if t > k + 0.35 else -1)
    tracked(d, (260 + 1.5 * 233, 690), "FINLAND'S 1000 LAKES  ×4", cond(38, 8), rgba(GOLD, ramp(t, 1.3, 1.7)), 6, "center")
    tracked(d, (260 + 5 * 233 + 60, 690), "RAC  ×3 IN A ROW", cond(38, 8), rgba(SILVER, ramp(t, 2.2, 2.6)), 6, "center")
    k = at("He died in 2017", sc); text_top(d, (W / 2, 800), "1938 – 2017", pf(110, 800), rgba(CREAM, ramp(t, k, k + 0.5)), "center")

def group_b_link(d, L, t, sc):
    tracked(d, (W / 2, 220), "WE TOLD THAT STORY IN", cond(38, 2), rgba(GOLD, ramp(t, 0, 0.4)), 8, "center")
    a = ramp(t, 0.3, 0.8); x, y = W / 2, 330 + 30 * (1 - a)
    d.rectangle((x - 420, y, x + 420, y + 300), fill=rgba(NAVY_D, 0.92 * a), outline=rgba(GOLD, a), width=4)
    d.rectangle((x - 420, y, x + 420, y + 10), fill=rgba(RED, a))
    place_stamp(L, x, y + 80, ramp(t, 0.6, 0.85), size=60, rot=-6)
    text_top(d, (x, y + 150), "Group B.", pf(90, 800), rgba(CREAM, a), "center")
    tracked(d, (x, y + 255), "TOO FAST TO SURVIVE", cond(30), rgba(GOLD, a), 5, "center")
    tracked(d, (W / 2, 760), "LINK ON SCREEN NOW", cond(36, 8), rgba(CREAM, 0.8 * ramp(t, 1.4, 1.8)), 8, "center")

def five_million(d, L, t, sc):
    tracked(d, (W / 2, 120), "THE ORIGINAL MINI", cond(38, 2), rgba(GOLD, ramp(t, 0, 0.4)), 8, "center")
    rng = np.random.default_rng(59); im = car_img(80, MRED, "mini")
    for k in range(int(min(1, t / 3.5) * 70)):                              # Minis rain down and pile up
        x = rng.uniform(40, W - 120); y0 = rng.uniform(150, H - 80); kk = k / 20
        off, f = drop(t, kk, 0.4, 500)
        L.alpha_composite(im, (int(x), int(y0 + off)))
    n = int(5387862 * ease(min(1, max(0, t - 0.2) / 3.2)))
    d.rounded_rectangle((W / 2 - 560, 360, W / 2 + 560, 760), 30, fill=rgba(NAVY_D, 0.93), outline=rgba(GOLD, 1), width=5)
    text_top(d, (W / 2, 400), f"{n:,}", pf(170, 900), rgba(CREAM, 1), "center")
    tracked(d, (W / 2, 650), "BUILT  ·  1959 – 2000", cond(48, 8), rgba(GOLD, 1), 10, "center")

# ---------------------------------------------------------------- timeline
NIGHT, HAIR, SCRUT, POD = AI + "ai_turini_night.png", AI + "ai_turini_hairpin.png", AI + "ai_scrutineers.png", AI + "ai_lonely_podium.png"
LINEUP, MAK66, SNOW66 = M + "MonteCarlo_1966.jpg", M + "classic_and_sports_car_MAKINEN_MONTE_carlo_66_LAT_3.jpg", M + "rep00125.jpg"
ARNHEM = "Ralley_van_Monte_Carlo,_nummer_4_Rosemarie_Smith_en_Valerie_Donleo,_Bestanddeelnr_918-6807.jpg"
SMITH66 = "Ralley_van_Monte_Carlo,_de_dames-equipe,_Rosemarie_Smith_en_Valerie_Domleo_bij_c,_Bestanddeelnr_918-6803.jpg"
CORTINA, DS_GREY, DS_BLACK = "Ford_Lotus_Cortina_Mk1_-_Flickr_-_exfordy_(1).jpg", "Paris_-_Bonhams_2014_-_Citroën_DS21_Prestige_Saloon_-_1966_-_001.jpg", "Citroën_DS21_(1966)_-_45417079734.jpg"
S4 = C + "1985_Lancia_Delta_S4_(ex-Toivonen),_front_left_-_Greenwich_2021.jpg"
scenes = [
    opening(NIGHT, "The Monte Carlo Minis.", "EPISODE FIVE  ·  MONTE CARLO RALLY 1966", credit="AI illustration"),
    # cold open
    AS("January 1966.", "ai_turini_night.png", off=0, zoom=(1.0, 1.15), focus=((0.5, 0.5), (0.62, 0.6)), chapter="MONTE CARLO RALLY  ·  JANUARY 1966"),
    PS("Three little red Minis", "MonteCarlo_1966.jpg", zoom=(1.0, 1.12), strap=("The works Minis", "BMC  ·  MONTE CARLO RALLY 1966", 1.0)),
    PF("Three little red Minis", 0.5, "classic_and_sports_car_MAKINEN_MONTE_carlo_66_LAT_3.jpg", zoom=(1.0, 1.12), focus=((0.6, 0.6), (0.65, 0.6))),
    CuS("First, second and third", podium_board, bg=dimmed(MAK66)),
    CuS("It's the third year running", three_running, bg=dimmed(NIGHT)),
    VS("Then the officials take", "ai_scrutineers_clip.mp4"),
    Custom(S("And when they're done", -0.15), board_dq(lambda sc: at("Over their headlights", sc) + 0.9, lambda sc: atf("And when they're done", 0.55, sc)), bg=dimmed(SCRUT)),
    PS("This is the story of the Monte", "Monte_Carlo_Minis_(51381400422).jpg", zoom=(1.0, 1.12),
       texts=[(0.3, "The Monte Carlo Minis.", "big"), (S("The cars that won") - S("This is the story of the Monte", -0.15), "They won. They went home with nothing.", "mid+")]),
    # I. the giant killer
    AS("The Monte Carlo Rally was the most", "monaco_finish.png", zoom=(1.0, 1.12), chapter=CH("I", "THE GIANT KILLER")),
    PS("Crews set off", ARNHEM, zoom=(1.0, 1.1), strap=("Arnhem, the Netherlands", "MONTE CARLO RALLY  ·  JANUARY 1966", 0.4)),
    Custom(SF("Crews set off", 0.5), europe_map),
    PS("Snow and ice", "rep00125.jpg", zoom=(1.0, 1.1)),
    PF("Snow and ice", 0.62, "Col_de_Turini_06PF.jpg", zoom=(1.0, 1.1), strap=("Col de Turini", "THE PASS TODAY", 0.2)),
    PS("In 1964, a Northern", "paddy-hopkirk-1964.jpg", zoom=(1.0, 1.1), strap=("Paddy Hopkirk", "MONTE CARLO RALLY WINNER  ·  1964", 0.8)),
    CuS("The Mini was a tiny", size_card),
    PF("It beat big American", 0.45, "1964_Ford_Falcon_Sprint_Coupe_(16030082569).jpg", zoom=(1.0, 1.08)),
    PS("Hopkirk came home", "P90141926_highRes.jpg", zoom=(1.0, 1.1)),
    CuS("Even the Beatles", telegram, bg=dimmed(M + "P90141926_highRes.jpg")),
    PS("In 1965, a Finn", "Timo_Mäkinen_(1966)_(cropped).jpg", zoom=(1.0, 1.06), strap=("Timo Mäkinen", "FINLAND", 0.6)),
    PF("In 1965, a Finn", 0.5, "1964_Morris_Mini-Cooper_Monte_Carlo_(AJB_44B)_Heritage_Motor_Centre,_Gaydon.jpg", zoom=(1.0, 1.1),
       strap=("The 1965 winner", "MINI COOPER S  ·  AJB 44B  ·  TODAY", 0.3)),
    CuS("More than two hundred", survivors, bg=dimmed(NIGHT, 0.85)),
    # II. the new rules
    PS("For 1966, the rules changed", "classic_and_sports_car_MAKINEN_MONTE_carlo_66_LAT_3.jpg", zoom=(1.0, 1.1), chapter=CH("II", "THE NEW RULES"),
       texts=[(0.4, "1966: new rules.", "big")]),
    CuS("Cars that had been modified", handicap, bg=dimmed(SNOW66, 0.82)),
    PS("The way to win", "Mini_Cooper_S_1964_(AJB_44B)_-_2016.jpg", zoom=(1.0, 1.1), texts=[(0.4, "The way to win: a standard car.", "mid")]),
    CuS("One that had been built", five_thousand, bg=dimmed(LINEUP, 0.85)),
    PS("So BMC built", "Mini_Cooper_S_1966.jpg", zoom=(1.0, 1.1), strap=("Mini Cooper S", "5,000 BUILT AND SOLD TO QUALIFY", 0.6)),
    CuS("But there was a catch", small_print),
    PS("On a standard car", "Monte_Carlo_Minis_(51382901609).jpg", zoom=(1.0, 1.15), texts=[(0.5, "The lights had to be standard too.", "mid")]),
    # III. the run
    PS("The works team sent", "Monte_Carlo_Minis_(51381403052).jpg", zoom=(1.0, 1.1), chapter=CH("III", "THE RUN"), strap=("Red, with white roofs", "THE BMC WORKS MINIS  ·  TODAY", 0.6)),
    PS("Mäkinen, Hopkirk, and another", "Aaltonen,_Mäkinen_and_Hopkirk_-_1965_Rally_Finland.jpg", zoom=(1.0, 1.08),
       strap=("Aaltonen · Mäkinen · Hopkirk", "WITH THEIR CO-DRIVERS  ·  FINLAND 1965", 0.4)),
    VS("On the final night", "ai_hairpin_clip.mp4", end=4.2),
    CuS("Mäkinen won.", classification, bg=dimmed(NIGHT)),
    PS("Roger Clark's", CORTINA, zoom=(1.0, 1.1), strap=("Ford Lotus Cortina", "ROGER CLARK  ·  4TH ON THE ROAD", 0.4)),
    PS("The Citroën of Pauli", DS_GREY, zoom=(1.0, 1.1), crop=(0, 0, 1, 0.86), strap=("Citroën DS21", "PAULI TOIVONEN  ·  ONLY 5TH", 0.5)),
    # IV. the panic
    AS("That's when the scrutineers", "ai_scrutineers.png", zoom=(1.05, 1.2), focus=((0.5, 0.5), (0.68, 0.45)), chapter=CH("IV", "THE PANIC")),
    CuS("They stripped", teeth, bg=dimmed(SCRUT, 0.84)),
    CuS("Some accounts say", long_night, bg=dimmed(SCRUT, 0.84)),
    PS("In the end, it came down", "Monte_Carlo_Minis_(51381402362).jpg", zoom=(1.0, 1.3), focus=((0.5, 0.5), (0.5, 0.7))),
    # V. thrown out
    CuS("The Minis were using new quartz", iodine, chapter=CH("V", "THROWN OUT")),
    CuS("But those bulbs had", no_dip),
    AS("When another car came", "ai_turini_night.png", zoom=(1.1, 1.3), focus=((0.6, 0.55), (0.75, 0.62)),
       texts=[(0.6, "To dip: switch to the other lamps.", "mid")]),
    Custom(SF("The rules for standard cars said", 0.25), twin),
    PS("BMC said the same bulbs", "1963_Morris_Mini_Cooper_S_1964_Monte_Carlo_Rally_winner.jpg", zoom=(1.0, 1.12),
       texts=[(0.4, "Two years on the Monte.", "mid"), (2.6, "Not a word.", "big+")]),
    CuS("It was said the British", final_rule, bg=dimmed(LINEUP, 0.85)),
    Custom(S("All three Minis were", -0.15), board_dq(lambda sc: atf("All three Minis were", 0.65, sc), lambda sc: 0.2, "THE RESULT"), bg=dimmed(LINEUP)),
    PS("Clark's Cortina was out", CORTINA, zoom=(1.15, 1.3), focus=((0.5, 0.6), (0.5, 0.55)), texts=[(0.3, "Clark's Lotus Cortina: out.", "mid")]),
    PS("So was Rosemary Smith", SMITH66, zoom=(1.0, 1.1), strap=("Rosemary Smith", "HILLMAN IMP  ·  LADIES' PRIZE  ·  OUT", 0.5)),
    Custom(SF("In all, ten cars", 0.1), skittles, bg=dimmed(SNOW66, 0.86)),
    # VI. the winner nobody wanted
    CuS("The new winner was", reshuffle, bg=dimmed(POD), chapter=CH("VI", "THE WINNER NOBODY WANTED")),
    PS("His Citroën reportedly", DS_BLACK, zoom=(1.05, 1.25), focus=((0.4, 0.6), (0.3, 0.68)), texts=[(0.5, "Iodine lamps too?", "mid")]),
    PS("But on some DS models", DS_GREY, zoom=(1.1, 1.3), crop=(0, 0, 1, 0.86), focus=((0.5, 0.6), (0.62, 0.7)),
       texts=[(0.8, "Fitted at the factory: allowed.", "mid")]),
    PS("Toivonen was said to be", "Pauli_Toivonen_(1969)_(cropped).jpg", zoom=(1.0, 1.06), strap=("Pauli Toivonen", "THE NEW WINNER", 0.4)),
    VS("In the newsreels", "ai_podium_clip.mp4"),
    CuS("Monaco's Prince Rainier", rainier, bg=dimmed(POD, 0.82)),
    # VII. the backfire
    PS("The organisers had their result", "damImage.narrow.440w.j_1670940688923.jpg", zoom=(1.0, 1.08), chapter=CH("VII", "THE BACKFIRE"),
       texts=[(0.4, "They had their result.", "mid"), (S("But they lost the argument") - S("The organisers had their result", -0.15), "They lost the argument.", "big+")]),
    CuS("Back in Britain", fiasco, bg=dimmed(LINEUP, 0.82)),
    VS("The disqualified Minis reportedly", "ai_palladium_clip.mp4", strap=("The London Palladium", "REPORTEDLY  ·  LIVE ON TELEVISION", 2.0)),
    CuS("Hopkirk said the row", publicity),
    PS("BMC appealed.", "Monte_Carlo_Minis_(51381400422).jpg", zoom=(1.2, 1.35), focus=((0.6, 0.5), (0.7, 0.5))),
    CuS("In October 1966", appeal, bg=dimmed(LINEUP, 0.84)),
    PS("A year later, in 1967", "Aaaltonen_1967.jpg", zoom=(1.0, 1.1), strap=("Rauno Aaltonen", "MONTE CARLO RALLY WINNER  ·  1967", 0.6)),
    PF("A year later, in 1967", 0.72, "Rauno-Aaltonen-1967.jpg", zoom=(1.0, 1.08), texts=[(0.3, "In a Mini.", "big")]),
    # VIII. what happened next
    PS("Timo Mäkinen won Finland", "Timo-Makinen-1966.jpg", zoom=(1.0, 1.08), chapter=CH("VIII", "WHAT HAPPENED NEXT"), strap=("Timo Mäkinen", "THE FLYING FINN", 0.4)),
    Custom(SF("Timo Mäkinen won Finland", 0.45), makinen_titles, bg=dimmed(MAK66, 0.84)),
    PS("Paddy Hopkirk was made", "Paddy_Hopkirk.jpg", zoom=(1.0, 1.05), strap=("Paddy Hopkirk", "MBE 2016  ·  1933 – 2022", 0.4)),
    PF("Paddy Hopkirk was made", 0.55, "Mini_Cooper_33_EJB_(6720779419).jpg", zoom=(1.0, 1.1), texts=[(0.3, "Died 2022, aged 89.", "mid")]),
    PS("Rauno Aaltonen, the man", "Rauno_Aaltonen_Race_Retro_2025.jpg", zoom=(1.0, 1.08), strap=("Rauno Aaltonen", "THE RALLY PROFESSOR", 0.4)),
    PS("Pauli Toivonen became", "1968_Rallye_Sanremo_-_Toivonen-Tiukkanen's_Porsche_911_T.jpg", zoom=(1.0, 1.08),
       strap=("Pauli Toivonen", "EUROPEAN RALLY CHAMPION  ·  1968  ·  PORSCHE", 0.4)),
    PS("Twenty years after", "Pauli-Toivonen-1963.jpg", zoom=(1.0, 1.08), strap=("Pauli Toivonen and family", "WITH HENRI, AGED 6  ·  1963", 0.6)),
    PS("Pauli reportedly said", os.path.basename(S4), zoom=(1.0, 1.08), strap=("Henri Toivonen's Lancia", "MONTE CARLO RALLY WINNER  ·  1986", 0.2)),
    CuS("That May, Henri", memorial(["Henri Toivonen  ·  Sergio Cresto", "Tour de Corse  ·  2 May 1986"]), bg=dimmed(S4, 0.88)),
    Custom(SF("That May, Henri", 0.8), group_b_link, bg=dimmed(S4, 0.86)),
    PS("And the Mini?", "Mini_Cooper_S_1966.jpg", zoom=(1.1, 1.25)),
    CuS("More than five million", five_million),
    # IX. what if
    PS("So here's the question", "Monte_Carlo_Minis_(51381403052).jpg", zoom=(1.1, 1.25), chapter=CH("IX", "WHAT IF"),
       texts=[(S("Was it a fair rule") - S("So here's the question", -0.15), "A fair rule, applied to the letter?", "mid")]),
    AS("Or did the organisers", "ai_lonely_podium.png", zoom=(1.0, 1.15), texts=[(0.4, "Or a way to hand it to a French car?", "mid")]),
    CuS("Tell me what you think", what_if("A fair rule?", "Tell me what you think", "Or a French win?", "Tell me what you think"), bg=dimmed(NIGHT, 0.84)),
    CuS("This was Banned", banned_end("The Monte Carlo Minis.")),
]

if __name__ == "__main__":
    main(scenes, FINAL)
