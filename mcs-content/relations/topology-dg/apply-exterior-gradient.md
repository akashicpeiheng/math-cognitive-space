````mcs-relation
{
  "schema": "mcs-relation/1",
  "id": "rel:tdg:apply-exterior-gradient",
  "version": "1",
  "title": "输入可微函数、欧氏度量与 df，输出 grad f=(df)♯",
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
    "id": "obj:tdg:gradient",
    "version": "1",
    "anchor": "definition",
    "formalHash": "sha256:128c130fcc8ca5b0b287d4ca29db394ebb553a1defa3c53f688032b3b668f938"
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
    }
  ],
  "context": "欧氏 Rⁿ；函数至少 C¹，度量为标准正定内积",
  "witness": {
    "type": "input-output",
    "statement": "输入可微函数、欧氏度量与 df，输出 grad f=(df)♯"
  },
  "evidence": {
    "status": "PROOF",
    "source": "obj:tdg:vector-realization#claim 的正文坐标检查"
  }
}
````

# 输入可微函数、欧氏度量与 df，输出 grad f=(df)♯

欧氏 Rⁿ；函数至少 C¹，度量为标准正定内积

## 依据与边界

PROOF：obj:tdg:vector-realization#claim 的正文坐标检查。输入与输出是构造任务，不把工具节点当作蕴含结论；人工对应审阅 pending。
