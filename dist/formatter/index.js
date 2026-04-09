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
exports.formatCompareResult = formatCompareResult;
exports.formatLintResult = formatLintResult;
exports.formatError = formatError;
exports.formatWarning = formatWarning;
const path = __importStar(require("path"));
/**
 * 格式化比较结果
 * @param compareResult - 比较结果
 * @param format - 输出格式 ('table' | 'json')
 * @param fileNames - 文件名数组
 * @returns 格式化后的输出
 */
function formatCompareResult(compareResult, format, fileNames) {
    if (format === "json") {
        return {
            format,
            content: JSON.stringify(compareResult, null, 2),
        };
    }
    return {
        format,
        content: formatCompareResultAsTable(compareResult, fileNames),
    };
}
/**
 * 将比较结果格式化为表格形式
 */
function formatCompareResultAsTable(compareResult, fileNames) {
    const lines = [];
    const shortNames = fileNames.map((f) => path.basename(f));
    if (compareResult.missingVariables.length === 0 &&
        compareResult.inconsistentValues.length === 0 &&
        compareResult.formatInconsistencies.length === 0) {
        lines.push("✓ All environment files are consistent");
        return lines.join("\n");
    }
    if (compareResult.missingVariables.length > 0) {
        lines.push("=== Missing Variables ===");
        lines.push("");
        for (const mv of compareResult.missingVariables) {
            const presentIn = shortNames.filter((name, i) => {
                const fullPath = path.resolve(fileNames[i]);
                return (!mv.missingInFiles.includes(fullPath) &&
                    !mv.missingInFiles.includes(fileNames[i]));
            });
            lines.push(`  "${mv.key}":`);
            lines.push(`    Present in: ${presentIn.join(", ") || "none"}`);
            lines.push(`    Missing in: ${formatMissingFiles(mv.missingInFiles, shortNames, fileNames)}`);
            lines.push("");
        }
    }
    if (compareResult.inconsistentValues.length > 0) {
        lines.push("=== Inconsistent Values ===");
        lines.push("");
        for (const iv of compareResult.inconsistentValues) {
            lines.push(`  "${iv.key}":`);
            for (const val of iv.values) {
                const shortPath = path.basename(val.fileName);
                const valueDisplay = val.value === "" ? "(empty)" : val.value;
                lines.push(`    ${shortPath}: ${valueDisplay}`);
            }
            if (iv.isFormatInconsistent) {
                lines.push(`    ⚠ Format inconsistency detected`);
            }
            lines.push("");
        }
    }
    if (compareResult.formatInconsistencies.length > 0) {
        lines.push("=== Format Inconsistencies (Quote Style) ===");
        lines.push("");
        const groupedByKey = new Map();
        for (const fi of compareResult.formatInconsistencies) {
            const existing = groupedByKey.get(fi.key) || [];
            existing.push(fi);
            groupedByKey.set(fi.key, existing);
        }
        for (const [key, items] of groupedByKey) {
            lines.push(`  "${key}":`);
            for (const item of items) {
                const shortPath = path.basename(item.fileName);
                const quoteInfo = item.quoteType ? `"${item.quoteType}"` : "no quotes";
                lines.push(`    ${shortPath}: ${quoteInfo}`);
            }
            lines.push("");
        }
    }
    return lines.join("\n");
}
/**
 * 格式化缺失文件列表
 */
function formatMissingFiles(missingInFiles, shortNames, fullPaths) {
    const missingShortNames = missingInFiles.map((m) => {
        const matched = fullPaths.find((f) => f === m || path.basename(f) === m);
        return matched ? path.basename(matched) : path.basename(m);
    });
    return missingShortNames.join(", ");
}
/**
 * 格式化 Lint 结果
 * @param lintResult - Lint 结果
 * @param format - 输出格式
 * @param fileName - 被检查的文件名
 * @returns 格式化后的输出
 */
function formatLintResult(lintResult, format, fileName) {
    if (format === "json") {
        return {
            format,
            content: JSON.stringify(lintResult, null, 2),
        };
    }
    return {
        format,
        content: formatLintResultAsTable(lintResult, fileName),
    };
}
/**
 * 将 Lint 结果格式化为表格形式
 */
function formatLintResultAsTable(lintResult, fileName) {
    const lines = [];
    const shortName = path.basename(fileName);
    lines.push(`Lint Results for: ${shortName}`);
    lines.push("");
    if (lintResult.errors.length === 0 && lintResult.warnings.length === 0) {
        lines.push("✓ No issues found");
        return lines.join("\n");
    }
    if (lintResult.errors.length > 0) {
        lines.push("=== Errors ===");
        lines.push("");
        for (const err of lintResult.errors) {
            const location = err.line ? ` (line ${err.line})` : "";
            lines.push(`  ✗ ${err.message}${location}`);
        }
        lines.push("");
    }
    if (lintResult.warnings.length > 0) {
        lines.push("=== Warnings ===");
        lines.push("");
        for (const warn of lintResult.warnings) {
            const location = warn.line ? ` (line ${warn.line})` : "";
            lines.push(`  ⚠ ${warn.message}${location}`);
        }
        lines.push("");
    }
    const totalIssues = lintResult.errors.length + lintResult.warnings.length;
    if (lintResult.passed) {
        lines.push(`✓ Passed with ${lintResult.warnings.length} warning(s)`);
    }
    else {
        lines.push(`✗ Failed with ${totalIssues} issue(s)`);
    }
    return lines.join("\n");
}
/**
 * 格式化错误信息
 * @param message - 错误消息
 * @returns 格式化的错误字符串
 */
function formatError(message) {
    return `Error: ${message}`;
}
/**
 * 格式化警告信息
 * @param message - 警告消息
 * @returns 格式化的警告字符串
 */
function formatWarning(message) {
    return `Warning: ${message}`;
}
//# sourceMappingURL=index.js.map