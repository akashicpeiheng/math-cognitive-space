# 学习节点与形式对象模板

版本：2026-10-19.1。以下文件由共享模板源生成，请先复制到自己的草稿位置，再填写；不要直接编辑生成件。此目录不属于正式 objects/、nodes/ 扫描范围。

## 选择一种文档

- [学习节点](学习节点.md)：阅读目标、准确对象引用与讲解；可跨尺度、多对象，节点自身没有尺度。
- [方法论节点](方法论节点.md)：没有对象引用时的空列表范本；不提供对象层的形式证据。
- [形式对象·原子](形式对象-atom.md)：atom。
- [形式对象·分子](形式对象-molecule.md)：molecule。
- [形式对象·单元](形式对象-unit.md)：unit。
- [形式对象·话题](形式对象-topic.md)：topic。
- [形式对象·子学科](形式对象-subdiscipline.md)：subdiscipline。

节点采用 mcs-node/1，形式对象采用 mcs-object/1，每个范本只有一个对应 JSON 接口块。学习模板标识 mcs-learning-node-template 与形式模板标识 mcs-formal-object-template 均描述写作约定，不是文档身份。独立 ID、实际数学表达和准确引用必须由作者填写；〔占位符〕故意不能通过正式准入。

## 填写与核查

先阅读[节点指南](../../mcs-web/docs/writing/MCS节点写作指南.md)或[形式对象指南](../../mcs-web/docs/writing/MCS形式对象写作指南.md)。对应 AI 提示词在同一目录；网站与 Obsidian 模板副本来自同一生成源。

引用需从正式库取得 ID、版本、锚点与形式摘要，不从标题猜测，不照抄无关示例的摘要。形式对象的 context、definitions、assumptions、declarations 等字段均按当前解析器支持的语法填写。导入、成员和关系各自承担不同责任；节点的阅读先修不成为模块成员。

填写后的文档可与已有内容组成独立候选库，用 compileContentLibrary 检查；只有候选库整体通过后才放入正式目录。公开内容维护入口为 mcs-web 的 node scripts/content-documents.mjs --check。--seal 会改写正式内容的引用摘要，只能在确认形式修订后显式运行，不能用来证明命题或填写人工审阅。

Lean 默认为空；有真实登记才添加映射，review 保持 pending。结构通过、数学证明、对应审阅分别记录。未完成草稿不放入正式目录，不能靠删除引用或添加“已验证”文字绕过检查。

## 私人笔记与兼容

现有私人创作使用同一套阅读写作规则，仍输出 YAML 与章节标记并保存在 E，不自动建立公共节点。旧 mcs-object-note 标识、旧标题、个人记录与成稿保留；升级先预览。ima 的独立生产模板不受本次更新影响。

再生成：在 mcs-web 运行 node scripts/writing-templates.mjs；核对生成件：追加 --check。形式与阅读正文继续分别在 objects/、nodes/ 维护，模板文件不是第三套内容修订源。
