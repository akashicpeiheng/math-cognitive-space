````mcs-relation
{
  "schema": "mcs-relation/1",
  "id": "rel:tdg:deduce-two-one-t2",
  "version": "1",
  "title": "T₂ ⇒ T₁",
  "case": "topology-dg",
  "layer": "M",
  "kind": "deduction",
  "from": {
    "id": "obj:tdg:t2",
    "version": "1",
    "anchor": "definition",
    "formalHash": "sha256:5e4ffbe42b1fd89f3740fad45f6526c7ae86b926fac65742e608ec5cefb2e2ce"
  },
  "to": {
    "id": "obj:tdg:two-one",
    "version": "1",
    "anchor": "claim",
    "formalHash": "sha256:bccc09f69d015db3f287aa1a3fb54260a80949256efc4e7ead5759c7d976a0f9"
  },
  "premises": [
    {
      "id": "obj:tdg:t2",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:5e4ffbe42b1fd89f3740fad45f6526c7ae86b926fac65742e608ec5cefb2e2ce"
    }
  ],
  "context": "本案例明确指定的背景；端点只在所列条件下关联",
  "witness": {
    "type": "class-inclusion",
    "statement": "T₂ ⇒ T₁"
  },
  "evidence": {
    "status": "PROOF",
    "source": "固定 y，其他每个 x 都有不含 y 的开邻域；取这些邻域之并等于 X\\{y}，所以 {y} 闭。",
    "registrationId": "lean-topology-dg"
  }
}
````

# T₂ ⇒ T₁

本案例明确指定的背景；端点只在所列条件下关联

## 条件与见证

T₂ ⇒ T₁

组合前提（AND）：Hausdorff／T₂ 空间。

## 证据

PROOF：固定 y，其他每个 x 都有不含 y 的开邻域；取这些邻域之并等于 X\{y}，所以 {y} 闭。。结构合法不代表自动证明；人工对应审阅 pending。
