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
export declare function parseEnvContent(content: string): ParseResult;
/**
 * 从文件系统读取并解析 .env 文件
 * @param filePath - .env 文件路径
 * @returns Promise<ParseResult> 解析结果
 */
export declare function parseEnvFile(filePath: string): Promise<ParseResult>;
