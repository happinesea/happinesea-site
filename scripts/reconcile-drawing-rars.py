"""Member-grounded overlay and local previews; no production rights promotion."""
from collections import Counter
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path, PureWindowsPath
import re
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / '.superpowers/drawing-rar-work'
spec = importlib.util.spec_from_file_location('rar_analysis', ROOT / 'scripts/reanalyze-drawing-rars.py')
rar = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rar)


def read(path):
    return json.loads((ROOT / path).read_text(encoding='utf8'))


def leaves(row, prefix=''):
    nested = {n['member']: n for n in row.get('nested', []) if n['status'] == 'ANALYZED'}
    result = []
    for member in row.get('members', []):
        if member['directory']:
            continue
        if member['name'] in nested:
            result.extend(leaves(nested[member['name']], prefix + member['name'] + '!/'))
        else:
            result.append(dict(member, evidence_path=prefix + member['name']))
    return result


def signature(members):
    return sorted((m['bytes'], m['sha256']) for m in members
                  if m['bytes'] and Path(m['name']).name.lower() != 'thumbs.db')


def existing_members(download):
    path = ROOT / 'public' / download['target_url'].lstrip('/')
    if download['extension'] != '.zip':
        return [{'name': download['filename_original'], 'bytes': download['bytes'], 'sha256': rar.sha(path.read_bytes())}]
    with zipfile.ZipFile(path) as archive:
        return [{'name': i.filename, 'bytes': i.file_size, 'sha256': rar.sha(archive.read(i))}
                for i in archive.infolist() if not i.is_dir()]


def make_preview(members, destination):
    import pymupdf as fitz
    choices = [m for m in members if m.get('dimensions') and m['type'] in {'image', 'pdf'}]
    def rank(m):
        name = m['name'].lower()
        preferred = any(s in name for s in ['cover', 'overall', 'assembly drawing', '3veiw', '总体', '总图', '完成', 'foxie.jpg'])
        accessory = any(s in name for s in ['decal', 'logo', 'icon', 'rudder', '翼肋', '垂尾'])
        return (m['type'] == 'pdf', accessory, not preferred, m['name'])
    for m in sorted(choices, key=rank):
        width, height = m['dimensions']
        if width <= 0 or height <= 0 or width * height > 40_000_000:
            continue
        if m['type'] == 'image' and (min(width, height) < 160 or m['bytes'] < 5000):
            continue
        try:
            with fitz.open(stream=(WORK / m['sha256']).read_bytes(), filetype=m['extension'].lstrip('.')) as document:
                page = document[0]
                scale = min(1200 / page.rect.width, 800 / page.rect.height, width / page.rect.width if m['type'] == 'image' else 2)
                pixmap = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
                data = pixmap.tobytes('png')
                # Decode the artifact as well as the original.
                fitz.Pixmap(data)
                destination.write_bytes(data)
                return {'status': 'RECOVERED_SOURCE_PREVIEW', 'member': m['evidence_path'],
                        'member_sha256': m['sha256'], 'thumbnail_sha256': rar.sha(data),
                        'dimensions': [pixmap.width, pixmap.height]}
        except Exception:
            continue
    return None


