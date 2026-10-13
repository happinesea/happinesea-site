"""Task 0 audit tests; no source corpus or network needed."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
import zipfile

spec = importlib.util.spec_from_file_location(
    "audit", Path(__file__).resolve().parents[1] / "scripts/drawing_audit.py"
)
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


class AuditTests(unittest.TestCase):
    def test_generated_json_uses_portable_lf(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "inventory.json"
            audit.write_json(path, {"原題": "飞机"})
            self.assertNotIn(b"\r\n", path.read_bytes())

    def test_archive_paths(self):
        for name in ("../x.pdf", "a/../../x", "/x", "C:/x", "a\\..\\x", "\\\\server\\x"):
            self.assertFalse(audit.safe_member(name), name)
        self.assertTrue(audit.safe_member("图纸/機体.pdf"))

    def test_unicode_determinism_duplicates_and_collisions(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "飞机図面"
            (root / "甲").mkdir(parents=True)
            (root / "乙").mkdir()
            (root / "甲" / "F-14.pdf").write_bytes(b"same")
            (root / "乙" / "F-14.pdf").write_bytes(b"same")
            (root / "乙" / "Ｆ１４.PDF").write_bytes(b"different")
            first = audit.scan(root)
            self.assertEqual(first, audit.scan(root))
            self.assertEqual(len(audit.exact_groups(first)), 1)
            self.assertEqual(len(audit.filename_groups(first)), 1)
            self.assertEqual(len({audit.file_id(x) for x in first}), 3)
            self.assertEqual(len({audit.download_name(x) for x in first}), 3)

    def test_zip_listing_never_extracts_and_detects_traversal(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "资料.zip"
            with zipfile.ZipFile(path, "w") as archive:
                archive.writestr("图纸/機体.pdf", b"pdf")
                archive.writestr("../escape.txt", b"bad")
            result = audit.archive_listing(path)
            self.assertEqual(result["status"], "UNSAFE_MEMBERS")
            self.assertEqual(len(result["members"]), 2)
            self.assertFalse((Path(tmp).parent / "escape.txt").exists())
            self.assertFalse((Path(tmp) / "图纸").exists())

    def test_archive_identity_requires_complete_unambiguous_manifest(self):
        listing = {"status": "LISTED", "members": [
            {"name": "root/A.pdf", "bytes": 8, "crc32": "12345678", "safe": True}
        ]}
        self.assertIsNotNone(audit.manifest_identity(listing))
        listing["members"].append(dict(listing["members"][0], name="other/A.pdf"))
        self.assertIsNone(audit.manifest_identity(listing))
        listing["status"] = "PARTIAL"
        self.assertIsNone(audit.manifest_identity(listing))

    def test_sha_replay_detects_mutation(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            file = root / "a.pdf"
            file.write_bytes(b"first")
            inventory = audit.scan(root)
            self.assertTrue(audit.replay(root, inventory))
            file.write_bytes(b"changed")
            self.assertFalse(audit.replay(root, inventory))

    def test_dedup_exact_filename_and_crc_are_distinct(self):
        row = {"relative_path": "plane.zip", "original_filename": "plane.zip", "sha256": "first"}
        old = {"target_route": "/downloads/drawings/plane.zip", "sha256": "first",
               "original_filenames": ["plane.zip"], "package_ids": ["1"]}
        result = audit.dedup([row], [old])[0]
        self.assertEqual(result["dedup_status"], "EXACT_DUPLICATE")
        self.assertEqual(result["publication_status"], "REVIEW_REQUIRED")
        row["sha256"] = "second"
        self.assertEqual(audit.dedup([row], [old])[0]["dedup_status"], "PROBABLE_DUPLICATE")
        member = {"name": "root/plane.pdf", "bytes": 9, "crc32": "12345678", "safe": True}
        row["original_filename"] = "other.rar"
        row["archive"] = {"status": "LISTED", "members": [member]}
        old["archive"] = {"status": "LISTED", "members": [dict(member, name="renamed.pdf")]}
        result = audit.dedup([row], [old])[0]
        self.assertEqual(result["dedup_status"], "PROBABLE_DUPLICATE")
        self.assertTrue(any(x["kind"] == "ARCHIVE_CONTENT_CRC_SIZE_MULTISET" for x in result["evidence"]))

    def test_container_member_exact_is_recorded_separately(self):
        row = {"relative_path": "plane.pdf", "original_filename": "plane.pdf", "sha256": "member-sha"}
        old = {"target_route": "/downloads/drawings/plane.zip", "sha256": "archive-sha",
               "original_filenames": ["plane.zip"], "package_ids": ["1"],
               "archive": {"members": [{"name": "plane.pdf", "sha256": "member-sha"}]}}
        result = audit.dedup([row], [old])[0]
        self.assertEqual(result["dedup_status"], "EXACT_DUPLICATE")
        self.assertEqual(result["evidence"][0]["kind"], "SHA256_EXISTING_ARCHIVE_MEMBER")


if __name__ == "__main__":
    unittest.main()
