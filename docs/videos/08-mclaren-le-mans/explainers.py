"""explainers: the "how it works" drawings for IMPOSSIBLE: McLaren Le Mans (v2), over Mike's ChatGPT stills.

    f1_build_scene(cue)   section 3: the centre seat (top view), the carbon tub, the V12, the gold, 240 mph (side view)
    aqua_scene(cue)       section 6: a tyre in standing water, the wedge, aquaplaning, and why weight helps
cue(snippet) -> local seconds of a narration line. Everything moves by sub-pixel transforms; labels are boxed and centred.
Positions are fractions of the stills (measured on them): side view front wheel (0.235, 0.62), rear (0.845, 0.62),
cabin x 0.33..0.60, engine bay x 0.60..0.80; top view (nose left) driver seat (0.515, 0.46), passengers (0.615, 0.35/0.565).
"""
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
from storykit import W, H, GOLD, CREAM, RED, NAVY_D, ramp, ease, rgba, tracked, cond, pf, load

AI = "/Volumes/PostDrive/Stories/IMPOSSIBLE series/03 McLaren Le Mans/media/ai/"
BLUE, HOT, CARBON = (110, 170, 255), (255, 170, 60), (60, 64, 72)

def tag(d, xy, text, a, colour=GOLD, size=40):
    if a <= 0: return
    x, y = xy; f = cond(size, 8); tw = sum(f.getlength(ch) for ch in text) + 6 * (len(text) - 1)
    bb = f.getbbox("H"); cap = bb[3] - bb[1]; pad = max(10, size * 0.32)
    d.rounded_rectangle((x - tw / 2 - 22, y - pad, x + tw / 2 + 22, y + cap + pad), 10, fill=rgba(NAVY_D, 0.86 * a), outline=rgba(colour, a), width=3)
    tracked(d, (x, y), text, f, rgba(colour, a), 6, "center")

_bg = {}
def still(name, dark=0.0):
    k = (name, dark)
    if k not in _bg:
        im = load(AI + name).resize((W, H), Image.LANCZOS)
        if dark: im = Image.blend(im, Image.new("RGB", (W, H), NAVY_D), dark)
        _bg[k] = im.convert("RGBA")
    return _bg[k]

def camera(im, z, fx, fy):
    """Sub-pixel zoom on (fx, fy) (fractions); returns the view and a mapper from still fractions to screen pixels."""
    vw, vh = W / z, H / z; x0 = min(max(fx * W - vw / 2, 0), W - vw); y0 = min(max(fy * H - vh / 2, 0), H - vh)
    out = im.transform((W, H), Image.EXTENT, (x0, y0, x0 + vw, y0 + vh), Image.BICUBIC)
    return out, (lambda px, py: ((px * W - x0) * z, (py * H - y0) * z))

def ring(d, c, r, a, col=GOLD, w=6):
    if a > 0: d.ellipse((c[0] - r, c[1] - r, c[0] + r, c[1] + r), outline=rgba(col, a), width=w)

def arrow(d, p0, p1, a, col=GOLD, w=7, head=24):
    if a <= 0: return
    d.line([p0, p1], fill=rgba(col, a), width=w); an = math.atan2(p1[1] - p0[1], p1[0] - p0[0])
    d.polygon([p1, (p1[0] - head * math.cos(an - 0.45), p1[1] - head * math.sin(an - 0.45)),
               (p1[0] - head * math.cos(an + 0.45), p1[1] - head * math.sin(an + 0.45))], fill=rgba(col, a))

