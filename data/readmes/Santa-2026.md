# Santa 2026: The Elf Calculator

Entry in the Kaggle competition [Santa 2026 - The Elf Calculator](https://www.kaggle.com/competitions/santa-2026). Each of 1,000 puzzles gives a few starting values in registers and several target numbers. A program is a list of instructions `[op, i, j, d]` meaning `rd = ri op rj` on 48 registers with `+ - * /` (exact division). A target counts as soon as it appears in any register, and the score is the total number of instructions, so lower is better. Targets reach about 10^18 and each puzzle has its own value limit (up to 60 bits).

## Engine

- **Referee.** `referee.py` re-implements the rules exactly (register bounds, exact division, the value limit) and replays every program. Nothing is trusted that the referee has not replayed.
- **Horner baseline.** A Horner-style solver gives a valid program for every puzzle: 629,025 instructions against 1,490,379 for the sample submission.
- **Beam search.** A forward dictionary of 2 to 4 million values, backward meet-in-the-middle lookups, a layered beam, register allocation and a resumable multiprocess cache. It is correct and referee-verified, but random targets are far from the start values and need about five hidden-program operations, so a 2M-value dictionary almost never hits them.
- **Value-DAG local search.** Reduce and shuffle moves on the dependency DAG of a program, followed by register allocation.
- **Cone re-synthesis.** A C++ search that re-synthesises the cone of values behind a target with up to 4 helpers and 1.5M nodes.
- **Best-of merge.** `merge.py` replays banks of programs and keeps the shortest valid one for every puzzle. Programs are parsed as data and replayed; nothing from other participants' repositories is executed.

## Where the length is

A gap report over the final programs shows 724 independent random puzzles at 5.05 instructions per target (81.5% of all instructions), 223 multiplicative puzzles at 3.92, and clustered and tiny puzzles near 2.8. About 80% of instructions build helper values and targets are almost always helper-op-helper. The trivial lower bound (one instruction per target) is 26,898.

## Progress

| Round | What | Total |
|---|---|---:|
| 0 | sample submission | 1,490,379 |
| 1 | own Horner baseline | 629,025 |
| 2 | merge of public program banks | 133,610 |
| 3 | public Kaggle datasets and notebook outputs | 128,505 |
| 4 to 5 | own DAG local search and cone re-synthesis on all 1,000 puzzles | 128,505 |
| 6 to 9 | refreshes of public programs, further cone runs | 128,494 |

## Honest reading

Of the gain over my own baseline, essentially all comes from public programs of other participants, replayed through the exact referee and credited in the repository's notice file. My own search found no shorter program than the public frontier: one of 4,337 helpers was removable by re-derivation and cone swaps gave 744 equal-length alternatives and no savings. The loop stopped when its rate of gain fell far below the stopping rule.

## Layout

`src/santa26/` has the IO, referee, merge, DAG optimiser, cone search and the solvers, `native/cone.cpp` is the C++ cone search, `scripts/` has scoring, merging, analysis and refresh scripts, and `tests/` has pytest tests for the referee, beam search and optimiser. The repository is private.
