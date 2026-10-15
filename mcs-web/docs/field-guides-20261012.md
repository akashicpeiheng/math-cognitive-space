# 开始学习：学科导读与核心节点网络（2026-10-12）

已实现新版本机工作台的 12 科双语导读和固定核心网络。每科 6—10 个单元节点，共 98 个图中位置、95 个不同规范节点；40 个新增节点、12 个现有节点补写正文，共 52 份中英成对的入门正文。本轮只交付本地源码、构建与验收，没有发布到公网。

## 使用与数据边界

`/start` 保留「学科探索 / 已有目标」。`/start?field=群论` 可以定位学科，无效参数按第一项有效兴趣、再按分析回退。浏览按钮只修改当前 URL 和派生视图；只有「加入兴趣 / 移出兴趣」写入 E 的学习方案。选择近期目标同样是显式操作。档案页与路线页的紧凑学习组件提供返回导读入口。

研究对象、两条动机、核心问题与图默认展开，生长线、误解、回看问题和来源可展开。桌面并排，平板与手机上下排列；图形节点和等价 HTML 列表均可用键盘选择。选择问题高亮关联节点；选择节点可看摘要、入选理由、桥梁作用，阅读正文或设为近期主目标。完整网络链接携带完全相同的节点集合，可以沿现有功能继续扩展、保存个人视图。

公共导读目录在 `data/field-guides/`，键沿用 `data/fields.mjs` 的 12 个学科 ID。`GET /api/v2/field-guides?locale=zh|en` 是公开只读接口，支持既有语言头解析，返回目录版本及本体版本。图标题、学习状态、关系和行动来自当前本体及档案。图边仅由已有登记与本轮登记的行动/关系派生，显示方向、种类、证据范围与行动的全部联合输入；一条箭头不表示满足全部前提。固定核心成员不会因学习档案而增删。

## 内容清单

| 学科 | 中文导读字符数 | 核心节点数 |
| --- | ---: | ---: |
| 分析 | 706 | 8 |
| 测度论 | 739 | 7 |
| 拓扑 | 722 | 8 |
| 微分几何 | 718 | 9 |
| 群论 | 714 | 9 |
| 线性代数 | 701 | 10 |
| 多重线性与张量代数 | 729 | 8 |
| 域与数系 | 715 | 8 |
| 集合论 | 760 | 8 |
| 数理逻辑 | 750 | 8 |
| 相对论与宇宙论 | 751 | 9 |
| 数学方法 | 757 | 6 |

字符统计包括研究对象、动机、问题解释、生长线、入门建议、误解和回看问题，不含节点入选理由、标题及来源。生长线明确作为教学组织，不声称是未经核实的历史因果。

正文源是 `data/field-entry-{algebra,foundations,analysis,supplements}.mjs` 的成对段落，骨架在 `field-entry-support.mjs`。`node scripts/build-field-entry.mjs` 生成 `data/cases/10-field-entry.md`；英文正文由相同段落装配。已有节点 ID 不变，背景声明没有被批量替换为新概念节点。补写后的旧证据、摘要和行动范围同步更新，不再显示「正文尚未撰写」。

## 数学内容自审与证据范围

本轮由实现代理对 52 份新增/补写正文作逐篇内容自审：定义所需条件、例子计算、删条件的后果、证明概括、常见误解、中英含义与来源位置。它不等于独立数学审稿人的人工签审。自动检查只覆盖结构、引用、公式排版和中英对等，不能认证正文数学。

每篇的精确假设、条件边界、证明范围、回看题、参考位置、正文 SHA-256 和登记证据保存在 [正文清单](../runtime/field-guide-qa/content-inventory.json)。`node scripts/report-field-guides.mjs` 可重建清单；清单中的证据等级来自声明，不是脚本证明出的评级。

自审时特别核对以下边界：

