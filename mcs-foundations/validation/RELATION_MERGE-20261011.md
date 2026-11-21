# 放缩关系合并记录（2026-10-11）

#MCS #关系 #研究工程

**本次把泛化与具体化（原稿称特化）合并为放缩关系。** “放”和“缩”是同一关系族的方向参数，硬／软、同载体／跨载体和证据状态分别保留。

## 语义与边界

- **DEF**：`HScale_T(a,b,d,m,w)` 保存来源、目标、方向、载体模式及见证。放方向由具体到一般；缩方向反向阅读同一对应。
- **PROOF**：同载体证据仍证明具体谓词蕴含一般谓词。反向阅读不反转蕴含；固定方向的预序性质见 [6.13–6.16](../06-硬关系.md)。擦去方向后的混合关系未必传递。
- **DEF**：跨载体保留指定结构映射；缩方向不承诺逆函数、唯一原像或每个对象都有原像。
- **DEF**：软放缩记录对应与信息得失；两个方向的学习效果分别由 E 评价，不写回公共本体 M。
- **ILLUSTRATION**：群可沿缩方向到达阿贝尔群或有限群，二者互不包含。可选方向不等于唯一学习路径。

## 修改与复核入口

分章、接口与记号、流形案例、局部化 LC10／LC11 统一口径；整合版和双册阅读版从分章重新生成。既有冻结版本保留，旧 TeX／PDF 仍为先前导出。

```powershell
python mcs-foundations/validation/verify_finite_models.py
python mcs-foundations/validation/build_monograph.py
python mcs-foundations/publication/build.py --check
python mcs-foundations/publication/build.py --build 2026-10-11-r1
python mcs-foundations/publication/build.py --verify 2026-10-11-r1
```

**FINITE**：新增 `V16_scaling_directions`，穷举三元素载体的八个子集，检查两方向的逆关系、预序、不可反转蕴含、多值和混合方向非传递；另给出非单射遗忘映射。运行结果见 [有限核验报告](REPORT.md)，分章哈希见 [核验清单](report.json)，整合版来源哈希见 [sources.json](../edition/sources.json)。这些检查不是一般机器证明或学习效果实证。

站点同步关系分类、方向读取和显示标签；既有关系标识、证据与来源应保留。未确定方向的旧记录不得仅凭改名进入放／缩方向推导。学习者状态 E 不参与公共关系改名。

## 思想、方法与回看

**思想：统一关系族，保留方向与证据。** 方法是在同载体时核对蕴含方向、跨载体时核对映射、反读时检查是否误加了存在性或唯一性。

回看：界面上一条从群通向阿贝尔群的线，究竟允许阅读哪个子类，证书又实际证明了哪一个方向？
