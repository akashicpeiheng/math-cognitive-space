# 六级尺度模型有限核验报告

执行命令：python mcs-foundations/validation/verify_scale_model.py

使用 Python 标准库。核验对象为有限夹具与笔记文档一致性；
不替代一般证明、机器证明认证或教学效果实证。

| 检查 | 状态 | 有限实例数 | 结果 |
|---|---|---:|---|
| S01_grammar_partition | passed | 82 | 66 个良构表达逐一往返解析一致；9 个非法串被拒绝；分型检查拒绝 3 个类型错配并接受零元构造；P 与 And(P,P) 同值不同尺度。 |
| S02_learn_nodes_and_records | passed | 14 | 2 条学习节点与 2 条知识记录通过；7 条缺陷节点（缺目标、非法角色、外部状态字段、空内容、中心类型、未分型先修、未知先修种类）与 3 条缺陷记录（未知构造、缺失标识、外部状态字段）被拒。 |
| S03_membership_types_acyclic | passed | 15 | 3 层成员关系按尺度标签 σ（2–5）逐级下降；「流形上的积分」节点共享于两个单元；独立搜索未发现成员环；直接跳级、同级成员与记录成员 3 类非法归属被拒绝。 |
| S04_flattening | passed | 7 | 7 个聚合的展开包含性与封闭形式通过；同一展开集的两个话题保持不同身份。 |
| S05_darboux_sums | passed | 219 | 等分 n=1..100 精确分数与单调性通过；15 个任意剖分恒等式通过；5 个阈值判别通过。 |
| S06_adaptation_semantics | passed | 5 | 并列最优全部保留；空候选显式报告无方案；全未知保留未知；部分未知输出 bestKnown 与 unresolved 且最优性未决；见证：未知候选可优于已知最佳。 |
| S07_boundary_witnesses | passed | 3 | 同语法两赋值见证良构不等于真值；学习状态变动不改变记录与学习节点摘要；成员关系与先修关系分离。 |
| S08_determinism | passed | 2 | 规范化输出的两次运行摘要一致。 |
| S09_document_integrity | passed | 23 | 尺度词序、6 类证据标签、S01–S09 编号、6 条内部链接与 2 条文献 URL 通过。 |

笔记 SHA-256：db3c656a9b1aa80bbcc9a1f8b72013850167c1f5145b40e96bf3a53acae5a9ce

脚本 SHA-256：622505194ddfd8877577ec5c293204eb199a69739b792c89114bd451490bd426

详细结果见 [report-scale-model.json](report-scale-model.json)。本报告仅在全部断言通过后写出；失败时进程非零退出。
