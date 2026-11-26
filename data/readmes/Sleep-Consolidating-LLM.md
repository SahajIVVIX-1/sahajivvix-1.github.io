# Sleep-Consolidating LLM

Can a language model learn from its day the way a brain does: take notes while awake, then "sleep" and turn the notes into weights, without forgetting what it already knew? This project builds that loop on a laptop with a 4 GB GPU and measures it honestly.

## The loop

Each simulated day has a day phase and a night phase.

- **Day.** A 4-bit Qwen2.5-0.5B-Instruct reads that day's documents and writes atomic fact notes into an append-only notebook. Notes are scored against the ground truth of the world (day 1: 41 of 50 sentences parsed, recall 0.70, precision 0.85).
- **Night.** The model dreams. From the notes it generates question-answer pairs, paraphrases and counterfactual variations, then trains one QLoRA adapter on them mixed with replay.
- **Morning.** Questions about the new facts are asked with no notebook access, so only what reached the weights counts.

## Synthetic world

Names of people, companies, cities and products are built from syllable generators so the base model has no prior (measured accuracy before the night: 0.000). Each day adds 20 to 50 facts as (subject, relation, object) triples, and about 20% from day 2 on update earlier facts, so "latest value wins" can be checked. Question templates are split into train templates (the dream generator may use them) and held-out templates (never shown to the generator or the trainer); a unit test enforces the split.

## Dreams

- **Answer-first QA.** The answer is the extracted object of the note and the model only writes the question. This raised the share of valid dream questions from 19% to 69% on the first pass.
- **Grounding and de-duplication.** The question must mention the subject, must not contain the answer and must end with a question mark; near-duplicates (cosine above 0.92) are dropped.
- **Diversity regulariser.** Candidates are over-generated 3 times, then chosen by greedy max-min selection with per-fact coverage and per-kind quotas (QA, paraphrase, counterfactual, multi-hop). Distinct-n, self-BLEU and MiniLM embedding dispersion are logged every night, and a collapse alarm raises the sampling temperature.

## Sleep

- **QLoRA.** NF4 with double quantisation, rank 16, alpha 32, all linear projections, gradient checkpointing, micro-batch 2, sequence length 256. Loss is on answer tokens only.
- **Replay.** A night mixes 40% dreams from earlier nights (a day-balanced reservoir, counterfactuals excluded, dreams of superseded facts pruned), 20% old-skill items from the ARC-Easy, HellaSwag and GSM8K train splits and 40% new dreams.
- **KL to the base model.** A KL penalty on the replay tokens keeps the language distribution from drifting; weights 0.1 and 0.2 were tried.
- **One adapter.** A single adapter is trained continuously across nights. Merging into a 4-bit base is lossy and costs RAM on a 4 GB card.
- **Lean logits.** The language-model head is evaluated only at assistant-token positions. This fixed a replay-only memory spike (peak RSS 5.0 GB to 1.8 GB) caused by the batch x sequence x 152k fp32 logits tensor spilling into system RAM, with the same loss and gradients.

## Evaluation

- New-knowledge QA on held-out phrasings, split into today's facts and earlier days' facts, plus an upper bound with the notebook.
- Old-skill probe of 200 items (80 ARC-Easy, 80 HellaSwag, 40 GSM8K) and WikiText-2 perplexity on a fixed slice, before and after every night.
- Greedy decoding, fixed seeds, raw per-item outputs saved under `results/`.

## Results (day 5, mean of 3 seeds, KL weight 0.1)

| | naive | replay + regulariser + KL |
|---|---|---|
| accuracy on today's facts | 0.108 | 0.377 |
| accuracy on earlier days' facts | 0.035 | 0.325 |
| old-skill probe (base model 0.460) | 0.392 | 0.475 |
| WikiText-2 perplexity (base model 26.6) | 44.2 | 39.6 |

Replay and the KL penalty keep the old skills at the base level while retaining about a third of earlier days' facts without a notebook. Naive nightly fine-tuning retains almost none and degrades the old skills.

## Honest limits

Three seeds, five nights, a 0.5B model and about 50 to 100 questions per cell: the numbers are indicative, not statistically established. Perplexity still rises above the base model. Capacity of one rank-16 adapter at about 1,500 facts is untested, and a 30-night run is in progress.

## Layout

`src/sleepllm/` holds the config, the synthetic world, notebook, day, dream, diversity, replay, sleep and eval modules. `scripts/` has the phase runners, profilers and the seed aggregator, `tests/` has the unit tests (notebook, world, diversity, regulariser, KL penalty, lean logits) and `results/` keeps every raw run. `LOG.md` records each step, including what failed.
