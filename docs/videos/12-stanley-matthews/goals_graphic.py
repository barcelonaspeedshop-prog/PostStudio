#!/usr/bin/env python3
"""Stanley Matthews: the two 1953 goals finished as moving-camera graphics (Mike 22 Oct).

Real-looking AI video runs up to the strike, then we switch to a drawn graphic: no more AI images,
the camera flies with the ball to the net and pulls back to show how it finished, while the narration carries on.

    python3 goals_graphic.py fk OUT.mp4     Mortensen's free-kick, 89 min, 3-3
    python3 goals_graphic.py win OUT.mp4    Perry's winner from Matthews' cut-back, 90+2, 4-3
"""
import math, os, subprocess, sys, multiprocessing as mp
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "studio"))
from storykit import W, H, FPS, GOLD, CREAM, NAVY_D, cond, tracked, rgba
from pitch3d import Cam, player, ball, goal_items, render_frame, bez, ease, lerp, v


def end_label(text, t, t0):
    a = ease((t - t0) / 0.5)
    if a <= 0: return None
    def lab(d):
        f = cond(46, 8); w = d.textlength(text, font=f) + 12 * len(text)
        d.rounded_rectangle([(W - w) / 2 - 30, 70, (W + w) / 2 + 30, 150], 12, fill=rgba(NAVY_D, 0.85 * a))
        tracked(d, (W / 2, 86), text, f, rgba(GOLD, a), 12, "center")
    return lab


# ---------------------------------------------------------------- free-kick: Mortensen, 89 min
FK_BALL0 = (0, -18, 0.11)
FK_P1, FK_TGT, FK_NET = (3.6, -9, 3.4), (3.3, 0.25, 2.2), (3.35, 1.0, 2.1)
FK_KICK, FK_HIT, FK_DUR = 0.5, 3.2, 6.6
WALL = [(-1.4, -8.85), (-0.85, -8.85), (-0.3, -8.85), (0.25, -8.85), (0.8, -8.85)]


def fk_ball(t):
    if t < FK_KICK: return v(*FK_BALL0)
    if t < FK_HIT: return bez(FK_BALL0, FK_P1, FK_TGT, ease((t - FK_KICK) / (FK_HIT - FK_KICK)) * 0.35 + 0.65 * (t - FK_KICK) / (FK_HIT - FK_KICK))
    return lerp(FK_TGT, FK_NET, ease((t - FK_HIT) / 0.35))


def fk_frame(t):
    b = fk_ball(t)
    drone_w = ease((t - FK_KICK) / 0.6) * (1 - ease((t - FK_HIT - 0.3) / 1.6))
    look_ahead = b + v(0.4, 7.0, -0.4)
    c_static, l_static = v(-1.4, -24.5, 2.1), v(0.8, -6, 1.0)
    c_drone, l_drone = b + v(-0.5, -3.4, 0.75), look_ahead
    c_wide, l_wide = v(-15, -16, 12), v(1.0, -7, 0)
    if t < FK_HIT + 0.3:
        cp, lk = lerp(c_static, c_drone, drone_w), lerp(l_static, l_drone, drone_w)
    else:
        k = ease((t - FK_HIT - 0.3) / 1.8)
        cp, lk = lerp(c_drone, c_wide, k), lerp(l_drone, l_wide, k)
    cam = Cam(cp, lk)
    run = ease(t / FK_KICK)
    kx, ky = lerp((-0.9, -19.6), (-0.3, -18.5), run)[:2]
    items = goal_items(cam)
    items += [player(cam, (kx, ky), "bpl", 9, tilt=-12 * run if t < FK_KICK + 0.4 else -4)]
    items += [player(cam, p, "bol", n) for p, n in zip(WALL, (2, 4, 5, 6, 8))]
    items += [player(cam, (-0.4, -0.5), "gk", 1, tilt=-6 * ease((t - 2.4) / 0.6))]   # left standing
    items += [player(cam, p, k, n) for p, k, n in (((4.5, -13.5), "bpl", 7), ((-4.5, -12.5), "bpl", 10),
                                                    ((-6.5, -10), "bol", 3), ((6.0, -11), "bol", 10))]
    items += [ball(cam, b)]
    trail = []
    if t > FK_KICK:
        ts = np.linspace(FK_KICK, min(t, FK_HIT + 0.35), 40); trail = [([fk_ball(x) for x in ts], GOLD)]
    return render_frame(cam, items, trail, end_label("MORTENSEN  ·  89'  ·  3–3", t, FK_HIT + 0.9))


