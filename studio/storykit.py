"""storykit: narrated story videos in the Road & Trax house style.

A video is a list of scenes, each with a start time (seconds of the final video).
A scene runs until the next one starts; neighbouring scenes cross-dissolve.
Every scene is a function of local time t (it may be slightly negative or run past
its duration during a dissolve), so frames can be rendered in parallel.

    from storykit import *
    scenes = [Photo(0, "a.jpg", credit="..."), TitleCard(8, "KICKER", "Title."), ...]
    render(scenes, total=60, audio="narration.wav", out="video.mp4")
"""
import math, os, subprocess, multiprocessing as mp
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H, FPS = 1920, 1080, 25
NAVY = (27, 42, 74); NAVY_D = (18, 28, 52); RED = (200, 16, 46)
GOLD = (198, 166, 96); CREAM = (239, 233, 219); INK = (30, 30, 30)
HERE = os.path.dirname(os.path.abspath(__file__))
PF = os.path.join(HERE, "fonts", "PlayfairDisplay-Italic.ttf")
COND = "/System/Library/Fonts/Avenir Next Condensed.ttc"
LOGO = os.path.join(HERE, "brand", "roadandtrax_logo.png")
XFADE = 0.5

# ---------------------------------------------------------------- helpers
_fonts = {}
def pf(size, w=600):
    k = ("pf", size, w)
    if k not in _fonts:
        f = ImageFont.truetype(PF, size); f.set_variation_by_axes([w]); _fonts[k] = f
    return _fonts[k]
def cond(size, idx=2):
    k = ("c", size, idx)
    if k not in _fonts: _fonts[k] = ImageFont.truetype(COND, size, index=idx)
    return _fonts[k]

def ease(t): t = max(0.0, min(1.0, t)); return 1 - (1 - t) ** 3
def ramp(t, a, b): return ease((t - a) / (b - a)) if b > a else float(t >= a)
def fade_io(t, dur, a=0.4, b=0.4): return min(ramp(t, 0, a), 1 - ramp(t, dur - b, dur))
def layer(): return Image.new("RGBA", (W, H), (0, 0, 0, 0))
def rgba(c, a): return tuple(c[:3]) + (int(255 * max(0, min(1, a))),)

def tracked(d, xy, text, font, fill, track=4, align="left"):
    w = sum(font.getlength(c) for c in text) + track * (len(text) - 1); x, y = xy
    if align == "center": x -= w / 2
    elif align == "right": x -= w
    top = font.getbbox("H")[1]
    for c in text: d.text((x, y - top), c, font=font, fill=fill); x += font.getlength(c) + track
    return w

def text_top(d, xy, text, font, fill, align="left"):
    """Draw text with its cap-height top at y (so layouts don't depend on font ascent)."""
    x, y = xy; w = font.getlength(text)
    if align == "center": x -= w / 2
    elif align == "right": x -= w
    d.text((x, y - font.getbbox("H")[1]), text, font=font, fill=fill); return w

def wrap(text, font, width):
    words, lines, cur = text.split(), [], ""
    for wd in words:
        t = (cur + " " + wd).strip()
        if font.getlength(t) <= width or not cur: cur = t
        else: lines.append(cur); cur = wd
    if cur: lines.append(cur)
    return lines

_imgs = {}
def load(path):
    if path not in _imgs: _imgs[path] = Image.open(path).convert("RGB")
    return _imgs[path]

def navy_bg():
    if "navy" not in _imgs:
        g = np.linspace(0, 1, H)[:, None, None]
        a = (np.array(NAVY) * (1 - 0.3 * g)).astype(np.uint8) * np.ones((1, W, 1), np.uint8)
        im = Image.fromarray(a)
        # soft vignette
        yy, xx = np.mgrid[0:H, 0:W]; r = np.sqrt(((xx - W / 2) / W) ** 2 + ((yy - H / 2) / H) ** 2)
        v = np.clip(1 - 0.55 * r ** 2, 0, 1)[..., None]
        _imgs["navy"] = Image.fromarray((np.asarray(im) * v).astype(np.uint8))
    return _imgs["navy"].copy()

def logo(width):
    k = ("logo", width)
    if k not in _imgs:
        l = Image.open(LOGO).convert("RGBA"); l = l.crop(l.getbbox())
        _imgs[k] = l.resize((width, round(l.height * width / l.width)), Image.LANCZOS)
    return _imgs[k]

# ---------------------------------------------------------------- overlays shared by all scenes
def draw_strap(L, title, sub, a):
    """Lower third: navy box, red bar, italic serif title, gold small caps."""
    if a <= 0: return
    d = ImageDraw.Draw(L); f = pf(58); s = cond(26)
    tw = f.getlength(title); sw = sum(s.getlength(c) for c in sub) + 4 * (len(sub) - 1)
    x1 = int(130 + max(tw, sw) + 40); off = int(30 * (1 - a))
    d.rectangle((90 - off, 860, x1 - off, 975), fill=rgba(NAVY, 0.93 * a))
    d.rectangle((90 - off, 860, 101 - off, 975), fill=rgba(RED, a))
    text_top(d, (130 - off, 884), title, f, rgba(CREAM, a))
    tracked(d, (132 - off, 942), sub, s, rgba(GOLD, a), 4)

def draw_chapter(L, label, a):
    if a <= 0: return
    d = ImageDraw.Draw(L); w = sum(cond(26).getlength(c) for c in label) + 6 * len(label)
    d.rectangle((76, 68, 112 + w + 22, 130), fill=rgba(NAVY_D, 0.55 * a))
    d.rectangle((90, 80, 96, 118), fill=rgba(RED, a))
    tracked(d, (112, 90), label, cond(26), rgba(CREAM, a), 6)

def draw_credit(L, credit, a=0.7):
    if not credit: return
    d = ImageDraw.Draw(L); f = cond(18, 0)
    w = f.getlength(credit)
    d.text((W - 40 - w, H - 38), credit, font=f, fill=rgba(CREAM, 0.75 * a))

