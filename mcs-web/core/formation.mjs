import { CONSTRUCTS, ROLES, CLAIM_ROLES, EVIDENCE_STATUS, CHECK_STATUS, assert } from '../shared/contracts.mjs';
import { McsError, CODES } from '../shared/errors.mjs';
import { parseType, typeToString, checkTerm } from './typecheck.mjs';

const has = (object, key) => Object.prototype.hasOwnProperty.call(object ?? {}, key) && object[key] !== undefined && object[key] !== null;
const isEmptyArray = (value) => Array.isArray(value) && value.length === 0;

export const FORMATION_CHECKS = Object.freeze({
  Symbol: [
    { key: 'declaration', test: (f) => typeof f.declaration === 'string' && f.declaration.length > 0, note: '声明合法' },
    { key: 'type', test: (f) => typeof f.type === 'string' && parseTypeSafe(f.type), note: '签名类型可解析' },
    { key: 'signatureVersion', test: (f) => typeof f.signatureVersion === 'string' && f.signatureVersion.length > 0, note: '签名版本已声明' },
  ],
  Term: [
    { key: 'theory', test: (f) => typeof f.theory === 'string' && f.theory.length > 0, note: '背景理论已声明' },
    { key: 'typeEnv', test: (f) => f.typeEnv && typeof f.typeEnv === 'object', note: '类型环境已给出' },
    { key: 'term', test: (f) => f.term && typeof f.term === 'object', note: '有限表达项已给出' },
    { key: 'type', test: (f) => typeof f.type === 'string' && parseTypeSafe(f.type), note: '表达类型可解析' },
  ],
  Concept: [
    { key: 'objectType', test: (f) => typeof f.objectType === 'string' && f.objectType.length > 0, note: '对象类型已声明' },
    { key: 'parameters', test: (f) => Array.isArray(f.parameters) && f.parameters.length > 0, note: '参数已声明' },
    { key: 'predicate', test: (f) => typeof f.predicate === 'string' && f.predicate.length > 0, note: '分类谓词已给出' },
    { key: 'type', test: (f) => typeof f.type === 'string' && parseTypeSafe(f.type), note: '谓词类型可解析' },
  ],
  Definition: [
    { key: 'newSymbol', test: (f) => typeof f.newSymbol === 'string' && f.newSymbol.length > 0, note: '新符号已声明' },
    { key: 'oldTerm', test: (f) => typeof f.oldTerm === 'string' && f.oldTerm.length > 0, note: '旧语言项已给出' },
    { key: 'expansion', test: (f) => f.expansion && typeof f.expansion === 'object', note: '扩张记录已给出' },
    { key: 'conservative', test: (f) => ['proved', 'declared', 'unknown'].includes(f.conservative), note: '保守性状态已声明' },
  ],
  Claim: [
    { key: 'theory', test: (f) => typeof f.theory === 'string' && f.theory.length > 0, note: '所属理论已声明' },
    { key: 'formula', test: (f) => typeof f.formula === 'string' && f.formula.length > 0, note: '公式已给出' },
    { key: 'type', test: (f) => f.type === 'o', note: '公式类型必须是 o' },
    { key: 'assumptions', test: (f) => Array.isArray(f.assumptions), note: '局部假设是有限列表' },
  ],
  Proof: [
    { key: 'target', test: (f) => typeof f.target === 'string' && f.target.length > 0, note: '目标 Claim 已引用' },
    { key: 'code', test: (f) => f.code && typeof f.code === 'object', note: '有限证书代码已给出' },
    { key: 'checkStatus', test: (f) => CHECK_STATUS.includes(f.checkStatus), note: '检查状态独立记录' },
  ],
  Example: [
    { key: 'concept', test: (f) => typeof f.concept === 'string' && f.concept.length > 0, note: '概念引用已给出' },
    { key: 'objectSpec', test: (f) => f.objectSpec && typeof f.objectSpec === 'object', note: '对象规格已给出' },
    { key: 'satisfaction', test: (f) => typeof f.satisfaction === 'string' && f.satisfaction.length > 0, note: '满足断言已给出' },
  ],
  Counterexample: [
    { key: 'target', test: (f) => typeof f.target === 'string' && f.target.length > 0, note: '被反驳目标已给出' },
    { key: 'objectSpec', test: (f) => f.objectSpec && typeof f.objectSpec === 'object', note: '对象规格已给出' },
    { key: 'failureWitness', test: (f) => typeof f.failureWitness === 'string' && f.failureWitness.length > 0, note: '失败见证已给出' },
  ],
  Problem: [
    { key: 'inputs', test: (f) => Array.isArray(f.inputs), note: '输入接口已给出' },
    { key: 'outputs', test: (f) => Array.isArray(f.outputs), note: '输出接口已给出' },
    { key: 'goal', test: (f) => typeof f.goal === 'string' && f.goal.length > 0, note: '目标规格已给出' },
    { key: 'constraints', test: (f) => Array.isArray(f.constraints), note: '约束已给出' },
  ],
  Theory: [
    { key: 'language', test: (f) => typeof f.language === 'string' && f.language.length > 0, note: '语言已声明' },
    { key: 'calculus', test: (f) => typeof f.calculus === 'string' && f.calculus.length > 0, note: '演算已声明' },
    { key: 'axioms', test: (f) => Array.isArray(f.axioms) || Array.isArray(f.modules), note: '公理呈现或模块引用已给出' },
  ],
  Construction: [
    { key: 'inputs', test: (f) => Array.isArray(f.inputs), note: '输入端口已给出' },
    { key: 'outputs', test: (f) => Array.isArray(f.outputs), note: '输出端口已给出' },
    { key: 'steps', test: (f) => Array.isArray(f.steps) && f.steps.length > 0, note: '有限步骤已给出' },
    { key: 'verificationTarget', test: (f) => typeof f.verificationTarget === 'string' && f.verificationTarget.length > 0, note: '验证目标已给出' },
  ],
  Method: [
    { key: 'scope', test: (f) => typeof f.scope === 'string' && f.scope.length > 0, note: '范围标签已给出' },
    { key: 'In', test: (f) => typeof f.In === 'string' && f.In.length > 0, note: '任务输入接口已给出' },
    { key: 'Out', test: (f) => typeof f.Out === 'string' && f.Out.length > 0, note: '候选结果接口已给出' },
    { key: 'Pre', test: (f) => typeof f.Pre === 'string' && f.Pre.length > 0, note: '前置条件已声明' },
    { key: 'Post', test: (f) => typeof f.Post === 'string' && f.Post.length > 0, note: '后置条件已声明' },
    { key: 'body', test: (f) => typeof f.body === 'string' && f.body.length > 0, note: '启发体已给出' },
    { key: 'fail', test: (f) => typeof f.fail === 'string' && f.fail.length > 0, note: '失效范围已给出' },
  ],
  Representation: [
    { key: 'object', test: (f) => typeof f.object === 'string' && f.object.length > 0, note: '对象已引用' },
    { key: 'medium', test: (f) => typeof f.medium === 'string' && f.medium.length > 0, note: '表达介质已声明' },
    { key: 'correspondence', test: (f) => typeof f.correspondence === 'string' && f.correspondence.length > 0, note: '对应说明已给出' },
  ],
  MisconceptionPattern: [
    { key: 'wrongRule', test: (f) => typeof f.wrongRule === 'string' && f.wrongRule.length > 0, note: '错误规则已给出' },
    { key: 'task', test: (f) => typeof f.task === 'string' && f.task.length > 0, note: '辨析任务已给出' },
    { key: 'counterexample', test: (f) => typeof f.counterexample === 'string' && f.counterexample.length > 0, note: '反例已给出' },
    { key: 'scope', test: (f) => typeof f.scope === 'string' && f.scope.length > 0, note: '否定范围已给出' },
  ],
});

