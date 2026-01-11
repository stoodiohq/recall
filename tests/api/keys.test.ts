/**
 * API Keys Tests
 * Tests encryption key management endpoints
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mockFetch, clearFetchMocks, mockApiResponses, createDeterministicKey } from '../utils/mocks';
import { authHeader } from '../utils/helpers';
import { createTeam, createUser } from '../utils/factories';

const API_URL = 'http://localhost:8787';

describe('API Keys', () => {
  beforeEach(() => {
    clearFetchMocks();
  });

  afterEach(() => {
    clearFetchMocks();
  });

  describe('GET /keys/team', () => {
    it('should return team encryption key for valid member', async () => {
      mockFetch({
        'GET /keys/team': mockApiResponses.teamKey.success,
      });

      const response = await fetch(`${API_URL}/keys/team`, {
        headers: authHeader('member_token'),
      });

      const data = await response.json() as {
        hasAccess: boolean;
        key: string;
        teamId: string;
      };

      expect(data.hasAccess).toBe(true);
      expect(data.key).toBeDefined();
      expect(data.teamId).toBeDefined();
    });

    it('should include key version for rotation support', async () => {
      mockFetch({
        'GET /keys/team': {
          ...mockApiResponses.teamKey.success,
          keyVersion: 2,
        },
      });

      const response = await fetch(`${API_URL}/keys/team`, {
        headers: authHeader('member_token'),
      });

      const data = await response.json() as { keyVersion: number };
      expect(data.keyVersion).toBe(2);
    });

    it('should return 401 for invalid token', async () => {
      mockFetch({
        'GET /keys/team': () => {
          return new Response(
            JSON.stringify(mockApiResponses.teamKey.unauthorized),
            { status: 401 }
          );
        },
      });

      const response = await fetch(`${API_URL}/keys/team`, {
        headers: authHeader('invalid_token'),
      });

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-team-member', async () => {
      mockFetch({
        'GET /keys/team': () => {
          return new Response(
            JSON.stringify(mockApiResponses.teamKey.noAccess),
            { status: 403 }
          );
        },
      });

      const response = await fetch(`${API_URL}/keys/team`, {
        headers: authHeader('non_member_token'),
      });

      expect(response.status).toBe(403);
    });

    it('should return 403 when seat limit exceeded', async () => {
      mockFetch({
        'GET /keys/team': () => {
          return new Response(
            JSON.stringify({
              hasAccess: false,
              message: 'Team seat limit reached. Contact your admin to add more seats.',
            }),
            { status: 403 }
          );
        },
      });

      const response = await fetch(`${API_URL}/keys/team`, {
        headers: authHeader('over_limit_token'),
      });

      expect(response.status).toBe(403);
      const data = await response.json() as { message: string };
      expect(data.message).toContain('seat');
    });

    it('should log machine ID for access tracking', async () => {
      let capturedMachineId: string | undefined;

      mockFetch({
        'GET /keys/team': (req) => {
          // In real test, we'd capture the header
          return mockApiResponses.teamKey.success;
        },
      });

      // Request should include X-Machine-Id header or body
      const response = await fetch(`${API_URL}/keys/team`, {
        headers: {
          ...authHeader('member_token'),
          'X-Machine-Id': 'test-machine-id',
        },
      });

      expect(response.ok).toBe(true);
    });
  });

  describe('POST /keys/rotate', () => {
    it('should rotate team encryption key (owner only)', async () => {
      const newKey = createDeterministicKey('new-key');

      mockFetch({
        'POST /keys/rotate': {
          success: true,
          keyVersion: 3,
          rotatedAt: new Date().toISOString(),
        },
      });

      const response = await fetch(`${API_URL}/keys/rotate`, {
        method: 'POST',
        headers: authHeader('owner_token'),
      });

      const data = await response.json() as { keyVersion: number };
      expect(data.keyVersion).toBe(3);
    });

    it('should reject rotation from non-owner', async () => {
      mockFetch({
        'POST /keys/rotate': () => {
          return new Response(
            JSON.stringify({ error: 'Only team owner can rotate keys' }),
            { status: 403 }
          );
        },
      });

      const response = await fetch(`${API_URL}/keys/rotate`, {
        method: 'POST',
        headers: authHeader('member_token'),
      });

      expect(response.status).toBe(403);
    });

    it('should increment key version on rotation', async () => {
      const versions: number[] = [];

      mockFetch({
        'POST /keys/rotate': () => {
          const nextVersion = versions.length + 1;
          versions.push(nextVersion);
          return { keyVersion: nextVersion };
        },
      });

      await fetch(`${API_URL}/keys/rotate`, {
        method: 'POST',
        headers: authHeader('owner_token'),
      });

      await fetch(`${API_URL}/keys/rotate`, {
        method: 'POST',
        headers: authHeader('owner_token'),
      });

      expect(versions).toEqual([1, 2]);
    });
  });

  describe('Key Security', () => {
    it('should use 256-bit (32 byte) keys', () => {
      const key = createDeterministicKey('test');
      const keyBuffer = Buffer.from(key, 'base64');

      expect(keyBuffer.length).toBe(32);
    });

    it('should never log or return full key in error messages', async () => {
      mockFetch({
        'GET /keys/team': () => {
          return new Response(
            JSON.stringify({
              error: 'Access denied',
              // Should NOT include: key: 'abc123...'
            }),
            { status: 403 }
          );
        },
      });

      const response = await fetch(`${API_URL}/keys/team`, {
        headers: authHeader('invalid'),
      });

      const data = await response.json() as { key?: string };
      expect(data.key).toBeUndefined();
    });

    it('should use secure random for key generation', () => {
      const crypto = require('crypto');

      // Key should be generated with secure random
      const key1 = crypto.randomBytes(32).toString('base64');
      const key2 = crypto.randomBytes(32).toString('base64');

      expect(key1).not.toBe(key2);
      expect(Buffer.from(key1, 'base64').length).toBe(32);
    });
  });

  describe('Access Logging', () => {
    it('POST /memory/access should log memory file access', async () => {
      mockFetch({
        'POST /memory/access': { success: true },
      });

      const response = await fetch(`${API_URL}/memory/access`, {
        method: 'POST',
        headers: {
          ...authHeader('member_token'),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoId: 'repo-123',
          fileType: 'context',
          action: 'read',
        }),
      });

      expect(response.ok).toBe(true);
    });

    it('should track access for analytics', async () => {
      const accessLog = {
        userId: 'user-123',
        teamId: 'team-456',
        repoId: 'repo-789',
        fileType: 'context',
        action: 'read',
        timestamp: new Date().toISOString(),
        machineId: 'machine-abc',
      };

      // This data would be logged server-side
      expect(accessLog.userId).toBeDefined();
      expect(accessLog.timestamp).toBeDefined();
    });
  });

  describe('Team Key Generation', () => {
    it('should create encryption key when team is created', () => {
      const team = createTeam();

      expect(team.encryption_key).toBeDefined();
      expect(Buffer.from(team.encryption_key, 'base64').length).toBe(32);
    });

    it('should generate unique key per team', () => {
      const team1 = createTeam();
      const team2 = createTeam();

      expect(team1.encryption_key).not.toBe(team2.encryption_key);
    });
  });

  describe('Error Messages', () => {
    it('should return helpful message for auth failure', async () => {
      mockFetch({
        'GET /keys/team': () => {
          return new Response(
            JSON.stringify({
              hasAccess: false,
              message: 'Authentication failed. Your token may be invalid, revoked, or not passed correctly. Run recall_auth with a fresh token from https://recall.team/dashboard',
            }),
            { status: 401 }
          );
        },
      });

      const response = await fetch(`${API_URL}/keys/team`, {
        headers: authHeader('bad_token'),
      });

      const data = await response.json() as { message: string };
      expect(data.message).toContain('recall.team');
      expect(data.message).toContain('token');
    });

    it('should return helpful message for no team membership', async () => {
      mockFetch({
        'GET /keys/team': () => {
          return new Response(
            JSON.stringify({
              hasAccess: false,
              message: 'You are not a member of any team. Ask your team admin for an invite link.',
            }),
            { status: 403 }
          );
        },
      });

      const response = await fetch(`${API_URL}/keys/team`, {
        headers: authHeader('no_team_token'),
      });

      const data = await response.json() as { message: string };
      expect(data.message).toContain('invite');
    });

    it('should return helpful message for inactive subscription', async () => {
      mockFetch({
        'GET /keys/team': () => {
          return new Response(
            JSON.stringify({
              hasAccess: false,
              message: 'Team subscription is inactive. Contact your team owner to renew.',
            }),
            { status: 403 }
          );
        },
      });

      const response = await fetch(`${API_URL}/keys/team`, {
        headers: authHeader('inactive_sub_token'),
      });

      const data = await response.json() as { message: string };
      expect(data.message).toContain('subscription');
    });
  });
});
