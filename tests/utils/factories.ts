/**
 * Test data factories for Recall tests
 * Creates consistent test data with sensible defaults
 */

import * as crypto from 'crypto';

// ============================================================================
// User Factory
// ============================================================================

interface UserInput {
  id?: string;
  email?: string;
  name?: string;
  github_id?: string;
  github_username?: string;
  avatar_url?: string;
  team_id?: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  github_id: string;
  github_username: string;
  avatar_url: string;
  team_id: string | null;
  created_at: string;
  updated_at: string;
}

export function createUser(input: UserInput = {}): User {
  const id = input.id || generateId();
  return {
    id,
    email: input.email || `user-${id}@example.com`,
    name: input.name || `Test User ${id.slice(0, 6)}`,
    github_id: input.github_id || `gh-${id}`,
    github_username: input.github_username || `user-${id.slice(0, 8)}`,
    avatar_url: input.avatar_url || `https://github.com/${id}.png`,
    team_id: input.team_id || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// ============================================================================
// Team Factory
// ============================================================================

interface TeamInput {
  id?: string;
  name?: string;
  slug?: string;
  owner_id?: string;
  tier?: 'free' | 'pro' | 'enterprise';
  seats?: number;
}

interface Team {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  tier: string;
  seats: number;
  encryption_key: string;
  created_at: string;
}

export function createTeam(input: TeamInput = {}): Team {
  const id = input.id || generateId();
  const slug = input.slug || `team-${id.slice(0, 8)}`;
  return {
    id,
    name: input.name || `Team ${slug}`,
    slug,
    owner_id: input.owner_id || generateId(),
    tier: input.tier || 'pro',
    seats: input.seats || 5,
    encryption_key: generateEncryptionKey(),
    created_at: new Date().toISOString(),
  };
}

// ============================================================================
// Session Factory
// ============================================================================

interface SessionInput {
  content?: string;
  user?: string;
  timestamp?: string;
  decisions?: Array<{ what: string; why: string }>;
  files?: string[];
}

interface Session {
  id: string;
  timestamp: string;
  user: string;
  content: string;
  decisions: Array<{ what: string; why: string }>;
  files: string[];
}

export function createSession(input: SessionInput = {}): Session {
  return {
    id: generateId(),
    timestamp: input.timestamp || new Date().toISOString(),
    user: input.user || 'testuser',
    content: input.content || 'Test session content',
    decisions: input.decisions || [],
    files: input.files || [],
  };
}

// ============================================================================
// Memory File Factories
// ============================================================================

interface ContextInput {
  projectName?: string;
  techStack?: string[];
  currentWork?: string;
}

export function createContextMd(input: ContextInput = {}): string {
  const projectName = input.projectName || 'Test Project';
  const techStack = input.techStack || ['TypeScript', 'Node.js'];
  const currentWork = input.currentWork || 'Implementing feature X';

  return `# ${projectName} - Team Context

## Tech Stack
${techStack.map((t) => `- ${t}`).join('\n')}

## Current Work
${currentWork}

## Active Decisions
- Decision 1: We chose X because Y
- Decision 2: We use Z pattern for consistency

## Team Conventions
- All functions should have JSDoc comments
- Use async/await over callbacks
- Tests required for new features
`;
}

interface HistoryInput {
  sessions?: Array<{ date: string; summary: string }>;
  decisions?: Array<{ what: string; why: string; date: string }>;
}

export function createHistoryMd(input: HistoryInput = {}): string {
  const sessions =
    input.sessions ||
    [
      { date: '2024-01-15', summary: 'Initial project setup' },
      { date: '2024-01-16', summary: 'Added authentication' },
    ];

  const decisions =
    input.decisions ||
    [
      { date: '2024-01-15', what: 'Use TypeScript', why: 'Type safety and better DX' },
    ];

  return `# Team History

## Session Log
${sessions.map((s) => `### ${s.date}\n${s.summary}`).join('\n\n')}

## Decision Log
${decisions.map((d) => `### ${d.date}: ${d.what}\n**Why:** ${d.why}`).join('\n\n')}

## Lessons Learned
- Always test encryption with actual keys
- Check for null before accessing nested properties
`;
}

// ============================================================================
// API Token Factory
// ============================================================================

interface TokenInput {
  user_id?: string;
  team_id?: string;
  name?: string;
  expires_at?: string;
}

interface ApiToken {
  id: string;
  token: string;
  token_hash: string;
  user_id: string;
  team_id: string;
  name: string;
  expires_at: string | null;
  created_at: string;
}

export function createApiToken(input: TokenInput = {}): ApiToken {
  const id = generateId();
  const token = `recall_${generateRandomString(32)}`;
  return {
    id,
    token,
    token_hash: hashToken(token),
    user_id: input.user_id || generateId(),
    team_id: input.team_id || generateId(),
    name: input.name || 'Test Token',
    expires_at: input.expires_at || null,
    created_at: new Date().toISOString(),
  };
}

// ============================================================================
// JSONL Session Factory (Claude Code format)
// ============================================================================

interface JsonlMessageInput {
  role?: 'user' | 'assistant';
  content?: string;
  toolCalls?: Array<{ name: string; arguments: object }>;
}

export function createJsonlSession(messages: JsonlMessageInput[] = []): string {
  const defaultMessages: JsonlMessageInput[] = [
    { role: 'user', content: 'Help me implement a feature' },
    {
      role: 'assistant',
      content: 'I will help you implement that feature.',
      toolCalls: [{ name: 'read_file', arguments: { path: 'src/index.ts' } }],
    },
  ];

  const allMessages = messages.length ? messages : defaultMessages;

  return allMessages
    .map((msg, i) => {
      return JSON.stringify({
        id: generateId(),
        timestamp: new Date(Date.now() - (allMessages.length - i) * 60000).toISOString(),
        role: msg.role || 'user',
        content: msg.content || '',
        toolCalls: msg.toolCalls,
      });
    })
    .join('\n');
}

// ============================================================================
// Encrypted Content Factory
// ============================================================================

export function createEncryptedContent(
  plaintext: string,
  key: Buffer
): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  // Format: RECALL_ENCRYPTED:v1:iv:authTag:ciphertext
  return `RECALL_ENCRYPTED:v1:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

// ============================================================================
// Helpers
// ============================================================================

function generateId(): string {
  return crypto.randomUUID();
}

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('base64');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ============================================================================
// Bulk Factories
// ============================================================================

export function createUsers(count: number): User[] {
  return Array.from({ length: count }, () => createUser());
}

export function createTeamWithMembers(memberCount: number = 3): {
  team: Team;
  owner: User;
  members: User[];
} {
  const owner = createUser();
  const team = createTeam({ owner_id: owner.id });
  const members = createUsers(memberCount - 1).map((u) => ({
    ...u,
    team_id: team.id,
  }));

  return {
    team,
    owner: { ...owner, team_id: team.id },
    members,
  };
}
