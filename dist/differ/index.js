"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareEnvFiles = compareEnvFiles;
exports.checkUndefinedReferences = checkUndefinedReferences;
exports.detectCircularReferences = detectCircularReferences;
exports.checkDuplicateKeys = checkDuplicateKeys;
exports.checkEmptyValues = checkEmptyValues;
exports.lintEnvFile = lintEnvFile;
exports.getAllReferences = getAllReferences;
/**
 * 比较多个 .env 文件，输出差异报告
 * @param envFiles - 要比较的 EnvFile 数组
 * @returns 比较结果
 */
function compareEnvFiles(envFiles) {
    const missingVariables = [];
    const inconsistentValues = [];
    const formatInconsistencies = [];
    const allKeys = new Set();
    const fileKeyMap = new Map();
    for (const envFile of envFiles) {
        const keys = new Set(envFile.parseResult.variables.keys());
        fileKeyMap.set(envFile.filePath, keys);
        for (const key of keys) {
            allKeys.add(key);
        }
    }
    for (const key of allKeys) {
        const values = [];
        const missingInFiles = [];
        const fileValueMap = new Map();
        for (const envFile of envFiles) {
            const variable = envFile.parseResult.variables.get(key);
            if (variable) {
                fileValueMap.set(envFile.filePath, variable);
                values.push({
                    fileName: envFile.filePath,
                    value: variable.value,
                    hasQuotes: variable.hasQuotes,
                    quoteType: variable.quoteType
                });
            }
            else {
                missingInFiles.push(envFile.filePath);
            }
        }
        if (missingInFiles.length > 0 && missingInFiles.length < envFiles.length) {
            missingVariables.push({ key, missingInFiles });
        }
        if (values.length > 1) {
            const uniqueValues = new Set(values.map(v => v.value));
            const uniqueFormats = values.map(v => `${v.hasQuotes}-${v.quoteType}`);
            if (uniqueValues.size > 1) {
                inconsistentValues.push({
                    key,
                    values,
                    isFormatInconsistent: false
                });
            }
            const uniqueFormatSet = new Set(uniqueFormats);
            if (uniqueFormatSet.size > 1) {
                for (const val of values) {
                    if (val.hasQuotes) {
                        formatInconsistencies.push({
                            key,
                            fileName: val.fileName,
                            value: val.value,
                            hasQuotes: val.hasQuotes,
                            quoteType: val.quoteType
                        });
                    }
                }
                if (inconsistentValues.some(iv => iv.key === key)) {
                    inconsistentValues.find(iv => iv.key === key).isFormatInconsistent = true;
                }
                else {
                    inconsistentValues.push({
                        key,
                        values,
                        isFormatInconsistent: true
                    });
                }
            }
        }
    }
    return {
        missingVariables,
        inconsistentValues,
        formatInconsistencies
    };
}
/**
 * 检查变量引用的目标是否存在
 * @param parseResult - 解析结果
 * @returns 缺失引用的错误数组
 */
function checkUndefinedReferences(parseResult) {
    const errors = [];
    const definedKeys = new Set(parseResult.variables.keys());
    for (const [key, variable] of parseResult.variables.entries()) {
        for (const ref of variable.references) {
            if (!definedKeys.has(ref)) {
                errors.push({
                    key,
                    line: variable.lineNumber,
                    message: `Variable "${key}" references undefined variable "${ref}"`,
                    severity: 'error'
                });
            }
        }
    }
    return errors;
}
/**
 * 检测循环变量引用
 * @param parseResult - 解析结果
 * @returns 循环引用的错误数组
 */
function detectCircularReferences(parseResult) {
    const errors = [];
    const visited = new Set();
    const recursionStack = new Set();
    const getReferences = (key) => {
        const variable = parseResult.variables.get(key);
        return variable ? variable.references : [];
    };
    const dfs = (key, path) => {
        if (recursionStack.has(key)) {
            const cycleStart = path.indexOf(key);
            const cycle = path.slice(cycleStart).join(' -> ');
            errors.push({
                key,
                message: `Circular reference detected: ${cycle} -> ${key}`,
                severity: 'error'
            });
            return;
        }
        if (visited.has(key)) {
            return;
        }
        visited.add(key);
        recursionStack.add(key);
        const references = getReferences(key);
        for (const ref of references) {
            if (parseResult.variables.has(ref)) {
                dfs(ref, [...path, key]);
            }
        }
        recursionStack.delete(key);
    };
    for (const key of parseResult.variables.keys()) {
        if (!visited.has(key)) {
            dfs(key, []);
        }
    }
    return errors;
}
/**
 * 检测重复定义的 key
 * @param parseResult - 解析结果
 * @returns 重复定义的警告数组
 */
function checkDuplicateKeys(parseResult) {
    const warnings = [];
    const seenKeys = new Set();
    const keyLines = new Map();
    for (const [key, variable] of parseResult.variables.entries()) {
        if (seenKeys.has(key)) {
            const lines = keyLines.get(key) || [];
            lines.push(variable.lineNumber);
            keyLines.set(key, lines);
        }
        else {
            seenKeys.add(key);
            keyLines.set(key, [variable.lineNumber]);
        }
    }
    for (const [key, lines] of keyLines.entries()) {
        if (lines.length > 1) {
            warnings.push({
                key,
                line: lines[lines.length - 1],
                message: `Duplicate key "${key}" defined on lines: ${lines.join(', ')}. Using value from line ${lines[lines.length - 1]}`,
                severity: 'warning'
            });
        }
    }
    return warnings;
}
/**
 * 检测空值变量
 * @param parseResult - 解析结果
 * @returns 空值变量的警告数组
 */
function checkEmptyValues(parseResult) {
    const warnings = [];
    for (const [key, variable] of parseResult.variables.entries()) {
        if (variable.isEmpty) {
            warnings.push({
                key,
                line: variable.lineNumber,
                message: `Empty value for variable "${key}"`,
                severity: 'warning'
            });
        }
    }
    return warnings;
}
/**
 * 对单个 .env 文件进行静态检查
 * @param envFile - 要检查的 EnvFile
 * @returns LintResult
 */
function lintEnvFile(envFile) {
    const errors = [];
    const warnings = [];
    for (const err of envFile.parseResult.errors) {
        errors.push({
            key: '',
            line: err.line,
            message: err.message,
            severity: 'error'
        });
    }
    for (const warn of envFile.parseResult.warnings) {
        warnings.push({
            key: '',
            line: warn.line,
            message: warn.message,
            severity: 'warning'
        });
    }
    const undefinedRefs = checkUndefinedReferences(envFile.parseResult);
    errors.push(...undefinedRefs);
    const circularRefs = detectCircularReferences(envFile.parseResult);
    errors.push(...circularRefs);
    const duplicates = checkDuplicateKeys(envFile.parseResult);
    warnings.push(...duplicates);
    const emptyValues = checkEmptyValues(envFile.parseResult);
    warnings.push(...emptyValues);
    return {
        errors,
        warnings,
        passed: errors.length === 0
    };
}
/**
 * 获取所有变量引用关系
 * @param parseResult - 解析结果
 * @returns 变量引用关系数组
 */
function getAllReferences(parseResult) {
    const references = [];
    for (const [key, variable] of parseResult.variables.entries()) {
        for (const ref of variable.references) {
            references.push({
                key,
                reference: ref,
                line: variable.lineNumber
            });
        }
    }
    return references;
}
//# sourceMappingURL=index.js.map