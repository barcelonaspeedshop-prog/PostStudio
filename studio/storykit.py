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
