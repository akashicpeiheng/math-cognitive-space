````mcs-relation
{
  "schema": "mcs-relation/1",
  "id": "rel:tdg:scalar-lie-restriction",
  "version": "1",
  "title": "标量 Lie 导数等于沿 Xp 的方向微分；方向导数是该作用域上的限制",
  "case": "topology-dg",
  "layer": "M",
  "kind": "scaling",
  "from": {
    "id": "obj:tdg:directional",
    "version": "1",
    "anchor": "definition",
    "formalHash": "sha256:60e14c2582c075fc125e4a70fbf9290e934866d29e921e60d053030ea737649b"
  },
  "to": {
    "id": "obj:tdg:lie",
    "version": "1",
    "anchor": "definition",
    "formalHash": "sha256:95fd4b0404079d484a0579da3922f7b60866d676b3b4c5215f91fe1f50490fb2"
  },
  "premises": [
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
  "context": "光滑流形、光滑向量场的局部流与光滑标量函数；固定 p 及切向量 Xp",
  "witness": {
    "type": "restriction",
    "statement": "标量 Lie 导数等于沿 Xp 的方向微分；方向导数是该作用域上的限制",
    "mapping": "T=f 为零阶张量，v=Xp；L_X f(p)=D_{Xp}f"
  },
  "evidence": {
    "status": "PROOF",
    "source": "obj:tdg:lie-scalar#claim 的正文证明"
  },
  "strength": "hard",
  "direction": {
    "special": "obj:tdg:directional",
    "general": "obj:tdg:lie"
  }
}
````

# 标量 Lie 导数等于沿 Xp 的方向微分；方向导数是该作用域上的限制

光滑流形、光滑向量场的局部流与光滑标量函数；固定 p 及切向量 Xp

## 条件与见证

标量 Lie 导数等于沿 Xp 的方向微分；方向导数是该作用域上的限制

## 依据与边界

PROOF：obj:tdg:lie-scalar#claim 的正文证明。结构检查与人工对应审阅分开，后者 pending。
