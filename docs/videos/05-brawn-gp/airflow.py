"""airflow: the "what is a diffuser?" explainer, drawn over the AI cutaway (media/ai/ai_cutaway_side.png).

Two scenes, both a function of local time t and cue(snippet) -> local seconds of a narration line:
    diffuser_scene(cue)         section 6: floor, squeezed air, low pressure, upside-down wing, choke, diffuser
    double_diffuser_scene(cue)  section 7: the diffuser shrinks (2009 rules), a gap in the floor, a second deck

Coordinates are the cutaway scaled to 1920x1080: floor underside y 652 from x 560 to 1600, ground y 690,
rear wheel centre (1725, 568). Each scene has a slow camera (zoom/pan) that moves the picture and the drawing together.
"""
import math
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter
from storykit import (W, H, GOLD, CREAM, RED, NAVY_D, ramp, ease, rgba, tracked, cond, text_top, pf, arrow, place_stamp, load)

YEL = (214, 240, 40)
SLOW, FAST, GREY = (90, 170, 255), (240, 70, 50), (150, 150, 160)
FLOOR_Y, GROUND_Y, FLOOR_X0, FLOOR_X1 = 652, 690, 560, 1600
GAP_Y = (FLOOR_Y + GROUND_Y) / 2

_bg = {}
def cutaway(path):
    if path not in _bg:
        im = load(path).resize((W, H), Image.LANCZOS)
        _bg[path] = ImageEnhance.Brightness(im).enhance(0.72).convert("RGBA")
    return _bg[path].copy()

# ---------------------------------------------------------------- particles that speed up and slow down
class Stream:
    """Particles along a polyline. vs = relative speed at each vertex (1 = free stream).
    Faster particles are drawn as longer, redder streaks."""
    def __init__(self, pts, vs, n=16, rate=0.22, colour=True, base=CREAM, width=4, seed=0):
        self.n, self.rate, self.colour, self.base, self.width = n, rate, colour, base, width
        seg = [np.linspace(pts[i], pts[i + 1], 60, endpoint=False) for i in range(len(pts) - 1)] + [np.array([pts[-1]])]
        vseg = [np.linspace(vs[i], vs[i + 1], 60, endpoint=False) for i in range(len(vs) - 1)] + [np.array([vs[-1]])]
        self.xy = np.concatenate(seg); self.v = np.concatenate(vseg)
        ds = np.r_[0, np.hypot(*np.diff(self.xy, axis=0).T)]
        self.tt = np.cumsum(ds / np.maximum(self.v, 0.05))            # time taken to reach each sample
        self.T = self.tt[-1]; self.jit = np.random.default_rng(seed).uniform(-1, 1, n)
    def at(self, tau):
        i = np.searchsorted(self.tt, tau % self.T); i = min(i, len(self.xy) - 1); return self.xy[i], self.v[i]
    def draw(self, d, t, a):
        if a <= 0: return
        for k in range(self.n):
            tau = (t * self.rate * 1000 + (k + 0.3 * self.jit[k]) / self.n * self.T) % self.T
            p, v = self.at(tau); q, _ = self.at(max(0.0, tau - 55))    # tail: where it was a moment ago
            if self.colour:
                f = max(0.0, min(1.0, (v - 1.0) / 1.4)); g = max(0.0, min(1.0, (0.7 - v) / 0.5))
                c = tuple(int(SLOW[j] + (FAST[j] - SLOW[j]) * f + (GREY[j] - SLOW[j]) * g) for j in range(3))
            else: c = self.base
            d.line((tuple(q), tuple(p)), fill=rgba(c, a), width=self.width)
            d.ellipse((p[0] - self.width, p[1] - self.width, p[0] + self.width, p[1] + self.width), fill=rgba(c, a))

# air over the top of the car (free stream, cream)
TOP = [(-60, 585), (120, 560), (330, 480), (700, 425), (900, 405), (1120, 290), (1600, 270), (1990, 255)]   # just above the car
OVER = [Stream([(x, y - 12 - s) for x, y in TOP], [1] * len(TOP), n=12, rate=0.20, colour=False, base=CREAM, width=4, seed=i)
        for i, s in enumerate([0, 40, 80, 120, 160])]
