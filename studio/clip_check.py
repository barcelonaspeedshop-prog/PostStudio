"""clip_check: every 0.1 s of an AI clip on one sheet, so a ball passing the wrong side of a post can't slip between
checks (Mike 21 Oct: the Hazard clip went past the outside of the post; a 1-frame-a-second look missed it).

    ~/.venvs/poststudio/bin/python studio/clip_check.py media/ai/ai_hazard_clip.mp4            # whole clip
    ~/.venvs/poststudio/bin/python studio/clip_check.py media/ai/ai_hazard_clip.mp4 0.5 2.5    # just the moment that matters
    ... --crop x0 y0 x1 y1     (fractions of the frame: zoom on the goal mouth, the finish line...)

Writes <clip>_check.jpg beside the clip: frames in time order, 8 to a row, each stamped with its time.
Read every frame of the decisive moment before the clip goes anywhere near Mike.
"""
import os, subprocess, sys, tempfile
from PIL import Image, ImageDraw

def check(clip, t0=None, t1=None, step=0.1, crop=None, width=420):
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", clip]))
    t0 = 0.0 if t0 is None else t0; t1 = dur if t1 is None else min(t1, dur)
    tmp = tempfile.mkdtemp(); vf = f"fps={1 / step}"
    if crop:
        x0, y0, x1, y1 = crop; vf += f",crop=iw*{x1 - x0}:ih*{y1 - y0}:iw*{x0}:ih*{y0}"
    subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t0}", "-t", f"{t1 - t0}", "-i", clip, "-vf", vf + f",scale={width}:-2", os.path.join(tmp, "%04d.jpg")], check=True)
    fs = sorted(os.listdir(tmp)); ims = [Image.open(os.path.join(tmp, f)).convert("RGB") for f in fs]
    if not ims: raise SystemExit("no frames")
    w, h = ims[0].size; cols = 8; rows = (len(ims) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * w, rows * (h + 22)), (20, 20, 24)); d = ImageDraw.Draw(sheet)
    for i, im in enumerate(ims):
        x, y = (i % cols) * w, (i // cols) * (h + 22); sheet.paste(im, (x, y + 22))
        d.text((x + 6, y + 4), f"{t0 + i * step:.1f}s", fill=(255, 220, 90))
    out = os.path.splitext(clip)[0] + "_check.jpg"; sheet.save(out, quality=85)
    return out

if __name__ == "__main__":
    a = sys.argv[1:]; crop = None
    if "--crop" in a:
        i = a.index("--crop"); crop = tuple(float(v) for v in a[i + 1:i + 5]); a = a[:i] + a[i + 5:]
    print(check(a[0], *(float(v) for v in a[1:3]), crop=crop))
