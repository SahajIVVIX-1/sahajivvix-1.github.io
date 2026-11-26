# Google Quantum AI: Verifiable Quantum Circuit Compilation

Entry in the Kaggle competition [Verifiable Quantum Circuit Compilation](https://www.kaggle.com/competitions/google-verifiable-quantum-circuit-compilation). The task is to shrink three fault-tolerant quantum circuits. Every submission is checked by official verifier scripts on fresh random inputs seeded by a hash of the submission, so there is no fixed hidden test set.

## Scoring

The score is the geometric mean of three cost reductions against the reference submission, which scores exactly 1.0.

| Task | Workload | Cost to minimise |
|---|---|---|
| invsqrt | fusion energy: phase e^(2*pi*i/sqrt(x)) for x up to 3,133,452 | qubits x (Toffolis + T/4) |
| dqi | optimisation: reversible Reed-Solomon RS(4095, 4025) decoder over GF(2^12) | R(eps+) x Q^2 x T, failures allowed but priced |
| dfthcsos | chemistry: FeMoCo block encoding with QROM angle loaders | lambda_eff x T x Q |

## invsqrt: own design, 6.43x

The reference does a Quake-style initial guess plus a Newton step (260 qubits, 7,735 Toffolis, cost 2,076,774). The own circuits replace it step by step, each verified with the official logic on all 3,133,452 inputs.

- **Table-based piecewise quadratic.** Normalise, look up three coefficients in a 192-entry QROM addressed by 8 bits, then two multiplies. Binary shift count with a barrel normaliser instead of thermometer flags: 4.31x.
- **Lazy register allocation.** The y1, a2 and r registers are allocated only after normalisation and the multiplier scratch borrows idle qubits: Q 156 to 146, 4.61x.
- **Narrow-window multiplies.** Each multiply row subtracts into an (n+1)-bit window whose top bit is the borrow, with window widths taken from the exact maxima over all inputs: Q 136, 5.44x.
- **Measurement-based lookup erase.** The uncompute pass erases the loaded table entry with a measurement-based delete (about 25 Toffolis) instead of repeating the unary-iteration QROM (191): 5.78x.
- **Exhaustive dead-gate removal.** A bit-parallel simulation over all inputs with random measurement outcomes found 267 Toffoli-like gates that are dead or have an implied control; removing them gives 136 qubits, 2,125 Toffolis, cost 323,146, 6.43x. The full 64-shot check (200,540,928 shots) passed.

## dqi: own design, 1.64x

- **Tower-field inversion.** GF(2^12) as a tower over GF(2^6) turns the 315-Toffoli inverse into 91, tested exhaustively on all 4096 inputs, with erasure by measurement.
- **54-AND multiplier.** Karatsuba 12 = 2 x 6, 6 = 2 x 3 plus a solved linear reduction (66 with a quantum control instead of 75).
- **Statistical dead-gate removal.** A bit-parallel simulation of the 73.9M-operation decoder over about 850k sampled shots deletes gates that never matter. This is statistical: rare shots become decoder failures (about 30 in 102,400), which raises R from 1.191 to 1.276 but lowers the total cost.

## Tooling

Multi-core verifier runners for Windows (the official ones fork-parallelise only), a circuit liveness and interval-colouring pass, a peephole analyser, a chemistry shape sweep and a composite-score helper. The full invsqrt check takes about 25 minutes on 16 cores.

## What is mine and what is not

My own circuits reach a composite of about 2.2 (6.43 x 1.64 x 1.0, chemistry untouched), and the own-code package scored 1.628 on Kaggle when only invsqrt v2 was submitted. The public leaderboard's top scores come from circuits other participants published; I re-verified one such public stack locally and it scored 33.17 on Kaggle, as predicted, but it is their work and is credited in the repo's provenance file.

## Findings kept honest

Bit-width trimming of the reference is exhausted. Cutting the per-position 12-bit zero tests in the public decoder fails because of false roots, and the public circuits have no free qubit to remove. Multi-x gains need a new algorithm per task, not parameter tuning.