function parseTypeSafe(value) {
  try { parseType(value); return true; } catch { return false; }
}

export function checkFormation(node) {
  assert(node && typeof node.id === 'string', CODES.BAD_REQUEST, '节点必须有 id');
  assert(CONSTRUCTS.includes(node.construct), CODES.BAD_REQUEST, `未知构造类型：${node.construct}`);
  const checks = [];
  const formal = node.formal ?? {};
  for (const spec of FORMATION_CHECKS[node.construct]) {
    let status = 'passed';
    let detail = spec.note;
    try {
      if (!spec.test(formal)) { status = 'missing'; detail = `缺少或无效：${spec.key}`; }
    } catch (error) {
      status = 'rejected';
      detail = `${spec.note}：${error.message}`;
    }
    checks.push({ name: spec.key, status, detail });
  }
  if (has(formal, 'type') && node.construct === 'Concept') {
    try {
      const parsed = parseType(formal.type);
      const rendered = typeToString(parsed);
      if (!rendered.endsWith('o')) {
        checks.push({ name: 'concept-result-type', status: 'rejected', detail: `概念谓词的值域必须是 o，得到 ${rendered}` });
      } else {
        checks.push({ name: 'concept-result-type', status: 'passed', detail: `谓词类型 ${rendered}` });
      }
    } catch (error) {
      checks.push({ name: 'concept-result-type', status: 'rejected', detail: error.message });
    }
  }
  if (node.construct === 'Term' && formal.term && formal.typeEnv) {
    try {
      const inferred = checkTerm(formal.term, formal.typeEnv);
      checks.push({ name: 'term-typecheck', status: 'passed', detail: `推导类型：${typeToString(inferred)}` });
    } catch (error) {
      checks.push({ name: 'term-typecheck', status: 'rejected', detail: error.message });
    }
  }
  for (const role of node.roles ?? []) {
    if (!ROLES.includes(role)) checks.push({ name: `role:${role}`, status: 'rejected', detail: '未知角色' });
    if (CLAIM_ROLES.includes(role) && node.construct !== 'Claim') {
      checks.push({ name: `role:${role}`, status: 'rejected', detail: '该角色只能标注在 Claim 上' });
    }
  }
  const rejected = checks.some((check) => check.status === 'rejected');
  const missing = checks.filter((check) => check.status === 'missing');
  const status = rejected ? 'rejected' : missing.length ? 'incomplete' : 'well-formed';
  return {
    nodeId: node.id,
    construct: node.construct,
    status,
    checks,
    note: status === 'well-formed'
      ? '形成检查通过；这不表示节点命题为真或已认证。'
      : '形成检查未通过；缺失字段和未编码部分必须保留为未决。',
  };
}

