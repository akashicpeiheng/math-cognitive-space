"""Verify final source hashes and record only this revision's scoped changes."""
from pathlib import Path
import datetime as dt
import difflib
import json
import re
import sys
import evidence
import kernel as K
from run_record import ROOT,REV

HERE=Path(__file__).resolve().parent
FOUNDATIONS=HERE.parents[1]

def main():
    evidence.validate(K.load(HERE/'claims.json'))
    reports=['kernel-report.json','action-report.json','research-report.json','evidence-report.json','replay-report.json']
    for name in reports: K.need(K.load(HERE/name)['status']=='passed','nonpassing final report '+name)
    K.need(K.load(HERE/'evidence-report.json')['manifest_sha256']==K.file_hash(HERE/'claims.json'),'stale evidence report')
    K.need(K.load(HERE/'replay-report.json')['claims_sha256']==K.file_hash(HERE/'claims.json'),'stale replay report')
    sources=K.load(FOUNDATIONS/'edition/sources.json')
    for s in sources: K.need(K.file_hash(FOUNDATIONS/s['source'])==s['sha256'],'stale monograph source: '+s['source'])
    finite=K.load(FOUNDATIONS/'validation/report.json')
    K.need(all(x['status']=='passed' for x in finite['checks']),'old regression failure')
    for name,d in finite['manuscript_sha256'].items(): K.need(K.file_hash(FOUNDATIONS/name)==d,'stale finite report source: '+name)
    baseline=K.load(REV/'baseline.json')
    changed=[]; untouched=[]; diffs=[]
    for old in baseline['files']:
        path=ROOT/old['path']; now=K.file_hash(path)
        if now!=old['sha256']:
            K.need(old['path'].startswith('mcs-foundations/'),'unexpected non-foundations edit: '+old['path'])
            changed.append({'path':old['path'],'before_sha256':old['sha256'],'after_sha256':now,'backup':old['backup']})
            if path.suffix in ['.md','.py'] and 'edition/' not in old['path'] and not old['path'].endswith('A-定义与定理索引.md'):
                before=Path(old['backup']).read_text(encoding='utf-8').splitlines(keepends=True)
                after=path.read_text(encoding='utf-8').splitlines(keepends=True)
                diffs.extend(difflib.unified_diff(before,after,fromfile='before/'+old['path'],tofile='after/'+old['path']))
        else: untouched.append(old['path'])
    commands=[json.loads(line) for line in (REV/'commands.jsonl').read_text(encoding='utf-8').splitlines()]
    for row in commands: K.need(K.file_hash(row['log'])==row['log_sha256'],'command log changed')
    # Actual last run of every invoked command determines its current status.
    latest={tuple(row['command']):row for row in commands}
    K.need(all(row['exit_code']==0 for row in latest.values()),'latest recorded command failed')
    K.need(any('planner_tests.mjs' in ' '.join(r['command']) and r['exit_code']==0 for r in commands),'site semantic regression not run')
    required=[('0',['TASKS.md']),('1',['evidence-report.json']),('2',['kernel-report.json']),('3',['kernel-report.json']),('4',['action-report.json','CASES.md']),('5',['research-report.json','RESEARCH.md']),('6',['replay-report.json'])]
    progress=K.load(HERE/'progress.json')
    for stage,names in required:
        progress['stages'][stage]={'status':'passed','evidence':[evidence.pinned(HERE/name) for name in names],
                                    'scope':'scoped minimal deliverable; external obligations retained'}
    progress['completed_utc']=dt.datetime.now(dt.timezone.utc).isoformat()
    progress['final_checks']={'monograph_sources_verified':len(sources),'finite_regressions':len(finite['checks']),
                              'site':'33 Node semantic checks; no site code change; browser not rerun',
                              'tex_pdf':'old exports, not rebuilt'}
    evidence.save(HERE/'progress.json',progress)
    (REV/'source-changes.diff').write_text(''.join(diffs),encoding='utf-8')
    added=[{'path':str(p.relative_to(ROOT)).replace('\\','/'),'sha256':K.file_hash(p)} for p in sorted(HERE.rglob('*')) if p.is_file() and '__pycache__' not in p.parts]
    summary={'schema':'mcs-scoped-revision/1','finished_utc':progress['completed_utc'],
             'baseline':str(REV/'baseline.json'),'changed_existing_files':changed,'added_files':added,
             'unchanged_baseline_files':untouched,'commands':commands,
             'input_advice':{'path':'E:/下载/给出专业的建议和方向-2026-09-29.md','sha256':K.file_hash('E:/下载/给出专业的建议和方向-2026-09-29.md')},
             'monograph_sources_verified':len(sources),'not_claimed':progress['external_obligations'],
             'note':'No git commit created; baseline work remains user-owned. This manifest and append-only command ledger are excluded from their own hashes.'}
    evidence.save(REV/'revision.json',summary)
    # New explanatory documents also get a local-link check, beyond original V11.
    for p in HERE.glob('*.md'):
        for target in re.findall(r'\[[^\]\n]*\]\(([^)\n]+)\)',p.read_text(encoding='utf-8')):
            target=target.strip('<>')
            if target.startswith(('http://','https://','#')): continue
            K.need((p.parent/target.split('#')[0]).exists(),'broken new documentation link: '+str(p)+' -> '+target)
    print(json.dumps({'status':'passed','changed_existing_files':len(changed),'new_files':len(added),'verified_edition_sources':len(sources),'all_stages':'scoped delivery passed'}))

if __name__=='__main__': main()
