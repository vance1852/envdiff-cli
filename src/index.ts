#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import { loadEnvFile } from './parser';
import { compareEnvFiles, lintEnvFile } from './differ';
import { formatCompareResult, formatLintResult, formatError, OutputFormat } from './formatter';

const program = new Command();

program
  .name('envdiff')
  .description('环境变量配置漂移检测 CLI 工具')
  .version('1.0.0');

program
  .command('compare')
  .description('对比 2~N 个 .env 文件，输出差异报告')
  .argument('<files...>', '要比较的 .env 文件路径（至少 2 个）')
  .option('-f, --format <format>', '输出格式 (table|json)', 'table')
  .action(async (files: string[], options: { format: string }) => {
    try {
      if (files.length < 2) {
        console.error(formatError('Please provide at least 2 files to compare'));
        process.exit(1);
      }

      const format = (options.format === 'json' ? 'json' : 'table') as OutputFormat;

      const envFiles = files.map(f => {
        try {
          return loadEnvFile(f);
        } catch (err) {
          console.error(formatError(`Failed to load file: ${f}`));
          process.exit(1);
        }
      });

      const compareResult = compareEnvFiles(envFiles);
      const fileNames = envFiles.map(ef => ef.filePath);
      const output = formatCompareResult(compareResult, format, fileNames);

      console.log(output.content);

      const hasIssues =
        compareResult.missingVariables.length > 0 ||
        compareResult.inconsistentValues.length > 0 ||
        compareResult.formatInconsistencies.length > 0;

      process.exit(hasIssues ? 1 : 0);
    } catch (err) {
      console.error(formatError(err instanceof Error ? err.message : String(err)));
      process.exit(1);
    }
  });

program
  .command('lint')
  .description('对单个 .env 文件进行静态检查')
  .argument('<file>', '要检查的 .env 文件路径')
  .option('-f, --format <format>', '输出格式 (table|json)', 'table')
  .action(async (file: string, options: { format: string }) => {
    try {
      const format = (options.format === 'json' ? 'json' : 'table') as OutputFormat;

      let envFile;
      try {
        envFile = loadEnvFile(file);
      } catch (err) {
        console.error(formatError(`Failed to load file: ${file}`));
        process.exit(1);
      }

      const lintResult = lintEnvFile(envFile);
      const output = formatLintResult(lintResult, format, file);

      console.log(output.content);

      process.exit(lintResult.passed ? 0 : 1);
    } catch (err) {
      console.error(formatError(err instanceof Error ? err.message : String(err)));
      process.exit(1);
    }
  });

program.parse();
