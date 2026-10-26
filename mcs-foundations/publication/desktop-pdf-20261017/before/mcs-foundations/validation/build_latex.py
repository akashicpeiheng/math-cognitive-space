#!/usr/bin/env python3
"""Build a standalone XeLaTeX edition of the MCS monograph.

Source of truth is ``edition/MCS-完整理论专稿.md`` (produced by
``validation/build_monograph.py``).  The converter

* keeps the mathematics of the Markdown edition verbatim (it is already
  written as ``\\(...\\)`` / ``\\[...\\]``),
* rewrites every pipe table as a ``longtable`` with proportional columns,
* renders the Unicode mathematical notation that occurs in running prose
  (``Σ``, ``ℓ_a``, ``𝒫(K_Σ)``, ``⟦f⟧_v`` ...) as LaTeX math,
* drops the Markdown inter-chapter rules and turns the ``原章节`` lines into a
  small note under the corresponding chapter heading.

Output: ``edition/MCS-完整理论专稿.tex``.
"""

from __future__ import annotations

import re
import unicodedata
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "edition" / "MCS-完整理论专稿.md"
DEST = ROOT / "edition" / "MCS-完整理论专稿.tex"

CJK_RE = re.compile(r"[\u2e80-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]")

GREEK = {
    "α": r"\alpha", "β": r"\beta", "γ": r"\gamma", "δ": r"\delta",
    "ε": r"\varepsilon", "ζ": r"\zeta", "η": r"\eta", "θ": r"\theta",
    "ι": r"\iota", "κ": r"\kappa", "λ": r"\lambda", "μ": r"\mu",
    "ν": r"\nu", "ξ": r"\xi", "π": r"\pi", "ρ": r"\rho",
    "σ": r"\sigma", "τ": r"\tau", "υ": r"\upsilon", "φ": r"\varphi",
    "χ": r"\chi", "ψ": r"\psi", "ω": r"\omega",
    "Γ": r"\Gamma", "Δ": r"\Delta", "Θ": r"\Theta", "Λ": r"\Lambda",
    "Ξ": r"\Xi", "Π": r"\Pi", "Σ": r"\Sigma", "Υ": r"\Upsilon",
    "Φ": r"\Phi", "Ψ": r"\Psi", "Ω": r"\Omega",
}

MATH_SYMBOLS = {
    "→": r"\to", "←": r"\leftarrow", "↔": r"\leftrightarrow", "↦": r"\mapsto",
    "⇀": r"\rightharpoonup", "⇒": r"\Rightarrow", "⇔": r"\Leftrightarrow",
    "⟹": r"\Longrightarrow", "⟺": r"\Longleftrightarrow",
    "∀": r"\forall", "∃": r"\exists", "∄": r"\nexists",
    "¬": r"\neg", "∧": r"\land", "∨": r"\lor",
    "∈": r"\in", "∉": r"\notin", "⊆": r"\subseteq", "⊂": r"\subset",
    "⊇": r"\supseteq", "⊃": r"\supset",
    "⊑": r"\sqsubseteq", "⊒": r"\sqsupseteq", "⊔": r"\sqcup", "∪": r"\cup", "∩": r"\cap",
    "⋃": r"\bigcup", "⋂": r"\bigcap", "∅": r"\emptyset",
    "≤": r"\le", "≥": r"\ge", "≠": r"\ne", "≈": r"\approx", "≅": r"\cong",
    "≡": r"\equiv", "≼": r"\preceq", "≽": r"\succeq", "≺": r"\prec", "≻": r"\succ",
    "×": r"\times", "∘": r"\circ", "·": r"\cdot", "⋅": r"\cdot",
    "⊕": r"\oplus", "⊗": r"\otimes", "△": r"\triangle", "□": r"\square",
    "∞": r"\infty", "∂": r"\partial", "∇": r"\nabla",
    "⊥": r"\bot", "⊤": r"\top", "∥": r"\parallel", "±": r"\pm", "∓": r"\mp",
    "∎": r"\blacksquare", "⊢": r"\vdash", "⊣": r"\dashv", "⊨": r"\vDash", "⊩": r"\Vdash",
    "⟦": r"\llbracket", "⟧": r"\rrbracket",
    "−": "-", "–": "-", "—": "-", "…": r"\ldots", "√": r"\surd",
    "ℓ": r"\ell", "ℛ": r"\mathcal{R}", "ℱ": r"\mathcal{F}", "ℬ": r"\mathcal{B}",
    "ℕ": r"\mathbb{N}", "ℤ": r"\mathbb{Z}", "ℝ": r"\mathbb{R}",
    "ℚ": r"\mathbb{Q}", "ℂ": r"\mathbb{C}",
    "𝒫": r"\mathcal{P}", "𝒜": r"\mathcal{A}", "𝒢": r"\mathcal{G}",
    "𝒟": r"\mathcal{D}", "𝒦": r"\mathcal{K}", "𝒮": r"\mathcal{S}",
    "𝒯": r"\mathcal{T}", "ℳ": r"\mathcal{M}",
    "𝒞": r"\mathcal{C}", "ℰ": r"\mathcal{E}", "ℋ": r"\mathcal{H}", "ℐ": r"\mathcal{I}",
    "𝒥": r"\mathcal{J}", "ℒ": r"\mathcal{L}", "𝒩": r"\mathcal{N}", "𝒪": r"\mathcal{O}",
    "𝒬": r"\mathcal{Q}", "𝒰": r"\mathcal{U}", "𝒱": r"\mathcal{V}", "𝒲": r"\mathcal{W}",
    "𝒳": r"\mathcal{X}", "𝒴": r"\mathcal{Y}", "𝒵": r"\mathcal{Z}",
    "ȳ": r"\bar{y}", "ā": r"\bar{a}", "ī": r"\bar{\imath}", "ū": r"\bar{u}",
}

