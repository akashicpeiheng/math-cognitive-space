"""Build the standalone English paper using an existing TeX installation."""
from pathlib import Path
import json
import re
import shutil
import subprocess

ROOT = Path(__file__).resolve().parent


def build():
    for program in ("pdflatex", "bibtex"):
        if shutil.which(program) is None:
            raise SystemExit("Required existing program is unavailable: " + program)
    output = ROOT / "output" / "pdf"
    output.mkdir(parents=True, exist_ok=True)
    latex = ["pdflatex", "-interaction=nonstopmode", "-halt-on-error",
             "-no-shell-escape", "-output-directory=output/pdf", "main.tex"]
    commands = [latex, ["bibtex", "output/pdf/main"], latex, latex]
    for index, command in enumerate(commands, 1):
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True,
                                encoding="utf-8", errors="replace")
        (output / f"build-pass-{index}.txt").write_text(
            result.stdout + result.stderr, encoding="utf-8")
        if result.returncode:
            raise SystemExit(result.stdout[-6000:] + result.stderr[-2000:])
    log = (output / "main.log").read_text(encoding="utf-8", errors="replace")
    problems = [line for line in log.splitlines()
                if "Overfull" in line or "undefined" in line.lower()
                or "LaTeX Warning" in line or "Package natbib Warning" in line]
    if problems:
        raise SystemExit("\n".join(problems))
    pages = int(re.search(r"Output written on .*? \((\d+) pages?", log).group(1))
    friendly = output / "MCS-arXiv-Peiheng-Liu.pdf"
    shutil.copyfile(output / "main.pdf", friendly)
    print(json.dumps({"status": "passed", "pages": pages,
                      "pdf": str(friendly), "checks": "no unresolved references or overfull boxes"}))


if __name__ == "__main__":
    build()
