````mcs-relation
{
  "schema": "mcs-relation/1",
  "id": "rel:tdg:derive-vector-realization-metric",
  "version": "1",
  "title": "欧氏三维向量分析的外微分实现",
  "case": "topology-dg",
  "layer": "M",
  "kind": "deduction",
  "from": {
    "id": "obj:tdg:metric",
    "version": "1",
    "anchor": "definition",
    "formalHash": "sha256:e42d78d2bfe62cadca4e9875534e5d7f3449cd1d3b60a234547f95561d340574"
  },
  "to": {
    "id": "obj:tdg:vector-realization",
    "version": "1",
    "anchor": "claim",
    "formalHash": "sha256:4a6e3c562fd48e9cf6569b5b8cc442126cc4715c4d09ae2473c9d3f193810a45"
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
    },
    {
      "id": "obj:tdg:divergence",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:37666927114c2fb31567c627caf2fd692576ce1765abd2a22a473c267bb51325"
    },
    {
      "id": "obj:tdg:exterior",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:ab6a21f67625d68230675d19ed1df98be6b9b2ce1e3ac5dbde8a72ee781ee198"
    },
    {
      "id": "obj:tdg:hodge",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:c0db4c16f9a448c13187bfb21ffab77c5033bbf5288bd9f3197ae3d4f48d398a"
    },
    {
      "id": "obj:tdg:metric",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:e42d78d2bfe62cadca4e9875534e5d7f3449cd1d3b60a234547f95561d340574"
    }
  ],
  "context": "各输入提供独立定义；结论与适用范围见目标命题正文",
  "witness": {
    "type": "definition-expansion",
    "statement": "欧氏三维向量分析的外微分实现"
  },
  "evidence": {
    "status": "PROOF",
    "source": "obj:tdg:vector-realization#claim 的正文证明"
  }
}
````

# 欧氏三维向量分析的外微分实现

各输入提供独立定义；结论与适用范围见目标命题正文

## 条件与见证

欧氏三维向量分析的外微分实现

## 依据与边界

PROOF：obj:tdg:vector-realization#claim 的正文证明。结构检查与人工对应审阅分开，后者 pending。
