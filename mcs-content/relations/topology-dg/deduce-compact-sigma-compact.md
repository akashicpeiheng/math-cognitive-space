````mcs-relation
{
  "schema": "mcs-relation/1",
  "id": "rel:tdg:deduce-compact-sigma-compact",
  "version": "1",
  "title": "紧 ⇒ σ 紧",
  "case": "topology-dg",
  "layer": "M",
  "kind": "deduction",
  "from": {
    "id": "obj:tdg:compact",
    "version": "1",
    "anchor": "definition",
    "formalHash": "sha256:3a44124311dfd170374d55178774299b9e69dffb69e881105634f0009ca3d94d"
  },
  "to": {
    "id": "obj:tdg:compact-sigma",
    "version": "1",
    "anchor": "claim",
    "formalHash": "sha256:46d847cd8b74c64ddffc3ccfa9c47b7519f872d2acff7e0ec6523735b864d609"
  },
  "premises": [
    {
      "id": "obj:tdg:compact",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:3a44124311dfd170374d55178774299b9e69dffb69e881105634f0009ca3d94d"
    }
  ],
  "context": "本案例明确指定的背景；端点只在所列条件下关联",
  "witness": {
    "type": "class-inclusion",
    "statement": "紧 ⇒ σ 紧"
  },
  "evidence": {
    "status": "PROOF",
    "source": "用常值序列 K_n=X 即得可数紧覆盖；紧的空空间也成立。"
  }
}
````

# 紧 ⇒ σ 紧

本案例明确指定的背景；端点只在所列条件下关联

## 条件与见证

紧 ⇒ σ 紧

组合前提（AND）：紧空间。

## 证据

PROOF：用常值序列 K_n=X 即得可数紧覆盖；紧的空空间也成立。。结构合法不代表自动证明；人工对应审阅 pending。
