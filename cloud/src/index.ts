/**
 * Recall Cloud API
 * Cloudflare Workers + Hono + D1
 *
 * Endpoints:
 * - GET /health - Health check
 * - GET /auth/github - Start GitHub OAuth flow
 * - GET /auth/github/callback - Handle OAuth callback
 * - GET /auth/me - Current user info
 * - GET /license/check - Validate license
 * - POST /summarize - Get AI summaries for events
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

// D1 Database types
interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  error?: string;
  meta: object;
}

interface D1ExecResult {
  count: number;
  duration: number;
}

interface Env {
  ENVIRONMENT: string;
  DB: D1Database;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  JWT_SECRET: string;
  GEMINI_API_KEY?: string;
}

interface RecallEvent {
  id: string;
  ts: string;
  type: 'session' | 'decision' | 'error_resolved';
  tool: string;
  user: string;
  summary: string;
  files?: string[];
}

interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  github_id: string;
  github_username: string;
  github_access_token: string | null;
  role: string | null;
  company: string | null;
  team_size: string | null;
  onboarding_completed: number;
  last_mcp_connection: string | null;
  created_at: string;
  updated_at: string;
}

interface Team {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  tier: string;
  seats: number;
  created_at: string;
}

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: ['https://recall.team', 'http://localhost:3000', 'http://localhost:3003'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    environment: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// JWT Helpers
// ============================================================

async function signJWT(payload: object, secret: string, expiresIn: number = 7 * 24 * 60 * 60): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(claims)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${headerB64}.${payloadB64}`)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

async function verifyJWT(token: string, secret: string): Promise<{ valid: boolean; payload?: Record<string, unknown> }> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false };

    const [headerB64, payloadB64, signatureB64] = parts;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Decode signature
    const signature = Uint8Array.from(
      atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')),
      c => c.charCodeAt(0)
    );

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      encoder.encode(`${headerB64}.${payloadB64}`)
    );

    if (!valid) return { valid: false };

    // Decode payload
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}

function generateId(): string {
  return crypto.randomUUID();
}

// ============================================================
// Auth Middleware
// ============================================================

async function getAuthUser(c: { req: { header: (name: string) => string | undefined }; env: Env }): Promise<User | null> {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;

  const token = auth.slice(7);

  // Check if it's a JWT (session token)
  if (token.includes('.')) {
    const result = await verifyJWT(token, c.env.JWT_SECRET);
    if (!result.valid || !result.payload?.userId) return null;

    const user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE id = ?'
    ).bind(result.payload.userId).first<User>();

    return user;
  }

  // Check if it's an API token (rk_...)
  if (token.startsWith('rk_')) {
    const tokenHash = await hashToken(token);
    const tokenRow = await c.env.DB.prepare(
      'SELECT user_id FROM api_tokens WHERE token_hash = ?'
    ).bind(tokenHash).first<{ user_id: string }>();

    if (!tokenRow) return null;

    // Update last_used_at
    await c.env.DB.prepare(
      "UPDATE api_tokens SET last_used_at = datetime('now') WHERE token_hash = ?"
    ).bind(tokenHash).run();

    const user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE id = ?'
    ).bind(tokenRow.user_id).first<User>();

    return user;
  }

  return null;
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================
// GitHub OAuth endpoints
// ============================================================

app.get('/auth/github', (c) => {
  const clientId = c.env.GITHUB_CLIENT_ID;
  const redirectUri = c.env.ENVIRONMENT === 'production'
    ? 'https://recall-api.stoodiohq.workers.dev/auth/github/callback'
    : 'http://localhost:8787/auth/github/callback';

  const state = crypto.randomUUID();
  // Request repo scope to access user's repositories
  const scope = 'read:user user:email repo';

  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('state', state);

  return c.redirect(authUrl.toString());
});

app.get('/auth/github/callback', async (c) => {
  const code = c.req.query('code');
  const error = c.req.query('error');

  if (error) {
    return c.json({ error: `GitHub OAuth error: ${error}` }, 400);
  }

  if (!code) {
    return c.json({ error: 'Missing authorization code' }, 400);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: c.env.GITHUB_CLIENT_ID,
        client_secret: c.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json() as { access_token?: string; error?: string };

    if (tokenData.error || !tokenData.access_token) {
      return c.json({ error: tokenData.error || 'Failed to get access token' }, 400);
    }

    const accessToken = tokenData.access_token;

    // Get GitHub user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'Recall-API',
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    const githubUser = await userResponse.json() as GitHubUser;

    // Get user's primary email if not public
    let email = githubUser.email;
    if (!email) {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'Recall-API',
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      const emails = await emailsResponse.json() as GitHubEmail[];
      const primaryEmail = emails.find(e => e.primary && e.verified);
      email = primaryEmail?.email || emails[0]?.email;
    }

    if (!email) {
      return c.json({ error: 'Could not get email from GitHub' }, 400);
    }

    const now = new Date().toISOString();

    // Check if user exists
    let user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE github_id = ?'
    ).bind(String(githubUser.id)).first<User>();

    if (!user) {
      // Create new user
      const userId = generateId();
      await c.env.DB.prepare(`
        INSERT INTO users (id, email, name, avatar_url, github_id, github_username, github_access_token, onboarding_completed, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      `).bind(
        userId,
        email,
        githubUser.name,
        githubUser.avatar_url,
        String(githubUser.id),
        githubUser.login,
        accessToken,
        now,
        now
      ).run();

      user = {
        id: userId,
        email,
        name: githubUser.name,
        avatar_url: githubUser.avatar_url,
        github_id: String(githubUser.id),
        github_username: githubUser.login,
        github_access_token: accessToken,
        role: null,
        company: null,
        team_size: null,
        onboarding_completed: 0,
        created_at: now,
        updated_at: now,
      };
    } else {
      // Update user info and token
      await c.env.DB.prepare(`
        UPDATE users SET email = ?, name = ?, avatar_url = ?, github_username = ?, github_access_token = ?, updated_at = ?
        WHERE id = ?
      `).bind(
        email,
        githubUser.name,
        githubUser.avatar_url,
        githubUser.login,
        accessToken,
        now,
        user.id
      ).run();
    }

    // Generate JWT session token
    const sessionToken = await signJWT({ userId: user.id }, c.env.JWT_SECRET);

    // For CLI auth flow, redirect to a page that displays the token
    // For web flow, set a cookie and redirect to dashboard
    const returnTo = c.req.query('return_to') || '/';

    if (returnTo === 'cli') {
      // CLI auth: show the token for copy/paste
      return c.html(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Recall - Authentication Complete</title>
          <style>
            body { font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .token-box { background: #f5f5f5; padding: 20px; border-radius: 8px; word-break: break-all; font-family: monospace; font-size: 14px; }
            h1 { color: #333; }
            p { color: #666; }
            code { background: #eee; padding: 2px 6px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <h1>✓ Authentication Complete</h1>
          <p>Welcome, <strong>${user.name || user.github_username}</strong>!</p>
          <p>Copy this token and paste it in your terminal:</p>
          <div class="token-box">${sessionToken}</div>
          <p style="margin-top: 20px;">Or run: <code>recall auth ${sessionToken.slice(0, 20)}...</code></p>
          <p style="color: #999; margin-top: 40px;">You can close this window.</p>
        </body>
        </html>
      `);
    }

    // Web auth: redirect with token in URL (for SPA to handle)
    const redirectUrl = new URL(c.env.ENVIRONMENT === 'production' ? 'https://recall.team' : 'http://localhost:3003');

    // Check if user needs onboarding
    const needsOnboarding = !user.onboarding_completed;
    redirectUrl.pathname = needsOnboarding ? '/onboarding' : '/dashboard';
    redirectUrl.searchParams.set('token', sessionToken);

    return c.redirect(redirectUrl.toString());

  } catch (err) {
    console.error('OAuth error:', err);
    return c.json({ error: 'Authentication failed' }, 500);
  }
});

// ============================================================
// User endpoints
// ============================================================

app.get('/auth/me', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Get user's team membership
  const membership = await c.env.DB.prepare(`
    SELECT t.*, tm.role
    FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE tm.user_id = ?
    LIMIT 1
  `).bind(user.id).first<Team & { role: string }>();

  return c.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatar_url,
    githubUsername: user.github_username,
    onboardingCompleted: !!user.onboarding_completed,
    lastMcpConnection: user.last_mcp_connection,
    profile: {
      role: user.role,
      company: user.company,
      teamSize: user.team_size,
    },
    team: membership ? {
      id: membership.id,
      name: membership.name,
      slug: membership.slug,
      role: membership.role,
      tier: membership.tier,
      seats: membership.seats,
    } : null,
  });
});

// ============================================================
// GitHub Repo endpoints
// ============================================================

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
  pushed_at: string;
}

// Get user's GitHub repos
app.get('/github/repos', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!user.github_access_token) {
    return c.json({ error: 'GitHub token not available. Please re-authenticate.' }, 400);
  }

  try {
    // Fetch user's repos from GitHub
    const reposResponse = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated&type=all', {
      headers: {
        'Authorization': `Bearer ${user.github_access_token}`,
        'User-Agent': 'Recall-API',
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!reposResponse.ok) {
      if (reposResponse.status === 401) {
        return c.json({ error: 'GitHub token expired. Please re-authenticate.' }, 401);
      }
      throw new Error(`GitHub API error: ${reposResponse.status}`);
    }

    const repos = await reposResponse.json() as GitHubRepo[];

    // Return simplified repo list
    return c.json({
      repos: repos.map(r => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        private: r.private,
        description: r.description,
        url: r.html_url,
        language: r.language,
        stars: r.stargazers_count,
        updatedAt: r.updated_at,
        pushedAt: r.pushed_at,
      })),
    });
  } catch (error) {
    console.error('Failed to fetch GitHub repos:', error);
    return c.json({ error: 'Failed to fetch repositories' }, 500);
  }
});

// ============================================================
// Onboarding endpoints
// ============================================================

interface SelectedRepo {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  description: string | null;
  language: string | null;
}

interface OnboardingData {
  role: string;
  company: string;
  teamSize: string;
  teamName: string;
  plan: 'team' | 'enterprise';
  seats: number;
  selectedRepos: SelectedRepo[];
}

// Complete onboarding
app.post('/onboarding/complete', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const body = await c.req.json<OnboardingData>();

  if (!body.role || !body.company || !body.teamSize || !body.teamName || !body.plan) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  const now = new Date().toISOString();

  // Update user profile
  await c.env.DB.prepare(`
    UPDATE users SET role = ?, company = ?, team_size = ?, onboarding_completed = 1, updated_at = ?
    WHERE id = ?
  `).bind(body.role, body.company, body.teamSize, now, user.id).run();

  // Check if user already has a team
  const existingTeam = await c.env.DB.prepare(`
    SELECT t.* FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE tm.user_id = ?
    LIMIT 1
  `).bind(user.id).first<Team>();

  let team: Team | null = existingTeam || null;

  if (!existingTeam) {
    // Create team
    const teamId = generateId();
    const keyId = generateId();

    // Generate unique slug
    let baseSlug = generateSlug(body.teamName);
    let slug = baseSlug;
    let attempt = 0;

    while (true) {
      const existing = await c.env.DB.prepare(
        'SELECT id FROM teams WHERE slug = ?'
      ).bind(slug).first();

      if (!existing) break;

      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }

    // Determine seats based on plan
    const seats = body.seats || (body.plan === 'team' ? 10 : 50);

    // Generate team encryption key
    const encryptionKey = await generateEncryptionKey();

    // Create team with encryption key in a batch
    await c.env.DB.batch([
      c.env.DB.prepare(`
        INSERT INTO teams (id, name, slug, owner_id, tier, seats, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(teamId, body.teamName, slug, user.id, body.plan, seats, now, now),

      c.env.DB.prepare(`
        INSERT INTO team_members (team_id, user_id, role, joined_at)
        VALUES (?, ?, 'owner', ?)
      `).bind(teamId, user.id, now),

      c.env.DB.prepare(`
        INSERT INTO team_keys (id, team_id, encryption_key, key_version, created_at)
        VALUES (?, ?, ?, 1, ?)
      `).bind(keyId, teamId, encryptionKey, now),
    ]);

    team = {
      id: teamId,
      name: body.teamName,
      slug,
      owner_id: user.id,
      tier: body.plan,
      seats,
      created_at: now,
    };
  }

  // Enable selected repos for tracking
  const enabledRepos: { id: string; fullName: string }[] = [];

  if (team && body.selectedRepos && body.selectedRepos.length > 0) {
    for (const repo of body.selectedRepos) {
      const repoId = generateId();
      try {
        await c.env.DB.prepare(`
          INSERT INTO repos (id, team_id, github_repo_id, name, full_name, private, description, language, enabled, enabled_by, enabled_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
        `).bind(
          repoId,
          team.id,
          repo.id,
          repo.name,
          repo.fullName,
          repo.private ? 1 : 0,
          repo.description,
          repo.language,
          user.id,
          now
        ).run();

        enabledRepos.push({ id: repoId, fullName: repo.fullName });
      } catch (err) {
        // Repo might already exist, skip
        console.error('Failed to insert repo:', repo.fullName, err);
      }
    }
  }

  return c.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: body.role,
      company: body.company,
    },
    team: team ? {
      id: team.id,
      name: team.name,
      slug: team.slug,
      tier: team.tier,
      seats: team.seats,
    } : null,
    enabledRepos,
    reposCount: enabledRepos.length,
    message: `Recall enabled on ${enabledRepos.length} repo${enabledRepos.length !== 1 ? 's' : ''}!`,
  });
});

// Complete onboarding for invited members (simplified)
app.post('/onboarding/complete-invited', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Verify user is actually on a team (was invited)
  const membership = await c.env.DB.prepare(`
    SELECT t.id, t.name FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE tm.user_id = ?
    LIMIT 1
  `).bind(user.id).first<{ id: string; name: string }>();

  if (!membership) {
    return c.json({ error: 'You are not a member of any team' }, 400);
  }

  const body = await c.req.json<{ name?: string; role?: string; website?: string }>();
  const now = new Date().toISOString();

  // Update user profile and mark onboarding complete
  await c.env.DB.prepare(`
    UPDATE users SET
      name = COALESCE(?, name),
      role = COALESCE(?, role),
      website = ?,
      onboarding_completed = 1,
      updated_at = ?
    WHERE id = ?
  `).bind(
    body.name || null,
    body.role || null,
    body.website || null,
    now,
    user.id
  ).run();

  return c.json({
    success: true,
    user: {
      id: user.id,
      name: body.name || user.name,
      role: body.role,
      website: body.website,
    },
    team: {
      id: membership.id,
      name: membership.name,
    },
  });
});

// Get onboarding status
app.get('/onboarding/status', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Check if user has completed onboarding
  const hasTeam = await c.env.DB.prepare(`
    SELECT t.id FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE tm.user_id = ?
    LIMIT 1
  `).bind(user.id).first();

  return c.json({
    completed: !!user.onboarding_completed,
    hasTeam: !!hasTeam,
    profile: {
      role: user.role,
      company: user.company,
      teamSize: user.team_size,
    },
  });
});

// Get enabled repos for current user's team
app.get('/repos', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Get user's team
  const membership = await c.env.DB.prepare(`
    SELECT t.id FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE tm.user_id = ?
    LIMIT 1
  `).bind(user.id).first<{ id: string }>();

  if (!membership) {
    return c.json({ repos: [] });
  }

  // Get enabled repos
  const result = await c.env.DB.prepare(`
    SELECT id, github_repo_id, name, full_name, private, description, language, enabled, enabled_at, last_sync_at, initialized_at
    FROM repos
    WHERE team_id = ? AND enabled = 1
    ORDER BY enabled_at DESC
  `).bind(membership.id).all();

  return c.json({
    repos: (result.results || []).map((r: Record<string, unknown>) => ({
      id: r.id,
      githubRepoId: r.github_repo_id,
      name: r.name,
      fullName: r.full_name,
      private: !!r.private,
      description: r.description,
      language: r.language,
      enabled: !!r.enabled,
      enabledAt: r.enabled_at,
      lastSyncAt: r.last_sync_at,
      initializedAt: r.initialized_at,
    })),
  });
});

// Add a new repo
app.post('/repos', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Get user's team
  const membership = await c.env.DB.prepare(`
    SELECT t.id FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE tm.user_id = ?
    LIMIT 1
  `).bind(user.id).first<{ id: string }>();

  if (!membership) {
    return c.json({ error: 'No team found' }, 404);
  }

  const body = await c.req.json<{
    githubRepoId: number;
    name: string;
    fullName: string;
    private: boolean;
    description: string | null;
    language: string | null;
  }>();

  if (!body.githubRepoId || !body.name || !body.fullName) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  const now = new Date().toISOString();
  const repoId = generateId();

  try {
    await c.env.DB.prepare(`
      INSERT INTO repos (id, team_id, github_repo_id, name, full_name, private, description, language, enabled_by, enabled_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      repoId,
      membership.id,
      body.githubRepoId,
      body.name,
      body.fullName,
      body.private ? 1 : 0,
      body.description,
      body.language,
      user.id,
      now
    ).run();

    return c.json({
      id: repoId,
      githubRepoId: body.githubRepoId,
      name: body.name,
      fullName: body.fullName,
      private: body.private,
      enabled: true,
    });
  } catch (err) {
    // Repo might already exist
    console.error('Failed to add repo:', err);
    return c.json({ error: 'Failed to add repository. It may already exist.' }, 400);
  }
});

// Toggle repo enabled status
app.post('/repos/:repoId/toggle', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const repoId = c.req.param('repoId');

  // Get user's team
  const membership = await c.env.DB.prepare(`
    SELECT t.id FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE tm.user_id = ?
    LIMIT 1
  `).bind(user.id).first<{ id: string }>();

  if (!membership) {
    return c.json({ error: 'No team found' }, 404);
  }

  // Toggle the repo
  const repo = await c.env.DB.prepare(`
    SELECT id, enabled FROM repos WHERE id = ? AND team_id = ?
  `).bind(repoId, membership.id).first<{ id: string; enabled: number }>();

  if (!repo) {
    return c.json({ error: 'Repo not found' }, 404);
  }

  const newEnabled = repo.enabled ? 0 : 1;
  await c.env.DB.prepare(`
    UPDATE repos SET enabled = ? WHERE id = ?
  `).bind(newEnabled, repoId).run();

  return c.json({
    id: repoId,
    enabled: !!newEnabled,
  });
});

// Initialize repo with .recall directory
app.post('/repos/:repoId/initialize', async (c) => {
  console.log('[Initialize] Starting initialization...');

  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  console.log('[Initialize] User authenticated:', user.id);

  if (!user.github_access_token) {
    return c.json({ error: 'GitHub token not available. Please re-authenticate.' }, 400);
  }
  console.log('[Initialize] GitHub token exists');

  const repoId = c.req.param('repoId');
  console.log('[Initialize] Repo ID:', repoId);

  // Get user's team
  const membership = await c.env.DB.prepare(`
    SELECT t.id FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE tm.user_id = ?
    LIMIT 1
  `).bind(user.id).first<{ id: string }>();

  if (!membership) {
    console.log('[Initialize] No team found for user');
    return c.json({ error: 'No team found' }, 404);
  }
  console.log('[Initialize] Team found:', membership.id);

  // Get repo info
  const repo = await c.env.DB.prepare(`
    SELECT * FROM repos WHERE id = ? AND team_id = ?
  `).bind(repoId, membership.id).first<{
    id: string;
    full_name: string;
    name: string;
    description: string | null;
    language: string | null;
    initialized_at: string | null;
  }>();

  if (!repo) {
    console.log('[Initialize] Repo not found:', repoId, 'team:', membership.id);
    return c.json({ error: 'Repo not found' }, 404);
  }
  console.log('[Initialize] Repo found:', repo.full_name);

  // Get encryption key
  const teamKey = await c.env.DB.prepare(`
    SELECT encryption_key, key_version FROM team_keys WHERE team_id = ?
  `).bind(membership.id).first<{ encryption_key: string; key_version: number }>();

  if (!teamKey) {
    console.log('[Initialize] Team encryption key not found');
    return c.json({ error: 'Team encryption key not found' }, 500);
  }
  console.log('[Initialize] Encryption key found, version:', teamKey.key_version);

  try {
    // 1. Get repo default branch
    console.log('[Initialize] Step 1: Getting default branch...');
    const repoResponse = await fetch(`https://api.github.com/repos/${repo.full_name}`, {
      headers: {
        'Authorization': `Bearer ${user.github_access_token}`,
        'User-Agent': 'Recall-API',
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!repoResponse.ok) {
      throw new Error(`GitHub API error: ${repoResponse.status}`);
    }

    const repoData = await repoResponse.json() as { default_branch: string };
    const defaultBranch = repoData.default_branch;
    console.log('[Initialize] Step 1 complete, default branch:', defaultBranch);

    // 2. Get repo tree to analyze structure
    console.log('[Initialize] Step 2: Getting repo tree...');
    const treeResponse = await fetch(`https://api.github.com/repos/${repo.full_name}/git/trees/${defaultBranch}?recursive=1`, {
      headers: {
        'Authorization': `Bearer ${user.github_access_token}`,
        'User-Agent': 'Recall-API',
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    let repoStructure = '';
    if (treeResponse.ok) {
      const treeData = await treeResponse.json() as { tree: Array<{ path: string; type: string }> };
      // Get key files only (limit to prevent token overflow)
      const keyFiles = treeData.tree
        .filter(f => f.type === 'blob')
        .filter(f =>
          f.path.endsWith('.json') ||
          f.path.endsWith('.ts') ||
          f.path.endsWith('.tsx') ||
          f.path.endsWith('.js') ||
          f.path.endsWith('.jsx') ||
          f.path.endsWith('.py') ||
          f.path.endsWith('.go') ||
          f.path.endsWith('.rs') ||
          f.path.endsWith('.md') ||
          f.path === 'Dockerfile' ||
          f.path.includes('config')
        )
        .slice(0, 100)
        .map(f => f.path);
      repoStructure = keyFiles.join('\n');
    }
    console.log('[Initialize] Step 2 complete, found', repoStructure.split('\n').length, 'files');

    // 3. Try to read README for context
    console.log('[Initialize] Step 3: Reading README...');
    let readmeContent = '';
    const readmeResponse = await fetch(`https://api.github.com/repos/${repo.full_name}/readme`, {
      headers: {
        'Authorization': `Bearer ${user.github_access_token}`,
        'User-Agent': 'Recall-API',
        'Accept': 'application/vnd.github.v3.raw',
      },
    });
    if (readmeResponse.ok) {
      readmeContent = await readmeResponse.text();
      // Truncate if too long
      if (readmeContent.length > 2000) {
        readmeContent = readmeContent.slice(0, 2000) + '\n...[truncated]';
      }
    }
    console.log('[Initialize] Step 3 complete, README length:', readmeContent.length);

    // 4. Generate initial memory files with Gemini
    console.log('[Initialize] Step 4: Generating memory files...');
    const projectInfo = `
Project: ${repo.name}
Full Name: ${repo.full_name}
Description: ${repo.description || 'No description'}
Language: ${repo.language || 'Unknown'}

## File Structure
${repoStructure || 'Unable to fetch file structure'}

## README
${readmeContent || 'No README found'}
`;

    let smallContent = '';
    let mediumContent = '';
    let largeContent = '';

    if (c.env.GEMINI_API_KEY) {
      // Generate with AI
      const initPrompt = `You are initializing Recall team memory for a new repository.

${projectInfo}

This is the FIRST session - there's no history yet. Create initial memory files that help AI coding assistants understand this project.`;

      console.log('[Initialize] Calling Gemini API...');
      try {
        const [small, medium] = await Promise.all([
          callGemini(c.env.GEMINI_API_KEY, SMALL_SUMMARY_PROMPT, initPrompt),
          callGemini(c.env.GEMINI_API_KEY, MEDIUM_SUMMARY_PROMPT, initPrompt),
        ]);
        smallContent = small;
        mediumContent = medium;
        console.log('[Initialize] Gemini API success');
      } catch (geminiError) {
        console.error('[Initialize] Gemini API failed:', geminiError);
        // Fall back to template if Gemini fails
        smallContent = '';
        mediumContent = '';
      }

      if (!smallContent || !mediumContent) {
        console.log('[Initialize] Using template fallback');
        smallContent = `# ${repo.name} - Team Context

Sessions: 0 | Last: ${new Date().toISOString().split('T')[0]}
Tokens: small ~300 | medium ~500 | large ~800

## What It Is
${repo.description || 'A development project.'}

## Current Status
- **Phase:** Just initialized
- **Working:** Recall memory initialized
- **Blocked:** None

## Recent Decisions
_No decisions recorded yet._

---
*medium.md = session history | large.md = full transcripts*
`;
        mediumContent = `# ${repo.name} - Development History

Sessions: 0 | Updated: ${new Date().toISOString().split('T')[0]}

_No sessions yet. Start using your AI coding assistant to begin building team memory._
`;
      }
      largeContent = `# ${repo.name} - Full Context

## Initialization

Date: ${new Date().toISOString()}
Initialized by: @${user.github_username}

## Repository Info
- **Full Name:** ${repo.full_name}
- **Description:** ${repo.description || 'No description'}
- **Language:** ${repo.language || 'Unknown'}

---

*This is the initial setup. Session transcripts will be added here as the team uses AI coding tools.*
`;
    } else {
      // Template fallback
      smallContent = `# ${repo.name} - Team Context

Sessions: 0 | Last: ${new Date().toISOString().split('T')[0]}
Tokens: small ~300 | medium ~500 | large ~800

## What It Is
${repo.description || 'A development project.'}

## Current Status
- **Phase:** Just initialized
- **Working:** Recall memory initialized
- **Blocked:** None

## Recent Decisions
_No decisions recorded yet. Use your AI coding assistant and decisions will be captured here._

## Key Files
_File tracking will begin with your first AI session._

---
*medium.md = session history | large.md = full transcripts*
`;

      mediumContent = `# ${repo.name} - Development History

Sessions: 0 | Updated: ${new Date().toISOString().split('T')[0]}

_No sessions yet. Start using your AI coding assistant to begin building team memory._

---
*See large.md for complete chat transcripts*
`;

      largeContent = `# ${repo.name} - Full Context

## Initialization

Date: ${new Date().toISOString()}
Initialized by: @${user.github_username}

---

*Session transcripts will be appended here.*
`;
    }
    console.log('[Initialize] Step 4 complete, content lengths:', smallContent.length, mediumContent.length, largeContent.length);

    // 5. Encrypt the content
    console.log('[Initialize] Step 5: Encrypting content...');
    const encryptedSmall = await encryptContent(smallContent, teamKey.encryption_key);
    const encryptedMedium = await encryptContent(mediumContent, teamKey.encryption_key);
    const encryptedLarge = await encryptContent(largeContent, teamKey.encryption_key);
    console.log('[Initialize] Step 5 complete, encrypted');

    // 6. Get current commit SHA
    console.log('[Initialize] Step 6: Getting branch ref...');
    const refResponse = await fetch(`https://api.github.com/repos/${repo.full_name}/git/ref/heads/${defaultBranch}`, {
      headers: {
        'Authorization': `Bearer ${user.github_access_token}`,
        'User-Agent': 'Recall-API',
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!refResponse.ok) {
      throw new Error(`Failed to get branch ref: ${refResponse.status}`);
    }

    const refData = await refResponse.json() as { object: { sha: string } };
    const baseSha = refData.object.sha;
    console.log('[Initialize] Step 6 complete, base SHA:', baseSha);

    // 7. Create blobs for each file
    console.log('[Initialize] Step 7: Creating blobs...');
    const createBlob = async (content: string): Promise<string> => {
      const blobResponse = await fetch(`https://api.github.com/repos/${repo.full_name}/git/blobs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.github_access_token}`,
          'User-Agent': 'Recall-API',
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: btoa(content),
          encoding: 'base64',
        }),
      });
      const blobData = await blobResponse.json() as { sha: string };
      return blobData.sha;
    };

    const [smallSha, mediumSha, largeSha, readmeSha] = await Promise.all([
      createBlob(encryptedSmall),
      createBlob(encryptedMedium),
      createBlob(encryptedLarge),
      createBlob(`# Recall Team Memory

This directory contains encrypted team memory files managed by [Recall](https://recall.team).

These files are encrypted with your team's key. Only team members with active Recall subscriptions can decrypt and read them.

## Files

- **small.md** - Quick context (~500 tokens) - loaded automatically
- **medium.md** - Session history (~4k tokens) - on demand
- **large.md** - Full transcripts (~50k tokens) - searchable

## Usage

1. Install the Recall MCP server in your AI coding tool
2. Authenticate with \`recall_auth\`
3. Memory is automatically loaded and updated

Learn more at [recall.team](https://recall.team)
`),
    ]);
    console.log('[Initialize] Step 7 complete, blobs created');

    // 8. Get base tree
    console.log('[Initialize] Step 8: Getting base tree...');
    const baseTreeResponse = await fetch(`https://api.github.com/repos/${repo.full_name}/git/commits/${baseSha}`, {
      headers: {
        'Authorization': `Bearer ${user.github_access_token}`,
        'User-Agent': 'Recall-API',
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    const baseCommit = await baseTreeResponse.json() as { tree: { sha: string } };
    console.log('[Initialize] Step 8 complete, base tree SHA:', baseCommit.tree?.sha);

    // 9. Create tree with new files
    console.log('[Initialize] Step 9: Creating new tree...');
    const treeCreateResponse = await fetch(`https://api.github.com/repos/${repo.full_name}/git/trees`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.github_access_token}`,
        'User-Agent': 'Recall-API',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base_tree: baseCommit.tree.sha,
        tree: [
          { path: '.recall/small.md', mode: '100644', type: 'blob', sha: smallSha },
          { path: '.recall/medium.md', mode: '100644', type: 'blob', sha: mediumSha },
          { path: '.recall/large.md', mode: '100644', type: 'blob', sha: largeSha },
          { path: '.recall/README.md', mode: '100644', type: 'blob', sha: readmeSha },
        ],
      }),
    });

    const newTree = await treeCreateResponse.json() as { sha: string };
    console.log('[Initialize] Step 9 complete, new tree SHA:', newTree.sha);

    // 10. Create commit
    console.log('[Initialize] Step 10: Creating commit...');
    const commitResponse = await fetch(`https://api.github.com/repos/${repo.full_name}/git/commits`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.github_access_token}`,
        'User-Agent': 'Recall-API',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Initialize Recall team memory\n\nAdds encrypted .recall/ directory for AI coding assistant context.\n\nLearn more: https://recall.team',
        tree: newTree.sha,
        parents: [baseSha],
      }),
    });

    const newCommit = await commitResponse.json() as { sha: string };
    console.log('[Initialize] Step 10 complete, commit SHA:', newCommit.sha);

    // 11. Update branch ref
    console.log('[Initialize] Step 11: Updating branch ref...');
    await fetch(`https://api.github.com/repos/${repo.full_name}/git/refs/heads/${defaultBranch}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${user.github_access_token}`,
        'User-Agent': 'Recall-API',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sha: newCommit.sha,
      }),
    });
    console.log('[Initialize] Step 11 complete, ref updated');

    // 12. Update repo record
    console.log('[Initialize] Step 12: Updating DB record...');
    const now = new Date().toISOString();
    await c.env.DB.prepare(`
      UPDATE repos SET initialized_at = ?, last_sync_at = ? WHERE id = ?
    `).bind(now, now, repoId).run();
    console.log('[Initialize] Step 12 complete, ALL DONE!');

    return c.json({
      success: true,
      message: `Recall initialized in ${repo.full_name}`,
      commitSha: newCommit.sha,
      files: ['.recall/small.md', '.recall/medium.md', '.recall/large.md', '.recall/README.md'],
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('[Initialize] FATAL ERROR:', errorMessage);
    console.error('[Initialize] Stack:', errorStack);
    return c.json({
      error: 'Failed to initialize repo',
      details: errorMessage,
      step: 'unknown'
    }, 500);
  }
});

// Helper: Encrypt content with AES-256-GCM
async function encryptContent(text: string, keyBase64: string): Promise<string> {
  const key = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoder.encode(text)
  );

  // Format: iv:ciphertext (both base64)
  const encryptedArray = new Uint8Array(encrypted);
  const ivB64 = btoa(String.fromCharCode(...iv));
  const cipherB64 = btoa(String.fromCharCode(...encryptedArray));

  return `RECALL_ENCRYPTED:v1:${ivB64}:${cipherB64}`;
}

// Generate CLI API token
app.post('/auth/token', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const body = await c.req.json<{ name?: string }>().catch(() => ({}));
  const tokenName = body.name || 'CLI Token';

  // Generate a random API token
  const token = `rk_${crypto.randomUUID().replace(/-/g, '')}`;
  const tokenHash = await hashToken(token);
  const tokenId = generateId();
  const now = new Date().toISOString();

  await c.env.DB.prepare(`
    INSERT INTO api_tokens (id, user_id, name, token_hash, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(tokenId, user.id, tokenName, tokenHash, now).run();

  return c.json({
    token,
    name: tokenName,
    createdAt: now,
  });
});

// ============================================================
// License endpoints
// ============================================================

app.get('/license/check', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Get user's team and license info
  const membership = await c.env.DB.prepare(`
    SELECT t.*, tm.role
    FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE tm.user_id = ?
    LIMIT 1
  `).bind(user.id).first<Team & { role: string }>();

  if (!membership) {
    // No team = no paid license
    return c.json({
      valid: false,
      tier: null,
      message: 'No active subscription. Visit recall.team to subscribe.',
    });
  }

  // Count team members (each member uses 1 seat)
  const memberCount = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM team_members WHERE team_id = ?
  `).bind(membership.id).first<{ count: number }>();

  const seatsUsed = memberCount?.count || 0;

  // Define features by tier
  const tierFeatures: Record<string, string[]> = {
    starter: ['context_capture', 'ai_summaries', 'team_sync'],
    team: ['context_capture', 'ai_summaries', 'team_sync', 'analytics'],
    business: ['context_capture', 'ai_summaries', 'team_sync', 'analytics', 'sso', 'priority_support'],
    enterprise: ['context_capture', 'ai_summaries', 'team_sync', 'analytics', 'sso', 'priority_support', 'custom_deployment'],
  };

  return c.json({
    valid: true,
    tier: membership.tier,
    seats: membership.seats,
    seatsUsed,
    features: tierFeatures[membership.tier] || [],
  });
});

app.post('/license/activate', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const body = await c.req.json<{ machineId?: string; hostname?: string }>();
  if (!body.machineId) {
    return c.json({ error: 'Missing machineId' }, 400);
  }

  // Get user's team
  const membership = await c.env.DB.prepare(`
    SELECT t.*
    FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE tm.user_id = ?
    LIMIT 1
  `).bind(user.id).first<Team>();

  if (!membership) {
    return c.json({ error: 'No active subscription' }, 403);
  }

  // Check seat availability
  const activationsCount = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM license_activations WHERE team_id = ?
  `).bind(membership.id).first<{ count: number }>();

  const seatsUsed = activationsCount?.count || 0;

  // Check if this machine is already activated
  const existingActivation = await c.env.DB.prepare(`
    SELECT * FROM license_activations WHERE team_id = ? AND machine_id = ?
  `).bind(membership.id, body.machineId).first();

  if (existingActivation) {
    // Update last_seen
    await c.env.DB.prepare(`
      UPDATE license_activations SET last_seen_at = datetime('now') WHERE team_id = ? AND machine_id = ?
    `).bind(membership.id, body.machineId).run();

    return c.json({
      activated: true,
      machineId: body.machineId,
      message: 'Machine already activated',
    });
  }

  if (seatsUsed >= membership.seats) {
    return c.json({
      error: 'No seats available',
      seatsUsed,
      seats: membership.seats,
    }, 403);
  }

  // Create activation
  const activationId = generateId();
  const now = new Date().toISOString();

  await c.env.DB.prepare(`
    INSERT INTO license_activations (id, team_id, user_id, machine_id, hostname, last_seen_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(activationId, membership.id, user.id, body.machineId, body.hostname || null, now, now).run();

  return c.json({
    activated: true,
    machineId: body.machineId,
    seatsUsed: seatsUsed + 1,
    seats: membership.seats,
  });
});

// ============================================================
// Team/Checkout endpoints (mock - no real payments yet)
// ============================================================

const TIER_CONFIG: Record<string, { seats: number; price: number }> = {
  starter: { seats: 5, price: 49 },
  team: { seats: 20, price: 149 },
  business: { seats: 50, price: 399 },
  enterprise: { seats: 100, price: 0 }, // Custom pricing
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

// Generate a cryptographically secure AES-256 key
async function generateEncryptionKey(): Promise<string> {
  const key = new Uint8Array(32); // 256 bits
  crypto.getRandomValues(key);
  return btoa(String.fromCharCode(...key));
}

// Create team (mock checkout)
app.post('/teams', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const body = await c.req.json<{ name?: string; tier?: string }>();

  if (!body.name || !body.tier) {
    return c.json({ error: 'Missing name or tier' }, 400);
  }

  const tierConfig = TIER_CONFIG[body.tier];
  if (!tierConfig) {
    return c.json({ error: 'Invalid tier' }, 400);
  }

  // Check if user already has a team
  const existingTeam = await c.env.DB.prepare(`
    SELECT t.* FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE tm.user_id = ?
    LIMIT 1
  `).bind(user.id).first();

  if (existingTeam) {
    return c.json({ error: 'User already has a team' }, 400);
  }

  // Generate unique slug
  let baseSlug = generateSlug(body.name);
  let slug = baseSlug;
  let attempt = 0;

  while (true) {
    const existing = await c.env.DB.prepare(
      'SELECT id FROM teams WHERE slug = ?'
    ).bind(slug).first();

    if (!existing) break;

    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  const teamId = generateId();
  const keyId = generateId();
  const now = new Date().toISOString();

  // Generate team encryption key
  const encryptionKey = await generateEncryptionKey();

  // Create team with encryption key in a batch
  await c.env.DB.batch([
    c.env.DB.prepare(`
      INSERT INTO teams (id, name, slug, owner_id, tier, seats, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(teamId, body.name, slug, user.id, body.tier, tierConfig.seats, now, now),

    c.env.DB.prepare(`
      INSERT INTO team_members (team_id, user_id, role, joined_at)
      VALUES (?, ?, 'owner', ?)
    `).bind(teamId, user.id, now),

    c.env.DB.prepare(`
      INSERT INTO team_keys (id, team_id, encryption_key, key_version, created_at)
      VALUES (?, ?, ?, 1, ?)
    `).bind(keyId, teamId, encryptionKey, now),
  ]);

  return c.json({
    id: teamId,
    name: body.name,
    slug,
    tier: body.tier,
    seats: tierConfig.seats,
    role: 'owner',
  });
});

// Get current user's team
app.get('/teams/me', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const team = await c.env.DB.prepare(`
    SELECT t.*, tm.role
    FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE tm.user_id = ?
    LIMIT 1
  `).bind(user.id).first<Team & { role: string }>();

  if (!team) {
    return c.json({ team: null });
  }

  // Get team members
  const membersResult = await c.env.DB.prepare(`
    SELECT u.id, u.email, u.name, u.avatar_url, u.github_username, tm.role, tm.joined_at
    FROM users u
    JOIN team_members tm ON tm.user_id = u.id
    WHERE tm.team_id = ?
    ORDER BY tm.joined_at
  `).bind(team.id).all();

  return c.json({
    team: {
      id: team.id,
      name: team.name,
      slug: team.slug,
      tier: team.tier,
      seats: team.seats,
      role: team.role,
      members: membersResult.results || [],
    },
  });
});

// ============================================================
// Team Invite endpoints (Magic Links)
// ============================================================

// Create an invite link
app.post('/teams/invite', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Get user's team and verify they can invite (owner or admin)
  const membership = await c.env.DB.prepare(`
    SELECT t.*, tm.role
    FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE tm.user_id = ? AND tm.role IN ('owner', 'admin')
    LIMIT 1
  `).bind(user.id).first<Team & { role: string }>();

  if (!membership) {
    return c.json({ error: 'You must be a team owner or admin to invite members' }, 403);
  }

  // Check seat availability
  const memberCount = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM team_members WHERE team_id = ?
  `).bind(membership.id).first<{ count: number }>();

  const seatsUsed = memberCount?.count || 0;
  if (seatsUsed >= membership.seats) {
    return c.json({
      error: 'No seats available',
      message: `Your team is using all ${membership.seats} seats. Upgrade your plan to add more members.`,
      seatsUsed,
      seats: membership.seats,
    }, 403);
  }

  const body = await c.req.json<{ email?: string; role?: string }>().catch(() => ({}));
  const inviteRole = body.role === 'admin' ? 'admin' : 'member';

  // Generate unique invite code
  const code = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const inviteId = generateId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await c.env.DB.prepare(`
    INSERT INTO team_invites (id, team_id, code, email, invited_by, role, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    inviteId,
    membership.id,
    code,
    body.email || null,
    user.id,
    inviteRole,
    expiresAt.toISOString(),
    now.toISOString()
  ).run();

  const baseUrl = c.env.ENVIRONMENT === 'production' ? 'https://recall.team' : 'http://localhost:3003';
  const inviteUrl = `${baseUrl}/invite?code=${code}`;

  return c.json({
    code,
    url: inviteUrl,
    email: body.email || null,
    role: inviteRole,
    expiresAt: expiresAt.toISOString(),
    seatsRemaining: membership.seats - seatsUsed - 1,
  });
});

// Get invite details (public - for showing invite page)
app.get('/invites/:code', async (c) => {
  const code = c.req.param('code');

  const invite = await c.env.DB.prepare(`
    SELECT i.*, t.name as team_name, t.slug as team_slug, u.name as invited_by_name
    FROM team_invites i
    JOIN teams t ON t.id = i.team_id
    JOIN users u ON u.id = i.invited_by
    WHERE i.code = ?
  `).bind(code).first<{
    id: string;
    team_id: string;
    team_name: string;
    team_slug: string;
    invited_by_name: string;
    email: string | null;
    role: string;
    expires_at: string;
    accepted_at: string | null;
  }>();

  if (!invite) {
    return c.json({ error: 'Invite not found' }, 404);
  }

  if (invite.accepted_at) {
    return c.json({ error: 'This invite has already been used' }, 400);
  }

  if (new Date(invite.expires_at) < new Date()) {
    return c.json({ error: 'This invite has expired' }, 400);
  }

  return c.json({
    valid: true,
    teamName: invite.team_name,
    teamSlug: invite.team_slug,
    invitedBy: invite.invited_by_name,
    role: invite.role,
    email: invite.email,
    expiresAt: invite.expires_at,
  });
});

// Accept an invite (requires auth)
app.post('/invites/:code/accept', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized - Please sign in first' }, 401);
  }

  const code = c.req.param('code');

  const invite = await c.env.DB.prepare(`
    SELECT i.*, t.seats
    FROM team_invites i
    JOIN teams t ON t.id = i.team_id
    WHERE i.code = ?
  `).bind(code).first<{
    id: string;
    team_id: string;
    email: string | null;
    role: string;
    expires_at: string;
    accepted_at: string | null;
    seats: number;
  }>();

  if (!invite) {
    return c.json({ error: 'Invite not found' }, 404);
  }

  if (invite.accepted_at) {
    return c.json({ error: 'This invite has already been used' }, 400);
  }

  if (new Date(invite.expires_at) < new Date()) {
    return c.json({ error: 'This invite has expired' }, 400);
  }

  // Check if invite is for specific email
  if (invite.email && invite.email.toLowerCase() !== user.email.toLowerCase()) {
    return c.json({
      error: 'This invite is for a different email address',
      expected: invite.email,
    }, 403);
  }

  // Check if user is already in a team
  const existingMembership = await c.env.DB.prepare(`
    SELECT team_id FROM team_members WHERE user_id = ?
  `).bind(user.id).first();

  if (existingMembership) {
    return c.json({ error: 'You are already a member of a team' }, 400);
  }

  // Check seat availability one more time
  const memberCount = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM team_members WHERE team_id = ?
  `).bind(invite.team_id).first<{ count: number }>();

  if ((memberCount?.count || 0) >= invite.seats) {
    return c.json({ error: 'No seats available in this team' }, 403);
  }

  const now = new Date().toISOString();

  // Add user to team and mark invite as used
  // Note: User will go through simplified onboarding to add personal info
  await c.env.DB.batch([
    c.env.DB.prepare(`
      INSERT INTO team_members (team_id, user_id, role, joined_at)
      VALUES (?, ?, ?, ?)
    `).bind(invite.team_id, user.id, invite.role, now),

    c.env.DB.prepare(`
      UPDATE team_invites SET accepted_at = ?, accepted_by = ? WHERE id = ?
    `).bind(now, user.id, invite.id),
  ]);

  // Get team info for response
  const team = await c.env.DB.prepare(`
    SELECT * FROM teams WHERE id = ?
  `).bind(invite.team_id).first<Team>();

  return c.json({
    success: true,
    message: `You've joined ${team?.name || 'the team'}!`,
    team: team ? {
      id: team.id,
      name: team.name,
      slug: team.slug,
      tier: team.tier,
    } : null,
  });
});

// List team invites (for team admins)
app.get('/teams/invites', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const membership = await c.env.DB.prepare(`
    SELECT t.id FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE tm.user_id = ? AND tm.role IN ('owner', 'admin')
    LIMIT 1
  `).bind(user.id).first<{ id: string }>();

  if (!membership) {
    return c.json({ error: 'Not authorized' }, 403);
  }

  const result = await c.env.DB.prepare(`
    SELECT i.*, u.name as invited_by_name, a.name as accepted_by_name
    FROM team_invites i
    JOIN users u ON u.id = i.invited_by
    LEFT JOIN users a ON a.id = i.accepted_by
    WHERE i.team_id = ?
    ORDER BY i.created_at DESC
    LIMIT 50
  `).bind(membership.id).all();

  const baseUrl = c.env.ENVIRONMENT === 'production' ? 'https://recall.team' : 'http://localhost:3003';

  return c.json({
    invites: (result.results || []).map((i: Record<string, unknown>) => ({
      id: i.id,
      code: i.code,
      url: `${baseUrl}/invite/${i.code}`,
      email: i.email,
      role: i.role,
      invitedBy: i.invited_by_name,
      acceptedBy: i.accepted_by_name,
      expiresAt: i.expires_at,
      acceptedAt: i.accepted_at,
      createdAt: i.created_at,
      isActive: !i.accepted_at && new Date(i.expires_at as string) > new Date(),
    })),
  });
});

// Revoke an invite
app.delete('/invites/:code', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const code = c.req.param('code');

  // Verify user owns the team that created this invite
  const invite = await c.env.DB.prepare(`
    SELECT i.id, i.team_id
    FROM team_invites i
    JOIN team_members tm ON tm.team_id = i.team_id
    WHERE i.code = ? AND tm.user_id = ? AND tm.role IN ('owner', 'admin')
  `).bind(code, user.id).first<{ id: string; team_id: string }>();

  if (!invite) {
    return c.json({ error: 'Invite not found or not authorized' }, 404);
  }

  await c.env.DB.prepare(`
    DELETE FROM team_invites WHERE id = ?
  `).bind(invite.id).run();

  return c.json({ success: true });
});

// Remove a team member (admin only)
app.delete('/teams/members/:userId', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const targetUserId = c.req.param('userId');
  const fullDelete = c.req.query('fullDelete') === 'true';

  // Get user's team and verify they're the owner
  const membership = await c.env.DB.prepare(`
    SELECT tm.team_id, tm.role
    FROM team_members tm
    WHERE tm.user_id = ?
  `).bind(user.id).first<{ team_id: string; role: string }>();

  if (!membership || membership.role !== 'owner') {
    return c.json({ error: 'Only team owner can remove members' }, 403);
  }

  // Verify target user is in the same team
  const targetMembership = await c.env.DB.prepare(`
    SELECT id FROM team_members WHERE user_id = ? AND team_id = ?
  `).bind(targetUserId, membership.team_id).first<{ id: string }>();

  if (!targetMembership) {
    return c.json({ error: 'User not in your team' }, 404);
  }

  // Don't allow removing yourself
  if (targetUserId === user.id) {
    return c.json({ error: 'Cannot remove yourself' }, 400);
  }

  // Delete team membership
  await c.env.DB.prepare(`
    DELETE FROM team_members WHERE user_id = ? AND team_id = ?
  `).bind(targetUserId, membership.team_id).run();

  // Delete access logs for this user in this team
  await c.env.DB.prepare(`
    DELETE FROM memory_access_logs WHERE user_id = ? AND team_id = ?
  `).bind(targetUserId, membership.team_id).run();

  // If fullDelete, delete the entire user record
  if (fullDelete) {
    // This will cascade delete any other team memberships, etc.
    await c.env.DB.prepare(`
      DELETE FROM users WHERE id = ?
    `).bind(targetUserId).run();
  }

  return c.json({ success: true, fullDelete });
});

// ============================================================
// Memory Access Tracking
// ============================================================

// Log memory file access (called by MCP server)
app.post('/memory/access', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const membership = await c.env.DB.prepare(`
    SELECT team_id FROM team_members WHERE user_id = ? LIMIT 1
  `).bind(user.id).first<{ team_id: string }>();

  if (!membership) {
    return c.json({ error: 'No team' }, 400);
  }

  const body = await c.req.json<{
    fileType: 'small' | 'medium' | 'large';
    action?: 'read' | 'write';
    repoName?: string;
  }>();

  if (!body.fileType || !['small', 'medium', 'large'].includes(body.fileType)) {
    return c.json({ error: 'Invalid fileType' }, 400);
  }

  const id = generateId();
  const now = new Date().toISOString();

  await c.env.DB.prepare(`
    INSERT INTO memory_access_logs (id, team_id, user_id, repo_name, file_type, action, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    membership.team_id,
    user.id,
    body.repoName || null,
    body.fileType,
    body.action || 'read',
    now
  ).run();

  return c.json({ success: true });
});

// Get team activity (memory access logs)
app.get('/teams/activity', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const membership = await c.env.DB.prepare(`
    SELECT team_id FROM team_members WHERE user_id = ? LIMIT 1
  `).bind(user.id).first<{ team_id: string }>();

  if (!membership) {
    return c.json({ activity: [] });
  }

  // Get recent activity with user info
  const result = await c.env.DB.prepare(`
    SELECT
      mal.id,
      mal.file_type,
      mal.action,
      mal.repo_name,
      mal.created_at,
      u.id as user_id,
      u.name as user_name,
      u.avatar_url,
      u.github_username
    FROM memory_access_logs mal
    JOIN users u ON u.id = mal.user_id
    WHERE mal.team_id = ?
    ORDER BY mal.created_at DESC
    LIMIT 50
  `).bind(membership.team_id).all();

  return c.json({
    activity: (result.results || []).map((row: Record<string, unknown>) => ({
      id: row.id,
      fileType: row.file_type,
      action: row.action,
      repoName: row.repo_name,
      createdAt: row.created_at,
      user: {
        id: row.user_id,
        name: row.user_name,
        avatarUrl: row.avatar_url,
        githubUsername: row.github_username,
      },
    })),
  });
});

// ============================================================

// Get encryption key for user's team (requires valid seat)
app.get('/keys/team', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Get user's team membership
  const membership = await c.env.DB.prepare(`
    SELECT t.*, tm.role
    FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE tm.user_id = ?
    LIMIT 1
  `).bind(user.id).first<Team & { role: string }>();

  if (!membership) {
    return c.json({
      error: 'No team membership',
      message: 'Team memory available. Visit recall.team to subscribe.',
      hasAccess: false,
    }, 403);
  }

  // Check if user has activated a seat (license check)
  const body = await c.req.json<{ machineId?: string }>().catch(() => ({}));

  if (body.machineId) {
    // Verify this machine is activated
    const activation = await c.env.DB.prepare(`
      SELECT * FROM license_activations
      WHERE team_id = ? AND user_id = ? AND machine_id = ?
    `).bind(membership.id, user.id, body.machineId).first();

    if (!activation) {
      // Check if we can auto-activate (seats available)
      const activationsCount = await c.env.DB.prepare(`
        SELECT COUNT(*) as count FROM license_activations WHERE team_id = ?
      `).bind(membership.id).first<{ count: number }>();

      const seatsUsed = activationsCount?.count || 0;

      if (seatsUsed >= membership.seats) {
        return c.json({
          error: 'No seats available',
          message: 'All seats are in use. Contact your team admin.',
          hasAccess: false,
          seatsUsed,
          seats: membership.seats,
        }, 403);
      }

      // Auto-activate this machine
      const activationId = generateId();
      const now = new Date().toISOString();

      await c.env.DB.prepare(`
        INSERT INTO license_activations (id, team_id, user_id, machine_id, last_seen_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(activationId, membership.id, user.id, body.machineId, now, now).run();
    } else {
      // Update last_seen
      await c.env.DB.prepare(`
        UPDATE license_activations SET last_seen_at = datetime('now')
        WHERE team_id = ? AND machine_id = ?
      `).bind(membership.id, body.machineId).run();
    }
  }

  // Track MCP connection for this user
  await c.env.DB.prepare(`
    UPDATE users SET last_mcp_connection = datetime('now') WHERE id = ?
  `).bind(user.id).run();

  // Get the encryption key
  const teamKey = await c.env.DB.prepare(`
    SELECT encryption_key, key_version FROM team_keys WHERE team_id = ?
  `).bind(membership.id).first<{ encryption_key: string; key_version: number }>();

  if (!teamKey) {
    // This shouldn't happen - create key if missing (legacy teams)
    const keyId = generateId();
    const encryptionKey = await generateEncryptionKey();
    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      INSERT INTO team_keys (id, team_id, encryption_key, key_version, created_at)
      VALUES (?, ?, ?, 1, ?)
    `).bind(keyId, membership.id, encryptionKey, now).run();

    return c.json({
      hasAccess: true,
      key: encryptionKey,
      keyVersion: 1,
      teamId: membership.id,
      teamSlug: membership.slug,
    });
  }

  return c.json({
    hasAccess: true,
    key: teamKey.encryption_key,
    keyVersion: teamKey.key_version,
    teamId: membership.id,
    teamSlug: membership.slug,
  });
});

// Rotate team encryption key (admin only)
app.post('/keys/rotate', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Get user's team membership and verify admin/owner role
  const membership = await c.env.DB.prepare(`
    SELECT t.*, tm.role
    FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE tm.user_id = ? AND tm.role IN ('owner', 'admin')
    LIMIT 1
  `).bind(user.id).first<Team & { role: string }>();

  if (!membership) {
    return c.json({ error: 'Forbidden - requires admin or owner role' }, 403);
  }

  // Generate new key
  const newKey = await generateEncryptionKey();
  const now = new Date().toISOString();

  await c.env.DB.prepare(`
    UPDATE team_keys
    SET encryption_key = ?, key_version = key_version + 1, rotated_at = ?
    WHERE team_id = ?
  `).bind(newKey, now, membership.id).run();

  // Get updated key info
  const teamKey = await c.env.DB.prepare(`
    SELECT key_version FROM team_keys WHERE team_id = ?
  `).bind(membership.id).first<{ key_version: number }>();

  return c.json({
    success: true,
    keyVersion: teamKey?.key_version || 1,
    rotatedAt: now,
    message: 'Key rotated. All team members will need to re-encrypt their local files.',
  });
});

// ============================================================
// Summarization endpoint
// ============================================================

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
    finishReason: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
  };
}

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as GeminiResponse;
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

const SMALL_SUMMARY_PROMPT = `You are a technical writer creating concise team context for AI coding assistants.

Your output will be read by an AI at the start of every coding session to give it instant context about the project.

Create a small.md file (~500 tokens max) with this structure:

# [Project Name] - Team Context

Sessions: [count] | Last: [date]
Tokens: small ~[X] | medium ~[X] | large ~[X]

## What It Is
[One paragraph: what this project does, core value prop]

## Current Status
- **Phase:** [current phase]
- **Working:** [key things that work]
- **Blocked:** [blockers if any]

## Recent Decisions
- [Decision 1 with WHY, not just what]
- [Decision 2 with WHY]
- [Decision 3 with WHY]

## Don't Repeat These Mistakes
- [Failed approach 1 and why it failed]
- [Failed approach 2 and why it failed]

## Key Files
- **[path]** - [what it does]
- **[path]** - [what it does]

---
*medium.md = session history | large.md = full transcripts*

RULES:
- Be SPECIFIC. Names, paths, versions, not vague descriptions.
- Include WHY decisions were made, not just WHAT.
- Failed experiments are valuable - capture them.
- Keep it scannable - an AI will read this in 2 seconds.`;

const MEDIUM_SUMMARY_PROMPT = `You are a technical writer creating session history for AI coding assistants.

Your output captures the development journey so AI can understand what happened and avoid repeating mistakes.

Create a medium.md file (~4k tokens) with this structure:

# [Project Name] - Development History

Sessions: [count] | Updated: [date]

## [Date] (Session N): [Session Title]

### What Was Done
[2-3 paragraphs describing the work, decisions made, files changed]

### Key Decisions
- **[Decision]:** [Reasoning - the WHY is critical]

### Files Changed
- \`[path]\` - [what changed and why]

### Gotchas/Lessons
- [Anything surprising or important to remember]

### What Failed (if applicable)
- **Tried:** [approach]
- **Failed because:** [reason]
- **Don't repeat:** [explicit warning]

---

[Repeat for each session, most recent first]

---
*See large.md for complete chat transcripts*

RULES:
- Group by session, most recent first
- Include the REASONING behind decisions
- Failed experiments get their own section with "Don't Repeat This"
- Be specific about files, not vague about "various files"
- This should read like a development journal`;

app.post('/summarize', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const body = await c.req.json<{ events?: RecallEvent[]; projectName?: string }>();

  if (!body.events || !Array.isArray(body.events)) {
    return c.json({ error: 'Missing events array' }, 400);
  }

  if (body.events.length === 0) {
    return c.json({
      small: '# Team Context\n\n_No sessions to summarize._\n',
      medium: '# Session History\n\n_No sessions to summarize._\n',
    });
  }

  // If no Gemini key, return template-based summaries
  if (!c.env.GEMINI_API_KEY) {
    console.warn('No GEMINI_API_KEY set, using template-based summaries');
    return c.json({
      small: generateSmallSummary(body.events),
      medium: generateMediumSummary(body.events),
    });
  }

  try {
    // Format events for Gemini
    const eventsText = body.events.map(e => {
      const date = e.ts.split('T')[0];
      const time = e.ts.split('T')[1]?.split('.')[0] || '';
      const files = e.files?.length ? ` | Files: ${e.files.join(', ')}` : '';
      return `[${date} ${time}] ${e.type.toUpperCase()} (${e.tool}, ${e.user}): ${e.summary}${files}`;
    }).join('\n');

    const projectName = body.projectName || 'Project';
    const sessionCount = body.events.filter(e => e.type === 'session').length || body.events.length;
    const lastDate = body.events[body.events.length - 1]?.ts.split('T')[0] || new Date().toISOString().split('T')[0];

    const userPrompt = `Project: ${projectName}
Sessions: ${sessionCount}
Last Updated: ${lastDate}

Here are the development events to summarize:

${eventsText}

Generate the summary now.`;

    // Generate both summaries in parallel
    const [small, medium] = await Promise.all([
      callGemini(c.env.GEMINI_API_KEY, SMALL_SUMMARY_PROMPT, userPrompt),
      callGemini(c.env.GEMINI_API_KEY, MEDIUM_SUMMARY_PROMPT, userPrompt),
    ]);

    return c.json({ small, medium });
  } catch (error) {
    console.error('Summarization error:', error);
    // Fallback to template-based on error
    return c.json({
      small: generateSmallSummary(body.events),
      medium: generateMediumSummary(body.events),
      warning: 'AI summarization failed, using template fallback',
    });
  }
});

// ============================================================
// Helper functions
// ============================================================

function formatUser(email: string): string {
  const name = email.split('@')[0];
  return `@${name}`;
}

function generateSmallSummary(events: RecallEvent[]): string {
  const recentEvents = events.slice(-20);
  const lastUpdated = events[events.length - 1].ts.split('T')[0];

  const decisions = recentEvents.filter(e => e.type === 'decision');
  const errors = recentEvents.filter(e => e.type === 'error_resolved');
  const sessions = recentEvents.filter(e => e.type === 'session');

  let content = `# Team Context

Last updated: ${lastUpdated}

`;

  if (sessions.length > 0) {
    const recent = sessions[sessions.length - 1];
    content += `## Current Focus
${recent.summary}

`;
  }

  if (decisions.length > 0) {
    content += `## Key Decisions
`;
    for (const d of decisions.slice(-5)) {
      content += `- ${d.summary} (${formatUser(d.user)}, ${d.ts.split('T')[0]})\n`;
    }
    content += '\n';
  }

  if (errors.length > 0) {
    content += `## Avoid These
`;
    for (const e of errors.slice(-3)) {
      content += `- ${e.summary}\n`;
    }
    content += '\n';
  }

  return content;
}

function generateMediumSummary(events: RecallEvent[]): string {
  const grouped = new Map<string, RecallEvent[]>();

  for (const event of events.slice(-100)) {
    const date = event.ts.split('T')[0];
    if (!grouped.has(date)) grouped.set(date, []);
    grouped.get(date)!.push(event);
  }

  let content = `# Session History

`;

  const dates = Array.from(grouped.keys()).sort().reverse().slice(0, 14);

  for (const date of dates) {
    content += `## ${date}\n\n`;
    for (const e of grouped.get(date)!) {
      const icon = e.type === 'decision' ? ' [decision]' : e.type === 'error_resolved' ? ' [fix]' : '';
      content += `- ${formatUser(e.user)} (${e.tool}): ${e.summary}${icon}\n`;
    }
    content += '\n';
  }

  return content;
}

// ============================================================
// Install script endpoint
// ============================================================

app.get('/i', (_c) => {
  const script = `#!/bin/bash
# Recall CLI Installer
# https://recall.team

set -e

echo "Installing Recall..."

# Detect OS and architecture
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$ARCH" in
  x86_64) ARCH="x64" ;;
  arm64|aarch64) ARCH="arm64" ;;
  *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

# Install via npm (for now)
if command -v npm &> /dev/null; then
  npm install -g recall-cli
else
  echo "npm not found. Please install Node.js first."
  echo "https://nodejs.org"
  exit 1
fi

echo ""
echo "✓ Recall installed successfully!"
echo ""
echo "Next steps:"
echo "  1. Run 'recall auth' to authenticate with GitHub"
echo "  2. Run 'recall init' in any git repository"
echo "  3. Use your AI coding assistant"
echo "  4. Run 'recall save' to capture context"
echo ""
`;

  return new Response(script, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
});

export default app;
