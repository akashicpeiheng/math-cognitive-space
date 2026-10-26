# 数学对象与公共阅读内容

本目录 Markdown 是修订源。`objects/` 属于形式本体 M，`nodes/` 属于公共学习内容 L，`relations/` 保存版本化公共关系。个人笔记、掌握、目标与偏好属于 E；生成的记录、索引、视图与路线属于 D。首个群论片段有 8 个对象、3 篇阅读节点，覆盖右单位条件、左乘与单射性，不声称覆盖完整群论。

2026-10-22 的“拓扑—微分几何”局部案例含 57 个形式对象、57 篇公共阅读与 210 条关系；27 项核心对象和 101 条来源关系记录见[验收清单](cases/topology-dg.json)与[逐项追踪](cases/拓扑—微分几何关系追踪.md)。入口位于“开始学习”和“形式对象”，网络支持数学结构、学习路线及三组预设。关系协议见 [mcs-relation/1](RELATIONS.md)。七项 Lean 目标的机器覆盖边界见[数学验收](cases/拓扑—微分几何验收.md)，人工对应审阅仍为 pending。

网站入口为 `/objects`，可进入五级结构、对象详情、准确 Lean 目标及相关讲解。Obsidian 命令为“打开形式对象与阅读节点”：离线使用构建时打包的同一组 Markdown，或将 objects、nodes、relations 一起复制到测试库的 `mcs-content/`，点击“读取当前库的 mcs-content”。插件不自动发布副本，旧笔记绑定继续使用旧协议。

## 两类接口

2026-10-19 起，两类指南、AI 提示词和七份可复制范本统一由共享模板生成，入口见[模板目录](templates/README.md)。模板位于正式内容扫描范围之外；待填占位符不能作为合法对象或节点入库。模板更新不改写本目录已有对象、阅读正文或证据。

每个文件恰有一个顶层 JSON 代码块，语言标记分别为 `mcs-object`、`mcs-node`。其余部分为普通 Markdown。[共享实现](../mcs-web/shared/content-documents.mjs) 固定支持语法和拒绝条件，[公共类型](../mcs-web/shared/content-documents.d.mts) 为两端共用。完整范本见 [单射对象](objects/group-injective.md) 与 [证明节点](nodes/injective-proof.md)。

| 接口 | 字段与约束 |
|---|---|
| mcs-object/1 | schema、id、version、title、language=`mcs-formal/1`、grammar=`mcs-object-grammar/1`、scale、context；形式内容用 definitions、assumptions、declarations；模块用 references、members、imports、exports、links；Lean 用 lean |
| context | signature 版本；bases 必须含 o；constants 每项含 name、type、background；透明定义单独登记 |
| declaration | 稳定 id 锚点、kind=`term`/`formula`、source、status；term 必须给出 type；formula 若给出 type 必须为 o；PROOF 等标签不代替证书 |
| mcs-node/1 | schema、独立 id、version、title、goals、objects；可选 prerequisites；正文和 goals 非空；没有 scale 或个人数据字段 |
| ObjectRef | id、version、anchor、formalHash；anchor=`$` 为整个对象，其余为声明锚点 |
| LeanBinding | anchor、registrationId、target、mapping、review；当前 review 必须 pending，人工审阅另存账本 |
| export | name、ref、type；单元可导出自身、成员或导入的声明 |
| link | id、kind=`reference`/`interpretation`、from、to、symbols、可选 obligation、status=`pending`；映射连接同类型导出，义务为 o 型声明 |

ID 与路径无关，移动文件不改身份。库内 ID 唯一，历史版本另存快照；正式发布后的修订须显式增版。工具检查当前版本和摘要，不自动维护历史版本注册簿。禁止根据标题推断身份。

## 形式准入与尺度

复用现有有类型 HOL 解析、类型核对与 α 规范化内核。支持箭头类型、已声明常元、`lam`、应用、等式、逻辑连接词和有类型量词。声明与透明定义必须闭合，参数登记为有类型及背景的常元。自由变量、未知类型/符号、不支持版本、错误构造或失效引用使整个库拒绝作为正式本体提供，不跳过坏文件后声称全库有效。

先展开公式语法糖与登记透明定义，再计数 HOL App/Abs 节点，不作 βη 约简或语义等价合并。原子恰含一个构造次数为 0 的声明，分子恰含一个次数大于 0 的声明。不透明符号必须声明签名、类型、背景；透明定义依赖无环。展开预算耗尽明确失败。

单元成员为原子或分子，也可包含自己的有限声明；导入连接单元。话题成员为单元，子学科成员为话题，允许交叉归属。当前精确对象依赖图采用 DAG，模块导入与定义依赖均拒绝循环；跨对象导航可在 L 表达。学习引用可跨尺度、多对多或为空，节点不能成为模块成员。成员归属不生成推导边或学习先修。

