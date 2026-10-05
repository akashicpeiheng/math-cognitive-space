// 第 11 章 LC01–LC36。每个算子都返回 Loc_λ(M) = (V, ∂V, τ, Pres)。
// 定义与实现边界都登记在 data/localizations.mjs；这里只放计算规则。
import { McsError, CODES } from '../shared/errors.mjs';
import { LOCALIZER_VERSION, canonicalString, assert } from '../shared/contracts.mjs';
import { querySupport, supportIntersection, supportDifference, routeFamilyRequirement } from './support.mjs';
import { relationNeighborhood, reachableNodes } from './relations.mjs';
import { makePlanner } from './planner.mjs';
import { adapt } from './adaptation.mjs';

const FAMILY_PRES = {
  logical: '选择或筛选现成证书，不替未编码论证签发结论；未收录不等于不可证。',
  structural: '纯选择与限制保留节点身份与来源；边界从最终可见对象重新计算。',
  problem: '输出候选展开，不把 OR 分支并成一条路线。',
  cognitive: '只改变显示与筛选，不修改公共节点、证据或硬关系。',
  comparison: '共同与差异只对声明的有限路线族报告；未证明枚举完整性时保留范围限定。',
  hierarchy: '聚合保留成员块与层级类型；展开只在已保存成员引用上进行。',
  resource: '预算与时间界是外部约束；删去依赖后不保留旧的合法性声明。',
};

function nodeItem(ontology, id) {
  const node = ontology.maybeNode(id);
  return { id, type: 'node', label: node?.title ?? id, source: [id] };
}

function aggregateItem(aggregate) {
  return { id: aggregate.id, type: 'aggregate', label: aggregate.title, source: aggregate.blocks.flat() };
}

function boundaryItems(ontology, refs, kind = 'environment-reference') {
  return [...new Set(refs)].filter(Boolean).map((ref) => ({
    ref,
    kind,
    note: ontology.maybeNode(ref) ? `引用了「${ontology.maybeNode(ref).title}」，但该对象未包含在本次显示中。` : '该引用属于声明的环境边界，未在当前登记片段中展开。',
  }));
}

function makeResult(ontology, id, params, data) {
  const family = (ontology.raw.localizations.find((item) => item.id === id) ?? {}).family ?? 'structural';
  const pres = data.pres ?? [{ claim: FAMILY_PRES[family] ?? FAMILY_PRES.structural, status: data.status === 'unsupported' ? 'not-claimed' : 'conditional', note: data.presNote ?? '仅按本算子的定义与登记数据计算。' }];
  return {
    id,
    status: data.status ?? 'computed',
    V: (data.ids ?? []).map((entry) => (typeof entry === 'string' ? nodeItem(ontology, entry) : entry)),
    boundary: data.boundary ?? [],
    tau: data.tau ?? Object.fromEntries((data.ids ?? []).filter((entry) => typeof entry === 'string').map((entry) => [entry, [entry]])),
    pres,
    losses: data.losses ?? [],
    reason: data.reason,
    params,
    meta: { ontologyVersion: ontology.version, algorithmVersion: LOCALIZER_VERSION, computedAt: new Date().toISOString() },
  };
}

function requireParam(params, key, code = CODES.BAD_REQUEST) {
  assert(params[key] !== undefined && params[key] !== null, code, `缺少参数：${key}`);
  return params[key];
}

function selectNodes(ontology, predicate) {
  return ontology.raw.nodes.filter(predicate).map((node) => node.id);
}

function closureOver(initial, next) {
  const seen = new Set(initial);
  const queue = [...initial];
  while (queue.length) {
    const current = queue.shift();
    for (const item of next(current) ?? []) {
      if (!seen.has(item)) { seen.add(item); queue.push(item); }
    }
  }
  return [...seen];
}

function planParams(params) {
  const goalId = requireParam(params, 'goalId');
  return {
    goalId,
    background: Array.isArray(params.background) ? params.background : [],
    horizon: params.horizon ?? 6,
    maxCandidates: params.maxCandidates ?? 20000,
    strategy: params.strategy ?? {},
    budget: params.budget ?? null,
    useUnknownEntries: params.useUnknownEntries !== false,
  };
}

