````mcs-relation
{
  "schema": "mcs-relation/1",
  "id": "rel:tdg:deduce-curl-grad-curl",
  "version": "1",
  "title": "curl grad f = 0",
  "case": "topology-dg",
  "layer": "M",
  "kind": "deduction",
  "from": {
    "id": "obj:tdg:curl",
    "version": "1",
    "anchor": "definition",
    "formalHash": "sha256:997b3de0718b13fca965520037a35c19107ca1c9a56636426728d8110f0087b4"
  },
  "to": {
    "id": "obj:tdg:curl-grad",
    "version": "1",
    "anchor": "claim",
    "formalHash": "sha256:e27399c8138a869421cea3d5c2dcc8ac4d36c0e6b9e9f251e2566203c2b0a33a"
  },
  "premises": [
    {
      "id": "obj:tdg:gradient",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:128c130fcc8ca5b0b287d4ca29db394ebb553a1defa3c53f688032b3b668f938"
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
    "statement": "curl grad f = 0"
  },
  "evidence": {
    "status": "PROOF",
    "source": "C² 标量函数的混合二阶偏导可交换，旋度的三个分量各为一对差，逐项为0。需在 R³ 的开域及标准定向欧氏结构下理解。"
  }
}
````

# curl grad f = 0

本案例明确指定的背景；端点只在所列条件下关联

## 条件与见证

curl grad f = 0

组合前提（AND）：梯度、旋度。

## 证据

PROOF：C² 标量函数的混合二阶偏导可交换，旋度的三个分量各为一对差，逐项为0。需在 R³ 的开域及标准定向欧氏结构下理解。。结构合法不代表自动证明；人工对应审阅 pending。
