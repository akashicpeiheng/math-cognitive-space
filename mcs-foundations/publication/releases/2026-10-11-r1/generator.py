"""Build local reading snapshots; never upload or overwrite an existing release.

Frozen chapter copies preserve original bytes. Generated books rebase chapter
links to those copies and supplementary links to the working repository.
This is a local review format, not a standalone archival distribution.
"""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import date
import hashlib
import json
import os
from pathlib import Path
import re
import sys
from urllib.parse import unquote

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
CATALOG = HERE / "catalog.json"
RELEASES = HERE / "releases"
LINK = re.compile(r"\[([^\]\n]*)\]\((<[^>]+>|[^)\n]+)\)")
EDITORIAL = ["README.md", "导读.md", "发布总纲.md", "内容编排.md", "推进计划.md", "版本与发布协议.md"]


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def write_json(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def within(root: Path, relative: str) -> Path:
    path = (root / relative).resolve()
    if not path.is_relative_to(root.resolve()):
        raise ValueError(f"path escapes root: {relative}")
    return path


def local_link(target: str, source: Path) -> tuple[Path, str] | None:
    target = target.strip("<>")
    if target.startswith("#") or re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", target):
        return None
    path, sep, fragment = target.partition("#")
    if not path:
        return None
    return (source.parent / unquote(path)).resolve(), sep + fragment


def missing_links(content: str, source: Path) -> list[str]:
    missing = []
    for match in LINK.finditer(content):
        local = local_link(match[2], source)
        if local and not local[0].exists():
            missing.append(f"{source.name}: {match[2]}")
    return missing


def validate_catalog(catalog: dict) -> list[Path]:
    if catalog.get("schema") != "mcs-publication/1":
        raise ValueError("unsupported publication schema")
    if catalog.get("stage") != "local-reading-draft":
        raise ValueError("this builder only supports local reading drafts")
    books = catalog["books"]
    if {book["id"] for book in books} != {"reader", "technical"} or len(books) != 2:
        raise ValueError("expected one reader volume and one technical volume")
    outputs = [book["output"] for book in books]
    if len(set(outputs)) != 2 or any(Path(n).name != n or not n.endswith(".md") for n in outputs):
        raise ValueError("invalid or duplicate output names")
    sources = [within(ROOT, name) for book in books for part in book["parts"] for name in part["sources"]]
    duplicates = [str(p.relative_to(ROOT)) for p, n in Counter(sources).items() if n != 1]
    if duplicates:
        raise ValueError(f"duplicate chapter sources: {duplicates}")
    expected = set()
    for number in range(1, 17):
        matches = list(ROOT.glob(f"{number:02d}-*.md"))
        if len(matches) != 1:
            raise ValueError(f"expected one chapter {number}")
        expected.add(matches[0])
    for letter in "ABCDE":
        matches = list(ROOT.glob(f"{letter}-*.md"))
        if len(matches) != 1:
            raise ValueError(f"expected one appendix {letter}")
        expected.add(matches[0])
    expected.update((ROOT / "cases").glob("*.md"))
    expected.update([ROOT / "validation/REPORT.md", HERE / "导读.md"])
    if set(sources) != expected or len(expected) != 27:
        raise ValueError(f"coverage mismatch; missing={expected - set(sources)}, extra={set(sources) - expected}")
    errors = []
    for source in sources:
        if not source.is_file():
            raise FileNotFoundError(source)
        errors.extend(missing_links(source.read_text(encoding="utf-8"), source))
    if errors:
        raise ValueError("source links missing: " + "; ".join(errors))
    return sources


def release_path(version: str) -> Path:
    match = re.fullmatch(r"(\d{4}-\d{2}-\d{2})-r([1-9]\d*)", version)
    if not match:
        raise ValueError("version must be YYYY-MM-DD-rN (N >= 1)")
    date.fromisoformat(match[1])
    return within(RELEASES, version)


def rebase(content: str, source: Path, dest: Path, frozen: dict[Path, Path]) -> str:
    def convert(match: re.Match) -> str:
        local = local_link(match[2], source)
        if local is None:
            return match[0]
        target, fragment = local
        relative = os.path.relpath(frozen.get(target, target), dest.parent).replace("\\", "/")
        return f"[{match[1]}](<{relative}{fragment}>)"
    return LINK.sub(convert, content)


def make_book(book: dict, version: str, dest: Path, frozen: dict[Path, Path], data: dict[Path, bytes]) -> str:
    companion = next(name for name in ("MCS-研究正文.md", "MCS-形式基础与核验.md") if name != dest.name)
    parts = [f"# {book['title']}", "", "#MCS #研究专稿 #编排试读版", "",
             f"版本：{version}。状态：本地编排试读稿；未据此宣称公开发表或独立审阅通过。", "",
             book["purpose"], "",
             "原章正文及原编号保留；各章中的历史运行日期与证据范围未因编排而更新。"
             "分章是修订源，本文件由 catalog.json 生成。完整的语言改写与新 PDF/网页仍待后续验收。", "",
             f"[阅读与发布入口](../../README.md) · [另一册](<{companion}>) · [来源及哈希](manifest.json)", "",
             "本地审阅范围：理论引用指向本版源快照；补充材料仍有工作区链接。"
             "移出本仓库前须完成独立分发封装。原始源快照保留原始字节，阅读时以本册重定位后的链接为准。", "",
             "## 本册路线", ""]
    for i, part in enumerate(book["parts"], 1):
        parts.append(f"- [{part['title']}](#part-{book['id']}-{i})")
    for i, part in enumerate(book["parts"], 1):
        parts += ["", f'<a id="part-{book["id"]}-{i}"></a>', "", f"## {part['title']}", "", part["lead"], "",
                  f"**带着问题读：** {part['review_question']}", ""]
        for name in part["sources"]:
            source = within(ROOT, name)
            content = rebase(data[source].decode("utf-8").strip(), source, dest, frozen)
            # Keep headings hierarchical without touching mathematics or theorem numbers.
            content = re.sub(r"^(#{1,6}) ", lambda m: "#" * min(len(m[1]) + 2, 6) + " ", content, flags=re.M)
            relative = os.path.relpath(frozen[source], dest.parent).replace("\\", "/")
            parts += ["---", "", f"原分章快照：[{source.name}](<{relative}>)", "", content, ""]
    return "\n".join(parts) + "\n"


def build(version: str) -> dict:
    catalog_bytes = CATALOG.read_bytes()
    catalog = json.loads(catalog_bytes)
    sources = validate_catalog(catalog)
    dest = release_path(version)
    # Read inputs once so the book and its frozen source share the same bytes.
    data = {p: p.read_bytes() for p in sources}
    dest.mkdir(parents=True, exist_ok=False)
    frozen = {p: dest / "sources" / p.relative_to(ROOT) for p in sources}
    for source, target in frozen.items():
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data[source])
    (dest / "catalog.json").write_bytes(catalog_bytes)
    # Keep the generator as provenance, not as a standalone reproduction promise.
    (dest / "generator.py").write_bytes(Path(__file__).read_bytes())
    for book in catalog["books"]:
        output = dest / book["output"]
        output.write_text(make_book(book, version, output, frozen, data), encoding="utf-8")
    inputs = [{"source": str(p.relative_to(ROOT)).replace("\\", "/"),
               "snapshot": str(frozen[p].relative_to(dest)).replace("\\", "/"),
               "sha256": digest(data[p])} for p in sources]
    assets = {str(p.relative_to(dest)).replace("\\", "/"): digest(p.read_bytes())
              for p in sorted(dest.rglob("*")) if p.is_file()}
    manifest = {"schema": "mcs-reading-snapshot/1", "version": version,
                "content_stage": "local-reading-draft", "publication_status": "local-only",
                "scope": "Local structural and hash checks; no new mathematical or empirical certification",
                "portable": False, "sources": inputs, "files": assets}
    write_json(dest / "manifest.json", manifest)
    return verify(version)


