"""explainers: the animated "how it works" drawings for BANNED: The Monte Carlo Minis (v2).

Each is a function of local time t and cue(snippet) -> local seconds of a narration line, like the Brawn airflow drawing:
    headlights_scene(cue)   section 8: twin-filament bulb (main / dipped), quartz iodine single filament, switching lamps
Drawn over a darkened still (media/ai/ai_minis_lamps_night.png when Mike has made it, else the Turini night still).
"""
import math, os
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter
from storykit import W, H, GOLD, CREAM, RED, NAVY_D, ramp, ease, rgba, tracked, cond, pf, load

AI = "/Volumes/PostDrive/Stories/BANNED series/05 Monte Carlo Minis/media/ai/"
WARM, HOT, BLUE = (255, 190, 90), (255, 244, 220), (120, 170, 255)

_bg = {}
def base(name, dark=0.30, blur=2):
    path = AI + name if os.path.exists(AI + name) else AI + "ai_turini_night.png"
    if path not in _bg:
        im = load(path).resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(blur))
        _bg[path] = Image.blend(ImageEnhance.Brightness(im).enhance(0.8), Image.new("RGB", (W, H), NAVY_D), 1 - dark).convert("RGBA")
    return _bg[path].copy()

def tag(d, xy, text, a, colour=GOLD, size=40):
    if a <= 0: return
    x, y = xy; f = cond(size, 8); w = f.getlength(text) + 6 * len(text) + 36
    d.rounded_rectangle((x - w / 2, y - 8, x + w / 2, y + size + 14), 10, fill=rgba(NAVY_D, 0.85 * a), outline=rgba(colour, a), width=3)
    tracked(d, (x, y), text, f, rgba(colour, a), 6, "center")

def glow(L, xy, r, colour, a):
    if a <= 0: return
    g = Image.new("RGBA", (W, H), (0, 0, 0, 0)); gd = ImageDraw.Draw(g); x, y = xy
    for k, f in ((2.6, 0.25), (1.7, 0.45), (1.0, 0.9)):
        gd.ellipse((x - r * k, y - r * k, x + r * k, y + r * k), fill=rgba(colour, a * f))
    L.alpha_composite(g.filter(ImageFilter.GaussianBlur(r * 0.8)))

def beam(L, origin, length, spread, tilt_deg, a, colour=WARM, t=0.0):
    """A cone of light from origin to the right, tilted down by tilt_deg, with rays moving along it."""
    if a <= 0: return
    ox, oy = origin; th = math.radians(tilt_deg)
    def pt(l, s): return (ox + l * math.cos(th) - s * math.sin(th), oy + l * math.sin(th) + s * math.cos(th))
    g = Image.new("RGBA", (W, H), (0, 0, 0, 0)); gd = ImageDraw.Draw(g)
    for k in range(6):                                                  # soft cone, brighter in the middle
        sp = spread * (1 - k / 7); gd.polygon([pt(0, -14), pt(length, -sp), pt(length, sp), pt(0, 14)], fill=rgba(colour, a * 0.24))
    L.alpha_composite(g.filter(ImageFilter.GaussianBlur(14)))
    d = ImageDraw.Draw(L)
    for k in range(9):                                                  # rays streaming out
        s = (k - 4) / 4
        for j in range(3):
            u = ((t * 0.9 + j / 3 + k * 0.13) % 1.0)
            p0, p1 = pt(length * u, spread * s * u), pt(length * min(1, u + 0.08), spread * s * min(1, u + 0.08))
            d.line([p0, p1], fill=rgba(HOT, a * (1 - u) * 0.95), width=6)

