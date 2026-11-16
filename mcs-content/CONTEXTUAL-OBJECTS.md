# 带语境的形式表达：mcs-object/2

`mcs-object/2` 与 `mcs-object-grammar/2` 在原有有类型 HOL 项上增加继承绑定语境和可核验构造输入。它与 `/1` 并行读取；旧文档的语义字段及 formalHash 计算保持原样，不自动迁移或重封。

## 语境与表达

文档仍使用一个顶层 `mcs-object` JSON 代码块。`context` 在已有 signature、bases、constants 外必须给出 `bound`，其值是有序类型字符串数组，**最近绑定者在前**。空数组表示闭合语境。类型必须使用已登记的基本类型。

新版声明以 `expression` 作为权威输入，不再接受 `source` 输入。表达是现有内核的规范 HOL 树：

| 构造 | JSON 形状 | 条件 |
| --- | --- | --- |
| 常元 | `["c","name"]` | 签名中存在 |
| 绑定变量 | `["b",index,type]` | index 从 0 起，对应最近者在前的栈；类型必须相同 |
| 逻辑常元 | `["logic","name"]` 或含类型参数的三项数组 | 由现有内核限定 |
| 应用 | `["app",function,argument]` | 参数类型匹配 |
| 抽象 | `["lam",parameterType,body]` | body 的栈为参数类型前置于父栈 |

`type` 中箭头使用现有内核数组，例如 `['->','R','R']`；接口中的类型字符串仍写 `R -> R`。不接受命名自由变量、悬空索引或隐式常元。继承栈最多 256 项；表达节点、深度另有有限预算。

例如，在继承语境 `[R]` 中取该参数：

```json
{
  "schema": "mcs-object/2",
  "grammar": "mcs-object-grammar/2",
  "context": {"signature":"example/1","bases":["o","R"],"constants":[],"bound":["R"]},
  "declarations": [{"id":"expression","kind":"term","type":"R","expression":["b",0,"R"],"status":"DEF"}]
}
```

以上仅展示新增字段，完整对象仍须给出身份、尺度等常规字段。绑定变量本身是构造数为 0 的原子；它没有被替换为闭合的 λ 对象。完整 Γ 与规范项进入声明和对象摘要。即便新增的绑定未被使用，语境不同也不会得到相同身份。

解析器生成仅供展示的 `source`，例如 `[v0:R] ⊢ v0`。生成名避开项中已有常元；显示改名不改变输入树。网站、Master 阅读视图与 Obsidian 都展示继承语境。

## 透明展开与证据

透明定义仍是闭项，先展开定义及原有语法糖，不作 βη 约简。声明在继承栈中调用同一个 `inferTerm` 判断类型。公式声明须为 o 型；将某个子表达式登记为 o 型不表示它为真，DEF 只登记表达。

`assumptions` 继续使用闭合公式。语境表达不能直接导出为闭合符号，不能直接绑定闭合 Lean 目标，也不能进入现有闭合 deduction 的前提或结论。要做这些操作，必须明确关闭绑定并为新对象另立身份。原版接口义务也不能用带语境命题冒充闭合义务。

## 构造见证

原子／分子可给出 `construction`：

```json
{"kind":"app","inputs":[
  {"position":"function","ref":{"id":"obj:...","version":"1","anchor":"expression","formalHash":"sha256:..."}},
  {"position":"argument","ref":{"id":"obj:...","version":"1","anchor":"expression","formalHash":"sha256:..."}}
]}
```

应用输入顺序必须为 function、argument；抽象只有 body；常元、逻辑常元、绑定变量的输入为空。每个输入必须指向表达锚点，不能引用整个模块。

共享编译器核对：准确版本与摘要、固定基础背景、开放假设、继承栈变化、构造位置以及子项规范树相等。父项本身也经类型检查。依赖循环和任何重构差异都使整个库拒绝准入。

不同出现位置保存在任务的 occurrence 账本中；共享同一表达身份不合并其出现位置。模块成员、数学推导、学习先修与讲解引用继续使用各自接口，不从构造或归属推断它们。

## 检查入口

`mcs-web/tests/contextual-objects.test.mjs` 覆盖绑定丢失、类型错误、自由变量、输入换序、背景差异、循环、失效摘要、语境身份和旧协议固定摘要；网站与插件使用同一共享实现。结构检查不构成数学命题证明或一般内核正确性证明。
