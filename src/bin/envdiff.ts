#!/usr/bin/env node

import { Command } from 'commander';
import { parseEnvFile } from '../parser';
import { compareEnvFiles, lintEnvFile } from '../differ';
import {
  formatCompareJson,
  formatCompareTable,
  formatLintJson,
  formatLintTable,
} from '../formatter';

const program = new Command();

program
  .name('envdiff')
  .description('环境变量配置漂移检测 CLI 工具')
  .version('1.0.0');

program
  .command('compare')
  .description('对比 2~N 个 .env 文件，输出差异报告')
  .argument('<file1>', '第一个要对比的 .env 文件')
  .argument('<file2>', '第二个要对比的 .env 文件')
  .argument('[file3...]', '更多要对比的 .env 文件')
  .option('--format <format>', '输出格式: table 或 json', 'table')
  .action(async (file1: string, file2: string, moreFiles: string[], options: { format: string }) => {
    const allFiles = [file1, file2, ...moreFiles];

    if (allFiles.length < 2) {
      console.error('错误: 至少需要提供 2 个文件进行对比');
      process.exit(1);
    }

    try {
      const fileResults = [];
      for (const fileName of allFiles) {
        const result = await parseEnvFile(fileName);
        fileResults.push({ fileName, parseResult: result });
      }

      const compareResult = compareEnvFiles(fileResults);

      if (options.format === 'json') {
        console.log(formatCompareJson(compareResult));
      } else {
        console.log(formatCompareTable(compareResult));
      }

      const hasIssues = compareResult.missingVariables.length +
        compareResult.valueConflicts.length +
        compareResult.formatInconsistencies.length;

      process.exit(hasIssues > 0 ? 1 : 0);
    } catch (error) {
      console.error(`错误: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('lint')
  .description('对单个 .env 文件进行静态检查')
  .argument('<file>', '要检查的 .env 文件')
  .option('--format <format>', '输出格式: table 或 json', 'table')
  .action(async (file: string, options: { format: string }) => {
    try {
      const parseResult = await parseEnvFile(file);
      const lintResult = lintEnvFile(parseResult);

      if (options.format === 'json') {
        console.log(formatLintJson(lintResult));
      } else {
        console.log(formatLintTable(lintResult));
      }

      const hasIssues = lintResult.duplicateKeys.length +
        lintResult.emptyValues.length +
        lintResult.undefinedReferences.length +
        lintResult.cyclicReferences.length;

      process.exit(hasIssues > 0 ? 1 : 0);
    } catch (error) {
      console.error(`错误: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
