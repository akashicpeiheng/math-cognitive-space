````mcs-relation
{
  "schema": "mcs-relation/1",
  "id": "rel:tdg:invariant-c2",
  "version": "1",
  "title": "通过同胚传递 第二可数 C₂",
  "case": "topology-dg",
  "layer": "M",
  "kind": "application",
  "from": {
    "id": "obj:tdg:homeomorphism",
    "version": "1",
    "anchor": "definition",
    "formalHash": "sha256:dd0860f12f0ec6f1e38f159fc4ad52e1f17e86338123c37b647a6da795fd4f43"
  },
  "to": {
    "id": "obj:tdg:c2",
    "version": "1",
    "anchor": "definition",
    "formalHash": "sha256:f78985409299d68cc96dbd4a3fca3e505f4187ebef31d2337bf0a1ca3a02dc22"
  },
  "premises": [],
  "context": "输入 X→Y 的同胚与 X 的指定性质，输出 Y 的同一性质；逆同胚给反向传递",
  "witness": {
    "type": "input-output",
    "statement": "通过同胚传递 第二可数 C₂"
  },
  "evidence": {
    "status": "PROOF",
    "source": "同胚及其逆映射把开集、邻域基、开覆盖、局部有限性与分离一一对应，因而传递上述性质"
  }
}
````

# 通过同胚传递 第二可数 C₂

输入 X→Y 的同胚与 X 的指定性质，输出 Y 的同一性质；逆同胚给反向传递

## 条件与见证

通过同胚传递 第二可数 C₂

## 依据与边界

PROOF：同胚及其逆映射把开集、邻域基、开覆盖、局部有限性与分离一一对应，因而传递上述性质。结构检查与人工对应审阅分开，后者 pending。
