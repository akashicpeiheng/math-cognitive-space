import { CONTRACT_MODE_LABELS, CONTRACT_MODE_WEIGHT, RELATION_WEIGHT, WITNESS_FACTOR } from './relation-visual.ts';
import { relationLabel } from './labels.ts';
import type { NetworkGraph } from './network.ts';

/**
 * 「与某个节点强关联的节点」——右键按住节点时临时摊开的那一圈。
 *
 * 只读本体：三条来源都能追到已登记的数据，不猜、不调模型。
 *
 * 1. **登记关系**：与它有语义关系的节点，强度 = 关系权重 × 见证修正（与画布上的线宽同一把尺子）；
 * 2. **产出**：它的行动契约作为输入之一，能引入哪些节点（强度取该契约的 mode 权重）；
 * 3. **前提**：引入它自己需要哪些输入（同样是 mode 权重）。
 *
 * 共用前提（两条输入同属一个行动）只作兜底，排在最后——它只是「一起出现」，不是数学关系。
 * 强度用的是 `relation-visual.ts` 的同一套表，所以「越硬越靠前、越硬画得越重」在交互里也成立。
 *
 * 这个模块是叶子模块（只 import 类型与常量），node 可以直接 import 做单元测试。
 */
export interface RelatedCandidate {
  node: string;
  title: string;
  /** 0–1 的关联强度。 */
  strength: number;
  basis: 'relation' | 'produces' | 'consumes' | 'shared-input' | 'thread';
  /** 依据的可读说明：关系种类与见证、或这条契约的 mode 与行动标题。 */
  note: string;
  /** 该候选是话题级条目（线索层）时标出来：它不参与前置计算。 */
  thread?: boolean;
}

export const RELATED_BASIS_LABELS: Record<RelatedCandidate['basis'], string> = {
  relation: '登记关系',
  produces: '由它引入',
  consumes: '引入它的前提',
  'shared-input': '共用前提',
  thread: '线索（不参与前置计算）',
};

/** 共用前提的强度：结构关联档，永远排在语义关联之后。 */
const SHARED_INPUT_STRENGTH = 0.14;

/**
 * 线索层提示（2026-10 加）。
 *
 * 话题级条目（`granularity === 'topic'`）是学习线索的名字，不是可独立认知的单元。
 * 于是它在「强关联」这一圈里**不以「前提」的身份出现**——一条线索谈不上「引入它的前提」，
 * 也不能被当作「现在可学」的单元。这里把它改标成 `thread`，并把原依据保留在说明里，
 * 这样读者看到的仍然是同一条登记数据，只是读法不同（不藏信息，也不冒充前置）。
 */
const THREAD_BASIS_NOTE = '话题级条目（学习线索）：不参与前置计算';

export interface RelatedOptions {
  /** 已经在视图里的节点不再作为候选（这一圈是用来「拖进来」的）。 */
  exclude?: Set<string>;
  limit?: number;
}

export function relatedCandidates(
  graph: NetworkGraph,
  nodeId: string,
  options: RelatedOptions = {},
): RelatedCandidate[] {
  const limit = options.limit ?? 6;
  const exclude = options.exclude ?? new Set<string>();
  const isThread = (id: string) => graph.nodes.find((node) => node.id === id)?.granularity === 'topic';
  const titleOf = (id: string) => graph.nodes.find((node) => node.id === id)?.title ?? id;
  /** 同一节点可能经多条路径关联：只保留最强的那条依据。 */
  const best = new Map<string, RelatedCandidate>();
  const consider = (candidate: RelatedCandidate) => {
    if (candidate.node === nodeId || exclude.has(candidate.node)) return;
    // 候选是话题级条目：一律改标线索层，原依据附在后面（读法变了，数据没变）。
    const final: RelatedCandidate = candidate.thread || !isThread(candidate.node)
      ? candidate
      : { ...candidate, basis: 'thread', thread: true, note: `${THREAD_BASIS_NOTE}。原依据：${candidate.note}` };
    const current = best.get(final.node);
    if (!current || final.strength > current.strength) best.set(final.node, final);
  };

  for (const relation of graph.relations) {
    if (relation.from !== nodeId && relation.to !== nodeId) continue;
    const other = relation.from === nodeId ? relation.to : relation.from;
    const base = RELATION_WEIGHT[relation.kind] ?? 0.4;
    const factor = WITNESS_FACTOR[relation.witness?.status ?? ''] ?? 0.7;
    consider({
      node: other,
      title: titleOf(other),
      strength: +(base * factor).toFixed(3),
      basis: 'relation',
      note: `${relationLabel(relation.kind)}（见证 ${relation.witness?.status ?? '未登记'}）${relation.scope ? `：${relation.scope}` : ''}`,
    });
  }

  for (const action of graph.actions) {
    const modeWeight = CONTRACT_MODE_WEIGHT[action.mode] ?? 0.18;
    const modeLabel = CONTRACT_MODE_LABELS[action.mode] ?? action.mode;
    const isInput = action.inputs.some((input) => input.node === nodeId);
    const isOutput = action.outputs.some((output) => output.node === nodeId);
    if (isInput) {
      for (const output of action.outputs) {
        consider({
          node: output.node,
          title: titleOf(output.node),
          strength: +modeWeight.toFixed(3),
          basis: 'produces',
          note: `${modeLabel}：「${action.title}」用它引入`,
        });
      }
    }
    if (isOutput) {
      for (const input of action.inputs) {
        consider({
          node: input.node,
          title: titleOf(input.node),
          strength: +modeWeight.toFixed(3),
          basis: 'consumes',
          note: `${modeLabel}：「${action.title}」需要它`,
        });
      }
    }
    // 共用前提：两条输入同属一个行动。只作兜底，强度固定为结构关联档。
    if (isInput || isOutput) {
      for (const input of action.inputs) {
        if (input.node === nodeId) continue;
        consider({
          node: input.node,
          title: titleOf(input.node),
          strength: SHARED_INPUT_STRENGTH,
          basis: 'shared-input',
          note: `与它共用同一行动的前提：「${action.title}」`,
        });
      }
    }
  }

  return [...best.values()]
    .sort((left, right) => right.strength - left.strength || left.title.localeCompare(right.title, 'zh-Hans-CN'))
    .slice(0, limit);
}
