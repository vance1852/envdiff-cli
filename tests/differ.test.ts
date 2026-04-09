import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { lintEnvFile, compareEnvFiles } from '../src/differ.js';

describe('differ', () => {
  const testDir = path.join(process.cwd(), 'tests', 'fixtures');

  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  describe('lint', () => {
    it('should detect duplicate keys', () => {
      const filePath = path.join(testDir, 'duplicate.env');
      fs.writeFileSync(filePath, 'KEY=value1\nKEY=value2\n');
      const result = lintEnvFile(filePath);
      const duplicateIssue = result.issues.find(i => i.type === 'duplicate_key');
      expect(duplicateIssue).toBeDefined();
      expect(duplicateIssue?.key).toBe('KEY');
    });

    it('should detect empty values', () => {
      const filePath = path.join(testDir, 'empty-values.env');
      fs.writeFileSync(filePath, 'EMPTY_KEY=\nNO_EQUALS\n');
      const result = lintEnvFile(filePath);
      const emptyIssues = result.issues.filter(i => i.type === 'empty_value');
      expect(emptyIssues.length).toBe(2);
    });

    it('should detect missing variable references', () => {
      const filePath = path.join(testDir, 'refs.env');
      fs.writeFileSync(filePath, 'DEFINED=hello\nURL=${DEFINED}:${MISSING_PORT}\n');
      const result = lintEnvFile(filePath);
      const refIssue = result.issues.find(i => i.type === 'missing_reference');
      expect(refIssue).toBeDefined();
      if (refIssue && refIssue.type === 'missing_reference') {
        expect(refIssue.missingRefs).toContain('MISSING_PORT');
      }
    });
  });

  describe('compare', () => {
    it('should detect missing variables across files', () => {
      const f1 = path.join(testDir, 'a.env');
      const f2 = path.join(testDir, 'b.env');
      fs.writeFileSync(f1, 'ONLY_A=1\nCOMMON=x\n');
      fs.writeFileSync(f2, 'COMMON=x\n');
      const result = compareEnvFiles([f1, f2]);
      const missingIssue = result.issues.find(i => i.type === 'missing_variable');
      expect(missingIssue).toBeDefined();
      if (missingIssue && missingIssue.type === 'missing_variable') {
        expect(missingIssue.missingFiles).toContain(f2);
      }
    });

    it('should detect value mismatches', () => {
      const f1 = path.join(testDir, 'v1.env');
      const f2 = path.join(testDir, 'v2.env');
      fs.writeFileSync(f1, 'KEY=valueA\n');
      fs.writeFileSync(f2, 'KEY=valueB\n');
      const result = compareEnvFiles([f1, f2]);
      const valueIssue = result.issues.find(i => i.type === 'value_mismatch');
      expect(valueIssue).toBeDefined();
    });

    it('should detect format mismatches (quotes vs no quotes)', () => {
      const f1 = path.join(testDir, 'f1.env');
      const f2 = path.join(testDir, 'f2.env');
      fs.writeFileSync(f1, 'DB_PORT=3306\n');
      fs.writeFileSync(f2, 'DB_PORT="3306"\n');
      const result = compareEnvFiles([f1, f2]);
      const formatIssue = result.issues.find(i => i.type === 'format_mismatch');
      expect(formatIssue).toBeDefined();
    });
  });
});
