````mcs-relation
{
  "schema": "mcs-relation/1",
  "id": "rel:tdg:derive-lie-scalar-lie",
  "version": "1",
  "title": "Lie 导数在标量场上的限制",
  "case": "topology-dg",
  "layer": "M",
  "kind": "deduction",
  "from": {
    "id": "obj:tdg:lie",
    "version": "1",
    "anchor": "definition",
    "formalHash": "sha256:95fd4b0404079d484a0579da3922f7b60866d676b3b4c5215f91fe1f50490fb2"
  },
  "to": {
    "id": "obj:tdg:lie-scalar",
    "version": "1",
    "anchor": "claim",
    "formalHash": "sha256:2858d00998b01e473de8deeb5942eeacb71d358211bd9e17e3117539294788ee"
  },
  "premises": [
    {
      "id": "obj:tdg:lie",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:95fd4b0404079d484a0579da3922f7b60866d676b3b4c5215f91fe1f50490fb2"
    },
    {
      "id": "obj:tdg:directional",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:60e14c2582c075fc125e4a70fbf9290e934866d29e921e60d053030ea737649b"
    },
    {
      "id": "obj:tdg:vector-field",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:cb46f211bf9bbcd360f0da2da5d0feca87d8b90593b867ef498e07edcff54d7e"
    },
    {
      "id": "obj:tdg:flow",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:ac1531cfd0210f6e1acf529ca45f6145d793d489d650411a5447a5a56a09c9a6"
    }
  ],
  "context": "各输入提供独立定义；结论与适用范围见目标命题正文",
  "witness": {
    "type": "definition-expansion",
    "statement": "Lie 导数在标量场上的限制"
  },
  "evidence": {
    "status": "PROOF",
    "source": "obj:tdg:lie-scalar#claim 的正文证明"
  }
}
````

# Lie 导数在标量场上的限制

各输入提供独立定义；结论与适用范围见目标命题正文

## 条件与见证

Lie 导数在标量场上的限制

## 依据与边界

PROOF：obj:tdg:lie-scalar#claim 的正文证明。结构检查与人工对应审阅分开，后者 pending。
