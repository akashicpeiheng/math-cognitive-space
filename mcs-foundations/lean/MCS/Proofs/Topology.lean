import MCS.TopologyTargets

namespace MCS.Proofs
universe u
theorem secondToFirst : Expected.secondToFirst.{u} := by
  intro X _ h
  letI := h
  infer_instance
theorem t4ToT3 : Expected.t4ToT3.{u} := by
  intro X _ h
  letI := h.1
  letI := h.2
  exact ⟨inferInstance, inferInstance⟩
theorem t3ToT2 : Expected.t3ToT2.{u} := by
  intro X _ h
  letI := h.1
  letI := h.2
  infer_instance
theorem t2ToT1 : Expected.t2ToT1.{u} := by
  intro X _ h
  letI := h
  infer_instance
theorem compactToParacompact : Expected.compactToParacompact.{u} := by
  intro X _ h
  letI := h
  infer_instance
theorem directionalFderiv : Expected.directionalFderiv.{u} := by
  intro E F _ _ _ _ f x v h
  exact h.lineDeriv_eq_fderiv
theorem exteriorSquared : Expected.exteriorSquared := by
  intro n k ω h
  exact extDeriv_extDeriv h (by simp)
end MCS.Proofs
