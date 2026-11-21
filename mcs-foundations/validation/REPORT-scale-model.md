# 五级形式尺度有限核验报告

执行：`python mcs-foundations/validation/verify_scale_model.py`。Python 标准库加本机 Node 共享协议测试；全部断言通过后才写出本报告。

| 检查 | 状态 | 实例数 | 结果 |
|---|---|---:|---|
| S01_formal_scales | FINITE / passed | 77 | 实际源覆盖五级；语法分类由共享内核测试核对。 |
| S02_M_L_boundary | FINITE / passed | 138 | 对象无教学目标/学习者字段，学习节点无尺度。 |
| S03_typed_members | FINITE / passed | 79 | 成员类型正确、秩严格下降，节点不能成为成员。 |
| S04_flattening | FINITE / passed | 5 | 展开至五个形式表达，不读取节点或个人状态。 |
| S05_reading_references | FINITE / passed | 3 | 同一对象三篇讲解、节点多对象与跨尺度引用。 |
| S06_right_identity | FINITE / passed | 735 | 穷举 1–3 元右单位运算均单射，另检查删条件反例；不推断无限情形。 |
| S07_shared_protocol | FINITE / passed | 1 | 共享实现正负例：类型、展开、成员、循环、交叉归属、失效引用、版本、非干扰及审阅。 |
| S08_Lean_boundary | FINITE / passed | 1 | 准确声明与目标登记；此脚本不执行 Lean，不改写人工审阅。 |
| S09_migration | FINITE / passed | 1 | 当前五级定义与六级历史脚本分别保存。 |

源码摘要见 [JSON 报告](report-scale-model.json)。旧报告在 publication/before-20261018-object-node/validation。
