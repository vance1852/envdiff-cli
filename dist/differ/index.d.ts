import { EnvFile, ParseResult } from '../parser/types';
import { CompareResult, LintResult, LintError, VariableReference } from './types';
/**
 * 比较多个 .env 文件，输出差异报告
 * @param envFiles - 要比较的 EnvFile 数组
 * @returns 比较结果
 */
export declare function compareEnvFiles(envFiles: EnvFile[]): CompareResult;
/**
 * 检查变量引用的目标是否存在
 * @param parseResult - 解析结果
 * @returns 缺失引用的错误数组
 */
export declare function checkUndefinedReferences(parseResult: ParseResult): LintError[];
/**
 * 检测循环变量引用
 * @param parseResult - 解析结果
 * @returns 循环引用的错误数组
 */
export declare function detectCircularReferences(parseResult: ParseResult): LintError[];
/**
 * 检测重复定义的 key
 * @param parseResult - 解析结果
 * @returns 重复定义的警告数组
 */
export declare function checkDuplicateKeys(parseResult: ParseResult): LintError[];
/**
 * 检测空值变量
 * @param parseResult - 解析结果
 * @returns 空值变量的警告数组
 */
export declare function checkEmptyValues(parseResult: ParseResult): LintError[];
/**
 * 对单个 .env 文件进行静态检查
 * @param envFile - 要检查的 EnvFile
 * @returns LintResult
 */
export declare function lintEnvFile(envFile: EnvFile): LintResult;
/**
 * 获取所有变量引用关系
 * @param parseResult - 解析结果
 * @returns 变量引用关系数组
 */
export declare function getAllReferences(parseResult: ParseResult): VariableReference[];
//# sourceMappingURL=index.d.ts.map