# Fraktur (geometric/black-letter) letters: mathematical alphanumeric block plus letterlike variants.
for _cp in list(range(0x1D504, 0x1D538)) + [0x212D, 0x210C, 0x2111, 0x211C, 0x2128]:
    _ch = chr(_cp)
    try:
        _name = unicodedata.name(_ch)
    except ValueError:
        continue
    if "FRAKTUR" in _name or "BLACK-LETTER" in _name:
        MATH_SYMBOLS.setdefault(_ch, r"\mathfrak{" + _name.rsplit(" ", 1)[-1] + "}")

SUPS = {
    "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5",
    "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁺": "+", "⁻": "-",
    "⁼": "=", "⁽": "(", "⁾": ")", "ⁿ": "n", "ⁱ": "i", "ᵏ": "k",
}
SUBS = {
    "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5",
    "₆": "6", "₇": "7", "₈": "8", "₉": "9", "₊": "+", "₋": "-",
    "₌": "=", "₍": "(", "₎": ")", "ₐ": "a", "ₑ": "e", "ₒ": "o",
    "ₓ": "x", "ₕ": "h", "ₖ": "k", "ₗ": "l", "ₘ": "m", "ₙ": "n",
    "ₚ": "p", "ₛ": "s", "ₜ": "t", "ᵢ": "i", "ⱼ": "j",
}
CIRCLED = {"①": "1", "②": "2", "③": "3", "④": "4", "⑤": "5", "⑥": "6"}

# Text-mode fallbacks for notation that survived the math-run pass.
TEXT_MAP: dict[str, str] = {}
for _ch, _cmd in {**GREEK, **MATH_SYMBOLS}.items():
    TEXT_MAP[_ch] = r"\ensuremath{" + _cmd + "}"
for _ch, _digit in SUPS.items():
    TEXT_MAP[_ch] = r"\mcspow{" + _digit + "}"
for _ch, _digit in SUBS.items():
    TEXT_MAP[_ch] = r"\mcssub{" + _digit + "}"
for _ch, _digit in CIRCLED.items():
    TEXT_MAP[_ch] = r"\mcsnum{" + _digit + "}"
for _ch in ("–", "—", "…"):
    TEXT_MAP.pop(_ch, None)
TEXT_MAP["ȳ"] = r"\ensuremath{\bar{y}}"
TEXT_MAP["ā"] = r"\ensuremath{\bar{a}}"
TEXT_MAP["ī"] = r"\ensuremath{\bar{\imath}}"
TEXT_MAP["ū"] = r"\ensuremath{\bar{u}}"
TEXT_MAP["̄"] = r""  # combining macron outside math: dropped
TEXT_MAP["̂"] = r""  # combining circumflex outside math: dropped

