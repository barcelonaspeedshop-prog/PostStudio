"""explainers: the "how it works" drawings for Gentlemen of Fuel: the Chrysler Turbine Car.

    turbine_scene(cue)   section 3: air in, compressor, the flame, turbine one (drives the compressor), turbine two
                         (drives the wheels), the regenerator discs, 80% fewer moving parts, no radiator / antifreeze / warm-up
cue(snippet) -> local seconds of a narration line. Drawn over the real engine (dimmed); everything moves by sub-pixel
amounts; labels are boxed and centred. The engine runs left to right, as the gas flows.
"""
import math
import numpy as np
from PIL import Image, ImageDraw
from storykit import W, H, GOLD, CREAM, RED, NAVY_D, ramp, ease, rgba, tracked, cond, pf, load

STORY = "/Volumes/PostDrive/Stories/Gentlemen of Fuel/01 Chrysler Turbine/media/"
BLUE, HOT, STEEL = (110, 170, 255), (255, 150, 50), (150, 158, 172)
BRONZE = (196, 120, 70)

def tag(d, xy, text, a, colour=GOLD, size=40):
    if a <= 0: return
    x, y = xy; f = cond(size, 8); tw = sum(f.getlength(ch) for ch in text) + 6 * (len(text) - 1)
    bb = f.getbbox("H"); cap = bb[3] - bb[1]; pad = max(10, size * 0.32)
    d.rounded_rectangle((x - tw / 2 - 22, y - pad, x + tw / 2 + 22, y + cap + pad), 10, fill=rgba(NAVY_D, 0.86 * a), outline=rgba(colour, a), width=3)
    tracked(d, (x, y), text, f, rgba(colour, a), 6, "center")

_bg = {}
def still(path, dark=0.0):
    k = (path, dark)
    if k not in _bg:
        im = load(STORY + path)
        k_ = max(W / im.width, H / im.height); im = im.resize((int(im.width * k_ + 0.5), int(im.height * k_ + 0.5)), Image.LANCZOS)
        bx, by = (im.width - W) // 2, (im.height - H) // 2; im = im.crop((bx, by, bx + W, by + H))
        if dark: im = Image.blend(im, Image.new("RGB", (W, H), NAVY_D), dark)
        _bg[k] = im.convert("RGBA")
    return _bg[k]

def camera(im, z, fx, fy):
    vw, vh = W / z, H / z; x0 = min(max(fx * W - vw / 2, 0), W - vw); y0 = min(max(fy * H - vh / 2, 0), H - vh)
    return im.transform((W, H), Image.EXTENT, (x0, y0, x0 + vw, y0 + vh), Image.BICUBIC)

def arrow(d, p0, p1, a, col=GOLD, w=7, head=24):
    if a <= 0: return
    d.line([p0, p1], fill=rgba(col, a), width=w); an = math.atan2(p1[1] - p0[1], p1[0] - p0[0])
    d.polygon([p1, (p1[0] - head * math.cos(an - 0.45), p1[1] - head * math.sin(an - 0.45)),
               (p1[0] - head * math.cos(an + 0.45), p1[1] - head * math.sin(an + 0.45))], fill=rgba(col, a))

def mix(c0, c1, k): k = max(0, min(1, k)); return tuple(int(a + (b - a) * k) for a, b in zip(c0, c1))

def rotor(d, cx, cy, rx, ry, ang, a, col, glow=0.0, blades=12):
    """A spinning bladed wheel seen at an angle: an ellipse with blades sweeping round (sub-pixel; no stepping)."""
    if a <= 0: return
    d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=rgba(mix(NAVY_D, HOT, glow), 0.75 * a), outline=rgba(col, a), width=5)
    for k in range(blades):
        th = ang + k * 2 * math.pi / blades
        x, y = cx + rx * 0.92 * math.cos(th), cy + ry * 0.92 * math.sin(th)
        front = 0.45 + 0.55 * (0.5 + 0.5 * math.sin(th))                     # blades nearer the viewer brighter
        d.line([(cx, cy), (x, y)], fill=rgba(col, a * front), width=4)
    d.ellipse((cx - 12, cy - 12, cx + 12, cy + 12), fill=rgba(col, a))

