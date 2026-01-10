#!/usr/bin/env node
/**
 * Recall MCP Server
 * Provides team memory for AI coding tools
 *
 * Architecture:
 * - Context stored locally in .recall/ folder (context.md, history.md, sessions/)
 * - Files are encrypted with team key
 * - Key stored on Recall server, only accessible with paid account
 * - MCP server fetches key, decrypts local files, provides context
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { execSync } from 'child_process';

const API_URL = 'https://api.recall.team';
const RECALL_DIR = '.recall';
const CONFIG_PATH = path.join(os.homedir(), '.recall', 'config.json');
const IMPORTED_SESSIONS_FILE = 'imported-sessions.json';

// CRITICAL FIX: Cache token at startup to prevent env var access issues
// Claude Code and other MCP clients may not pass env vars correctly after initial startup
// This ensures the token read at startup is available for all subsequent tool calls
let cachedConfig: RecallConfig | null = null;

interface RecallConfig {
  token: string;
}

interface TeamKey {
  hasAccess: boolean;
  key: string;
  keyVersion: number;
  teamId: string;
  teamSlug: string;
  message?: string;
}

interface ImportedSessionsTracker {
  version: number;
  sessions: Array<{
    filename: string;
    importedAt: string;
    mtime: number;
  }>;
}

// ============================================================================
// STRUCTURED EXTRACTION TYPES (Part 6 of plan)
// These types define the structured data extracted from sessions
// ============================================================================

interface ExtractedDecision {
  title: string;
  what: string;
  why: string;
  alternatives: Array<{ option: string; rejected_because: string }>;
  confidence: 'high' | 'medium' | 'low';
}

interface ExtractedFailure {
  title: string;
  what_tried: string;
  what_happened: string;
  root_cause: string;
  time_lost_minutes: number;
  resolution: string;
}

interface ExtractedLesson {
  title: string;
  derived_from_failure: string;
  lesson: string;
  when_applies: string;
}

interface ExtractedPromptPattern {
  title: string;
  prompt: string;
  why_effective: string;
  when_to_use: string;
}

interface StructuredSessionSummary {
  session_title: string;
  summary: string;
  detailed_summary: string;
  status: 'complete' | 'in-progress' | 'blocked';
  next_steps?: string;
  blocked_by?: string;
  decisions: ExtractedDecision[];
  failures: ExtractedFailure[];
  lessons: ExtractedLesson[];
  prompt_patterns: ExtractedPromptPattern[];
  update_context_md: boolean;
  context_section?: string;
  context_content?: string;
}

// Encryption helpers using AES-256-GCM
function encrypt(text: string, keyBase64: string): string {
  const key = Buffer.from(keyBase64, 'base64');

  // Validate key length - AES-256 requires exactly 32 bytes
  if (key.length !== 32) {
    throw new Error(`Invalid encryption key: got ${key.length} bytes, expected 32. Your team key may need to be rotated. Contact support at https://recall.team`);
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  // Format: RECALL_ENCRYPTED:v1:iv:authTag:ciphertext (versioned format)
  return `RECALL_ENCRYPTED:v1:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

function decrypt(encryptedData: string, keyBase64: string): string {
  const key = Buffer.from(keyBase64, 'base64');
  const parts = encryptedData.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(parts[0], 'base64');
  const authTag = Buffer.from(parts[1], 'base64');
  const ciphertext = parts[2];

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Load config from environment variable or file
 * Priority: RECALL_API_TOKEN env var > config file
 */
function loadConfig(): RecallConfig | null {
  // CRITICAL FIX: Return cached config if available
  // This prevents issues where env vars are not accessible after MCP server startup
  if (cachedConfig) {
    console.error(`[Recall] loadConfig: using cached token=${cachedConfig.token.substring(0, 10)}...`);
    return cachedConfig;
  }

  // Check environment variable first (set via MCP config)
  const envToken = process.env.RECALL_API_TOKEN;
  console.error(`[Recall] loadConfig: envToken=${envToken ? envToken.substring(0, 10) + '...' : 'null'}`);
  if (envToken) {
    cachedConfig = { token: envToken };
    console.error(`[Recall] loadConfig: cached token from env var`);
    return cachedConfig;
  }

  // Fall back to config file
  console.error(`[Recall] loadConfig: checking file ${CONFIG_PATH}`);
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      console.error(`[Recall] loadConfig: from file token=${parsed.token ? parsed.token.substring(0, 10) + '...' : 'null'}`);
      cachedConfig = parsed;
      console.error(`[Recall] loadConfig: cached token from file`);
      return cachedConfig;
    }
  } catch (err) {
    console.error(`[Recall] loadConfig: file error ${err}`);
  }
  console.error(`[Recall] loadConfig: returning null`);
  return null;
}

/**
 * Save config to file
 */
function saveConfig(config: RecallConfig): void {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  // CRITICAL FIX: Also update the cached config so subsequent calls use the new token
  cachedConfig = config;
  console.error(`[Recall] saveConfig: updated cache with new token=${config.token.substring(0, 10)}...`);
}

/**
 * Get the .recall directory path for current repo
 */
function getRecallDir(): string {
  return path.join(process.cwd(), RECALL_DIR);
}

/**
 * Ensure .recall directory exists
 */
function ensureRecallDir(): void {
  const dir = getRecallDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Add .gitignore if it doesn't exist (encrypted files should be committed)
  const gitignorePath = path.join(dir, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    // We actually want to commit encrypted files so team can share
    // But add a note file
    const readmePath = path.join(dir, 'README.md');
    fs.writeFileSync(readmePath, `# Recall Team Memory

This folder contains encrypted team memory files for AI coding assistants.

Files:
- \`context.md\` - Team brain, loads every session (~1.5-3K tokens)
- \`history.md\` - Encyclopedia for onboarding and learning (~30K+ tokens)
- \`sessions/\` - Individual session records (~1.5K each)

These files are encrypted with your team's key. Only team members with
a valid Recall subscription can decrypt them.

Learn more: https://recall.team
`);
  }
}

/**
 * Get machine ID for license activation
 */
function getMachineId(): string {
  const hostname = os.hostname();
  const username = os.userInfo().username;
  const platform = os.platform();

  // Create a stable machine identifier
  const data = `${hostname}:${username}:${platform}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
}

/**
 * Fetch team encryption key from server
 */
async function getTeamKey(token: string): Promise<TeamKey | null> {
  try {
    const machineId = getMachineId();
    console.error(`[Recall] Fetching team key... (machineId: ${machineId})`);

    const response = await fetch(`${API_URL}/keys/team`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.error(`[Recall] Team key response: ${response.status}`);

    if (!response.ok) {
      const text = await response.text();
      console.error(`[Recall] Team key error: ${text}`);

      // Handle specific error codes with helpful messages
      if (response.status === 401) {
        return {
          hasAccess: false,
          key: '',
          keyVersion: 0,
          teamId: '',
          teamSlug: '',
          message: 'Authentication failed. Your token may be invalid, revoked, or not passed correctly. Run recall_auth with a fresh token from https://recall.team/dashboard'
        };
      }
      if (response.status === 403) {
        try {
          const data = JSON.parse(text);
          return { hasAccess: false, key: '', keyVersion: 0, teamId: '', teamSlug: '', ...data };
        } catch {
          return { hasAccess: false, key: '', keyVersion: 0, teamId: '', teamSlug: '', message: text };
        }
      }
      // For other errors, return a generic message rather than null
      return {
        hasAccess: false,
        key: '',
        keyVersion: 0,
        teamId: '',
        teamSlug: '',
        message: `API error (${response.status}). Check https://recall.team/dashboard`
      };
    }

    const data = await response.json();
    console.error(`[Recall] Team key success: hasAccess=${data.hasAccess}, keyVersion=${data.keyVersion}, teamId=${data.teamId}`);
    return data;
  } catch (error) {
    console.error('[Recall] Failed to fetch team key:', error);
    return null;
  }
}

/**
 * Read and decrypt a recall file
 * @param filename - The file to read (e.g., 'context.md', 'history.md', or path in sessions/)
 * @param key - The decryption key
 * @param recallDir - Optional: explicit .recall directory path. If not provided, uses getRecallDir()
 */
function readRecallFile(filename: string, key: string, recallDir?: string): string | null {
  const dir = recallDir || getRecallDir();
  const filePath = path.join(dir, filename);
  console.error(`[Recall] readRecallFile: ${filename} from ${dir}`);

  if (!fs.existsSync(filePath)) {
    console.error(`[Recall] File not found: ${filePath}`);
    return null;
  }

  try {
    const encrypted = fs.readFileSync(filePath, 'utf-8');
    console.error(`[Recall] File content preview: ${encrypted.substring(0, 80)}...`);
    console.error(`[Recall] Key present: ${!!key}, key length: ${key?.length || 0}`);

    // Check for versioned encryption format: RECALL_ENCRYPTED:v1:iv:authTag:ciphertext
    if (encrypted.startsWith('RECALL_ENCRYPTED:')) {
      console.error(`[Recall] Detected versioned encryption format`);
      const parts = encrypted.split(':');
      // Format: RECALL_ENCRYPTED:v1:iv:authTag:ciphertext (5 parts)
      if (parts.length === 5 && parts[0] === 'RECALL_ENCRYPTED' && parts[1] === 'v1') {
        // Extract iv:authTag:ciphertext
        const encryptedData = `${parts[2]}:${parts[3]}:${parts[4]}`;
        console.error(`[Recall] Extracted encrypted data (v1 format)`);
        const decrypted = decrypt(encryptedData, key);
        console.error(`[Recall] Decryption successful, length: ${decrypted.length}`);
        return decrypted;
      } else {
        console.error(`[Recall] Unknown version format, parts: ${parts.length}`);
        throw new Error(`Unknown encryption format version`);
      }
    }

    // Check if file is encrypted (legacy format: iv:authTag:ciphertext)
    if (encrypted.includes(':')) {
      console.error(`[Recall] Detected legacy encryption format`);
      const decrypted = decrypt(encrypted, key);
      console.error(`[Recall] Decryption successful, length: ${decrypted.length}`);
      return decrypted;
    }

    // File is not encrypted (legacy or first run)
    console.error(`[Recall] File is not encrypted (plaintext)`);
    return encrypted;
  } catch (error) {
    console.error(`[Recall] Failed to read/decrypt ${filename}:`, error);
    return null;
  }
}

/**
 * Encrypt and write a recall file
 */
function writeRecallFile(filename: string, content: string, key: string): void {
  ensureRecallDir();
  const filePath = path.join(getRecallDir(), filename);
  const encrypted = encrypt(content, key);
  fs.writeFileSync(filePath, encrypted);
}

/**
 * Write a session file to sessions/ folder
 * Path format: sessions/YYYY-MM/username/DD-HHMM.md
 */
function writeSessionFile(sessionPath: string, content: string, key: string): void {
  ensureRecallDir();
  const fullPath = path.join(getRecallDir(), sessionPath);
  const dir = path.dirname(fullPath);

  // Create directory structure if needed
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const encrypted = encrypt(content, key);
  fs.writeFileSync(fullPath, encrypted);
}

/**
 * Read all session files from sessions/ folder
 * Returns array of { path, content } sorted by date (newest first)
 */
function readAllSessionFiles(key: string): Array<{ path: string; content: string }> {
  const sessionsDir = path.join(getRecallDir(), 'sessions');
  const sessions: Array<{ path: string; content: string; mtime: number }> = [];

  if (!fs.existsSync(sessionsDir)) {
    return [];
  }

  const readSessionsRecursive = (dir: string, relativePath: string = ''): void => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        readSessionsRecursive(fullPath, path.join(relativePath, entry.name));
      } else if (entry.name.endsWith('.md')) {
        const sessionRelPath = path.join('sessions', relativePath, entry.name);
        const content = readRecallFile(sessionRelPath, key);
        if (content) {
          const stat = fs.statSync(fullPath);
          sessions.push({ path: sessionRelPath, content, mtime: stat.mtimeMs });
        }
      }
    }
  };

  readSessionsRecursive(sessionsDir);

  // Sort by modification time (newest first)
  sessions.sort((a, b) => b.mtime - a.mtime);

  return sessions.map(s => ({ path: s.path, content: s.content }));
}

/**
 * Log memory access to the API (non-blocking)
 */
async function logMemoryAccess(
  token: string,
  fileType: 'context' | 'history' | 'sessions',
  action: 'read' | 'write' = 'read'
): Promise<void> {
  const repoName = getCurrentRepoName();

  // Fire and forget - but log errors for debugging
  fetch(`${API_URL}/memory/access`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fileType, action, repoName }),
  })
    .then(async (response) => {
      if (!response.ok) {
        const text = await response.text().catch(() => 'no body');
        console.error(`[Recall] Activity log failed: ${response.status} - ${text}`);
      } else {
        console.error(`[Recall] Activity logged: ${action} ${fileType} for ${repoName}`);
      }
    })
    .catch((error) => {
      console.error(`[Recall] Activity log error:`, error.message || error);
    });
}

