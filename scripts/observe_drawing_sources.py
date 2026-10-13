"""Capture public WordPress/page/download metadata; never changes remote state.

Run separately from deterministic inventory. No credentials or remote images.
"""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
import html
import json
from pathlib import Path
import re
from urllib.error import HTTPError
from urllib.parse import quote, urlsplit, urlunsplit
from urllib.request import Request, urlopen

from drawing_audit import existing, write_json

REPO = Path(__file__).resolve().parents[1]
OUTPUT = REPO / "docs/drawing-library-task0/live-observations.json"


def fetch(url, binary=False):
    parsed = urlsplit(url)
    url = urlunsplit(parsed._replace(path=quote(parsed.path, safe="/%:@")))
    record = {"url": url, "observed_at": datetime.now(timezone.utc).isoformat()}
    try:
        with urlopen(Request(url, headers={"User-Agent": "happinesea-task0-readonly-audit/1"}), timeout=25) as response:
            record.update(http_status=response.status, final_url=response.url,
                          content_type=response.headers.get("Content-Type"))
            sha = hashlib.sha256()
            count = 0
            chunks = []
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                count += len(chunk)
                if count > 100 * 1024 * 1024:
                    raise ValueError("Response size limit")
                sha.update(chunk)
                if not binary:
                    chunks.append(chunk)
            record.update(bytes=count, sha256=sha.hexdigest())
            if not binary:
                text = b"".join(chunks).decode("utf-8", errors="replace")
                if "json" in (record["content_type"] or ""):
                    data = json.loads(text)
                    data = data if isinstance(data, list) else [data]
                    record["wordpress_records"] = [{k: row[k] for k in
                        ("id", "slug", "link", "modified", "type", "count") if k in row} |
                        ({"title": html.unescape(row["title"]["rendered"])} if isinstance(row.get("title"), dict) else {}) |
                        ({"content_links": re.findall(r'href=[\"\x27]([^\"\x27]+)', row["content"]["rendered"])} if isinstance(row.get("content"), dict) else {})
                        for row in data]
                else:
                    title = re.search(r"<title[^>]*>(.*?)</title>", text, re.S | re.I)
                    record["title"] = html.unescape(title.group(1).strip()) if title else None
                    record["wordpress_ids_in_html"] = sorted(set(re.findall(r"(?:postid-|page-id-|[?&]p=|wpdmdl[=\"\x27 :]+)(\d+)", text)))
                    record["drawing_links"] = sorted(set(html.unescape(link) for link in
                        re.findall(r'href=[\"\x27]([^\"\x27]+)', text) if any(token in link for token in
                                   ("/engineering-drawing/", "/download/", "/downloads/drawings/", "wpdmdl="))))
    except HTTPError as error:
        record.update(http_status=error.code, error="HTTPError")
    except Exception as error:
        record.update(http_status=None, error=type(error).__name__)
    return record


def main():
    downloads, pages = existing(REPO)
    urls = []
    for page in pages:
        if page["type"] == "download_tag_archive":
            continue
        route = page["target_route"]
        urls.extend([("https://happinesea.com" + route, False),
                     ("https://cms.happinesea.com" + route, False)])
        if page["id"]:
            rest = "pages" if page["type"] == "drawing_library" else "posts"
            urls.append((f'https://cms.happinesea.com/wp-json/wp/v2/{rest}/{page["id"]}', False))
    for download in downloads:
        urls.append(("https://happinesea.com" + download["target_route"], True))
    urls.extend([("https://cms.happinesea.com/wp-json/wp/v2/categories?slug=engineering-drawing", False),
                 ("https://cms.happinesea.com/wp-json/wp/v2/wpdmpro?per_page=100", False)])
    with ThreadPoolExecutor(max_workers=4) as pool:
        records = list(pool.map(lambda item: fetch(*item), urls))
    category = next(x for x in records if "categories?slug=" in x["url"])
    for row in category.get("wordpress_records", []):
        if "id" in row:
            page = 1
            while True:
                observed = fetch(f'https://cms.happinesea.com/wp-json/wp/v2/posts?categories={row["id"]}&per_page=100&page={page}')
                records.append(observed)
                if len(observed.get("wordpress_records", [])) < 100:
                    break
                page += 1
    for record in records:
        for download in downloads:
            if record["url"] == "https://happinesea.com" + download["target_route"]:
                record["matches_registered_download_sha256"] = record.get("sha256") == download["sha256"]
    write_json(OUTPUT, {"method": "Public unauthenticated GET only; metadata and hashes, no HTML/binary copies",
                        "records": sorted(records, key=lambda row: row["url"])})
    print(json.dumps({"requests": len(records), "http_statuses": {str(code): sum(r["http_status"] == code for r in records)
                     for code in {r["http_status"] for r in records}}}))


if __name__ == "__main__":
    main()
