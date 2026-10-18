"""explainers: the animated "how it works" drawings for BANNED: The Monte Carlo Minis (v2).

Each is a function of local time t and cue(snippet) -> local seconds of a narration line, like the Brawn airflow drawing:
    headlights_scene(cue)   section 8: twin-filament bulb (main / dipped), quartz iodine single filament, switching lamps
Drawn over a darkened still (media/ai/ai_minis_lamps_night.png when Mike has made it, else the Turini night still).
"""
import math, os
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter
from storykit import W, H, GOLD, CREAM, RED, NAVY_D, ramp, ease, rgba, tracked, cond, pf, load

AI = "/Volumes/PostDrive/Stories/BANNED series/05 Monte Carlo Minis/media/ai/"
WARM, HOT, BLUE, GREEN = (255, 190, 90), (255, 244, 220), (120, 170, 255), (80, 200, 120)

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

# ---------------------------------------------------------------- section 3: how a Mini beat a V8
# Measured on the ChatGPT stills (1672x941): Mini body x 162..1443 (3.05 m), wheels at x 394 / 1262, centre y 623, r 118,
# tyre on the floor at y 742. Falcon body x 41..1634 (about 4.6 m), wheels x 322 / 1248, centre y 608, r 113, floor y 722.
MINI = dict(file="ai_mini_side.png", box=(110, 150, 1500, 800), x0=162, x1=1443, wheels=(394, 1262), wy=623, r=118, floor=742, metres=3.05)
FALCON = dict(file="ai_falcon_side.png", box=(0, 160, 1672, 790), x0=41, x1=1634, wheels=(322, 1248), wy=608, r=113, floor=722, metres=4.6)
_cut = {}
def cutout(car):
    """The car's part of the still, with feathered edges so it sits on any dark studio background."""
    if car["file"] not in _cut:
        im = load(AI + car["file"]).crop(car["box"]).convert("RGBA"); w, h = im.size
        m = Image.new("L", (w, h), 0); ImageDraw.Draw(m).rectangle((60, 40, w - 60, h - 40), fill=255)
        im.putalpha(m.filter(ImageFilter.GaussianBlur(30))); _cut[car["file"]] = im
    return _cut[car["file"]]

def studio(floor_y):
    im = Image.new("RGB", (W, H), (11, 17, 28)); d = ImageDraw.Draw(im)
    for y in range(int(floor_y) - 40, H):
        k = min(1, max(0, (y - floor_y + 40) / 160)); d.line([(0, y), (W, y)], fill=tuple(int(a + (b - a) * k) for a, b in zip((11, 17, 28), (62, 60, 68))))
    return im.convert("RGBA")

def place(im, car, s, gx, gy):
    """Paste a car cut-out at scale s with its front-wheel contact point at (gx, gy). Returns an image->screen mapper."""
    c = cutout(car); w, h = int(c.width * s), int(c.height * s)
    fx, fy = (car["wheels"][0] - car["box"][0]) * s, (car["floor"] - car["box"][1]) * s
    x, y = gx - fx, gy - fy
    im.alpha_composite(c.resize((w, h), Image.LANCZOS), (int(x), int(y)))
    return lambda px, py: (x + (px - car["box"][0]) * s, y + (py - car["box"][1]) * s)

def bracket(d, x0, x1, y, a, label, colour=GOLD):
    if a <= 0: return
    d.line([(x0, y), (x1, y)], fill=rgba(colour, a), width=5)
    for x in (x0, x1): d.line([(x, y - 16), (x, y + 16)], fill=rgba(colour, a), width=5)
    tag(d, ((x0 + x1) / 2, y + 26), label, a, colour, 28)

