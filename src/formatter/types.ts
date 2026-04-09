/**
 * Formatter 模块的类型定义
 */

import { CompareResult, LintResult } from '../differ/types';

export type OutputFormat = 'table' | 'json';

export interface FormattedOutput {
  format: OutputFormat;
  content: string;
}

export interface TableColumn {
  header: string;
  width: number;
  align: 'left' | 'right' | 'center';
}

export interface TableRow {
  cells: string[];
}