def bulb(L, d, c, scale, a, quartz=0.0, main_on=0.0, dip_on=0.0, t=0.0):
    """A headlight bulb: glass envelope, metal cap, filaments. quartz morphs it into a slim single-filament capsule."""
    if a <= 0: return
    x, y = c; s = scale; q = ease(quartz)
    rw, rh = (150 - 80 * q) * s, (190 - 30 * q) * s                    # glass envelope half sizes
    d.rounded_rectangle((x - 70 * s, y + rh * 0.55, x + 70 * s, y + rh * 0.55 + 120 * s), 14, fill=rgba((150, 150, 160), a),
                        outline=rgba(CREAM, a), width=3)                # cap
    for k in range(4): d.line([(x - 70 * s, y + rh * 0.55 + (24 + 26 * k) * s), (x + 70 * s, y + rh * 0.55 + (14 + 26 * k) * s)],
                              fill=rgba(NAVY_D, a * 0.6), width=3)
    d.ellipse((x - rw, y - rh, x + rw, y + rh * 0.9), outline=rgba(CREAM, a), width=4, fill=rgba(NAVY_D, a * 0.82))
    def coil(cx, cy, w, on, col):
        pts = [(cx - w / 2 + w * i / 24, cy + 9 * s * math.sin(i * math.pi / 2)) for i in range(25)]
        d.line([(cx - w / 2, cy), (cx - w / 2, y + rh * 0.55)], fill=rgba(CREAM, a * 0.8), width=3)
        d.line([(cx + w / 2, cy), (cx + w / 2, y + rh * 0.55)], fill=rgba(CREAM, a * 0.8), width=3)
        d.line(pts, fill=rgba(col if on > 0.3 else CREAM, a), width=4)
        glow(L, (cx, cy), 26 * s * (1 + 0.6 * q), HOT if q > 0.5 else WARM, a * on)
    coil(x, y - 10 * s, 90 * s * (1 - 0.35 * q), main_on, HOT)
    if q < 0.98:                                                        # the dipped filament: off-centre, with its shield cup
        da = a * (1 - q); cx, cy = x + 8 * s, y - 85 * s
        d.arc((cx - 60 * s, cy - 10 * s, cx + 60 * s, cy + 50 * s), 180, 360, fill=rgba((170, 170, 180), da), width=5)
        dd = ImageDraw.Draw(L)
        pts = [(cx - 35 * s + 70 * s * i / 16, cy + 8 * s * math.sin(i * math.pi / 2)) for i in range(17)]
        dd.line(pts, fill=rgba(WARM if dip_on > 0.3 else CREAM, da), width=4)
        glow(L, (cx, cy), 22 * s, WARM, da * dip_on)

def oncoming(L, d, t, a):
    if a <= 0: return
    x, y = 1730, 470 + 4 * math.sin(t * 3)
    for dx in (-26, 26): glow(L, (x + dx, y), 10, (255, 250, 230), a)
    tag(d, (x, y + 50), "ONCOMING CAR", a, CREAM, 28)

def top_view(L, d, t, a, switched):
    """Right half: a night road from above, the Mini going up, a car coming down. Main lamps (long) swap for short wide ones."""
    if a <= 0: return
    x0 = 1080; d.rectangle((x0, 90, W - 80, 990), fill=rgba((14, 18, 30), 0.92 * a), outline=rgba(GOLD, a), width=3)
    for k in range(10):
        y = 90 + ((k * 100 + t * 160) % 900); d.line([(1560, y), (1560, min(990, y + 50))], fill=rgba(CREAM, 0.5 * a), width=5)
    mx, my = 1470, 820; ox, oy = 1650, 200 + 160 * min(1, t * 0.15)
    g = Image.new("RGBA", (W, H), (0, 0, 0, 0)); gd = ImageDraw.Draw(g)
    main = 1 - switched
    gd.polygon([(mx - 30, my - 60), (mx - 90, my - 520), (mx + 90, my - 520), (mx + 30, my - 60)], fill=rgba(HOT, 0.28 * a * main))
    gd.polygon([(mx - 40, my - 60), (mx - 170, my - 230), (mx + 170, my - 230), (mx + 40, my - 60)], fill=rgba(WARM, 0.30 * a * switched))
    gd.polygon([(ox - 25, oy + 60), (ox - 80, oy + 330), (ox + 80, oy + 330), (ox + 25, oy + 60)], fill=rgba((255, 250, 230), 0.18 * a))
    L.alpha_composite(g.filter(ImageFilter.GaussianBlur(16)))
    d.rounded_rectangle((mx - 38, my - 62, mx + 38, my + 62), 10, fill=rgba(RED, a), outline=rgba(CREAM, a), width=2)
    d.rectangle((mx - 30, my - 20, mx + 30, my + 30), fill=rgba(CREAM, a))       # white roof
    d.rounded_rectangle((ox - 42, oy - 70, ox + 42, oy + 70), 10, fill=rgba((90, 100, 120), a), outline=rgba(CREAM, a), width=2)
    tag(d, (1640, 1010 - 50), "MAIN LAMPS OFF · OTHER LAMPS ON" if switched > 0.5 else "MAIN BEAM", a, GOLD, 30)

