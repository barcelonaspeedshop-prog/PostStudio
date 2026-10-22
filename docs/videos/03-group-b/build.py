"""BANNED 03: Group B -> PostDrive/Stories/BANNED series/03 Group B/video/BANNED 03 - Group B.mp4

    ~/.venvs/poststudio/bin/python build.py            # full render (+ review 720p)
    ~/.venvs/poststudio/bin/python build.py 95 125     # preview slice (video seconds)
"""
import math, os, sys
VDIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(VDIR, "..", "..", "..", "studio"))
import episode as E
E.init("/Volumes/PostDrive/Gentlemen of Fuel/Videos/Group B (BANNED)/")
from episode import *

FINAL = "BANNED 03 - Group B.mp4"
BLUE = (90, 150, 230)

# ---------------------------------------------------------------- the rules
def car_icon(d, x, y, a, col):
    """A tiny side-on hatchback, 34 x 18."""
    d.polygon([(x, y + 12), (x + 4, y + 6), (x + 11, y + 5), (x + 16, y), (x + 26, y), (x + 31, y + 6), (x + 34, y + 8), (x + 34, y + 13), (x, y + 13)], fill=rgba(col, a))
    for wx in (x + 8, x + 27): d.ellipse((wx - 4, y + 10, wx + 4, y + 18), fill=rgba(NAVY_D, a), outline=rgba(col, a), width=2)

def rules(d, L, t, sc):
    tracked(d, (W / 2, 120), "WORLD RALLY  ·  1982", cond(34, 2), rgba(GOLD, ramp(t, 0, 0.5)), 8, "center")
    t_simple, t_build = at("The regulations were", sc), at("Build two hundred road cars", sc)
    # 1. the rulebook: a cover, then a page that is almost empty ("almost too simple")
    book = ramp(t, 0.2, 0.7) * (1 - ramp(t, t_build - 0.2, t_build + 0.3))
    if book > 0:
        x0, y0, x1, y1 = 700, 200, 1220, 900
        d.rounded_rectangle((x0, y0, x1, y1), 16, fill=rgba(CREAM, book), outline=rgba(GOLD, book), width=4)
        opened = ramp(t, t_simple, t_simple + 0.4)
        ink = (40, 34, 30)
        if opened < 1:
            c = book * (1 - opened)
            tracked(d, (960, 330), "FIA", cond(40, 8), rgba(ink, c), 10, "center")
            text_top(d, (960, 420), "Group B", pf(96, 900), rgba(RED, c), "center")
            tracked(d, (960, 580), "REGULATIONS  ·  1982", cond(30, 2), rgba(ink, c), 6, "center")
        if opened > 0:
            c = book * opened
            tracked(d, (760, 250), "GROUP B  ·  THE RULES", cond(26, 2), rgba(ink, 0.7 * c), 4)
            for k, w in enumerate((380, 300, 340)):                          # three lines. that's it.
                d.rectangle((760, 330 + k * 46, 760 + w * ramp(t, t_simple + 0.4 + k * 0.3, t_simple + 0.8 + k * 0.3), 344 + k * 46), fill=rgba(ink, 0.55 * c))
            tracked(d, (960, 820), "ALMOST TOO SIMPLE", cond(30, 8), rgba(RED, c * ramp(t, t_simple + 1.6, t_simple + 2.0)), 6, "center")
    # 2. build 200 road cars: they fill the left half while the counter runs
    a = ramp(t, t_build, t_build + 0.4)
    if a > 0:
        n = int(200 * min(1, max(0, (t - t_build - 0.3) / 2.6)))
        text_top(d, (520, 190), str(n), pf(150, 900), rgba(CREAM, a), "center")
        tracked(d, (520, 380), "ROAD CARS TO BUILD", cond(32, 8), rgba(GOLD, a), 6, "center")
        for k in range(200):
            cx, cy = 190 + (k % 16) * 42, 450 + (k // 16) * 34
            car_icon(d, cx, cy, a if k < n else 0.12 * a, CREAM if k < n else GOLD)
    # 3. ... and in return, almost no limits
    rows = [("POWER", "NO LIMIT", "No limits on power"), ("WEIGHT", "HARDLY ANY", "Hardly any limits on weight"),
            ("TECHNOLOGY", "HARDLY ANY", "Hardly any limits on technology")]
    for i, (k, v, snip) in enumerate(rows):
        b = ramp(t, at(snip, sc), at(snip, sc) + 0.35); y = 440 + i * 130
        if b <= 0: continue
        d.rectangle((1020, y, 1760, y + 100), fill=rgba(NAVY_D, 0.85 * b), outline=rgba(GOLD, 0.6 * b), width=2)
        tracked(d, (1060, y + 34), k, cond(38, 8), rgba(CREAM, b), 6)
        tracked(d, (1720, y + 34), v, cond(38, 8), rgba(RED if i == 0 else GOLD, b), 6, "right")
    if t > at("No limits on power", sc) - 0.2:
        tracked(d, (1390, 360), "IN RETURN", cond(30, 2), rgba(CREAM, 0.7 * ramp(t, at("No limits on power", sc) - 0.2, at("No limits on power", sc) + 0.2)), 8, "center")

# ---------------------------------------------------------------- twincharging: turbo + supercharger
def twincharge(d, L, t, sc):
    tracked(d, (W / 2, 160), "LANCIA DELTA S4", cond(34, 2), rgba(GOLD, ramp(t, 0, 0.4)), 8, "center")
    a = ramp(t, 0.2, 0.7)
    d.rounded_rectangle((760, 420, 1160, 700), 24, fill=rgba(NAVY_D, a), outline=rgba(CREAM, a), width=5)        # the engine
    tracked(d, (960, 545), "ENGINE", cond(40, 8), rgba(CREAM, a), 8, "center")
    for (cx, label, sub, col, k) in ((430, "SUPERCHARGER", "BOOST FROM LOW REVS", GOLD, 0), (1490, "TURBOCHARGER", "BOOST AT HIGH REVS", RED, 1)):
        b = ramp(t, 0.6 + 0.6 * k, 1.1 + 0.6 * k)
        if b <= 0: continue
        r = 110; cy = 560
        d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=rgba(col, b), width=8)
        spin = t * (6 if k else 3)
        for j in range(6):                                                   # spinning vanes
            an = spin + j * math.pi / 3
            d.line((cx, cy, cx + 0.8 * r * math.cos(an), cy + 0.8 * r * math.sin(an)), fill=rgba(col, b), width=6)
        x0, x1 = (cx + r, 760) if k == 0 else (1160, cx - r)
        for j in range(5):                                                   # air flowing into the engine
            f = ((t * 1.2 + j / 5) % 1); x = x0 + (x1 - x0) * f if k == 0 else x1 + (x0 - x1) * (1 - f)
            d.ellipse((x - 7, cy - 7, x + 7, cy + 7), fill=rgba(col, b * (1 - abs(f - 0.5))))
        tracked(d, (cx, cy + r + 40), label, cond(36, 8), rgba(CREAM, b), 6, "center")
        tracked(d, (cx, cy + r + 90), sub, cond(26, 2), rgba(col, b), 5, "center")

