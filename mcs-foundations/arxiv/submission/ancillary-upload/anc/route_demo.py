"""Finite, persistent-resource route checker for the accompanying paper.

Standard library only. Registered reviewed proofs are explicit trust inputs;
they are never relabelled as machine-checked mathematical proofs.
"""
from dataclasses import dataclass, asdict, replace
from itertools import product, permutations
import copy
import hashlib
import json


class InvalidRoute(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise InvalidRoute(message)


@dataclass(frozen=True)
class Resource:
    node: str
    version: str = "1"
    theory: str = "ZFC-real-analysis/1"
    kind: str = "content"
    assumptions: tuple = ("a-is-an-accumulation-point-of-D",)


@dataclass(frozen=True)
class Action:
    name: str
    inputs: tuple
    outputs: tuple
    evidence: str
    cost: int = 1


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True,
                                    separators=(",", ":")).encode()).hexdigest()


def snapshot(actions):
    return digest([asdict(a) for a in actions.values()])


def resolve(ref, background, events, actions):
    require(isinstance(ref, (tuple, list)) and len(ref) == 2, "invalid source reference")
    owner, port = ref
    require(type(port) is int and port >= 0, "invalid source port")
    if owner == "B":
        require(port < len(background), "missing background port")
        return background[port]
    require(type(owner) is int and 0 <= owner < len(events), "missing producer event")
    out = actions[events[owner]].outputs
    require(port < len(out), "missing output port")
    return out[port]


def linearizations(n, edges):
    for order in permutations(range(n)):
        position = {p: i for i, p in enumerate(order)}
        if all(position[a] < position[b] for a, b in edges):
            yield order


def verify(actions, background, goal, route, budget, availability):
    before = snapshot(actions)
    events = route["events"]
    require(all(name in actions for name in events), "unregistered action")
    require(len(route["sources"]) == len(events), "missing event source list")
    require(len(availability) == len(background), "incomplete external availability")
    require(all(x is None or type(x) is bool for x in availability), "invalid availability")
    edges = set()
    used_background = set()
    for p, name in enumerate(events):
        a = actions[name]
        require(bool(a.evidence), "missing local contract evidence")
        require(len(route["sources"][p]) == len(a.inputs), "wrong input arity")
        for need, ref in zip(a.inputs, route["sources"][p]):
            have = resolve(ref, background, events, actions)
            require(have == need, "resource kind, theory, assumptions, node or version mismatch")
            if ref[0] == "B":
                used_background.add(ref[1])
            else:
                edges.add((ref[0], p))
    require(len(route["goals"]) == len(goal), "missing goal provenance")
    for need, ref in zip(goal, route["goals"]):
        require(resolve(ref, background, events, actions) == need, "goal resource mismatch")
        if ref[0] == "B":
            used_background.add(ref[1])
    for a, b in route.get("policy", []):
        require(type(a) is int and type(b) is int and
                0 <= a < len(events) and 0 <= b < len(events), "invalid policy endpoint")
        edges.add((a, b))
    orders = list(linearizations(len(events), edges))
    require(bool(orders), "combined source and policy graph is cyclic")
    require(sum(actions[e].cost for e in events) <= budget, "budget exceeded")
    require(not any(availability[i] is False for i in used_background), "unavailable external entry")
    status = "Conditional" if any(availability[i] is None for i in used_background) else "Found"
    require(snapshot(actions) == before, "public contracts changed")
    return {"status": status, "orders": [list(o) for o in orders],
            "edges": sorted(edges), "used_background": sorted(used_background),
            "public_sha256": before, "teaching_success": "NOT-CLAIMED"}


def search(actions, background, goal, horizon, budget, availability):
    """All words and all compatible earlier input/goal sources in this fragment.

    This executable uses no added policy edges or dynamic learner transitions.
    It enumerates source-certified event routes, not the full paper interface.
    """
    rows = []
    candidates = 0
    for n in range(horizon + 1):
        for word in product(actions, repeat=n):
            candidates += 1
            if sum(actions[a].cost for a in word) > budget:
                continue
            prior = [(("B", i), r) for i, r in enumerate(background)]
            choices, counts = [], []
            for p, name in enumerate(word):
                counts.append(len(actions[name].inputs))
                for need in actions[name].inputs:
                    choices.append([ref for ref, resource in prior if resource == need])
                prior += [((p, i), r) for i, r in enumerate(actions[name].outputs)]
            goal_choices = [[ref for ref, r in prior if r == need] for need in goal]
            for picked in product(*(choices + goal_choices)):
                sources, pos = [], 0
                for count in counts:
                    sources.append(list(picked[pos:pos + count]))
                    pos += count
                route = {"events": list(word), "sources": sources,
                         "goals": list(picked[pos:]), "policy": []}
                try:
                    result = verify(actions, background, goal, route, budget, availability)
                except InvalidRoute:
                    continue
                rows.append({"route": route, "check": result})
    return {"action_words": candidates, "routes": rows,
            "status": "Found" if any(r["check"]["status"] == "Found" for r in rows)
            else "Conditional" if rows else "InfeasibleWithinBound"}


