import MCS.Expected

namespace MCS.Proofs
universe u
variable {U : Type u} (Q : Rules U)

theorem step_mono {X Y : Set U} (h : X ⊆ Y) : step Q X ⊆ step Q Y := by
  intro x hx
  rcases hx with hx | ⟨A, rule, premises⟩
  · exact Or.inl (h hx)
  · exact Or.inr ⟨A, rule, fun a ha => h (premises a ha)⟩

theorem stage_mono {X Y : Set U} (h : X ⊆ Y) : ∀ n, stage Q X n ⊆ stage Q Y n := by
  intro n
  induction n with
  | zero => exact h
  | succ n ih => exact step_mono Q ih

theorem stage_succ (X : Set U) (n : Nat) : stage Q X n ⊆ stage Q X (n + 1) := by
  intro x hx
  exact Or.inl hx

theorem stage_le (X : Set U) {n m : Nat} (h : n ≤ m) : stage Q X n ⊆ stage Q X m := by
  induction h with
  | refl => exact fun _ hx => hx
  | @step m _ ih => exact fun _ hx => stage_succ Q X m (ih hx)

theorem closure_mono {X Y : Set U} (h : X ⊆ Y) : closure Q X ⊆ closure Q Y := by
  rintro x ⟨n, hx⟩
  exact ⟨n, stage_mono Q h n hx⟩

/-- Every finite collection of generated premises is present at a common finite stage. -/
theorem common_stage (X : Set U) (A : Finset U)
    (h : ∀ a ∈ A, a ∈ closure Q X) : ∃ n, ∀ a ∈ A, a ∈ stage Q X n := by
  classical
  induction A using Finset.induction_on with
  | empty => exact ⟨0, by simp⟩
  | @insert a A ha ih =>
    obtain ⟨n, hn⟩ := h a (Finset.mem_insert_self a A)
    obtain ⟨m, hm⟩ := ih (fun b hb => h b (Finset.mem_insert_of_mem hb))
    refine ⟨max n m, ?_⟩
    intro b hb
    rcases Finset.mem_insert.mp hb with rfl | hb
    · exact stage_le Q X (Nat.le_max_left n m) hn
    · exact stage_le Q X (Nat.le_max_right n m) (hm b hb)

theorem closure_closed (X : Set U) : step Q (closure Q X) ⊆ closure Q X := by
  intro x hx
  rcases hx with hx | ⟨A, rule, premises⟩
  · exact hx
  · obtain ⟨n, hn⟩ := common_stage Q X A premises
    exact ⟨n + 1, Or.inr ⟨A, rule, hn⟩⟩

theorem extensive : Expected.extensive.{u} := by
  intro U Q X x hx
  exact ⟨0, hx⟩

theorem monotone : Expected.monotone.{u} := by
  intro U Q X Y h
  exact closure_mono Q h

theorem idempotent : Expected.idempotent.{u} := by
  intro U Q X
  apply Set.Subset.antisymm
  · rintro x ⟨n, hx⟩
    have bound : ∀ k, stage Q (closure Q X) k ⊆ closure Q X := by
      intro k
      induction k with
      | zero => exact fun _ hy => hy
      | succ k ih => exact fun _ hy => closure_closed Q X (step_mono Q ih hy)
    exact bound n hx
  · exact extensive U Q (closure Q X)

/-- A finite stage derivation depends on finitely many leaves in the original X. -/
theorem finite_leaves (X : Set U) (n : Nat) : ∀ x ∈ stage Q X n,
    ∃ A : Finset U, (∀ a ∈ A, a ∈ X) ∧ x ∈ closure Q (↑A : Set U) := by
  classical
  induction n with
  | zero =>
    intro x hx
    exact ⟨{x}, by simpa, ⟨0, by simp [stage]⟩⟩
  | succ n ih =>
    intro x hx
    rcases hx with hx | ⟨A, rule, premises⟩
    · exact ih x hx
    · have witnesses : ∀ a ∈ A, ∃ B : Finset U,
          (∀ b ∈ B, b ∈ X) ∧ a ∈ closure Q (↑B : Set U) :=
        fun a ha => ih a (premises a ha)
      choose B hB using witnesses
      let leaves := A.attach.biUnion (fun a => B a.val a.property)
      have included (a : U) (ha : a ∈ A) : B a ha ⊆ leaves := by
        intro b hb
        exact Finset.mem_biUnion.mpr ⟨⟨a, ha⟩, by simp, hb⟩
      have leavesInX : ∀ b ∈ leaves, b ∈ X := by
        intro b hb
        obtain ⟨a, _, hb⟩ := Finset.mem_biUnion.mp hb
        exact (hB a.val a.property).1 b hb
      have generated : ∀ a ∈ A, a ∈ closure Q (↑leaves : Set U) := by
        intro a ha
        exact closure_mono Q (fun _ hb => included a ha hb) ((hB a ha).2)
      exact ⟨leaves, leavesInX, closure_closed Q (↑leaves) (Or.inr ⟨A, rule, generated⟩)⟩

theorem finitary : Expected.finitary.{u} := by
  intro U Q X x
  constructor
  · rintro ⟨n, hx⟩
    exact finite_leaves Q X n x hx
  · rintro ⟨A, hA, hx⟩
    exact closure_mono Q (fun a ha => hA a ha) hx

end MCS.Proofs