结构合法、命题证明与接口对应分别登记。首版只接受待证接口义务，不支持的理论构造不能用正文标签绕过准入。上层名称仅表示规定的形式组织类型，不代表唯一自然分类、难度或篇幅。

## 摘要、证据与修订

对象 formalHash 覆盖形式语法、规范语境、定义、假设、声明、成员、导出、关系与精确依赖；声明锚点另有形式摘要。对象标题、正文和路径不参与 formalHash。nodeHash 覆盖身份、目标、引用、先修与正文；documentHash 覆盖完整文件字节。响应分别提供 objectVersion、learningVersion。

```powershell
cd E:\MCS\mcs-web
node scripts/content-documents.mjs --check
# 形式修订后审查受影响引用，再主动更新引用摘要：
node scripts/content-documents.mjs --seal
npm run check
npm test
```

`--seal` 仅由维护者显式运行，更新 Markdown 引用摘要，不能使旧证明变成通过。运行读取始终核对摘要。JSON 包和索引由 Markdown 生成，不反向维护；插件构建重新生成内置源包。

Lean 源码仍在 [现有工程](../mcs-foundations/lean/README.md)。对象绑定指向 `lean-group-injective` 的 `MCS.Expected.rightUnitInjective`。HOL 固定任意非空类型 G、参数常元 mul/e；Lean 显式量化 Type u、mul/e。登记代表这些参数实例的对应，不是一般 HOL—Lean 翻译定理。

机器报告绑定形式摘要、目标、假设、依赖锁、检查器与源码；新 L 正文不参与机器输入。文字对应另存 `correspondence-reviews.json` 审阅账本，它不是 M/L 的修订源。收据字段为 schema=`mcs-content-correspondence/1`、objectId、nodeId、target、inputHash、status=`reviewed`、reviewer、reviewedAt。inputHash 由共享 correspondenceInput 计算，覆盖对象形式摘要、节点摘要、目标、映射说明与机器输入摘要。文字变更令相应审阅变为 stale，机器报告仍独立判断。当前账本为空，所有审阅 pending，不由测试自动填写。

## 只读 API 与迁移

| 列表 | 详情 |
|---|---|
| `/api/v2/ontology/objects` | `/api/v2/ontology/objects/:id` |
| `/api/v2/learning/nodes` | `/api/v2/learning/nodes/:id` |
| `/api/v2/ontology/object-scale` | 五级及有型成员边 |
| `/api/v2/content-cases` | 案例与 M/L 版本 |
| `/api/v2/ontology/object-network` | 形式对象网络（M） |
| `/api/v2/learning/network` | 阅读网络（L） |
| `/api/v2/content-relations/:id` | 条件、结构见证与证据 |

列表返回索引摘要，详情返回正文、准确引用和相关内容。新接口只读，不更新个人事件。

规划及学习预览请求可选 `contentCase: "topology-dg"`、`objectVersion`、`learningVersion` 和 `routeChoices`。每条引入契约的输入为 AND，多条契约为 OR；D 投影复用旧规划器，同步、工作线程与云端使用同一投影。过期版本返回 409；公共摘要不读取个人状态。游客草稿留在浏览器，登录用户的计划、阅读与掌握记录写入 E。网络快照 v3 区分 M/L 引用并兼容读取 v2。

旧 ID 显式映射如下，实现见 [content-api](../mcs-web/server/content-api.mjs)。试点旧详情正文由新节点投影，旧 formalSpec、行动契约与规划器保持旧协议，不因此获得五级认证。其他旧条目继续读取旧内容。

| 旧 ID | 对象 | 默认阅读节点 |
|---|---|---|
| group:left-mul | obj:group:left-mul | learn:group:left-mul-overview |
| group:claim-injective | obj:group:injective | learn:group:injective-intuition |
| group:proof-injective | obj:group:injective | learn:group:injective-proof |

`mcs-node-id` 只按旧协议解释；旧尺度标记“旧版内容组织”。撤回新路由、插件入口与三项兼容投影即可回滚试点。旧内容、笔记、快照、历史证据和个人记录保留。未批量改写 Obsidian 库或 ima 生产目录。2026-10-18 已将本试点发布到 [公网站点](https://mathcognitivespace.com/objects)，具体部署与回退记录见 [验收文档](VALIDATION.md)。

## 有限验收

`python mcs-foundations/validation/verify_scale_model.py` 检查实际源的五级成员图、多对多引用，并调用共享协议正负例测试；`verify_finite_models.py` 保留旧结构回归并更新正文索引。网站运行 check/test，插件运行 build/check/test。Lean 内核重放、桌面实测、人工对应审阅分别报告。完整全站与规划器迁移、一般翻译正确性、完整群论分类和教学效果均为 NOT-CLAIMED。
