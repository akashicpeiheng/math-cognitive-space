import MCS.Definitions

/- Trusted targets: changing a proof must not change these propositions. -/
namespace MCS.Expected
universe u

def rightUnitInjective : Prop :=
  ∀ (G : Type u) (mul : G → G → G) (e : G),
    (∀ x, mul x e = x) → ∀ g h, (fun x => mul g x) = (fun x => mul h x) → g = h

def groupSpecialization : Prop :=
  ∀ (G : Type u) [Group G] (g h : G), (fun x => g * x) = (fun x => h * x) → g = h

def missingRightUnit : Prop :=
  ∃ (mul : Bool → Bool → Bool) (g h : Bool),
    g ≠ h ∧ (fun x => mul g x) = (fun x => mul h x) ∧ ¬ ∃ e, ∀ x, mul x e = x

def missingEquality : Prop :=
  ∃ (mul : Bool → Bool → Bool) (e g h : Bool),
    (∀ x, mul x e = x) ∧ g ≠ h ∧ (fun x => mul g x) ≠ (fun x => mul h x)

def extensive : Prop :=
  ∀ (U : Type u) (Q : Rules U) (X : Set U), X ⊆ closure Q X

def monotone : Prop :=
  ∀ (U : Type u) (Q : Rules U) (X Y : Set U), X ⊆ Y → closure Q X ⊆ closure Q Y

def idempotent : Prop :=
  ∀ (U : Type u) (Q : Rules U) (X : Set U), closure Q (closure Q X) = closure Q X

def finitary : Prop :=
  ∀ (U : Type u) (Q : Rules U) (X : Set U) (x : U),
    x ∈ closure Q X ↔ ∃ A : Finset U, (∀ a ∈ A, a ∈ X) ∧ x ∈ closure Q (↑A : Set U)

end MCS.Expected