# air that runs down the engine cover, hits the rear wing and is thrown upward over it (Mike 10-14: "they really should")
WING = [(-60, 600), (120, 578), (330, 500), (700, 445), (900, 418), (985, 282), (1090, 272), (1260, 300), (1450, 348),
        (1590, 392), (1628, 368), (1670, 298), (1780, 238), (1990, 175)]
OVER += [Stream([(x, y - s) for x, y in WING], [1, 1, 1, 1, 1, 1, 1, 1, 0.9, 0.7, 0.6, 0.9, 1.2, 1.3], n=12, rate=0.20,
                colour=False, base=CREAM, width=4, seed=20 + i) for i, s in enumerate([0, 32])]
def under(vgap, vexit, exit_pts):
    pts = [(-60, GAP_Y), (300, GAP_Y), (FLOOR_X0, GAP_Y), (1100, GAP_Y), (FLOOR_X1, GAP_Y)] + exit_pts
    vs = [1.0, 1.0, vgap, vgap, vgap] + vexit
    return Stream(pts, vs, n=34, rate=0.22, width=6)
UNDER_FREE = under(2.4, [2.4], [(1990, GAP_Y)])                         # just "squeezed and fast"
UNDER_CHOKE = under(1.5, [0.25], [(1990, GAP_Y)])                      # no diffuser: piles up at the back
FANS = [under(2.4, [1.6, 0.9], [(1760, GAP_Y - 30 - 25 * k), (1990, GAP_Y - 70 - 45 * k)]) for k in range(3)]
FANS_BIG = [under(3.2, [2.0, 0.8], [(1760, GAP_Y - 40 - 35 * k), (1990, GAP_Y - 100 - 60 * k)]) for k in range(3)]
FANS_SMALL = [under(1.6, [1.2, 0.9], [(1760, GAP_Y - 15 - 10 * k), (1990, GAP_Y - 30 - 20 * k)]) for k in range(2)]
UPPER = Stream([(-60, GAP_Y), (900, GAP_Y), (1400, GAP_Y), (1450, 640), (1500, 625), (1880, 560), (1990, 520)],
               [1, 2.4, 2.4, 2.0, 1.8, 0.9, 0.8], n=24, rate=0.22, colour=False, base=YEL, width=6, seed=9)

# ---------------------------------------------------------------- shared drawing
def camera(frame, keys, t):
    """keys = [(time, zoom, cx, cy)]; eased between keys. Moves picture and drawing together."""
    k0 = keys[0]
    for k1 in keys[1:]:
        if t < k1[0]:
            f = ease((t - k0[0]) / max(0.01, k1[0] - k0[0])); z, cx, cy = (k0[i] + (k1[i] - k0[i]) * f for i in (1, 2, 3)); break
        k0 = k1
    else: z, cx, cy = keys[-1][1:]
    w, h = W / z, H / z; x0 = min(max(cx - w / 2, 0), W - w); y0 = min(max(cy - h / 2, 0), H - h)
    return frame.convert("RGB").transform((W, H), Image.EXTENT, (x0, y0, x0 + w, y0 + h), Image.BICUBIC)   # sub-pixel: no shake

def glow_line(L, pts, colour, a, width=8):
    if a <= 0: return
    g = Image.new("RGBA", (W, H), (0, 0, 0, 0)); ImageDraw.Draw(g).line(pts, fill=rgba(colour, 0.8 * a), width=width * 3, joint="curve")
    L.alpha_composite(g.filter(ImageFilter.GaussianBlur(10)))
    ImageDraw.Draw(L).line(pts, fill=rgba(colour, a), width=width, joint="curve")

def tag(d, xy, text, a, colour=GOLD, size=40, align="center"):
    if a <= 0: return
    x, y = xy; f = cond(size, 8); w = f.getlength(text) + 6 * len(text) + 36
    x0 = x - w / 2 if align == "center" else x
    d.rounded_rectangle((x0, y - 8, x0 + w, y + size + 14), 10, fill=rgba(NAVY_D, 0.82 * a), outline=rgba(colour, a), width=3)
    tracked(d, (x0 + w / 2, y), text, f, rgba(colour, a), 6, "center")