RUN_CLASS = (
    "A-Za-z0-9_\\^{}()\\[\\]<>:;,.\\'\"!?/\\\\|+\\-*=#~"
    "\u00a0-\u2fff\U0001d400-\U0001d7ff"
)
RUN_RE = re.compile("[" + RUN_CLASS + "]+")
SIGNALS = (
    set("_^") | set(GREEK) | set(MATH_SYMBOLS) | set(SUPS) | set(SUBS) | {"\\{"}
) - {"–", "—", "…"}
OPERATORS = {"lim", "sup", "inf", "max", "min", "det", "dim", "log", "exp", "gcd"}

TOKEN_RE = re.compile(
    r"""
      \\\((?:\\.|[^\\])*?\\\)
    | \\\[(?:\\.|[^\\])*?\\\]
    | `[^`\n]*`
    | \[([^\]\n]*)\]\((<[^>\n]*>|[^)\n]*)\)
    | \*\*[^*\n]+\*\*
    | \*(?=[^\s*])[^*\n]+\*
    """,
    re.X | re.S,
)

ESCAPES = {
    "\\": r"\textbackslash{}",
    "{": r"\{",
    "}": r"\}",
    "_": r"\mcsbrk\_",
    "^": r"\textasciicircum{}",
    "&": r"\&",
    "%": r"\%",
    "$": r"\$",
    "#": r"\#",
    "~": r"\textasciitilde{}",
}


def is_wide(ch: str) -> bool:
    return bool(CJK_RE.match(ch))


def display_width(text: str) -> int:
    """Rough column weight of a Markdown cell."""
    text = re.sub(r"\\[A-Za-z]+", "xx", text)
    text = re.sub(r"[\\{}$]", "", text)
    return sum(2 if is_wide(ch) else 1 for ch in text)


def join_lines(lines: list[str]) -> str:
    out = ""
    for raw in lines:
        piece = raw.strip()
        if not piece:
            continue
        if not out:
            out = piece
        elif is_wide(piece[0]) or is_wide(out[-1]):
            out += piece
        else:
            out += " " + piece
    return out


def escape_plain(text: str) -> str:
    text = break_long_words(text)
    out = []
    for ch in text:
        if ch == "\x01":
            out.append(r"\mcsbrk{}")
        elif ch in ESCAPES:
            out.append(ESCAPES[ch])
        elif ch in TEXT_MAP:
            out.append(TEXT_MAP[ch])
        else:
            out.append(ch)
    return "".join(out)


def break_long_words(text: str) -> str:
    """Insert break points into long ASCII runs (identifiers, hashes, URLs)."""

    def split(match: re.Match[str]) -> str:
        word = match.group(0)
        if len(word) < 16:
            return word
        return "\x01".join(word[i:i + 6] for i in range(0, len(word), 6))

    return re.sub(r"[A-Za-z0-9]{12,}", split, text)


def classify_braces(text: str) -> str:
    """Treat braces as grouping only where LaTeX expects a group.

    Running prose uses ``{...}`` for sets (``{g:g ≽_H s}``), while the same
    characters are grouping braces after ``_``/``^`` or a command
    (``R^{n+1}``).  Everything else is escaped so it prints as a brace.
    """
    out: list[str] = []
    stack: list[bool] = []
    grouping_positions: list[int] = []
    previous = ""
    i = 0
    while i < len(text):
        ch = text[i]
        if ch == "\\" and i + 1 < len(text):
            match = re.match(r"\\([A-Za-z]+)?", text[i:])
            token = match.group(0)
            if not match.group(1):
                token = text[i:i + 2]
            out.append(token)
            previous = token
            i += len(token)
            continue
        if ch == "{":
            grouping = previous in ("_", "^") or (
                previous.startswith("\\") and previous[1:2].isalpha()
            )
            stack.append(grouping)
            if grouping:
                grouping_positions.append(len(out))
            out.append("{" if grouping else r"\{")
        elif ch == "}":
            grouping = stack.pop() if stack else False
            if grouping and grouping_positions:
                grouping_positions.pop()
            out.append("}" if grouping else r"\}")
        else:
            out.append(ch)
        if not ch.isspace():
            previous = ch
        i += 1
    for position in grouping_positions:
        out[position] = r"\{"
    return "".join(out)


