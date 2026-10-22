"""pitch3d: moving-camera football graphics in the house style (structure drawn, never AI).

World units are metres. Goal line is y = 0, the field is y < 0, x runs across the pitch, z is up.
A scene is a function t -> (camera, items); render_frame draws the pitch, then items back to front.

    cam = Cam(pos=(0, -25, 2), look=(0, 0, 1))
    img = render_frame(cam, [player(...), ball(...), trail(...)])
"""
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from storykit import W, H, NAVY, NAVY_D, GOLD, CREAM, cond, tracked, rgba

SS = 2                                   # supersample
GRASS_A, GRASS_B = (38, 92, 54), (46, 106, 62)
TANGERINE, BOLTON, KEEPER_G = (236, 120, 40), (240, 238, 232), (46, 120, 70)
SKIN = (226, 196, 168)
FOV = 52


def v(*a): return np.array(a, float)


class Cam:
    def __init__(self, pos, look, fov=FOV):
        self.p = v(*pos); f = v(*look) - self.p; self.f = f / np.linalg.norm(f)
        r = np.cross(self.f, v(0, 0, 1)); self.r = r / np.linalg.norm(r); self.u = np.cross(self.r, self.f)
        self.F = (W * SS / 2) / math.tan(math.radians(fov) / 2)

    def cam(self, p):
        d = np.asarray(p, float) - self.p
        return np.array([d @ self.r, d @ self.u, d @ self.f])

    def scr(self, c):
        return (W * SS / 2 + self.F * c[0] / c[2], H * SS / 2 - self.F * c[1] / c[2])

    def proj(self, p):
        c = self.cam(p)
        return (self.scr(c), c[2]) if c[2] > 0.05 else (None, c[2])


def clip_poly(cam, pts, near=0.08):
    cs = [cam.cam(p) for p in pts]; out = []
    for i in range(len(cs)):
        a, b = cs[i], cs[(i + 1) % len(cs)]
        ia, ib = a[2] >= near, b[2] >= near
        if ia: out.append(a)
        if ia != ib:
            s = (near - a[2]) / (b[2] - a[2]); out.append(a + (b - a) * s)
    return [cam.scr(c) for c in out]


def seg(cam, d, p, q, width_m, col, near=0.08):
    a, b = cam.cam(p), cam.cam(q)
    if a[2] < near and b[2] < near: return
    if a[2] < near: a = a + (b - a) * ((near - a[2]) / (b[2] - a[2]))
    if b[2] < near: b = b + (a - b) * ((near - b[2]) / (a[2] - b[2]))
    w = max(1, int(cam.F * width_m / ((a[2] + b[2]) / 2)))
    d.line([cam.scr(a), cam.scr(b)], fill=col, width=w)


def polyline(cam, d, pts, width_m, col):
    for p, q in zip(pts[:-1], pts[1:]): seg(cam, d, p, q, width_m, col)


def arc_pts(c, r, a0, a1, n=40, z=0.0):
    return [v(c[0] + r * math.cos(a), c[1] + r * math.sin(a), z) for a in np.linspace(a0, a1, n)]


def draw_stands(cam, d):
    """Flat 1950s stands round the pitch: dark terracing with faint crowd rows, roof line."""
    for quad in ((v(-60, 12, 0), v(60, 12, 0), v(60, 26, 14), v(-60, 26, 14)),        # behind the goal
                 (v(-40, 12, 0), v(-40, -80, 0), v(-54, -80, 14), v(-54, 12, 14)),   # left side
                 (v(40, 12, 0), v(40, -80, 0), v(54, -80, 14), v(54, 12, 14))):     # right side
        poly = clip_poly(cam, list(quad))
        if len(poly) > 2: d.polygon(poly, fill=(44, 52, 74))
        a, b, c, e = quad
        for f in np.linspace(0.08, 0.95, 9):
            polyline(cam, d, [a + (e - a) * f, b + (c - b) * f], 0.35, (62, 72, 98, 255))
    polyline(cam, d, [v(-60, 26, 14), v(60, 26, 14)], 0.4, CREAM + (110,))