def mini_v8_scene(cue):
    c = {k: cue(k) for k in ["First, the engine", "So all its weight", "On ice, that's", "Second, the wheels", "Tiny ten-inch",
                             "It went round corners", "Third, it was light", "The big Fords"]}
    def frame(t):
        A = lambda k, lag=0.0, dur=0.5: ramp(t, c[k] + lag, c[k] + lag + dur)
        out = lambda k, lag=0.0: 1 - ramp(t, c[k] + lag - 0.3, c[k] + lag)
        cmp_ = ease(ramp(t, c["Third, it was light"] - 0.1, c["Third, it was light"] + 1.3))     # zoom out to the comparison
        GY = 822                                                                                # floor line on screen
        s_m = 1.15 + 0.03 * min(1, t / 20) - (1.15 - 0.50) * cmp_
        gx_m = 452 + (186 - 452) * cmp_
        im = studio(GY); L = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(L)
        P = place(im, MINI, s_m, gx_m, GY)
        fw, rw = P(MINI["wheels"][0], MINI["wy"]), P(MINI["wheels"][1], MINI["wy"]); r = MINI["r"] * s_m
        # 1. the engine: sideways, over the driven front wheels, weight pressing down
        e = A("First, the engine", 0.3) * out("Second, the wheels")
        if e:
            x0, y0 = P(230, 330); x1, y1 = P(540, 520)
            d.rounded_rectangle((x0, y0, x1, y1), 14, fill=rgba((230, 120, 40), 0.55 * e), outline=rgba(HOT, e), width=4)
            for k in range(4):                                                                  # four cylinders, end-on
                cx = x0 + (x1 - x0) * (0.18 + 0.21 * k); d.ellipse((cx - 22, (y0 + y1) / 2 - 22, cx + 22, (y0 + y1) / 2 + 22), outline=rgba(HOT, e), width=3)
            tag(d, (max(380, (x0 + x1) / 2), y0 - 200), "ENGINE: SIDEWAYS, AT THE FRONT", e, GOLD, 34)
            g = A("First, the engine", 2.6)
            glow(L, fw, r * 0.9, WARM, 0.55 * g * e)
            tag(d, (fw[0], fw[1] + r + 30), "THESE WHEELS DRIVE", g * e, WARM, 30)
            wa = A("So all its weight") * e
            for k in range(3):
                x = x0 + (x1 - x0) * (0.25 + 0.25 * k); bob = 14 * math.sin(t * 5 + k)
                if wa: d.line([(x, y0 - 130 + bob), (x, y0 - 40 + bob)], fill=rgba(CREAM, wa), width=8)
                if wa: d.polygon([(x - 18, y0 - 60 + bob), (x + 18, y0 - 60 + bob), (x, y0 - 30 + bob)], fill=rgba(CREAM, wa))
            tag(d, (W / 2 + 420, 120), "THE WEIGHT SITS ON THE WHEELS THAT PULL", wa * out("On ice, that's"), CREAM, 38)
            ice = A("On ice, that's") * e
            if ice:
                for k in range(26):                                                             # ice glints on the floor
                    x = (k * 97 + t * 40) % W; y = GY + 14 + (k * 37) % 70
                    d.line([(x - 18, y), (x + 18, y)], fill=rgba((200, 230, 255), ice * (0.4 + 0.4 * math.sin(t * 6 + k))), width=3)
                tag(d, (W / 2 + 420, 120), "ON ICE: GRIP WHERE IT MATTERS", ice, BLUE, 38)
        # 2. wheels pushed out to the corners
        w2 = A("Second, the wheels") * out("Third, it was light")
        if w2:
            for (x, y) in (fw, rw): d.ellipse((x - r - 10, y - r - 10, x + r + 10, y + r + 10), outline=rgba(GOLD, w2), width=7)
            fx0, rx1 = P(MINI["x0"], 0)[0], P(MINI["x1"], 0)[0]
            yb = GY + 40
            bracket(d, fx0, fw[0] - r, yb, A("Tiny ten-inch", 1.4) * w2, "TINY OVERHANG", CREAM)
            bracket(d, rw[0] + r, rx1, yb, A("Tiny ten-inch", 1.6) * w2, "TINY", CREAM)
            tag(d, (fw[0], fw[1] - r - 80), "10-INCH WHEELS", A("Tiny ten-inch") * w2, GOLD, 34)
            tag(d, (rw[0], rw[1] - r - 80), "10-INCH WHEELS", A("Tiny ten-inch", 0.3) * w2, GOLD, 34)
            tag(d, (W / 2, 120), "WHEELS RIGHT OUT IN THE CORNERS", A("Second, the wheels", 0.2) * out("It went round corners"), GOLD, 42)
            tag(d, (W / 2, 120), "LIKE A GO-KART", A("It went round corners") * w2, GOLD, 60)
        # 3. light: the V8 Ford rolls in at its real size, and the weights
        if cmp_ > 0:
            s_f = s_m * ((MINI["x1"] - MINI["x0"]) / MINI["metres"]) / ((FALCON["x1"] - FALCON["x0"]) / FALCON["metres"])   # same scale: real sizes
            gx_f = 960 + (W + 900 - 960) * (1 - cmp_)
            spin = A("The big Fords", 3.4, 0.4)
            jx = 4 * spin * math.sin(t * 60)
            Pf = place(im, FALCON, s_f, gx_f + jx, GY)
            for car, Pc, s_, kg, col, cx in ((MINI, P, s_m, "ABOUT 650 KG", RED, None), (FALCON, Pf, s_f, "ABOUT 1,200 KG", BLUE, None)):
                x0, x1 = Pc(car["x0"], 0)[0], Pc(car["x1"], 0)[0]; mid = (x0 + x1) / 2
                bh = (175 if car is MINI else 320) * A("The big Fords", 0.2, 0.9)
                if bh > 1:
                    d.rectangle((mid - 80, 440 - bh, mid + 80, 440), fill=rgba(col, 0.85 * cmp_))
                    tag(d, (mid, 456), kg, cmp_ * A("The big Fords", 0.6), CREAM, 34)
            tag(d, (W / 2, 50), "NEARLY TWICE THE WEIGHT", A("The big Fords") * cmp_, GOLD, 46)
            tag(d, (W / 2, 50), "THIRD: IT WAS LIGHT", cmp_ * (1 - A("The big Fords")), GOLD, 46)
            g2 = A("The big Fords", 3.6)
            if g2:
                glow(L, fw, r * 0.9, GREEN, 0.5 * g2); tag(d, (fw[0], fw[1] + r + 40), "GRIP", g2, GREEN, 32)
            if spin:
                rx, ry = Pf(FALCON["wheels"][1], FALCON["wy"]); rf = FALCON["r"] * s_f
                for k in range(3):
                    an = t * 14 + k * 2.1
                    d.arc((rx - rf - 16, ry - rf - 16, rx + rf + 16, ry + rf + 16), math.degrees(an), math.degrees(an) + 70, fill=rgba(RED, spin), width=8)
                for k in range(8):
                    sx = rx + rf + 20 + (t * 300 + k * 40) % 160; d.ellipse((sx - 6, GY - 10 - k * 3, sx + 6, GY + 2 - k * 3), fill=rgba((220, 235, 255), 0.6 * spin))
                tag(d, (rx, ry + rf + 40), "WHEELSPIN", spin, RED, 32)
        tag(d, (W / 2, 50), "HOW A MINI BEAT A V8", ramp(t, 0, 0.5) * out("First, the engine", 0.4), GOLD, 48)
        im.alpha_composite(L); return im.convert("RGB")
    return frame