# ---------------------------------------------------------------- winner: Matthews cuts back, Perry scores, 90+2
W_CROSS0, W_RECV = (12.0, -0.9, 0.11), (-0.5, -10.3, 0.11)
W_TGT, W_NET = (-2.9, 0.35, 0.28), (-3.0, 1.3, 0.25)
W_CUT, W_STRIKE, W_HIT, W_DUR = 0.15, 2.2, 3.9, 7.4


def w_ball(t):
    if t < W_CUT: return v(*W_CROSS0)
    if t < W_STRIKE: return lerp(W_CROSS0, W_RECV, (t - W_CUT) / (W_STRIKE - W_CUT))
    if t < W_HIT: return lerp(W_RECV, W_TGT, (t - W_STRIKE) / (W_HIT - W_STRIKE))
    return lerp(W_TGT, W_NET, ease((t - W_HIT) / 0.35))


def w_frame(t):
    b = w_ball(t)
    shot_dir = v(*W_TGT) - v(*W_RECV); shot_dir[2] = 0; shot_dir /= np.linalg.norm(shot_dir)
    c0, l0 = v(15.5, 3.0, 1.7), v(5, -7, 0.6)                 # low behind Matthews at the byline (matches the video cut)
    c1, l1 = v(-0.2, -15.6, 1.8), v(-1.2, 0, 0.9)              # swung round behind Perry
    if t < W_STRIKE:
        k = ease((t - 0.3) / (W_STRIKE - 0.5))
        # arc round the back of the box rather than straight through it
        mid = v(10, -16, 4.0)
        cp = (1 - k) ** 2 * c0 + 2 * (1 - k) * k * mid + k * k * c1
        lk = lerp(l0, l1, k)
    elif t < W_HIT + 0.3:
        k = ease((t - W_STRIKE) / 0.4)
        cp = lerp(c1, b - shot_dir * 3.2 + v(0, 0, 0.7), k); lk = lerp(l1, b + shot_dir * 7 + v(0, 0, 0.3), k)
    else:
        k = ease((t - W_HIT - 0.3) / 1.8)
        bh = v(*W_NET)
        cd, ld = bh - shot_dir * 3.2 + v(0, 0, 0.7), bh + shot_dir * 7
        cp, lk = lerp(cd, v(17, -24, 15), k), lerp(ld, v(2, -5, 0), k)
    cam = Cam(cp, lk)
    gk_dive = ease((t - W_STRIKE - 0.35) / 0.8)
    perry = lerp((-0.9, -12.4), (-0.6, -10.6), ease(t / W_STRIKE))
    morty = lerp((4.0, -7.5), (2.6, -4.2), ease(t / 2.6))
    items = goal_items(cam)
    items += [player(cam, (12.6, -0.6), "bpl", 7, tilt=-8 if t > W_CUT else 0),        # Matthews at the byline
              player(cam, (11.0, -2.6), "bol", 3, tilt=-70),                             # Banks, beaten, on the turf
              player(cam, morty, "bpl", 9),                                              # Mortensen: the ball runs just behind him
              player(cam, perry, "bpl", 11, tilt=-10 if t > W_STRIKE - 0.3 else 0),
              player(cam, (1.6, -4.6), "bol", 5), player(cam, (-3.2, -5.4), "bol", 2), player(cam, (5.4, -8.8), "bol", 6),
              player(cam, (2.4 - 2.6 * gk_dive, -0.6), "gk", 1, tilt=-75 * gk_dive),     # Hanson at the near post, too late
              ball(cam, b)]
    trails = []
    if t > W_CUT:
        ts = np.linspace(W_CUT, min(t, W_STRIKE), 30); trails.append(([w_ball(x) for x in ts], CREAM))
    if t > W_STRIKE:
        ts = np.linspace(W_STRIKE, min(t, W_HIT + 0.35), 30); trails.append(([w_ball(x) for x in ts], GOLD))
    return render_frame(cam, items, trails, end_label("PERRY  ·  90+2'  ·  4–3", t, W_HIT + 0.9))


def _job(args):
    which, i = args
    t = i / FPS
    return np.asarray(fk_frame(t) if which == "fk" else w_frame(t)).tobytes()


if __name__ == "__main__":
    which, out = sys.argv[1], sys.argv[2]
    n = int((FK_DUR if which == "fk" else W_DUR) * FPS)
    p = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
                          "-i", "-", "-c:v", "libx264", "-crf", "16", "-preset", "slow", "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    with mp.Pool(max(2, os.cpu_count() - 1)) as pool:
        for fr in pool.imap(_job, [(which, i) for i in range(n)], chunksize=4):
            p.stdin.write(fr)
    p.stdin.close(); p.wait()
