// 公共本体编写助手：只为常用构造类型补默认字段，不隐藏形成条件。

/**
 * 「形式表达」：把对象用形式语言写出来，供人读，而不是供机器查。
 *
 * 与 `formal`（形式**负载**）的分工必须分清，否则两者会互相污染：
 *
 * - `formal` 是**形成检查的元数据**（theory / type / symbols / boundary…），喂给形成检查器，
 *   机器读，`predicate` 之类的字段是自然语言混符号的速记；
 * - `formalStatement` 是**给人读的形式陈述**：`tex` 是纯 LaTeX（不含 `$` 定界符，渲染时按行间公式处理），
 *   `reading` 把它读回中文，`notation` 交代每个符号是什么，`label` 标证据状态。
 *
 * 只给**已经挑出来的重要节点**登记这一项，其余节点保持 `null`——
 * 空着比编一段看起来像公式的东西诚实。挑选依据与清单见 VALIDATION 第三十六轮。
 */
export const formalStatement = (opts = {}) => {
  if (!opts || !opts.tex) return null;
  const label = opts.label ?? 'DEF';
  const allowed = ['DEF', 'PROOF', 'REF', 'FINITE', 'ILLUSTRATION', 'NOT-CLAIMED'];
  if (!allowed.includes(label)) throw new Error(`formalStatement.label 必须是证据标签之一：${label}`);
  // `$` 定界符由渲染层加：内容里自带会让 KaTeX 解析出错，也会让纯文本上下文出现裸美元号。
  if (opts.tex.includes('$')) throw new Error('formalStatement.tex 不能包含 $ 定界符');
  return {
    tex: opts.tex,
    reading: opts.reading ?? '',
    notation: opts.notation ?? [],
    label,
    note: opts.note ?? '',
  };
};

const base = (construct, id, title, opts = {}) => ({
  id,
  version: opts.version ?? '1',
  construct,
  roles: opts.roles ?? [],
  title,
  discipline: opts.discipline ?? '未分类',
  /*
   * 条目粒度：'unit' = 最小的可独立认知单元（默认），'topic' = 话题级条目。
   *
   * **不能叫 scope**：`method()` 已经用 `scope` 表示「局部方法 / 全局方法」，
   * 而 `relation()` 的 `scope` 是关系的适用范围——同名会把三件事搅在一起（本轮踩过）。
   */
  granularity: opts.granularity ?? 'unit',
  case: opts.case ?? 'background',
  summary: opts.summary ?? '',
  formal: opts.formal ?? {},
  formalStatement: formalStatement(opts.formalStatement),
  representations: opts.representations ?? [],
  motivation: opts.motivation,
  teaching: opts.teaching,
  provenance: opts.provenance ?? { sources: [], note: '未登记来源。' },
  contentRef: opts.contentRef ?? id,
  ...(opts.extra ?? {}),
});

export const symbol = (id, title, opts) => base('Symbol', id, title, {
  ...opts,
  formal: {
    declaration: opts.formal?.declaration ?? opts.declaration ?? title,
    type: opts.formal?.type ?? opts.type ?? 'o',
    signatureVersion: opts.formal?.signatureVersion ?? '1',
    symbols: opts.formal?.symbols ?? [id],
    boundary: opts.formal?.boundary ?? opts.boundary ?? [],
    ...(opts.formal ?? {}),
  },
});

export const term = (id, title, opts) => base('Term', id, title, {
  ...opts,
  formal: {
    theory: opts.formal?.theory ?? 'T_cases',
    typeEnv: opts.formal?.typeEnv ?? {},
    term: opts.formal?.term ?? { const: id },
    type: opts.formal?.type ?? 'o',
    symbols: opts.formal?.symbols ?? [],
    boundary: opts.formal?.boundary ?? [],
    ...(opts.formal ?? {}),
  },
});

export const concept = (id, title, opts) => base('Concept', id, title, {
  ...opts,
  roles: opts.roles ?? ['Concept'],
  formal: {
    objectType: opts.formal?.objectType ?? opts.objectType ?? '概念对象',
    parameters: opts.formal?.parameters ?? opts.parameters ?? ['x'],
    predicate: opts.formal?.predicate ?? opts.predicate ?? title,
    type: opts.formal?.type ?? 'o',
    typeEnv: opts.formal?.typeEnv ?? {},
    theory: opts.formal?.theory ?? 'T_cases',
    symbols: opts.formal?.symbols ?? [],
    assumptions: opts.formal?.assumptions ?? [],
    formationWitness: opts.formal?.formationWitness ?? '参数与谓词已按声明类型闭合。',
    boundary: opts.formal?.boundary ?? [],
    ...(opts.formal ?? {}),
  },
});

