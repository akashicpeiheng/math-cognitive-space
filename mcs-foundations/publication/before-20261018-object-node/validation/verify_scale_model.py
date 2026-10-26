r"""六级尺度模型（原子→分子→节点→单元→话题→子学科）的有限核验；Python 标准库。

运行：python mcs-foundations/validation/verify_scale_model.py
覆盖：语法划分与唯一可读性（含分型匹配与缩写登记纪律）、学习节点与知识记录、
分层成员类型（含非法成员拒绝）与无环、展开包含性、
积分上下和精确分数核验（等分 n=1..100、任意剖分恒等式、阈值判别）、
适配语义（已知最佳与最优性未决）、边界见证、确定性与文档完整性。
不声称：一般数学证明、机器证明认证、教学效果实证、无限结构判定。

本脚本只写两个新文件：validation/report-scale-model.json 与
validation/REPORT-scale-model.md；全部断言通过后才写出。
"""
from __future__ import annotations

import hashlib
import json
import re
from fractions import Fraction
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "validation"
NOTE = ROOT / "notes" / "数学对象六级尺度模型.md"

CHECKS = []


def digest(value):
    text = json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def record(name, detail, instances):
    CHECKS.append({"id": name, "status": "passed", "instances": instances, "detail": detail})


# ---------------------------------------------------------------- 语法夹具

ATOM_TYPES = {"P": "Prop", "Q": "Prop"}
OP_TYPES = {"Not": (("Prop",), "Prop"), "And": (("Prop", "Prop"), "Prop")}


def atom(name):
    assert name in ATOM_TYPES, "未登记原子：" + name
    return ("atom", name)


def app(op, *args):
    assert op in OP_TYPES, "未登记构造：" + op
    assert len(args) == len(OP_TYPES[op][0]), "元数不匹配：" + op
    return ("app", op, args)


def render(term):
    if term[0] == "atom":
        return term[1]
    _, op, args = term
    return op + "(" + ",".join(render(a) for a in args) + ")"


def complexity(term):
    if term[0] == "atom":
        return 0
    _, op, args = term
    return 1 + sum(complexity(a) for a in args)


class ParseError(Exception):
    pass


def parse(source):
    pos = 0

    def term():
        nonlocal pos
        if pos >= len(source):
            raise ParseError("意外结束：" + source)
        ch = source[pos]
        if ch in "PQ":
            pos += 1
            if pos < len(source) and source[pos].isalpha():
                raise ParseError("原子后紧跟字母：" + source)
            return atom(ch)
        match = re.match(r"[A-Za-z][A-Za-z0-9]*", source[pos:])
        if not match:
            raise ParseError("非法字符：" + source[pos:])
        name = match.group(0)
        pos += len(name)
        if name not in OP_TYPES:
            raise ParseError("未知构造：" + name)
        if pos >= len(source) or source[pos] != "(":
            raise ParseError("缺少左括号：" + name)
        pos += 1
        arity = len(OP_TYPES[name][0])
        args = []
        for index in range(arity):
            args.append(term())
            if index != arity - 1:
                if pos >= len(source) or source[pos] != ",":
                    raise ParseError("缺少逗号：" + name)
                pos += 1
        if pos >= len(source) or source[pos] != ")":
            raise ParseError("缺少右括号：" + name)
        pos += 1
        return app(name, *args)

    result = term()
    if pos != len(source):
        raise ParseError("多余字符：" + source[pos:])
    return result


def terms_by_size(max_size):
    by_size = {1: [atom("P"), atom("Q")]}
    for size in range(2, max_size + 1):
        bucket = []
        if size - 1 in by_size:
            bucket.extend(app("Not", t) for t in by_size[size - 1])
        for left in range(1, size - 1):
            right = size - 1 - left
            if left in by_size and right in by_size:
                bucket.extend(app("And", a, b) for a in by_size[left] for b in by_size[right])
        by_size[size] = bucket
    return by_size


def evaluate(term, env):
    if term[0] == "atom":
        return env[term[1]]
    _, op, args = term
    if op == "Not":
        return 1 - evaluate(args[0], env)
    return min(evaluate(a, env) for a in args)


