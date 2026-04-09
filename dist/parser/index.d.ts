import { ParsedVariable, ParseResult, EnvFile } from './types';
/**
 * 解析 .env 文件内容
 * @param content - .env 文件的原始内容
 * @param filePath - 文件路径（用于错误报告）
 * @returns 解析结果
 */
export declare function parseEnvContent(content: string, filePath?: string): ParseResult;
/**
 * 从文件路径加载并解析 .env 文件
 * @param filePath - .env 文件的路径
 * @returns 解析后的 EnvFile 对象
 */
export declare function loadEnvFile(filePath: string): EnvFile;
/**
 * 解析字符串内容并返回结果（不涉及文件IO）
 * @param content - .env 文件内容字符串
 * @param fileName - 文件名（用于错误报告，可选）
 * @returns 解析结果
 */
export declare function parseEnvString(content: string, fileName?: string): ParseResult;
/**
 * 获取解析结果中的所有变量名
 * @param parseResult - 解析结果
 * @returns 变量名数组
 */
export declare function getVariableNames(parseResult: ParseResult): string[];
/**
 * 检查变量是否为空值（KEY= 或 KEY）
 * @param variable - 解析后的变量
 * @returns 是否为空值
 */
export declare function isEmptyValue(variable: ParsedVariable): boolean;
/**
 * 获取变量的所有引用
 * @param parseResult - 解析结果
 * @param key - 变量名
 * @returns 引用的变量名数组
 */
export declare function getVariableReferences(parseResult: ParseResult, key: string): string[];
//# sourceMappingURL=index.d.ts.map