/**
 * Get repo name from git for a specific directory
 */
function getRepoNameFromPath(projectPath: string): string | null {
  try {
    const { execSync } = require('child_process');
    const remote = execSync('git config --get remote.origin.url', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: projectPath,
    }).trim();

    const match = remote.match(/github\.com[:/](.+?)(?:\.git)?$/);
    if (match) {
      return match[1];
    }
  } catch {
    // Not a git repo or no remote
  }
  return path.basename(projectPath);
}

/**
 * Get current repo name from git (uses cwd)
 */
function getCurrentRepoName(): string | null {
  return getRepoNameFromPath(process.cwd());
}

/**
 * Read the imported sessions tracker
 */
function readImportedSessionsTracker(): ImportedSessionsTracker {
  const trackerPath = path.join(getRecallDir(), IMPORTED_SESSIONS_FILE);

  if (!fs.existsSync(trackerPath)) {
    return { version: 1, sessions: [] };
  }

  try {
    const content = fs.readFileSync(trackerPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { version: 1, sessions: [] };
  }
}

/**
 * Write the imported sessions tracker
 */
function writeImportedSessionsTracker(tracker: ImportedSessionsTracker): void {
  ensureRecallDir();
  const trackerPath = path.join(getRecallDir(), IMPORTED_SESSIONS_FILE);
  fs.writeFileSync(trackerPath, JSON.stringify(tracker, null, 2));
}

/**
 * Auto-import new sessions on startup
 * This is the core of automatic session capture
 */
async function autoImportNewSessions(): Promise<{ imported: number; skipped: number }> {
  const config = loadConfig();
  if (!config?.token) {
    console.error('[Recall] Auto-import: Not authenticated');
    return { imported: 0, skipped: 0 };
  }

  // Check if .recall/ exists - don't auto-create, wait for recall_init
  const recallDir = getRecallDir();
  if (!fs.existsSync(recallDir)) {
    console.error('[Recall] Auto-import: No .recall/ directory yet');
    return { imported: 0, skipped: 0 };
  }

  const teamKey = await getTeamKey(config.token);
  if (!teamKey?.hasAccess) {
    console.error('[Recall] Auto-import: No team access');
    return { imported: 0, skipped: 0 };
  }

  // Find all session files
  const sessionFiles = findAllSessionFiles();
  if (sessionFiles.length === 0) {
    console.error('[Recall] Auto-import: No session files found');
    return { imported: 0, skipped: 0 };
  }

  // Read tracker to see what's already imported
  const tracker = readImportedSessionsTracker();

  // Find new sessions (by filename and mtime)
  const newSessions: Array<{ path: string; filename: string; mtime: number }> = [];

  for (const sessionPath of sessionFiles) {
    const filename = path.basename(sessionPath);
    const stat = fs.statSync(sessionPath);

    // Check if already imported with same mtime (file could be updated)
    const existingImport = tracker.sessions.find(s => s.filename === filename);
    if (existingImport && existingImport.mtime >= stat.mtimeMs) {
      // Already imported and file hasn't changed
      continue;
    }

    newSessions.push({
      path: sessionPath,
      filename,
      mtime: stat.mtimeMs,
    });
  }

  if (newSessions.length === 0) {
    console.error('[Recall] Auto-import: All sessions already imported');
    return { imported: 0, skipped: sessionFiles.length };
  }

  console.error(`[Recall] Auto-import: Found ${newSessions.length} new/updated sessions to import`);

  // Process new sessions (oldest first)
  const sortedNewSessions = [...newSessions].sort((a, b) => a.mtime - b.mtime);
  const username = os.userInfo().username;

  for (const session of sortedNewSessions) {
    const sessionDate = new Date(session.mtime);
    const yearMonth = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}`;
    const day = String(sessionDate.getDate()).padStart(2, '0');
    const hours = String(sessionDate.getHours()).padStart(2, '0');
    const minutes = String(sessionDate.getMinutes()).padStart(2, '0');
    const sessionFilename = `${day}-${hours}${minutes}.md`;
    const sessionPath = `sessions/${yearMonth}/${username}/${sessionFilename}`;

    console.error(`[Recall] Auto-import: Processing ${session.filename} -> ${sessionPath}`);

    const transcript = parseSessionTranscript(session.path);
    const messageCount = (transcript.match(/\*\*User:\*\*|\*\*Assistant:\*\*/g) || []).length;

    // Build session content per plan structure
    const dateStr = sessionDate.toISOString().split('T')[0];
    const timeStr = sessionDate.toTimeString().split(' ')[0];
    let sessionContent = `# Session: ${dateStr} - ${timeStr}\n\n`;
    sessionContent += `**Developer:** @${username}\n`;
    sessionContent += `**Source:** ${session.filename}\n\n`;
    sessionContent += `## Transcript\n\n`;
    sessionContent += transcript;
    sessionContent += `\n_${messageCount} messages (auto-imported)_\n`;

    // Write individual session file
    writeSessionFile(sessionPath, sessionContent, teamKey.key);

    // Update tracker
    const existingIndex = tracker.sessions.findIndex(s => s.filename === session.filename);
    if (existingIndex >= 0) {
      tracker.sessions[existingIndex] = {
        filename: session.filename,
        importedAt: new Date().toISOString(),
        mtime: session.mtime,
      };
    } else {
      tracker.sessions.push({
        filename: session.filename,
        importedAt: new Date().toISOString(),
        mtime: session.mtime,
      });
    }
  }

  // Write updated tracker
  writeImportedSessionsTracker(tracker);

  // Log activity
  logMemoryAccess(config.token, 'sessions', 'write');

  // Generate summaries from sessions folder
  generateSummariesFromSessions(teamKey.key);

  console.error(`[Recall] Auto-import: Imported ${newSessions.length} sessions`);
  return { imported: newSessions.length, skipped: sessionFiles.length - newSessions.length };
}

/**
 * Parse structured data from session content (extracted from [DECISION], [FAILURE], etc tags)
 */
