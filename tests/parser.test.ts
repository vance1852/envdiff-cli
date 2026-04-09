import { describe, it, expect } from 'vitest';
import { parseEnvContent } from '../src/parser';

describe('parser 模块', () => {
  describe('正常路径解析', () => {
    it('应该正确解析标准的 .env 格式内容', () => {
      const content = `
# This is a comment
DB_HOST=localhost
DB_PORT=3306
DB_NAME=myapp
`;

      const result = parseEnvContent(content);
      
      expect(result.errors).toHaveLength(0);
      expect(result.entries.size).toBe(3);
      expect(result.entries.get('DB_HOST')?.value).toBe('localhost');
      expect(result.entries.get('DB_PORT')?.value).toBe('3306');
      expect(result.entries.get('DB_NAME')?.value).toBe('myapp');
    });

    it('应该正确解析带引号的值并记录引号类型', () => {
      const content = `
DOUBLE_QUOTED="value with spaces"
SINGLE_QUOTED='value with special chars !@#$%'
NO_QUOTES=normal_value
`;

      const result = parseEnvContent(content);
      
      expect(result.errors).toHaveLength(0);
      expect(result.entries.get('DOUBLE_QUOTED')?.quoteType).toBe('double');
      expect(result.entries.get('SINGLE_QUOTED')?.quoteType).toBe('single');
      expect(result.entries.get('NO_QUOTES')?.quoteType).toBe('none');
    });
  });

  describe('边界场景 - 空文件和空行', () => {
    it('空文件应该解析出零个条目且无错误', () => {
      const content = '';
      const result = parseEnvContent(content);
      
      expect(result.errors).toHaveLength(0);
      expect(result.entries.size).toBe(0);
      expect(result.lines).toHaveLength(0);
    });

    it('应该正确处理只有注释和空行的内容', () => {
      const content = `
# Just a comment
# Another comment


# Third comment after empty lines
`;

      const result = parseEnvContent(content);
      
      expect(result.errors).toHaveLength(0);
      expect(result.entries.size).toBe(0);
    });
  });

  describe('边界场景 - 格式错误和特殊情况', () => {
    it('应该记录未闭合的多行值错误', () => {
      const content = `
MULTILINE="start of value
this line continues but never closes
`;

      const result = parseEnvContent(content);
      
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Unclosed multiline value');
      expect(result.errors[0]).toContain('MULTILINE');
    });

    it('应该正确处理无值的变量（只有 KEY）', () => {
      const content = `
EMPTY_VALUE=
JUST_KEY
`;

      const result = parseEnvContent(content);
      
      expect(result.entries.get('EMPTY_VALUE')?.value).toBe('');
      expect(result.entries.get('JUST_KEY')?.value).toBe('');
    });
  });
});
