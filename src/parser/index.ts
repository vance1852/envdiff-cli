import * as fs from 'fs';
import * as path from 'path';
import {
  ParsedVariable,
  ParseResult,
  ParseError,
  ParseWarning,
  EnvFile
} from './types';

/**
 * 解析 .env 文件内容
 * @param content - .env 文件的原始内容
 * @param filePath - 文件路径（用于错误报告）
 * @returns 解析结果
 */
export function parseEnvContent(content: string, filePath?: string): ParseResult {
  const variables = new Map<string, ParsedVariable>();
  const errors: ParseError[] = [];
  const warnings: ParseWarning[] = [];

  const lines = content.split(/\r?\n/);
  const duplicateKeys = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const line = lines[i];

    const trimmedLine = line.trim();

    if (trimmedLine === '' || trimmedLine.startsWith('#')) {
      continue;
    }

    const equalIndex = trimmedLine.indexOf('=');
    if (equalIndex === -1) {
      if (trimmedLine.length > 0) {
        errors.push({
          line: lineNumber,
          content: line,
          message: 'Invalid line format: missing "="'
        });
      }
      continue;
    }

    const key = trimmedLine.substring(0, equalIndex).trim();
    let rawValue = trimmedLine.substring(equalIndex + 1);

    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
      errors.push({
        line: lineNumber,
        content: line,
        message: `Invalid key: "${key}" - keys must start with a letter or underscore and contain only alphanumeric characters and underscores`
      });
      continue;
    }

    if (duplicateKeys.has(key)) {
      warnings.push({
        line: lineNumber,
        content: line,
        message: `Duplicate key: "${key}" - will use the last value`
      });
    }
    duplicateKeys.add(key);

    const { value, hasQuotes, quoteType, isEmpty } = parseValue(rawValue);
    const references = extractReferences(value);

    variables.set(key, {
      key,
      value,
      rawValue,
      lineNumber,
      hasQuotes,
      quoteType,
      isEmpty,
      references
    });
  }

  return { variables, errors, warnings };
}

/**
 * 解析变量值，处理引号
 * @param rawValue - 原始值字符串
 * @returns 解析后的值及元数据
 */
function parseValue(rawValue: string): {
  value: string;
  hasQuotes: boolean;
  quoteType: "'" | '"' | null;
  isEmpty: boolean;
} {
  const trimmed = rawValue.trim();

  if (trimmed === '') {
    return { value: '', hasQuotes: false, quoteType: null, isEmpty: true };
  }

  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    const quoteType = trimmed.charAt(0) as "'" | '"';
    const value = trimmed.slice(1, -1);
    return { value, hasQuotes: true, quoteType, isEmpty: value === '' };
  }

  return { value: trimmed, hasQuotes: false, quoteType: null, isEmpty: trimmed === '' };
}

/**
 * 从值中提取变量引用
 * @param value - 变量值
 * @returns 引用的变量名数组
 */
function extractReferences(value: string): string[] {
  const references: string[] = [];
  const regex = /\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}|\$([a-zA-Z_][a-zA-Z0-9_]*)/g;

  let match;
  while ((match = regex.exec(value)) !== null) {
    references.push(match[1] || match[2]);
  }

  return references;
}

/**
 * 从文件路径加载并解析 .env 文件
 * @param filePath - .env 文件的路径
 * @returns 解析后的 EnvFile 对象
 */
export function loadEnvFile(filePath: string): EnvFile {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  const content = fs.readFileSync(absolutePath, 'utf-8');
  const parseResult = parseEnvContent(content, absolutePath);

  return {
    filePath: absolutePath,
    content,
    parseResult
  };
}

/**
 * 解析字符串内容并返回结果（不涉及文件IO）
 * @param content - .env 文件内容字符串
 * @param fileName - 文件名（用于错误报告，可选）
 * @returns 解析结果
 */
export function parseEnvString(content: string, fileName?: string): ParseResult {
  return parseEnvContent(content, fileName);
}

/**
 * 获取解析结果中的所有变量名
 * @param parseResult - 解析结果
 * @returns 变量名数组
 */
export function getVariableNames(parseResult: ParseResult): string[] {
  return Array.from(parseResult.variables.keys());
}

/**
 * 检查变量是否为空值（KEY= 或 KEY）
 * @param variable - 解析后的变量
 * @returns 是否为空值
 */
export function isEmptyValue(variable: ParsedVariable): boolean {
  return variable.isEmpty;
}

/**
 * 获取变量的所有引用
 * @param parseResult - 解析结果
 * @param key - 变量名
 * @returns 引用的变量名数组
 */
export function getVariableReferences(parseResult: ParseResult, key: string): string[] {
  const variable = parseResult.variables.get(key);
  return variable ? variable.references : [];
}
