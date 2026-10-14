import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import zipfile

spec = importlib.util.spec_from_file_location('rar', Path(__file__).resolve().parents[1] / 'scripts/reanalyze-drawing-rars.py')
rar = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rar)


class RarTests(unittest.TestCase):
    def test_nested_review_propagates_to_all_parents(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / 'outer.rar'
            source.write_bytes(b'archive')
            def fake_seven(tool, args, limit=rar.MAX_MEMBER):
                if args[0] == 'l':
                    return b'header\n----------\nPath = nested.rar\nFolder = -\nSize = 7\n\n'
                return b'archive'
            with patch.object(rar, 'seven', fake_seven):
                result = rar.analyze('unused', source, root)
            self.assertEqual(result['status'], 'REVIEW_REQUIRED')
            self.assertEqual(result['nested'][0]['status'], 'REVIEW_REQUIRED')
            self.assertEqual(result['nested'][0]['nested'][0]['status'], 'REVIEW_REQUIRED')

    def test_windows_traversal_and_reserved_names(self):
        for name in ['../a', '/a', 'C:/a', '\\\\server\\a', 'x/../a', 'a\x00b', 'a./b', 'CON.pdf', 'x//b']:
            with self.subTest(name=name), self.assertRaises(ValueError):
                rar.safe_name(name)
        self.assertEqual(rar.safe_name('中文\\設計図.pdf'), '中文/設計図.pdf')

    def test_collision_encryption_and_expansion(self):
        for body in ['Path = A.pdf\nSize = 1\n\nPath = a.PDF\nSize = 1',
                     'Path = a\nEncrypted = +', 'Path = a\nSymbolic Link = ../b',
                     f'Path = a\nSize = {rar.MAX_MEMBER + 1}',
                     'Path = a\nSize = 1\n\nPath = a/b\nSize = 1',
                     'Path = é\nSize = 1\n\nPath = e\u0301/child.pdf\nSize = 1']:
            with self.subTest(body=body), self.assertRaises(ValueError):
                rar.parse_listing('header\n----------\n' + body)

    def test_utf8_zip_is_deterministic_and_member_exact(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            data = b'original document bytes'
            digest = rar.sha(data)
            (root / digest).write_bytes(data)
            members = [{'name': '中文/設計図.pdf', 'sha256': digest, 'directory': False}]
            for name in ['a.zip', 'b.zip']:
                rar.stable_zip(root / name, members, root)
            self.assertEqual((root / 'a.zip').read_bytes(), (root / 'b.zip').read_bytes())
            with zipfile.ZipFile(root / 'a.zip') as archive:
                self.assertEqual(archive.read(members[0]['name']), data)
                self.assertEqual(archive.infolist()[0].date_time, (1980, 1, 1, 0, 0, 0))

    def test_nested_rar_is_zip_with_unchanged_leaf_bytes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            data = b'leaf document'
            digest = rar.sha(data)
            (root / digest).write_bytes(data)
            child = {'status': 'ANALYZED', 'source_archive_sha256': 'a' * 64,
                     'member': 'inner.rar', 'nested': [],
                     'members': [{'name': '中文.pdf', 'bytes': len(data), 'sha256': digest, 'directory': False}]}
            parent = {'status': 'ANALYZED', 'source_archive_sha256': 'b' * 64,
                      'nested': [child], 'members': [{'name': 'inner.rar', 'bytes': 1, 'sha256': 'c' * 64, 'directory': False}]}
            rar.convert_tree(parent, root)
            with zipfile.ZipFile(root / parent['derived_zip_path']) as outer:
                self.assertEqual(outer.namelist(), ['inner.zip'])
                import io
                with zipfile.ZipFile(io.BytesIO(outer.read('inner.zip'))) as inner:
                    self.assertEqual(inner.read('中文.pdf'), data)


if __name__ == '__main__':
    unittest.main()