function parseStructuredFromSessionContent(content: string): StructuredSessionSummary | undefined {
  const structured: StructuredSessionSummary = {
    session_title: '',
    summary: '',
    detailed_summary: '',
    status: 'complete',
    decisions: [],
    failures: [],
    lessons: [],
    prompt_patterns: [],
    update_context_md: false,
  };

  // Extract summary
  const summaryMatch = content.match(/## Summary\n([\s\S]*?)(?=\n## |$)/);
  if (summaryMatch) {
    structured.summary = summaryMatch[1].trim();
  }

  // Extract status
  const statusMatch = content.match(/\*\*Status:\*\* ([\w\s-]+)/);
  if (statusMatch) {
    const status = statusMatch[1].trim().toLowerCase();
    if (status.includes('progress')) structured.status = 'in-progress';
    else if (status.includes('block')) structured.status = 'blocked';
    else structured.status = 'complete';
  }

  // Extract next steps
  const nextMatch = content.match(/## Where I Left Off\n([\s\S]*?)(?=\n## |$)/);
  if (nextMatch) {
    structured.next_steps = nextMatch[1].trim();
  }

  // Extract blockers
  const blockerMatch = content.match(/## Blockers\n([\s\S]*?)(?=\n## |$)/);
  if (blockerMatch) {
    structured.blocked_by = blockerMatch[1].trim();
  }

  // Extract [DECISION] blocks
  const decisionMatches = content.matchAll(/### \[DECISION\] ([^\n]+)\n([\s\S]*?)(?=\n### |## |$)/g);
  for (const match of decisionMatches) {
    const title = match[1].trim();
    const block = match[2];
    const whatMatch = block.match(/\*\*What:\*\* ([^\n]+)/);
    const whyMatch = block.match(/\*\*Why:\*\* ([^\n]+)/);
    const confMatch = block.match(/\*\*Confidence:\*\* (\w+)/);
    const altsMatch = block.match(/\*\*Alternatives:\*\*\n([\s\S]*?)(?=\*\*|$)/);

    const alternatives: Array<{ option: string; rejected_because: string }> = [];
    if (altsMatch) {
      const altLines = altsMatch[1].match(/- ([^:]+): Rejected because ([^\n]+)/g) || [];
      for (const alt of altLines) {
        const altMatch = alt.match(/- ([^:]+): Rejected because (.+)/);
        if (altMatch) {
          alternatives.push({ option: altMatch[1].trim(), rejected_because: altMatch[2].trim() });
        }
      }
    }

    structured.decisions.push({
      title,
      what: whatMatch?.[1]?.trim() || title,
      why: whyMatch?.[1]?.trim() || '',
      alternatives,
      confidence: (confMatch?.[1]?.toLowerCase() as 'high' | 'medium' | 'low') || 'medium',
    });
  }

  // Extract [FAILURE] blocks
  const failureMatches = content.matchAll(/### \[FAILURE\] ([^\n]+)\n([\s\S]*?)(?=\n### |## |$)/g);
  for (const match of failureMatches) {
    const title = match[1].trim();
    const block = match[2];
    const triedMatch = block.match(/\*\*What we tried:\*\* ([^\n]+)/);
    const happenedMatch = block.match(/\*\*What happened:\*\* ([^\n]+)/);
    const causeMatch = block.match(/\*\*Root cause:\*\* ([^\n]+)/);
    const timeMatch = block.match(/\*\*Time lost:\*\* (\d+)/);
    const resMatch = block.match(/\*\*Resolution:\*\* ([^\n]+)/);

    structured.failures.push({
      title,
      what_tried: triedMatch?.[1]?.trim() || '',
      what_happened: happenedMatch?.[1]?.trim() || '',
      root_cause: causeMatch?.[1]?.trim() || '',
      time_lost_minutes: parseInt(timeMatch?.[1] || '0'),
      resolution: resMatch?.[1]?.trim() || '',
    });
  }

  // Extract [LESSON] blocks
  const lessonMatches = content.matchAll(/### \[LESSON\] ([^\n]+)\n([\s\S]*?)(?=\n### |## |$)/g);
  for (const match of lessonMatches) {
    const title = match[1].trim();
    const block = match[2];
    const fromMatch = block.match(/\*\*From:\*\* ([^\n]+)/);
    const lessonMatch = block.match(/\*\*Lesson:\*\* ([^\n]+)/);
    const whenMatch = block.match(/\*\*When this applies:\*\* ([^\n]+)/);

    structured.lessons.push({
      title,
      derived_from_failure: fromMatch?.[1]?.trim() || '',
      lesson: lessonMatch?.[1]?.trim() || '',
      when_applies: whenMatch?.[1]?.trim() || '',
    });
  }

  // Extract [PROMPT_PATTERN] blocks
  const patternMatches = content.matchAll(/### \[PROMPT_PATTERN\] ([^\n]+)\n([\s\S]*?)(?=\n### |## |$)/g);
  for (const match of patternMatches) {
    const title = match[1].trim();
    const block = match[2];
    const promptMatch = block.match(/\*\*Prompt:\*\* "([^"]+)"/);
    const whyMatch = block.match(/\*\*Why it worked:\*\* ([^\n]+)/);
    const whenMatch = block.match(/\*\*When to use:\*\* ([^\n]+)/);

    structured.prompt_patterns.push({
      title,
      prompt: promptMatch?.[1]?.trim() || '',
      why_effective: whyMatch?.[1]?.trim() || '',
      when_to_use: whenMatch?.[1]?.trim() || '',
    });
  }

  // Only return if we found meaningful content
  if (structured.summary || structured.decisions.length > 0 || structured.failures.length > 0) {
    return structured;
  }
  return undefined;
}

/**
 * Generate history.md and context.md summaries from sessions/ folder
 * Called automatically whenever sessions are written
 * Now uses the new Part 5 structure with value tags
 */
function generateSummariesFromSessions(encryptionKey: string): void {
  const repoName = getCurrentRepoName() || path.basename(process.cwd());

  // Read all sessions from sessions/ folder
  const sessions = readAllSessionFiles(encryptionKey);

  // Parse structured data from each session
  const sessionsWithStructured = sessions.map(s => ({
    ...s,
    structured: parseStructuredFromSessionContent(s.content),
  }));

  // Read existing context and history to preserve manual content
  const existingContext = readRecallFile('context.md', encryptionKey) || undefined;
  const existingHistory = readRecallFile('history.md', encryptionKey) || undefined;

  // Build context.md per Part 5 structure
  const smallContent = buildContextMd(repoName, sessionsWithStructured, existingContext);
  writeRecallFile('context.md', smallContent, encryptionKey);

  // Build history.md per Part 5 structure
  const mediumContent = buildHistoryMd(repoName, sessionsWithStructured, existingHistory);
  writeRecallFile('history.md', mediumContent, encryptionKey);

  console.error(`[Recall] Generated summaries from ${sessions.length} sessions`);
}

/**
 * Sync memory files - CLI command for git hooks
 * Imports new sessions and generates/updates summaries
 */
async function syncMemory(): Promise<void> {
  console.log('🔄 Syncing Recall memory...\n');

  const config = loadConfig();
  if (!config?.token) {
    console.error('❌ Not authenticated. Run: npx recall-mcp-server install <token>');
    process.exit(1);
  }

  const teamKey = await getTeamKey(config.token);
  if (!teamKey?.hasAccess) {
    console.error('❌ No team access. Check your subscription at https://recall.team/dashboard');
    process.exit(1);
  }

  // Check if .recall/ exists
  const recallDir = getRecallDir();
  if (!fs.existsSync(recallDir)) {
    console.error('❌ No .recall/ directory found. Run recall_init first.');
    process.exit(1);
  }

  // Import new sessions - this also generates summaries automatically
  console.log('📥 Importing new sessions...');
  const importResult = await autoImportNewSessions();
  console.log(`   Imported: ${importResult.imported}, Already synced: ${importResult.skipped}`);

  console.log('\n✅ Sync complete! (sessions/, history.md, context.md all updated)');
}

/**
 * Find ALL Claude Code session JSONL files for current project and its subdirectories
 * Claude stores sessions in ~/.claude/projects/<path-with-dashes>/
 * e.g., /Users/ray/myproject -> -Users-ray-myproject
 *
 * IMPORTANT: Includes sessions from:
 * - The exact project directory (e.g., -Users-ray-myproject)
 * - Child directories (e.g., -Users-ray-myproject-src, -Users-ray-myproject-api)
 *
 * EXCLUDES sessions from parent directories to avoid importing unrelated projects.
 * (e.g., sessions from /Users/ray would include ALL projects - we don't want that)
 *
 * Returns array of all session files, sorted by modification time (newest first)
 */
function findAllSessionFiles(): string[] {
  const claudeProjectsDir = path.join(os.homedir(), '.claude', 'projects');
  const sessionFiles: Array<{ path: string; mtime: number }> = [];

  if (!fs.existsSync(claudeProjectsDir)) {
    console.error('[Recall] No ~/.claude/projects directory found');
    return [];
  }

  const cwd = process.cwd();
  console.error(`[Recall] Looking for session files for: ${cwd}`);

  // Claude uses path with slashes replaced by dashes
  // /Users/ray/project -> -Users-ray-project
  const projectDirName = cwd.replace(/\//g, '-');

  // Find all project directories that match this path or are children of it
  // Include: -Users-ray-project, -Users-ray-project-src, -Users-ray-project-api
  // Exclude: -Users-ray (parent), -Users (grandparent)
  const allProjectDirs = fs.readdirSync(claudeProjectsDir);
  const matchingDirs = allProjectDirs.filter(dir => {
    // Include exact match or child directories (dir starts with our path)
    return dir === projectDirName || dir.startsWith(projectDirName + '-');
  });

  console.error(`[Recall] Checking project prefix: ${projectDirName}`);
  console.error(`[Recall] Found ${matchingDirs.length} matching directories`);

  for (const dirName of matchingDirs) {
    const projectPath = path.join(claudeProjectsDir, dirName);

    if (!fs.statSync(projectPath).isDirectory()) {
      continue;
    }

    console.error(`[Recall] Scanning: ${dirName}`);

    // Find all .jsonl files (excluding agent- files which are subagent logs)
    const files = fs.readdirSync(projectPath);
    for (const file of files) {
      if (file.endsWith('.jsonl') && !file.startsWith('agent-')) {
        const sessionPath = path.join(projectPath, file);
        const stat = fs.statSync(sessionPath);
        sessionFiles.push({ path: sessionPath, mtime: stat.mtimeMs });
      }
    }
  }

  // Sort by modification time (newest first)
  sessionFiles.sort((a, b) => b.mtime - a.mtime);

  console.error(`[Recall] Found ${sessionFiles.length} session files total`);
  return sessionFiles.map(f => f.path);
}

/**
 * Find single most recent session file (for backward compatibility)
 */
function findSessionFile(): string | null {
  const files = findAllSessionFiles();
  return files.length > 0 ? files[0] : null;
}

/**
 * Parse session JSONL file and extract transcript
 * Claude Code format: {type: "user"|"assistant", message: {role, content}}
 */
function parseSessionTranscript(sessionFile: string): string {
  const fileContent = fs.readFileSync(sessionFile, 'utf-8');
  const lines = fileContent.trim().split('\n');

  let transcript = '';
  let messageCount = 0;

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const entry = JSON.parse(line);

      // Claude Code JSONL format: {type: "user"|"assistant", message: {content: ...}}
      if (entry.type === 'user' && entry.message?.content) {
        const content = typeof entry.message.content === 'string'
          ? entry.message.content
          : JSON.stringify(entry.message.content);
        transcript += `**User:**\n${content}\n\n`;
        messageCount++;
      } else if (entry.type === 'assistant' && entry.message?.content) {
        // Assistant content is an array of {type: "text", text: "..."} objects
        let content = '';
        if (Array.isArray(entry.message.content)) {
          content = entry.message.content
            .filter((c: { type: string }) => c.type === 'text')
            .map((c: { text: string }) => c.text)
            .join('\n');
        } else if (typeof entry.message.content === 'string') {
          content = entry.message.content;
        }
        if (content) {
          transcript += `**Assistant:**\n${content}\n\n`;
          messageCount++;
        }
      }
      // Skip queue-operation, summary, and other non-message entries
    } catch {
      // Skip malformed lines
      continue;
    }
  }

  console.error(`[Recall] Parsed ${messageCount} messages from session`);
  return transcript;
}

/**
 * Call the /summarize API to generate structured AI summaries
 * Returns structured JSON per Part 6 of the plan
 */
async function generateStructuredSummary(
  token: string,
  transcript: string,
  repoName: string,
  username: string
): Promise<StructuredSessionSummary | null> {
  try {
    console.error('[Recall] Calling /summarize API for structured extraction...');

    const response = await fetch(`${API_URL}/summarize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        events: [{
          type: 'session',
          timestamp: new Date().toISOString(),
          data: {
            transcript,
            repoName,
            username,
          },
        }],
        repoName,
        // Request structured extraction format
        format: 'structured',
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[Recall] Summarize API error: ${response.status} - ${text}`);
      return null;
    }

    const data = await response.json();
    console.error('[Recall] Summarize API success');

    // Handle both old format (small/medium) and new structured format
    if (data.session_title || data.decisions || data.failures) {
      // New structured format
      return {
        session_title: data.session_title || 'Untitled Session',
        summary: data.summary || '',
        detailed_summary: data.detailed_summary || '',
        status: data.status || 'complete',
        next_steps: data.next_steps,
        blocked_by: data.blocked_by,
        decisions: data.decisions || [],
        failures: data.failures || [],
        lessons: data.lessons || [],
        prompt_patterns: data.prompt_patterns || [],
        update_context_md: data.update_context_md || false,
        context_section: data.context_section,
        context_content: data.context_content,
      };
    }

    // Fallback: Convert old format to structured format
    return {
      session_title: 'Session Summary',
      summary: data.small || '',
      detailed_summary: data.medium || '',
      status: 'complete',
      decisions: [],
      failures: [],
      lessons: [],
      prompt_patterns: [],
      update_context_md: false,
    };
  } catch (error) {
    console.error('[Recall] Summarize API failed:', error);
    return null;
  }
}

/**
 * Format structured summary into session markdown with value tags
 * Per Part 5 session file format
 */
function formatSessionMarkdown(
  structured: StructuredSessionSummary,
  username: string,
  dateStr: string,
  timeStr: string,
  transcript?: string
): string {
  let content = `# Session: ${dateStr} - ${timeStr}\n\n`;
  content += `**Developer:** @${username}\n`;
  content += `**Duration:** Unknown\n`;
  content += `**Status:** ${structured.status === 'in-progress' ? 'In Progress' : structured.status === 'blocked' ? 'Blocked' : 'Complete'}\n\n`;

  // Summary
  content += `## Summary\n${structured.summary}\n\n`;

  // Detailed summary as "What I Worked On"
  if (structured.detailed_summary) {
    content += `## What I Worked On\n${structured.detailed_summary}\n\n`;
  }

  // Decisions Made with [DECISION] tags
  if (structured.decisions.length > 0) {
    content += `## Decisions Made\n\n`;
    for (const d of structured.decisions) {
      content += `### [DECISION] ${d.title}\n`;
      content += `**What:** ${d.what}\n`;
      content += `**Why:** ${d.why}\n`;
      if (d.alternatives && d.alternatives.length > 0) {
        content += `**Alternatives:**\n`;
        for (const alt of d.alternatives) {
          content += `- ${alt.option}: Rejected because ${alt.rejected_because}\n`;
        }
      }
      content += `**Confidence:** ${d.confidence}\n\n`;
    }
  }

  // What Failed with [FAILURE] tags
  if (structured.failures.length > 0) {
    content += `## What Failed\n\n`;
    for (const f of structured.failures) {
      content += `### [FAILURE] ${f.title}\n`;
      content += `**What we tried:** ${f.what_tried}\n`;
      content += `**What happened:** ${f.what_happened}\n`;
      content += `**Root cause:** ${f.root_cause}\n`;
      content += `**Time lost:** ${f.time_lost_minutes} minutes\n`;
      content += `**Resolution:** ${f.resolution}\n\n`;
    }
  }

  // Lessons Learned with [LESSON] tags
  if (structured.lessons.length > 0) {
    content += `## Lessons Learned\n\n`;
    for (const l of structured.lessons) {
      content += `### [LESSON] ${l.title}\n`;
      content += `**From:** ${l.derived_from_failure}\n`;
      content += `**Lesson:** ${l.lesson}\n`;
      content += `**When this applies:** ${l.when_applies}\n\n`;
    }
  }

  // Prompt Patterns with [PROMPT_PATTERN] tags
  if (structured.prompt_patterns.length > 0) {
    content += `## Prompt Patterns\n\n`;
    for (const p of structured.prompt_patterns) {
      content += `### [PROMPT_PATTERN] ${p.title}\n`;
      content += `**Prompt:** "${p.prompt}"\n`;
      content += `**Why it worked:** ${p.why_effective}\n`;
      content += `**When to use:** ${p.when_to_use}\n\n`;
    }
  }

  // Where I Left Off
  if (structured.next_steps) {
    content += `## Where I Left Off\n${structured.next_steps}\n\n`;
  }

  // Blockers
  if (structured.blocked_by) {
    content += `## Blockers\n${structured.blocked_by}\n\n`;
  }

  // Optional: Include raw transcript preview
  if (transcript) {
    const messageCount = (transcript.match(/\*\*User:\*\*|\*\*Assistant:\*\*/g) || []).length;
    content += `---\n_${messageCount} messages in full transcript_\n`;
  }

  return content;
}

/**
 * Build context.md content per Part 5 structure
 */
function buildContextMd(
  repoName: string,
  recentSessions: Array<{ structured?: StructuredSessionSummary; content: string; path: string }>,
  existingContext?: string
): string {
  const dateStr = new Date().toISOString().split('T')[0];

  let content = `# Recall Context\n\n`;

  // What This Project Is (preserve from existing or build from sessions)
  let projectInfo = '';
  if (existingContext) {
    const match = existingContext.match(/## What This Project Is\n([\s\S]*?)(?=\n## |$)/);
    if (match) projectInfo = match[1].trim();
  }
  content += `## What This Project Is\n`;
  content += projectInfo || `${repoName}\n_Add project description here._`;
  content += `\n\n`;

  // How We Work Here (conventions from sessions)
  let conventions = '';
  if (existingContext) {
    const match = existingContext.match(/## How We Work Here\n([\s\S]*?)(?=\n## |$)/);
    if (match) conventions = match[1].trim();
  }
  content += `## How We Work Here\n`;
  content += conventions || `_Conventions will be extracted from sessions._`;
  content += `\n\n`;

  // Don't Repeat These Mistakes (failures from sessions)
  const allFailures: Array<{ title: string; lesson: string }> = [];
  for (const session of recentSessions) {
    if (session.structured?.failures) {
      for (const f of session.structured.failures) {
        allFailures.push({ title: f.title, lesson: f.resolution });
      }
    }
    if (session.structured?.lessons) {
      for (const l of session.structured.lessons) {
        allFailures.push({ title: l.title, lesson: l.lesson });
      }
    }
  }
  // Also preserve existing mistakes
  if (existingContext) {
    const match = existingContext.match(/## Don't Repeat These Mistakes\n([\s\S]*?)(?=\n## |$)/);
    if (match) {
      const existingMistakes = match[1].trim().split('\n').filter(line => line.startsWith('-'));
      for (const m of existingMistakes) {
        const cleanedMistake = m.replace(/^- /, '');
        if (!allFailures.some(f => f.title === cleanedMistake || f.lesson.includes(cleanedMistake))) {
          allFailures.push({ title: cleanedMistake, lesson: '' });
        }
      }
    }
  }
  content += `## Don't Repeat These Mistakes\n`;
  if (allFailures.length > 0) {
    for (const f of allFailures.slice(0, 10)) { // Limit to 10 most recent
      content += `- ${f.lesson || f.title}\n`;
    }
  } else {
    content += `_No failures recorded yet._\n`;
  }
  content += `\n`;

  // Active Work table
  content += `## Active Work\n`;
  content += `| Who | What | Status | Notes |\n`;
  content += `|-----|------|--------|-------|\n`;

  const activeWork: Array<{ who: string; what: string; status: string; notes: string }> = [];
  for (const session of recentSessions.slice(0, 5)) {
    const devMatch = session.content.match(/\*\*Developer:\*\* @(\w+)/);
    const dev = devMatch ? devMatch[1] : 'unknown';
    const status = session.structured?.status || 'complete';
    const summary = session.structured?.summary || session.content.substring(0, 100);
    activeWork.push({
      who: `@${dev}`,
      what: summary.substring(0, 50),
      status: status === 'in-progress' ? 'In progress' : status === 'blocked' ? 'Blocked' : 'Done',
      notes: session.structured?.next_steps?.substring(0, 30) || '',
    });
  }
  for (const w of activeWork) {
    content += `| ${w.who} | ${w.what} | ${w.status} | ${w.notes} |\n`;
  }
  content += `\n`;

  // Needs Attention
  const blockers = recentSessions
    .filter(s => s.structured?.status === 'blocked')
    .map(s => {
      const devMatch = s.content.match(/\*\*Developer:\*\* @(\w+)/);
      return `@${devMatch?.[1] || 'unknown'} blocked: ${s.structured?.blocked_by || 'Unknown'}`;
    });
  content += `## Needs Attention\n`;
  if (blockers.length > 0) {
    for (const b of blockers) {
      content += `- ${b}\n`;
    }
  } else {
    content += `_No blockers._\n`;
  }
  content += `\n`;

  // Recently Completed
  const completed = recentSessions
    .filter(s => s.structured?.status === 'complete')
    .slice(0, 5);
  content += `## Recently Completed\n`;
  if (completed.length > 0) {
    for (const c of completed) {
      const devMatch = c.content.match(/\*\*Developer:\*\* @(\w+)/);
      const dev = devMatch?.[1] || 'unknown';
      content += `- ${c.structured?.summary?.substring(0, 60) || 'Session'} (@${dev})\n`;
    }
  } else {
    content += `_No completed work yet._\n`;
  }
  content += `\n`;

  // Coming Up
  const nextSteps = recentSessions
    .filter(s => s.structured?.next_steps)
    .slice(0, 3);
  content += `## Coming Up\n`;
  if (nextSteps.length > 0) {
    for (const n of nextSteps) {
      content += `- ${n.structured?.next_steps?.substring(0, 80)}\n`;
    }
  } else {
    content += `_No upcoming work listed._\n`;
  }
  content += `\n`;

  content += `_Last synced: ${dateStr}_\n`;

  return content;
}

/**
 * Build history.md content per Part 5 structure
 */
function buildHistoryMd(
  repoName: string,
  allSessions: Array<{ structured?: StructuredSessionSummary; content: string; path: string }>,
  existingHistory?: string
): string {
  let content = `# Recall History\n\n`;

  // Decision Log
  content += `## Decision Log\n\n`;
  const allDecisions: Array<{ date: string; decision: ExtractedDecision; user: string; sessionPath: string }> = [];
  for (const session of allSessions) {
    if (session.structured?.decisions) {
      const dateMatch = session.content.match(/# Session: (\d{4}-\d{2}-\d{2})/);
      const devMatch = session.content.match(/\*\*Developer:\*\* @(\w+)/);
      const date = dateMatch?.[1] || 'Unknown';
      const user = devMatch?.[1] || 'unknown';
      for (const d of session.structured.decisions) {
        allDecisions.push({ date, decision: d, user, sessionPath: session.path });
      }
    }
  }
  // Also preserve existing decisions from history
  if (existingHistory) {
    const decisionSection = existingHistory.match(/## Decision Log\n\n([\s\S]*?)(?=\n## |$)/);
    // Keep existing format decisions that aren't duplicates
  }
  if (allDecisions.length > 0) {
    for (const { date, decision, user, sessionPath } of allDecisions) {
      content += `### ${date}: ${decision.title} (@${user})\n`;
      content += `${decision.what}\n`;
      content += `**Why:** ${decision.why}\n`;
      if (decision.alternatives && decision.alternatives.length > 0) {
        content += `**Alternatives considered:** ${decision.alternatives.map(a => a.option).join(', ')}\n`;
      }
      content += `**Session:** ${sessionPath}\n\n`;
    }
  } else {
    content += `_No decisions recorded yet._\n\n`;
  }

  // Failure Log
  content += `## Failure Log\n\n`;
  const allFailures: Array<{ date: string; failure: ExtractedFailure; lesson?: ExtractedLesson; user: string; sessionPath: string }> = [];
  for (const session of allSessions) {
    if (session.structured?.failures) {
      const dateMatch = session.content.match(/# Session: (\d{4}-\d{2}-\d{2})/);
      const devMatch = session.content.match(/\*\*Developer:\*\* @(\w+)/);
      const date = dateMatch?.[1] || 'Unknown';
      const user = devMatch?.[1] || 'unknown';
      for (const f of session.structured.failures) {
        const relatedLesson = session.structured.lessons?.find(l => l.derived_from_failure === f.title);
        allFailures.push({ date, failure: f, lesson: relatedLesson, user, sessionPath: session.path });
      }
    }
  }
  if (allFailures.length > 0) {
    for (const { date, failure, lesson, user, sessionPath } of allFailures) {
      content += `### ${failure.title} (@${user}, ${date})\n`;
      content += `${failure.what_tried}\n`;
      content += `**Root cause:** ${failure.root_cause}\n`;
      content += `**Solution:** ${failure.resolution}\n`;
      content += `**Time wasted:** ${failure.time_lost_minutes} minutes\n`;
      if (lesson) {
        content += `**Lesson:** ${lesson.lesson}\n`;
      }
      content += `**Session:** ${sessionPath}\n\n`;
    }
  } else {
    content += `_No failures recorded yet._\n\n`;
  }

  // Prompt Patterns
  content += `## Prompt Patterns\n\n`;
  const allPatterns: Array<{ pattern: ExtractedPromptPattern; user: string; sessionPath: string }> = [];
  for (const session of allSessions) {
    if (session.structured?.prompt_patterns) {
      const devMatch = session.content.match(/\*\*Developer:\*\* @(\w+)/);
      const user = devMatch?.[1] || 'unknown';
      for (const p of session.structured.prompt_patterns) {
        allPatterns.push({ pattern: p, user, sessionPath: session.path });
      }
    }
  }
  if (allPatterns.length > 0) {
    for (const { pattern, user, sessionPath } of allPatterns) {
      content += `### ${pattern.title} (@${user})\n`;
      content += `> "${pattern.prompt}"\n\n`;
      content += `**Why it works:** ${pattern.why_effective}\n`;
      content += `**When to use:** ${pattern.when_to_use}\n`;
      content += `**Session:** ${sessionPath}\n\n`;
    }
  } else {
    content += `_No prompt patterns recorded yet._\n\n`;
  }

  // Timeline (by month)
  content += `## Timeline\n\n`;
  const sessionsByMonth: Record<string, string[]> = {};
  for (const session of allSessions) {
    const dateMatch = session.content.match(/# Session: (\d{4}-\d{2})/);
    if (dateMatch) {
      const month = dateMatch[1];
      if (!sessionsByMonth[month]) sessionsByMonth[month] = [];
      const summary = session.structured?.summary || 'Session recorded';
      sessionsByMonth[month].push(summary.substring(0, 60));
    }
  }
  const months = Object.keys(sessionsByMonth).sort().reverse();
  for (const month of months.slice(0, 6)) { // Last 6 months
    const [year, monthNum] = month.split('-');
    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    content += `### ${monthNames[parseInt(monthNum)]} ${year}\n`;
    for (const s of sessionsByMonth[month].slice(0, 5)) {
      content += `- ${s}\n`;
    }
    content += `\n`;
  }

  content += `_Last updated: ${new Date().toISOString().split('T')[0]}_\n`;

  return content;
}

/**
 * Legacy: Call the /summarize API to generate AI summaries (backward compat)
 */
async function generateSummaries(
  token: string,
  transcript: string,
  repoName: string
): Promise<{ small: string; medium: string } | null> {
  const username = os.userInfo().username;
  const structured = await generateStructuredSummary(token, transcript, repoName, username);

  if (!structured) return null;

  // Convert structured to legacy format
  const dateStr = new Date().toISOString().split('T')[0];
  const sessions = [{ structured, content: '', path: '' }];

  return {
    small: buildContextMd(repoName, sessions),
    medium: buildHistoryMd(repoName, sessions),
  };
}

// Create the MCP server with resources, prompts, and tools capabilities
const server = new McpServer({
  name: 'recall',
  version: '0.6.5',
}, {
  capabilities: {
    tools: {},
    resources: {},
    prompts: {},
  },
});

// Prompt: recall-context - Injected team memory for this repo
// This prompt is designed to be auto-loaded on session start
server.registerPrompt(
  'recall-context',
  {
    description: 'Team memory context for this repository. Use this at the start of every session.',
  },
  async () => {
    const config = loadConfig();
    if (!config?.token) {
      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: '[Recall: Not configured - run recall_auth to set up team memory]',
          },
        }],
      };
    }

    const teamKey = await getTeamKey(config.token);
    if (!teamKey?.hasAccess) {
      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `[Recall: ${teamKey?.message || 'Subscription required - visit https://recall.team/dashboard'}]`,
          },
        }],
      };
    }

    const smallContent = readRecallFile('context.md', teamKey.key);
    const repoName = getCurrentRepoName();

    // Log access (non-blocking)
    logMemoryAccess(config.token, 'context', 'read');

    if (!smallContent) {
      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `[Recall: No team memory for ${repoName} yet. Use recall_save_session to save your first session.]`,
          },
        }],
      };
    }

    return {
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `<team-memory>\n${smallContent}\n</team-memory>`,
        },
      }],
    };
  }
);

