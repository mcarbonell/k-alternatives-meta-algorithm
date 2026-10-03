# Reproducible Experimental Results: k-Alternatives Meta-Heuristic

**Execution Date:** 2026-10-03T02:23:33.431Z  
**Hardware Environment:** AMD Ryzen 7 8845HS w/ Radeon 780M Graphics (16 cores,
62 GB RAM)  
**Operating System:** Windows_NT 10.0.26200 (x64) | **Runtime:** Node.js
v24.13.0

> This document presents automated, scientifically reproducible benchmarks
> comparing k-Alternatives against classical optimization baselines, assessing
> component ablations, verifying 95% confidence intervals, and tracking
> theoretical search tree pruning ratios.

---

## 1. Controlled Baselines Benchmark (P1.1 & P1.2)

Evaluated under common budget per problem, matched distance metric, and seeded
PRNG.

### Instance: `bays29` (N=29, Optimal: 2020)

| Method                          | Best Distance | Gap (%) | Evaluations / Moves | Time (ms) |
| :------------------------------ | :-----------: | :-----: | :-----------------: | :-------: |
| Nearest Neighbor (Single-Start) |     2258      | +11.78% |          1          |     0     |
| Multi-Start NN                  |     2134      | +5.64%  |         29          |     1     |
| 2-Opt (on NN)                   |     2064      | +2.18%  |          6          |     2     |
| Or-Opt (on NN)                  |     2033      | +0.64%  |          8          |     1     |
| Multi-Start 2-Opt               |     2020      |  0.00%  |         29          |     2     |
| Simulated Annealing (2-Opt)     |     2028      | +0.40%  |        15000        |     4     |
| k-Alternatives (k=1)            |     2026      | +0.30%  |         552         |    39     |
| k-Alternatives (k=2)            |     2026      | +0.30%  |        1618         |    50     |
| k-Alternatives (k=3)            |     2026      | +0.30%  |        6418         |    82     |

### Instance: `att48` (N=48, Optimal: 10628)

| Method                          | Best Distance | Gap (%) | Evaluations / Moves | Time (ms) |
| :------------------------------ | :-----------: | :-----: | :-----------------: | :-------: |
| Nearest Neighbor (Single-Start) |     12861     | +21.01% |          1          |     0     |
| Multi-Start NN                  |     12012     | +13.02% |         48          |     1     |
| 2-Opt (on NN)                   |     10782     | +1.45%  |         19          |     1     |
| Or-Opt (on NN)                  |     11051     | +3.98%  |         26          |     3     |
| Multi-Start 2-Opt               |     10753     | +1.18%  |         48          |    11     |
| Simulated Annealing (2-Opt)     |     11271     | +6.05%  |        15000        |     3     |
| k-Alternatives (k=1)            |     11254     | +5.89%  |         580         |    49     |
| k-Alternatives (k=2)            |     10725     | +0.91%  |        6533         |    111    |
| k-Alternatives (k=3)            |     10648     | +0.19%  |        52664        |    780    |

### Instance: `berlin52` (N=52, Optimal: 7542)

| Method                          | Best Distance | Gap (%) | Evaluations / Moves | Time (ms) |
| :------------------------------ | :-----------: | :-----: | :-----------------: | :-------: |
| Nearest Neighbor (Single-Start) |     8980      | +19.07% |          1          |     0     |
| Multi-Start NN                  |     8181      | +8.47%  |         52          |     1     |
| 2-Opt (on NN)                   |     7967      | +5.64%  |         15          |     0     |
| Or-Opt (on NN)                  |     8288      | +9.89%  |         12          |     0     |
| Multi-Start 2-Opt               |     7542      |  0.00%  |         52          |     6     |
| Simulated Annealing (2-Opt)     |     8104      | +7.45%  |        15000        |     2     |
| k-Alternatives (k=1)            |     7842      | +3.98%  |         968         |    43     |
| k-Alternatives (k=2)            |     7749      | +2.74%  |        7096         |    161    |
| k-Alternatives (k=3)            |     7749      | +2.74%  |        12279        |    448    |

---

## 2. Component Ablation Study (P1.3)

Isolating Move-To-Front (MTF), Multi-Start exploration, and Adaptive Restart
schedule.

### Instance: `bays29` (Optimal: 2020, k=3)

