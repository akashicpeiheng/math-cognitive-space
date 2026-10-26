# 梯度候选片段（M × L）

状态：**候选，不在活动本体库内**，按 2026-10-19 18:15 重新生成的分离版 `mcs-learning-node-template@2026-10-19.1` 与 `mcs-formal-object-template@2026-10-19.1` 组织。`mcs-content/README.md` 的活动库只读取 `objects/` 与 `nodes/`；本目录位于 `candidates/gradient/`，不会被 `readContentSources` 收进活动库。活动库仍为 8 个对象、3 篇节点（已验证，见下文）。

本目录演示“按最新理论生成一个数学对象的内容”会得到什么：先把梯度拆成形式对象（M），再按学习目标组织阅读节点（L），最后把视图与路线留给派生层（D）。它不修改既有试点、网站索引或 Obsidian 库。

## 〇、模板对齐（2026-10-19.1）

- 节点按 `mcs-learning-node-template@2026-10-19.1` 组织：每篇含“对象与任务、背景与约定、精确内容、依据与边界”四项核心义务，核心章节带 `<!-- mcs-section:... -->` 标记；直觉、例子、证明、回看等按需保留。
- 形式对象按 `mcs-formal-object-template@2026-10-19.1` 组织：正文固定为 `## 注释`、`## 依据与边界`、`## 参考`；形式负载仍是唯一权威，正文只作说明。
- 两类模板已分源生成：`shared/formal-template.mjs` 独立于 `shared/writing-template.mjs`；本目录按分源后的生成件重新核对。JSON 顶层键顺序也与范本一致（节点 `id` 在 `version` 前，形式对象 `imports` 在 `members` 前）。
- `context.constants.background` 只陈述已经登记的内容：`inner` 的内积公理、`deriv` 的解析定义与线性性均不在 M 内，避免把标准模型假设写成形式假设。
- 形式对象正文只保留注释与证据边界；表征命题、充要命题的证明细节放在 L `learn:grad:proof`，不把证明讲解塞回 M。
- 形式背景文字参与 `formalHash`，已用 `check.mjs --seal` 更新全部引用；节点正文变化只影响 `nodeHash` 与 `learningVersion`。
- 正文公式统一为 `$...$` 与 `$$...$$`，与站点 KaTeX 及 Obsidian 的渲染约定一致；站点同款 `remark-math` 将本目录解析为 26 个 display、183 个 inline 数学节点（解析成功不判定公式的数学正确性）。

## 一、依据：最新理论怎样刻画数学对象

| 层 | 本片段中的体现 |
| --- | --- |
| M：数学本体 | `objects/` 的 8 个文件：3 个原子、2 个分子命题、1 个分子定义、1 个单元、1 个话题 |
| L：公共阅读 | `nodes/` 的 5 篇节点：目标、对象引用、显式先修、正文 |
| E：个人状态 | 不出现。节点不写掌握、偏好、历史或“对某人更容易” |
| D：派生结果 | 只给公开先修偏序与两条候选路线；不落库，不写个人诊断 |

形式侧遵守的约束：

- 每个对象恰有一个 `mcs-object` JSON 块；形式内容是有类型高阶逻辑项，经过共享内核的类型检查。
- 对象身份由 `id` 与 `version` 固定；引用带 `anchor` 与 `formalHash`；引用摘要不匹配即拒绝读取。
- 尺度按构造数与成员类型判断，不按难度或篇幅：原子是构造数为 0 的单个声明，分子是构造数大于 0 的单个声明，单元成员只能是原子/分子，话题成员只能是单元。
- 定义、命题、假设、证据标签分开：`status: PROOF` 只表示有纸笔论证，不表示已运行内核或 Lean。
- 学习节点没有数学尺度；它不复制对象身份，只通过 `objects` 引用准确版本与锚点；先修只指向准确版本的阅读节点。

## 二、为什么梯度不是一个“节点”

按这套刻画，至少要把四件事分开：

