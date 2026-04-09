import { describe, it, expect } from "vitest";
import {
  compareEnvFiles,
  lintEnvFile,
  checkUndefinedReferences,
  detectCircularReferences,
  checkDuplicateKeys,
  checkEmptyValues,
  getAllReferences,
} from "../src/differ";
import { parseEnvContent } from "../src/parser";
import { EnvFile } from "../src/parser/types";

function createEnvFile(filePath: string, content: string): EnvFile {
  return {
    filePath,
    content,
    parseResult: parseEnvContent(content),
  };
}

describe("Differ Module - Compare Normal Cases", () => {
  it("should detect missing variables in some files", () => {
    const file1 = createEnvFile(
      "/test/dev.env",
      "DB_HOST=localhost\nDB_PORT=3306",
    );
    const file2 = createEnvFile("/test/prod.env", "DB_HOST=prodhost");

    const result = compareEnvFiles([file1, file2]);

    expect(result.missingVariables.length).toBe(1);
    expect(result.missingVariables[0].key).toBe("DB_PORT");
    expect(result.missingVariables[0].missingInFiles).toContain(
      "/test/prod.env",
    );
  });

  it("should detect inconsistent values", () => {
    const file1 = createEnvFile("/test/dev.env", "DB_HOST=localhost");
    const file2 = createEnvFile("/test/prod.env", "DB_HOST=prodhost");

    const result = compareEnvFiles([file1, file2]);

    expect(result.inconsistentValues.length).toBe(1);
    expect(result.inconsistentValues[0].key).toBe("DB_HOST");
    expect(result.inconsistentValues[0].values.length).toBe(2);
  });

  it("should detect format inconsistencies (quoted vs unquoted)", () => {
    const file1 = createEnvFile("/test/dev.env", "DB_PORT=3306");
    const file2 = createEnvFile("/test/prod.env", 'DB_PORT="3306"');

    const result = compareEnvFiles([file1, file2]);

    expect(result.formatInconsistencies.length).toBe(1);
    expect(result.formatInconsistencies[0].key).toBe("DB_PORT");
  });

  it("should return consistent when files are identical", () => {
    const content = "DB_HOST=localhost\nDB_PORT=3306\nDB_NAME=testdb";
    const file1 = createEnvFile("/test/dev.env", content);
    const file2 = createEnvFile("/test/prod.env", content);

    const result = compareEnvFiles([file1, file2]);

    expect(result.missingVariables.length).toBe(0);
    expect(result.inconsistentValues.length).toBe(0);
    expect(result.formatInconsistencies.length).toBe(0);
  });

  it("should handle multiple files comparison", () => {
    const file1 = createEnvFile("/test/dev.env", "VAR_A=1\nVAR_B=2\nVAR_C=3");
    const file2 = createEnvFile("/test/staging.env", "VAR_A=1\nVAR_B=20");
    const file3 = createEnvFile(
      "/test/prod.env",
      "VAR_A=1\nVAR_B=30\nVAR_C=300",
    );

    const result = compareEnvFiles([file1, file2, file3]);

    expect(result.missingVariables.length).toBeGreaterThanOrEqual(1);
    const varCMissing = result.missingVariables.find((m) => m.key === "VAR_C");
    expect(varCMissing).toBeDefined();

    expect(result.inconsistentValues.length).toBeGreaterThanOrEqual(1);
    const varBInconsistent = result.inconsistentValues.find(
      (i) => i.key === "VAR_B",
    );
    expect(varBInconsistent).toBeDefined();
    expect(varBInconsistent!.values.length).toBe(3);
  });
});

describe("Differ Module - Compare Edge Cases", () => {
  it("should handle empty files", () => {
    const file1 = createEnvFile("/test/empty1.env", "");
    const file2 = createEnvFile("/test/empty2.env", "");

    const result = compareEnvFiles([file1, file2]);

    expect(result.missingVariables.length).toBe(0);
    expect(result.inconsistentValues.length).toBe(0);
  });

  it("should handle files with only comments", () => {
    const file1 = createEnvFile("/test/file1.env", "# Comment\n# Another");
    const file2 = createEnvFile("/test/file2.env", "# Comment only");

    const result = compareEnvFiles([file1, file2]);

    expect(result.missingVariables.length).toBe(0);
    expect(result.inconsistentValues.length).toBe(0);
  });

  it("should handle single file comparison", () => {
    const file1 = createEnvFile("/test/only.env", "VAR=value");

    const result = compareEnvFiles([file1]);

    expect(result.missingVariables.length).toBe(0);
    expect(result.inconsistentValues.length).toBe(0);
  });

  it("should handle same variable with different quote styles", () => {
    const file1 = createEnvFile("/test/file1.env", 'KEY="value"');
    const file2 = createEnvFile("/test/file2.env", "KEY='value'");
    const file3 = createEnvFile("/test/file3.env", "KEY=value");

    const result = compareEnvFiles([file1, file2, file3]);

    expect(result.formatInconsistencies.length).toBeGreaterThan(0);
  });
});

