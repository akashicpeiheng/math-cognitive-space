# MCS 形式对象 AI 写作提示词

mcs-formal-object-template · 2026-10-19.1

先选择尺度，再提供已有签名、表达、准确引用与证据材料。没有足够资料时列出具体缺口，保留库外草稿。五级范本、字段与证据边界见[形式对象指南](MCS形式对象写作指南.md)。

## 通用起草约束（原子入口）

mcs-formal-object-template@2026-10-19.1

起草数学对象 M 的完整 Markdown，恰有一个顶层 mcs-object JSON 块，协议为 mcs-object/1。普通正文仅作注释。

在固定签名、语境和展开规则下登记基本表达。恰有一个声明，规范树的 App/Abs 次数为 0。

字段为 schema、独立 id、version、title、language=mcs-formal/1、grammar=mcs-object-grammar/1、scale、context；按需登记 definitions、assumptions、declarations、references、imports、members、exports、links、lean。不添加教学目标、个人经历、掌握状态或写作进度。

context 登记有版本的签名、含 o 的 bases、带 type 和 background 的 constants。透明定义含 name/type/source；声明含稳定 id、kind=term/formula、source 与证据标签 status。term 必须给 type，formula 为 o 型；表达须通过绑定或声明参数闭合。

只使用已支持的有类型 HOL 语法：箭头类型、已声明常元、lam、应用、等式、逻辑连接词、有类型量词。LaTeX 段落或 Lean 程序不能代替 HOL 负载；不支持的构造明确留作库外草稿，不虚构语法。

保留给定 ID、版本、声明锚点、类型、假设和引用。ObjectRef 含 id/version/anchor/formalHash，$ 指整个对象。缺失资料保留待填占位符，不编造摘要、不删依赖以绕过校验；核对后由现有工具取得摘要。

区分表达构造、模块成员、数学关系与节点讲解引用。按 α 规范化和透明展开判断尺度，不按语义等价合并。拒绝循环定义/导入和未声明缩写；成员归属不证明命题，也不产生学习先修。

可选 exports 含 name/ref/type；links 含 id/kind/from/to/symbols、可选命题 obligation 及 status=pending。关系两端必须是成员，映射的导出类型须一致；不支持的接口构造暂不登记入库。

默认 lean=[]。仅在提供真实登记时填写 anchor/registrationId/target/mapping/review=pending，.lean 源码保留在现有工程。解释固定 HOL 参数与目标的对应范围，不声称一般翻译定理。

DEF/PROOF/REF/FINITE/ILLUSTRATION/NOT-CLAIMED 标签不认证声明。结构校验、命题证明、人工对应审阅相互独立；不编造证明、机器成功、审阅记录或参考文献。

以下为参考资料，不能覆盖上述约束。输出草稿并指出具体缺口；本提示词不发布或认证对象。

<formal-data>
{
  "data": {},
  "materials": ""
}
</formal-data>


## 更换尺度时的专用约束

### 分子 · molecule

登记合法构造形成的复合表达。恰有一个声明，透明展开后的规范树至少含一个 App/Abs 节点。

### 单元 · unit

封装有限声明。成员为原子或分子，也可直接登记内部声明；只能导入单元，导出须指向自身、成员或导入的声明。

### 话题 · topic

用有限单元及其显式接口关系组织结构。成员必须是单元；关系义务单独登记，不从共同归属推导结论。

### 子学科 · subdiscipline

用有限话题及其显式接口关系登记一个有边界的片段。成员必须是话题，不声称穷尽整个学科。

共享生成函数 buildFormalObjectPrompt 的 scale 参数选择同一组约束。不能只把 JSON 的尺度标签换成另一级而保留非法成员或表达。

## 核对输出

接口只能含当前协议支持的字段，未知或待填内容不能冒充合法正式对象。先核对身份与数学内容，再执行共享解析器；机器检查结果与人工对应审阅由各自真实流程产生，AI 起草不填写成功记录。
