````mcs-relation
{
  "schema": "mcs-relation/1",
  "id": "rel:tdg:analogy-gradient-curl",
  "version": "1",
  "title": "对不同次数的输入作一阶微分，再借度量识别输出",
  "case": "topology-dg",
  "layer": "L",
  "kind": "analogy",
  "from": {
    "id": "learn:tdg:gradient",
    "version": "1",
    "anchor": "$"
  },
  "to": {
    "id": "learn:tdg:curl",
    "version": "1",
    "anchor": "$"
  },
  "premises": [],
  "context": "本案例明确指定的背景；端点只在所列条件下关联",
  "witness": {
    "type": "shared-pattern",
    "statement": "对不同次数的输入作一阶微分，再借度量识别输出",
    "differences": "分别把0形式和1形式外微分后借助不同识别输出向量"
  },
  "evidence": {
    "status": "ILLUSTRATION",
    "source": "正文比较；不推出蕴含或对偶"
  }
}
````

# 对不同次数的输入作一阶微分，再借度量识别输出

本案例明确指定的背景；端点只在所列条件下关联

## 条件与见证

对不同次数的输入作一阶微分，再借度量识别输出



## 证据

ILLUSTRATION：正文比较；不推出蕴含或对偶。结构合法不代表自动证明；人工对应审阅 pending。

差异：分别把0形式和1形式外微分后借助不同识别输出向量。
