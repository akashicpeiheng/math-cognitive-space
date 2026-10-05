/**
 * 论文锚点 ↔ 本体节点（2026-10 加，TODO A4-31）。
 *
 * 第四十七轮的边界原文：「arXiv 只梳理了包内材料（标题 / 摘要开头 / bib / 元数据），
 * 没解析正文，也没和本体节点挂上。」
 *
 * 这一条建立**稳定的锚点约定**：论文正文里的 `\label{...}` 是天然稳定的锚点
 * （`def:` / `prop:` / `thm:` / `sec:` 前缀已经区分了类型），本表把它与本体节点 id 对起来。
 * 约定三条：
 *
 * 1. **只登记能核对的对照**：`anchor` 必须在 `mcs-foundations/arxiv/main.tex` 里真的存在
 *    （`npm run check` 与维护页都会核对），`nodeId` 必须在公共本体里真的存在；
 * 2. **对不上就说对不上**：论文里有一批环境讲的是**本站接口与规划器**（D 层，不是数学对象 M），
 *    它们没有对应的本体节点。这样的条目 `nodeId: null` + `kind` 说明它是什么，
 *    而不是硬塞一个「看起来像」的节点；
 * 3. **一条锚点可以挂多个节点**（论文一个定义对应两个并列的本体对象时如实写两条）。
 *
 * `relation` 说明这条锚点与节点的关系：
 * - `defines`：论文那一处正是该节点的定义；
 * - `states`：论文陈述了该节点（命题 / 定理）；
 * - `instance`：论文把该节点当作例子或工具用到；
 * - `none`：没有对应节点（`kind` 里说明这一处讲的是什么）。
 *
 * 文件放在 `data/` 而不是 `web/src/`：维护页、`npm run check` 与测试都要读它，
 * 而 `data/` 是这些数据文件的既有位置（纯 `.mjs`，服务端与测试都能直接 import）。
 */

/** 论文文件（仓库相对路径）。解析与核对都以它为准。 */
export const PAPER_ANCHOR_SOURCE = 'mcs-foundations/arxiv/main.tex';

/**
 * @typedef {object} PaperAnchor
 * @property {string} anchor 论文里的 `\label{...}`（不带花括号）
 * @property {string|null} nodeId 对应的本体节点 id；对不上时为 null
 * @property {'defines'|'states'|'instance'|'none'} relation 与节点的关系
 * @property {string} [kind] 没有对应节点时，说明这一处讲的是什么（接口 / 规划器 / 理论结论…）
 * @property {string} note 依据
 */

/** @type {PaperAnchor[]} */
export const PAPER_ANCHORS = [
  {
    anchor: 'def:limits',
    nodeId: 'limit:limit-ed',
    relation: 'defines',
    note: '论文的定义 1 给出 ε–δ 表述；对应的本体节点是「函数极限的 ε–δ 定义」。',
  },
  {
    anchor: 'def:limits',
    nodeId: 'limit:seq-conv',
    relation: 'defines',
    note: '同一个定义里并列给出序列表述；本体里它是独立节点「序列收敛」。',
  },
  {
    anchor: 'prop:limit',
    nodeId: 'limit:bridge',
    relation: 'states',
    note: '论文的命题 1 陈述两种定义的等价；本体节点是「ε–δ 与序列定义的等价」。',
  },
  {
    anchor: 'def:resource',
    nodeId: null,
    relation: 'none',
    kind: '站内接口',
    note: '描述的是本站的资源描述符（D 层接口），不是数学对象，因此没有本体节点。',
  },
  {
    anchor: 'def:action',
    nodeId: null,
    relation: 'none',
    kind: '站内接口',
    note: '行动契约的接口定义：本体里 216 条 action 是它的实例，但契约本身不是节点。',
  },
  {
    anchor: 'prop:readonly',
    nodeId: null,
    relation: 'none',
    kind: '站内不变量',
    note: '「只读不变性」说的是 M/E 边界，属于工程不变量，不对应数学对象。',
  },
  {
    anchor: 'thm:saturation',
    nodeId: null,
    relation: 'none',
    kind: '理论结论',
    note: '条件饱和性是关于「概念出现与支持」的理论结论，本体里没有对应的数学对象节点；'
      + '它约束的是构造类型的判定——若要挂节点，应先在本体里登记对应对象。',
  },
  {
    anchor: 'thm:search',
    nodeId: null,
    relation: 'none',
    kind: '规划器性质',
    note: '有界搜索是规划算法的性质，对应站内 planner（D 层），不是本体节点。',
  },
  {
    anchor: 'def:route',
    nodeId: null,
    relation: 'none',
    kind: '站内接口',
    note: '事件路线的定义同样是接口层；本体里的关系与行动是它的输入。',
  },
];

/** 只用于核对与展示：按「挂上了节点 / 没挂上」两类的数量。 */
export function paperAnchorStats() {
  const mapped = PAPER_ANCHORS.filter((entry) => entry.nodeId !== null);
  const unmapped = PAPER_ANCHORS.filter((entry) => entry.nodeId === null);
  return {
    total: PAPER_ANCHORS.length,
    mapped: mapped.length,
    unmapped: unmapped.length,
    anchors: new Set(PAPER_ANCHORS.map((entry) => entry.anchor)).size,
  };
}
