#!/usr/bin/env python3
"""PostStudio media library: one searchable catalogue of every AI image, clip,
diagram and sound we make or license, plus a credit ledger.

Everything lives on PostDrive (the repo keeps only this script):
  /Volumes/PostDrive/Library/catalog.json   the catalogue (one entry per file)
  /Volumes/PostDrive/Library/ledger.csv     every credit spent, with what for
  /Volumes/PostDrive/Library/index.html     browsable contact sheet (open in a browser)
  /Volumes/PostDrive/Library/<kind>/<category>/   new library files

Commands:
  ailib.py scan                      index AI media already sitting in story folders (in place)
  ailib.py add FILE --kind video --cat motorsport/night --tags "rain,spray" \
           --channels F1,GoF --prompt "..." --model "Kling v3 Pro" --credits 500
  ailib.py find rain night           search names, tags, prompts
  ailib.py spend 570 --what "voice tests" --channel all --model "Eleven v2"
  ailib.py ledger                    credits spent by day, channel and model
  ailib.py sheet                     rebuild index.html
"""
import argparse, csv, datetime as dt, html, json, os, re, shutil, subprocess, sys

LIB = "/Volumes/PostDrive/Library"
CAT = os.path.join(LIB, "catalog.json")
LEDGER = os.path.join(LIB, "ledger.csv")
THUMBS = os.path.join(LIB, "_thumbs")
CHANNELS = ["/Volumes/PostDrive/Gentlemen of Fuel/Videos", "/Volumes/PostDrive/Omnira F1/Videos",
            "/Volumes/PostDrive/Omnira Football/Videos"]
KINDS = {"image": {".png", ".jpg", ".jpeg", ".webp"},
         "video": {".mp4", ".mov", ".webm"},
         "sound": {".mp3", ".wav", ".aac", ".m4a"}}


def kind_of(path):
    ext = os.path.splitext(path)[1].lower()
    return next((k for k, exts in KINDS.items() if ext in exts), None)


def load():
    if os.path.exists(CAT):
        with open(CAT) as f:
            return json.load(f)
    return []


def save(entries):
    tmp = CAT + ".tmp"
    with open(tmp, "w") as f:
        json.dump(entries, f, indent=1)
    os.replace(tmp, CAT)


def words(name):
    return [w for w in re.split(r"[^a-z0-9]+", name.lower()) if w and w not in {"ai", "clip", "v1", "v2", "v3"}]


def channel_of(path):
    p = path.lower()
    if "gentlemen of fuel" in p or "/gof/" in p:
        return ["GoF"]
    if "omnira f1" in p:
        return ["F1"]
    if "omnira football" in p:
        return ["Football"]
    return []


def cmd_scan(a):
    entries = load()
    known = {e["file"] for e in entries}
    added = 0
    old_clips = os.path.join(LIB, "ai_clips")
    walk = [(r, d, f) for top in CHANNELS + [old_clips] for r, d, f in os.walk(top)]
    for root, dirs, files in walk:
        if re.search(r"_frames(/|$)|/\.", root):
            continue  # 10-fps check frames and hidden folders are not library material
        if "/media/ai" not in root and not root.startswith(old_clips):
            continue
        for fn in files:
            path = os.path.join(root, fn)
            if fn.startswith(".") or path in known or not kind_of(fn):
                continue
            if root.startswith(old_clips):
                category = "football/" + os.path.basename(root)
            else:
                category = "story/" + root.split("/media/ai")[0].split("/")[-1]
            entries.append({
                "file": path, "kind": kind_of(fn), "category": category,
                "channels": channel_of(path), "tags": words(os.path.splitext(fn)[0]),
                "prompt": "", "model": "", "credits": None, "source": "story folder",
                "unused": "/_unused" in root, "added": dt.date.today().isoformat()})
            added += 1
    save(entries)
    print(f"scan: {added} new, {len(entries)} in catalogue")