# ---------------------------------------------------------------- scene base
class Scene:
    def __init__(self, start, chapter=None, strap=None, credit=None, texts=None, dim=0.0):
        self.start = start; self.dur = None
        self.chapter = chapter          # "II  ·  THE PROBLEM"
        self.strap = strap              # (title, sub, at_seconds) local time
        self.credit = credit
        self.texts = texts or []        # [(at, "text", "big"|"mid")] centred captions over picture
        self.dim = dim
    def base(self, t):                  # -> RGB Image
        raise NotImplementedError
    def frame(self, t):
        im = self.base(t)
        if im.mode != "RGB": im = im.convert("RGB")
        dimv = self.dim + (0.45 * ramp(t, self.texts[0][0] - 0.3, self.texts[0][0] + 0.4) if self.texts else 0)
        if dimv: im = Image.blend(im, Image.new("RGB", (W, H), (8, 12, 24)), min(0.85, dimv))
        L = layer()
        if self.chapter: draw_chapter(L, self.chapter, fade_io(t, min(self.dur, 4.5), 0.6, 0.6))
        if self.strap:
            title, sub, at = self.strap
            draw_strap(L, title, sub, min(ramp(t, at, at + 0.5), 1 - ramp(t, self.dur - 0.6, self.dur - 0.1)))
        if self.texts: self._texts(L, t)
        draw_credit(L, self.credit)
        im = im.convert("RGBA"); im.alpha_composite(L); return im.convert("RGB")
    def _texts(self, L, t):
        d = ImageDraw.Draw(L)
        shown = [x for x in self.texts if t >= x[0]]
        # each caption replaces the previous unless style ends with "+" (stacks)
        y = H / 2 - 40 * len(shown) if any(s.endswith("+") for _, _, s in shown) else H / 2
        stack = []
        for at, txt, style in shown:
            if not style.endswith("+"): stack = []
            stack.append((at, txt, style))
        y = H / 2 - (len(stack) - 1) * 70
        for at, txt, style in stack:
            a = ramp(t, at, at + 0.45)
            f = pf(96, 650) if style.startswith("big") else pf(64, 600)
            text_top(d, (W / 2, y - 40 + 20 * (1 - a)), txt, f, rgba(CREAM, a), "center")
            y += 140

