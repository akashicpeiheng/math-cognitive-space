````mcs-relation
{
  "schema": "mcs-relation/1",
  "id": "rel:tdg:apply-atlas-smooth-manifold",
  "version": "1",
  "title": "输入拓扑流形上的覆盖图册，核验所有过渡映射光滑，输出相容极大光滑图册及光滑流形结构",
  "case": "topology-dg",
  "layer": "M",
  "kind": "application",
  "from": {
    "id": "obj:tdg:atlas",
    "version": "1",
    "anchor": "definition",
    "formalHash": "sha256:80e1c9c6bab2b9a386015f35f85973a3aecac9424dafae37549e3b466d78b1e7"
  },
  "to": {
    "id": "obj:tdg:smooth-manifold",
    "version": "1",
    "anchor": "definition",
    "formalHash": "sha256:18ca0fabdbec88a77f80876a721d00be01aa4a24d58feb869d34f43401440f6e"
  },
  "premises": [
    {
      "id": "obj:tdg:top-manifold",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:5e64784907d9f62f8f1485044f94329616bec2dc2e7c3bd7d8a10ae6809e5d1a"
    }
  ],
  "context": "已有 Hausdorff、第二可数、局部欧氏的底空间；每个非空重叠区双向过渡映射都为 C∞",
  "witness": {
    "type": "input-output",
    "statement": "输入拓扑流形上的覆盖图册，核验所有过渡映射光滑，输出相容极大光滑图册及光滑流形结构"
  },
  "evidence": {
    "status": "DEF",
    "source": "光滑图册及光滑流形定义"
  }
}
````

# 输入拓扑流形上的覆盖图册，核验所有过渡映射光滑，输出相容极大光滑图册及光滑流形结构

已有 Hausdorff、第二可数、局部欧氏的底空间；每个非空重叠区双向过渡映射都为 C∞

## 依据与边界

DEF：光滑图册及光滑流形定义。输入与输出是构造任务，不把工具节点当作蕴含结论；人工对应审阅 pending。