def cmd_add(a):
    src = os.path.abspath(a.file)
    kind = a.kind or kind_of(src)
    if not kind:
        sys.exit(f"unknown file type: {src}")
    dest_dir = os.path.join(LIB, kind, a.cat)
    os.makedirs(dest_dir, exist_ok=True)
    dest = os.path.join(dest_dir, a.name or os.path.basename(src))
    if src != dest:
        shutil.copy2(src, dest)
    entries = [e for e in load() if e["file"] != dest]
    entries.append({
        "file": dest, "kind": kind, "category": a.cat,
        "channels": [c for c in (a.channels or "").split(",") if c],
        "tags": [t.strip() for t in (a.tags or "").split(",") if t.strip()] + words(os.path.basename(dest)),
        "prompt": a.prompt or "", "model": a.model or "", "credits": a.credits,
        "source": a.source or "Artlist AI", "unused": False, "added": dt.date.today().isoformat()})
    save(entries)
    if a.credits:
        spend(a.credits, f"library: {a.cat}/{os.path.basename(dest)}", a.channels or "all", a.model or "")
    print(dest)


def cmd_find(a):
    terms = [t.lower() for t in a.terms]
    for e in load():
        hay = " ".join([e["file"], e["category"], " ".join(e["tags"]), e["prompt"], " ".join(e["channels"])]).lower()
        if all(t in hay for t in terms):
            print(f"{e['kind']:5}  {','.join(e['channels']) or '-':12}  {e['file']}")


def spend(credits, what, channel, model):
    new = not os.path.exists(LEDGER)
    with open(LEDGER, "a", newline="") as f:
        w = csv.writer(f)
        if new:
            w.writerow(["date", "credits", "what", "channel", "model"])
        w.writerow([dt.datetime.now().strftime("%Y-%m-%d %H:%M"), int(credits), what, channel, model])


def cmd_spend(a):
    spend(a.credits, a.what, a.channel, a.model or "")
    print("logged")


def cmd_ledger(a):
    if not os.path.exists(LEDGER):
        sys.exit("no spend logged yet")
    rows = list(csv.DictReader(open(LEDGER)))
    total = sum(int(r["credits"]) for r in rows)
    for key in ("date", "channel", "model"):
        agg = {}
        for r in rows:
            k = r[key][:10] if key == "date" else (r[key] or "-")
            agg[k] = agg.get(k, 0) + int(r["credits"])
        print(f"\nby {key}:")
        for k, v in sorted(agg.items(), key=lambda kv: -kv[1] if key != "date" else 0):
            print(f"  {k:28} {v:>8,}")
    print(f"\ntotal {total:,} credits over {len(rows)} entries")


def thumb(e):
    os.makedirs(THUMBS, exist_ok=True)
    name = re.sub(r"[^A-Za-z0-9]+", "_", e["file"])[-120:] + ".jpg"
    out = os.path.join(THUMBS, name)
    if not os.path.exists(out):
        src = e["file"]
        seek = ["-ss", "1"] if e["kind"] == "video" else []
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", *seek, "-i", src, "-frames:v", "1",
                        "-vf", "scale=320:-2", out], check=False)
    return os.path.relpath(out, LIB) if os.path.exists(out) else ""


