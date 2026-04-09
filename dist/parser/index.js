"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseEnvContent = parseEnvContent;
exports.parseEnvFile = parseEnvFile;
const fs = __importStar(require("fs"));
/**
 * 解析 .env 文件内容
 * @param content - .env 文件的字符串内容
 * @returns 包含解析结果、条目列表和错误信息的对象
 */
function parseEnvContent(content) {
    const lines = content.split('\n');
    const entries = new Map();
    const entryList = [];
    const errors = [];
    let lineNumber = 0;
    let multilineKey = null;
    let multilineValue = [];
    let multilineQuote = null;
    let multilineRawValue = [];
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
                const entry = {
                    key: multilineKey,
                    value: fullValue,
                    rawValue: fullRawValue,
                    quoteType: multilineQuote,
                    lineNumber: multilineStartLine,
                };
                entries.set(multilineKey, entry);
                entryList.push(entry);
                multilineKey = null;
                multilineValue = [];
                multilineQuote = null;
                multilineRawValue = [];
            }
            else {
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
            const entry = {
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
        let quoteType = 'none';
        if (rawValue.startsWith('"')) {
            quoteType = 'double';
            value = rawValue.slice(1);
            if (value.endsWith('"')) {
                value = value.slice(0, -1);
            }
            else {
                multilineKey = key;
                multilineQuote = 'double';
                multilineStartLine = lineNumber;
                multilineRawValue = [rawValue];
                multilineValue = [value];
                continue;
            }
        }
        else if (rawValue.startsWith("'")) {
            quoteType = 'single';
            value = rawValue.slice(1);
            if (value.endsWith("'")) {
                value = value.slice(0, -1);
            }
            else {
                multilineKey = key;
                multilineQuote = 'single';
                multilineStartLine = lineNumber;
                multilineRawValue = [rawValue];
                multilineValue = [value];
                continue;
            }
        }
        const entry = {
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
async function parseEnvFile(filePath) {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return parseEnvContent(content);
}
