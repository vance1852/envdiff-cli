#!/usr/bin/env node

import { Command } from 'commander';
import { compareEnvFiles, lintEnvFile } from './differ.js';
import { formatCompare, formatLint } from './formatter.js';

const program = new Command();

program
  .name('envdiff')
  .description('Environment variable configuration drift detection CLI tool')
  .version('1.0.0');

program
  .command('compare <files...>')
  .description('Compare multiple .env files for configuration drift')
  .option('--format <format>', 'Output format: table (default) or json', 'table')
  .action((files: string[], options: { format: string }) => {
    if (files.length < 2) {
      console.error('Error: compare requires at least 2 files');
      process.exit(1);
    }
    const result = compareEnvFiles(files);
    const output = formatCompare(result, options.format as 'table' | 'json');
    console.log(output);
  });

program
  .command('lint <file>')
  .description('Lint a single .env file for common issues')
  .option('--format <format>', 'Output format: table (default) or json', 'table')
  .action((file: string, options: { format: string }) => {
    const result = lintEnvFile(file);
    const output = formatLint(result, options.format as 'table' | 'json');
    console.log(output);
  });

program.parse(process.argv);
