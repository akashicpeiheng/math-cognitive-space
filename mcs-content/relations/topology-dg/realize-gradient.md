````mcs-relation
{
  "schema": "mcs-relation/1",
  "id": "rel:tdg:realize-gradient",
  "version": "1",
  "title": "(grad f)♭=df，标量函数 C¹，有正定度量",
  "case": "topology-dg",
  "layer": "M",
  "kind": "scaling",
  "from": {
    "id": "obj:tdg:gradient",
    "version": "1",
    "anchor": "definition",
    "formalHash": "sha256:128c130fcc8ca5b0b287d4ca29db394ebb553a1defa3c53f688032b3b668f938"
  },
  "to": {
    "id": "obj:tdg:exterior",
    "version": "1",
    "anchor": "definition",
    "formalHash": "sha256:ab6a21f67625d68230675d19ed1df98be6b9b2ce1e3ac5dbde8a72ee781ee198"
  },
  "premises": [
    {
      "id": "obj:tdg:metric",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:e42d78d2bfe62cadca4e9875534e5d7f3449cd1d3b60a234547f95561d340574"
    },
    {
      "id": "obj:tdg:forms",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:29261f3b2b0b1dcaef9b93bf5d09427b38f9fd5d370bd976b7bf0ecb5d92363d"
    }
  ],
  "context": "必须通过 ♭、♯、Hodge 星与0形式嵌入的明确映射；不是同类型算子子集",
  "witness": {
    "type": "operator-realization",
    "statement": "(grad f)♭=df，标量函数 C¹，有正定度量",
    "mapping": "(grad f)♭=df，标量函数 C¹，有正定度量"
  },
  "evidence": {
    "status": "PROOF",
    "source": "obj:tdg:vector-realization#claim 的逐坐标证明；梯度/散度的同一分量计算可推广到欧氏 n 维，向量值旋度仅三维"
  },
  "strength": "hard",
  "direction": {
    "special": "obj:tdg:gradient",
    "general": "obj:tdg:exterior"
  }
}
````

# (grad f)♭=df，标量函数 C¹，有正定度量

必须通过 ♭、♯、Hodge 星与0形式嵌入的明确映射；不是同类型算子子集

## 条件与见证

(grad f)♭=df，标量函数 C¹，有正定度量



## 证据

PROOF：关系正文中的论证或定义。结构合法不代表自动证明；人工对应审阅 pending。

正文证明见形式命题“欧氏三维向量分析的外微分实现”。度量、定向、次数和维数是接口条件，不由外微分本身自动提供。
