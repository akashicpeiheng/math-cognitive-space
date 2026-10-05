"""Create and independently replay an arXiv source archive.

Run build.py first. Never replaces an existing archive.
"""
from pathlib import Path, PurePosixPath
import argparse
import ast
import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parent
REPORTS = ("kernel-report.json", "action-report.json",
           "research-report.json", "route-report.json")


def sha(data):
    return hashlib.sha256(data).hexdigest()


def checked_command(args, cwd):
    result = subprocess.run(args, cwd=cwd, capture_output=True, text=True,
                            encoding="utf-8", errors="replace")
    if result.returncode:
        raise RuntimeError(result.stdout[-5000:] + result.stderr[-3000:])
    return result.stdout


def validate_source():
    tex = (ROOT / "main.tex").read_text(encoding="utf-8")
    bib = (ROOT / "references.bib").read_text(encoding="utf-8")
    labels = re.findall(r"\\label\{([^}]+)\}", tex)
    refs = re.findall(r"\\(?:ref|pageref|eqref)\{([^}]+)\}", tex)
    citations = {k.strip() for group in re.findall(r"\\cite[pt]?\{([^}]+)\}", tex)
                 for k in group.split(",")}
    bibkeys = set(re.findall(r"@\w+\{([^,]+),", bib))
    if len(labels) != len(set(labels)) or set(refs) - set(labels):
        raise ValueError("Duplicate or unresolved source labels")
    if citations != bibkeys:
        raise ValueError("Citation/reference mismatch: " + repr(citations ^ bibkeys))
    if "Peiheng Liu" not in tex or "peihengmath@gmail.com" not in tex:
        raise ValueError("Missing supplied author metadata")
    if re.search(r"TODO|TBD|PLACEHOLDER", tex) or any(
            token in tex for token in ("E:/", "E:\\MCS", "C:\\Users", "/home/", "/Users/")):
        raise ValueError("Local path or unresolved placeholder in publication")
    for path in (ROOT / "anc").rglob("*.py"):
        ast.parse(path.read_text(encoding="utf-8-sig"), feature_version=(3, 10))
    return {"labels": len(labels), "citations": len(citations),
            "python_3_10_syntax": "passed", "author_metadata": "passed"}


def package(destination):
    destination = destination.resolve()
    if destination.exists():
        raise FileExistsError("Choose a new archive name: " + str(destination))
    source_checks = validate_source()
    manifest = json.loads((ROOT / "anc/upstream-manifest.json").read_text())
    paths = ["anc/README.txt", "anc/run.py", "anc/route_demo.py",
             "anc/upstream-manifest.json", "anc/source-audit.json"]
    paths.extend("anc/" + p for p in sorted(manifest["files"]))
    payload = {p: (ROOT / p).read_bytes() for p in paths}
    for name in ("main.tex", "references.bib"):
        payload[name] = (ROOT / name).read_bytes()
    payload["main.bbl"] = (ROOT / "output/pdf/main.bbl").read_bytes()
    for name in (*REPORTS, "summary.json"):
        payload["anc/reference-results/" + name] = (
            ROOT / "evidence/replay-final" / name).read_bytes()
    for name in payload:
        path = PurePosixPath(name)
        if not name.isascii() or path.is_absolute() or ".." in path.parts:
            raise ValueError("Unsafe or non-ASCII archive path: " + name)
    # The manifest pins publication inputs as well as code. It excludes itself.
    pins = {name: sha(data) for name, data in sorted(payload.items())}
    payload["anc/package-manifest.json"] = (
        json.dumps({"algorithm": "sha256", "files": pins}, indent=2)+"\n").encode()
    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(destination, "x", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, data in sorted(payload.items()):
            info = zipfile.ZipInfo(name, date_time=(2026, 10, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, data)
    with tempfile.TemporaryDirectory(prefix="mcs-arxiv-package-") as tmp:
        extracted = Path(tmp)
        with zipfile.ZipFile(destination) as archive:
            archive.extractall(extracted)
        for name, digest in pins.items():
            if sha((extracted / name).read_bytes()) != digest:
                raise ValueError("Extracted file differs: " + name)
        stdout = checked_command(
            [sys.executable, "anc/run.py", "--output", "replay-smoke"], extracted)
        stable = {}
        for name in REPORTS:
            actual = (extracted / "replay-smoke" / name).read_bytes()
            reference = (extracted / "anc/reference-results" / name).read_bytes()
            if actual != reference:
                raise ValueError("Extracted replay differs: " + name)
            stable[name] = sha(actual)
        for _ in range(3):
            checked_command(["pdflatex", "-interaction=nonstopmode", "-halt-on-error",
                             "-no-shell-escape", "main.tex"], extracted)
        log = (extracted / "main.log").read_text(encoding="utf-8", errors="replace")
        problems = [line for line in log.splitlines()
                    if "Overfull" in line or "undefined" in line.lower()
                    or "LaTeX Warning" in line or "Package natbib Warning" in line]
        if problems:
            raise ValueError("\n".join(problems))
        pages = int(re.search(r"Output written on .*? \((\d+) pages?", log).group(1))
        # Preserve the compilation evidence without adding it to submission inputs.
        log_path = destination.with_suffix(".compile.log")
        with log_path.open("x", encoding="utf-8") as handle:
            handle.write(log)
    report = {"status": "passed", "archive": destination.name,
              "archive_sha256": sha(destination.read_bytes()),
              "archive_file_count": len(payload), "source_checks": source_checks,
              "extracted_replay": json.loads(stdout.strip()),
              "stable_report_matches": stable, "extracted_tex_pages": pages,
              "tex_warnings": problems, "python": sys.version,
              "boundary": "Local TeX and Python verification, not an arXiv server acceptance test"}
    report["extracted_replay"].pop("output", None)
    report_path = destination.with_suffix(".check.json")
    with report_path.open("x", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)
        handle.write("\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path,
                        default=ROOT / "dist/mcs-arxiv-source-20261001.zip")
    package(parser.parse_args().output)
