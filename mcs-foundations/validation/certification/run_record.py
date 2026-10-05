"""Append-only command evidence and a scoped, non-destructive baseline snapshot."""
from pathlib import Path
import datetime as dt
import hashlib
import json
import shutil
import subprocess
import sys
import time

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
REV = ROOT / 'mcs-foundations/validation/revisions/20260929-certification'

def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def stamp():
    return dt.datetime.now(dt.timezone.utc).isoformat()

def snapshot():
    if (REV / 'baseline.json').exists():
        raise SystemExit('Baseline already exists; refusing replacement')
    paths = []
    for base in ['mcs-foundations', 'mcs-site']:
        for p in (ROOT / base).rglob('*'):
            if p.is_file() and p.suffix in {'.md', '.py', '.json', '.js', '.mjs', '.html', '.css'}:
                if not any(x in p.parts for x in ['revisions', 'node_modules', '__pycache__', 'certification']):
                    paths.append(p)
    paths += [ROOT / 'AGENTS.md', ROOT / '数学认知空间.html']
    entries = []
    for p in paths:
        if not p.exists():
            continue
        rel = p.relative_to(ROOT)
        dst = REV / 'before' / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(p, dst)
        entries.append({'path': rel.as_posix(), 'sha256': sha(p), 'backup': str(dst)})
    status = subprocess.run(['git', '-c', 'core.quotepath=false', 'status', '--porcelain=v1', '-uall'], cwd=ROOT, capture_output=True)
    (REV / 'git-status-before.txt').write_bytes(status.stdout)
    (REV / 'baseline.json').write_text(json.dumps({'started_utc': stamp(), 'files': entries, 'git_status_exit': status.returncode, 'note': 'Pre-existing work is not attributed to this revision.'}, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'snapshot': str(REV), 'files': len(entries)}))

def run(command):
    REV.mkdir(parents=True, exist_ok=True)
    ident = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%S%f')
    started = stamp()
    start = time.perf_counter()
    result = subprocess.run(command, cwd=ROOT, capture_output=True, encoding='utf-8', errors='replace')
    log = REV / f'{ident}.log'
    log.write_text(result.stdout + '\nSTDERR:\n' + result.stderr, encoding='utf-8')
    row = {'started_utc': started, 'elapsed_seconds': time.perf_counter()-start, 'cwd': str(ROOT), 'command': command, 'exit_code': result.returncode, 'log': str(log), 'log_sha256': sha(log)}
    with (REV / 'commands.jsonl').open('a', encoding='utf-8') as f:
        f.write(json.dumps(row, ensure_ascii=False) + '\n')
    print(result.stdout.encode('ascii', errors='backslashreplace').decode())
    if result.stderr:
        print(result.stderr.encode('ascii', errors='backslashreplace').decode(), file=sys.stderr)
    print(json.dumps(row, ensure_ascii=True))
    return result.returncode

if __name__ == '__main__':
    if sys.argv[1:] == ['snapshot']:
        snapshot()
    elif len(sys.argv) > 2 and sys.argv[1] == 'run':
        sys.exit(run(sys.argv[2:]))
    else:
        raise SystemExit('Use: run_record.py snapshot | run COMMAND ARG...')