1. **签名与参数**：`E`、内积 `inner`、导数泛函 `deriv`、Riesz 表示选取 `rep`。它们是有类型常元；`E` 没有被构造成 $\mathbb R^n$，内积公理也没有被内置。
2. **定义**：$\operatorname{grad}:=\lambda f.\lambda x.\operatorname{rep}(\operatorname{deriv} f\,x)$。这是透明项，只要求 `rep` 与 `deriv` 已有类型。
3. **假设**：表征假设（内积读数等于方向导数）与分离假设（内积读数处处相同则向量相等）。它们分别承担存在性与唯一性；Riesz 定理没有被伪装成定义。
4. **命题**：表征命题与充要命题。它们相对两条假设可证；Riesz 定理本身不在片段内。

坐标公式、最速上升、链式法则与约束优化**没有**进入 M。原因是：当前语法没有坐标、有限和、序与范数、切空间；硬塞一个未解释的 `sum` 或 `norm` 常元只会得到空壳。它们放在 L 中，按标准微分学陈述，并显式标注哪些是 M 的 PROOF、哪些是标准模型中的结果、哪些只是 ILLUSTRATION。

## 三、M：8 个形式对象

| 文件 | id | 尺度 | 角色 | 声明锚点 | 证据状态 |
| --- | --- | --- | --- | --- | --- |
| `objects/inner.md` | `obj:grad:inner` | 原子 | 内积参数 | `symbol` | DEF |
| `objects/deriv.md` | `obj:grad:deriv` | 原子 | 导数泛函参数 | `symbol` | DEF |
| `objects/rep.md` | `obj:grad:rep` | 原子 | Riesz 表示选取参数 | `symbol` | DEF |
| `objects/definition.md` | `obj:grad:definition` | 分子 | 梯度定义（透明项） | `definition` | DEF |
| `objects/characterization.md` | `obj:grad:characterization` | 分子 | 表征命题 | `claim` | PROOF（相对假设） |
| `objects/representation-iff.md` | `obj:grad:representation-iff` | 分子 | 充要命题 | `claim` | PROOF（相对假设） |
| `objects/unit.md` | `obj:grad:unit` | 单元 | 成员、导出与两条假设 | `$` | DEF + 接口 |
| `objects/topic.md` | `obj:grad:topic` | 话题 | 单成员有限组织 | `$` | DEF |

关键形式（规范写法，箭头右结合）：

```text
inner : E -> E -> R
deriv : (E -> R) -> E -> (E -> R)
rep   : (E -> R) -> E

grad  := lam f:(E -> R). lam x:E. rep (deriv f x)

(R)  forall f:(E -> R) x:E v:E. deriv f x v = inner (rep (deriv f x)) v
(S)  forall g:E h:E. (forall v:E. inner g v = inner h v) -> g = h

表征  forall f x v. deriv f x v = inner (grad f x) v
充要  forall f x g. grad f x = g <=> (forall v. deriv f x v = inner g v)
```

`grad` 在命题对象里作为透明定义展开；`obj:grad:definition` 另外把同一个项登记为可引用的 `definition` 声明，供单元导出。单元导出 `inner`、`deriv`、`rep`、`grad`、`characterization`、`representationIff`；没有导入与接口关系，`links` 为空，`lean` 为空。

## 四、L：5 篇阅读节点

| 文件 | id | 目标（摘要） | 引用对象 | 先修 |
| --- | --- | --- | --- | --- |
| `nodes/why.md` | `learn:grad:why` | 说明梯度要解决的问题；区分方向导数与表示向量 | definition、characterization | 无 |
| `nodes/definition.md` | `learn:grad:definition` | 读出定义中的参数；说明 Riesz 为何是假设 | definition、characterization、inner、deriv、rep、unit | why |
| `nodes/compute.md` | `learn:grad:compute` | 标准内积下写成偏导数向量；两个例子；不可微反例 | definition、characterization、representation-iff、unit | definition |
| `nodes/geometry.md` | `learn:grad:geometry` | 等值线法向、最速上升、度量依赖、约束边界 | definition、characterization、representation-iff、unit | definition |
| `nodes/proof.md` | `learn:grad:proof` | 重建充要命题证明；区分 PROOF 与 Riesz 假设 | characterization、representation-iff、unit | definition |

