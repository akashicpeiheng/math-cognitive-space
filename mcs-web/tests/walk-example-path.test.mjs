import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { startTestServer } from './helpers.mjs';
import { EXAMPLE_SETS, JIANG_BASE_ENTRIES, AXLER_BASE_ENTRIES } from '../web/src/example-paths.ts';

/**
 * 从零走一遍范例路径（2026-10-13；2026-10-14 扩到第二套）。
 *
 * `scripts/walk-example-path.mjs` 是给人用的走通工具（`npm run walk:examples`），
 * 这一条把它钉成**回归网**：只要「各程都能在声明的事件界内被规划器判定为 Found」
 * 或「起点累进规则」坏了，这里就会红——它走的是**真 HTTP 接口**，不是直接调内核函数。
 *
 * 两个刻意的选择：
 * - 走**档案模式**（脚本的默认路径）：`startTestServer()` 的数据库是临时目录里的
 *   `test.sqlite3`，脚本在这里建的那份「从零走一遍」档案与**本机开发库完全隔离**，
 *   因此可以真跑「确认写进 E 层 → 下一程的背景由服务端从档案派生」这条主线。
 * - 目标文档写到临时目录，跑完删掉，不往仓库里丢产物。
 *
 * 覆盖两套样本，而不是只走默认那套（2026-10-14）：
 * `jiang-jdga` 是「七程、每程事件数 = 里程碑数」，`axler-ladr` 是**九程**——
 * 脚本里原先写死 5/6/7 的那几处（探针档位、结论句、文档小标题）只有走第二套才会露出来。
 * 期望值全部从 `EXAMPLE_SETS` 现场算，不写死 47/49/前五程。
 */

/** 与 `scripts/walk-example-path.mjs` 的 `PROBE_HORIZON` 同一个上限（`shared/contracts.mjs`）。 */
const HORIZON_LIMIT = 32;

const WALK_SETS = [
  { id: 'jiang-jdga', base: JIANG_BASE_ENTRIES, profileName: '测试：从零走一遍', label: '《简明高等代数》七程' },
  { id: 'axler-ladr', base: AXLER_BASE_ENTRIES, profileName: '测试：从零走一遍（Axler）', label: 'Axler 九程' },
];

for (const { id, base, profileName, label } of WALK_SETS) {
  test(`从零走一遍（${label}）：各程都在事件界内走通，并生成走通记录`, async () => {
    const set = EXAMPLE_SETS.find((item) => item.id === id);
    assert.ok(set, `范例集 ${id} 必须存在`);

    const stageCount = set.paths.length;
    const goalsPerStage = set.paths.map((path) => path.goals.length);
    const cumulative = goalsPerStage.reduce((acc, count) => [...acc, (acc.at(-1) ?? 0) + count], []);
    const milestones = cumulative.at(-1);
    const events = set.paths.reduce((sum, path) => sum + path.events, 0);
    /*
     * 探针三档（与脚本同一条算法）：一次能走完的最后一程 / 第一次走不完的那一程 / 全部 N 程。
     * `Found` 还是 `InfeasibleWithinBound` 由「这一档的目标数有没有超过 horizon 上限」判——
     * 这条判据是**从数据算的**，不是抄一份当年跑出来的表。
     */
    const passingStages = cumulative.filter((total) => total <= HORIZON_LIMIT).length;
    const probeStages = [...new Set([
      Math.max(passingStages, 1),
      Math.min(passingStages + 1, stageCount),
      stageCount,
    ])];

    const server = await startTestServer();
    const dir = mkdtempSync(join(tmpdir(), 'mcs-walk-'));
    const out = join(dir, 'walk.md');
    try {
      const exitCode = await new Promise((resolvePromise, rejectPromise) => {
        const child = spawn(
          process.execPath,
          [
            resolve('scripts/walk-example-path.mjs'),
            '--base', server.origin,
            '--set', id,
            '--profile-name', profileName,
            '--out', out,
          ],
          { stdio: 'inherit' },
        );
        child.on('exit', (code) => resolvePromise(code));
        child.on('error', rejectPromise);
      });
      assert.equal(exitCode, 0, '走通脚本应当成功退出：任何一程不 Found、或有待决入口、或事件数与范例声明不符，都会让它非零退出');

      const doc = readFileSync(out, 'utf8');
      assert.match(doc, new RegExp(`档案：\\*\\*${profileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\*\\*`), '走通记录应当写明用的是哪份档案');
      for (const path of set.paths) {
        assert.ok(doc.includes(path.ordinal), `走通记录里缺少 ${path.ordinal}`);
        assert.ok(doc.includes(path.title), `走通记录里缺少这一程的标题：${path.title}`);
        assert.ok(doc.includes(`**${path.events} 个事件**`), `${path.title} 的实测事件数没有写进记录`);
      }
      // 合计：里程碑 / 事件 / 已确认节点（= 起点背景 + 全部里程碑）。
      assert.ok(
        doc.includes(`| **合计** | **${milestones}** | — | **${events}** | **${base.length + milestones}** |`),
        `合计行应当是 ${milestones} 个里程碑 / ${events} 个事件 / ${base.length + milestones} 个已确认节点`,
      );
      // 起点累进：每程的起手确认数是「基础背景 + 前几程里程碑」。
      let running = base.length;
      for (const [index, count] of goalsPerStage.entries()) {
        assert.ok(doc.includes(`起手时档案里已确认 **${running}** 个节点`), `走通记录里缺少「起手 ${running} 个已确认节点」这一步（${set.paths[index].ordinal}）`);
        running += count;
      }
      // 「一条路线走不完」的实测表：三档的标签、目标数、需要的事件与状态逐项核对。
      for (const stages of probeStages) {
        const probeLabel = stages === stageCount ? `全部${['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][stages]}程` : `前${['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][stages]}程`;
        const goalCount = cumulative[stages - 1];
        const expected = goalCount > HORIZON_LIMIT ? 'InfeasibleWithinBound' : 'Found';
        assert.match(
          doc,
          new RegExp(`${probeLabel} \\| ${goalCount} \\| ${goalCount} \\| \`${expected}\``),
          `h=${HORIZON_LIMIT} 的${probeLabel}实测应当是 ${expected}（${goalCount} 个目标）`,
        );
      }
      // 结论句按实测算，且不能再写死「七程」之外的档位。
      assert.ok(doc.includes(`一次最多走完前${['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][passingStages]}程`), '结论句应当报出实测算出的一次能走完的程数');
      assert.ok(doc.includes(`切成${['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][stageCount]}程`), '结论句应当报出这套样本的实际程数');
      // 学习方案视角（第二个口径）：从零 Conditional，走完报「主目标已达成」。
      assert.match(doc, /状态：`Conditional`/, '从零的学习方案应当报 Conditional');
      assert.match(doc, /主目标已达成 = \*\*是\*\*/, '走完之后同一份学习方案偏好应当报「主目标已达成」');
    } finally {
      rmSync(dir, { recursive: true, force: true });
      await server.cleanup();
    }
  });
}
