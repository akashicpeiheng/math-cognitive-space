````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:topic-local-change",
  "version": "1",
  "title": "局部变化",
  "language": "mcs-formal/1",
  "grammar": "mcs-object-grammar/1",
  "scale": "topic",
  "context": {
    "signature": "signature:topology-dg/1",
    "bases": [
      "o",
      "X",
      "Family",
      "R"
    ],
    "constants": []
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [],
  "references": [],
  "members": [
    {
      "id": "obj:tdg:derivative",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:fa47019fbd377d68a02aad914a80c9e4dbe5f5b473d3f660ed37add394af1217"
    },
    {
      "id": "obj:tdg:partial",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:2eeb91ebf8e69735ab8460256a0713501f0813a0596ceedf1fce514c451e52cd"
    },
    {
      "id": "obj:tdg:directional",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:8fe36dbd9d35e2958a215f376f8fa99b2b2096a1cd6b3741aa0eed3094e24b45"
    },
    {
      "id": "obj:tdg:frechet",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:934df91a6ede7a251bcc88df6b0c48fc4d555aa76117c91c5055931ff128669b"
    },
    {
      "id": "obj:tdg:jacobian",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:eac8936be209b5ad899374a07699fba565357696d2f7568a6ca24aa11fe88956"
    },
    {
      "id": "obj:tdg:gradient",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:f2c51eb95f719bb2ee7252efcda7ef3d5ec2bb994dd5ddc7e9240bbfc7d09020"
    },
    {
      "id": "obj:tdg:divergence",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:6806bcc3b80aed0e0c773aae27ed8afbcd89361b89ee304216e104832a986565"
    },
    {
      "id": "obj:tdg:curl",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:74260bb6bba1d0142e7a30d5364704524ae4b48c1973230dd0cdf73032faaaa2"
    },
    {
      "id": "obj:tdg:direction-frechet",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:1e4b64120b32dff5b43435e60d277f37c5c2eafc8ab3fd568f7cbb4e4db8db2f"
    }
  ],
  "imports": [],
  "exports": [],
  "links": [],
  "lean": []
}
````

# 局部变化

一阶近似，以及从中提取的方向、梯度、散度与旋度信息。

## 精确内容与范围

DEF：本话题的内容是接口中显式列出的单元集合，允许交叉归属。它组织当前有限内容，不声称穷尽同名数学专题。

一阶近似由全导数统一控制；Jacobi 矩阵是其坐标表示，梯度依赖度量，散度与旋度提取特定信息。偏导或方向导数存在本身不保证全导数存在。

成员归属不表示数学蕴含或学习先修。主要显示位置仅用于画布排版。

## 证据与检查

FINITE：共享内容检查核对成员类型、精确版本与摘要、依赖无环。这个组织检查不替代成员中各数学断言的验证。

## 参考

- 各成员对象及其原有证据与参考文献。
