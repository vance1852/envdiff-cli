import { CompareResult, LintResult } from '../differ';
/**
 * 格式化比较结果为 JSON 字符串
 * @param result - 比较结果
 * @returns 格式化后的 JSON 字符串
 */
export declare function formatCompareJson(result: CompareResult): string;
/**
 * 格式化比较结果为终端友好的表格格式
 * @param result - 比较结果
 * @returns 格式化后的表格字符串
 */
export declare function formatCompareTable(result: CompareResult): string;
/**
 * 格式化 lint 结果为 JSON 字符串
 * @param result - lint 结果
 * @returns 格式化后的 JSON 字符串
 */
export declare function formatLintJson(result: LintResult): string;
/**
 * 格式化 lint 结果为终端友好的表格格式
 * @param result - lint 结果
 * @returns 格式化后的表格字符串
 */
export declare function formatLintTable(result: LintResult): string;
