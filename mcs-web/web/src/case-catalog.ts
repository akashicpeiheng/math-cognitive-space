/**
 * 首页「原型问题」的归类与充实。
 *
 * 两条设计约束：
 *
 * 1. **按领域归类，不按案例归类。** 案例是「一条思路」，领域是「它在数学里的位置」。
 *    同一条思路可以横跨多个领域（微分几何横跨拓扑、几何、代数、分析），
 *    因此领域取自**每个节点自己的 `discipline` 字段**，而不是给案例硬贴一个标签。
 * 2. **充实只用语料里已有的字段**：节点数、学科分布、构造分布、反例、误区模式、
 *    证据等级、行动数与关系数。不编造「难度」「建议学时」这类数据里根本没有的东西。
 */

import type { NodeSummary } from './types';
import type { Locale } from './i18n/locales';

/** 案例元数据：问题的自然动机、入口与目标。人工撰写，其余全部由语料派生。 */
export interface CaseMeta {
  id: string;
  title: string;
  question: string;
  entry: string;
  goal: string;
  note: string;
  /** 这条思路的「胚子」：最初是哪个具体困惑。 */
  embryo: string;
}

export interface ConstructTally {
  construct: string;
  label: string;
  count: number;
}

export interface CaseDetail {
  meta: CaseMeta;
  nodes: NodeSummary[];
  nodeCount: number;
  /** 学科 → 节点数，按数量降序。 */
  disciplines: Array<{ name: string; count: number }>;
  /** 主学科（节点最多的那个）。 */
  primaryDiscipline: string;
  /** 构造类型分布，按数量降序；只列实际存在的。 */
  constructs: ConstructTally[];
  /** 该案例登记的反例（守住边界用的）。 */
  counterexamples: Array<{ id: string; title: string }>;
  /** 该案例登记的误区模式。 */
  misconceptions: Array<{ id: string; title: string }>;
  /** 证据等级分布。 */
  evidence: Array<{ status: string; count: number }>;
  actionCount: number;
  relationCount: number;
  /** 归档到哪个领域分组。 */
  sectionId: string;
}

export interface DisciplineSection {
  id: string;
  title: string;
  /** 这个领域下有哪些案例。 */
  cases: CaseDetail[];
  nodeCount: number;
}

export const CONSTRUCT_ORDER = ['Concept', 'Definition', 'Claim', 'Proof', 'Example', 'Counterexample', 'Construction', 'Problem', 'Method', 'Representation', 'MisconceptionPattern', 'Theory'];

/**
 * 领域排序：从「更接近分析 / 几何」到「更接近代数 / 逻辑」。
 *
 * 2026-10 更新：学科词表在第五十二轮拆掉了教材式的合并标签（几何与拓扑 / 代数与几何 / 方法论），
 * 这一轮又把「代数」按对象拆成群论 / 线性代数 / 多重线性与张量代数 / 域与数系。
 * 这里的分组名必须跟着**词表**走，否则 `sectionOf()` 会把案例全归到「其他」——
 * 那次改动之后旧名单（几何与拓扑、代数与几何、代数、方法论）一个都不再匹配，
 * 分组界面于是退化成「分析 + 其他」两组（`tests/browser.mjs` 的「按领域分组」断言会红）。
 * 名单与 `data/fields.mjs` 的 FIELDS 一一对应。
 */
const SECTION_ORDER = [
  '分析', '测度论', '微分几何', '拓扑',
  '群论', '线性代数', '多重线性与张量代数', '域与数系',
  '相对论与宇宙论', '逻辑与基础',
];

/** 把节点的 discipline 归一到一个分组 id。未登记的学科归入「其他」，不猜。 */
export function sectionOf(discipline: string): string {
  if (SECTION_ORDER.includes(discipline)) return discipline;
  if (discipline === '数理逻辑' || discipline === '集合论' || discipline === '数学方法') return '逻辑与基础';
  return '其他';
}

/*
 * 分组名与证据兜底词的显示名（2026-10 中英双语）。
 *
 * 受控词表的值（`微分几何`、`其他`…）是本体里的标识，**不翻译**；
 * 这里给的是它们在界面上的显示名，与 `labels.ts` 的成对表同一个道理。
 * 中文那份逐字与从前相同，因此中文站与既有测试完全不受影响。
 */
export const CASE_SECTION_TITLES: Record<string, { zh: string; en: string }> = {
  分析: { zh: '分析', en: 'Analysis' },
  测度论: { zh: '测度论', en: 'Measure theory' },
  微分几何: { zh: '微分几何', en: 'Differential geometry' },
  拓扑: { zh: '拓扑', en: 'Topology' },
  群论: { zh: '群论', en: 'Group theory' },
  线性代数: { zh: '线性代数', en: 'Linear algebra' },
  多重线性与张量代数: { zh: '多重线性与张量代数', en: 'Multilinear and tensor algebra' },
  域与数系: { zh: '域与数系', en: 'Fields and number systems' },
  相对论与宇宙论: { zh: '相对论与宇宙论', en: 'Relativity and cosmology' },
  逻辑与基础: { zh: '逻辑与基础', en: 'Logic and foundations' },
  其他: { zh: '其他', en: 'Other' },
};

