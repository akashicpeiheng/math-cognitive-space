/**
 * 默认学习者档案模板（2026-10 加）。
 *
 * ## 这是什么
 *
 * 档案模板 = 一份**公开、版本化的初始声明**：某个学习阶段通常已经学完哪些数学内容。
 * 建档案时选一个模板，服务端就把模板声明的节点写成一串 `confirmation` 事件
 * （`source.kind = 'system'`、`payload.declared = true`）落进外部模型 E。
 * 于是这份档案的 θ.known 一开始不是空的，「起始节点」（前置已确认的节点）由此扩大。
 *
 * ## 三条纪律
 *
 * 1. **不进 M**：本文件不参与 `data/manifest.mjs` 的装配，因此**不改 `contentHash`**。
 *    模板是 E 的初值，不是本体的一部分——改模板不会让已存档案的 `ontologyVersion` 失配。
 * 2. **只声明背景接口节点**（`case === 'background'`）。那九个节点是本站对「环境边界」的
 *    显式声明，语义上正好是「学习者应当已经具备的前提」。案例节点（`limit:` / `dg:` / `group:` …）
 *    是本站要**教**的内容，模板不许替学习者声明「已经学过」——那会把「起始节点」变成伪造的进度。
 *    这条由 `validateProfileTemplates()` 强制，`npm run check` 的 `[9]` 节与测试都会核对。
 * 3. **声明 ≠ 测评**：模板给的是阶段性的常见课程覆盖，逐条写明依据；界面必须同时给出
 *    「逐条改」的去处（标为尚未确认），事件里也留下模板 id 与 `declared: true`，
 *    事后能分清「这条是他自己确认的」与「这条是模板代写的」。
 *
 * ## 与「起始节点」的关系
 *
 * 「起始节点」不在这里登记，也不在 M 里登记——它是 D 层的**派生**：
 * 给定本体（行动契约 + 硬前置关系）与这份档案的 θ.known，当场算出「前置都已确认」的节点。
 * 因此本文件只负责给出 θ 的初值，算起始节点的那份规则在 `web/src/starting-nodes.ts` 一处。
 */

/** 成对文案：中文是源语言，英文是译文。取用由界面按当前语种选。 */
const pair = (zh, en) => ({ zh, en });

/**
 * 模板 id 的形态：小写 kebab。它同时会写进事件的 `payload.template` 与 `source.ref`，
 * 事后据此反查「这份档案是从哪个模板开出来的」，所以不许改已发布模板的 id。
 */
const TEMPLATE_ID = /^[a-z][a-z0-9-]*$/;

/** 背景接口节点的 case 值（见 `data/authoring.mjs` 的 symbol()/theoryNode()）。 */
const BACKGROUND_CASE = 'background';