def draw_pitch(cam, d):
    # sky / stands: navy gradient already in the canvas; pitch from y=+10 (behind goal) to -70
    for k in range(-16, 3):
        y0, y1 = k * 5.0, (k + 1) * 5.0
        poly = clip_poly(cam, [v(-40, y0, 0), v(40, y0, 0), v(40, min(y1, 12), 0), v(-40, min(y1, 12), 0)])
        if len(poly) > 2: d.polygon(poly, fill=GRASS_A if k % 2 else GRASS_B)
    ln, w = CREAM + (235,), 0.12
    polyline(cam, d, [v(-34, 0, 0), v(34, 0, 0)], w, ln)
    for hx, dy in ((20.16, -16.5), (9.16, -5.5)):
        polyline(cam, d, [v(-hx, 0, 0), v(-hx, dy, 0), v(hx, dy, 0), v(hx, 0, 0)], w, ln)
    polyline(cam, d, [p for p in arc_pts((0, -11), 9.15, math.radians(233), math.radians(307))], w, ln)
    sp, z = cam.proj(v(0, -11, 0))
    if sp: r = max(2, cam.F * 0.15 / z); d.ellipse([sp[0] - r, sp[1] - r * 0.4, sp[0] + r, sp[1] + r * 0.4], fill=ln)


def goal_items(cam):
    """Net (drawn as one item at the goal) and the frame, so players and ball sort around it."""
    def draw(d):
        net = CREAM + (120,); post = CREAM + (255,)
        for x in np.arange(-3.66, 3.67, 0.5):           # back net verticals + roof
            polyline(cam, d, [v(x, 0, 2.44), v(x, 1.2, 2.3), v(x, 2.0, 0)], 0.025, net)
        for zz in np.arange(0, 2.45, 0.4):
            yb = 2.0 - (2.0 - 1.2) * zz / 2.3
            polyline(cam, d, [v(-3.66, yb, zz), v(3.66, yb, zz)], 0.025, net)
        for s in (-1, 1):
            for zz in np.arange(0.4, 2.45, 0.4):
                polyline(cam, d, [v(3.66 * s, 0, zz), v(3.66 * s, 2.0 - 0.8 * zz / 2.3, zz)], 0.025, net)
        for s in (-1, 1): seg(cam, d, v(3.66 * s, 0, 0), v(3.66 * s, 0, 2.44), 0.12, post)
        seg(cam, d, v(-3.66, 0, 2.44), v(3.66, 0, 2.44), 0.12, post)
    return [(cam.cam(v(0, 0.8, 1.2))[2], draw)]


