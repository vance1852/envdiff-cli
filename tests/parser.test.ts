import { describe, it, expect } from "vitest";
import {
  parseEnvContent,
  parseEnvString,
  getVariableNames,
  isEmptyValue,
  getVariableReferences,
  loadEnvFile,
} from "../src/parser";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

describe("Parser Module - Normal Cases", () => {
  it("should parse simple key-value pairs", () => {
    const content = `
DB_HOST=localhost
DB_PORT=3306
DB_NAME=myapp
`;
    const result = parseEnvContent(content);

    expect(result.variables.size).toBe(3);
    expect(result.errors.length).toBe(0);
    expect(result.warnings.length).toBe(0);

    expect(result.variables.get("DB_HOST")?.value).toBe("localhost");
    expect(result.variables.get("DB_PORT")?.value).toBe("3306");
    expect(result.variables.get("DB_NAME")?.value).toBe("myapp");
  });

  it("should handle quoted values", () => {
    const content = `
DB_HOST="localhost"
DB_PASSWORD='secret123'
SINGLE_QUOTES='value with spaces'
`;
    const result = parseEnvContent(content);

    expect(result.variables.get("DB_HOST")?.value).toBe("localhost");
    expect(result.variables.get("DB_HOST")?.hasQuotes).toBe(true);
    expect(result.variables.get("DB_HOST")?.quoteType).toBe('"');

    expect(result.variables.get("DB_PASSWORD")?.value).toBe("secret123");
    expect(result.variables.get("DB_PASSWORD")?.quoteType).toBe("'");

    expect(result.variables.get("SINGLE_QUOTES")?.value).toBe(
      "value with spaces",
    );
  });

  it("should extract variable references", () => {
    const content = [
      "BASE_URL=${HOST}:${PORT}",
      "DB_CONNECTION=mysql://${DB_HOST}:${DB_PORT}",
      "SIMPLE_REF=$OTHER_VAR",
      "BRACED_REF=${ANOTHER_VAR}",
    ].join("\n");
    const result = parseEnvContent(content);

    const baseUrlRefs = result.variables.get("BASE_URL")?.references;
    expect(baseUrlRefs).toContain("HOST");
    expect(baseUrlRefs).toContain("PORT");

    const dbConnectionRefs = result.variables.get("DB_CONNECTION")?.references;
    expect(dbConnectionRefs).toContain("DB_HOST");
    expect(dbConnectionRefs).toContain("DB_PORT");

    expect(result.variables.get("SIMPLE_REF")?.references).toContain(
      "OTHER_VAR",
    );
    expect(result.variables.get("BRACED_REF")?.references).toContain(
      "ANOTHER_VAR",
    );
  });

  it("should track line numbers", () => {
    const content = `
# This is a comment
FIRST_VAR=value1

SECOND_VAR=value2
`;
    const result = parseEnvContent(content);

    expect(result.variables.get("FIRST_VAR")?.lineNumber).toBe(3);
    expect(result.variables.get("SECOND_VAR")?.lineNumber).toBe(5);
  });

  it("should handle duplicate keys with warnings", () => {
    const content = `
DB_HOST=first
DB_HOST=second
DB_HOST=third
`;
    const result = parseEnvContent(content);

    expect(result.variables.size).toBe(1);
    expect(result.variables.get("DB_HOST")?.value).toBe("third");
    expect(result.warnings.length).toBe(2);
    expect(result.warnings[0].message).toContain("Duplicate key");
  });

  it("should use parseEnvString alias correctly", () => {
    const content = "TEST_VAR=test";
    const result = parseEnvString(content);

    expect(result.variables.size).toBe(1);
    expect(result.variables.get("TEST_VAR")?.value).toBe("test");
  });

  it("should return variable names using getVariableNames", () => {
    const content = `
VAR_A=value1
VAR_B=value2
VAR_C=value3
`;
    const result = parseEnvContent(content);
    const names = getVariableNames(result);

    expect(names).toContain("VAR_A");
    expect(names).toContain("VAR_B");
    expect(names).toContain("VAR_C");
    expect(names.length).toBe(3);
  });
});

