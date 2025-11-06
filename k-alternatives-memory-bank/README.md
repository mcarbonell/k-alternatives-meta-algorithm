# k-Deviation Search Algorithm - Memory Bank

This directory contains comprehensive documentation for the k-Deviation Search algorithm, designed to preserve knowledge and enable collaboration across AI sessions and human developers.

## Purpose

This memory bank serves as:
- **Context preservation** for AI assistants across sessions
- **Knowledge base** for new developers joining the project
- **Foundation** for academic paper
- **Reference** for implementation decisions

## Files

### [algorithm.md](algorithm.md)
Complete technical description of the k-Deviation Search algorithm:
- Core concept and innovation
- Algorithm structure and pseudocode
- Complexity analysis
- Comparison with classical algorithms
- Reinforcement Learning perspective
- Generalization to other problems
- Implementation notes
- Performance results

### [insights.md](insights.md)
Key insights and observations about the algorithm:
- Creator information
- Core algorithmic insights
- Performance insights
- Implementation insights
- Academic insights
- Commercial insights
- Development insights
- Future research directions

### [roadmap.md](roadmap.md)
Project roadmap and development plan:
- Project vision and goals
- Current status
- Phase 1: Documentation & Foundation
- Phase 2: Multi-Problem Implementation
- Phase 3: Academic Publication
- Phase 4: Library & Tools
- Phase 5: Community & Adoption
- Phase 6: Advanced Features
- Timeline and resource requirements

## Quick Start for New AI Sessions

When starting a new session on the k-Deviation project:

1. **Read algorithm.md** to understand the core algorithm
2. **Read insights.md** to understand key decisions and observations
3. **Read roadmap.md** to understand current status and next steps
4. **Check the current phase** in roadmap.md to know what to work on

## Quick Start for Human Developers

1. **Understand the concept**: Read "Core Concept" in algorithm.md
2. **See it in action**: Check `solve-worker.js` for TSP implementation
3. **Understand the vision**: Read "Project Vision" in roadmap.md
4. **Pick a task**: Choose from current phase in roadmap.md

## Key Concepts Summary

### What is k-Deviation Search?

An optimization algorithm that:
- **Systematically explores** k deviations from local heuristics
- **Learns adaptively** by updating heuristics from successful solutions
- **Controls exploration/exploitation** via the k parameter
- **Requires no hyperparameters** (unlike SA, GA, RL)
- **Generalizes** to multiple problem types (TSP, Knapsack, Scheduling, etc.)

### Why is it Novel?

1. **Systematic exploration**: Not random like GA or SA
2. **Adaptive learning**: Heuristics improve during search
3. **Simple**: ~300 lines of code, no complex tuning
4. **General**: Works on any problem with local heuristics
5. **RL without neural networks**: Uses ordered lists instead of Q-tables

### Current Status

- ✅ TSP implementation working (50 cities in seconds)
- ✅ Core algorithm validated
- ✅ Memory bank documentation complete
- 🚧 Separate GitHub repository (planned)
- 📋 Multi-problem implementations (planned)
- 📋 Academic paper (planned)

## Using This Memory Bank

### For AI Assistants

When user mentions "k-Deviation" or "k-alternatives algorithm":

1. Load context from these files
2. Understand current phase from roadmap.md
3. Reference insights.md for design decisions
4. Use algorithm.md for technical details

### For Developers

When implementing new features:

1. Check roadmap.md for planned features
2. Reference algorithm.md for algorithm details
3. Add new insights to insights.md
4. Update roadmap.md with progress

### For Researchers

When writing academic paper:

1. Use algorithm.md as foundation
2. Reference insights.md for novelty claims
3. Follow structure in roadmap.md Phase 3
4. Add citations and references

## Project Structure (Planned)

```
k-deviation-search/
├── .amazonq/
│   └── rules/
│       └── memory-bank/          # This directory
│           ├── README.md
│           ├── algorithm.md
│           ├── insights.md
│           └── roadmap.md
├── src/
│   ├── core/
│   │   ├── KDeviationOptimizer.js  # Generic framework
│   │   └── utils.js
│   └── problems/
│       ├── TSPSolver.js
│       ├── KnapsackSolver.js
│       ├── SchedulingSolver.js
│       └── ...
├── examples/
│   ├── tsp/
│   ├── knapsack/
│   └── ...
├── benchmarks/
│   ├── tsplib/
│   └── results/
├── docs/
│   └── paper/
│       └── draft.tex
├── tests/
├── README.md
├── package.json
└── LICENSE
```

## Contributing

When adding to this memory bank:

1. **algorithm.md**: Add technical details, complexity analysis, new algorithms
2. **insights.md**: Add observations, design decisions, lessons learned
3. **roadmap.md**: Update progress, add new phases, adjust timeline
4. **README.md**: Update this file if structure changes

## Contact

**Creator**: Mario Raúl Carbonell Martínez  
**Project**: k-Deviation Search Algorithm  
**Related Project**: DynamicCRUD (PHP CRUD generator)

## License

To be determined (likely MIT for code, CC-BY for documentation)

## Version History

- **2025-11-1**: Initial memory bank creation
- Future versions will be tracked in Git

---

**Note**: This memory bank is designed to be copied to the k-deviation-search repository when created. It provides complete context for any AI assistant or developer working on the project.
