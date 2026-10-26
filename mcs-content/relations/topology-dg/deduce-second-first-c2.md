````mcs-relation
{
  "schema": "mcs-relation/1",
  "id": "rel:tdg:deduce-second-first-c2",
  "version": "1",
  "title": "C₂ ⇒ C₁",
  "case": "topology-dg",
  "layer": "M",
  "kind": "deduction",
  "from": {
    "id": "obj:tdg:c2",
    "version": "1",
    "anchor": "definition",
    "formalHash": "sha256:f78985409299d68cc96dbd4a3fca3e505f4187ebef31d2337bf0a1ca3a02dc22"
  },
  "to": {
    "id": "obj:tdg:second-first",
    "version": "1",
    "anchor": "claim",
    "formalHash": "sha256:dab5213afd473086396e55832e369aa96c71a3929cda917f3508a4edf351bf3f"
  },
  "premises": [
    {
      "id": "obj:tdg:c2",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:f78985409299d68cc96dbd4a3fca3e505f4187ebef31d2337bf0a1ca3a02dc22"
    }
  ],
  "context": "本案例明确指定的背景；端点只在所列条件下关联",
  "witness": {
    "type": "class-inclusion",
    "statement": "C₂ ⇒ C₁"
  },
  "evidence": {
    "status": "PROOF",
    "source": "从一份可数拓扑基 B 取出含 x 的成员，仍可数；任意 x 的开邻域包含这样一员，故为 x 的邻域基。",
    "registrationId": "lean-topology-dg"
  }
}
````

# C₂ ⇒ C₁

本案例明确指定的背景；端点只在所列条件下关联

## 条件与见证

C₂ ⇒ C₁

组合前提（AND）：第二可数 C₂。

## 证据

PROOF：从一份可数拓扑基 B 取出含 x 的成员，仍可数；任意 x 的开邻域包含这样一员，故为 x 的邻域基。。结构合法不代表自动证明；人工对应审阅 pending。
