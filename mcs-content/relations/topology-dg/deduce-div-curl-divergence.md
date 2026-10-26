````mcs-relation
{
  "schema": "mcs-relation/1",
  "id": "rel:tdg:deduce-div-curl-divergence",
  "version": "1",
  "title": "div curl F = 0",
  "case": "topology-dg",
  "layer": "M",
  "kind": "deduction",
  "from": {
    "id": "obj:tdg:divergence",
    "version": "1",
    "anchor": "definition",
    "formalHash": "sha256:37666927114c2fb31567c627caf2fd692576ce1765abd2a22a473c267bb51325"
  },
  "to": {
    "id": "obj:tdg:div-curl",
    "version": "1",
    "anchor": "claim",
    "formalHash": "sha256:7800721dd94ae2b2f597ea8dd937f5e6752c328949d857962a54f144af7032d7"
  },
  "premises": [
    {
      "id": "obj:tdg:divergence",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:37666927114c2fb31567c627caf2fd692576ce1765abd2a22a473c267bb51325"
    },
    {
      "id": "obj:tdg:curl",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:997b3de0718b13fca965520037a35c19107ca1c9a56636426728d8110f0087b4"
    }
  ],
  "context": "本案例明确指定的背景；端点只在所列条件下关联",
  "witness": {
    "type": "class-inclusion",
    "statement": "div curl F = 0"
  },
  "evidence": {
    "status": "PROOF",
    "source": "将散度和旋度坐标式展开，六项二阶偏导因 C² 可交换而两两抵消。"
  }
}
````

# div curl F = 0

本案例明确指定的背景；端点只在所列条件下关联

## 条件与见证

div curl F = 0

组合前提（AND）：散度、旋度。

## 证据

PROOF：将散度和旋度坐标式展开，六项二阶偏导因 C² 可交换而两两抵消。。结构合法不代表自动证明；人工对应审阅 pending。
