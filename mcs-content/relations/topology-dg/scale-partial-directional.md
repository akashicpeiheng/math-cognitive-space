````mcs-relation
{
  "schema": "mcs-relation/1",
  "id": "rel:tdg:scale-partial-directional",
  "version": "1",
  "title": "限制为 v=e_i，且必须存在该方向差商",
  "case": "topology-dg",
  "layer": "M",
  "kind": "scaling",
  "from": {
    "id": "obj:tdg:partial",
    "version": "1",
    "anchor": "definition",
    "formalHash": "sha256:9a46946cf2b3df53f4c6fca9e88a76e350bf3e021e30c867991f8110b5675e62"
  },
  "to": {
    "id": "obj:tdg:directional",
    "version": "1",
    "anchor": "definition",
    "formalHash": "sha256:60e14c2582c075fc125e4a70fbf9290e934866d29e921e60d053030ea737649b"
  },
  "premises": [],
  "context": "相同载体及指定结构；流形采用本案例三条件定义，chart 的同胚限制于 U",
  "witness": {
    "type": "restriction",
    "statement": "限制为 v=e_i，且必须存在该方向差商"
  },
  "evidence": {
    "status": "PROOF",
    "source": "关系正文中的论证或定义"
  },
  "strength": "hard",
  "direction": {
    "special": "obj:tdg:partial",
    "general": "obj:tdg:directional"
  }
}
````

# 限制为 v=e_i，且必须存在该方向差商

相同载体及指定结构；流形采用本案例三条件定义，chart 的同胚限制于 U

## 条件与见证

限制为 v=e_i，且必须存在该方向差商



## 证据

PROOF：关系正文中的论证或定义。结构合法不代表自动证明；人工对应审阅 pending。