def mathify(text: str) -> str:
    """Turn a Unicode math run into LaTeX math body."""
    text = re.sub(r"\\\s*(?=\{)", r"\\setminus ", text)
    text = re.sub(
        r"[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱᵏ]+",
        lambda m: "^{" + "".join(SUPS[ch] for ch in m.group(0)) + "}",
        text,
    )
    text = re.sub(
        r"[₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₒₓₕₖₗₘₙₚₛₜᵢⱼ]+",
        lambda m: "_{" + "".join(SUBS[ch] for ch in m.group(0)) + "}",
        text,
    )
    # ``g_abs_p`` must become one subscript, not two.
    text = re.sub(
        r"([A-Za-z0-9])\s*_\s*([A-Za-z][A-Za-z0-9]*)\s*_\s*([A-Za-z0-9]+)",
        lambda m: m.group(1) + "_{" + m.group(2) + "_" + m.group(3) + "}",
        text,
    )
    text = classify_braces(text)

    def upright(match: re.Match[str]) -> str:
        word = match.group(1)
        previous = text[max(0, match.start() - 1):match.start()]
        if word in OPERATORS and previous not in "_^":
            return "\\" + word
        return r"\mathrm{" + word + "}"

    text = re.sub(r"(?<![A-Za-z])([A-Za-z]{3,})(?![A-Za-z])", upright, text)
    text = re.sub(r"(?<![A-Za-z])([A-Za-z]{2})(?![A-Za-z])",
                  lambda m: r"\mathrm{" + m.group(1) + "}", text)

    out = []
    length = len(text)
    for idx, ch in enumerate(text):
        command = GREEK.get(ch) or MATH_SYMBOLS.get(ch)
        if command is not None:
            nxt = text[idx + 1] if idx + 1 < length else ""
            tail = command[-1]
            spaced = tail.isascii() and tail.isalpha() and nxt.isascii() and nxt.isalnum()
            out.append(command + (" " if spaced else ""))
        elif ch in SUPS:
            out.append("^{" + SUPS[ch] + "}")
        elif ch in SUBS:
            out.append("_{" + SUBS[ch] + "}")
        else:
            out.append(ch)
    text = "".join(out)

    text = re.sub(r"(\\[A-Za-z]+|[^{}\s])\u0302", r" \\hat{\1}", text)
    text = re.sub(r"(\\[A-Za-z]+|[^{}\s])\u0304", r" \\bar{\1}", text)
    text = text.replace("#", r"\#").replace("&", r"\&").replace("%", r"\%")
    text = text.replace("$", r"\$").replace("~", r"\sim ")
    return re.sub(r"\s+", " ", text).strip()


def is_codeish(run: str) -> bool:
    if re.search(r"\\[A-Za-z]", run):
        return True
    if re.search(r"\.(py|pdf|json|md|txt|html|tex|png)$", run, re.I):
        return True
    return run.count("_") >= 2 and bool(re.search(r"[a-z]{6,}", run))


def render_run(run: str) -> str:
    if is_codeish(run):
        return r"\texttt{" + escape_plain(run) + "}"
    body = mathify(run)
    if not body:
        return escape_plain(run)
    return r"\(" + body + r"\)"


def escape_text(text: str) -> str:
    out = []
    pos = 0
    for match in RUN_RE.finditer(text):
        run = match.group(0)
        if not any(ch in SIGNALS for ch in run):
            continue
        out.append(escape_plain(text[pos:match.start()]))
        out.append(render_run(run))
        pos = match.end()
    out.append(escape_plain(text[pos:]))
    return "".join(out)


def looks_like_title(text: str) -> bool:
    return (
        " " in text
        and not CJK_RE.search(text)
        and bool(re.search(r"[A-Za-z]{4,}", text))
    )


def sanitize_url(url: str) -> str:
    return (
        url.replace("\\", "/")
        .replace("%", r"\%")
        .replace("#", r"\#")
        .replace("_", r"\_")
        .replace("&", r"\&")
        .replace("~", r"\textasciitilde{}")
    )


def render_link(label: str, target: str) -> str:
    body = render_inline(label)
    if target.lower().startswith(("http://", "https://", "mailto:")):
        return r"\href{" + sanitize_url(target) + "}{" + body + "}"
    return body


