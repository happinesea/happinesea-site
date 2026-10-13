import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
import zipfile
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
spec=importlib.util.spec_from_file_location('publication',Path(__file__).resolve().parents[1]/'scripts/resolve-drawing-publication.py')
publication=importlib.util.module_from_spec(spec);spec.loader.exec_module(publication)
class PublicationTests(unittest.TestCase):
 def test_overlay_replay_is_deterministic_and_preserves_rights(self):
  a=publication.generate(None);b=publication.generate(None)
  self.assertEqual(a,b)
  self.assertEqual(len(a['records']),43)
  self.assertTrue(all(r['publication_right']=='REVIEW_REQUIRED' for r in a['records']))
  self.assertEqual(len({r['route'] for r in a['records']}),43)
 def test_member_hashes_ignore_path_prefix_not_document_bytes(self):
  with tempfile.TemporaryDirectory() as temp:
   path=Path(temp)/'中文.zip'
   with zipfile.ZipFile(path,'w') as z:z.writestr('folder/plan.pdf',b'plan')
   members=[{'name':'folder/plan.pdf','safe':True,'bytes':4}]
   self.assertEqual(publication.member_signature(path,'.zip',members),[(4,'64879f7d6b960a01909762d911a32d4582c20010c5641ee90278b644a9e3b525')])
 def test_traversal_member_is_never_opened(self):
  with self.assertRaises(ValueError):publication.member_signature(Path('missing.zip'),'.zip',[{'name':'../escape.pdf','safe':False,'bytes':1}])
if __name__=='__main__':unittest.main()
