"""Prepare the exact arXiv upload artifacts and verify them from their zips.

The submission directory is rebuilt only when it carries our marker.  The
source archive is recompiled in a temporary directory and the ancillary
archive replays the four stable reports, which are compared byte for byte.

Run from this directory with:

    python prepare_arxiv_submission.py
"""
from pathlib import Path
import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "submission"
SOURCE_UPLOAD = OUT / "source-upload"
ANCILLARY_UPLOAD = OUT / "ancillary-upload"
SOURCE_ZIP = OUT / "MCS-arXiv-source.zip"
ANCILLARY_ZIP = OUT / "MCS-arXiv-ancillary.zip"
PDF = OUT / "MCS-arXiv-Peiheng-Liu.pdf"
FIELDS = OUT / "arXiv-submit-fields.txt"
README = OUT / "README.txt"
SUMS = OUT / "SHA256SUMS.txt"
OUT_MARKER = ".prepared-submission-v1"

DESKTOP = Path(r"E:\OneDrive\Desktop\1") / "MCS-arXiv-submission"
DESKTOP_MARKER = ".prepared-submission-v1"

STABLE_REPORTS = (
    "kernel-report.json",
    "action-report.json",
    "research-report.json",
    "route-report.json",
)

ABSTRACT = """Relations in mathematical learning resources may encode joint
requirements, alternative entries, proof dependencies, or presentation
choices. These meanings must remain distinguishable when a learner model
selects a route or a view hides part of its context. We present MCS, a
specification separating versioned public mathematical resources, external
learner models, and derived views and event routes. Resource ports retain
evidence kind, theory, assumptions, version, and provenance. We prove a
conditional saturation result for concept occurrence aggregated over
unrestricted equivalent expressions; distinguish route-relative requirements
from alternative sufficient supports; and give a compositional
resource-preservation theorem and a bounded exhaustive-search guarantee. A
lossless encoding into an annotated incidence graph makes the representational
boundary explicit. A standard-library Python artifact replays local
mathematical certificates, finite comparison experiments, and a limit-based
route example. On the tested fragment, typed action graphs, annotated bipartite
graphs, and MCS give identical classifications. The contribution is a precise,
auditable integration of interfaces and their guarantees; the results establish
neither unique graph expressiveness nor empirical learning benefits. General
correctness of the Python proof checker and complete machine certification of
the mathematical case studies remain open."""

FIELDS_TEXT = """arXiv submission form fields (suggested)
========================================

Title (paste as one line)
-------------------------
MCS: A Formal Framework for Mathematical Knowledge and Learning Routes with External Learner Models

Authors and submitter
---------------------
Peiheng Liu
peihengmath@gmail.com

Primary category
----------------
cs.AI

Cross-list
----------
cs.LO

MSC classes
-----------
68T30; 68T05; 68T20; 97C30

ACM classes (if the form offers them)
-------------------------------------
F.4.1; I.2.4; I.2.6; I.2.8

Comments
--------
16 pages, 2 figures, 4 tables. Ancillary Python 3.10+ code and finite evidence
reproduce the reported checks. The full limit bridge is a written proof;
machine certificates cover four local fragments. No unique graph expressiveness
or empirical learning benefit is claimed.

Abstract
--------
{abstract}

License
-------
Choose CC BY 4.0 for broad reuse with attribution, or the arXiv perpetual
non-exclusive license. The choice belongs to the author and must be made in the
submission form.
""".format(abstract=ABSTRACT)

README_TEXT = """MCS arXiv submission package
============================

Upload these two files:

1. MCS-arXiv-source.zip
   Choose the TeX/LaTeX submission route. The archive has a top-level main.tex;
   references.bib and the generated main.bbl are included.

2. MCS-arXiv-ancillary.zip
   Upload under "Ancillary files". It contains anc/ and evidence/replay-final/.
   The paper's Appendix A gives the command and scope.

The PDF in this directory is the author's rendered reference copy. arXiv will
generate its own PDF from the source archive; inspect that generated PDF before
the final submit action.

Before submitting
-----------------
1. Log in with the arXiv account whose identity matches the author.
2. Check whether cs.AI or cs.LO requires endorsement for this account.
3. Fill the form from arXiv-submit-fields.txt.
   Paste the title as a single line.
4. Choose the license explicitly.
5. Inspect the generated PDF and the ancillary file listing.
6. Submit only after confirming the author name, email, category, and license.

Verification performed
----------------------
The source zip was extracted into an empty directory and compiled with
pdflatex + bibtex + pdflatex + pdflatex. The build produced 16 pages with no
unresolved references or overfull boxes. The ancillary zip was extracted into
an empty directory and anc/run.py was executed there; the four stable reports
matched evidence/replay-final/ byte for byte. See SHA256SUMS.txt for hashes.
""".format()


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(command, cwd, label):
    result = subprocess.run(command, cwd=cwd, capture_output=True, text=True,
                            encoding="utf-8", errors="replace")
    if result.returncode:
        raise RuntimeError(label + " failed\n" + result.stdout[-5000:] +
                           "\n" + result.stderr[-3000:])
    return result


def clean_and_make(path, marker):
    if path.exists():
        if not (path / marker).exists():
            raise SystemExit("refusing to replace unmarked directory: " + str(path))
        shutil.rmtree(path)
    path.mkdir(parents=True)
    (path / marker).write_text("generated by prepare_arxiv_submission.py\n",
                               encoding="utf-8")


