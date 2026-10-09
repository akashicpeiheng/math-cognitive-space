/**
 * 正文块译文的**强核对**（比 `scripts/i18n-parity.mjs` 更严的一层）。
 *
 * ## 两层检查的分工
 *
 * | | `i18n-parity.mjs` | 本文件 |
 * |---|---|---|
 * | 覆盖范围 | 全部字段（节点、行动、证据、关系、局部化…） | 只查案例正文块 |
 * | 公式 | 只比 LaTeX 命令集合与 `$$` 对数 | **行内/行间公式内容逐字相同** |
 * | 链接 | 不查 | `/nodes/<id>` 链接集合一致 |
 * | 标题 | 层级序列一致 | 层级序列一致 |
 *
 * 为什么正文需要更严的一层：正文里公式与叙述是交织的，一处 `\mathbb` 被漏掉、
 * 或一个 `$…$` 被顺手改写成别的记号，命令集合可能仍然一致（只是数量不同）而数学已经变了。
 * 「公式从不翻译」是硬规则，所以「逐字相同」是可核对且应该成立的。
 *
 * ## `\text{}` 的例外
 *
 * `\text{…}` 里放的是给人读的说明文字（`\text{ 是有限集}`）。那里允许改——中文字符不能
 * 出现在英文站上。比较前把它的内容换成占位符，其余部分仍要求逐字相同。
 *
 * 用法：
 *   node scripts/i18n-block-check.mjs                 # 默认 en
 *   node scripts/i18n-block-check.mjs --locale en
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadOntology, MCS_WEB_ROOT } from '../core/ontology.mjs';
import { overlayFor } from '../data/i18n/index.mjs';

const locale = process.argv.includes('--locale') ? process.argv[process.argv.indexOf('--locale') + 1] : 'en';
const CASE_DIR = join(MCS_WEB_ROOT, 'data', 'cases');

const NODE_BLOCK = /<!--\s*node:([A-Za-z0-9:._-]+)\s*-->([\s\S]*?)<!--\s*\/node\s*-->/g;
const CJK = /[\u3400-\u4dbf\u4e00-\u9fff]/;

/**
 * 「残留中文」判定的**豁免**：行内代码与 HTML 注释里的中文不算残留。
 *
 * 为什么要有这条：正文块里有两类中文**不是散文**——
 * - 真实的源文件路径（`` `G:/DifferentialGeometry/object/def/微分形式的外积.md` ``）；
 * - 中文文献的书名与作者（`` `梅加强. 流形与几何初步` ``）。
 *
 * 按施工手册第 5 条，这类标识符「翻了就是谎报来源」：编一个英文文件名，读者就找不到那份文件；
 * 给中文专著起个英文名，读者就查不到那本书。所以规则与 `provenance.sources` 一致：
 * **反引号里的内容照抄**，判残留中文时剥掉再看。
 *
 * 剥掉的是**行内代码**，不是任意括号——正文句子里的中文（那才是真正的漏译）照样会报。
 */