def check_s01_grammar():
    by_size = terms_by_size(5)
    all_terms = [t for bucket in by_size.values() for t in bucket]
    for term in all_terms:
        assert parse(render(term)) == term, render(term)
        assert complexity(parse(render(term))) == complexity(term), render(term)
        assert (complexity(term) == 0) == (term[0] == "atom"), render(term)
    assert sum(1 for t in all_terms if complexity(t) == 0) == len(ATOM_TYPES)
    bad = ["", "And(P", "And(P,", "And(P,Q", "And(P)", "And(P,Q))", "PP", "R(P)", "Not()"]
    for source in bad:
        try:
            parse(source)
        except ParseError:
            continue
        raise AssertionError("解析器接受了非法串：" + source)
    for env in ({"P": 1, "Q": 0}, {"P": 0, "Q": 1}, {"P": 1, "Q": 1}, {"P": 0, "Q": 0}):
        assert evaluate(atom("P"), env) == evaluate(app("And", atom("P"), atom("P")), env)

    # 分型匹配：多排序构造、零元构造与类型错配拒绝。
    typed_atoms = {"P": "Prop", "Q": "Prop", "c0": "Ind"}
    typed_ops = {
        "Not": (("Prop",), "Prop"),
        "And": (("Prop", "Prop"), "Prop"),
        "S": (("Ind",), "Ind"),
        "Eq": (("Ind", "Ind"), "Prop"),
    }

    def tapp(op, *args):
        return ("app", op, args)

    def typed_sort(node):
        if node[0] == "atom":
            sort = typed_atoms.get(node[1])
            if sort is None:
                raise ParseError("未登记原子：" + node[1])
            return sort
        _, op, args = node
        inputs, output = typed_ops[op]
        if len(args) != len(inputs):
            raise ParseError("元数不匹配：" + op)
        for arg, expected in zip(args, inputs):
            if typed_sort(arg) != expected:
                raise ParseError("类型不匹配：" + op)
        return output

    def typed_atom(name):
        return ("atom", name)

    assert typed_sort(tapp("And", typed_atom("P"), typed_atom("Q"))) == "Prop"
    assert typed_sort(tapp("S", typed_atom("c0"))) == "Ind"
    assert typed_sort(tapp("Eq", typed_atom("c0"), tapp("S", typed_atom("c0")))) == "Prop"
    assert complexity(typed_atom("c0")) == 0
    mismatch_terms = [
        tapp("And", tapp("S", typed_atom("c0")), typed_atom("P")),
        tapp("S", typed_atom("P")),
        tapp("Eq", typed_atom("P"), typed_atom("c0")),
    ]
    for node in mismatch_terms:
        try:
            typed_sort(node)
        except ParseError:
            continue
        raise AssertionError("分型检查接受了类型错配")

    # 缩写登记纪律：给复合表达起名不改变含义，但改变同一语法下的尺度。
    for env in ({"P": 1}, {"P": 0}):
        assert evaluate(app("And", atom("P"), atom("P")), env) == env["P"]
    assert complexity(atom("P")) == 0 and complexity(app("And", atom("P"), atom("P"))) == 1
    record(
        "S01_grammar_partition",
        "{} 个良构表达逐一往返解析一致；{} 个非法串被拒绝；分型检查拒绝 {} 个类型错配并接受零元构造；P 与 And(P,P) 同值不同尺度。".format(len(all_terms), len(bad), len(mismatch_terms)),
        len(all_terms) + len(bad) + len(mismatch_terms) + 4,
    )
    return {"terms": len(all_terms)}


# ---------------------------------------------------------------- 节点夹具