export const PROFILE_TEMPLATES = [
  {
    id: 'blank',
    /*
     * 空白模板必须存在，且必须**一个节点都不声明**：它是「什么都不假设」的对照组，
     * 也是模板机制的安全默认值（`DEFAULT_PROFILE_TEMPLATE_ID`）。
     */
    name: pair('空白档案（自己声明）', 'Blank profile (declare it yourself)'),
    stage: pair('不预设任何已学内容', 'Nothing is assumed to be known'),
    summary: pair(
      '一个已确认节点都没有。起始节点因此只剩「不需要任何登记前置」的那些——背景接口，以及本体里没有登记输入的少数节点。',
      'Not a single confirmed node. Starting nodes are therefore only those with no registered prerequisites at all — the background interfaces, plus the few nodes with no registered inputs.',
    ),
    note: pair(
      '这一项不改任何默认行为：不选模板就是它。',
      'This option changes no default behaviour: not choosing a template means this one.',
    ),
    declares: [],
  },
  {
    id: 'high-school-1',
    name: pair('高一', 'Grade 10 (first year of senior high)'),
    stage: pair('完成义务教育阶段数学', 'Compulsory-education mathematics completed'),
    summary: pair(
      '从初中毕业的常见覆盖出发：等式与实数度量已在手里，其余背景接口（量词、函数、线性代数、拓扑、多元微分、群公理）仍然要自己声明。',
      'Starting from what compulsory education normally covers: equality and the real metric background are in hand; the other background interfaces (quantifiers, functions, linear algebra, topology, multivariable calculus, group axioms) still have to be declared by you.',
    ),
    note: pair(
      '「已学过」是**声明**，不是测评：模板写的是这个阶段的常见课程覆盖，本站没有核对任何人的学习经历。逐条依据见下；不认同的一条可以在「我的学习 → 高级设置」里标为尚未确认。',
      '“Already learned” is a declaration, not an assessment: the template records what this stage normally covers, and this site has verified nobody’s schooling. The basis is given per entry below; any entry you disagree with can be marked as not yet confirmed under “My learning → Advanced”.',
    ),
    declares: [
      {
        node: 'bg:logic:equality',
        basis: pair(
          '义务教育阶段代数：等式的性质、代入消元与恒等变形。该节点声明的正是「有类型等式的自反与替换规则」，两者范围一致。',
          'Algebra in compulsory education: properties of equality, substitution and identity transformations. The node declares exactly the typed reflexivity and substitution rules of equality — the same scope.',
        ),
      },
      {
        node: 'bg:real:metric',
        basis: pair(
          '初中实数与数轴、绝对值的几何意义。该节点声明实数、序与 d(x,y)=|x−y|，不含完备性与确界定理（那部分本站未形式化，见节点自己的 boundary）。',
          'Real numbers and the number line in junior high, plus the geometric meaning of absolute value. The node declares the reals, their order and d(x,y)=|x−y|; completeness and the supremum theorem are not included (this site does not formalise them — see the node’s own boundary).',
        ),
      },
    ],
  },
  {
    id: 'university-freshman',
    name: pair('大一新生', 'First-year undergraduate'),
    stage: pair('完成高中阶段数学', 'Senior-high mathematics completed'),
    summary: pair(
      '在高一那份之上补两条高中主线：量词与全称/存在陈述、函数与复合与逆。线性代数、拓扑、多元微分、群公理仍按「尚未学过」处理——它们通常在大一之后才修完。',
      'Adds two senior-high strands on top of the Grade 10 set: quantifiers with universal/existential statements, and functions with composition and inverses. Linear algebra, topology, multivariable calculus and the group axioms are still treated as not yet studied — they are normally completed after the first year begins.',
    ),
    note: pair(
      '同「高一」：这是阶段性的常见覆盖，不是测评。若你已经在先修线性代数，可以自己补确认对应的背景接口——模板不替你声明它。',
      'As with “Grade 10”: this is what the stage normally covers, not an assessment. If you have already taken linear algebra as an early course, confirm the corresponding background interface yourself — the template does not declare it for you.',
    ),
    declares: [
      {
        node: 'bg:logic:equality',
        basis: pair(
          '与「高一」同一条依据：义务教育阶段代数已经给出等式的性质与替换。',
          'Same basis as “Grade 10”: compulsory-education algebra already supplies the properties and substitution rules of equality.',
        ),
      },
      {
        node: 'bg:real:metric',
        basis: pair(
          '与「高一」同一条依据：实数、序与距离已经在初中与高中的绝对值一节里用过。',
          'Same basis as “Grade 10”: the reals, their order and distance are already used in junior high and in the absolute-value section of senior high.',
        ),
      },
      {
        node: 'bg:logic:quantifier',
        basis: pair(
          '高中「常用逻辑用语」：全称量词与存在量词、量词的否定。该节点只声明 ∀ / ∃ 作为逻辑常元的**使用片段**，不含完整语法与语义。',
          '“Common logical notation” in senior high: universal and existential quantifiers and their negation. The node declares only the fragment in which ∀ / ∃ are used as logical constants, not a full syntax and semantics.',
        ),
      },
      {
        node: 'bg:set:function',
        basis: pair(
          '高中函数主线：函数概念与性质、复合、指数/对数/三角函数（反函数在部分教材里只作了解）。该节点声明的是函数、复合、单射满射与逆的**最低接口**，不涉及具体定义域。',
          'The senior-high function strand: the notion and properties of a function, composition, exponential/logarithmic/trigonometric functions (inverses are only surveyed in some textbooks). The node declares the minimum interface of functions, composition, injectivity/surjectivity and inverses, without fixing domains.',
        ),
      },
    ],
  },
];

