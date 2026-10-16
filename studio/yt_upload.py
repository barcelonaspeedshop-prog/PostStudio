"""yt_upload: upload and schedule our own videos and Shorts on our YouTube channels (YouTube Data API v3).

    PY=~/.venvs/poststudio/bin/python
    $PY studio/yt_upload.py auth "Road & Trax"           # once per channel: browser sign-in, pick that channel
    $PY studio/yt_upload.py whoami "Road & Trax"         # which channel a saved sign-in posts to
    $PY studio/yt_upload.py upload "Road & Trax" FILE.mp4 --title "..." --desc "..." --at "2026-10-14 19:00" [--thumb x.jpg]
    $PY studio/yt_upload.py queue jobs.json [--max 6]     # uploads the next jobs not yet done (YouTube allows ~6 a day)
    $PY studio/yt_upload.py show "Road & Trax" [VIDEO_ID]  # read an upload back from YouTube (default: the newest 3)

--at is Spain time (Europe/Madrid). The video goes up private with publishAt, so YouTube publishes it then.
Needs ~/.config/poststudio/yt_client.json (Google Cloud > Clients > Desktop app > Download JSON).
Until the YouTube API audit passes, Google locks API uploads as private: don't schedule real posts before then.
jobs.json: [{"id": "banned01-short1", "channel": "Road & Trax", "file": "/Volumes/...mp4", "title": "...",
             "desc": "...", "at": "2026-10-14 19:00", "tags": ["F1"], "thumb": null}]  -> done ids in jobs.done.json
"""
import argparse, json, os, re, sys, time
from datetime import datetime
from zoneinfo import ZoneInfo

CFG = os.path.expanduser("~/.config/poststudio")
CLIENT = os.path.join(CFG, "yt_client.json")
SCOPES = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.readonly"]
TZ = ZoneInfo("Europe/Madrid")

def slug(ch): return re.sub(r"[^a-z0-9]+", "_", ch.lower()).strip("_")
def token_path(ch): return os.path.join(CFG, f"yt_token_{slug(ch)}.json")

def service(ch):
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    from googleapiclient.discovery import build
    p = token_path(ch)
    if not os.path.exists(p): sys.exit(f"No sign-in for {ch}: run  yt_upload.py auth \"{ch}\"")
    creds = Credentials.from_authorized_user_file(p, SCOPES)
    if not creds.valid:
        creds.refresh(Request()); open(p, "w").write(creds.to_json()); os.chmod(p, 0o600)
    return build("youtube", "v3", credentials=creds, cache_discovery=False)

def auth(ch):
    from google_auth_oauthlib.flow import InstalledAppFlow
    os.makedirs(CFG, exist_ok=True)
    if not os.path.exists(CLIENT): sys.exit(f"Missing {CLIENT} (Desktop OAuth client JSON from Google Cloud)")
    print(f"Sign in and choose the YouTube channel '{ch}' when Google asks which account/channel.")
    creds = InstalledAppFlow.from_client_secrets_file(CLIENT, SCOPES).run_local_server(port=0, prompt="consent")
    p = token_path(ch); open(p, "w").write(creds.to_json()); os.chmod(p, 0o600)
    whoami(ch)

def whoami(ch):
    r = service(ch).channels().list(part="snippet", mine=True).execute()
    for it in r.get("items", []): print(f"{ch}: signed in as channel '{it['snippet']['title']}' ({it['id']})")
    if not r.get("items"): print(f"{ch}: signed in, but this account has no channel selected")

def upload(ch, path, title, desc, at=None, tags=None, thumb=None, category="17"):
    from googleapiclient.http import MediaFileUpload
    yt = service(ch)
    status = {"privacyStatus": "private", "selfDeclaredMadeForKids": False}
    if at:
        when = datetime.strptime(at, "%Y-%m-%d %H:%M").replace(tzinfo=TZ)
        status["publishAt"] = when.astimezone(ZoneInfo("UTC")).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    body = {"snippet": {"title": title[:100], "description": desc[:5000], "tags": tags or [], "categoryId": category},
            "status": status}
    req = yt.videos().insert(part="snippet,status", body=body, media_body=MediaFileUpload(path, chunksize=8 << 20, resumable=True))
    resp = None
    while resp is None:
        st, resp = req.next_chunk()
        if st: print(f"  {os.path.basename(path)}: {int(st.progress() * 100)}%", end="\r")
    vid = resp["id"]; print(f"  {os.path.basename(path)} -> https://youtu.be/{vid}  ({ch}, {'scheduled ' + at if at else 'private'})")
    if thumb: yt.thumbnails().set(videoId=vid, media_body=MediaFileUpload(thumb)).execute()
    return vid

def show(ch, vid="latest", n=3):
    """Read back what YouTube holds for an upload (videos.list) — the proof that an upload landed on the channel.
    vid='latest' lists the channel's newest uploads from its uploads playlist."""
    yt = service(ch)
    if vid == "latest":
        up = yt.channels().list(part="contentDetails", mine=True).execute()["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]
        items = yt.playlistItems().list(part="contentDetails", playlistId=up, maxResults=n).execute().get("items", [])
        ids = [it["contentDetails"]["videoId"] for it in items]
    else: ids = [vid]
    r = yt.videos().list(part="snippet,status", id=",".join(ids)).execute()
    for it in r.get("items", []):
        sn, st = it["snippet"], it["status"]
        print(f"  {it['id']}  '{sn['title']}'  channel: {sn['channelTitle']}  uploaded: {sn['publishedAt'][:16].replace('T', ' ')} UTC"
              f"  privacy: {st['privacyStatus']}  upload status: {st['uploadStatus']}  https://youtu.be/{it['id']}")

def queue(jobs_path, most):
    jobs = json.load(open(jobs_path)); done_p = os.path.splitext(jobs_path)[0] + ".done.json"
    done = json.load(open(done_p)) if os.path.exists(done_p) else {}
    todo = [j for j in jobs if j["id"] not in done][:most]
    for j in todo:
        try:
            done[j["id"]] = upload(j["channel"], j["file"], j["title"], j["desc"], j.get("at"), j.get("tags"), j.get("thumb"))
        except Exception as e:                       # quota used up for today, or a bad file: stop, retry tomorrow
            print(f"  stopped at {j['id']}: {e}"); break
        finally:
            json.dump(done, open(done_p, "w"), indent=1)
    print(f"{len(done)}/{len(jobs)} done")

if __name__ == "__main__":
    ap = argparse.ArgumentParser(); sp = ap.add_subparsers(dest="cmd", required=True)
    a = sp.add_parser("auth"); a.add_argument("channel")
    w = sp.add_parser("whoami"); w.add_argument("channel")
    u = sp.add_parser("upload"); u.add_argument("channel"); u.add_argument("file"); u.add_argument("--title", required=True)
    u.add_argument("--desc", default=""); u.add_argument("--at"); u.add_argument("--thumb"); u.add_argument("--tags", nargs="*")
    q = sp.add_parser("queue"); q.add_argument("jobs"); q.add_argument("--max", type=int, default=6)
    sh = sp.add_parser("show"); sh.add_argument("channel"); sh.add_argument("video", nargs="?", default="latest")
    x = ap.parse_args()
    if x.cmd == "auth": auth(x.channel)
    elif x.cmd == "whoami": whoami(x.channel)
    elif x.cmd == "upload": upload(x.channel, x.file, x.title, x.desc, x.at, x.tags, x.thumb)
    elif x.cmd == "show": show(x.channel, x.video)
    else: queue(x.jobs, x.max)