ROLE_VOCAB = {
    "motivation", "definition", "condition-analysis", "example",
    "proof", "property", "application", "check-task",
}
NODE_FIELDS = {"id", "version", "center", "contents", "relations", "prereqs", "goal"}
PREREQ_KINDS = {"learn", "record", "bg"}
RECORD_KINDS = {
    "Symbol", "Term", "Concept", "Definition", "Claim", "Proof", "Example",
    "Counterexample", "Problem", "Theory", "Construction", "Method",
    "Representation", "MisconceptionPattern",
}
RECORD_FIELDS = {"id", "kind", "payload"}
EXTERNAL_HINTS = {"mastery", "learner", "state", "observations", "history", "confidence"}


def valid_node_a():
    return {
        "id": "n_topological_manifold",
        "version": 1,
        "center": app("And", atom("P"), atom("Q")),
        "contents": [
            ("motivation", "为什么用局部欧氏描述曲线与曲面"),
            ("definition", "P_n、坐标卡与图册"),
            ("example", "R^n 与圆周"),
            ("proof", "非空开子集命题"),
        ],
        "relations": [("definition", "motivation"), ("proof", "definition")],
        "prereqs": [("bg", "bg:topological-space"), ("bg", "bg:homeomorphism")],
        "goal": {"statement": "理解并陈述拓扑流形定义", "tasks": ["复述", "辨认例子", "证明推论"]},
    }


def valid_node_b():
    return {
        "id": "n_riemann_integral",
        "version": 1,
        "center": app("And", atom("P"), atom("Q")),
        "contents": [
            ("motivation", "面积与累积量"),
            ("definition", "上下和与达布可积"),
            ("example", "f(x)=x 的计算"),
            ("check-task", "判断简单函数可积性"),
        ],
        "relations": [("example", "definition")],
        "prereqs": [("learn", "n_limit")],
        "goal": {"statement": "理解并计算黎曼积分", "tasks": ["陈述定义", "计算例子", "指出边界"]},
    }


def valid_record_a():
    return {
        "id": "r_manifold_def",
        "kind": "Definition",
        "payload": {"symbol": "Manifold", "theory": "topology"},
    }


def valid_record_b():
    return {
        "id": "r_open_subset_proof",
        "kind": "Proof",
        "payload": {"target": "r_open_subset_claim", "certificate": "cert-1"},
    }


def node_problems(node):
    problems = []
    for key in node:
        if key not in NODE_FIELDS:
            tag = "外部状态字段" if key in EXTERNAL_HINTS else "未知字段"
            problems.append("field:" + key + ":" + tag)
    if not isinstance(node.get("id"), str) or not node.get("id"):
        problems.append("id")
    version = node.get("version")
    if not isinstance(version, int) or version < 1:
        problems.append("version")
    center = node.get("center")
    if not (isinstance(center, tuple) and center and center[0] in ("atom", "app")):
        problems.append("center")
    contents = node.get("contents")
    if not isinstance(contents, list) or not contents:
        problems.append("contents")
    else:
        for item in contents:
            if not (isinstance(item, tuple) and len(item) == 2 and isinstance(item[0], str) and item[0] in ROLE_VOCAB and isinstance(item[1], str) and item[1]):
                role = item[0] if isinstance(item, tuple) and item else item
                problems.append("role:" + str(role))
    if not isinstance(node.get("relations"), list):
        problems.append("relations")
    prereqs = node.get("prereqs")
    if not isinstance(prereqs, list):
        problems.append("prereqs")
    else:
        for item in prereqs:
            if not (
                isinstance(item, tuple)
                and len(item) == 2
                and isinstance(item[0], str)
                and item[0] in PREREQ_KINDS
                and isinstance(item[1], str)
                and item[1]
            ):
                problems.append("prereq:" + str(item[0] if isinstance(item, tuple) and item else item))
    goal = node.get("goal")
    if not (isinstance(goal, dict) and isinstance(goal.get("statement"), str) and goal.get("statement") and isinstance(goal.get("tasks"), list) and goal.get("tasks")):
        problems.append("goal")
    return problems


