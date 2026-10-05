"""Reproduce the paper's finite evidence in a temporary copy.

Usage: python anc/run.py --output NEW_DIRECTORY
Never updates the frozen upstream files or their original evidence reports.
"""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
import route_demo

HERE = Path(__file__).resolve().parent


def file_hash(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def stable(obj):
    if isinstance(obj, dict):
        return {k: stable(v) for k, v in obj.items() if k != "elapsed_seconds_diagnostic"}
    if isinstance(obj, list):
        return [stable(v) for v in obj]
    return obj


def run(output):
    output.mkdir(parents=True, exist_ok=False)
    manifest = json.loads((HERE / "upstream-manifest.json").read_text())
    for relative, expected in manifest["files"].items():
        if file_hash(HERE / relative) != expected:
            raise ValueError("upstream input changed: " + relative)
    records = []
    with tempfile.TemporaryDirectory(prefix="mcs-paper-replay-") as tmp:
        target = Path(tmp) / "certification"
        shutil.copytree(HERE / "certification", target, ignore=shutil.ignore_patterns("__pycache__"))
        for name, report in [("test_kernel.py", "kernel-report.json"),
                             ("actions.py", "action-report.json"),
                             ("research.py", "research-report.json")]:
            result = subprocess.run([sys.executable, str(target/name)], cwd=target,
                                    capture_output=True, text=True, encoding="utf-8", errors="replace")
            records.append({"script": name, "exit_code": result.returncode,
                            "stdout": result.stdout.strip(), "stderr": result.stderr.strip()})
            if result.returncode:
                raise RuntimeError(records[-1])
            data = json.loads((target/report).read_text())
            (output/report).write_text(json.dumps(stable(data), indent=2)+"\n", encoding="utf-8")
    receipt = json.loads((output/"action-report.json").read_text())["successes"]["limit"]
    demo = route_demo.run(receipt)
    (output/"route-report.json").write_text(json.dumps(demo, indent=2)+"\n", encoding="utf-8")
    summary = {"status": "passed", "python": sys.version, "runs": records,
               "new_route_fragment": {"status": demo["status"], "negative_cases": len(demo["rejected"]),
                                     "scale": demo["scale"]},
               "inputs": {str(p.relative_to(HERE)).replace("\\", "/"): file_hash(p)
                          for p in sorted(HERE.rglob("*")) if p.is_file()
                          and "__pycache__" not in p.parts and p.suffix in [".py", ".json"]},
               "reports": {p.name: file_hash(p) for p in sorted(output.glob("*-report.json"))},
               "scope": "Finite replays; no general proof of kernel or planner implementation; no real learners"}
    (output/"summary.json").write_text(json.dumps(summary, indent=2)+"\n", encoding="utf-8")
    print(json.dumps({"status": "passed", "upstream_suites": len(records),
                      "route_negative_cases": len(demo["rejected"]), "output": str(output)}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True,
                        help="A directory that does not yet exist")
    run(parser.parse_args().output.resolve())