def main():
    sys.stdout.reconfigure(encoding='utf8')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True, help='Original 71-file root')
    source_root = parser.parse_args().source.resolve(strict=True)
    if WORK.resolve(strict=True) != WORK or WORK.is_symlink() or WORK.is_relative_to(source_root) or source_root.is_relative_to(WORK):
        raise ValueError('Linked/overlapping reanalysis workspace')
    if any(p.is_symlink() or (p.is_file() and p.stat().st_nlink > 1) for p in WORK.rglob('*')):
        raise ValueError('Linked local artifact')
    receipt = read('.superpowers/drawing-rar-work/receipt.json')
    base = read('src/data/drawing-library/publication.json')
    downloads = {d['id']: d for d in base['downloads']}
    by_sha = {d['sha256']: d for d in base['downloads'] if d['source_path']}
    archives = receipt['archives']
    rows = {a['sha256']: a for a in archives if a['status'] == 'ANALYZED'}
    for a in archives:
        if a['sha256'] not in by_sha:
            raise ValueError('RAR is not in original 71-source inventory')
    decisions = []
    records = json.loads(json.dumps(base['records']))
    for old in base['dedup_decisions']:
        download = downloads[old['download_id']]
        row = rows.get(download['sha256'])
        decision = dict(old, previous_decision=old['decision'])
        if row:
            source_members = leaves(row)
            peers = [d for d in base['downloads'] if d['id'] != download['id'] and
                     any(download['id'] in r['downloads'] and d['id'] in r['downloads'] for r in records)]
            if old.get('reuse_download_id'):
                peers.insert(0, downloads[old['reuse_download_id']])
            decision.update(decision='UNIQUE', evidence=['All safe source members read and SHA-256 recorded.'])
            for peer in peers:
                other = rows.get(peer['sha256'])
                pm = leaves(other) if other else existing_members(peer) if peer['source_path'] is None else []
                if not pm:
                    continue
                if signature(source_members) == signature(pm):
                    decision.update(decision='EXACT_MEMBER_DUPLICATE', reuse_download_id=peer['id'],
                                    evidence=['Equal nonempty member size/SHA-256 multiset; Thumbs.db and directory prefixes excluded.'])
                    for record in records:
                        if download['id'] in record['downloads']:
                            record['downloads'] = list(dict.fromkeys(peer['id'] if i == download['id'] else i for i in record['downloads']))
                    break
                shared = set(signature(source_members)) & set(signature(pm))
                if shared:
                    decision.update(decision='SAME_MODEL_DIFFERENT_VERSION', reuse_download_id=None,
                                    evidence=[f'{len(shared)} equal member payloads with differing supplementary members; both distributions retained.'],
                                    peer_download_id=peer['id'])
        elif old['decision'] == 'DUPLICATE_CONFIRMED':
            decision['decision'] = 'EXACT_MEMBER_DUPLICATE'
        decisions.append(decision)
    # A first-volume ZIP contains the complete split set. Keep part2 in source evidence only.
    for record in records:
        continuation = [i for i in record['downloads'] if re.search(r'(?i)\.part[2-9][0-9]*\.rar$', downloads[i]['filename_original'])]
        if continuation and any(rows.get(downloads[i]['sha256'], {}).get('multivolume') for i in record['downloads']):
            record['downloads'] = [i for i in record['downloads'] if i not in continuation]
    distributions = []
    active = {i for record in records for i in record['downloads']}
    repacked_source_zips = []
    for download in downloads.values():
        if download['id'] in active and download['source_path'] and download['extension'] == '.zip' and any(
                m['extension'] == '.rar' for m in download.get('archive_members', [])):
            source_zip = source_root / download['source_path']
            if rar.sha(source_zip.read_bytes()) != download['sha256']:
                raise ValueError('Original ZIP drift')
            converted = rar.analyze(Path(receipt['tool']), source_zip, WORK)
            rar.convert_tree(converted, WORK)
            converted.update(sha256=download['sha256'], source_zip_path=download['source_path'], filename=download['filename_original'])
            rows[download['sha256']] = converted
            repacked_source_zips.append(converted)
    payloads = set()
    for row in rows.values():
        download = by_sha[row['sha256']]
        if download['id'] not in active:
            continue
        if row['derived_zip_bytes'] >= 100 * 1024 * 1024:
            raise ValueError('ZIP exceeds Git file ceiling; owner storage decision required')
        payload = tuple(signature(leaves(row)))
        if payload in payloads:
            raise ValueError('Duplicate ZIP payload in active mapping')
        payloads.add(payload)
        record = next(r for r in records if download['id'] in r['downloads'])
        distributions.append({'download_id': download['id'], 'source_rar_path': row.get('source_rar_path'),
                              'source_rar_sha256': row['sha256'], 'derived_zip_path': row['derived_zip_path'],
                              'sha256': row['derived_zip_sha256'], 'bytes': row['derived_zip_bytes'],
                              'target_url': '/downloads/drawings/staged/' + record['slug'] + '-' + row['derived_zip_sha256'][:16] + '.zip',
                              'extension': '.zip', 'conversion_tool': '7-Zip stdout extraction + Python zipfile DEFLATE',
                              'conversion_tool_version': receipt['version'], 'publication_right': 'REVIEW_REQUIRED'})
        if row.get('source_zip_path'):
            distributions[-1]['source_zip_path'] = row['source_zip_path']
            distributions[-1]['source_zip_sha256'] = row['sha256']
            distributions[-1]['source_rar_sha256'] = None
        if row['multivolume']:
            stem = re.sub(r'(?i)\.part1\.rar$', '', row['filename'])
            distributions[-1]['source_rar_parts'] = [{'path': a['source_rar_path'], 'sha256': a['sha256']}
                                                     for a in archives if re.fullmatch(re.escape(stem) + r'(?i:\.part\d+\.rar)', a['filename'])]
    previews = read('.superpowers/drawing-library-review-cache/previews.json')
    known_member_hashes = {m['sha256'] for row in rows.values() for m in leaves(row)}
    known_member_hashes.update(m['sha256'] for d in downloads.values() if d['source_path'] is None for m in existing_members(d))
    for download in downloads.values():
        if download['source_path'] and download['extension'] == '.zip':
            with zipfile.ZipFile(source_root / download['source_path']) as archive:
                for info in archive.infolist():
                    rar.safe_name(info.filename)
                    if not info.is_dir():
                        if info.file_size > rar.MAX_MEMBER or info.flag_bits & 1:
                            raise ValueError('Unsafe peer ZIP')
                        known_member_hashes.add(rar.sha(archive.read(info)))
    exact_checks = []
    for download in downloads.values():
        if download['duplicate_status'] == 'EXACT_DUPLICATE' and download['source_path']:
            binary_peer = any(d['id'] != download['id'] and d['sha256'] == download['sha256'] for d in downloads.values())
            matched = binary_peer or download['sha256'] in known_member_hashes
            if not matched:
                raise ValueError('Historical exact duplicate no longer has a SHA match')
            exact_checks.append({'download_id': download['id'], 'sha256': download['sha256'],
                                 'decision': 'EXACT_BINARY_DUPLICATE' if binary_peer else 'EXACT_MEMBER_DUPLICATE', 'sha_replay': True})
    updates = []
    explicit_titles = {
        'fuel-cad-unidentified': ('FOXIE CAD設計図', 'Nested member FOXIE.dxf and Foxie.jpg'),
        'microjet-engine': ('FD 3/67・FD3/64 模型用タービンエンジン製作資料', 'Nested first-page text and filenames retain both FD3/67 and FD3/64 identifiers'),
        'light-helicopter': ('Furia Ultralight Helicopter 設計図', 'PDF filename and document-title metadata'),
        'rotorcraft-unidentified': ('Hornet ジャイロプレーン資料', 'PDF metadata and visually checked cover: HORNET Sport Gyroplane Documentation'),
        'jet-engine-manual': ('Model Jet Engines 模型用ジェットエンジン製作資料', 'PDF metadata [模型喷气发动机] Thomas Kamps - Model Jet Engines'),
        'cessna-unidentified': ('セスナ182 図面資料（原題：赛斯纳）', 'Archive member 182SHEET2.jpg; separate record retained pending comparison to 塞斯纳182.pdf'),
    }
    missing = []
    for record in records:
        original = next(r for r in base['records'] if r['id'] == record['id'])
        related = [a for a in rows.values() if by_sha[a['sha256']]['source_path'] in record['source_paths']]
        members = list({m['sha256']: m for a in related for m in leaves(a)}.values())
        evidence = ' / '.join(m['evidence_path'] for m in members)
        previous_preview = any(previews.get(downloads[i]['source_path'], {}).get('status') == 'RENDERED' for i in original['downloads'])
        image = None
        if not record['existing']:
            image = make_preview(members, WORK / (record['id'] + '.png'))
            if image:
                origin = next(a for a in related if any(m['sha256'] == image['member_sha256'] for m in leaves(a)))
                image.update(filename=record['id'] + '.png', source_archive_sha256=origin['sha256'],
                             source_rar_sha256=None if origin.get('source_zip_path') else origin['sha256'],
                             source_zip_sha256=origin['sha256'] if origin.get('source_zip_path') else None)
                record['featured_image_status'] = 'SOURCE_PREVIEW_AVAILABLE'
            elif previous_preview:
                record['featured_image_status'] = 'PREVIOUS_SOURCE_PREVIEW_AVAILABLE'
            else:
                office = any(m['extension'] in {'.doc', '.ppt', '.xls', '.docx', '.pptx', '.xlsx'} for m in members)
                record['featured_image_status'] = 'UNSUPPORTED_DOCUMENT_PREVIEW' if office else 'MISSING_SOURCE_IMAGE' if members and not any(m['type'] in {'pdf', 'image'} for m in members) else 'PREVIEW_REVIEW_REQUIRED'
                missing.append({'id': record['id'], 'title': record['title_ja'], 'status': record['featured_image_status'],
                                'source_archives': [a['filename'] for a in related], 'checked_members': [m['evidence_path'] for m in members],
                                'pdf_presence': any(m['extension'] == '.pdf' for m in members), 'image_presence': any(m['extension'] in rar.IMAGES for m in members),
                                'embedded_image_status': 'NOT_CHECKED_UNSUPPORTED_TOOLING',
                                'fallback_used': True, 'recommended_owner_action': 'Review CAD/legacy Office in suitable offline tooling before deciding that no embedded image exists; alternatively supply a rights-approved drawing image.'})
        else:
            record['featured_image_status'] = 'EXISTING_PUBLIC_IMAGE'
        title_resolved = record['slug'] in explicit_titles
        if title_resolved:
            record['title_ja'], title_basis = explicit_titles[record['slug']]
            if record['slug'] in {'fuel-cad-unidentified', 'rotorcraft-unidentified'}:
                record['tags'] = [t for t in record['tags'] if t != '名称・機種未確認']
                record['tag_confidence'] = [t for t in record['tag_confidence'] if t['tag'] != '名称・機種未確認']
        else:
            title_basis = 'Original title retained; no stronger unambiguous member identity.'
        for missing_row in missing:
            if missing_row['id'] == record['id']:
                missing_row['title'] = record['title_ja']
        if record['grouping_status'] == 'REVIEW_REQUIRED' and related and all(n['status'] == 'ANALYZED' for a in related for n in a.get('nested', [])):
            record['grouping_status'] = 'SAME_MODEL_DOWNLOAD_SET' if len(record['downloads']) > 1 else 'SINGLE_PACKAGE'
            record['grouping_notes'] = 'Bounded recursive member inventory confirms one logical model/document package; versions remain individual downloads.'
            if record['slug'] == 'microjet-engine':
                record['model_identity_status'] = 'REVIEW_REQUIRED'
                record['grouping_notes'] = 'Nested package structure resolved. Source uses both FD3/64 and FD3/67; their design relationship is not asserted.'
        for tag, pattern in [('CAD', r'(?i)\.(?:dxf|dwg|step|stp)\b'), ('RC模型', r'(?i)park[ _-]jet|\bR/?C\b'),
                             ('スチレンボード', r'(?i)depron'), ('製作資料', r'(?i)manual|instr|制作|安装|製作')]:
            match = re.search(pattern, evidence + ' ' + ' '.join(m.get('document_title', '') for m in members))
            if match and tag not in record['tags']:
                record['tags'].append(tag)
                record['tag_confidence'].append({'tag': tag, 'confidence': 'high', 'evidence': match.group(), 'basis': 'Read member filename/PDF metadata'})
        if members:
            formats = Counter(m['extension'] or '(no extension)' for m in members)
            record['summary_ja'] = f"{record['title_ja']}に関する資料です。内部の重複payloadを除くと" + '、'.join(f'{e.lstrip(".").upper()} {n}件' for e, n in sorted(formats.items())) + 'が含まれます。原題・内部資料名を保持し、再配布権は確認待ちです。'
            if record['slug'] == 'light-helicopter':
                record['summary_ja'] += '表紙は有人ヘリコプターの製作図として示されています。RC模型用であることは確認できません。'
        updates.append({'record_id': record['id'], 'previous_title': original['title_ja'], 'title_source': title_basis,
                        'title_resolved': title_resolved, 'previous_grouping': original['grouping_status'],
                        'grouping_resolved': original['grouping_status'] == 'REVIEW_REQUIRED' and record['grouping_status'] != 'REVIEW_REQUIRED',
                        'previous_image_available': previous_preview, 'image_recovered': bool(image and not previous_preview),
                        'preview': image, 'previous_tags': original['tags'], 'tags_changed': original['tags'] != record['tags']})
    original_bytes = sum(a['bytes'] for a in archives)
    zip_bytes = sum(a.get('derived_zip_bytes', 0) for a in archives)
    selected_bytes = sum(d['bytes'] for d in distributions)
    other_bytes = sum(downloads[i]['bytes'] for i in active if i not in {d['download_id'] for d in distributions})
    def public_listing(row):
        result = dict(row)
        if 'listing' in result:
            result['listing'] = re.sub(r'(?m)^(Listing archive: |Path = )([A-Za-z]:[^\r\n]*)',
                                       lambda m: m[1] + PureWindowsPath(m[2]).name, result['listing'])
        if 'nested' in result:
            result['nested'] = [public_listing(n) for n in result['nested']]
        for member_key in ['members', 'distribution_members']:
            if member_key not in result:
                continue
            result[member_key] = []
            for member in row[member_key]:
                public_member = dict(member)
                text = public_member.pop('first_page_text', None)
                if text is not None:
                    public_member.update(first_page_text_sha256=rar.sha(text.encode('utf8')),
                                         first_page_text_characters=len(text),
                                         first_page_status='TEXT_EXTRACTED' if text.strip() else 'NO_EXTRACTABLE_TEXT')
                result[member_key].append(public_member)
        return result
    overlay = {'baseline': 'ae194413d80cf759e3a20d0963b41ef702c0ae10', 'records': records, 'distributions': distributions,
               'dedup_decisions': decisions, 'exact_duplicate_replay': exact_checks, 'updates': updates, 'missing_images': missing,
               'tags': [{'tag': t, 'records': n} for t, n in sorted(Counter(t for r in records for t in r['tags']).items())],
               'archives': [public_listing(a) for a in archives],
               'repacked_source_zips': [public_listing(a) for a in repacked_source_zips],
               'source_unchanged': receipt['source_unchanged'], 'publication_status': 'READY_FOR_OWNER_PUBLICATION_APPROVAL',
               'storage': {'original_rar_bytes': original_bytes, 'all_derived_zip_bytes': zip_bytes, 'delta_bytes': zip_bytes-original_bytes,
                           'largest_zip_bytes': max(a.get('derived_zip_bytes', 0) for a in archives),
                           'selected_zip_bytes': selected_bytes, 'publication_candidate_bytes': selected_bytes+other_bytes,
                           'active_downloads': len(active), 'duplicate_zip_payloads': 0}}
    (ROOT / 'src/data/drawing-library/rar-reanalysis.json').write_text(json.dumps(overlay, ensure_ascii=False, sort_keys=True, indent=2) + '\n', encoding='utf8')
    lines = ['# Missing source previews', '', 'No AI-generated images. These records use the existing generic fallback. Legacy Office/CAD content is inventoried but not executed.', '']
    for row in missing:
        lines.extend([f"## {row['id']} — {row['title']}", '', f"Status: {row['status']}", f"Source archives: {', '.join(row['source_archives']) or 'No RAR source; original source reviewed'}",
                      f"PDF present: {row['pdf_presence']}; image present: {row['image_presence']}; fallback: yes", '',
                      *['- ' + name for name in row['checked_members']], '', row['recommended_owner_action'], ''])
    (ROOT / 'docs/drawing-library-publication/missing-images.md').write_text('\n'.join(lines), encoding='utf8')
    print(json.dumps({'records': len(records), 'downloads': len(active), 'converted_active': len(distributions),
                      'recovered_images': sum(u['image_recovered'] for u in updates), 'missing_images': len(missing),
                      'title_resolved': sum(u['title_resolved'] for u in updates), 'grouping_resolved': sum(u['grouping_resolved'] for u in updates),
                      'decisions': dict(Counter(d['decision'] for d in decisions)), 'storage': overlay['storage']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