// Resource: recall://context - Auto-loaded team memory (context.md)
// This is the core value prop - always loaded on session start
server.registerResource(
  'context',
  'recall://context',
  {
    description: 'Team memory context for this repository. Auto-loaded on session start.',
    mimeType: 'text/markdown',
  },
  async () => {
    const config = loadConfig();
    if (!config?.token) {
      return {
        contents: [{
          uri: 'recall://context',
          mimeType: 'text/markdown',
          text: '# Recall Not Configured\n\nRun `recall_auth` with your token from https://recall.team/dashboard',
        }],
      };
    }

    const teamKey = await getTeamKey(config.token);
    if (!teamKey?.hasAccess) {
      return {
        contents: [{
          uri: 'recall://context',
          mimeType: 'text/markdown',
          text: `# Recall Access Required\n\n${teamKey?.message || 'Check your subscription at https://recall.team/dashboard'}`,
        }],
      };
    }

    const smallContent = readRecallFile('context.md', teamKey.key);
    const repoName = getCurrentRepoName();

    // Log access (non-blocking)
    logMemoryAccess(config.token, 'context', 'read');

    if (!smallContent) {
      return {
        contents: [{
          uri: 'recall://context',
          mimeType: 'text/markdown',
          text: `# ${repoName} - No Memory Yet\n\nThis is a new repository with no team memory.\n\nUse \`recall_save_session\` to save your first session.`,
        }],
      };
    }

    return {
      contents: [{
        uri: 'recall://context',
        mimeType: 'text/markdown',
        text: smallContent,
      }],
    };
  }
);

// Resource: recall://history - Session history (history.md)
// Loaded when user says "remember" or asks for more context
server.registerResource(
  'history',
  'recall://history',
  {
    description: 'Detailed session history. Load this when you need more context about past work.',
    mimeType: 'text/markdown',
  },
  async () => {
    const config = loadConfig();
    if (!config?.token) {
      return {
        contents: [{
          uri: 'recall://history',
          mimeType: 'text/markdown',
          text: '# Recall Not Configured\n\nRun `recall_auth` with your token.',
        }],
      };
    }

    const teamKey = await getTeamKey(config.token);
    if (!teamKey?.hasAccess) {
      return {
        contents: [{
          uri: 'recall://history',
          mimeType: 'text/markdown',
          text: `# Recall Access Required\n\n${teamKey?.message || 'Check your subscription.'}`,
        }],
      };
    }

    const mediumContent = readRecallFile('history.md', teamKey.key);

    // Log access (non-blocking)
    logMemoryAccess(config.token, 'history', 'read');

    if (!mediumContent) {
      return {
        contents: [{
          uri: 'recall://history',
          mimeType: 'text/markdown',
          text: '# No Session History\n\nNo sessions have been saved yet.',
        }],
      };
    }

    return {
      contents: [{
        uri: 'recall://history',
        mimeType: 'text/markdown',
        text: mediumContent,
      }],
    };
  }
);