def render_code(body: str) -> str:
    if CJK_RE.search(body):
        return r"\texttt{" + escape_plain(body) + "}"
    return r"\(" + mathify(body) + r"\)"


def balance_math(text: str) -> str:
    """Close ``\\(``/``\\[`` groups that the Markdown source leaves open.

    The generated index table truncates a few long cells in the middle of a
    formula; LaTeX needs both delimiters, so the fragment is closed instead of
    being escaped as text.
    """
    while text.count(r"\(") > text.count(r"\)"):
        stripped = text.rstrip()
        if stripped.endswith("\\"):
            text = stripped + " \\)" + text[len(stripped):]
        else:
            text = text + r"\)"
    while text.count(r"\[") > text.count(r"\]"):
        text = text + r"\]"
    return text


def render_inline(text: str) -> str:
    text = balance_math(text)
    out = []
    pos = 0
    for match in TOKEN_RE.finditer(text):
        if match.start() > pos:
            out.append(escape_text(text[pos:match.start()]))
        token = match.group(0)
        if token.startswith("\\(") or token.startswith("\\["):
            out.append(token)
        elif token.startswith("`"):
            out.append(render_code(token[1:-1]))
        elif token.startswith("["):
            out.append(render_link(match.group(1), match.group(2).strip("<>")))
        elif token.startswith("**"):
            out.append(r"\textbf{" + render_inline(token[2:-2]) + "}")
        else:
            inner = token[1:-1]
            if looks_like_title(inner):
                out.append(r"\emph{" + render_inline(inner) + "}")
            else:
                out.append(escape_text(token))
        pos = match.end()
    out.append(escape_text(text[pos:]))
    return "".join(out)


# --------------------------------------------------------------------------
# Block structure
# --------------------------------------------------------------------------


HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$")
LIST_RE = re.compile(r"^([-*+]|\d+[.)])\s+(.*)$")


def split_cells(line: str) -> list[str]:
    return [cell.strip() for cell in line.strip().strip("|").split("|")]


def scan(lines: list[str]) -> list[tuple[str, object]]:
    blocks: list[tuple[str, object]] = []
    i, n = 0, len(lines)
    while i < n:
        stripped = lines[i].strip()
        if not stripped:
            i += 1
            continue
        if stripped == "---":
            j = i + 1
            while j < n and not lines[j].strip():
                j += 1
            if j < n and lines[j].strip().startswith("原章节"):
                i = j
                continue
            blocks.append(("hr", None))
            i += 1
            continue
        if stripped.startswith("\\["):
            j = i
            buf = []
            while j < n:
                buf.append(lines[j].strip())
                if lines[j].strip().endswith("\\]"):
                    break
                j += 1
            blocks.append(("display", buf))
            i = j + 1
            continue
        heading = HEADING_RE.match(stripped)
        if heading:
            blocks.append(("heading", (len(heading.group(1)), heading.group(2).strip())))
            i += 1
            continue
        if stripped.startswith("原章节"):
            blocks.append(("note", stripped))
            i += 1
            continue
        if stripped.startswith("|"):
            j = i
            buf = []
            while j < n and lines[j].strip().startswith("|"):
                buf.append(lines[j].strip())
                j += 1
            blocks.append(("table", buf))
            i = j
            continue
        item = LIST_RE.match(stripped)
        if item:
            items: list[tuple[str, list[str]]] = []
            while i < n:
                current = LIST_RE.match(lines[i].strip())
                if not current:
                    break
                marker, first = current.group(1), current.group(2)
                body = [first]
                i += 1
                while i < n:
                    nxt = lines[i]
                    if not nxt.strip():
                        k = i + 1
                        while k < n and not lines[k].strip():
                            k += 1
                        if k < n and (lines[k].startswith((" ", "\t"))):
                            body.append("")
                            i += 1
                            continue
                        break
                    if nxt.startswith((" ", "\t")):
                        body.append(nxt.strip())
                        i += 1
                        continue
                    break
                items.append((marker, body))
                while i < n and not lines[i].strip():
                    k = i + 1
                    while k < n and not lines[k].strip():
                        k += 1
                    if k < n and LIST_RE.match(lines[k].strip()):
                        i = k
                    break
            blocks.append(("list", items))
            continue
        # paragraph
        buf = []
        while i < n:
            nxt = lines[i]
            if not nxt.strip():
                break
            if nxt.strip().startswith("\\["):
                break
            if HEADING_RE.match(nxt.strip()) or nxt.strip() == "---":
                break
            if nxt.strip().startswith("|") or LIST_RE.match(nxt.strip()):
                break
            if nxt.strip().startswith("原章节"):
                break
            buf.append(nxt)
            i += 1
        blocks.append(("para", buf))
    return blocks