# ---------------------------------------------------------------- section 3: left-foot braking
def boot(d, x, y, a, col=(110, 70, 40)):
    d.rounded_rectangle((x - 46, y - 150, x + 46, y + 10), 30, fill=rgba(col, a), outline=rgba(CREAM, 0.6 * a), width=3)
    d.ellipse((x - 54, y - 30, x + 54, y + 40), fill=rgba(col, a), outline=rgba(CREAM, 0.6 * a), width=3)

def left_foot_scene(cue):
    c = {k: cue(k) for k in ["And the Finns", "Left-foot braking", "Instead of lifting", "It kept the engine"]}
    def frame(t):
        im = base("ai_footwell.png", 0.32, 4); L = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(L)
        A = lambda k, lag=0.0, dur=0.5: ramp(t, c[k] + lag, c[k] + lag + dur)
        a = ramp(t, 0, 0.5)
        go = A("Instead of lifting", 1.0)
        tap = go * max(0.0, math.sin((t - c["Instead of lifting"]) * 3.2)) ** 3            # the left foot dabs the brake
        # pedals panel (right)
        d.rounded_rectangle((1000, 170, 1840, 960), 24, fill=rgba(NAVY_D, 0.88 * a), outline=rgba(GOLD, a), width=3)
        for k, (lab, x) in enumerate((("CLUTCH", 1140), ("BRAKE", 1420), ("THROTTLE", 1700))):
            press = (34 * tap if k == 1 else 34 * go if k == 2 else 0)
            d.line([(x, 260), (x, 690 + press)], fill=rgba((170, 170, 180), a), width=12)
            col = RED if (k == 1 and tap > 0.2) else (GREEN if (k == 2 and go) else (90, 90, 100))
            d.rounded_rectangle((x - 70, 690 + press, x + 70, 740 + press), 10, fill=rgba(col, a), outline=rgba(CREAM, a), width=3)
            tracked(d, (x, 880), lab, cond(34, 8), rgba(CREAM, a), 6, "center")
        lb = A("Left-foot braking", 0.3)
        if lb: boot(d, 1420, 690 + 34 * tap - 4, lb); tag(d, (1420, 210), "LEFT FOOT", lb, RED, 30)
        boot(d, 1700, 690 + 34 * go - 4, a); tag(d, (1700, 210), "RIGHT FOOT", a, GREEN, 30)
        # the car on a bend (left)
        d.rounded_rectangle((80, 170, 920, 960), 24, fill=rgba(NAVY_D, 0.88 * a), outline=rgba(GOLD, a), width=3)
        cx, cy, R = 820, 900, 560
        for rr, col in ((R + 70, (60, 64, 80)), (R - 70, (60, 64, 80))):
            d.arc((cx - rr, cy - rr, cx + rr, cy + rr), 180, 270, fill=rgba(col, a), width=8)
        u = ((t * 0.12) % 1.0) if go else 0.15
        an = math.radians(180 + 90 * u); px, py = cx + R * math.cos(an), cy + R * math.sin(an)
        yaw = math.degrees(an) + 90 + 14 * tap * go                                          # the nose tucks into the bend
        car = Image.new("RGBA", (90, 150), (0, 0, 0, 0)); cd = ImageDraw.Draw(car)
        cd.rounded_rectangle((5, 5, 85, 145), 14, fill=rgba(RED, 1), outline=rgba(CREAM, 1), width=2); cd.rectangle((18, 55, 72, 110), fill=rgba(CREAM, 1))
        car = car.rotate(-yaw, expand=True, resample=Image.BICUBIC)
        if a < 1: car.putalpha(car.getchannel("A").point(lambda v: int(v * a)))
        L.alpha_composite(car, (int(px - car.width / 2), int(py - car.height / 2)))
        if tap > 0.3: arrow_tuck = tag(d, (500, 230), "NOSE TUCKS IN", tap, GOLD, 30)
        tag(d, (W / 2, 50), "THE FINNS' TRICK", a * (1 - A("Left-foot braking")), GOLD, 48)
        tag(d, (W / 2, 50), "LEFT-FOOT BRAKING", A("Left-foot braking"), GOLD, 48)
        tag(d, (1420, 1000), "POWER STAYS ON  ·  LEFT FOOT DABS THE BRAKE", go * (1 - A("It kept the engine")), CREAM, 30)
        tag(d, (1420, 1000), "THE ENGINE KEEPS PULLING", A("It kept the engine"), GREEN, 30)
        im.alpha_composite(L); return im.convert("RGB")
    return frame
