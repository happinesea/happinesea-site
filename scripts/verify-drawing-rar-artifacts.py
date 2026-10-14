"""Replay local evidence and derived ZIPs without modifying sources/artifacts."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / '.superpowers/drawing-rar-work'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def verify_tree(row, path):
    data = path.read_bytes() if isinstance(path, Path) else path
    assert sha(data) == row['derived_zip_sha256'], 'Derived ZIP SHA drift'
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        assert archive.testzip() is None, 'ZIP CRC failure'
        children = {str(Path(n['member']).with_suffix('.zip')).replace('\\', '/'): n for n in row.get('nested', [])}
        for member in row['members']:
            if not member['directory']:
                assert sha((WORK / member['sha256']).read_bytes()) == member['sha256'], 'Canonical member SHA drift'
        for member in row['distribution_members']:
            if member['directory']:
                continue
            value = archive.read(member['name'])
            assert sha(value) == member['sha256'], 'Distribution member SHA drift'
            assert not member['name'].lower().endswith(('.rar', '.7z')), 'Non-native nested archive distribution'
            if member['name'] in children:
                verify_tree(children[member['name']], value)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    source = parser.parse_args().source.resolve(strict=True)
    before = json.loads((WORK / 'source71-before.json').read_text(encoding='utf8'))
    exclusions = json.loads((ROOT / 'src/data/drawing-library/owner-exclusions.json').read_text(encoding='utf8'))
    relocated = {e['source_sha256']: e['current_source_path'] for e in exclusions}
    for row in before.values():
        path = source / relocated.get(row['sha256'], row['current_path'])
        stat = path.stat()
        assert stat.st_size == row['bytes'] and stat.st_mtime_ns == row['mtime_ns'], 'Source metadata changed'
        assert sha(path.read_bytes()) == row['sha256'], 'Source SHA changed'
    catalog = json.loads((ROOT / 'src/data/drawing-library/rar-reanalysis.json').read_text(encoding='utf8'))
    converted = []
    for row in catalog['archives']:
        path = source / relocated[row['sha256']] if row['sha256'] in relocated else source / 'rar-zip_変換' / row['source_rar_path']
        stat = path.stat()
        assert stat.st_size == row['bytes'] and stat.st_mtime_ns == row['mtime_ns'] and sha(path.read_bytes()) == row['sha256'], 'RAR source changed'
        if row['status'] == 'ANALYZED':
            verify_tree(row, WORK / row['derived_zip_path'])
            converted.append(row['derived_zip_sha256'])
    for row in catalog['repacked_source_zips']:
        verify_tree(row, WORK / row['derived_zip_path'])
    for update in catalog['updates']:
        if update['preview']:
            assert sha((WORK / update['preview']['filename']).read_bytes()) == update['preview']['thumbnail_sha256']
    assert len(set(converted)) == len(converted), 'Duplicate root ZIP binary'
    report = {'source71_unchanged': True, 'source_rar44_unchanged': True,
              'derived_zip43_sha_replay': True, 'recursive_member_sha_replay': True,
              'nested_rar_distributions': 0, 'zip_crc_failures': 0,
              'normalized_source_zips': len(catalog['repacked_source_zips'])}
    (WORK / 'artifact-qa.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf8')
    print(json.dumps(report))


if __name__ == '__main__':
    main()
