"""Apply explicit, reviewable title/grouping decisions to the Task 0 inventory.

Produces planning ledgers only; no Astro content, copies, or download routes.
"""
from collections import Counter, defaultdict
import json
from pathlib import Path
import subprocess

from drawing_audit import dedup, file_id, write_json

REPO = Path(__file__).resolve().parents[1]
OUTPUT = REPO / "docs/drawing-library-task0"
EXISTING = {
    "f-14": {"package_ids": ["2168"], "article_ids": []},
    "f4d": {"package_ids": ["1886"], "article_ids": [1891]},
    "fighter-ultralight": {"package_ids": ["1712", "1717"], "article_ids": [1716]},
    "pitts-park-flyer": {"package_ids": ["1724"], "article_ids": [1726]},
    "c-17": {"package_ids": ["1733"], "article_ids": [1734]},
    "draken": {"package_ids": ["1740"], "article_ids": [1742]},
}
CATEGORIES = {"aircraft": "機体の設計図", "technical": "エンジン・製作資料"}
BASELINE = "b837b83271a53dbb32c316513c47c5086bf627f6"


def load(name):
    return json.loads((OUTPUT / (name + ".json")).read_text(encoding="utf-8"))


def main():
    rows = load("inventory")
    seeds = load("title-decisions")
    old = load("existing-downloads")
    maintenance = load("existing-page-maintenance")
    ledger = dedup(rows, old)
    images = load("existing-drawing-images")
    titles = []
    groups = defaultdict(list)
    for row, duplicate in zip(rows, ledger):
        for image in images:
            if row["sha256"] == image["sha256"]:
                duplicate["evidence"].append({"kind": "SHA256_EXISTING_IMAGE", "existing_route": image["target_route"]})
                duplicate["dedup_status"] = "EXACT_DUPLICATE"
        if row["relative_path"].startswith("F-14/"):
            seed = ["f-14", Path(row["relative_path"]).stem, "high",
                    "既存package 2168のZIPまたはmember。英語の資料名・倍率を保持。", "aircraft"]
        else:
            seed = seeds[row["relative_path"]]
        identifier, title, confidence, notes, category = seed
        row_id = file_id(row)
        duplicate["file_id"] = row_id
        duplicate["record_candidate_id"] = "drawing-" + identifier
        duplicate["existing_record_match"] = identifier in EXISTING
        duplicate["maintenance_action"] = "REFRESH_EXISTING_PAGE" if identifier in EXISTING else "HOLD_NEW_CANDIDATE"
        duplicate["grouping_status"] = "CANDIDATE_NOT_DESIGN_IDENTITY_PROOF"
        if identifier in EXISTING:
            duplicate["legacy_package_ids"] = EXISTING[identifier]["package_ids"]
            if duplicate["dedup_status"] == "NEW_CONTENT":
                duplicate["dedup_status"] = "EXISTING_PAGE_NEEDS_REFRESH"
                duplicate["evidence"].append({"kind": "TITLE_MODEL_VARIANT_CANDIDATE",
                                               "notes": notes,
                                               "package_ids": EXISTING[identifier]["package_ids"]})
        duplicate["archive_review_notes"] = []
        for member in row.get("archive", {}).get("members", []):
            if member["extension"] in {".rar", ".zip", ".7z"}:
                duplicate["archive_review_notes"].append("Nested archive not recursively inspected: " + member["name"])
            if "Thumbs.db" in member["name"]:
                duplicate["archive_review_notes"].append("Exclude OS thumbnail cache in future publication")
        titles.append({"file_id": row_id, "relative_path": row["relative_path"],
                       "title_original": Path(row["original_filename"]).stem,
                       "original_filename": row["original_filename"],
                       "parent_directory_original": row["parent_directory"],
                       "title_ja_candidate": title, "confidence": confidence, "notes": notes,
                       "record_candidate_id": "drawing-" + identifier,
                       "category_candidate": CATEGORIES[category]})
        groups[identifier].append((row, titles[-1], duplicate))
    records = []
    for identifier, files in sorted(groups.items()):
        legacy = EXISTING.get(identifier, {"package_ids": [], "article_ids": []})
        pages = [p for p in maintenance if str(p.get("download_id")) in legacy["package_ids"]
                 or p.get("id") in legacy["article_ids"]]
        packages = [p for p in pages if p["type"] == "download_endpoint"]
        source_title = files[0][1]
        preferred = packages[0] if packages else None
        archive_image = next(({"src": None, "source_local_path": r["relative_path"],
                               "archive_member": member["name"], "status": "REVIEW_REQUIRED"}
                              for r, _, _ in files for member in r.get("archive", {}).get("members", [])
                              if member["safe"] and member["extension"] in {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tif"}), None)
        records.append({"id": "drawing-" + identifier, "slug": identifier,
                        "title_ja": preferred["title"] if preferred else source_title["title_ja_candidate"],
                        "title_original": source_title["title_original"],
                        "title_original_variants": [title["title_original"] for _, title, _ in files],
                        "category": source_title["category_candidate"],
                        "description_ja": None,
                        "description_note": "概要は資料内容・RC適用範囲を確認後に1〜3文で作成する。",
                        "featured_image_candidate": preferred["hero"] if preferred else next(
                            ({"src": None, "source_local_path": r["relative_path"], "status": "REVIEW_REQUIRED"}
                             for r, _, _ in files if r["type"] == "image"), archive_image),
                        "canonical_route_candidate": preferred["target_route"] if preferred else "/drawinglibrary/" + identifier + "/",
                        "legacy_wordpress_ids": legacy["article_ids"],
                        "legacy_package_ids": legacy["package_ids"],
                        "legacy_urls": [p["canonical"] for p in pages],
                        "downloads": [{"file_id": file_id(r), "original_filename": r["original_filename"],
                                       "file_format": r["extension"].lstrip("."), "file_size": r["bytes"],
                                       "sha256": r["sha256"], "source_local_path": r["relative_path"],
                                       "source_root_ref": "DRAWING_SOURCE", "href": None,
                                       "dedup_status": duplicate["dedup_status"],
                                       "publication_status": "REVIEW_REQUIRED"} for r, _, duplicate in files],
                        "content_status": "draft", "publication_status": "REVIEW_REQUIRED",
                        "publication_rights": {"status": "UNKNOWN", "author": None, "license": None,
                                               "source_class": "OWNER_SUPPLIED_LOCATION",
                                               "evidence_url": None},
                        "record_status": "EXISTING_PAGE_NEEDS_REFRESH" if preferred else "NEW_CONTENT",
                        "grouping_note": "同一機体のvariant候補をまとめた暫定record。設計同一・公開許諾の証明ではない。"})
    for page in maintenance:
        matches = [identifier for identifier, legacy in EXISTING.items()
                   if str(page.get("download_id")) in legacy["package_ids"] or page.get("id") in legacy["article_ids"]]
        page["record_candidate_ids"] = ["drawing-" + identifier for identifier in matches]
        page["maintenance_action"] = ("REDESIGN_INDEX_KEEP_ROUTE" if page["type"] == "drawing_library" else
                                      "PRESERVE_TAG_ROUTE" if page["type"] == "download_tag_archive" else
                                      "REFRESH_EXISTING_KEEP_ROUTE")
        page["publication_rights_status"] = "NOT_ESTABLISHED_BY_EXISTING_PUBLICATION"
        page["notes"] = ("F-14の旧slugにF4Dがある。titleとpackage 2168で識別し、URLを変更しない。"
                         if page.get("download_id") == "2168" else
                         "1712/1717は同じFighter PDFを共有。両URL維持、1record・1downloadで扱う。"
                         if str(page.get("download_id")) in {"1712", "1717"} else
                         "既存公開URLとdownload aliasを保ち、本文・画像・権利・参照リンクを再確認する。")
    counts = Counter(row["dedup_status"] for row in ledger)
    categories = Counter(record["category"] for record in records)
    source_matches = [x for x in ledger if x["existing_record_match"]]
    probable_pairs = sorted({tuple(sorted((x["relative_path"], peer["path"]))) for x in ledger
                             for peer in x["source_probable_peers"]})
    baseline_tree = subprocess.check_output(["git", "ls-tree", "-r", "-l", "-z", BASELINE], cwd=REPO).decode("utf-8")
    baseline_files = [(entry.split("\t", 1)[1], int(entry.split("\t", 1)[0].split()[-1]))
                      for entry in baseline_tree.split("\x00") if entry and entry.split()[1] == "blob"]
    public_bytes = sum(size for path, size in baseline_files if path.startswith("public/"))
    tracked_bytes = sum(size for _, size in baseline_files)
    summary = load("inventory-summary")
    new_bytes = summary["new_unique_binary_bytes"]
    planning = {"source_record_candidates": len(records), "existing_source_record_matches": sum(r["record_status"] == "EXISTING_PAGE_NEEDS_REFRESH" for r in records),
                "unmatched_existing_records": [{"id": "drawing-fighter-ultralight", "package_ids": ["1712", "1717"],
                                                 "title": "FIGHTER ULTRALIGHT", "reason": "ローカルに確実な一致なし。1号轻型飞机と同定しない。"}],
                "estimated_new_pages": sum(r["record_status"] == "NEW_CONTENT" for r in records),
                "estimated_library_records_including_existing": len(records) + 1,
                "file_dedup_status_counts": dict(sorted(counts.items())),
                "source_files_matching_existing_records": len(source_matches),
                "source_probable_duplicate_pairs": probable_pairs,
                "category_record_counts": dict(sorted(categories.items())),
                "all_source_publication_review_required": len(rows),
                "current_public_asset_bytes": public_bytes,
                "current_tracked_file_bytes": tracked_bytes,
                "conservative_repository_payload_growth_bytes": new_bytes,
                "projected_tracked_payload_bytes": tracked_bytes + new_bytes,
                "projected_public_assets_bytes": public_bytes + new_bytes,
                "storage_recommendation": "A",
                "storage_note": "現資料量はrepository内で技術的に可能。権利・nested archive・variant選別後のみ追加。履歴容量・将来増加・trafficは別途監視。"}
    for name, value in (("duplicate-ledger", ledger), ("title-candidate-ledger", titles),
                        ("record-candidates", records), ("existing-page-maintenance", maintenance),
                        ("planning-summary", planning)):
        write_json(OUTPUT / (name + ".json"), value)
    directory_labels = {".": ("全部飞机图纸", "飛行機の設計図一式"),
                        "F-14": ("F-14", "F-14"),
                        "F-14 tomcat設計図": ("F-14 tomcat設計図", "F-14 tomcat設計図"),
                        "Fixed Wing Conversion": ("Fixed Wing Conversion", "固定翼への変更資料"),
                        "Scale 100%": ("Scale 100%", "倍率100%"),
                        "Scale 60%": ("Scale 60%", "倍率60%"),
                        "Scale 75%": ("Scale 75%", "倍率75%")}
    write_json(OUTPUT / "directory-title-candidates.json", [
        {"relative_path": path, "title_original": directory_labels[Path(path).name if path != "." else "."][0],
         "title_ja_candidate": directory_labels[Path(path).name if path != "." else "."][1],
         "confidence": "high", "notes": "名称・型式・倍率を保持。分類階層の新設を意味しない。"}
        for path in summary["directories"]])
    print(json.dumps(planning, ensure_ascii=False))


if __name__ == "__main__":
    main()