// Resource: recall://sessions - Individual session records
// Loaded when user says "ultraremember" or needs complete history
server.registerResource(
  'sessions',
  'recall://sessions',
  {
    description: 'Individual session records from sessions/ folder. Load for specific session details.',
    mimeType: 'text/markdown',
  },
  async () => {
    const config = loadConfig();
    if (!config?.token) {
      return {
        contents: [{
          uri: 'recall://sessions',
          mimeType: 'text/markdown',
          text: '# Recall Not Configured',
        }],
      };
    }

    const teamKey = await getTeamKey(config.token);
    if (!teamKey?.hasAccess) {
      return {
        contents: [{
          uri: 'recall://sessions',
          mimeType: 'text/markdown',
          text: `# Recall Access Required\n\n${teamKey?.message || 'Check your subscription.'}`,
        }],
      };
    }

    // Read all sessions from sessions/ folder
    const sessionsDir = path.join(getRecallDir(), 'sessions');
    let allContent = '# Session Records\n\n';

    if (fs.existsSync(sessionsDir)) {
      const readSessionsRecursive = (dir: string, relativePath: string = ''): string => {
        let content = '';
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            content += readSessionsRecursive(fullPath, path.join(relativePath, entry.name));
          } else if (entry.name.endsWith('.md')) {
            const sessionContent = readRecallFile(path.join('sessions', relativePath, entry.name), teamKey.key);
            if (sessionContent) {
              content += `---\n## ${relativePath}/${entry.name}\n\n${sessionContent}\n\n`;
            }
          }
        }
        return content;
      };
      allContent += readSessionsRecursive(sessionsDir);
    } else {
      allContent += '_No sessions recorded yet._\n';
    }

    // Log access (non-blocking)
    logMemoryAccess(config.token, 'sessions', 'read');

    return {
      contents: [{
        uri: 'recall://sessions',
        mimeType: 'text/markdown',
        text: allContent,
      }],
    };
  }
);

// Tool: recall_auth - Authenticate with Recall
server.registerTool('recall_auth', {
  description: 'Authenticate with Recall using your API token. Get your token from https://recall.team/dashboard',
  inputSchema: z.object({
    token: z.string().describe('Your Recall API token from the dashboard'),
  }).shape,
}, async (args) => {
  const token = args.token as string;

  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: 'Invalid token. Get your token from https://recall.team/dashboard' }],
        isError: true,
      };
    }

    const user = await response.json();
    saveConfig({ token });

    // Try to get team key to verify access
    const teamKey = await getTeamKey(token);

    let message = `Authenticated as ${user.name || user.githubUsername}`;
    if (user.team) {
      message += ` (Team: ${user.team.name})`;
    }
    if (teamKey?.hasAccess) {
      message += '\n\nRecall is ready! Your team memory will be encrypted and synced.';
    } else if (user.team) {
      message += '\n\nNote: Waiting for subscription activation.';
    } else {
      message += '\n\nNote: Join or create a team at https://recall.team/dashboard';
    }

    return { content: [{ type: 'text', text: message }] };
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}` }],
      isError: true,
    };
  }
});

// Tool: recall_get_context - Get team brain for current repo
server.registerTool('recall_get_context', {
  description: 'Get team brain (context.md) for the current repository. This is the distilled current state - loads automatically at every session start. Use recall_get_history for the full encyclopedia.',
  inputSchema: z.object({
    projectPath: z.string().optional().describe('Optional: explicit path to the project root. If not provided, uses current working directory.'),
  }).shape,
}, async (args) => {
  const projectPath = args.projectPath as string | undefined;

  // Log the paths for debugging
  const cwd = process.cwd();
  const effectivePath = projectPath || cwd;
  console.error(`[Recall] recall_get_context called`);
  console.error(`[Recall]   process.cwd(): ${cwd}`);
  console.error(`[Recall]   projectPath arg: ${projectPath || '(not provided)'}`);
  console.error(`[Recall]   effective path: ${effectivePath}`);
  console.error(`[Recall]   RECALL_API_TOKEN env: ${process.env.RECALL_API_TOKEN ? process.env.RECALL_API_TOKEN.substring(0, 10) + '...' : 'NOT SET'}`);

  const config = loadConfig();
  console.error(`[Recall]   loadConfig returned token: ${config?.token ? config.token.substring(0, 10) + '...' : 'NULL'}`);
  if (!config?.token) {
    return {
      content: [{ type: 'text', text: 'Not authenticated. Run recall_auth first with your token from https://recall.team/dashboard' }],
      isError: true,
    };
  }

  console.error(`[Recall]   Calling getTeamKey with token: ${config.token.substring(0, 10)}...`);
  const teamKey = await getTeamKey(config.token);
  console.error(`[Recall]   getTeamKey returned: hasAccess=${teamKey?.hasAccess}, message=${teamKey?.message || 'none'}`);
  if (!teamKey?.hasAccess) {
    return {
      content: [{ type: 'text', text: teamKey?.message || 'No access. Check your subscription at https://recall.team/dashboard' }],
      isError: true,
    };
  }

  // Use explicit path if provided, otherwise use cwd
  const recallDir = projectPath
    ? path.join(projectPath, RECALL_DIR)
    : getRecallDir();
  console.error(`[Recall]   reading from: ${recallDir}`);

  const smallPath = path.join(recallDir, 'context.md');
  if (!fs.existsSync(smallPath)) {
    const repoName = getCurrentRepoName();
    return {
      content: [{ type: 'text', text: `No team memory found for this repo yet.\n\nTo start building memory, use:\n- recall_save_session to save session summaries\n- recall_log_decision to log important decisions\n\nRepo: ${repoName}\nLooking in: ${recallDir}` }],
    };
  }

  // Read and decrypt
  const encrypted = fs.readFileSync(smallPath, 'utf-8');
  let smallContent: string | null = null;

  // Handle versioned encryption format
  if (encrypted.startsWith('RECALL_ENCRYPTED:')) {
    const parts = encrypted.split(':');
    if (parts.length === 5 && parts[0] === 'RECALL_ENCRYPTED' && parts[1] === 'v1') {
      const encryptedData = `${parts[2]}:${parts[3]}:${parts[4]}`;
      smallContent = decrypt(encryptedData, teamKey.key);
    }
  } else if (encrypted.includes(':')) {
    smallContent = decrypt(encrypted, teamKey.key);
  } else {
    smallContent = encrypted;
  }

  if (!smallContent) {
    const repoName = getCurrentRepoName();
    return {
      content: [{ type: 'text', text: `Failed to decrypt team memory.\n\nRepo: ${repoName}\nPath: ${recallDir}` }],
      isError: true,
    };
  }

  // Log access (non-blocking)
  logMemoryAccess(config.token, 'context', 'read');

  return { content: [{ type: 'text', text: `[Reading from: ${recallDir}]\n\n${smallContent}` }] };
});

// Tool: recall_get_history - "remember" hotword: context.md + recent sessions
// Per Part 7: Returns context.md + recent sessions (last 5-10 from sessions/ folder)
server.registerTool('recall_get_history', {
  description: 'Get detailed session history (medium.md). This includes more context than recall_get_context but uses more tokens.',
  inputSchema: z.object({
    projectPath: z.string().optional().describe('Path to the project root. REQUIRED to ensure correct repo context. Use the absolute path to the project you are working in.'),
  }).shape,
}, async (args) => {
  const projectPath = args.projectPath as string | undefined;
  const effectivePath = projectPath || process.cwd();

  console.error(`[Recall] recall_get_history called (hotword: "remember")`);
  console.error(`[Recall]   projectPath: ${projectPath || '(not provided - using cwd)'}`);
  console.error(`[Recall]   effective path: ${effectivePath}`);

  const config = loadConfig();
  if (!config?.token) {
    return {
      content: [{ type: 'text', text: 'Not authenticated. Run recall_auth first.' }],
      isError: true,
    };
  }

  const teamKey = await getTeamKey(config.token);
  if (!teamKey?.hasAccess) {
    return {
      content: [{ type: 'text', text: teamKey?.message || 'No access. Check your subscription.' }],
      isError: true,
    };
  }

  // Get repo name from the project path (ties to GitHub repo)
  const repoName = getRepoNameFromPath(effectivePath);
  const recallDir = path.join(effectivePath, RECALL_DIR);

  console.error(`[Recall]   repo: ${repoName}`);
  console.error(`[Recall]   recallDir: ${recallDir}`);

  if (!fs.existsSync(recallDir)) {
    return {
      content: [{ type: 'text', text: `No .recall/ directory found at ${effectivePath}\n\nMake sure you provide the correct projectPath parameter.` }],
    };
  }

  // Per Part 7: "remember" loads context.md + recent sessions (5-10 sessions)
  let output = '';

  // 1. Load context.md first (team brain)
  const contextContent = readRecallFile('context.md', teamKey.key, recallDir);
  if (contextContent) {
    output += `# Team Context\n\n${contextContent}\n\n`;
  }

  // 2. Load recent sessions from sessions/ folder (last 10)
  const sessionsDir = path.join(recallDir, 'sessions');
  if (fs.existsSync(sessionsDir)) {
    const sessions: Array<{ path: string; content: string; mtime: number }> = [];

    const readSessionsRecursive = (dir: string, relativePath: string = ''): void => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          readSessionsRecursive(fullPath, path.join(relativePath, entry.name));
        } else if (entry.name.endsWith('.md')) {
          const sessionContent = readRecallFile(path.join('sessions', relativePath, entry.name), teamKey.key, recallDir);
          if (sessionContent) {
            const stat = fs.statSync(fullPath);
            sessions.push({
              path: `sessions/${relativePath}/${entry.name}`,
              content: sessionContent,
              mtime: stat.mtimeMs,
            });
          }
        }
      }
    };
    readSessionsRecursive(sessionsDir);

    // Sort by mtime (newest first) and take last 10
    sessions.sort((a, b) => b.mtime - a.mtime);
    const recentSessions = sessions.slice(0, 10);

    if (recentSessions.length > 0) {
      output += `---\n\n# Recent Sessions (${recentSessions.length} of ${sessions.length})\n\n`;
      for (const session of recentSessions) {
        output += `## ${session.path}\n\n${session.content}\n\n---\n\n`;
      }
    }
  }

  if (!output) {
    return {
      content: [{ type: 'text', text: `No session history yet for ${repoName}.\n\nUse recall_save_session to start building history.` }],
    };
  }

  // Log access (non-blocking) - includes repo name for tracking
  logMemoryAccess(config.token, 'history', 'read');

  return { content: [{ type: 'text', text: `[Repo: ${repoName} - "remember" mode: context + recent sessions]\n\n${output}` }] };
});

// Tool: recall_get_transcripts - "ultraremember" hotword: context.md + history.md
// Per Part 7: Returns context.md + history.md (full encyclopedia for onboarding)
server.registerTool('recall_get_transcripts', {
  description: 'Get full session transcripts (large.md). WARNING: This can be very large and use many tokens. Only use when you need complete historical details.',
  inputSchema: z.object({
    projectPath: z.string().optional().describe('Path to the project root. REQUIRED to ensure correct repo context. Use the absolute path to the project you are working in.'),
  }).shape,
}, async (args) => {
  const projectPath = args.projectPath as string | undefined;
  const effectivePath = projectPath || process.cwd();

  console.error(`[Recall] recall_get_transcripts called (hotword: "ultraremember")`);
  console.error(`[Recall]   projectPath: ${projectPath || '(not provided - using cwd)'}`);
  console.error(`[Recall]   effective path: ${effectivePath}`);

  const config = loadConfig();
  if (!config?.token) {
    return {
      content: [{ type: 'text', text: 'Not authenticated. Run recall_auth first.' }],
      isError: true,
    };
  }

  const teamKey = await getTeamKey(config.token);
  if (!teamKey?.hasAccess) {
    return {
      content: [{ type: 'text', text: teamKey?.message || 'No access. Check your subscription.' }],
      isError: true,
    };
  }

  // Get repo name from the project path (ties to GitHub repo)
  const repoName = getRepoNameFromPath(effectivePath);
  const recallDir = path.join(effectivePath, RECALL_DIR);

  console.error(`[Recall]   repo: ${repoName}`);
  console.error(`[Recall]   recallDir: ${recallDir}`);

  if (!fs.existsSync(recallDir)) {
    return {
      content: [{ type: 'text', text: `No .recall/ directory found at ${effectivePath}\n\nMake sure you provide the correct projectPath parameter.` }],
    };
  }

  // Per Part 7: "ultraremember" loads context.md + history.md (full encyclopedia)
  let output = '';

  // 1. Load context.md first (team brain)
  const contextContent = readRecallFile('context.md', teamKey.key, recallDir);
  if (contextContent) {
    output += `# Team Context\n\n${contextContent}\n\n`;
  }

  // 2. Load full history.md (the encyclopedia)
  const historyContent = readRecallFile('history.md', teamKey.key, recallDir);
  if (historyContent) {
    output += `---\n\n# Full History (Encyclopedia)\n\n${historyContent}\n\n`;
  }

  if (!output) {
    return {
      content: [{ type: 'text', text: `No session records yet for ${repoName}.\n\nUse recall_save_session to start building history.` }],
    };
  }

  // Log access (non-blocking) - includes repo name for tracking
  logMemoryAccess(config.token, 'sessions', 'read');

  return { content: [{ type: 'text', text: `[Repo: ${repoName} - "ultraremember" mode: context + full history]\n\n${output}` }] };
});

