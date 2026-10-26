import MCS.Verified
import Lean

open Lean Elab Command

/- This trusted extractor reads the actual compiled environment, not proof-authored JSON. -/
elab "mcs_audit" : command => do
  let env ← getEnv
  let targets : Array (Name × Name) := #[
    (`MCS.Verified.rightUnitInjective, `MCS.Expected.rightUnitInjective),
    (`MCS.Verified.groupSpecialization, `MCS.Expected.groupSpecialization),
    (`MCS.Verified.missingRightUnit, `MCS.Expected.missingRightUnit),
    (`MCS.Verified.missingEquality, `MCS.Expected.missingEquality),
    (`MCS.Verified.extensive, `MCS.Expected.extensive),
    (`MCS.Verified.monotone, `MCS.Expected.monotone),
    (`MCS.Verified.idempotent, `MCS.Expected.idempotent),
    (`MCS.Verified.finitary, `MCS.Expected.finitary),
    (`MCS.Verified.secondToFirst, `MCS.Expected.secondToFirst),
    (`MCS.Verified.t4ToT3, `MCS.Expected.t4ToT3),
    (`MCS.Verified.t3ToT2, `MCS.Expected.t3ToT2),
    (`MCS.Verified.t2ToT1, `MCS.Expected.t2ToT1),
    (`MCS.Verified.compactToParacompact, `MCS.Expected.compactToParacompact),
    (`MCS.Verified.directionalFderiv, `MCS.Expected.directionalFderiv),
    (`MCS.Verified.exteriorSquared, `MCS.Expected.exteriorSquared)]
  let mut results : Array Json := #[]
  for (decl, expected) in targets do
    let some info := env.find? decl | throwError "missing registered declaration: {decl}"
    let .thmInfo _ := info | throwError "registered proof is not a theorem: {decl}"
    unless info.type.getAppFn.constName? == some expected do
      throwError "target mismatch: {decl}"
    let axioms ← Lean.collectAxioms decl
    results := results.push (Json.mkObj [
      ("declaration", toJson decl.toString),
      ("expected", toJson expected.toString),
      ("kind", toJson "theorem"),
      ("axioms", toJson (axioms.map Name.toString)),
      ("targetMatched", toJson true)])
  liftIO <| IO.println ("MCS_AUDIT_JSON:" ++ (Json.mkObj [
    ("schema", toJson "mcs-lean-audit/1"), ("targets", toJson results)]).compress)

mcs_audit
