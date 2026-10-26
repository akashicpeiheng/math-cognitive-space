````mcs-relation
{
  "schema": "mcs-relation/1",
  "id": "rel:tdg:deduce-four-three-t4",
  "version": "1",
  "title": "T₄ ⇒ T₃",
  "case": "topology-dg",
  "layer": "M",
  "kind": "deduction",
  "from": {
    "id": "obj:tdg:t4",
    "version": "1",
    "anchor": "definition",
    "formalHash": "sha256:b0320143c9e4372c811648ba3deb565568142282da790a40384230616ed2e72b"
  },
  "to": {
    "id": "obj:tdg:four-three",
    "version": "1",
    "anchor": "claim",
    "formalHash": "sha256:8b43931721f82547bc529b1bb758269c6018565caa43d6f2adf9d775ef46a38d"
  },
  "premises": [
    {
      "id": "obj:tdg:t4",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:b0320143c9e4372c811648ba3deb565568142282da790a40384230616ed2e72b"
    }
  ],
  "context": "本案例明确指定的背景；端点只在所列条件下关联",
  "witness": {
    "type": "class-inclusion",
    "statement": "T₄ ⇒ T₃"
  },
  "evidence": {
    "status": "PROOF",
    "source": "T1 使 {x} 闭；将正规性应用于 {x} 与不含 x 的闭集，即得正则。",
    "registrationId": "lean-topology-dg"
  }
}
````

# T₄ ⇒ T₃

本案例明确指定的背景；端点只在所列条件下关联

## 条件与见证

T₄ ⇒ T₃

组合前提（AND）：正规 T₁／T₄ 空间。

## 证据

PROOF：T1 使 {x} 闭；将正规性应用于 {x} 与不含 x 的闭集，即得正则。。结构合法不代表自动证明；人工对应审阅 pending。