# ---------------------------------------------------------------- photo with slow move
class Photo(Scene):
    """Ken Burns move over a still. crop = fractional (x0,y0,x1,y1) of the source.
    zoom = (start, end); focus = ((cx,cy) start, (cx,cy) end) as fractions of the crop.
    fit='cover' fills the frame; 'contain' shows the whole picture over a blurred copy."""
    def __init__(self, start, path, crop=None, zoom=(1.0, 1.10), focus=((0.5, 0.5), (0.5, 0.5)),
                 fit="auto", grade=True, **kw):
        super().__init__(start, **kw)
        self.path, self.crop, self.zoom, self.focus, self.fit, self.grade = path, crop, zoom, focus, fit, grade
        self._src = None
    def src(self):
        if self._src is None:
            im = load(self.path)
            if self.crop:
                x0, y0, x1, y1 = self.crop; w, h = im.size
                im = im.crop((int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h)))
            if self.grade:
                a = np.asarray(im).astype(np.float32) / 255
                a = np.clip((a - 0.5) * 1.06 + 0.5, 0, 1)                      # contrast
                a = a * np.array([1.0, 0.99, 1.03]) + np.array([0.0, 0.0, 0.012])  # slightly cool shadows
                im = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
            self._src = im
            if self.fit == "auto":
                ar = im.width / im.height
                self.fit = "cover" if (1.3 <= ar <= 2.3 and im.width >= 900) else "contain"
            if self.fit == "contain":
                bg = im.copy(); s = max(W / bg.width, H / bg.height)
                bg = bg.resize((int(bg.width * s) + 2, int(bg.height * s) + 2), Image.BILINEAR)
                bg = bg.crop(((bg.width - W) // 2, (bg.height - H) // 2, (bg.width - W) // 2 + W, (bg.height - H) // 2 + H))
                bg = bg.filter(ImageFilter.GaussianBlur(40))
                self._bg = Image.blend(bg, Image.new("RGB", (W, H), NAVY_D), 0.55)
        return self._src
    def base(self, t):
        src = self.src(); p = max(0.0, min(1.0, t / max(self.dur, 0.01)))
        p = 0.5 - 0.5 * math.cos(math.pi * p)       # ease in-out
        z = self.zoom[0] + (self.zoom[1] - self.zoom[0]) * p
        cx = self.focus[0][0] + (self.focus[1][0] - self.focus[0][0]) * p
        cy = self.focus[0][1] + (self.focus[1][1] - self.focus[0][1]) * p
        w, h = src.size
        if self.fit == "cover":
            s = max(W / w, H / h) * z; vw, vh = W / s, H / s
            x0 = min(max(cx * w - vw / 2, 0), w - vw); y0 = min(max(cy * h - vh / 2, 0), h - vh)
            return src.transform((W, H), Image.EXTENT, (x0, y0, x0 + vw, y0 + vh), Image.BICUBIC)
        # contain: picture fitted to 92% height, gently zooming, over blurred fill
        s = min(W * 0.92 / w, H * 0.90 / h) * z; tw, th = int(w * s), int(h * s)
        fg = src.resize((tw, th), Image.BICUBIC)
        im = self._bg.copy(); im.paste(fg, ((W - tw) // 2, (H - th) // 2)); return im

# ---------------------------------------------------------------- video clip (AI footage)
class Clip(Scene):
    """A short video clip (e.g. a 5 s Runway shot). Frames are extracted once, at full frame size, into
    <clip>_frames/ beside it, so render workers just load JPEGs. If the scene is longer than the clip it
    plays slower (down to min_rate), then holds the last frame with a slow push-in."""
    def __init__(self, start, path, min_rate=0.6, **kw):
        super().__init__(start, **kw)
        self.path, self.min_rate = path, min_rate
        self.fdir = os.path.splitext(path)[0] + "_frames"
        if not (os.path.isdir(self.fdir) and os.listdir(self.fdir)):
            os.makedirs(self.fdir, exist_ok=True)
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path, "-vf",
                            f"fps={FPS},scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H}",
                            "-q:v", "2", os.path.join(self.fdir, "%04d.jpg")], check=True)
        self.n = len([f for f in os.listdir(self.fdir) if f.endswith(".jpg") and not f.startswith(".")])
    def base(self, t):
        clip = self.n / FPS; rate = max(self.min_rate, min(1.0, clip / max(self.dur or clip, 0.01)))
        ct = max(0.0, t) * rate; over = max(0.0, ct - clip) / rate
        im = Image.open(os.path.join(self.fdir, f"{min(self.n, int(ct * FPS) + 1):04d}.jpg")).convert("RGB")
        if over > 0:                                    # past the end: hold, creeping in
            z = 1 + 0.012 * over; vw, vh = W / z, H / z
            im = im.transform((W, H), Image.EXTENT, ((W - vw) / 2, (H - vh) / 2, (W + vw) / 2, (H + vh) / 2), Image.BICUBIC)
        return im

# ---------------------------------------------------------------- navy cards
class Card(Scene):
    """Navy card. items: list of dicts drawn in order, each with 'at' (local seconds):
       {"k": "kicker", "text":..., "y":...}
       {"k": "title",  "text":..., "y":..., "size":120}
       {"k": "line",   "text":..., "y":..., "size":60, "color":CREAM}
       {"k": "rule",   "y":..., "w":560}
       {"k": "stamp",  "text":..., "x":..., "y":..., "color":RED, "rot":-8}
       {"k": "big",    "text":..., "y":..., "size":300}
    align: 'left' (x=160) or 'center'."""
    def __init__(self, start, items, align="left", x=160, bg=None, **kw):
        super().__init__(start, **kw); self.items, self.align, self.x, self.bgpath = items, align, x, bg
    def background(self, t):
        if self.bgpath:
            im = load(self.bgpath); s = max(W / im.width, H / im.height) * (1.04 + 0.04 * t / max(self.dur, 1))
            vw, vh = W / s, H / s; x0, y0 = (im.width - vw) / 2, (im.height - vh) / 2
            im = im.transform((W, H), Image.EXTENT, (x0, y0, x0 + vw, y0 + vh), Image.BICUBIC)
            return Image.blend(im, Image.new("RGB", (W, H), NAVY_D), 0.72)
        return navy_bg()
    def base(self, t):
        return self.draw_items(self.background(t).convert("RGBA"), t)
    def draw_items(self, im, t):
        L = layer(); d = ImageDraw.Draw(L)
        X = W / 2 if self.align == "center" else self.x; al = "center" if self.align == "center" else "left"
        for it in self.items:
            a = ramp(t, it.get("at", 0), it.get("at", 0) + 0.5)
            if a <= 0: continue
            k = it["k"]; y = it["y"] + (1 - a) * 24; x = it.get("x", X)
            if k == "kicker":
                tracked(d, (x, y), it["text"], cond(it.get("size", 34)), rgba(it.get("color", GOLD), a), 7, al)
            elif k in ("title", "line", "big"):
                size = it.get("size", {"title": 120, "line": 60, "big": 300}[k])
                wgt = {"title": 900, "line": 600, "big": 900}[k]
                f = pf(size, it.get("w", wgt)); lines = wrap(it["text"], f, it.get("width", W - 2 * self.x))
                for i, ln in enumerate(lines):
                    text_top(d, (x, y + i * size * 1.18), ln, f, rgba(it.get("color", CREAM), a), it.get("align", al))
            elif k == "rule":
                w = it.get("w", 560) * a; x0 = x - w / 2 if al == "center" else x
                d.rectangle((x0, it["y"], x0 + w, it["y"] + 3), fill=rgba(it.get("color", GOLD), 1))
            elif k == "stamp":
                self._stamp(im, it, t)
        im.alpha_composite(L); return im
    def _stamp(self, im, it, t):
        at = it.get("at", 0); p = ramp(t, at, at + 0.25)
        col = it.get("color", RED); col = STAMP_RED if col == RED else col
        place_stamp(im, it["x"], it["y"], p, text=it["text"], size=it.get("size", 90), color=col, rot=it.get("rot", -8))

def TitleCard(start, kicker, title, sub=None, **kw):
    items = [{"k": "kicker", "text": kicker, "y": 360, "at": 0.3},
             {"k": "title", "text": title, "y": 430, "size": 150, "at": 0.5},
             {"k": "rule", "y": 640, "w": 620, "at": 0.9}]
    if sub: items.append({"k": "line", "text": sub, "y": 690, "size": 56, "at": 1.2})
    return Card(start, items, align="center", **kw)

def QuoteCard(start, quote, who, role="", **kw):
    items = [{"k": "big", "text": "“", "y": 160, "size": 260, "color": RED, "at": 0.1},
             {"k": "title", "text": quote, "y": 380, "size": 92, "w": 650, "at": 0.3, "width": 1500},
             {"k": "rule", "y": 720, "w": 300, "at": 0.8},
             {"k": "kicker", "text": who + ("  ·  " + role if role else ""), "y": 760, "at": 1.0}]
    return Card(start, items, align="center", **kw)

# ---------------------------------------------------------------- blueprint diagrams
class Blueprint(Scene):
    """Shows one view of a navy line drawing, with animated overlays.
    view = (x0,y0,x1,y1) in the drawing's own pixel coords. overlay(d, L, t, P) draws on
    layer L; P(x, y) maps drawing coords to screen coords and P.s is the scale."""
    def __init__(self, start, drawing, view, overlay=None, box=(160, 150, 1760, 950), drift=0.03, erase=(), **kw):
        super().__init__(start, **kw); self.erase = erase    # erase: rectangles (drawing coords) to blank out
        self.drawing, self.view, self.overlay, self.box, self.drift = drawing, view, overlay, box, drift
    def base(self, t):
        im = navy_bg().convert("RGBA")
        x0, y0, x1, y1 = self.view; bx0, by0, bx1, by1 = self.box
        z = 1 + self.drift * max(0, min(1, t / max(self.dur, 0.01)))
        s = min((bx1 - bx0) / (x1 - x0), (by1 - by0) / (y1 - y0)) * z
        cw, ch = (x1 - x0) * s, (y1 - y0) * s; ox = (bx0 + bx1) / 2 - cw / 2; oy = (by0 + by1) / 2 - ch / 2
        key = ("bp", self.drawing, self.view)
        if key not in _imgs:
            src = Image.open(self.drawing).convert("L")
            for r in self.erase: ImageDraw.Draw(src).rectangle(r, fill=255)
            _imgs[key] = src.crop(self.view)
        src = _imgs[key]; g = src.resize((int(cw), int(ch)), Image.BICUBIC)
        a = 255 - np.asarray(g)          # line alpha (drawing is dark lines on white)
        lines = np.zeros((g.height, g.width, 4), np.uint8); lines[..., :3] = CREAM; lines[..., 3] = (a * 0.92 * min(1, ramp(t, 0, 0.6) + 0.0)).astype(np.uint8)
        im.alpha_composite(Image.fromarray(lines), (int(ox), int(oy)))
        class Pm:
            def __call__(_, x, y): return (ox + (x - x0) * s, oy + (y - y0) * s)
        P = Pm(); P.s = s
        if self.overlay:
            L = layer(); d = ImageDraw.Draw(L); self.overlay(d, L, t, P); im.alpha_composite(L)
        return im

def label(d, xy, text, a, color=GOLD, size=30, align="left"):
    if a <= 0: return
    tracked(d, xy, text, cond(size), rgba(color, a), 5, align)

def arrow(d, p0, p1, a, color=GOLD, width=5, head=18):
    if a <= 0: return
    x0, y0 = p0; x1, y1 = p1; xm, ym = x0 + (x1 - x0) * a, y0 + (y1 - y0) * a
    d.line((x0, y0, xm, ym), fill=rgba(color, 1), width=width)
    ang = math.atan2(ym - y0, xm - x0)
    for s in (2.6, -2.6):
        d.line((xm, ym, xm + head * math.cos(ang + s), ym + head * math.sin(ang + s)), fill=rgba(color, 1), width=width)

def flow(d, pts, t, a, color=CREAM, n=14, speed=0.35, r=6):
    """Particles moving along a polyline (screen coords): airflow."""
    if a <= 0 or len(pts) < 2: return
    seg = [math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1)]; L = sum(seg)
    for k in range(n):
        u = ((t * speed + k / n) % 1.0) * L
        for i, sl in enumerate(seg):
            if u <= sl:
                f = u / sl; x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f; y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f
                d.ellipse((x - r, y - r, x + r, y + r), fill=rgba(color, a)); break
            u -= sl

def fan(d, c, radius, angle, a, blades=8, color=CREAM, hub=0.22):
    if a <= 0: return
    x, y = c
    d.ellipse((x - radius, y - radius, x + radius, y + radius), fill=rgba(NAVY, a), outline=rgba(color, a), width=5)
    for i in range(blades):
        th = angle + i * 2 * math.pi / blades
        p0 = (x + radius * hub * math.cos(th), y + radius * hub * math.sin(th))
        p1 = (x + radius * 0.92 * math.cos(th + 0.35), y + radius * 0.92 * math.sin(th + 0.35))
        d.line((p0, p1), fill=rgba(color, a), width=7)
    d.ellipse((x - radius * hub, y - radius * hub, x + radius * hub, y + radius * hub), fill=rgba(RED, a))

# ---------------------------------------------------------------- generic custom scene
class Custom(Scene):
    """Navy background + draw(d, L, t, scene) callback, for one-off graphics."""
    def __init__(self, start, draw, bg=None, **kw):
        super().__init__(start, **kw); self.draw, self.bgfn = draw, bg
    def base(self, t):
        im = (self.bgfn(t) if self.bgfn else navy_bg()).convert("RGBA"); L = layer()
        self.draw(ImageDraw.Draw(L), L, t, self); im.alpha_composite(L); return im

class Black(Scene):
    def base(self, t): return Image.new("RGB", (W, H), (0, 0, 0))

# ---------------------------------------------------------------- render
def _scene_at(scenes, T):
    i = 0
    while i + 1 < len(scenes) and scenes[i + 1].start <= T: i += 1
    return i

def local(sc, T):
    """Scene-local time. A scene may carry tmap(T) so its inner timings stretch with the narration."""
    return sc.tmap(T) if getattr(sc, "tmap", None) else T - sc.start

def frame_at(scenes, T):
    i = _scene_at(scenes, T); sc = scenes[i]
    nxt = scenes[i + 1] if i + 1 < len(scenes) else None
    if nxt and T > nxt.start - XFADE / 2:           # just before a cut: start dissolving
        a = (T - (nxt.start - XFADE / 2)) / XFADE
        return Image.blend(sc.frame(local(sc, T)), nxt.frame(local(nxt, T)), a)
    if i > 0 and T < sc.start + XFADE / 2:          # just after a cut
        pv = scenes[i - 1]; a = 0.5 + (T - sc.start) / XFADE
        return Image.blend(pv.frame(local(pv, T)), sc.frame(local(sc, T)), min(1, a))
    return sc.frame(local(sc, T))

_SCENES = []                                        # set before forking; workers inherit it (no pickling)
def _worker(args):
    f0, f1, path = args; scenes = _SCENES
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                          "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-crf", "17", "-preset", "medium",
                          "-pix_fmt", "yuv420p", path], stdin=subprocess.PIPE)
    for f in range(f0, f1):
        p.stdin.write(np.asarray(frame_at(scenes, f / FPS)).tobytes())
    p.stdin.close(); p.wait(); return path

