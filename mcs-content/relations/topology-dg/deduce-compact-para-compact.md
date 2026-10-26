````mcs-relation
{
  "schema": "mcs-relation/1",
  "id": "rel:tdg:deduce-compact-para-compact",
  "version": "1",
  "title": "紧 ⇒ 仿紧",
  "case": "topology-dg",
  "layer": "M",
  "kind": "deduction",
  "from": {
    "id": "obj:tdg:compact",
    "version": "1",
    "anchor": "definition",
    "formalHash": "sha256:3a44124311dfd170374d55178774299b9e69dffb69e881105634f0009ca3d94d"
  },
  "to": {
    "id": "obj:tdg:compact-para",
    "version": "1",
    "anchor": "claim",
    "formalHash": "sha256:02c1c89993d7f65025f443db60da7b4763332903ec1759bf3426c3459992fde0"
  },
  "premises": [
    {
      "id": "obj:tdg:compact",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:3a44124311dfd170374d55178774299b9e69dffb69e881105634f0009ca3d94d"
    }
  ],
  "context": "本案例明确指定的背景；端点只在所列条件下关联",
  "witness": {
    "type": "class-inclusion",
    "statement": "紧 ⇒ 仿紧"
  },
  "evidence": {
    "status": "PROOF",
    "source": "每个开覆盖取有限子覆盖。该子覆盖也是原覆盖的开加细，有限族必局部有限。此论证不使用 Hausdorff。",
    "registrationId": "lean-topology-dg"
  }
}
````

# 紧 ⇒ 仿紧

本案例明确指定的背景；端点只在所列条件下关联

## 条件与见证

紧 ⇒ 仿紧

组合前提（AND）：紧空间。

## 证据

PROOF：每个开覆盖取有限子覆盖。该子覆盖也是原覆盖的开加细，有限族必局部有限。此论证不使用 Hausdorff。。结构合法不代表自动证明；人工对应审阅 pending。
