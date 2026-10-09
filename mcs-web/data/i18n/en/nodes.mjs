/**
 * 节点译文的汇总入口：把按案例拆分的覆盖文件拼成一份 id → 译文 的映射。
 *
 * 为什么按案例拆文件而不是一个大 `en/nodes.mjs`：一来一个文件里放 232 个节点的译文
 * 没有人能读完，二来按案例改动的冲突面最小。聚合只做一件有意义的检查——
 * **同一个 id 在两个案例文件里同时出现**是错误（后一个会静默覆盖前一个），当场抛错。
 */

import limit from './limit.mjs';
import rudin from './rudin.mjs';
import dg from './dg.mjs';
import liang from './liang.mjs';
import manifold from './manifold.mjs';
import tensor from './tensor.mjs';
import group from './group.mjs';
import background from './background.mjs';

const MODULES = {
  limit,
  rudin,
  dg,
  liang,
  manifold,
  tensor,
  group,
  background,
};

const nodes = {};
const representations = {};

for (const [caseId, module] of Object.entries(MODULES)) {
  const overlay = module?.default ?? module;
  for (const [id, entry] of Object.entries(overlay.nodes ?? {})) {
    if (nodes[id]) throw new Error(`节点译文重复登记：${id}（案例 ${caseId}）`);
    nodes[id] = entry;
  }
  for (const [id, entry] of Object.entries(overlay.representations ?? {})) {
    if (representations[id]) throw new Error(`表征译文重复登记：${id}（案例 ${caseId}）`);
    representations[id] = entry;
  }
}

export default { nodes, representations };
export { MODULES };
