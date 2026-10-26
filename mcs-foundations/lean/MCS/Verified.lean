import MCS.Proofs.Group
import MCS.Proofs.Closure
import MCS.Proofs.Topology

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
theorem secondToFirst : Expected.secondToFirst.{u} := Proofs.secondToFirst
theorem t4ToT3 : Expected.t4ToT3.{u} := Proofs.t4ToT3
theorem t3ToT2 : Expected.t3ToT2.{u} := Proofs.t3ToT2
theorem t2ToT1 : Expected.t2ToT1.{u} := Proofs.t2ToT1
theorem compactToParacompact : Expected.compactToParacompact.{u} := Proofs.compactToParacompact
theorem directionalFderiv : Expected.directionalFderiv.{u} := Proofs.directionalFderiv
theorem exteriorSquared : Expected.exteriorSquared := Proofs.exteriorSquared
end MCS.Verified
