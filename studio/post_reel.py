"""Post a vertical video as a Reel to Instagram (and optionally the Facebook page) for one or more channels.

    ~/.venvs/poststudio/bin/python studio/post_reel.py VIDEO.mp4 "caption" "Road & Trax" "Omnira F1" "Gentlemen of Fuel" [--fb "Road & Trax"]

Only run after Mike has approved the post. Tokens never leave the VPS: the video is copied to the
app's temp-images folder (served at https://app.premirafirst.com/api/temp-image/<file>), Meta fetches
it from there, then the temp file is deleted. (Instagram's direct byte upload fails, so don't use it.)
"""
import json, shlex, subprocess, sys, uuid

VPS, KEY = "root@187.124.42.108", "~/.ssh/poststudio_vps"
TEMP = "/docker/poststudio/data/temp-images/"

REMOTE = r'''
import json, sys, time, urllib.request, urllib.parse, urllib.error
url, cap, ig_chans, fb_chans = sys.argv[1], sys.argv[2], json.loads(sys.argv[3]), json.loads(sys.argv[4])
tokens = json.load(open("/docker/poststudio/data/meta-tokens.json")); G = "https://graph.facebook.com/v21.0/"
def call(u, params=None, headers=None, method="POST"):
    if params: u += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(u, data=b"" if method == "POST" else None, headers=headers or {}, method=method)
    try: return json.load(urllib.request.urlopen(req, timeout=300))
    except urllib.error.HTTPError as e: return {"error": e.read()[:300].decode(errors="replace")}
for ch in ig_chans:
    c = tokens[ch]; tok, ig = c["pageAccessToken"], c["instagramAccountId"]
    r = call(G + ig + "/media", {"media_type": "REELS", "video_url": url, "caption": cap, "share_to_feed": "true", "access_token": tok})
    if "id" not in r: print(f"{ch} Instagram: FAILED {r}"); continue
    for _ in range(90):
        st = call(G + r["id"], {"fields": "status_code", "access_token": tok}, method="GET").get("status_code")
        if st in ("FINISHED", "ERROR", "EXPIRED"): break
        time.sleep(5)
    if st != "FINISHED": print(f"{ch} Instagram: FAILED processing ({st})"); continue
    pub = call(G + ig + "/media_publish", {"creation_id": r["id"], "access_token": tok})
    link = call(G + pub.get("id", ""), {"fields": "permalink", "access_token": tok}, method="GET").get("permalink")
    print(f"{ch} Instagram: {link or pub}")
for ch in fb_chans:
    c = tokens[ch]; tok, page = c["pageAccessToken"], c["facebookPageId"]
    vid = call(G + page + "/video_reels", {"upload_phase": "start", "access_token": tok}).get("video_id")
    if not vid: print(f"{ch} Facebook: FAILED to start"); continue
    call(f"https://rupload.facebook.com/video-upload/v21.0/{vid}", headers={"Authorization": "OAuth " + tok, "file_url": url})
    f = call(G + page + "/video_reels", {"upload_phase": "finish", "video_id": vid, "video_state": "PUBLISHED", "description": cap, "access_token": tok})
    print(f"{ch} Facebook: https://www.facebook.com/reel/{vid}" if f.get("success") else f"{ch} Facebook: FAILED {f}")
'''

def main():
    args = sys.argv[1:]; fb = []
    while "--fb" in args:
        i = args.index("--fb"); fb.append(args[i + 1]); del args[i:i + 2]
    video, caption, chans = args[0], args[1], args[2:]
    name = f"reel_{uuid.uuid4().hex[:10]}.mp4"
    subprocess.run(["scp", "-i", KEY.replace("~", subprocess.os.path.expanduser("~")), "-q", video, f"{VPS}:{TEMP}{name}"], check=True)
    url = f"https://app.premirafirst.com/api/temp-image/{name}"
    cmd = (f"python3 - {shlex.quote(url)} {shlex.quote(caption)} {shlex.quote(json.dumps(chans))} {shlex.quote(json.dumps(fb))} <<'PYEOF'\n{REMOTE}\nPYEOF\n"
           f"rm -f {TEMP}{name}")
    subprocess.run(["ssh", "-i", subprocess.os.path.expanduser(KEY), VPS, cmd])

if __name__ == "__main__":
    main()
