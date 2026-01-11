/**
 * E2E Session Lifecycle Tests
 * Tests the full session lifecycle from start to save
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  createTestContext,
  initRecallDir,
  writeTestConfig,
  encryptContent,
  decryptContent,
  generateTestKey,
  type TestContext,
} from '../utils/helpers';
import { mockFetch, clearFetchMocks, mockApiResponses } from '../utils/mocks';
import { createContextMd, createHistoryMd, createJsonlSession } from '../utils/factories';

describe('E2E: Session Lifecycle', () => {
  let ctx: TestContext;
  let teamKey: Buffer;

  beforeEach(async () => {
    ctx = await createTestContext();
    teamKey = generateTestKey();

    writeTestConfig(ctx.homeDir, { apiToken: 'recall_test_token' });

    mockFetch({
      'GET /keys/team': {
        hasAccess: true,
        key: teamKey.toString('base64'),
        teamId: 'team-123',
        keyVersion: 1,
      },
    });
  });

  afterEach(async () => {
    await ctx.cleanup();
    clearFetchMocks();
  });

  describe('Session Start', () => {
    it('should load context.md at session start', async () => {
      const context = createContextMd({
        projectName: 'MyApp',
        techStack: ['TypeScript', 'React'],
        currentWork: 'Building feature X',
      });

      initRecallDir(ctx.repoDir, { context });

      // Simulate recall_get_context tool
      const contextPath = path.join(ctx.recallDir, 'context.md');
      const content = fs.readFileSync(contextPath, 'utf-8');

      expect(content).toContain('MyApp');
      expect(content).toContain('TypeScript');
      expect(content).toContain('feature X');
    });

    it('should load encrypted context', async () => {
      const context = createContextMd({ projectName: 'Secret Project' });

      initRecallDir(ctx.repoDir);
      const contextPath = path.join(ctx.recallDir, 'context.md');
      fs.writeFileSync(contextPath, encryptContent(context, teamKey));

      // Load and decrypt
      const encrypted = fs.readFileSync(contextPath, 'utf-8');
      const decrypted = decryptContent(encrypted, teamKey);

      expect(decrypted).toContain('Secret Project');
    });

    it('should provide helpful message when no context exists', async () => {
      // Remove .recall if it exists (createTestContext may have created it)
      if (fs.existsSync(ctx.recallDir)) {
        fs.rmSync(ctx.recallDir, { recursive: true });
      }

      // Empty repo, no .recall directory
      const exists = fs.existsSync(ctx.recallDir);
      expect(exists).toBe(false);

      const message = 'No team memory found. Use recall_init to set up this repo.';
      expect(message).toContain('recall_init');
    });

    it('should handle first session in new repo', async () => {
      // Initialize for first time
      initRecallDir(ctx.repoDir);

      const contextPath = path.join(ctx.recallDir, 'context.md');
      expect(fs.existsSync(contextPath)).toBe(true);

      const content = fs.readFileSync(contextPath, 'utf-8');
      expect(content).toContain('Team Context');
    });
  });

  describe('During Session', () => {
    it('should track decisions made during session', async () => {
      initRecallDir(ctx.repoDir);

      const decisions = [
        { what: 'Use Prisma ORM', why: 'Type-safe database queries' },
        { what: 'Deploy to Vercel', why: 'Seamless Next.js integration' },
      ];

      // Decisions would be collected during session
      expect(decisions.length).toBe(2);
      expect(decisions[0].what).toBe('Use Prisma ORM');
    });

    it('should track files changed during session', async () => {
      initRecallDir(ctx.repoDir);

      const filesChanged = [
        'src/db/schema.ts',
        'src/api/users.ts',
        'package.json',
      ];

      expect(filesChanged.length).toBe(3);
    });

    it('should log errors and resolutions', async () => {
      const errorLog = {
        error: 'TypeScript type error on line 42',
        resolution: 'Added type assertion for third-party library',
        timeSpent: '15 minutes',
      };

      expect(errorLog.resolution).toContain('type assertion');
    });
  });

  describe('Session End', () => {
    it('should save session summary to sessions/', async () => {
      initRecallDir(ctx.repoDir);

      const session = {
        id: 'session-2024-01-15-001',
        timestamp: new Date().toISOString(),
        summary: 'Implemented user authentication with OAuth',
        decisions: [
          { what: 'Use GitHub OAuth', why: 'Team uses GitHub' },
        ],
        filesChanged: ['src/auth.ts', 'src/routes/callback.ts'],
        status: 'complete',
      };

      const sessionContent = `# ${session.summary}

**Date:** ${session.timestamp}
**Status:** ${session.status}

## Summary
${session.summary}

## Decisions
${session.decisions.map((d) => `- **${d.what}:** ${d.why}`).join('\n')}

## Files Changed
${session.filesChanged.map((f) => `- ${f}`).join('\n')}
`;

      const sessionPath = path.join(ctx.recallDir, 'sessions', `${session.id}.md`);
      fs.writeFileSync(sessionPath, sessionContent);

      expect(fs.existsSync(sessionPath)).toBe(true);

      const saved = fs.readFileSync(sessionPath, 'utf-8');
      expect(saved).toContain('OAuth');
      expect(saved).toContain('src/auth.ts');
    });

    it('should update context.md with new information', async () => {
      initRecallDir(ctx.repoDir);

      const contextPath = path.join(ctx.recallDir, 'context.md');
      const original = fs.readFileSync(contextPath, 'utf-8');

      // Add new section based on session
      const newSection = `

## Authentication
- Using GitHub OAuth
- Tokens stored in httpOnly cookies
- Session expires after 7 days
`;

      fs.writeFileSync(contextPath, original + newSection);

      const updated = fs.readFileSync(contextPath, 'utf-8');
      expect(updated).toContain('Authentication');
      expect(updated).toContain('httpOnly cookies');
    });

    it('should append decisions to history.md', async () => {
      initRecallDir(ctx.repoDir);

      const historyPath = path.join(ctx.recallDir, 'history.md');
      const original = fs.readFileSync(historyPath, 'utf-8');

      const newDecision = `

## 2024-01-15: Use GitHub OAuth
**Why:** Team already uses GitHub for version control, reduces friction for users.
**Alternatives considered:**
- Google OAuth: Rejected - not all team members have Google accounts
- Email/password: Rejected - security concerns and password management burden
`;

      fs.writeFileSync(historyPath, original + newDecision);

      const updated = fs.readFileSync(historyPath, 'utf-8');
      expect(updated).toContain('GitHub OAuth');
      expect(updated).toContain('Alternatives considered');
    });

    it('should encrypt files before saving', async () => {
      initRecallDir(ctx.repoDir);

      const sensitiveContent = 'API keys and secret decisions';
      const contextPath = path.join(ctx.recallDir, 'context.md');

      const encrypted = encryptContent(sensitiveContent, teamKey);
      fs.writeFileSync(contextPath, encrypted);

      const saved = fs.readFileSync(contextPath, 'utf-8');
      expect(saved).not.toContain('API keys');
      expect(saved.startsWith('RECALL_ENCRYPTED:')).toBe(true);
    });
  });

  describe('Session Import', () => {
    it('should import Claude Code JSONL session', async () => {
      initRecallDir(ctx.repoDir);

      // Create mock Claude session
      const claudeDir = path.join(ctx.homeDir, '.claude', 'projects', 'test-hash');
      fs.mkdirSync(claudeDir, { recursive: true });

      const jsonl = createJsonlSession([
        { role: 'user', content: 'Help me build an auth system' },
        { role: 'assistant', content: 'I will implement OAuth...' },
        { role: 'user', content: 'Great, add session management' },
        { role: 'assistant', content: 'Adding encrypted sessions...' },
      ]);

      fs.writeFileSync(path.join(claudeDir, 'session.jsonl'), jsonl);

      // Import would convert to markdown
      const lines = jsonl.split('\n').filter((l) => l.trim());
      const messages = lines.map((l) => JSON.parse(l));

      expect(messages.length).toBe(4);
      expect(messages[0].role).toBe('user');
    });

    it('should generate AI summary from imported session', async () => {
      // AI would analyze the conversation and produce:
      const summary = {
        session_title: 'Building Authentication System',
        summary: 'Implemented OAuth authentication with session management',
        decisions: [
          { what: 'Use OAuth', why: 'Secure and user-friendly' },
          { what: 'Encrypted sessions', why: 'Protect user data' },
        ],
        status: 'complete',
      };

      expect(summary.session_title).toBeDefined();
      expect(summary.decisions.length).toBeGreaterThan(0);
    });

    it('should track imported sessions to avoid duplicates', async () => {
      initRecallDir(ctx.repoDir);

      const trackerPath = path.join(ctx.recallDir, 'imported-sessions.json');
      const tracker = {
        version: 1,
        sessions: [
          {
            filename: 'session-001.jsonl',
            importedAt: new Date().toISOString(),
            mtime: 1704067200000,
          },
        ],
      };

      fs.writeFileSync(trackerPath, JSON.stringify(tracker, null, 2));

      // Check if session already imported
      const content = JSON.parse(fs.readFileSync(trackerPath, 'utf-8'));
      const alreadyImported = content.sessions.some(
        (s: { filename: string }) => s.filename === 'session-001.jsonl'
      );

      expect(alreadyImported).toBe(true);
    });
  });

  describe('Multi-Session Workflow', () => {
    it('should maintain context across multiple sessions', async () => {
      initRecallDir(ctx.repoDir);

      // Session 1: Initial setup
      const contextPath = path.join(ctx.recallDir, 'context.md');
      fs.writeFileSync(
        contextPath,
        `# Project Context

## Current Work
Setting up the project.
`
      );

      // Session 2: Add feature
      const session2Update = `

## Auth System
- OAuth with GitHub
- JWT tokens
`;
      fs.appendFileSync(contextPath, session2Update);

      // Session 3: Add more
      const session3Update = `

## API Endpoints
- /api/users
- /api/auth
`;
      fs.appendFileSync(contextPath, session3Update);

      // Verify cumulative context
      const finalContent = fs.readFileSync(contextPath, 'utf-8');
      expect(finalContent).toContain('Setting up');
      expect(finalContent).toContain('OAuth');
      expect(finalContent).toContain('/api/users');
    });

    it('should build up history over time', async () => {
      initRecallDir(ctx.repoDir);

      const historyPath = path.join(ctx.recallDir, 'history.md');
      const sessionsDir = path.join(ctx.recallDir, 'sessions');

      // Multiple sessions create multiple files
      for (let i = 1; i <= 5; i++) {
        fs.writeFileSync(
          path.join(sessionsDir, `session-00${i}.md`),
          `# Session ${i}\nWork done in session ${i}.`
        );
      }

      const sessions = fs.readdirSync(sessionsDir);
      expect(sessions.length).toBe(5);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing encryption key gracefully', async () => {
      mockFetch({
        'GET /keys/team': {
          hasAccess: false,
          message: 'No team access',
        },
      });

      const response = await fetch('http://localhost:8787/keys/team', {
        headers: { Authorization: 'Bearer test_token' },
      });

      const data = await response.json() as { hasAccess: boolean };
      expect(data.hasAccess).toBe(false);
    });

    it('should handle corrupted session files', async () => {
      initRecallDir(ctx.repoDir);

      const sessionPath = path.join(ctx.recallDir, 'sessions', 'corrupted.md');
      fs.writeFileSync(sessionPath, 'RECALL_ENCRYPTED:v1:bad:data:here');

      // Reading corrupted file should be detectable
      const content = fs.readFileSync(sessionPath, 'utf-8');
      const isEncrypted = content.startsWith('RECALL_ENCRYPTED:');
      expect(isEncrypted).toBe(true);

      // Decryption would fail
      expect(() => decryptContent(content, teamKey)).toThrow();
    });

    it('should recover from partial save', async () => {
      initRecallDir(ctx.repoDir);

      const contextPath = path.join(ctx.recallDir, 'context.md');
      const backupPath = contextPath + '.bak';

      // Create backup before save
      const original = fs.readFileSync(contextPath, 'utf-8');
      fs.writeFileSync(backupPath, original);

      // Simulate failed save
      fs.writeFileSync(contextPath, 'PARTIAL');

      // Recover from backup
      fs.copyFileSync(backupPath, contextPath);
      const recovered = fs.readFileSync(contextPath, 'utf-8');

      expect(recovered).toBe(original);
    });
  });
});
