"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareEnvFiles = compareEnvFiles;
exports.lintEnvFile = lintEnvFile;
/**
 * 比较多个 .env 文件之间的差异
 * @param files - 包含文件名和对应解析结果的数组
 * @returns 比较结果，包含缺失变量、值冲突和格式不一致
 */
function compareEnvFiles(files) {
    const allKeys = new Set();
    const keyFileMap = new Map();
    const keyValues = new Map();
    for (const { fileName, parseResult } of files) {
        for (const [key, entry] of parseResult.entries) {
            allKeys.add(key);
            if (!keyFileMap.has(key)) {
                keyFileMap.set(key, new Set());
            }
            keyFileMap.get(key).add(fileName);
            if (!keyValues.has(key)) {
                keyValues.set(key, new Map());
            }
            keyValues.get(key).set(fileName, {
                value: entry.value,
                quoteType: entry.quoteType,
            });
        }
    }
    const allFileNames = files.map(f => f.fileName);
    const missingVariables = [];
    const valueConflicts = [];
    const formatInconsistencies = [];
    for (const key of allKeys) {
        const filesWithKey = keyFileMap.get(key);
        if (filesWithKey.size !== files.length) {
            const missingInFiles = allFileNames.filter(fn => !filesWithKey.has(fn));
            missingVariables.push({ key, missingInFiles });
        }
        const valuesForKeys = keyValues.get(key);
        const uniqueValues = new Set();
        const valueArray = [];
        const quoteTypes = new Set();
        const numericCheck = [];
        for (const fileName of filesWithKey) {
            const valInfo = valuesForKeys.get(fileName);
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
function lintEnvFile(parseResult) {
    const duplicateKeys = [];
    const emptyValues = [];
    const undefinedReferences = [];
    const cyclicReferences = [];
    const keyOccurrences = new Map();
    for (const entry of parseResult.lines) {
        if (!keyOccurrences.has(entry.key)) {
            keyOccurrences.set(entry.key, []);
        }
        keyOccurrences.get(entry.key).push({
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
    const referenceMap = new Map();
    const variableRefRegex = /\$\{?(\w+)\}?/g;
    for (const [key, entry] of parseResult.entries) {
        const value = entry.value;
        let match;
        const referencedKeys = new Set();
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
    const visited = new Set();
    const inPath = new Set();
    const path = [];
    function detectCycle(key) {
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