describe("Parser Module - Edge Cases", () => {
  it("should handle empty content", () => {
    const content = "";
    const result = parseEnvContent(content);

    expect(result.variables.size).toBe(0);
    expect(result.errors.length).toBe(0);
  });

  it("should handle content with only whitespace and comments", () => {
    const content = `
# This is a comment
# Another comment

# Final comment
`;
    const result = parseEnvContent(content);

    expect(result.variables.size).toBe(0);
    expect(result.errors.length).toBe(0);
  });

  it("should report error for invalid line format without equals sign", () => {
    const content = `
INVALID_LINE
ANOTHER_INVALID
DB_HOST=valid
`;
    const result = parseEnvContent(content);

    expect(result.errors.length).toBe(2);
    expect(result.errors[0].message).toContain('missing "="');
    expect(result.variables.size).toBe(1);
  });

  it("should report error for invalid key names", () => {
    const content = `
123INVALID= value
KEY-WITH-DASH= value
KEY.WITH.DOT= value
VALID_KEY= value
`;
    const result = parseEnvContent(content);

    expect(result.errors.length).toBe(3);
    expect(result.variables.size).toBe(1);
    expect(result.variables.has("VALID_KEY")).toBe(true);
  });

  it("should detect empty values", () => {
    const content = `
EMPTY_VAR1=
EMPTY_VAR2=
EMPTY_VAR3=
WITH_VALUE=value
`;
    const result = parseEnvContent(content);

    expect(result.variables.get("EMPTY_VAR1")?.isEmpty).toBe(true);
    expect(result.variables.get("EMPTY_VAR2")?.isEmpty).toBe(true);
    expect(result.variables.get("EMPTY_VAR3")?.isEmpty).toBe(true);
    expect(result.variables.get("WITH_VALUE")?.isEmpty).toBe(false);
  });

  it("should handle empty quoted values", () => {
    const content = `
EMPTY_QUOTED1=""
EMPTY_QUOTED2=''
`;
    const result = parseEnvContent(content);

    expect(result.variables.get("EMPTY_QUOTED1")?.isEmpty).toBe(true);
    expect(result.variables.get("EMPTY_QUOTED1")?.value).toBe("");
    expect(result.variables.get("EMPTY_QUOTED2")?.isEmpty).toBe(true);
  });

  it("should use isEmptyValue helper correctly", () => {
    const content = `
VAR1=
VAR2=value
`;
    const result = parseEnvContent(content);

    expect(isEmptyValue(result.variables.get("VAR1")!)).toBe(true);
    expect(isEmptyValue(result.variables.get("VAR2")!)).toBe(false);
  });

  it("should return empty references array for values without references", () => {
    const content = `
SIMPLE_VALUE=plain
WITH_REF=$OTHER
`;
    const result = parseEnvContent(content);

    expect(getVariableReferences(result, "SIMPLE_VALUE")).toEqual([]);
    expect(getVariableReferences(result, "WITH_REF")).toContain("OTHER");
  });

  it("should handle keys with leading/trailing spaces", () => {
    const content = `
  SPACED_KEY  =value
NORMAL_KEY=value
`;
    const result = parseEnvContent(content);

    expect(result.variables.get("SPACED_KEY")?.value).toBe("value");
    expect(result.variables.has("  SPACED_KEY  ")).toBe(false);
  });

  it("should handle values with equals sign", () => {
    const content = `
EQUATION=x=y=z
URL=http://example.com?a=b&c=d
`;
    const result = parseEnvContent(content);

    expect(result.variables.get("EQUATION")?.value).toBe("x=y=z");
    expect(result.variables.get("URL")?.value).toBe(
      "http://example.com?a=b&c=d",
    );
  });
});

describe("Parser Module - File Loading", () => {
  it("should load and parse env file from filesystem", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "envdiff-test-"));
    const tempFile = path.join(tempDir, ".env");
    const content = `TEST_VAR=hello\nDB_PORT=5432`;
    fs.writeFileSync(tempFile, content);

    const result = loadEnvFile(tempFile);

    expect(result.parseResult.variables.size).toBe(2);
    expect(result.parseResult.variables.get("TEST_VAR")?.value).toBe("hello");
    expect(result.parseResult.variables.get("DB_PORT")?.value).toBe("5432");

    fs.unlinkSync(tempFile);
    fs.rmdirSync(tempDir);
  });

  it("should throw error for non-existent file", () => {
    expect(() => loadEnvFile("/non/existent/path/.env")).toThrow(
      "File not found",
    );
  });
});
