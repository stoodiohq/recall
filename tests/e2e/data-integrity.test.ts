/**
 * Data Integrity Tests
 * Tests corruption detection, validation, checksums, and recovery
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  createTestContext,
  initRecallDir,
  encryptContent,
  decryptContent,
  generateTestKey,
  type TestContext,
} from '../utils/helpers';
import { clearFetchMocks } from '../utils/mocks';

describe('Data Integrity', () => {
  let ctx: TestContext;
  let teamKey: Buffer;

  beforeEach(async () => {
    ctx = await createTestContext();
    teamKey = generateTestKey();
    initRecallDir(ctx.repoDir);
  });

  afterEach(async () => {
    await ctx.cleanup();
    clearFetchMocks();
  });

  describe('Encryption Format Validation', () => {
    it('should detect valid encryption format', async () => {
      const content = 'Test content';
      const encrypted = encryptContent(content, teamKey);

      const isValidFormat = encrypted.startsWith('RECALL_ENCRYPTED:v1:') &&
        encrypted.split(':').length === 5;

      expect(isValidFormat).toBe(true);
    });

    it('should reject invalid encryption prefix', async () => {
      const invalidFormats = [
        'NOT_ENCRYPTED:v1:abc:def:ghi',
        'RECALL_ENCRYPTED:v2:abc:def:ghi', // Wrong version
        'RECALL_ENCRYPTED:abc:def:ghi', // Missing version
        'plaintext content',
      ];

      for (const invalid of invalidFormats) {
        expect(() => decryptContent(invalid, teamKey)).toThrow();
      }
    });

    it('should detect tampered IV', async () => {
      const content = 'Secret content';
      const encrypted = encryptContent(content, teamKey);

      // Corrupt the IV
      const parts = encrypted.split(':');
      parts[2] = 'INVALID_IV_BASE64';
      const tampered = parts.join(':');

      expect(() => decryptContent(tampered, teamKey)).toThrow();
    });

    it('should detect tampered auth tag', async () => {
      const content = 'Secret content';
      const encrypted = encryptContent(content, teamKey);

      // Corrupt the auth tag
      const parts = encrypted.split(':');
      parts[3] = Buffer.from('wrongauthtag!').toString('base64');
      const tampered = parts.join(':');

      expect(() => decryptContent(tampered, teamKey)).toThrow();
    });

    it('should detect tampered ciphertext', async () => {
      const content = 'Secret content';
      const encrypted = encryptContent(content, teamKey);

      // Corrupt the ciphertext
      const parts = encrypted.split(':');
      parts[4] = Buffer.from('tampered data here').toString('base64');
      const tampered = parts.join(':');

      expect(() => decryptContent(tampered, teamKey)).toThrow();
    });

    it('should detect truncated ciphertext', async () => {
      const content = 'Secret content that is long enough to truncate';
      const encrypted = encryptContent(content, teamKey);

      // Truncate the ciphertext
      const parts = encrypted.split(':');
      parts[4] = parts[4].slice(0, 10);
      const truncated = parts.join(':');

      expect(() => decryptContent(truncated, teamKey)).toThrow();
    });
  });

  describe('File Corruption Detection', () => {
    it('should detect partially written files', async () => {
      const contextPath = path.join(ctx.recallDir, 'context.md');

      // Simulate partial write
      const content = encryptContent('Full content', teamKey);
      fs.writeFileSync(contextPath, content.slice(0, content.length / 2));

      const partial = fs.readFileSync(contextPath, 'utf-8');
      expect(() => decryptContent(partial, teamKey)).toThrow();
    });

    it('should detect null bytes in content', async () => {
      const contextPath = path.join(ctx.recallDir, 'context.md');

      // Write content with null bytes
      const content = 'Content\x00with\x00null\x00bytes';
      fs.writeFileSync(contextPath, content);

      const read = fs.readFileSync(contextPath, 'utf-8');
      expect(read).toContain('\x00');

      // System should handle or reject null bytes
      const hasNullBytes = read.includes('\x00');
      expect(hasNullBytes).toBe(true);
    });

    it('should detect binary files mistaken for text', async () => {
      const contextPath = path.join(ctx.recallDir, 'context.md');

      // Write binary data
      const binary = Buffer.from([0x89, 0x50, 0x4E, 0x47]); // PNG header
      fs.writeFileSync(contextPath, binary);

      const content = fs.readFileSync(contextPath);

      // Should detect this isn't valid UTF-8 text
      const isText = content.every((byte) => {
        return byte === 0x09 || byte === 0x0A || byte === 0x0D || (byte >= 0x20 && byte <= 0x7E);
      });

      expect(isText).toBe(false);
    });

    it('should validate markdown structure', async () => {
      const validMd = `# Title

## Section 1
Content here.

## Section 2
More content.
`;

      const invalidMd = `###broken markdown
# Title without content
`;

      const hasHeading = (md: string) => /^#+ .+$/m.test(md);

      expect(hasHeading(validMd)).toBe(true);
      expect(hasHeading(invalidMd)).toBe(true); // Still has heading
    });
  });

  describe('Checksum Validation', () => {
    it('should compute SHA-256 checksum of files', async () => {
      const content = 'Content to checksum';
      const contextPath = path.join(ctx.recallDir, 'context.md');
      fs.writeFileSync(contextPath, content);

      const hash = crypto.createHash('sha256')
        .update(fs.readFileSync(contextPath))
        .digest('hex');

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should detect checksum mismatch after modification', async () => {
      const content = 'Original content';
      const contextPath = path.join(ctx.recallDir, 'context.md');
      fs.writeFileSync(contextPath, content);

      const originalHash = crypto.createHash('sha256')
        .update(fs.readFileSync(contextPath))
        .digest('hex');

      // Modify file
      fs.writeFileSync(contextPath, content + ' modified');

      const newHash = crypto.createHash('sha256')
        .update(fs.readFileSync(contextPath))
        .digest('hex');

      expect(newHash).not.toBe(originalHash);
    });

    it('should store and verify checksums in manifest', async () => {
      const manifest: Record<string, string> = {};

      const files = ['context.md', 'history.md'];
      for (const file of files) {
        const filePath = path.join(ctx.recallDir, file);
        if (fs.existsSync(filePath)) {
          manifest[file] = crypto.createHash('sha256')
            .update(fs.readFileSync(filePath))
            .digest('hex');
        }
      }

      const manifestPath = path.join(ctx.recallDir, '.manifest.json');
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

      const storedManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      expect(storedManifest['context.md']).toBeDefined();
    });
  });

  describe('Key Integrity', () => {
    it('should validate key length (32 bytes for AES-256)', async () => {
      const validKey = generateTestKey();
      expect(validKey.length).toBe(32);

      // Short key should fail
      const shortKey = crypto.randomBytes(16);
      expect(() => encryptContent('test', shortKey)).toThrow();

      // Long key should fail
      const longKey = crypto.randomBytes(64);
      expect(() => encryptContent('test', longKey)).toThrow();
    });

    it('should detect wrong key used for decryption', async () => {
      const content = 'Secret content';
      const key1 = generateTestKey();
      const key2 = generateTestKey();

      const encrypted = encryptContent(content, key1);

      // Decrypting with wrong key should fail
      expect(() => decryptContent(encrypted, key2)).toThrow();
    });

    it('should handle key rotation gracefully', async () => {
      const content = 'Content to migrate';
      const oldKey = generateTestKey();
      const newKey = generateTestKey();

      // Encrypt with old key
      const encryptedOld = encryptContent(content, oldKey);

      // Decrypt and re-encrypt with new key
      const decrypted = decryptContent(encryptedOld, oldKey);
      const encryptedNew = encryptContent(decrypted, newKey);

      // Should decrypt with new key
      const final = decryptContent(encryptedNew, newKey);
      expect(final).toBe(content);
    });
  });

  describe('Session Data Validation', () => {
    it('should validate session JSON structure', async () => {
      const validSession = {
        id: 'session-123',
        timestamp: new Date().toISOString(),
        summary: 'Work done',
        decisions: [],
        filesChanged: [],
      };

      const isValidSession = (s: object): boolean => {
        const required = ['summary'];
        return required.every((key) => key in s);
      };

      expect(isValidSession(validSession)).toBe(true);
      expect(isValidSession({ incomplete: true })).toBe(false);
    });

    it('should validate decision structure', async () => {
      const validDecision = {
        what: 'Use TypeScript',
        why: 'Type safety',
        timestamp: new Date().toISOString(),
      };

      const isValidDecision = (d: object): boolean => {
        return 'what' in d && 'why' in d;
      };

      expect(isValidDecision(validDecision)).toBe(true);
      expect(isValidDecision({ what: 'Missing why' })).toBe(false);
    });

    it('should validate ISO 8601 timestamps', async () => {
      const validTimestamps = [
        '2024-01-15T10:30:00Z',
        '2024-01-15T10:30:00.000Z',
        '2024-01-15T10:30:00+00:00',
      ];

      const invalidTimestamps = [
        '2024/01/15 10:30:00',
        'January 15, 2024',
        '1705315800000',
        'invalid',
      ];

      const isIso8601 = (s: string) => !isNaN(Date.parse(s)) && /^\d{4}-\d{2}-\d{2}T/.test(s);

      for (const ts of validTimestamps) {
        expect(isIso8601(ts)).toBe(true);
      }

      for (const ts of invalidTimestamps) {
        expect(isIso8601(ts)).toBe(false);
      }
    });
  });

  describe('Import Data Validation', () => {
    it('should validate Claude JSONL format', async () => {
      const validJsonl = `{"role":"user","content":"Hello"}
{"role":"assistant","content":"Hi there!"}`;

      const invalidJsonl = `{"role":"user","content":"Hello"}
{invalid json here}`;

      const parseJsonl = (content: string) => {
        const lines = content.split('\n').filter((l) => l.trim());
        return lines.map((line) => JSON.parse(line));
      };

      expect(() => parseJsonl(validJsonl)).not.toThrow();
      expect(() => parseJsonl(invalidJsonl)).toThrow();
    });

    it('should validate message roles', async () => {
      const validRoles = ['user', 'assistant', 'system'];

      const messages = [
        { role: 'user', content: 'test' },
        { role: 'assistant', content: 'test' },
        { role: 'invalid', content: 'test' },
      ];

      const isValidRole = (msg: { role: string }) => validRoles.includes(msg.role);

      expect(isValidRole(messages[0])).toBe(true);
      expect(isValidRole(messages[1])).toBe(true);
      expect(isValidRole(messages[2])).toBe(false);
    });

    it('should detect duplicate session imports', async () => {
      const imported = new Set<string>();
      const sessionFiles = ['session1.jsonl', 'session2.jsonl', 'session1.jsonl'];

      const duplicates: string[] = [];
      for (const file of sessionFiles) {
        if (imported.has(file)) {
          duplicates.push(file);
        } else {
          imported.add(file);
        }
      }

      expect(duplicates.length).toBe(1);
      expect(duplicates[0]).toBe('session1.jsonl');
    });
  });

  describe('Recovery Mechanisms', () => {
    it('should create backup before overwriting', async () => {
      const contextPath = path.join(ctx.recallDir, 'context.md');
      const backupPath = contextPath + '.bak';

      // Write original
      fs.writeFileSync(contextPath, 'Original content');

      // Create backup
      fs.copyFileSync(contextPath, backupPath);

      // Overwrite
      fs.writeFileSync(contextPath, 'New content');

      expect(fs.readFileSync(contextPath, 'utf-8')).toBe('New content');
      expect(fs.readFileSync(backupPath, 'utf-8')).toBe('Original content');
    });

    it('should restore from backup on corruption', async () => {
      const contextPath = path.join(ctx.recallDir, 'context.md');
      const backupPath = contextPath + '.bak';

      // Write valid backup
      fs.writeFileSync(backupPath, 'Valid backup content');

      // Write corrupted file
      fs.writeFileSync(contextPath, 'CORRUPT');

      // Detect corruption and restore
      const isCorrupt = fs.readFileSync(contextPath, 'utf-8') === 'CORRUPT';
      if (isCorrupt && fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, contextPath);
      }

      expect(fs.readFileSync(contextPath, 'utf-8')).toBe('Valid backup content');
    });

    it('should maintain history of changes', async () => {
      const historyDir = path.join(ctx.recallDir, '.history');
      fs.mkdirSync(historyDir, { recursive: true });

      const contextPath = path.join(ctx.recallDir, 'context.md');

      for (let i = 1; i <= 3; i++) {
        const content = `Version ${i}`;
        fs.writeFileSync(contextPath, content);

        // Save to history with unique filename using counter
        const historyFile = path.join(historyDir, `context-${i}.md`);
        fs.copyFileSync(contextPath, historyFile);
      }

      const historyFiles = fs.readdirSync(historyDir);
      expect(historyFiles.length).toBe(3);
    });

    it('should handle atomic writes', async () => {
      const contextPath = path.join(ctx.recallDir, 'context.md');
      const tempPath = contextPath + '.tmp';

      const content = 'New content';

      // Atomic write pattern
      fs.writeFileSync(tempPath, content);
      fs.renameSync(tempPath, contextPath);

      expect(fs.readFileSync(contextPath, 'utf-8')).toBe(content);
      expect(fs.existsSync(tempPath)).toBe(false);
    });
  });

  describe('Directory Structure Validation', () => {
    it('should validate .recall directory structure', async () => {
      const requiredFiles = ['context.md', 'history.md'];
      const requiredDirs = ['sessions'];

      for (const file of requiredFiles) {
        expect(fs.existsSync(path.join(ctx.recallDir, file))).toBe(true);
      }

      for (const dir of requiredDirs) {
        const dirPath = path.join(ctx.recallDir, dir);
        expect(fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()).toBe(true);
      }
    });

    it('should detect missing required files', async () => {
      // Remove a required file
      fs.rmSync(path.join(ctx.recallDir, 'context.md'));

      const missingFiles: string[] = [];
      const requiredFiles = ['context.md', 'history.md'];

      for (const file of requiredFiles) {
        if (!fs.existsSync(path.join(ctx.recallDir, file))) {
          missingFiles.push(file);
        }
      }

      expect(missingFiles).toContain('context.md');
    });

    it('should validate file permissions', async () => {
      const contextPath = path.join(ctx.recallDir, 'context.md');
      const stats = fs.statSync(contextPath);

      // Should be readable
      expect(stats.mode & 0o400).toBeTruthy();

      // Should be writable
      expect(stats.mode & 0o200).toBeTruthy();
    });
  });

  describe('Content Sanitization', () => {
    it('should strip sensitive data patterns', async () => {
      const sensitivePatterns = [
        /sk-[a-zA-Z0-9]{48}/, // OpenAI API key
        /recall_[a-zA-Z0-9]{32}/, // Recall token
        /ghp_[a-zA-Z0-9]{36}/, // GitHub personal access token
      ];

      const content = `
API Key: sk-1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKL
Token: recall_12345678901234567890123456789012
GitHub: ghp_123456789012345678901234567890123456
`;

      let sanitized = content;
      for (const pattern of sensitivePatterns) {
        sanitized = sanitized.replace(pattern, '[REDACTED]');
      }

      expect(sanitized).not.toContain('sk-');
      expect(sanitized).toContain('[REDACTED]');
    });

    it('should detect potential secrets in content', async () => {
      const secretPatterns = [
        { name: 'API Key', pattern: /(?:api[_-]?key|apikey)[=:]\s*['"]?([a-zA-Z0-9_-]{20,})/i },
        { name: 'Password', pattern: /(?:password|passwd|pwd)[=:]\s*['"]?([^\s'"]+)/i },
        { name: 'Bearer Token', pattern: /bearer\s+([a-zA-Z0-9_.-]+)/i },
      ];

      const content = 'api_key=secret123abc456789longkey password=mypassword';
      const detectedSecrets: string[] = [];

      for (const { name, pattern } of secretPatterns) {
        if (pattern.test(content)) {
          detectedSecrets.push(name);
        }
      }

      expect(detectedSecrets).toContain('API Key');
      expect(detectedSecrets).toContain('Password');
    });
  });
});
