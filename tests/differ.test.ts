import { describe, it, expect } from 'vitest';
import { parseEnvContent } from '../src/parser';
import { compareEnvFiles, lintEnvFile } from '../src/differ';

describe('differ 模块', () => {
  describe('compareEnvFiles 正常路径', () => {
    it('应该检测出仅存在于部分文件的变量', () => {
      const file1 = parseEnvContent('COMMON=value\nONLY_IN_FILE1=yes');
      const file2 = parseEnvContent('COMMON=value\nONLY_IN_FILE2=yes');

      const result = compareEnvFiles([
        { fileName: '.env.dev', parseResult: file1 },
        { fileName: '.env.prod', parseResult: file2 },
      ]);

      expect(result.missingVariables).toHaveLength(2);
      const missingKeys = result.missingVariables.map(m => m.key);
      expect(missingKeys).toContain('ONLY_IN_FILE1');
      expect(missingKeys).toContain('ONLY_IN_FILE2');
    });

    it('应该检测出同名变量值不一致', () => {
      const file1 = parseEnvContent('DB_HOST=localhost');
      const file2 = parseEnvContent('DB_HOST=192.168.1.100');

      const result = compareEnvFiles([
        { fileName: '.env.dev', parseResult: file1 },
        { fileName: '.env.prod', parseResult: file2 },
      ]);

      expect(result.valueConflicts).toHaveLength(1);
      expect(result.valueConflicts[0].key).toBe('DB_HOST');
    });
  });

  describe('compareEnvFiles 边界场景', () => {
    it('应该检测出引号格式不一致', () => {
      const file1 = parseEnvContent('DB_PORT=3306');
      const file2 = parseEnvContent('DB_PORT="3306"');

      const result = compareEnvFiles([
        { fileName: '.env.dev', parseResult: file1 },
        { fileName: '.env.prod', parseResult: file2 },
      ]);

      expect(result.formatInconsistencies).toHaveLength(1);
      expect(result.formatInconsistencies[0].key).toBe('DB_PORT');
      expect(result.formatInconsistencies[0].type).toBe('quote');
    });

    it('空文件对比应该无任何问题', () => {
      const file1 = parseEnvContent('');
      const file2 = parseEnvContent('');

      const result = compareEnvFiles([
        { fileName: '.env.dev', parseResult: file1 },
        { fileName: '.env.prod', parseResult: file2 },
      ]);

      expect(result.missingVariables).toHaveLength(0);
      expect(result.valueConflicts).toHaveLength(0);
      expect(result.formatInconsistencies).toHaveLength(0);
      expect(result.allKeys).toHaveLength(0);
    });
  });

  describe('lintEnvFile 正常路径', () => {
    it('应该检测出重复定义的key', () => {
      const content = `
DB_HOST=localhost
DB_HOST=192.168.1.100
`;
      const parseResult = parseEnvContent(content);
      const lintResult = lintEnvFile(parseResult);

      expect(lintResult.duplicateKeys).toHaveLength(1);
      expect(lintResult.duplicateKeys[0].key).toBe('DB_HOST');
      expect(lintResult.duplicateKeys[0].occurrences).toHaveLength(2);
      expect(lintResult.duplicateKeys[0].finalValue).toBe('192.168.1.100');
    });

    it('应该检测出空值变量', () => {
      const content = `
EMPTY_KEY=
JUST_KEY
`;
      const parseResult = parseEnvContent(content);
      const lintResult = lintEnvFile(parseResult);

      expect(lintResult.emptyValues).toHaveLength(2);
    });
  });

  describe('lintEnvFile 边界场景', () => {
    it('应该检测出未定义的变量引用', () => {
      const content = `
BASE_URL=\${HOST}:\${PORT}
HOST=localhost
`;
      const parseResult = parseEnvContent(content);
      const lintResult = lintEnvFile(parseResult);

      expect(lintResult.undefinedReferences).toHaveLength(1);
      expect(lintResult.undefinedReferences[0].referencedKey).toBe('PORT');
    });

    it('应该检测出变量循环引用', () => {
      const content = `
A=\${B}
B=\${C}
C=\${A}
`;
      const parseResult = parseEnvContent(content);
      const lintResult = lintEnvFile(parseResult);

      expect(lintResult.cyclicReferences).toHaveLength(1);
      expect(lintResult.cyclicReferences[0].keys).toContain('A');
      expect(lintResult.cyclicReferences[0].keys).toContain('B');
      expect(lintResult.cyclicReferences[0].keys).toContain('C');
    });

    it('空文件执行lint应该无任何问题', () => {
      const content = '';
      const parseResult = parseEnvContent(content);
      const lintResult = lintEnvFile(parseResult);

      expect(lintResult.duplicateKeys).toHaveLength(0);
      expect(lintResult.emptyValues).toHaveLength(0);
      expect(lintResult.undefinedReferences).toHaveLength(0);
      expect(lintResult.cyclicReferences).toHaveLength(0);
    });
  });
});