def render(scenes, total, audio, out, workers=8, only=None, tmp=None):
    """Render scenes[0..] for `total` seconds, mux with audio. only=(t0,t1) renders a preview slice."""
    scenes = sorted(scenes, key=lambda s: s.start)
    for a, b in zip(scenes, scenes[1:]): a.dur = b.start - a.start
    scenes[-1].dur = total - scenes[-1].start
    for sc in scenes:                               # durations in the scene's own (mapped) time
        if getattr(sc, "tmap", None): sc.dur = sc.tmap(sc.start + sc.dur)
    t0, t1 = only or (0, total); F0, F1 = int(t0 * FPS), int(t1 * FPS)
    tmp = tmp or os.path.splitext(out)[0] + "_parts"; os.makedirs(tmp, exist_ok=True)
    n = max(1, min(workers, (F1 - F0) // 50 or 1)); step = math.ceil((F1 - F0) / n)
    _SCENES[:] = scenes
    jobs = [(F0 + k * step, min(F1, F0 + (k + 1) * step), f"{tmp}/part{k:02d}.mp4") for k in range(n)]
    with mp.get_context("fork").Pool(n) as pool: parts = pool.map(_worker, jobs)
    lst = f"{tmp}/list.txt"; open(lst, "w").write("".join(f"file '{os.path.abspath(p)}'\n" for p in parts))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-ss", str(t0), "-t", str(t1 - t0),
                    "-i", audio, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", out], check=True)
    for p in parts: os.remove(p)
    return out


# ---------------------------------------------------------------- the BANNED rubber stamp (series mark)
STAMP_RED = (226, 36, 50)
_stamps = {}
def rubber_stamp(text="BANNED", size=140, color=STAMP_RED, rot=-11, seed=7):
    """Inked rubber-stamp mark: double border, condensed caps, rough edges and patchy ink.
    Returns an RGBA image (cached). The same mark is used on thumbnails and in videos."""
    key = (text, size, color, rot, seed)
    if key in _stamps: return _stamps[key]
    k = 2                                                     # draw at 2x, then downsample
    f = cond(size * k, 8); track = 9 * k                     # Avenir Next Condensed Heavy, upright
    tw = sum(f.getlength(c) for c in text) + track * (len(text) - 1)
    pad, bw = int(size * 0.32 * k), int(size * 0.09 * k)
    w, h = int(tw + 2 * pad), int(size * 1.62 * k)
    m = Image.new("L", (w, h), 0); d = ImageDraw.Draw(m)
    d.rounded_rectangle((bw // 2, bw // 2, w - bw // 2, h - bw // 2), radius=int(size * 0.08 * k), outline=255, width=bw)
    gap = int(bw * 1.9)
    d.rounded_rectangle((gap, gap, w - gap, h - gap), radius=int(size * 0.05 * k), outline=255, width=max(2, bw // 3))
    tracked(d, (pad, h / 2 - f.getbbox("H")[3] / 2 + f.getbbox("H")[1] / 2), text, f, 255, track)
    rng = np.random.default_rng(seed); a = np.asarray(m).astype(np.float32) / 255
    def field(scale, blur):
        n = Image.fromarray((rng.random((max(2, h // scale), max(2, w // scale))) * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
        return np.asarray(n.filter(ImageFilter.GaussianBlur(blur))).astype(np.float32) / 255
    # rough edges: blur the shapes, wobble the threshold with fine noise
    soft = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2.2 * k))).astype(np.float32) / 255
    edge = (soft + (field(3, 1) - 0.5) * 0.45) > 0.5
    # patchy ink: big soft blotches where the stamp pressed lighter, plus pin-holes
    ink = np.clip(0.86 + (field(40, 18) - 0.5) * 1.3, 0.62, 1.0)
    holes = field(2, 0.6) > 0.885
    alpha = np.where(edge & ~holes, ink, 0) * 255
    out = np.zeros((h, w, 4), np.uint8); out[..., :3] = color; out[..., 3] = alpha.astype(np.uint8)
    im = Image.fromarray(out).resize((w // k, h // k), Image.LANCZOS).rotate(rot, expand=True, resample=Image.BICUBIC)
    _stamps[key] = im
    return im

def place_stamp(base, cx, cy, p=1.0, **kw):
    """Composite the stamp centred at (cx, cy); p animates the 'slam' (scale + fade in)."""
    if p <= 0: return
    st = rubber_stamp(**kw)
    if p < 1:
        sc = 1.5 - 0.5 * p; st = st.resize((int(st.width * sc), int(st.height * sc)), Image.BICUBIC)
        a = np.asarray(st).copy(); a[..., 3] = (a[..., 3] * p).astype(np.uint8); st = Image.fromarray(a)
    base.alpha_composite(st, (int(cx - st.width / 2), int(cy - st.height / 2)))


# ---------------------------------------------------------------- BANNED sting: the stamp slams onto paper (series opener)
STING_LEN, STING_HIT = 2.2, 0.32        # total length; moment of impact

def paper_bg(seed=11):
    """Cream document paper: soft fibres, slight tone variation, vignette."""
    if ("paper", seed) in _imgs: return _imgs[("paper", seed)].copy()
    rng = np.random.default_rng(seed)
    base = np.ones((H, W, 3), np.float32) * np.array([236, 229, 212], np.float32)
    blot = Image.fromarray((rng.random((H // 40, W // 40)) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(30))
    base *= (0.97 + 0.06 * np.asarray(blot, np.float32)[..., None] / 255)
    fib = Image.fromarray((rng.random((H, W)) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
    base *= (0.985 + 0.03 * np.asarray(fib, np.float32)[..., None] / 255)
    yy, xx = np.mgrid[0:H, 0:W]; r = np.sqrt(((xx - W / 2) / W) ** 2 + ((yy - H / 2) / H) ** 2)
    base *= np.clip(1 - 0.35 * r ** 2, 0, 1)[..., None]
    _imgs[("paper", seed)] = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8)); return _imgs[("paper", seed)].copy()

class Sting(Scene):
    """Rubber stamp slams down, shakes the frame, lifts away leaving the BANNED mark."""
    def __init__(self, start=0.0, size=300, rot=-8, bg=None, cy=None, items=None, length=STING_LEN, **kw):
        """bg: a Scene that keeps playing under the stamp (no paper); cy: stamp centre height;
        items: Card-style items (e.g. the episode title) that appear under the mark; length: scene length."""
        super().__init__(start, **kw); self.size, self.rot, self.bgsc, self.cy, self.length = size, rot, bg, cy or H / 2, length
        self.card = Card(0, items, align="center") if items else None
        if bg: bg.dur = length + XFADE
        if self.card: self.card.dur = length
    def base(self, t):
        hit = STING_HIT; mark = rubber_stamp(size=self.size, rot=self.rot)
        # camera: shake after impact, slow push-in during the hold
        sh = 26 * math.exp(-max(0, t - hit) / 0.09) * (t >= hit)
        dx = sh * math.sin(t * 91); dy = sh * math.cos(t * 77)
        zoom = 1.0 + 0.035 * ramp(t, hit, self.length) + (0.02 if hit <= t < hit + 0.06 else 0)
        if self.bgsc:                                         # the footage keeps playing, darkened so the red reads
            im = self.bgsc.frame(t)
            im = Image.blend(im, Image.new("RGB", (W, H), (8, 10, 16)), 0.35 + 0.25 * ramp(t, 0.9, 1.6)).convert("RGBA")
        else: im = paper_bg().convert("RGBA")
        cx, cy = W / 2, self.cy
        if t >= hit:                                          # the imprint, ink spreading a touch
            ink = min(1.0, 0.85 + 0.15 * ramp(t, hit, hit + 0.3))
            m = mark if ink >= 1 else Image.fromarray((np.asarray(mark) * np.array([1, 1, 1, ink])).astype(np.uint8))
            im.alpha_composite(m, (int(cx - m.width / 2), int(cy - m.height / 2)))
            self._splats(im, t, hit, cy)
        # the stamp block: falls (scale 2.7 -> 1) before the hit, lifts away (1 -> 1.35, fading) after
        lift = 0.0; u = 0.0
        if t < hit: s = 2.7 - 1.7 * ease(t / hit) ** 2; a = min(1, 0.4 + t / hit)
        else:                                                 # lifts straight up and out of frame
            u = max(0.0, min(1.0, (t - hit - 0.05) / 0.26)); s = 1.0 + 0.3 * u; lift = 1400 * u * u; a = 1.0 if u < 1 else 0.0
        if a > 0:
            bw, bh = mark.width * 0.95 * s, mark.height * 0.95 * s
            shadow = Image.new("L", (W, H), 0); off = 40 * (s - 1) + 6
            ImageDraw.Draw(shadow).rounded_rectangle((cx - bw / 2 + off, cy - bh / 2 + off, cx + bw / 2 + off, cy + bh / 2 + off), 30, fill=int(150 * a * (1 - u) ** 2 / max(1, s * 0.8)))
            shadow = shadow.filter(ImageFilter.GaussianBlur(18 + 30 * (s - 1)))
            im.alpha_composite(Image.merge("RGBA", (*[Image.new("L", (W, H), 0)] * 3, shadow)))
            blk = Image.new("RGBA", (int(bw), int(bh)), (0, 0, 0, 0)); bd = ImageDraw.Draw(blk)
            bd.rounded_rectangle((0, 0, bw - 1, bh - 1), int(26 * s), fill=(58, 36, 24, int(255 * a)))          # wooden mount
            bd.rounded_rectangle((bw * 0.06, bh * 0.1, bw * 0.94, bh * 0.9), int(18 * s), fill=(84, 54, 34, int(255 * a)))
            bd.rounded_rectangle((bw * 0.3, bh * 0.32, bw * 0.7, bh * 0.68), int(40 * s), fill=(40, 24, 16, int(255 * a)))  # handle seen from above
            bd.rectangle((0, bh - 10 * s, bw, bh), fill=STAMP_RED + (int(255 * a),))                                    # inked rubber edge
            if t < hit: blk = blk.filter(ImageFilter.GaussianBlur(4 * (s - 1)))                                        # motion blur on the way down
            blk = blk.rotate(self.rot, expand=True, resample=Image.BICUBIC)
            im.alpha_composite(blk, (int(cx - blk.width / 2), int(cy - blk.height / 2 - lift)))
        if zoom != 1 or sh:
            vw, vh = W / zoom, H / zoom; x0, y0 = (W - vw) / 2 - dx, (H - vh) / 2 - dy
            im = im.transform((W, H), Image.EXTENT, (x0, y0, x0 + vw, y0 + vh), Image.BICUBIC)
        if hit <= t < hit + 0.05:                             # impact flash
            im = Image.blend(im.convert("RGB"), Image.new("RGB", (W, H), (255, 252, 244)), 0.35).convert("RGBA")
        if self.card: im = self.card.draw_items(im, t)
        return im
    def _splats(self, im, t, hit, cy=H / 2):
        """A few uneven ink flecks, mostly just outside the stamp's long edges."""
        rng = np.random.default_rng(5); d = ImageDraw.Draw(im); fly = ramp(t, hit, hit + 0.1)
        mw, mh = 1180, 420
        for i in range(16):
            side = rng.choice([-1, 1]); along = rng.uniform(-0.55, 0.55)
            if rng.random() < 0.7: x, y = W / 2 + along * mw, cy + side * (mh / 2 + rng.uniform(10, 70) * fly)
            else: x, y = W / 2 + side * (mw / 2 + rng.uniform(10, 80) * fly), cy + along * mh * 0.6
            sz = rng.choice([2, 3, 4, 6, 9], p=[0.3, 0.3, 0.2, 0.13, 0.07])
            for k in range(1 + (sz > 5) * 2):                # big flecks get satellite drops
                ox, oy = (rng.uniform(-14, 14), rng.uniform(-8, 8)) if k else (0, 0); r = sz if not k else sz * 0.35
                d.ellipse((x + ox - r, y + oy - r * 0.8, x + ox + r, y + oy + r * 0.8), fill=STAMP_RED + (int(210 * fly),))

def stamp_sfx(path, length=STING_LEN, hit=STING_HIT, sr=48000):
    """Whoosh down, heavy thunk + paper slap at the hit, small wooden knock as it lifts. Mono WAV."""
    import wave
    n = int(length * sr); t = np.arange(n) / sr; out = np.zeros(n); rng = np.random.default_rng(1)
    def env(t0, decay): x = t - t0; return np.where(x >= 0, np.exp(-np.maximum(x, 0) / decay), 0)
    def lp(x, k): return np.convolve(x, np.ones(k) / k, mode="same")
    noise = rng.standard_normal(n)
    wh = np.clip((t - 0.02) / (hit - 0.02), 0, 1) ** 2 * (t < hit)                       # whoosh rising into the hit
    out += 0.22 * wh * lp(noise, 6)
    f = 58 - 18 * np.clip((t - hit) / 0.2, 0, 1)                                          # thunk with a pitch drop
    ph = 2 * np.pi * np.cumsum(f) / sr
    out += 0.95 * np.sin(ph) * env(hit, 0.16)
    out += 0.55 * lp(noise, 40) * env(hit, 0.06)                                          # body
    out += 0.35 * (noise - lp(noise, 8)) * env(hit, 0.018)                                # paper slap
    k = hit + 0.2; out += 0.18 * np.sin(2 * np.pi * 180 * t) * env(k, 0.03) + 0.1 * lp(noise, 12) * env(k, 0.02)
    out = out / np.max(np.abs(out)) * 0.89
    with wave.open(path, "w") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((out * 32767).astype(np.int16).tobytes())
    return path


# ---------------------------------------------------------------- IMPOSSIBLE: the second series' mark
# The word IMPOSSIBLE with a red marker stroke through "IM", leaving POSSIBLE.
def _marker_stroke(w, h, seed=3):
    """A rough red marker stroke, w x h, drawn left to right (RGBA, cached)."""
    key = ("stroke", w, h, seed)
    if key in _stamps: return _stamps[key]
    rng = np.random.default_rng(seed); k = 2; W2, H2 = w * k, h * k
    m = Image.new("L", (W2, H2), 0); d = ImageDraw.Draw(m)
    top = [(x, H2 * (0.18 + 0.05 * math.sin(x / W2 * 3.1)) + rng.uniform(-1, 1) * H2 * 0.03) for x in np.linspace(0, W2, 24)]
    bot = [(x, H2 * (0.84 - 0.05 * math.sin(x / W2 * 2.3 + 1)) + rng.uniform(-1, 1) * H2 * 0.03) for x in np.linspace(W2, 0, 24)]
    d.polygon(top + bot, fill=255)
    d.ellipse((-H2 * 0.25, H2 * 0.12, H2 * 0.4, H2 * 0.88), fill=255)            # rounded nib ends
    d.ellipse((W2 - H2 * 0.4, H2 * 0.16, W2 + H2 * 0.2, H2 * 0.86), fill=255)
    a = np.asarray(m.filter(ImageFilter.GaussianBlur(1.2 * k))).astype(np.float32) / 255
    streak = Image.fromarray((rng.random((max(2, H2 // 6), 8)) * 255).astype(np.uint8)).resize((W2, H2), Image.BICUBIC)
    ink = 0.8 + 0.2 * np.asarray(streak.filter(ImageFilter.GaussianBlur(2)), np.float32) / 255   # dry streaks along the stroke
    out = np.zeros((H2, W2, 4), np.uint8); out[..., :3] = STAMP_RED; out[..., 3] = (np.clip((a - 0.35) * 3, 0, 1) * ink * 255).astype(np.uint8)
    im = Image.fromarray(out).resize((w, h), Image.LANCZOS); _stamps[key] = im; return im

def impossible_mark(size=200, strike=1.0, dim=1.0, color=CREAM, rot=-7):
    """IMPOSSIBLE with "IM" struck out. strike 0..1 = how far the stroke has been drawn;
    dim 0..1 = how far "IM" has faded back. Returns RGBA sized to the word."""
    f = cond(size, 8); track = int(size * 0.06)
    wid = lambda s_: sum(f.getlength(c) for c in s_) + track * (len(s_) - 1)
    pad = int(size * 0.35); w, h = int(wid("IMPOSSIBLE") + 2 * pad), int(size * 1.7)
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    cap = f.getbbox("H"); y = h / 2 - (cap[3] - cap[1]) / 2
    x_im = wid("IM") + track
    tracked(d, (pad, y), "IM", f, rgba(color, 1 - 0.55 * dim), track)
    tracked(d, (pad + x_im, y), "POSSIBLE", f, rgba(color, 1), track)
    if strike > 0:
        sw, sh = int(x_im + size * 0.3), int(size * 0.27)
        st = _marker_stroke(sw, sh).rotate(rot, expand=True, resample=Image.BICUBIC)
        cut = int(st.width * min(1, strike))
        if cut > 0: im.alpha_composite(st.crop((0, 0, cut, st.height)), (int(pad - size * 0.15), int(h / 2 - st.height / 2)))
    return im

IMP_LEN = 5.0
IMP_HIT, IMP_CRACK, IMP_SHATTER, IMP_GLIDE, IMP_SHINE = 0.35, (0.75, 1.3), 1.4, (1.55, 2.35), (2.15, 2.95)
IMP_STRIKE = (IMP_SHATTER, IMP_SHATTER + 0.01)          # kept for older callers

_imp = {}
def _imp_parts(size):
    """The word as two RGBA pieces ("IM" and "POSSIBLE"), the shards "IM" breaks into, and its crack lines."""
    if size in _imp: return _imp[size]
    f = cond(size, 8); track = int(size * 0.06)
    wid = lambda s_: sum(f.getlength(c) for c in s_) + track * (len(s_) - 1)
    pad = int(size * 0.2); h = int(size * 1.5); cap = f.getbbox("H"); y = h / 2 - (cap[3] - cap[1]) / 2
    def word(txt, col):
        im = Image.new("RGBA", (int(wid(txt) + 2 * pad), h), (0, 0, 0, 0)); tracked(ImageDraw.Draw(im), (pad, y), txt, f, col + (255,), track); return im
    im_w, pos_w = word("IM", CREAM), word("POSSIBLE", CREAM)
    gap = track - 2 * pad                                  # where POSSIBLE sits relative to IM so the word reads as one
    # shards: jittered grid triangles over "IM"
    rng = np.random.default_rng(11); cols, rows = 7, 5; W_, H_ = im_w.size
    pts = [[(x * W_ / (cols - 1) + (rng.uniform(-0.3, 0.3) * W_ / cols if 0 < x < cols - 1 else 0),
             yy * H_ / (rows - 1) + (rng.uniform(-0.3, 0.3) * H_ / rows if 0 < yy < rows - 1 else 0)) for x in range(cols)] for yy in range(rows)]
    shards = []
    for yy in range(rows - 1):
        for x in range(cols - 1):
            a, b, c, d_ = pts[yy][x], pts[yy][x + 1], pts[yy + 1][x], pts[yy + 1][x + 1]
            for tri in ((a, b, c), (b, d_, c)):
                m = Image.new("L", im_w.size, 0); ImageDraw.Draw(m).polygon(tri, fill=255)
                piece = Image.new("RGBA", im_w.size, (0, 0, 0, 0)); piece.paste(im_w, (0, 0), m)
                bb = piece.getbbox()
                if not bb: continue
                cx, cy = (bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2
                shards.append((piece.crop(bb), bb[0], bb[1], (cx - W_ / 2) / W_, (cy - H_ / 2) / H_, rng.uniform(-1, 1), rng.uniform(0.6, 1.4)))
    cracks = []
    for k in range(6):                                     # jagged lines out from a point inside the M
        x, y_ = W_ * 0.62, H_ * 0.5; an = rng.uniform(0, 2 * math.pi); line = [(x, y_)]
        for _ in range(6): an += rng.uniform(-0.6, 0.6); x += math.cos(an) * W_ * 0.09; y_ += math.sin(an) * H_ * 0.09; line.append((x, y_))
        cracks.append(line)
    _imp[size] = (im_w, pos_w, gap, shards, cracks); return _imp[size]

class ImpossibleSting(Scene):
    """The IMPOSSIBLE open: over moving footage the word slams down, cracks run through "IM", "IM" shatters into
    shards and gold sparks, POSSIBLE glides to the centre and a gold light sweeps across it; title fades in below."""
    def __init__(self, start=0.0, size=230, bg=None, cy=380, items=None, length=IMP_LEN, **kw):
        super().__init__(start, **kw); self.size, self.bgsc, self.cy, self.length = size, bg, cy, length
        self.card = Card(0, items, align="center") if items else None
        if bg: bg.dur = length + XFADE
        if self.card: self.card.dur = length
    def base(self, t):
        im_w, pos_w, gap, shards, cracks = _imp_parts(self.size)
        bg = self.bgsc.frame(t) if self.bgsc else navy_bg()
        im = Image.blend(bg, Image.new("RGB", (W, H), (6, 8, 12)), 0.55 + 0.15 * ramp(t, 1.4, 2.4)).convert("RGBA")
        L = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        total = im_w.width + gap + pos_w.width
        x_im0 = W / 2 - total / 2; x_pos0 = x_im0 + im_w.width + gap
        g = ease((t - IMP_GLIDE[0]) / (IMP_GLIDE[1] - IMP_GLIDE[0])) if t > IMP_GLIDE[0] else 0
        x_pos = x_pos0 + (W / 2 - pos_w.width / 2 - x_pos0) * g; y0 = self.cy - im_w.height / 2
        # 1. the slam: the whole word drops from big and blurred to its place
        if t < IMP_HIT:
            f = ease(t / IMP_HIT) ** 2; sc = 2.4 - 1.4 * f; a = min(1, 0.3 + t / IMP_HIT)
            word = Image.new("RGBA", (int(total), im_w.height), (0, 0, 0, 0)); word.alpha_composite(im_w, (0, 0)); word.alpha_composite(pos_w, (int(im_w.width + gap), 0))
            word = word.resize((int(word.width * sc), int(word.height * sc)), Image.BICUBIC).filter(ImageFilter.GaussianBlur(5 * (sc - 1)))
            word = Image.fromarray((np.asarray(word) * np.array([1, 1, 1, a])).astype(np.uint8))
            L.alpha_composite(word, (int(W / 2 - word.width / 2), int(self.cy - word.height / 2)))
        else:
            # 2. "IM": cracks, then shards flying out with spin and gravity
            if t < IMP_SHATTER:
                piece = im_w.copy(); c = ramp(t, *IMP_CRACK)
                if c > 0:
                    d = ImageDraw.Draw(piece)
                    for line in cracks:
                        n = max(2, int(len(line) * c)); d.line(line[:n], fill=(10, 10, 14, 255), width=max(3, self.size // 45))
                L.alpha_composite(piece, (int(x_im0), int(y0)))
            else:
                u = t - IMP_SHATTER
                for (sh, sx, sy, dx, dy, spin, sp) in shards:
                    fade = 1 - ramp(u, 0.35, 0.95)
                    if fade <= 0: continue
                    vx, vy = dx * 1900 * sp - 260, dy * 1500 * sp - 300           # burst out and back, a little up
                    px = x_im0 + sx + vx * u; py = y0 + sy + vy * u + 1400 * u * u
                    r = sh.rotate(spin * 540 * u, expand=True, resample=Image.BICUBIC)
                    if fade < 1: r = Image.fromarray((np.asarray(r) * np.array([1, 1, 1, fade])).astype(np.uint8))
                    L.alpha_composite(r, (int(px), int(py)))
                rng = np.random.default_rng(3); d = ImageDraw.Draw(L)                 # gold sparks
                for k in range(70):
                    an = rng.uniform(0, 2 * math.pi); v = rng.uniform(300, 1400); life = rng.uniform(0.3, 0.8)
                    if u > life: continue
                    cx, cy_ = x_im0 + im_w.width / 2, self.cy
                    px, py = cx + math.cos(an) * v * u, cy_ + math.sin(an) * v * u + 600 * u * u
                    a2 = 1 - u / life; r_ = 2 + 3 * a2
                    d.line((px, py, px - math.cos(an) * 26 * a2, py - math.sin(an) * 26 * a2), fill=rgba(GOLD, a2), width=int(r_))
                ring = ramp(u, 0, 0.5)                                                  # shockwave
                if ring < 1:
                    R = 60 + 900 * ring; cx, cy_ = x_im0 + im_w.width / 2, self.cy
                    d.ellipse((cx - R, cy_ - R * 0.6, cx + R, cy_ + R * 0.6), outline=rgba(CREAM, 0.5 * (1 - ring)), width=6)
            # 3. POSSIBLE: glides to the centre, turns gold, a light sweeps across
            gold = ramp(t, IMP_SHINE[0], IMP_SHINE[0] + 0.5)
            pw = pos_w if gold <= 0 else Image.fromarray(np.dstack([
                (np.asarray(pos_w)[..., :3] * (1 - gold) + np.array(GOLD) * gold).astype(np.uint8), np.asarray(pos_w)[..., 3]]))
            s = ramp(t, *IMP_SHINE)
            if 0 < s < 1:                                                              # specular band
                band = Image.new("L", pw.size, 0); bx = -200 + (pw.width + 400) * s
                ImageDraw.Draw(band).polygon([(bx, 0), (bx + 90, 0), (bx + 30, pw.height), (bx - 60, pw.height)], fill=210)
                band = Image.fromarray((np.asarray(band.filter(ImageFilter.GaussianBlur(14)), np.float32) * np.asarray(pw)[..., 3] / 255).astype(np.uint8))
                lit = Image.new("RGBA", pw.size, (255, 248, 225, 0)); lit.putalpha(band); pw = pw.copy(); pw.alpha_composite(lit)
            L.alpha_composite(pw, (int(x_pos), int(y0)))
        # camera: impact shake + flash
        sh_ = 22 * math.exp(-max(0, t - IMP_HIT) / 0.1) * (t >= IMP_HIT) + 12 * math.exp(-max(0, t - IMP_SHATTER) / 0.08) * (t >= IMP_SHATTER)
        im.alpha_composite(L, (int(sh_ * math.sin(t * 93)), int(sh_ * math.cos(t * 71))))
        if IMP_HIT <= t < IMP_HIT + 0.05 or IMP_SHATTER <= t < IMP_SHATTER + 0.04:
            im = Image.blend(im.convert("RGB"), Image.new("RGB", (W, H), (255, 246, 225)), 0.3).convert("RGBA")
        if self.card: im = self.card.draw_items(im, t)
        return im

def impossible_sfx(path, length=IMP_LEN, sr=48000):
    """Whoosh down, a deep boom as the word lands, creaks as it cracks, a glassy shatter with debris,
    then a rising shimmer as POSSIBLE turns gold. Mono WAV."""
    import wave
    n = int(length * sr); t = np.arange(n) / sr; out = np.zeros(n); rng = np.random.default_rng(4)
    noise = rng.standard_normal(n)
    def env(t0, decay): x = t - t0; return np.where(x >= 0, np.exp(-np.maximum(x, 0) / decay), 0)
    def lp(x, k): return np.convolve(x, np.ones(k) / k, mode="same")
    hp = noise - lp(noise, 4)
    out += 0.25 * np.clip((t - 0.02) / (IMP_HIT - 0.02), 0, 1) ** 2 * (t < IMP_HIT) * lp(noise, 6)                    # whoosh
    f = 48 - 16 * np.clip((t - IMP_HIT) / 0.4, 0, 1); ph = 2 * np.pi * np.cumsum(f) / sr                            # boom
    out += 1.0 * np.sin(ph) * env(IMP_HIT, 0.5) * (t >= IMP_HIT) + 0.5 * lp(noise, 60) * env(IMP_HIT, 0.12)
    for k in range(7):                                                                                             # cracks
        c0 = IMP_CRACK[0] + (IMP_CRACK[1] - IMP_CRACK[0]) * k / 6 + rng.uniform(0, 0.03)
        out += 0.35 * hp * env(c0, 0.012) + 0.12 * np.sin(2 * np.pi * rng.uniform(1800, 3200) * t) * env(c0, 0.01)
    out += 0.7 * hp * env(IMP_SHATTER, 0.25) + 0.6 * lp(noise, 30) * env(IMP_SHATTER, 0.1)                         # shatter
    out += 0.7 * np.sin(2 * np.pi * 40 * t) * env(IMP_SHATTER, 0.3) * (t >= IMP_SHATTER)
    for k in range(18):                                                                                            # debris tinkles
        c0 = IMP_SHATTER + rng.uniform(0.05, 0.9)
        out += 0.08 * np.sin(2 * np.pi * rng.uniform(2500, 6000) * t) * env(c0, 0.03)
    sh = np.clip((t - IMP_SHINE[0]) / 0.6, 0, 1) * env(IMP_SHINE[0] + 0.6, 0.9) * (t >= IMP_SHINE[0])              # shimmer
    out += 0.12 * sh * sum(np.sin(2 * np.pi * fq * t) for fq in (880, 1320, 1760))
    out = out / np.max(np.abs(out)) * 0.89
    with wave.open(path, "w") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((out * 32767).astype(np.int16).tobytes())
    return path


# ---------------------------------------------------------------- music bed: any number of tracks, cycled to length
def music_bed(tracks, length, out, xfade=6.0, level=-20.0):
    """Level-match the tracks, play them in order (cycling if the video is longer than all of them),
    crossfading between each, trimmed to `length` with a 4 s fade at the end. Writes a stereo WAV."""
    durs = [float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", t])) for t in tracks]
    seq, total = [], 0.0
    while total < length + 1:
        k = len(seq) % len(tracks); seq.append(k); total += durs[k] - (xfade if seq[1:] else 0)
    args = []; fc = []
    for i, k in enumerate(seq):
        args += ["-i", tracks[k]]
        fc.append(f"[{i}:a]aresample=48000,aformat=channel_layouts=stereo,loudnorm=I={level}:TP=-2:LRA=11,aresample=48000[t{i}]")
    cur = "[t0]"
    for i in range(1, len(seq)):
        fc.append(f"{cur}[t{i}]acrossfade=d={xfade}:c1=tri:c2=tri[x{i}]"); cur = f"[x{i}]"
    fc.append(f"{cur}atrim=0:{length},afade=t=out:st={max(0, length - 4)}:d=4[o]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", *args, "-filter_complex", ";".join(fc), "-map", "[o]", out], check=True)
    return out, [os.path.basename(tracks[k]) for k in seq]
