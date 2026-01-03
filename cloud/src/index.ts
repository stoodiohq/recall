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
  ANTHROPIC_API_KEY?: string;
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
  const scope = 'read:user user:email';

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
        INSERT INTO users (id, email, name, avatar_url, github_id, github_username, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        userId,
        email,
        githubUser.name,
        githubUser.avatar_url,
        String(githubUser.id),
        githubUser.login,
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
        created_at: now,
        updated_at: now,
      };
    } else {
      // Update user info
      await c.env.DB.prepare(`
        UPDATE users SET email = ?, name = ?, avatar_url = ?, github_username = ?, updated_at = ?
        WHERE id = ?
      `).bind(
        email,
        githubUser.name,
        githubUser.avatar_url,
        githubUser.login,
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
    redirectUrl.pathname = '/auth/callback';
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

  // Count active license activations
  const activationsCount = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM license_activations WHERE team_id = ?
  `).bind(membership.id).first<{ count: number }>();

  const seatsUsed = activationsCount?.count || 0;

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
  const now = new Date().toISOString();

  // Create team
  await c.env.DB.prepare(`
    INSERT INTO teams (id, name, slug, owner_id, tier, seats, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(teamId, body.name, slug, user.id, body.tier, tierConfig.seats, now, now).run();

  // Add user as owner
  await c.env.DB.prepare(`
    INSERT INTO team_members (team_id, user_id, role, joined_at)
    VALUES (?, ?, 'owner', ?)
  `).bind(teamId, user.id, now).run();

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
// Summarization endpoint
// ============================================================

app.post('/summarize', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const body = await c.req.json<{ events?: RecallEvent[] }>();

  if (!body.events || !Array.isArray(body.events)) {
    return c.json({ error: 'Missing events array' }, 400);
  }

  if (body.events.length === 0) {
    return c.json({
      small: '# Team Context\n\n_No sessions to summarize._\n',
      medium: '# Session History\n\n_No sessions to summarize._\n',
    });
  }

  // If no Anthropic key, return template-based summaries
  if (!c.env.ANTHROPIC_API_KEY) {
    return c.json({
      small: generateSmallSummary(body.events),
      medium: generateMediumSummary(body.events),
    });
  }

  // TODO: Call Claude API for AI-powered summarization
  // For now, use template-based summaries
  return c.json({
    small: generateSmallSummary(body.events),
    medium: generateMediumSummary(body.events),
  });
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
