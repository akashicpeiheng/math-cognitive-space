````mcs-relation
{
  "schema": "mcs-relation/1",
  "id": "rel:tdg:deduce-continuous-connected-continuous",
  "version": "1",
  "title": "连续像保持连通",
  "case": "topology-dg",
  "layer": "M",
  "kind": "deduction",
  "from": {
    "id": "obj:tdg:continuous",
    "version": "1",
    "anchor": "definition",
    "formalHash": "sha256:bd3f8a4a69252d698d739bd35c7b6f37e9302d70abc5263c7f3e6bdb02fe21e1"
  },
  "to": {
    "id": "obj:tdg:continuous-connected",
    "version": "1",
    "anchor": "claim",
    "formalHash": "sha256:0e0b329c12357406a2d1491e6b1cab991610034fde17e12be7046984be20e9c0"
  },
  "premises": [
    {
      "id": "obj:tdg:connected",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:1ddcfece650418316642788bee94dffe9a0f3c49af159f030ca60a0328a166ac"
    },
    {
      "id": "obj:tdg:continuous",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:bd3f8a4a69252d698d739bd35c7b6f37e9302d70abc5263c7f3e6bdb02fe21e1"
    }
  ],
  "context": "本案例明确指定的背景；端点只在所列条件下关联",
  "witness": {
    "type": "class-inclusion",
    "statement": "连续像保持连通"
  },
  "evidence": {
    "status": "PROOF",
    "source": "若像分成两个不交非空相对开集，其逆像也是源空间的两个不交非空开集且覆盖源空间，与连通矛盾。"
  }
}
````

# 连续像保持连通

本案例明确指定的背景；端点只在所列条件下关联

## 条件与见证

连续像保持连通

组合前提（AND）：连通空间、连续映射。

## 证据

PROOF：若像分成两个不交非空相对开集，其逆像也是源空间的两个不交非空开集且覆盖源空间，与连通矛盾。。结构合法不代表自动证明；人工对应审阅 pending。
