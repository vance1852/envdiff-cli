export interface DuplicateKeyIssue {
    type: "duplicate_key";
    key: string;
    lineNumbers: number[];
    finalValue: string;
}
export interface EmptyValueIssue {
    type: "empty_value";
    key: string;
    lineNumber: number;
}
export interface MissingReferenceIssue {
    type: "missing_reference";
    key: string;
    lineNumber: number;
    missingRefs: string[];
}
export interface LintResult {
    issues: Array<DuplicateKeyIssue | EmptyValueIssue | MissingReferenceIssue>;
}
export interface MissingVariableIssue {
    type: "missing_variable";
    key: string;
    missingFiles: string[];
}
export interface ValueMismatchIssue {
    type: "value_mismatch";
    key: string;
    valuesByFile: Record<string, string>;
}
export interface FormatMismatchIssue {
    type: "format_mismatch";
    key: string;
    detailsByFile: Record<string, {
        value: string;
        hasQuotes: boolean;
        quoteType: string;
    }>;
}
export interface CompareResult {
    fileCount: number;
    issues: Array<MissingVariableIssue | ValueMismatchIssue | FormatMismatchIssue>;
}
/**
 * Lints a single .env file for issues like duplicate keys, empty values, and missing references.
 * @param filePath - Path to the .env file
 * @returns LintResult containing all found issues
 */
export declare function lintEnvFile(filePath: string): LintResult;
/**
 * Compares multiple .env files and finds differences.
 * @param filePaths - Array of paths to .env files
 * @returns CompareResult containing all found issues
 */
export declare function compareEnvFiles(filePaths: string[]): CompareResult;
//# sourceMappingURL=differ.d.ts.map