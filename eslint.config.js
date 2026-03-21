import globals from 'globals';
import pluginJs from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';

/** @type {import('eslint').Linter.Config[]} */
export default [
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
            ecmaVersion: 2022,
            sourceType: 'module',
        },
    },
    pluginJs.configs.recommended,
    {
        rules: {
            ...pluginJs.configs.recommended.rules,
            ...eslintConfigPrettier.rules,

            // Best Practices
            'no-console': 'off', // Allow console for CLI tools and benchmarks
            'no-debugger': 'warn',
            'no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],
            'no-unused-expressions': 'error',
            eqeqeq: 'warn', // Warn instead of error for legacy code
            curly: ['warn', 'multi-line'],

            // ES6+ Rules
            'prefer-const': 'warn',
            'no-var': 'warn', // Warn instead of error for legacy code
            'prefer-arrow-callback': 'warn',

            // Code Style (mostly handled by Prettier)
            'no-multiple-empty-lines': ['warn', { max: 2, maxEOF: 1 }],
            'no-trailing-spaces': 'warn',
            'eol-last': 'warn',

            // Allow error re-throw without cause (Node.js < 16 compatibility)
            'no-ex-assign': 'off',
        },
    },
    {
        // Ignore patterns
        ignores: [
            'node_modules/**',
            'dist/**',
            'build/**',
            'coverage/**',
            '*.min.js',
            'old-k-search/**',
            'temp_kp/**',
            'results/**',
            '*.spec.js', // Test files may have different rules
            'benchmark-results*.json',
            'competitive-benchmark*.json',
            'unified-benchmark*.json',
            'benchmark-results*.md',
            'competitive-benchmark*.md',
        ],
    },
    {
        // Specific rules for benchmark files
        files: ['benchmark*.js', 'compare-*.js', 'competitive-*.js', 'run-all-*.js'],
        rules: {
            'no-console': 'off', // Benchmarks need console output
        },
    },
    {
        // Specific rules for CLI files
        files: ['*-cli.js'],
        rules: {
            'no-console': 'off', // CLI needs console
        },
    },
    {
        // Relaxed rules for worker files (browser globals)
        files: ['*-worker.js', 'solve-worker.js'],
        languageOptions: {
            globals: {
                ...globals.browser,
                importScripts: 'readonly',
                postMessage: 'readonly',
                onmessage: 'readonly',
                self: 'readonly',
            },
        },
        rules: {
            'no-undef': 'off', // Allow worker-specific globals
        },
    },
    {
        // Relaxed rules for legacy files
        files: ['*-legacy.js', 'tsp-solver-legacy.js'],
        rules: {
            'no-var': 'off',
            'prefer-const': 'off',
        },
    },
    {
        // Relaxed rules for HTML-embedded JS (app.js)
        files: ['app.js'],
        rules: {
            'no-undef': 'off', // Allow browser globals
            'no-case-declarations': 'off', // Allow case declarations
        },
    },
];
