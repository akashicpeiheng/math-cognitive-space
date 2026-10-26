````mcs-relation
{
  "schema": "mcs-relation/1",
  "id": "rel:tdg:deduce-formal-adjoint-divergence",
  "version": "1",
  "title": "梯度与负散度的形式伴随",
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
    "id": "obj:tdg:formal-adjoint",
    "version": "1",
    "anchor": "claim",
    "formalHash": "sha256:34a61eb06e9aaf4c44ba65432bff273fb71682ef71d2d2f123cf8d4617fcec95"
  },
  "premises": [
    {
      "id": "obj:tdg:gradient",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:128c130fcc8ca5b0b287d4ca29db394ebb553a1defa3c53f688032b3b668f938"
    },
    {
      "id": "obj:tdg:divergence",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:37666927114c2fb31567c627caf2fd692576ce1765abd2a22a473c267bb51325"
    }
  ],
  "context": "本案例明确指定的背景；端点只在所列条件下关联",
  "witness": {
    "type": "class-inclusion",
    "statement": "梯度与负散度的形式伴随"
  },
  "evidence": {
    "status": "PROOF",
    "source": "分部积分：逐坐标积分 ∂if·Fi=∂i(fFi)−f∂iFi，再求和。紧支撑使边界积分为0；有边界且非紧支撑时必须保留通量边界项。这是算子的形式伴随，非向量空间线性对偶。"
  }
}
````

# 梯度与负散度的形式伴随

本案例明确指定的背景；端点只在所列条件下关联

## 条件与见证

梯度与负散度的形式伴随

组合前提（AND）：梯度、散度。

## 证据

PROOF：分部积分：逐坐标积分 ∂if·Fi=∂i(fFi)−f∂iFi，再求和。紧支撑使边界积分为0；有边界且非紧支撑时必须保留通量边界项。这是算子的形式伴随，非向量空间线性对偶。。结构合法不代表自动证明；人工对应审阅 pending。