describe("Differ Module - Lint Normal Cases", () => {
  it("should detect undefined variable references", () => {
    const content = "BASE_URL=${HOST}:${PORT}\nHOST=localhost";
    const envFile = createEnvFile("/test/.env", content);

    const result = lintEnvFile(envFile);

    const hasUndefinedRef = result.errors.some((e) =>
      e.message.includes("PORT"),
    );
    expect(hasUndefinedRef).toBe(true);
  });

  it("should detect circular references", () => {
    const content = "VAR_A=${VAR_B}\nVAR_B=${VAR_C}\nVAR_C=${VAR_A}";
    const envFile = createEnvFile("/test/.env", content);

    const result = lintEnvFile(envFile);

    const hasCircular = result.errors.some((e) =>
      e.message.includes("Circular"),
    );
    expect(hasCircular).toBe(true);
  });

  it("should detect duplicate keys", () => {
    const content = "DB_HOST=first\nDB_HOST=second";
    const envFile = createEnvFile("/test/.env", content);

    const result = lintEnvFile(envFile);

    const hasDuplicate = result.warnings.some((e) =>
      e.message.includes("Duplicate"),
    );
    expect(hasDuplicate).toBe(true);
  });

  it("should detect empty values", () => {
    const content = "EMPTY_VAR=\nANOTHER_EMPTY=";
    const envFile = createEnvFile("/test/.env", content);

    const result = lintEnvFile(envFile);

    expect(result.warnings.length).toBe(2);
    const hasEmpty = result.warnings.some((e) => e.message.includes("Empty"));
    expect(hasEmpty).toBe(true);
  });

  it("should pass when file has no issues", () => {
    const content = "DB_HOST=localhost\nDB_PORT=3306";
    const envFile = createEnvFile("/test/.env", content);

    const result = lintEnvFile(envFile);

    expect(result.passed).toBe(true);
    expect(result.errors.length).toBe(0);
  });
});

describe("Differ Module - Lint Edge Cases", () => {
  it("should handle empty file", () => {
    const envFile = createEnvFile("/test/.env", "");

    const result = lintEnvFile(envFile);

    expect(result.passed).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.warnings.length).toBe(0);
  });

  it("should handle file with only whitespace", () => {
    const envFile = createEnvFile("/test/.env", "   \n\n   ");

    const result = lintEnvFile(envFile);

    expect(result.passed).toBe(true);
  });

  it("should handle parse errors from parser", () => {
    const envFile = createEnvFile("/test/.env", "INVALID_LINE\nVALID=value");

    const result = lintEnvFile(envFile);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.passed).toBe(false);
  });

  it("should handle complex circular references", () => {
    const content = "A=${B}\nB=${C}\nC=${A}";
    const envFile = createEnvFile("/test/.env", content);

    const result = lintEnvFile(envFile);

    const hasCircular = result.errors.some((e) =>
      e.message.includes("Circular"),
    );
    expect(hasCircular).toBe(true);
  });

  it("should handle self-referencing variable", () => {
    const content = "SELF=${SELF}";
    const envFile = createEnvFile("/test/.env", content);

    const result = lintEnvFile(envFile);

    const hasCircular = result.errors.some((e) =>
      e.message.includes("Circular"),
    );
    expect(hasCircular).toBe(true);
  });
});

describe("Differ Module - Helper Functions", () => {
  it("should check undefined references correctly", () => {
    const content = "BASE_URL=${HOST}:${PORT}";
    const parseResult = parseEnvContent(content);

    const errors = checkUndefinedReferences(parseResult);

    expect(errors.length).toBe(2);
    expect(errors.some((e) => e.message.includes("HOST"))).toBe(true);
    expect(errors.some((e) => e.message.includes("PORT"))).toBe(true);
  });

  it("should detect circular references correctly", () => {
    const content = "A=${B}\nB=${A}";
    const parseResult = parseEnvContent(content);

    const errors = detectCircularReferences(parseResult);

    expect(errors.length).toBeGreaterThan(0);
  });

  it("should check duplicate keys correctly via lint", () => {
    const content = "KEY=first\nKEY=second\nKEY=third";
    const envFile = createEnvFile("/test/.env", content);

    const result = lintEnvFile(envFile);

    const hasDuplicate = result.warnings.some((w) => w.message.includes("Duplicate"));
    expect(hasDuplicate).toBe(true);
  });

  it("should check empty values correctly", () => {
    const content = "EMPTY=\nNON_EMPTY=value";
    const parseResult = parseEnvContent(content);

    const warnings = checkEmptyValues(parseResult);

    expect(warnings.length).toBe(1);
  });

  it("should get all references correctly", () => {
    const content = "A=${B}\nC=${D}";
    const parseResult = parseEnvContent(content);

    const references = getAllReferences(parseResult);

    expect(references.length).toBe(2);
    expect(references.some((r) => r.key === "A" && r.reference === "B")).toBe(
      true,
    );
    expect(references.some((r) => r.key === "C" && r.reference === "D")).toBe(
      true,
    );
  });
});
