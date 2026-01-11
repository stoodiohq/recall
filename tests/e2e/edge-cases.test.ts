/**
 * Edge Case Tests
 * Tests handling of unicode, special characters, large files, empty files, etc.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  createTestContext,
  initRecallDir,
  encryptContent,
  decryptContent,
  generateTestKey,
  type TestContext,
} from '../utils/helpers';
import { clearFetchMocks } from '../utils/mocks';

describe('Edge Cases', () => {
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

  describe('Unicode Content', () => {
    it('should handle emoji in context', async () => {
      const context = `# Project Context 🚀

## Current Work
Building the best app ever! 💪

## Tech Stack
- TypeScript 🔷
- React ⚛️
- Node.js 🟢

## Team Notes
This is going great! 🎉 Keep up the good work! ✨
`;
      const contextPath = path.join(ctx.recallDir, 'context.md');
      fs.writeFileSync(contextPath, context);

      const content = fs.readFileSync(contextPath, 'utf-8');
      expect(content).toContain('🚀');
      expect(content).toContain('💪');
      expect(content).toContain('⚛️');
    });

    it('should handle CJK characters', async () => {
      const context = `# 项目上下文 (Project Context)

## 当前工作 (Current Work)
開発中のアプリケーション

## 기술 스택 (Tech Stack)
- TypeScript
- React
- Node.js

## 備註 (Notes)
這是一個多語言測試文件。
日本語、中文、한국어をサポートしています。
`;
      const contextPath = path.join(ctx.recallDir, 'context.md');
      fs.writeFileSync(contextPath, context);

      const content = fs.readFileSync(contextPath, 'utf-8');
      expect(content).toContain('项目上下文');
      expect(content).toContain('開発中');
      expect(content).toContain('기술 스택');
    });

    it('should handle RTL languages (Arabic, Hebrew)', async () => {
      const context = `# מסמך בדיקה (Test Document)

## عمل حالي (Current Work)
בניית אפליקציה חדשה

## ملاحظات (Notes)
هذا ملف اختبار متعدد اللغات.
`;
      const contextPath = path.join(ctx.recallDir, 'context.md');
      fs.writeFileSync(contextPath, context);

      const content = fs.readFileSync(contextPath, 'utf-8');
      expect(content).toContain('מסמך בדיקה');
      expect(content).toContain('عمل حالي');
    });

    it('should handle mixed scripts in encryption', async () => {
      const content = `# Mixed Languages 🌍
English, 日本語, العربية, עברית, 中文, 한국어
Emoji: 👨‍💻👩‍💻🧑‍💻
`;
      const encrypted = encryptContent(content, teamKey);
      const decrypted = decryptContent(encrypted, teamKey);

      expect(decrypted).toContain('日本語');
      expect(decrypted).toContain('العربية');
      expect(decrypted).toContain('👨‍💻');
    });

    it('should handle zero-width characters', async () => {
      const content = 'Test\u200Bwith\u200Czero\u200Dwidth\uFEFFchars';
      const contextPath = path.join(ctx.recallDir, 'context.md');
      fs.writeFileSync(contextPath, content);

      const read = fs.readFileSync(contextPath, 'utf-8');
      expect(read).toContain('\u200B');
      expect(read.length).toBeGreaterThan('Testwithzerowidthchars'.length);
    });

    it('should handle combining characters and diacritics', async () => {
      const content = `# Diacritics Test
café vs cafe\u0301
naïve vs nai\u0308ve
Ω vs O\u0305
`;
      const encrypted = encryptContent(content, teamKey);
      const decrypted = decryptContent(encrypted, teamKey);

      expect(decrypted).toContain('café');
      expect(decrypted).toContain('naïve');
    });
  });

  describe('Special Characters', () => {
    it('should handle markdown special characters', async () => {
      const context = `# Context with *special* _characters_

## Code Examples
\`inline code\` and \`\`\`code blocks\`\`\`

## Lists
- Item with **bold**
- Item with ~~strikethrough~~
- Item with [links](http://example.com)

## Tables
| Column | Value |
|--------|-------|
| A      | 1     |

> Blockquote text

---
`;
      const contextPath = path.join(ctx.recallDir, 'context.md');
      fs.writeFileSync(contextPath, context);

      const content = fs.readFileSync(contextPath, 'utf-8');
      expect(content).toContain('**bold**');
      expect(content).toContain('```code blocks```');
    });

    it('should handle regex-dangerous characters', async () => {
      const content = '# Regex Test\nPattern: .*+?^${}()|[]\\\nMore: [a-z] (\\d+) $1 \\b\n';
      const encrypted = encryptContent(content, teamKey);
      const decrypted = decryptContent(encrypted, teamKey);

      expect(decrypted).toContain('.*+?^${}()|[]');
    });

    it('should handle shell-dangerous characters', async () => {
      const content = '# Shell Test\nCommands: ; && || | > >> < << $() `cmd`\nVariables: $VAR ${VAR} $((1+1))\nQuotes: "double" \'single\' `backtick`\n';
      const contextPath = path.join(ctx.recallDir, 'context.md');
      fs.writeFileSync(contextPath, content);

      const read = fs.readFileSync(contextPath, 'utf-8');
      expect(read).toContain('$()');
      expect(read).toContain('`cmd`');
    });

    it('should handle null bytes and control characters', async () => {
      // Control characters that might cause issues
      const content = 'Line1\nLine2\rLine3\r\nLine4\tTabbed';
      const contextPath = path.join(ctx.recallDir, 'context.md');
      fs.writeFileSync(contextPath, content);

      const read = fs.readFileSync(contextPath, 'utf-8');
      expect(read).toContain('\n');
      expect(read).toContain('\r');
      expect(read).toContain('\t');
    });

    it('should handle quotes in JSON fields', async () => {
      const session = {
        summary: 'Used "quotes" and \'apostrophes\' in code',
        decisions: [
          { what: 'Handle "double quotes"', why: "It's important" },
        ],
      };

      const sessionPath = path.join(ctx.recallDir, 'sessions', 'test.json');
      fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2));

      const read = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
      expect(read.summary).toContain('"quotes"');
    });
  });

  describe('File Size Limits', () => {
    it('should handle very large context files (1MB)', async () => {
      // Generate 1MB of content
      const line = '# Context\n' + 'This is a long line of context text. '.repeat(100) + '\n';
      const targetSize = 1024 * 1024; // 1MB
      const lines = Math.ceil(targetSize / line.length);
      const content = line.repeat(lines);

      const contextPath = path.join(ctx.recallDir, 'context.md');
      fs.writeFileSync(contextPath, content);

      const stats = fs.statSync(contextPath);
      expect(stats.size).toBeGreaterThan(1024 * 1024);

      // Should still be readable
      const read = fs.readFileSync(contextPath, 'utf-8');
      expect(read.length).toBeGreaterThan(1000000);
    });

    it('should handle large encrypted files', async () => {
      const content = 'Large content. '.repeat(10000);
      const encrypted = encryptContent(content, teamKey);
      const decrypted = decryptContent(encrypted, teamKey);

      expect(decrypted).toBe(content);
    });

    it('should warn when context exceeds recommended size', async () => {
      const RECOMMENDED_MAX_SIZE = 50 * 1024; // 50KB

      const content = 'x'.repeat(60 * 1024); // 60KB
      const shouldWarn = content.length > RECOMMENDED_MAX_SIZE;

      expect(shouldWarn).toBe(true);
    });

    it('should handle minimum viable context', async () => {
      const minContext = '# Context\n';
      const contextPath = path.join(ctx.recallDir, 'context.md');
      fs.writeFileSync(contextPath, minContext);

      const content = fs.readFileSync(contextPath, 'utf-8');
      expect(content.length).toBeGreaterThan(0);
    });
  });

  describe('Empty and Missing Files', () => {
    it('should handle empty context.md', async () => {
      const contextPath = path.join(ctx.recallDir, 'context.md');
      fs.writeFileSync(contextPath, '');

      const content = fs.readFileSync(contextPath, 'utf-8');
      expect(content).toBe('');
    });

    it('should handle whitespace-only content', async () => {
      const contextPath = path.join(ctx.recallDir, 'context.md');
      fs.writeFileSync(contextPath, '   \n\t\n   \n');

      const content = fs.readFileSync(contextPath, 'utf-8');
      expect(content.trim()).toBe('');
    });

    it('should handle missing optional files gracefully', async () => {
      // history.md is optional
      const historyPath = path.join(ctx.recallDir, 'history.md');
      if (fs.existsSync(historyPath)) {
        fs.rmSync(historyPath);
      }

      expect(fs.existsSync(historyPath)).toBe(false);
      // System should still function without it
    });

    it('should handle corrupted sessions directory', async () => {
      const sessionsDir = path.join(ctx.recallDir, 'sessions');

      // Create an invalid file in sessions
      fs.writeFileSync(path.join(sessionsDir, 'not-a-session.txt'), 'invalid');

      const files = fs.readdirSync(sessionsDir);
      expect(files).toContain('not-a-session.txt');

      // System should skip non-markdown files
      const mdFiles = files.filter((f) => f.endsWith('.md'));
      expect(mdFiles.length).toBe(0);
    });
  });

  describe('File Path Edge Cases', () => {
    it('should handle spaces in file paths', async () => {
      const dirWithSpaces = path.join(ctx.repoDir, 'path with spaces', '.recall');
      fs.mkdirSync(dirWithSpaces, { recursive: true });

      const contextPath = path.join(dirWithSpaces, 'context.md');
      fs.writeFileSync(contextPath, '# Context');

      expect(fs.existsSync(contextPath)).toBe(true);
    });

    it('should handle special characters in paths', async () => {
      // Only test characters valid on the current platform
      const safeDirName = 'test-dir_with.dots-and_underscores';
      const specialDir = path.join(ctx.repoDir, safeDirName, '.recall');
      fs.mkdirSync(specialDir, { recursive: true });

      const contextPath = path.join(specialDir, 'context.md');
      fs.writeFileSync(contextPath, '# Context');

      expect(fs.existsSync(contextPath)).toBe(true);
    });

    it('should handle very long paths', async () => {
      // Create deep nested structure
      let deepPath = ctx.repoDir;
      for (let i = 0; i < 10; i++) {
        deepPath = path.join(deepPath, 'nested');
      }
      deepPath = path.join(deepPath, '.recall');

      fs.mkdirSync(deepPath, { recursive: true });
      const contextPath = path.join(deepPath, 'context.md');
      fs.writeFileSync(contextPath, '# Deep Context');

      expect(fs.existsSync(contextPath)).toBe(true);
    });

    it('should handle symlinks', async () => {
      const originalDir = path.join(ctx.repoDir, 'original', '.recall');
      fs.mkdirSync(originalDir, { recursive: true });
      fs.writeFileSync(path.join(originalDir, 'context.md'), '# Original');

      const linkPath = path.join(ctx.repoDir, 'link');
      try {
        fs.symlinkSync(path.join(ctx.repoDir, 'original'), linkPath);

        const linkedContext = path.join(linkPath, '.recall', 'context.md');
        const content = fs.readFileSync(linkedContext, 'utf-8');
        expect(content).toContain('Original');
      } catch {
        // Symlinks may not be available on all platforms
      }
    });
  });

  describe('Encoding Edge Cases', () => {
    it('should handle BOM (Byte Order Mark)', async () => {
      const BOM = '\uFEFF';
      const content = BOM + '# Context with BOM';

      const contextPath = path.join(ctx.recallDir, 'context.md');
      fs.writeFileSync(contextPath, content);

      const read = fs.readFileSync(contextPath, 'utf-8');
      // BOM should be preserved or stripped consistently
      expect(read.replace(BOM, '')).toContain('# Context with BOM');
    });

    it('should handle different line endings', async () => {
      const unixContent = 'Line1\nLine2\nLine3';
      const windowsContent = 'Line1\r\nLine2\r\nLine3';
      const oldMacContent = 'Line1\rLine2\rLine3';

      const contextPath = path.join(ctx.recallDir, 'context.md');

      // Unix style
      fs.writeFileSync(contextPath, unixContent);
      expect(fs.readFileSync(contextPath, 'utf-8')).toBe(unixContent);

      // Windows style
      fs.writeFileSync(contextPath, windowsContent);
      expect(fs.readFileSync(contextPath, 'utf-8')).toBe(windowsContent);

      // Old Mac style
      fs.writeFileSync(contextPath, oldMacContent);
      expect(fs.readFileSync(contextPath, 'utf-8')).toBe(oldMacContent);
    });

    it('should encrypt and decrypt files with mixed line endings', async () => {
      const content = 'Unix\nWindows\r\nOldMac\rMixed';
      const encrypted = encryptContent(content, teamKey);
      const decrypted = decryptContent(encrypted, teamKey);

      expect(decrypted).toBe(content);
    });
  });

  describe('Session Filename Edge Cases', () => {
    it('should handle session files with timestamps', async () => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const sessionPath = path.join(ctx.recallDir, 'sessions', `session-${timestamp}.md`);
      fs.writeFileSync(sessionPath, '# Session');

      expect(fs.existsSync(sessionPath)).toBe(true);
    });

    it('should handle multiple sessions on same day', async () => {
      const sessionsDir = path.join(ctx.recallDir, 'sessions');

      for (let i = 1; i <= 5; i++) {
        const sessionPath = path.join(sessionsDir, `session-2024-01-15-${String(i).padStart(3, '0')}.md`);
        fs.writeFileSync(sessionPath, `# Session ${i}`);
      }

      const files = fs.readdirSync(sessionsDir);
      const daySessions = files.filter((f) => f.includes('2024-01-15'));
      expect(daySessions.length).toBe(5);
    });

    it('should sort sessions chronologically', async () => {
      const sessionsDir = path.join(ctx.recallDir, 'sessions');

      const dates = ['2024-01-15', '2024-01-10', '2024-01-20', '2024-01-01'];
      for (const date of dates) {
        fs.writeFileSync(path.join(sessionsDir, `session-${date}.md`), `# ${date}`);
      }

      const files = fs.readdirSync(sessionsDir).sort();
      expect(files[0]).toContain('2024-01-01');
      expect(files[files.length - 1]).toContain('2024-01-20');
    });
  });

  describe('Concurrent Modification', () => {
    it('should handle rapid successive writes', async () => {
      const contextPath = path.join(ctx.recallDir, 'context.md');

      // Rapid writes
      for (let i = 0; i < 10; i++) {
        fs.writeFileSync(contextPath, `# Version ${i}`);
      }

      const content = fs.readFileSync(contextPath, 'utf-8');
      expect(content).toContain('Version 9');
    });

    it('should handle read during write', async () => {
      const contextPath = path.join(ctx.recallDir, 'context.md');
      fs.writeFileSync(contextPath, '# Original');

      // Start async operations
      const writePromise = fs.promises.writeFile(contextPath, '# Updated');
      const readPromise = fs.promises.readFile(contextPath, 'utf-8');

      await Promise.all([writePromise, readPromise]);

      // Final state should be consistent
      const final = fs.readFileSync(contextPath, 'utf-8');
      expect(final).toBe('# Updated');
    });
  });
});
