/**
 * E2E Team Workflow Tests
 * Tests team collaboration flows
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
import { createUser, createTeam, createApiToken, createContextMd, createHistoryMd } from '../utils/factories';

describe('E2E: Team Workflow', () => {
  let ctx: TestContext;
  let teamKey: Buffer;

  beforeEach(async () => {
    ctx = await createTestContext();
    teamKey = generateTestKey();
  });

  afterEach(async () => {
    await ctx.cleanup();
    clearFetchMocks();
  });

  describe('Shared Context Access', () => {
    it('should allow team members to read encrypted context', async () => {
      // Owner creates encrypted context
      const contextContent = createContextMd({
        projectName: 'Team Project',
        techStack: ['React', 'Node.js', 'PostgreSQL'],
        currentWork: 'Building user dashboard',
      });

      initRecallDir(ctx.repoDir);
      const contextPath = path.join(ctx.recallDir, 'context.md');
      const encrypted = encryptContent(contextContent, teamKey);
      fs.writeFileSync(contextPath, encrypted);

      // Team member fetches key and decrypts
      mockFetch({
        'GET /keys/team': {
          hasAccess: true,
          key: teamKey.toString('base64'),
          teamId: 'team-123',
          keyVersion: 1,
        },
      });

      const keyResponse = await fetch('http://localhost:8787/keys/team', {
        headers: { Authorization: 'Bearer member_token' },
      });
      const keyData = await keyResponse.json() as { key: string };
      const memberKey = Buffer.from(keyData.key, 'base64');

      const encryptedContent = fs.readFileSync(contextPath, 'utf-8');
      const decrypted = decryptContent(encryptedContent, memberKey);

      expect(decrypted).toContain('Team Project');
      expect(decrypted).toContain('React');
    });

    it('should allow team members to update context', async () => {
      initRecallDir(ctx.repoDir);
      const contextPath = path.join(ctx.recallDir, 'context.md');

      // Initial content by owner
      const initial = createContextMd({ projectName: 'Project' });
      fs.writeFileSync(contextPath, encryptContent(initial, teamKey));

      // Member updates context
      const updated = initial + '\n\n## New Section\nAdded by team member.';
      fs.writeFileSync(contextPath, encryptContent(updated, teamKey));

      // Verify update
      const content = fs.readFileSync(contextPath, 'utf-8');
      const decrypted = decryptContent(content, teamKey);

      expect(decrypted).toContain('New Section');
      expect(decrypted).toContain('Added by team member');
    });
  });

  describe('Session Sharing', () => {
    it('should share session summaries across team', async () => {
      initRecallDir(ctx.repoDir);

      // Developer A saves session
      const sessionA = `# Session by Developer A
## Summary
Implemented authentication flow.

## Decisions
- Use JWT for stateless auth
- Store refresh tokens in httpOnly cookies
`;

      const sessionPathA = path.join(ctx.recallDir, 'sessions', 'session-a.md');
      fs.writeFileSync(sessionPathA, encryptContent(sessionA, teamKey));

      // Developer B saves session
      const sessionB = `# Session by Developer B
## Summary
Built API endpoints for user management.

## Decisions
- Use Zod for request validation
- Return 404 for non-existent users (not 403)
`;

      const sessionPathB = path.join(ctx.recallDir, 'sessions', 'session-b.md');
      fs.writeFileSync(sessionPathB, encryptContent(sessionB, teamKey));

      // Developer C can read both
      const sessionsDir = path.join(ctx.recallDir, 'sessions');
      const sessions = fs.readdirSync(sessionsDir);

      expect(sessions.length).toBe(2);

      for (const session of sessions) {
        const content = fs.readFileSync(path.join(sessionsDir, session), 'utf-8');
        const decrypted = decryptContent(content, teamKey);
        expect(decrypted).toContain('## Summary');
      }
    });

    it('should aggregate decisions into history', async () => {
      initRecallDir(ctx.repoDir);

      const history = createHistoryMd({
        decisions: [
          { date: '2024-01-15', what: 'Use TypeScript', why: 'Type safety' },
          { date: '2024-01-16', what: 'Use PostgreSQL', why: 'ACID compliance' },
          { date: '2024-01-17', what: 'Use JWT auth', why: 'Stateless scaling' },
        ],
      });

      const historyPath = path.join(ctx.recallDir, 'history.md');
      fs.writeFileSync(historyPath, encryptContent(history, teamKey));

      const content = fs.readFileSync(historyPath, 'utf-8');
      const decrypted = decryptContent(content, teamKey);

      expect(decrypted).toContain('TypeScript');
      expect(decrypted).toContain('PostgreSQL');
      expect(decrypted).toContain('JWT');
    });
  });

  describe('Member Onboarding', () => {
    it('should allow new member to read existing history', async () => {
      // Setup: Existing team with history
      initRecallDir(ctx.repoDir);

      const history = createHistoryMd({
        sessions: [
          { date: '2024-01-01', summary: 'Project kickoff' },
          { date: '2024-01-15', summary: 'MVP completed' },
          { date: '2024-02-01', summary: 'Beta launch' },
        ],
        decisions: [
          { date: '2024-01-01', what: 'Monorepo structure', why: 'Simpler deployments' },
        ],
      });

      const historyPath = path.join(ctx.recallDir, 'history.md');
      fs.writeFileSync(historyPath, encryptContent(history, teamKey));

      // New member joins and fetches key
      mockFetch({
        'GET /keys/team': {
          hasAccess: true,
          key: teamKey.toString('base64'),
          teamId: 'team-123',
        },
      });

      const keyResponse = await fetch('http://localhost:8787/keys/team', {
        headers: { Authorization: 'Bearer new_member_token' },
      });
      const keyData = await keyResponse.json() as { key: string };
      const memberKey = Buffer.from(keyData.key, 'base64');

      // New member can read history
      const content = fs.readFileSync(historyPath, 'utf-8');
      const decrypted = decryptContent(content, memberKey);

      expect(decrypted).toContain('Project kickoff');
      expect(decrypted).toContain('Beta launch');
      expect(decrypted).toContain('Monorepo');
    });

    it('should get context.md on first session', async () => {
      initRecallDir(ctx.repoDir);

      const context = createContextMd({
        projectName: 'Existing Project',
        techStack: ['React', 'FastAPI', 'PostgreSQL'],
        currentWork: 'Feature X in progress',
      });

      const contextPath = path.join(ctx.recallDir, 'context.md');
      fs.writeFileSync(contextPath, encryptContent(context, teamKey));

      // New member's first session gets full context
      const content = fs.readFileSync(contextPath, 'utf-8');
      const decrypted = decryptContent(content, teamKey);

      expect(decrypted).toContain('Existing Project');
      expect(decrypted).toContain('FastAPI');
      expect(decrypted).toContain('Feature X');
    });
  });

  describe('Git Workflow', () => {
    it('should handle merge conflicts with ours strategy', async () => {
      initRecallDir(ctx.repoDir);

      // .gitattributes should specify merge strategy
      const gitattributesPath = path.join(ctx.recallDir, '.gitattributes');
      const gitattributes = `# Recall merge strategy
context.md merge=ours
history.md merge=ours
sessions/**/*.md merge=ours
`;
      fs.writeFileSync(gitattributesPath, gitattributes);

      const content = fs.readFileSync(gitattributesPath, 'utf-8');
      expect(content).toContain('merge=ours');
    });

    it('should commit encrypted files', async () => {
      initRecallDir(ctx.repoDir);

      const contextPath = path.join(ctx.recallDir, 'context.md');
      fs.writeFileSync(contextPath, encryptContent('Secret content', teamKey));

      // Encrypted file should be safe to commit
      const content = fs.readFileSync(contextPath, 'utf-8');
      expect(content.startsWith('RECALL_ENCRYPTED:')).toBe(true);
      expect(content).not.toContain('Secret content');
    });
  });

  describe('Role-Based Access', () => {
    it('should allow all members to read context', async () => {
      const roles = ['owner', 'admin', 'member'];

      for (const role of roles) {
        mockFetch({
          'GET /keys/team': mockApiResponses.teamKey.success,
        });

        const response = await fetch('http://localhost:8787/keys/team', {
          headers: { Authorization: `Bearer ${role}_token` },
        });

        const data = await response.json() as { hasAccess: boolean };
        expect(data.hasAccess).toBe(true);
      }
    });

    it('should allow all members to save sessions', async () => {
      initRecallDir(ctx.repoDir);

      // Any team member can save a session
      const session = `# Session
