/**
 * Parser 模块的类型定义
 */

export interface ParsedVariable {
  key: string;
  value: string;
  rawValue: string;
  lineNumber: number;
  hasQuotes: boolean;
  quoteType: "'" | '"' | null;
  isEmpty: boolean;
  references: string[];
}

export interface ParseResult {
  variables: Map<string, ParsedVariable>;
  errors: ParseError[];
  warnings: ParseWarning[];
}

export interface ParseError {
  line: number;
  content: string;
  message: string;
}

export interface ParseWarning {
  line: number;
  content: string;
  message: string;
}

export interface EnvFile {
  filePath: string;
  content: string;
  parseResult: ParseResult;
}