export function checkOntologyLegality(ontology) {
  const results = [];
  const nodes = ontology.nodes;
  const boundary = new Set(ontology.environmentBoundary?.refs ?? []);
  const resolves = (id) => nodes.some((node) => node.id === id) || boundary.has(id);
  const push = (name, ok, detail) => results.push({ name, status: ok ? 'passed' : 'failed', detail });

  push('身份功能性', new Set(nodes.map((node) => node.id)).size === nodes.length, '每个引用在一个版本中恰有一份负载');
  const badFormation = nodes.filter((node) => ['rejected', 'incomplete'].includes(checkFormation(node).status));
  push('负载良构', badFormation.length === 0, badFormation.length ? `待补形成检查：${badFormation.map((node) => node.id).join('、')}` : '全部登记节点形成检查通过');
  const dangling = [
    ...ontology.actions.flatMap((action) => [...action.inputs.map((input) => input.node), ...action.outputs.map((output) => output.node)]),
    ...ontology.relationDescriptions.flatMap((relation) => [relation.from, relation.to]),
    ...ontology.evidence.flatMap((record) => record.nodes),
    ...ontology.support.map((record) => record.node),
  ].filter((id) => !resolves(id));
  push('引用封闭', dangling.length === 0, dangling.length ? `悬空引用：${[...new Set(dangling)].join('、')}` : '全部引用可解析或显式指向环境边界');
  const badCerts = ontology.evidence.filter((record) => record.kind === 'machine-certificate' && (record.checkStatus === 'passed' && !record.checker));
  push('认证可靠', badCerts.length === 0, badCerts.length ? `证书缺少检查器：${badCerts.map((record) => record.id).join('、')}` : '机器证书均绑定检查器版本；检查器自身未声称形式验证');
  const actionLeak = ontology.actions.filter((action) => JSON.stringify(action).match(/profileId|learnerId|mastery|attempts/));
  push('行动独立', actionLeak.length === 0, actionLeak.length ? `行动含个人字段：${actionLeak.map((action) => action.id).join('、')}` : '行动契约不读取规划或个人掌握估计');
  const badSupport = ontology.support.filter((record) => record.status === 'known' ? !Array.isArray(record.set) : record.set !== undefined);
  push('支持有型', badSupport.length === 0, badSupport.length ? `支持记录混用 Unknown 与集合：${badSupport.map((record) => record.id).join('、')}` : 'Known(A)、Unknown 与部分界分开登记');
  push('层级与溯源', ontology.aggregates.every((aggregate) => Array.isArray(aggregate.blocks)), '聚合保留成员块，视图另存溯源映射');
  const publicPayload = JSON.stringify({ payload: ontology.payload, evidence: ontology.evidence, actions: ontology.actions });
  push('外部隔离', !/"(profileId|learnerId|studentId|mastery|attempts)"\s*:/.test(publicPayload), '公共负载与认证不含个人标识或学习状态');
  return { status: results.every((item) => item.status === 'passed') ? 'passed' : 'failed', conditions: results };
}

export function roleSummary(node) {
  const roles = node.roles ?? [];
  const claimRoles = roles.filter((role) => CLAIM_ROLES.includes(role));
  return { roles, claimRoles, note: claimRoles.length ? `Claim 角色：${claimRoles.join('、')}` : '无 Claim 角色' };
}