# ---------------------------------------------------------------- power + 0-60
def power(d, L, t, sc):
    a = ramp(t, 0.1, 0.5); hp = int(500 * ease(min(1, t / 2.2)))
    tracked(d, (W / 2, 220), "LANCIA DELTA S4  ·  RALLY TRIM", cond(34, 2), rgba(GOLD, a), 8, "center")
    text_top(d, (W / 2, 300), f"≈{hp}", pf(260, 900), rgba(CREAM, a), "center")
    tracked(d, (W / 2, 620), "HORSEPOWER", cond(46, 8), rgba(GOLD, a), 10, "center")
    m = ramp(t, atf("Around five hundred", 0.5, sc), atf("Around five hundred", 0.5, sc) + 0.5)
    tracked(d, (W / 2, 720), "SOME SAY FAR MORE", cond(32, 2), rgba(CREAM, 0.8 * m), 7, "center")
    s0 = at("It was said to reach sixty", sc)
    if t > s0 - 0.3:                                                         # 0-60 timer takes over
        b = ramp(t, s0 - 0.3, s0); d.rectangle((0, 0, W, H), fill=rgba(NAVY_D, b))
        secs = min(2.5, max(0.0, (t - s0 - 0.6) * 1.0))
        tracked(d, (W / 2, 220), "0 – 60 MPH", cond(40, 8), rgba(GOLD, b), 10, "center")
        text_top(d, (W / 2, 300), f"{secs:.1f}s", pf(260, 900), rgba(CREAM, b), "center")
        x0, x1 = 460, 1460; d.rectangle((x0, 650, x1, 662), fill=rgba(CREAM, 0.25 * b)); d.rectangle((x0, 650, x0 + (x1 - x0) * secs / 2.5, 662), fill=rgba(RED, b))
        tracked(d, (W / 2, 700), "IT WAS SAID", cond(28, 2), rgba(CREAM, 0.6 * b), 7, "center")
        g = ramp(t, at("On gravel", sc), at("On gravel", sc) + 0.3)
        if g > 0: place_stamp(L, W / 2, 850, g, text="ON GRAVEL", size=90, color=GOLD, rot=-6)

