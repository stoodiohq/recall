/**
 * Recall Cloud API
 * Cloudflare Workers + Hono
 *
 * Endpoints:
 * - GET /health - Health check
 * - POST /auth/token - Exchange code for API token
 * - GET /auth/me - Current user info
 * - GET /license/check - Validate license
 * - POST /summarize - Get AI summaries for events
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

interface Env {
  ENVIRONMENT: string;
  ANTHROPIC_API_KEY?: string;
  // DB: D1Database; // Uncomment when D1 is set up
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

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: ['https://recall.team', 'http://localhost:3000'],
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
// Auth endpoints
// ============================================================

app.post('/auth/token', async (c) => {
  // TODO: Implement OAuth token exchange
  // For now, return a mock token
  const body = await c.req.json<{ code?: string }>();

  if (!body.code) {
    return c.json({ error: 'Missing code' }, 400);
  }

  return c.json({
    token: `rk_${crypto.randomUUID().replace(/-/g, '')}`,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });
});

app.get('/auth/me', async (c) => {
  const auth = c.req.header('Authorization');

  if (!auth?.startsWith('Bearer rk_')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // TODO: Look up user from token
  return c.json({
    id: 'user_demo',
    email: 'demo@recall.team',
    name: 'Demo User',
    team: null,
    tier: 'solo',
  });
});

// ============================================================
// License endpoints
// ============================================================

app.get('/license/check', async (c) => {
  const auth = c.req.header('Authorization');

  if (!auth?.startsWith('Bearer rk_')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // TODO: Check license from database
  return c.json({
    valid: true,
    tier: 'solo',
    seats: 1,
    seatsUsed: 1,
    features: ['basic_context'],
    expiresAt: null, // Free tier doesn't expire
  });
});

app.post('/license/activate', async (c) => {
  const auth = c.req.header('Authorization');

  if (!auth?.startsWith('Bearer rk_')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const body = await c.req.json<{ machineId?: string }>();

  if (!body.machineId) {
    return c.json({ error: 'Missing machineId' }, 400);
  }

  // TODO: Activate license seat
  return c.json({
    activated: true,
    machineId: body.machineId,
  });
});

// ============================================================
// Summarization endpoint
// ============================================================

app.post('/summarize', async (c) => {
  const auth = c.req.header('Authorization');

  if (!auth?.startsWith('Bearer rk_')) {
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
echo "  1. Run 'recall init' in any git repository"
echo "  2. Use your AI coding assistant"
echo "  3. Run 'recall save' to capture context"
echo ""
`;

  return new Response(script, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
});

export default app;
