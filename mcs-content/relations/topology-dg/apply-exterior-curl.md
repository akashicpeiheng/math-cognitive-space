````mcs-relation
{
  "schema": "mcs-relation/1",
  "id": "rel:tdg:apply-exterior-curl",
  "version": "1",
  "title": "输入三维 C¹ 向量场及 d(F♭)，输出 curl F=(*d(F♭))♯",
  "case": "topology-dg",
  "layer": "M",
  "kind": "application",
  "from": {
    "id": "obj:tdg:exterior",
    "version": "1",
    "anchor": "definition",
    "formalHash": "sha256:ab6a21f67625d68230675d19ed1df98be6b9b2ce1e3ac5dbde8a72ee781ee198"
  },
  "to": {
    "id": "obj:tdg:curl",
    "version": "1",
    "anchor": "definition",
    "formalHash": "sha256:997b3de0718b13fca965520037a35c19107ca1c9a56636426728d8110f0087b4"
  },
  "premises": [
    {
      "id": "obj:tdg:metric",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:e42d78d2bfe62cadca4e9875534e5d7f3449cd1d3b60a234547f95561d340574"
    },
    {
      "id": "obj:tdg:forms",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:29261f3b2b0b1dcaef9b93bf5d09427b38f9fd5d370bd976b7bf0ecb5d92363d"
    },
    {
      "id": "obj:tdg:hodge",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:c0db4c16f9a448c13187bfb21ffab77c5033bbf5288bd9f3197ae3d4f48d398a"
    }
  ],
  "context": "标准定向欧氏 R³；升降指标与 Hodge 星均由同一度量和定向给出",
  "witness": {
    "type": "input-output",
    "statement": "输入三维 C¹ 向量场及 d(F♭)，输出 curl F=(*d(F♭))♯"
  },
  "evidence": {
    "status": "PROOF",
    "source": "obj:tdg:vector-realization#claim 的正文坐标检查"
  }
}
````

# 输入三维 C¹ 向量场及 d(F♭)，输出 curl F=(*d(F♭))♯

标准定向欧氏 R³；升降指标与 Hodge 星均由同一度量和定向给出

## 依据与边界

PROOF：obj:tdg:vector-realization#claim 的正文坐标检查。输入与输出是构造任务，不把工具节点当作蕴含结论；人工对应审阅 pending。