# ---------------------------------------------------------------- the ban
def ban(d, L, t, sc):
    tracked(d, (W / 2, 170), "FISA  ·  MAY 1986", cond(34, 2), rgba(GOLD, ramp(t, 0, 0.5)), 8, "center")
    a = ramp(t, at("Within days", sc), at("Within days", sc) + 0.5)
    text_top(d, (W / 2, 250), "Group B is finished.", pf(110, 900), rgba(CREAM, a), "center")
    text_top(d, (W / 2, 400), "This time, they moved fast.", pf(110, 900), rgba(CREAM, ramp(t, 0.3, 0.8) * (1 - a)), "center")
    rows = [("NEW GROUP B CARS", "BANNED NOW", "No new cars"), ("ALL GROUP B CARS", "BANNED FROM 1987", "And from the end of the season"),
            ("GROUP S  ·  THE NEXT RULES", "CANCELLED", "Even the next set of rules")]
    for i, (k, v, snip) in enumerate(rows):
        b = ramp(t, at(snip, sc), at(snip, sc) + 0.35); y = 470 + i * 120
        if b <= 0: continue
        d.rectangle((400, y, 1520, y + 96), fill=rgba(NAVY_D, 0.85 * b), outline=rgba(GOLD, 0.6 * b), width=2)
        tracked(d, (450, y + 32), k, cond(38, 8), rgba(CREAM, b), 6)
        tracked(d, (1470, y + 32), v, cond(38, 8), rgba(RED, b), 6, "right")

def banned_line(d, L, t, sc):
    text_top(d, (W / 2, 300), "500 horsepower.", pf(100, 900), rgba(CREAM, ramp(t, 0.2, 0.7)), "center")
    text_top(d, (W / 2, 430), "Roads lined with people.", pf(100, 900), rgba(CREAM, ramp(t, atf("Five-hundred-horsepower", 0.5, sc), atf("Five-hundred-horsepower", 0.5, sc) + 0.5)), "center")
    place_stamp(L, W / 2, 740, ramp(t, at("Banned.", sc) - 0.05, at("Banned.", sc) + 0.2), size=160, rot=-8)

# ---------------------------------------------------------------- the 1986 title
def title_1986(d, L, t, sc):
    tracked(d, (W / 2, 200), "1986 WORLD RALLY CHAMPION", cond(36, 2), rgba(GOLD, ramp(t, 0, 0.5)), 8, "center")
    a = ramp(t, at("Markku Alén was crowned", sc), at("Markku Alén was crowned", sc) + 0.5)
    flip = at("Eleven days later", sc); s = ramp(t, flip + 0.3, flip + 0.8); k = ramp(t, flip + 3.5, flip + 4.1)
    y = 330; f = pf(120, 900); w = f.getlength("Markku Alén")
    text_top(d, (W / 2, y), "Markku Alén", f, rgba(CREAM, a * (1 - 0.6 * s)), "center")
    if s > 0: d.line((W / 2 - w / 2 - 20, y + 75, W / 2 - w / 2 - 20 + (w + 40) * s, y + 60), fill=rgba(RED, 1), width=12)
    if s > 0: tracked(d, (W / 2, 520), "CHAMPION FOR 11 DAYS", cond(40, 8), rgba(RED, s), 8, "center")
    if k > 0:
        text_top(d, (W / 2, 640), "Juha Kankkunen", pf(110, 900), rgba(GOLD, k), "center")
        tracked(d, (W / 2, 800), "PEUGEOT", cond(34, 8), rgba(CREAM, 0.8 * k), 8, "center")

