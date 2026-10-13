"""Read-only drawing inventory. Does not extract archives or import content.

Python 3.10+. Optional rarfile==4.2 reads RAR headers without an unrar executable.
All committed paths are relative to a caller-supplied source root.
"""
import argparse
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import stat
import unicodedata
import zipfile

ARCHIVES = {".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz"}
TYPES = {
    "image": {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tif", ".tiff"},
    "pdf": {".pdf"},
    "cad": {".dwg", ".dxf", ".stp", ".step", ".iges", ".igs", ".stl", ".3dm"},
    "document": {".doc", ".docx", ".txt", ".rtf", ".xls", ".xlsx", ".ppt", ".pptx"},
}


def digest(path):
    sha = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            sha.update(chunk)
    return sha.hexdigest()


def normalized(name):
    return re.sub(r"[^\w]", "", unicodedata.normalize("NFKC", name).casefold())


def safe_member(name):
    name = name.replace("\\", "/")
    return bool(name) and not (
        name.startswith("/") or re.match(r"^[A-Za-z]:", name)
        or ".." in PurePosixPath(name).parts or "\x00" in name or ":" in name
    )


def file_id(row):
    # Path as well as content: identical bytes at two locations remain two observations.
    return "file-" + hashlib.sha256(row["relative_path"].encode("utf-8")).hexdigest()


def download_name(row):
    return row["sha256"] + "-" + file_id(row)[5:] + row["extension"]


def archive_listing(path):
    members = []
    result = {"status": "UNSUPPORTED", "members": members}
    try:
        if path.suffix.casefold() == ".zip":
            with zipfile.ZipFile(path) as archive:
                for info in archive.infolist():
                    if info.is_dir():
                        continue
                    symlink = stat.S_ISLNK(info.external_attr >> 16)
                    members.append({"name": info.filename, "bytes": info.file_size,
                                    "extension": PurePosixPath(info.filename).suffix.casefold(),
                                    "crc32": f"{info.CRC:08x}",
                                    "safe": safe_member(info.filename) and not symlink,
                                    "encrypted": bool(info.flag_bits & 1)})
                    # Stream into a hash only; never write decompressed bytes to disk.
                    if (members[-1]["safe"] and not info.flag_bits & 1
                            and info.file_size <= 100 * 1024 * 1024
                            and sum(x["bytes"] for x in members) <= 512 * 1024 * 1024
                            and info.file_size <= max(info.compress_size, 1) * 1000):
                        sha = hashlib.sha256()
                        with archive.open(info) as stream:
                            for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                                sha.update(chunk)
                        members[-1]["sha256"] = sha.hexdigest()
            result["reader"] = "python.zipfile"
        elif path.suffix.casefold() == ".rar":
            try:
                import rarfile
            except ImportError:
                result["reason"] = "Optional rarfile==4.2 unavailable; no extraction attempted"
                return result
            result["reader"] = "rarfile-" + rarfile.__version__
            # Every volume is observed separately. Later volumes never stand for a full package.
            with rarfile.RarFile(path, errors="strict") as archive:
                for info in archive.infolist():
                    if info.isdir():
                        continue
                    members.append({"name": info.filename, "bytes": info.file_size,
                                    "extension": PurePosixPath(info.filename).suffix.casefold(),
                                    "crc32": f"{info.CRC:08x}" if info.CRC is not None else None,
                                    "safe": safe_member(info.filename) and not info.is_symlink(),
                                    "encrypted": info.needs_password()})
                if len(archive.volumelist()) > 1 or re.search(r"\.part\d+\.rar$", path.name, re.I):
                    result["status"] = "MULTIVOLUME_REVIEW"
        else:
            return result
        result["status"] = result["status"] if result["status"] == "MULTIVOLUME_REVIEW" else "LISTED"
        if any(not member["safe"] for member in members):
            result["status"] = "UNSAFE_MEMBERS"
        elif any(member["encrypted"] for member in members):
            result["status"] = "ENCRYPTED_REVIEW"
    except Exception as error:
        # RAR multipart/corrupt headers must not be mistaken for a complete manifest.
        result["status"] = "PARTIAL" if members else "LISTING_FAILED"
        result["reason"] = type(error).__name__
    members.sort(key=lambda member: member["name"])
    result["extension_counts"] = dict(sorted(Counter(m["extension"] for m in members).items()))
    return result


def manifest_identity(listing):
    if listing.get("status") != "LISTED" or not listing.get("members"):
        return None
    members = listing["members"]
    names = [normalized(PurePosixPath(m["name"].replace("\\", "/")).name) for m in members]
    if len(set(names)) != len(names) or any(not m["safe"] or not m.get("crc32") for m in members):
        return None
    # CRC + size + basename is a candidate identity, NEVER SHA-exact proof.
    return sorted((name, m["bytes"], m["crc32"]) for name, m in zip(names, members))


def content_identity(listing):
    if listing.get("status") != "LISTED" or not listing.get("members"):
        return None
    if any(not m["safe"] or not m.get("crc32") for m in listing["members"]):
        return None
    return sorted((m["bytes"], m["crc32"]) for m in listing["members"])


def scan(root):
    root = root.resolve(strict=True)
    rows = []
    for path in sorted(root.rglob("*"), key=lambda path: path.relative_to(root).as_posix()):
        if path.is_symlink() or getattr(path, "is_junction", lambda: False)():
            raise ValueError("Source links are not followed")
        if not path.is_file():
            continue
        if not path.resolve().is_relative_to(root):
            raise ValueError("Source path escaped root")
        before = path.stat()
        extension = path.suffix.casefold()
        row = {"relative_path": path.relative_to(root).as_posix(),
               "original_filename": path.name, "extension": extension,
               "bytes": before.st_size, "sha256": digest(path),
               "parent_directory": path.relative_to(root).parent.as_posix(),
               "is_archive": extension in ARCHIVES,
               "type": "archive" if extension in ARCHIVES else next(
                   (kind for kind, extensions in TYPES.items() if extension in extensions), "other")}
        if row["is_archive"]:
            row["archive"] = archive_listing(path)
        after = path.stat()
        if (before.st_size, before.st_mtime_ns) != (after.st_size, after.st_mtime_ns):
            raise ValueError("Source changed during scan")
        rows.append(row)
    return rows


def replay(root, rows):
    current = scan(root)
    return [(x["relative_path"], x["bytes"], x["sha256"]) for x in rows] == [
        (x["relative_path"], x["bytes"], x["sha256"]) for x in current]


def grouped(rows, key):
    groups = defaultdict(list)
    for row in rows:
        groups[key(row)].append(row["relative_path"])
    return [{"key": key, "paths": paths} for key, paths in sorted(groups.items()) if len(paths) > 1]


def exact_groups(rows):
    return grouped(rows, lambda row: row["sha256"])


def filename_groups(rows):
    return grouped(rows, lambda row: normalized(row["original_filename"]))


def existing(repo):
    snapshot = json.loads((repo / "src/data/legacy-compatibility.json").read_text(encoding="utf-8"))
    static = json.loads((repo / "src/data/static-downloads.json").read_text(encoding="utf-8"))
    downloads = [x for x in static["files"] if x["target_route"].startswith("/downloads/drawings/")]
    routes = {route for x in downloads for route in x["legacy_routes"]}
    pages = [x for x in snapshot["pages"] if x.get("type") in {"drawing", "drawing_library"}
             or x.get("download_target") in routes
             or (x.get("type") == "download_tag_archive" and x.get("title") != "RC6GS")]
    files = []
    for item in downloads:
        path = repo / "public" / item["target_route"].lstrip("/")
        sha = digest(path)
        if sha != item["sha256"]:
            raise ValueError("Existing download does not match registered SHA")
        record = dict(item, bytes=path.stat().st_size,
                      original_filenames=[Path(x).name for x in item["legacy_routes"]])
        if path.suffix in ARCHIVES:
            record["archive"] = archive_listing(path)
        record["package_ids"] = sorted({str(p["download_id"]) for p in pages
                                        if p.get("download_target") in item["legacy_routes"]})
        files.append(record)
    maintenance = [{k: p.get(k) for k in ("type", "id", "download_id", "title", "target_route",
                                         "canonical", "download_target", "hero", "observed_at")}
                   for p in pages]
    return files, maintenance


def existing_images(repo, maintenance):
    snapshot = json.loads((repo / "src/data/legacy-compatibility.json").read_text(encoding="utf-8"))
    routes = {p["target_route"] for p in maintenance}
    assets = sorted({src for p in snapshot["pages"] if p["target_route"] in routes
                     for src in re.findall(r'src="([^"]+)"', p["content_html"])})
    return [{"target_route": src, "bytes": (repo / "public" / src.lstrip("/")).stat().st_size,
             "sha256": digest(repo / "public" / src.lstrip("/"))}
            for src in assets if src.startswith("/") and safe_member(src.lstrip("/"))
            and (repo / "public" / src.lstrip("/")).is_file()]


def dedup(rows, old_files):
    ledger = []
    for row in rows:
        evidence = []
        for old in old_files:
            if row["sha256"] == old["sha256"]:
                evidence.append({"kind": "SHA256_EXACT", "existing_route": old["target_route"],
                                 "package_ids": old["package_ids"]})
            elif normalized(row["original_filename"]) in {normalized(n) for n in old["original_filenames"]}:
                evidence.append({"kind": "NORMALIZED_FILENAME", "existing_route": old["target_route"],
                                 "package_ids": old["package_ids"]})
            manifest = manifest_identity(row.get("archive", {}))
            if manifest and manifest == manifest_identity(old.get("archive", {})):
                evidence.append({"kind": "ARCHIVE_MANIFEST_CRC_SIZE_BASENAME", "existing_route": old["target_route"],
                                 "package_ids": old["package_ids"]})
            content = content_identity(row.get("archive", {}))
            if content and content == content_identity(old.get("archive", {})):
                evidence.append({"kind": "ARCHIVE_CONTENT_CRC_SIZE_MULTISET", "existing_route": old["target_route"],
                                 "package_ids": old["package_ids"]})
            for member in old.get("archive", {}).get("members", []):
                if member.get("sha256") == row["sha256"]:
                    evidence.append({"kind": "SHA256_EXISTING_ARCHIVE_MEMBER", "existing_route": old["target_route"],
                                     "member": member["name"], "package_ids": old["package_ids"]})
            for member in row.get("archive", {}).get("members", []):
                if member.get("sha256") == old["sha256"]:
                    evidence.append({"kind": "SHA256_CONTAINS_EXISTING_DOWNLOAD", "existing_route": old["target_route"],
                                     "member": member["name"], "package_ids": old["package_ids"]})
        peer_exact = [x["relative_path"] for x in rows if x["relative_path"] != row["relative_path"]
                      and x["sha256"] == row["sha256"]]
        peer_probable = []
        identity = manifest_identity(row.get("archive", {}))
        for peer in rows:
            if peer["relative_path"] == row["relative_path"] or peer["sha256"] == row["sha256"]:
                continue
            reasons = []
            if normalized(row["original_filename"]) == normalized(peer["original_filename"]):
                reasons.append("NORMALIZED_FILENAME")
            if identity and identity == manifest_identity(peer.get("archive", {})):
                reasons.append("ARCHIVE_MANIFEST_CRC_SIZE_BASENAME")
            if content_identity(row.get("archive", {})) and content_identity(row["archive"]) == content_identity(peer.get("archive", {})):
                reasons.append("ARCHIVE_CONTENT_CRC_SIZE_MULTISET")
            left = set(content_identity(row.get("archive", {})) or [])
            right = set(content_identity(peer.get("archive", {})) or [])
            if len(left & right) >= 2 and len(left & right) >= min(len(left), len(right)) / 2:
                reasons.append("PARTIAL_ARCHIVE_CRC_SIZE_OVERLAP")
            if reasons:
                peer_probable.append({"path": peer["relative_path"], "reasons": reasons})
        source_members = [{"archive_path": peer["relative_path"], "member": m["name"]}
                          for peer in rows for m in peer.get("archive", {}).get("members", [])
                          if m.get("sha256") == row["sha256"]]
        status = "EXACT_DUPLICATE" if peer_exact or source_members or any(
            e["kind"] in {"SHA256_EXACT", "SHA256_EXISTING_ARCHIVE_MEMBER"} for e in evidence) else (
            "PROBABLE_DUPLICATE" if evidence or peer_probable else "NEW_CONTENT")
        if row.get("archive", {}).get("status") not in (None, "LISTED") and status == "NEW_CONTENT":
            status = "REVIEW_REQUIRED"
        ledger.append({"relative_path": row["relative_path"], "dedup_status": status,
                       "evidence": evidence, "source_exact_peers": peer_exact,
                       "source_probable_peers": peer_probable,
                       "source_archive_member_matches": source_members,
                       "publication_status": "REVIEW_REQUIRED",
                       "publication_rights": "UNKNOWN",
                       "rights_note": "Owner-supplied location is not redistribution permission"})
    return ledger


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--replay", action="store_true")
    args = parser.parse_args()
    repo = Path(__file__).resolve().parents[1]
    source = args.source.resolve(strict=True)
    output = args.output.resolve()
    if output.is_relative_to(source) or source.is_relative_to(output):
        parser.error("Output and source must be separate directory trees")
    if args.replay:
        rows = json.loads((output / "inventory.json").read_text(encoding="utf-8"))
        if not replay(source, rows):
            raise SystemExit("SHA-256 replay FAILED")
        print("SHA-256 replay: all paths, sizes and hashes unchanged")
        return
    rows = scan(source)
    old_files, maintenance = existing(repo)
    images = existing_images(repo, maintenance)
    unique = {r["sha256"]: r["bytes"] for r in rows}
    old_hashes = {r["sha256"] for r in old_files + images}
    extensions = {ext: {"files": sum(r["extension"] == ext for r in rows),
                        "bytes": sum(r["bytes"] for r in rows if r["extension"] == ext)}
                  for ext in sorted({r["extension"] for r in rows})}
    summary = {"total_files": len(rows), "total_bytes": sum(r["bytes"] for r in rows),
               "unique_binary_count": len(unique), "unique_binary_bytes": sum(unique.values()),
               "new_unique_binary_count": sum(sha not in old_hashes for sha in unique),
               "new_unique_binary_bytes": sum(size for sha, size in unique.items() if sha not in old_hashes),
               "max_file_bytes": max((r["bytes"] for r in rows), default=0),
               "extensions": extensions, "types": dict(sorted(Counter(r["type"] for r in rows).items())),
               "archive_statuses": dict(sorted(Counter(r["archive"]["status"] for r in rows if r["is_archive"]).items())),
               "directories": ["."] + sorted(p.relative_to(source).as_posix() for p in source.rglob("*") if p.is_dir()),
               "largest_files_top20": [{k: r[k] for k in ("relative_path", "bytes", "sha256")}
                                       for r in sorted(rows, key=lambda r: (-r["bytes"], r["relative_path"]))[:20]],
               "exact_sha256_groups": exact_groups(rows),
               "normalized_filename_groups": filename_groups(rows),
               "existing_download_count": len(old_files), "existing_download_bytes": sum(r["bytes"] for r in old_files)}
    for name, value in (("inventory", rows), ("inventory-summary", summary),
                        ("duplicate-ledger", dedup(rows, old_files)),
                        ("existing-downloads", old_files), ("existing-page-maintenance", maintenance)):
        write_json(output / (name + ".json"), value)
    write_json(output / "existing-drawing-images.json", images)
    print(json.dumps({k: summary[k] for k in ("total_files", "total_bytes", "unique_binary_count",
                                               "new_unique_binary_bytes", "archive_statuses")}))


if __name__ == "__main__":
    main()