| Variant / Ablation       | Best Distance | Gap (%) |  ΔGap vs Full   | Solutions | Nodes Expanded | Time (ms) |
| :----------------------- | :-----------: | :-----: | :-------------: | :-------: | :------------: | :-------: |
| Full k-Alternatives      |     2026      |  0.30%  | Baseline (0.00) |   6418    |    1032095     |    83     |
| Ablation: No MTF         |     2033      |  0.64%  |     +0.34%      |   7075    |    2012666     |    118    |
| Ablation: Single-Start   |     2028      |  0.40%  |     +0.10%      |    711    |     102251     |    69     |
| Ablation: Fixed Schedule |     2026      |  0.30%  |     +0.00%      |   6086    |    1007993     |    65     |
| Ablation: Bare LDS       |     2073      |  2.62%  |     +2.32%      |    494    |     37094      |    43     |

### Instance: `att48` (Optimal: 10628, k=3)

| Variant / Ablation       | Best Distance | Gap (%) |  ΔGap vs Full   | Solutions | Nodes Expanded | Time (ms) |
| :----------------------- | :-----------: | :-----: | :-------------: | :-------: | :------------: | :-------: |
| Full k-Alternatives      |     10648     |  0.19%  | Baseline (0.00) |   52664   |    29867331    |    797    |
| Ablation: No MTF         |     11030     |  3.78%  |     +3.59%      |   31628   |    20817153    |    594    |
| Ablation: Single-Start   |     10794     |  1.56%  |     +1.37%      |   1005    |     449149     |    94     |
| Ablation: Fixed Schedule |     10684     |  0.53%  |     +0.34%      |   14749   |    9689291     |    259    |
| Ablation: Bare LDS       |     11227     |  5.64%  |     +5.45%      |    351    |     231192     |    42     |

---

## 3. Statistical Significance & 95% Confidence Intervals (P1.4)

Tested across independent runs with Welch's t-test and Holm-Bonferroni FWER
control:

| Instance | Algorithm                | Mean Gap (%) ± 95% CI | Welch t | p-value | Holm-Bonferroni Result       |
| :------- | :----------------------- | :-------------------: | :-----: | :-----: | :--------------------------- |
| `bays29` | **k-Alternatives (k=3)** |   **0.09% ± 0.15%**   |    —    |    —    | —                            |
|          | Multi-Start NN           |     5.64% ± 0.00%     | -82.05  | 1.82e-8 | ✅ Statistically Significant |
|          | Multi-Start 2-Opt        |     0.00% ± 0.00%     |  1.39   | 1.97e-1 | ➖ Competitive / Equivalent  |
| `att48`  | **k-Alternatives (k=3)** |   **0.34% ± 0.42%**   |    —    |    —    | —                            |
|          | Multi-Start NN           |    13.02% ± 0.00%     | -68.15  | 9.89e-9 | ✅ Statistically Significant |
|          | Multi-Start 2-Opt        |     1.18% ± 0.00%     |  -4.52  | 1.42e-3 | ✅ Statistically Significant |

---

## 4. Hold-Out Generalization Evaluation (P1.5)

Evaluation on unseen instances with frozen hyperparameters (k=3):

| Hold-Out Instance  | Dimension (N) | Optimal Distance | Best Distance | Gap (%) | Time (ms) |
| :----------------- | :-----------: | :--------------: | :-----------: | :-----: | :-------: |
| `st70            ` |      70       |       675        |      682      |  1.04%  |   1203    |
| `pr76            ` |      76       |      108159      |    110385     |  2.06%  |   1201    |
| `kroA100         ` |      100      |      21282       |     22015     |  3.44%  |   1203    |
| `bier127         ` |      127      |      118282      |    122008     |  3.15%  |   1202    |

---

## 5. Empirical Node Complexity vs Theoretical Bounds (P1.6)

| Instance (N)    |  k  | Nodes Expanded | Theoretical Bound | Pruning Ratio (%) | Time (ms) |
| :-------------- | :-: | :------------: | :---------------: | :---------------: | :-------: |
| `bays29` (N=29) |  0  |      840       |        812        |       0.00%       |     0     |
| `bays29` (N=29) |  1  |     37519      |       15457       |       0.00%       |    25     |
| `bays29` (N=29) |  2  |     156023     |      3972739      |      96.07%       |    48     |
| `bays29` (N=29) |  3  |    1032095     |     655605175     |      99.84%       |    73     |
| `att48` (N=48)  |  0  |      6823      |       2256        |       0.00%       |    22     |
| `att48` (N=48)  |  1  |     164950     |       42912       |       0.00%       |    51     |
| `att48` (N=48)  |  2  |    1795681     |     18774480      |      90.44%       |    126    |
| `att48` (N=48)  |  3  |    29867331    |    5357271360     |      99.44%       |    799    |