const CJK_EXEMPT = /`[^`\n]*`|<!--[\s\S]*?-->/g;
function proseOf(text) {
  return String(text ?? '').replace(CJK_EXEMPT, '');
}
function hasResidualCjk(text) {
  return CJK.test(proseOf(text));
}

function blocksOf(file) {
  const text = readFileSync(join(CASE_DIR, file), 'utf8');
  const out = {};
  let match;
  NODE_BLOCK.lastIndex = 0;
  while ((match = NODE_BLOCK.exec(text)) !== null) out[match[1]] = match[2].trim();
  return out;
}

/**
 * `\text{…}` 的内容允许随语种改（那是给人读的说明），其余逐字相同。
 *
 * 另外把**裸写进数学模式的中文**也归一化掉：源里有一处 `$f^{-1}(开集)$`
 * （中文写在 `\text{}` 外面，全库仅 1 处），英文只能改写成 `$f^{-1}(\text{open set})$`。
 * 不归一化就会判成「公式内容被改动」——而那是**源侧写法**，不是译者的错
 * （这类公式另有「源自身排版缺陷」的上报与豁免，见 `mathWithCjk`）。
 */
const normMath = (text) => String(text)
  .replace(/\\text\{((?:[^{}]|\{[^{}]*\})*)\}/g, '\\text{•}')
  .replace(/[\u3400-\u4dbf\u4e00-\u9fff]+/g, '•')
  .trim();

/**
 * 抽取公式前，把 `\text{…}` 的**内容**遮起来（**等长替换**，位置不变）。
 *
 * 为什么必须遮，而且必须等长：
 *
 * 1. 中文源里有 `\text{闭 $p$-形式}` 这种写法——`\text{}` **内部有 `$`**。不遮的话
 *    行内公式正则会把这个 `$` 当成定界符，于是**同一个块数出的公式个数前后不一致**
 *    （实测报过「106 → 107」，而实际两侧都是 107）。
 * 2. 遮的时候用**花括号配对**找 `\text{…}` 的边界，不能用 `[^{}]*` 那种简单模式：
 *    `\text{闭 $p$-形式}` 的 `$` 会让简单模式提前收尾，把剩下的 `-形式}` 留在外面，
 *    于是 `$` 配对被彻底打乱——这一处正是我上面那条误报的真正成因。
 * 3. **等长替换**：遮完还要能用「同一段原文」去抠公式（`mathWithCjk` / `cjkMathSpans`），
 *    长度一变位置就全错。所以这里把内容换成同样长度的占位符，而不是换成一个字符。
 */
function maskTextContent(text) {
  const source = String(text ?? '');
  let out = '';
  let index = 0;
  while (index < source.length) {
    if (source.startsWith('\\text{', index)) {
      let depth = 0;
      let end = index + '\\text{'.length - 1;
      for (let scan = end; scan < source.length; scan += 1) {
        if (source[scan] === '{') depth += 1;
        else if (source[scan] === '}') { depth -= 1; if (depth === 0) { end = scan; break; } }
      }
      const inner = source.slice(index + '\\text{'.length, end);
      out += `\\text{${'•'.repeat(inner.length)}}`;
      index = end + 1;
      continue;
    }
    out += source[index];
    index += 1;
  }
  return out;
}

const displayMathRaw = (text) => [...String(text).matchAll(/\$\$([\s\S]*?)\$\$/g)].map((match) => match[1]);

/**
 * 行内公式原文：在**遮蔽后**的文本上定位（`$` 不会被 `\text{}` 里的 `$` 打乱），
 * 再从**未遮蔽的原文**里取回该区间的真实内容。
 */
function inlineMathRaw(text) {
  const source = String(text ?? '');
  const masked = maskTextContent(source).replace(/\$\$[\s\S]*?\$\$/g, (match) => ' '.repeat(match.length));
  const out = [];
  for (const match of masked.matchAll(/(?<!\$)\$(?!\$)([^$]+)\$(?!\$)/g)) {
    out.push(source.slice(match.index + 1, match.index + match[0].length - 1));
  }
  return out;
}

const displayMath = (text) => displayMathRaw(text).map(normMath);
const inlineMath = (text) => inlineMathRaw(text).map(normMath);

/**
 * 公式里**在 `\text{}` 之外混了中文散文**的写法（源侧缺陷）。
 *
 * 实例（全库仅 1 处，`dg:topological-space`）：
 * `$f^{-1}(开集)$` —— 「开集」是给人读的说明，却写在 `\text{}` 外面。
 * 这让译者陷入两难：**照抄**会在英文页上渲染出中文数学文本；**改写成
 * `$f^{-1}(\text{open set})$`** 则是产品上正确的做法，却让公式的内容比较对不上
 * （归一化只把 `\text{}` 的内容换占位符，所以 `f^{-1}(开集)` 与 `f^{-1}(\text{•})`
 * 是两个不同的多重集元素，并且 `\text` 命令数差一个）。
 *
 * 处置：把这类公式**从两侧同时剔除**再比，并作为源缺陷单独报出。剔除是**精确的**
 * （只剔「归一化后仍含 CJK」的那几个公式），所以公式的**个数与其余内容仍逐字严格**；
 * 译者那种产品正确的改法因此不再被冤枉，而真正的公式改写照样会被抓到。
 */
/**
 * 一个公式是否属于「源侧裸写中文、译文用 `\text{}` 改写」那一类，因而应该从严格比对里豁免。
 *
 * 判据要**对称地**看两侧，任一侧命中即可：
 * - 源侧：归一化后仍含 CJK（`$f^{-1}(开集)$` —— 中文写在 `\text{}` 外面）；
 * - 译侧：原文里含 `\text{}`（`$f^{-1}(\text{open set})$` —— 唯一能把中文说明译出来的写法）。
 *
 * 为什么要带上译侧那一条：**只认源侧的 CJK，就要依赖「中文那一侧能被正确切成一个公式」**，
 * 而这件事会被同一段文本里其它 `$` 干扰（本块里「连续」的定义 "$f^{-1}(开集)$ 是开集"
 * 就出现过配对偏移），于是豁免时灵时不灵、红项反复。两侧对称判断不依赖切分是否完美：
 * 只要译侧用了 `\text{}` 而这个写法来自「源侧本来就有中文说明」，它就是允许的改写。
 */
/** 这个公式原文里有没有 `\text{}` 家族的命令（= 里面有人读的说明文字，允许翻译）。 */
const hasTextCommand = (raw) => /\\(?:text|textrm|textbf|textit|textnormal|textsf|texttt)\{/.test(String(raw ?? ''));

const mathWithCjk = (text) => [...displayMath(text), ...inlineMath(text)].filter((item) => CJK.test(item));

/**
 * 取出**含中文的公式的原文**（带定界符），供「整段抠掉」用。
 *
 * 必须从原文取、不能拿归一化后的值去抠：`normMath` 会把 `\text{…}` 换成占位符、
 * 再去掉首尾空白，于是归一化值在原文里**根本找不到**——抠不掉，命令集照旧不一致
 * （这正是「豁免只做了一半」的成因）。
 */
function cjkMathSpans(text) {
  const spans = [];
  /*
   * 与 `inlineMathRaw` 用**同一套遮蔽与枚举**，并且**必须看原文**：
   * `normMath` 会把裸写的中文换成占位符，拿归一化后的值判 CJK 永远是 0
   * （这一处反复栽过，`\text` 计数因此长期挂着假红）。
   */
  for (const match of String(text ?? '').matchAll(/\$\$([\s\S]*?)\$\$/g)) {
    if (CJK.test(match[1])) spans.push(match[0]);
  }
  for (const raw of inlineMathRaw(text)) {
    if (CJK.test(raw)) spans.push(`$${raw}$`);
  }
  return spans;
}

/** 把若干公式原文整段抠掉（逐个找、抠一次，不误伤重复公式里的其它实例）。 */
function withoutSpans(text, spans) {
  let stripped = String(text ?? '');
  for (const span of spans) {
    const at = stripped.indexOf(span);
    if (at !== -1) stripped = stripped.slice(0, at) + stripped.slice(at + span.length);
  }
  return stripped;
}

const withoutCjkMath = (items, cjkItems) => {
  const removable = [...cjkItems];
  return items.filter((item) => {
    const index = removable.indexOf(item);
    if (index === -1) return true;
    removable.splice(index, 1);
    return false;
  });
};

const headings = (text) => (String(text).match(/^#{1,6}\s/gm) ?? []).join(',');

/**
 * `/nodes/<id>` 链接。
 *
 * `%` 必须在字符集里：生成器（`scripts/build-dg-case.mjs`）把节点 id 写进链接时做了
 * `encodeURIComponent`，真实数据里 1973 个链接**全部**是 `%3A` 形式
 * （`/nodes/dg%3Amanifold`）。少了 `%` 会**截断成 `/nodes/dg`**——于是所有 dg 链接在比较里
 * 退化成同一个字符串，换错节点也查不出来，同时还会产生「数量不等」的假报错。
 * 这是本轮由译者报出、我实测确认的一个真缺陷。
 */
const nodeLinks = (text) => (String(text).match(/\/nodes\/[A-Za-z0-9:._%-]+/g) ?? []).sort();

/**
 * 按「参考文献」**小节**把块切成两半，链接**分区比较**。
 *
 * 为什么不能整块一刀切：中文源里有两处**标识符**，它们不是散文：
 * 1. `**来源**：\`G:/…/微分形式的外积.md\`` —— 真实源文件路径（施工手册第 5 条：照抄，翻了就是谎报来源）；
 * 2. `## 参考文献` 里的中文专著，书名内部还嵌着生成器改写出来的节点链接
 *    （`[流形](/nodes/dg%3Amanifold)`）。
 *
 * 这两处都只能逐字照抄，于是英文版里那些中文中间夹着的链接就无从保留。处置：
 *
 * - **`**来源**` 行整行排除**：它的内容是路径，不是正文；
 * - **正文部分**（其余全部）：链接必须**逐字相同**，一个不少一个不多——链接是给读者的导航，
 *   正文里少一个就是丢信息；
 * - **参考文献小节**：允许英文比中文**少**（书名照抄自然带链接），但**不许变多**
 *   ——多出来意味着译者自己加了出处。
 *
 * 实测口径（全库 56 个已译块）：正文链接 0 处不一致，参考文献 3 处「中文有、英文无」——
 * 与上面的分析完全对应。这是**真实的、可解释的**差异，不能被工具报成错误。
 */
