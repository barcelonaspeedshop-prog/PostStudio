"""IMPOSSIBLE 04 Leicester thumbnails for YouTube's Test & Compare: A = the real trophy lift, B = the cartoon Elvis, C = Ranieri and the fans.
    ~/.venvs/poststudio/bin/python thumbnails.py
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "05-brawn-gp"))
import thumbnails as T

STORY = "/Volumes/PostDrive/Stories/IMPOSSIBLE series/04 Leicester/"
OUT = STORY + "thumbnails/"

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    T.classic(STORY + "media/commons/LCFC_lift_the_Premier_League_Trophy_(26943755296).jpg", "5000–1.", "Champions.",
              OUT + "IMPOSSIBLE 04 - thumbnail A trophy.jpg", focus=(0.6, 0.4), zoom=1.35, mk=(960, 110, 96))
    T.classic(STORY + "media/ai/ai_elvis.png", "Less likely", "than Elvis alive.",
              OUT + "IMPOSSIBLE 04 - thumbnail B Elvis.jpg", focus=(0.62, 0.35), zoom=1.0, mk=(960, 110, 96))
    T.classic(STORY + "media/ai/ai_ranieri_fans.png", "Nobody wanted him.", "He won the league.",
              OUT + "IMPOSSIBLE 04 - thumbnail C Ranieri.jpg", focus=(0.8, 0.35), zoom=1.1, mk=(960, 110, 96))