- 群与线性代数：正规性是定义商群乘法的条件；秩–零化度使用有限维，给出核基扩张证明；特征值不保证在任意底域存在，对偶与张量复用规范节点。
- 测度与积分：可数可加必须在两两不交族上使用；有限/余有限例子明确是在自然数的集合代数上，不能冒称 σ-代数。单调收敛对非负可测递增序列给出简单函数下界证明，非单调尖峰展示失效。控制收敛在实值可测、共同可积控制条件下通过 Fatou 引理说明，无需擅自添加 σ-有限性；无共同控制时尖峰使换序失败。
- 分析：实数完备性作为实数背景性质，未在这里构造实数。微积分基本定理正文证明连续函数的普通 Riemann 积分版本；原登记更广的 Riemann–Stieltjes 断言仍标 `REF`，未把局部证明当作更广断言的证明。复数域代数完备性改为 `REF`，只引用已读定理陈述与证明开头。
- 集合与逻辑：Cantor 的对角论证给出完整概括；集合定义不允许任意无约束理解。可靠性与一阶完备性仅给引用定理的骨架，保留变量、非空结构和所用演绎系统范围。一阶完备性与固定算术理论的不完备性不同。第一不完备性使用一致、有效公理化且足够强的 Gödel–Rosser 形式，删一致性/有效性/强度的边界分别说明；不声称本站推理器实现完整一阶逻辑。
- 相对论：能量动量张量与 Friedmann 方程注明符号约定、单位和均匀各向同性/完美流体假设；后者是 `REF`，没有将局部坐标计算当成爱因斯坦方程的完整推导。数学方法标 `ILLUSTRATION`，类比与维数计数不冒充定理证明。

所有新增证据均为正文级声明，`checkStatus=not_run`，没有签发 ND 或 Lean 机器证书。跨既有案例的接口使用软跨域关系；其他硬前置来自本页定义或证明需要，不另建替代规划器。

## 实际来源阅读位置

参考条目都记录实际使用范围，未将检查目录写成读完全文。

