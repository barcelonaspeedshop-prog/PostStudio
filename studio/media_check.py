"""media_check: list every picture in a build that will look poor on screen (Mike 10-15: "lots of poor quality";
10-19: "if nothing works go automatically to AI").

    ~/.venvs/poststudio/bin/python studio/media_check.py docs/videos/08-mclaren-le-mans/build_v2.py

For each Photo scene (full screen) and FactCard (framed photo) it reports:
  - upscale: how much the picture is blown up at its biggest zoom;
  - clarity: edge strength over grain at screen size (99.5th-percentile gradient / Immerkaer noise estimate).
    Calibrated on Mike's McLaren review (19 Oct): every photo he called poor scored <= 22 (grainy slide scans,
    soft prints); the ones he kept scored 22-100. Under 11 = POOR, 11-22 = CHECK (look at it full size).
Verdicts: POOR = replace it (another photo, or an AI still: see PLAYBOOK "picture quality gate"); CHECK = look first.
Framed fact cards show the photo small, so only very low clarity (< 8) fails them; tiny ones (< 300 px) are CHECK.
"""
import importlib.util, os, sys
import numpy as np
from PIL import Image

def clarity(path, crop=None):
    from scipy.signal import convolve2d
    im = Image.open(path).convert("L")
    if crop: w, h = im.size; x0, y0, x1, y1 = crop; im = im.crop((int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h)))
    w, h = im.size; s = max(1920 / w, 1080 / h)
    im = im.resize((max(1, int(w * s)), max(1, int(h * s))), Image.LANCZOS)
    x0, y0 = (im.width - 1920) // 2, (im.height - 1080) // 2
    a = np.asarray(im.crop((x0, y0, x0 + 1920, y0 + 1080)), dtype=np.float64)
    k = np.array([[1, -2, 1], [-2, 4, -2], [1, -2, 1]])
    noise = np.sum(np.abs(convolve2d(a, k, mode="valid"))) * np.sqrt(0.5 * np.pi) / (6 * (a.shape[0] - 2) * (a.shape[1] - 2))
    g = np.hypot(np.diff(a, axis=1)[:-1, :], np.diff(a, axis=0)[:, :-1])
    return np.percentile(g, 99.5) / max(noise, 0.1)

def main(build):
    sys.argv = ["x"]; sys.path.insert(0, os.path.dirname(os.path.abspath(build)))
    import episode as E
    _sent = E.sent
    def sent(snip):                                   # lines not recorded yet (pickups) still let the check run
        try: return _sent(snip)
        except KeyError: return E.SENTS[-1]
    E.sent = sent
    spec = importlib.util.spec_from_file_location("b", build); B = importlib.util.module_from_spec(spec); spec.loader.exec_module(B)
    from storykit import Photo, W, H
    try: from factcard import FactCard
    except ImportError: FactCard = ()
    bad = check = 0; seen = {}
    for sc in sorted([s for s in B.scenes if s is not None], key=lambda s: s.start):
        m, s_ = divmod(int(sc.start), 60)
        if isinstance(sc, Photo):
            im = Image.open(sc.path); w, h = im.size
            if sc.crop: x0, y0, x1, y1 = sc.crop; w, h = int(w * (x1 - x0)), int(h * (y1 - y0))
            z = max(sc.zoom); ar = w / h
            fit = sc.fit if sc.fit != "auto" else ("cover" if (1.3 <= ar <= 2.3 and w >= 900) else "contain")
            up = (max(W / w, H / h) if fit == "cover" else min(W * 0.92 / w, H * 0.90 / h)) * z
            c = seen.setdefault((sc.path, sc.crop), clarity(sc.path, sc.crop))
            poor = (fit == "cover" and up > 1.5) or w < 1000 or up > 2.2 or c < 11
            look = not poor and c < 22 and "/ai/" not in sc.path
            kind = fit
        elif FactCard and isinstance(sc, FactCard):
            im = Image.open(sc.path); w, h = im.size; up = 0.0; kind = "card"
            c = seen.setdefault((sc.path, None), clarity(sc.path))
            poor = c < 8; look = not poor and (c < 14 or w < 300)
        else: continue
        bad += poor; check += look
        print(f"{'POOR ' if poor else 'CHECK' if look else 'ok   '}  {m}:{s_:02d}  {w}x{h}  {kind:<7}  x{up:.2f}  clarity {c:5.1f}  {os.path.basename(sc.path)}")
    print(f"\n{bad} POOR, {check} CHECK")

if __name__ == "__main__":
    main(sys.argv[1])
