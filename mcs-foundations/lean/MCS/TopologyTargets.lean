import Mathlib.Topology.Bases
import Mathlib.Topology.Separation.Regular
import Mathlib.Topology.Compactness.Paracompact
import Mathlib.Analysis.Calculus.LineDeriv.Basic
import Mathlib.Analysis.Calculus.DifferentialForm.Basic
import Mathlib.Analysis.InnerProductSpace.PiL2

/- Independent targets. No theorem under test is assumed in a background interface. -/
namespace MCS.Expected
universe u
def secondToFirst : Prop :=
  ∀ (X : Type u) [TopologicalSpace X], SecondCountableTopology X → FirstCountableTopology X
def t4ToT3 : Prop :=
  ∀ (X : Type u) [TopologicalSpace X], (NormalSpace X ∧ T1Space X) → (RegularSpace X ∧ T1Space X)
def t3ToT2 : Prop :=
  ∀ (X : Type u) [TopologicalSpace X], (RegularSpace X ∧ T1Space X) → T2Space X
def t2ToT1 : Prop :=
  ∀ (X : Type u) [TopologicalSpace X], T2Space X → T1Space X
def compactToParacompact : Prop :=
  ∀ (X : Type u) [TopologicalSpace X], CompactSpace X → ParacompactSpace X
def directionalFderiv : Prop :=
  ∀ (E F : Type u) [NormedAddCommGroup E] [NormedSpace ℝ E]
    [NormedAddCommGroup F] [NormedSpace ℝ F] (f : E → F) (x v : E),
    DifferentiableAt ℝ f x → lineDeriv ℝ f x v = fderiv ℝ f x v
def exteriorSquared : Prop :=
  ∀ (n k : ℕ) (ω : EuclideanSpace ℝ (Fin n) →
    (EuclideanSpace ℝ (Fin n)) [⋀^Fin k]→L[ℝ] ℝ),
    ContDiff ℝ 2 ω → extDeriv (extDeriv ω) = 0
end MCS.Expected
