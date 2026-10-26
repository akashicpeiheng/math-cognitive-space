````mcs-relation
{
  "schema": "mcs-relation/1",
  "id": "rel:tdg:deduce-para-hausdorff-normal-paracompact",
  "version": "1",
  "title": "仿紧 Hausdorff ⇒ T₄",
  "case": "topology-dg",
  "layer": "M",
  "kind": "deduction",
  "from": {
    "id": "obj:tdg:paracompact",
    "version": "1",
    "anchor": "definition",
    "formalHash": "sha256:76c0594b26e3ffdde57703bbbf3064cc4c2ffcb30fe0efc8febd1cd398614746"
  },
  "to": {
    "id": "obj:tdg:para-hausdorff-normal",
    "version": "1",
    "anchor": "claim",
    "formalHash": "sha256:22612768b507aab751c5d106a8715de38cfadcfea8da03b13ec708332a94238d"
  },
  "premises": [
    {
      "id": "obj:tdg:paracompact",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:76c0594b26e3ffdde57703bbbf3064cc4c2ffcb30fe0efc8febd1cd398614746"
    },
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
    "statement": "仿紧 Hausdorff ⇒ T₄"
  },
  "evidence": {
    "status": "PROOF",
    "source": "REF：使用仿紧 Hausdorff 空间正规定理。Hausdorff 与局部有限开加细先给正则，再对闭集的邻域覆盖加细；局部有限性保证闭包并仍闭，从而得到闭集分离。详细逐步证明本篇不展开。"
  }
}
````

# 仿紧 Hausdorff ⇒ T₄

本案例明确指定的背景；端点只在所列条件下关联

## 条件与见证

仿紧 Hausdorff ⇒ T₄

组合前提（AND）：仿紧空间、Hausdorff／T₂ 空间。

## 证据

PROOF：REF：使用仿紧 Hausdorff 空间正规定理。Hausdorff 与局部有限开加细先给正则，再对闭集的邻域覆盖加细；局部有限性保证闭包并仍闭，从而得到闭集分离。详细逐步证明本篇不展开。。结构合法不代表自动证明；人工对应审阅 pending。