每篇正文都含四项核心：对象与任务、背景与约定、精确内容、依据与边界；按需加入直觉、例子、证明、误区、回看与参考文献。节点正文中的数学断言带 `DEF / PROOF / REF / FINITE / ILLUSTRATION / NOT-CLAIMED` 标签或明确的“未证明”说明。

## 五、D：公开先修偏序与两条候选路线

公开先修形成下面的偏序（不是个人学习记录）：

```text
why → definition → compute
                 ↘ geometry
                 ↘ proof
```

两条都合法的阅读路线：

1. 计算优先：`why → definition → compute → geometry → proof`
2. 几何优先：`why → definition → geometry → compute → proof`

`compute` 与 `geometry` 互不为先修，`proof` 只依赖 `definition`；因此两条路线都不违反显式先修。个人难度、掌握、耗时与推荐顺序属于 E 与 D，不在本目录中写死。

## 六、验证

```powershell
cd E:\MCS
node mcs-content\candidates\gradient\check.mjs
# 修改形式内容或引用后，显式重新封摘要：
node mcs-content\candidates\gradient\check.mjs --seal
```

`check.mjs` 只编译本目录，输出对象数、节点数、`objectVersion`、`learningVersion`。它另外检查三处共享编译器不跨对象比较的约束：命题对象里的 `grad` 透明定义必须与 `obj:grad:definition` 的 `definition` 声明同源；形式对象正文必须恰为模板的三节；节点必须含四个核心章节及对应 `mcs-section` 标记，且 H1 与 JSON `title`、顶层键顺序与范本一致。模板版本和期望形状直接从 `shared/writing-template.mjs` 与 `shared/formal-template.mjs` 读取，不写死；模板再次更新时若章节或键顺序变化，本检查会明确失败。当前运行结果：

```text
status: passed
objects: 8
nodes: 5
linkedDefinitions: 2
template:
  writing: 2026-10-19.1
  formal: 2026-10-19.1
  objects: 8
  nodes: 5
objectVersion: sha256:9ff6ebfd9b1195063ad00e26b1995169b7df678e63ed72952de611c0ba590088
learningVersion: sha256:3f9a0ba087b8492c8c2b9a1874700a0f02ea54855be3fa79255754f196ecb05d
scope: FINITE：结构、类型、引用、摘要、模板章节形状与定义同源检查；不判定数学真值
```

活动库未受影响：

```powershell
cd E:\MCS\mcs-web
node scripts\content-documents.mjs --check
# 8 objects, 3 nodes
```

`--seal` 只更新引用摘要，不会把假设变成证明，也不会补出 Riesz 定理。检查通过只说明类型、成员尺度、导出、引用、摘要与模板章节形状一致；数学真值与教学效果另行评价。

## 七、晋升为活动内容的步骤

1. 把 `objects/*.md`、`nodes/*.md` 移到 `mcs-content/objects/` 与 `mcs-content/nodes/`（或按维护者约定分批）。
2. 在 `mcs-content/` 运行 `node scripts/content-documents.mjs --seal`，再运行 `--check`。
3. 在 `mcs-content/` 与 `mcs-web/` 运行 `npm run check` 与 `npm test`；更新 `mcs-content/README.md` 的对象/节点计数与 `VALIDATION.md`。
4. 网站重新构建并验证 `/objects` 与 `/api/v2/ontology/objects`；Obsidian 插件重建后验证读取。
5. 若要绑定 Lean，另建目标与对应审阅账本；不得把本候选的 `PROOF` 直接写成机器检查通过。

## 八、明确未声称

- 没有证明 Riesz 表示定理，也没有证明一般内积空间上梯度的存在唯一性。
- 没有把坐标公式、最速上升、链式法则或约束优化形式化；它们只在 L 中以标准结果或 ILLUSTRATION 出现。
- 没有 Lean 绑定、机器重放或人工对应审阅。
- 没有修改活动库、网站索引、Obsidian 库或 ima 生产目录。
- 没有教学效果、难度或学习者状态的断言；这些属于外部模型与派生结果。
