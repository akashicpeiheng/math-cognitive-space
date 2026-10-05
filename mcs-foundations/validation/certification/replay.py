"""Replay new checks in isolation and compare with frozen evidence reports."""
from pathlib import Path
import json
import shutil
import subprocess
import sys
import tempfile
import evidence
import kernel as K

HERE=Path(__file__).resolve().parent

def stable_results(obj):
    if isinstance(obj,dict): return {k:stable_results(v) for k,v in obj.items() if k!='elapsed_seconds_diagnostic'}
    if isinstance(obj,list): return [stable_results(v) for v in obj]
    return obj

def main():
    evidence.validate(K.load(HERE/'claims.json'))
    records=[]
    with tempfile.TemporaryDirectory(prefix='mcs-replay-') as tmp:
        dest=Path(tmp)/'certification'
        shutil.copytree(HERE,dest,ignore=shutil.ignore_patterns('__pycache__'))
        for script,report in [('test_kernel.py','kernel-report.json'),('actions.py','action-report.json'),('research.py','research-report.json')]:
            result=subprocess.run([sys.executable,str(dest/script)],capture_output=True,text=True,encoding='utf-8',errors='replace')
            records.append({'script':script,'exit_code':result.returncode,'stdout':result.stdout.strip(),'stderr':result.stderr.strip()})
            if result.returncode: raise RuntimeError(records[-1])
            if stable_results(K.load(dest/report))!=stable_results(K.load(HERE/report)):
                raise AssertionError('replay differs from frozen report: '+report)
    result={'status':'passed','scope':'isolated replay; diagnostic timings excluded from deterministic comparison','records':records,
            'claims_sha256':K.file_hash(HERE/'claims.json')}
    (HERE/'replay-report.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':'passed','isolated_suites':len(records)}))

if __name__=='__main__': main()
