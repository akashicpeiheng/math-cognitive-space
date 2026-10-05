# 有限模型与文档核验报告

执行命令：python E:\MCS\mcs-foundations\validation\verify_finite_models.py

使用 Python 标准库。以下结果验证有限结构实例与文档完整性；不替代正文一般证明、HOL 内核认证或认知实证。

| 检查 | 状态 | 有限实例数 | 结果 |
|---|---|---:|---|
| V01_closure_exhaustive | passed | 512 | 64 个规则系统 × 8 个背景：与全部封闭超集的交这一独立语义计算一致；满足单调、幂等及有界可达性。 |
| V02_and_or_prerequisites | passed | 8 | 联合输入保持 AND，替代入口保持 OR；空路线族不产生先修；个体筛选不改变公共路线族。 |
| V03_event_posets | passed | 65 | 四事件的 64 个按序有向无环图，核验 315 个线性扩张及相邻不可比交换连通性；另核对来源与策略分别无环但合并成环的二事件反例。 |
| V04_boundary_and_sources | passed | 6 | 三事件界内全部来源指派尊重每个线性扩张；隐藏 a、b 后两项义务均留在边界。 |
| V05_cycle_repeat_budget | passed | 6 | 无入口循环不可执行；独立零输入入口可解除循环；重复访问同一节点保留不同事件；零预算拒绝单位成本行动。 |
| V06_or_knowledge_space | passed | 49 | 七状态外部实例并闭且可达，但不交闭，因此不是任何条目偏序的全部下闭集族。 |
| V07_unknown_and_no_reflection | passed | 4 | 未知支持不等于已知空集，集合运算遍历可能值；命题可为假而相信它的判断为真。 |
| V08_padding_witness | passed | 1 | 闭常元出现在未使用实参中，β 结果仍为 e；一般饱和结论由正文证明。 |
| V09_external_noninterference | passed | 9 | 两名合成学习者得到不同群/张量路线和极限提示；学习、遗忘、答错、纠正及重校准不改变本体哈希；冷启动保留未知。 |
| V10_explicit_inputs_and_pareto | passed | 11 | 逐项改变本体、模型、状态、目标、预算、策略及种子均改变复现键；未知成本保留为不可比较候选，不用默认数值支配。 |
| V11_document_integrity | passed | 26 | 26 篇正文文档：本地链接、编号唯一性、LC01–LC36、13 类模板及四篇案例均通过检查。 |
| V12_aggregation_adjunction | passed | 17496 | 三元素域上的全部 128 个非空块子族选择，穷尽检查展开/完整块选择的伴随及闭包、内部算子的幂等性。 |
| V13_route_port_substitution | passed | 10 | 顺序复合同时替换事件输入与最终目标端口；核验左右单位、三路结合、背景透传及无资源依赖时的顺序约束，并拒绝悬空中间目标的旧反例。 |
| V14_noninjective_route_transport | passed | 5 | 两个不同输入合并为同一节点时须选一个合法生产者；输送后依赖为原图子图，不能宣称保留全部原依赖。 |
| V15_observational_nonidentification | passed | 6 | 两个确定模型在长度0至4的纯a记录上一致，在未试行动b上预测相反；见正文反例16.1的一般论证。 |

公共模型 SHA-256：ece7b3f6266a7ed6483a21407322cd9c0cd4812fd2ab08c1751e03c26a4f6609

索引条目：224；局部化方案：36；贯通案例：4。

详细结果及两名合成学习者的派生路线见 [report.json](report.json)。
本报告仅在所有断言通过后写出；失败时进程非零退出。
