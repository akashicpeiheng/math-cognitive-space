````mcs-relation
{
  "schema": "mcs-relation/1",
  "id": "rel:tdg:deduce-compact-hausdorff-normal-t2",
  "version": "1",
  "title": "紧 Hausdorff ⇒ T₄",
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
    "id": "obj:tdg:compact-hausdorff-normal",
    "version": "1",
    "anchor": "claim",
    "formalHash": "sha256:7f9432ee76b9e41d22835d539cffa62edd205e99bd80262b9264c1cfa301a2e4"
  },
  "premises": [
    {
      "id": "obj:tdg:compact",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:3a44124311dfd170374d55178774299b9e69dffb69e881105634f0009ca3d94d"
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
    "statement": "紧 Hausdorff ⇒ T₄"
  },
  "evidence": {
    "status": "PROOF",
    "source": "Hausdorff 给出 T1。给定不交闭集 A,B，闭集均紧：先对固定 a 用有限覆盖分离 a 与 B，再对 A 取有限覆盖，把有限交与并组合成不交开邻域。"
  }
}
````

# 紧 Hausdorff ⇒ T₄

本案例明确指定的背景；端点只在所列条件下关联

## 条件与见证

紧 Hausdorff ⇒ T₄

组合前提（AND）：紧空间、Hausdorff／T₂ 空间。

## 证据

PROOF：Hausdorff 给出 T1。给定不交闭集 A,B，闭集均紧：先对固定 a 用有限覆盖分离 a 与 B，再对 A 取有限覆盖，把有限交与并组合成不交开邻域。。结构合法不代表自动证明；人工对应审阅 pending。
