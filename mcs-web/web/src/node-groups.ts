import type { NodeSummary } from './types.ts';

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