def flame(d, cx, cy, t, a):
    if a <= 0: return
    for k in range(7, 0, -1):                                                 # a blowtorch cone, flickering
        L_ = 40 + 26 * k + 8 * math.sin(t * 13 + k); h = 8 + 7 * k
        col = mix((255, 240, 180), RED, k / 7)
        d.polygon([(cx - 70, cy - h), (cx - 70 + L_, cy), (cx - 70, cy + h)], fill=rgba(col, a * (0.25 + 0.08 * (8 - k))))

# the engine, left to right (screen pixels): duct centre line, and each part's x
Y0 = 400; DUCT = 135
X_IN, X_COMP, X_BURN, X_T1, X_T2, X_OUT = 170, 420, 730, 1020, 1280, 1600
GBX, WY, WR = 1280, 790, 150                                                   # gearbox x, wheel centre y and radius
_wheel = {}
def wheel(r):
    """The real car's rear wheel (from the side-on still), cut out round, r pixels radius."""
    if r not in _wheel:
        im = load(STORY + "ai/ai_turbine_side.png").convert("RGBA"); cx, cy, R = 1228, 570, 116
        c = im.crop((cx - R, cy - R, cx + R, cy + R)).resize((2 * r, 2 * r), Image.LANCZOS)
        m = Image.new("L", c.size, 0); ImageDraw.Draw(m).ellipse((2, 2, 2 * r - 2, 2 * r - 2), fill=255); c.putalpha(m)
        _wheel[r] = c
    return _wheel[r]

