````mcs-relation
{
  "schema": "mcs-relation/1",
  "id": "rel:tdg:deduce-tangent-dual-cotangent",
  "version": "1",
  "title": "余切空间是切空间的线性对偶",
  "case": "topology-dg",
  "layer": "M",
  "kind": "deduction",
  "from": {
    "id": "obj:tdg:cotangent",
    "version": "1",
    "anchor": "definition",
    "formalHash": "sha256:6865651c9ec2dd40cb22e4602654337aa7531f4956501227cfdcd20e038662fb"
  },
  "to": {
    "id": "obj:tdg:tangent-dual",
    "version": "1",
    "anchor": "claim",
    "formalHash": "sha256:87b8519d9cfffe842df0f60e31edaa81c8b669118c48bde7b65bf5e7068a9d62"
  },
  "premises": [
    {
      "id": "obj:tdg:tangent",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:5395a41f051f7dd70030e4c26e8ab2a173044b3239812b56bce68a6fc6cb24a5"
    },
    {
      "id": "obj:tdg:cotangent",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:6865651c9ec2dd40cb22e4602654337aa7531f4956501227cfdcd20e038662fb"
    }
  ],
  "context": "本案例明确指定的背景；端点只在所列条件下关联",
  "witness": {
    "type": "class-inclusion",
    "statement": "余切空间是切空间的线性对偶"
  },
  "evidence": {
    "status": "PROOF",
    "source": "DEF：Tp*M 按定义为 TpM 的线性对偶。有限维下评价映射 v↦(α↦α(v)) 给二次对偶同构；它不提供不依赖度量的一次对偶识别。"
  }
}
````

# 余切空间是切空间的线性对偶

本案例明确指定的背景；端点只在所列条件下关联

## 条件与见证

余切空间是切空间的线性对偶

组合前提（AND）：切空间、点态余切空间。

## 证据

PROOF：DEF：Tp*M 按定义为 TpM 的线性对偶。有限维下评价映射 v↦(α↦α(v)) 给二次对偶同构；它不提供不依赖度量的一次对偶识别。。结构合法不代表自动证明；人工对应审阅 pending。
