#!/usr/bin/env python3
"""Draw our own football + flight line over AI "ball-cam" shots (structure drawn, surface AI).

Usage:
  ball_overlay.py fk3 SRC.mp4 OUT.mp4     free-kick: ball leads the flying camera into the net
  ball_overlay.py w3  STILL.png OUT.mp4   winner: push-in on a still, real ball painted out, drawn ball skims into the corner
"""
import math, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

W, H, FPS = 1924, 1076, 24
GOLD = (200, 162, 74)


def ball_sprite(r, angle):
    """Brown 1950s leather ball, radius r px, rotated by angle (deg). Supersampled."""
    s = 4
    R = max(2, int(r * s))
    im = Image.new("RGBA", (2 * R + 2, 2 * R + 2), (0, 0, 0, 0))
    yy, xx = np.mgrid[-R:R + 2, -R:R + 2].astype(float)
    d = np.sqrt(xx ** 2 + yy ** 2) / R
    lx, ly = -0.45, -0.55  # light from top left
    shade = np.clip(1.05 - 0.55 * np.sqrt((xx / R - lx) ** 2 + (yy / R - ly) ** 2), 0.35, 1.15)
    base = np.array([152, 88, 42], float)
    rgb = np.clip(base[None, None, :] * shade[..., None], 0, 255)
    alpha = np.clip((1 - d) * R * 0.8, 0, 1) * 255
    arr = np.dstack([rgb, alpha]).astype(np.uint8)
    im = Image.fromarray(arr)
    dr = ImageDraw.Draw(im)
    c = R + 1
    seam = (70, 38, 18, 200)
    w = max(1, int(R * 0.05))
    for k in range(3):  # leather panel seams
        a = math.radians(angle + k * 60)
        dx, dy = math.cos(a) * R * 0.95, math.sin(a) * R * 0.95
        dr.line([(c - dx, c - dy), (c + dx * 0.2 - dy * 0.35, c + dy * 0.2 + dx * 0.35), (c + dx, c + dy)], fill=seam, width=w, joint="curve")
    dr.ellipse([c - R * 0.55, c - R * 0.55, c + R * 0.55, c + R * 0.55], outline=seam, width=w)
    im = im.resize((max(2, (2 * R + 2) // s), max(2, (2 * R + 2) // s)), Image.LANCZOS)
    return im.filter(ImageFilter.GaussianBlur(0.6))


def bezier(p0, p1, p2, t):
    return ((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
            (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1])


def draw_trail(base, pts, radii, full_path):
    """Faint gold flight line along the path so far + a soft white motion streak behind the ball."""
    ov = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    if len(full_path) > 1:
        d.line(full_path, fill=GOLD + (170,), width=5, joint="curve")
    n = len(pts)
    for i in range(1, n):
        a = int(150 * i / n)
        d.line([pts[i - 1], pts[i]], fill=(255, 250, 235, a), width=max(2, int(radii[i] * 0.9)))
    glow = ov.filter(ImageFilter.GaussianBlur(6))
    base.alpha_composite(glow)
    base.alpha_composite(ov)


def put_ball(base, x, y, r, angle, shadow_y=None):
    if shadow_y is not None:
        sh = Image.new("RGBA", base.size, (0, 0, 0, 0))
        ImageDraw.Draw(sh).ellipse([x - r * 1.1, shadow_y - r * 0.25, x + r * 1.1, shadow_y + r * 0.25], fill=(20, 25, 10, 110))
        base.alpha_composite(sh.filter(ImageFilter.GaussianBlur(max(2, r * 0.3))))
    sp = ball_sprite(r, angle)
    base.alpha_composite(sp, (int(x - sp.width / 2), int(y - sp.height / 2)))


def encode(frames, out):
    p = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                          "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-crf", "16", "-preset", "slow", "-pix_fmt", "yuv420p", out],
                         stdin=subprocess.PIPE)
    for f in frames:
        p.stdin.write(np.asarray(f.convert("RGB")).tobytes())
    p.stdin.close()
    p.wait()


def video_frames(src, start, end):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-ss", str(start), "-i", src, "-t", str(end - start),
                          "-vf", f"scale={W}:{H},fps={FPS}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    n = len(raw) // (W * H * 3)
    return [Image.fromarray(np.frombuffer(raw, np.uint8, W * H * 3, i * W * H * 3).reshape(H, W, 3)).convert("RGBA") for i in range(n)]


def fk3(src, out):
    # real ball has left frame by 1.7 s; the AI net bulge sits at ~(1212, 585) from 2.6 s
    # camera flies on; the right post (tracked) leaves frame at ~2.55 s, so the ball reaches the top corner at 2.4 s
    frames = video_frames(src, 1.7, 2.5)
    nf = 17                                               # flight frames
    post_x = lambda i: 1810 + 4.2 * i + 0.17 * i * i      # tracked right post / crossbar, 1.7 s to 2.5 s
    bar_y = lambda i: 396 + 3.8 * i
    p0, p1, p2 = (1000, 1060), (1550, 420), (post_x(nf) - 40, bar_y(nf) + 34)   # curls right of the wall into the top corner
    path = [bezier(p0, p1, p2, (i / nf) ** 0.85) for i in range(nf + 1)]
    radii = [60 / (1 + 3.2 * (i / nf)) for i in range(nf + 1)]
    out_frames = []
    for i, f in enumerate(frames):
        k = min(i, nf)
        # moving camera: no fixed flight line here, only the motion streak behind the ball
        draw_trail(f, path[max(0, k - 5):k + 1], radii[max(0, k - 5):k + 1], [])
        put_ball(f, *path[k], radii[k], angle=i * 38)
        out_frames.append(f)
    encode(out_frames, out)


def w3(still, out):
    src = Image.open(still).convert("RGBA")
    SW, SH = src.size                       # 2752 x 1536
    # paint out the real ball: copy grass (same white line height) from 330 px to the right
    bx0, by0, bx1, by1 = 1170, 1090, 1600, 1490
    patch = src.crop((bx0 + 440, by0, bx1 + 440, by1))
    mask = Image.new("L", patch.size, 0)
    ImageDraw.Draw(mask).ellipse([6, 6, patch.width - 6, patch.height - 6], fill=255)
    clean = src.copy()
    clean.paste(patch, (bx0, by0), mask.filter(ImageFilter.GaussianBlur(14)))
    p0, p1, p2 = (1384, 1290), (1950, 1135), (2240, 1012)   # low across the grass, under the sliding defender's hand, into the open corner
    nf, total = 17, 24
    path = [bezier(p0, p1, p2, (i / nf) ** 0.8) for i in range(nf + 1)]
    radii = [160 / (1 + 6.0 * (i / nf)) for i in range(nf + 1)]
    ground = [1440 - (1440 - 1035) * ((i / nf) ** 0.8) for i in range(nf + 1)]
    frames = []
    for i in range(total):
        z = 1 + 0.22 * (i / total) ** 1.4                  # drone push towards the corner
        cx, cy = 1384 + (2000 - 1384) * (i / total), 1000
        f = clean.copy()
        k = min(i, nf)
        draw_trail(f, path[max(0, k - 5):k + 1], radii[max(0, k - 5):k + 1], path[:k + 1])
        put_ball(f, *path[k], radii[k], angle=-i * 30, shadow_y=ground[k] if k < nf else None)
        vw, vh = SW / z, SH / z
        x0 = min(max(cx - vw / 2, 0), SW - vw)
        y0 = min(max(cy - vh / 2, 0), SH - vh)
        frames.append(f.crop((int(x0), int(y0), int(x0 + vw), int(y0 + vh))).resize((W, H), Image.LANCZOS))
    encode(frames, out)


if __name__ == "__main__":
    {"fk3": fk3, "w3": w3}[sys.argv[1]](sys.argv[2], sys.argv[3])
