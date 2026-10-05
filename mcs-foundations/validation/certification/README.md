# MCS 最小形式认证交付

本目录独立于 ima 生产账本。全部实现使用 Python 标准库，公共站点未改动。主入口为[交付说明](DELIVERY.md)、[任务矩阵](TASKS.md)、[进度](progress.json)和[设计与可信边界](DESIGN.md)。

在**仓库根目录**执行最短链：

```powershell
python .\mcs-foundations\validation\certification\kernel.py .\mcs-foundations\validation\certification\certificates\group.json
python .\mcs-foundations\validation\certification\actions.py
python .\mcs-foundations\validation\certification\evidence.py check
```

第一步从实际λ表达式/证明DAG得出带理论和开放假设的认证记录；第二步重放四案例证书并核对公共行动要求，同时拒绝五类错误来源；第三步核验登记证据及版本。第一步不会把开放假设消掉：群片段的前提是左乘映射相等，背景为右单位律。

完整新增测试在隔离临时目录重放，不替换已登记报告：

```powershell
python .\mcs-foundations\validation\certification\replay.py
```

各入口：

| 文件/命令 | 作用 |
|---|---|
| `kernel.py certificate.json [--theorem ID] [--output PATH]` | 重放证书；0接受，1非法，2未支持，3资源不足，4损坏 |
| `test_kernel.py` | 绑定/公理/规则攻击、独立语义、变量条件受控缺陷与CLI分类；写kernel-report.json |
| `actions.py` | 读取已冻结actions-fixture.json；重放证书并检查条件资源；写action-report.json |
| `research.py [--split participant\|time\|both] [--input PATH]` | 固定合成数据、隔离拟合/评估、表示比较；写research-report.json |
| `evidence.py check` | 检查14条关键断言与8种缺证据/过期攻击；不更新旧证据 |
| `evidence.py refresh` | 明确重新记录证据、输入/输出哈希及证书接受记录；不是日常检查的一部分 |
| `examples.py` | 不可信证书生成器；生成后逐份重放；无需在日常检查前重新生成 |
| `research.py --generate` | 明确重新生成固定种子的合成输入；日常读取已保存输入 |
| `actions.py --create-fixture` | 明确重新冻结公共契约示例；日常不得用它掩盖版本错配 |
| `run_record.py run COMMAND ARG...` | 追加UTC时间、命令、退出码、日志哈希；不触及ima账本 |

语法、规则白名单及一般证明义务见[DESIGN.md](DESIGN.md)和[obligations.json](obligations.json)。四案例每案的数学片段、逐条件反例、完整桥梁剩余依赖见[CASES.md](CASES.md)。可反驳模型与真实实验方案见[RESEARCH.md](RESEARCH.md)。报告中的标签和检查状态不组成单一可信度排序。

理论修订的约定重建链仍是：

```powershell
python .\mcs-foundations\validation\verify_finite_models.py
python .\mcs-foundations\validation\build_monograph.py
```

这些命令会重写原报告、索引及整合Markdown。执行本轮前已保存对应旧文件；不手工编辑整合产物。当前TeX/PDF未更新。站点src/data未修改，本轮另以现有Node规划器语义测试复核边界，不宣称完成浏览器/UI验收。
