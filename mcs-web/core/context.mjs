import { McsError, CODES } from '../shared/errors.mjs';
import { querySupport } from './support.mjs';
import { evidenceView } from './evidence.mjs';

/**
 * 上下文预算分档（2026-10 加，TODO A4-30）。
 *
 * 起因：默认 `maxChars = 16000` 而**最大的节点实际需要 22543 字符**——全库 15 个节点
 * 用默认预算根本建不出上下文（会抛 EVIDENCE_RESOURCE），桥接侧的下限 3000 更是差了一个数量级。
 *
 * 分档不是拍脑袋，是量出来的（232 个节点，见 VALIDATION 第五十六轮）：
 * 中位 3036、p95 16705、最大 22543；≤8000 的 202 个、8001–16000 的 15 个、>16000 的 15 个。
 * 因此三档的**预算上限**就取这三个观测边界：
 * `compact 8000 / standard 16000 / extended 24000`（24000 留出 22543 之上的余量）。
 */
export const CONTEXT_TIERS = {
  compact: { ceiling: 8000, note: '短节点：材料一屏放得下' },
  standard: { ceiling: 16000, note: '中等节点：需要保留完整证据与关系' },
  extended: { ceiling: 24000, note: '长节点（主要为微分几何）：证据多、段落多' },
};

/** 这个节点**实际需要**多少字符（不截断地构建一次，量 JSON 长度）。 */
export function contextBudget(ontology, nodeId) {
  const context = buildNodeContext(ontology, nodeId, { maxChars: Number.MAX_SAFE_INTEGER });
  const requiredChars = context.context_chars;
  const tier = requiredChars <= CONTEXT_TIERS.compact.ceiling ? 'compact'
    : requiredChars <= CONTEXT_TIERS.standard.ceiling ? 'standard' : 'extended';
  return {
    nodeId,
    requiredChars,
    tier,
    /** 建议预算：本档的上限（够用且可预期，不按节点长度逐点变化）。 */
    budgetChars: CONTEXT_TIERS[tier].ceiling,
    // 截断情况也要如实带上：requiredChars 是「不截断」的口径，两者一起看才知道有没有丢材料。
    omittedSections: context.omitted_sections?.length ?? 0,
  };
}

// 上下文打包：保留完整段落与公式，不截断数学表达式；超出预算时报告遗漏。
export function buildNodeContext(ontology, nodeId, { maxChars = 16000, personalState = null } = {}) {
  const node = ontology.node(nodeId);
  const evidence = ontology.evidenceFor(nodeId).map(evidenceView);
  const actions = ontology.actionsFor(nodeId).map((action) => ({
    id: action.id,
    mode: action.mode,
    title: action.title,
    inputs: action.inputs,
    outputs: action.outputs,
    witness: action.witness,
    openAssumptions: action.openAssumptions ?? [],
  }));
  const relations = ontology.relationsFor(nodeId).map((relation) => ({
    id: relation.id,
    kind: relation.kind,
    from: relation.from,
    to: relation.to,
    scope: relation.scope ?? null,
    witness: relation.witness,
  }));
  const support = ['expression', 'proof', 'route'].map((use) => {
    const result = querySupport(ontology, nodeId, use);
    return { use, status: result.status, set: result.set ?? null, reason: result.reason ?? null, minimal: result.minimal ?? null };
  });
  const boundary = [
    ...(node.formal?.boundary ?? []),
    ...(ontology.boundaryRefs.size ? [...ontology.boundaryRefs] : []),
  ];
  const context = {
    ontology_version: ontology.version,
    node: {
      id: node.id,
      title: node.title,
      construct: node.construct,
      roles: node.roles,
      discipline: node.discipline,
      summary: node.summary,
      formal: node.formal,
      motivation: node.motivation ?? null,
      teaching: node.teaching ?? null,
      // 与 /api/v2/ontology/nodes 同口径：等级登记在 teaching.evidenceStatus，provenance 只作兼容保留。
      evidence_status: node.teaching?.evidenceStatus ?? node.provenance?.evidenceStatus ?? null,
    },
    evidence,
    actions,
    relations,
    support,
    boundary,
    personal_state: personalState ? {
      profile_id: personalState.profileId,
      revision: personalState.revision,
      confirmed_for_context: personalState.confirmed ?? [],
      unknown: personalState.unknown ?? [],
      misconceptions: personalState.misconceptions ?? [],
    } : null,
    teaching_requirements: [
      '正文说明节点提供的材料、证据与使用条件；不得把展示当成证明，不得把模型评价当成个人掌握。',
      '保留开放假设、适用范围与失败反例；未知不补成空集。',
      '个人反馈只能追加外部记录，不能改写公共本体。',
    ],
  };
  const paragraphs = (node.contentMarkdown || '').split(/\n\s*\n/).filter((item) => item.trim());
  const included = [];
  const omitted = [];
  for (const paragraph of paragraphs) {
    const candidate = JSON.stringify({ ...context, content_markdown: [...included, paragraph].join('\n\n') });
    if (candidate.length <= maxChars) included.push(paragraph);
    else omitted.push(paragraph.split('\n')[0].slice(0, 80));
  }
  context.content_markdown = included.join('\n\n');
  context.omitted_sections = omitted;
  while (JSON.stringify(context).length > maxChars && context.evidence.length > 2) context.evidence.pop();
  const finalSize = JSON.stringify(context).length;
  if (finalSize > maxChars) {
    const required = contextBudget(ontology, nodeId);
    throw new McsError(
      CODES.EVIDENCE_RESOURCE,
      `上下文预算不足以保留节点材料与边界（需要 ${finalSize} 字符，预算 ${maxChars}）。`
      + `这个节点属于 ${required.tier} 档（建议预算 ${required.budgetChars} 字符，实测需要 ${finalSize}）。`,
      422,
      {
        minimum_chars: finalSize,
        max_chars: maxChars,
        tier: required.tier,
        suggested_chars: required.budgetChars,
        node_id: nodeId,
      },
      // 换一个更大的预算就能成功——这是「可恢复」，不是服务坏了。
      false,
      true,
    );
  }
  context.context_chars = finalSize;
  return context;
}

export function buildTutorInstructions(context, { mode = 'explain' } = {}) {
  const modeText = {
    explain: '用中文讲解当前节点，先给整体思路，再展开关键步骤。',
    hint: '只给分层提示，不直接给出完整答案；每层提示后停下来等待学习者。',
    practice: '给出一个针对当前节点的练习，说明评分依据；不要声称已确认掌握。',
  }[mode] ?? '用中文讲解当前节点。';
  return [
    '你是 MCS 工作台的辅导入口。以下 JSON 是固定本体版本中的节点材料、证据、行动与边界，不包含会话能力凭证。',
    modeText,
    '要求：先调用材料中给出的定义、证明与证据状态；不得编造文献、检查器结果或学习成功率；遇到未知保留为未知。',
    '不要改写公共本体；你的回答只作为外部记录保存，不自动确认任何节点已掌握。',
    `本体与节点材料：\n${JSON.stringify(context)}`,
  ].join('\n\n');
}
