import * as fs from 'fs';

export interface EnvEntry {
  key: string;
  value: string;
  rawValue: string;
  quoteType: 'none' | 'single' | 'double';
  lineNumber: number;
}

export interface ParseResult {
  entries: Map<string, EnvEntry>;
  lines: EnvEntry[];
  errors: string[];
}

/**
 * 解析 .env 文件内容
 * @param content - .env 文件的字符串内容
 * @returns 包含解析结果、条目列表和错误信息的对象
 */
export function parseEnvContent(content: string): ParseResult {
  const lines = content.split('\n');
  const entries: Map<string, EnvEntry> = new Map();
  const entryList: EnvEntry[] = [];
  const errors: string[] = [];

  let lineNumber = 0;
  let multilineKey: string | null = null;
  let multilineValue: string[] = [];
  let multilineQuote: 'single' | 'double' | null = null;
  let multilineRawValue: string[] = [];
  let multilineStartLine = 0;

  for (const line of lines) {
    lineNumber++;

    if (multilineKey !== null) {
      multilineRawValue.push(line);
      const closingQuote = multilineQuote === 'single' ? "'" : '"';
      
      if (line.trimEnd().endsWith(closingQuote)) {
        const trimmedLine = line.trimEnd();
        const valuePart = trimmedLine.slice(0, -1);
        multilineValue.push(valuePart);
        
        const fullValue = multilineValue.join('\n');
        const fullRawValue = multilineRawValue.join('\n');
        
        const entry: EnvEntry = {
          key: multilineKey,
          value: fullValue,
          rawValue: fullRawValue,
          quoteType: multilineQuote!,
          lineNumber: multilineStartLine,
        };
        
        entries.set(multilineKey, entry);
        entryList.push(entry);
        
        multilineKey = null;
        multilineValue = [];
        multilineQuote = null;
        multilineRawValue = [];
      } else {
        multilineValue.push(line);
      }
      continue;
    }

    const trimmedLine = line.trim();
    
    if (trimmedLine === '' || trimmedLine.startsWith('#')) {
      continue;
    }
    
    const equalIndex = trimmedLine.indexOf('=');
    if (equalIndex === -1) {
      const key = trimmedLine;
      
      const entry: EnvEntry = {
        key,
        value: '',
        rawValue: '',
        quoteType: 'none',
        lineNumber,
      };
      
      entries.set(key, entry);
      entryList.push(entry);
      continue;
    }
    
    const key = trimmedLine.slice(0, equalIndex).trim();
    let rawValue = trimmedLine.slice(equalIndex + 1);
    let value = rawValue;
    let quoteType: 'none' | 'single' | 'double' = 'none';
    
    if (rawValue.startsWith('"')) {
      quoteType = 'double';
      value = rawValue.slice(1);
      
      if (value.endsWith('"')) {
        value = value.slice(0, -1);
      } else {
        multilineKey = key;
        multilineQuote = 'double';
        multilineStartLine = lineNumber;
        multilineRawValue = [rawValue];
        multilineValue = [value];
        continue;
      }
    } else if (rawValue.startsWith("'")) {
      quoteType = 'single';
      value = rawValue.slice(1);
      
      if (value.endsWith("'")) {
        value = value.slice(0, -1);
      } else {
        multilineKey = key;
        multilineQuote = 'single';
        multilineStartLine = lineNumber;
        multilineRawValue = [rawValue];
        multilineValue = [value];
        continue;
      }
    }
    
    const entry: EnvEntry = {
      key,
      value,
      rawValue,
      quoteType,
      lineNumber,
    };
    
    entries.set(key, entry);
    entryList.push(entry);
  }
  
  if (multilineKey !== null) {
    errors.push(`Unclosed multiline value for key '${multilineKey}' starting at line ${multilineStartLine}`);
  }
  
  return { entries, lines: entryList, errors };
}

/**
 * 从文件系统读取并解析 .env 文件
 * @param filePath - .env 文件路径
 * @returns Promise<ParseResult> 解析结果
 */
export async function parseEnvFile(filePath: string): Promise<ParseResult> {
  const content = await fs.promises.readFile(filePath, 'utf-8');
  return parseEnvContent(content);
}