def attach_notes(blocks: list[tuple[str, object]]) -> list[tuple[str, object]]:
    """Move ``原章节`` notes directly after the heading they introduce."""
    out: list[tuple[str, object]] = []
    idx = 0
    while idx < len(blocks):
        kind, payload = blocks[idx]
        if kind == "note" and idx + 1 < len(blocks) and blocks[idx + 1][0] == "heading":
            out.append(blocks[idx + 1])
            out.append((kind, payload))
            idx += 2
            continue
        out.append((kind, payload))
        idx += 1
    return out


# --------------------------------------------------------------------------
# Rendering
# --------------------------------------------------------------------------


def render_display(buf: list[str]) -> str:
    body = "\n".join(buf)
    body = re.sub(r"^\\\[", "", body).strip()
    body = re.sub(r"\\\]$", "", body).strip()
    if "\n\n" in body or body.count("{") != body.count("}"):
        return "\n\\[\n" + body + "\n\\]\n"
    return "\n\\mcsdisplay{" + body + "}\n"


def render_item_body(lines: list[str]) -> str:
    parts: list[str] = []
    buf: list[str] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.strip().startswith("\\["):
            if buf:
                parts.append(render_inline(join_lines(buf)))
                buf = []
            j = i
            display = []
            while j < len(lines):
                display.append(lines[j].strip())
                if lines[j].strip().endswith("\\]"):
                    break
                j += 1
            parts.append(render_display(display))
            i = j + 1
            continue
        buf.append(line)
        i += 1
    if buf:
        parts.append(render_inline(join_lines(buf)))
    return "\n".join(p.strip() for p in parts if p.strip())


def render_list(items: list[tuple[str, list[str]]]) -> str:
    bullets = not items[0][0][0].isdigit()
    label = "itemize" if bullets else "enumerate"
    options = ""
    if not bullets:
        start = int(re.match(r"\d+", items[0][0]).group(0))
        if start != 1:
            options = f"[start={start}]"
    lines = [f"\\begin{{{label}}}{options}"]
    for _, body in items:
        lines.append(r"\item " + render_item_body(body))
    lines.append(f"\\end{{{label}}}")
    return "\n".join(lines) + "\n"


def normalize_row(cells: list[str], ncols: int) -> list[str]:
    if len(cells) == ncols:
        return cells
    if len(cells) < ncols:
        return cells + [""] * (ncols - len(cells))
    extra = len(cells) - ncols
    merged = "|".join(cells[1:1 + extra + 1])
    return [cells[0], merged] + cells[2 + extra:]


