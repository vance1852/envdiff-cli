/**
 * Differ 模块的类型定义
 */

import { EnvFile, ParsedVariable } from '../parser/types';

export interface VariableValue {
  fileName: string;
  value: string;
  hasQuotes: boolean;
  quoteType: "'" | '"' | null;
}

export interface MissingVariable {
  key: string;
  missingInFiles: string[];
}

export interface InconsistentValue {
  key: string;
  values: VariableValue[];
  isFormatInconsistent: boolean;
}

export interface FormatInconsistency {
  key: string;
  fileName: string;
  value: string;
  hasQuotes: boolean;
  quoteType: "'" | '"' | null;
}

export interface CompareResult {
  missingVariables: MissingVariable[];
  inconsistentValues: InconsistentValue[];
  formatInconsistencies: FormatInconsistency[];
}

export interface LintError {
  key: string;
  line?: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface LintResult {
  errors: LintError[];
  warnings: LintError[];
  passed: boolean;
}

export interface VariableReference {
  key: string;
  reference: string;
  line?: number;
}