def record_problems(record):
    problems = []
    for key in record:
        if key not in RECORD_FIELDS:
            tag = "外部状态字段" if key in EXTERNAL_HINTS else "未知字段"
            problems.append("field:" + key + ":" + tag)
    if not isinstance(record.get("id"), str) or not record.get("id"):
        problems.append("id")
    if record.get("kind") not in RECORD_KINDS:
        problems.append("kind:" + str(record.get("kind")))
    payload = record.get("payload")
    if not isinstance(payload, dict) or not payload:
        problems.append("payload")
    return problems


def check_s02_nodes():
    valid = [valid_node_a(), valid_node_b()]
    for node in valid:
        problems = node_problems(node)
        assert not problems, node["id"] + "：" + "；".join(problems)
    valid_records = [valid_record_a(), valid_record_b()]
    for candidate in valid_records:
        problems = record_problems(candidate)
        assert not problems, candidate["id"] + "：" + "；".join(problems)
    base = valid_node_a()
    missing_goal = dict(base)
    missing_goal.pop("goal")
    bad_role = dict(base)
    bad_role["contents"] = [("homework", "课后作业")] + base["contents"][1:]
    external = dict(base)
    external["mastery"] = 0.5
    empty = dict(base)
    empty["contents"] = []
    bad_center = dict(base)
    bad_center["center"] = "P"
    untyped_prereq = dict(base)
    untyped_prereq["prereqs"] = ["n_limit"]
    unknown_prereq_kind = dict(base)
    unknown_prereq_kind["prereqs"] = [("friend", "someone")]
    bad_kind_record = dict(valid_record_a())
    bad_kind_record["kind"] = "Diagram"
    missing_id_record = dict(valid_record_a())
    missing_id_record.pop("id")
    external_record = dict(valid_record_a())
    external_record["mastery"] = 0.5
    expectations = [
        (missing_goal, "goal"),
        (bad_role, "role:"),
        (external, "field:mastery"),
        (empty, "contents"),
        (bad_center, "center"),
        (untyped_prereq, "prereq:n"),
        (unknown_prereq_kind, "prereq:friend"),
    ]
    for node, prefix in expectations:
        problems = node_problems(node)
        assert any(p.startswith(prefix) for p in problems), prefix + "：" + str(problems)
    record_expectations = [
        (bad_kind_record, "kind:Diagram"),
        (missing_id_record, "id"),
        (external_record, "field:mastery"),
    ]
    for candidate, prefix in record_expectations:
        problems = record_problems(candidate)
        assert any(p.startswith(prefix) for p in problems), prefix + "：" + str(problems)
    record(
        "S02_learn_nodes_and_records",
        "2 条学习节点与 2 条知识记录通过；7 条缺陷节点（缺目标、非法角色、外部状态字段、空内容、中心类型、未分型先修、未知先修种类）与 3 条缺陷记录（未知构造、缺失标识、外部状态字段）被拒。",
        len(valid) + len(valid_records) + len(expectations) + len(record_expectations),
    )
    return {"valid_nodes": len(valid), "valid_records": len(valid_records), "rejected": len(expectations) + len(record_expectations)}


# ---------------------------------------------------------------- 分层夹具

NODE_IDS = ["n_manifold", "n_smooth", "n_forms_integral", "n_riemann", "n_limit"]
UNITS = {
    "u_manifold": ["n_manifold", "n_smooth", "n_forms_integral"],
    "u_integral": ["n_riemann", "n_forms_integral", "n_limit"],
}
TOPICS = {
    "t_manifold_calculus": ["u_manifold", "u_integral"],
    "t_limit_integral": ["u_integral"],
    "t_limit_integral_reorganized": ["u_integral"],
}
SUBDISCIPLINES = {
    "s_differential_geometry": ["t_manifold_calculus"],
    "s_real_analysis": ["t_limit_integral"],
}
PREREQ = [("n_riemann", "n_limit"), ("n_forms_integral", "n_smooth")]


def rank_table():
    ranks = {}
    for node in NODE_IDS:
        ranks[node] = 2
    for unit in UNITS:
        ranks[unit] = 3
    for topic in TOPICS:
        ranks[topic] = 4
    for sub in SUBDISCIPLINES:
        ranks[sub] = 5
    return ranks


