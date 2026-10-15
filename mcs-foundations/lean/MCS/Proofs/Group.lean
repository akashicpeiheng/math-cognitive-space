import MCS.Expected

namespace MCS.Proofs
universe u

theorem rightUnitInjective : Expected.rightUnitInjective.{u} := by
  intro G mul e rightUnit g h same
  have atUnit := congrFun same e
  simpa only [rightUnit] using atUnit

theorem groupSpecialization : Expected.groupSpecialization.{u} := by
  intro G _ g h same
  exact rightUnitInjective G (· * ·) 1 mul_one g h same

theorem missingRightUnit : Expected.missingRightUnit := by
  refine ⟨fun _ _ => false, false, true, by decide, rfl, ?_⟩
  rintro ⟨e, h⟩
  have contradiction := h true
  cases contradiction

theorem missingEquality : Expected.missingEquality := by
  refine ⟨fun x _ => x, false, false, true, ?_, by decide, ?_⟩
  · intro x; rfl
  · intro h
    have contradiction := congrFun h false
    cases contradiction

end MCS.Proofs