// Tool: recall_import_transcript - Import full session transcript from JSONL file
server.registerTool('recall_import_transcript', {
  description: 'Import a full session transcript from a Claude session JSONL file into sessions/ folder. Use this at the end of a session to save the complete conversation history.',
  inputSchema: z.object({
    sessionFile: z.string().describe('Path to the session JSONL file (e.g., ~/.claude/projects/.../session.jsonl)'),
  }).shape,
}, async (args) => {
  const config = loadConfig();
  if (!config?.token) {
    return {
      content: [{ type: 'text', text: 'Not authenticated. Run recall_auth first.' }],
      isError: true,
    };
  }

  const teamKey = await getTeamKey(config.token);
  if (!teamKey?.hasAccess) {
    return {
      content: [{ type: 'text', text: teamKey?.message || 'No access. Check your subscription.' }],
      isError: true,
    };
  }

  const sessionFile = args.sessionFile as string;

  // Resolve home directory
  const resolvedPath = sessionFile.replace(/^~/, os.homedir());

  if (!fs.existsSync(resolvedPath)) {
    return {
      content: [{ type: 'text', text: `Session file not found: ${sessionFile}` }],
      isError: true,
    };
  }

  try {
    const fileContent = fs.readFileSync(resolvedPath, 'utf-8');
    const lines = fileContent.trim().split('\n');

    const now = new Date();
    const username = os.userInfo().username;
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const sessionFilename = `${day}-${hours}${minutes}.md`;
    const sessionPath = `sessions/${yearMonth}/${username}/${sessionFilename}`;

    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];

    // Parse JSONL and format as readable transcript
    let transcript = '';
    let messageCount = 0;

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const entry = JSON.parse(line);

        // Handle different JSONL formats Claude might use
        if (entry.type === 'human' || entry.role === 'user') {
          const content = entry.content || entry.message || entry.text || '';
          if (content) {
            transcript += `**User:**\n${content}\n\n`;
            messageCount++;
          }
        } else if (entry.type === 'assistant' || entry.role === 'assistant') {
          const content = entry.content || entry.message || entry.text || '';
          if (content) {
            transcript += `**Assistant:**\n${content}\n\n`;
            messageCount++;
          }
        } else if (entry.message) {
          // Generic message format
          const role = entry.role || entry.type || 'unknown';
          transcript += `**${role}:**\n${entry.message}\n\n`;
          messageCount++;
        }
      } catch {
        // Skip malformed lines
        continue;
      }
    }

    // Build session content per plan structure
    let sessionContent = `# Session: ${dateStr} - ${timeStr}\n\n`;
    sessionContent += `**Developer:** @${username}\n`;
    sessionContent += `**Source:** ${path.basename(sessionFile)}\n\n`;
    sessionContent += `## Transcript\n\n`;
    sessionContent += transcript;
    sessionContent += `\n_${messageCount} messages imported_\n`;

    // Write individual session file
    writeSessionFile(sessionPath, sessionContent, teamKey.key);

    // Generate summaries from sessions folder
    generateSummariesFromSessions(teamKey.key);

    // Log access
    logMemoryAccess(config.token, 'sessions', 'write');

    return {
      content: [{ type: 'text', text: `Imported ${messageCount} messages from session transcript.\n\nSaved to .recall/${sessionPath} (encrypted).\nUpdated history.md and context.md.` }],
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Failed to import transcript: ${error instanceof Error ? error.message : 'Unknown error'}` }],
      isError: true,
    };
  }
});

// Tool: recall_import_all_sessions - Import ALL session transcripts to sessions/ folder
server.registerTool('recall_import_all_sessions', {
  description: 'Import ALL Claude session transcripts for this project into sessions/ folder. This finds every JSONL session file and imports them as readable markdown.',
  inputSchema: z.object({
    projectPath: z.string().optional().describe('Optional: explicit path to the project root. If not provided, uses current working directory.'),
  }).shape,
}, async (args) => {
  const config = loadConfig();
  if (!config?.token) {
    return {
      content: [{ type: 'text', text: 'Not authenticated. Run recall_auth first.' }],
      isError: true,
    };
  }

  const teamKey = await getTeamKey(config.token);
  if (!teamKey?.hasAccess) {
    return {
      content: [{ type: 'text', text: teamKey?.message || 'No access. Check your subscription.' }],
      isError: true,
    };
  }

  const projectPath = args.projectPath as string | undefined;
  const cwd = projectPath || process.cwd();
  const username = os.userInfo().username;

  console.error(`[Recall] recall_import_all_sessions called`);
  console.error(`[Recall]   cwd: ${cwd}`);

  // Find all session files
  const sessionFiles = findAllSessionFiles();

  if (sessionFiles.length === 0) {
    return {
      content: [{ type: 'text', text: `No session files found for this project.\n\nLooking for: ${cwd.replace(/\//g, '-')}\n\nMake sure you're running this from the same directory where you opened Claude.` }],
    };
  }

  console.error(`[Recall] Found ${sessionFiles.length} session files to import`);

  let totalMessages = 0;
  const importedPaths: string[] = [];

  // Process each session file (oldest first for chronological order)
  const sortedFiles = [...sessionFiles].reverse();

  ensureRecallDir();

  for (const sessionFile of sortedFiles) {
    const filename = path.basename(sessionFile);
    const stat = fs.statSync(sessionFile);
    const sessionDate = new Date(stat.mtime);
    const yearMonth = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}`;
    const day = String(sessionDate.getDate()).padStart(2, '0');
    const hours = String(sessionDate.getHours()).padStart(2, '0');
    const minutes = String(sessionDate.getMinutes()).padStart(2, '0');
    const sessionFilename = `${day}-${hours}${minutes}.md`;
    const sessionPath = `sessions/${yearMonth}/${username}/${sessionFilename}`;

    console.error(`[Recall] Processing: ${filename} -> ${sessionPath}`);

    const dateStr = sessionDate.toISOString().split('T')[0];
    const timeStr = sessionDate.toTimeString().split(' ')[0];

    // Parse transcript
    const transcript = parseSessionTranscript(sessionFile);
    const messageCount = (transcript.match(/\*\*User:\*\*|\*\*Assistant:\*\*/g) || []).length;
    totalMessages += messageCount;

    // Build session content per plan structure
    let sessionContent = `# Session: ${dateStr} - ${timeStr}\n\n`;
    sessionContent += `**Developer:** @${username}\n`;
    sessionContent += `**Source:** ${filename}\n\n`;
    sessionContent += `## Transcript\n\n`;
    sessionContent += transcript;
    sessionContent += `\n_${messageCount} messages_\n`;

    // Write individual session file
    writeSessionFile(sessionPath, sessionContent, teamKey.key);
    importedPaths.push(sessionPath);
  }

  // Generate summaries from sessions folder
  generateSummariesFromSessions(teamKey.key);

  // Log access
  logMemoryAccess(config.token, 'sessions', 'write');

  const recallDir = projectPath
    ? path.join(projectPath, RECALL_DIR)
    : getRecallDir();

  return {
    content: [{ type: 'text', text: `Imported ${sessionFiles.length} sessions (${totalMessages} total messages).\n\nSessions imported:\n${importedPaths.map(p => `  - ${p}`).join('\n')}\n\nSaved to: ${recallDir}/ (sessions/, history.md, context.md - all encrypted)` }],
  };
});