def membership_edges():
    edges = []
    for aggregate, members in list(UNITS.items()) + list(TOPICS.items()) + list(SUBDISCIPLINES.items()):
        edges.extend((member, aggregate) for member in members)
    return edges


def has_cycle(edges, nodes):
    graph = {node: [] for node in nodes}
    for source, target in edges:
        graph[source].append(target)
    color = {node: 0 for node in nodes}

    def visit(node):
        color[node] = 1
        for neighbor in graph[node]:
            if color[neighbor] == 1:
                return True
            if color[neighbor] == 0 and visit(neighbor):
                return True
        color[node] = 2
        return False

    return any(color[node] == 0 and visit(node) for node in nodes)


def check_s03_membership():
    ranks = rank_table()
    for aggregate, members in UNITS.items():
        assert members, aggregate
        assert all(m in NODE_IDS for m in members), aggregate
    for aggregate, members in TOPICS.items():
        assert members, aggregate
        assert all(m in UNITS for m in members), aggregate
    for aggregate, members in SUBDISCIPLINES.items():
        assert members, aggregate
        assert all(m in TOPICS for m in members), aggregate
    for aggregate, members in list(UNITS.items()) + list(TOPICS.items()) + list(SUBDISCIPLINES.items()):
        for member in members:
            assert ranks[member] == ranks[aggregate] - 1, aggregate + " <- " + member
    assert "n_forms_integral" in UNITS["u_manifold"] and "n_forms_integral" in UNITS["u_integral"]
    edges = membership_edges()
    assert not has_cycle(edges, list(ranks)), "成员关系出现循环"
    chain = ["n_forms_integral", "u_integral", "t_limit_integral", "s_real_analysis"]
    assert [ranks[x] for x in chain] == [2, 3, 4, 5]
    for source, target in zip(chain, chain[1:]):
        assert (source, target) in edges, source + " -> " + target
    kinds = {node: "node" for node in NODE_IDS}
    kinds.update({unit: "unit" for unit in UNITS})
    kinds.update({topic: "topic" for topic in TOPICS})
    kinds.update({sub: "subdiscipline" for sub in SUBDISCIPLINES})
    kinds["r_payload"] = "record"
    allowed = {("node", "unit"), ("unit", "topic"), ("topic", "subdiscipline")}

    def membership_violation(member, aggregate):
        return (kinds[member], kinds[aggregate]) not in allowed

    for member, aggregate in edges:
        assert not membership_violation(member, aggregate), (member, aggregate)
    illegal = [
        ("n_manifold", "t_manifold_calculus"),
        ("u_integral", "u_manifold"),
        ("r_payload", "u_integral"),
    ]
    for member, aggregate in illegal:
        assert membership_violation(member, aggregate), (member, aggregate)
    record(
        "S03_membership_types_acyclic",
        "3 层成员关系按尺度标签 σ（2–5）逐级下降；「流形上的积分」节点共享于两个单元；独立搜索未发现成员环；直接跳级、同级成员与记录成员 3 类非法归属被拒绝。",
        len(edges) + len(illegal),
    )
    return {"edges": len(edges)}


def compute_flat():
    flat = {node: frozenset({node}) for node in NODE_IDS}
    for aggregate, members in UNITS.items():
        flat[aggregate] = frozenset().union(*(flat[m] for m in members))
    for aggregate, members in TOPICS.items():
        flat[aggregate] = frozenset().union(*(flat[m] for m in members))
    for aggregate, members in SUBDISCIPLINES.items():
        flat[aggregate] = frozenset().union(*(flat[m] for m in members))
    return flat


