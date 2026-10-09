"""denoise IN.wav OUT.wav: DeepFilterNet voice repair (strips room echo and noise, keeps the natural tone).
Runs in its own venv because it needs torch:  ~/.venvs/enhance/bin/python studio/denoise.py in.wav out.wav
Mike's pick 2026-10-09 ("B is perfect")."""
import sys, numpy as np, soundfile as sf, torch
from df.enhance import enhance, init_df
src, dst = sys.argv[1:3]
model, state, _ = init_df()
x, sr = sf.read(src, dtype="float32")
if x.ndim > 1: x = x.mean(1)
assert sr == state.sr(), f"needs {state.sr()} Hz input, got {sr}"
y = enhance(model, state, torch.from_numpy(x)[None], atten_lim_db=None).squeeze().numpy()
sf.write(dst, y, sr)
