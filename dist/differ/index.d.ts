import { ParseResult } from '../parser';
export interface MissingVariable {
    key: string;
    missingInFiles: string[];
}
export interface ValueConflict {
    key: string;
    values: {
        fileName: string;
        value: string;
        quoteType: string;
    }[];
}
export interface FormatInconsistency {
    key: string;
    type: 'quote' | 'numeric';
    details: {
        fileName: string;
        value: string;
        quoteType: string;
    }[];
}
export interface CompareResult {
    allKeys: string[];
    missingVariables: MissingVariable[];
    valueConflicts: ValueConflict[];
    formatInconsistencies: FormatInconsistency[];
}
export interface LintDuplicateKey {
    key: string;
    occurrences: {
        lineNumber: number;
        value: string;
    }[];
    finalValue: string;
}
export interface LintEmptyValue {
    key: string;
    lineNumber: number;
}
export interface LintUndefinedReference {
    key: string;
    lineNumber: number;
    referencedKey: string;
}
export interface LintCyclicReference {
    keys: string[];
}
export interface LintResult {
    duplicateKeys: LintDuplicateKey[];
    emptyValues: LintEmptyValue[];
    undefinedReferences: LintUndefinedReference[];
    cyclicReferences: LintCyclicReference[];
}
/**
 * 比较多个 .env 文件之间的差异
 * @param files - 包含文件名和对应解析结果的数组
 * @returns 比较结果，包含缺失变量、值冲突和格式不一致
 */
export declare function compareEnvFiles(files: {
    fileName: string;
    parseResult: ParseResult;
}[]): CompareResult;
/**
 * 对单个 .env 文件执行静态检查
 * @param parseResult - 解析结果
 * @returns LintResult - 包含重复键、空值、未定义引用和循环引用
 */
export declare function lintEnvFile(parseResult: ParseResult): LintResult;
