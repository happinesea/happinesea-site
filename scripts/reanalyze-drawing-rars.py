"""Bounded local 7-Zip analysis; originals and publication rights are immutable."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import subprocess
import unicodedata
from threading import Timer
import zipfile

ROOT = Path(__file__).resolve().parents[1]
MAX_MEMBER = 256 * 1024 * 1024
MAX_TOTAL = 512 * 1024 * 1024
MAX_COUNT = 3000
MAX_DEPTH = 2
ARCHIVES = {'.rar', '.zip', '.7z'}
IMAGES = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tif', '.tiff'}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def fingerprint(path):
    stat = path.stat()
    return {'bytes': stat.st_size, 'mtime_ns': stat.st_mtime_ns, 'sha256': sha(path.read_bytes())}


def safe_name(name):
    name = name.replace('\\', '/')
    if not name or name.startswith('/') or any(ord(c) < 32 for c in name):
        raise ValueError('Absolute/empty/control path')
    parts = name.rstrip('/').split('/')
    for part in parts:
        if part in {'', '.', '..'} or part.endswith((' ', '.')) or any(c in part for c in ':<>"|?*'):
            raise ValueError('Traversal/abnormal Windows path')
        if re.fullmatch(r'(?i)(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\..*)?', part):
            raise ValueError('Reserved Windows path')
    return '/'.join(parts)


def parse_listing(text):
    header, separator, body = text.partition('----------')
    if not separator:
        raise ValueError('No complete member listing')
    members = []
    for block in re.split(r'\r?\n\s*\r?\n', body.strip()):
        row = dict(line.split(' = ', 1) for line in block.splitlines() if ' = ' in line)
        if 'Path' not in row:
            continue
        name = safe_name(row['Path'])
        if row.get('Encrypted') == '+' or any(row.get(k) == '+' for k in ['Symbolic Link', 'Hard Link', 'Reparse']):
            raise ValueError('Encrypted/linked member')
        if any('link' in k.lower() or 'reparse' in k.lower() for k in row) or 'L' in row.get('Attributes', ''):
            raise ValueError('Linked/reparse-like member')
        members.append({'name': name, 'raw_name': row['Path'], 'directory': row.get('Folder') == '+',
                        'bytes': int(row.get('Size', 0)), 'method': row.get('Method'),
                        'crc32': row.get('CRC'), 'extension': PurePosixPath(name).suffix.lower()})
    seen = set()
    for m in members:
        key = unicodedata.normalize('NFC', m['name']).casefold()
        if key in seen:
            raise ValueError('Filename normalization collision')
        seen.add(key)
        if m['bytes'] > MAX_MEMBER or m['bytes'] < 0:
            raise ValueError('Member expansion limit')
    if len(members) > MAX_COUNT or sum(m['bytes'] for m in members) > MAX_TOTAL:
        raise ValueError('Archive expansion limit')
    files = {unicodedata.normalize('NFC', m['name']).casefold() for m in members if not m['directory']}
    if any('/'.join(unicodedata.normalize('NFC', m['name']).casefold().split('/')[:i]) in files
           for m in members for i in range(1, len(m['name'].split('/')))):
        raise ValueError('File/directory collision')
    return header, members


def seven(tool, args, limit=MAX_MEMBER):
    # stderr is bounded separately through a temporary file to avoid pipe deadlock.
    from tempfile import TemporaryFile
    with TemporaryFile() as error:
        process = subprocess.Popen([str(tool), *args], stdout=subprocess.PIPE, stderr=error,
                                   stdin=subprocess.DEVNULL)
        timer = Timer(60, process.kill)
        timer.start()
        try:
            data = process.stdout.read(limit + 1)
            if len(data) > limit:
                process.kill()
                raise ValueError('7-Zip output limit')
            code = process.wait(timeout=62)
            error.seek(0)
            message = error.read(4096).decode('utf8', errors='replace')
            if code:
                raise ValueError(f'7-Zip exit {code}: {message}')
            return data
        finally:
            timer.cancel()
            if process.poll() is None:
                process.kill()
            process.wait()
            process.stdout.close()


def stable_zip(path, members, work):
    with zipfile.ZipFile(path, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for m in sorted(members, key=lambda m: m['name']):
            info = zipfile.ZipInfo(m['name'] + ('/' if m['directory'] else ''), (1980, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = (0o40755 if m['directory'] else 0o100644) << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, b'' if m['directory'] else (work / m['sha256']).read_bytes(), compresslevel=9)
    with zipfile.ZipFile(path) as archive:
        if archive.testzip() is not None:
            raise ValueError('Derived ZIP CRC failure')
        for m in members:
            if not m['directory'] and sha(archive.read(m['name'])) != m['sha256']:
                raise ValueError('Derived member SHA mismatch')


def convert_tree(row, work):
    if row['status'] != 'ANALYZED':
        raise ValueError('Archive tree requires review')
    nested = {n['member']: n for n in row.get('nested', [])}
    members = []
    mappings = []
    for original in row['members']:
        member = dict(original)
        if member['name'] in nested:
            child = nested[member['name']]
            convert_tree(child, work)
            data = (work / child['derived_zip_path']).read_bytes()
            target = work / sha(data)
            if not target.exists():
                target.write_bytes(data)
            member.update(name=str(PurePosixPath(member['name']).with_suffix('.zip')),
                          sha256=sha(data), bytes=len(data), extension='.zip')
            mappings.append({'source_member': original['name'], 'source_sha256': original['sha256'],
                             'distribution_member': member['name'], 'derived_sha256': member['sha256']})
        members.append(member)
    # Renaming nested RAR to ZIP must not collide with an existing ZIP name.
    synthetic = 'header\n----------\n' + '\n\n'.join(f"Path = {m['name']}\nFolder = {'+' if m['directory'] else '-'}\nSize = {m['bytes']}" for m in members)
    parse_listing(synthetic)
    filename = row['source_archive_sha256'] + '.zip'
    path = work / filename
    replay = work / (row['source_archive_sha256'] + '.replay.zip')
    stable_zip(path, members, work)
    stable_zip(replay, members, work)
    if sha(path.read_bytes()) != sha(replay.read_bytes()):
        raise ValueError('Non-deterministic ZIP')
    replay.unlink()
    row.update(derived_zip_path=filename, derived_zip_sha256=sha(path.read_bytes()),
               derived_zip_bytes=path.stat().st_size, distribution_members=members, nested_conversion=mappings)


def describe(data, extension):
    result = {'type': 'other', 'role_candidate': 'unknown'}
    if extension in ARCHIVES:
        return {'type': 'archive', 'role_candidate': 'reference'}
    if extension in {'.dxf', '.dwg', '.dwl', '.iges', '.igs', '.step', '.stp'}:
        return {'type': 'cad', 'role_candidate': 'cad'}
    if extension in {'.txt', '.doc', '.docx', '.xls', '.xlsx'}:
        result.update(type='document', role_candidate='instruction' if extension not in {'.xls', '.xlsx'} else 'parts_list')
    if extension in IMAGES or extension == '.pdf':
        import pymupdf as fitz
        try:
            with fitz.open(stream=data, filetype=extension.lstrip('.')) as document:
                result.update(type='pdf' if extension == '.pdf' else 'image',
                              role_candidate='drawing' if extension == '.pdf' else 'preview_image',
                              page_count=len(document), document_title=document.metadata.get('title', ''),
                              first_page_text=document[0].get_text()[:3000] if extension == '.pdf' else '',
                              dimensions=[document[0].rect.width, document[0].rect.height])
                if extension in IMAGES:
                    native = fitz.Pixmap(data)
                    result['dimensions'] = [native.width, native.height]
        except Exception as error:
            result['decode_error'] = str(error)
    return result


def analyze(tool, path, work, depth=0, budget=None):
    budget = budget if budget is not None else {'bytes': 0, 'count': 0}
    listing = seven(tool, ['l', '-slt', '-sccUTF-8', '-pNO_PASSWORD_ALLOWED', '--', str(path)], 8 * 1024 * 1024).decode('utf8')
    header, members = parse_listing(listing)
    if sum(m['bytes'] for m in members) > max(1, path.stat().st_size) * 1000:
        raise ValueError('Compression expansion ratio limit')
    result = {'status': 'ANALYZED', 'listing': listing, 'members': members, 'source_archive_sha256': sha(path.read_bytes()),
              'member_count': len(members), 'uncompressed_bytes': sum(m['bytes'] for m in members),
              'methods': sorted({m['method'] for m in members if m['method']}),
              'multivolume': 'Multivolume = +' in header, 'encrypted': False, 'nested': []}
    for m in members:
        if m['directory']:
            continue
        budget['bytes'] += m['bytes']
        budget['count'] += 1
        if budget['bytes'] > MAX_TOTAL or budget['count'] > MAX_COUNT:
            raise ValueError('Nested cumulative expansion limit')
        data = seven(tool, ['x', '-so', '-spd', '-pNO_PASSWORD_ALLOWED', '--', str(path), m['raw_name']], m['bytes'])
        if len(data) != m['bytes']:
            raise ValueError('Extracted member size mismatch')
        m['sha256'] = sha(data)
        m.update(describe(data, m['extension']))
        target = work / m['sha256']
        if not target.exists():
            with target.open('xb') as stream:
                stream.write(data)
        if m['extension'] in ARCHIVES:
            if depth >= MAX_DEPTH:
                result['nested'].append({'member': m['name'], 'status': 'REVIEW_REQUIRED', 'reason': 'Nested depth limit'})
            else:
                try:
                    nested = analyze(tool, target, work, depth + 1, budget)
                    nested['member'] = m['name']
                    result['nested'].append(nested)
                except Exception as error:
                    result['nested'].append({'member': m['name'], 'status': 'REVIEW_REQUIRED', 'reason': str(error)})
    if any(n['status'] != 'ANALYZED' for n in result['nested']):
        result['status'] = 'REVIEW_REQUIRED'
    return result


def main():
    import sys
    sys.stdout.reconfigure(encoding='utf8')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--sevenzip', type=Path, default=Path('C:/Program Files/7-Zip/7z.exe'))
    args = parser.parse_args()
    source = args.source.resolve(strict=True)
    boundary = (ROOT / '.superpowers').resolve()
    work = boundary / 'drawing-rar-work'
    if work.exists() and (work.is_symlink() or work.resolve() != work):
        raise ValueError('Linked work directory')
    if work.is_relative_to(source) or source.is_relative_to(work):
        raise ValueError('Source/work overlap')
    work.mkdir(parents=True, exist_ok=True)
    if any(p.is_symlink() or (p.is_file() and p.stat().st_nlink > 1) for p in work.rglob('*')):
        raise ValueError('Linked local artifact')
    version = seven(args.sevenzip, ['i'], 1024 * 1024).decode('utf8').splitlines()[1]
    paths = sorted(source.rglob('*.rar'))
    before = {str(p.relative_to(source)): fingerprint(p) for p in paths}
    previous = work / 'receipt.json'
    if previous.exists() and json.loads(previous.read_text(encoding='utf8'))['source_before'] != before:
        raise ValueError('RAR source drift since first inventory')
    receipt = {'tool': str(args.sevenzip), 'version': version, 'source_before': before, 'archives': []}
    for path in paths:
        relative = str(path.relative_to(source))
        row = {'source_rar_path': relative, 'filename': path.name, **before[relative], 'source_rar_sha256': before[relative]['sha256']}
        if path.is_symlink() or not path.resolve().is_relative_to(source):
            raise ValueError('Linked/escaped source')
        try:
            if re.search(r'(?i)\.part[2-9][0-9]*\.rar$', path.name):
                listing = seven(args.sevenzip, ['l', '-slt', '-sccUTF-8', '-pNO_PASSWORD_ALLOWED', '--', str(path)], 8 * 1024 * 1024).decode('utf8')
                header, members = parse_listing(listing)
                row.update(status='SPLIT_CONTINUATION', split=True, listing=listing, members=members,
                           member_count=len(members), uncompressed_bytes=sum(m['bytes'] for m in members), encrypted=False,
                           methods=sorted({m['method'] for m in members if m['method']}),
                           note='Continuation volume; full member SHA is recorded under first-volume inventory.')
            else:
                row.update(analyze(args.sevenzip, path, work))
                if any(n['status'] != 'ANALYZED' for n in row['nested']):
                    raise ValueError('Nested archive requires review; conversion withheld')
                convert_tree(row, work)
                row['split'] = row['multivolume']
        except Exception as error:
            row.update(status='REVIEW_REQUIRED', reason=str(error))
        receipt['archives'].append(row)
        print(path.name, row['status'], flush=True)
    after = {str(p.relative_to(source)): fingerprint(p) for p in sorted(source.rglob('*.rar'))}
    if before != after:
        raise ValueError('Original RAR changed')
    receipt['source_unchanged'] = True
    (work / 'receipt.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    print(json.dumps(dict(Counter(r['status'] for r in receipt['archives']))))


if __name__ == '__main__':
    main()
