import type { LintResult, CompareResult } from "./differ.js";
type OutputFormat = "table" | "json";
/**
 * Formats lint results into the specified format.
 * @param result - LintResult from linting
 * @param format - Output format (table or json)
 * @returns Formatted string output
 */
export declare function formatLint(result: LintResult, format?: OutputFormat): string;
/**
 * Formats compare results into the specified format.
 * @param result - CompareResult from comparing files
 * @param format - Output format (table or json)
 * @returns Formatted string output
 */
export declare function formatCompare(result: CompareResult, format?: OutputFormat): string;
export {};
//# sourceMappingURL=formatter.d.ts.map