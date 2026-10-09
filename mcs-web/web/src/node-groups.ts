import type { NodeSummary } from './types.ts';
import type { Locale } from './i18n/locales.ts';

/**
 * 节点类别的划分：推荐面板按它分组，`NetworkPage` 的两处面板也用它取标签与说明。
 *
 * 划分只依据本体的 `construct` 与 `roles` 字段，不猜。**这里的每一条都要与本体里真有的
 * 构造对得上**——用户报错就是冲着这一点来的：
 *
 * - 「选中『定义』类别怎么会是 0 个节点」：本体 232 个节点里 `construct=Definition` 与
 *   `role=Definition` **都是 0**（模板 `data/authoring.mjs` 支持 Definition，案例数据没用它），
 *   定义写在概念节点的正文里。所以这一组叫「概念」而不是「概念与定义」，并在说明里写清这件事；
 *   筛选选项那边也由 `facets.ts` 只列真有的类别。
 * - 原先 `MisconceptionPattern`（11 个节点）被塞进「例子与反例」组：它们既不是例子也不是反例，
 *   而是「常见误解」这一类，本站把它当成一等对象。现在单独成组。
 *
 * 这个模块是叶子模块（只 import 类型），因此可以被 node 直接 import 做单元测试，
 * 不必开浏览器——`web/src/network.ts` 里省略了扩展名，node 解析不了。
 *
 * `method-local`：构造为 Method 且 roles 含 LocalMethod。任务形状明确、步骤可枚举，
 *   换一个场景不一定适用。
 * `method-global`：构造为 Method 且 roles 含 GlobalMethod。跨场景的策略。
 */
export type NodeGroup =
  | 'method-local' | 'method-global'
  | 'concept' | 'claim' | 'example' | 'misconception' | 'problem' | 'representation' | 'other';

export const NODE_GROUP_ORDER: NodeGroup[] = [
  'method-local', 'method-global', 'concept', 'claim', 'example', 'misconception', 'problem', 'representation', 'other',
];

export const NODE_GROUP_LABELS: Record<NodeGroup, string> = {
  'method-local': '局部技巧',
  'method-global': '全局方法',
  concept: '概念',
  claim: '断言与证明',
  example: '例子与反例',
  misconception: '误区模式',
  problem: '问题与练习',
  representation: '表征',
  other: '其它',
};

export const NODE_GROUP_NOTES: Record<NodeGroup, string> = {
  'method-local': '任务形状明确、步骤可枚举的技巧；换一个场景不一定适用。',
  'method-global': '跨场景的策略，不针对单个任务。',
  concept: '回答「它是什么」；背景理论、符号与构造也归在这一组。本体里没有单独的「定义」类别——定义写在概念节点的正文里（模板支持 Definition，当前 0 个节点），所以这一组不叫「概念与定义」。',
  claim: '回答「断言了什么」，通常带证明或反例。',
  example: '具体实例，用来对照定义。',
  misconception: '把常见误解写成对象：它错在哪一步、为什么会错；锚在相关节点上。',
  problem: '可以动手做的开放题或练习。',
  representation: '同一对象的不同表达方式。',
  other: '其余登记类型。',
};

/**
 * 上面两张表的英文版（2026-10 双语化，键与中文逐字对应）。
 *
 * 为什么把英文另放一张表、而不是把中文表改成 `{ zh, en }`：中文表被
 * `tests/node-groups.test.mjs` 当作 `Record<NodeGroup, string>` 逐字读
 * （`NODE_GROUP_LABELS.concept === '概念'`），也直接出现在 SVG 文本与 `<option>` 里；
 * 保持形状不变，新增的英文与其他调用方都用下面两个取词函数。
 */
export const NODE_GROUP_LABELS_EN: Record<NodeGroup, string> = {
  'method-local': 'Local techniques',
  'method-global': 'Global methods',
  concept: 'Concepts',
  claim: 'Claims and proofs',
  example: 'Examples and counterexamples',
  misconception: 'Misconception patterns',
  problem: 'Problems and exercises',
  representation: 'Representations',
  other: 'Other',
};

export const NODE_GROUP_NOTES_EN: Record<NodeGroup, string> = {
  'method-local': 'Techniques with a definite task shape and enumerable steps; they need not transfer to another setting.',
  'method-global': 'Strategies that cross settings, not tied to a single task.',
  concept: 'Answers “what is it”; background theory, symbols and constructions also fall in this group. The ontology has no separate “definition” category — definitions live in the body of concept nodes (the template supports Definition, currently 0 nodes), so this group is not called “concepts and definitions”.',
  claim: 'Answers “what is asserted”, usually with a proof or a counterexample.',
  example: 'Concrete instances, used to check a definition.',
  misconception: 'Common misconceptions written as objects: which step is wrong and why; anchored on the related nodes.',
  problem: 'Open problems or exercises one can work on.',
  representation: 'Different ways of expressing the same object.',
  other: 'The remaining registered types.',
};

/** 取组名；未登记的组回退原值。 */
export function nodeGroupLabel(group: NodeGroup, locale: Locale = 'zh'): string {
  const table = locale === 'en' ? NODE_GROUP_LABELS_EN : NODE_GROUP_LABELS;
  return table[group] ?? group;
}

/** 取组说明；未登记的组回退空串（不显示空白标签，也不会抛错）。 */
export function nodeGroupNote(group: NodeGroup, locale: Locale = 'zh'): string {
  const table = locale === 'en' ? NODE_GROUP_NOTES_EN : NODE_GROUP_NOTES;
  return table[group] ?? '';
}

export function groupOfNode(node: NodeSummary): NodeGroup {
  const roles = node.roles ?? [];
  if (node.construct === 'Method') {
    if (roles.includes('LocalMethod')) return 'method-local';
    if (roles.includes('GlobalMethod')) return 'method-global';
    return 'method-local';
  }
  switch (node.construct) {
    case 'Concept':
    case 'Definition':
    case 'Theory':
    case 'Symbol':
    case 'Term':
    case 'Construction':
      return 'concept';
    case 'Claim':
    case 'Proof':
      return 'claim';
    case 'Example':
    case 'Counterexample':
      return 'example';
    case 'MisconceptionPattern':
      return 'misconception';
    case 'Problem':
      return 'problem';
    case 'Representation':
      return 'representation';
    default:
      return 'other';
  }
}