// Tool: recall_save_session - Save session summary
server.registerTool('recall_save_session', {
  description: 'Save a summary of what was accomplished in this coding session. This updates the team memory files.',
  inputSchema: z.object({
    summary: z.string().describe('What was accomplished in this session'),
    decisions: z.array(z.object({
      what: z.string().describe('What was decided'),
      why: z.string().describe('Why this decision was made'),
    })).optional().describe('Key decisions made'),
    filesChanged: z.array(z.string()).optional().describe('Files that were modified'),
    nextSteps: z.string().optional().describe('What should be done next'),
    blockers: z.string().optional().describe('Any blockers encountered'),
  }).shape,
}, async (args) => {
  const config = loadConfig();
  if (!config?.token) {
    return {
      content: [{ type: 'text', text: 'Not authenticated. Run recall_auth first.' }],
      isError: true,
    };
  }

  const teamKey = await getTeamKey(config.token);
  if (!teamKey?.hasAccess) {
    return {
      content: [{ type: 'text', text: teamKey?.message || 'No access. Check your subscription.' }],
      isError: true,
    };
  }

  const summary = args.summary as string;
  const decisions = args.decisions as Array<{ what: string; why: string }> | undefined;
  const filesChanged = args.filesChanged as string[] | undefined;
  const nextSteps = args.nextSteps as string | undefined;
  const blockers = args.blockers as string | undefined;

  const repoName = getCurrentRepoName() || 'Unknown Repo';
  const now = new Date();
  const username = os.userInfo().username;
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const sessionFilename = `${day}-${hours}${minutes}.md`;
  const sessionPath = `sessions/${yearMonth}/${username}/${sessionFilename}`;

  // Build session content per plan structure
  let sessionContent = `# Session: ${dateStr} - ${timeStr}\n\n`;
  sessionContent += `**Developer:** @${username}\n`;
  sessionContent += `**Status:** Complete\n\n`;
  sessionContent += `## Summary\n\n${summary}\n\n`;

  if (decisions && decisions.length > 0) {
    sessionContent += `## Decisions Made\n\n`;
    for (const d of decisions) {
      sessionContent += `### [DECISION] ${d.what}\n`;
      sessionContent += `**What:** ${d.what}\n`;
      sessionContent += `**Why:** ${d.why}\n\n`;
    }
  }

  if (filesChanged && filesChanged.length > 0) {
    sessionContent += `## Files Changed\n\n`;
    sessionContent += filesChanged.map(f => `- ${f}`).join('\n') + '\n\n';
  }

  if (nextSteps) {
    sessionContent += `## Where I Left Off\n\n${nextSteps}\n\n`;
  }

  if (blockers) {
    sessionContent += `## Blockers\n\n${blockers}\n\n`;
  }

  // Write individual session file
  writeSessionFile(sessionPath, sessionContent, teamKey.key);

  // Read existing files and update
  let smallContent = readRecallFile('context.md', teamKey.key) || '';
  let mediumContent = readRecallFile('history.md', teamKey.key) || '';

  // Build session entry for history.md
  let historyEntry = `\n## Session: ${dateStr} ${timeStr}\n\n`;
  historyEntry += `**Summary:** ${summary}\n\n`;

  if (decisions && decisions.length > 0) {
    historyEntry += `**Decisions:**\n`;
    for (const d of decisions) {
      historyEntry += `- ${d.what} — ${d.why}\n`;
    }
    historyEntry += '\n';
  }

  if (filesChanged && filesChanged.length > 0) {
    historyEntry += `**Files:** ${filesChanged.join(', ')}\n\n`;
  }

  if (nextSteps) {
    historyEntry += `**Next:** ${nextSteps}\n\n`;
  }

  if (blockers) {
    historyEntry += `**Blockers:** ${blockers}\n\n`;
  }

  historyEntry += `**Session:** ${sessionPath}\n\n`;

  // Update history.md (prepend new session)
  if (!mediumContent) {
    mediumContent = `# ${repoName} - Session History\n`;
  }
  mediumContent = mediumContent.replace(/(# .+\n)/, `$1${historyEntry}`);

  // Update context.md (regenerate quick context)
  smallContent = `# ${repoName} - Team Context\n\n`;
  smallContent += `Last updated: ${dateStr}\n\n`;
  smallContent += `## Current Status\n\n${summary}\n\n`;

  if (decisions && decisions.length > 0) {
    smallContent += `## Recent Decisions\n\n`;
    for (const d of decisions.slice(-5)) {
      smallContent += `- **${d.what}:** ${d.why}\n`;
    }
    smallContent += '\n';
  }

  if (nextSteps) {
    smallContent += `## Next Steps\n\n${nextSteps}\n\n`;
  }

  if (blockers) {
    smallContent += `## Blockers\n\n${blockers}\n\n`;
  }

  // Write context and history files
  writeRecallFile('context.md', smallContent, teamKey.key);
  writeRecallFile('history.md', mediumContent, teamKey.key);

  // Ensure project CLAUDE.md has Recall instructions
  try {
    createProjectClaudeMd();
  } catch {
    // Non-fatal if we can't update CLAUDE.md
  }

  // Log write activity (non-blocking)
  logMemoryAccess(config.token, 'context', 'write');
  logMemoryAccess(config.token, 'history', 'write');
  logMemoryAccess(config.token, 'sessions', 'write');

  return {
    content: [{ type: 'text', text: `Session saved to .recall/\n\nYour team will see this context in their next session. Files are encrypted with your team key.\n\nProject CLAUDE.md updated to ensure team memory loads automatically.` }],
  };
});

// Tool: recall_log_decision - Log a single decision
server.registerTool('recall_log_decision', {
  description: 'Log an important decision made during coding. Quick way to capture why something was done.',
  inputSchema: z.object({
    decision: z.string().describe('What was decided'),
    reasoning: z.string().describe('Why this decision was made'),
  }).shape,
}, async (args) => {
  const config = loadConfig();
  if (!config?.token) {
    return {
      content: [{ type: 'text', text: 'Not authenticated. Run recall_auth first.' }],
      isError: true,
    };
  }

  const teamKey = await getTeamKey(config.token);
  if (!teamKey?.hasAccess) {
    return {
      content: [{ type: 'text', text: teamKey?.message || 'No access. Check your subscription.' }],
      isError: true,
    };
  }

  const decision = args.decision as string;
  const reasoning = args.reasoning as string;
  const dateStr = new Date().toISOString().split('T')[0];
  const repoName = getCurrentRepoName() || 'Unknown Repo';

  // Read and update context.md
  let smallContent = readRecallFile('context.md', teamKey.key) || `# ${repoName} - Team Context\n\n`;

  // Add decision to context.md
  if (!smallContent.includes('## Recent Decisions')) {
    smallContent += `\n## Recent Decisions\n\n`;
  }

  const decisionEntry = `- **${decision}:** ${reasoning} _(${dateStr})_\n`;
  smallContent = smallContent.replace(
    /(## Recent Decisions\n\n)/,
    `$1${decisionEntry}`
  );

  writeRecallFile('context.md', smallContent, teamKey.key);

  return {
    content: [{ type: 'text', text: `Decision logged: ${decision}\n\nThis will be visible to your team.` }],
  };
});

// Tool: recall_status - Check status
server.registerTool('recall_status', {
  description: 'Check Recall connection status and team access.',
}, async () => {
  const config = loadConfig();
  if (!config?.token) {
    return {
      content: [{ type: 'text', text: 'Not authenticated.\n\n1. Get your token from https://recall.team/dashboard\n2. Run: recall_auth with your token' }],
    };
  }

  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${config.token}` },
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: 'Authentication failed. Check your token is valid at https://recall.team/dashboard or run recall_auth with a fresh token.' }],
      };
    }

    const user = await response.json();
    const teamKey = await getTeamKey(config.token);
    const repoName = getCurrentRepoName();
    const recallDir = getRecallDir();
    const hasRecallDir = fs.existsSync(recallDir);

    let status = `**Recall Status**\n\n`;
    status += `User: ${user.name || user.githubUsername}\n`;
    status += `Team: ${user.team?.name || 'None'}\n`;
    status += `Plan: ${user.team?.tier || 'None'}\n`;
    status += `Encryption: ${teamKey?.hasAccess ? 'Active' : 'Inactive'}\n\n`;
    status += `**Current Repo:** ${repoName}\n`;
    status += `**Memory Files:** ${hasRecallDir ? 'Found (.recall/)' : 'Not initialized'}\n`;

    if (hasRecallDir && teamKey?.hasAccess) {
      const small = fs.existsSync(path.join(recallDir, 'context.md'));
      const medium = fs.existsSync(path.join(recallDir, 'history.md'));
      const sessionsDir = path.join(recallDir, 'sessions');
      const hasSessionsDir = fs.existsSync(sessionsDir);
      let sessionCount = 0;
      if (hasSessionsDir) {
        // Count session files recursively
        const countSessions = (dir: string): number => {
          let count = 0;
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory()) {
              count += countSessions(path.join(dir, entry.name));
            } else if (entry.name.endsWith('.md')) {
              count++;
            }
          }
          return count;
        };
        sessionCount = countSessions(sessionsDir);
      }
      status += `  - context.md: ${small ? 'Yes' : 'No'}\n`;
      status += `  - history.md: ${medium ? 'Yes' : 'No'}\n`;
      status += `  - sessions/: ${hasSessionsDir ? `${sessionCount} sessions` : 'No'}\n`;
    }

    if (!teamKey?.hasAccess) {
      status += `\nActivate your subscription at https://recall.team/dashboard`;
    }

    return { content: [{ type: 'text', text: status }] };
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Status check failed: ${error instanceof Error ? error.message : 'Unknown error'}` }],
      isError: true,
    };
  }
});

// Tool: recall_init - Initialize Recall for current repo
server.registerTool('recall_init', {
  description: 'Initialize Recall for the current repository. Finds the current session, imports it to sessions/ folder, and generates AI summaries for context.md and history.md.',
}, async () => {
  const config = loadConfig();
  if (!config?.token) {
    return {
      content: [{ type: 'text', text: 'Not authenticated. Run recall_auth first with your token from https://recall.team/dashboard' }],
      isError: true,
    };
  }

  const teamKey = await getTeamKey(config.token);
  if (!teamKey?.hasAccess) {
    return {
      content: [{ type: 'text', text: teamKey?.message || 'No access. Check your subscription at https://recall.team/dashboard' }],
      isError: true,
    };
  }

  const repoName = getCurrentRepoName() || path.basename(process.cwd());
  const now = new Date();
  const username = os.userInfo().username;
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const sessionFilename = `${day}-${hours}${minutes}.md`;
  const sessionPath = `sessions/${yearMonth}/${username}/${sessionFilename}`;

  // Create .recall/ directory and README
  ensureRecallDir();

  // Create project CLAUDE.md with Recall instructions
  try {
    createProjectClaudeMd();
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Failed to create CLAUDE.md: ${error instanceof Error ? error.message : 'Unknown error'}` }],
      isError: true,
    };
  }

  // Find and import session transcript
  const sessionFile = findSessionFile();
  let transcript = '';
  let messageCount = 0;

  if (sessionFile) {
    console.error(`[Recall] Importing session from: ${sessionFile}`);
    transcript = parseSessionTranscript(sessionFile);
    messageCount = (transcript.match(/\*\*User:\*\*|\*\*Assistant:\*\*/g) || []).length;
  }

  // Generate AI summaries if we have a transcript
  let smallContent = '';
  let mediumContent = '';

  if (transcript) {
    // Build session content per plan structure
    let sessionContent = `# Session: ${dateStr} - ${timeStr}\n\n`;
    sessionContent += `**Developer:** @${username}\n`;
    sessionContent += `**Source:** Initial import\n\n`;
    sessionContent += `## Transcript\n\n`;
    sessionContent += transcript;
    sessionContent += `\n_${messageCount} messages_\n`;

    // Write individual session file
    writeSessionFile(sessionPath, sessionContent, teamKey.key);
    console.error(`[Recall] Saved ${messageCount} messages to ${sessionPath}`);

    // Call Gemini API for summaries
    const summaries = await generateSummaries(config.token, transcript, repoName);

    if (summaries) {
      smallContent = summaries.small;
      mediumContent = summaries.medium;
      console.error('[Recall] AI summaries generated');
    } else {
      // Fallback to template if API fails
      console.error('[Recall] AI summarization failed, using template');
      smallContent = `# ${repoName} - Team Context\n\nLast updated: ${dateStr}\n\n## Current Status\n\nSession imported with ${messageCount} messages. AI summarization pending.\n\n## Next Steps\n\nReview sessions with recall_get_transcripts.\n`;
      mediumContent = `# ${repoName} - Session History\n\n## ${dateStr}\n\nImported ${messageCount} messages from session.\n\n**Session:** ${sessionPath}\n`;
    }

    writeRecallFile('context.md', smallContent, teamKey.key);
    writeRecallFile('history.md', mediumContent, teamKey.key);

    // Log activity
    logMemoryAccess(config.token, 'context', 'write');
    logMemoryAccess(config.token, 'history', 'write');
    logMemoryAccess(config.token, 'sessions', 'write');

    return {
      content: [{ type: 'text', text: `Recall initialized for ${repoName}!\n\nImported ${messageCount} messages from current session.\n\nCreated:\n- sessions/${yearMonth}/${username}/${sessionFilename}: Full session transcript\n- history.md: Detailed summary (AI-generated)\n- context.md: Quick context (AI-generated)\n- CLAUDE.md: Auto-load instructions\n\nYour team will now automatically get context when opening this project.` }],
    };
  } else {
    // No session file found - create placeholder
    smallContent = `# ${repoName} - Team Context\n\nLast updated: ${dateStr}\n\n## Current Status\n\nRepository initialized with Recall. No session transcript found to import.\n\n## Next Steps\n\nUse \`recall_save_session\` to save what you accomplish in each session.\n`;
    writeRecallFile('context.md', smallContent, teamKey.key);

    return {
      content: [{ type: 'text', text: `Recall initialized for ${repoName}.\n\nNo session transcript found to import. Created placeholder files.\n\nCreated:\n- .recall/ folder for encrypted team memory\n- CLAUDE.md with auto-load instructions\n\nNext: Use recall_save_session to save your work.` }],
    };
  }
});

/**
 * Create or update project-level CLAUDE.md with Recall instructions
 * This ensures Claude auto-loads context when opening this project
 */
function createProjectClaudeMd(): void {
  const projectRoot = process.cwd();
  const claudeMdPath = path.join(projectRoot, 'CLAUDE.md');
  const repoName = getCurrentRepoName() || path.basename(projectRoot);

  const recallInstructions = `<!-- RECALL:START -->
## Recall Team Memory

**ON SESSION START:** Call \`recall_get_context\` IMMEDIATELY to load team memory.

**HOTWORD RULES - CALL EXACTLY ONE TOOL:**
- "remember" → Call \`recall_get_history\` ONLY (NOT recall_get_context, NOT recall_get_transcripts)
- "ultraremember" → Call \`recall_get_transcripts\` ONLY (NOT recall_get_history, NOT recall_get_context)

**CRITICAL:** Each hotword triggers exactly ONE recall tool. Never stack or combine them.

**ON SESSION END:** Call \`recall_save_session\` to save what was accomplished.
<!-- RECALL:END -->
`;

  if (fs.existsSync(claudeMdPath)) {
    // File exists - check if Recall section already present
    let content = fs.readFileSync(claudeMdPath, 'utf-8');

    if (content.includes('<!-- RECALL:START -->')) {
      // Update existing section
      content = content.replace(
        /<!-- RECALL:START -->[\s\S]*?<!-- RECALL:END -->/,
        recallInstructions.trim()
      );
    } else {
      // Prepend Recall section at the top
      content = recallInstructions + '\n' + content;
    }

    fs.writeFileSync(claudeMdPath, content);
  } else {
    // Create new file with Recall instructions and basic project info
    const newContent = `# ${repoName}

${recallInstructions}
## Project Notes

_Add project-specific instructions for AI assistants here._
`;
    fs.writeFileSync(claudeMdPath, newContent);
  }
}

/**
 * Check if project has Recall set up and output reminder if so
 */
function checkProjectRecallSetup(): void {
  const recallDir = getRecallDir();
  const claudeMdPath = path.join(process.cwd(), 'CLAUDE.md');

  if (fs.existsSync(recallDir)) {
    // Project has .recall/ - check if CLAUDE.md exists and has Recall section
    if (!fs.existsSync(claudeMdPath)) {
      // Create CLAUDE.md since .recall/ exists but CLAUDE.md doesn't
      createProjectClaudeMd();
      console.error('[Recall] Created CLAUDE.md with team memory instructions');
    } else {
      const content = fs.readFileSync(claudeMdPath, 'utf-8');
      if (!content.includes('<!-- RECALL:START -->')) {
        // CLAUDE.md exists but no Recall section - add it
        createProjectClaudeMd();
        console.error('[Recall] Added team memory instructions to CLAUDE.md');
      }
    }

    // Output reminder for Claude to load context
    console.error('[Recall] This project has team memory. Call recall_get_context to load context.');
  }
}

type SupportedTool = 'claude' | 'cursor' | 'windsurf';

interface ToolConfig {
  name: string;
  configPath: string;
  exists: boolean;
}

