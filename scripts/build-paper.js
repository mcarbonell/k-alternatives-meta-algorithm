#!/usr/bin/env node

/**
 * LaTeX Paper Builder
 * Compiles paper/paper.tex and paper/references.bib into paper/paper.pdf
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PAPER_DIR = path.join(ROOT_DIR, 'paper');

function runCommand(cmd, cwd) {
    try {
        execSync(cmd, { cwd, stdio: 'pipe' });
    } catch (err) {
        console.error(`\n[ERROR] Command failed: ${cmd}`);
        if (err.stdout) console.error(err.stdout.toString().slice(-1000));
        if (err.stderr) console.error(err.stderr.toString().slice(-1000));
        throw err;
    }
}

async function buildPaper() {
    console.log('='.repeat(70));
    console.log('   COMPILING ACADEMIC MANUSCRIPT (paper/paper.tex)');
    console.log('='.repeat(70));

    if (!fs.existsSync(path.join(PAPER_DIR, 'paper.tex'))) {
        throw new Error('paper/paper.tex not found!');
    }

    process.stdout.write('1. Running pdflatex (Pass 1)... ');
    runCommand('pdflatex -interaction=nonstopmode paper.tex', PAPER_DIR);
    console.log('Done.');

    process.stdout.write('2. Running bibtex... ');
    try {
        runCommand('bibtex paper', PAPER_DIR);
        console.log('Done.');
    } catch {
        console.log('Bibtex warning/skipped, proceeding...');
    }

    process.stdout.write('3. Running pdflatex (Pass 2 - Resolve citations)... ');
    runCommand('pdflatex -interaction=nonstopmode paper.tex', PAPER_DIR);
    console.log('Done.');

    process.stdout.write('4. Running pdflatex (Pass 3 - Resolve cross-references)... ');
    runCommand('pdflatex -interaction=nonstopmode paper.tex', PAPER_DIR);
    console.log('Done.');

    const pdfPath = path.join(PAPER_DIR, 'paper.pdf');
    if (fs.existsSync(pdfPath)) {
        const stats = fs.statSync(pdfPath);
        const sizeKb = Math.round(stats.size / 1024);
        console.log('\n' + '='.repeat(70));
        console.log(`✔ SUCCESS: Generated paper/paper.pdf (${sizeKb} KB)`);
        console.log('='.repeat(70));
    } else {
        throw new Error('paper.pdf was not generated.');
    }
}

buildPaper().catch((err) => {
    console.error('\nBuild failed:', err.message);
    process.exit(1);
});
