/**
 * 档案模板的**服务端落地**：把模板声明的背景节点写成一串 confirmation 事件（E 层）。
 *
 * ## 为什么单独一个模块
 *
 * 这条逻辑有两个调用点：建档案的接口（`POST /api/v2/profiles`）与建**默认档案**的脚本
 * （`scripts/seed-default-profiles.mjs`）。两处各写一遍事件形状，迟早会漂成
 * 「接口写的带 `basis`、脚本写的不带」——而事件是这套东西唯一的审计依据
 * （`source.ref` 追模板、`payload.declared` 区分「模板代写」与「他自己确认」）。
 * 因此事件怎么造、怎么去重、失败怎么回报，只在这里写一次。
 *
 * ## 两条纪律
 *
 * 1. **只写 E**：不碰本体、不改 `contentHash`；模板声明的是背景接口节点，
 *    由 `data/profile-templates.mjs` 的 `validateProfileTemplates()` 保证（`npm run check` 的 `[9]` 节）。
 * 2. **部分失败如实回报**：逐条写入，失败的那几条进 `failed` 并带原因，已写入的照常保留；
 *    不假装「要么全成要么全不成」——本机 SQLite 下这本来就是多次 append。
 */

import { normalizeEvent } from '../shared/contracts.mjs';
import { isMcsError } from '../shared/errors.mjs';
import {
  DEFAULT_PROFILE_TEMPLATE_ID, profileTemplate, templateDeclarations,
} from '../data/profile-templates.mjs';

/**
 * 默认要建出来的那两份档案（「建立一份默认的学习者档案模版，包括大一新生和`高一`」）。
 *
 * 顺序即下拉里的顺序：先「高一」（起点更低），再「大一新生」。
 * `blank` **不在**这里：它的意思是「什么都不假设」，建一份出来没有意义——
 * 用户想要空白档案时，建档案时选「空白档案（自己声明）」即可。
 */
export const DEFAULT_TEMPLATE_SEEDS = ['high-school-1', 'university-freshman'];

/** 一条模板声明对应的事件（形状固定，便于事后审计）。 */
export function templateDeclarationEvent({ profileId, templateId, entry, ontologyVersion, occurredAt }) {
  return normalizeEvent({
    // 事件 id 是确定的：同一份档案重复应用同一模板不会翻倍（`appendEvent` 按 eventId 去重）。
    eventId: `template:${profileId}:${entry.node}`,
    kind: 'confirmation',
    nodeId: entry.node,
    occurredAt: occurredAt ?? new Date().toISOString(),
    source: { kind: 'system', ref: `profile-template:${templateId}` },
    payload: {
      confirmed: true,
      declared: true,
      template: templateId,
      // 依据原文进 payload：事后审计「这条确认是哪来的」不必回来读代码。
      basis: entry.basis.zh,
    },
  }, { profileId, ontologyVersion });
}

/**
 * 把某个模板应用到一份**已存在**的档案上。
 *
 * 返回 `{ templateId, declared, failed }`：`declared` 逐条带上节点 id、标题与中英依据，
 * 调用方据此写回执（界面上的「写入 N 条背景声明」就是它）。
 */
export async function applyProfileTemplate({ db, ontology, profileId, templateId, occurredAt = null }) {
  const template = profileTemplate(templateId);
  if (!template) return { templateId, declared: [], failed: [{ node: '', reason: `未知的档案模板：${templateId}` }] };
  const declared = [];
  const failed = [];
  for (const entry of templateDeclarations(templateId)) {
    const event = templateDeclarationEvent({ profileId, templateId, entry, ontologyVersion: ontology.version, occurredAt });
    try {
      // 悬空事件宁可拒绝也不写：模板与本体的一致性已由 doctor 的 [9] 节核对过，这里是第二道门。
      if (!ontology.maybeNode(event.nodeId) && !ontology.boundaryRefs?.has?.(event.nodeId)) {
        throw new Error(`模板声明的节点不在本体里：${event.nodeId}`);
      }
      await db.appendEvent(profileId, event);
      declared.push({
        node: event.nodeId,
        title: ontology.maybeNode(event.nodeId)?.title ?? event.nodeId,
        basis: entry.basis,
      });
    } catch (error) {
      failed.push({ node: entry.node, reason: isMcsError(error) ? error.message : String(error?.message ?? error) });
    }
  }
  return { templateId, declared, failed };
}

/**
 * 建出**默认学习者档案**（幂等）。
 *
 * 判据是**同名档案已存在就跳过**——不按「有没有模板事件」判：
 * 用户完全可能自己建过一份叫「高一」的档案（用了别的模板，或干脆自己一条条确认），
 * 那种情况下再塞一份同名的进去，只会让下拉里出现两个「高一」而没人说得清差别。
 *
 * 返回逐条回执：`{ templateId, name, profileId, created, declared, failed, reason? }`。
 */
export async function seedDefaultProfiles({ db, ontology, templateIds = DEFAULT_TEMPLATE_SEEDS, occurredAt = null }) {
  const existing = new Set((await db.listProfiles({ includeArchived: true })).map((profile) => profile.name));
  const out = [];
  for (const templateId of templateIds) {
    const template = profileTemplate(templateId);
    if (!template) { out.push({ templateId, name: templateId, profileId: null, created: false, declared: [], failed: [], reason: '未知的档案模板' }); continue; }
    const name = template.name.zh;
    if (existing.has(name)) {
      out.push({ templateId, name, profileId: null, created: false, declared: [], failed: [], reason: '同名档案已存在，跳过（不覆盖、不追加）' });
      continue;
    }
    const profile = await db.createProfile({ name, modelVersion: 'mcs-manual-model/1' });
    const applied = await applyProfileTemplate({ db, ontology, profileId: profile.id, templateId, occurredAt });
    existing.add(name);
    out.push({ templateId, name, profileId: profile.id, created: true, declared: applied.declared, failed: applied.failed });
  }
  return out;
}