def press_arrows(d, t, a, big=1.0):
    if a <= 0: return
    for k in range(6):
        x = 560 + k * 160; bob = 10 * math.sin(t * 5 + k)
        arrow(d, (x, 150 + bob), (x, 150 + 95 * big + bob), a, GOLD, int(6 * big), int(18 * big))

def low_band(L, a, strength=1.0):
    if a <= 0: return
    g = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(g).rectangle((FLOOR_X0, FLOOR_Y + 2, FLOOR_X1 + 60, GROUND_Y - 2), fill=rgba(FAST, 0.55 * a * strength))
    L.alpha_composite(g.filter(ImageFilter.GaussianBlur(6)))

def diffuser_ramp(L, a, end_y=598, colour=GOLD):
    """The upswept floor behind the rear axle (drawn X-ray style over the wheel)."""
    if a <= 0: return
    pts = [(FLOOR_X1 - 20, FLOOR_Y)] + [(FLOOR_X1 + 280 * u, FLOOR_Y - (FLOOR_Y - end_y) * u ** 1.6) for u in np.linspace(0.1, 1, 10)]
    g = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(g).polygon(pts + [(FLOOR_X1 + 280, FLOOR_Y + 4), (FLOOR_X1 - 20, FLOOR_Y + 4)], fill=rgba(colour, 0.28 * a))
    L.alpha_composite(g); glow_line(L, pts, colour, a, 7)

def wing_inset(L, d, t, flip, a):
    """Top-left: an aeroplane wing (lift up) turns upside down (downforce)."""
    if a <= 0: return
    cx, cy, r = 260, 250, 165
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=rgba(NAVY_D, 0.88 * a), outline=rgba(GOLD, a), width=4)
    ang = math.pi * ease(flip)
    prof = [(-1, 0), (-0.85, -0.16), (-0.4, -0.26), (0.2, -0.18), (1, 0), (0.2, 0.03), (-0.4, 0.05), (-0.85, 0.05)]
    pts = [(cx + 120 * x, cy + 120 * (y * math.cos(ang))) for x, y in prof]
    d.polygon(pts, fill=rgba(CREAM, a))
    up = 1 - 2 * ease(flip); arrow(d, (cx, cy - 20 * up), (cx, cy - 115 * up), a, GOLD if flip < 0.5 else FAST, 6, 18)
    tag(d, (cx, cy + r + 16), "AEROPLANE: LIFT" if flip < 0.5 else "F1 CAR: DOWNFORCE", a, GOLD if flip < 0.5 else FAST, 34)

def flat_floor(L, a):
    glow_line(L, [(FLOOR_X0, FLOOR_Y), (FLOOR_X1, FLOOR_Y)], GOLD, a, 6)