def check_s04_flattening():
    flat = compute_flat()
    aggregated = list(UNITS) + list(TOPICS) + list(SUBDISCIPLINES)
    for aggregate, members in list(UNITS.items()) + list(TOPICS.items()) + list(SUBDISCIPLINES.items()):
        for member in members:
            assert flat[member] <= flat[aggregate], aggregate + " <- " + member
    for unit, members in UNITS.items():
        assert flat[unit] == frozenset(members), unit
    for topic, members in TOPICS.items():
        expected = frozenset().union(*(flat[m] for m in members))
        assert flat[topic] == expected, topic
    for sub, members in SUBDISCIPLINES.items():
        expected = frozenset().union(*(flat[m] for m in members))
        assert flat[sub] == expected, sub
    shared = flat["t_manifold_calculus"]
    member_total = sum(len(flat[m]) for m in UNITS["u_manifold"]) + sum(len(flat[m]) for m in UNITS["u_integral"])
    assert len(shared) < member_total, "共享节点未被去重"
    assert flat["t_limit_integral"] == flat["t_limit_integral_reorganized"]
    record(
        "S04_flattening",
        "{} 个聚合的展开包含性与封闭形式通过；同一展开集的两个话题保持不同身份。".format(len(aggregated)),
        len(aggregated),
    )
    return {"aggregates": len(aggregated)}


# ---------------------------------------------------------------- 积分夹具

def uniform_partition(n):
    return [Fraction(k, n) for k in range(n + 1)]


def darboux_sums_x(partition):
    lower = Fraction(0)
    upper = Fraction(0)
    for left, right in zip(partition, partition[1:]):
        width = right - left
        lower += left * width
        upper += right * width
    return lower, upper


def partition_family():
    parts = [uniform_partition(n) for n in range(2, 13)]
    for p, q in ((3, 5), (4, 7), (6, 10)):
        points = sorted({Fraction(k, p) for k in range(p + 1)} | {Fraction(k, q) for k in range(q + 1)})
        parts.append(points)
    parts.append([Fraction(0), Fraction(1, 100), Fraction(1, 3), Fraction(1, 2), Fraction(9, 10), Fraction(1)])
    return parts


def check_s05_darboux():
    half = Fraction(1, 2)
    for n in range(1, 101):
        lower, upper = darboux_sums_x(uniform_partition(n))
        assert lower == Fraction(n - 1, 2 * n), n
        assert upper == Fraction(n + 1, 2 * n), n
        assert upper - lower == Fraction(1, n), n
        assert lower + upper == 1, n
    for n in range(1, 100):
        lower, upper = darboux_sums_x(uniform_partition(n))
        next_lower, next_upper = darboux_sums_x(uniform_partition(n + 1))
        assert lower < next_lower and next_upper < upper, n
    family = partition_family()
    for partition in family:
        lower, upper = darboux_sums_x(partition)
        assert (lower + upper) / 2 == half, partition
        assert upper - lower == sum((b - a) ** 2 for a, b in zip(partition, partition[1:])), partition
        assert lower <= half <= upper, partition
    epsilons = [Fraction(1, 2), Fraction(1, 4), Fraction(1, 10), Fraction(1, 100), Fraction(1, 1000)]
    for eps in epsilons:
        n = 1
        while Fraction(1, 2 * n) > eps:
            n += 1
        lower, upper = darboux_sums_x(uniform_partition(n))
        assert abs(lower - half) <= eps and abs(upper - half) <= eps, eps
        if n > 1:
            previous_lower, previous_upper = darboux_sums_x(uniform_partition(n - 1))
            assert abs(previous_lower - half) > eps, eps
    record(
        "S05_darboux_sums",
        "等分 n=1..100 精确分数与单调性通过；{} 个任意剖分恒等式通过；{} 个阈值判别通过。".format(len(family), len(epsilons)),
        100 + 99 + len(family) + len(epsilons),
    )
    return {"uniform": 100, "partitions": len(family), "epsilons": len(epsilons)}


# ---------------------------------------------------------------- 适配与边界

def select_best(plans, cost):
    plans = list(plans)
    if not plans:
        return {"status": "no-plan", "best": [], "unresolved": []}
    known = {p: cost[p] for p in plans if cost.get(p) is not None}
    unresolved = [p for p in plans if cost.get(p) is None]
    if not known:
        return {"status": "unknown", "best": [], "unresolved": unresolved}
    best_value = min(known.values())
    best = sorted(p for p, value in known.items() if value == best_value)
    if unresolved:
        return {"status": "best-known", "best": best, "unresolved": unresolved, "optimality": "unresolved"}
    return {"status": "optimal", "best": best, "unresolved": [], "optimality": "established"}


