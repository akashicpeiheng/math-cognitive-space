# MCS × Lean：小步认证、完整记账

#数学逻辑 #形式验证 #群 #闭包

本工程登记两组一般数学命题：右单位结构中的左乘单射，以及定义 8.7 所生成闭包的四条性质。证明、原文对应和覆盖完整性分别记录；实际运行结果保存在 `reports/`，对应关系尚待独立人工复核。一般 HOL—Lean 翻译正确性、完整 Cayley 定理以及教学效果均为 **NOT-CLAIMED**。

## 动机与生长过程

数学内部的动机是把“这里显然成立”拆成可检查的前提与推理，特别检验量词和条件是否被偷偷加强。学习应用的动机是让读者看见自己正在依赖哪一句结果，以及这一步离完整理论还有多远。接入从正文小步骤，生长为明确命题、独立目标类型、证明项、带版本的检查报告，最后成为网站可重放证据。

**DEF：** 形式化登记给原文断言指定一个 Lean 命题和对应说明。它规定要检查什么；登记本身不证明断言。**PROOF：** 指定命题的证明由 Lean 内核及 `leanchecker` 实际检查，公理依赖受白名单约束。**NOT-CLAIMED：** 这不证明自然语言与形式语言的一般翻译定理，也不证明网站的全部实现正确。

## 前置知识

- 必备：函数相等、右单位律、集合包含、有限归纳。
- 辅助：群、有限前提规则、自然数阶段、Lean 的命题与证明类型。
- 拓展：闭包算子、Horn 规则、HOL 语义、证明助理的可信基础。

## 原文与形式表达的逐项对照

| 原文条件或结论 | Lean 表达 | 保持目标 |
|---|---|---|
| 任意载体 G | `G : Type u` | 不增加有限性、交换性或群结构 |
| 二元运算及右单位 | `mul : G → G → G`、`e : G`、`∀ x, mul x e = x` | 只使用右单位，不偷用结合或逆元 |
| 左乘映射相等 | `(fun x => mul g x) = (fun x => mul h x)` | 完整函数相等，不替换成单点相等作为新假设 |
| 左乘单射步骤 | `Expected.rightUnitInjective` | 全称量化 G、运算、单位及两个元素 |
| 有限规则的前提集 | `Finset U` | 每条规则的正向前提有限；允许空集 |
| 任意规则族 | `Rules U := Set (Finset U × U)` | U 和规则族 Q 均不要求有限 |
| F(X) | `MCS.step Q X` | 原集合与可适用规则结论的并集 |
| Fⁿ(X) 与其并集 | `MCS.stage Q X n`、`MCS.closure Q X` | 任意有限阶段的并集，而非一个固定枚举上限 |
| 四条闭包性质 | `Expected.extensive/monotone/idempotent/finitary` | 从生成定义推导性质，不预设闭包公理 |

`Expected.lean` 给出独立目标，`Proofs/` 构造证明，`Verified.lean` 用固定目标类型包装候选。`Audit.lean` 从真实编译环境取得声明与传递公理依赖，不读取证明自行提供的成功 JSON。对应关系的人工审阅字段保存在 `registrations.json`；没有实际审阅时保持 `pending`。

## 概括证明、反例与失败边界

**左乘单射的概括证明：** 在单位 e 处读取函数等式，再两次应用右单位律，得到 g=h。细化为

\[
g=ge=L_g(e)=L_h(e)=he=h.
\]

删除右单位律，在 Bool 上取恒 false 的乘法：所有左乘映射相等，但 false 与 true 不相等，也不存在右单位。删除映射相等条件，取 `mul x y = x`：每个元素都可作右单位，仍不能断言任意 g=h；两个不同元素的左乘函数恰好不同。两个反例均由 Lean 证明。群特例只把 `mul_one` 代入一般结论，未完成完整 Cayley 桥梁。

**闭包的概括证明：** 零阶段保留 X；前提包含保持每个阶段的生成；有限个已生成前提可以合并到同一有限阶段，所以阶段并集已经对规则封闭；最后按推导阶段归纳，每个结论只使用 X 中有限个叶子。这依次给出广延、单调、幂等和有限性。

有限前提的条件不能直接删去。取载体 ℕ 加一个新点 ω，从空集生成 0，再由 n 生成 n+1，另加以全部 ℕ 为前提、结论为 ω 的无限前提规则。每个有限阶段都没有 ω，阶段并集为 ℕ；再次应用规则才产生 ω，故幂等性失败。若允许“a 不在当前集合时产生 b”的负向规则，扩大输入反而可能关闭规则，单调性会失败。这两条是边界说明，未登记为已通过的 Lean 反例。

## 可重现命令

工具链固定为 Lean `4.34.1`，mathlib 固定为 `d13f23b723b8a846827a245b89c10fc7d3f11612`。首次准备时安装对应工具链，按已提交的锁文件取得固定依赖，然后在本目录执行 `lake exe cache get`、`lake --no-cache build MCS`。依赖下载只在维护阶段进行，不自动更新锁文件。