/** 不选模板时的取值：什么都不假设。 */
export const DEFAULT_PROFILE_TEMPLATE_ID = 'blank';

export const PROFILE_TEMPLATE_IDS = PROFILE_TEMPLATES.map((template) => template.id);

/** 按 id 取模板；未知 id 返回 null（调用方决定是报错还是回落默认值）。 */
export function profileTemplate(id) {
  if (typeof id !== 'string') return null;
  return PROFILE_TEMPLATES.find((template) => template.id === id) ?? null;
}

/**
 * 模板的**声明清单**：`[{ node, basis }]`，与模板一一对应。
 * 创建档案时按这个顺序写事件，事件 id 因此是确定的（同一档案重复应用同一模板不会翻倍）。
 */
export function templateDeclarations(id) {
  const template = profileTemplate(id);
  if (!template) return null;
  return template.declares.map((entry) => ({ node: entry.node, basis: entry.basis }));
}

/**
 * 结构检查：返回问题清单（空数组 = 通过）。
 *
 * 检查放在这里而不是散在测试与服务端两处：模板与本体的一致性只有一条判据，
 * 两个调用点（`npm run check` 的 `[9]` 节、`tests/starting-nodes.test.mjs`）读的是同一份实现。
 *
 * `nodesById` 传 `Map<string, node>`（本体装配产物）；不传时只做**自洽性**检查
 * （id 形态、唯一性、文案齐全、空模板存在），不碰本体。
 */
export function validateProfileTemplates(nodesById = null) {
  const problems = [];
  const seen = new Set();
  for (const template of PROFILE_TEMPLATES) {
    if (!TEMPLATE_ID.test(template.id ?? '')) problems.push(`模板 id 不合规：${JSON.stringify(template.id)}`);
    if (seen.has(template.id)) problems.push(`模板 id 重复：${template.id}`);
    seen.add(template.id);
    for (const field of ['name', 'stage', 'summary', 'note']) {
      const value = template[field];
      if (!value || typeof value.zh !== 'string' || typeof value.en !== 'string' || !value.zh.trim() || !value.en.trim()) {
        problems.push(`模板 ${template.id} 的 ${field} 缺少中英成对文案`);
      }
    }
    if (!Array.isArray(template.declares)) { problems.push(`模板 ${template.id} 的 declares 必须是数组`); continue; }
    const declared = new Set();
    for (const entry of template.declares) {
      const node = entry?.node;
      if (typeof node !== 'string' || !node) { problems.push(`模板 ${template.id} 有一条声明缺少 node`); continue; }
      if (declared.has(node)) problems.push(`模板 ${template.id} 重复声明了 ${node}`);
      declared.add(node);
      if (!entry.basis || typeof entry.basis.zh !== 'string' || typeof entry.basis.en !== 'string' || !entry.basis.zh.trim() || !entry.basis.en.trim()) {
        problems.push(`模板 ${template.id} 的 ${node} 缺少中英成对的依据`);
      }
      if (!nodesById) continue;
      const resolved = nodesById.get(node);
      if (!resolved) { problems.push(`模板 ${template.id} 声明的节点不在本体里：${node}`); continue; }
      /*
       * 这条是模板纪律 2 的机器化：模板只许声明背景接口节点。
       * 破了它，「起始节点」就会变成「本站替学习者声称他学过了本站要教的内容」。
       */
      if (resolved.case !== BACKGROUND_CASE) {
        problems.push(`模板 ${template.id} 只能声明背景接口节点，但它声明了案例节点 ${node}（case=${resolved.case}）`);
      }
    }
  }
  if (!profileTemplate(DEFAULT_PROFILE_TEMPLATE_ID)) problems.push(`默认模板 ${DEFAULT_PROFILE_TEMPLATE_ID} 不存在`);
  const fallback = profileTemplate(DEFAULT_PROFILE_TEMPLATE_ID);
  if (fallback && fallback.declares.length > 0) problems.push(`默认模板 ${DEFAULT_PROFILE_TEMPLATE_ID} 必须不声明任何节点`);
  if (!PROFILE_TEMPLATES.some((template) => template.declares.length === 0)) problems.push('至少要有一个不声明任何节点的模板');
  return problems;
}
