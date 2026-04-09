#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const parser_1 = require("../parser");
const differ_1 = require("../differ");
const formatter_1 = require("../formatter");
const program = new commander_1.Command();
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
    .action(async (file1, file2, moreFiles, options) => {
    const allFiles = [file1, file2, ...moreFiles];
    if (allFiles.length < 2) {
        console.error('错误: 至少需要提供 2 个文件进行对比');
        process.exit(1);
    }
    try {
        const fileResults = [];
        for (const fileName of allFiles) {
            const result = await (0, parser_1.parseEnvFile)(fileName);
            fileResults.push({ fileName, parseResult: result });
        }
        const compareResult = (0, differ_1.compareEnvFiles)(fileResults);
        if (options.format === 'json') {
            console.log((0, formatter_1.formatCompareJson)(compareResult));
        }
        else {
            console.log((0, formatter_1.formatCompareTable)(compareResult));
        }
        const hasIssues = compareResult.missingVariables.length +
            compareResult.valueConflicts.length +
            compareResult.formatInconsistencies.length;
        process.exit(hasIssues > 0 ? 1 : 0);
    }
    catch (error) {
        console.error(`错误: ${error.message}`);
        process.exit(1);
    }
});
program
    .command('lint')
    .description('对单个 .env 文件进行静态检查')
    .argument('<file>', '要检查的 .env 文件')
    .option('--format <format>', '输出格式: table 或 json', 'table')
    .action(async (file, options) => {
    try {
        const parseResult = await (0, parser_1.parseEnvFile)(file);
        const lintResult = (0, differ_1.lintEnvFile)(parseResult);
        if (options.format === 'json') {
            console.log((0, formatter_1.formatLintJson)(lintResult));
        }
        else {
            console.log((0, formatter_1.formatLintTable)(lintResult));
        }
        const hasIssues = lintResult.duplicateKeys.length +
            lintResult.emptyValues.length +
            lintResult.undefinedReferences.length +
            lintResult.cyclicReferences.length;
        process.exit(hasIssues > 0 ? 1 : 0);
    }
    catch (error) {
        console.error(`错误: ${error.message}`);
        process.exit(1);
    }
});
program.parseAsync(process.argv).catch((err) => {
    console.error(err);
    process.exit(1);
});
