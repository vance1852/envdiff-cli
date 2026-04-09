import type { EnvEntry, ParseResult } from "./parser.js";
import { parseEnvFile } from "./parser.js";
import * as fs from "fs";

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
  detailsByFile: Record<
    string,
    {
      value: string;
      hasQuotes: boolean;
      quoteType: string;
    }
  >;
}

export interface CompareResult {
  fileCount: number;
  issues: Array<
    MissingVariableIssue | ValueMismatchIssue | FormatMismatchIssue
  >;
}

/**
 * Lints a single .env file for issues like duplicate keys, empty values, and missing references.
 * @param filePath - Path to the .env file
 * @returns LintResult containing all found issues
 */
export function lintEnvFile(filePath: string): LintResult {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const keyOccurrences = new Map<string, number[]>();
  const issues: LintResult["issues"] = [];
  const definedKeys = new Set<string>();
  const keyToEntry = new Map<string, EnvEntry>();

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) return;

    const equalsIndex = trimmedLine.indexOf("=");
    const key =
      equalsIndex === -1
        ? trimmedLine
        : trimmedLine.slice(0, equalsIndex).trim();

    if (!keyOccurrences.has(key)) {
      keyOccurrences.set(key, []);
    }
    keyOccurrences.get(key)!.push(lineNumber);
    definedKeys.add(key);

    if (equalsIndex !== -1) {
      let rawValue = trimmedLine.slice(equalsIndex + 1).trim();
      let value = rawValue;
      if (
        (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
        (rawValue.startsWith("'") && rawValue.endsWith("'"))
      ) {
        value = rawValue.slice(1, -1);
      }
      keyToEntry.set(key, {
        key,
        value,
        rawValue,
        lineNumber,
        hasQuotes: false,
        quoteType: "none",
      });
      if (value === "") {
        issues.push({ type: "empty_value", key, lineNumber });
      }
    } else {
      issues.push({ type: "empty_value", key, lineNumber });
    }
  });

  keyOccurrences.forEach((lineNumbers, key) => {
    if (lineNumbers.length > 1) {
      const entry = keyToEntry.get(key);
      issues.push({
        type: "duplicate_key",
        key,
        lineNumbers,
        finalValue: entry?.value || "",
      });
    }
  });

  const referenceRegex = /\$\{([^}]+)\}/g;
  keyToEntry.forEach((entry, key) => {
    const matches = entry.value.match(referenceRegex);
    if (matches) {
      const missingRefs: string[] = [];
      matches.forEach((match) => {
        const refKey = match.slice(2, -1);
        if (!definedKeys.has(refKey)) {
          missingRefs.push(refKey);
        }
      });
      if (missingRefs.length > 0) {
        issues.push({
          type: "missing_reference",
          key,
          lineNumber: entry.lineNumber,
          missingRefs,
        });
      }
    }
  });

  return { issues };
}

/**
 * Compares multiple .env files and finds differences.
 * @param filePaths - Array of paths to .env files
 * @returns CompareResult containing all found issues
 */
export function compareEnvFiles(filePaths: string[]): CompareResult {
  const fileEntries = new Map<string, ParseResult>();
  const allKeys = new Set<string>();
  const issues: CompareResult["issues"] = [];

  filePaths.forEach((filePath) => {
    const result = parseEnvFile(filePath);
    fileEntries.set(filePath, result);
    result.entries.forEach((_, key) => allKeys.add(key));
  });

  allKeys.forEach((key) => {
    const missingFiles: string[] = [];
    const valuesByFile: Record<string, string> = {};
    const entriesByFile: Record<string, EnvEntry> = {};

    filePaths.forEach((filePath) => {
      const entry = fileEntries.get(filePath)!.entries.get(key);
      if (entry) {
        valuesByFile[filePath] = entry.value;
        entriesByFile[filePath] = entry;
      } else {
        missingFiles.push(filePath);
      }
    });

    if (missingFiles.length > 0) {
      issues.push({ type: "missing_variable", key, missingFiles });
    }

    if (missingFiles.length === 0) {
      const values = Object.values(valuesByFile);
      if (!values.every((v) => v === values[0])) {
        issues.push({ type: "value_mismatch", key, valuesByFile });
      }

      const quoteConfigs = Object.entries(entriesByFile).map(
        ([file, entry]) => ({
          file,
          hasQuotes: entry.hasQuotes,
          quoteType: entry.quoteType,
          value: entry.value,
        }),
      );
      const numericLikeValues = quoteConfigs.filter(
        (c) => !isNaN(Number(c.value)),
      );
      if (numericLikeValues.length > 1 && numericLikeValues[0]) {
        const firstConfig = numericLikeValues[0];
        const hasMismatch = !numericLikeValues.every(
          (c) =>
            c.hasQuotes === firstConfig.hasQuotes &&
            c.quoteType === firstConfig.quoteType,
        );
        if (hasMismatch) {
          const detailsByFile: FormatMismatchIssue["detailsByFile"] = {};
          Object.entries(entriesByFile).forEach(([file, entry]) => {
            detailsByFile[file] = {
              value: entry.value,
              hasQuotes: entry.hasQuotes,
              quoteType: entry.quoteType,
            };
          });
          issues.push({ type: "format_mismatch", key, detailsByFile });
        }
      }
    }
  });

  return { fileCount: filePaths.length, issues };
}
