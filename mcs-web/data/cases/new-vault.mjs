/**
 * 案例：新库（23 篇 Obsidian 代数笔记）。
 *
 * 这是「笔记 → 公共节点」的导入案例，不是形式化重建：
 * - 正文逐字来自 `mcs-web/data/new-vault/notes/`，只去掉 frontmatter、标题、摘要引用与标签行；
 * - `formal` 只登记阅读节点的对象类型、参数与边界，不声称形成检查器已通过；
 * - 证据状态以笔记正文里的 DEF/PROOF 标签为准，顶层只给一个不夸大的等级；
 * - 关系只登记笔记里真实存在的 `[[wiki 链接]]`，并取其中连接阅读网络的一棵生成树（22 条）；
 *   正文仍保留全部 200 处链接，生成树只用于公共网络的连通性。
 */
import { readFileSync } from 'node:fs';
import {
  concept, claim, method, action, input, output, relation, evidence,
} from '../authoring.mjs';

const manifest = JSON.parse(readFileSync(new URL('../new-vault/manifest.json', import.meta.url), 'utf8'));
const ids = manifest.nodes.map((meta) => meta.id);
const contract = {
  type: 'declared-contract',
  status: 'DEF',
  scope: '契约只声明「笔记导入的阅读节点提供概念说明与正文」；不声称形成检查、机器证明或对应审阅通过。',
};
const formalBoundary = [
  '正文是散文笔记的导入版本，未整篇编码为形式负载；正文里的 DEF/PROOF/FINITE/NOT-CLAIMED 标签按原文保留。',
  '不声称定义、命题或外部文献已经由本站检查器核验；也不把笔记的存在当成数学证明。',
];
const provenanceNote = '正文为 Obsidian 笔记的导入版本（模板迁移到 mcs-learning-node-template@2026-10-19.1；数学内容未改写）。';

const common = (meta) => ({
  version: '1',
  discipline: meta.discipline,
  case: 'newvault',
  granularity: 'unit',
  summary: meta.summary,
  provenance: { sources: [meta.source], note: provenanceNote },
  teaching: {
    evidenceStatus: meta.evidenceStatus,
    commonMisconceptions: [],
    reviewQuestions: [],
    selfCheck: [],
  },
});
const formalBase = { theory: 'T_cases', symbols: [], boundary: formalBoundary };
const nodeFor = (meta) => {
  if (meta.type === 'theorem') return claim(meta.id, meta.title, {
    ...common(meta),
    formula: meta.summary,
    assumptions: [],
    formal: { ...formalBase, formula: meta.summary, assumptions: [], type: 'o', typeEnv: {} },
  });
  if (meta.type === 'technique') return method(meta.id, meta.title, {
    ...common(meta),
    scope: '局部方法',
    In: '笔记正文描述的任务输入',
    Out: '笔记正文描述的结论或构造',
    Pre: '按笔记正文的约定',
    Post: '按笔记正文的结论',
    Fail: '笔记未给出通用保底方法；不适用时返回未决，不伪造结论。',
    body: '按笔记正文的步骤阅读；本节点不把方法步骤编码为算法。',
    formal: {
      ...formalBase,
      scope: '局部方法',
      In: '笔记正文描述的任务输入',
      Out: '笔记正文描述的结论或构造',
      Pre: '按笔记正文的约定',
      Post: '按笔记正文的结论',
      Fail: '笔记未给出通用保底方法；不适用时返回未决，不伪造结论。',
      body: '按笔记正文的步骤阅读；本节点不把方法步骤编码为算法。',
      applicableTo: [],
    },
  });
  return concept(meta.id, meta.title, {
    ...common(meta),
    objectType: `阅读笔记导入的数学对象：${meta.title}`,
    parameters: ['对象', '条件'],
    predicate: meta.summary,
    type: 'o',
    formal: {
      ...formalBase,
      objectType: `阅读笔记导入的数学对象：${meta.title}`,
      parameters: ['对象', '条件'],
      predicate: meta.summary,
      type: 'o',
      typeEnv: {},
      assumptions: [],
      formationWitness: '本条是笔记导入的阅读节点；形式字段只登记对象类型与参数，不声称形成检查器已运行。',
    },
  });
};
export const newVaultNodes = manifest.nodes.map(nodeFor);