def turbine_scene(cue):
    keys = ["So how do you drive", "First, air comes in", "Then fuel is sprayed", "The hot gas rushes out", "That first turbine",
            "Then the gas hits", "It's connected to the wheels", "So the faster the gas", "And there was one more trick",
            "So Chrysler fitted", "The result was an engine", "No radiator."]
    c = {k: cue(k) for k in keys}
    caps = [("First, air comes in", "AIR IN  ·  THE COMPRESSOR SQUEEZES IT", BLUE), ("Then fuel is sprayed", "FUEL BURNS IN ONE CONSTANT FLAME", HOT),
            ("That first turbine", "TURBINE 1 ONLY DRIVES THE COMPRESSOR", GOLD), ("Then the gas hits", "TURBINE 2 IS NOT CONNECTED TO TURBINE 1", RED),
            ("It's connected to the wheels", "TURBINE 2 DRIVES THE WHEELS", CREAM), ("So the faster the gas", "MORE GAS FLOW  =  MORE PUSH ON THE WHEELS", GOLD)]
    def frame(t):
        A = lambda k, lag=0.0, du=0.5: ramp(t, c[k] + lag, c[k] + lag + du)
        out = lambda k, lag=0.0: 1 - ramp(t, c[k] + lag - 0.4, c[k] + lag)
        regen = A("And there was one more trick", 1.0, 0.8)                   # the regenerator close-up
        parts = A("The result was an engine", 0.0, 0.6)                       # the moving-parts count
        engine = (1 - regen) if t < c["The result was an engine"] else 0
        # background: the real turbine under the bonnet, dimmed, slowly pushing in
        bg = camera(still("commons/Stahls_Automotive_Collection_December_2021_150_(1963_Chrysler_Turbine_engine).jpg", 0.82),
                    1.0 + 0.08 * min(1, t / 40), 0.5, 0.45)
        L = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(L)
        tag(d, (W / 2, 70), "HOW A TURBINE DRIVES A CAR", ramp(t, 0.2, 0.7) * out("First, air comes in", 0.6), GOLD, 46)
        if engine > 0:
            e = engine
            show = lambda k, lag=0.0: A(k, lag) * e
            comp_a, burn_a = show("First, air comes in", 0.3), show("Then fuel is sprayed")
            t1_a, t2_a = show("The hot gas rushes out", 0.4), show("Then the gas hits", 0.4)
            reach = X_IN + (X_OUT - X_IN) * ease(A("So how do you drive", 0.3, 2.2))   # the duct draws itself
            d.rounded_rectangle((X_IN, Y0 - DUCT, reach, Y0 + DUCT), 50, fill=rgba(NAVY_D, 0.45 * e), outline=rgba(STEEL, 0.9 * e), width=6)
            spd = 1.0 + 1.6 * A("So the faster the gas", 0.2, 1.5)
            for k in range(60):                                               # the gas: blue air, hot after the flame
                ph = (t * 0.16 * spd + k / 60) % 1.0; x = X_IN + 20 + (X_OUT - X_IN - 40) * ph
                if x > reach: continue
                y = Y0 + (DUCT - 28) * math.sin(k * 2.39) * (0.8 if x < X_COMP else 0.45 if x < X_BURN else 0.8)
                col = mix(BLUE, HOT, burn_a * ramp(x, X_BURN - 40, X_BURN + 140))
                r = 7 if x < X_COMP else 6
                d.ellipse((x - r, y - r, x + r, y + r), fill=rgba(col, comp_a * min(1, (x - X_IN) / 40)))
            arrow(d, (X_IN - 150, Y0), (X_IN + 10, Y0), show("First, air comes in"), BLUE, 10, 32)
            name = lambda x, txt, a, col: tag(d, (x, Y0 - DUCT - 60), txt, a, col, 32)
            name(X_IN - 40, "AIR IN", show("First, air comes in", 0.1), BLUE)
            ang = t * 7 * spd
            rotor(d, X_COMP, Y0, 44, DUCT - 12, ang, comp_a, CREAM)
            name(X_COMP, "COMPRESSOR", comp_a, CREAM)
            if burn_a:                                                        # the burner
                d.rounded_rectangle((X_BURN - 140, Y0 - 85, X_BURN + 170, Y0 + 85), 34, outline=rgba(HOT, burn_a), width=5)
                fa = show("Then fuel is sprayed", 0.3)
                arrow(d, (X_BURN - 90, Y0 - DUCT - 10), (X_BURN - 90, Y0 - 92), fa, GOLD, 8, 24)
                tracked(d, (X_BURN - 160, Y0 - DUCT - 4), "FUEL", cond(30, 8), rgba(GOLD, fa), 6, "center")
                flame(d, X_BURN + 10, Y0, t, show("Then fuel is sprayed", 0.8))
                name(X_BURN + 60, "THE FLAME", show("Then fuel is sprayed", 1.0), HOT)
            if t1_a:                                                          # turbine one, its shaft back to the compressor
                rotor(d, X_T1, Y0, 40, DUCT - 12, ang * 1.05, t1_a, GOLD, glow=0.4)
                name(X_T1, "TURBINE 1", t1_a, GOLD)
                sh = show("That first turbine", 0.2); ys = Y0 + DUCT + 45
                xb = X_T1 - (X_T1 - X_COMP) * ease(A("That first turbine", 0.2, 1.2))
                if sh:
                    d.line([(X_T1, ys), (xb, ys)], fill=rgba(GOLD, sh), width=10)
                    d.line([(X_T1, Y0 + 20), (X_T1, ys)], fill=rgba(GOLD, sh), width=7)
                    if xb <= X_COMP + 5: d.line([(X_COMP, Y0 + 20), (X_COMP, ys)], fill=rgba(GOLD, sh), width=7)
                    span = max(1, X_T1 - xb)
                    for k in range(7):                                         # the shaft turning: moving ticks
                        xx = xb + ((t * 120 * spd + k * 90) % span)
                        d.line([(xx, ys - 9), (xx, ys + 9)], fill=rgba(NAVY_D, sh), width=4)
            if t2_a:                                                          # turbine two: free, to the gearbox and the wheel
                rotor(d, X_T2, Y0, 40, DUCT - 12, ang * 1.1, t2_a, CREAM, glow=0.3)
                name(X_T2, "TURBINE 2", t2_a, CREAM)
                gap = show("Then the gas hits", 1.6) * out("It's connected to the wheels", 1.0)
                if gap:                                                       # the break between the two
                    gx = (X_T1 + X_T2) / 2
                    for k in range(5): d.line([(gx - 18 + 9 * k, Y0 + DUCT + 20), (gx - 18 + 9 * k + 10, Y0 + DUCT + 60)], fill=rgba(RED, gap), width=5)
                w_a = show("It's connected to the wheels")
                if w_a:
                    gy = WY - 45
                    d.line([(X_T2, Y0 + DUCT - 4), (GBX, gy - 45)], fill=rgba(CREAM, w_a), width=9)
                    d.rounded_rectangle((GBX - 85, gy - 45, GBX + 85, gy + 45), 14, fill=rgba(NAVY_D, 0.92 * w_a), outline=rgba(CREAM, w_a), width=4)
                    tracked(d, (GBX, gy - 14), "GEARBOX", cond(28, 8), rgba(CREAM, w_a), 4, "center")
                    wx = 1700
                    d.line([(GBX + 85, gy), (wx - WR, gy)], fill=rgba(CREAM, w_a), width=9)
                    wi = wheel(WR).rotate(math.degrees(t * 1.6 * spd ** 1.6), Image.BICUBIC)   # anticlockwise: the car faces left
                    if w_a < 1: wi = Image.fromarray((np.asarray(wi) * np.array([1, 1, 1, w_a])).astype(np.uint8))
                    L.alpha_composite(wi, (int(wx - WR), int(gy - WR)))
            arrow(d, (X_OUT - 10, Y0), (X_OUT + 170, Y0), show("The hot gas rushes out", 0.6), HOT, 10, 32)
            name(X_OUT + 120, "HOT EXHAUST", show("And there was one more trick"), RED)
            for i, (k, txt, col) in enumerate(caps):                         # one caption at a time, along the bottom
                nxt = caps[i + 1][0] if i + 1 < len(caps) else "And there was one more trick"
                tag(d, (W / 2 - 150, 1000), txt, A(k, 0.2) * out(nxt, 0.2) * e, col, 40)
        if regen and t < c["The result was an engine"]:
            r_a = regen * out("The result was an engine")
            ph = camera(still("commons/CHRYSLER_TURBINE_REGENERATOR_IN_THE_SPECIAL_PROJECTS_LABORATORY_SPL_-_NARA_-_17423522.jpg", 0.68),
                        1.05 + 0.1 * ramp(t, c["And there was one more trick"], c["The result was an engine"]), 0.42, 0.45)
            bg = Image.blend(bg, ph, r_a)
            L = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(L)
            # the disc: one half in the exhaust (hot), one half in the incoming air (cold); heat is carried round
            cx, cy, R = 1380, 520, 300
            spin = t * 0.9
            d.ellipse((cx - R, cy - R, cx + R, cy + R), fill=rgba(NAVY_D, 0.55 * r_a), outline=rgba(STEEL, r_a), width=6)
            for k in range(36):                                                # the disc's honeycomb sectors
                th0 = spin + k * 2 * math.pi / 36
                # heat: picked up on the right (exhaust) half, given up on the left (air) half
                heat = max(0.0, min(1.0, 0.5 + 0.7 * math.cos(th0 - 0.9)))
                col = mix(BLUE, HOT, heat)
                p = [(cx, cy)] + [(cx + R * 0.94 * math.cos(th0 + j * 0.16), cy + R * 0.94 * math.sin(th0 + j * 0.16)) for j in range(2)]
                d.polygon(p, fill=rgba(col, 0.75 * r_a * A("So Chrysler fitted", 0.4, 0.8)))
            d.line([(cx, cy - R - 20), (cx, cy + R + 20)], fill=rgba(CREAM, 0.8 * r_a), width=5)
            d.ellipse((cx - 30, cy - 30, cx + 30, cy + 30), fill=rgba(STEEL, r_a))
            for k in range(4):                                                 # hot exhaust in through the right half
                y = cy - 200 + k * 130; q = (t * 0.8 + k * 0.25) % 1.0
                arrow(d, (cx + R + 220 - 80 * q, y), (cx + R + 40 - 80 * q, y), r_a * A("And there was one more trick", 1.4), RED, 8, 26)
                arrow(d, (cx - R - 40 + 80 * q, y), (cx - R - 220 + 80 * q, y), r_a * A("So Chrysler fitted", 1.8), HOT, 8, 26)
            tag(d, (cx + R - 40, cy - R - 70), "HOT EXHAUST HEATS THE DISC", r_a * A("And there was one more trick", 1.4), RED, 32)
            tag(d, (cx - R + 40, cy + R + 50), "THE DISC HEATS THE INCOMING AIR", r_a * A("So Chrysler fitted", 1.8), HOT, 32)
            tag(d, (520, 120), "THE REGENERATOR", r_a * A("So Chrysler fitted", 0.2), GOLD, 50)
            tag(d, (520, 200), "TWO SPINNING DISCS", r_a * A("So Chrysler fitted", 0.8), CREAM, 34)
            tag(d, (520, H - 110), "LESS HEAT WASTED  ·  LESS FUEL", r_a * A("So Chrysler fitted", 3.4), GOLD, 38)
        if parts:
            # 80% fewer moving parts: two piles of parts, one stops at a fifth
            bg = Image.blend(bg, still("commons/Stahls_Automotive_Collection_December_2021_150_(1963_Chrysler_Turbine_engine).jpg", 0.88), parts)
            L = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(L)
            fill = ease(min(1, max(0, t - c["The result was an engine"] - 0.4) / 2.6))
            cols = [("A NORMAL V8", 300, CREAM, 520), ("THE TURBINE", 60, GOLD, 1400)]
            for name, total, col, x0 in cols:
                n = int(total * fill)
                for i in range(n):
                    cx_, cy_ = x0 - 285 + (i % 20) * 30, 860 - (i // 20) * 30
                    d.ellipse((cx_ - 10, cy_ - 10, cx_ + 10, cy_ + 10), outline=rgba(col, parts), width=4)
                    d.ellipse((cx_ - 3, cy_ - 3, cx_ + 3, cy_ + 3), fill=rgba(col, parts))
                tag(d, (x0, 940), name, parts, col, 40)
            tag(d, (W / 2, 80), "MOVING PARTS", parts, GOLD, 50)
            tag(d, (1400, 650), "ABOUT 80% FEWER", A("The result was an engine", 2.6), GOLD, 46)
            no = [("NO RADIATOR", 0.0), ("NO ANTIFREEZE", 0.9), ("NO WARM-UP", 1.8)]
            for i, (txt, lag) in enumerate(no):
                k = A("No radiator.", lag, 0.3)
                if k <= 0: continue
                x, y = W / 2, 250 + i * 100
                tag(d, (x, y), txt, k, RED, 44)
                if k > 0.6:
                    w_ = cond(44, 8).getlength(txt) / 2 + 30
                    d.line([(x - w_, y + 18), (x + w_, y + 18)], fill=rgba(RED, ramp(t, c["No radiator."] + lag + 0.3, c["No radiator."] + lag + 0.5)), width=5)
        bg.alpha_composite(L); return bg.convert("RGB")
    return frame

if __name__ == "__main__":                                                   # preview frames with a guessed schedule
    import sys
    sched = dict(zip(["So how do you drive", "First, air comes in", "Then fuel is sprayed", "The hot gas rushes out", "That first turbine",
                      "Then the gas hits", "It's connected to the wheels", "So the faster the gas", "And there was one more trick",
                      "So Chrysler fitted", "The result was an engine", "No radiator."],
                     [0, 3, 7.5, 13, 15.5, 20, 25, 27, 31, 36, 46, 51]))
    fr = turbine_scene(lambda k: sched[k])
    for s in [float(a) for a in sys.argv[2:]]:
        fr(s).save(f"{sys.argv[1]}/turbine_{s:05.1f}.jpg", quality=85)
