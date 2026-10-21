"""commons: find and fetch Wikimedia Commons photos with their credits.

    python studio/commons.py search "Michael Schumacher 2010 Mercedes" [n]
    python studio/commons.py get "File:Michael_Schumacher_Hockenheim_2010.jpg" "Schumacher 2010" ".../media/commons/"

`get` downloads a 1920 px copy (a standard thumbnail width: Commons refuses odd sizes with 429 since Oct 2026) into the folder and adds author / licence / url / query to its credits.json
(the query is what build.py's CP(snip, query) looks up). Only free licences (CC BY, CC BY-SA, CC0, public domain).
"""
import json, os, re, sys, time, urllib.error, urllib.parse, urllib.request

API = "https://commons.wikimedia.org/w/api.php"
UA = {"User-Agent": "PostStudio/1.0 (barcelonaspeedshop story videos)"}
FREE = re.compile(r"^(CC BY(-SA)? [0-9.]+|CC0|Public domain|PD)", re.I)

def fetch(url, tries=6):
    for k in range(tries):                                    # Commons answers 429 when asked too fast: back off
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r: return r.read()
        except urllib.error.HTTPError as e:
            if e.code != 429 or k == tries - 1: raise
            time.sleep(5 * 2 ** k)

def api(**p):
    p |= {"format": "json"}
    return json.loads(fetch(API + "?" + urllib.parse.urlencode(p)))

def clean(html): return re.sub(r"<[^>]+>", "", html or "").strip()

def info(titles):
    r = api(action="query", titles="|".join(titles), prop="imageinfo", iiprop="url|size|extmetadata", iiurlwidth=1920)
    out = []
    for pg in r.get("query", {}).get("pages", {}).values():
        if "imageinfo" not in pg: continue
        ii = pg["imageinfo"][0]; m = ii.get("extmetadata", {})
        out.append({"title": pg["title"], "w": ii["width"], "h": ii["height"], "thumb": ii.get("thumburl", ii["url"]),
                    "author": clean(m.get("Artist", {}).get("value")), "licence": clean(m.get("LicenseShortName", {}).get("value")),
                    "date": clean(m.get("DateTimeOriginal", {}).get("value"))[:10], "url": ii["descriptionurl"]})
    return out

def search(q, n=12):
    r = api(action="query", list="search", srsearch=q + " filetype:bitmap", srnamespace=6, srlimit=n)
    titles = [x["title"] for x in r["query"]["search"]]
    return info(titles) if titles else []

def get(title, query, dest):
    i = info([title])[0]
    if not FREE.match(i["licence"]): raise SystemExit(f"not a free licence: {i['licence']}")
    fn = title.split(":", 1)[1].replace(" ", "_")
    open(os.path.join(dest, fn), "wb").write(fetch(i["thumb"]))
    cj = os.path.join(dest, "credits.json"); cr = json.load(open(cj)) if os.path.exists(cj) else []
    cr = [c for c in cr if c["file"] != fn] + [{"file": fn, "author": i["author"], "licence": i["licence"], "url": i["url"], "date": i["date"], "query": query}]
    json.dump(cr, open(cj, "w"), indent=1, ensure_ascii=False)
    return fn, i

if __name__ == "__main__":
    if sys.argv[1] == "search":
        for i in search(sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 12):
            print(f"{i['w']}x{i['h']}  {i['licence']:<14} {i['date']:<10} {i['title']}  [{i['author'][:30]}]")
    else:
        fn, i = get(sys.argv[2], sys.argv[3], sys.argv[4]); print(fn, i["licence"], i["author"])