export const newVaultActions = manifest.nodes.map((meta) => action(
  `a-newvault:${meta.id.split(':')[1]}`,
  'definition',
  `导入 ${meta.title}`,
  [input('bg:set:function', ['statement', 'definition'])],
  [output(meta.id, ['definition', 'statement'])],
  { witness: contract },
));

const byId = new Map(manifest.nodes.map((meta) => [meta.id, meta]));
const adjacency = new Map(manifest.nodes.map((meta) => [meta.id, new Set()]));
for (const meta of manifest.nodes) {
  for (const to of meta.links) {
    adjacency.get(meta.id).add(to);
    adjacency.get(to)?.add(meta.id);
  }
}
const root = manifest.nodes[0].id;
const seen = new Set([root]);
const queue = [root];
const edges = [];
while (queue.length) {
  const from = queue.shift();
  for (const to of adjacency.get(from) ?? []) {
    if (seen.has(to)) continue;
    seen.add(to);
    edges.push([from, to]);
    queue.push(to);
  }
}
export const newVaultRelations = edges.map(([a, b]) => {
  const source = byId.get(a).links.includes(b) ? a : b;
  const target = source === a ? b : a;
  const meta = byId.get(source);
  return relation(
    `rel-newvault-${source.split(':')[1]}-${target.split(':')[1]}`,
    'noteReference',
    source,
    target,
    {
      witness: {
        type: 'note-link',
        status: 'DEF',
        scope: `笔记 \`${meta.source}\` 中的 wiki 链接；只表示阅读入口相接，不表示前置、证明依赖或数学等价。`,
      },
      scope: '同库笔记之间的阅读引用；方向按笔记实际链接保留。',
      task: '把两篇笔记的阅读入口接起来。',
    },
  );
});

export const newVaultEvidence = [
  evidence('ev-newvault-notes', 'prose-proof', 'DEF', 'not_run',
    '新库：23 篇代数笔记（Obsidian 导入版本）', {
      scope: '正文来自本机 Obsidian 笔记库的 23 篇笔记；本条目只登记「笔记已导入且正文非空」，不登记机器证明。',
      nodes: ids,
      obligations: [
        '正文为散文笔记，未编码为 ND 证书；检查器未运行。',
        '笔记中的证明、反例与外部引用由作者负责；本站不因导入而认证其数学正确性或文献真实性。',
        '模板迁移只改 frontmatter 的 mcs-template / mcs-template-version；正文哈希保持不变。',
      ],
    }),
  ...manifest.nodes.filter((meta) => meta.type === 'technique').map((meta) => evidence(
    `ev-newvault-${meta.id.split(':')[1]}`,
    'prose-proof',
    'DEF',
    'not_run',
    `方法笔记导入：${meta.title}`,
    {
      scope: `笔记 \`${meta.source}\` 的步骤与失效边界；只登记「步骤与正文一致」，不把方法说成定理。`,
      nodes: [meta.id],
      obligations: [
        '方法步骤是自然语言，未编码为 ND 证书；终止性、正确性与复杂度均未证明。',
        '正文中的常见误解与失效场景按原文保留，未由本站检查器核验。',
      ],
    },
  )),
];

export const newVaultSupport = [];
export const newVaultClaims = [];
export const newVaultPatterns = [];
export const newVaultAggregates = [
  {
    id: 'agg-newvault',
    kind: 'topic',
    title: '新库：简明高等代数笔记',
    blocks: [ids],
    note: '按「笔记 → 阅读节点」逐篇导入的有限集合；话题成员不表示必修链，也不把笔记链接读成证明依赖。',
  },
];

export const newVault = {
  nodes: newVaultNodes,
  actions: newVaultActions,
  relations: newVaultRelations,
  evidence: newVaultEvidence,
  support: newVaultSupport,
  claims: newVaultClaims,
  patterns: newVaultPatterns,
  aggregates: newVaultAggregates,
};
