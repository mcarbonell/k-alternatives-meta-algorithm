# k-Alternatives Benchmark Suite

Comprehensive benchmark system for evaluating the k-Alternatives meta-heuristic algorithm across multiple optimization domains.

## 🚀 Quick Start

```bash
# Run complete benchmark suite (recommended for publication)
npm run benchmark

# Quick competitive analysis (5 minutes)
npm run benchmark:quick

# Standard competitive analysis (15 minutes)
npm run benchmark:standard

# Thorough competitive analysis (45 minutes)
npm run benchmark:thorough
```

## 📊 Benchmark Components

### 1. Unified Benchmark (`unified-benchmark.js`)
Tests both TSP and Knapsack problems with the same framework.

**Problems Tested:**
- **TSP**: berlin52, st70, kroA100, ch130
- **Knapsack**: Pisinger strongly correlated instances

**Metrics:**
- Success rate (% optimal solutions found)
- Average gap from optimal
- Execution time
- Quality score

```bash
npm run benchmark:unified
```

### 2. Competitive Benchmark (`competitive-benchmark.js`)
Compares k-Alternatives against state-of-the-art algorithms using standard benchmarks.

**Configurations:**
- `quick`: K≤2, 10 runs, 5s limit
- `standard`: K≤3, 25 runs, 10s limit  
- `thorough`: K≤4, 50 runs, 20s limit

```bash
npm run benchmark:competitive
```

### 3. Local Minima Analysis (`local-minima-analysis.js`)
Statistical analysis of local minima distribution patterns.

**Analysis:**
- Minima frequency distribution
- K-value progression patterns
- Cross-problem comparisons
- Convergence characteristics

```bash
npm run benchmark:minima
```

### 4. Statistical Analysis (`tsp-stats.js`)
Enhanced version of the original statistical analysis with histogram visualization.

```bash
npm run stats
```

## 📈 Understanding Results

### Success Rate
Percentage of runs that find the optimal solution:
- **>80%**: Excellent
- **50-80%**: Good  
- **20-50%**: Acceptable
- **<20%**: Poor

### Gap from Optimal
Average deviation from known optimal solution:
- **<1%**: Excellent
- **1-3%**: Good
- **3-5%**: Acceptable  
- **>5%**: Poor

### Quality Score
Composite metric: `max(0, 100 - avgGap*10) * (successRate/100)`
- **>80**: Publication-ready
- **60-80**: Competitive
- **40-60**: Acceptable
- **<40**: Needs improvement

## 🎯 Publication-Ready Results

The benchmark suite generates multiple report formats:

### JSON Reports
- `master-benchmark-[timestamp].json`: Complete raw data
- `competitive-benchmark-[timestamp].json`: Competitive analysis data
- `local-minima-analysis-[timestamp].json`: Statistical analysis data

### Markdown Reports  
- `master-benchmark-[timestamp].md`: Publication-ready summary
- `competitive-benchmark-[timestamp].md`: Competitive analysis report

### Key Sections for Papers
1. **Algorithm Performance**: Success rates and gaps
2. **Competitive Analysis**: Comparison with literature
3. **Statistical Properties**: Local minima distribution
4. **Scalability**: Performance across problem sizes

## 🔬 Research Applications

### Academic Papers
Use these benchmarks to support claims about:
- Algorithm effectiveness
- Competitive performance
- Statistical properties
- Practical applicability

### Recommended Comparisons
- **TSP**: Compare with LKH, Concorde, Lin-Kernighan
- **Knapsack**: Compare with CPLEX, Gurobi, dynamic programming
- **General**: Compare with SA, GA, Tabu Search

## 📋 Benchmark Checklist

For publication-quality results:

- [ ] Run `npm run benchmark` (complete suite)
- [ ] Verify all target problems are tested
- [ ] Check success rates >50% for small problems
- [ ] Confirm gaps <5% on average
- [ ] Generate statistical significance tests
- [ ] Compare with literature baselines
- [ ] Document hardware/software environment

## 🛠️ Customization

### Adding New Problems
1. Add problem files to appropriate directories
2. Update problem lists in benchmark scripts
3. Ensure optimal values are available

### Modifying Test Parameters
Edit configuration objects in benchmark files:
```javascript
const CONFIG = {
    problems: ['your-problem'],
    kValues: [1, 2, 3],
    repetitions: 25,
    timeLimit: 10
};
```

### Custom Metrics
Extend analysis functions to include domain-specific metrics.

## 📊 Expected Results

Based on preliminary testing:

### TSP (Standard TSPLIB)
- **Small problems (N<100)**: 60-90% success rate
- **Medium problems (N=100-200)**: 30-70% success rate  
- **Average gap**: 2-5% from optimal
- **Best K**: Usually K=2 or K=3

### Knapsack (Pisinger)
- **Strongly correlated**: Often finds optimal
- **Gap**: <1% on most instances
- **Best K**: Usually K=0 or K=1 (greedy variants)

## 🎯 Publication Strategy

1. **Run complete benchmark suite**
2. **Generate statistical significance tests**
3. **Compare with 3-5 state-of-the-art algorithms**
4. **Highlight unique advantages** (simplicity, generality)
5. **Discuss practical applications**

## 📞 Support

For questions about benchmarks or results interpretation:
- Check existing benchmark results in repository
- Review algorithm documentation in README.md
- Examine source code for implementation details

---

*This benchmark suite provides comprehensive evidence for the effectiveness of the k-Alternatives meta-heuristic algorithm across multiple optimization domains.*