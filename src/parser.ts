import * as fs from 'fs';

export interface EnvEntry {
  key: string;
  value: string;
  rawValue: string;
  lineNumber: number;
  hasQuotes: boolean;
  quoteType: 'single' | 'double' | 'none';
}

export interface ParseResult {
  entries: Map<string, EnvEntry>;
  rawLines: string[];
}

/**
 * Parses a .env file and returns a Map of key-value pairs with metadata.
 * @param filePath - Path to the .env file
 * @returns ParseResult containing entries and raw lines
 */
export function parseEnvFile(filePath: string): ParseResult {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const entries = new Map<string, EnvEntry>();

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      return;
    }

    const equalsIndex = trimmedLine.indexOf('=');
    if (equalsIndex === -1) {
      const key = trimmedLine;
      entries.set(key, {
        key,
        value: '',
        rawValue: '',
        lineNumber,
        hasQuotes: false,
        quoteType: 'none',
      });
      return;
    }

    const key = trimmedLine.slice(0, equalsIndex).trim();
    let rawValue = trimmedLine.slice(equalsIndex + 1).trim();
    let value = rawValue;
    let hasQuotes = false;
    let quoteType: 'single' | 'double' | 'none' = 'none';

    if ((rawValue.startsWith('"') && rawValue.endsWith('"')) ||
        (rawValue.startsWith("'") && rawValue.endsWith("'"))) {
      hasQuotes = true;
      quoteType = rawValue.startsWith('"') ? 'double' : 'single';
      value = rawValue.slice(1, -1);
    }

    entries.set(key, {
      key,
      value,
      rawValue,
      lineNumber,
      hasQuotes,
      quoteType,
    });
  });

  return { entries, rawLines: lines };
}