服务使用已安装工具链中的原生 `lean`、`lake`、`leanchecker`，不运行可能自动下载工具链的 elan 代理。可设置 `MCS_WEB_LAKE` 和 `MCS_WEB_LEAN` 为同一工具链 `bin/` 下的绝对路径。未找到完整原生工具链时只展示材料，不能重放。本文件的对应说明也纳入输入摘要，修订后旧报告会过期。

在 `mcs-web/` 执行：

```powershell
node scripts/lean.mjs seal
node scripts/lean.mjs check
node scripts/lean.mjs publish-report
node scripts/lean.mjs status
```

`seal` 明确重新记录源文件、原文和检查策略的摘要；它不生成证明。`publish-report` 先真实检查，再保存带输入哈希和时间的历史报告及当前报告。源码、原文、依赖或策略变化会使旧报告过期。网站调用同一检查函数；网页没有更新封存、修改源码或发布报告的入口。

## 常见误解与联动

我起初容易把“Lean 接受了证明”读成“它已经替我核对了原文”，但一个加强了假设的命题也可能有正确证明。独立目标类型防止证明过程换目标；原文是否被准确形式化仍需审阅。另一误解是把“有限前提”读成“有限载体”：本证明允许无限载体与规则族，限制的是每个规则用到的前提数。

低层语言是集合成员、函数求值与有限归纳；高层语言是代数闭包与有穷性。第 6.19 条演绎闭包是相似对象，但还依赖指定演算的假设、弱化与证明合成；不能仅凭这份规则闭包证明便声称完整演算认证。运行报告也不增加任何学习者的掌握记录。

**思想：** 每次认证都交代“证的是哪一句、用了什么、还缺什么”。**方法：** 群节在特殊点求值；闭包节合并有限阶段与追踪有限叶子；检查入口用独立目标、传递公理检查及输入摘要限制证据范围。

**回看问题：** 如果报告通过而原文对应尚待复核，我目前知道的究竟是哪一个形式命题？若删去有限前提，证明的哪个步骤首先失效？

## 参考与核验范围

- Lean 官方验证说明：<https://lean-lang.org/doc/reference/latest/ValidatingProofs/>。本工程采用目标、公理和编译环境重放的分层检查。
- Lean `v4.34.1`：<https://github.com/leanprover/lean4/releases/tag/v4.34.1>。
- mathlib 对应版本：<https://github.com/leanprover-community/mathlib4/releases/tag/v4.34.1>。
- 内建 `leanchecker` 的来源说明：<https://github.com/leanprover/lean4checker>。它使用 Lean 内核，不是独立实现的外部检查器。
- 本仓库修订源：第 08 章定义 8.7 与命题 8.8、群案例的 Cayley 单射步骤。

本工程阅读了上述接口说明和相关源码入口；没有据此声称已读完 Lean 或 mathlib 的全部源码。Lean 逻辑和检查实现的正确性仍是可信基础。
# 拓扑—微分几何新增验收

`MCS/TopologyTargets.lean` 独立陈述七个目标；候选证明在 `MCS/Proofs/Topology.lean`，
`Verified` 的定理类型必须精确等于对应 `Expected` 目标，再由审计读取实际公理依赖。

| 目标 | 对应材料与边界 |
| --- | --- |
| secondToFirst | 任意拓扑空间，第二可数推出第一可数；mathlib Topology/Bases |
| t4ToT3 | normal + T1 推出 regular + T1；不把 normal 预设为含 T1 |
| t3ToT2 | regular + T1 推出 Hausdorff；mathlib T3 的 T0 条件由 T1 提供 |
| t2ToT1 | Hausdorff 推出闭单点 |
| compactToParacompact | 任意拓扑空间，紧推出仿紧；不要求 Hausdorff |
| directionalFderiv | 实赋范向量空间上在点 Fréchet 可微，lineDeriv=fderiv 应用于 v |
| exteriorSquared | 整个 EuclideanSpace ℝ (Fin n) 上的实值 C² k 形式，extDeriv(extDeriv ω)=0 |

最后一个目标使用固定版本 mathlib 的
`Mathlib/Analysis/Calculus/DifferentialForm/Basic.lean` 中 `extDeriv_extDeriv`。
该文件尚未实现一般流形形式，不能把本登记称为一般流形上的机器证明。
其 `minSmoothness ℝ 2 ≤ 2` 条件由实数域的规则化简，不作为新公理。
允许公理仍只有 `propext`、`Classical.choice`、`Quot.sound`，禁止 `sorryAx`。

M 对象的 HOL 负载使用显式背景接口表达当前条件；Lean 的全称类型量化对应一族
HOL 签名实例。接口的自然语言解释、量词、领域与声明锚点的对应审阅全部保持
`pending`。类型检查、目标核对、公理审计、内核重放与人工审阅是五种不同记录。

