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
exports.loadEnvFile = loadEnvFile;
exports.parseEnvString = parseEnvString;
exports.getVariableNames = getVariableNames;
exports.isEmptyValue = isEmptyValue;
exports.getVariableReferences = getVariableReferences;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * 解析 .env 文件内容
 * @param content - .env 文件的原始内容
 * @param filePath - 文件路径（用于错误报告）
 * @returns 解析结果
 */
function parseEnvContent(content, filePath) {
    const variables = new Map();
    const errors = [];
    const warnings = [];
    const lines = content.split(/\r?\n/);
    const duplicateKeys = new Set();
    for (let i = 0; i < lines.length; i++) {
        const lineNumber = i + 1;
        const line = lines[i];
        const trimmedLine = line.trim();
        if (trimmedLine === '' || trimmedLine.startsWith('#')) {
            continue;
        }
        const equalIndex = trimmedLine.indexOf('=');
        if (equalIndex === -1) {
            if (trimmedLine.length > 0) {
                errors.push({
                    line: lineNumber,
                    content: line,
                    message: 'Invalid line format: missing "="'
                });
            }
            continue;
        }
        const key = trimmedLine.substring(0, equalIndex).trim();
        let rawValue = trimmedLine.substring(equalIndex + 1);
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
            errors.push({
                line: lineNumber,
                content: line,
                message: `Invalid key: "${key}" - keys must start with a letter or underscore and contain only alphanumeric characters and underscores`
            });
            continue;
        }
        if (duplicateKeys.has(key)) {
            warnings.push({
                line: lineNumber,
                content: line,
                message: `Duplicate key: "${key}" - will use the last value`
            });
        }
        duplicateKeys.add(key);
        const { value, hasQuotes, quoteType, isEmpty } = parseValue(rawValue);
        const references = extractReferences(value);
        variables.set(key, {
            key,
            value,
            rawValue,
            lineNumber,
            hasQuotes,
            quoteType,
            isEmpty,
            references
        });
    }
    return { variables, errors, warnings };
}
/**
 * 解析变量值，处理引号
 * @param rawValue - 原始值字符串
 * @returns 解析后的值及元数据
 */
function parseValue(rawValue) {
    const trimmed = rawValue.trim();
    if (trimmed === '') {
        return { value: '', hasQuotes: false, quoteType: null, isEmpty: true };
    }
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        const quoteType = trimmed.charAt(0);
        const value = trimmed.slice(1, -1);
        return { value, hasQuotes: true, quoteType, isEmpty: value === '' };
    }
    return { value: trimmed, hasQuotes: false, quoteType: null, isEmpty: trimmed === '' };
}
/**
 * 从值中提取变量引用
 * @param value - 变量值
 * @returns 引用的变量名数组
 */
function extractReferences(value) {
    const references = [];
    const regex = /\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}|\$([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let match;
    while ((match = regex.exec(value)) !== null) {
        references.push(match[1] || match[2]);
    }
    return references;
}
/**
 * 从文件路径加载并解析 .env 文件
 * @param filePath - .env 文件的路径
 * @returns 解析后的 EnvFile 对象
 */
function loadEnvFile(filePath) {
    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath)) {
        throw new Error(`File not found: ${absolutePath}`);
    }
    const content = fs.readFileSync(absolutePath, 'utf-8');
    const parseResult = parseEnvContent(content, absolutePath);
    return {
        filePath: absolutePath,
        content,
        parseResult
    };
}
/**
 * 解析字符串内容并返回结果（不涉及文件IO）
 * @param content - .env 文件内容字符串
 * @param fileName - 文件名（用于错误报告，可选）
 * @returns 解析结果
 */
function parseEnvString(content, fileName) {
    return parseEnvContent(content, fileName);
}
/**
 * 获取解析结果中的所有变量名
 * @param parseResult - 解析结果
 * @returns 变量名数组
 */
function getVariableNames(parseResult) {
    return Array.from(parseResult.variables.keys());
}
/**
 * 检查变量是否为空值（KEY= 或 KEY）
 * @param variable - 解析后的变量
 * @returns 是否为空值
 */
function isEmptyValue(variable) {
    return variable.isEmpty;
}
/**
 * 获取变量的所有引用
 * @param parseResult - 解析结果
 * @param key - 变量名
 * @returns 引用的变量名数组
 */
function getVariableReferences(parseResult, key) {
    const variable = parseResult.variables.get(key);
    return variable ? variable.references : [];
}
//# sourceMappingURL=index.js.map