def view_boundary(actions, background, goal, route, visible):
    needed = set(goal)
    for p, name in enumerate(route["events"]):
        for ref in route["sources"][p]:
            needed.add(resolve(ref, background, route["events"], actions))
    return {r for r in needed if r.node not in visible}


def check_view(actions, background, goal, route, visible, boundary):
    require(view_boundary(actions, background, goal, route, visible) <= set(boundary),
            "hidden obligation missing from boundary")


def encode_graph(actions):
    # A fair baseline retains every resource field and the same evidence reference.
    return {"action_nodes": [{"id": a.name, "cost": a.cost, "evidence": a.evidence}
                             for a in actions.values()],
            "ports": [{"action": a.name, "direction": direction, "index": i,
                       "resource": asdict(r)}
                      for a in actions.values()
                      for direction, values in [("in", a.inputs), ("out", a.outputs)]
                      for i, r in enumerate(values)]}


def decode_graph(graph):
    result = {}
    for a in graph["action_nodes"]:
        io = []
        for direction in ["in", "out"]:
            ports = sorted((p for p in graph["ports"] if p["action"] == a["id"]
                            and p["direction"] == direction), key=lambda p: p["index"])
            require([p["index"] for p in ports] == list(range(len(ports))), "noncontiguous ports")
            rs = []
            for p in ports:
                value = dict(p["resource"])
                value["assumptions"] = tuple(value["assumptions"])
                rs.append(Resource(**value))
            io.append(tuple(rs))
        require(a["id"] not in result, "duplicate graph action")
        result[a["id"]] = Action(a["id"], io[0], io[1], a["evidence"], a["cost"])
    return result


def fixture():
    metric, quant, sequence = [Resource(n) for n in ["Metric", "Quantifiers", "Sequences"]]
    ed, seq = Resource("LimitED"), Resource("LimitSeq")
    bridge = Resource("Bridge", kind="reviewed-proof")
    shown = replace(bridge, kind="content")
    actions = {
        "define_ed": Action("define_ed", (metric, quant), (ed,),
                            "paper:limit-definitions; presentation contract"),
        "define_seq": Action("define_seq", (metric, sequence), (seq,),
                             "paper:limit-definitions; presentation contract"),
        "bridge": Action("bridge", (ed, seq), (bridge,),
                         "paper:limit-bridge; written mathematical proof, not machine checked"),
        "show_bridge": Action("show_bridge", (), (shown,),
                              "presentation of the bridge statement only"),
    }
    return actions, (metric, quant, sequence), (bridge,)


def independent_execute(actions, background, goal, route, order):
    """Check each linearization by resource accumulation, without source references."""
    available = set(background)
    for p in order:
        a = actions[route["events"][p]]
        require(set(a.inputs) <= available, "independent schedule lacks a resource")
        available.update(a.outputs)
    require(set(goal) <= available, "independent schedule misses the goal")


