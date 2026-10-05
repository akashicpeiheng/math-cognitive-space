"""Build the expanded internal review bundle.

For the minimal source and ancillary files intended for the arXiv web form,
use prepare_arxiv_submission.py instead.

Assembles a clean submission package from this arxiv project, rebuilds the
PDF, re-runs the finite evidence in a fresh output directory, compares the
reports byte for byte against the reference run, renders the pages, and
copies the package to the user-requested location. The copy is then
verified by SHA-256.

Run from the arxiv folder with:  python publish.py
"""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
STAGE_ROOT = ROOT / "package-staging"
STAGE = STAGE_ROOT / "MCS-arXiv-submission"
EXTRA = STAGE_ROOT / "extra"
DEST_ROOT = Path(r"E:\OneDrive\Desktop\1")
DEST = DEST_ROOT / "MCS-arXiv-submission"
MARKER = ".mcs-arxiv-package-v1"


def run(cmd, cwd, label):
    print(f"[pipeline] {label}: {' '.join(map(str, cmd))}", flush=True)
    result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True,
                            encoding="utf-8", errors="replace")
    if result.returncode:
        print(result.stdout[-4000:])
        print(result.stderr[-2000:])
        raise SystemExit(f"{label} failed (exit {result.returncode})")
    return result


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def tree(path):
    return sorted(str(p.relative_to(path)).replace("\\", "/")
                  for p in path.rglob("*") if p.is_file())


def main():
    # 1. Clean probes and any previous staging package (ours only).
    for probe in (STAGE_ROOT / ".probe-write-tool.txt",
                  STAGE_ROOT / ".probe-python.txt"):
        if probe.exists():
            probe.unlink()
    if STAGE.exists():
        shutil.rmtree(STAGE)
    STAGE.mkdir(parents=True)

    # 2. Assemble the clean package.
    for name in ("main.tex", "references.bib", "build.py"):
        shutil.copy2(ROOT / name, STAGE / name)
    shutil.copytree(ROOT / "anc", STAGE / "anc",
                    ignore=shutil.ignore_patterns("__pycache__"))
    shutil.copytree(ROOT / "evidence" / "replay-final",
                    STAGE / "evidence" / "replay-final")
    for extra in sorted(EXTRA.glob("*")):
        shutil.copy2(extra, STAGE / extra.name)
    (STAGE / MARKER).write_text(
        "pipeline-created package; safe for the pipeline to overwrite\n",
        encoding="utf-8")
    print(f"[pipeline] staged {len(tree(STAGE))} files in {STAGE}", flush=True)

    # 3. Rebuild the PDF from the clean copy.
    run([sys.executable, "build.py"], cwd=STAGE, label="build")

    # 4. Re-run the finite evidence; compare the four reports byte for byte.
    run([sys.executable, "anc/run.py", "--output", "verify-replay"],
        cwd=STAGE, label="replay")
    compare = {}
    for name in ("kernel-report.json", "action-report.json",
                 "research-report.json", "route-report.json"):
        ref = STAGE / "evidence" / "replay-final" / name
        new = STAGE / "verify-replay" / name
        compare[name] = sha(ref) == sha(new)
    if not all(compare.values()):
        raise SystemExit("byte comparison failed: " + json.dumps(compare))

    # 5. Render pages and contact sheets for visual inspection.
    render = STAGE / "output" / "render"
    render.mkdir(parents=True, exist_ok=True)
    import pypdfium2 as pdfium
    pdf = pdfium.PdfDocument(str(STAGE / "output" / "pdf" / "main.pdf"))
    pages = len(pdf)
    for index in range(pages):
        size = pdf[index].get_size()
        scale = 1150 / max(size)
        pdf[index].render(scale=scale).to_pil().save(
            render / f"page-{index + 1:02d}.png")
    print(f"[pipeline] rendered {pages} pages", flush=True)
    try:
        from PIL import Image, ImageDraw
        files = sorted(render.glob("page-*.png"))
        for start in range(0, len(files), 4):
            canvas = Image.new("RGB", (1640, 2420), "#d8d8d8")
            draw = ImageDraw.Draw(canvas)
            for slot, page in enumerate(files[start:start + 4]):
                im = Image.open(page).convert("RGB")
                im.thumbnail((800, 1160))
                x = (slot % 2) * 820 + (820 - im.width) // 2
                y = (slot // 2) * 1210 + 35
                canvas.paste(im, (x, y))
                draw.text((x, y - 25), page.stem, fill="black")
            canvas.save(render / f"contact-{start // 4 + 1}.png")
        print(f"[pipeline] {len(files)} pages, contact sheets written",
              flush=True)
    except ImportError:
        print("[pipeline] PIL not available; contact sheets skipped",
              flush=True)

    # 6. Publish to the requested location.
    DEST_ROOT.mkdir(parents=True, exist_ok=True)
    if DEST.exists():
        if not (DEST / MARKER).exists():
            raise SystemExit(
                f"destination exists without our marker; refusing to touch: {DEST}")
        shutil.rmtree(DEST)
    shutil.copytree(STAGE, DEST,
                    ignore=shutil.ignore_patterns("__pycache__"))

    # 7. Verify the copy by file list and SHA-256 (__pycache__ excluded).
    src_files = [p for p in tree(STAGE)
                 if "__pycache__" not in Path(p).parts]
    dst_files = tree(DEST)
    mismatch = [p for p in src_files
                if p not in dst_files or sha(STAGE / p) != sha(DEST / p)]
    extra = [p for p in dst_files if p not in src_files]
    result = {
        "status": "passed",
        "pages": pages,
        "report_byte_comparison": compare,
        "staged_files": len(src_files),
        "copied_to": str(DEST),
        "copy_mismatches": mismatch,
        "extra_files_in_destination": extra,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2), flush=True)
    if mismatch or extra:
        raise SystemExit("copy verification failed")


if __name__ == "__main__":
    main()
