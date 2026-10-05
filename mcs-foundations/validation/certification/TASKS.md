# 建议落实矩阵（2026-09-29）

#MCS #研究工程 #证据审计

范围：从阶段 0 至阶段 6 的最小认证实现。既有文件已备份到 `../revisions/20260929-certification/before/`，Git 原状态另存；本轮不把原有文件归功于新增实现。状态由 `progress.json`、命令账本和报告确定，本表登记任务与验收责任，不从文件存在推断完成。

| 建议位置 | 涉及断言及原文定位 | 基线证据/实际缺口 | 决定 | 优先级/依赖 | 交付文件 | 验收入口 | 剩余边界 |
|---|---|---|---|---|---|---|---|
| §2 总判断、§2.4 收缩范围 | 02 定义2.10–2.14；15.2 | 只有文字演算及结构脚本；无数学检查器 | 采纳 | P0/基线 | kernel.py、DESIGN.md | test_kernel.py | 非通用HOL助理 |
| §2.1 六类证据 | 15.1；08 定义8.5 | 标签已有；缺机器清单及状态分离 | 调整：“层级”改为多维责任 | P0/基线 | claims.json、evidence.py | evidence.py check | 不自动核自然语言证明 |
| §2.1 DEF | 02 定义2.1–2.7 | 缺类型/绑定实现 | 采纳 | P0/设计 | kernel.py | test_kernel.py | 有限JSON语法 |
| §2.1 PROOF | 03 定理3.9；案例 | 自然语言论证不等于内核元证明 | 采纳并分开状态 | P0/内核 | obligations.json、certificates/ | kernel.py certificates/group.json | 完整可靠性元证明未完成 |
| §2.1 REF | B.2、B.5 | 已有逐段登记；需本轮复核入口 | 采纳 | P1/原典访问 | sources-audit.json | evidence.py check | 未复核的条目保持继承登记 |
| §2.1 FINITE | validation V01–V15 | 有明确有限结构回归；无翻译参考计算 | 采纳并复用 | P0/内核 | independent.py、kernel-report.json | test_kernel.py；../verify_finite_models.py | 不能证明一般抽象闭合 |
| §2.1 ILLUSTRATION | 07 7.8–7.9；12.8 | 合成夹具有；缺拟合/留出流程 | 采纳 | P1/模型设计 | research.py、research-input.json | research.py | 无真实学习数据 |
| §2.1 NOT-CLAIMED | 15.6、16.7 | 边界已有，需随实现更新 | 采纳 | P0/最终报告 | DELIVERY.md、15、16 | 总复现入口 | 完整案例/经验效果仍未完成 |
| §2.2 错配检索 | 建议参考1–4 | 关键词空结果不能反驳仓库证据；HOL光学错配 | 不采纳为逻辑依据 | P0/建议审计 | 本表、sources-audit.json | 人工原文复核 | 不推测不存在论文 |
| §2.2 作者/页码/源码路线 | B S01、S07 | S01已有84–85页正文；S07已登记作者稿，较建议具体 | 已有实现，补本轮局部核对 | P1/访问 | sources-audit.json | URL/页码人工复核 | 本轮不接入HOL Light源码 |
| §2.3 Henkin基线 | 03 定义3.4、3.7–3.9 | 正文给翻译/模型对应；原Henkin含选择 | 采纳但限制翻译匹配 | P0/语义审查 | DESIGN.md、obligations.json | 规则与翻译审查入口 | 删减演算无完备性承诺 |
| §2.3 “标准语义反例” | 03 推论3.10、例3.16 | 建议方向含混；标准模型⊆Henkin模型 | 调整 | P0/03核对 | DESIGN.md、claims.json | 例3.16人工复核 | 标准有效、一般模型失败为反向见证 |
| §2.3 搜索/检查可判性 | 02 命题2.14；12.11 | 有限假设/理论成员见证已有定义 | 采纳 | P0/内核 | kernel.py、failures/ | test_kernel.py | 超限是资源不足，不是命题为假 |
| §2.4 抽象闭合机器验证 | 03 定义3.2、3.7–3.8 | 一般正文证明已有；有限检查不足 | 调整为独立有限比较+义务 | P0/翻译 | independent.py、obligations.json | test_kernel.py | 一般实现保真待元证明 |
| §2.4 四案例认证 | cases/01–04 | 全桥梁有自然语言证明；无ND证书 | 调整为每案数学片段 | P0/内核 | certificates/、CASES.md | actions.py | 四个完整桥梁未认证 |
| 结论 M/E/D | D.1、7.15–7.17 | 结构非干扰已有定义/有限夹具 | 已有实现，复核并适配 | P0/行动接口 | actions.py、action-report.json | actions.py；V09 | 不认证个人掌握 |
| 结论 AND/OR/Unknown/身份 | 05 5.9、06 6.5–6.12、12 | V02、V07等；站点K=8且组合截断64 | 已有实现，限定搜索范围 | P1/现有回归 | research.py、DESIGN.md | research.py；V01–V15 | 界内样本不是全路线族 |
| 结论 认知识别与锚定 | 07 7.9；16.3、反例16.1 | 同记录异预测反例已有；没有测量效度数据 | 采纳，研究准备 | P1/合成流程 | RESEARCH.md、research-report.json | research.py | 无一般可识别性/因果收益 |
| 结论 系统独特性 | 16.7 | 无公平表示比较 | 采纳 | P1/公共任务固定 | research.py | research.py | 允许增强图编码，不预设MCS优胜 |
| 截断结尾“以及” | 建议结尾 | 原文缺失 | 不补写、不扩张任务 | P2/无 | 本表 | 原文对照 | 作者缺失内容未知 |

首个实现选择：沿 Python 标准库直接实现多排序 ND 子集，避免未经证明的跨助理翻译。公共行动使用独立适配器；站点没有可直接承载此证书的现成数学接口，故本轮不改变 UI、数据或规划行为。最终同步分章与整合 Markdown，TeX/PDF 仍为旧导出。
