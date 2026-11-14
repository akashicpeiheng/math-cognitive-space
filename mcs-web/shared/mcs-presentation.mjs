/** Display preferences only. Membership is always read from the formal Markdown. */
export const MCS_TOPICS = [
  ['local-change', '局部变化', 'Local change', '一阶近似，以及从中提取的方向、梯度、散度与旋度信息。', 'First-order approximation and its directional, gradient, divergence and curl information.', 'calculus', ['derivative','partial','directional','frechet','jacobian','gradient','divergence','curl','direction-frechet']],
  ['spaces-continuity', '拓扑结构与连续性', 'Spaces and continuity', '用开集描述空间，观察连续映射与连通性。', 'Open sets, continuous maps and connectedness.', 'topology', ['topology','continuous','homeomorphism','connected','continuous-connected']],
  ['separation-countability', '分离与可数性', 'Separation and countability', '空间能否分开点，以及是否有可数的描述。', 'Separating points and describing spaces countably.', 'topology', ['c1','c2','t1','t2','t3','t4','second-first','four-three','three-two','two-one']],
  ['compactness', '紧性与覆盖', 'Compactness and covers', '从覆盖中抽取有限或局部有限的信息。', 'Finite and locally finite information from covers.', 'topology', ['compact','paracompact','sigma-compact','compact-para','compact-sigma','compact-hausdorff-normal','para-hausdorff-normal']],
  ['coordinates-manifolds', '坐标与流形', 'Coordinates and manifolds', '图卡如何拼成图册，并给空间装上光滑结构。', 'Charts, atlases and smooth structures.', 'geometry', ['chart','atlas','smooth-atlas','local-euclidean','top-manifold','smooth-manifold','manifold-countability']],
  ['duality-tensors', '切空间与张量', 'Tangent spaces and tensors', '在一点描述方向、线性读数与多线性结构。', 'Directions, linear measurements and multilinear structures at a point.', 'geometry', ['tangent','cotangent','tangent-dual','tensor','tensor-field','metric']],
  ['exterior-calculus', '微分形式与外微分', 'Forms and exterior calculus', '用微分形式统一组织微分操作及其恒等式。', 'Differential operations and identities through forms.', 'geometry', ['forms','exterior','hodge','insertion','d-squared','curl-grad','div-curl','formal-adjoint','vector-realization']],
  ['fields-flows', '向量场与流', 'Vector fields and flows', '沿向量场运动，比较流与 Lie 导数。', 'Motion along vector fields, flows and Lie derivatives.', 'geometry', ['vector-field','flow','lie','lie-scalar','cartan']],
].map(([key, zh, en, summaryZh, summaryEn, domain, primary]) => ({
  id: `obj:tdg:topic-${key}`, key, title: { zh, en }, summary: { zh: summaryZh, en: summaryEn },
  domain: `obj:tdg:subdiscipline-${domain}`, primary: primary.map(id => `obj:tdg:${id}`),
}));
export const MCS_DOMAINS = [
  ['calculus', '微分学', 'Differential calculus'], ['topology', '点集拓扑', 'Point-set topology'], ['geometry', '微分几何', 'Differential geometry'],
].map(([key, zh, en]) => ({ id: `obj:tdg:subdiscipline-${key}`, title: { zh, en } }));

export function mcsPresentation(objects) {
  const available = new Map(objects.map(o => [o.id, o]));
  const primaryParents = {}, order = [], summaries = {}, titles = {};
  for (const domain of MCS_DOMAINS) { order.push(domain.id); titles[domain.id] = domain.title; }
  order.push('obj:group:subdiscipline');
  for (const topic of MCS_TOPICS) {
    if (!available.has(topic.id)) continue;
    primaryParents[topic.id] = topic.domain;
    order.push(topic.id, ...topic.primary); titles[topic.id] = topic.title; summaries[topic.id] = topic.summary;
    for (const id of topic.primary) {
      if (!available.get(topic.id).members.some(ref => ref.id === id)) throw new Error(`Missing presentation membership: ${topic.id} / ${id}`);
      primaryParents[id] = topic.id;
    }
  }
  titles['obj:group:subdiscipline'] = { zh: '群论', en: 'Group theory' };
  titles['obj:group:topic'] = { zh: '代数结构的映射表示', en: 'Mapping representations of algebraic structures' };
  summaries['obj:group:topic'] = { zh: '右单位结构中的左乘与单射性：当前有限片段。', en: 'Left multiplication and injectivity in a right-unit structure: a finite fragment.' };
  order.push('obj:group:topic');
  return { version: 'mcs-presentation/2', primaryParents, order, summaries, titles, aliases: { 'obj:tdg:chart': ['图卡', 'chart'], 'obj:tdg:jacobian': ['Jacobi矩阵', '雅可比矩阵', 'Jacobian'] } };
}
