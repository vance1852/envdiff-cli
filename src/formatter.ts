import type { LintResult, CompareResult } from "./differ.js";

type OutputFormat = "table" | "json";

/**
 * Formats lint results into the specified format.
 * @param result - LintResult from linting
 * @param format - Output format (table or json)
 * @returns Formatted string output
 */
export function formatLint(
  result: LintResult,
  format: OutputFormat = "table",
): string {
  if (format === "json") {
    return JSON.stringify(result, null, 2);
  }

  if (result.issues.length === 0) {
    return "No issues found!";
  }

  const lines: string[] = [];
  lines.push("| Issue Type | Key | Line(s) | Details |");
  lines.push("|------------|-----|---------|---------|");

  result.issues.forEach((issue) => {
    let details = "";
    switch (issue.type) {
      case "duplicate_key":
        details = `Duplicate key, final value: "${issue.finalValue}"`;
        break;
      case "empty_value":
        details = "Empty or missing value";
        break;
      case "missing_reference":
        details = `Missing references: ${issue.missingRefs.join(", ")}`;
        break;
    }
    lines.push(
      `| ${issue.type} | ${issue.key} | ${issue.type === "duplicate_key" ? issue.lineNumbers.join(",") : issue.lineNumber} | ${details} |`,
    );
  });

  return lines.join("\n");
}

/**
 * Formats compare results into the specified format.
 * @param result - CompareResult from comparing files
 * @param format - Output format (table or json)
 * @returns Formatted string output
 */
export function formatCompare(
  result: CompareResult,
  format: OutputFormat = "table",
): string {
  if (format === "json") {
    return JSON.stringify(result, null, 2);
  }

  if (result.issues.length === 0) {
    return `All ${result.fileCount} files are in sync!`;
  }

  const lines: string[] = [];
  lines.push(`Comparing ${result.fileCount} files...\n`);
  lines.push("| Issue Type | Key | Details |");
  lines.push("|------------|-----|---------|");

  result.issues.forEach((issue) => {
    let details = "";
    switch (issue.type) {
      case "missing_variable":
        details = `Missing in: [${issue.missingFiles.join(", ")}]`;
        break;
      case "value_mismatch":
        const valueStrs = Object.entries(issue.valuesByFile).map(
          ([file, val]) => `${file}: "${val}"`,
        );
        details = `Values mismatch: { ${valueStrs.join(", ")} }`;
        break;
      case "format_mismatch":
        const formatStrs = Object.entries(issue.detailsByFile).map(
          ([file, cfg]) =>
            `${file}: hasQuotes=${cfg.hasQuotes}, quoteType=${cfg.quoteType}`,
        );
        details = `Format mismatch: { ${formatStrs.join(", ")} }`;
        break;
    }
    lines.push(`| ${issue.type} | ${issue.key} | ${details} |`);
  });

  return lines.join("\n");
}
