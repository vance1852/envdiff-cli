import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseEnvFile } from '../src/parser.js';

describe('parser', () => {
  const testDir = path.join(process.cwd(), 'tests', 'fixtures');

  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  describe('normal parsing', () => {
    it('should parse key-value pairs correctly', () => {
      const filePath = path.join(testDir, 'normal.env');
      fs.writeFileSync(filePath, 'DB_HOST=localhost\nDB_PORT=3306\n');
      const result = parseEnvFile(filePath);
      expect(result.entries.get('DB_HOST')?.value).toBe('localhost');
      expect(result.entries.get('DB_PORT')?.value).toBe('3306');
    });

    it('should handle quoted values', () => {
      const filePath = path.join(testDir, 'quoted.env');
      fs.writeFileSync(filePath, 'DB_PASSWORD="secret123"\nAPI_KEY=\'apikey\'\n');
      const result = parseEnvFile(filePath);
      expect(result.entries.get('DB_PASSWORD')?.value).toBe('secret123');
      expect(result.entries.get('DB_PASSWORD')?.hasQuotes).toBe(true);
      expect(result.entries.get('API_KEY')?.quoteType).toBe('single');
    });
  });

  describe('edge cases', () => {
    it('should handle empty files', () => {
      const filePath = path.join(testDir, 'empty.env');
      fs.writeFileSync(filePath, '');
      const result = parseEnvFile(filePath);
      expect(result.entries.size).toBe(0);
    });

    it('should handle comments and empty lines', () => {
      const filePath = path.join(testDir, 'comments.env');
      fs.writeFileSync(filePath, '# This is a comment\n\nVALID_KEY=value\n');
      const result = parseEnvFile(filePath);
      expect(result.entries.size).toBe(1);
      expect(result.entries.has('VALID_KEY')).toBe(true);
    });

    it('should handle keys without values', () => {
      const filePath = path.join(testDir, 'no-value.env');
      fs.writeFileSync(filePath, 'EMPTY_KEY=\nJUST_KEY\n');
      const result = parseEnvFile(filePath);
      expect(result.entries.get('EMPTY_KEY')?.value).toBe('');
      expect(result.entries.get('JUST_KEY')?.value).toBe('');
    });
  });
});