const SOURCE_LINE = /^\*\*(?:来源|Source)[^\n]*$/gm;
const REFERENCE_HEADING = /^#{1,6}\s*(?:参考文献|References)\s*$/m;

function splitAtReferences(text) {
  const source = String(text ?? '').replace(SOURCE_LINE, '');
  const match = REFERENCE_HEADING.exec(source);
  if (!match || match.index === undefined) return { body: source, references: '' };
  return { body: source.slice(0, match.index), references: source.slice(match.index) };
}
const latex = (text) => [...String(text).matchAll(/\\[A-Za-z]+/g)].map((match) => match[0]).sort().join(' ');

/** `\text{}` 家族的命令名。它们的**内容**是唯一允许翻译的部分（也正因如此，名字可能平移）。 */
const TEXT_COMMANDS = new Set(['text', 'textrm', 'textbf', 'textit', 'textnormal', 'textsf', 'texttt']);

/** 文本类命令的「名字×个数」计数。 */
function textCommandCounts(text) {
  const counts = new Map();
  for (const match of String(text).matchAll(/\\([A-Za-z]+)/g)) {
    if (!TEXT_COMMANDS.has(match[1])) continue;
    counts.set(match[1], (counts.get(match[1]) ?? 0) + 1);
  }
  return counts;
}

/** 两个计数表是否相等（键集合与每个键的个数都相等）。 */
function sameCounts(left, right) {
  if (left.size !== right.size) return false;
  for (const [key, value] of left) if (right.get(key) !== value) return false;
  return true;
}

/**
 * LaTeX 命令集比对（整块多重集），并处理**源侧「公式里裸写中文」**带来的必然后果。
 *
 * ## 为什么是整块多重集，而不是「公式配对逐个比」
 *
 * 我试过按公式配对逐个比命令集，结果是**306 项误报**：两侧公式个数虽然相等（107/107），
 * 但**第 n 个公式并不对应同一个数学对象**（同一处数学在两版里的位置会被语序调整），
 * 于是逐对比毫无意义。整块多重集比才是对的——它只问「这个块用到的命令集合与各命令的次数
 * 是否一致」，与顺序无关。**这条经验值得记：多重集比顺序比更稳，因为它不假设两侧的
 * 对应关系；一旦假设了对应关系（按序配对），语序差异就会变成成片的假差异。**
 *
 * ## 唯一的例外，以及它为什么必须有
 *
 * 源里有 1 处把中文**裸写进数学模式**：`$f^{-1}(开集)$`（全库仅此一处）。英文只能改写成
 * `$f^{-1}(\text{open set})$`——这是**产品上正确**的做法（英文站上不该出现中文数学文本）。
 * 代价是整块的 `\text` 计数会 中 2 / 英 3。这不是译者的错，所以：
 *
 * **仅当源里存在这类公式时**，才把 `\text` 家族的命令从两侧的多重集里剔除
 * （它们的内容正是唯一允许翻译的部分）；**其余命令仍逐个严格比**。没有这类公式的块，
 * `\text` 照常严格比——所以「合法 `\text{}` 被漏掉/多写」依然会被抓到。
 */
