"""IMPOSSIBLE 01 v2 thumbnails: A = the car (as v1), C = the diffuser cutaway, for YouTube's Test & Compare.
    ~/.venvs/poststudio/bin/python thumbnails_v2.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from thumbnails import classic, STORY, OUT

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    classic(STORY + "media/mike/brawn_melbourne_2009.jpg", "Bought for £1.", "World champions.",
            OUT + "IMPOSSIBLE 01 v2 - thumbnail A car.jpg", focus=(0.55, 0.45), zoom=1.15)
    classic(STORY + "media/ai/ai_cutaway_side.png", "Bought for £1.", "Its secret? Below.",
            OUT + "IMPOSSIBLE 01 v2 - thumbnail C secret.jpg", focus=(0.6, 0.48), zoom=1.15)