export const definition = (id, title, opts) => base('Definition', id, title, {
  ...opts,
  roles: opts.roles ?? ['Definition'],
  formal: {
    newSymbol: opts.formal?.newSymbol ?? id.split(':').pop(),
    oldTerm: opts.formal?.oldTerm ?? opts.oldTerm ?? '旧语言中的有限表达式',
    expansion: opts.formal?.expansion ?? { kind: 'abbreviation', note: '按需展开，不引入新公理。' },
    conservative: opts.formal?.conservative ?? 'declared',
    theory: opts.formal?.theory ?? 'T_cases',
    symbols: opts.formal?.symbols ?? [],
    boundary: opts.formal?.boundary ?? [],
    ...(opts.formal ?? {}),
  },
});

export const claim = (id, title, opts) => base('Claim', id, title, {
  ...opts,
  roles: opts.roles ?? ['Theorem'],
  formal: {
    theory: opts.formal?.theory ?? 'T_cases',
    typeEnv: opts.formal?.typeEnv ?? {},
    assumptions: opts.formal?.assumptions ?? [],
    formula: opts.formal?.formula ?? opts.formula ?? title,
    type: 'o',
    symbols: opts.formal?.symbols ?? [],
    boundary: opts.formal?.boundary ?? [],
    ...(opts.formal ?? {}),
  },
});

export const proof = (id, title, opts) => base('Proof', id, title, {
  ...opts,
  roles: opts.roles ?? ['Proof'],
  formal: {
    target: opts.formal?.target ?? opts.target,
    code: opts.formal?.code ?? { kind: 'natural-deduction-subset', steps: opts.steps ?? [] },
    checkStatus: opts.formal?.checkStatus ?? opts.checkStatus ?? 'not_run',
    theory: opts.formal?.theory ?? 'T_cases',
    openAssumptions: opts.formal?.openAssumptions ?? opts.openAssumptions ?? [],
    boundary: opts.formal?.boundary ?? [],
    ...(opts.formal ?? {}),
  },
});

export const example = (id, title, opts) => base('Example', id, title, {
  ...opts,
  roles: opts.roles ?? ['Example'],
  formal: {
    concept: opts.formal?.concept ?? opts.concept,
    objectSpec: opts.formal?.objectSpec ?? opts.objectSpec ?? {},
    satisfaction: opts.formal?.satisfaction ?? opts.satisfaction ?? '满足断言另证。',
    boundary: opts.formal?.boundary ?? [],
    ...(opts.formal ?? {}),
  },
});

export const counterexample = (id, title, opts) => base('Counterexample', id, title, {
  ...opts,
  roles: opts.roles ?? ['Counterexample'],
  formal: {
    target: opts.formal?.target ?? opts.target,
    objectSpec: opts.formal?.objectSpec ?? opts.objectSpec ?? {},
    failureWitness: opts.formal?.failureWitness ?? opts.failureWitness ?? '失败见证待展开。',
    anchors: opts.formal?.anchors ?? opts.anchors ?? [],
    boundary: opts.formal?.boundary ?? [],
    ...(opts.formal ?? {}),
  },
});

export const problem = (id, title, opts) => base('Problem', id, title, {
  ...opts,
  roles: opts.roles ?? ['Problem'],
  formal: {
    inputs: opts.formal?.inputs ?? [],
    outputs: opts.formal?.outputs ?? [],
    goal: opts.formal?.goal ?? opts.goal ?? title,
    constraints: opts.formal?.constraints ?? [],
    boundary: opts.formal?.boundary ?? [],
    ...(opts.formal ?? {}),
  },
});

export const theoryNode = (id, title, opts) => base('Theory', id, title, {
  ...opts,
  roles: opts.roles ?? ['Theory'],
  formal: {
    language: opts.formal?.language ?? '经典外延简单类型论的有类型片段',
    calculus: opts.formal?.calculus ?? '多排序自然演绎白名单子集',
    axioms: opts.formal?.axioms ?? [],
    modules: opts.formal?.modules ?? [],
    symbols: opts.formal?.symbols ?? [],
    boundary: opts.formal?.boundary ?? [],
    ...(opts.formal ?? {}),
  },
});

export const construction = (id, title, opts) => base('Construction', id, title, {
  ...opts,
  roles: opts.roles ?? ['Construction'],
  formal: {
    inputs: opts.formal?.inputs ?? [],
    outputs: opts.formal?.outputs ?? [],
    steps: opts.formal?.steps ?? [{ id: 's1', note: '有限步骤待展开。' }],
    verificationTarget: opts.formal?.verificationTarget ?? opts.verificationTarget ?? '正确性与终止性分别认证。',
    boundary: opts.formal?.boundary ?? [],
    ...(opts.formal ?? {}),
  },
});