def copy_ancillary_tree():
    shutil.copytree(ROOT / "anc", ANCILLARY_UPLOAD / "anc",
                    ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
    shutil.copytree(ROOT / "evidence" / "replay-final",
                    ANCILLARY_UPLOAD / "evidence" / "replay-final")


def make_zips():
    def add_tree(archive, root):
        with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as zf:
            for path in sorted(root.rglob("*")):
                if path.is_file() and "__pycache__" not in path.parts \
                        and path.suffix != ".pyc":
                    zf.write(path, path.relative_to(root).as_posix())
    add_tree(SOURCE_ZIP, SOURCE_UPLOAD)
    add_tree(ANCILLARY_ZIP, ANCILLARY_UPLOAD)


def verify_source_zip():
    with tempfile.TemporaryDirectory(prefix="mcs-source-check-") as tmp:
        work = Path(tmp)
        with zipfile.ZipFile(SOURCE_ZIP) as zf:
            zf.extractall(work)
        expected = {"main.tex", "references.bib", "main.bbl"}
        actual = {p.name for p in work.iterdir() if p.is_file()}
        if actual != expected:
            raise RuntimeError("unexpected source archive root: " + repr(actual))
        latex = ["pdflatex", "-interaction=nonstopmode", "-halt-on-error",
                 "-no-shell-escape", "main.tex"]
        run(latex, work, "source pdflatex 1")
        run(["bibtex", "main"], work, "source bibtex")
        run(latex, work, "source pdflatex 2")
        run(latex, work, "source pdflatex 3")
        log = (work / "main.log").read_text(encoding="utf-8", errors="replace")
        problems = [line for line in log.splitlines()
                    if "Overfull" in line or "undefined" in line.lower()
                    or "LaTeX Warning" in line]
        if problems:
            raise RuntimeError("source build warnings:\n" + "\n".join(problems))
        match = re.search(r"Output written on .*? \((\d+) pages?", log)
        if not match:
            raise RuntimeError("could not read page count from source build")
        return int(match.group(1))


def verify_ancillary_zip():
    with tempfile.TemporaryDirectory(prefix="mcs-ancillary-check-") as tmp:
        work = Path(tmp)
        with zipfile.ZipFile(ANCILLARY_ZIP) as zf:
            zf.extractall(work)
        run([sys.executable, "anc/run.py", "--output", "replay"], work,
            "ancillary replay")
        report_hashes = {}
        for name in STABLE_REPORTS:
            reference = work / "evidence" / "replay-final" / name
            replayed = work / "replay" / name
            if digest(reference) != digest(replayed):
                raise RuntimeError("report mismatch after extraction: " + name)
            report_hashes[name] = digest(replayed)
        summary = json.loads((work / "replay" / "summary.json").read_text())
        if summary.get("status") != "passed":
            raise RuntimeError("replay summary did not pass")
        return report_hashes


def write_sums():
    lines = []
    for path in (SOURCE_ZIP, ANCILLARY_ZIP, PDF, FIELDS, README):
        lines.append(f"{digest(path)}  {path.name}")
    SUMS.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return {line.split("  ", 1)[1]: line.split("  ", 1)[0] for line in lines}


def copy_to_desktop(files):
    clean_and_make(DESKTOP, DESKTOP_MARKER)
    for path in files:
        shutil.copy2(path, DESKTOP / path.name)
    copied = {}
    for path in files:
        target = DESKTOP / path.name
        if digest(path) != digest(target):
            raise RuntimeError("desktop copy mismatch: " + path.name)
        copied[path.name] = digest(target)
    return copied


def main():
    if shutil.which("pdflatex") is None:
        raise SystemExit("pdflatex is unavailable")
    # Build once so the generated main.bbl and the reference PDF are current.
    run([sys.executable, "build.py"], ROOT, "paper build")

    clean_and_make(OUT, OUT_MARKER)
    SOURCE_UPLOAD.mkdir()
    ANCILLARY_UPLOAD.mkdir()
    shutil.copy2(ROOT / "main.tex", SOURCE_UPLOAD / "main.tex")
    shutil.copy2(ROOT / "references.bib", SOURCE_UPLOAD / "references.bib")
    shutil.copy2(ROOT / "output" / "pdf" / "main.bbl",
                 SOURCE_UPLOAD / "main.bbl")
    copy_ancillary_tree()
    shutil.copy2(ROOT / "output" / "pdf" / "MCS-arXiv-Peiheng-Liu.pdf", PDF)
    FIELDS.write_text(FIELDS_TEXT, encoding="utf-8")
    README.write_text(README_TEXT, encoding="utf-8")
    make_zips()

    pages = verify_source_zip()
    report_hashes = verify_ancillary_zip()
    sums = write_sums()
    desktop = copy_to_desktop([SOURCE_ZIP, ANCILLARY_ZIP, PDF, FIELDS, README, SUMS])
    result = {
        "status": "passed",
        "submission_dir": str(OUT),
        "desktop_copy": str(DESKTOP),
        "source_zip": SOURCE_ZIP.name,
        "ancillary_zip": ANCILLARY_ZIP.name,
        "source_pages": pages,
        "report_hashes": report_hashes,
        "sha256": sums,
        "desktop_hashes": desktop,
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
