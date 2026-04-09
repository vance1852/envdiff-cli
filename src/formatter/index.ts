import { CompareResult, LintResult } from '../differ';

/**
 * 格式化比较结果为 JSON 字符串
 * @param result - 比较结果
 * @returns 格式化后的 JSON 字符串
 */
export function formatCompareJson(result: CompareResult): string {
  return JSON.stringify(result, null, 2);
}

/**
 * 格式化比较结果为终端友好的表格格式
 * @param result - 比较结果
 * @returns 格式化后的表格字符串
 */
export function formatCompareTable(result: CompareResult): string {
  const output: string[] = [];

  output.push('=== 环境变量差异报告 ===\n');

  if (result.missingVariables.length > 0) {
    output.push('--- 缺失的变量 ---');
    output.push('');
    for (const missing of result.missingVariables) {
      output.push(`变量: ${missing.key}`);
      output.push(`  缺失于: ${missing.missingInFiles.join(', ')}`);
      output.push('');
    }
  } else {
    output.push('--- 缺失的变量 ---');
    output.push('所有变量在所有文件中均存在 ✓');
    output.push('');
  }

  if (result.valueConflicts.length > 0) {
    output.push('--- 值冲突的变量 ---');
    output.push('');
    for (const conflict of result.valueConflicts) {
      output.push(`变量: ${conflict.key}`);
      for (const val of conflict.values) {
        const displayVal = val.value === '' ? '(空值)' : val.value;
        output.push(`  ${val.fileName}: ${displayVal}`);
      }
      output.push('');
    }
  } else {
    output.push('--- 值冲突的变量 ---');
    output.push('所有变量值一致 ✓');
    output.push('');
  }

  if (result.formatInconsistencies.length > 0) {
    output.push('--- 格式不一致 ---');
    output.push('');
    for (const inconsistency of result.formatInconsistencies) {
      const typeLabel = inconsistency.type === 'quote' ? '引号不一致' : '数字/字符串混合';
      output.push(`变量: ${inconsistency.key} [${typeLabel}]`);
      for (const detail of inconsistency.details) {
        const quoteLabel = detail.quoteType === 'none' ? '无引号' :
          detail.quoteType === 'single' ? '单引号' : '双引号';
        output.push(`  ${detail.fileName}: ${quoteLabel} - "${detail.value}"`);
      }
      output.push('');
    }
  } else {
    output.push('--- 格式不一致 ---');
    output.push('格式一致 ✓');
    output.push('');
  }

  return output.join('\n');
}

/**
 * 格式化 lint 结果为 JSON 字符串
 * @param result - lint 结果
 * @returns 格式化后的 JSON 字符串
 */
export function formatLintJson(result: LintResult): string {
  return JSON.stringify(result, null, 2);
}

/**
 * 格式化 lint 结果为终端友好的表格格式
 * @param result - lint 结果
 * @returns 格式化后的表格字符串
 */
export function formatLintTable(result: LintResult): string {
  const output: string[] = [];

  output.push('=== Lint 检查报告 ===\n');

  if (result.duplicateKeys.length > 0) {
    output.push('--- 重复定义的 Key ---');
    output.push('');
    for (const dup of result.duplicateKeys) {
      output.push(`变量: ${dup.key}`);
      for (const occ of dup.occurrences) {
        output.push(`  第 ${occ.lineNumber} 行: ${occ.value === '' ? '(空值)' : occ.value}`);
      }
      output.push(`  最终值: ${dup.finalValue}`);
      output.push('');
    }
  } else {
    output.push('--- 重复定义的 Key ---');
    output.push('无重复定义 ✓');
    output.push('');
  }

  if (result.emptyValues.length > 0) {
    output.push('--- 空值变量 ---');
    output.push('');
    for (const empty of result.emptyValues) {
      output.push(`  第 ${empty.lineNumber} 行: ${empty.key}`);
    }
    output.push('');
  } else {
    output.push('--- 空值变量 ---');
    output.push('无空值变量 ✓');
    output.push('');
  }

  if (result.undefinedReferences.length > 0) {
    output.push('--- 未定义的变量引用 ---');
    output.push('');
    for (const ref of result.undefinedReferences) {
      output.push(`  ${ref.key} (第 ${ref.lineNumber} 行) 引用了未定义的 ${ref.referencedKey}`);
    }
    output.push('');
  } else {
    output.push('--- 未定义的变量引用 ---');
    output.push('所有引用均存在 ✓');
    output.push('');
  }

  if (result.cyclicReferences.length > 0) {
    output.push('--- 循环引用 ---');
    output.push('');
    for (const cycle of result.cyclicReferences) {
      output.push(`  循环: ${cycle.keys.join(' → ')}`);
    }
    output.push('');
  } else {
    output.push('--- 循环引用 ---');
    output.push('无循环引用 ✓');
    output.push('');
  }

  const hasIssues = result.duplicateKeys.length + result.emptyValues.length +
    result.undefinedReferences.length + result.cyclicReferences.length;

  if (hasIssues === 0) {
    output.push('✓ Lint 检查通过！');
  }

  return output.join('\n');
}
