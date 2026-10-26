````mcs-relation
{
  "schema": "mcs-relation/1",
  "id": "rel:tdg:deduce-manifold-countability-t2",
  "version": "1",
  "title": "局部欧氏 Hausdorff 空间的可数性判据",
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
    "id": "obj:tdg:manifold-countability",
    "version": "1",
    "anchor": "claim",
    "formalHash": "sha256:73b91c921f7ed41c4cf246b4d929593dce681ec3fabbf43c3f839b105632baa4"
  },
  "premises": [
    {
      "id": "obj:tdg:local-euclidean",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:a7da2e022b195c05319a97d0d36d0357bda9393fd66710c5a74ac7e33a8d47d2"
    },
    {
      "id": "obj:tdg:t2",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:5e4ffbe42b1fd89f3740fad45f6526c7ae86b926fac65742e608ec5cefb2e2ce"
    },
    {
      "id": "obj:tdg:paracompact",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:76c0594b26e3ffdde57703bbbf3064cc4c2ffcb30fe0efc8febd1cd398614746"
    }
  ],
  "context": "本案例明确指定的背景；端点只在所列条件下关联",
  "witness": {
    "type": "class-inclusion",
    "statement": "局部欧氏 Hausdorff 空间的可数性判据"
  },
  "evidence": {
    "status": "PROOF",
    "source": "REF：局部欧氏且 Hausdorff 时，第二可数等价于 σ 紧，也等价于“仿紧且分支至多可数”。局部相对紧坐标球与可数基给 σ 紧；紧覆盖各块可取有限坐标覆盖给可数基。仿紧流形分解为开闭的第二可数分支，加入可数分支才得全局可数。连通时分支只有一个。"
  }
}
````

# 局部欧氏 Hausdorff 空间的可数性判据

本案例明确指定的背景；端点只在所列条件下关联

## 条件与见证

局部欧氏 Hausdorff 空间的可数性判据

组合前提（AND）：局部欧氏性、Hausdorff／T₂ 空间、仿紧空间。

## 证据

PROOF：REF：局部欧氏且 Hausdorff 时，第二可数等价于 σ 紧，也等价于“仿紧且分支至多可数”。局部相对紧坐标球与可数基给 σ 紧；紧覆盖各块可取有限坐标覆盖给可数基。仿紧流形分解为开闭的第二可数分支，加入可数分支才得全局可数。连通时分支只有一个。。结构合法不代表自动证明；人工对应审阅 pending。
