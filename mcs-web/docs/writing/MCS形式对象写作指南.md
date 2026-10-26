# MCS 形式对象写作指南

mcs-formal-object-template · 2026-10-19.1

把“数学上究竟登记了什么”与“怎样向读者讲清楚”分开：本模板登记 M，动机、例子和证明讲解由独立学习节点 L 承担。对象正文可以解释约定，但权威数学内容来自可解析负载。

## 最小工作顺序

1. 确定独立对象 ID、版本、数学背景与形式语言；名称不替代精确规格。
2. 登记基本类型和符号类型、背景；参数用已声明常元或明确绑定。透明定义必须给展开主体，不透明符号必须给类型和背景。
3. 写出表达或模块接口，固定稳定声明锚点、假设及准确依赖。使用现有解析器支持的语法，不支持的内容先保留在正式库之外。
4. 从正式内容库取得引用的 ID、版本、锚点和摘要。先核对引用，再由工具生成摘要；不能用标题或示例中的旧摘要代替实际引用。
5. 运行共享结构校验，分别登记证明资源与对应审阅。通过结构校验仍可能存在待证命题。

## 五级范本

| 尺度 | 写作与核查责任 |
|---|---|
| 原子 | 在固定签名、语境和展开规则下登记基本表达。恰有一个声明，规范树的 App/Abs 次数为 0。 |
| 分子 | 登记合法构造形成的复合表达。恰有一个声明，透明展开后的规范树至少含一个 App/Abs 节点。 |
| 单元 | 封装有限声明。成员为原子或分子，也可直接登记内部声明；只能导入单元，导出须指向自身、成员或导入的声明。 |
| 话题 | 用有限单元及其显式接口关系组织结构。成员必须是单元；关系义务单独登记，不从共同归属推导结论。 |
| 子学科 | 用有限话题及其显式接口关系登记一个有边界的片段。成员必须是话题，不声称穷尽整个学科。 |

使用固定语言、签名、缩写展开规则及 α 规范化。先展开透明定义和语法糖，再检查规范构造树；不按 βη 约简或语义等价合并尺度。尺度不表示难度或篇幅。允许交叉归属；当前接口的精确依赖图采用 DAG，定义与导入不得成环。

## 机器接口

每份对象恰有一个顶层 mcs-object JSON 块。schema=mcs-object/1，language=mcs-formal/1，grammar=mcs-object-grammar/1；本模板 ID 只是写作约定，不是对象 ID 或协议版本。

| 字段 | 必须说明什么 |
|---|---|
| id/version/title/scale | 独立身份、修订版本、名称、经构造核对的尺度 |
| context | signature 版本；bases 含 o；constants 每项 name/type/background |
| definitions | name/type/source；透明、闭合、有类型且依赖无环 |
| assumptions | 本对象实际使用的 o 型假设，不依赖注释中的隐藏条件 |
| declarations | 稳定 id、kind、source、status；term 的 type 必填，formula 若给 type 必须为 o |
| references | 准确对象或声明引用，含 id/version/anchor/formalHash；$ 为整个对象 |
| members/imports | 合法尺度成员；imports 只连接单元，不混入阅读节点 |
| exports | 单元的 name/ref/type，来源为自身、成员或导入的声明 |
| links | id、kind=reference/interpretation、成员 from/to、symbols、可选 o 型 obligation、status=pending |
| lean | 可选，默认 []；anchor、真实 registrationId、准确 target、mapping、review=pending |

接口支持范围以共享解析器为准；不能把正文中的数学关系、声明标签或自然语言“显然”等字样当作形成见证或证书。

## 证据与 Lean 对应

分别回答：结构是否合法，命题有哪些证明资源，接口对应是否已审阅。DEF 是定义约定，PROOF 等标签是证据说明，标签本身不执行检查器。未完成义务可以登记为待证，不能用作已认证结论。

Lean 绑定只连接实际存在的声明和登记；.lean 源码继续由既有工程管理。对应说明列出类型、参数、假设及覆盖范围，参照右单位律试点说明固定 HOL 类型与 Lean 类型参数的关系。机器通过不自动完成人工对应审阅，也不是一般 HOL—Lean 翻译定理。

## 范本、校验与修订

[五级空白范本](../../../mcs-content/templates/README.md)存放在正式扫描范围之外。填写后经检查才放入 objects/；正文解释另写到 nodes/ 并用 ObjectRef 引用。正式发布后的修订显式增版；形式变化会使相关引用和证据过期，注释修改不改变形式摘要。

在 mcs-web 运行 node scripts/content-documents.mjs --check。需要更新引用时先核对内容，再显式运行 --seal；该命令只更新摘要，不证明命题。整个库须同时有效，因此未知符号、错类型、非法成员、循环或失效引用应先在草稿阶段排除。

可运行实例如 [原子](../../../mcs-content/objects/group-mul.md)、[分子](../../../mcs-content/objects/group-injective.md)、[单元](../../../mcs-content/objects/group-unit.md)、[话题](../../../mcs-content/objects/group-topic.md)、[子学科](../../../mcs-content/objects/group-subdiscipline.md)。它们是有限试点，不穷尽群论。

## 依据与边界

DEF：本指南是当前协议的写作约定。依据为 MCS 专稿第 02、04、09、10 章及共享 Markdown 协议。FINITE：范本填充后的类型、结构和引用由共享校验器有限测试；不由模板认证数学正确性、一般翻译正确性或教学效果。
