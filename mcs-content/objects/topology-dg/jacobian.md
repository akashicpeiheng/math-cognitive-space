````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:jacobian",
  "version": "1",
  "title": "Jacobi 矩阵",
  "language": "mcs-formal/1",
  "grammar": "mcs-object-grammar/1",
  "scale": "unit",
  "context": {
    "signature": "signature:topology-dg/1",
    "bases": [
      "o",
      "X",
      "Family",
      "R"
    ],
    "constants": [
      {
        "name": "JacobianCoordinateMatrix",
        "type": "o",
        "background": "固定开集 U⊂R^n、f:U→R^m 与 x∈U；各偏导存在时 Jf(x) 的 (i,j) 元为 ∂f_i/∂x_j(x)。若 f 在 x 处 Fréchet 可微，则此矩阵在标准基下表示 Df_x；仅有偏导存在不保证可微。"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "definition",
      "kind": "formula",
      "source": "JacobianCoordinateMatrix",
      "status": "DEF"
    }
  ],
  "references": [
    {
      "id": "obj:tdg:frechet",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:934df91a6ede7a251bcc88df6b0c48fc4d555aa76117c91c5055931ff128669b"
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
    }
  ],
  "members": [],
  "imports": [],
  "exports": [],
  "links": [],
  "lean": []
}
````

# Jacobi 矩阵

#微分学 #局部变化 #矩阵

## 对象与任务

把多元映射的各分量、各坐标方向的变化率排成矩阵，便于计算局部线性近似。

## 精确内容

DEF：设 $U\subset\mathbb R^n$ 为开集，$f:U\to\mathbb R^m$，$x\in U$。当各偏导存在时，定义 $m\times n$ 矩阵

$$Jf(x)=\left(\frac{\partial f_i}{\partial x_j}(x)\right)_{i,j}.$$

若 $f$ 在 $x$ 处 Fréchet 可微，则 $Jf(x)$ 是 $Df_x$ 在标准基下的矩阵，因而

$$f(x+h)=f(x)+Jf(x)h+o(\|h\|),\qquad D_vf(x)=Jf(x)v.$$

PROOF：把 $h=te_j$ 代入全导数的余项定义，再取第 $i$ 个分量，得到矩阵第 $j$ 列为 $Df_x(e_j)$；代入 $h=tv$ 得方向导数公式。这里先假设全导数存在，再读出偏导。

## 条件与边界

各偏导存在并不保证上面的统一余项；所有方向导数存在也不足够。例如令 $g(0,0)=0$，其他点取 $g(a,b)=a^3/(a^2+b^2)$。原点各方向导数为 $u^3/(u^2+v^2)$〔非零方向 $(u,v)$〕，不是方向的线性函数，因此全导数不存在。沿坐标轴所得 Jacobi 行矩阵为 $(1,0)$，沿 $(1,1)$ 却给出错误的线性预测。这一例子也说明要分别检查“矩阵元素存在”与“矩阵确实描述一阶近似”。

对标量函数，$Jf$ 是行矩阵；标准欧氏内积下梯度列向量为 $Jf^{\mathsf T}$。一般度量需要相应的度量识别。散度与三维旋度分别提取向量场一阶导数的迹及反对称信息，通常不能恢复完整矩阵；经典向量值旋度还依赖三维和定向。

FINITE：当前形式接口登记了带背景解释的不透明命题；协议类型与摘要检查不等于以上分析内容的机器证明。人工对应审阅仍为 pending。

## 联动与回看

- 全导数是线性映射；Jacobi 矩阵是选定基后的表示。换坐标后，矩阵会改变。
- 方向导数是给定方向上的读数；在可微条件下由矩阵乘向量计算。
- 为什么必须核验余项，而不能只把所有偏导排好？

## 参考文献

- Fréchet 全导数、偏导数、方向导数的本库定义及其明确条件。
- 既有笔记：[Jacobi矩阵](/nodes/gt%3Ajacobi-matrix)。本条为重新编写的最小入口，旧笔记中的额外断言未整体复核。