# ---------------------------------------------------------------- section 6: what is a diffuser?
def diffuser_scene(img, cue):
    c = {k: cue(k) for k in ["Start with the floor", "Air rushing under", "And fast-moving air", "So you've got normal",
                             "It's the same trick", "But there's a catch", "That's the diffuser's job", "It gives the air room",
                             "Think of it as", "The bigger the diffuser"]}
    keys = [(0, 1.0, 960, 540), (c["Air rushing under"], 1.12, 900, 560), (c["So you've got normal"], 1.0, 960, 500),
            (c["But there's a catch"], 1.25, 1400, 600), (c["That's the diffuser's job"] + 0.5, 1.45, 1580, 620),
            (c["The bigger the diffuser"], 1.15, 1300, 560)]
    def frame(t):
        im = cutaway(img); L = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(L)
        LS = Image.new("RGBA", (W, H), (0, 0, 0, 0)); ds = ImageDraw.Draw(LS)
        A = lambda k, lag=0.0, dur=0.5: ramp(t, c[k] + lag, c[k] + lag + dur)
        out = lambda k, lag=0.0: 1 - ramp(t, c[k] + lag - 0.3, c[k] + lag)
        # the floor sweeps in, front to back
        fl = A("Start with the floor", 0.6, 1.2)
        if fl: glow_line(L, [(FLOOR_X0, FLOOR_Y), (FLOOR_X0 + (FLOOR_X1 - FLOOR_X0) * fl, FLOOR_Y)], GOLD, 1, 6)
        tag(ds, (W / 2, 900), "THE FLOOR", A("Start with the floor", 1.0) * out("Air rushing under"))
        for s in OVER: s.draw(d, t, 0.35 + 0.4 * A("Air rushing under"))       # air is always moving, from the first frame
        tag(ds, (W / 2, 60), "WHAT IS A DIFFUSER?", ramp(t, 0.2, 0.8) * out("Air rushing under"), GOLD, 52)
        # under the floor: squeezed, faster, then choked, then let out by the diffuser
        free = A("Air rushing under") * out("But there's a catch", 0.6)
        choke = A("But there's a catch", 0.3) * out("That's the diffuser's job", 0.9)
        fans = A("That's the diffuser's job", 0.6) * out("The bigger the diffuser", 0.3)
        big = A("The bigger the diffuser", 0.3)
        UNDER_FREE.draw(d, t, free); UNDER_CHOKE.draw(d, t, choke)
        for s in FANS: s.draw(d, t, fans)
        for s in FANS_BIG: s.draw(d, t, big)
        tag(ds, (W / 2, 900), "SQUEEZED  =  FASTER", A("Air rushing under", 2.5) * out("And fast-moving air"), FAST)
        low_band(L, A("And fast-moving air", 0.4) * (1 - 0.6 * choke), 1 + 0.4 * big)
        tag(ds, (W / 2, 900), "FAST AIR  =  LOW PRESSURE", A("And fast-moving air", 0.4) * out("But there's a catch"), FAST)
        press_arrows(ds, t, A("So you've got normal") * out("But there's a catch", 0.5))
        tag(ds, (W / 2, 60), "NORMAL PRESSURE PUSHES DOWN", A("So you've got normal") * out("It's the same trick"))
        tag(ds, (W / 2, 60), "THE CAR IS SUCKED ONTO THE TRACK", A("So you've got normal", 3.0) * out("But there's a catch"), CREAM)
        flip_a = A("It's the same trick", 0, 0.4) * out("But there's a catch")
        wing_inset(LS, ds, t, ramp(t, c["It's the same trick"] + 1.2, c["It's the same trick"] + 2.2), flip_a)
        if choke > 0:
            g = Image.new("RGBA", (W, H), (0, 0, 0, 0)); gd = ImageDraw.Draw(g)
            for j in range(14):
                r = 14 + 6 * math.sin(t * 7 + j); x = 1560 + 9 * j + 8 * math.sin(t * 5 + 2 * j); y = GAP_Y + 10 * math.sin(t * 6 + 3 * j)
                gd.ellipse((x - r, y - r, x + r, y + r), fill=rgba(GREY if j % 2 else FAST, 0.75 * choke))
            L.alpha_composite(g.filter(ImageFilter.GaussianBlur(3)))
            k = 0.5 + 0.5 * math.sin(t * 9)
            tag(ds, (W / 2, 900), "CHOKED!", choke * (0.6 + 0.4 * k), FAST, 46)
        dif = A("That's the diffuser's job", 0.3, 0.6)
        diffuser_ramp(L, dif, 598 - 38 * big)
        tag(ds, (W / 2, 900), "THE DIFFUSER", dif * out("Think of it as"))
        tag(ds, (W / 2, 900), "SLOWS AND SPREADS THE AIR", A("It gives the air room") * out("Think of it as"), SLOW)
        tag(ds, (W / 2, 900), "A WIDE DOOR, NOT A CAT FLAP", A("Think of it as") * out("The bigger the diffuser"), CREAM)
        low_band(L, big, 1.4); press_arrows(ds, t, big, 1.3)
        tag(ds, (W / 2, 60), "BIGGER DIFFUSER  =  MORE SUCTION", big)
        im.alpha_composite(L); im = camera(im, keys, t).convert("RGBA"); im.alpha_composite(LS); return im.convert("RGB")
    return frame

