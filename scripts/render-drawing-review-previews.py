"""Local read-only preview rendering. Never extracts packages to disk.

Optional PyMuPDF renders a bounded first page/image into the ignored review cache.
RAR uses a single member stdout stream from the system bsdtar when supported.
Unreadable/nested/split/unsafe material gets an explicit unavailable receipt.
"""
import argparse
import binascii
import hashlib
import json
from pathlib import Path
import subprocess
from threading import Timer
from tempfile import NamedTemporaryFile
import zipfile
from drawing_audit import digest, safe_member

LIMIT = 32 * 1024 * 1024
FORMATS = {'.pdf', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tif', '.tiff'}


def cache_write(path, data):
    with NamedTemporaryFile(dir=path.parent, prefix='.preview-', delete=False) as stream:
        temporary = Path(stream.name)
        stream.write(data)
    try:
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def member_bytes(path, row):
    if row['archive']['status'] != 'LISTED':
        raise ValueError('Archive listing incomplete/split/encrypted')
    members = row['archive']['members']
    if any(not m['safe'] or not safe_member(m['name']) or m.get('encrypted') for m in members):
        raise ValueError('Unsafe/encrypted archive')
    candidates = [m for m in members if m['extension'] in FORMATS and m['bytes'] <= LIMIT]
    candidates.sort(key=lambda m: (m['extension'] != '.pdf', not any(t in m['name'].lower() for t in ['plan', 'parts', '图', '設計']), m['name']))
    if not candidates:
        raise ValueError('No supported outer member; nested archives are not opened')
    member = candidates[0]
    if row['extension'] == '.zip':
        with zipfile.ZipFile(path) as archive:
            info = archive.getinfo(member['name'])
            if info.file_size > LIMIT or info.file_size > max(1, info.compress_size) * 1000:
                raise ValueError('Preview expansion limit')
            with archive.open(info) as stream:
                data = stream.read(LIMIT + 1)
    elif row['extension'] == '.rar':
        with path.open('rb') as stream:
            process = subprocess.Popen(['tar', '-xOf', '-', '--', member['name']], stdin=stream,
                                       stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
            timer = Timer(12, process.kill)
            timer.start()
            try:
                data = process.stdout.read(LIMIT + 1)
                if len(data) > LIMIT:
                    process.kill()
                code = process.wait(timeout=13)
            finally:
                timer.cancel()
                process.stdout.close()
        if code:
            raise ValueError('RAR reader cannot safely read this member/encoding')
    else:
        raise ValueError('Archive preview unsupported')
    if len(data) != member['bytes'] or len(data) > LIMIT:
        raise ValueError('Member size mismatch')
    if member.get('crc32') and f'{binascii.crc32(data) & 0xffffffff:08x}' != member['crc32']:
        raise ValueError('Member CRC mismatch')
    if member.get('sha256') and hashlib.sha256(data).hexdigest() != member['sha256']:
        raise ValueError('Member SHA mismatch')
    return data, member['extension'], member['name']


def render_preview(source, cache, row):
    result = {'status': 'UNAVAILABLE', 'note': 'プレビュー未確認', 'member': None}
    path = source / row['relative_path']
    if not safe_member(row['relative_path']) or not path.resolve().is_relative_to(source):
        raise ValueError('Source path escape')
    if path.stat().st_size != row['bytes'] or digest(path) != row['sha256']:
        raise ValueError('Source changed; preview refused')
    try:
        import pymupdf as fitz
        if row['is_archive']:
            data, extension, member = member_bytes(path, row)
        elif row['extension'] in FORMATS and row['bytes'] <= LIMIT:
            data, extension, member = path.read_bytes(), row['extension'], None
        else:
            raise ValueError('Unsupported source format')
        with fitz.open(stream=data, filetype=extension.lstrip('.')) as document:
            page = document[0]
            scale = min(1200 / page.rect.width, 800 / page.rect.height, 2)
            image = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
            filename = row['sha256'] + '.png'
            cache_write(cache / filename, image.tobytes('png'))
        result.update(status='RENDERED', filename=filename, member=member,
                      note='sourceの先頭ページ・画像のみ（内容・公開権は未確認）')
    except (Exception,) as error:
        result['note'] = str(error)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', required=True, type=Path)
    args = parser.parse_args()
    repo = Path(__file__).resolve().parents[1]
    source = args.source.resolve(strict=True)
    cache = repo / '.superpowers/drawing-library-review-cache'
    if not cache.resolve().is_relative_to((repo / '.superpowers').absolute()):
        raise ValueError('Cache symlink/escape refused')
    if cache.resolve().is_relative_to(source) or source.is_relative_to(cache.resolve()):
        raise ValueError('Cache/source overlap')
    cache.mkdir(parents=True, exist_ok=True)
    rows = json.loads((repo / 'docs/drawing-library-task0/inventory.json').read_text(encoding='utf8'))
    receipts = {}
    for row in rows:
        receipts[row['relative_path']] = render_preview(source, cache, row)
    cache_write(cache / 'previews.json', (json.dumps(receipts, ensure_ascii=False, indent=2) + '\n').encode('utf8'))
    print(json.dumps({'rendered': sum(x['status'] == 'RENDERED' for x in receipts.values()), 'unavailable': sum(x['status'] != 'RENDERED' for x in receipts.values())}))


if __name__ == '__main__':
    main()
