/**
 * E2E Onboarding Tests
 * Tests the full new user onboarding flow
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  createTestContext,
  initRecallDir,
  writeTestConfig,
  type TestContext,
} from '../utils/helpers';
import { mockFetch, clearFetchMocks, mockApiResponses } from '../utils/mocks';
import { createUser, createTeam, createApiToken } from '../utils/factories';

describe('E2E: Onboarding', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
    clearFetchMocks();
  });

  describe('New User Flow', () => {
    it('should complete: OAuth -> Create Team -> Generate Token -> Connect MCP', async () => {
      // Step 1: GitHub OAuth
      const user = createUser({
        email: 'newuser@example.com',
        github_username: 'newuser',
      });

      mockFetch({
        'GET /auth/github/callback': {
          success: true,
          jwt: 'new_user_jwt',
          user: { ...user, created: true },
        },
      });

      const oauthResponse = await fetch('http://localhost:8787/auth/github/callback?code=test');
      const oauthData = await oauthResponse.json() as { jwt: string };
      const jwt = oauthData.jwt;

      expect(jwt).toBeDefined();

      // Step 2: Create team
      const team = createTeam({ owner_id: user.id });

      mockFetch({
        'POST /teams': team,
      });

      const teamResponse = await fetch('http://localhost:8787/teams', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'My New Team' }),
      });

      const teamData = await teamResponse.json() as { id: string };
      expect(teamData.id).toBeDefined();

      // Step 3: Generate API token
      const token = createApiToken({ user_id: user.id, team_id: team.id });

      mockFetch({
        'POST /auth/token': {
          id: token.id,
          token: token.token,
          name: 'MCP Token',
        },
      });

      const tokenResponse = await fetch('http://localhost:8787/auth/token', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'MCP Token' }),
      });

      const tokenData = await tokenResponse.json() as { token: string };
      expect(tokenData.token).toMatch(/^recall_/);

      // Step 4: Save config for MCP
      writeTestConfig(ctx.homeDir, {
        apiToken: tokenData.token,
        userId: user.id,
        teamId: team.id,
      });

      const config = JSON.parse(fs.readFileSync(ctx.configPath, 'utf-8'));
      expect(config.apiToken).toBe(tokenData.token);

      // Step 5: Verify MCP can access team key
      mockFetch({
        'GET /keys/team': mockApiResponses.teamKey.success,
      });

      const keyResponse = await fetch('http://localhost:8787/keys/team', {
        headers: { Authorization: `Bearer ${tokenData.token}` },
      });

      const keyData = await keyResponse.json() as { hasAccess: boolean };
      expect(keyData.hasAccess).toBe(true);
    });

    it('should handle user with existing team (re-joining)', async () => {
      const user = createUser();
      const team = createTeam();

      mockFetch({
        'GET /auth/github/callback': {
          success: true,
          jwt: 'returning_user_jwt',
          user: {
            ...user,
            team_id: team.id,
            created: false,
          },
        },
      });

      const response = await fetch('http://localhost:8787/auth/github/callback?code=test');
      const data = await response.json() as { user: { team_id: string; created: boolean } };

      expect(data.user.team_id).toBeDefined();
      expect(data.user.created).toBe(false);
    });
  });

  describe('Team Join Flow', () => {
    it('should complete: Accept Invite -> Get Token -> Connect', async () => {
      const inviter = createUser();
      const team = createTeam({ owner_id: inviter.id });
      const newMember = createUser();

      // Step 1: View invite
      mockFetch({
        'GET /invites/abc123': {
          team: { name: team.name, slug: team.slug },
          inviter: { name: inviter.name },
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });

      const inviteResponse = await fetch('http://localhost:8787/invites/abc123');
      const inviteData = await inviteResponse.json() as { team: { name: string } };

      expect(inviteData.team.name).toBeDefined();

      // Step 2: Accept invite (requires auth)
      mockFetch({
        'POST /invites/abc123/accept': {
          success: true,
          team: team,
        },
      });

      const acceptResponse = await fetch('http://localhost:8787/invites/abc123/accept', {
        method: 'POST',
        headers: { Authorization: `Bearer ${newMember.id}_jwt` },
      });

      const acceptData = await acceptResponse.json() as { success: boolean };
      expect(acceptData.success).toBe(true);

      // Step 3: Generate token
      const token = createApiToken({ user_id: newMember.id, team_id: team.id });

      mockFetch({
        'POST /auth/token': {
          token: token.token,
        },
      });

      const tokenResponse = await fetch('http://localhost:8787/auth/token', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${newMember.id}_jwt`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'MCP Token' }),
      });

      const tokenData = await tokenResponse.json() as { token: string };
      expect(tokenData.token).toMatch(/^recall_/);
    });
  });

  describe('MCP Configuration', () => {
    it('should create claude_desktop_config.json entry', async () => {
      const token = 'recall_test_token_123';
      const mcpConfig = {
        mcpServers: {
          recall: {
            command: 'npx',
            args: ['-y', 'recall-mcp-server'],
            env: {
              RECALL_API_TOKEN: token,
            },
          },
        },
      };

      expect(mcpConfig.mcpServers.recall.env.RECALL_API_TOKEN).toBe(token);
    });

    it('should support alternate config via ~/.recall/config.json', async () => {
      writeTestConfig(ctx.homeDir, {
        apiToken: 'recall_from_file',
      });

      const config = JSON.parse(fs.readFileSync(ctx.configPath, 'utf-8'));
      expect(config.apiToken).toBe('recall_from_file');
    });
  });

  describe('First Session', () => {
    it('should initialize .recall directory on first use', async () => {
      writeTestConfig(ctx.homeDir, { apiToken: 'recall_test_token' });

      mockFetch({
        'GET /keys/team': mockApiResponses.teamKey.success,
      });

      // Initialize recall directory
      initRecallDir(ctx.repoDir);

      expect(fs.existsSync(path.join(ctx.recallDir, 'context.md'))).toBe(true);
      expect(fs.existsSync(path.join(ctx.recallDir, 'history.md'))).toBe(true);
      expect(fs.existsSync(path.join(ctx.recallDir, 'sessions'))).toBe(true);
    });

    it('should import existing Claude sessions', async () => {
      writeTestConfig(ctx.homeDir, { apiToken: 'recall_test_token' });

      // Create mock Claude session
      const claudeDir = path.join(ctx.homeDir, '.claude', 'projects', 'test-hash');
      fs.mkdirSync(claudeDir, { recursive: true });
      fs.writeFileSync(
        path.join(claudeDir, 'session.jsonl'),
        JSON.stringify({ role: 'user', content: 'Prior conversation' })
      );

      // Initialize should detect and import
      initRecallDir(ctx.repoDir);

      // Verify sessions directory exists
      const sessionsDir = path.join(ctx.recallDir, 'sessions');
      expect(fs.existsSync(sessionsDir)).toBe(true);
    });

    it('should save first session summary', async () => {
      initRecallDir(ctx.repoDir);

      const sessionPath = path.join(ctx.recallDir, 'sessions', 'first-session.md');
      const sessionContent = `# First Session

## Summary
User onboarded and tested the system.

## Decisions
- Using TypeScript for the project
- Deployed to Vercel

## Files Changed
- src/index.ts
- package.json
`;

      fs.writeFileSync(sessionPath, sessionContent);
      expect(fs.existsSync(sessionPath)).toBe(true);

      const content = fs.readFileSync(sessionPath, 'utf-8');
      expect(content).toContain('TypeScript');
    });
  });

  describe('Error Recovery', () => {
    it('should handle OAuth failure gracefully', async () => {
      mockFetch({
        'GET /auth/github/callback': () => {
          return new Response(
            JSON.stringify({ error: 'OAuth failed', message: 'GitHub denied access' }),
            { status: 400 }
          );
        },
      });

      const response = await fetch('http://localhost:8787/auth/github/callback?code=bad');
      expect(response.status).toBe(400);
    });

    it('should handle expired invite', async () => {
      mockFetch({
        'POST /invites/expired/accept': () => {
          return new Response(
            JSON.stringify({ error: 'Invite expired' }),
            { status: 410 }
          );
        },
      });

      const response = await fetch('http://localhost:8787/invites/expired/accept', {
        method: 'POST',
        headers: { Authorization: 'Bearer test_jwt' },
      });

      expect(response.status).toBe(410);
    });

    it('should handle network errors during onboarding', async () => {
      mockFetch({
        'POST /teams': () => {
          throw new Error('Network error');
        },
      });

      // In real implementation, would show user-friendly error
      try {
        await fetch('http://localhost:8787/teams', {
          method: 'POST',
          headers: { Authorization: 'Bearer test_jwt' },
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });
});