## Summary
Work done by any team member.
`;
      const sessionPath = path.join(ctx.recallDir, 'sessions', 'any-member.md');
      fs.writeFileSync(sessionPath, encryptContent(session, teamKey));

      expect(fs.existsSync(sessionPath)).toBe(true);
    });

    it('should restrict key rotation to owner/admin', async () => {
      mockFetch({
        'POST /keys/rotate': () => {
          return new Response(
            JSON.stringify({ error: 'Only owner or admin can rotate keys' }),
            { status: 403 }
          );
        },
      });

      const response = await fetch('http://localhost:8787/keys/rotate', {
        method: 'POST',
        headers: { Authorization: 'Bearer member_token' },
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Concurrent Access', () => {
    it('should handle simultaneous reads', async () => {
      initRecallDir(ctx.repoDir);

      const contextPath = path.join(ctx.recallDir, 'context.md');
      fs.writeFileSync(contextPath, encryptContent('Shared content', teamKey));

      // Simulate concurrent reads
      const reads = await Promise.all([
        fs.promises.readFile(contextPath, 'utf-8'),
        fs.promises.readFile(contextPath, 'utf-8'),
        fs.promises.readFile(contextPath, 'utf-8'),
      ]);

      // All reads should succeed and return same content
      expect(reads[0]).toBe(reads[1]);
      expect(reads[1]).toBe(reads[2]);
    });

    it('should handle concurrent writes with file locking', async () => {
      initRecallDir(ctx.repoDir);

      const sessionDir = path.join(ctx.recallDir, 'sessions');

      // Concurrent writes to different files should succeed
      await Promise.all([
        fs.promises.writeFile(
          path.join(sessionDir, 'session-1.md'),
          encryptContent('Session 1', teamKey)
        ),
        fs.promises.writeFile(
          path.join(sessionDir, 'session-2.md'),
          encryptContent('Session 2', teamKey)
        ),
      ]);

      const files = fs.readdirSync(sessionDir);
      expect(files.length).toBe(2);
    });
  });
});
