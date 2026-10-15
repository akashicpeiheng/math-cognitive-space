/** Display explanations drawn from the original scope and witnesses; no new proofs. */
const explanation = (summary, changes = []) => ({ summary, changes });
const change = (condition, special, general) => ({ condition, special, general });
const regularity = explanation('放宽正则性：所有阶 → 有限 k 阶（同一图册）', [change('过渡映射的正则性', 'C^∞：所有阶导数存在且连续', 'C^k：只要求至有限 k 阶')]);
const tensor = explanation('表征对应：多重线性函数 ↔ 张量空间；不是删去条件');
const units = explanation('放开具体实例：模 5 单位群 → 抽象群', [change('底集与运算的指定', '模 5 非零剩余类及其乘法', '任意满足群公理的底集与运算')]);

export const SCALING_EXPLANATIONS = {
  'rel-limit-generalization': explanation('放宽函数值匹配：L = f(a) → 极限值 L 不必等于 f(a)', [change('极限值与点值的匹配', '在 a 连续，L = f(a)', '只考察去心邻域中的极限 L')]),
  'rel-manifold-generalization': regularity,
  'rel-manifold-specialization': regularity,
  'rel-tensor-generalization': tensor,
  'rel-tensor-specialization': tensor,
  'rel-group-generalization': explanation('放开具体实例：置换群 → 抽象群', [change('元素与运算的指定', '置换及其复合', '任意满足群公理的元素与运算')]),
  'rel-group-generalization-geom': explanation('放开具体实例：三角形刚性对称 → 抽象群', [change('元素与运算的指定', '等边三角形的刚性对称及复合', '任意满足群公理的元素与运算')]),
  'rel-group-generalization-mod': units,
  'rel-group-specialization': units,
  'rel-dg-smooth-manifold-generalization': explanation('遗忘光滑结构：带光滑图册 → 只保留拓扑流形', [change('附加的光滑图册', '拓扑流形配备光滑结构', '只保留底层拓扑流形')]),
  'rel-liang-metric-specialization': explanation('放宽张量类型、对称性与非退化性：度规 → 张量场', [change('张量类型', '固定 (0,2) 型', '任意 (r,s) 型'), change('对称性', '对称', '不要求对称'), change('非退化性', '非退化', '允许退化')]),
  'rel-liang-schwarzschild-specialization': explanation('放宽求解限制：真空、静态、球对称 → 一般场方程', [change('物质与对称性限制', '真空、静态、球对称的解', '不预先施加这三项限制的场方程')]),
  'rel-liang-rw-specialization': explanation('放宽宇宙学对称性：均匀、各向同性 → 一般场方程', [change('空间对称性', '均匀且各向同性', '不预先要求均匀或各向同性')]),
  'rel-rudin-lub-specialization': explanation('去掉最小上界性：实数域 → 有序域', [change('最小上界性', '非空有上界集合有最小上界', '只要求有序域公理')]),
};

export function attachScalingExplanations(relations) {
  return relations.map(relation => SCALING_EXPLANATIONS[relation.id]
    ? { ...relation, scalingExplanation: SCALING_EXPLANATIONS[relation.id] } : relation);
}