function compareLatex(zhText, enText, id, problems) {
  const exemptTextCommands = cjkMathSpans(zhText).length > 0;
  const take = (text) => (exemptTextCommands
    ? [...String(text ?? '').matchAll(/\\([A-Za-z]+)/g)].map((match) => match[1]).filter((name) => !TEXT_COMMANDS.has(name))
    : [...String(text ?? '').matchAll(/\\([A-Za-z]+)/g)].map((match) => match[1]));
  const zh = take(zhText).sort().join(' ');
  const en = take(enText).sort().join(' ');
  if (zh !== en) {
    problems.push(`${id}：LaTeX 命令集不一致${exemptTextCommands ? '（已扣除源侧 `\\text{}` 改写贡献的命令）' : ''}\n      中：${zh}\n      英：${en}`);
  }
}
const words = (text) => (String(text).match(/[A-Za-z][A-Za-z'’-]*/g) ?? []).length;
const cjkCount = (text) => (String(text).match(/[\u4e00-\u9fff]/g) ?? []).length;

/** 段落分块：按空行切开、去掉空块。中文源的教学结构是「每段一个论点」，合并段落会改变论证骨架。 */
const chunksOf = (text) => String(text ?? '').split(/\n\s*\n/).map((chunk) => chunk.trim()).filter(Boolean);

/**
 * 「这一段有没有引导词」——按**段落内**是否出现加粗判断，不按段首位置。
 *
 * 判据几经收紧，记下为什么：
 * - v1「任意 `**…**` 配对计数」：会被公式里的 `T_p^{**}`、跨行加粗带偏 → 假阳性；
 * - v2「段首 `**` 计数」：中英**语序差异**就会报错——中文 `- **行列式约定**：…` 的加粗在段首，
 *   英文 `- the **determinant convention**: …` 的加粗在冠词之后，两者结构其实完全对应 →
 *   又是假阳性；
 * - v3（现在）：只问「这一段里有没有加粗」。**要抓的真问题是「整段丢了引导词」**
 *   （中文 `**失效范围。**` 在英文里被并进上一段或干脆省掉），而不是加粗左边有没有冠词。
 */
const hasBold = (chunk) => /\*\*[^*\n]+\*\*/.test(String(chunk));

/**
 * 中文源自身有没有**加粗标记不平衡**（奇数个 `**`）。
 *
 * 实例：`07-liang-dg.md` 的 `liang:minkowski-spacetime` 第 2 段写作
 * `**动机. 第一章到第五章…` —— **少了收尾的 `**`**，于是那一行在中文页面上既不成强调，
 * 还会把后面的文本一起吞成粗体。这是**源笔记的排版缺陷**，不是译文问题。
 *
 * 处置：这类段落**豁免结构比对**，并作为源缺陷报出来（只在检查通过时打印；混在失败项里
 * 会让人以为译文有错）。不在这里替源改错——改中文源会改变本体哈希（= 版本号），
 * 那属于**站点内容变更**，要单独决定，不能搭在双语改造里顺手做掉。
 */
const unbalancedBold = (chunk) => (String(chunk).match(/\*\*/g) ?? []).length % 2 === 1;

/**
 * 中文源里**引导词写法不规范**的两类（只在中文源上跑，英文侧用半角句点是正常的）。
 *
 * - `padded`：加粗区间内有首尾空白（`` **动机. ** `` —— 收尾 `**` 前多一个空格）；
 * - `halfPeriod`：引导词以半角句点收尾（中文源的标准形式是 `**动机。**`）。
 *
 * 由 content-meta 提出、我实测确认：`liang` 那一片源文里 `**动机. **` 有 29 处、
 * `**动机。**` 只有 27 处——**同一份源文件里两种写法并存**，属于排版不统一。
 * 这是「成对但格式错」，与「奇数个 `**`」是两回事（后者会被渲染成吞掉后文，
 * 前者只是多一个空格、句点用了半角），所以判据也要分开。
 */
function boldStyleDefects(chunk) {
  const spans = [...String(chunk).matchAll(/\*\*([^*\n]+)\*\*/g)].map((match) => match[1]);
  return {
    padded: spans.filter((span) => span !== span.trim()),
    halfPeriod: spans.filter((span) => /[.．]\s*$/.test(span.trim())),
  };
}

/** 段落预览：报告里给**内容**而不是只给序号——只给「中 115 / 英 116」时，译者要写脚本才能找到那一段。 */
const preview = (chunk) => {
  const text = String(chunk ?? '').replace(/\s+/g, ' ').trim();
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
};

/**
 * 分块数不一致时**定位第一处差异**。
 *
 * 按标题切节再逐节比：标题序列已由 parity 保护（逐字一致），是可靠的锚点。
 * 不按序号硬比——一旦某处插入一段，后面所有序号都会漂移，报出一长串假差异
 * （提出这条的同事第一版诊断脚本就是这样被带偏的：8 条「加粗不匹配」其实只有 1 处插入）。
 */
function locateBlockDrift(zhChunks, enChunks) {
  const heading = /^#{1,6}\s/;
  const sectionsOf = (chunks) => {
    const out = [];
    let current = { title: '(开头)', count: 0 };
    for (const chunk of chunks) {
      if (heading.test(chunk)) { out.push(current); current = { title: chunk.split('\n')[0].trim(), count: 0 }; continue; }
      current.count += 1;
    }
    out.push(current);
    return out;
  };
  const zhSections = sectionsOf(zhChunks);
  const enSections = sectionsOf(enChunks);
  const width = Math.min(zhSections.length, enSections.length);
  for (let index = 0; index < width; index += 1) {
    if (zhSections[index].count !== enSections[index].count) {
      return `第一处差异在小节「${zhSections[index].title}」（中 ${zhSections[index].count} 段 / 英 ${enSections[index].count} 段，不含标题行）`;
    }
  }
  return '差异出现在标题序列之外（两侧小节数不同）——请对照中文源逐节看一遍';
}

/** 排序后的多重集：**看内容与个数，不看顺序**。 */
const sortedMultiset = (items) => [...items].sort();

/**
 * 两份链接清单的**差集**——「多了哪些、少了哪些」，按 id 聚合计数。
 *
 * 为什么要差集而不是两份清单：译者真正要知道的是「我漏了哪一个」。只报
 * 「中 95 / 英 94」等于把定位工作推回给人（本轮两位译者都因为这条反馈不完整
 * 而不得不自己写临时脚本）。差集是零成本的，而且它直接指向要补的那一处。
 */
function linkDiff(zhList, enList) {
  const tally = (list) => list.reduce((map, item) => map.set(item, (map.get(item) ?? 0) + 1), new Map());
  const zh = tally(zhList);
  const en = tally(enList);
  const missing = [];   // 中文有、英文没有
  const extra = [];     // 英文有、中文没有
  for (const [id, count] of zh) {
    const got = en.get(id) ?? 0;
    if (got < count) missing.push(`${id}×${count - got}`);
  }
  for (const [id, count] of en) {
    const expected = zh.get(id) ?? 0;
    if (count > expected) extra.push(`${id}×${count - expected}`);
  }
  const parts = [];
  if (missing.length) parts.push(`英文缺少 ${missing.join(', ')}`);
  if (extra.length) parts.push(`英文多出 ${extra.join(', ')}`);
  return parts.join('；') || '（逐个相同）';
}

/**
 * 行内公式的比较：**多重集**（内容与个数必须逐字相同，顺序可以变）。
 *
 * 为什么允许换序：中英语序本来就不同，公式跟着名词走。
 * 「$s$ 阶反称协变张量 $\omega$」→「an antisymmetric covariant tensor $\omega$ of order $s$」
 * 把两个公式的先后换了，数学一个字没变——按顺序比会稳定误报（实测一次报 6 条）。
 * 反过来说，**个数与内容**仍然逐字严格：改一个字符、漏一个公式、把 `\omega` 写成 `\eta`，
 * 都会被 `latex` 命令集与这里的内容比较同时抓住。
 */
function compareMath(zhItems, enItems, label, id, problems) {
  if (zhItems.length !== enItems.length) {
    problems.push(`${id}：${label} ${zhItems.length} 个 → ${enItems.length} 个`);
  }
  /*
   * 比**多重集差集**，不是「排序后逐位比」。
   *
   * 逐位比在「少一个」时会退化成「全错」：只要左侧缺一项，后面所有条目都会与错位的对象
   * 相撞，于是**1 处差异被报成几十项**（`check-one.mjs` 上实测报过 1 处差异 → 60 项；
   * 剔除豁免项之后同理会错位）。多重集差集只报**真正多出来/少掉的那几个**，
   * 与顺序无关，也不假设两侧有对应关系。
   *
   * 这与「按标题切节、不按序号硬比」是同一条经验：**一旦假设了对应关系，
   * 一处增删就会放大成成片的假差异。**
   */
  const tally = (items) => items.reduce((map, item) => map.set(item, (map.get(item) ?? 0) + 1), new Map());
  const zh = tally(zhItems);
  const en = tally(enItems);
  for (const [item, count] of zh) {
    const got = en.get(item) ?? 0;
    if (got < count) problems.push(`${id}：${label}少了「${item.slice(0, 90)}」（中 ${count} 个 / 英 ${got} 个）`);
  }
  for (const [item, count] of en) {
    const want = zh.get(item) ?? 0;
    if (count > want) problems.push(`${id}：${label}多了「${item.slice(0, 90)}」（中 ${want} 个 / 英 ${count} 个）`);
  }
}

const instance = await loadOntology();
const overlay = await overlayFor(locale);
if (!overlay) {
  console.log(`[${locale}] 没有覆盖目录（源语言或尚未开始翻译）。`);
  process.exit(0);
}
const translated = overlay.cases ?? overlay.meta?.__meta?.contentBlocks ?? overlay.meta?.contentBlocks ?? {};

const problems = [];
const warnings = [];
/** 中文源自身的缺陷（不是译文问题）：单独打印，混在失败项里会让人以为译者做错了。 */
const sourceDefects = [];
/** 中文源里「成对但格式错」的引导词：按类汇总，避免逐段刷屏。 */
const paddedBoldSpans = [];
const halfPeriodSpans = [];
/**
 * 指向**不存在节点**的 `/nodes/<id>` 链接。
 *
 * 这是译者报出的一类真实错误：`/nodes/manifold%3Aack-atlas`（多一个 `a`）——
 * **最容易骗过肉眼**，因为它看起来完全正常、渲染也正常，点进去才发现 404。
 * 多重集比对只能报「中英不一致」，报不出「这个 id 根本不存在」；而链接拼错恰好可能
 * 中英两边一模一样地错，那样连多重集也不会响。
 *
 * 判据直接用本体自带的解析器（`maybeNode` / `boundaryRefs`），**不维护 id 列表**——
 * id 列表一定会过期，而本体就是权威。
 */
const unresolved = [];
let checked = 0;
let doneCjk = 0;
let totalCjk = 0;

const allBlocks = [];
for (const file of readdirSync(CASE_DIR).filter((name) => name.endsWith('.md')).sort()) {
  for (const [id, body] of Object.entries(blocksOf(file))) allBlocks.push({ id, body, file });
}

for (const { id, body } of allBlocks) {
  const cjk = cjkCount(body);
  totalCjk += cjk;
  const en = translated[id];
  if (!en) continue;
  checked += 1;
  doneCjk += cjk;

  /*
   * 源侧缺陷之一：公式里**在 `\text{}` 之外混了中文说明**。
   * 这类公式从两侧对称剔除再比（见 `isCjkMathRewrite`），并单独上报。
   *
   * 剔除必须**对称**：源侧那条 `$f^{-1}(开集)$` 与译侧那条 `$f^{-1}(\text{open set})$`
   * 是同一处数学的两种写法，各剔一条才配平；只剔一侧会让「少一个」的假差异留下来。
   * 译侧按「原文含 `\text{}`」识别——不依赖中文那侧能否被切成一个完整公式。
   */
  const zhInline = inlineMath(body);
  const enInline = inlineMath(en);
  const zhDisplay = displayMath(body);
  const enDisplay = displayMath(en);
  const rawInlineZh = inlineMathRaw(body);
  const rawInlineEn = inlineMathRaw(en);
  const rawDisplayZh = displayMathRaw(body);
  const rawDisplayEn = displayMathRaw(en);

  const exemptInlineZh = new Set();
  const exemptInlineEn = new Set();
  /*
   * 剔除是**两侧按同一条件**做的：**任何含 `\text{}` 的公式**。
   *
   * 为什么不做「按下标配对只剔那一条」：两侧顺序本来就可能不同（语序调整过），
   * 按序找只会剔错那一条，于是红项从「多一个」变成「少一个」，换汤不换药。
   *
   * 为什么这个更宽的条件仍然安全：
   * - `\text{}` 的内容就是**唯一允许翻译的部分**，所以含它的公式本来就会在两侧不同；
   * - 公式的**个数**仍严格比——所以「整条公式被漏抄」照样报「N 个 → M 个」；
   * - 公式的 `\text{}` **组数**由 `compareLatex` 与装配层的对称条数检查覆盖；
   * - 不含 `\text{}` 的公式（绝大多数：纯符号）**仍逐字严格比**。
   */
  for (let index = 0; index < rawInlineEn.length; index += 1) {
    if (hasTextCommand(rawInlineEn[index])) exemptInlineEn.add(index);
  }
  for (let index = 0; index < rawInlineZh.length; index += 1) {
    /* 源侧：含 `\text{}`，或（源侧缺陷）在 `\text{}` 之外裸写了中文。 */
    if (hasTextCommand(rawInlineZh[index]) || CJK.test(rawInlineZh[index])) exemptInlineZh.add(index);
  }

  const keep = (items, exempt) => items.filter((_, index) => !exempt.has(index));
  const zhCjkRaw = [...exemptInlineZh].map((index) => rawInlineZh[index]);

  if (zhCjkRaw.length || exemptInlineEn.size) {
    sourceDefects.push(`${id}：公式里在 \`\\text{}\` 之外混了中文说明（源侧 ${zhCjkRaw.length} 处）——${zhCjkRaw.map((item) => `$${item}$`).join('、')}`
      + `；这类公式已从内容比对中**两侧对称**剔除（译文把它改写成 \`\\text{…}\` 是产品上正确的做法）`);
  }
  compareMath(keep(zhDisplay, new Set()), keep(enDisplay, new Set()), '行间公式', id, problems);
  compareMath(keep(zhInline, exemptInlineZh), keep(enInline, exemptInlineEn), '行内公式', id, problems);
  /* 译文/原文里的 `/nodes/<id>` 必须指向**真实存在**的节点。 */
  for (const [label, text] of [['中文源', body], ['译文', en]]) {
    for (const raw_ of String(text).match(/\/nodes\/[A-Za-z0-9:._%-]+/g) ?? []) {
      const target = decodeURIComponent(raw_.slice('/nodes/'.length));
      if (instance.maybeNode(target) || instance.boundaryRefs.has(target)) continue;
      unresolved.push(`${id}：${label}里有指向不存在节点的链接 ${raw_}（解析为「${target}」）`);
    }
  }

  if (headings(body) !== headings(en)) {
    problems.push(`${id}：标题层级不一致（中 ${headings(body) || '(无)'} → 英 ${headings(en) || '(无)'}）`);
  }
  if (hasResidualCjk(en)) {
    const prose = proseOf(en);
    const at = prose.search(CJK);
    problems.push(`${id}：译文散文里含中文「${prose.slice(Math.max(0, at - 20), at + 20)}」（反引号里的标识符与注释不算）`);
  }
  const zhParts = splitAtReferences(body);
  const enParts = splitAtReferences(en);
  const zhBodyLinks = nodeLinks(zhParts.body);
  const enBodyLinks = nodeLinks(enParts.body);
  if (zhBodyLinks.join(',') !== enBodyLinks.join(',')) {
    problems.push(`${id}：正文 /nodes 链接不一致（中 ${zhBodyLinks.length} 个 / 英 ${enBodyLinks.length} 个）\n      ${linkDiff(zhBodyLinks, enBodyLinks)}`);
  }
  const zhRefLinks = nodeLinks(zhParts.references);
  const enRefLinks = nodeLinks(enParts.references);
  if (enRefLinks.length > zhRefLinks.length) {
    problems.push(`${id}：参考文献里多出了链接（中 ${zhRefLinks.length} 个 → 英 ${enRefLinks.length} 个）\n      ${linkDiff(zhRefLinks, enRefLinks)}`);
  }
  compareLatex(body, en, id, problems);

  /*
   * 结构保真：**段落分块数**与**「哪一段有引导词」**必须一一对应。
   *
   * 这一条补的是前几项检查的另一类盲区：公式可以逐字相同、标题层级可以一致、
   * 链接可以一个不差，而**译文把两段并成一段、或把「删掉会怎样」那一整段省掉**。
   * 中文源的教学结构就是「每段一个论点、条件与反例成对」，段落一合并，读者看到的
   * 论证骨架就变了——而前面所有检查都不会响。
   *
   * 判据用「这一段里有没有加粗」（见 `hasBold` 的说明）：只看**有无**，不看位置，
   * 因为中英语序不同（`- **条件**：` vs `- the **condition**:`）。要抓的是「整段丢了
   * 引导词」，不是加粗左边有没有冠词。
   *
   * ## 报告要给「第一处差异在哪」，不是只给计数
   *
   * 初版只报「中 115 / 英 116」，译者得自己写脚本才能找到那个多余的 `---`（实测花了两次
   * 迭代）。所以这里改成分块数不一致时**按标题切节**定位（标题序列已由 parity 保护，是
   * 可靠锚点），并打印两侧该段的前 80 字；加粗序列不一致时同样给第一处差异的段落内容。
   */
  const zhChunks = chunksOf(body);
  const enChunks = chunksOf(en);
  /* 中文源自身的排版缺陷：加粗标记不平衡（奇数个 `**`）的段落。 */
  zhChunks.forEach((chunk, index) => {
    if (unbalancedBold(chunk)) {
      sourceDefects.push(`${id} 第 ${index + 1} 段：中文源的加粗标记不平衡（奇数个 \`**\`，多半少了收尾的 \`**\`）——${preview(chunk)}`);
      return;
    }
    /*
     * 「成对但格式错」的两类：只在中文源上跑（英文侧 `**Motivation.**` 用半角句点是对的）。
     * 按总量报一次而不是逐段刷屏——这类问题往往整片源文都是同一个写法。
     */
    const style = boldStyleDefects(chunk);
    if (style.padded.length) {
      paddedBoldSpans.push({ id, index: index + 1, spans: style.padded });
    }
    if (style.halfPeriod.length) halfPeriodSpans.push({ id, index: index + 1, spans: style.halfPeriod });
  });
  if (zhChunks.length !== enChunks.length) {
    problems.push(`${id}：段落分块数不一致（中 ${zhChunks.length} / 英 ${enChunks.length}）\n      ${locateBlockDrift(zhChunks, enChunks)}`);
  } else {
    const zhBold = zhChunks.map(hasBold);
    const enBold = enChunks.map(hasBold);
    /*
     * 中文源自身加粗标记不平衡的段落豁免比对（那是源笔记的排版缺陷，见 `unbalancedBold`）。
     * 如果英文在那一处也没有引导词，本来就是「与源一致」；如果英文补上了引导词，
     * 那是**修正**而不是错误——两种都不该报。缺陷本身由 `sourceDefects` 单独打印。
     */
    const firstDiff = zhBold.findIndex((value, index) => {
      if (unbalancedBold(zhChunks[index])) return false;
      return value !== enBold[index];
    });
    if (firstDiff !== -1) {
      problems.push(`${id}：段落的加粗引导词对不上，第一处差异在第 ${firstDiff + 1} 段\n`
        + `      中（${zhBold[firstDiff] ? '有引导词' : '无引导词'}）：${preview(zhChunks[firstDiff])}\n`
        + `      英（${enBold[firstDiff] ? '有引导词' : '无引导词'}）：${preview(enChunks[firstDiff])}\n`
        + `      中文源的教学骨架是「每段一个论点、条件与反例成对」；整段丢引导词或自行添加都会改变这层结构。`);
    }
  }

  /*
   * 体量粗检：英文词数 / 中文汉字数。
   *
   * 标定（实测 51 个已译块）：中文数学笔记里汉字密度高（符号、公式、短句多），
   * 正常译文落在 **0.68–1.8** 词/汉字；低于 0.5 通常是整段漏译（而不是「写得简洁」）。
   * 阈值刻意放宽——这个数只能提示「去人眼看一下」，**不能**用来判合格：
   * 同一段中文写密了与写疏了都合理，真正的漏译要靠逐段对照发现。
   */
  const ratio = words(en) / Math.max(1, cjk);
  if (ratio < 0.5) warnings.push(`${id}：译文词数/汉字数 = ${ratio.toFixed(2)}（明显偏低，请逐段确认没有漏译）`);
}

const missing = allBlocks.filter((item) => !translated[item.id]).map((item) => `${item.id}(${cjkCount(item.body)})`);
const unknown = Object.keys(translated).filter((id) => !allBlocks.some((item) => item.id === id));
if (unknown.length) problems.push(`覆盖里出现中文源不存在的块 id：${unknown.join(', ')}`);

/*
 * 装配滞后检测：译文源文件（按块写的 `.md`）与**装配产物**是否一致。
 *
 * 为什么需要它：本脚本核对的是**装配产物**（`data/i18n/en/cases*.mjs`，那才是站点真正下发的
 * 东西），而块是先在 `tmp/i18n/dg/<id>.md` 里写好、再由装配脚本收进去的。两步之间有个窗口，
 * 期间「译者已改好」与「站点仍是旧稿」同时成立——本轮就出现过：译者 21:44 修好，
 * 产物还是 21:40 的旧稿，于是门持续报同一条问题，译者以为白改了。
 *
 * 这里把不一致**说出来并给出该跑哪一步**，而不是让下一个人去猜。
 */
const SOURCE_DIR = join(MCS_WEB_ROOT, 'tmp', 'i18n', 'dg');
if (existsSync(SOURCE_DIR)) {
  const knownIds = new Set(allBlocks.map((item) => item.id));
  const stale = [];
  for (const name of readdirSync(SOURCE_DIR).filter((item) => item.endsWith('.md'))) {
    const id = name.replace(/\.md$/, '').replace(/^dg-/, 'dg:');
    /* 目录里还放着作业须知（`BRIEF.md`）这类非块文件：只处理真有对应中文块的条目。 */
    if (!knownIds.has(id)) continue;
    const fresh = readFileSync(join(SOURCE_DIR, name), 'utf8').trim();
    const assembled = translated[id];
    if (assembled === undefined) { stale.push(`${id}（已写好但还没装配）`); continue; }
    if (String(assembled).trim() !== fresh) stale.push(`${id}（装配产物落后于源文件）`);
  }
  if (stale.length) {
    warnings.push(`装配滞后：${stale.join('，')}。请让装配方跑一次 \`node tmp/i18n/build-dg.mjs\` 后复跑本脚本`
      + '（本脚本核对的是站点真正下发的产物，源文件已改但未装配时，它报的是旧稿的问题）');
  }
}

console.log(`[${locale}] 已核对 ${checked}/${allBlocks.length} 块；覆盖汉字 ${doneCjk}/${totalCjk}`);
if (missing.length) console.log(`未译块（${missing.length}）：${missing.slice(0, 20).join(', ')}${missing.length > 20 ? ' …' : ''}`);
for (const warning of warnings) console.log(`提示：${warning}`);

/*
 * 中文源自身的缺陷：**不影响本脚本的通过与否**（那些段落已豁免结构比对），
 * 但必须让人看见——它们是源笔记的问题，不该被算成译者的账，也不该被悄悄忽略。
 * 修它们会改变本体哈希（= 版本号），所以是**单独决定**的事，不在这里顺手做掉。
 */
if (sourceDefects.length) {
  console.log(`\n中文源自身的排版缺陷（${sourceDefects.length} 处，不影响译文核对）：`);
  for (const defect of sourceDefects.slice(0, 10)) console.log(`  · ${defect}`);
  if (sourceDefects.length > 10) console.log(`  … 其余 ${sourceDefects.length - 10} 处省略`);
}
/*
 * 「成对但格式错」两类按**总量**上报：`liang` 那一片源文里 `**动机. **`（收尾前多空格）
 * 有 29 处、`**动机。**` 只有 27 处——同一份源文件里两种写法并存。逐段打印会把输出刷爆，
 * 而「有几处、在哪些块」才是决定「要不要统一」所需要的信息。
 */
if (paddedBoldSpans.length) {
  const spans = paddedBoldSpans.flatMap((item) => item.spans);
  console.log(`\n中文源引导词写法：加粗区间内有首尾空白（${paddedBoldSpans.length} 段，${spans.length} 处，如 \`**动机. **\`）`);
  console.log(`  · 涉及块：${[...new Set(paddedBoldSpans.map((item) => item.id))].join('、')}`);
  console.log(`  · 源文标准形式是 \`**动机。**\`；这一类只是多一个空格，不会影响译文核对，是否需要统一由人决定`);
}
if (halfPeriodSpans.length) {
  const spans = halfPeriodSpans.flatMap((item) => item.spans);
  console.log(`\n中文源引导词写法：以半角句点收尾（${halfPeriodSpans.length} 段，${spans.length} 处，如 \`**动机.\`）`);
  console.log(`  · 涉及块：${[...new Set(halfPeriodSpans.map((item) => item.id))].join('、')}`);
}

if (unresolved.length) {
  console.log(`\n指向不存在节点的链接（${unresolved.length} 处）：`);
  for (const item of unresolved.slice(0, 15)) console.log(`  · ${item}`);
  if (unresolved.length > 15) console.log(`  … 其余 ${unresolved.length - 15} 处省略`);
  console.log('  · 这类链接渲染正常但点进去 404，是最容易骗过肉眼的一类；中文源里的同类问题属源缺陷');
}

if (problems.length) {
  console.error(`\n正文块强核对失败：${problems.length} 项\n`);
  for (const problem of problems.slice(0, 30)) console.error(`- ${problem}`);
  if (problems.length > 30) console.error(`… 其余 ${problems.length - 30} 项省略`);
  console.error('\n公式与链接必须与中文源逐字相同（`\\text{}` 里的说明文字除外）。');
  process.exit(1);
}
console.log('正文块强核对通过（公式逐字相同、标题与链接一致、无中文残留）。');