# ---------------------------------------------------------------- section 7: the double diffuser
def double_diffuser_scene(img, cue):
    c = {k: cue(k) for k in ["Now remember those", "So the engineers", "And they found a gap", "Through that opening",
                             "A double-decker diffuser", "Some reckoned"]}
    keys = [(0, 1.15, 1350, 580), (c["And they found a gap"], 1.4, 1500, 620), (c["A double-decker diffuser"], 1.25, 1450, 580),
            (c["Some reckoned"], 1.05, 1100, 540)]
    def frame(t):
        im = cutaway(img); L = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(L)
        LS = Image.new("RGBA", (W, H), (0, 0, 0, 0)); ds = ImageDraw.Draw(LS)
        A = lambda k, lag=0.0, dur=0.5: ramp(t, c[k] + lag, c[k] + lag + dur)
        out = lambda k, lag=0.0: 1 - ramp(t, c[k] + lag - 0.3, c[k] + lag)
        shrink = A("Now remember those", 2.0, 1.0)
        flat_floor(L, 1)
        for s in OVER: s.draw(d, t, 0.6)
        two = A("Through that opening", 0.8, 0.8)
        for s in FANS: s.draw(d, t, 1 - shrink)
        for s in FANS_SMALL: s.draw(d, t, shrink)
        UPPER.draw(d, t, two)
        diffuser_ramp(L, 1, 560 + 50 * shrink)
        if shrink: place_stamp(LS, 1500, 330, ramp(t, c["Now remember those"] + 2.3, c["Now remember those"] + 2.6) * out("So the engineers", 1.5),
                               text="RULES 2009", size=90, color=RED, rot=-8)
        tag(ds, (W / 2, 900), "SMALLER DIFFUSER  =  LESS GRIP", A("Now remember those", 2.6) * out("So the engineers"), FAST)
        # the gap in the floor opens just ahead of the rear wheel
        gap = A("And they found a gap", 1.6, 0.8)
        if gap:
            x0 = 1450; w = 120 * gap; pr = 40 + 25 * ((t * 1.2) % 1)
            d.ellipse((x0 - pr, FLOOR_Y - pr, x0 + pr, FLOOR_Y + pr), outline=rgba(YEL, gap * (1 - (t * 1.2) % 1)), width=4)
            d.rectangle((x0 - w / 2, FLOOR_Y - 14, x0 + w / 2, FLOOR_Y + 8), fill=rgba((5, 8, 16), gap))
            glow_line(L, [(x0 - w / 2, FLOOR_Y - 14), (x0 + w / 2, FLOOR_Y - 14), (x0 + w / 2, FLOOR_Y + 8), (x0 - w / 2, FLOOR_Y + 8), (x0 - w / 2, FLOOR_Y - 14)], YEL, gap, 4)
            tag(ds, (W / 2, 900), "A GAP IN THE FLOOR", gap * out("Through that opening", 0.8), YEL)
        if two:
            pts = [(1490, 628)] + [(1490 + 390 * u, 628 - 70 * u ** 1.4) for u in np.linspace(0.1, 1, 9)]
            glow_line(L, pts, YEL, two, 6)
            tag(ds, (W / 2, 900), "A SECOND DIFFUSER ON TOP", two * out("A double-decker diffuser"), YEL)
        tag(ds, (W / 2, 900), "TWO LAYERS", A("A double-decker diffuser") * out("Some reckoned"), YEL, 48)
        low_band(L, A("A double-decker diffuser", 1.5), 1.4)
        press_arrows(ds, t, A("A double-decker diffuser", 1.5), 1.3)
        tag(ds, (W / 2, 60), "MORE SUCTION  ·  MORE GRIP", A("A double-decker diffuser", 1.5) * out("Some reckoned"), CREAM)
        sec = A("Some reckoned", 0.3)
        if sec:
            ds.rectangle((0, 0, W, H), fill=rgba(NAVY_D, 0.8 * sec))
            text_top(ds, (W / 2, 330), "+0.5", pf(260, 900), rgba(YEL, sec), "center")
            tracked(ds, (W / 2, 660), "SECONDS A LAP  ·  ROUGHLY", cond(48, 8), rgba(CREAM, sec), 10, "center")
        im.alpha_composite(L); im = camera(im, keys, t).convert("RGBA"); im.alpha_composite(LS); return im.convert("RGB")
    return frame