def render_table(rows: list[str]) -> str:
    header = split_cells(rows[0])
    ncols = len(header)
    aligns = []
    for cell in split_cells(rows[1]):
        left, right = cell.startswith(":"), cell.endswith(":")
        aligns.append("c" if left and right else ("r" if right else "l"))
    body = [normalize_row(split_cells(row), ncols) for row in rows[2:]]

    header_widths = [display_width(cell) for cell in header]
    body_widths = [[display_width(cell) for cell in row] for row in body]
    longest_tokens = []
    for col in range(ncols):
        widest = 0
        for row in body:
            for token in re.findall(r"[A-Za-z0-9_\\{}()\[\].,:;/+-]{3,}", row[col]):
                widest = max(widest, display_width(token))
        longest_tokens.append(widest)
    weights, natural, units = [], [], []
    for col in range(ncols):
        cells = sorted(row[col] for row in body_widths) or [6]
        values = sorted(cells + [header_widths[col]])
        p50 = values[min(len(values) - 1, int(0.5 * len(values)))]
        p75 = values[min(len(values) - 1, int(0.75 * len(values)))]
        widest = values[-1]
        units.append(widest)
        natural.append(max(cells) <= 6 and header_widths[col] <= 12 and p75 <= 5)
        blended = 0.45 * p50 + 0.55 * p75
        blended = max(blended, 1.08 * longest_tokens[col])
        weights.append(min(max(blended, 4.0), max(90.0 / ncols, 14.0)))
    if all(natural):
        natural[max(range(ncols), key=lambda c: units[c])] = False

    # Natural columns are typeset at their natural width; the paragraph
    # columns share what is left (12pt base size, ~452pt text width).
    reserved = sum(
        (units[col] / 2.0 * 12.0 + 8.0) / 452.0
        for col in range(ncols)
        if natural[col]
    )
    available = max(0.4, 1.0 - reserved)
    total = sum(weight for col, weight in enumerate(weights) if not natural[col])

    alignment = {"l": r"\raggedright", "c": r"\centering", "r": r"\raggedleft"}
    spans = []
    for col in range(ncols):
        if natural[col]:
            if aligns[col] == "l":
                spans.append("l")
            elif aligns[col] == "r":
                spans.append("r")
            else:
                spans.append("c")
        else:
            frac = weights[col] / total * available
            spans.append(
                ">{" + alignment[aligns[col]] + r"\arraybackslash}p{\dimexpr "
                f"{frac:.4f}\\linewidth-2\\tabcolsep\\relax}}"
            )

    def row_line(cells: list[str], bold: bool = False) -> str:
        rendered = []
        for cell in cells:
            text = render_inline(cell)
            rendered.append(r"\textbf{" + text + "}" if bold and text else text)
        return " & ".join(rendered) + r" \\"

    lines = [
        r"\begingroup\small\setlength{\tabcolsep}{4pt}",
        r"\begin{longtable}{" + "".join(spans) + "}",
        r"\toprule",
        row_line(header, bold=True),
        r"\midrule",
        r"\endfirsthead",
        r"\toprule",
        row_line(header, bold=True),
        r"\midrule",
        r"\endhead",
        r"\bottomrule",
        r"\endfoot",
        r"\bottomrule",
        r"\endlastfoot",
    ]
    lines += [row_line(row) for row in body]
    lines += [r"\end{longtable}", r"\endgroup", ""]
    return "\n".join(lines) + "\n"


PREAMBLE = r"""% !TEX program = xelatex
% 数学认知空间 MCS：学习者状态外置的完整理论专稿
% 由 edition/MCS-完整理论专稿.md 经 validation/build_latex.py 生成。
% 编译：xelatex（连续运行两次以生成目录与页码）。
\documentclass[UTF8,a4paper,zihao=-4,fontset=windows,openany]{ctexbook}

\usepackage{amsmath}
\usepackage{amssymb}
\usepackage{array}
\usepackage{longtable}
\usepackage{booktabs}
\usepackage{enumitem}
\usepackage{geometry}
\usepackage{graphicx}
\usepackage{xcolor}
\usepackage{fancyhdr}
\usepackage[hidelinks,unicode]{hyperref}

\geometry{a4paper,left=2.6cm,right=2.6cm,top=2.7cm,bottom=2.5cm,headsep=0.5cm,headheight=15pt}
\linespread{1.32}

\setmainfont{Times New Roman}
\setsansfont{Arial}
\setmonofont{Consolas}[Scale=0.88]

\setcounter{secnumdepth}{-2}
\setcounter{tocdepth}{1}
\setlength{\parindent}{2em}
\tolerance=2000
\emergencystretch=2em
\renewcommand{\arraystretch}{1.18}

\newcommand{\mcspow}[1]{\ensuremath{^{\mathrm{#1}}}}
\newcommand{\mcssub}[1]{\ensuremath{_{\mathrm{#1}}}}
\newcommand{\mcsnum}[1]{\textcircled{\scriptsize #1}}
\newcommand{\mcsorigin}[1]{\par\noindent{\small\color{black!55}#1}\par\addvspace{0.8em}}
\newcommand{\mcssep}{\par\addvspace{0.6em}\noindent\rule{\linewidth}{0.2pt}\par\addvspace{0.6em}}

\newsavebox{\mcsmathbox}
\newcommand{\mcsdisplay}[1]{%
  \par\addvspace{0.7em}%
  \sbox{\mcsmathbox}{\ensuremath{\displaystyle #1}}%
  \ifdim\wd\mcsmathbox>\linewidth
    \noindent\resizebox{\linewidth}{!}{\usebox{\mcsmathbox}}%
  \else
    \noindent\hspace*{\fill}\usebox{\mcsmathbox}\hspace*{\fill}%
  \fi
  \par\addvspace{0.7em}%
}

\pdfstringdefDisableCommands{%
  \def\ensuremath#1{#1}%
  \def\text#1{#1}%
  \def\operatorname#1{#1}%
  \def\mathrm#1{#1}%
}

\providecommand{\llbracket}{\mathopen{[\![}}
\providecommand{\rrbracket}{\mathclose{]\!]}}
\newcommand{\mcsbrk}{\penalty 200\relax}

\pagestyle{fancy}
\fancyhf{}
\fancyhead[L]{\small\itshape 数学认知空间 MCS}
\fancyhead[R]{\small\thepage}
\renewcommand{\headrulewidth}{0.25pt}
\fancypagestyle{plain}{\fancyhf{}\fancyhead[R]{\small\thepage}\renewcommand{\headrulewidth}{0pt}}

\title{\Huge 数学认知空间 MCS\\[0.7em]\Large 新时代数学教育的基础设施\\[0.45em]\large 可认证的数学知识本体与个性化学习路线}
\author{刘沛恒}
\date{}

\hypersetup{%
  pdftitle={数学认知空间 MCS：新时代数学教育的基础设施},
  pdfauthor={刘沛恒},
  pdfsubject={可认证的数学知识本体与个性化学习路线},
}

\begin{document}
\maketitle
\thispagestyle{empty}
"""