def check_s06_adaptation():
    ties = select_best(["p1", "p2", "p3"], {"p1": 2, "p2": 1, "p3": 1})
    assert ties == {"status": "optimal", "best": ["p2", "p3"], "unresolved": [], "optimality": "established"}, ties
    empty = select_best([], {})
    assert empty == {"status": "no-plan", "best": [], "unresolved": []}, empty
    unknown = select_best(["p1", "p2"], {"p1": None, "p2": None})
    assert unknown == {"status": "unknown", "best": [], "unresolved": ["p1", "p2"]}, unknown
    partial = select_best(["p1", "p2"], {"p1": 1, "p2": None})
    assert partial == {"status": "best-known", "best": ["p1"], "unresolved": ["p2"], "optimality": "unresolved"}, partial
    # 失败见证：未知候选可能优于已知最佳，部分未知时不得声称全局最优。
    hidden_cost = {"p1": 1, "p2": 0.5}
    assert select_best(["p1", "p2"], {"p1": 1, "p2": None})["best"] == ["p1"]
    assert min(hidden_cost.values()) < hidden_cost["p1"]
    full_view = select_best(["p1", "p2"], hidden_cost)
    assert full_view == {"status": "optimal", "best": ["p2"], "unresolved": [], "optimality": "established"}, full_view
    record(
        "S06_adaptation_semantics",
        "并列最优全部保留；空候选显式报告无方案；全未知保留未知；部分未知输出 bestKnown 与 unresolved 且最优性未决；见证：未知候选可优于已知最佳。",
        5,
    )
    return {"cases": 5}


def check_s07_boundaries():
    env = {"P": 1, "Q": 0}
    assert evaluate(atom("P"), env) == 1
    assert evaluate(app("Not", atom("P")), env) == 0
    env2 = {"P": 0, "Q": 0}
    assert evaluate(atom("P"), env2) == 0
    assert evaluate(app("Not", atom("P")), env2) == 1
    objects = [valid_node_a(), valid_node_b(), valid_record_a(), valid_record_b()]
    before = digest(objects)
    learner_state = {"mastery": {"n_topological_manifold": 0.2}}
    learner_state["mastery"]["n_topological_manifold"] = 0.9
    assert digest(objects) == before
    assert all(source in NODE_IDS and target in NODE_IDS for source, target in PREREQ)
    edges = set(membership_edges())
    prereq_pairs = set(PREREQ) | {(target, source) for source, target in PREREQ}
    assert not (edges & prereq_pairs)
    aggregates = set(UNITS) | set(TOPICS) | set(SUBDISCIPLINES)
    assert not (aggregates & {x for pair in PREREQ for x in pair})
    record(
        "S07_boundary_witnesses",
        "同语法两赋值见证良构不等于真值；学习状态变动不改变记录与学习节点摘要；成员关系与先修关系分离。",
        3,
    )
    return {"witnesses": 3}


def canonical_snapshot():
    by_size = terms_by_size(5)
    all_terms = [t for bucket in by_size.values() for t in bucket]
    samples = []
    for n in (1, 2, 7, 100):
        lower, upper = darboux_sums_x(uniform_partition(n))
        samples.append([str(lower), str(upper)])
    return {
        "terms": [render(t) for t in all_terms],
        "flat": {key: sorted(value) for key, value in compute_flat().items()},
        "darboux": samples,
        "best": select_best(["p1", "p2", "p3"], {"p1": 2, "p2": 1, "p3": 1}),
        "records": [valid_record_a(), valid_record_b()],
    }


def check_s08_determinism():
    first = canonical_snapshot()
    second = canonical_snapshot()
    assert digest(first) == digest(second)
    record("S08_determinism", "规范化输出的两次运行摘要一致。", 2)
    return {"snapshot": digest(first)}


LINK_RE = re.compile(r"\[[^\]\n]*\]\(([^)\n]+)\)")


