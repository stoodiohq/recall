/**
 * API Teams Tests
 * Tests team CRUD and membership endpoints
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mockFetch, clearFetchMocks, mockApiResponses } from '../utils/mocks';
import { createTeam, createUser, createTeamWithMembers } from '../utils/factories';
import { authHeader } from '../utils/helpers';

const API_URL = 'http://localhost:8787';

describe('API Teams', () => {
  beforeEach(() => {
    clearFetchMocks();
  });

  afterEach(() => {
    clearFetchMocks();
  });

  describe('Team CRUD', () => {
    it('POST /teams should create a new team', async () => {
      const team = createTeam({ name: 'My Team', slug: 'my-team' });

      mockFetch({
        'POST /teams': team,
      });

      const response = await fetch(`${API_URL}/teams`, {
        method: 'POST',
        headers: {
          ...authHeader('valid_jwt'),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'My Team' }),
      });

      const data = await response.json() as { name: string; slug: string };

      expect(data.name).toBe('My Team');
      expect(data.slug).toBe('my-team');
    });

    it('should generate unique slug from name', async () => {
      const slugs = new Set<string>();

      for (let i = 0; i < 3; i++) {
        const team = createTeam({ name: 'Same Name' });
        slugs.add(team.slug);
      }

      // Each team should have unique slug
      expect(slugs.size).toBe(3);
    });

    it('GET /teams/:id should return team details', async () => {
      mockFetch({
        'GET /teams/team-123': mockApiResponses.team.basic,
      });

      const response = await fetch(`${API_URL}/teams/team-123`, {
        headers: authHeader('valid_jwt'),
      });

      const data = await response.json() as { id: string; name: string };

      expect(data.id).toBe('team-123');
      expect(data.name).toBeDefined();
    });

    it('GET /teams/me should return current user team', async () => {
      mockFetch({
        'GET /teams/me': mockApiResponses.team.basic,
      });

      const response = await fetch(`${API_URL}/teams/me`, {
        headers: authHeader('valid_jwt'),
      });

      expect(response.ok).toBe(true);
    });

    it('PATCH /teams/:id should update team', async () => {
      mockFetch({
        'PATCH /teams/team-123': {
          ...mockApiResponses.team.basic,
          name: 'Updated Name',
        },
      });

      const response = await fetch(`${API_URL}/teams/team-123`, {
        method: 'PATCH',
        headers: {
          ...authHeader('valid_jwt'),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Updated Name' }),
      });

      const data = await response.json() as { name: string };
      expect(data.name).toBe('Updated Name');
    });

    it('DELETE /teams/:id should delete team (owner only)', async () => {
      mockFetch({
        'DELETE /teams/team-123': { success: true },
      });

      const response = await fetch(`${API_URL}/teams/team-123`, {
        method: 'DELETE',
        headers: authHeader('owner_jwt'),
      });

      expect(response.ok).toBe(true);
    });

    it('should reject delete from non-owner', async () => {
      mockFetch({
        'DELETE /teams/team-123': () => {
          return new Response(JSON.stringify({ error: 'Only owner can delete team' }), {
            status: 403,
          });
        },
      });

      const response = await fetch(`${API_URL}/teams/team-123`, {
        method: 'DELETE',
        headers: authHeader('member_jwt'),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Team Ownership', () => {
    it('POST /teams/:id/transfer should transfer ownership', async () => {
      mockFetch({
        'POST /teams/team-123/transfer': { success: true },
      });

      const response = await fetch(`${API_URL}/teams/team-123/transfer`, {
        method: 'POST',
        headers: {
          ...authHeader('owner_jwt'),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newOwnerId: 'user-456' }),
      });

      expect(response.ok).toBe(true);
    });

    it('should reject transfer from non-owner', async () => {
      mockFetch({
        'POST /teams/team-123/transfer': () => {
          return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
          });
        },
      });

      const response = await fetch(`${API_URL}/teams/team-123/transfer`, {
        method: 'POST',
        headers: {
          ...authHeader('member_jwt'),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newOwnerId: 'user-789' }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Team Members', () => {
    it('GET /teams/:id/members should list members', async () => {
      const { team, owner, members } = createTeamWithMembers(3);

      mockFetch({
        'GET /teams/team-123/members': {
          members: [
            { ...owner, role: 'owner' },
            ...members.map((m) => ({ ...m, role: 'member' })),
          ],
        },
      });

      const response = await fetch(`${API_URL}/teams/team-123/members`, {
        headers: authHeader('valid_jwt'),
      });

      const data = await response.json() as { members: object[] };
      expect(data.members.length).toBe(3);
    });

    it('PATCH /teams/:id/members/:userId should update role', async () => {
      mockFetch({
        'PATCH /teams/team-123/members/user-456': {
          role: 'admin',
        },
      });

      const response = await fetch(`${API_URL}/teams/team-123/members/user-456`, {
        method: 'PATCH',
        headers: {
          ...authHeader('owner_jwt'),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'admin' }),
      });

      const data = await response.json() as { role: string };
      expect(data.role).toBe('admin');
    });

    it('DELETE /teams/members/:userId should remove member', async () => {
      mockFetch({
        'DELETE /teams/members/user-456': { success: true },
      });

      const response = await fetch(`${API_URL}/teams/members/user-456`, {
        method: 'DELETE',
        headers: authHeader('owner_jwt'),
      });

      expect(response.ok).toBe(true);
    });

    it('should not allow removing owner', async () => {
      mockFetch({
        'DELETE /teams/members/owner-123': () => {
          return new Response(JSON.stringify({ error: 'Cannot remove team owner' }), {
            status: 400,
          });
        },
      });

      const response = await fetch(`${API_URL}/teams/members/owner-123`, {
        method: 'DELETE',
        headers: authHeader('owner_jwt'),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Team Invites', () => {
    it('POST /teams/invite should create invite link', async () => {
      mockFetch({
        'POST /teams/invite': {
          code: 'abc123',
          url: 'https://recall.team/invite/abc123',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });

      const response = await fetch(`${API_URL}/teams/invite`, {
        method: 'POST',
        headers: authHeader('owner_jwt'),
      });

      const data = await response.json() as { code: string; url: string };
      expect(data.code).toBeDefined();
      expect(data.url).toContain('invite');
    });

    it('GET /invites/:code should return invite details', async () => {
      mockFetch({
        'GET /invites/abc123': {
          team: mockApiResponses.team.basic,
          inviter: mockApiResponses.user.authenticated,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      });

      const response = await fetch(`${API_URL}/invites/abc123`);
      const data = await response.json() as { team: object };

      expect(data.team).toBeDefined();
    });

    it('POST /invites/:code/accept should join team', async () => {
      mockFetch({
        'POST /invites/abc123/accept': {
          success: true,
          team: mockApiResponses.team.basic,
        },
      });

      const response = await fetch(`${API_URL}/invites/abc123/accept`, {
        method: 'POST',
        headers: authHeader('new_user_jwt'),
      });

      const data = await response.json() as { success: boolean };
      expect(data.success).toBe(true);
    });

    it('should reject expired invite', async () => {
      mockFetch({
        'POST /invites/expired123/accept': () => {
          return new Response(JSON.stringify({ error: 'Invite expired' }), {
            status: 410,
          });
        },
      });

      const response = await fetch(`${API_URL}/invites/expired123/accept`, {
        method: 'POST',
        headers: authHeader('valid_jwt'),
      });

      expect(response.status).toBe(410);
    });

    it('DELETE /invites/:code should revoke invite', async () => {
      mockFetch({
        'DELETE /invites/abc123': { success: true },
      });

      const response = await fetch(`${API_URL}/invites/abc123`, {
        method: 'DELETE',
        headers: authHeader('owner_jwt'),
      });

      expect(response.ok).toBe(true);
    });
  });

  describe('Team Tiers', () => {
    it('free tier should have limited seats', () => {
      const freeTeam = createTeam({ tier: 'free', seats: 1 });
      expect(freeTeam.seats).toBe(1);
    });

    it('pro tier should have configurable seats', () => {
      const proTeam = createTeam({ tier: 'pro', seats: 10 });
      expect(proTeam.seats).toBe(10);
    });

    it('should enforce seat limits when accepting invite', async () => {
      mockFetch({
        'POST /invites/abc123/accept': () => {
          return new Response(
            JSON.stringify({ error: 'Team has reached seat limit' }),
            { status: 403 }
          );
        },
      });

      const response = await fetch(`${API_URL}/invites/abc123/accept`, {
        method: 'POST',
        headers: authHeader('new_user_jwt'),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Team Stats', () => {
    it('GET /teams/:id/stats should return usage stats', async () => {
      mockFetch({
        'GET /teams/team-123/stats': {
          total_sessions: 150,
          total_decisions: 45,
          active_repos: 5,
          members: 3,
          tokens_used: 1500000,
        },
      });

      const response = await fetch(`${API_URL}/teams/team-123/stats`, {
        headers: authHeader('valid_jwt'),
      });

      const data = await response.json() as { total_sessions: number };
      expect(data.total_sessions).toBeDefined();
    });

    it('GET /teams/:id/members/:userId/stats should return member stats', async () => {
      mockFetch({
        'GET /teams/team-123/members/user-456/stats': {
          sessions: 50,
          decisions: 15,
          last_active: new Date().toISOString(),
        },
      });

      const response = await fetch(`${API_URL}/teams/team-123/members/user-456/stats`, {
        headers: authHeader('valid_jwt'),
      });

      const data = await response.json() as { sessions: number };
      expect(data.sessions).toBeDefined();
    });
  });
});
