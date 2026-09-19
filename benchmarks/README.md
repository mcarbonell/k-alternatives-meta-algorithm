# Benchmark Outputs

Generated reports from the offline benchmark and analysis scripts live here, so
the repository root stays clean.

## What writes here

| Files                                                | Produced by                              |
| :--------------------------------------------------- | :--------------------------------------- |
| `algorithmic-experiment-*.json`                      | `node scripts/algorithmic-experiment.js` |
| `local-minima-*.json`, `local-minima-*.md`           | `node scripts/local-minima-analysis.js`  |
| `benchmark-results-*.json`, `benchmark-results-*.md` | `node scripts/benchmark.js`              |
| `competitive-benchmark-*.json`, `*.md`               | `node scripts/competitive-benchmark.js`  |
| `unified-benchmark-*.json`                           | `node scripts/unified-benchmark.js`      |
| `master-benchmark-*.json`, `*.md`                    | `node scripts/run-all-benchmarks.js`     |

## Historical snapshots (tracked)

The `algorithmic-experiment-*.json` and `local-minima-*` files committed here
are dated snapshots backing the models derived in
[`../docs/analisis-algoritmico-alternativas.md`](../docs/analisis-algoritmico-alternativas.md).
They are kept as a record of the published results.

## New runs are ignored

Fresh reports are written to this directory but are **not** committed — the same
policy the repository already applies to its other generated report families
(see `.gitignore`). Reports are timestamped, so runs never overwrite each other.

```bash
npm run benchmark:minima   # local minima analysis
npm run benchmark:quick    # competitive benchmark, quick config
npm run benchmark          # full suite
```