_sprites = {}
def figure_sprite(hpx, shirt, shorts, socks, num, num_col):
    hpx = int(max(8, min(hpx, 1600)))
    key = (hpx, shirt, shorts, socks, num)
    if key in _sprites: return _sprites[key]
    h = hpx; w = int(h * 0.42) + 4
    im = Image.new("RGBA", (w, h + 4), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    ol = max(1, int(h * 0.012)); cx = w / 2; out = NAVY_D + (255,)
    lw = h * 0.075
    for s in (-1, 1):                                                         # legs (sock colour) + boots
        lx = cx + s * h * 0.055
        d.rectangle([lx - lw / 2, h * 0.62, lx + lw / 2, h * 0.96], fill=socks + (255,), outline=out, width=ol)
        d.rectangle([lx - lw / 2 - h * 0.01, h * 0.95, lx + lw / 2 + h * 0.03, h * 0.995], fill=(25, 22, 20, 255))
    d.rounded_rectangle([cx - h * 0.13, h * 0.50, cx + h * 0.13, h * 0.65], int(h * 0.02), fill=shorts + (255,), outline=out, width=ol)
    d.rounded_rectangle([cx - h * 0.15, h * 0.15, cx + h * 0.15, h * 0.53], int(h * 0.05), fill=shirt + (255,), outline=out, width=ol)
    for s in (-1, 1):                                                         # arms
        d.rounded_rectangle([cx + s * h * 0.15 - (h * 0.06 if s > 0 else 0), h * 0.17, cx + s * h * 0.15 + (0 if s > 0 else h * 0.06), h * 0.45],
                            int(h * 0.03), fill=shirt + (255,), outline=out, width=ol)
    d.ellipse([cx - h * 0.075, h * 0.0, cx + h * 0.075, h * 0.15], fill=SKIN + (255,), outline=out, width=ol)
    if num and h > 40:
        f = cond(max(8, int(h * 0.17)), 8)
        bb = f.getbbox("8"); d.text((cx, h * 0.33), str(num), font=f, fill=num_col + (255,), anchor="mm")
    _sprites[key] = im
    return im


def player(cam, pos, kit, num=None, tilt=0.0, height=1.8):
    """kit: 'bpl' Blackpool, 'bol' Bolton, 'gk' Bolton keeper. tilt in degrees (lean / dive)."""
    shirt, shorts, socks, nc = {"bpl": (TANGERINE, CREAM, TANGERINE, CREAM), "bol": (BOLTON, NAVY, NAVY, NAVY),
                                "gk": (KEEPER_G, NAVY_D, NAVY, CREAM)}[kit]
    base = v(*pos[:2], 0); top = base + v(0, 0, height)
    c = cam.cam(base)
    def draw(d, canvas):
        bp, zb = cam.proj(base); tp, zt = cam.proj(top)
        if not bp or not tp or zb < 1.6: return                              # too close to the lens: skip
        hpx = math.hypot(tp[0] - bp[0], tp[1] - bp[1])
        if hpx < 3: return
        sr = cam.F * 0.45 / zb                                                 # shadow
        d.ellipse([bp[0] - sr, bp[1] - sr * 0.25, bp[0] + sr, bp[1] + sr * 0.25], fill=(10, 30, 15, 90))
        sp = figure_sprite(hpx, shirt, shorts, socks, num, nc)
        if not tilt:
            canvas.alpha_composite(sp, (int(bp[0] - sp.width / 2), int(bp[1] - sp.height + 4))); return
        S = 2 * sp.height + 8                                                # pivot on the feet
        big = Image.new("RGBA", (S, S)); big.alpha_composite(sp, (int(S / 2 - sp.width / 2), int(S / 2 - sp.height + 4)))
        big = big.rotate(-tilt, resample=Image.BICUBIC)
        canvas.alpha_composite(big, (int(bp[0] - S / 2), int(bp[1] - S / 2)))
    return (c[2], draw)


def ball(cam, pos):
    p = v(*pos); c = cam.cam(p)
    def draw(d, canvas):
        bp, z = cam.proj(p)
        if not bp: return
        r = max(2.5, cam.F * 0.11 / z)
        gp, gz = cam.proj(v(p[0], p[1], 0))
        if gp: sr = cam.F * 0.12 / gz; d.ellipse([gp[0] - sr, gp[1] - sr * 0.3, gp[0] + sr, gp[1] + sr * 0.3], fill=(10, 30, 15, 110))
        d.ellipse([bp[0] - r, bp[1] - r, bp[0] + r, bp[1] + r], fill=CREAM + (255,), outline=NAVY_D + (255,), width=max(1, int(r * 0.18)))
    return (c[2], draw)


def render_frame(cam, items, trails=(), labels=None):
    """items: list of (depth, draw(d, canvas)) or goal_items; trails: list of (pts, col). Returns RGB 1920x1080."""
    canvas = Image.new("RGBA", (W * SS, H * SS))
    g = np.linspace(0, 1, H * SS)[:, None, None]
    canvas.paste(Image.fromarray((np.array(NAVY_D) * (1 - 0.35 * g) + np.array(NAVY) * 0.35 * g).astype(np.uint8)[:, :, :] * np.ones((1, W * SS, 1), np.uint8)))
    d = ImageDraw.Draw(canvas, "RGBA")
    draw_stands(cam, d)
    draw_pitch(cam, d)
    # trails on top of grass, under players (they are flight lines in the air but read best as a layer)
    tl = Image.new("RGBA", canvas.size); td = ImageDraw.Draw(tl)
    for pts, col in trails:
        if len(pts) > 1: polyline(cam, td, pts, 0.07, col + (230,))
    canvas.alpha_composite(tl.filter(ImageFilter.GaussianBlur(5 * SS))); canvas.alpha_composite(tl)
    for depth, fn in sorted(items, key=lambda it: -it[0]):
        try: fn(d, canvas)
        except TypeError: fn(d)
    im = canvas.resize((W, H), Image.LANCZOS)
    if labels: labels(ImageDraw.Draw(im, "RGBA"))
    return im.convert("RGB")


def bez(p0, p1, p2, s):
    p0, p1, p2 = v(*p0), v(*p1), v(*p2)
    return (1 - s) ** 2 * p0 + 2 * (1 - s) * s * p1 + s * s * p2


def ease(t): t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)
def lerp(a, b, f): return v(*a) + (v(*b) - v(*a)) * f