# ---------------------------------------------------------------- section 3: how the F1 was built
def f1_build_scene(cue):
    c = {k: cue(k) for k in ["So what made", "First, the seat", "A passenger sat", "You got a perfect view", "Second, the body",
                             "Very strong", "The whole car weighed", "Third, the engine", "And then there was the famous gold",
                             "Gold is one of the best", "In 1998, a McLaren F1", "For seven years"]}
    def frame(t):
        A = lambda k, lag=0.0, du=0.5: ramp(t, c[k] + lag, c[k] + lag + du)
        out = lambda k, lag=0.0: 1 - ramp(t, c[k] + lag - 0.4, c[k] + lag)
        top = A("First, the seat", -0.2, 0.6) * out("Second, the body")
        # the side view, slowly pushing in; the camera follows what's being explained
        if t < c["Second, the body"]: z, fx, fy = 1.0 + 0.05 * min(1, t / 4), 0.5, 0.5
        elif t < c["Third, the engine"]: z, fx, fy = 1.25, 0.47, 0.5
        elif t < c["In 1998, a McLaren F1"]: z, fx, fy = 1.35 + 0.05 * ramp(t, c["Third, the engine"], c["In 1998, a McLaren F1"]), 0.68, 0.45
        else: z, fx, fy = 1.0, 0.5, 0.5
        side, Ps = camera(still("ai_f1_side.png"), z, fx, fy)
        im = side
        L = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(L)
        if top > 0:                                                                     # the cabin from above
            tv, Pt = camera(still("ai_f1_top.png"), 1.0 + 0.6 * ease(A("First, the seat", 0.3, 1.5)), 0.52, 0.47)
            im = Image.blend(side, tv, top)
            dr = Pt(0.515, 0.46); r = 115 * (1 + 0.6 * ease(A("First, the seat", 0.3, 1.5)))
            ring(d, dr, r, top * A("First, the seat", 1.0), GOLD, 8)
            tag(d, (dr[0], dr[1] - r - 60), "DRIVER: IN THE MIDDLE", top * A("First, the seat", 1.2), GOLD, 40)
            pa = top * A("A passenger sat")
            for py in (0.35, 0.565):
                pc = Pt(0.615, py); ring(d, pc, r * 0.8, pa, CREAM, 6)
            if pa:
                pb = Pt(0.615, 0.565); tag(d, (min(W - 380, pb[0]), min(H - 150, pb[1] + r * 0.8 + 50)), "PASSENGERS: EITHER SIDE, BEHIND", pa, CREAM, 32)
            bal = top * A("You got a perfect view", 1.6)
            if bal:
                x = dr[0]; d.line([(x, 40), (x, H - 40)], fill=rgba(GOLD, 0.8 * bal), width=4)
                tag(d, (W / 2, H - 90), "WEIGHT BALANCED AROUND THE DRIVER", bal, GOLD, 38)
        body = A("Second, the body") * out("Third, the engine")
        if body:                                                                        # the carbon tub
            x0, y0 = Ps(0.33, 0.33); x1, y1 = Ps(0.62, 0.68)
            g = Image.new("RGBA", (W, H), (0, 0, 0, 0)); gd = ImageDraw.Draw(g)
            gd.rounded_rectangle((x0, y0, x1, y1), 30, fill=rgba(CARBON, 0.72 * body), outline=rgba(GOLD, body), width=5)
            for k in range(-30, 60):                                                    # carbon weave hatching
                xx = x0 + k * 22; gd.line([(xx, y0), (xx + (y1 - y0), y1)], fill=rgba((90, 96, 108), 0.6 * body), width=3)
                gd.line([(xx + (y1 - y0), y0), (xx, y1)], fill=rgba((40, 44, 52), 0.5 * body), width=3)
            m = Image.new("L", (W, H), 0); ImageDraw.Draw(m).rounded_rectangle((x0, y0, x1, y1), 30, fill=255)
            L.paste(g, (0, 0), m)
            d = ImageDraw.Draw(L)
            tag(d, ((x0 + x1) / 2, y0 - 60), "CARBON FIBRE TUB", A("Second, the body", 0.8) * body, GOLD, 40)
            tag(d, ((x0 + x1) / 2, y1 + 40), "THE FIRST ROAD CAR BUILT LIKE AN F1 CAR", A("Second, the body", 2.4) * body, CREAM, 30)
            kg = A("The whole car weighed") * body
            if kg:
                n = int(1100 * ease(min(1, (t - c["The whole car weighed"]) / 1.4)))
                tag(d, (W - 360, 120), f"ABOUT {n:,} KG", kg, GOLD, 56)
            tag(d, (360, 120), "VERY STRONG  ·  VERY LIGHT", A("Very strong") * body * out("The whole car weighed", 1.0), CREAM, 36)
        eng = A("Third, the engine") * out("In 1998, a McLaren F1")
        if eng:                                                                         # the V12, then the gold
            x0, y0 = Ps(0.60, 0.36); x1, y1 = Ps(0.80, 0.52)
            gold = A("And then there was the famous gold", 0.3, 1.0)
            d.rounded_rectangle((x0, y0, x1, y1), 18, fill=rgba(HOT if not gold else GOLD, (0.35 + 0.25 * gold) * eng), outline=rgba(GOLD, eng), width=5)
            for side_ in (0, 1):                                                       # twelve cylinders, two banks
                for k in range(6):
                    cx = x0 + (x1 - x0) * (0.12 + 0.15 * k); cy = y0 + (y1 - y0) * (0.32 + 0.38 * side_)
                    d.ellipse((cx - 16, cy - 16, cx + 16, cy + 16), outline=rgba(CREAM, eng), width=3)
            tag(d, ((x0 + x1) / 2, y0 - 70), "BMW V12  ·  6 LITRES  ·  600+ HP", A("Third, the engine", 0.6) * eng * (1 - gold), GOLD, 36)
            tag(d, ((x0 + x1) / 2, y0 - 70), "REAL GOLD FOIL", gold * eng, GOLD, 44)
            heat = A("Gold is one of the best", 0.4) * eng
            if heat:                                                                    # heat rises off the V12, bounces off the gold
                for k in range(5):
                    xx = x0 + (x1 - x0) * (0.12 + 0.19 * k); ph = (t * 1.6 + k * 0.3) % 1.0
                    ya = y1 - (y1 - y0) * ph
                    pts = [(xx + 10 * math.sin(ya / 9 + j), ya - j * 8) for j in range(6)]
                    d.line(pts, fill=rgba(RED, heat * (1 - ph)), width=4)
                    arrow(d, (xx, y0 + 10), (xx + 30, y0 + 60), heat * ph, GOLD, 4, 14)
                tag(d, (W / 2, H - 90), "GOLD REFLECTS THE HEAT", heat, GOLD, 40)
        spd = A("In 1998, a McLaren F1")
        if spd:                                                                         # 240 mph
            n = int(240 * ease(min(1, (t - c["In 1998, a McLaren F1"]) / 2.2)))
            for k in range(14):
                y = 200 + k * 55; x = W - ((t * 1400 + k * 260) % (W + 400))
                d.line([(x, y), (x + 260, y)], fill=rgba(CREAM, 0.25 * spd), width=3)
            d.rounded_rectangle((W / 2 - 330, 70, W / 2 + 330, 290), 26, fill=rgba(NAVY_D, 0.9 * spd), outline=rgba(GOLD, spd), width=4)
            f = pf(130, 900); txt = f"{n} mph"; d.text((W / 2 - f.getlength(txt) / 2, 92 - f.getbbox("H")[1] + 20), txt, font=f, fill=rgba(GOLD if n >= 240 else CREAM, spd))
            tag(d, (W / 2, 330), "1998  ·  FASTEST PRODUCTION CAR", A("In 1998, a McLaren F1", 2.0), CREAM, 34)
            tag(d, (W / 2, H - 90), "NOTHING FASTER FOR 7 YEARS", A("For seven years"), GOLD, 44)
        tag(d, (W / 2, 70), "WHAT MADE THE F1 DIFFERENT?", ramp(t, 0.2, 0.7) * out("First, the seat", 0.3), GOLD, 46)
        im = im.convert("RGBA"); im.alpha_composite(L); return im.convert("RGB")
    return frame