/**
 * Get all supported tool configurations
 */
function getAllToolConfigs(): Record<SupportedTool, ToolConfig> {
  const home = os.homedir();

  const configs: Record<SupportedTool, ToolConfig> = {
    claude: {
      name: 'Claude Code',
      configPath: path.join(home, '.claude', 'mcp.json'),
      exists: false,
    },
    cursor: {
      name: 'Cursor',
      configPath: path.join(home, '.cursor', 'mcp.json'),
      exists: false,
    },
    windsurf: {
      name: 'Windsurf',
      configPath: path.join(home, '.codeium', 'windsurf', 'mcp.json'),
      exists: false,
    },
  };

  // Check which configs exist
  for (const tool of Object.keys(configs) as SupportedTool[]) {
    configs[tool].exists = fs.existsSync(configs[tool].configPath);
  }

  return configs;
}

/**
 * Get the MCP config file path for a specific tool
 * If no tool specified, tries to auto-detect or prompts user
 */
function getMcpConfigPath(tool?: SupportedTool): { path: string; tool: SupportedTool } | { error: string } {
  const configs = getAllToolConfigs();

  // If tool specified, use that
  if (tool) {
    if (!configs[tool]) {
      return { error: `Unknown tool: ${tool}. Supported: claude, cursor, windsurf` };
    }
    return { path: configs[tool].configPath, tool };
  }

  // Find which tools have existing configs
  const existingTools = (Object.keys(configs) as SupportedTool[]).filter(t => configs[t].exists);

  // If multiple configs exist, require user to specify
  if (existingTools.length > 1) {
    const toolList = existingTools.map(t => `  - ${configs[t].name} (--tool ${t})`).join('\n');
    return {
      error: `Multiple AI tools detected with existing configs:\n${toolList}\n\nPlease specify which tool to install for:\n  npx recall-mcp-server install <token> --tool claude`
    };
  }

  // If exactly one config exists, use that
  if (existingTools.length === 1) {
    return { path: configs[existingTools[0]].configPath, tool: existingTools[0] };
  }

  // No configs exist - default to Claude
  return { path: configs.claude.configPath, tool: 'claude' };
}

/**
 * Add Recall instructions to user's CLAUDE.md for auto-loading context
 */
function setupClaudeInstructions(): void {
  const claudeDir = path.join(os.homedir(), '.claude');
  const claudeMdPath = path.join(claudeDir, 'CLAUDE.md');

  // Ensure .claude directory exists
  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }

  const recallInstructions = `
<!-- RECALL:START -->
## Recall Team Memory (MANDATORY)

**ON SESSION START - ALWAYS DO THIS FIRST:**
Call \`recall_get_context\` to load team memory. Do this before responding to any user request.

**HOTWORD RULES - CALL EXACTLY ONE TOOL:**
- "remember" → Call \`recall_get_history\` ONLY (do NOT also call recall_get_context)
- "ultraremember" → Call \`recall_get_transcripts\` ONLY (do NOT also call recall_get_history)

**CRITICAL:** Each hotword = exactly ONE tool call. Never combine or stack recall tools.

**AT SESSION END:**
Use \`recall_save_session\` to save what was accomplished.
<!-- RECALL:END -->
`;

  let existingContent = '';
  if (fs.existsSync(claudeMdPath)) {
    existingContent = fs.readFileSync(claudeMdPath, 'utf-8');

    // Check if Recall section already exists
    if (existingContent.includes('<!-- RECALL:START -->')) {
      // Update existing section
      existingContent = existingContent.replace(
        /<!-- RECALL:START -->[\s\S]*?<!-- RECALL:END -->/,
        recallInstructions.trim()
      );
      fs.writeFileSync(claudeMdPath, existingContent);
      return;
    }
  }

  // Append Recall instructions
  const newContent = existingContent + recallInstructions;
  fs.writeFileSync(claudeMdPath, newContent);
}

/**
 * Find the absolute path to npx (needed for MCP server commands)
 */
function findNpxPath(): string {
  try {
    // Try to get npx path from which command
    const npxPath = execSync('which npx', { encoding: 'utf-8' }).trim();
    if (npxPath && fs.existsSync(npxPath)) {
      return npxPath;
    }
  } catch {
    // Ignore errors
  }

  // Common paths to check
  const commonPaths = [
    '/opt/homebrew/bin/npx',  // macOS ARM (Apple Silicon)
    '/usr/local/bin/npx',     // macOS Intel / Linux
    '/usr/bin/npx',           // Linux
  ];

  for (const p of commonPaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // Fallback to just 'npx' and hope it's in PATH
  return 'npx';
}

/**
 * Install Recall MCP server into the user's MCP config
 */
async function installRecall(token: string, tool?: SupportedTool): Promise<void> {
  const configResult = getMcpConfigPath(tool);

  // Check for errors (multiple tools detected, etc.)
  if ('error' in configResult) {
    console.error(`\n❌ ${configResult.error}\n`);
    process.exit(1);
  }

  const { path: configPath, tool: selectedTool } = configResult;
  const configs = getAllToolConfigs();

  console.log(`\n🔧 Installing Recall MCP server for ${configs[selectedTool].name}...\n`);

  // Validate token first
  console.log('Validating token...');
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
      console.error('❌ Invalid token. Get your token from https://recall.team/dashboard');
      process.exit(1);
    }

    const user = await response.json();
    console.log(`✓ Authenticated as ${user.name || user.githubUsername}`);
    if (user.team) {
      console.log(`✓ Team: ${user.team.name}`);
    }
  } catch (error) {
    console.error('❌ Failed to validate token:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }

  // Find npx path for MCP config
  const npxPath = findNpxPath();
  console.log(`✓ Found npx at ${npxPath}`);

  // For Claude Code, use the CLI command (claude mcp add-json)
  // This is required since Claude Code v2.1.1+ reads from ~/.claude.json, not ~/.claude/mcp.json
  if (selectedTool === 'claude') {
    console.log('Adding recall to Claude Code via CLI...');

    const mcpConfig = {
      type: 'stdio',
      command: npxPath,
      args: ['-y', 'recall-mcp-server@latest'],
      env: {
        RECALL_API_TOKEN: token,
      },
    };

    try {
      // First try to remove existing recall config (ignore errors if it doesn't exist)
      try {
        execSync('claude mcp remove recall -s user', {
          encoding: 'utf-8',
          stdio: 'pipe'
        });
      } catch {
        // Ignore - may not exist
      }

      // Add recall via claude CLI
      const configJson = JSON.stringify(mcpConfig);
      execSync(`claude mcp add-json -s user recall '${configJson}'`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      console.log('✓ Added recall to Claude Code (user-level)');
    } catch (error) {
      console.error('❌ Failed to add recall via Claude CLI.');
      console.error('Make sure Claude Code is installed and the "claude" command is available.');
      if (error instanceof Error) {
        console.error('Error:', error.message);
      }
      process.exit(1);
    }
  } else {
    // For Cursor and Windsurf, use the config file approach
    let mcpConfig: { mcpServers?: Record<string, unknown> } = { mcpServers: {} };

    if (fs.existsSync(configPath)) {
      try {
        const existing = fs.readFileSync(configPath, 'utf-8');
        mcpConfig = JSON.parse(existing);
        console.log(`✓ Found existing config at ${configPath}`);
      } catch {
        console.log(`⚠ Could not parse existing config, creating new one`);
      }
    } else {
      console.log(`Creating new config at ${configPath}`);
      // Ensure directory exists for cursor/windsurf configs
      const dir = path.dirname(configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    // Ensure mcpServers object exists
    if (!mcpConfig.mcpServers) {
      mcpConfig.mcpServers = {};
    }

    // Add/update recall entry
    mcpConfig.mcpServers.recall = {
      type: 'stdio',
      command: npxPath,
      args: ['-y', 'recall-mcp-server@latest'],
      env: {
        RECALL_API_TOKEN: token,
      },
    };

    // Write config
    fs.writeFileSync(configPath, JSON.stringify(mcpConfig, null, 2));
    console.log(`✓ Added recall to ${configPath}`);
  }

  // Setup Claude instructions for auto-loading
  console.log('Setting up auto-context loading...');
  try {
    setupClaudeInstructions();
    console.log(`✓ Added Recall instructions to ~/.claude/CLAUDE.md`);
  } catch (error) {
    console.log(`⚠ Could not update CLAUDE.md: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Ping the API to register connection
  console.log('Registering connection...');
  try {
    await getTeamKey(token);
    console.log('✓ Connection registered');
  } catch {
    // Non-fatal, connection will register on first use
  }

  const configLocation = selectedTool === 'claude'
    ? 'Added via "claude mcp add-json" (user-level)'
    : `Config written to: ${configPath}`;

  console.log(`
✅ Recall installed successfully for ${configs[selectedTool].name}!

${configLocation}

What happens now:
• Team memory (context.md) loads automatically at session start
• Say "remember" to load session history (history.md)
• Say "ultraremember" for full transcripts (sessions/)
• All reads are tracked in your team dashboard

Next steps:
1. Restart ${configs[selectedTool].name} completely (Cmd+Q on Mac)
2. Start a new session - your team memory will load automatically

Verify installation:
• Run "/mcp" in Claude Code to confirm recall is connected

Need help? Visit https://recall.team/docs
`);
}

/**
 * Parse --tool flag from args
 */
function parseToolFlag(args: string[]): SupportedTool | undefined {
  const toolIndex = args.findIndex(a => a === '--tool' || a === '-t');
  if (toolIndex !== -1 && args[toolIndex + 1]) {
    const tool = args[toolIndex + 1].toLowerCase();
    if (tool === 'claude' || tool === 'cursor' || tool === 'windsurf') {
      return tool;
    }
    console.error(`❌ Unknown tool: ${tool}`);
    console.error('Supported tools: claude, cursor, windsurf');
    process.exit(1);
  }
  return undefined;
}

// Handle CLI commands
async function handleCli(): Promise<boolean> {
  const args = process.argv.slice(2);

  if (args[0] === 'install') {
    // Find token (first arg that's not a flag)
    const token = args.find((a, i) => i > 0 && !a.startsWith('-') && args[i - 1] !== '--tool' && args[i - 1] !== '-t');

    if (!token) {
      console.error('Usage: npx recall-mcp-server install <token> [--tool claude|cursor|windsurf]');
      console.error('\nGet your token from https://recall.team/dashboard');
      process.exit(1);
    }

    const tool = parseToolFlag(args);
    await installRecall(token, tool);
    return true; // Handled CLI command, don't start server
  }

  if (args[0] === 'sync') {
    // Sync command - import sessions and update memory files
    // Can be called from git hooks or manually
    await syncMemory();
    return true;
  }

  if (args[0] === '--help' || args[0] === '-h') {
    console.log(`
Recall MCP Server - Team memory for AI coding tools

Usage:
  npx recall-mcp-server install <token> [--tool <tool>]   Install and configure Recall
  npx recall-mcp-server sync                              Sync sessions to memory (for git hooks)
  npx recall-mcp-server                                   Start MCP server (called by AI tools)

Options:
  --tool, -t <tool>   Specify which AI tool to install for: claude, cursor, windsurf
                      Required if multiple tools are installed on your system

Examples:
  npx recall-mcp-server install abc123                    Auto-detect tool (or prompt if multiple)
  npx recall-mcp-server install abc123 --tool claude      Install for Claude Code
  npx recall-mcp-server install abc123 --tool cursor      Install for Cursor
  npx recall-mcp-server install abc123 --tool windsurf    Install for Windsurf
  npx recall-mcp-server sync                              Sync after git push (use in hooks)

Get your token from https://recall.team/dashboard
`);
    return true;
  }

  return false; // No CLI command, start server normally
}

// Start the server
async function main() {
  // Check for CLI commands first
  const handledCli = await handleCli();
  if (handledCli) {
    return;
  }

  // Normal MCP server mode
  const transport = new StdioServerTransport();

  // Check if current project has Recall set up
  // This creates CLAUDE.md if .recall/ exists but CLAUDE.md doesn't
  try {
    checkProjectRecallSetup();
  } catch {
    // Non-fatal
  }

  // Ping the API on startup to register connection (updates last_mcp_connection)
  const config = loadConfig();
  if (config?.token) {
    getTeamKey(config.token).catch(() => {
      // Silently ignore - just trying to register the connection
    });
  }

  // AUTO-IMPORT: This is the core automatic session capture
  // On every MCP startup (i.e., every new Claude session), check for new sessions
  // and import them to sessions/ folder without requiring user action
  try {
    const result = await autoImportNewSessions();
    if (result.imported > 0) {
      console.error(`[Recall] Auto-imported ${result.imported} new session(s)`);
    }
  } catch (error) {
    // Non-fatal - don't block MCP startup
    console.error('[Recall] Auto-import failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  await server.connect(transport);
  console.error('Recall MCP server started');
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
