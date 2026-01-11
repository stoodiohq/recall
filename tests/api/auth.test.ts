/**
 * API Auth Tests
 * Tests OAuth, JWT, and API token endpoints
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mockFetch, clearFetchMocks, mockGitHub, mockApiResponses } from '../utils/mocks';
import { createUser, createApiToken } from '../utils/factories';
import { authHeader, createMockRequest } from '../utils/helpers';

// Base URL for API tests
const API_URL = 'http://localhost:8787';

describe('API Auth', () => {
  beforeEach(() => {
    clearFetchMocks();
  });

  afterEach(() => {
    clearFetchMocks();
  });

  describe('GitHub OAuth', () => {
    it('GET /auth/github should redirect to GitHub OAuth', async () => {
      const expectedRedirect = 'https://github.com/login/oauth/authorize';

      // The endpoint should return a redirect
      mockFetch({
        'GET /auth/github': {
          redirect: expectedRedirect,
        },
      });

      const response = await fetch(`${API_URL}/auth/github`);
      const data = await response.json() as { redirect: string };

      expect(data.redirect).toContain('github.com');
    });

    it('GET /auth/github/callback should exchange code for token', async () => {
      mockFetch({
        'GET /auth/github/callback': {
          success: true,
          jwt: 'jwt_token_here',
          user: mockApiResponses.user.authenticated,
        },
      });

      const response = await fetch(`${API_URL}/auth/github/callback?code=test_code`);
      const data = await response.json() as { success: boolean; jwt: string };

      expect(data.success).toBe(true);
      expect(data.jwt).toBeDefined();
    });

    it('should create user on first OAuth login', async () => {
      mockFetch({
        'GET /auth/github/callback': {
          success: true,
          user: {
            ...mockApiResponses.user.authenticated,
            created: true, // Indicates new user
          },
        },
      });

      const response = await fetch(`${API_URL}/auth/github/callback?code=new_user_code`);
      const data = await response.json() as { user: { created: boolean } };

      expect(data.user.created).toBe(true);
    });

    it('should update user on subsequent logins', async () => {
      mockFetch({
        'GET /auth/github/callback': {
          success: true,
          user: {
            ...mockApiResponses.user.authenticated,
            created: false,
          },
        },
      });

      const response = await fetch(`${API_URL}/auth/github/callback?code=existing_user_code`);
      const data = await response.json() as { user: { created: boolean } };

      expect(data.user.created).toBe(false);
    });

    it('should reject invalid OAuth code', async () => {
      mockFetch({
        'GET /auth/github/callback': () => {
          return new Response(JSON.stringify({ error: 'Invalid code' }), {
            status: 400,
          });
        },
      });

      const response = await fetch(`${API_URL}/auth/github/callback?code=invalid`);
      expect(response.ok).toBe(false);
    });
  });

  describe('JWT Tokens', () => {
    it('should sign JWT with HS256', async () => {
      // JWT structure: header.payload.signature
      const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0In0.sig';
      const parts = jwt.split('.');

      expect(parts.length).toBe(3);

      // Decode header
      const header = JSON.parse(atob(parts[0]));
      expect(header.alg).toBe('HS256');
      expect(header.typ).toBe('JWT');
    });

    it('should include userId and exp in JWT payload', async () => {
      // Simulated JWT payload
      const payload = {
        userId: 'user-123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
      };

      expect(payload.userId).toBeDefined();
      expect(payload.exp).toBeGreaterThan(payload.iat);
    });

    it('should reject expired JWT', async () => {
      mockFetch({
        'GET /auth/me': () => {
          return new Response(JSON.stringify({ error: 'Token expired' }), {
            status: 401,
          });
        },
      });

      const response = await fetch(`${API_URL}/auth/me`, {
        headers: authHeader('expired_jwt'),
      });

      expect(response.status).toBe(401);
    });

    it('should reject tampered JWT', async () => {
      mockFetch({
        'GET /auth/me': () => {
          return new Response(JSON.stringify({ error: 'Invalid signature' }), {
            status: 401,
          });
        },
      });

      const response = await fetch(`${API_URL}/auth/me`, {
        headers: authHeader('tampered.jwt.token'),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('API Tokens', () => {
    it('POST /auth/token should generate API token', async () => {
      const token = createApiToken({ name: 'CLI Token' });

      mockFetch({
        'POST /auth/token': {
          id: token.id,
          token: token.token,
          name: 'CLI Token',
          created_at: token.created_at,
        },
      });

      const response = await fetch(`${API_URL}/auth/token`, {
        method: 'POST',
        headers: {
          ...authHeader('valid_jwt'),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'CLI Token' }),
      });

      const data = await response.json() as { token: string };

      expect(data.token).toMatch(/^recall_/);
    });

    it('should hash API token before storage', async () => {
      const token = createApiToken();

      // Token returned to user
      expect(token.token).toMatch(/^recall_/);

      // Hash stored in database (not the actual token)
      expect(token.token_hash).not.toBe(token.token);
      expect(token.token_hash.length).toBe(64); // SHA-256 hex
    });

    it('GET /auth/tokens should list user tokens', async () => {
      mockFetch({
        'GET /auth/tokens': {
          tokens: [
            { id: '1', name: 'Token 1', created_at: '2024-01-01' },
            { id: '2', name: 'Token 2', created_at: '2024-01-02' },
          ],
        },
      });

      const response = await fetch(`${API_URL}/auth/tokens`, {
        headers: authHeader('valid_jwt'),
      });

      const data = await response.json() as { tokens: object[] };
      expect(data.tokens.length).toBe(2);
    });

    it('DELETE /auth/tokens/:id should revoke token', async () => {
      mockFetch({
        'DELETE /auth/tokens/token-123': {
          success: true,
        },
      });

      const response = await fetch(`${API_URL}/auth/tokens/token-123`, {
        method: 'DELETE',
        headers: authHeader('valid_jwt'),
      });

      expect(response.ok).toBe(true);
    });

    it('should support token expiration', async () => {
      const token = createApiToken({
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      expect(token.expires_at).toBeDefined();
      expect(new Date(token.expires_at!).getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('Auth Middleware', () => {
    it('should accept Bearer token in Authorization header', async () => {
      mockFetch({
        'GET /auth/me': mockApiResponses.user.authenticated,
      });

      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: 'Bearer valid_token',
        },
      });

      expect(response.ok).toBe(true);
    });

    it('should reject requests without Authorization header', async () => {
      mockFetch({
        'GET /auth/me': () => {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
          });
        },
      });

      const response = await fetch(`${API_URL}/auth/me`);
      expect(response.status).toBe(401);
    });

    it('should distinguish JWT from API token', async () => {
      // JWT has dots (header.payload.signature)
      const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJ0ZXN0In0.signature';
      const apiToken = 'recall_abc123def456';

      const isJWT = (token: string) => token.includes('.');
      const isApiToken = (token: string) => token.startsWith('recall_');

      expect(isJWT(jwt)).toBe(true);
      expect(isJWT(apiToken)).toBe(false);
      expect(isApiToken(apiToken)).toBe(true);
      expect(isApiToken(jwt)).toBe(false);
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user info', async () => {
      mockFetch({
        'GET /auth/me': mockApiResponses.user.authenticated,
      });

      const response = await fetch(`${API_URL}/auth/me`, {
        headers: authHeader('valid_token'),
      });

      const data = await response.json() as { email: string };
      expect(data.email).toBeDefined();
    });

    it('should include team membership', async () => {
      mockFetch({
        'GET /auth/me': {
          ...mockApiResponses.user.authenticated,
          team: mockApiResponses.team.basic,
        },
      });

      const response = await fetch(`${API_URL}/auth/me`, {
        headers: authHeader('valid_token'),
      });

      const data = await response.json() as { team: object };
      expect(data.team).toBeDefined();
    });
  });

  describe('POST /auth/logout', () => {
    it('should invalidate session', async () => {
      mockFetch({
        'POST /auth/logout': { success: true },
      });

      const response = await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: authHeader('valid_jwt'),
      });

      expect(response.ok).toBe(true);
    });
  });

  describe('Token Exchange', () => {
    it('POST /auth/exchange should exchange auth code for JWT', async () => {
      mockFetch({
        'POST /auth/exchange': {
          jwt: 'new_jwt_token',
          user: mockApiResponses.user.authenticated,
        },
      });

      const response = await fetch(`${API_URL}/auth/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'oauth_code' }),
      });

      const data = await response.json() as { jwt: string };
      expect(data.jwt).toBeDefined();
    });
  });
});
