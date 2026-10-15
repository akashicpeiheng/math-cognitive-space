import Mathlib.Data.Finset.Basic
import Mathlib.Data.Finset.Union
import Mathlib.Tactic.Choose
import Mathlib.Algebra.Group.Defs

/- Public mathematical definitions, independent of the candidate proofs. -/
namespace MCS
universe u

abbrev Rules (U : Type u) := Set (Finset U × U)

/-- Definition 8.7: a rule uses a finite positive premise set; empty premises are legal. -/
def step {U : Type u} (Q : Rules U) (X : Set U) : Set U :=
  { x | x ∈ X ∨ ∃ A : Finset U, (A, x) ∈ Q ∧ ∀ a ∈ A, a ∈ X }

def stage {U : Type u} (Q : Rules U) (X : Set U) : Nat → Set U
  | 0 => X
  | n + 1 => step Q (stage Q X n)

/-- c(X) = the union of all finite stages, with no finiteness assumption on U or Q. -/
def closure {U : Type u} (Q : Rules U) (X : Set U) : Set U :=
  { x | ∃ n : Nat, x ∈ stage Q X n }

end MCS