def run(checked_receipt=None):
    actions, background, goal = fixture()
    before = snapshot(actions)
    replay = search(actions, background, goal, 3, 3, [True, True, True])
    require(len(replay["routes"]) == 2, "expected the two bridge event orders")
    valid = next(r["route"] for r in replay["routes"] if r["route"]["events"][0] == "define_ed")
    verified_orders = 0
    for row in replay["routes"]:
        for order in row["check"]["orders"]:
            independent_execute(actions, background, goal, row["route"], order)
            verified_orders += 1
    visible = {"Bridge"}
    boundary = view_boundary(actions, background, goal, valid, visible)
    check_view(actions, background, goal, valid, visible, boundary)
    negatives = []

    def rejected(name, fn):
        try:
            fn()
        except InvalidRoute as e:
            negatives.append({"name": name, "reason": str(e)})
        else:
            raise AssertionError("negative accepted: " + name)

    for field, value in [("version", "0"), ("theory", "other-theory"),
                         ("assumptions", ()), ("kind", "learner-belief")]:
        bad = list(background)
        bad[0] = replace(bad[0], **{field: value})
        rejected("entry_" + field, lambda bad=bad: verify(actions, bad, goal, valid, 3, [True]*3))
    shown_route = {"events": ["show_bridge"], "sources": [[]], "goals": [(0, 0)], "policy": []}
    rejected("presentation_as_proof", lambda: verify(actions, background, goal, shown_route, 3, [True]*3))
    cyclic = copy.deepcopy(valid); cyclic["policy"] = [(2, 0)]
    rejected("combined_cycle", lambda: verify(actions, background, goal, cyclic, 3, [True]*3))
    wrong_goal = copy.deepcopy(valid); wrong_goal["goals"] = [(9, 0)]
    rejected("dangling_goal", lambda: verify(actions, background, goal, wrong_goal, 3, [True]*3))
    lost_input = copy.deepcopy(valid); lost_input["sources"][0] = []
    rejected("missing_input_port", lambda: verify(actions, background, goal, lost_input, 3, [True]*3))
    rejected("budget", lambda: verify(actions, background, goal, valid, 2, [True]*3))
    rejected("unavailable_entry", lambda: verify(actions, background, goal, valid, 3, [True, False, True]))
    rejected("hidden_boundary", lambda: check_view(actions, background, goal, valid, visible, set()))
    conditional = verify(actions, background, goal, valid, 3, [True, None, True])
    require(conditional["status"] == "Conditional", "unknown entry silently confirmed")
    cold = search(actions, background, goal, 3, 3, [None]*3)
    require(cold["status"] == "Conditional", "cold start lost uncertainty")
    profiles = {}
    for person, available, first in [("A", [True, True, None], "define_ed"),
                                      ("B", [True, None, True], "define_seq")]:
        choices = search(actions, background, goal, 3, 3, available)
        chosen = next(row for row in choices["routes"] if row["route"]["events"][0] == first)
        profiles[person] = {"availability": available, "stipulated_first_action": first,
                            "selected_route": chosen["route"], "status": chosen["check"]["status"]}
    encoded = json.loads(json.dumps(encode_graph(actions)))
    decoded = decode_graph(encoded)
    require(actions == decoded, "annotated graph round-trip changed contracts")
    graph_rows = search(decoded, background, goal, 3, 3, [True]*3)
    require(graph_rows == replay, "enhanced graph disagrees")
    # Repeating an action remains a distinct event; no node-based deduplication.
    repeated = {"events": ["define_ed", "define_ed"],
                "sources": [[("B", 0), ("B", 1)], [("B", 0), ("B", 1)]],
                "goals": [(1, 0)], "policy": [(0, 1)]}
    verify(actions, background, (Resource("LimitED"),), repeated, 2, [True]*3)
    require(snapshot(actions) == before, "learner or view operations mutated M")
    scale = []
    for horizon in range(5):
        result = search(actions, background, goal, horizon, horizon, [True]*3)
        scale.append({"horizon": horizon, "action_words": result["action_words"],
                      "source_certified_routes": len(result["routes"]), "status": result["status"]})
    checked_route = None
    if checked_receipt is not None:
        require(checked_receipt["status"] == "passed" and checked_receipt["unconditional"],
                "the supplied constant-value receipt was not accepted unconditionally")
        cert = checked_receipt["certificate"]
        resource = Resource("ConstantValue", theory=cert["theory_sha256"],
                            kind="checked-proof", assumptions=())
        action = Action("constant_value", (), (resource,),
                        "accepted action receipt sha256:" + digest(checked_receipt))
        route = {"events": ["constant_value"], "sources": [[]], "goals": [(0, 0)], "policy": []}
        checked_route = {"resource": asdict(resource), "receipt_sha256": digest(checked_receipt),
                         "route": route,
                         "check": verify({action.name: action}, (), (resource,), route, 1, [])}
    return {"status": "passed", "scope": "finite persistent-resource presentation/reviewed-proof fragment",
            "synthetic_learner_states": True, "background": [asdict(r) for r in background],
            "goal": [asdict(r) for r in goal], "public_sha256": before,
            "horizon": 3, "budget": 3, "action_words": replay["action_words"],
            "source_certified_routes": len(replay["routes"]), "independent_schedule_checks": verified_orders,
            "routes": replay["routes"], "conditional_example": conditional,
            "learner_profiles": profiles, "checked_constant_value_route": checked_route,
            "cold_start": cold["status"], "hidden_boundary": [asdict(r) for r in sorted(boundary, key=lambda r:r.node)],
            "rejected": negatives, "annotated_graph_equal": True, "scale": scale,
            "not_claimed": ["machine proof of the limit bridge", "complete general planner",
                            "teaching effectiveness", "unique representation advantage"]}


if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
