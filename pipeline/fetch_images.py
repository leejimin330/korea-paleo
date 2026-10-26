"""[6] 생물 사진: 영어 위키백과 대표 이미지(자유 라이선스만) + 위키미디어 공용 저작자·라이선스 → images.json

- 키는 학명: 도감 항목의 속(genus) 이름, 계통수 노드의 학명(무리·현생종).
- 속은 "X (genus)" 문서를 먼저 쓴다 (예: Rana → 개구리속 문서, 같은 이름의 다른 문서 대신).
- 동음이의 문서, 위키백과에만 올라온 파일(공용에 없는 파일), 허용 라이선스가 아닌 파일은 버린다.
"""
import json
import re
from html import unescape

from common import MANUAL, PROCESSED, USER_AGENT, cached_get, write_json
from build_tree import read_rows

WIKI_API = "https://en.wikipedia.org/w/api.php"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"
HEADERS = {"User-Agent": USER_AGENT}
THUMB = 480
BATCH = 40
LICENSE_OK = re.compile(r"^(CC BY(-SA)? [0-9.]+|CC0|Public domain|PD.*)", re.I)


def strip_html(s):
    return re.sub(r"\s+", " ", unescape(re.sub(r"<[^>]+>", "", s or ""))).strip()


def chunks(xs, n=BATCH):
    for i in range(0, len(xs), n):
        yield xs[i : i + n]


def page_images(titles):
    """{요청한 제목: (문서 URL, 파일 이름)}. 동음이의·이미지 없는 문서는 빠진다."""
    out = {}
    for part in chunks(sorted(set(titles))):
        body = cached_get(WIKI_API, {
            "action": "query", "format": "json", "formatversion": 2, "redirects": 1,
            "prop": "pageimages|pageprops|info", "piprop": "name", "pilicense": "free",
            "ppprop": "disambiguation", "inprop": "url", "titles": "|".join(part),
        }, headers=HEADERS)
        q = body.get("query", {})
        back = {t: t for t in part}
        for n in q.get("normalized", []):
            back[n["to"]] = back.get(n["from"], n["from"])
        for r in q.get("redirects", []):
            back[r["to"]] = back.get(r["from"], r["from"])
        for p in q.get("pages", []):
            if p.get("missing") or "disambiguation" in p.get("pageprops", {}) or not p.get("pageimage"):
                continue
            out[back.get(p["title"], p["title"])] = (p["fullurl"], p["pageimage"])
    return out


def commons_info(files):
    """{파일 이름: 메타데이터}. 공용에 없는 파일과 허용되지 않는 라이선스는 빠진다."""
    out = {}
    for part in chunks(sorted(set(files))):
        body = cached_get(COMMONS_API, {
            "action": "query", "format": "json", "formatversion": 2, "prop": "imageinfo",
            "iiprop": "url|extmetadata", "iiurlwidth": THUMB, "titles": "|".join(f"File:{f}" for f in part),
        }, headers=HEADERS)
        q = body.get("query", {})
        back = {f"File:{f}": f for f in part}
        for n in q.get("normalized", []):
            back[n["to"]] = back.get(n["from"], n["from"])
        for p in q.get("pages", []):
            info = (p.get("imageinfo") or [None])[0]
            if p.get("missing") or not info or not info.get("thumburl"):
                continue
            meta = info.get("extmetadata", {})
            lic = strip_html(meta.get("LicenseShortName", {}).get("value"))
            if not LICENSE_OK.match(lic):
                continue
            out[back.get(p["title"], p["title"])] = {
                "thumb": info["thumburl"].split("?")[0],  # 추적용 utm 쿼리 제거
                "width": info.get("thumbwidth"),
                "height": info.get("thumbheight"),
                "file_page": info["descriptionurl"],
                "artist": strip_html(meta.get("Artist", {}).get("value"))[:120] or "작자 미상",
                "license": lic,
            }
    return out


def names_to_fetch(species, tree_rows):
    genera = sorted({s["scientific_name"].split()[0] for s in species if s.get("scientific_name")})
    nodes = sorted({r["name"] for r in tree_rows})
    return genera, nodes


def main():
    species = json.loads((PROCESSED / "species.json").read_text(encoding="utf-8"))
    tree_rows = read_rows(MANUAL / "taxa.csv")
    genera, nodes = names_to_fetch(species, tree_rows)
    # 속은 "(genus)" 문서가 있으면 그쪽을 쓴다.
    pages = page_images(genera + [f"{g} (genus)" for g in genera] + nodes)
    chosen = {}
    for g in genera:
        hit = pages.get(f"{g} (genus)") or pages.get(g)
        if hit:
            chosen[g] = hit
    for n in nodes:
        if n in pages and n not in chosen:
            chosen[n] = pages[n]
    files = commons_info([f for _, f in chosen.values()])
    images = {}
    for name, (page, f) in sorted(chosen.items()):
        if f in files:
            images[name] = {**files[f], "page": page}
    write_json(PROCESSED / "images.json", images)
    print(f"images: genera {sum(g in images for g in genera)}/{len(genera)}, tree nodes {sum(n in images for n in nodes)}/{len(nodes)}")
    return images


if __name__ == "__main__":
    main()