- [MIT 测度与积分讲义](https://ocw.mit.edu/courses/18-125-measure-and-integration-fall-2003/pages/lecture-notes/)：讲义 1—2 的选定定义；讲义 4 定理 0.2；讲义 5 定理 0.3 与几乎处处替换；讲义 8—9 的 Carathéodory 条件与不可测集合论证。没有声称完整阅读全部课程。
- [Oxford 集合论讲义](https://www.maths.ox.ac.uk/system/files/attachments/SetTheoryHT18.pdf)：第 1—3、8 节选定定义，PDF 第 25 页的定理 10.6—10.9；没有声称全文审读。
- [Oxford 一阶逻辑讲义](https://www.maths.ox.ac.uk/system/files/attachments/B1.1%20Logic%20Lecture%20Notes.pdf)：命题逻辑的可靠性/完备性片段、一阶语法与满足定义、定理 13.1 及 Henkin 构造骨架。另读 [Martin Bays 不完备性说明](https://people.maths.ox.ac.uk/bays/teaching/3TP3/notes/5-introspection.html) 的 G1T 及附录 C；原文也未展开 Rosser 完整证明。[Presburger 综述](https://www.cs.ox.ac.uk/people/christoph.haase/home/publication/haa-18/haa-18.pdf) 只读前两页用于边界引用。
- MIT 代数 I 讲义仅核对第 1—2 讲及子群定义；[代数 II 定理 28.6](https://ocw.mit.edu/courses/res-18-012-algebra-ii-student-notes-spring-2022/mit18_702s22_full_lec.pdf#page=126) 读陈述及绕数证明开头。Strang 公开样章/章节说明不是全书阅读。Conrad 张量积读第 1—3 节。[Tong 广义相对论](https://www.davidtong.org/teaching/general-relativity/grhtml/S4) 读物质、完美流体与宇宙论相关小节。Rudin 只核实出版社书目与目录；本页初等论证独立撰写，不能将其归因于未读的全书证明。

## 验证记录

修改前记录：`npm run check` 通过，248 节点、258 证据、171 硬前置、0 完全孤立节点；构建与 i18n 结构检查通过，保留已有翻译欠账与大包警告。工作期间另一任务同步接入一个笔记库节点，因此当前总数是 289 节点、293 行动、301 证据、228 硬前置；该笔记库内容不是本轮新增的 40 个节点之一。

检查与构建日志在 `runtime/field-guide-*.log`。已执行约定的四条命令：`npm run check`、`npm test`、`npm run build`、`npm run check:i18n`。全量 `npm test` 未通过：真实 Lean 重放/攻击检查超时，补充回归进一步发现 Lean 4.34.1 原生工具链缺少 `MissingDocs.olean.private`、`Legacy.olean.private`。没有停用检查、修改证书或虚报全量通过。

学科专项自动检查覆盖 12 科双语、95 个不同单元节点正文、52 篇生成正文与公式、有效问题/锚点、真实边来源、语言解析、版本和读取不写 E。专项真浏览器覆盖访客、显式兴趣排序、阅读/返回、目标选择、档案切换、刷新、双语、错误重试、键盘节点列表，以及 1440/768/390 宽度。完整网络精确传递节点，保存个人视图不改学习事件。首次扩展回归中发现旧测试对无输入起点、关系淡入与新增「类比」对象的假设不再成立，修复后单独重跑记录在对应日志，首次失败仍保留。

当前选中核心节点中，7 篇既有长正文仍使用英文站的明确未译回退：`gt:sigma-algebra`、`gt:separation-axioms`、`gt:countability-axioms`、`gt:tangent-vector`、`gt:riemannian-metric`、`gt:geodesic`、`gt:inner-product`。12 科导读、52 篇本轮正文及新增元数据均有英文；没有用短摘要覆盖这些既有长笔记。全站另有原先未译/过期译文和中文排版提示，结构检查通过不表示全站翻译完成。Vite 的大包警告继续存在。

最终复跑：`check`、`build`、`check:i18n` 均通过；53 项学科/语言/起始节点单元检查通过，浏览器总体验收、分面搜索及 12 科专项浏览器验收通过。扩展回归覆盖本机 API、档案、学习方案、已有目标、路线、网络与双语页面；Lean 相关失败仍保留。PostgreSQL 回归只核对其测试可用的驱动/存储范围，未运行真实公网部署。

| 检查 | 最终结果 | 日志 |
| --- | --- | --- |
| 公共本体与导读完整性 | 通过 | [check](../runtime/field-guide-check.log) |
| TypeScript 与 Vite 构建 | 通过，保留大包警告 | [build](../runtime/field-guide-build.log) |
| 双语结构与正文公式对等 | 通过，保留既有欠账提示 | [i18n](../runtime/field-guide-i18n.log) |
| 53 项专项单元与语言回归 | 通过 | [unit](../runtime/field-guide-unit-final.log) |
| 本机 API 与数据库 24 项 | 通过 | [API](../runtime/field-guide-api-final.log) |
| 总体浏览器交互与响应布局 | 通过 | [browser](../runtime/field-guide-browser-regression-final.log) |
| 分面搜索 | 通过 | [facets](../runtime/field-guide-facets-final.log) |
| 12 科专项真浏览器 | 通过 | [field guides](../runtime/field-guide-page-final.log) |
| 原始全量 npm test | 未通过，Lean 相关失败 | [原始全量](../runtime/field-guide-regression.log) |
| 继续执行的扩展回归 | 首次失败及后续修复分别留档，不代替全量通过 | [续跑](../runtime/field-guide-regression-rest-continuation.log)、[补充 API/Lean 诊断](../runtime/field-guide-api-public.log) |

截图：[桌面整页](../runtime/field-guide-qa/desktop-start-page.png)、[平板整页](../runtime/field-guide-qa/tablet-start-page.png)、[手机整页](../runtime/field-guide-qa/mobile-start-page.png)、[中文局部导读](../runtime/field-guide-qa/desktop-measure.png)、[英文局部导读](../runtime/field-guide-qa/english-linear.png)。局部截图为避免固定顶栏遮住裁切内容而仅在截图时隐藏顶栏；整页截图保留实际顶栏。验收图片与日志位于既有忽略目录 `runtime/`，不混入公共本体或个人正式档案。

相关回归修正还包括：大型内容上下文的推荐预算不能低于最低必要正文长度；「类比」新增为方法节点后，搜索页同时保留对象结果与关系探索入口，删除旧的「按节点筛只会是 0」断言。既有节点、笔记和其他任务的修改均保留。
