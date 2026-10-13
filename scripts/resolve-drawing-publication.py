"""Deterministic publication overlay; never changes source or historical ledgers."""
import argparse
from collections import Counter
import hashlib
import json
import re
from pathlib import Path
import subprocess
import zipfile
from drawing_audit import safe_member

ROOT = Path(__file__).resolve().parents[1]
LIMIT = 32 * 1024 * 1024

def read(path):
    return json.loads((ROOT / path).read_text(encoding='utf8'))

def member_signature(path, extension, members):
    result = []
    if sum(m['bytes'] for m in members) > 200 * 1024 * 1024:
        raise ValueError('Archive total limit')
    for member in members:
        name = member['name']
        if not safe_member(name) or not member.get('safe') or member.get('encrypted') or member['bytes'] > LIMIT:
            raise ValueError('Unsafe/encrypted/oversize member')
        if name.endswith('/') or not member['bytes'] or Path(name).name.lower() == 'thumbs.db':
            continue
        if extension == '.zip':
            with zipfile.ZipFile(path) as archive:
                info = archive.getinfo(name)
                if info.file_size > LIMIT or info.file_size > max(1, info.compress_size) * 1000:
                    raise ValueError('Expansion limit')
                with archive.open(info) as stream:
                    data = stream.read(LIMIT + 1)
        elif extension == '.rar':
            with path.open('rb') as stream:
                process = subprocess.Popen(['tar', '-xOf', '-', '--', name], stdin=stream, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
                from threading import Timer
                timer = Timer(10, process.kill)
                timer.start()
                try:
                    data = process.stdout.read(LIMIT + 1)
                    if len(data) > LIMIT:
                        process.kill()
                    code = process.wait(timeout=11)
                finally:
                    timer.cancel()
                    process.stdout.close()
                if code:
                    raise ValueError('Member encoding/reader unsupported')
        else:
            raise ValueError('Unsupported archive')
        if len(data) != member['bytes']:
            raise ValueError('Member size drift')
        result.append((len(data), hashlib.sha256(data).hexdigest()))
    return sorted(result)

def generate(source):
    old = read('src/data/drawing-library/records.proposed.json')
    downloads = read('src/data/drawing-library/downloads.proposed.json')
    groups = read('src/data/drawing-library/grouping-review-queue.json')
    titles = {t['relative_path']: t for t in read('docs/drawing-library-task0/title-candidate-ledger.json')}
    snapshot = read('src/data/legacy-compatibility.json')
    by_id = {r['id']: r for r in old}
    by_path = {d['source_path']: d for d in downloads if d['source_path']}
    decisions = []
    for d in downloads:
        if d['duplicate_status'] != 'PROBABLE_DUPLICATE':
            continue
        group = next(g for g in groups if d['source_path'] in g['source_paths'])
        peer = by_id.get(group['task0_candidate_group'])
        decision = 'REVIEW_REQUIRED'
        evidence = ['Same model candidate; container equality not assumed.']
        reuse = None
        if source and peer and peer['legacy']['canonical_url']:
            target = ROOT / ('public' + next(u for u in peer['legacy']['existing_download_urls'] if u.startswith('/downloads/drawings/')))
            try:
                if target.stat().st_size != peer['downloads'][0]['bytes'] or hashlib.sha256(target.read_bytes()).hexdigest() != peer['downloads'][0]['sha256']:
                    raise ValueError('Existing target SHA/size drift')
                sig = member_signature(source / d['source_path'], d['extension'], d['archive_members'])
                with zipfile.ZipFile(target) as z:
                    if any(not safe_member(i.filename) or i.file_size > LIMIT or i.file_size > max(1,i.compress_size)*1000 for i in z.infolist()) or sum(i.file_size for i in z.infolist()) > 200*1024*1024:
                        raise ValueError('Existing member safety/expansion limit')
                    other = sorted((i.file_size, hashlib.sha256(z.read(i)).hexdigest()) for i in z.infolist() if not i.is_dir() and i.file_size and Path(i.filename).name.lower() != 'thumbs.db') if target.suffix == '.zip' else []
                if sig and sig == other:
                    decision = 'DUPLICATE_CONFIRMED'
                    reuse = peer['downloads'][0]['id']
                    evidence = ['All nonempty document member sizes and SHA-256 multiset equal; directory prefixes/Thumbs.db excluded.', 'Source ' + d['sha256'], 'Existing ' + peer['downloads'][0]['sha256']]
                else:
                    decision = 'SAME_MODEL_DIFFERENT_DESIGN'
                    evidence = ['Member SHA multiset differs from existing package; retain both downloads without asserting a design revision.']
            except Exception as error:
                evidence = ['CRC/size/name evidence remains insufficient for SHA identity.', str(error)]
        elif len(group['source_paths']) > 1 and source:
            for other_path in group['source_paths']:
                other_file = by_path[other_path]
                if other_file['id'] == d['id']:
                    continue
                try:
                    own_docs = [m for m in d.get('archive_members', []) if m['extension'] == '.pdf']
                    peer_docs = [m for m in other_file.get('archive_members', []) if m['extension'] == '.pdf']
                    own_sig = set(member_signature(source / d['source_path'], d['extension'], own_docs))
                    peer_sig = set(member_signature(source / other_path, other_file['extension'], peer_docs))
                    if own_sig and peer_sig and own_sig.intersection(peer_sig):
                        decision = 'SAME_MODEL_DIFFERENT_VERSION'
                        evidence = ['Shared PDF member SHA verified; package file inventories differ. This is a package variant, not an asserted aircraft design revision.', other_file['id']]
                        break
                except Exception:
                    continue
            if decision == 'REVIEW_REQUIRED':
                evidence = ['Same model identifier; design/version relation not sufficiently established. Retain both packages.']
        decisions.append({'download_id': d['id'], 'decision': decision, 'evidence': evidence, 'reuse_download_id': reuse})
    if not source:
        # Offline replay retains SHA receipts, never upgrades identity without source evidence.
        saved = ROOT / 'src/data/drawing-library/publication.json'
        if saved.exists():
            decisions = json.loads(saved.read_text(encoding='utf8'))['dedup_decisions']
    decision_map = {d['download_id']: d for d in decisions}
    records = []
    group_receipts = []
    for group in groups + [{'task0_candidate_group':'drawing-fighter-ultralight','source_paths':[]}]:
        ident = group['task0_candidate_group']
        previous = by_id.get(ident)
        paths = group['source_paths']
        first = titles.get(paths[0], {}) if paths else {}
        record = {'id':ident,'slug':ident.removeprefix('drawing-'),'title_ja':previous['title_ja'] if previous else first.get('title_ja_candidate', ident),'title_original':previous['title_original'] if previous else first.get('title_original', ident), 'category': previous['category'] if previous else ('エンジン・製作資料' if 'engine' in ident else '機体の設計図'), 'publication_right':'REVIEW_REQUIRED','publication_status':'READY_FOR_OWNER_PUBLICATION_APPROVAL','existing':bool(previous and previous['legacy']['canonical_url']), 'legacy':previous['legacy'] if previous else {'canonical_url':None,'wordpress_ids':[],'legacy_urls':[]},'source_paths':paths, 'downloads':[], 'tags':[], 'tag_confidence':[]}
        if record['existing']:
            record['downloads'] = [previous['downloads'][0]['id']]
            record['featured_image'] = previous.get('featured_image')
        for path in paths:
            d = by_path[path]
            dec = decision_map.get(d['id'], {})
            if d['duplicate_status'] == 'EXACT_DUPLICATE' or dec.get('decision') == 'DUPLICATE_CONFIRMED':
                continue
            record['downloads'].append(d['id'])
        split = any('.part' in p.lower() for p in paths)
        nested = any(m['extension'] in ['.zip','.rar','.7z'] for p in paths for m in by_path[p].get('archive_members', []))
        status = 'REVIEW_REQUIRED' if split or nested else 'SINGLE_PACKAGE' if len(paths) <= 1 else 'SAME_MODEL_DOWNLOAD_SET'
        if split:
            record['title_ja'] = re.sub(r'（分割\d+）', '（分割資料）', record['title_ja'])
        record['grouping_status'] = status
        record['grouping_notes'] = 'Split/nested package contents not reconstructed; keep parts/containers intact.' if split or nested else 'Logical model/package grouping only; separate designs and versions retain individual downloads.'
        if paths:
            group_receipts.append({'id':ident,'status':status,'source_paths':paths,'evidence':record['grouping_notes']})
        text = ' '.join([record['title_ja'],record['title_original'],ident] + paths + [m['name'] for p in paths for m in by_path[p].get('archive_members', [])])
        rules = [('軽飛行機',r'軽飛行機|轻型飞机|light-aircraft'),('名称・機種未確認',r'未確認'),('スチレンボード',r'スチレンボード'),('発泡素材',r'発泡|foam|泡沫'),('バルサ',r'balsa|バルサ|轻木'),('複葉機',r'双翼|複葉|pitts'),('水上機',r'水上|floatplane'),('回転翼',r'旋翼|直升|helicopter|rotorcraft'),('民間機',r'客机|cessna|赛斯纳|塞斯纳|piper'),('紙製',r'纸飞机|paper-aircraft'),('CAD',r'CAD|\.dwg|\.dxf'),('型紙',r'tiled|template|型紙'),('製作資料',r'制作|製作|manual|construction'),('エンジン資料',r'发动机|engine|涡喷|kj66'),('ジェット機',r'jet|喷气|f-14|f-15|f-18|f-22|f16|f4d|draken|mig|jas-39|su-27|su-47|su37|sr71|mirage|j-20|j10'),('軍用機',r'f-14|f-15|f-18|f-22|f117|f16|f4d|draken|mig|jas-39|su-27|su-47|su37|sr71|mirage|j-20|j10|p51|f4u|c-17'),('戦闘機',r'f4d|f-14|f-15|f-18|f-22|f16|draken|mig|jas-39|su-27|su-47|su37|mirage|j-20|j10|p51|f4u'),('スケール機',r'スケール|scale|像真'),('模型用資料',r'航模'),('RC模型',r'(?<![a-z])R/?C(?![a-z])|park[ _.-]jet|park[ _.-]flyer'),('WW2',r'二战|WW2')]
        for tag, pattern in rules:
            hit = re.search(pattern,text,re.I)
            if hit:
                record['tags'].append(tag)
                record['tag_confidence'].append({'tag':tag,'confidence':'high' if tag in ['CAD','型紙','スチレンボード','複葉機','水上機','回転翼','紙製','エンジン資料','製作資料'] else 'medium','evidence':hit.group(0),'basis':'title/path/member-name or explicit model identifier; does not imply RC applicability of every file'})
        # Engine documents are not jet aircraft merely because they say jet.
        if record['category'] == 'エンジン・製作資料':
            record['tags'] = [t for t in record['tags'] if t != 'ジェット機']
            record['tag_confidence'] = [t for t in record['tag_confidence'] if t['tag'] != 'ジェット機']
        record['summary_ja'] = f"{record['title_ja']}に関する図面・製作資料です。" + ('既存公開ファイルを利用できます。' if record['existing'] else '原題とファイル情報を確認できます。再配布権は確認待ちです。')
        record['route'] = next((p['target_route'] for p in snapshot['pages'] if record['existing'] and p.get('download_id') is not None and str(p.get('download_id')) == str(record['legacy'].get('wordpress_id'))), '/drawinglibrary/'+record['slug']+'/')
        records.append(record)
    for d in downloads:
        d['target_url'] = next((u for r in old for u in r['legacy']['existing_download_urls'] if d['source_path'] is None and d['id'] in [x['id'] for x in r['downloads']] and u.startswith('/downloads/drawings/')), None)
        if not d['target_url']:
            d['target_url'] = '/downloads/drawings/staged/' + d['sha256'] + d['extension']
        d['publication_right'] = 'REVIEW_REQUIRED'
    for record in records:
        staged = [d for d in downloads if d['id'] in record['downloads'] and d['source_path']]
        split_fingerprint = hashlib.sha256(''.join(d['sha256'] for d in sorted(staged,key=lambda x:x['filename_original'])).encode()).hexdigest()[:16]
        for d in staged:
            part = re.search(r'\.part(\d+)\.rar$',d['filename_original'],re.I)
            filename = record['slug'] + '-' + split_fingerprint + '.part' + part.group(1) + '.rar' if part else record['slug'] + '-' + d['sha256'][:16] + d['extension']
            d['target_url'] = '/downloads/drawings/staged/' + filename
        if staged:
            record['preview_url'] = '/images/drawings/staged/' + staged[0]['sha256'] + '.png'
    counts = Counter(t for r in records for t in r['tags'])
    return {'baseline':'934dc99265771f595a94481ec8619379100d13a9','records':records,'downloads':downloads,'tags':[{'tag':t,'records':n} for t,n in sorted(counts.items())],'dedup_decisions':decisions,'grouping_resolution':group_receipts,'title_resolution':[dict(t, status='DISPLAY_READY_WITH_UNCERTAINTY' if t['confidence'] != 'high' else 'DISPLAY_READY') for t in titles.values() if t['confidence'] != 'high'],'publication_status':'READY_FOR_OWNER_PUBLICATION_APPROVAL'}

if __name__ == '__main__':
    p=argparse.ArgumentParser();p.add_argument('--source',type=Path);args=p.parse_args()
    if args.source:
        from drawing_audit import digest
        for row in read('docs/drawing-library-task0/inventory.json'):
            path=args.source/row['relative_path']
            if not safe_member(row['relative_path']) or not path.resolve().is_relative_to(args.source.resolve()) or path.stat().st_size != row['bytes'] or digest(path) != row['sha256']:
                raise ValueError('Source inventory drift')
    result=generate(args.source)
    (ROOT/'src/data/drawing-library/publication.json').write_text(json.dumps(result,ensure_ascii=False,sort_keys=True,indent=2)+'\n',encoding='utf8')
    print(json.dumps({'records':len(result['records']),'downloads':len(result['downloads']),'decisions':dict(Counter(d['decision'] for d in result['dedup_decisions'])),'grouping':dict(Counter(g['status'] for g in result['grouping_resolution']))}))
