````mcs-relation
{
  "schema": "mcs-relation/1",
  "id": "rel:tdg:deduce-direction-frechet-frechet",
  "version": "1",
  "title": "可微时 Dᵥf = Df[v]",
  "case": "topology-dg",
  "layer": "M",
  "kind": "deduction",
  "from": {
    "id": "obj:tdg:frechet",
    "version": "1",
    "anchor": "definition",
    "formalHash": "sha256:cdbbb67b2553b06e8685755208849f15c1d6b0530e5a09052cc731aa2c57af4f"
  },
  "to": {
    "id": "obj:tdg:direction-frechet",
    "version": "1",
    "anchor": "claim",
    "formalHash": "sha256:dfebf36538c10a4a1fbb74a7c640f6306f992cbaae77e94a9870ff60de47cbd5"
  },
  "premises": [
    {
      "id": "obj:tdg:frechet",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:cdbbb67b2553b06e8685755208849f15c1d6b0530e5a09052cc731aa2c57af4f"
    },
    {
      "id": "obj:tdg:directional",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:60e14c2582c075fc125e4a70fbf9290e934866d29e921e60d053030ea737649b"
    }
  ],
  "context": "本案例明确指定的背景；端点只在所列条件下关联",
  "witness": {
    "type": "class-inclusion",
    "statement": "可微时 Dᵥf = Df[v]"
  },
  "evidence": {
    "status": "PROOF",
    "source": "把 Fréchet 展开中的 h 取为 tv。余项除以 t 的绝对值趋于0（v固定），故差商极限为 Av；v=0 单独直接计算。",
    "registrationId": "lean-topology-dg"
  }
}
````

# 可微时 Dᵥf = Df[v]

本案例明确指定的背景；端点只在所列条件下关联

## 条件与见证

可微时 Dᵥf = Df[v]

组合前提（AND）：Fréchet 全导数、方向导数。

## 证据

PROOF：把 Fréchet 展开中的 h 取为 tv。余项除以 t 的绝对值趋于0（v固定），故差商极限为 Av；v=0 单独直接计算。。结构合法不代表自动证明；人工对应审阅 pending。
