/**
 * 建出**默认学习者档案**：`高一` 与 `大一新生`（2026-10 加）。
 *
 *     node scripts/seed-default-profiles.mjs
 *
 * ## 为什么要有这个脚本
 *
 * 档案模板（`data/profile-templates.mjs`）本身只是「建档案时可以选什么」；
 * 用户要的是一打开站点就能在「学习者档案」下拉里看到**这两份档案**，
 * 而不是先自己建一份、再在表单里挑模板。这个脚本把模板落实成档案：
 * 每份档案写一串 `confirmation` 事件（`source.ref = profile-template:<id>`、
 * `payload.declared = true`），于是这份档案的 θ.known 一开始就不是空的。
 *
 * ## 幂等
 *
 * **同名档案已存在就跳过**（不覆盖、不追加），因此重复运行是安全的：
 * 用户自己改过、标过「尚未确认」、甚至删掉模板事件，都不会被这个脚本盖回去。
 * 想重建，先在「我的学习 → 高级设置」里删掉同名档案再跑一次。
 *
 * ## 只写 E
 *
 * 不碰公共本体 M，也不改 `contentHash`。默认档案是 `kind: personal`
 * （不是 `demo`：它们给真实学习者用，与 `seed-demo.mjs` 的演示档案不是一回事）。
 */
import { loadConfig } from '../server/config.mjs';
import { loadOntology } from '../core/ontology.mjs';
import { createLearnerStore } from '../server/db.mjs';
import { seedDefaultProfiles, DEFAULT_TEMPLATE_SEEDS } from '../server/profile-templates.mjs';

const config = loadConfig();
const ontology = await loadOntology({ dataDir: config.dataDir });
const db = await createLearnerStore({ config });

try {
  const seeds = await seedDefaultProfiles({ db, ontology, templateIds: DEFAULT_TEMPLATE_SEEDS });
  console.log(JSON.stringify({
    ontology: ontology.version,
    note: '默认学习者档案：模板只声明背景接口节点（source=system、payload.declared=true）；同名档案已存在时跳过，不覆盖用户自己的改动。',
    seeds: seeds.map((seed) => ({
      template: seed.templateId,
      name: seed.name,
      profileId: seed.profileId,
      created: seed.created,
      declared: seed.declared.length,
      failed: seed.failed,
      ...(seed.reason ? { reason: seed.reason } : {}),
    })),
    profiles: (await db.listProfiles()).map((profile) => ({ id: profile.id, name: profile.name, kind: profile.kind })),
  }, null, 2));
} finally {
  await db.close();
}