def cmd_sheet(a):
    entries = [e for e in load() if os.path.exists(e["file"])]
    cards = []
    for e in sorted(entries, key=lambda e: (e["category"], e["file"])):
        rel = os.path.relpath(e["file"], LIB)
        src = thumb(e) if e["kind"] in ("image", "video") else ""
        media = (f'<img src="{html.escape(src)}" loading="lazy">' if src
                 else f'<audio controls preload="none" src="{html.escape(rel)}"></audio>' if e["kind"] == "sound"
                 else '<div class="noimg">no preview</div>')
        search = " ".join([e["category"], " ".join(e["tags"]), " ".join(e["channels"]), e["prompt"], e["kind"]]).lower()
        cards.append(
            f'<a class="card" href="{html.escape(rel)}" data-s="{html.escape(search)}" data-k="{e["kind"]}">{media}'
            f'<b>{html.escape(os.path.basename(e["file"]))}</b>'
            f'<span>{html.escape(e["kind"])} · {html.escape(e["category"])} · {html.escape(",".join(e["channels"]) or "any")}'
            f'{" · " + str(e["credits"]) + " cr" if e.get("credits") else ""}{" · unused" if e.get("unused") else ""}</span></a>')
    page = f"""<!doctype html><meta charset="utf-8"><title>PostStudio Library</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{{font:14px -apple-system,system-ui,sans-serif;margin:0;background:#111;color:#eee}}
header{{position:sticky;top:0;background:#111;padding:12px 16px;border-bottom:1px solid #333;display:flex;gap:8px;flex-wrap:wrap}}
input{{flex:1;min-width:200px;padding:8px;font-size:15px;background:#222;color:#eee;border:1px solid #444;border-radius:6px}}
button{{padding:8px 12px;background:#222;color:#eee;border:1px solid #444;border-radius:6px;cursor:pointer}}
button.on{{background:#c8a24a;color:#111}}
main{{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;padding:16px}}
.card{{background:#1b1b1b;border-radius:8px;overflow:hidden;color:inherit;text-decoration:none;display:flex;flex-direction:column}}
.card img{{width:100%;aspect-ratio:16/9;object-fit:cover;background:#000}}
.card audio{{width:100%;margin:8px 0}}
.card b{{padding:6px 8px 0;font-size:12px;word-break:break-all}}
.card span{{padding:2px 8px 8px;font-size:11px;color:#999}}
.noimg{{aspect-ratio:16/9;display:grid;place-items:center;color:#666}}
</style>
<header><input id="q" placeholder="Search: rain, crowd, v12, 1960s, F1 …" autofocus>
<button data-k="">All</button><button data-k="image">Images</button><button data-k="video">Video</button><button data-k="sound">Sound</button>
<span id="n" style="align-self:center;color:#999"></span></header>
<main>{''.join(cards)}</main>
<script>
const q=document.getElementById('q'),cards=[...document.querySelectorAll('.card')];let k='';
function f(){{const t=q.value.toLowerCase().split(/\\s+/).filter(Boolean);let n=0;
cards.forEach(c=>{{const ok=(!k||c.dataset.k===k)&&t.every(w=>c.dataset.s.includes(w)||c.querySelector('b').textContent.toLowerCase().includes(w));c.style.display=ok?'':'none';n+=ok}});
document.getElementById('n').textContent=n+' items';
document.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.k===k))}}
q.oninput=f;document.querySelectorAll('button').forEach(b=>b.onclick=()=>{{k=b.dataset.k;f()}});f();
</script>"""
    with open(os.path.join(LIB, "index.html"), "w") as f:
        f.write(page)
    print(f"sheet: {len(cards)} items -> {os.path.join(LIB, 'index.html')}")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    s = p.add_subparsers(dest="cmd", required=True)
    s.add_parser("scan")
    ad = s.add_parser("add")
    ad.add_argument("file")
    ad.add_argument("--kind", choices=list(KINDS))
    ad.add_argument("--cat", required=True, help="e.g. motorsport/night, football/crowds, cars/1960s")
    ad.add_argument("--name")
    ad.add_argument("--tags")
    ad.add_argument("--channels")
    ad.add_argument("--prompt")
    ad.add_argument("--model")
    ad.add_argument("--credits", type=int)
    ad.add_argument("--source")
    fd = s.add_parser("find")
    fd.add_argument("terms", nargs="+")
    sp = s.add_parser("spend")
    sp.add_argument("credits", type=int)
    sp.add_argument("--what", required=True)
    sp.add_argument("--channel", default="all")
    sp.add_argument("--model")
    s.add_parser("ledger")
    s.add_parser("sheet")
    a = p.parse_args()
    if not os.path.isdir(LIB):
        sys.exit("PostDrive not mounted")
    {"scan": cmd_scan, "add": cmd_add, "find": cmd_find, "spend": cmd_spend,
     "ledger": cmd_ledger, "sheet": cmd_sheet}[a.cmd](a)


if __name__ == "__main__":
    main()
