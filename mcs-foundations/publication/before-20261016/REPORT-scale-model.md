# 六级尺度模型有限核验报告

执行命令：python mcs-foundations/validation/verify_scale_model.py

使用 Python 标准库。核验对象为有限夹具与笔记文档一致性；
不替代一般证明、机器证明认证或教学效果实证。

| 检查 | 状态 | 有限实例数 | 结果 |
|---|---|---:|---|
| S01_grammar_partition | passed | 75 | 66 个良构表达逐一往返解析一致；9 个非法串被拒绝；P 与 And(P,P) 同值不同尺度。 |
| S02_node_records | passed | 7 | 2 条有效节点记录通过；5 条缺陷记录分别因缺目标、非法角色、外部状态字段、空内容、中心对象类型被拒。 |
| S03_membership_types_acyclic | passed | 12 | 3 层成员关系类型正确；「流形上的积分」节点共享于两个单元；等级函数逐级下降；独立搜索未发现成员环。 |
| S04_flattening | passed | 7 | 7 个聚合的展开包含性与封闭形式通过；同一展开集的两个话题保持不同身份。 |
| S05_darboux_sums | passed | 219 | 等分 n=1..100 精确分数与单调性通过；15 个任意剖分恒等式通过；5 个阈值判别通过。 |
| S06_adaptation_semantics | passed | 4 | 并列最优全部保留；空候选显式报告无方案；全未知保留未知；部分未知不补值。 |
| S07_boundary_witnesses | passed | 3 | 同语法两赋值见证良构不等于真值；学习状态变动不改变节点摘要；成员关系与先修关系分离。 |
| S08_determinism | passed | 2 | 规范化输出的两次运行摘要一致。 |
| S09_document_integrity | passed | 23 | 尺度词序、6 类证据标签、S01–S09 编号、6 条内部链接与 2 条文献 URL 通过。 |

笔记 SHA-256：4040db01782ca5ac62fbfb05de9a27756530b10a2f3c8e8029e488a7229053ce

脚本 SHA-256：2975913efa03a1faef087fe34136055737e7f61ea9ddbaf3628102ca067c0006

详细结果见 [report-scale-model.json](report-scale-model.json)。本报告仅在全部断言通过后写出；失败时进程非零退出。
