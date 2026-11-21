"""Build a continuous Markdown edition from the authoritative chapter files."""
from pathlib import Path
import argparse
import hashlib
import json
import os
import re

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--edition-dir", type=Path, default=ROOT / "edition")
DEST = parser.parse_args().edition_dir.resolve() / "MCS-完整理论专稿.md"
sources = [ROOT / "publication" / "导读.md", ROOT / "D-接口契约.md"]
for number in range(1, 17):
    matches = list(ROOT.glob(f"{number:02d}-*.md"))
    if len(matches) != 1:
        raise ValueError((number, matches))
    sources.extend(matches)
    if number == 13:
        sources.extend(sorted((ROOT / "cases").glob("*.md")))
sources += [ROOT / name for name in [
    "E-核心公理与验证条件.md", "A-定义与定理索引.md",
    "B-文献证据表.md", "C-记号索引.md",
    "validation/REPORT.md", "validation/REPORT-scale-model.md",
]]


def rebase_links(text, source):
    def convert(match):
        target = match.group(2).strip("<>")
        if re.match(r"^(https?://|mailto:|#)", target):
            return match.group(0)
        base, sep, anchor = target.partition("#")
        target_path = (source.parent / base).resolve()
        relative = os.path.relpath(target_path, DEST.parent).replace("\\", "/")
        return f"[{match.group(1)}](<{relative}{sep}{anchor}>)"
    return re.sub(r"\[([^\]\n]*)\]\((<[^>]+>|[^)\n]+)\)", convert, text)


parts = [
    "# 数学认知空间 MCS：新时代数学教育的基础设施",
    "",
    "可认证的数学知识本体与个性化学习路线",
    "",
    "**刘沛恒 · 2026 年 11 月 21 日 · 学习者模型分层修订版**",
    "",
    "两位读者都要理解群。一位已会复合置换，另一位熟悉三角形的对称，"
    "他们可以从不同的运算走向同一组公理。如果读者刚来，还没有说自己会什么，"
    "我们仍能列出这些入口，逐条指出要用到的背景。这是本版规划理论的起点。",
    "",
    "数学本体 M 固定对象、条件和证明，公共阅读 L 组织对这些内容的讲解。"
    "学习者记录分别保存阅读、作答和本人确认的背景。给出目标后，基础规划沿公共行动寻找路线，"
    "把每一步所用的背景和前一步的产出写进见证。读者可以回到具体一条路线，检查它为什么走得通。",
    "",
    "当问题变成“今天的时间够走哪条路线”或“这次作答提示了什么误解”，创作者可以接入专门的模型。"
    "每个扩展说明自己读了哪些资料、采用什么判据，再把筛选、排序或诊断连同依据交回规划器。"
    "这使不同模型的判断可以回到同一份数学和学习记录上比较。预测是否符合真实学习过程，需要另行测量。",
    "",
    "首次通读可从下一篇群的导读进入。关注学习者模型，可连读第 07 章、"
    "第 12 章和第 13 章的案例；关注数学保证，可从接口契约进入第 01–06 章，"
    "再用第 15 章查相应证据。书末索引的行号指向分章修订源。"
    "旧案例的档案简称与新接口的对应见"
    + rebase_links("[接口迁移表](publication/接口迁移表.md)。", ROOT / "00-README.md"),
    "",
]
manifest = []
for source in sources:
    data = source.read_text(encoding="utf-8").strip()
    rebased = rebase_links(data, source)
    shifted = re.sub(r"^(#{1,5}) ", r"#\1 ", rebased, flags=re.M)
    rel = os.path.relpath(source, DEST.parent).replace("\\", "/")
    parts += ["---", "", f"原章节：[{source.name}](<{rel}>)", "", shifted, ""]
    manifest.append({
        "source": str(source.relative_to(ROOT)).replace("\\", "/"),
        "sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
    })
DEST.parent.mkdir(parents=True, exist_ok=True)
DEST.write_text("\n".join(parts), encoding="utf-8")
(DEST.parent / "sources.json").write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
# Verify every local link after rebasing, including references back to cases.
for match in re.finditer(r"\[[^\]\n]*\]\((<[^>]+>|[^)\n]+)\)", DEST.read_text(encoding="utf-8")):
    target = match.group(1).strip("<>")
    if re.match(r"^(https?://|mailto:|#)", target):
        continue
    path = target.partition("#")[0]
    if path and not (DEST.parent / path).exists():
        raise FileNotFoundError(target)
print(json.dumps({"edition": str(DEST), "sources": len(sources), "bytes": DEST.stat().st_size}, ensure_ascii=True))