def verify(version: str) -> dict:
    dest = release_path(version)
    manifest = json.loads((dest / "manifest.json").read_text(encoding="utf-8"))
    if manifest.get("schema") != "mcs-reading-snapshot/1" or manifest.get("version") != version:
        raise ValueError("invalid snapshot manifest")
    expected = set(manifest["files"]) | {"manifest.json"}
    actual = {str(p.relative_to(dest)).replace("\\", "/") for p in dest.rglob("*") if p.is_file()}
    errors = []
    if actual != expected:
        errors.append(f"file inventory differs: missing={expected-actual}, extra={actual-expected}")
    for name, sha in manifest["files"].items():
        path = within(dest, name)
        if not path.is_file() or digest(path.read_bytes()) != sha:
            errors.append(f"hash mismatch: {name}")
    drift = []
    for item in manifest["sources"]:
        snapshot = within(dest, item["snapshot"])
        if not snapshot.is_file() or digest(snapshot.read_bytes()) != item["sha256"]:
            errors.append(f"source snapshot mismatch: {item['source']}")
        current = within(ROOT, item["source"])
        if not current.is_file() or digest(current.read_bytes()) != item["sha256"]:
            drift.append(item["source"])
    frozen_catalog = json.loads((dest / "catalog.json").read_text(encoding="utf-8"))
    for book in frozen_catalog["books"]:
        path = within(dest, book["output"])
        if path.is_file():
            errors.extend(missing_links(path.read_text(encoding="utf-8"), path))
    if errors:
        raise ValueError("; ".join(errors))
    return {"status": "passed", "version": version, "source_count": len(manifest["sources"]),
            "hashed_files": len(manifest["files"]), "current_source_drift": drift,
            "publication_status": "local-only", "portable": False,
            "scope": "file hashes and local path targets; not proof or fragment-anchor validation"}


def check() -> dict:
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    sources = validate_catalog(catalog)
    errors = []
    for name in EDITORIAL:
        path = HERE / name
        errors.extend(missing_links(path.read_text(encoding="utf-8"), path))
    if errors:
        raise ValueError("editorial links missing: " + "; ".join(errors))
    return {"status": "passed", "original_sources": len(sources) - 1,
            "editorial_sources": 1, "books": len(catalog["books"]),
            "scope": "coverage, uniqueness, local path targets; not mathematical correctness"}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--build", metavar="VERSION")
    mode.add_argument("--verify", metavar="VERSION")
    args = parser.parse_args()
    try:
        result = check() if args.check else build(args.build) if args.build else verify(args.verify)
    except (OSError, ValueError, KeyError, TypeError) as error:
        print(json.dumps({"status": "failed", "error": str(error)}, ensure_ascii=True), file=sys.stderr)
        raise SystemExit(1)
    print(json.dumps(result, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    main()
