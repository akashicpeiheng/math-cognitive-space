/**
 * 范例路径的**学科分组**（纯函数，不含 JSX）。
 *
 * 为什么单独一个模块：这一段的判据要能被 Node 直接 import 来断言
 * （`tests/example-paths.test.mjs`）；组件文件是 `.tsx`，Node 的类型剥离不处理 JSX。
 *
 * ## 分组名：先量，量不到才用声明值
 *
 * 1. **量**：数这套样本**里程碑节点**的 `discipline`（数据来自本体下发的那份清单），
 *    取出现最多的那一支。于是「梁灿彬上册」落在「相对论与宇宙论」（31 条里程碑）而不是
 *    望文生义的「微分几何」。
 * 2. **兜底**：本体比样本旧、或那一帧还没到齐时，一个里程碑都解析不到——
 *    这时用 `ExampleSet.discipline`（写在该书数据里的声明主学科），
 *    而不是回落到「其他」。2026-10-13 修：用户截图里《简明高等代数》被归到了「其他」，
 *    书单来自数据文件、分组名却只在 `nodes` 里查得到，两边不同步时就会出现那个结果。
 */

import type { ExampleSet } from './example-paths';

/**
 * 学科次序：由**调用方注入**（组件传 `case-catalog.ts` 的 `SECTION_ORDER` 排出来的名次），
 * 这个模块本身不 import 它——`.tsx`/打包器之外的 Node 解析不了无扩展名的相对 import，
 * 而这一段判据要能被 `tests/example-paths.test.mjs` 直接 import。
 */
export type DisciplineRank = (id: string) => number;

const noRank: DisciplineRank = () => 0;

export interface SetDiscipline {
  /** 本体里查得到的里程碑学科分布（按数量降序）；一个都查不到时是空数组。 */
  tally: Array<[string, number]>;
  /** 本体里解析到的里程碑数；0 表示这一份本体还没有这套样本的节点。 */
  resolved: number;
}

/** 一套样本的学科分布（量的那一步）。查不到的节点**不计入**，不用「其他」凑数。 */
export function disciplineOfSet(
  set: ExampleSet,
  disciplineById: Map<string, string>,
  rank: DisciplineRank = noRank,
): SetDiscipline {
  const counts = new Map<string, number>();
  let resolved = 0;
  for (const id of new Set(set.paths.flatMap((path) => path.goals))) {
    const discipline = disciplineById.get(id);
    if (!discipline) continue;
    resolved += 1;
    counts.set(discipline, (counts.get(discipline) ?? 0) + 1);
  }
  const tally = [...counts].sort((a, b) => b[1] - a[1] || rank(a[0]) - rank(b[0]));
  return { tally, resolved };
}

export interface DisciplineGroup {
  /** 锚点 id（拉丁字母，避免把中文写进锚点）。 */
  id: string;
  /** 分组名（学科 id；显示名由组件按语种取）。 */
  discipline: string;
  sets: ExampleSet[];
  /** 组内里程碑的学科分布，按数量降序；本体没覆盖到时是空数组。 */
  tally: Array<[string, number]>;
  /** 组名是不是「量出来的」；false = 用了声明主学科兜底（界面据此不显示分布行）。 */
  measured: boolean;
  routes: number;
  milestones: number;
}

/**
 * 按学科分组：每组的主学科 = 该组样本里程碑节点里出现最多的那一支；
 * 统计拿不到东西时用该书的声明主学科（`ExampleSet.discipline`），仍拿不到才叫「其他」。
 *
 * `rank` 只决定**组的先后**（组件传案例页那份学科次序；测试不传就按名字排），
 * 不影响任何一组叫什么名字。
 */
export function groupByDiscipline(
  sets: ExampleSet[],
  disciplineById: Map<string, string>,
  rank: DisciplineRank = noRank,
): DisciplineGroup[] {
  const infos = new Map(sets.map((set) => [set.id, disciplineOfSet(set, disciplineById, rank)]));
  const buckets = new Map<string, ExampleSet[]>();
  const measuredOf = new Map<string, boolean>();
  for (const set of sets) {
    const info = infos.get(set.id);
    const measured = (info?.tally[0]?.[0]) ?? null;
    const discipline = measured ?? set.discipline ?? '其他';
    buckets.set(discipline, [...(buckets.get(discipline) ?? []), set]);
    /* 一组里只要有一套是真量出来的，这一组的分布行就值得显示。 */
    measuredOf.set(discipline, (measuredOf.get(discipline) ?? false) || Boolean(measured));
  }

  return [...buckets]
    .sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0], 'zh'))
    .map(([discipline, list], index) => {
      const merged = new Map<string, number>();
      for (const set of list) {
        for (const [name, count] of infos.get(set.id)?.tally ?? []) merged.set(name, (merged.get(name) ?? 0) + count);
      }
      return {
        id: `example-discipline-${index + 1}`,
        discipline,
        sets: list,
        tally: [...merged].sort((a, b) => b[1] - a[1] || rank(a[0]) - rank(b[0])),
        measured: measuredOf.get(discipline) ?? false,
        routes: list.reduce((sum, set) => sum + set.paths.length, 0),
        milestones: list.reduce(
          (sum, set) => sum + set.paths.reduce((count, path) => count + path.goals.length, 0),
          0,
        ),
      };
    });
}