def headlights_scene(cue):
    c = {k: cue(k) for k in ["A normal headlight bulb", "Flick the switch", "The Minis were using", "But those bulbs",
                             "So when another car", "The rules for standard cars"]}
    def frame(t):
        im = base("ai_minis_lamps_night.png"); L = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(L)
        A = lambda k, lag=0.0, dur=0.5: ramp(t, c[k] + lag, c[k] + lag + dur)
        out = lambda k, lag=0.0: 1 - ramp(t, c[k] + lag - 0.3, c[k] + lag)
        a = ramp(t, 0, 0.5) * out("So when another car", 0.2)
        q = ramp(t, c["The Minis were using"] + 0.6, c["The Minis were using"] + 1.8)
        main_on = A("A normal headlight bulb", 2.0) * (1 - A("Flick the switch", 0.4, 0.3)) + A("The Minis were using", 1.6)
        dip_on = A("Flick the switch", 0.4, 0.3) * (1 - A("The Minis were using", 0, 0.4))
        tilt = 7 * A("Flick the switch", 0.5, 0.8) * (1 - A("The Minis were using", 0, 0.5))
        bx, by = 470, 600
        beam(L, (bx + 200, by - 17 if dip_on < 0.5 else by - 145), 1250, 160 + 180 * q, tilt, a * max(main_on, dip_on) * (1 + 0.6 * q) / 1.6, HOT if q else WARM, t)
        bulb(L, d, (bx, by), 1.7, a, q, main_on, dip_on, t)
        oncoming(L, d, t, A("Flick the switch") * out("The Minis were using"))
        title = [("A NORMAL BULB: TWO FILAMENTS", A("A normal headlight bulb") * out("Flick the switch")),
                 ("FLICK THE SWITCH: THE BEAM DROPS", A("Flick the switch") * out("The Minis were using")),
                 ("QUARTZ IODINE: MUCH BRIGHTER", A("The Minis were using") * out("But those bulbs")),
                 ("ONE FILAMENT. IT CAN'T DIP.", A("But those bulbs") * out("So when another car"))]
        for txt, ta in title: tag(d, (W / 2, 60), txt, ta * a, GOLD, 46)
        tag(d, (bx + 520, by - 120), "MAIN BEAM", A("A normal headlight bulb", 2.0) * out("Flick the switch") * a, CREAM, 30)
        tag(d, (bx, by - 400), "DIPPED BEAM", A("A normal headlight bulb", 3.5) * out("The Minis were using") * a, WARM, 30)
        if t > c["But those bulbs"] + 1.2 and t < c["So when another car"]:
            k = A("But those bulbs", 1.2, 0.3); x, y = bx + 760, by + 120
            d.line([(x - 50, y - 50), (x + 50, y + 50)], fill=rgba(RED, k * a), width=14); d.line([(x - 50, y + 50), (x + 50, y - 50)], fill=rgba(RED, k * a), width=14)
            tag(d, (x, y + 80), "NO DIPPED BEAM", k * a, RED, 34)
        sw = A("So when another car") * out("The rules for standard cars", 0.3)
        if sw:
            top_view(L, d, t - c["So when another car"], sw, ramp(t, c["So when another car"] + 1.5, c["So when another car"] + 1.9))
            tag(d, (600, 520), "SWITCH LAMPS", sw, GOLD, 60); tag(d, (600, 620), "INSTEAD OF DIPPING", sw, CREAM, 44)
        r = A("The rules for standard cars")
        if r:
            d.rounded_rectangle((360, 330, W - 360, 750), 20, fill=rgba(NAVY_D, 0.93 * r), outline=rgba(GOLD, r), width=4)
            tracked(d, (W / 2, 380), "THE RULES · STANDARD CARS", cond(40, 8), rgba(GOLD, r), 8, "center")
            f = pf(70, 700)
            for i, ln in enumerate(("Headlights must dip", "the way the factory built them.")):
                w = f.getlength(ln); d.text((W / 2 - w / 2, 470 + i * 96 - f.getbbox("H")[1]), ln, font=f, fill=rgba(CREAM, r))
        im.alpha_composite(L); return im.convert("RGB")
    return frame