def main() -> None:
    markdown = SRC.read_text(encoding="utf-8")
    blocks = attach_notes(scan(markdown.split("\n")))

    title = "数学认知空间 MCS：学习者状态外置的完整理论专稿"
    front: list[tuple[str, object]] = []
    body: list[tuple[str, object]] = []
    for kind, payload in blocks:
        if not body:
            if kind == "heading" and payload[0] == 1:
                title = payload[1]
                continue
            if kind == "heading" and payload[0] >= 2:
                body.append((kind, payload))
                continue
            if kind in ("hr",):
                continue
            if kind == "note":
                continue
            front.append((kind, payload))
            continue
        body.append((kind, payload))

    out = [PREAMBLE]
    for kind, payload in front:
        if kind == "para":
            out.append(render_inline(join_lines(payload)) + "\n")
        elif kind == "table":
            out.append(render_table(payload))
        elif kind == "list":
            out.append(render_list(payload))
        elif kind == "display":
            out.append(render_display(payload))
    out.append("\\tableofcontents\n\\clearpage\n")

    glue = False
    for kind, payload in body:
        if kind == "heading":
            level, text = payload
            command = {2: "chapter", 3: "section", 4: "subsection"}.get(level, "subsubsection")
            text = text.replace("\u3000", " ")
            if command == "chapter":
                out.append("\\clearpage" if not glue else "")
            out.append(f"\\{command}{{{render_inline(text)}}}\n")
            glue = False
        elif kind == "note":
            out.append("\\mcsorigin{" + render_inline(payload) + "}\n")
        elif kind == "para":
            text = render_inline(join_lines(payload))
            prefix = "\\noindent " if glue else ""
            out.append(prefix + text + "\n\n")
            glue = False
        elif kind == "display":
            out.append(render_display(payload))
            glue = True
        elif kind == "table":
            out.append(render_table(payload))
            glue = False
        elif kind == "list":
            out.append(render_list(payload))
            glue = False
        elif kind == "hr":
            out.append("\\mcssep\n")
            glue = False

    out.append("\n\\end{document}\n")
    document = "".join(out)
    DEST.write_text(document, encoding="utf-8")

    leftovers = Counter(
        ch for ch in document
        if ord(ch) > 127 and not CJK_RE.match(ch) and ch not in "–—§…“”‘’《》°±"
    )
    print(f"wrote {DEST} ({DEST.stat().st_size} bytes)")
    print("blocks:", len(blocks), "| tables:", sum(1 for k, _ in body if k == "table"))
    print("leftover non-ASCII, non-CJK characters:", leftovers.most_common(30))


if __name__ == "__main__":
    main()
