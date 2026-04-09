#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const parser_1 = require("./parser");
const differ_1 = require("./differ");
const formatter_1 = require("./formatter");
const program = new commander_1.Command();
program
    .name('envdiff')
    .description('环境变量配置漂移检测 CLI 工具')
    .version('1.0.0');
program
    .command('compare')
    .description('对比 2~N 个 .env 文件，输出差异报告')
    .argument('<files...>', '要比较的 .env 文件路径（至少 2 个）')
    .option('-f, --format <format>', '输出格式 (table|json)', 'table')
    .action(async (files, options) => {
    try {
        if (files.length < 2) {
            console.error((0, formatter_1.formatError)('Please provide at least 2 files to compare'));
            process.exit(1);
        }
        const format = (options.format === 'json' ? 'json' : 'table');
        const envFiles = files.map(f => {
            try {
                return (0, parser_1.loadEnvFile)(f);
            }
            catch (err) {
                console.error((0, formatter_1.formatError)(`Failed to load file: ${f}`));
                process.exit(1);
            }
        });
        const compareResult = (0, differ_1.compareEnvFiles)(envFiles);
        const fileNames = envFiles.map(ef => ef.filePath);
        const output = (0, formatter_1.formatCompareResult)(compareResult, format, fileNames);
        console.log(output.content);
        const hasIssues = compareResult.missingVariables.length > 0 ||
            compareResult.inconsistentValues.length > 0 ||
            compareResult.formatInconsistencies.length > 0;
        process.exit(hasIssues ? 1 : 0);
    }
    catch (err) {
        console.error((0, formatter_1.formatError)(err instanceof Error ? err.message : String(err)));
        process.exit(1);
    }
});
program
    .command('lint')
    .description('对单个 .env 文件进行静态检查')
    .argument('<file>', '要检查的 .env 文件路径')
    .option('-f, --format <format>', '输出格式 (table|json)', 'table')
    .action(async (file, options) => {
    try {
        const format = (options.format === 'json' ? 'json' : 'table');
        let envFile;
        try {
            envFile = (0, parser_1.loadEnvFile)(file);
        }
        catch (err) {
            console.error((0, formatter_1.formatError)(`Failed to load file: ${file}`));
            process.exit(1);
        }
        const lintResult = (0, differ_1.lintEnvFile)(envFile);
        const output = (0, formatter_1.formatLintResult)(lintResult, format, file);
        console.log(output.content);
        process.exit(lintResult.passed ? 0 : 1);
    }
    catch (err) {
        console.error((0, formatter_1.formatError)(err instanceof Error ? err.message : String(err)));
        process.exit(1);
    }
});
program.parse();
//# sourceMappingURL=index.js.map