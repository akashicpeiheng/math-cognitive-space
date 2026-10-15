import MCS.Proofs.Group
import MCS.Proofs.Closure

/- Independent typed wrappers pin every candidate to its registered target. -/
namespace MCS.Verified
universe u
theorem rightUnitInjective : Expected.rightUnitInjective.{u} := Proofs.rightUnitInjective
theorem groupSpecialization : Expected.groupSpecialization.{u} := Proofs.groupSpecialization
theorem missingRightUnit : Expected.missingRightUnit := Proofs.missingRightUnit
theorem missingEquality : Expected.missingEquality := Proofs.missingEquality
theorem extensive : Expected.extensive.{u} := Proofs.extensive
theorem monotone : Expected.monotone.{u} := Proofs.monotone
theorem idempotent : Expected.idempotent.{u} := Proofs.idempotent
theorem finitary : Expected.finitary.{u} := Proofs.finitary
end MCS.Verified
