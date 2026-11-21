r"""Finite model checks for the MCS monograph; Python standard library only.
Run: python mcs-foundations/validation/verify_finite_models.py
This is not a HOL kernel, a complete planner, or empirical cognitive validation.
"""
from __future__ import annotations

import copy
import hashlib
import itertools as it
import json
import re
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "validation"


def stable(x):
    return json.dumps(x, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


def digest(x):
    return hashlib.sha256(stable(x).encode("utf-8")).hexdigest()


def subsets(xs):
    xs = tuple(xs)
    for n in range(len(xs) + 1):
        yield from (frozenset(c) for c in it.combinations(xs, n))


def action(name, ins, outs):
    return {"id": name, "inputs": list(ins), "outputs": list(outs)}


def closure(rules, initial):
    reached = set(initial)
    while True:
        added = {n for a in rules if set(a["inputs"]) <= reached for n in a["outputs"]}
        nxt = reached | added
        if nxt == reached:
            return frozenset(reached)
        reached = nxt


def closure_via_all_closed_sets(rules, initial, universe):
    # Independent semantic oracle: intersection of every closed superset.
    candidates = [
        s for s in subsets(universe)
        if set(initial) <= s
        and all(not set(a["inputs"]) <= s or set(a["outputs"]) <= s for a in rules)
    ]
    return frozenset.intersection(*candidates)


def poset(size, edges):
    r = set(edges) | {(i, i) for i in range(size)}
    changed = True
    while changed:
        extra = {(x, z) for x, y in r for yy, z in r if y == yy}
        changed = not extra <= r
        r |= extra
    if any(x != y and (y, x) in r for x, y in r):
        return None
    return r


def linear_extensions(size, order):
    for p in it.permutations(range(size)):
        loc = {x: i for i, x in enumerate(p)}
        if all(x == y or loc[x] < loc[y] for x, y in order):
            yield p


def valid_words(rules, initial, horizon):
    # Exposes finite action words; repeats are allowed, no infinite search.
    yield ()
    if horizon == 0:
        return
    for a in rules:
        if set(a["inputs"]) <= set(initial):
            for tail in valid_words(rules, set(initial) | set(a["outputs"]), horizon - 1):
                yield (a,) + tail


def routes(rules, initial, goals, horizon, unit_cost=1, budget=None):
    """Enumerate all source assignments and goal producers for these tiny fixtures."""
    initial, goals = frozenset(initial), tuple(sorted(goals))
    for word in valid_words(rules, initial, horizon):
        k = len(word)
        if budget is not None and k * unit_cost > budget:
            continue
        available = initial | {n for a in word for n in a["outputs"]}
        if not set(goals) <= available:
            continue
        slots, alternatives = [], []
        for i, a in enumerate(word):
            for n in sorted(a["inputs"]):
                options = ([-1] if n in initial else []) + [
                    j for j in range(i) if n in word[j]["outputs"]
                ]
                slots.append((i, n))
                alternatives.append(options)
        target_options = [
            ([-1] if n in initial else [])
            + [j for j, a in enumerate(word) if n in a["outputs"]]
            for n in goals
        ]
        for chosen in it.product(*alternatives):
            src = {(i, n): q for (i, n), q in zip(slots, chosen)}
            edges = {(q, i) for (i, _), q in src.items() if q >= 0}
            order = poset(k, edges)
            assert order is not None
            for target in it.product(*target_options):
                yield {
                    "word": word, "sources": src, "targets": dict(zip(goals, target)),
                    "order": order, "initial": initial, "cost": k * unit_cost,
                }


def required(route):
    # Only backward-active events for the chosen target producers count.
    active = {p for p in route["targets"].values() if p >= 0}
    while True:
        more = {q for (p, _), q in route["sources"].items() if p in active and q >= 0}
        if more <= active:
            break
        active |= more
    return frozenset(n for p in active for n in route["word"][p]["inputs"])


def common_required(family):
    reqs = [required(r) for r in family]
    if not reqs:
        return None  # Undefined; not the whole universe.
    return frozenset.intersection(*reqs)


def all_sources_valid(route, extension):
    done = set()
    for i in extension:
        for n in route["word"][i]["inputs"]:
            q = route["sources"][(i, n)]
            if q == -1:
                if n not in route["initial"]:
                    return False
            elif q not in done or n not in route["word"][q]["outputs"]:
                return False
        done.add(i)
    return True


def compose_routes(first, second):
    """Finite port substitution: second after first, including final targets."""
    assert set(first["targets"]) == set(second["initial"])
    offset = len(first["word"])

    def transport(node, source):
        return first["targets"][node] if source == -1 else source + offset

    sources = dict(first["sources"])
    sources.update({
        (event + offset, node): transport(node, source)
        for (event, node), source in second["sources"].items()
    })
    word = first["word"] + second["word"]
    order_edges = (
        set(first["order"])
        | {(x + offset, y + offset) for x, y in second["order"]}
        | {(x, y + offset) for x in range(offset) for y in range(len(second["word"]))}
        | {(q, p) for (p, _), q in sources.items() if q >= 0}
    )
    order = poset(len(word), order_edges)
    assert order is not None
    return {
        "word": word, "sources": sources,
        "targets": {n: transport(n, q) for n, q in second["targets"].items()},
        "order": order, "initial": first["initial"],
        "cost": first["cost"] + second["cost"],
    }


def all_targets_valid(route):
    return all(
        node in route["initial"] if source == -1
        else 0 <= source < len(route["word"]) and node in route["word"][source]["outputs"]
        for node, source in route["targets"].items()
    )


def known_dominates(left, right):
    # Unknown coordinates cannot silently become zero or a worst-case score.
    assert len(left) == len(right)
    if any(x is None or y is None for x, y in zip(left, right)):
        return False
    return all(x <= y for x, y in zip(left, right)) and any(
        x < y for x, y in zip(left, right)
    )


CHECKS = []


def record(name, detail, checks=1):
    CHECKS.append({"id": name, "status": "passed", "instances": checks, "detail": detail})


def finite_checks(core, external, fixture):
    node_ids = set(core["nodes"])
    assert len(node_ids) == len(core["nodes"])
    assert len({a["id"] for a in core["actions"]}) == len(core["actions"])
    assert all(set(a["inputs"]) | set(a["outputs"]) <= node_ids for a in core["actions"])
    # All simple directed Horn rule sets on three nodes, with all backgrounds.
    universe = frozenset("abc")
    edges = [(a, b) for a in sorted(universe) for b in sorted(universe) if a != b]
    instances = 0
    for chosen in subsets(edges):
        rules = [action(x + y, [x], [y]) for x, y in sorted(chosen)]
        for b in subsets(universe):
            c = closure(rules, b)
            assert c == closure_via_all_closed_sets(rules, b, universe)
            assert b <= c and closure(rules, c) == c
            reached_by_words = set(b)
            for word in valid_words(rules, b, 3):
                reached_by_words.update(n for a in word for n in a["outputs"])
            assert reached_by_words == c
            for b2 in subsets(universe):
                if b <= b2:
                    assert c <= closure(rules, b2)
            instances += 1
    record("V01_closure_exhaustive", "64 个规则系统 × 8 个背景：与全部封闭超集的交这一独立语义计算一致；满足单调、幂等及有界可达性。", instances)

    joint = [action("and", ["u", "v"], ["g"]), action("or", ["w"], ["g"])]
    assert not list(routes(joint, {"u"}, {"g"}, 1))
    assert not list(routes(joint, {"v"}, {"g"}, 1))
    assert list(routes(joint, {"u", "v"}, {"g"}, 1))
    assert list(routes(joint, {"w"}, {"g"}, 1))
    both = list(routes(joint, {"u", "v", "w"}, {"g"}, 1))
    assert {required(r) for r in both} == {frozenset({"u", "v"}), frozenset({"w"})}
    assert common_required(both) == frozenset()
    assert not list(routes(joint, set(), {"g"}, 1))
    assert common_required([]) is None
    filtered = [r for r in both if r["word"][0]["id"] == "and"]
    assert common_required(filtered) == frozenset({"u", "v"})
    assert common_required(both) == frozenset()
    record("V02_and_or_prerequisites", "联合输入保持 AND，替代入口保持 OR；空路线族不产生先修；个体筛选不改变公共路线族。", 8)

    # 64 forward-edge DAGs on four events, all their linear extensions.
    total_extensions = 0
    for es in subsets([(i, j) for i in range(4) for j in range(i + 1, 4)]):
        order = poset(4, es)
        assert order is not None
        extensions = set(linear_extensions(4, order))
        assert extensions
        frontier = {next(iter(extensions))}
        reached = set(frontier)
        while frontier:
            new = set()
            for p in frontier:
                for j in range(3):
                    x, y = p[j:j + 2]
                    if (x, y) not in order and (y, x) not in order:
                        q = p[:j] + (y, x) + p[j + 2:]
                        assert q in extensions
                        new.add(q)
            frontier = new - reached
            reached |= new
        assert reached == extensions
        total_extensions += len(extensions)
    assert poset(2, {(0, 1), (1, 0)}) is None
    # D.5: separately acyclic source and policy graphs can form a joint cycle.
    source_edges, policy_edges = {(0, 1)}, {(1, 0)}
    assert poset(2, source_edges) is not None
    assert poset(2, policy_edges) is not None
    assert poset(2, source_edges | policy_edges) is None
    record("V03_event_posets", f"四事件的 64 个按序有向无环图，核验 {total_extensions} 个线性扩张及相邻不可比交换连通性；另核对来源与策略分别无环但合并成环的二事件反例。", 65)

    chain = [action("make_b", ["a"], ["b"]), action("make_c", ["b"], ["c"])]
    family = list(routes(chain, {"a"}, {"c"}, 3))
    for r in family:
        for p in linear_extensions(len(r["word"]), r["order"]):
            assert all_sources_valid(r, p)
    r = next(r for r in family if len(r["word"]) == 2)
    visible = {"c"}
    boundary = required(r) - visible
    assert boundary == frozenset({"a", "b"})
    assert required(r) <= visible | boundary
    assert not required(r) <= visible
    record("V04_boundary_and_sources", "三事件界内全部来源指派尊重每个线性扩张；隐藏 a、b 后两项义务均留在边界。", len(family))

    cyc = [action("ab", ["a"], ["b"]), action("ba", ["b"], ["a"])]
    assert not list(routes(cyc, set(), {"a"}, 4))
    entry = action("entry", [], ["a"])
    assert list(routes([entry] + cyc, set(), {"b"}, 3))
    review = [action("review", ["a"], ["a"])]
    assert [len(w) for w in valid_words(review, {"a"}, 4)] == [0, 1, 2, 3, 4]
    twice = list(routes(review, {"a"}, {"a"}, 2))
    repeated = next(r for r in twice if len(r["word"]) == 2 and r["sources"][(1, "a")] == 0)
    assert (0, 1) in repeated["order"]
    assert len(repeated["word"]) == 2
    assert len({a["outputs"][0] for a in repeated["word"]}) == 1
    assert not list(routes(joint, {"w"}, {"g"}, 1, budget=0))
    record("V05_cycle_repeat_budget", "无入口循环不可执行；独立零输入入口可解除循环；重复访问同一节点保留不同事件；零预算拒绝单位成本行动。", 6)

    kspace = set(subsets("abc")) - {frozenset({"c"})}
    assert all(a | b in kspace for a in kspace for b in kspace)
    assert all(not a or any(a - {x} in kspace for x in a) for a in kspace)
    assert frozenset({"a", "c"}) & frozenset({"b", "c"}) not in kspace
    record("V06_or_knowledge_space", "七状态外部实例并闭且可达，但不交闭，因此不是任何条目偏序的全部下闭集族。", 49)

    universe2 = frozenset({"a", "b"})
    unknown_support = set(subsets(universe2))
    x = frozenset({"a"})
    lifted = {a & x for a in unknown_support}
    assert lifted == {frozenset(), x}
    assert lifted != {x}
    assert {a & frozenset() for a in unknown_support} == {frozenset()}
    assert (False, True) in set(it.product([False, True], repeat=2))  # claim false, belief true
    record("V07_unknown_and_no_reflection", "未知支持不等于已知空集，集合运算遍历可能值；命题可为假而相信它的判断为真。", 4)

    # Simple executable witness, not a lambda-calculus completeness test.
    tc = ("constant", "c")
    e = ("constant", "e")
    padding = ("apply", ("lambda", "z", e), tc)
    occurrences = {padding[1][2][1], padding[2][1]}
    assert "c" in occurrences and padding[1][2] == e
    record("V08_padding_witness", "闭常元出现在未使用实参中，β 结果仍为 e；一般饱和结论由正文证明。")

    before = digest(core)
    forbidden = {"learner_id", "mastery", "confidence", "history", "budget", "misconception_flags", "confirmed"}
    def public_keys(x):
        if isinstance(x, dict):
            assert not forbidden & x.keys()
            for y in x.values():
                public_keys(y)
        elif isinstance(x, list):
            for y in x:
                public_keys(y)
    public_keys(core)
    profiles = {p["id"]: p for p in external["profiles"]}
    group_rules = [a for a in core["actions"] if a["id"].startswith("g_")]
    tensor_rules = [a for a in core["actions"] if a["id"].startswith("t_")]
    expected_group = {"A": "g_perm", "B": "g_sym"}
    expected_tensor = {"A": "t_basis", "B": "t_multilin"}
    derived = {}
    for who in ["A", "B"]:
        s = profiles[who]
        gr = list(routes(group_rules, s["confirmed"], {"Group"}, 1, s["unit_cost"], s["budget"]))
        tr = list(routes(tensor_rules, s["confirmed"], {"TensorField"}, 2, s["unit_cost"], s["budget"]))
        assert {r["word"][0]["id"] for r in gr} == {expected_group[who]}
        assert {r["word"][0]["id"] for r in tr} == {expected_tensor[who]}
        prompts = [p["id"] for p in core["patterns"] if p["id"] in s["misconception_flags"]]
        derived[who] = {
            "group": [[a["id"] for a in r["word"]] for r in gr],
            "tensor": [[a["id"] for a in r["word"]] for r in tr],
            "prompts": prompts,
        }
        assert digest(core) == before
    assert derived["A"]["prompts"] == [] and derived["B"]["prompts"] == ["limit_unreachable"]
    state = copy.deepcopy(profiles["A"])
    for event in ["learn", "forget", "wrong", "correct", "recalibrate"]:
        if event == "learn":
            state["confirmed"].append("Group")
        elif event == "forget":
            state["confirmed"].remove("Perm")
        elif event == "wrong":
            state["misconception_flags"].append("limit_unreachable")
        elif event == "correct":
            state["misconception_flags"].remove("limit_unreachable")
        else:
            state["model_version"] = "synthetic-recalibrated/2"
        assert digest(core) == before
    cold = profiles["Cold"]
    assert cold["unknown"] == "all-public-nodes"
    assert not list(routes(group_rules, cold["confirmed"], {"Group"}, 1))
    conditional = [
        {"action": a["id"], "assumed_entry": a["inputs"], "status": "Conditional"}
        for a in group_rules
    ]
    assert len(conditional) == 3 and cold["confirmed"] == []
    record("V09_external_noninterference", "旧合成快照的确认集决定群/张量结构入口，预算及单位成本参与筛选，诊断标记产生极限提示；学习、遗忘、答错、纠正及重校准不改变本体哈希；冷启动保留未知。", 9)

    request = next(r for r in fixture["requests"] if r["id"] == "combined")
    replay = dict(M=before, L=digest(fixture["L"]), record=fixture["events"][:request["prefix"]],
                  context=request["context"], extensions=[fixture["packages"][k] for k in request["enabled"]],
                  algorithm={"version": "finite-entry/1", "horizon": 1}, seed=0)
    key = digest(replay)
    assert key == digest(copy.deepcopy(replay))
    for field, value in dict(M="m2", L="l2", record=[], context={"goal": "TensorField"},
                             extensions=[], algorithm={"horizon": 2}, seed=1).items():
        assert key != digest({**replay, field: value})
    for field, value in dict(budget=0, preference="g_perm").items():
        changed = copy.deepcopy(replay)
        changed["context"][field] = value
        assert key != digest(changed)
    for field, value in dict(version="2", state={"g_perm": 3}).items():
        changed = copy.deepcopy(replay)
        changed["extensions"][0][field] = value
        assert key != digest(changed)
    costs = [(2, 1), (1, 2), (3, 3), (0, None)]
    frontier = [x for x in costs if not any(known_dominates(y, x) for y in costs)]
    assert frontier == [(2, 1), (1, 2), (0, None)]
    assert not known_dominates((0, None), (3, 3))
    assert not known_dominates((3, 3), (0, None))
    record("V10_explicit_inputs_and_pareto", "改变公共版本、事件前缀、上下文、扩展版本或状态、算法参数及种子均改变复现键；未知成本保留为不可比较候选，不用默认数值支配。", 15)
    # All families of nonempty blocks on a three-element domain.
    # Check adjunction directly for every pair of subsets, independently of
    # the closure proof in the text.
    block_options = [s for s in subsets("abc") if s]
    adjunction_instances = 0
    for family in subsets(range(len(block_options))):
        block = {i: block_options[i] for i in family}
        beta = lambda j: frozenset().union(*(block[i] for i in j))
        gamma = lambda a: frozenset(i for i in family if block[i] <= a)
        for j in subsets(family):
            assert j <= gamma(beta(j))
            assert gamma(beta(gamma(beta(j)))) == gamma(beta(j))
            for a in subsets("abc"):
                assert (beta(j) <= a) == (j <= gamma(a))
                assert beta(gamma(a)) <= a
                assert beta(gamma(beta(gamma(a)))) == beta(gamma(a))
                adjunction_instances += 1
    record("V12_aggregation_adjunction", "三元素域上的全部 128 个非空块子族选择，穷尽检查展开/完整块选择的伴随及闭包、内部算子的幂等性。", adjunction_instances)

    # Right identity exposes the old omission: a target port may reference
    # the intermediate background even when there are no second-route events.
    identity = lambda nodes: next(routes([], set(nodes), set(nodes), 0))
    ab = next(routes([action("ab", ["a"], ["b"])], {"a"}, {"b"}, 1))
    bc = next(routes([action("bc", ["b"], ["c"])], {"b"}, {"c"}, 1))
    cd = next(routes([action("cd", ["c"], ["d"])], {"c"}, {"d"}, 1))
    assert compose_routes(ab, identity({"b"})) == ab
    assert compose_routes(identity({"a"}), ab) == ab
    composite = compose_routes(compose_routes(ab, bc), cd)
    assert composite == compose_routes(ab, compose_routes(bc, cd))
    assert all_targets_valid(composite)
    assert all(all_sources_valid(composite, e) for e in linear_extensions(3, composite["order"]))
    broken = copy.deepcopy(ab)
    broken["targets"] = {"b": -1}
    assert not all_targets_valid(broken)
    passthrough = next(routes([action("ab", ["a"], ["b"])], {"a", "z"}, {"b", "z"}, 1))
    assert compose_routes(passthrough, identity({"b", "z"})) == passthrough
    assert all_targets_valid(passthrough)
    independent = next(routes([action("new_c", [], ["c"])], {"b"}, {"c"}, 1))
    sequential = compose_routes(ab, independent)
    assert (0, 1) in sequential["order"] and sequential["sources"] == {(0, "a"): -1}
    assert set(linear_extensions(2, sequential["order"])) == {(0, 1)}
    record("V13_route_port_substitution", "顺序复合同时替换事件输入与最终目标端口；核验左右单位、三路结合、背景透传及无资源依赖时的顺序约束，并拒绝悬空中间目标的旧反例。", 10)

    # Non-injective transport merges two distinct resource slots. One source
    # must be selected; preserving both source obligations would be incorrect.
    fork = [action("make_u", [], ["u"]), action("make_v", [], ["v"]),
            action("join", ["u", "v"], ["g"])]
    source_route = next(r for r in routes(fork, set(), {"g"}, 3)
                        if tuple(a["id"] for a in r["word"]) == ("make_u", "make_v", "join"))
    rename = {"u": "x", "v": "x", "g": "g"}
    mapped_word = tuple(action(a["id"], sorted({rename[n] for n in a["inputs"]}),
                               sorted({rename[n] for n in a["outputs"]})) for a in source_route["word"])
    assert len(source_route["sources"]) == 2 and mapped_word[2]["inputs"] == ["x"]
    mapped = dict(source_route, word=mapped_word, sources={(2, "x"): 0}, order=poset(3, {(0, 2)}))
    assert (1, 2) in source_route["order"] and (1, 2) not in mapped["order"]
    assert mapped["order"] <= source_route["order"]
    assert all(all_sources_valid(mapped, e) for e in linear_extensions(3, mapped["order"]))
    assert all_targets_valid(mapped)
    record("V14_noninjective_route_transport", "两个不同输入合并为同一节点时须选一个合法生产者；输送后依赖为原图子图，不能宣称保留全部原依赖。", 5)

    transition = {"E1": {"a": 1, "b": 1}, "E2": {"a": 1, "b": 0}}
    for horizon in range(5):
        assert [transition["E1"]["a"]] * horizon == [transition["E2"]["a"]] * horizon
    assert transition["E1"]["b"] != transition["E2"]["b"]
    record("V15_observational_nonidentification", "两个确定模型在长度0至4的纯a记录上一致，在未试行动b上预测相反；见正文反例16.1的一般论证。", 6)

    # Same-carrier semantic oracle for §6.5: direction is part of the relation.
    # This is a finite extensional check, not a proof-certificate checker.
    carriers = tuple(subsets(range(3)))
    expansion = {(a, b) for a in carriers for b in carriers if a <= b}
    restriction = {(b, a) for a, b in expansion}
    assert restriction == {(a, b) for a in carriers for b in carriers if b <= a}
    for direction in (expansion, restriction):
        assert all((a, a) in direction for a in carriers)
        assert all((a, c) in direction for a, b in direction
                   for middle, c in direction if b == middle)
    small, large = frozenset({0}), frozenset({0, 1})
    assert (small, large) in expansion and (large, small) in restriction
    assert (large, small) not in expansion  # Reverse reading is no reverse implication.
    other = frozenset({1})
    unlabelled = expansion | restriction
    assert (small, large) in unlabelled and (large, other) in unlabelled
    assert (small, other) not in unlabelled  # Mixed directions need not compose.
    assert {target for source, target in restriction if source == large} >= {small, other}
    forget = {"structure-1": "carrier", "structure-2": "carrier"}
    assert len(set(forget.values())) < len(forget)  # A structure map need not invert.
    record("V16_scaling_directions", "三元素载体的 8 个子集：放/缩切片互为逆关系且各自为预序；严格包含不反转蕴含，混合方向不保证传递，缩方向可多值，遗忘映射不保证可逆。", len(carriers) ** 2)
    return {"core_sha256": before, "profiles": derived, "cold_start": conditional}


def project_record(events, references):
    """Replay one ordered, synthetic log. Resolve each anchor at its exact version."""
    availability = {ref: "Unspecified" for ref in references}
    seen, viewed, observations, unresolved = {}, [], [], []
    for event in events:
        event_id = event["id"]
        if event_id in seen:
            if event != seen[event_id]:
                raise ValueError(f"conflicting event {event_id}")
            continue
        seen[event_id] = event
        target = event["target"]
        ref = (target["layer"], target["version"], target["id"])
        if ref not in availability:
            unresolved.append(event_id)
        elif event["kind"] == "confirmation":
            assert type(event["payload"]) is bool
            availability[ref] = "Available" if event["payload"] else "Unknown"
        elif event["kind"] == "view":
            viewed.append(event_id)
        elif event["kind"] == "answer":
            observations.append(event)
    return availability, viewed, observations, unresolved


def example_fragment(output_kinds, selected, state):
    """Synthetic package rules; all learner and context reads are explicit."""
    values = {}
    if "constraint" in output_kinds:
        budget = selected["Ctx.budget"]
        values["constraint"] = {action: None if budget is None else minutes <= budget
                                for action, minutes in state.items()}
    if "ranking" in output_kinds:
        values["ranking"] = selected["Ctx.preference"]
    if "prediction" in output_kinds:
        evidence = [e["id"] for e in selected["Rec.observations"]
                    if e["payload"] == "这两个操作总可交换"]
        values["prediction"] = "交换性可能误用" if evidence else None
        if evidence:
            values.update(question="能举出两个不交换的置换吗？", annotation=evidence,
                          eventProposal={"kind": "evaluation", "evidence": evidence})
    return values


def entry_results(core, fixture, request):
    """Only the three one-event Group entry contracts. Costs are synthetic minutes."""
    assert fixture["M"] == core["version"]
    references = {("M", core["version"], node) for node in core["nodes"]}
    references.update(("L", fixture["L"]["version"], task) for task in fixture["L"]["tasks"])
    prefix = fixture["events"][:request["prefix"]]
    available, viewed, observations, unresolved = project_record(prefix, references)
    background = {ref[2] for ref, value in available.items() if ref[0] == "M" and value == "Available"}
    ctx = request["context"]
    rules = [a for a in core["actions"] if a["id"].startswith("g_")]
    found = sorted(r["word"][0]["id"] for r in routes(rules, background, {ctx["goal"]}, 1))
    conditional = {a["id"]: sorted(set(a["inputs"]) - background)
                   for a in rules if ctx["goal"] in a["outputs"] and a["id"] not in found}
    # Apply the example fragments only to the confirmed family; retain conditional witnesses.
    inputs = {"Ctx.budget": ctx.get("budget"), "Ctx.preference": ctx.get("preference"),
              "Rec.observations": observations}
    fragments = []
    namespaces = set()
    output_kinds = {"constraint", "ranking", "prediction", "question", "annotation", "eventProposal"}
    for key in request["enabled"]:
        package = fixture["packages"][key]
        selected = {name: copy.deepcopy(inputs[name]) for name in package["readSet"]}
        namespace = package["namespace"]
        if namespace in namespaces or key != package["id"]:
            raise ValueError(f"ambiguous extension identity: {key}, {namespace}")
        namespaces.add(namespace)
        if not set(package["outputKinds"]) <= output_kinds:
            raise ValueError(f"unsupported output kind for {key}")
        state = copy.deepcopy(package["state"])
        values = example_fragment(package["outputKinds"], selected, state)
        assert values.keys() <= set(package["outputKinds"])
        # Evaluate returned rules here. The adapter never receives the learner's candidate list.
        if "constraint" in values:
            allowed = values["constraint"]
            values["constraint"] = {action: allowed.get(action) for action in found}
        if values.get("ranking") is not None:
            preferred = values["ranking"]
            values["ranking"] = sorted(found, key=lambda action: action != preferred)
        fragments.append({"namespace": namespace, "id": key, "version": package["version"],
                          "inputSnapshot": digest([selected, state, found]), "evidence": package["evidence"],
                          "generatedAt": "2026-01-01T01:00:00Z", "values": values})
    gates = [f["values"]["constraint"] for f in fragments if "constraint" in f["values"]]
    passed, pending = [], []
    for a in found:
        verdicts = [gate[a] for gate in gates]
        if False not in verdicts:
            (pending if None in verdicts else passed).append(a)
    rankings = {f["namespace"]: [a for a in f["values"]["ranking"] if a in passed]
                for f in fragments if f["values"].get("ranking") is not None}
    return dict(base=found, conditional=conditional, passed=passed, pending=pending,
                rankings=rankings, fragments=fragments, viewed=viewed,
                observed=[e["id"] for e in observations], unresolved=unresolved)


def check_learner_layers(core, legacy, fixture, legacy_results):
    snapshot = digest([core, fixture, legacy])
    requests = {request["id"]: request for request in fixture["requests"]}
    results = {name: entry_results(core, fixture, req) for name, req in requests.items()}
    both = ["g_perm", "g_sym"]
    assert results["empty"]["base"] == []
    assert results["empty"]["conditional"] == {"g_perm": ["Perm"], "g_sym": ["Sym"], "g_units": ["Unit5"]}
    assert results["only-declarations"]["base"] == both
    assert results["observations"]["base"] == both and results["observations"]["observed"] == ["e4"]
    assert results["observations"]["viewed"] == ["e3"]
    assert results["unknown-entry"]["base"] == ["g_sym"]
    ref = ("M", fixture["M"], "Perm")
    events = fixture["events"]
    assert project_record([], [ref])[0][ref] == "Unspecified"
    assert project_record(events[:1], [ref])[0][ref] == "Available"
    assert project_record(events, [ref])[0][ref] == "Unknown"
    renewed = {**events[0], "id": "reconfirmed", "time": "2026-01-01T00:05:00Z"}
    assert project_record([*events, renewed], [ref])[0][ref] == "Available"
    assert project_record(events[:1] * 2, [ref]) == project_record(events[:1], [ref])
    try:
        project_record([events[0], {**events[0], "payload": False}], [ref])
    except ValueError:
        pass
    else:
        raise AssertionError("conflicting event ID accepted")
    assert project_record(events[:1], [("M", "new-version", "Perm")])[3] == ["e1"]
    assert results["options-off"] == results["observations"]
    assert results["budget"]["passed"] == ["g_perm"]
    assert not results["zero-budget"]["passed"] and not results["zero-budget"]["pending"]
    no_budget = {**requests["budget"], "context": {"goal": "Group"}}
    assert entry_results(core, fixture, no_budget)["pending"] == both
    assert results["unknown-cost"]["pending"] == ["g_sym"]
    assert results["preference"]["rankings"] == {"example.order": list(reversed(both))}
    assert results["preference"]["passed"] == results["diagnosis"]["passed"] == both
    assert results["diagnosis"]["fragments"][0]["values"]["eventProposal"]["evidence"] == ["e4"]
    assert results["no-evidence"]["fragments"][0]["values"] == {"prediction": None}
    assert results["combined"]["rankings"] == {"example.order": ["g_perm"]}
    assert entry_results(core, fixture, {**requests["combined"], "enabled": []}) == results["options-off"]
    assert entry_results(core, fixture, requests["combined"]) == results["combined"]

    # Import only what each legacy snapshot actually declares. Import order/time
    # are synthetic audit metadata; they do not reconstruct the learner's history.
    for p in legacy["profiles"]:
        ids = p["confirmed"]
        unknown = set(core["nodes"]) - set(ids) if p.get("unknown") == "all-public-nodes" else set()
        imported = []
        for n in [*ids, *sorted(unknown)]:
            imported.append({"id": f"import:{p['id']}:{n}", "kind": "confirmation",
                             "target": {"layer": "M", "version": fixture["M"], "id": n},
                             "time": "2026-01-01T00:00:00Z", "source": "legacy-fixture-import",
                             "basis": legacy["model"], "payload": n in ids})
        refs = [("M", fixture["M"], n) for n in core["nodes"]]
        available = project_record(imported, refs)[0]
        background = {ref[2] for ref in refs if available[ref] == "Available"}
        assert background == set(ids)
        if unknown:
            assert {ref[2] for ref in refs if available[ref] == "Unknown"} == unknown
        context = {"budget": p["budget"]}
        cost_state = {"unit": p["unit_cost"]}
        diagnosis = p["misconception_flags"]
        for key, goal, horizon, prefix in [("group", "Group", 1, "g_"), ("tensor", "TensorField", 2, "t_")]:
            rules = [a for a in core["actions"] if a["id"].startswith(prefix)]
            migrated = [[a["id"] for a in route["word"]]
                        for route in routes(rules, background, {goal}, horizon)
                        if len(route["word"]) * cost_state["unit"] <= context["budget"]]
            if p["id"] in legacy_results:
                assert migrated == legacy_results[p["id"]][key]
                assert diagnosis == legacy_results[p["id"]]["prompts"]
            else:
                assert not migrated and diagnosis == "unknown"
    assert snapshot == digest([core, fixture, legacy])
    record("V17_learner_layers", "分层请求的结构入口、待确认来源、事件重放与冲突、版本隔离、预算与未知、排序、诊断提议、停用回放及旧夹具迁移。", len(requests))
    return results


def document_checks():
    md = sorted(ROOT.glob("*.md")) + sorted((ROOT / "cases").glob("*.md"))
    entries, duplicates, missing_links = [], [], []
    for file in md:
        text = file.read_text(encoding="utf-8")
        seen = set()
        for number, line in enumerate(text.splitlines(), 1):
            match = re.match(
                r"^(?:\*\*|#{2,4}\s+)(定义|命题|定理|引理|推论|反例|例|算法|契约|边界声明|边界|引用事实|验收|约定)\s+(\d+\.\d+|[A-Z]\.[0-9]+)(.*)",
                line,
            )
            if match:
                kind, ident, title = match.groups()
                if ident in seen:
                    duplicates.append(f"{file.name}:{ident}")
                seen.add(ident)
                entries.append((file.name, number, kind, ident, title.strip("* ：。")))
        # Link existence, not external HTTP availability.
        for match in re.finditer(r"\[[^\]\n]*\]\((<[^>]+>|[^)\n]+)\)", text):
            target = match.group(1).strip("<>")
            if re.match(r"^(https?://|mailto:|#)", target):
                continue
            target = unquote(target.split("#", 1)[0])
            if target and not (file.parent / target).exists():
                missing_links.append(f"{file.name} -> {target}")
    assert not duplicates, duplicates
    assert not missing_links, missing_links
    loc = (ROOT / "11-局部化36方案.md").read_text(encoding="utf-8")
    labels = set(re.findall(r"LC(\d{2})", loc))
    assert labels == {f"{n:02d}" for n in range(1, 37)}, labels
    assert len(list((ROOT / "cases").glob("*.md"))) == 4
    templates = (ROOT / "10-节点模板.md").read_text(encoding="utf-8")
    role_templates = re.findall(r"^## 10\.(\d+)\s+.*模板$", templates, re.M)
    assert set(map(int, role_templates)) == set(range(2, 15))
    assert not any("plan1.md" in p.read_text(encoding="utf-8") for p in md)
    record("V11_document_integrity", f"{len(md)} 篇正文文档：本地链接、编号唯一性、LC01–LC36、13 类模板及四篇案例均通过检查。", len(md))

    rows = [
        "# A　定义、定理与反例索引",
        "",
        "由 validation/verify_finite_models.py 按正文编号生成。索引列出定义及声明位置，不把“被索引”视为已经证明或机器认证；证据状态见第 15 章。",
        "",
        "| 编号 | 种类 | 标题/内容 | 文档 |",
        "|---|---|---|---|",
    ]
    for name, line, kind, ident, title in entries:
        # Do not let a LaTeX \) close the Chinese title, or slice a formula
        # in an untitled statement merely to shorten the generated index.
        label = re.match(r"（([^）]+)）", title)
        if label is None:
            label = re.match(r"\(([^()]*)\)", title)
        short = label.group(1) if label else f"{kind} {ident}（无独立标题；见正文）"
        short = short.replace("|", r"\|")
        rows.append(f"| {ident} | {kind} | {short} | [{name[:-3]}]({name})，第 {line} 行 |")
    rows += [
        "", "36 个局部化方案用 LC01–LC36 独立编号，见 [第 11 章](11-局部化36方案.md)。",
        "四组案例的节点/行动标识是案例内局部标识，不与章节定理编号合并。", "",
    ]
    (ROOT / "A-定义与定理索引.md").write_text("\n".join(rows), encoding="utf-8")
    return {"manuscript_files": len(md), "indexed_statements": len(entries), "localization_schemes": len(labels)}


def main():
    core = json.loads((OUT / "fixtures/core.json").read_text(encoding="utf-8"))
    external = json.loads((OUT / "fixtures/external.json").read_text(encoding="utf-8"))
    fixture = json.loads((OUT / "fixtures/learner-layers.json").read_text(encoding="utf-8"))
    data = finite_checks(core, external, fixture)
    data["layered_examples"] = check_learner_layers(core, external, fixture, data["profiles"])
    documents = document_checks()
    CHECKS.sort(key=lambda r: r["id"])
    manuscript_hashes = {
        str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
        for p in sorted(ROOT.glob("*.md")) + sorted((ROOT / "cases").glob("*.md"))
    }
    report = {
        "scope": "Legacy structural regression, layered synthetic learner examples and current document integrity; five-scale M/L validation is in verify_scale_model.py.",
        "not_claimed": ["HOL machine proof", "empirical effectiveness", "unbounded planning decidability"],
        "checks": CHECKS, "results": data, "documents": documents,
        "manuscript_sha256": manuscript_hashes,
        "fixture_sha256": {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
                           for p in sorted((OUT / "fixtures").glob("*.json"))},
    }
    (OUT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    lines = [
        "# 有限模型与文档核验报告", "",
        "执行命令：python E:\\MCS\\mcs-foundations\\validation\\verify_finite_models.py",
        "",
        "使用 Python 标准库。V09 保留旧快照对照，V10 与 V17 使用分层夹具，正文索引按本次修订生成；五级 M/L 准入另由 verify_scale_model.py 检查。以下结果验证有限实例与文档完整性；不替代正文一般证明、HOL 内核认证或认知实证。",
        "",
        "| 检查 | 状态 | 有限实例数 | 结果 |", "|---|---|---:|---|",
    ]
    lines.extend(f'| {r["id"]} | {r["status"]} | {r["instances"]} | {r["detail"]} |' for r in CHECKS)
    lines += [
        "", "公共模型 SHA-256：" + data["core_sha256"],
        "", f'索引条目：{documents["indexed_statements"]}；局部化方案：36；贯通案例：4。',
        "", "详细结果及两名合成学习者的派生路线见 [report.json](report.json)。",
        "本报告仅在所有断言通过后写出；失败时进程非零退出。", "",
    ]
    (OUT / "REPORT.md").write_text("\n".join(lines), encoding="utf-8")
    print(json.dumps({"status": "passed", "checks": len(CHECKS), **documents}, ensure_ascii=False))


if __name__ == "__main__":
    main()
