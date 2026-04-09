import { ParseResult, EnvEntry } from '../parser';

export interface MissingVariable {
  key: string;
  missingInFiles: string[];
}

export interface ValueConflict {
  key: string;
  values: { fileName: string; value: string; quoteType: string }[];
}

export interface FormatInconsistency {
  key: string;
  type: 'quote' | 'numeric';
  details: { fileName: string; value: string; quoteType: string }[];
}

export interface CompareResult {
  allKeys: string[];
  missingVariables: MissingVariable[];
  valueConflicts: ValueConflict[];
  formatInconsistencies: FormatInconsistency[];
}

export interface LintDuplicateKey {
  key: string;
  occurrences: { lineNumber: number; value: string }[];
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
export function compareEnvFiles(files: { fileName: string; parseResult: ParseResult }[]): CompareResult {
  const allKeys = new Set<string>();
  const keyFileMap: Map<string, Set<string>> = new Map();
  const keyValues: Map<string, Map<string, { value: string; quoteType: string }>> = new Map();

  for (const { fileName, parseResult } of files) {
    for (const [key, entry] of parseResult.entries) {
      allKeys.add(key);

      if (!keyFileMap.has(key)) {
        keyFileMap.set(key, new Set());
      }
      keyFileMap.get(key)!.add(fileName);

      if (!keyValues.has(key)) {
        keyValues.set(key, new Map());
      }
      keyValues.get(key)!.set(fileName, {
        value: entry.value,
        quoteType: entry.quoteType,
      });
    }
  }

  const allFileNames = files.map(f => f.fileName);
  const missingVariables: MissingVariable[] = [];
  const valueConflicts: ValueConflict[] = [];
  const formatInconsistencies: FormatInconsistency[] = [];

  for (const key of allKeys) {
    const filesWithKey = keyFileMap.get(key)!;
    if (filesWithKey.size !== files.length) {
      const missingInFiles = allFileNames.filter(fn => !filesWithKey.has(fn));
      missingVariables.push({ key, missingInFiles });
    }

    const valuesForKeys = keyValues.get(key)!;
    const uniqueValues = new Set<string>();
    const valueArray: { fileName: string; value: string; quoteType: string }[] = [];
    const quoteTypes: Set<string> = new Set();
    const numericCheck: { isNumeric: boolean; fileName: string; value: string; quoteType: string }[] = [];

    for (const fileName of filesWithKey) {
      const valInfo = valuesForKeys.get(fileName)!;
      uniqueValues.add(valInfo.value);
      valueArray.push({ fileName, ...valInfo });
      quoteTypes.add(valInfo.quoteType);

      const isNumeric = /^\d+$/.test(valInfo.value);
      numericCheck.push({ ...valInfo, fileName, isNumeric });
    }

    if (uniqueValues.size !== 1) {
      valueConflicts.push({ key, values: valueArray });
    }

    if (quoteTypes.size > 1) {
      formatInconsistencies.push({
        key,
        type: 'quote',
        details: valueArray,
      });
    }

    const hasMixedNumeric = numericCheck.some(n => n.isNumeric) && 
      numericCheck.some(n => !n.isNumeric);
    if (hasMixedNumeric) {
      formatInconsistencies.push({
        key,
        type: 'numeric',
        details: valueArray,
      });
    }
  }

  return {
    allKeys: Array.from(allKeys).sort(),
    missingVariables: missingVariables.sort((a, b) => a.key.localeCompare(b.key)),
    valueConflicts: valueConflicts.sort((a, b) => a.key.localeCompare(b.key)),
    formatInconsistencies: formatInconsistencies.sort((a, b) => a.key.localeCompare(b.key)),
  };
}

/**
 * 对单个 .env 文件执行静态检查
 * @param parseResult - 解析结果
 * @returns LintResult - 包含重复键、空值、未定义引用和循环引用
 */
export function lintEnvFile(parseResult: ParseResult): LintResult {
  const duplicateKeys: LintDuplicateKey[] = [];
  const emptyValues: LintEmptyValue[] = [];
  const undefinedReferences: LintUndefinedReference[] = [];
  const cyclicReferences: LintCyclicReference[] = [];

  const keyOccurrences: Map<string, { lineNumber: number; value: string }[]> = new Map();
  for (const entry of parseResult.lines) {
    if (!keyOccurrences.has(entry.key)) {
      keyOccurrences.set(entry.key, []);
    }
    keyOccurrences.get(entry.key)!.push({
      lineNumber: entry.lineNumber,
      value: entry.value,
    });
  }

  for (const [key, occurrences] of keyOccurrences) {
    if (occurrences.length > 1) {
      duplicateKeys.push({
        key,
        occurrences,
        finalValue: occurrences[occurrences.length - 1].value,
      });
    }
  }

  for (const [key, entry] of parseResult.entries) {
    if (entry.value === '') {
      emptyValues.push({ key, lineNumber: entry.lineNumber });
    }
  }

  const allKeys = new Set(parseResult.entries.keys());
  const referenceMap: Map<string, Set<string>> = new Map();
  const variableRefRegex = /\$\{?(\w+)\}?/g;

  for (const [key, entry] of parseResult.entries) {
    const value = entry.value;
    let match;
    const referencedKeys = new Set<string>();

    while ((match = variableRefRegex.exec(value)) !== null) {
      const referencedKey = match[1];
      referencedKeys.add(referencedKey);

      if (!allKeys.has(referencedKey)) {
        undefinedReferences.push({
          key,
          lineNumber: entry.lineNumber,
          referencedKey,
        });
      }
    }

    if (referencedKeys.size > 0) {
      referenceMap.set(key, referencedKeys);
    }
  }

  const visited = new Set<string>();
  const inPath = new Set<string>();
  const path: string[] = [];

  function detectCycle(key: string): boolean {
    if (inPath.has(key)) {
      const cycleStart = path.indexOf(key);
      const cycle = path.slice(cycleStart);
      cycle.push(key);
      cyclicReferences.push({ keys: cycle });
      return true;
    }

    if (visited.has(key)) {
      return false;
    }

    visited.add(key);
    inPath.add(key);
    path.push(key);

    const refs = referenceMap.get(key);
    if (refs) {
      for (const ref of refs) {
        if (detectCycle(ref)) {
          return true;
        }
      }
    }

    path.pop();
    inPath.delete(key);
    return false;
  }

  for (const key of referenceMap.keys()) {
    if (!visited.has(key)) {
      detectCycle(key);
    }
  }

  return {
    duplicateKeys,
    emptyValues,
    undefinedReferences,
    cyclicReferences,
  };
}
