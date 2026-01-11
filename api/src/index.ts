/**
 * Recall Cloud API
 * Cloudflare Workers + Hono + D1
 *
 * Auth Endpoints:
 * - GET /auth/github - Start GitHub OAuth flow
 * - GET /auth/github/callback - Handle OAuth callback
 * - GET /auth/linear - Start Linear OAuth flow
 * - GET /auth/linear/callback - Handle Linear OAuth callback
 * - GET /auth/me - Current user info
 * - POST /auth/logout - End session
 * - POST /auth/exchange - Exchange auth code for JWT
 * - POST /auth/token - Generate API token
 * - GET /auth/tokens - List API tokens
 * - DELETE /auth/tokens/:tokenId - Delete API token
 *
 * Team CRUD Endpoints:
 * - POST /teams - Create team
 * - GET /teams/:id - Get team by ID (or 'me' for current user's team)
 * - PATCH /teams/:id - Update team (name, website, industry)
 * - DELETE /teams/:id - Delete team (owner only)
 * - POST /teams/:id/transfer - Transfer ownership
 *
 * Team Members Endpoints:
 * - GET /teams/:id/members - List members with stats
 * - PATCH /teams/:id/members/:userId - Update member role
 * - DELETE /teams/members/:userId - Remove member
 * - GET /teams/:id/invite-link - Get/regenerate invite link
 *
 * Team Invites Endpoints:
 * - POST /teams/invite - Create invite link
 * - GET /invites/:code - Get invite details
 * - POST /invites/:code/accept - Accept invite
 * - GET /teams/invites - List team invites
 * - DELETE /invites/:code - Revoke invite
 *
 * Stats Endpoints:
 * - GET /teams/:id/stats - Team-wide stats
 * - GET /teams/:id/members/:userId/stats - Per-member stats
 *
 * Activity/Session Endpoints:
 * - GET /teams/:id/repos/:repoId/sessions - List sessions for repo
 * - GET /teams/:id/repos/:repoId/context - Get current context.md
 * - GET /teams/activity - Get team activity feed
 * - POST /memory/access - Log memory file access
 *
 * Billing Endpoints:
 * - GET /teams/:id/billing - Billing overview
 * - GET /teams/:id/billing/invoices - List invoices
 * - POST /checkout/create-session - Create Stripe checkout
 * - POST /checkout/portal - Get Stripe customer portal
 * - POST /webhooks/stripe - Stripe webhook handler
 * - POST /webhooks/linear - Linear webhook handler
 *
 * Enterprise BYOK Endpoints:
 * - GET /teams/:id/llm-key - Check if LLM key configured
 * - POST /teams/:id/llm-key - Add/update LLM API key
 * - DELETE /teams/:id/llm-key - Remove LLM key
 * - POST /teams/:id/llm-key/test - Test LLM key validity
 *
 * Repository Endpoints:
 * - GET /repos - Get enabled repos for team
 * - POST /repos - Add a new repo
 * - POST /repos/:repoId/toggle - Toggle repo enabled status
 * - POST /repos/:repoId/initialize - Initialize repo with .recall/
 * - GET /github/repos - Get user's GitHub repos
 *
 * License Endpoints:
 * - GET /license/check - Validate license
 * - POST /license/activate - Activate machine
 *
 * Key Management:
 * - GET /keys/team - Get team encryption key
 * - POST /keys/rotate - Rotate encryption key
 *
 * Other:
 * - GET /health - Health check
 * - POST /summarize - Get AI summaries for events
 * - GET /i - Install script
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
  // Stripe
  STRIPE_SECRET_KEY: string;
  STRIPE_PRICE_ID: string;
  STRIPE_WEBHOOK_SECRET?: string;
  // Linear
  LINEAR_CLIENT_ID?: string;
  LINEAR_CLIENT_SECRET?: string;
  LINEAR_WEBHOOK_SECRET?: string;
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
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_status?: string;
}

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: ['https://recall.team', 'https://recall-web-e2p.pages.dev', 'http://localhost:3000', 'http://localhost:3003'],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
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

// Role hierarchy for permission checks
type TeamRole = 'owner' | 'admin' | 'developer' | 'member';
const ROLE_HIERARCHY: Record<TeamRole, number> = {
  owner: 100,
  admin: 50,
  developer: 10,
  member: 10, // Same as developer for backwards compatibility
};

interface TeamMembership {
  teamId: string;
  teamName: string;
  teamSlug: string;
  tier: string;
  seats: number;
  role: TeamRole;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: string;
}

// Get user's team membership with role
async function getUserTeamMembership(
  db: D1Database,
  userId: string,
  teamId?: string
): Promise<TeamMembership | null> {
  let query = `
    SELECT t.id as team_id, t.name as team_name, t.slug as team_slug, t.tier, t.seats,
           t.stripe_customer_id, t.stripe_subscription_id, t.subscription_status,
           tm.role
    FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE tm.user_id = ?
  `;
  const params: (string | undefined)[] = [userId];

  if (teamId) {
    query += ' AND t.id = ?';
    params.push(teamId);
  }

  query += ' LIMIT 1';

  const result = await db.prepare(query).bind(...params).first<{
    team_id: string;
    team_name: string;
    team_slug: string;
    tier: string;
    seats: number;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    subscription_status: string | null;
    role: TeamRole;
  }>();

  if (!result) return null;

  return {
    teamId: result.team_id,
    teamName: result.team_name,
    teamSlug: result.team_slug,
    tier: result.tier,
    seats: result.seats,
    role: result.role,
    stripeCustomerId: result.stripe_customer_id || undefined,
    stripeSubscriptionId: result.stripe_subscription_id || undefined,
    subscriptionStatus: result.subscription_status || undefined,
  };
}

// Check if user has required role
function hasRole(userRole: TeamRole, requiredRole: TeamRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

// Check if user can manage (owner or admin)
function canManage(role: TeamRole): boolean {
  return hasRole(role, 'admin');
}

// ============================================================
// Stripe Webhook Signature Verification
// ============================================================

async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  // Parse the signature header (format: t=timestamp,v1=signature)
  const parts = signature.split(',');
  const timestampPart = parts.find(p => p.startsWith('t='));
  const signaturePart = parts.find(p => p.startsWith('v1='));

  if (!timestampPart || !signaturePart) {
    return false;
  }

  const timestamp = timestampPart.slice(2);
  const expectedSig = signaturePart.slice(3);

  // Verify timestamp is within 5 minutes to prevent replay attacks
  const timestampAge = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
  if (timestampAge > 300) {
    console.error('[Stripe] Webhook timestamp too old:', timestampAge, 'seconds');
    return false;
  }

  // Compute expected signature
  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signedPayload)
  );

  const computedSig = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time comparison to prevent timing attacks
  if (computedSig.length !== expectedSig.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < computedSig.length; i++) {
    result |= computedSig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
  }

  return result === 0;
}

// ============================================================
// GitHub OAuth endpoints
// ============================================================

app.get('/auth/github', (c) => {
  const clientId = c.env.GITHUB_CLIENT_ID;
  const redirectUri = c.env.ENVIRONMENT === 'production'
    ? 'https://api.recall.team/auth/github/callback'
    : 'http://localhost:8787/auth/github/callback';

  const state = crypto.randomUUID();
  // Request repo scope to access user's repositories
  const scope = 'read:user user:email repo';

  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('state', state);

  // Store state in a secure, HTTP-only cookie for CSRF protection
  const isProduction = c.env.ENVIRONMENT === 'production';
  const cookieOptions = [
    `oauth_state=${state}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=600', // 10 minutes
    isProduction ? 'Secure' : '',
  ].filter(Boolean).join('; ');

  return new Response(null, {
    status: 302,
    headers: {
      'Location': authUrl.toString(),
      'Set-Cookie': cookieOptions,
    },
  });
});

app.get('/auth/github/callback', async (c) => {
  const code = c.req.query('code');
  const error = c.req.query('error');
  const stateParam = c.req.query('state');

  if (error) {
    return c.json({ error: `GitHub OAuth error: ${error}` }, 400);
  }

  if (!code) {
    return c.json({ error: 'Missing authorization code' }, 400);
  }

  // Validate OAuth state to prevent CSRF attacks
  const cookies = c.req.header('Cookie') || '';
  const stateCookie = cookies.split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('oauth_state='));
  const storedState = stateCookie?.split('=')[1];

  if (!stateParam || !storedState || stateParam !== storedState) {
    console.error('[OAuth] State mismatch - possible CSRF attack', { stateParam, storedState: storedState ? '[present]' : '[missing]' });
    return c.json({ error: 'Invalid state parameter' }, 400);
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

    // Web auth: redirect with short-lived auth code (not the JWT directly)
    // This prevents token exposure in URLs, logs, and referrer headers
    const authCode = crypto.randomUUID();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Clean up expired codes
    await c.env.DB.prepare('DELETE FROM auth_codes WHERE expires_at < ?').bind(Date.now()).run();

    // Store the auth code -> JWT mapping in D1
    await c.env.DB.prepare(
      'INSERT INTO auth_codes (code, jwt, expires_at) VALUES (?, ?, ?)'
    ).bind(authCode, sessionToken, expiresAt).run();

    const redirectUrl = new URL(c.env.ENVIRONMENT === 'production' ? 'https://recall.team' : 'http://localhost:3003');

    // Check if user needs onboarding
    const needsOnboarding = !user.onboarding_completed;
    redirectUrl.pathname = needsOnboarding ? '/onboarding' : '/dashboard';
    redirectUrl.searchParams.set('code', authCode);

    // Clear the OAuth state cookie
    const isProduction = c.env.ENVIRONMENT === 'production';
    const clearCookieOptions = [
      'oauth_state=',
      'Path=/',
      'HttpOnly',
      'Max-Age=0',
      isProduction ? 'Secure' : '',
    ].filter(Boolean).join('; ');

    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirectUrl.toString(),
        'Set-Cookie': clearCookieOptions,
      },
    });

  } catch (err) {
    console.error('OAuth error:', err);
    return c.json({ error: 'Authentication failed' }, 500);
  }
});

// Exchange auth code for JWT token (POST to avoid token in URL/logs)
app.post('/auth/exchange', async (c) => {
  const body = await c.req.json() as { code?: string };
  const { code } = body;

  if (!code) {
    return c.json({ error: 'Missing authorization code' }, 400);
  }

  // Look up auth code in D1 (not in-memory, since Workers are stateless)
  const stored = await c.env.DB.prepare(
    'SELECT jwt, expires_at FROM auth_codes WHERE code = ?'
  ).bind(code).first<{ jwt: string; expires_at: number }>();

  if (!stored) {
    return c.json({ error: 'Invalid or expired authorization code' }, 400);
  }

  if (stored.expires_at < Date.now()) {
    // Delete expired code
    await c.env.DB.prepare('DELETE FROM auth_codes WHERE code = ?').bind(code).run();
    return c.json({ error: 'Authorization code expired' }, 400);
  }

  // Delete the code after use (one-time use)
  await c.env.DB.prepare('DELETE FROM auth_codes WHERE code = ?').bind(code).run();

  return c.json({ token: stored.jwt });
});

// ============================================================
// Linear OAuth endpoints
// ============================================================

// Start Linear OAuth flow
app.get('/auth/linear', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized - login with GitHub first' }, 401);
  }

  const clientId = c.env.LINEAR_CLIENT_ID;
  if (!clientId) {
    return c.json({ error: 'Linear integration not configured' }, 500);
  }

  const redirectUri = c.env.ENVIRONMENT === 'production'
    ? 'https://api.recall.team/auth/linear/callback'
    : 'http://localhost:8787/auth/linear/callback';

  // Include user ID in state for callback
  const state = `${crypto.randomUUID()}:${user.id}`;

  // Linear OAuth scopes: read access to issues, projects, teams, comments
  const scope = 'read,write,issues:create,comments:create';

  const authUrl = new URL('https://linear.app/oauth/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('prompt', 'consent');

  // Store state in cookie for CSRF protection
  const isProduction = c.env.ENVIRONMENT === 'production';
  const cookieOptions = [
    `linear_oauth_state=${state}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=600', // 10 minutes
    isProduction ? 'Secure' : '',
  ].filter(Boolean).join('; ');

  return new Response(null, {
    status: 302,
    headers: {
      'Location': authUrl.toString(),
      'Set-Cookie': cookieOptions,
    },
  });
});

// Handle Linear OAuth callback
app.get('/auth/linear/callback', async (c) => {
  const code = c.req.query('code');
  const error = c.req.query('error');
  const stateParam = c.req.query('state');

  if (error) {
    const baseUrl = c.env.ENVIRONMENT === 'production' ? 'https://recall.team' : 'http://localhost:3003';
    return c.redirect(`${baseUrl}/dashboard/integrations?error=${encodeURIComponent(error)}`);
  }

  if (!code || !stateParam) {
    return c.json({ error: 'Missing authorization code or state' }, 400);
  }

  // Validate OAuth state
  const cookies = c.req.header('Cookie') || '';
  const stateCookie = cookies.split(';')
    .map(cookie => cookie.trim())
    .find(cookie => cookie.startsWith('linear_oauth_state='));
  const storedState = stateCookie?.split('=')[1];

  if (!storedState || stateParam !== storedState) {
    console.error('[Linear OAuth] State mismatch');
    return c.json({ error: 'Invalid state parameter' }, 400);
  }

  // Extract user ID from state
  const [, userId] = stateParam.split(':');
  if (!userId) {
    return c.json({ error: 'Invalid state format' }, 400);
  }

  const clientId = c.env.LINEAR_CLIENT_ID;
  const clientSecret = c.env.LINEAR_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return c.json({ error: 'Linear integration not configured' }, 500);
  }

  const redirectUri = c.env.ENVIRONMENT === 'production'
    ? 'https://api.recall.team/auth/linear/callback'
    : 'http://localhost:8787/auth/linear/callback';

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://api.linear.app/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
    });

    const tokenData = await tokenResponse.json() as {
      access_token?: string;
      token_type?: string;
      expires_in?: number;
      scope?: string;
      error?: string;
      error_description?: string;
    };

    if (tokenData.error || !tokenData.access_token) {
      console.error('[Linear OAuth] Token error:', tokenData.error, tokenData.error_description);
      return c.json({ error: tokenData.error_description || 'Failed to get access token' }, 400);
    }

    // Get Linear user/org info
    const linearUserResponse = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query {
            viewer {
              id
              name
              email
            }
            organization {
              id
              name
              urlKey
            }
          }
        `,
      }),
    });

    const linearData = await linearUserResponse.json() as {
      data?: {
        viewer: { id: string; name: string; email: string };
        organization: { id: string; name: string; urlKey: string };
      };
      errors?: Array<{ message: string }>;
    };

    if (linearData.errors || !linearData.data) {
      console.error('[Linear OAuth] GraphQL error:', linearData.errors);
      return c.json({ error: 'Failed to get Linear user info' }, 400);
    }

    const { viewer, organization } = linearData.data;
    const now = new Date().toISOString();

    // Get user's team
    const membership = await getUserTeamMembership(c.env.DB, userId);
    if (!membership) {
      return c.json({ error: 'User is not a member of any team' }, 400);
    }

    // Store or update Linear connection
    const existingConnection = await c.env.DB.prepare(
      'SELECT id FROM linear_connections WHERE team_id = ? AND linear_org_id = ?'
    ).bind(membership.teamId, organization.id).first<{ id: string }>();

    if (existingConnection) {
      // Update existing connection
      await c.env.DB.prepare(`
        UPDATE linear_connections
        SET access_token = ?, linear_user_id = ?, linear_user_name = ?, linear_user_email = ?,
            linear_org_name = ?, linear_org_url_key = ?, scope = ?, connected_by_user_id = ?, updated_at = ?
        WHERE id = ?
      `).bind(
        tokenData.access_token,
        viewer.id,
        viewer.name,
        viewer.email,
        organization.name,
        organization.urlKey,
        tokenData.scope || '',
        userId,
        now,
        existingConnection.id
      ).run();
    } else {
      // Create new connection
      const connectionId = generateId();
      await c.env.DB.prepare(`
        INSERT INTO linear_connections (id, team_id, access_token, linear_org_id, linear_org_name, linear_org_url_key,
          linear_user_id, linear_user_name, linear_user_email, scope, connected_by_user_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        connectionId,
        membership.teamId,
        tokenData.access_token,
        organization.id,
        organization.name,
        organization.urlKey,
        viewer.id,
        viewer.name,
        viewer.email,
        tokenData.scope || '',
        userId,
        now,
        now
      ).run();
    }

    // Clear the OAuth state cookie and redirect to success page
    const isProduction = c.env.ENVIRONMENT === 'production';
    const baseUrl = isProduction ? 'https://recall.team' : 'http://localhost:3003';
    const clearCookieOptions = [
      'linear_oauth_state=',
      'Path=/',
      'HttpOnly',
      'Max-Age=0',
      isProduction ? 'Secure' : '',
    ].filter(Boolean).join('; ');

    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${baseUrl}/dashboard/integrations?linear=connected`,
        'Set-Cookie': clearCookieOptions,
      },
    });

  } catch (err) {
    console.error('[Linear OAuth] Error:', err);
    return c.json({ error: 'Authentication failed' }, 500);
  }
});

// Get Linear connection status for current user's team
app.get('/auth/linear/status', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const membership = await getUserTeamMembership(c.env.DB, user.id);
  if (!membership) {
    return c.json({ connected: false });
  }

  const connection = await c.env.DB.prepare(`
    SELECT linear_org_name, linear_org_url_key, linear_user_name, connected_by_user_id, created_at
    FROM linear_connections
    WHERE team_id = ?
    LIMIT 1
  `).bind(membership.teamId).first<{
    linear_org_name: string;
    linear_org_url_key: string;
    linear_user_name: string;
    connected_by_user_id: string;
    created_at: string;
  }>();

  if (!connection) {
    return c.json({ connected: false });
  }

  return c.json({
    connected: true,
    organization: {
      name: connection.linear_org_name,
      urlKey: connection.linear_org_url_key,
    },
    connectedBy: connection.linear_user_name,
    connectedAt: connection.created_at,
  });
});

// Disconnect Linear
app.delete('/auth/linear', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const membership = await getUserTeamMembership(c.env.DB, user.id);
  if (!membership) {
    return c.json({ error: 'Not a team member' }, 400);
  }

  if (!canManage(membership.role)) {
    return c.json({ error: 'Admin access required' }, 403);
  }

  await c.env.DB.prepare('DELETE FROM linear_connections WHERE team_id = ?')
    .bind(membership.teamId).run();

  return c.json({ success: true });
});

// ============================================================
// Linear Webhook Handler
// ============================================================

async function verifyLinearWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(payload)
    );

    const computedSig = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Constant-time comparison
    if (computedSig.length !== signature.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < computedSig.length; i++) {
      result |= computedSig.charCodeAt(i) ^ signature.charCodeAt(i);
    }

    return result === 0;
  } catch {
    return false;
  }
}

interface LinearWebhookPayload {
  action: 'create' | 'update' | 'remove';
  type: 'Issue' | 'Comment' | 'Project' | 'Cycle' | 'IssueLabel';
  createdAt: string;
  data: {
    id: string;
    title?: string;
    description?: string;
    state?: { name: string };
    team?: { key: string };
    project?: { name: string };
    assignee?: { name: string };
    creator?: { name: string };
    priority?: number;
    [key: string]: unknown;
  };
  url?: string;
  organizationId: string;
}

app.post('/webhooks/linear', async (c) => {
  const payload = await c.req.text();
  const signature = c.req.header('linear-signature');

  // Verify webhook signature if secret is configured
  if (c.env.LINEAR_WEBHOOK_SECRET) {
    if (!signature) {
      console.error('[Linear Webhook] Missing signature header');
      return c.json({ error: 'Missing signature' }, 401);
    }

    const isValid = await verifyLinearWebhookSignature(payload, signature, c.env.LINEAR_WEBHOOK_SECRET);
    if (!isValid) {
      console.error('[Linear Webhook] Invalid signature');
      return c.json({ error: 'Invalid signature' }, 401);
    }
  } else {
    console.warn('[Linear Webhook] LINEAR_WEBHOOK_SECRET not configured - skipping signature verification');
  }

  let event: LinearWebhookPayload;
  try {
    event = JSON.parse(payload);
  } catch {
    console.error('[Linear Webhook] Invalid JSON');
    return c.json({ error: 'Invalid payload' }, 400);
  }

  console.log('[Linear Webhook] Event:', event.type, event.action, 'org:', event.organizationId);

  // Find the team associated with this Linear organization
  const connection = await c.env.DB.prepare(`
    SELECT team_id FROM linear_connections WHERE linear_org_id = ?
  `).bind(event.organizationId).first<{ team_id: string }>();

  if (!connection) {
    console.log('[Linear Webhook] No team connected for org:', event.organizationId);
    // Return 200 to acknowledge receipt (Linear will retry on non-2xx)
    return c.json({ received: true, processed: false, reason: 'No team connected for this organization' });
  }

  const now = new Date().toISOString();

  // Log the webhook event for future use
  // This can be extended to trigger notifications, sync data, etc.
  try {
    await c.env.DB.prepare(`
      INSERT INTO linear_webhook_events (id, team_id, linear_org_id, event_type, event_action, event_data, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      generateId(),
      connection.team_id,
      event.organizationId,
      event.type,
      event.action,
      JSON.stringify(event.data),
      now
    ).run();
  } catch (err) {
    // Table might not exist yet - log but don't fail
    console.warn('[Linear Webhook] Failed to log event:', err);
  }

  // Handle specific event types as needed
  // For now, just acknowledge receipt
  return c.json({
    received: true,
    processed: true,
    teamId: connection.team_id,
    eventType: event.type,
    eventAction: event.action,
  });
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

// Logout - clear session/token
app.post('/auth/logout', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // If using API token, we could invalidate it here
  // For JWT, we just return success since JWTs are stateless
  // The client should clear their stored token

  return c.json({
    success: true,
    message: 'Logged out successfully',
  });
});

// ============================================================
// Team CRUD endpoints
// ============================================================

// Get team by ID
app.get('/teams/:id', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const teamId = c.req.param('id');

  // Handle 'me' as alias for current user's team
  if (teamId === 'me') {
    const membership = await getUserTeamMembership(c.env.DB, user.id);
    if (!membership) {
      return c.json({ team: null });
    }

    // Get team members
    const membersResult = await c.env.DB.prepare(`
      SELECT u.id, u.email, u.name, u.avatar_url, u.github_username, tm.role, tm.joined_at
      FROM users u
      JOIN team_members tm ON tm.user_id = u.id
      WHERE tm.team_id = ?
      ORDER BY tm.joined_at
    `).bind(membership.teamId).all();

    return c.json({
      team: {
        id: membership.teamId,
        name: membership.teamName,
        slug: membership.teamSlug,
        tier: membership.tier,
        seats: membership.seats,
        role: membership.role,
        members: membersResult.results || [],
      },
    });
  }

  // Get specific team by ID
  const membership = await getUserTeamMembership(c.env.DB, user.id, teamId);
  if (!membership) {
    return c.json({ error: 'Team not found or access denied' }, 404);
  }

  // Get team details
  const team = await c.env.DB.prepare(`
    SELECT t.*, u.name as owner_name, u.github_username as owner_github
    FROM teams t
    JOIN users u ON u.id = t.owner_id
    WHERE t.id = ?
  `).bind(teamId).first<Team & { owner_name: string; owner_github: string }>();

  if (!team) {
    return c.json({ error: 'Team not found' }, 404);
  }

  // Get team members
  const membersResult = await c.env.DB.prepare(`
    SELECT u.id, u.email, u.name, u.avatar_url, u.github_username, tm.role, tm.joined_at
    FROM users u
    JOIN team_members tm ON tm.user_id = u.id
    WHERE tm.team_id = ?
    ORDER BY tm.joined_at
  `).bind(teamId).all();

  return c.json({
    team: {
      id: team.id,
      name: team.name,
      slug: team.slug,
      tier: team.tier,
      seats: team.seats,
      role: membership.role,
      owner: {
        name: team.owner_name,
        github: team.owner_github,
      },
      members: membersResult.results || [],
      subscriptionStatus: team.subscription_status,
      createdAt: team.created_at,
    },
  });
});

// Update team (name, website, industry) - requires admin role
app.patch('/teams/:id', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const teamId = c.req.param('id');
  const membership = await getUserTeamMembership(c.env.DB, user.id, teamId);

  if (!membership) {
    return c.json({ error: 'Team not found or access denied' }, 404);
  }

  if (!canManage(membership.role)) {
    return c.json({ error: 'Admin or owner role required' }, 403);
  }

  const body = await c.req.json<{
    name?: string;
    website?: string;
    industry?: string;
  }>();

  const updates: string[] = [];
  const values: (string | null)[] = [];

  if (body.name !== undefined) {
    updates.push('name = ?');
    values.push(body.name);
  }
  if (body.website !== undefined) {
    updates.push('website = ?');
    values.push(body.website || null);
  }
  if (body.industry !== undefined) {
    updates.push('industry = ?');
    values.push(body.industry || null);
  }

  if (updates.length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(teamId);

  await c.env.DB.prepare(`
    UPDATE teams SET ${updates.join(', ')} WHERE id = ?
  `).bind(...values).run();

  // Get updated team
  const team = await c.env.DB.prepare(`
    SELECT * FROM teams WHERE id = ?
  `).bind(teamId).first<Team>();

  return c.json({
    success: true,
    team: team ? {
      id: team.id,
      name: team.name,
      slug: team.slug,
      tier: team.tier,
    } : null,
  });
});

// Delete team - requires owner role and confirmation
app.delete('/teams/:id', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const teamId = c.req.param('id');
  const confirm = c.req.query('confirm');

  const membership = await getUserTeamMembership(c.env.DB, user.id, teamId);

  if (!membership) {
    return c.json({ error: 'Team not found or access denied' }, 404);
  }

  if (membership.role !== 'owner') {
    return c.json({ error: 'Only the team owner can delete the team' }, 403);
  }

  if (confirm !== 'true') {
    return c.json({
      error: 'Confirmation required',
      message: 'Add ?confirm=true to confirm team deletion. This action is irreversible.',
    }, 400);
  }

  // Cancel Stripe subscription if exists
  if (membership.stripeSubscriptionId) {
    try {
      await fetch(`https://api.stripe.com/v1/subscriptions/${membership.stripeSubscriptionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${c.env.STRIPE_SECRET_KEY}`,
        },
      });
    } catch (err) {
      console.error('[Delete Team] Failed to cancel Stripe subscription:', err);
    }
  }

  // Delete team and related data (cascading)
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM team_invites WHERE team_id = ?').bind(teamId),
    c.env.DB.prepare('DELETE FROM team_members WHERE team_id = ?').bind(teamId),
    c.env.DB.prepare('DELETE FROM team_keys WHERE team_id = ?').bind(teamId),
    c.env.DB.prepare('DELETE FROM repos WHERE team_id = ?').bind(teamId),
    c.env.DB.prepare('DELETE FROM license_activations WHERE team_id = ?').bind(teamId),
    c.env.DB.prepare('DELETE FROM memory_access_logs WHERE team_id = ?').bind(teamId),
    c.env.DB.prepare('DELETE FROM teams WHERE id = ?').bind(teamId),
  ]);

  return c.json({
    success: true,
    message: 'Team deleted successfully',
  });
});

// Transfer ownership - requires owner role
app.post('/teams/:id/transfer', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const teamId = c.req.param('id');
  const body = await c.req.json<{ newOwnerId: string }>();

  if (!body.newOwnerId) {
    return c.json({ error: 'newOwnerId is required' }, 400);
  }

  const membership = await getUserTeamMembership(c.env.DB, user.id, teamId);

  if (!membership) {
    return c.json({ error: 'Team not found or access denied' }, 404);
  }

  if (membership.role !== 'owner') {
    return c.json({ error: 'Only the team owner can transfer ownership' }, 403);
  }

  // Verify new owner is a team member
  const newOwnerMembership = await c.env.DB.prepare(`
    SELECT user_id, role FROM team_members WHERE team_id = ? AND user_id = ?
  `).bind(teamId, body.newOwnerId).first<{ user_id: string; role: string }>();

  if (!newOwnerMembership) {
    return c.json({ error: 'User is not a member of this team' }, 400);
  }

  if (body.newOwnerId === user.id) {
    return c.json({ error: 'You are already the owner' }, 400);
  }

  const now = new Date().toISOString();

  // Transfer ownership
  await c.env.DB.batch([
    // Update team owner_id
    c.env.DB.prepare(`
      UPDATE teams SET owner_id = ?, updated_at = ? WHERE id = ?
    `).bind(body.newOwnerId, now, teamId),
    // Demote current owner to admin
    c.env.DB.prepare(`
      UPDATE team_members SET role = 'admin' WHERE team_id = ? AND user_id = ?
    `).bind(teamId, user.id),
    // Promote new owner
    c.env.DB.prepare(`
      UPDATE team_members SET role = 'owner' WHERE team_id = ? AND user_id = ?
    `).bind(teamId, body.newOwnerId),
  ]);

  return c.json({
    success: true,
    message: 'Ownership transferred successfully',
    newOwnerId: body.newOwnerId,
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

  // Update user profile (always do this first)
  await c.env.DB.prepare(`
    UPDATE users SET role = ?, company = ?, team_size = ?, updated_at = ?
    WHERE id = ?
  `).bind(body.role, body.company, body.teamSize, now, user.id).run();

  // For paid plans (team/enterprise), redirect to Stripe checkout
  if (body.plan === 'team' || body.plan === 'enterprise') {
    const sessionId = generateId();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Save onboarding data for after checkout completes
    await c.env.DB.prepare(`
      INSERT INTO onboarding_sessions (id, user_id, role, company, team_size, team_name, plan, seats, selected_repos, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      sessionId,
      user.id,
      body.role,
      body.company,
      body.teamSize,
      body.teamName,
      body.plan,
      body.seats || (body.plan === 'team' ? 10 : 50),
      JSON.stringify(body.selectedRepos || []),
      expiresAt
    ).run();

    // Get base URL for redirects
    const origin = c.req.header('origin') || 'https://recall.team';
    const baseUrl = origin.includes('localhost') ? origin : 'https://recall.team';

    // Create Stripe checkout session
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${c.env.STRIPE_SECRET_KEY}`,
      },
      body: new URLSearchParams({
        'mode': 'subscription',
        'success_url': `${baseUrl}/onboarding/success?session_id={CHECKOUT_SESSION_ID}`,
        'cancel_url': `${baseUrl}/onboarding?canceled=true`,
        'customer_email': user.email,
        'line_items[0][price]': c.env.STRIPE_PRICE_ID,
        'line_items[0][quantity]': String(body.seats || 1),
        'subscription_data[metadata][userId]': user.id,
        'subscription_data[metadata][onboardingSessionId]': sessionId,
        'subscription_data[metadata][teamName]': body.teamName,
        'subscription_data[metadata][seats]': String(body.seats || 1),
      }),
    });

    if (!stripeResponse.ok) {
      const error = await stripeResponse.text();
      console.error('[Stripe] Checkout session error:', error);
      return c.json({ error: 'Failed to create checkout session' }, 500);
    }

    const checkoutSession = await stripeResponse.json() as { id: string; url: string };

    return c.json({
      success: true,
      requiresPayment: true,
      checkoutUrl: checkoutSession.url,
      checkoutSessionId: checkoutSession.id,
    });
  }

  // For free plan, create team directly
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

    // Generate team encryption key
    const encryptionKey = await generateEncryptionKey();

    // Create team with encryption key in a batch
    await c.env.DB.batch([
      c.env.DB.prepare(`
        INSERT INTO teams (id, name, slug, owner_id, tier, seats, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'free', 1, ?, ?)
      `).bind(teamId, body.teamName, slug, user.id, now, now),

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
      tier: 'free',
      seats: 1,
      created_at: now,
    };
  }

  // Mark onboarding as completed for free plan
  await c.env.DB.prepare(`
    UPDATE users SET onboarding_completed = 1, updated_at = ?
    WHERE id = ?
  `).bind(now, user.id).run();

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
    requiresPayment: false,
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

  // Get enabled repos with enabler info
  const result = await c.env.DB.prepare(`
    SELECT r.id, r.github_repo_id, r.name, r.full_name, r.private, r.description, r.language,
           r.enabled, r.enabled_at, r.enabled_by, r.last_sync_at, r.initialized_at,
           u.name as enabler_name, u.github_username as enabler_github
    FROM repos r
    LEFT JOIN users u ON u.id = r.enabled_by
    WHERE r.team_id = ? AND r.enabled = 1
    ORDER BY r.enabled_at DESC
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
      enabledBy: r.enabled_by,
      enabledByName: r.enabler_name || r.enabler_github,
      canToggle: r.enabled_by === user.id || !r.enabled_by, // Can toggle if you enabled it or it's unassigned
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

    let contextContent = '';
    let historyContent = '';

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
        contextContent = small;
        historyContent = medium;
        console.log('[Initialize] Gemini API success');
      } catch (geminiError) {
        console.error('[Initialize] Gemini API failed:', geminiError);
        // Fall back to template if Gemini fails
        contextContent = '';
        historyContent = '';
      }

      if (!contextContent || !historyContent) {
        console.log('[Initialize] Using template fallback');
        contextContent = `# ${repo.name} - Team Context

Sessions: 0 | Last: ${new Date().toISOString().split('T')[0]}

## What It Is
${repo.description || 'A development project.'}

## Current Status
- **Phase:** Just initialized
- **Working:** Recall memory initialized
- **Blocked:** None

## Recent Decisions
_No decisions recorded yet._

---
*history.md = session history | sessions/ = full transcripts*
`;
        historyContent = `# ${repo.name} - Development History

Sessions: 0 | Updated: ${new Date().toISOString().split('T')[0]}

_No sessions yet. Start using your AI coding assistant to begin building team memory._
`;
      }
    } else {
      // Template fallback
      contextContent = `# ${repo.name} - Team Context

Sessions: 0 | Last: ${new Date().toISOString().split('T')[0]}

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
*history.md = session history | sessions/ = full transcripts*
`;

      historyContent = `# ${repo.name} - Development History

Sessions: 0 | Updated: ${new Date().toISOString().split('T')[0]}

_No sessions yet. Start using your AI coding assistant to begin building team memory._

---
*See sessions/ folder for complete chat transcripts*
`;
    }
    console.log('[Initialize] Step 4 complete, content lengths:', contextContent.length, historyContent.length);

    // 5. Encrypt the content
    console.log('[Initialize] Step 5: Encrypting content...');
    const encryptedContext = await encryptContent(contextContent, teamKey.encryption_key);
    const encryptedHistory = await encryptContent(historyContent, teamKey.encryption_key);
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

    const [contextSha, historySha, readmeSha] = await Promise.all([
      createBlob(encryptedContext),
      createBlob(encryptedHistory),
      createBlob(`# Recall Team Memory

This directory contains encrypted team memory files managed by [Recall](https://recall.team).

These files are encrypted with your team's key. Only team members with active Recall subscriptions can decrypt and read them.

## Files

- **context.md** - Team brain (~1.5-3k tokens) - loaded every session
- **history.md** - Encyclopedia (~30k tokens) - for onboarding and deep dives
- **sessions/** - Individual session records (~1.5k each) - full transcripts

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
          { path: '.recall/context.md', mode: '100644', type: 'blob', sha: contextSha },
          { path: '.recall/history.md', mode: '100644', type: 'blob', sha: historySha },
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
      files: ['.recall/context.md', '.recall/history.md', '.recall/README.md'],
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

// List existing API tokens (metadata only - tokens are hashed and cannot be retrieved)
app.get('/auth/tokens', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const tokens = await c.env.DB.prepare(`
    SELECT id, name, created_at, last_used_at
    FROM api_tokens
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).bind(user.id).all<{ id: string; name: string; created_at: string; last_used_at: string | null }>();

  return c.json({
    tokens: tokens.results?.map(t => ({
      id: t.id,
      name: t.name,
      createdAt: t.created_at,
      lastUsedAt: t.last_used_at,
    })) || [],
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

// Delete an API token
app.delete('/auth/tokens/:tokenId', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const tokenId = c.req.param('tokenId');

  // Verify the token belongs to this user before deleting
  const result = await c.env.DB.prepare(`
    DELETE FROM api_tokens WHERE id = ? AND user_id = ?
  `).bind(tokenId, user.id).run();

  if (result.meta.changes === 0) {
    return c.json({ error: 'Token not found' }, 404);
  }

  return c.json({ success: true });
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
// Team Members endpoints
// ============================================================

// List team members with stats
app.get('/teams/:id/members', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const teamId = c.req.param('id');
  const membership = await getUserTeamMembership(c.env.DB, user.id, teamId);

  if (!membership) {
    return c.json({ error: 'Team not found or access denied' }, 404);
  }

  // Get team members with stats
  const membersResult = await c.env.DB.prepare(`
    SELECT
      u.id, u.email, u.name, u.avatar_url, u.github_username,
      tm.role, tm.joined_at,
      (SELECT COUNT(*) FROM memory_access_logs WHERE user_id = u.id AND team_id = ?) as session_count,
      (SELECT MAX(created_at) FROM memory_access_logs WHERE user_id = u.id AND team_id = ?) as last_active
    FROM users u
    JOIN team_members tm ON tm.user_id = u.id
    WHERE tm.team_id = ?
    ORDER BY tm.joined_at
  `).bind(teamId, teamId, teamId).all();

  return c.json({
    members: (membersResult.results || []).map((m: Record<string, unknown>) => ({
      id: m.id,
      email: m.email,
      name: m.name,
      avatarUrl: m.avatar_url,
      githubUsername: m.github_username,
      role: m.role,
      joinedAt: m.joined_at,
      sessionCount: m.session_count || 0,
      lastActive: m.last_active,
    })),
  });
});

// Update member role
app.patch('/teams/:id/members/:userId', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const teamId = c.req.param('id');
  const targetUserId = c.req.param('userId');
  const body = await c.req.json<{ role: string }>();

  if (!body.role || !['admin', 'developer', 'member'].includes(body.role)) {
    return c.json({ error: 'Invalid role. Must be admin, developer, or member.' }, 400);
  }

  const membership = await getUserTeamMembership(c.env.DB, user.id, teamId);

  if (!membership) {
    return c.json({ error: 'Team not found or access denied' }, 404);
  }

  if (!canManage(membership.role)) {
    return c.json({ error: 'Admin or owner role required' }, 403);
  }

  // Get target user's current role
  const targetMembership = await c.env.DB.prepare(`
    SELECT role FROM team_members WHERE team_id = ? AND user_id = ?
  `).bind(teamId, targetUserId).first<{ role: string }>();

  if (!targetMembership) {
    return c.json({ error: 'User is not a member of this team' }, 404);
  }

  // Cannot change owner role - must use transfer endpoint
  if (targetMembership.role === 'owner') {
    return c.json({ error: 'Cannot change owner role. Use transfer endpoint instead.' }, 400);
  }

  // Cannot promote to owner
  if (body.role === 'owner') {
    return c.json({ error: 'Cannot promote to owner. Use transfer endpoint instead.' }, 400);
  }

  // Only owner can promote to admin
  if (body.role === 'admin' && membership.role !== 'owner') {
    return c.json({ error: 'Only owner can promote to admin' }, 403);
  }

  await c.env.DB.prepare(`
    UPDATE team_members SET role = ? WHERE team_id = ? AND user_id = ?
  `).bind(body.role, teamId, targetUserId).run();

  return c.json({
    success: true,
    userId: targetUserId,
    role: body.role,
  });
});

// Get or regenerate invite link
app.get('/teams/:id/invite-link', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const teamId = c.req.param('id');
  const regenerate = c.req.query('regenerate') === 'true';

  const membership = await getUserTeamMembership(c.env.DB, user.id, teamId);

  if (!membership) {
    return c.json({ error: 'Team not found or access denied' }, 404);
  }

  if (!canManage(membership.role)) {
    return c.json({ error: 'Admin or owner role required' }, 403);
  }

  // Check for existing general invite (no specific email)
  let invite = await c.env.DB.prepare(`
    SELECT id, code, expires_at, created_at
    FROM team_invites
    WHERE team_id = ? AND email IS NULL AND accepted_at IS NULL AND expires_at > datetime('now')
    ORDER BY created_at DESC
    LIMIT 1
  `).bind(teamId).first<{ id: string; code: string; expires_at: string; created_at: string }>();

  // Regenerate if requested or no active invite exists
  if (regenerate || !invite) {
    // Delete old general invites
    await c.env.DB.prepare(`
      DELETE FROM team_invites WHERE team_id = ? AND email IS NULL
    `).bind(teamId).run();

    // Create new invite
    const code = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const inviteId = generateId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await c.env.DB.prepare(`
      INSERT INTO team_invites (id, team_id, code, email, invited_by, role, expires_at, created_at)
      VALUES (?, ?, ?, NULL, ?, 'developer', ?, ?)
    `).bind(inviteId, teamId, code, user.id, expiresAt.toISOString(), now.toISOString()).run();

    invite = {
      id: inviteId,
      code,
      expires_at: expiresAt.toISOString(),
      created_at: now.toISOString(),
    };
  }

  const baseUrl = c.env.ENVIRONMENT === 'production' ? 'https://recall.team' : 'http://localhost:3003';

  return c.json({
    code: invite.code,
    url: `${baseUrl}/invite?code=${invite.code}`,
    expiresAt: invite.expires_at,
    createdAt: invite.created_at,
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
// Team Stats endpoints
// ============================================================

// Get team-wide stats
app.get('/teams/:id/stats', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const teamId = c.req.param('id');
  const membership = await getUserTeamMembership(c.env.DB, user.id, teamId);

  if (!membership) {
    return c.json({ error: 'Team not found or access denied' }, 404);
  }

  // Get various stats
  const [memberCount, repoCount, sessionCount, sessionsThisWeek] = await Promise.all([
    c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM team_members WHERE team_id = ?
    `).bind(teamId).first<{ count: number }>(),

    c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM repos WHERE team_id = ? AND enabled = 1
    `).bind(teamId).first<{ count: number }>(),

    c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM memory_access_logs WHERE team_id = ?
    `).bind(teamId).first<{ count: number }>(),

    c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM memory_access_logs
      WHERE team_id = ? AND created_at > datetime('now', '-7 days')
    `).bind(teamId).first<{ count: number }>(),
  ]);

  return c.json({
    stats: {
      memberCount: memberCount?.count || 0,
      repoCount: repoCount?.count || 0,
      sessionCount: sessionCount?.count || 0,
      sessionsThisWeek: sessionsThisWeek?.count || 0,
      seats: membership.seats,
      seatsUsed: memberCount?.count || 0,
      tier: membership.tier,
    },
  });
});

// Get per-member stats
app.get('/teams/:id/members/:userId/stats', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const teamId = c.req.param('id');
  const targetUserId = c.req.param('userId');

  const membership = await getUserTeamMembership(c.env.DB, user.id, teamId);

  if (!membership) {
    return c.json({ error: 'Team not found or access denied' }, 404);
  }

  // Verify target user is in the team
  const targetMembership = await c.env.DB.prepare(`
    SELECT tm.role, tm.joined_at, u.name, u.github_username
    FROM team_members tm
    JOIN users u ON u.id = tm.user_id
    WHERE tm.team_id = ? AND tm.user_id = ?
  `).bind(teamId, targetUserId).first<{
    role: string;
    joined_at: string;
    name: string;
    github_username: string;
  }>();

  if (!targetMembership) {
    return c.json({ error: 'User not found in this team' }, 404);
  }

  // Get user stats
  const [sessionCount, sessionsThisWeek, lastActive, recentActivity] = await Promise.all([
    c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM memory_access_logs
      WHERE user_id = ? AND team_id = ?
    `).bind(targetUserId, teamId).first<{ count: number }>(),

    c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM memory_access_logs
      WHERE user_id = ? AND team_id = ? AND created_at > datetime('now', '-7 days')
    `).bind(targetUserId, teamId).first<{ count: number }>(),

    c.env.DB.prepare(`
      SELECT MAX(created_at) as last_active FROM memory_access_logs
      WHERE user_id = ? AND team_id = ?
    `).bind(targetUserId, teamId).first<{ last_active: string | null }>(),

    c.env.DB.prepare(`
      SELECT file_type, action, repo_name, created_at
      FROM memory_access_logs
      WHERE user_id = ? AND team_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `).bind(targetUserId, teamId).all(),
  ]);

  return c.json({
    user: {
      id: targetUserId,
      name: targetMembership.name,
      githubUsername: targetMembership.github_username,
      role: targetMembership.role,
      joinedAt: targetMembership.joined_at,
    },
    stats: {
      sessionCount: sessionCount?.count || 0,
      sessionsThisWeek: sessionsThisWeek?.count || 0,
      lastActive: lastActive?.last_active,
    },
    recentActivity: (recentActivity.results || []).map((a: Record<string, unknown>) => ({
      fileType: a.file_type,
      action: a.action,
      repoName: a.repo_name,
      createdAt: a.created_at,
    })),
  });
});

// ============================================================
// Activity/Session endpoints
// ============================================================

// List sessions for a repo (paginated)
app.get('/teams/:id/repos/:repoId/sessions', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const teamId = c.req.param('id');
  const repoId = c.req.param('repoId');
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  const membership = await getUserTeamMembership(c.env.DB, user.id, teamId);

  if (!membership) {
    return c.json({ error: 'Team not found or access denied' }, 404);
  }

  // Verify repo belongs to team
  const repo = await c.env.DB.prepare(`
    SELECT id, name, full_name FROM repos WHERE id = ? AND team_id = ?
  `).bind(repoId, teamId).first<{ id: string; name: string; full_name: string }>();

  if (!repo) {
    return c.json({ error: 'Repository not found' }, 404);
  }

  // Get sessions (memory access logs) for this repo
  const result = await c.env.DB.prepare(`
    SELECT
      mal.id, mal.file_type, mal.action, mal.created_at,
      u.id as user_id, u.name as user_name, u.github_username
    FROM memory_access_logs mal
    JOIN users u ON u.id = mal.user_id
    WHERE mal.team_id = ? AND mal.repo_name = ?
    ORDER BY mal.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(teamId, repo.full_name, limit, offset).all();

  const totalResult = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM memory_access_logs
    WHERE team_id = ? AND repo_name = ?
  `).bind(teamId, repo.full_name).first<{ count: number }>();

  return c.json({
    repo: {
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
    },
    sessions: (result.results || []).map((s: Record<string, unknown>) => ({
      id: s.id,
      fileType: s.file_type,
      action: s.action,
      createdAt: s.created_at,
      user: {
        id: s.user_id,
        name: s.user_name,
        githubUsername: s.github_username,
      },
    })),
    pagination: {
      total: totalResult?.count || 0,
      limit,
      offset,
    },
  });
});

// Get current context.md content for a repo (fetches from GitHub)
app.get('/teams/:id/repos/:repoId/context', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const teamId = c.req.param('id');
  const repoId = c.req.param('repoId');

  const membership = await getUserTeamMembership(c.env.DB, user.id, teamId);

  if (!membership) {
    return c.json({ error: 'Team not found or access denied' }, 404);
  }

  // Verify repo belongs to team
  const repo = await c.env.DB.prepare(`
    SELECT id, full_name FROM repos WHERE id = ? AND team_id = ?
  `).bind(repoId, teamId).first<{ id: string; full_name: string }>();

  if (!repo) {
    return c.json({ error: 'Repository not found' }, 404);
  }

  if (!user.github_access_token) {
    return c.json({ error: 'GitHub token not available. Please re-authenticate.' }, 400);
  }

  try {
    // Fetch context.md from GitHub
    const response = await fetch(`https://api.github.com/repos/${repo.full_name}/contents/.recall/context.md`, {
      headers: {
        'Authorization': `Bearer ${user.github_access_token}`,
        'User-Agent': 'Recall-API',
        'Accept': 'application/vnd.github.v3.raw',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return c.json({
          found: false,
          message: 'context.md not found. Repository may not be initialized.',
        });
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const content = await response.text();

    // Check if encrypted
    const isEncrypted = content.startsWith('RECALL_ENCRYPTED:');

    return c.json({
      found: true,
      encrypted: isEncrypted,
      content: isEncrypted ? null : content,
      message: isEncrypted ? 'Content is encrypted. Decrypt with team key.' : undefined,
    });
  } catch (error) {
    console.error('[Context] Failed to fetch context.md:', error);
    return c.json({ error: 'Failed to fetch context.md' }, 500);
  }
});

// ============================================================
// Billing endpoints
// ============================================================

// Get billing overview
app.get('/teams/:id/billing', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const teamId = c.req.param('id');
  const membership = await getUserTeamMembership(c.env.DB, user.id, teamId);

  if (!membership) {
    return c.json({ error: 'Team not found or access denied' }, 404);
  }

  if (!canManage(membership.role)) {
    return c.json({ error: 'Admin or owner role required to view billing' }, 403);
  }

  // Get billing info from Stripe if customer exists
  let subscription = null;
  let nextInvoice = null;

  if (membership.stripeCustomerId && membership.stripeSubscriptionId) {
    try {
      const subResponse = await fetch(`https://api.stripe.com/v1/subscriptions/${membership.stripeSubscriptionId}`, {
        headers: {
          'Authorization': `Bearer ${c.env.STRIPE_SECRET_KEY}`,
        },
      });

      if (subResponse.ok) {
        const sub = await subResponse.json() as {
          status: string;
          current_period_end: number;
          current_period_start: number;
          items: { data: Array<{ quantity: number; price: { unit_amount: number } }> };
        };

        subscription = {
          status: sub.status,
          currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
          currentPeriodStart: new Date(sub.current_period_start * 1000).toISOString(),
          seats: sub.items.data[0]?.quantity || membership.seats,
          pricePerSeat: (sub.items.data[0]?.price?.unit_amount || 0) / 100,
        };
      }

      // Get upcoming invoice
      const invoiceResponse = await fetch(`https://api.stripe.com/v1/invoices/upcoming?customer=${membership.stripeCustomerId}`, {
        headers: {
          'Authorization': `Bearer ${c.env.STRIPE_SECRET_KEY}`,
        },
      });

      if (invoiceResponse.ok) {
        const invoice = await invoiceResponse.json() as {
          amount_due: number;
          period_end: number;
        };
        nextInvoice = {
          amount: invoice.amount_due / 100,
          date: new Date(invoice.period_end * 1000).toISOString(),
        };
      }
    } catch (err) {
      console.error('[Billing] Failed to fetch Stripe data:', err);
    }
  }

  return c.json({
    billing: {
      plan: membership.tier,
      seats: membership.seats,
      subscriptionStatus: membership.subscriptionStatus || 'none',
      hasPaymentMethod: !!membership.stripeCustomerId,
      subscription,
      nextInvoice,
    },
  });
});

// List invoices from Stripe
app.get('/teams/:id/billing/invoices', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const teamId = c.req.param('id');
  const membership = await getUserTeamMembership(c.env.DB, user.id, teamId);

  if (!membership) {
    return c.json({ error: 'Team not found or access denied' }, 404);
  }

  if (!canManage(membership.role)) {
    return c.json({ error: 'Admin or owner role required to view invoices' }, 403);
  }

  if (!membership.stripeCustomerId) {
    return c.json({ invoices: [] });
  }

  try {
    const response = await fetch(`https://api.stripe.com/v1/invoices?customer=${membership.stripeCustomerId}&limit=24`, {
      headers: {
        'Authorization': `Bearer ${c.env.STRIPE_SECRET_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch invoices');
    }

    const data = await response.json() as {
      data: Array<{
        id: string;
        status: string;
        amount_due: number;
        amount_paid: number;
        created: number;
        invoice_pdf: string | null;
        hosted_invoice_url: string | null;
      }>;
    };

    return c.json({
      invoices: data.data.map(inv => ({
        id: inv.id,
        status: inv.status,
        amountDue: inv.amount_due / 100,
        amountPaid: inv.amount_paid / 100,
        createdAt: new Date(inv.created * 1000).toISOString(),
        pdfUrl: inv.invoice_pdf,
        hostedUrl: inv.hosted_invoice_url,
      })),
    });
  } catch (err) {
    console.error('[Billing] Failed to fetch invoices:', err);
    return c.json({ error: 'Failed to fetch invoices' }, 500);
  }
});

// ============================================================
// Enterprise BYOK (Bring Your Own Key) endpoints
// ============================================================

// Check if LLM key is configured
app.get('/teams/:id/llm-key', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const teamId = c.req.param('id');
  const membership = await getUserTeamMembership(c.env.DB, user.id, teamId);

  if (!membership) {
    return c.json({ error: 'Team not found or access denied' }, 404);
  }

  if (membership.tier !== 'enterprise') {
    return c.json({
      available: false,
      message: 'BYOK is only available on the Enterprise plan',
    });
  }

  const llmKey = await c.env.DB.prepare(`
    SELECT id, provider, created_at, last_used_at FROM llm_keys WHERE team_id = ?
  `).bind(teamId).first<{
    id: string;
    provider: string;
    created_at: string;
    last_used_at: string | null;
  }>();

  return c.json({
    available: true,
    configured: !!llmKey,
    provider: llmKey?.provider,
    createdAt: llmKey?.created_at,
    lastUsedAt: llmKey?.last_used_at,
  });
});

// Add or update LLM API key
app.post('/teams/:id/llm-key', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const teamId = c.req.param('id');
  const membership = await getUserTeamMembership(c.env.DB, user.id, teamId);

  if (!membership) {
    return c.json({ error: 'Team not found or access denied' }, 404);
  }

  if (!canManage(membership.role)) {
    return c.json({ error: 'Admin or owner role required' }, 403);
  }

  if (membership.tier !== 'enterprise') {
    return c.json({ error: 'BYOK is only available on the Enterprise plan' }, 403);
  }

  const body = await c.req.json<{
    provider: string;
    apiKey: string;
  }>();

  if (!body.provider || !['openai', 'anthropic', 'google'].includes(body.provider)) {
    return c.json({ error: 'Invalid provider. Must be openai, anthropic, or google.' }, 400);
  }

  if (!body.apiKey || body.apiKey.length < 10) {
    return c.json({ error: 'Invalid API key' }, 400);
  }

  // Get team encryption key for encrypting the LLM key
  const teamKey = await c.env.DB.prepare(`
    SELECT encryption_key FROM team_keys WHERE team_id = ?
  `).bind(teamId).first<{ encryption_key: string }>();

  if (!teamKey) {
    return c.json({ error: 'Team encryption key not found' }, 500);
  }

  // Encrypt the API key
  const encryptedKey = await encryptContent(body.apiKey, teamKey.encryption_key);

  const now = new Date().toISOString();

  // Upsert the LLM key
  const existing = await c.env.DB.prepare(`
    SELECT id FROM llm_keys WHERE team_id = ?
  `).bind(teamId).first();

  if (existing) {
    await c.env.DB.prepare(`
      UPDATE llm_keys SET provider = ?, encrypted_key = ?, updated_at = ? WHERE team_id = ?
    `).bind(body.provider, encryptedKey, now, teamId).run();
  } else {
    const keyId = generateId();
    await c.env.DB.prepare(`
      INSERT INTO llm_keys (id, team_id, provider, encrypted_key, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(keyId, teamId, body.provider, encryptedKey, now).run();
  }

  return c.json({
    success: true,
    provider: body.provider,
    message: 'LLM API key configured successfully',
  });
});

// Remove LLM key
app.delete('/teams/:id/llm-key', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const teamId = c.req.param('id');
  const membership = await getUserTeamMembership(c.env.DB, user.id, teamId);

  if (!membership) {
    return c.json({ error: 'Team not found or access denied' }, 404);
  }

  if (!canManage(membership.role)) {
    return c.json({ error: 'Admin or owner role required' }, 403);
  }

  await c.env.DB.prepare(`
    DELETE FROM llm_keys WHERE team_id = ?
  `).bind(teamId).run();

  return c.json({
    success: true,
    message: 'LLM API key removed',
  });
});

// Test LLM key validity
app.post('/teams/:id/llm-key/test', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const teamId = c.req.param('id');
  const membership = await getUserTeamMembership(c.env.DB, user.id, teamId);

  if (!membership) {
    return c.json({ error: 'Team not found or access denied' }, 404);
  }

  if (!canManage(membership.role)) {
    return c.json({ error: 'Admin or owner role required' }, 403);
  }

  if (membership.tier !== 'enterprise') {
    return c.json({ error: 'BYOK is only available on the Enterprise plan' }, 403);
  }

  // Get the LLM key
  const llmKey = await c.env.DB.prepare(`
    SELECT provider, encrypted_key FROM llm_keys WHERE team_id = ?
  `).bind(teamId).first<{ provider: string; encrypted_key: string }>();

  if (!llmKey) {
    return c.json({ error: 'No LLM key configured' }, 404);
  }

  // Get team encryption key
  const teamKey = await c.env.DB.prepare(`
    SELECT encryption_key FROM team_keys WHERE team_id = ?
  `).bind(teamId).first<{ encryption_key: string }>();

  if (!teamKey) {
    return c.json({ error: 'Team encryption key not found' }, 500);
  }

  // Decrypt the API key
  let apiKey: string;
  try {
    apiKey = await decryptContent(llmKey.encrypted_key, teamKey.encryption_key);
  } catch {
    return c.json({ error: 'Failed to decrypt API key' }, 500);
  }

  // Test the key by making a simple API call
  try {
    let testResult = false;
    let message = '';

    if (llmKey.provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      testResult = response.ok;
      message = response.ok ? 'OpenAI key is valid' : 'OpenAI key is invalid';
    } else if (llmKey.provider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      });
      testResult = response.ok || response.status === 400; // 400 is OK, means key works but request is minimal
      message = testResult ? 'Anthropic key is valid' : 'Anthropic key is invalid';
    } else if (llmKey.provider === 'google') {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      testResult = response.ok;
      message = response.ok ? 'Google key is valid' : 'Google key is invalid';
    }

    // Update last_used_at if test succeeded
    if (testResult) {
      await c.env.DB.prepare(`
        UPDATE llm_keys SET last_used_at = ? WHERE team_id = ?
      `).bind(new Date().toISOString(), teamId).run();
    }

    return c.json({
      valid: testResult,
      provider: llmKey.provider,
      message,
    });
  } catch (err) {
    console.error('[LLM Key Test] Error:', err);
    return c.json({
      valid: false,
      provider: llmKey.provider,
      message: 'Failed to test API key',
    });
  }
});

// Helper: Decrypt content with AES-256-GCM
async function decryptContent(encrypted: string, keyBase64: string): Promise<string> {
  // Format: RECALL_ENCRYPTED:v1:iv:ciphertext
  const parts = encrypted.split(':');
  if (parts.length !== 4 || parts[0] !== 'RECALL_ENCRYPTED') {
    throw new Error('Invalid encrypted format');
  }

  const ivB64 = parts[2];
  const cipherB64 = parts[3];

  const key = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(cipherB64), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    ciphertext
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

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

Create a context.md file (~1.5-3k tokens max) with this structure:

# [Project Name] - Team Context

Sessions: [count] | Last: [date]

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
*history.md = session history | sessions/ = full transcripts*

RULES:
- Be SPECIFIC. Names, paths, versions, not vague descriptions.
- Include WHY decisions were made, not just WHAT.
- Failed experiments are valuable - capture them.
- Keep it scannable - an AI will read this in 2 seconds.`;

const MEDIUM_SUMMARY_PROMPT = `You are a technical writer creating session history for AI coding assistants.

Your output captures the development journey so AI can understand what happened and avoid repeating mistakes.

Create a history.md file (~30k tokens max) with this structure:

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
*See sessions/ folder for complete chat transcripts*

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

// ============================================================
// Stripe Checkout Endpoints
// ============================================================

// Create Stripe Checkout Session
app.post('/checkout/create-session', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const body = await c.req.json<{ seats?: number; teamName?: string }>().catch(() => ({}));
  
  const seats = body.seats || 1;
  const teamName = body.teamName?.trim();

  if (!teamName) {
    return c.json({ error: 'Team name is required' }, 400);
  }

  if (seats < 1 || seats > 100) {
    return c.json({ error: 'Seats must be between 1 and 100' }, 400);
  }

  // Check if user already has a team
  const existingTeam = await c.env.DB.prepare(`
    SELECT t.* FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE tm.user_id = ?
    LIMIT 1
  `).bind(user.id).first();

  if (existingTeam) {
    return c.json({ error: 'You already have a team. Manage your subscription in the dashboard.' }, 400);
  }

  // Create Stripe Checkout Session
  const baseUrl = c.env.ENVIRONMENT === 'production' ? 'https://recall.team' : 'http://localhost:3003';
  
  const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${c.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      'mode': 'subscription',
      'success_url': `${baseUrl}/dashboard?success=true`,
      'cancel_url': `${baseUrl}/checkout?canceled=true`,
      'line_items[0][price]': c.env.STRIPE_PRICE_ID,
      'line_items[0][quantity]': seats.toString(),
      'subscription_data[metadata][teamName]': teamName,
      'subscription_data[metadata][userId]': user.id,
      'subscription_data[metadata][seats]': seats.toString(),
      'customer_email': user.email,
      'allow_promotion_codes': 'true',
    }),
  });

  if (!stripeResponse.ok) {
    const error = await stripeResponse.text();
    console.error('[Stripe] Checkout session error:', error);
    return c.json({ error: 'Failed to create checkout session' }, 500);
  }

  const session = await stripeResponse.json() as { id: string; url: string };

  return c.json({
    sessionId: session.id,
    checkoutUrl: session.url,
  });
});

// Stripe Webhook Handler
app.post('/webhooks/stripe', async (c) => {
  const payload = await c.req.text();
  const signature = c.req.header('stripe-signature');

  // Verify webhook signature in production
  if (c.env.STRIPE_WEBHOOK_SECRET) {
    if (!signature) {
      console.error('[Stripe Webhook] Missing signature header');
      return c.json({ error: 'Missing signature' }, 401);
    }

    const isValid = await verifyStripeSignature(payload, signature, c.env.STRIPE_WEBHOOK_SECRET);
    if (!isValid) {
      console.error('[Stripe Webhook] Invalid signature');
      return c.json({ error: 'Invalid signature' }, 401);
    }
  } else {
    console.warn('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured - skipping signature verification');
  }

  let event: {
    type: string;
    data: {
      object: {
        id: string;
        customer: string;
        subscription?: string;
        metadata?: Record<string, string>;
        items?: { data: Array<{ quantity: number }> };
      };
    };
  };

  try {
    event = JSON.parse(payload);
  } catch (err) {
    console.error('[Stripe Webhook] Invalid JSON:', err);
    return c.json({ error: 'Invalid payload' }, 400);
  }

  console.log('[Stripe Webhook] Event:', event.type);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    // Get subscription details to access metadata
    const subResponse = await fetch(`https://api.stripe.com/v1/subscriptions/${session.subscription}`, {
      headers: {
        'Authorization': `Bearer ${c.env.STRIPE_SECRET_KEY}`,
      },
    });

    if (!subResponse.ok) {
      console.error('[Stripe Webhook] Failed to fetch subscription');
      return c.json({ error: 'Failed to fetch subscription' }, 500);
    }

    const subscription = await subResponse.json() as {
      id: string;
      customer: string;
      metadata: Record<string, string>;
      items: { data: Array<{ quantity: number }> };
    };

    const teamName = subscription.metadata.teamName;
    const userId = subscription.metadata.userId;
    const onboardingSessionId = subscription.metadata.onboardingSessionId;
    const seats = parseInt(subscription.metadata.seats || '1', 10);
    const customerId = subscription.customer;
    const subscriptionId = subscription.id;

    if (!teamName || !userId) {
      console.error('[Stripe Webhook] Missing metadata:', subscription.metadata);
      return c.json({ error: 'Missing metadata' }, 400);
    }

    // Check if team already exists for this subscription
    const existingTeam = await c.env.DB.prepare(`
      SELECT id FROM teams WHERE stripe_subscription_id = ?
    `).bind(subscriptionId).first();

    if (existingTeam) {
      console.log('[Stripe Webhook] Team already exists for subscription:', subscriptionId);
      return c.json({ received: true });
    }

    // Look up onboarding session for selected repos
    let selectedRepos: SelectedRepo[] = [];
    let plan = 'team';
    if (onboardingSessionId) {
      const onboardingSession = await c.env.DB.prepare(`
        SELECT plan, selected_repos FROM onboarding_sessions WHERE id = ? AND user_id = ?
      `).bind(onboardingSessionId, userId).first<{ plan: string; selected_repos: string }>();

      if (onboardingSession) {
        plan = onboardingSession.plan || 'team';
        try {
          selectedRepos = JSON.parse(onboardingSession.selected_repos || '[]');
        } catch (e) {
          console.error('[Stripe Webhook] Failed to parse selected_repos:', e);
        }

        // Clean up the onboarding session
        await c.env.DB.prepare('DELETE FROM onboarding_sessions WHERE id = ?').bind(onboardingSessionId).run();
      }
    }

    // Generate unique slug
    let baseSlug = teamName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
    let slug = baseSlug;
    let attempt = 0;

    while (true) {
      const existing = await c.env.DB.prepare('SELECT id FROM teams WHERE slug = ?').bind(slug).first();
      if (!existing) break;
      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }

    const teamId = generateId();
    const keyId = generateId();
    const now = new Date().toISOString();

    // Generate team encryption key
    const encryptionKey = await generateEncryptionKey();

    // Create team with Stripe info
    await c.env.DB.batch([
      c.env.DB.prepare(`
        INSERT INTO teams (id, name, slug, owner_id, tier, seats, stripe_customer_id, stripe_subscription_id, subscription_status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
      `).bind(teamId, teamName, slug, userId, plan, seats, customerId, subscriptionId, now, now),

      c.env.DB.prepare(`
        INSERT INTO team_members (team_id, user_id, role, joined_at)
        VALUES (?, ?, 'owner', ?)
      `).bind(teamId, userId, now),

      c.env.DB.prepare(`
        INSERT INTO team_keys (id, team_id, encryption_key, key_version, created_at)
        VALUES (?, ?, ?, 1, ?)
      `).bind(keyId, teamId, encryptionKey, now),
    ]);

    // Enable selected repos
    for (const repo of selectedRepos) {
      const repoId = generateId();
      try {
        await c.env.DB.prepare(`
          INSERT INTO repos (id, team_id, github_repo_id, name, full_name, private, description, language, enabled, enabled_by, enabled_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
        `).bind(
          repoId,
          teamId,
          repo.id,
          repo.name,
          repo.fullName,
          repo.private ? 1 : 0,
          repo.description || null,
          repo.language || null,
          userId,
          now
        ).run();
      } catch (err) {
        console.error('[Stripe Webhook] Failed to insert repo:', repo.fullName, err);
      }
    }

    // Mark user's onboarding as complete
    await c.env.DB.prepare(`
      UPDATE users SET onboarding_completed = 1, updated_at = ? WHERE id = ?
    `).bind(now, userId).run();

    console.log('[Stripe Webhook] Created team:', teamId, 'with', seats, 'seats and', selectedRepos.length, 'repos');
  }

  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as {
      id: string;
      items: { data: Array<{ quantity: number }> };
      status: string;
    };

    const seats = subscription.items?.data?.[0]?.quantity || 1;
    const status = subscription.status;

    await c.env.DB.prepare(`
      UPDATE teams SET seats = ?, subscription_status = ?, updated_at = ? WHERE stripe_subscription_id = ?
    `).bind(seats, status, new Date().toISOString(), subscription.id).run();

    console.log('[Stripe Webhook] Updated subscription:', subscription.id, 'seats:', seats, 'status:', status);
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;

    await c.env.DB.prepare(`
      UPDATE teams SET subscription_status = 'canceled', updated_at = ? WHERE stripe_subscription_id = ?
    `).bind(new Date().toISOString(), subscription.id).run();

    console.log('[Stripe Webhook] Canceled subscription:', subscription.id);
  }

  return c.json({ received: true });
});

// Get Stripe Customer Portal URL (for managing subscription)
app.post('/checkout/portal', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Get user's team with Stripe customer ID
  const team = await c.env.DB.prepare(`
    SELECT t.stripe_customer_id
    FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE tm.user_id = ? AND t.stripe_customer_id IS NOT NULL
    LIMIT 1
  `).bind(user.id).first<{ stripe_customer_id: string }>();

  if (!team?.stripe_customer_id) {
    return c.json({ error: 'No subscription found' }, 404);
  }

  const baseUrl = c.env.ENVIRONMENT === 'production' ? 'https://recall.team' : 'http://localhost:3003';

  const portalResponse = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${c.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      'customer': team.stripe_customer_id,
      'return_url': `${baseUrl}/dashboard`,
    }),
  });

  if (!portalResponse.ok) {
    const error = await portalResponse.text();
    console.error('[Stripe] Portal session error:', error);
    return c.json({ error: 'Failed to create portal session' }, 500);
  }

  const session = await portalResponse.json() as { url: string };

  return c.json({ portalUrl: session.url });
});

export default app;