# ---------------------------------------------------------------- timeline
SKY = "rohrl_s1.jpg"
scenes = [
    opening(M + SKY, "Group B.", "EPISODE THREE  ·  WORLD RALLY 1982–1986", focus=((0.5, 0.5), (0.45, 0.45))),
    # cold open
    AS("Imagine standing on a forest road", "ai_forest_crowd.png", off=0, zoom=(1.0, 1.15), focus=((0.5, 0.6), (0.5, 0.45)), chapter="WORLD RALLY  ·  PORTUGAL"),
    AS("The crowd are so close", "ai_crowd_parting.png", zoom=(1.05, 1.2), focus=((0.4, 0.5), (0.6, 0.5))),
    PS("For four years in the 1980s", SKY, zoom=(1.0, 1.15)),
    PS("The fastest, wildest cars", "audi_s1.jpg", zoom=(1.0, 1.1)),
    AS("And then, in the space of two months", "ai_empty_stage.png", zoom=(1.0, 1.1), dim=0.2),
    CaS("This is the story of Group B", [{"k": "kicker", "text": "1982 – 1986", "y": 380, "at": 0.1},
                                         {"k": "title", "text": "Group B.", "y": 450, "size": 170, "at": 0.4},
                                         {"k": "line", "text": "Too fast to survive.", "y": 690, "size": 70, "at": "the cars that were too fast", "color": GOLD}],
        align="center", bg=M + SKY),
    # I. the rules
    CuS("In 1982, rallying brought in", rules, chapter=CH("I", "THE RULES")),
    PS("The car makers couldn't believe", "205_snow.jpg", zoom=(1.0, 1.12)),
    # II. the arms race
    PS("Audi got there first", "1984_Audi_Quattro_A2_FOS19.jpg", zoom=(1.0, 1.1), chapter=CH("II", "THE ARMS RACE"), strap=("Audi Quattro", "FOUR-WHEEL DRIVE", 0.4)),
    PS("In 1981, Michèle Mouton", "mouton_audi.jpg", zoom=(1.0, 1.1), strap=("Michèle Mouton", "SAN REMO 1981  ·  FIRST WOMAN TO WIN A WORLD RALLY", 2.0)),
    PS("The next year, she very nearly", "mouton_cockpit.jpg", zoom=(1.0, 1.1), texts=[(0.6, "1982: runner-up in the world championship.", "mid")]),
    PS("Lancia answered with the 037", "Lancia_037_Rally_Martini.jpg", zoom=(1.0, 1.1), strap=("Lancia 037", "THE LAST TWO-WHEEL-DRIVE CHAMPION  ·  1983", 0.6)),
    PS("Then Peugeot built the 205", "1985_Peugeot_205_T16_Evo2.jpg", zoom=(1.0, 1.1), strap=("Peugeot 205 T16", "MID-ENGINE  ·  FOUR-WHEEL DRIVE", 0.6)),
    PS("A shopping car on the outside", "205_snow.jpg", zoom=(1.15, 1.0), focus=((0.5, 0.45), (0.5, 0.5)), texts=[(5.6, "1985 world champions.", "big")]),
    PS("Then entered a rallying Goliath", "rs200.jpg", zoom=(1.0, 1.12), strap=("Ford RS200", "1986", 3.4)),
    PF("Ford built the now iconic RS200", 0.62, "metro_6r4.jpg", zoom=(1.0, 1.1), strap=("MG Metro 6R4", "AUSTIN ROVER", 0.4)),
    PS("Lancia hit back with the Delta S4", "Lancia_Delta_S4_010.JPG", zoom=(1.0, 1.1), strap=("Lancia Delta S4", "1985–1986", 0.6)),
    CuS("A turbocharger and a supercharger", twincharge),
    CuS("Around five hundred horsepower", power),
    PS("Lancia's young star, Henri Toivonen", "toivonen.jpg", zoom=(1.0, 1.08), strap=("Henri Toivonen", "LANCIA", 0.8),
       texts=[(5.0, "Estoril: reportedly quick enough for the middle of the F1 grid.", "mid")]),
    # III. the crowds
    PS("The cars had grown wings", "audi_s1.jpg", zoom=(1.12, 1.25), focus=((0.6, 0.5), (0.75, 0.45)), chapter=CH("III", "THE CROWDS")),
    AS("But one thing hadn't changed", "ai_corner_crowd.png", zoom=(1.0, 1.12), texts=[(2.3, "The crowds.", "big")]),
    AS("They stood in the middle of the road", "ai_forest_crowd.png", zoom=(1.12, 1.25), focus=((0.5, 0.5), (0.5, 0.35))),
    AS("Some reached out and touched them", "ai_hand_reaching.png", zoom=(1.0, 1.1)),
    AS("There were no barriers", "ai_corner_crowd.png", zoom=(1.2, 1.32), focus=((0.3, 0.6), (0.4, 0.6))),
    CaS("Many of the drivers said", [{"k": "title", "text": "“The crowds frightened us more than the speed.”", "y": 380, "size": 92, "w": 650, "at": 0.3, "width": 1500},
                                     {"k": "kicker", "text": "WHAT MANY OF THE DRIVERS SAID", "y": 700, "at": 1.0}], align="center", bg=AI + "ai_crowd_parting.png"),
    # IV. the warnings
    CuS("In 1985, Lancia driver Attilio Bettega", memorial(["Attilio Bettega", "Lancia  ·  Tour de Corse, 1985"]), chapter=CH("IV", "THE WARNINGS")),
    PS("That summer, in Argentina", "Ari_Vatanen_2012.jpg", zoom=(1.0, 1.06), strap=("Ari Vatanen", "PEUGEOT  ·  ARGENTINA 1985: BADLY INJURED", 0.8)),
    PS("Still, the cars got faster", SKY, zoom=(1.2, 1.35), focus=((0.5, 0.55), (0.5, 0.5))),
    # V. 1986
    CaS("On the fifth of March 1986", [{"k": "kicker", "text": "RALLY OF PORTUGAL", "y": 400, "at": 0.1}, {"k": "title", "text": "5 March 1986.", "y": 470, "size": 150, "at": 0.3}],
        align="center", bg=AI + "ai_empty_stage.png", chapter=CH("V", "1986")),
    CuS("Three people were killed", memorial(["3 spectators killed", "More than 30 injured"], "RALLY OF PORTUGAL  ·  5 MARCH 1986")),
    CaS("The top drivers refused", [{"k": "title", "text": "The top drivers withdraw.", "y": 450, "size": 120, "at": 0.2}], align="center", bg=AI + "ai_empty_stage.png"),
    AS("Two months later came the Tour de Corse", "ai_corsica_road.png", zoom=(1.0, 1.1), strap=("Tour de Corse", "MAY 1986", 0.6)),
    PS("Henri Toivonen was leading", "toivonen_s4.jpg", zoom=(1.0, 1.08)),
    AS("On the second of May, his Lancia", "ai_corsica_road.png", zoom=(1.2, 1.3), focus=((0.7, 0.6), (0.75, 0.65)), dim=0.35),
    CuS("Toivonen and his co-driver", memorial(["Henri Toivonen  ·  Sergio Cresto", "Tour de Corse  ·  2 May 1986"])),
    # VI. the ban
    CuS("This time, the sport's governing body", ban, chapter=CH("VI", "THE BAN")),
    CuS("Five-hundred-horsepower rally cars", banned_line, bg=bg_of(AI + "ai_forest_crowd.png", 0.78)),
    # VII. what happened next
    PS("The 1986 season finished", "Alen_Kivimaki_Lancia1986_Sanremo.jpg", zoom=(1.0, 1.12), chapter=CH("VII", "WHAT HAPPENED NEXT"),
       strap=("Markku Alén", "LANCIA DELTA S4  ·  SANREMO 1986", 1.0)),
    CuS("Markku Alén was crowned", title_1986),
    PS("But the cars weren't finished", "Peugeot_205_T16_Rallycross.jpg", zoom=(1.0, 1.1), strap=("Rallycross", "GROUP B CARS RACED ON", 3.0)),
    PS("Peugeot stretched the 205", "Paris_-_Retromobile_2014_-_Peugeot_205_turbo_16_grand_raid_-_1987_-_001.jpg", zoom=(1.0, 1.1),
       strap=("Peugeot 205 T16 Grand Raid", "DAKAR RALLY WINNER  ·  1987 AND 1988", 1.0)),
    PS("And today, the survivors", "1985_Lancia_Delta_S4_Group_B.jpg", zoom=(1.0, 1.15), strap=("Today", "STILL DRAWING THE CROWDS", 5.6)),
    # VIII. what if
    CuS("So here's the question", what_if("Were the cars too fast?", "Were the cars really", "Or were the fans too close?", "Or would Group B"),
        chapter=CH("VIII", "WHAT IF")),
    CuS("This was Banned", banned_end("Group B.")),
]

if __name__ == "__main__":
    main(scenes, FINAL)