def check_s09_document():
    assert NOTE.exists(), "缺少笔记文件：" + str(NOTE)
    text = NOTE.read_text(encoding="utf-8")
    pos = 0
    for word in ("原子", "分子", "节点", "单元", "话题", "子学科"):
        index = text.find(word, pos)
        assert index >= 0, "尺度词序缺少或乱序：" + word
        pos = index + 1
    labels = ["DEF", "PROOF", "REF", "FINITE", "ILLUSTRATION", "NOT-CLAIMED"]
    for label in labels:
        assert label in text, "缺少证据标签：" + label
    for index in range(1, 10):
        marker = "S" + str(index).zfill(2)
        assert marker in text, "缺少核验编号：" + marker
    for anchor in ("拓扑流形", "黎曼积分", "达布", "唯一可读性", "学习节点", "已知最佳", "verify_scale_model.py"):
        assert anchor in text, "缺少关键锚点：" + anchor
    urls = [
        "math.hawaii.edu/~ralph/Classes/619/univ-algebra.pdf",
        "math.toronto.edu/mgualt/courses/MAT1300F-2012/docs/1300-2012-notes-1.html",
    ]
    for url in urls:
        assert url in text, "缺少文献 URL：" + url
    links = 0
    missing = []
    for match in LINK_RE.finditer(text):
        target = match.group(1).strip()
        if re.match(r"^(https?://|mailto:|#)", target):
            continue
        path = target.split("#", 1)[0]
        if not path:
            continue
        if "report-scale-model" in path.lower():
            continue
        links += 1
        if not (NOTE.parent / path).exists():
            missing.append(target)
    assert not missing, "内部链接无法解析：" + "；".join(missing)
    record(
        "S09_document_integrity",
        "尺度词序、{} 类证据标签、S01–S09 编号、{} 条内部链接与 {} 条文献 URL 通过。".format(len(labels), links, len(urls)),
        len(labels) + 9 + links + len(urls),
    )
    return {"links": links}


def main():
    check_s01_grammar()
    check_s02_nodes()
    check_s03_membership()
    check_s04_flattening()
    check_s05_darboux()
    check_s06_adaptation()
    check_s07_boundaries()
    check_s08_determinism()
    check_s09_document()
    CHECKS.sort(key=lambda row: row["id"])
    note_hash = hashlib.sha256(NOTE.read_bytes()).hexdigest()
    script_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    report = {
        "scope": "六级尺度模型的有限实例与文档核验（含分型匹配、非法成员拒绝与未知最优补丁）；不替代一般数学证明、机器证明认证或教学效果实证。",
        "not_claimed": ["一般数学证明", "机器证明认证", "教学效果实证", "无限结构判定", "唯一自然分类"],
        "checks": CHECKS,
        "artifacts_sha256": {"note": note_hash, "script": script_hash},
    }
    (OUT / "report-scale-model.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    lines = [
        "# 六级尺度模型有限核验报告",
        "",
        "执行命令：python mcs-foundations/validation/verify_scale_model.py",
        "",
        "使用 Python 标准库。核验对象为有限夹具与笔记文档一致性；",
        "不替代一般证明、机器证明认证或教学效果实证。",
        "",
        "| 检查 | 状态 | 有限实例数 | 结果 |",
        "|---|---|---:|---|",
    ]
    lines.extend(
        "| {} | {} | {} | {} |".format(row["id"], row["status"], row["instances"], row["detail"])
        for row in CHECKS
    )
    lines += [
        "",
        "笔记 SHA-256：" + note_hash,
        "",
        "脚本 SHA-256：" + script_hash,
        "",
        "详细结果见 [report-scale-model.json](report-scale-model.json)。本报告仅在全部断言通过后写出；失败时进程非零退出。",
        "",
    ]
    (OUT / "REPORT-scale-model.md").write_text("\n".join(lines), encoding="utf-8")
    print(json.dumps({"status": "passed", "checks": len(CHECKS)}, ensure_ascii=False))


if __name__ == "__main__":
    main()

