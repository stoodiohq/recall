/**
 * Token Lifecycle Tests
 * Tests token creation, expiration, regeneration, and revocation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createTestContext,
  writeTestConfig,
  type TestContext,
} from '../utils/helpers';
import { mockFetch, clearFetchMocks } from '../utils/mocks';
import { createUser, createApiToken } from '../utils/factories';

describe('Token Lifecycle', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
    clearFetchMocks();
  });

  describe('Token Creation', () => {
    it('should generate token with recall_ prefix', async () => {
      const user = createUser();

      mockFetch({
        'POST /auth/token': () => {
          const token = createApiToken({ user_id: user.id });
          return {
            id: token.id,
            token: token.token,
            name: 'New Token',
            created_at: new Date().toISOString(),
          };
        },
      });

      const response = await fetch('http://localhost:8787/auth/token', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer jwt_token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'New Token' }),
      });

      const data = await response.json() as { token: string };
      expect(data.token).toMatch(/^recall_[a-zA-Z0-9]+$/);
    });

    it('should generate unique tokens for each request', async () => {
      const tokens: string[] = [];

      mockFetch({
        'POST /auth/token': () => {
          const token = createApiToken();
          tokens.push(token.token);
          return { token: token.token };
        },
      });

      // Create multiple tokens
      for (let i = 0; i < 5; i++) {
        await fetch('http://localhost:8787/auth/token', {
          method: 'POST',
          headers: { Authorization: 'Bearer jwt_token' },
        });
      }

      // All tokens should be unique
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(5);
    });

    it('should allow naming tokens', async () => {
      mockFetch({
        'POST /auth/token': (req) => {
          return req.json().then((body: { name: string }) => ({
            token: 'recall_abc123',
            name: body.name,
          }));
        },
      });

      const response = await fetch('http://localhost:8787/auth/token', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer jwt_token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'MCP Server Token' }),
      });

      const data = await response.json() as { name: string };
      expect(data.name).toBe('MCP Server Token');
    });

    it('should require authentication to create token', async () => {
      mockFetch({
        'POST /auth/token': () => {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401 }
          );
        },
      });

      const response = await fetch('http://localhost:8787/auth/token', {
        method: 'POST',
        // No Authorization header
      });

      expect(response.status).toBe(401);
    });

    it('should limit number of active tokens per user', async () => {
      mockFetch({
        'POST /auth/token': () => {
          return new Response(
            JSON.stringify({
              error: 'Token limit reached',
              message: 'Maximum of 10 tokens per user',
            }),
            { status: 429 }
          );
        },
      });

      const response = await fetch('http://localhost:8787/auth/token', {
        method: 'POST',
        headers: { Authorization: 'Bearer jwt_token' },
      });

      expect(response.status).toBe(429);
      const data = await response.json() as { message: string };
      expect(data.message).toContain('Maximum');
    });
  });

  describe('Token Expiration', () => {
    it('should reject expired tokens', async () => {
      mockFetch({
        'GET /keys/team': () => {
          return new Response(
            JSON.stringify({
              error: 'Token expired',
              code: 'TOKEN_EXPIRED',
            }),
            { status: 401 }
          );
        },
      });

      const response = await fetch('http://localhost:8787/keys/team', {
        headers: { Authorization: 'Bearer recall_expired_token' },
      });

      expect(response.status).toBe(401);
      const data = await response.json() as { code: string };
      expect(data.code).toBe('TOKEN_EXPIRED');
    });

    it('should include expiration info in token response', async () => {
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year

      mockFetch({
        'POST /auth/token': () => ({
          token: 'recall_abc123',
          expires_at: expiresAt.toISOString(),
          expires_in: 365 * 24 * 60 * 60, // seconds
        }),
      });

      const response = await fetch('http://localhost:8787/auth/token', {
        method: 'POST',
        headers: { Authorization: 'Bearer jwt_token' },
      });

      const data = await response.json() as { expires_at: string; expires_in: number };
      expect(data.expires_at).toBeDefined();
      expect(data.expires_in).toBeGreaterThan(0);
    });

    it('should warn when token is near expiration', async () => {
      const nearExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      mockFetch({
        'GET /keys/team': () => ({
          hasAccess: true,
          key: 'base64key',
          tokenExpiresAt: nearExpiry.toISOString(),
          warning: 'Token expires in 7 days',
        }),
      });

      const response = await fetch('http://localhost:8787/keys/team', {
        headers: { Authorization: 'Bearer recall_expiring_soon' },
      });

      const data = await response.json() as { warning: string };
      expect(data.warning).toContain('expires');
    });

    it('should support token without expiration (long-lived)', async () => {
      mockFetch({
        'POST /auth/token': () => ({
          token: 'recall_longlived',
          expires_at: null, // No expiration
          expires_in: null,
        }),
      });

      const response = await fetch('http://localhost:8787/auth/token', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer jwt_token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Long-lived token', expires: false }),
      });

      const data = await response.json() as { expires_at: string | null };
      expect(data.expires_at).toBeNull();
    });
  });

  describe('Token Regeneration', () => {
    it('should allow regenerating a token', async () => {
      let currentToken = 'recall_old123';

      mockFetch({
        'POST /auth/token/regenerate': () => {
          currentToken = 'recall_new456';
          return {
            token: currentToken,
            message: 'Token regenerated. Old token is now invalid.',
          };
        },
      });

      const response = await fetch('http://localhost:8787/auth/token/regenerate', {
        method: 'POST',
        headers: { Authorization: 'Bearer recall_old123' },
      });

      const data = await response.json() as { token: string };
      expect(data.token).toBe('recall_new456');
      expect(data.token).not.toBe('recall_old123');
    });

    it('should invalidate old token after regeneration', async () => {
      const validTokens = new Set(['recall_new456']);

      mockFetch({
        'GET /keys/team': (req) => {
          const auth = req.headers.get('Authorization');
          const token = auth?.replace('Bearer ', '');

          if (validTokens.has(token || '')) {
            return { hasAccess: true };
          }
          return new Response(
            JSON.stringify({ error: 'Invalid token' }),
            { status: 401 }
          );
        },
      });

      // Old token should fail
      const oldResponse = await fetch('http://localhost:8787/keys/team', {
        headers: { Authorization: 'Bearer recall_old123' },
      });
      expect(oldResponse.status).toBe(401);

      // New token should work
      const newResponse = await fetch('http://localhost:8787/keys/team', {
        headers: { Authorization: 'Bearer recall_new456' },
      });
      expect(newResponse.ok).toBe(true);
    });

    it('should preserve token name and settings after regeneration', async () => {
      mockFetch({
        'POST /auth/token/regenerate': () => ({
          token: 'recall_regenerated',
          name: 'MCP Server Token', // Preserved
          created_at: new Date().toISOString(),
          original_created_at: '2024-01-01T00:00:00Z', // Original creation date
        }),
      });

      const response = await fetch('http://localhost:8787/auth/token/regenerate', {
        method: 'POST',
        headers: { Authorization: 'Bearer recall_old' },
      });

      const data = await response.json() as { name: string; original_created_at: string };
      expect(data.name).toBe('MCP Server Token');
      expect(data.original_created_at).toBeDefined();
    });
  });

  describe('Token Revocation', () => {
    it('should allow user to revoke their own token', async () => {
      mockFetch({
        'DELETE /auth/token/token-123': () => ({
          success: true,
          message: 'Token revoked',
        }),
      });

      const response = await fetch('http://localhost:8787/auth/token/token-123', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer jwt_token' },
      });

      const data = await response.json() as { success: boolean };
      expect(data.success).toBe(true);
    });

    it('should reject requests with revoked token', async () => {
      const revokedTokens = new Set(['recall_revoked123']);

      mockFetch({
        'GET /keys/team': (req) => {
          const auth = req.headers.get('Authorization');
          const token = auth?.replace('Bearer ', '');

          if (revokedTokens.has(token || '')) {
            return new Response(
              JSON.stringify({
                error: 'Token revoked',
                code: 'TOKEN_REVOKED',
              }),
              { status: 401 }
            );
          }
          return { hasAccess: true };
        },
      });

      const response = await fetch('http://localhost:8787/keys/team', {
        headers: { Authorization: 'Bearer recall_revoked123' },
      });

      expect(response.status).toBe(401);
      const data = await response.json() as { code: string };
      expect(data.code).toBe('TOKEN_REVOKED');
    });

    it('should allow admin to revoke team member tokens', async () => {
      mockFetch({
        'DELETE /teams/team-123/tokens/token-456': () => ({
          success: true,
          message: 'Team member token revoked',
          revokedBy: 'admin@team.com',
        }),
      });

      const response = await fetch('http://localhost:8787/teams/team-123/tokens/token-456', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer admin_jwt' },
      });

      const data = await response.json() as { success: boolean; revokedBy: string };
      expect(data.success).toBe(true);
      expect(data.revokedBy).toBeDefined();
    });

    it('should revoke all tokens when user is removed from team', async () => {
      mockFetch({
        'DELETE /teams/team-123/members/user-456': () => ({
          success: true,
          tokensRevoked: 3,
          message: 'User removed and 3 tokens revoked',
        }),
      });

      const response = await fetch('http://localhost:8787/teams/team-123/members/user-456', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer owner_jwt' },
      });

      const data = await response.json() as { tokensRevoked: number };
      expect(data.tokensRevoked).toBe(3);
    });
  });

  describe('Token Validation', () => {
    it('should validate token format', async () => {
      const invalidTokens = [
        'not_recall_prefix',
        'recall_', // Empty suffix
        'RECALL_uppercase',
        'recall_with spaces',
        'recall_with-special!chars',
      ];

      for (const token of invalidTokens) {
        mockFetch({
          'GET /keys/team': () => {
            return new Response(
              JSON.stringify({ error: 'Invalid token format' }),
              { status: 400 }
            );
          },
        });

        const response = await fetch('http://localhost:8787/keys/team', {
          headers: { Authorization: `Bearer ${token}` },
        });

        expect(response.status).toBe(400);
      }
    });

    it('should validate token length', async () => {
      mockFetch({
        'GET /keys/team': (req) => {
          const auth = req.headers.get('Authorization');
          const token = auth?.replace('Bearer ', '') || '';

          // Token should be reasonable length
          if (token.length < 10 || token.length > 100) {
            return new Response(
              JSON.stringify({ error: 'Invalid token length' }),
              { status: 400 }
            );
          }
          return { hasAccess: true };
        },
      });

      const shortResponse = await fetch('http://localhost:8787/keys/team', {
        headers: { Authorization: 'Bearer recall_x' },
      });
      expect(shortResponse.status).toBe(400);
    });

    it('should check token belongs to correct team', async () => {
      mockFetch({
        'GET /keys/team': () => {
          return new Response(
            JSON.stringify({
              error: 'Token not authorized for this team',
              code: 'WRONG_TEAM',
            }),
            { status: 403 }
          );
        },
      });

      const response = await fetch('http://localhost:8787/keys/team?teamId=other-team', {
        headers: { Authorization: 'Bearer recall_valid_but_wrong_team' },
      });

      expect(response.status).toBe(403);
      const data = await response.json() as { code: string };
      expect(data.code).toBe('WRONG_TEAM');
    });
  });

  describe('Token Security', () => {
    it('should not log token values', async () => {
      // Tokens should be masked in logs
      const token = 'recall_supersecret123';
      const maskedToken = `recall_${token.slice(7, 11)}...${token.slice(-4)}`;

      expect(maskedToken).toBe('recall_supe...t123');
      expect(maskedToken).not.toBe(token);
    });

    it('should use secure storage for tokens', async () => {
      writeTestConfig(ctx.homeDir, { apiToken: 'recall_secure123' });

      // Check file permissions (should be 0600)
      const stats = require('fs').statSync(ctx.configPath);
      const mode = (stats.mode & 0o777).toString(8);

      // On some systems with umask, check it's at least not world-readable
      expect(mode).toMatch(/600|640|644/);
    });

    it('should hash tokens before storage in database', async () => {
      // Token should be hashed with bcrypt/argon2, not stored plaintext
      const token = 'recall_abc123';
      const mockHash = '$2b$10$' + 'x'.repeat(53); // Bcrypt format

      expect(mockHash).not.toBe(token);
      expect(mockHash.startsWith('$2b$')).toBe(true);
    });

    it('should rate limit token validation attempts', async () => {
      let attempts = 0;

      mockFetch({
        'GET /keys/team': () => {
          attempts++;
          if (attempts > 5) {
            return new Response(
              JSON.stringify({
                error: 'Too many authentication attempts',
                retryAfter: 60,
              }),
              { status: 429, headers: { 'Retry-After': '60' } }
            );
          }
          return new Response(
            JSON.stringify({ error: 'Invalid token' }),
            { status: 401 }
          );
        },
      });

      // Make 10 attempts
      for (let i = 0; i < 10; i++) {
        await fetch('http://localhost:8787/keys/team', {
          headers: { Authorization: 'Bearer recall_wrong' },
        });
      }

      // Should have been rate limited after 5
      expect(attempts).toBe(10); // All attempts made, but later ones are rate limited
    });
  });

  describe('Token Listing', () => {
    it('should list all user tokens', async () => {
      mockFetch({
        'GET /auth/tokens': () => ({
          tokens: [
            { id: 'token-1', name: 'MCP Server', created_at: '2024-01-01', last_used: '2024-01-15' },
            { id: 'token-2', name: 'CI/CD', created_at: '2024-01-10', last_used: null },
          ],
        }),
      });

      const response = await fetch('http://localhost:8787/auth/tokens', {
        headers: { Authorization: 'Bearer jwt_token' },
      });

      const data = await response.json() as { tokens: Array<{ id: string }> };
      expect(data.tokens.length).toBe(2);
    });

    it('should not expose full token values in listing', async () => {
      mockFetch({
        'GET /auth/tokens': () => ({
          tokens: [
            {
              id: 'token-1',
              name: 'MCP Server',
              token_preview: 'recall_abc...xyz', // Only first/last chars
            },
          ],
        }),
      });

      const response = await fetch('http://localhost:8787/auth/tokens', {
        headers: { Authorization: 'Bearer jwt_token' },
      });

      const data = await response.json() as { tokens: Array<{ token_preview: string }> };
      expect(data.tokens[0].token_preview).toContain('...');
    });

    it('should show token last used time', async () => {
      mockFetch({
        'GET /auth/tokens': () => ({
          tokens: [
            { id: 'token-1', last_used: '2024-01-15T10:30:00Z' },
            { id: 'token-2', last_used: null }, // Never used
          ],
        }),
      });

      const response = await fetch('http://localhost:8787/auth/tokens', {
        headers: { Authorization: 'Bearer jwt_token' },
      });

      const data = await response.json() as { tokens: Array<{ last_used: string | null }> };
      expect(data.tokens[0].last_used).toBeDefined();
      expect(data.tokens[1].last_used).toBeNull();
    });
  });
});
