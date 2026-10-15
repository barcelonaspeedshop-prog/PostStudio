"""media_check: list every picture in a build that will look soft on screen (Mike 10-15: "lots of poor quality").

    ~/.venvs/poststudio/bin/python studio/media_check.py docs/videos/06-istanbul/build_v2.py

For each Photo scene: the source size, how much it is blown up at its biggest zoom, and a verdict.
Full-screen ('cover') pictures blown up more than 1.5x, or any picture under 1000 px wide, are flagged POOR.
Run it before every render; replace or reframe anything POOR (a player card shows a small photo at its own size).
"""
import importlib.util, os, sys
from PIL import Image

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
    bad = 0
    for sc in sorted([s for s in B.scenes if s is not None], key=lambda s: s.start):
        if not isinstance(sc, Photo): continue
        im = Image.open(sc.path); w, h = im.size
        if sc.crop: x0, y0, x1, y1 = sc.crop; w, h = int(w * (x1 - x0)), int(h * (y1 - y0))
        z = max(sc.zoom); ar = w / h
        fit = sc.fit if sc.fit != "auto" else ("cover" if (1.3 <= ar <= 2.3 and w >= 900) else "contain")
        up = (max(W / w, H / h) if fit == "cover" else min(W * 0.92 / w, H * 0.90 / h)) * z
        poor = (fit == "cover" and up > 1.5) or w < 1000 or up > 2.2
        bad += poor
        m, s_ = divmod(int(sc.start), 60)
        print(f"{'POOR' if poor else 'ok  '}  {m}:{s_:02d}  {w}x{h}  {fit:<7}  x{up:.2f}  {os.path.basename(sc.path)}")
    print(f"\n{bad} picture(s) flagged")

if __name__ == "__main__":
    main(sys.argv[1])
