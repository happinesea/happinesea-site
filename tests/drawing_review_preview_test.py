import importlib.util
import os
from pathlib import Path
import sys
import tempfile
import unittest
import zipfile

scripts = Path(__file__).resolve().parents[1] / 'scripts'
sys.path.insert(0, str(scripts))
spec = importlib.util.spec_from_file_location('previews', scripts / 'render-drawing-review-previews.py')
previews = importlib.util.module_from_spec(spec)
spec.loader.exec_module(previews)


class PreviewTests(unittest.TestCase):
    def test_archive_traversal_never_extracts(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / '资料.zip'
            with zipfile.ZipFile(path, 'w') as archive:
                archive.writestr('../escape.pdf', b'no')
            row = {'extension': '.zip', 'archive': {'status': 'LISTED', 'members': [
                {'name': '../escape.pdf', 'safe': False, 'bytes': 2, 'extension': '.pdf'}]}}
            with self.assertRaises(ValueError):
                previews.member_bytes(path, row)
            self.assertFalse((Path(temp) / 'escape.pdf').exists())

    def test_cache_replace_preserves_hardlinked_source(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / 'source.pdf'
            cache = Path(temp) / 'cached.png'
            source.write_bytes(b'original')
            os.link(source, cache)
            previews.cache_write(cache, b'preview')
            self.assertEqual(source.read_bytes(), b'original')
            self.assertEqual(cache.read_bytes(), b'preview')

    def test_source_sha_drift_refuses_preview(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp)
            (source / '中文.pdf').write_bytes(b'changed')
            row = {'relative_path': '中文.pdf', 'bytes': 7, 'sha256': '0' * 64}
            with self.assertRaisesRegex(ValueError, 'Source changed'):
                previews.render_preview(source, source / 'cache', row)


if __name__ == '__main__':
    unittest.main()