# ---------------------------------------------------------------- section 6: aquaplaning
def aqua_scene(cue):
    """Drawn on the real tyre in ai_tyre_water.png: tyre centre (0.44, 0.47), radius about 0.40 of the height, road at 0.87."""
    c = {k: cue(k) for k in ["When a tyre hits", "The grooves in the tyre", "But go fast enough", "It builds up in a wedge",
                             "That's aquaplaning", "The more weight pressing"]}
    def frame(t):
        A = lambda k, lag=0.0, du=0.5: ramp(t, c[k] + lag, c[k] + lag + du)
        bg, P = camera(still("ai_tyre_water.png", 0.25), 1.0 + 0.06 * min(1, t / 25), 0.42, 0.55)
        L = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(L)
        cx, _ = P(0.44, 0.47); _, gy = P(0.44, 0.87); r = (P(0.44, 0.87)[1] - P(0.44, 0.47)[1])
        film = A("When a tyre hits", 0.2, 0.8)
        press = A("The more weight pressing", 0.6, 1.4)
        wedge = (40 + 330 * A("But go fast enough", 0.3, 2.5)) * (1 - 0.75 * press)
        under = 26 * A("It builds up in a wedge", 1.4, 1.0) * (1 - press)                 # water forced under the tyre
        d.rectangle((0, gy - 14, W, gy + 18), fill=rgba(BLUE, 0.55 * film))
        x0 = cx - r * 0.45
        d.polygon([(x0, gy - 2), (x0 - wedge * 1.7, gy + 6), (x0 - wedge * 0.25, gy - wedge * 0.6)], fill=rgba(BLUE, 0.8 * film))
        if under > 1:
            d.rounded_rectangle((cx - r * 0.5, gy - under, cx + r * 0.3, gy + 4), 10, fill=rgba(BLUE, 0.85))
            for k in range(3):
                x = cx - r * 0.3 + k * r * 0.25; arrow(d, (x, gy - under - 10), (x, gy - under - 90), A("It builds up in a wedge", 1.6), RED, 8, 26)
        g = A("The grooves in the tyre") * (1 - A("But go fast enough"))
        if g:                                                                            # squeezed out through the grooves
            for k in range(6):
                ph = (t * 1.3 + k / 6) % 1.0; y = gy - 30 - 10 * k
                arrow(d, (cx - r * 0.1, y), (cx - r * 0.1 - 120 - 380 * ph, y - 140 * ph), g * (1 - ph), BLUE, 6, 20)
                arrow(d, (cx + r * 0.1, y), (cx + r * 0.1 + 120 + 380 * ph, y - 140 * ph), g * (1 - ph), BLUE, 6, 20)
        arrow(d, (520, 120), (160, 120), ramp(t, 0.2, 0.6), CREAM, 6, 24)
        tracked(d, (340, 60), "DIRECTION OF TRAVEL", cond(30, 8), rgba(CREAM, ramp(t, 0.2, 0.6)), 5, "center")
        Y = H - 110
        tag(d, (W / 2, Y), "STANDING WATER", A("When a tyre hits") * (1 - A("The grooves in the tyre")), BLUE, 44)
        tag(d, (W / 2, Y), "THE GROOVES SQUEEZE THE WATER OUT", A("The grooves in the tyre") * (1 - A("But go fast enough")), BLUE, 40)
        tag(d, (W / 2, Y), "TOO FAST: THE WATER CAN'T ESCAPE", A("But go fast enough") * (1 - A("It builds up in a wedge")), CREAM, 40)
        tag(d, (W / 2, Y), "A WEDGE OF WATER  ·  THE TYRE RIDES UP", A("It builds up in a wedge") * (1 - A("That's aquaplaning")), BLUE, 40)
        aq = A("That's aquaplaning") * (1 - A("The more weight pressing"))
        tag(d, (W / 2, Y), "AQUAPLANING  ·  NO GRIP AT ALL", aq, RED, 52)
        if press:
            for k in range(3):
                x = cx - r * 0.4 + k * r * 0.4; bob = 10 * math.sin(t * 5 + k)
                arrow(d, (x, 60 + bob), (x, 230 + bob), press, GOLD, 12, 38)
            tag(d, (W / 2, Y), "MORE WEIGHT: IT SQUEEZES THROUGH", press, GOLD, 44)
        bg.alpha_composite(L); return bg.convert("RGB")
    return frame
