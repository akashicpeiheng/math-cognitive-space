````mcs-relation
{
  "schema": "mcs-relation/1",
  "id": "rel:tdg:deduce-d-squared-exterior",
  "version": "1",
  "title": "欧氏 C² 形式上 d² = 0",
  "case": "topology-dg",
  "layer": "M",
  "kind": "deduction",
  "from": {
    "id": "obj:tdg:exterior",
    "version": "1",
    "anchor": "definition",
    "formalHash": "sha256:ab6a21f67625d68230675d19ed1df98be6b9b2ce1e3ac5dbde8a72ee781ee198"
  },
  "to": {
    "id": "obj:tdg:d-squared",
    "version": "1",
    "anchor": "claim",
    "formalHash": "sha256:0ebb07d6f4c974bb3cdcc023d5e32be3cbed6205074cc519bca987901e986fa9"
  },
  "premises": [
    {
      "id": "obj:tdg:exterior",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:ab6a21f67625d68230675d19ed1df98be6b9b2ce1e3ac5dbde8a72ee781ee198"
    }
  ],
  "context": "本案例明确指定的背景；端点只在所列条件下关联",
  "witness": {
    "type": "class-inclusion",
    "statement": "欧氏 C² 形式上 d² = 0"
  },
  "evidence": {
    "status": "PROOF",
    "source": "局部展开后每项含混合二阶偏导。C² 给出混合偏导交换，而 dxj∧dxi=−dxi∧dxj，配对相消。机器目标限定为整个有限维欧氏空间上的实值连续交替多线性形式，不声称一般流形形式已被机器覆盖。",
    "registrationId": "lean-topology-dg"
  }
}
````

# 欧氏 C² 形式上 d² = 0

本案例明确指定的背景；端点只在所列条件下关联

## 条件与见证

欧氏 C² 形式上 d² = 0

组合前提（AND）：外微分 d。

## 证据

PROOF：局部展开后每项含混合二阶偏导。C² 给出混合偏导交换，而 dxj∧dxi=−dxi∧dxj，配对相消。机器目标限定为整个有限维欧氏空间上的实值连续交替多线性形式，不声称一般流形形式已被机器覆盖。。结构合法不代表自动证明；人工对应审阅 pending。
