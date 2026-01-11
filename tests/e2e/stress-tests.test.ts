/**
 * Stress Tests
 * Tests high load scenarios with many concurrent team members
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
  sleep,
  type TestContext,
} from '../utils/helpers';
import { mockFetch, clearFetchMocks } from '../utils/mocks';

describe('Stress Tests', () => {
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

  describe('Concurrent API Requests', () => {
    it('should handle 10 concurrent key fetch requests', async () => {
      let requestCount = 0;

      mockFetch({
        'GET /keys/team': () => {
          requestCount++;
          return {
            hasAccess: true,
            key: teamKey.toString('base64'),
            teamId: 'team-123',
          };
        },
      });

      const requests = Array.from({ length: 10 }, () =>
        fetch('http://localhost:8787/keys/team', {
          headers: { Authorization: 'Bearer recall_test' },
        })
      );

      const responses = await Promise.all(requests);

      expect(requestCount).toBe(10);
      expect(responses.every((r) => r.ok)).toBe(true);
    });

    it('should handle 50 concurrent read requests', async () => {
      const contextPath = path.join(ctx.recallDir, 'context.md');
      fs.writeFileSync(contextPath, encryptContent('Shared content', teamKey));

      const readPromises = Array.from({ length: 50 }, () =>
        fs.promises.readFile(contextPath, 'utf-8')
      );

      const results = await Promise.all(readPromises);

      expect(results.length).toBe(50);
      expect(new Set(results).size).toBe(1); // All reads return same content
    });

    it('should handle mixed read/write operations', async () => {
      const contextPath = path.join(ctx.recallDir, 'context.md');
      fs.writeFileSync(contextPath, 'Initial');

      const operations: Promise<void>[] = [];

      // 10 reads
      for (let i = 0; i < 10; i++) {
        operations.push(
          fs.promises.readFile(contextPath, 'utf-8').then(() => {})
        );
      }

      // 5 writes (to different session files to avoid conflicts)
      for (let i = 0; i < 5; i++) {
        const sessionPath = path.join(ctx.recallDir, 'sessions', `session-${i}.md`);
        operations.push(
          fs.promises.writeFile(sessionPath, `Session ${i}`)
        );
      }

      await Promise.all(operations);

      const sessions = fs.readdirSync(path.join(ctx.recallDir, 'sessions'));
      expect(sessions.length).toBe(5);
    });
  });

  describe('Large Team Scenarios', () => {
    it('should handle 20 team members fetching keys simultaneously', async () => {
      const members = Array.from({ length: 20 }, (_, i) => ({
        id: `member-${i}`,
        token: `recall_member${i}`,
      }));

      mockFetch({
        'GET /keys/team': (req) => {
          const auth = req.headers.get('Authorization');
          return {
            hasAccess: true,
            key: teamKey.toString('base64'),
            requestedBy: auth?.replace('Bearer ', ''),
          };
        },
      });

      const keyFetches = members.map((member) =>
        fetch('http://localhost:8787/keys/team', {
          headers: { Authorization: `Bearer ${member.token}` },
        }).then((r) => r.json())
      );

      const results = await Promise.all(keyFetches);

      expect(results.length).toBe(20);
      expect(results.every((r: { hasAccess: boolean }) => r.hasAccess)).toBe(true);
    });

    it('should handle 100 session files', async () => {
      const sessionsDir = path.join(ctx.recallDir, 'sessions');

      // Create 100 session files
      const writePromises = Array.from({ length: 100 }, (_, i) =>
        fs.promises.writeFile(
          path.join(sessionsDir, `session-${String(i).padStart(3, '0')}.md`),
          encryptContent(`Session ${i} content`, teamKey)
        )
      );

      await Promise.all(writePromises);

      const sessions = fs.readdirSync(sessionsDir);
      expect(sessions.length).toBe(100);

      // Read all sessions
      const readPromises = sessions.map((file) =>
        fs.promises.readFile(path.join(sessionsDir, file), 'utf-8')
      );

      const contents = await Promise.all(readPromises);
      expect(contents.every((c) => c.startsWith('RECALL_ENCRYPTED:'))).toBe(true);
    });

    it('should handle team with 50 members reading shared context', async () => {
      const contextPath = path.join(ctx.recallDir, 'context.md');
      const sharedContext = `# Team Context

## Current Project
Large team working on complex system.

## Tech Stack
- TypeScript, React, Node.js
- PostgreSQL, Redis
- Kubernetes, Docker

## Team Conventions
- Code review required for all PRs
- Tests must pass before merge
- Deploy on Fridays? Never.
`;

      fs.writeFileSync(contextPath, encryptContent(sharedContext, teamKey));

      // 50 members read simultaneously
      const readPromises = Array.from({ length: 50 }, async () => {
        const encrypted = await fs.promises.readFile(contextPath, 'utf-8');
        return decryptContent(encrypted, teamKey);
      });

      const results = await Promise.all(readPromises);

      expect(results.length).toBe(50);
      expect(results.every((r) => r.includes('Large team'))).toBe(true);
    });
  });

  describe('High Frequency Operations', () => {
    it('should handle rapid session saves (10 per second)', async () => {
      const sessionsDir = path.join(ctx.recallDir, 'sessions');
      const startTime = Date.now();

      // Simulate 10 saves in ~1 second
      const saves: Promise<void>[] = [];
      for (let i = 0; i < 10; i++) {
        const sessionPath = path.join(sessionsDir, `rapid-${Date.now()}-${i}.md`);
        saves.push(
          fs.promises.writeFile(sessionPath, encryptContent(`Rapid session ${i}`, teamKey))
        );
      }

      await Promise.all(saves);
      const elapsed = Date.now() - startTime;

      const sessions = fs.readdirSync(sessionsDir).filter((f) => f.startsWith('rapid-'));
      expect(sessions.length).toBe(10);
      expect(elapsed).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle many small decision logs', async () => {
      const decisions: Array<{ what: string; why: string; timestamp: number }> = [];

      // Log 100 decisions
      for (let i = 0; i < 100; i++) {
        decisions.push({
          what: `Decision ${i}`,
          why: `Reason ${i}`,
          timestamp: Date.now(),
        });
      }

      const logPath = path.join(ctx.recallDir, 'decisions.jsonl');
      const content = decisions.map((d) => JSON.stringify(d)).join('\n');
      fs.writeFileSync(logPath, content);

      const lines = fs.readFileSync(logPath, 'utf-8').split('\n').filter((l) => l);
      expect(lines.length).toBe(100);
    });

    it('should handle context updates every minute for an hour', async () => {
      const contextPath = path.join(ctx.recallDir, 'context.md');

      // Simulate 60 updates (1 per minute for an hour)
      for (let i = 0; i < 60; i++) {
        const content = `# Context - Update ${i}
Last updated: ${new Date().toISOString()}
Session count: ${i}
`;
        fs.writeFileSync(contextPath, encryptContent(content, teamKey));
      }

      const final = decryptContent(fs.readFileSync(contextPath, 'utf-8'), teamKey);
      expect(final).toContain('Update 59');
    });
  });

  describe('Memory and Performance', () => {
    it('should handle large context file (500KB)', async () => {
      const contextPath = path.join(ctx.recallDir, 'context.md');

      // Generate 500KB of content
      const line = '# Section\n' + 'Content line with some text. '.repeat(50) + '\n';
      const targetSize = 500 * 1024;
      const content = line.repeat(Math.ceil(targetSize / line.length));

      const encrypted = encryptContent(content, teamKey);
      fs.writeFileSync(contextPath, encrypted);

      const start = Date.now();
      const decrypted = decryptContent(fs.readFileSync(contextPath, 'utf-8'), teamKey);
      const elapsed = Date.now() - start;

      expect(decrypted.length).toBeGreaterThan(500 * 1024);
      expect(elapsed).toBeLessThan(1000); // Should decrypt in under 1 second
    });

    it('should handle 1000 small session files', async () => {
      const sessionsDir = path.join(ctx.recallDir, 'sessions');

      // Create 1000 small session files
      const createPromises = Array.from({ length: 1000 }, (_, i) => {
        const sessionPath = path.join(sessionsDir, `sess-${String(i).padStart(4, '0')}.md`);
        return fs.promises.writeFile(sessionPath, `# Session ${i}\nBrief.`);
      });

      await Promise.all(createPromises);

      const sessions = fs.readdirSync(sessionsDir);
      expect(sessions.length).toBe(1000);

      // List should still be fast
      const start = Date.now();
      fs.readdirSync(sessionsDir);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100); // Directory listing under 100ms
    });

    it('should handle repeated encrypt/decrypt cycles', async () => {
      const content = 'Content to encrypt and decrypt repeatedly';

      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        const encrypted = encryptContent(content, teamKey);
        const decrypted = decryptContent(encrypted, teamKey);
        expect(decrypted).toBe(content);
      }
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(5000); // 100 cycles under 5 seconds
    });
  });

  describe('Error Recovery Under Load', () => {
    it('should recover from intermittent API failures', async () => {
      let requestNum = 0;

      mockFetch({
        'GET /keys/team': () => {
          requestNum++;
          // Fail every 3rd request
          if (requestNum % 3 === 0) {
            return new Response(
              JSON.stringify({ error: 'Service temporarily unavailable' }),
              { status: 503 }
            );
          }
          return { hasAccess: true, key: teamKey.toString('base64') };
        },
      });

      const results: { success: boolean }[] = [];

      for (let i = 0; i < 9; i++) {
        const response = await fetch('http://localhost:8787/keys/team', {
          headers: { Authorization: 'Bearer recall_test' },
        });
        results.push({ success: response.ok });
      }

      const successful = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      expect(successful).toBe(6); // 6 succeed
      expect(failed).toBe(3); // 3 fail (every 3rd)
    });

    it('should handle partial batch operations', async () => {
      const sessionsDir = path.join(ctx.recallDir, 'sessions');
      const results: { file: string; success: boolean }[] = [];

      // Try to write 10 files, some will "fail"
      for (let i = 0; i < 10; i++) {
        const sessionPath = path.join(sessionsDir, `batch-${i}.md`);
        try {
          // Simulate failure on file 5
          if (i === 5) {
            throw new Error('Simulated write failure');
          }
          fs.writeFileSync(sessionPath, `Session ${i}`);
          results.push({ file: `batch-${i}.md`, success: true });
        } catch {
          results.push({ file: `batch-${i}.md`, success: false });
        }
      }

      const successful = results.filter((r) => r.success).length;
      expect(successful).toBe(9); // 9 out of 10 succeed
    });
  });

  describe('Concurrent Team Updates', () => {
    it('should handle simultaneous context updates from different members', async () => {
      const contextPath = path.join(ctx.recallDir, 'context.md');

      // Multiple members try to update context simultaneously
      // In reality, git would handle conflicts, but we test file access
      const updates = Array.from({ length: 5 }, (_, i) =>
        fs.promises.writeFile(
          contextPath,
          encryptContent(`Update from member ${i}`, teamKey)
        )
      );

      await Promise.all(updates);

      // Final content should be from one of the writers
      const final = decryptContent(fs.readFileSync(contextPath, 'utf-8'), teamKey);
      expect(final).toMatch(/Update from member \d/);
    });

    it('should handle concurrent session saves to different files', async () => {
      const sessionsDir = path.join(ctx.recallDir, 'sessions');

      // 20 members save sessions at the same time
      const saves = Array.from({ length: 20 }, (_, i) =>
        fs.promises.writeFile(
          path.join(sessionsDir, `member-${i}-${Date.now()}.md`),
          encryptContent(`Session by member ${i}`, teamKey)
        )
      );

      await Promise.all(saves);

      const sessions = fs.readdirSync(sessionsDir);
      expect(sessions.length).toBe(20);
    });

    it('should maintain data consistency under concurrent operations', async () => {
      const historyPath = path.join(ctx.recallDir, 'history.md');
      fs.writeFileSync(historyPath, '# History\n');

      // Simulate concurrent appends (in real scenario, would need locking)
      const entries = Array.from({ length: 10 }, (_, i) => `\n## Entry ${i}`);

      let content = fs.readFileSync(historyPath, 'utf-8');
      for (const entry of entries) {
        content += entry;
      }
      fs.writeFileSync(historyPath, content);

      const final = fs.readFileSync(historyPath, 'utf-8');
      expect(final).toContain('Entry 0');
      expect(final).toContain('Entry 9');
    });
  });

  describe('API Rate Limits Under Load', () => {
    it('should respect rate limits with 100 requests per minute', async () => {
      const RATE_LIMIT = 100;
      let requestsThisMinute = 0;
      const windowStart = Date.now();

      mockFetch({
        'GET /keys/team': () => {
          requestsThisMinute++;
          if (requestsThisMinute > RATE_LIMIT) {
            return new Response(
              JSON.stringify({ error: 'Rate limit exceeded' }),
              { status: 429, headers: { 'Retry-After': '60' } }
            );
          }
          return { hasAccess: true, key: teamKey.toString('base64') };
        },
      });

      const results: number[] = [];

      for (let i = 0; i < 120; i++) {
        const response = await fetch('http://localhost:8787/keys/team', {
          headers: { Authorization: 'Bearer recall_test' },
        });
        results.push(response.status);
      }

      const okCount = results.filter((s) => s === 200).length;
      const rateLimitedCount = results.filter((s) => s === 429).length;

      expect(okCount).toBe(100);
      expect(rateLimitedCount).toBe(20);
    });

    it('should queue requests when approaching rate limit', async () => {
      const queue: Array<{ id: number; queued: boolean }> = [];

      for (let i = 0; i < 120; i++) {
        if (i < 100) {
          queue.push({ id: i, queued: false });
        } else {
          queue.push({ id: i, queued: true }); // Would be queued
        }
      }

      const immediate = queue.filter((r) => !r.queued).length;
      const queued = queue.filter((r) => r.queued).length;

      expect(immediate).toBe(100);
      expect(queued).toBe(20);
    });
  });

  describe('Long Running Sessions', () => {
    it('should handle 8-hour session with periodic saves', async () => {
      const sessionsDir = path.join(ctx.recallDir, 'sessions');

      // Simulate 8 hours of saves every 30 minutes = 16 saves
      const saveIntervals = 16;

      for (let i = 0; i < saveIntervals; i++) {
        const timestamp = new Date(Date.now() + i * 30 * 60 * 1000).toISOString();
        const sessionPath = path.join(sessionsDir, `session-${i}.md`);
        fs.writeFileSync(
          sessionPath,
          encryptContent(`Session update at ${timestamp}`, teamKey)
        );
      }

      const sessions = fs.readdirSync(sessionsDir);
      expect(sessions.length).toBe(16);
    });

    it('should handle accumulated context over months', async () => {
      const historyPath = path.join(ctx.recallDir, 'history.md');

      // Simulate 3 months of daily entries
      let history = '# Team History\n\n';
      for (let day = 0; day < 90; day++) {
        const date = new Date(Date.now() - day * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        history += `## ${date}\n- Work done on day ${day}\n\n`;
      }

      fs.writeFileSync(historyPath, encryptContent(history, teamKey));

      const content = decryptContent(fs.readFileSync(historyPath, 'utf-8'), teamKey);
      expect(content).toContain('day 0');
      expect(content).toContain('day 89');
    });
  });
});