export function makeLocalizer(ontology) {
  const planner = makePlanner(ontology);

  const handlers = {
    LC01(params) {
      const symbols = requireParam(params, 'symbols');
      assert(Array.isArray(symbols), CODES.BAD_REQUEST, 'symbols 必须是数组');
      const registered = ontology.raw.nodes.filter((node) => Array.isArray(node.formal?.symbols) && node.formal.symbols.length > 0);
      if (registered.length === 0) return makeResult(ontology, 'LC01', params, { status: 'unsupported', reason: '节点未登记非空签名符号表；不能按名称猜测约化范围。' });
      const unregistered = ontology.raw.nodes.filter((node) => !Array.isArray(node.formal?.symbols) || node.formal.symbols.length === 0);
      const ids = registered.filter((node) => node.formal.symbols.every((symbol) => symbols.includes(symbol))).map((node) => node.id);
      return makeResult(ontology, 'LC01', params, {
        ids,
        boundary: [...boundaryItems(ontology, registered.flatMap((node) => node.formal.boundary ?? [])), ...unregistered.map((node) => ({ ref: node.id, kind: 'unregistered-signature', note: '该节点未登记签名符号表，签名约化保持未决。' }))],
      });
    },
    LC02(params) {
      const axioms = requireParam(params, 'axioms');
      assert(Array.isArray(axioms), CODES.BAD_REQUEST, 'axioms 必须是数组');
      const records = ontology.raw.evidence.filter((record) => Array.isArray(record.usedAxioms) && record.usedAxioms.every((axiom) => axioms.includes(axiom)));
      const open = records.filter((record) => (record.openAssumptions ?? []).length > 0);
      return makeResult(ontology, 'LC02', params, {
        ids: [...new Set(records.flatMap((record) => record.nodes))],
        boundary: boundaryItems(ontology, records.flatMap((record) => record.openAssumptions ?? []), 'open-assumption'),
        pres: [{ claim: '保留原判断 A′;Γ_p ⊢ φ 的证书与开放假设 Γ_p。', status: open.length ? 'conditional' : 'kept', note: open.length ? '选中的证书仍带开放假设，只有 Γ_p=∅ 才是无条件定理。' : '选中证书在登记范围内无开放假设。' }],
        losses: ['未收录的节点不代表在 A′ 中不可证。'],
      });
    },
    LC03(params) {
      const axioms = requireParam(params, 'axioms');
      const budget = requireParam(params, 'budget');
      assert(Array.isArray(axioms) && axioms.every((item) => item && typeof item.id === 'string' && Number.isInteger(item.weight) && item.weight >= 0), CODES.BAD_REQUEST, 'axioms 必须是 {id,weight} 数组');
      assert(Number.isInteger(budget) && budget >= 0, CODES.BAD_REQUEST, 'budget 必须是非负整数');
      if (axioms.length > 24) return makeResult(ontology, 'LC03', params, { status: 'unsupported', reason: '公理候选超过 24 项，超出有限精确选择域；不静默改用启发式排序。' });
      const sorted = [...axioms].sort((a, b) => a.id.localeCompare(b.id, 'en'));
      let best = { ids: [], weight: 0 };
      const total = 2 ** sorted.length;
      for (let mask = 0; mask < total; mask += 1) {
        const ids = [];
        let weight = 0;
        for (let index = 0; index < sorted.length; index += 1) {
          if (mask & (1 << index)) { ids.push(sorted[index].id); weight += sorted[index].weight; }
        }
        if (weight > budget) continue;
        if (ids.length > best.ids.length || (ids.length === best.ids.length && weight < best.weight) || (ids.length === best.ids.length && weight === best.weight && ids.join(',') < best.ids.join(','))) best = { ids, weight };
      }
      const records = ontology.raw.evidence.filter((record) => Array.isArray(record.usedAxioms) && record.usedAxioms.every((axiom) => best.ids.includes(axiom)));
      return makeResult(ontology, 'LC03', params, {
        ids: [...new Set(records.flatMap((record) => record.nodes))],
        boundary: boundaryItems(ontology, records.flatMap((record) => record.openAssumptions ?? []), 'open-assumption'),
        pres: [{ claim: '预算选择为外部给定的有限优化，选中公理集总权重不超过预算。', status: 'kept', note: `选中 ${best.ids.length} 项，总权重 ${best.weight}。` }],
      });
    },
    LC04(params) {
      const evidenceId = requireParam(params, 'evidenceId');
      const root = ontology.evidence(evidenceId);
      const ids = closureOver([evidenceId], (id) => ontology.evidence(id).dependsOn ?? []);
      const missing = ids.flatMap((id) => (ontology.evidence(id).dependsOn ?? []).filter((dep) => !ontology.evidenceById.has(dep))).map((dep) => ({ ref: dep, kind: 'missing-proof-dependency', note: '证明 DAG 引用了未登记的前提。' }));
      return makeResult(ontology, 'LC04', params, {
        ids: [...new Set(ids.flatMap((id) => ontology.evidence(id).nodes))],
        boundary: missing,
        pres: [{ claim: '保留所登记证书的证明 DAG 与结论。', status: 'kept', note: `回溯 ${ids.length} 条证据记录。` }],
        losses: ['只保留这份证明的祖先，不保留全部可能证明。'],
      });
    },
    LC05(params) {
      const seeds = requireParam(params, 'seedNodes');
      const use = params.use ?? 'proof';
      const unknown = [];
      const ids = closureOver(seeds, (nodeId) => {
        const support = querySupport(ontology, nodeId, use);
        if (support.status === 'Unknown') { unknown.push(nodeId); return []; }
        return support.set;
      });
      return makeResult(ontology, 'LC05', params, {
        ids,
        boundary: unknown.map((ref) => ({ ref, kind: 'unknown-support', note: '该节点的支持为 Unknown，不能补成空集。' })),
        pres: [{ claim: '在已选支持关系 D 上取闭包；该闭包允许有环。', status: 'kept', note: '只回答这份选择依赖什么，不决定路线可学性。' }],
      });
    },
    LC06(params) {
      const claimNode = requireParam(params, 'claimNode');
      const record = ontology.raw.evidence.find((item) => item.kind === 'model-pair' && item.nodes.includes(claimNode));
      if (!record) return makeResult(ontology, 'LC06', params, { status: 'unknown', reason: '没有登记支持同一断言与否定两方向的模型证据；搜索失败不标独立。' });
      return makeResult(ontology, 'LC06', params, { ids: [claimNode], pres: [{ claim: '两个方向的模型证据均需登记并附来源。', status: 'conditional', note: record.scope }, { claim: '独立性相对于指定语义与模型可信性说明。', status: 'conditional', note: '不声称一般独立性判定。' }] });
    },
    LC07(params) {
      const seeds = requireParam(params, 'seedNodes');
      const radius = params.radius ?? 1;
      const neighborhood = relationNeighborhood(ontology, seeds, { kinds: params.kinds ?? null, direction: params.direction ?? 'both', radius });
      return makeResult(ontology, 'LC07', params, { ids: neighborhood.nodes, presNote: `保留半径 ${radius} 内的指定关系记录。`, losses: neighborhood.relations.length === 0 ? ['该半径内没有登记关系。'] : [] });
    },
    LC08(params) {
      const left = requireParam(params, 'left');
      const right = requireParam(params, 'right');
      const use = params.use ?? 'expression';
      const intersection = supportIntersection(ontology, left, right, use);
      if (intersection.status === 'Unknown') return makeResult(ontology, 'LC08', params, { status: 'unknown', ids: [left, right], reason: intersection.reason });
      return makeResult(ontology, 'LC08', params, { ids: [left, right, ...intersection.set], presNote: '只反映这两份已登记支持的共同概念。', losses: ['不声称所有路线共同必需。'] });
    },
    LC09(params) {
      const left = requireParam(params, 'left');
      const right = requireParam(params, 'right');
      const use = params.use ?? 'expression';
      const difference = supportDifference(ontology, left, right, use);
      if (difference.status === 'Unknown') return makeResult(ontology, 'LC09', params, { status: 'unknown', ids: [left, right], reason: difference.reason });
      return makeResult(ontology, 'LC09', params, { ids: [left, right, ...difference.set], presNote: difference.note, losses: difference.minimal ? [] : ['至少一侧没有极小性证据，结果按普通支持显示。'] });
    },
    LC10(params) {
      const nodeId = requireParam(params, 'nodeId');
      const ids = closureOver([nodeId], (current) => ontology.raw.relationDescriptions.filter((relation) => relation.kind === 'hardGeneralization' && relation.to === current).map((relation) => relation.from));
      return makeResult(ontology, 'LC10', params, { ids, presNote: '只沿已登记的硬泛化见证上溯。', losses: ['同载体蕴含与跨载体映射分别保留在原关系记录中。'] });
    },
    LC11(params) {
      const nodeId = requireParam(params, 'nodeId');
      const ids = closureOver([nodeId], (current) => ontology.raw.relationDescriptions.filter((relation) => relation.kind === 'hardGeneralization' && relation.from === current).map((relation) => relation.to));
      return makeResult(ontology, 'LC11', params, { ids, presNote: '特化是泛化关系的逆，不取逆单值函数。' });
    },
    LC12(params) {
      const nodeId = requireParam(params, 'nodeId');
      const pairs = ontology.raw.relationDescriptions.filter((relation) => relation.kind === 'duality' && (relation.from === nodeId || relation.to === nodeId));
      const ids = [...new Set(pairs.flatMap((relation) => [relation.from, relation.to]))];
      return makeResult(ontology, 'LC12', params, { ids, presNote: '只保留已声明对偶操作及其结构见证。', losses: pairs.length ? [] : ['该节点没有登记对偶对应。'] });
    },
    LC13(params) {
      const goal = requireParam(params, 'goalId');
      const ids = closureOver([goal], (nodeId) => ontology.actionsFor(nodeId).flatMap((action) => action.inputs.map((input) => input.node)));
      const actions = ontology.raw.actions.filter((action) => ids.includes(action.outputs[0]?.node));
      return makeResult(ontology, 'LC13', params, {
        ids,
        status: 'computed',
        pres: [{ claim: '输出带 OR 标签的候选展开。', status: 'kept', note: `从目标 ${goal} 反向加入 ${actions.length} 个候选行动。` }],
        losses: ['分支并集不是一条可执行路线。'],
      });
    },
    LC14(params) {
      const nodeId = requireParam(params, 'nodeId');
      const counterexamples = ontology.raw.nodes.filter((node) => node.construct === 'Counterexample' && (node.formal?.target === nodeId || (node.formal?.anchors ?? []).includes(nodeId)));
      if (counterexamples.length === 0) return makeResult(ontology, 'LC14', params, { status: 'unknown', ids: [nodeId], reason: '没有登记与该断言相关的反例证书或否定范围锚点。' });
      const ids = [nodeId, ...counterexamples.map((node) => node.id), ...counterexamples.flatMap((node) => node.formal?.anchors ?? [])];
      return makeResult(ontology, 'LC14', params, { ids, presNote: '保持明确否定范围；不推断所有类似命题都假。' });
    },
    LC15(params) {
      const nodeId = requireParam(params, 'nodeId');
      const methods = ontology.raw.nodes.filter((node) => node.construct === 'Method' && Array.isArray(node.formal?.applicableTo));
      if (methods.length === 0) return makeResult(ontology, 'LC15', params, { status: 'unsupported', reason: '未登记方法与任务域之间的匹配证据。' });
      const ids = methods.filter((method) => method.formal.applicableTo.includes(nodeId)).map((method) => method.id);
      return makeResult(ontology, 'LC15', params, { ids: [nodeId, ...ids], presNote: '匹配证据不保证学习成功。' });
    },
    LC16(params) {
      const nodeId = params.nodeId ? [params.nodeId] : [];
      const records = ontology.raw.nodes.filter((node) => Array.isArray(node.formal?.invariants) && node.formal.invariants.length > 0);
      if (records.length === 0) return makeResult(ontology, 'LC16', params, { status: 'unsupported', reason: '未登记变换、函数与不变量证书。' });
      const ids = records.flatMap((node) => [node.id, ...node.formal.invariants.flatMap((item) => [item.transform, item.function].filter(Boolean))]);
      return makeResult(ontology, 'LC16', params, { ids: [...nodeId, ...ids], presNote: '只在已声明变换与有效域内保留不变量。' });
    },
    LC17(params) {
      const nodeId = params.nodeId;
      const constructions = ontology.raw.nodes.filter((node) => node.construct === 'Construction' && Array.isArray(node.formal?.inputs) && (!nodeId || node.id === nodeId));
      if (constructions.length === 0) return makeResult(ontology, 'LC17', params, { status: 'unsupported', reason: '未登记带输入端口的有向无环构造。' });
      const ids = constructions.flatMap((node) => node.formal.inputs.filter((input) => !node.formal.outputs.includes(input)));
      return makeResult(ontology, 'LC17', params, { ids: [...new Set(ids)], presNote: '只保留本构造的输入端口，不声称所有构造最小入口。' });
    },
    LC18(params) {
      const nodeId = params.nodeId;
      const applications = ontology.raw.relationDescriptions.filter((relation) => relation.kind === 'application' && (!nodeId || relation.from === nodeId || relation.to === nodeId));
      if (applications.length === 0) return makeResult(ontology, 'LC18', params, { status: 'unknown', ids: nodeId ? [nodeId] : [], reason: '未登记应用描述与输入解释；迁移条件保持候选状态。' });
      return makeResult(ontology, 'LC18', params, { ids: applications.flatMap((relation) => [relation.from, relation.to]), presNote: '只输送已登记条件匹配与结构关系。', losses: ['外部可用性评价另附。'] });
    },
    LC19(params, context) {
      const theta = context.theta;
      const blocks = (params.blocks ?? theta?.known?.map((entry) => entry.node) ?? []).map((nodeId) => ({ id: `block:${nodeId}`, ids: [nodeId] }));
      return makeResult(ontology, 'LC19', params, {
        ids: blocks.map((block) => aggregateItem({ id: block.id, title: `已确认：${ontology.maybeNode(block.ids[0])?.title ?? block.ids[0]}`, blocks: [block.ids] })),
        tau: Object.fromEntries(blocks.map((block) => [block.id, block.ids])),
        boundary: theta?.boundary?.map((item) => ({ ...item })) ?? [],
        presNote: '已知标签来源是 E；未知不折叠。',
        losses: theta?.known?.length ? [] : ['没有显式确认块；图示为读取 Adapt 参数包后的空折叠。'],
      });
    },
    LC20(params, context) {
      const theta = context.theta;
      if (!theta) return makeResult(ontology, 'LC20', params, { status: 'unsupported', reason: '需要显式适配参数包 θ；请先选择档案或传入外部状态。' });
      const known = new Set(theta.known.map((entry) => entry.node));
      const unknown = new Set(theta.unknown.map((entry) => entry.node));
      const confirmedFrontier = [];
      const possibleFrontier = [];
      for (const action of ontology.raw.actions) {
        const inputs = action.inputs.map((input) => input.node);
        if (inputs.every((node) => known.has(node))) confirmedFrontier.push(action.id);
        else if (inputs.every((node) => known.has(node) || unknown.has(node)) && inputs.some((node) => unknown.has(node))) possibleFrontier.push(action.id);
      }
      return makeResult(ontology, 'LC20', params, {
        ids: [...new Set([...confirmedFrontier, ...possibleFrontier].flatMap((actionId) => ontology.action(actionId).outputs.map((output) => output.node)))],
        boundary: theta.boundary ?? [],
        pres: [
          { claim: '确认前沿：全部输入已确认可用。', status: 'conditional', note: `${confirmedFrontier.length} 个行动。` },
          { claim: '可能前沿：部分输入未决。', status: 'conditional', note: `${possibleFrontier.length} 个行动；两类不合并成确定掌握。` },
        ],
      });
    },
    LC21(params, context) {
      const theta = context.theta;
      const patternIds = params.patternIds ?? theta?.misconceptions?.map((item) => item.patternId) ?? [];
      const patterns = ontology.raw.patterns.filter((pattern) => patternIds.includes(pattern.id));
      return makeResult(ontology, 'LC21', params, {
        ids: [...new Set(patterns.flatMap((pattern) => [pattern.node, ...(pattern.anchors ?? [])]).filter(Boolean))],
        boundary: patterns.length === 0 && patternIds.length === 0 ? [{ ref: 'pattern:*', kind: 'unknown-pattern', note: '没有个人误区关联记录；未作诊断不等于无误区。' }] : [],
        presNote: '个人判断只作显示注记；公共模式不被改写。',
      });
    },
    LC22(params, context) {
      const nodeId = requireParam(params, 'nodeId');
      const allowed = params.allowed ?? context.theta?.representations ?? null;
      const reps = (ontology.maybeNode(nodeId)?.representations ?? []).filter((rep) => !allowed || allowed.includes(rep.kind));
      if (reps.length === 0) return makeResult(ontology, 'LC22', params, { status: 'unknown', ids: [nodeId], reason: '允许表征集合与登记表征的交为空；报告缺少匹配表征，不删除目标。' });
      return makeResult(ontology, 'LC22', params, { ids: [nodeId], tau: { [nodeId]: [nodeId] }, pres: [{ claim: '不改变节点的形式负载，只选择表征。', status: 'kept', note: reps.map((rep) => rep.title).join('、') }] });
    },
    LC23(params, context) {
      const stage = params.stage ?? context.theta?.stage;
      const actions = ontology.raw.actions.filter((action) => action.stages);
      if (!stage || actions.length === 0) return makeResult(ontology, 'LC23', params, { status: 'unsupported', reason: '未登记阶段约束或行动阶段标签；阶段是外部模型解释。' });
      const ids = actions.filter((action) => action.stages.includes(stage)).flatMap((action) => action.inputs.map((input) => input.node));
      return makeResult(ontology, 'LC23', params, { ids: [...new Set(ids)], presNote: '未知可行性单列，不把阶段当作节点永久标签。' });
    },
    LC24(params, context) {
      const theta = context.theta;
      if (!theta) return makeResult(ontology, 'LC24', params, { status: 'unsupported', reason: '需要显式适配参数包 θ；缺少证据不等于未掌握，因此不猜测缺口。' });
      const goalId = requireParam(params, 'goalId');
      const competences = params.competences ?? ['定义陈述', '例子辨认', '证明'];
      const covered = new Set(Object.keys(theta.coverage).filter((key) => key.startsWith(`${goalId}:`)).map((key) => key.split(':')[1]));
      const gaps = competences.filter((dimension) => !covered.has(dimension));
      return makeResult(ontology, 'LC24', params, {
        ids: [goalId, ...ontology.actionsFor(goalId).flatMap((action) => action.inputs.map((input) => input.node))],
        boundary: gaps.map((dimension) => ({ ref: `${goalId}:${dimension}`, kind: 'evidence-gap', note: `缺少「${dimension}」的能力证据；缺少证据不等于未掌握。` })),
        presNote: '只指出覆盖缺口，不伪装成掌握事实。',
      });
    },
    LC25(params) {
      const request = planParams(params);
      const plan = planner.plan(request);
      const family = routeFamilyRequirement(plan.routes, [request.goalId], { complete: plan.search.complete, note: plan.search.domain });
      if (family.status === 'Unknown') return makeResult(ontology, 'LC25', params, { status: 'unknown', ids: [request.goalId], reason: family.reason });
      return makeResult(ontology, 'LC25', params, { ids: [request.goalId, ...family.set], presNote: family.note, losses: plan.search.complete ? [] : ['路线族未完整枚举。'] });
    },
    LC26(params) {
      const routeA = planParams(requireParam(params, 'routeA'));
      const routeB = planParams(requireParam(params, 'routeB'));
      const a = planner.plan(routeA);
      const b = planner.plan(routeB);
      const firstA = a.routes[0];
      const firstB = b.routes[0];
      if (!firstA || !firstB) return makeResult(ontology, 'LC26', params, { status: 'unknown', reason: '至少一条路线没有候选，无法比较差异。' });
      const eventsA = new Set(firstA.events.map((event) => `${event.actionId}:${event.focus.node}`));
      const eventsB = new Set(firstB.events.map((event) => `${event.actionId}:${event.focus.node}`));
      const symmetric = [...new Set([...eventsA].filter((item) => !eventsB.has(item)).concat([...eventsB].filter((item) => !eventsA.has(item))))];
      return makeResult(ontology, 'LC26', params, { ids: [...new Set([...symmetric.flatMap((item) => item.split(':'))].filter((id) => ontology.maybeNode(id)))], presNote: '节点集合差不能代替事件多重性差；同时保留事件对应。', losses: ['只比较两条候选路线的首个结果包。'] });
    },
    LC27(params) {
      const goalId = requireParam(params, 'goalId');
      const routes = params.routes ?? [];
      const outputs = new Map();
      for (const route of routes) for (const event of route.events ?? []) for (const output of event.provides ?? []) {
        if (!outputs.has(output.node)) outputs.set(output.node, new Set());
        outputs.get(output.node).add(event.actionId);
      }
      const shared = [...outputs.entries()].filter(([, actions]) => actions.size > 1).map(([node]) => node);
      const bridges = ontology.raw.relationDescriptions.filter((relation) => relation.kind === 'bridge' && relation.witness.status === 'PROOF' && (relation.to === goalId || relation.from === goalId));
      if (shared.length === 0 && bridges.length === 0) return makeResult(ontology, 'LC27', params, { status: 'unknown', ids: [goalId], reason: '没有同一节点引用的输出，也没有显式桥接证书；同名或近似不自动汇合。' });
      return makeResult(ontology, 'LC27', params, { ids: [...new Set([goalId, ...shared, ...bridges.flatMap((relation) => [relation.from, relation.to])])], presNote: '形式汇合不表示外部认知状态相同。' });
    },
    LC28(params) {
      const request = planParams(params);
      const disabled = params.disabled ?? [];
      const base = reachableNodes(ontology, request.background, { disabledNodes: [] });
      const without = reachableNodes(ontology, request.background, { disabledNodes: disabled });
      /*
       * 可达性计算被轮数上限截断时 `available` 是**不完整**的：这时"目标不在集合里"
       * 只说明"还没算完"，不能说"不可达"。从前这里直接当作不可达，于是 LC28 会输出
       * 一条看起来算出来的瓶颈结论（`status: 'computed'`）。截断一律 unknown。
       */
      if (base.truncated || without.truncated) {
        return makeResult(ontology, 'LC28', params, {
          ids: [request.goalId, ...disabled],
          status: 'unknown',
          reason: `可达性计算被轮数上限截断（基础 ${base.rounds} 轮、禁用后 ${without.rounds} 轮）：目标是否可达还没算完，不能据此报瓶颈。`,
          pres: [{ claim: '严格禁用：排除输入或输出触及禁用集合的行动。', status: 'conditional', note: `禁用 ${disabled.length} 项；可达计算未收敛。` }],
          losses: ['Horn 可达是必要结构检查，不替代事件规划。'],
        });
      }
      const targetReachable = base.available.includes(request.goalId);
      const targetBlocked = !without.available.includes(request.goalId);
      /* 逐个禁用探测同样要跳过被截断的结果——否则会把"没算完"当成"确实被阻断"。 */
      const bottlenecks = disabled.filter((nodeId) => {
        if (!(targetReachable && targetBlocked)) return false;
        const probe = reachableNodes(ontology, request.background, { disabledNodes: [nodeId] });
        return !probe.truncated && probe.available.includes(request.goalId) === false;
      });
      return makeResult(ontology, 'LC28', params, {
        ids: [request.goalId, ...disabled],
        status: targetReachable && targetBlocked ? 'computed' : 'unknown',
        reason: targetReachable && targetBlocked ? undefined : '在声明背景下，目标本身不可达或禁用集合没有阻断目标；瓶颈结论需要两次可达验证记录。',
        pres: [{ claim: '严格禁用：排除输入或输出触及禁用集合的行动。', status: 'conditional', note: `禁用 ${disabled.length} 项；基础可达 ${base.available.length} 节点，禁用后 ${without.available.length} 节点。` }],
        losses: ['Horn 可达是必要结构检查，不替代事件规划。'],
      });
    },
    LC29(params) {
      const nodeId = requireParam(params, 'nodeId');
      const bridges = ontology.raw.relationDescriptions.filter((relation) => relation.kind === 'bridge' && (relation.from === nodeId || relation.to === nodeId));
      const certified = bridges.filter((relation) => relation.witness.status === 'PROOF' || relation.witness.status === 'DEF');
      if (certified.length === 0) return makeResult(ontology, 'LC29', params, { status: 'unknown', ids: [nodeId], reason: '没有登记认证的接口翻译 F；不是所有桥接都是 institution 态射。' });
      return makeResult(ontology, 'LC29', params, { ids: certified.flatMap((relation) => [relation.from, relation.to]), presNote: '只输送已证明的结构关系；成本不随之保持。' });
    },
    LC30(params) {
      const request = planParams(params);
      const disabled = params.disabled ?? [];
      const filteredActions = ontology.raw.actions.filter((action) => ![...action.inputs, ...action.outputs].some((item) => disabled.includes(item.node)) && !disabled.includes(action.id));
      const view = { ...ontology, raw: { ...ontology.raw, actions: filteredActions } };
      const localPlanner = makePlanner(view);
      const plan = localPlanner.plan({ ...request, useUnknownEntries: params.useUnknownEntries !== false });
      return makeResult(ontology, 'LC30', params, {
        ids: [request.goalId, ...plan.routes.flatMap((route) => route.events.flatMap((event) => event.provides.map((output) => output.node)))],
        status: plan.status === 'Unknown' ? 'unknown' : 'computed',
        reason: plan.status === 'Unknown' ? '剩余搜索未完成或存在待决项。' : undefined,
        pres: [{ claim: `替代路线状态：${plan.status}。`, status: plan.status === 'InfeasibleWithinBound' ? 'conditional' : 'kept', note: plan.search.domain }],
        losses: ['不能只删图上节点就保留旧证书。'],
      });
    },
    LC31(params) {
      const kind = params.kind ?? 'topic';
      const aggregates = ontology.raw.aggregates.filter((aggregate) => aggregate.kind === kind);
      if (aggregates.length === 0) return makeResult(ontology, 'LC31', params, { status: 'unknown', reason: `没有登记 kind=${kind} 的合法有限话题块族。` });
      return makeResult(ontology, 'LC31', params, {
        ids: aggregates.map(aggregateItem),
        tau: Object.fromEntries(aggregates.map((aggregate) => [aggregate.id, aggregate.blocks.flat()])),
        presNote: '关系按明确读法提升；存在联系不解释为整话题必修。',
      });
    },
    LC32(params) {
      const disciplineOf = (nodeId) => ontology.maybeNode(nodeId)?.discipline ?? '边界';
      const cross = ontology.raw.relationDescriptions.filter((relation) => disciplineOf(relation.from) !== disciplineOf(relation.to));
      return makeResult(ontology, 'LC32', params, { ids: cross.flatMap((relation) => [relation.from, relation.to]), presNote: '丢失域内部细节而保留跨域证据；没有跨边不证明两域无联系。' });
    },
    LC33(params) {
      const mode = requireParam(params, 'mode');
      if (mode === 'level') {
        const aggregates = ontology.raw.aggregates;
        return makeResult(ontology, 'LC33', params, { ids: aggregates.map(aggregateItem), tau: Object.fromEntries(aggregates.map((aggregate) => [aggregate.id, aggregate.blocks.flat()])), presNote: '聚合层级与语法深度不是一个量。' });
      }
      if (mode === 'depth') {
        const depth = requireParam(params, 'depth');
        const withDepth = ontology.raw.nodes.filter((node) => Number.isInteger(node.formal?.generationDepth));
        if (withDepth.length === 0) return makeResult(ontology, 'LC33', params, { status: 'unsupported', reason: '节点未登记有限生成深度；不能按名称猜测层级。' });
        return makeResult(ontology, 'LC33', params, { ids: withDepth.filter((node) => node.formal.generationDepth <= depth).map((node) => node.id), presNote: `选择生成深度不超过 ${depth} 的登记候选；该层可能仍无限。` });
      }
      return makeResult(ontology, 'LC33', params, { status: 'unsupported', reason: `未知投影模式：${mode}` });
    },
    LC34(params) {
      const request = planParams(params);
      const plan = planner.plan({ ...request, budget: params.budget ?? request.budget });
      const within = plan.routes.filter((route) => route.cost.status === 'known' && (!params.budget?.maxCost || route.cost.vector.reduce((sum, value) => sum + value, 0) <= params.budget.maxCost));
      return makeResult(ontology, 'LC34', params, {
        ids: [...new Set(within.flatMap((route) => route.events.flatMap((event) => event.provides.map((output) => output.node))))],
        status: plan.status === 'Unknown' ? 'unknown' : 'computed',
        reason: plan.status === 'Unknown' ? '预算比较所需的成本或事件界未定。' : undefined,
        pres: [{ claim: '预算不删掉依赖：每条路线仍保留完整输入来源。', status: 'conditional', note: `候选中 ${within.length} 条具有可比较成本。` }],
        losses: ['成本未知者单列，不按默认数字参与比较。'],
      });
    },
    LC35(params) {
      const categories = params.categories ?? [];
      assert(Array.isArray(categories) && categories.length > 0, CODES.BAD_REQUEST, 'categories 必须是非空数组');
      const records = ontology.raw.evidence.filter((record) => categories.includes(record.kind) || categories.includes(record.status));
      return makeResult(ontology, 'LC35', params, { ids: [...new Set(records.flatMap((record) => record.nodes))], presNote: '证据类别不是统一可信度排序；经验结果不能按高分变成数学证明。' });
    },
    LC36(params) {
      const unknownNodes = ontology.raw.support.filter((record) => record.status === 'unknown').map((record) => record.node);
      const unfinished = ontology.raw.evidence.filter((record) => record.checkStatus !== 'passed' && record.kind === 'machine-certificate').flatMap((record) => record.nodes);
      const boundary = [...new Set([...unknownNodes, ...unfinished])].map((ref) => ({ ref, kind: 'unknown-boundary', note: '该对象在本次登记中处于未决区；未决不是假、空或不存在。' }));
      return makeResult(ontology, 'LC36', params, {
        ids: [...new Set([...unknownNodes, ...unfinished])],
        boundary,
        presNote: '只改变标注，不生成新的硬关系。',
        losses: ['语义上的所有未知不能被有限清单穷尽。'],
      });
    },
  };

  function compute(id, rawContext = {}) {
    const definition = ontology.raw.localizations.find((item) => item.id === id);
    if (!definition) throw new McsError(CODES.UNKNOWN_LOCALIZATION, `未知局部化算子：${id}`, 404);
    const handler = handlers[id];
    if (!handler) throw new McsError(CODES.UNKNOWN_LOCALIZATION, `算子 ${id} 还没有计算实现。`, 501);
    const params = rawContext.params ?? {};
    const context = { ...rawContext };
    if (context.profile && !context.theta) context.theta = adapt(ontology, context.profile, { goalId: context.goalId ?? null, budget: context.budget ?? null });
    const result = handler(params, context);
    return { ...result, definition: { name: definition.name, family: definition.family, definition: definition.definition, boundary: definition.boundary, computable: definition.computable } };
  }

  return { compute, registry: ontology.raw.localizations, version: LOCALIZER_VERSION };
}

export function explainLocalizationFamilies() {
  return {
    logical: 'LC01–LC06：签名、理论、公理预算、证明回溯、依赖补全与独立性边界。',
    structural: 'LC07–LC12：种子邻域、支持交差、泛化特化锥与对偶对应。',
    problem: 'LC13–LC18：目标回溯、反例诊断、策略适用域、不变量、构造入口与应用迁移。',
    cognitive: 'LC19–LC24：由 Adapt 参数包产生的显示折叠、认知前沿、误区、表征、阶段与证据缺口。',
    comparison: 'LC25–LC30：共同核心、差异、汇合、瓶颈、桥接与前提失效后的替代路线。',
    hierarchy: 'LC31–LC33：话题聚合、跨域接口与层级投影。',
    resource: 'LC34–LC36：时间预算、证据类别与未知边界。',
    law: 'Loc_λ(M) 只读公共本体；Adapt(E,s,g,b) 不接收 M；直接读取 M 的入口单独命名 Adapt_M。',
  };
}
