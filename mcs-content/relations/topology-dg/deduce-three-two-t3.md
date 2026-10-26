````mcs-relation
{
  "schema": "mcs-relation/1",
  "id": "rel:tdg:deduce-three-two-t3",
  "version": "1",
  "title": "T₃ ⇒ T₂",
  "case": "topology-dg",
  "layer": "M",
  "kind": "deduction",
  "from": {
    "id": "obj:tdg:t3",
    "version": "1",
    "anchor": "definition",
    "formalHash": "sha256:ff1f2982c796c3a6b6e7d34429c814901cfcc5950cecff94a7a617698f4046b9"
  },
  "to": {
    "id": "obj:tdg:three-two",
    "version": "1",
    "anchor": "claim",
    "formalHash": "sha256:73bfd91a0672909569e446cc2644c6ad0183df5784353df1b6fd67a8d6f97d9d"
  },
  "premises": [
    {
      "id": "obj:tdg:t3",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:ff1f2982c796c3a6b6e7d34429c814901cfcc5950cecff94a7a617698f4046b9"
    }
  ],
  "context": "本案例明确指定的背景；端点只在所列条件下关联",
  "witness": {
    "type": "class-inclusion",
    "statement": "T₃ ⇒ T₂"
  },
  "evidence": {
    "status": "PROOF",
    "source": "T1 使 {y} 闭；正则性分离 x 与 {y}，得到两点的不交开邻域。",
    "registrationId": "lean-topology-dg"
  }
}
````

# T₃ ⇒ T₂

本案例明确指定的背景；端点只在所列条件下关联

## 条件与见证

T₃ ⇒ T₂

组合前提（AND）：正则 T₁／T₃ 空间。

## 证据

PROOF：T1 使 {y} 闭；正则性分离 x 与 {y}，得到两点的不交开邻域。。结构合法不代表自动证明；人工对应审阅 pending。