export const method = (id, title, opts) => base('Method', id, title, {
  ...opts,
  roles: opts.roles ?? [opts.scope === '全局方法' ? 'GlobalMethod' : 'LocalMethod'],
  formal: {
    name: opts.formal?.name ?? title,
    scope: opts.formal?.scope ?? opts.scope ?? '局部方法',
    In: opts.formal?.In ?? opts.In ?? '任务规格',
    Out: opts.formal?.Out ?? opts.Out ?? '候选结果',
    Pre: opts.formal?.Pre ?? opts.Pre ?? '任务接口匹配',
    Post: opts.formal?.Post ?? opts.Post ?? '输出候选及失效范围',
    Use: opts.formal?.Use ?? opts.Use ?? [],
    Demo: opts.formal?.Demo ?? opts.Demo ?? [],
    Fail: opts.formal?.Fail ?? opts.Fail ?? '不适用时返回未决，不伪造结论。',
    fail: opts.formal?.fail ?? opts.Fail ?? '不适用时返回未决，不伪造结论。',
    body: opts.formal?.body ?? opts.body ?? '启发体待展开。',
    applicableTo: opts.formal?.applicableTo ?? opts.applicableTo ?? [],
    boundary: opts.formal?.boundary ?? [],
    ...(opts.formal ?? {}),
  },
});

export const representationNode = (id, title, opts) => base('Representation', id, title, {
  ...opts,
  roles: [],
  formal: {
    object: opts.formal?.object ?? opts.object,
    medium: opts.formal?.medium ?? opts.medium ?? '自然语言与公式',
    correspondence: opts.formal?.correspondence ?? opts.correspondence ?? '对应说明待展开。',
    boundary: opts.formal?.boundary ?? [],
    ...(opts.formal ?? {}),
  },
});

export const patternNode = (id, title, opts) => base('MisconceptionPattern', id, title, {
  ...opts,
  roles: [],
  formal: {
    wrongRule: opts.formal?.wrongRule ?? opts.wrongRule,
    task: opts.formal?.task ?? opts.task,
    counterexample: opts.formal?.counterexample ?? opts.counterexample,
    scope: opts.formal?.scope ?? opts.scope,
    anchors: opts.formal?.anchors ?? opts.anchors ?? [],
    boundary: opts.formal?.boundary ?? [],
    ...(opts.formal ?? {}),
  },
});

export const input = (node, accepts, condition) => ({ node, accepts, ...(condition ? { condition } : {}) });
export const output = (node, provides) => ({ node, provides });

export const action = (id, mode, title, inputs, outputs, opts = {}) => ({
  id,
  mode,
  title,
  inputs,
  outputs,
  witness: opts.witness ?? { type: 'declared-contract', status: 'DEF', ref: opts.ref, scope: opts.scope },
  theory: opts.theory ?? 'T_cases',
  openAssumptions: opts.openAssumptions ?? [],
  version: opts.version ?? '1',
  ...(opts.stages ? { stages: opts.stages } : {}),
});

export const relation = (id, kind, from, to, opts = {}) => ({
  id,
  kind,
  from,
  to,
  witness: opts.witness ?? { type: 'declared', status: 'DEF', ref: opts.ref, scope: opts.scope },
  scope: opts.scope,
  task: opts.task,
  candidateNote: opts.candidateNote,
});

export const evidence = (id, kind, status, checkStatus, title, opts = {}) => ({
  id,
  kind,
  status,
  checkStatus,
  title,
  scope: opts.scope ?? '',
  nodes: opts.nodes ?? [],
  ...(opts.certificate ? { certificate: opts.certificate } : {}),
  ...(opts.checker ? { checker: opts.checker } : {}),
  checkerVerified: opts.checkerVerified ?? false,
  ...(opts.usedAxioms ? { usedAxioms: opts.usedAxioms } : {}),
  ...(opts.openAssumptions ? { openAssumptions: opts.openAssumptions } : {}),
  ...(opts.dependsOn ? { dependsOn: opts.dependsOn } : {}),
  ...(opts.obligations ? { obligations: opts.obligations } : {}),
  ...(opts.reference ? { reference: opts.reference } : {}),
});

export const support = (id, node, use, status, opts = {}) => ({
  id,
  node,
  use,
  status,
  ...(status === 'known' ? { set: opts.set ?? [] } : {}),
  ...(opts.partial ? { partial: opts.partial } : {}),
  ...(opts.minimal !== undefined ? { minimal: opts.minimal } : {}),
  ...(opts.reason ? { reason: opts.reason } : {}),
  ...(opts.evidence ? { evidence: opts.evidence } : {}),
});

export const claimRecord = (id, node, statement, evidenceIds, status = 'PROOF') => ({
  id,
  node,
  statement,
  evidence: evidenceIds,
  status,
});

export const representation = (id, kind, title, medium, status, note) => ({ id, kind, title, medium, status, note });

export const selfCheck = (id, prompt, competence, anchor, criterion) => ({ id, prompt, competence, anchor, criterion });

export const condition = (name, removed, counterexample, effect) => ({ condition: name, remove: removed, counterexample, effect });
