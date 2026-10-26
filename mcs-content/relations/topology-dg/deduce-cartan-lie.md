````mcs-relation
{
  "schema": "mcs-relation/1",
  "id": "rel:tdg:deduce-cartan-lie",
  "version": "1",
  "title": "Cartan 公式",
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
    "id": "obj:tdg:cartan",
    "version": "1",
    "anchor": "claim",
    "formalHash": "sha256:1838ff2ca829b2cefaaf8cb47561726cc7f227f31ae37890ee3250ad525087b5"
  },
  "premises": [
    {
      "id": "obj:tdg:lie",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:95fd4b0404079d484a0579da3922f7b60866d676b3b4c5215f91fe1f50490fb2"
    },
    {
      "id": "obj:tdg:exterior",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:ab6a21f67625d68230675d19ed1df98be6b9b2ce1e3ac5dbde8a72ee781ee198"
    },
    {
      "id": "obj:tdg:insertion",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:ff31a8ca2e64837d3a71fe6ad6d6adafd87997841a0c484c2d0ed56d26b9246f"
    }
  ],
  "context": "本案例明确指定的背景；端点只在所列条件下关联",
  "witness": {
    "type": "class-inclusion",
    "statement": "Cartan 公式"
  },
  "evidence": {
    "status": "PROOF",
    "source": "PROOF：两边都是形式代数上次数0的导子。函数上均为 Xf；在 df 上右边为 d(Xf)，左边由流拉回与 d 交换得到同式。局部形式由函数及坐标微分生成，Leibniz 律延拓即得。"
  }
}
````

# Cartan 公式

本案例明确指定的背景；端点只在所列条件下关联

## 条件与见证

Cartan 公式

组合前提（AND）：Lie 导数、外微分 d、内乘 ι_X。

## 证据

PROOF：PROOF：两边都是形式代数上次数0的导子。函数上均为 Xf；在 df 上右边为 d(Xf)，左边由流拉回与 d 交换得到同式。局部形式由函数及坐标微分生成，Leibniz 律延拓即得。。结构合法不代表自动证明；人工对应审阅 pending。
