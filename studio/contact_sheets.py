"""contact_sheets: every scene of a build at 15 / 50 / 85 % of its length, 48 frames per sheet — the check for dead or
empty frames before a render (Mike: no graphic may stop with half the screen empty).

    ~/.venvs/poststudio/bin/python studio/contact_sheets.py docs/videos/06-istanbul/build_v2.py OUTDIR
"""
import importlib.util, multiprocessing as mp, os, subprocess, sys
from PIL import Image, ImageDraw

def load(build):
    sys.argv = ["x"]; sys.path.insert(0, os.path.dirname(os.path.abspath(build)))
    spec = importlib.util.spec_from_file_location("b", build); B = importlib.util.module_from_spec(spec); spec.loader.exec_module(B)
    return B

if __name__ == "__main__":
    build, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
    B = load(build)
    import episode as E
    from storykit import frame_at
    sc = sorted([s for s in B.scenes if s is not None], key=lambda s: s.start)
    nd = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", E.NA + "narration.wav"]))
    total = E.INTRO + nd + 3
    for a, b in zip(sc, sc[1:]): a.dur = b.start - a.start
    sc[-1].dur = total - sc[-1].start
    jobs = [(i, s.start + (max(0.3, f * s.dur) if s.dur > 0.8 else 0.2)) for i, s in enumerate(sc) for f in (0.15, 0.5, 0.85)]
    def one(j):
        i, T = j; im = frame_at(sc, T).resize((480, 270)); ImageDraw.Draw(im).text((4, 4), f"{i} {int(T // 60)}:{T % 60:04.1f}", fill=(255, 255, 0)); return im
    with mp.get_context("fork").Pool(9) as p: ims = p.map(one, jobs)
    for k in range(0, len(ims), 48):
        g = Image.new("RGB", (480 * 6, 270 * 8))
        for n, im in enumerate(ims[k:k + 48]): g.paste(im, ((n % 6) * 480, (n // 6) * 270))
        g.save(f"{out}/sheet{k // 48}.jpg", quality=80)
    print(len(sc), "scenes;", f"{int(total // 60)}:{total % 60:04.1f}")
