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
export declare function parseEnvFile(filePath: string): ParseResult;
//# sourceMappingURL=parser.d.ts.map