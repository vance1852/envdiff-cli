import { CompareResult, LintResult } from "../differ/types";
import { OutputFormat, FormattedOutput } from "./types";
export { OutputFormat, FormattedOutput } from "./types";
/**
 * 格式化比较结果
 * @param compareResult - 比较结果
 * @param format - 输出格式 ('table' | 'json')
 * @param fileNames - 文件名数组
 * @returns 格式化后的输出
 */
export declare function formatCompareResult(compareResult: CompareResult, format: OutputFormat, fileNames: string[]): FormattedOutput;
/**
 * 格式化 Lint 结果
 * @param lintResult - Lint 结果
 * @param format - 输出格式
 * @param fileName - 被检查的文件名
 * @returns 格式化后的输出
 */
export declare function formatLintResult(lintResult: LintResult, format: OutputFormat, fileName: string): FormattedOutput;
/**
 * 格式化错误信息
 * @param message - 错误消息
 * @returns 格式化的错误字符串
 */
export declare function formatError(message: string): string;
/**
 * 格式化警告信息
 * @param message - 警告消息
 * @returns 格式化的警告字符串
 */
export declare function formatWarning(message: string): string;
//# sourceMappingURL=index.d.ts.map