/** 节点没有证据状态时的兜底词（本体里缺字段是事实，这里如实说明「未标注」）。 */
export const CASE_EVIDENCE_FALLBACK: { zh: string; en: string } = { zh: '未标注', en: 'Unlabeled' };

/** 分组显示名：未登记的 id 原样返回，不显示空白。 */
export function caseSectionTitle(id: string, locale: Locale = 'zh'): string {
  return CASE_SECTION_TITLES[id]?.[locale] ?? id;
}

/**
 * 归类所用的学科是**节点的多数学科**，而不是「任意一个学科」。
 *
 * 为什么：案例的学科分布本来就横跨几支（微分几何的 38 个节点里 28 个「微分几何」、
 * 5 个「拓扑」、3 个「分析」、2 个「多重线性与张量代数」）。取任意一个会随机落到几个分组里，
 * 不稳定；取多数则稳定落在「微分几何」，同时在卡片上列出完整的学科分布，
 * 不让「它其实也横跨分析」这件事被藏起来。
 */
function primaryDisciplineOf(nodes: NodeSummary[]): string {
  const tally = new Map<string, number>();
  for (const node of nodes) tally.set(node.discipline, (tally.get(node.discipline) ?? 0) + 1);
  let best = '';
  let bestCount = -1;
  for (const [name, count] of [...tally.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en'))) {
    if (count > bestCount) { best = name; bestCount = count; }
  }
  return best;
}

/** 由案例元数据 + 本体节点算出卡片的全部内容。纯函数，不读时间与随机数。
 *
 * `locale` 只影响**本体里缺字段时**的兜底词（`未标注` / `Unlabeled`）与分组名；
 * 案例的标题、问题、胚子都在调用方（`StartPage` 的 `CASE_METAS`）里，按语种各给一份。 */
export function describeCase(meta: CaseMeta, allNodes: NodeSummary[], locale: Locale = 'zh'): CaseDetail {
  const nodes = allNodes.filter((node) => node.case === meta.id);

  const disciplineTally = new Map<string, number>();
  for (const node of nodes) disciplineTally.set(node.discipline, (disciplineTally.get(node.discipline) ?? 0) + 1);
  const disciplines = [...disciplineTally.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'en'));

  const constructTally = new Map<string, number>();
  for (const node of nodes) constructTally.set(node.construct, (constructTally.get(node.construct) ?? 0) + 1);
  const constructs = [...constructTally.entries()]
    .map(([construct, count]) => ({ construct, label: construct, count }))
    .sort((a, b) => CONSTRUCT_ORDER.indexOf(a.construct) - CONSTRUCT_ORDER.indexOf(b.construct));

  const evidenceTally = new Map<string, number>();
  for (const node of nodes) {
    const status = node.evidenceStatus ?? CASE_EVIDENCE_FALLBACK[locale];
    evidenceTally.set(status, (evidenceTally.get(status) ?? 0) + 1);
  }
  const evidence = [...evidenceTally.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count || a.status.localeCompare(b.status, 'en'));

  const primaryDiscipline = primaryDisciplineOf(nodes);

  return {
    meta,
    nodes,
    nodeCount: nodes.length,
    disciplines,
    primaryDiscipline,
    constructs,
    counterexamples: nodes.filter((node) => node.construct === 'Counterexample').map((node) => ({ id: node.id, title: node.title })),
    misconceptions: nodes.filter((node) => node.construct === 'MisconceptionPattern').map((node) => ({ id: node.id, title: node.title })),
    evidence,
    actionCount: nodes.reduce((sum, node) => sum + (node.actionCount ?? 0), 0),
    relationCount: nodes.reduce((sum, node) => sum + (node.relationCount ?? 0), 0),
    sectionId: sectionOf(primaryDiscipline),
  };
}

/** 把所有案例归到领域分组。空分组不出现，不为了排版好看而保留空壳。 */
export function groupByDiscipline(details: CaseDetail[], locale: Locale = 'zh'): DisciplineSection[] {
  const sections = new Map<string, DisciplineSection>();
  for (const detail of details) {
    const id = detail.sectionId;
    const title = caseSectionTitle(id, locale);
    const section = sections.get(id) ?? { id, title, cases: [], nodeCount: 0 };
    section.cases.push(detail);
    section.nodeCount += detail.nodeCount;
    sections.set(id, section);
  }
  const orderOf = (id: string) => {
    const index = SECTION_ORDER.indexOf(id);
    return index === -1 ? SECTION_ORDER.length : index;
  };
  return [...sections.values()]
    .sort((a, b) => orderOf(a.id) - orderOf(b.id) || a.id.localeCompare(b.id, 'en'))
    .map((section) => ({
      ...section,
      // 组内按节点数降序：内容更厚的案例排前面。
      cases: [...section.cases].sort((a, b) => b.nodeCount - a.nodeCount || a.meta.id.localeCompare(b.meta.id, 'en')),
    }));
}
