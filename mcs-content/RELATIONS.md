# 公共关系协议 mcs-relation/1

关系 Markdown 存放在 `relations/`，每篇一个顶层 `mcs-relation` JSON 块，
其后是可读正文。编译顺序为 M 对象、L 阅读、关系；双向导航不进入对象导入 DAG。

身份字段为 schema/id/version/title/case/layer。数学关系 layer=M，只能引用形式
对象；教学候选 layer=L，可引用阅读节点。from/to/premises 是精确身份、版本、
声明锚点及形式摘要；阅读整体引用只用 `$` 锚点。M 关系进入 objectVersion，
L 关系进入 learningVersion。个人状态不参与两者摘要。

推导须引用命题锚点，并列出非空 AND 前提组。硬先修须以 routeId 绑定目标
阅读的公开契约，源阅读必须是该路线输入。每条路线输入为 AND；多路线为 OR。
所有路线组成的定义依赖图拒绝循环。认知建议不会成为规划的强前提。

八类呈现使用七个 kind：deduction、hardPrereq、scaling、softPrereq、application、
analogy、duality；scaling 以 strength=hard/soft 区分。放缩方向从 special 指向
general。硬见证限 class-inclusion、forgetful、restriction、operator-realization。
对偶限 linear-dual；形式伴随登记为 application。

每条关系记录 context、witness.type/statement 和 evidence.status/source。
可附 mapping、differences、registrationId。结构检查不推断数学真值，也不把
PROOF 标签当作本次机器重放。Lean 核验从独立登记读取；人工对应审阅保持 pending。
正文、条件、来源与证明状态在案例网络及对象详情中可展开。

修订后运行 `node mcs-web/scripts/content-documents.mjs --seal` 固定引用，再运行
`--check` 与完整网站、插件检查。`cases/topology-dg.json` 记录27项核心对象、
关系身份及数学修正；其证据检查与发布记录位于维护记录中。
