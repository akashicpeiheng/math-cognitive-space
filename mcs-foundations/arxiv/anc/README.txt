MCS finite research artifact
============================

Companion to:
MCS: A Formal Framework for Mathematical Knowledge and Learning Routes
with External Learner Models
Peiheng Liu

Run from the extracted source or ancillary root (the directory containing anc/):

    python anc/run.py --output replay

The output directory must not already exist. Python 3.10 or later is the
syntax/dependency target; the reference run used Python 3.14.7.
No third-party Python package, network, or learner record is required.
Run this complete command rather than individual upstream scripts in place:
some upstream scripts write reports next to their own source.

Contents
--------
run.py: verifies pinned upstream files, runs three upstream suites in a
temporary copy, and executes the new route example.
route_demo.py: persistent resource descriptors, explicit sources, combined
source/policy cycle checks, view boundary checks, bounded source enumeration,
three-valued entry availability, and annotated incidence graph round-trip.
certification/: byte-identical selected existing MCS certification files.
upstream-manifest.json: SHA-256 pins for those selected files.
reference-results/ (inside anc/ in the combined source archive): the reference
run's four stable reports and summary. The working project and older separate
ancillary bundles keep these at evidence/replay-final/ instead.
source-audit.json: external references consulted, including actual reading scope.
The main LaTeX source archive also contains references.bib.

Results
-------
kernel-report.json: 28 checks; 8 positive certificates; 19 negative certificate
cases; 35 terms / 175 finite semantic comparisons; 42 case valuations;
11 background instances; two controlled defective variants.
action-report.json: four local fragments and five rejected source cases.
research-report.json: 2295 candidates per encoding. Typed action, annotated
bipartite, and MCS encodings agree. The simpler node baseline loses information.
route-report.json: 85 action words at bound 3, two event-numbered sourced route
records, four independent schedule checks, and 11 negative cases. The accepted
constant-function value certificate is also passed into a checked-proof route.
summary.json: executed commands, input hashes, and report hashes.
Only diagnostic elapsed_seconds_diagnostic values are removed for stable replay.
The four reference *-report.json files can be compared byte for byte.
The summary includes interpreter/environment information and is not required
to be identical across environments.

Trust and scope
---------------
All case counts are finite. The Python checker and planner have not been proved
correct on all inputs. The route theorem assumes local validity and resource
persistence. The bridge's full limit equivalence is a written proof in the
paper, not a machine-checked real-analysis theorem. The local limit certificate
proves only beta-reduction of a constant function.

The example's reviewed-proof label means an ordinary written proof used as
a trusted input, not external peer review. checked-proof means acceptance by
the included unverified checker for the stated fragment. A source-certified
route checks resource connections; it does not certify learner mastery.

The two learner profiles and costs are stipulated. No real participants,
intervention, measured learning gain, or unique graph expressiveness is claimed.
Normal search does not enumerate policy edges or dynamic learner transitions;
the verifier separately accepts and tests policy constraints.

This artifact does not independently grant a software license. Any release
license must be chosen by the rights holder. Included files remain attributable
to their authors and any applicable existing rights.
