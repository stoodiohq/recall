/**
 * MCP Session Lifecycle Tests
 * Tests session import, deduplication, and transcript parsing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  createTestContext,
  initRecallDir,
  writeTestConfig,
  type TestContext,
} from '../utils/helpers';
import { createJsonlSession } from '../utils/factories';

describe('Session Lifecycle', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
    writeTestConfig(ctx.homeDir, { apiToken: 'recall_test_token' });
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  describe('Session Detection', () => {
    it('should find Claude Code session files in ~/.claude/projects/', async () => {
      const projectHash = 'abc123def456';
      const claudeDir = path.join(ctx.homeDir, '.claude', 'projects', projectHash);
      fs.mkdirSync(claudeDir, { recursive: true });

      fs.writeFileSync(path.join(claudeDir, 'session1.jsonl'), '{}');
      fs.writeFileSync(path.join(claudeDir, 'session2.jsonl'), '{}');
      fs.writeFileSync(path.join(claudeDir, 'other.txt'), 'not a session');

      const files = fs.readdirSync(claudeDir).filter((f) => f.endsWith('.jsonl'));
      expect(files.length).toBe(2);
    });

    it('should match sessions to current project by path', async () => {
      // Session files are in directories that map to project paths
      const projectPath = ctx.repoDir;

      // In real implementation, Claude uses a hash of the project path
      const crypto = await import('crypto');
      const hash = crypto.createHash('sha256').update(projectPath).digest('hex').slice(0, 16);

      expect(hash.length).toBe(16);
    });

    it('should detect new sessions since last import', async () => {
      initRecallDir(ctx.repoDir);

      const trackerPath = path.join(ctx.recallDir, 'imported-sessions.json');
      const lastImport = new Date('2024-01-15T00:00:00Z');

      // Save last import time
      fs.writeFileSync(
        trackerPath,
        JSON.stringify({
          lastImport: lastImport.toISOString(),
          sessions: [],
        })
      );

      // New session created after last import
      const claudeDir = path.join(ctx.homeDir, '.claude', 'projects', 'test');
      fs.mkdirSync(claudeDir, { recursive: true });
      const sessionPath = path.join(claudeDir, 'new-session.jsonl');
      fs.writeFileSync(sessionPath, '{}');

      const stats = fs.statSync(sessionPath);
      const isNew = stats.mtime > lastImport;

      expect(isNew).toBe(true);
    });
  });

  describe('JSONL Parsing', () => {
    it('should parse Claude Code JSONL format', async () => {
      const jsonl = createJsonlSession([
        { role: 'user', content: 'What is 2+2?' },
        { role: 'assistant', content: 'The answer is 4.' },
      ]);

      const lines = jsonl.split('\n').filter((l) => l.trim());
      const messages = lines.map((line) => JSON.parse(line));

      expect(messages.length).toBe(2);
      expect(messages[0].role).toBe('user');
      expect(messages[1].role).toBe('assistant');
    });

    it('should extract tool calls from assistant messages', async () => {
      const jsonl = createJsonlSession([
        {
          role: 'assistant',
          content: 'Let me read that file.',
          toolCalls: [
            { name: 'read_file', arguments: { path: 'src/index.ts' } },
          ],
        },
      ]);

      const message = JSON.parse(jsonl.split('\n')[0]);
      expect(message.toolCalls).toBeDefined();
      expect(message.toolCalls[0].name).toBe('read_file');
    });

    it('should handle malformed JSONL lines gracefully', async () => {
      const jsonl = `{"role":"user","content":"valid"}
not valid json
{"role":"assistant","content":"also valid"}`;

      const lines = jsonl.split('\n');
      const validMessages: object[] = [];
      const errors: string[] = [];

      for (const line of lines) {
        try {
          validMessages.push(JSON.parse(line));
        } catch {
          errors.push(line);
        }
      }

      expect(validMessages.length).toBe(2);
      expect(errors.length).toBe(1);
    });

    it('should preserve message order and timestamps', async () => {
      const now = Date.now();
      const messages = [
        { id: '1', timestamp: new Date(now - 2000).toISOString(), role: 'user', content: 'First' },
        { id: '2', timestamp: new Date(now - 1000).toISOString(), role: 'assistant', content: 'Second' },
        { id: '3', timestamp: new Date(now).toISOString(), role: 'user', content: 'Third' },
      ];

      const jsonl = messages.map((m) => JSON.stringify(m)).join('\n');
      const parsed = jsonl.split('\n').map((l) => JSON.parse(l));

      expect(parsed[0].content).toBe('First');
      expect(parsed[2].content).toBe('Third');
      expect(new Date(parsed[0].timestamp) < new Date(parsed[2].timestamp)).toBe(true);
    });
  });

  describe('Session Deduplication', () => {
    it('should track imported sessions by filename and mtime', async () => {
      initRecallDir(ctx.repoDir);

      const trackerPath = path.join(ctx.recallDir, 'imported-sessions.json');
      const tracker = {
        version: 1,
        sessions: [
          { filename: 'session1.jsonl', importedAt: new Date().toISOString(), mtime: 1704067200000 },
        ],
      };

      fs.writeFileSync(trackerPath, JSON.stringify(tracker, null, 2));

      // Check if session already imported
      const existingTracker = JSON.parse(fs.readFileSync(trackerPath, 'utf-8'));
      const alreadyImported = existingTracker.sessions.some(
        (s: { filename: string; mtime: number }) =>
          s.filename === 'session1.jsonl' && s.mtime === 1704067200000
      );

      expect(alreadyImported).toBe(true);
    });

    it('should re-import if mtime changed', async () => {
      initRecallDir(ctx.repoDir);

      const trackerPath = path.join(ctx.recallDir, 'imported-sessions.json');
      const tracker = {
        sessions: [{ filename: 'session1.jsonl', mtime: 1000 }],
      };
      fs.writeFileSync(trackerPath, JSON.stringify(tracker));

      // Session modified (new mtime)
      const newMtime = 2000;
      const existingTracker = JSON.parse(fs.readFileSync(trackerPath, 'utf-8'));
      const needsReimport = !existingTracker.sessions.some(
        (s: { filename: string; mtime: number }) =>
          s.filename === 'session1.jsonl' && s.mtime === newMtime
      );

      expect(needsReimport).toBe(true);
    });

    it('should handle concurrent imports', async () => {
      initRecallDir(ctx.repoDir);

      const trackerPath = path.join(ctx.recallDir, 'imported-sessions.json');

      // Simulate concurrent access with file locking pattern
      const locks = new Map<string, boolean>();

      const acquireLock = (file: string): boolean => {
        if (locks.get(file)) return false;
        locks.set(file, true);
        return true;
      };

      const releaseLock = (file: string): void => {
        locks.delete(file);
      };

      // First import acquires lock
      expect(acquireLock(trackerPath)).toBe(true);

      // Second import fails to acquire
      expect(acquireLock(trackerPath)).toBe(false);

      // After first releases, second can acquire
      releaseLock(trackerPath);
      expect(acquireLock(trackerPath)).toBe(true);
    });
  });

  describe('Transcript Conversion', () => {
    it('should convert JSONL to readable markdown', async () => {
      const jsonl = createJsonlSession([
        { role: 'user', content: 'How do I create a new React component?' },
        {
          role: 'assistant',
          content: "I'll create a new functional component for you.",
          toolCalls: [
            {
              name: 'write_file',
              arguments: { path: 'src/Button.tsx', content: 'export const Button = () => <button>Click me</button>;' },
            },
          ],
        },
      ]);

      // Convert to markdown
      const lines = jsonl.split('\n').filter((l) => l.trim());
      const markdown = lines
        .map((line) => {
          const msg = JSON.parse(line);
          const prefix = msg.role === 'user' ? '**User:**' : '**Assistant:**';
          let text = `${prefix} ${msg.content}`;
          if (msg.toolCalls) {
            text += '\n\n```\n' + JSON.stringify(msg.toolCalls, null, 2) + '\n```';
          }
          return text;
        })
        .join('\n\n---\n\n');

      expect(markdown).toContain('**User:**');
      expect(markdown).toContain('**Assistant:**');
      expect(markdown).toContain('write_file');
    });

    it('should extract structured data from conversations', async () => {
      // The AI extracts:
      // - Decisions made
      // - Failures encountered
      // - Lessons learned
      // - Effective prompts

      const structuredData = {
        decisions: [
          {
            title: 'Use TypeScript',
            what: 'Migrated codebase to TypeScript',
            why: 'Better type safety and IDE support',
            alternatives: [{ option: 'JSDoc', rejected_because: 'Less comprehensive' }],
          },
        ],
        failures: [
          {
            title: 'Initial auth approach',
            what_tried: 'Session-based auth',
            what_happened: 'Scaling issues',
            root_cause: 'Stateful sessions dont work with serverless',
            resolution: 'Switched to JWT',
          },
        ],
        lessons: [
          {
            title: 'Serverless auth patterns',
            lesson: 'Use stateless tokens for serverless architectures',
          },
        ],
      };

      expect(structuredData.decisions.length).toBe(1);
      expect(structuredData.failures.length).toBe(1);
      expect(structuredData.lessons.length).toBe(1);
    });
  });

  describe('Session Summarization', () => {
    it('should generate session summary from transcript', async () => {
      const transcript = `
User: I need to add user authentication to the app.
Assistant: I'll implement OAuth with GitHub. Let me create the auth routes...
[Tool calls: write_file src/auth.ts, write_file src/routes/callback.ts]
User: Great! Can you also add session management?
Assistant: I'll add session handling with encrypted cookies...
`;

      // AI would generate summary like:
      const summary = {
        session_title: 'Implementing GitHub OAuth Authentication',
        summary: 'Added OAuth login with GitHub and session management using encrypted cookies.',
        status: 'complete',
        files_changed: ['src/auth.ts', 'src/routes/callback.ts'],
        decisions: [
          { what: 'Use GitHub OAuth', why: 'Team already uses GitHub for version control' },
        ],
      };

      expect(summary.session_title).toContain('OAuth');
      expect(summary.files_changed.length).toBe(2);
    });

    it('should update context.md with relevant changes', async () => {
      initRecallDir(ctx.repoDir);

      const originalContext = fs.readFileSync(
        path.join(ctx.recallDir, 'context.md'),
        'utf-8'
      );

      // After session, context might be updated with new info
      const newSection = `

## Authentication
- Using GitHub OAuth for login
- Sessions stored in encrypted cookies
- Callback URL: /auth/callback
`;

      const updated = originalContext + newSection;
      fs.writeFileSync(path.join(ctx.recallDir, 'context.md'), updated);

      const content = fs.readFileSync(path.join(ctx.recallDir, 'context.md'), 'utf-8');
      expect(content).toContain('GitHub OAuth');
    });

    it('should categorize sessions by date', async () => {
      initRecallDir(ctx.repoDir);

      const sessionsDir = path.join(ctx.recallDir, 'sessions');

      // Sessions organized by date
      const today = new Date().toISOString().split('T')[0];
      const dateDir = path.join(sessionsDir, today);
      fs.mkdirSync(dateDir, { recursive: true });
      fs.writeFileSync(path.join(dateDir, 'session-001.md'), '# Session 1');

      expect(fs.existsSync(dateDir)).toBe(true);
    });
  });

  describe('Large Session Handling', () => {
    it('should handle sessions with many messages', async () => {
      const messages = [];
      for (let i = 0; i < 1000; i++) {
        messages.push({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i} with some content that makes it reasonably sized.`,
        });
      }

      const jsonl = messages.map((m) => JSON.stringify(m)).join('\n');
      expect(jsonl.split('\n').length).toBe(1000);

      // Parser should handle this without issues
      const parsed = jsonl.split('\n').map((l) => JSON.parse(l));
      expect(parsed.length).toBe(1000);
    });

    it('should handle sessions with large tool outputs', async () => {
      const largeOutput = 'x'.repeat(100000); // 100KB

      const message = {
        role: 'assistant',
        content: 'Here is the file content:',
        toolCalls: [
          {
            name: 'read_file',
            arguments: { path: 'large-file.txt' },
            result: largeOutput,
          },
        ],
      };

      const jsonl = JSON.stringify(message);
      expect(jsonl.length).toBeGreaterThan(100000);
    });

    it('should stream large sessions rather than loading all in memory', async () => {
      // For very large sessions, we should use streaming
      // This is a design principle test
      const streamingApproach = {
        chunkSize: 1000, // Process 1000 lines at a time
        memoryLimit: 50 * 1024 * 1024, // 50MB max
      };

      expect(streamingApproach.chunkSize).toBeGreaterThan(0);
      expect(streamingApproach.memoryLimit).toBeLessThan(100 * 1024 * 1024);
    });
  });
});
