#!/usr/bin/env node
/**
 * Recall MCP Server
 * Provides team memory for AI coding tools
 *
 * Architecture:
 * - Context stored locally in .recall/ folder (small.md, medium.md, large.md)
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

const API_URL = 'https://recall-api.stoodiohq.workers.dev';
const RECALL_DIR = '.recall';
const CONFIG_PATH = path.join(os.homedir(), '.recall', 'config.json');
const IMPORTED_SESSIONS_FILE = 'imported-sessions.json';

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

// Encryption helpers using AES-256-GCM
function encrypt(text: string, keyBase64: string): string {
  const key = Buffer.from(keyBase64, 'base64');
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
  // Check environment variable first (set via MCP config)
  const envToken = process.env.RECALL_API_TOKEN;
  if (envToken) {
    return { token: envToken };
  }

  // Fall back to config file
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch {
    // Config doesn't exist or is invalid
  }
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
- \`small.md\` - Quick context (~500 tokens)
- \`medium.md\` - Session history (~4k tokens)
- \`large.md\` - Full transcripts (~50k tokens)

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
      if (response.status === 403) {
        try {
          const data = JSON.parse(text);
          return { hasAccess: false, key: '', keyVersion: 0, teamId: '', teamSlug: '', ...data };
        } catch {
          return { hasAccess: false, key: '', keyVersion: 0, teamId: '', teamSlug: '', message: text };
        }
      }
      return null;
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
 * @param filename - The file to read (e.g., 'small.md', 'medium.md', 'large.md')
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
 * Log memory access to the API (non-blocking)
 */
async function logMemoryAccess(
  token: string,
  fileType: 'small' | 'medium' | 'large',
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

  // Read existing large.md or create new
  const repoName = getCurrentRepoName() || path.basename(process.cwd());
  let largeContent = readRecallFile('large.md', teamKey.key);

  if (!largeContent) {
    largeContent = `# ${repoName} - Full Session Transcripts\n\n`;
  }

  // Process new sessions (oldest first)
  const sortedNewSessions = [...newSessions].sort((a, b) => a.mtime - b.mtime);

  for (const session of sortedNewSessions) {
    const sessionDate = new Date(session.mtime);
    const dateStr = sessionDate.toISOString().split('T')[0];
    const timeStr = sessionDate.toTimeString().split(' ')[0];

    console.error(`[Recall] Auto-import: Processing ${session.filename}`);

    const transcript = parseSessionTranscript(session.path);
    const messageCount = (transcript.match(/\*\*User:\*\*|\*\*Assistant:\*\*/g) || []).length;

    // Add to large.md
    largeContent += `\n---\n\n## Session: ${dateStr} ${timeStr}\n`;
    largeContent += `_File: ${session.filename}_\n\n`;
    largeContent += transcript;
    largeContent += `\n_${messageCount} messages (auto-imported)_\n\n`;

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

  // Write updated large.md
  writeRecallFile('large.md', largeContent, teamKey.key);

  // Write updated tracker
  writeImportedSessionsTracker(tracker);

  // Log activity
  logMemoryAccess(config.token, 'large', 'write');

  console.error(`[Recall] Auto-import: Imported ${newSessions.length} sessions`);
  return { imported: newSessions.length, skipped: sessionFiles.length - newSessions.length };
}

/**
 * Find ALL Claude Code session JSONL files for current project
 * Claude stores sessions in ~/.claude/projects/<path-with-dashes>/
 * e.g., /Users/ray/myproject -> -Users-ray-myproject
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

  // Also check parent directories (in case Claude was opened at parent level)
  const pathsToCheck = [projectDirName];
  let parentPath = cwd;
  while (parentPath !== '/' && parentPath !== os.homedir()) {
    parentPath = path.dirname(parentPath);
    if (parentPath !== '/') {
      pathsToCheck.push(parentPath.replace(/\//g, '-'));
    }
  }

  console.error(`[Recall] Checking project dirs: ${pathsToCheck.join(', ')}`);

  for (const dirName of pathsToCheck) {
    const projectPath = path.join(claudeProjectsDir, dirName);

    if (!fs.existsSync(projectPath)) {
      continue;
    }

    console.error(`[Recall] Found project dir: ${projectPath}`);

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

  console.error(`[Recall] Found ${sessionFiles.length} session files`);
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
 * Call the /summarize API to generate AI summaries
 */
async function generateSummaries(
  token: string,
  transcript: string,
  repoName: string
): Promise<{ small: string; medium: string } | null> {
  try {
    console.error('[Recall] Calling /summarize API...');

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
          },
        }],
        repoName,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[Recall] Summarize API error: ${response.status} - ${text}`);
      return null;
    }

    const data = await response.json();
    console.error('[Recall] Summarize API success');
    return {
      small: data.small || '',
      medium: data.medium || '',
    };
  } catch (error) {
    console.error('[Recall] Summarize API failed:', error);
    return null;
  }
}

// Create the MCP server with resources, prompts, and tools capabilities
const server = new McpServer({
  name: 'recall',
  version: '0.4.9',
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

    const smallContent = readRecallFile('small.md', teamKey.key);
    const repoName = getCurrentRepoName();

    // Log access (non-blocking)
    logMemoryAccess(config.token, 'small', 'read');

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

// Resource: recall://context - Auto-loaded team memory (small.md)
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

    const smallContent = readRecallFile('small.md', teamKey.key);
    const repoName = getCurrentRepoName();

    // Log access (non-blocking)
    logMemoryAccess(config.token, 'small', 'read');

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

// Resource: recall://history - Session history (medium.md)
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
          text: '# Recall Access Required\n\nCheck your subscription.',
        }],
      };
    }

    const mediumContent = readRecallFile('medium.md', teamKey.key);

    // Log access (non-blocking)
    logMemoryAccess(config.token, 'medium', 'read');

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

// Resource: recall://transcripts - Full transcripts (large.md)
// Loaded when user says "ultraremember" or needs complete history
server.registerResource(
  'transcripts',
  'recall://transcripts',
  {
    description: 'Complete session transcripts. Large context - only load when you need full details.',
    mimeType: 'text/markdown',
  },
  async () => {
    const config = loadConfig();
    if (!config?.token) {
      return {
        contents: [{
          uri: 'recall://transcripts',
          mimeType: 'text/markdown',
          text: '# Recall Not Configured',
        }],
      };
    }

    const teamKey = await getTeamKey(config.token);
    if (!teamKey?.hasAccess) {
      return {
        contents: [{
          uri: 'recall://transcripts',
          mimeType: 'text/markdown',
          text: '# Recall Access Required',
        }],
      };
    }

    const largeContent = readRecallFile('large.md', teamKey.key);

    // Log access (non-blocking)
    logMemoryAccess(config.token, 'large', 'read');

    if (!largeContent) {
      return {
        contents: [{
          uri: 'recall://transcripts',
          mimeType: 'text/markdown',
          text: '# No Transcripts\n\nNo full transcripts saved yet.',
        }],
      };
    }

    return {
      contents: [{
        uri: 'recall://transcripts',
        mimeType: 'text/markdown',
        text: largeContent,
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

// Tool: recall_get_context - Get team memory for current repo
server.registerTool('recall_get_context', {
  description: 'Get team memory and context for the current repository. Returns the small.md quick context. Use recall_get_history for more detailed session history.',
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

  // Use explicit path if provided, otherwise use cwd
  const recallDir = projectPath
    ? path.join(projectPath, RECALL_DIR)
    : getRecallDir();
  console.error(`[Recall]   reading from: ${recallDir}`);

  const smallPath = path.join(recallDir, 'small.md');
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
  logMemoryAccess(config.token, 'small', 'read');

  return { content: [{ type: 'text', text: `[Reading from: ${recallDir}]\n\n${smallContent}` }] };
});

// Tool: recall_get_history - Get detailed session history
server.registerTool('recall_get_history', {
  description: 'Get detailed session history (medium.md). This includes more context than recall_get_context but uses more tokens.',
  inputSchema: z.object({
    projectPath: z.string().optional().describe('Path to the project root. REQUIRED to ensure correct repo context. Use the absolute path to the project you are working in.'),
  }).shape,
}, async (args) => {
  const projectPath = args.projectPath as string | undefined;
  const effectivePath = projectPath || process.cwd();

  console.error(`[Recall] recall_get_history called`);
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
      content: [{ type: 'text', text: 'No access. Check your subscription.' }],
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

  const mediumContent = readRecallFile('medium.md', teamKey.key, recallDir);

  if (!mediumContent) {
    return {
      content: [{ type: 'text', text: `No session history yet for ${repoName}.\n\nUse recall_save_session to start building history.` }],
    };
  }

  // Log access (non-blocking) - includes repo name for tracking
  logMemoryAccess(config.token, 'medium', 'read');

  return { content: [{ type: 'text', text: `[Repo: ${repoName}]\n\n${mediumContent}` }] };
});

// Tool: recall_get_transcripts - Get full session transcripts (large.md)
server.registerTool('recall_get_transcripts', {
  description: 'Get full session transcripts (large.md). WARNING: This can be very large and use many tokens. Only use when you need complete historical details.',
  inputSchema: z.object({
    projectPath: z.string().optional().describe('Path to the project root. REQUIRED to ensure correct repo context. Use the absolute path to the project you are working in.'),
  }).shape,
}, async (args) => {
  const projectPath = args.projectPath as string | undefined;
  const effectivePath = projectPath || process.cwd();

  console.error(`[Recall] recall_get_transcripts called`);
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
      content: [{ type: 'text', text: 'No access. Check your subscription.' }],
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

  const largeContent = readRecallFile('large.md', teamKey.key, recallDir);

  if (!largeContent) {
    return {
      content: [{ type: 'text', text: `No transcripts yet for ${repoName}.\n\nUse recall_save_session to start building history.` }],
    };
  }

  // Log access (non-blocking) - includes repo name for tracking
  logMemoryAccess(config.token, 'large', 'read');

  return { content: [{ type: 'text', text: `[Repo: ${repoName}]\n\n${largeContent}` }] };
});

// Tool: recall_import_transcript - Import full session transcript from JSONL file
server.registerTool('recall_import_transcript', {
  description: 'Import a full session transcript from a Claude session JSONL file into large.md. Use this at the end of a session to save the complete conversation history.',
  inputSchema: z.object({
    sessionFile: z.string().describe('Path to the session JSONL file (e.g., ~/.claude/projects/.../session.jsonl)'),
    append: z.boolean().optional().describe('Append to existing large.md instead of replacing (default: true)'),
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
      content: [{ type: 'text', text: 'No access. Check your subscription.' }],
      isError: true,
    };
  }

  const sessionFile = args.sessionFile as string;
  const append = args.append !== false; // Default to true

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

    const repoName = getCurrentRepoName() || 'Unknown Repo';
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];

    // Parse JSONL and format as readable transcript
    let transcript = `\n## Session Transcript: ${dateStr} ${timeStr}\n\n`;
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

    transcript += `---\n_Imported ${messageCount} messages from ${path.basename(sessionFile)}_\n\n`;

    // Read existing large.md if appending
    let largeContent = '';
    if (append) {
      largeContent = readRecallFile('large.md', teamKey.key) || `# ${repoName} - Full Session Transcripts\n`;
    } else {
      largeContent = `# ${repoName} - Full Session Transcripts\n`;
    }

    largeContent += transcript;

    // Write encrypted large.md
    writeRecallFile('large.md', largeContent, teamKey.key);

    // Log access
    logMemoryAccess(config.token, 'large', 'write');

    return {
      content: [{ type: 'text', text: `Imported ${messageCount} messages from session transcript.\n\nSaved to .recall/large.md (encrypted).` }],
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Failed to import transcript: ${error instanceof Error ? error.message : 'Unknown error'}` }],
      isError: true,
    };
  }
});

// Tool: recall_import_all_sessions - Import ALL session transcripts to large.md
server.registerTool('recall_import_all_sessions', {
  description: 'Import ALL Claude session transcripts for this project into large.md. This finds every JSONL session file and imports them as readable markdown.',
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
      content: [{ type: 'text', text: 'No access. Check your subscription.' }],
      isError: true,
    };
  }

  const projectPath = args.projectPath as string | undefined;
  const cwd = projectPath || process.cwd();
  const repoName = getCurrentRepoName() || path.basename(cwd);

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

  // Build the full transcript
  let largeContent = `# ${repoName} - Full Session Transcripts\n\n`;
  largeContent += `_Imported ${sessionFiles.length} sessions on ${new Date().toISOString().split('T')[0]}_\n\n`;

  let totalMessages = 0;

  // Process each session file (oldest first for chronological order)
  const sortedFiles = [...sessionFiles].reverse();

  for (const sessionFile of sortedFiles) {
    const filename = path.basename(sessionFile);
    const stat = fs.statSync(sessionFile);
    const sessionDate = new Date(stat.mtime);
    const dateStr = sessionDate.toISOString().split('T')[0];
    const timeStr = sessionDate.toTimeString().split(' ')[0];

    console.error(`[Recall] Processing: ${filename}`);

    largeContent += `---\n\n## Session: ${dateStr} ${timeStr}\n`;
    largeContent += `_File: ${filename}_\n\n`;

    // Parse and append transcript
    const transcript = parseSessionTranscript(sessionFile);
    const messageCount = (transcript.match(/\*\*User:\*\*|\*\*Assistant:\*\*/g) || []).length;
    totalMessages += messageCount;

    largeContent += transcript;
    largeContent += `\n_${messageCount} messages_\n\n`;
  }

  // Write encrypted large.md
  const recallDir = projectPath
    ? path.join(projectPath, RECALL_DIR)
    : getRecallDir();

  ensureRecallDir();
  const largePath = path.join(recallDir, 'large.md');
  const encrypted = encrypt(largeContent, teamKey.key);
  fs.writeFileSync(largePath, encrypted);

  // Log access
  logMemoryAccess(config.token, 'large', 'write');

  return {
    content: [{ type: 'text', text: `Imported ${sessionFiles.length} sessions (${totalMessages} total messages) to large.md.\n\nSessions imported:\n${sortedFiles.map(f => `  - ${path.basename(f)}`).join('\n')}\n\nSaved to: ${recallDir}/large.md (encrypted)` }],
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
      content: [{ type: 'text', text: 'No access. Check your subscription.' }],
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
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];

  // Read existing files
  let smallContent = readRecallFile('small.md', teamKey.key) || '';
  let mediumContent = readRecallFile('medium.md', teamKey.key) || '';
  let largeContent = readRecallFile('large.md', teamKey.key) || '';

  // Build new session entry for medium.md
  let sessionEntry = `\n## ${dateStr} ${timeStr}\n\n`;
  sessionEntry += `**Summary:** ${summary}\n\n`;

  if (decisions && decisions.length > 0) {
    sessionEntry += `**Decisions:**\n`;
    for (const d of decisions) {
      sessionEntry += `- ${d.what} — ${d.why}\n`;
    }
    sessionEntry += '\n';
  }

  if (filesChanged && filesChanged.length > 0) {
    sessionEntry += `**Files:** ${filesChanged.join(', ')}\n\n`;
  }

  if (nextSteps) {
    sessionEntry += `**Next:** ${nextSteps}\n\n`;
  }

  if (blockers) {
    sessionEntry += `**Blockers:** ${blockers}\n\n`;
  }

  // Update medium.md (prepend new session)
  if (!mediumContent) {
    mediumContent = `# ${repoName} - Session History\n`;
  }
  mediumContent = mediumContent.replace(/(# .+\n)/, `$1${sessionEntry}`);

  // Update small.md (regenerate quick context)
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

  // Append to large.md (full history)
  if (!largeContent) {
    largeContent = `# ${repoName} - Full Session Transcripts\n\n`;
  }
  largeContent += sessionEntry;

  // Write all files
  writeRecallFile('small.md', smallContent, teamKey.key);
  writeRecallFile('medium.md', mediumContent, teamKey.key);
  writeRecallFile('large.md', largeContent, teamKey.key);

  // Ensure project CLAUDE.md has Recall instructions
  try {
    createProjectClaudeMd();
  } catch {
    // Non-fatal if we can't update CLAUDE.md
  }

  // Log write activity (non-blocking)
  logMemoryAccess(config.token, 'small', 'write');
  logMemoryAccess(config.token, 'medium', 'write');
  logMemoryAccess(config.token, 'large', 'write');

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
      content: [{ type: 'text', text: 'No access. Check your subscription.' }],
      isError: true,
    };
  }

  const decision = args.decision as string;
  const reasoning = args.reasoning as string;
  const dateStr = new Date().toISOString().split('T')[0];
  const repoName = getCurrentRepoName() || 'Unknown Repo';

  // Read and update small.md
  let smallContent = readRecallFile('small.md', teamKey.key) || `# ${repoName} - Team Context\n\n`;

  // Add decision to small.md
  if (!smallContent.includes('## Recent Decisions')) {
    smallContent += `\n## Recent Decisions\n\n`;
  }

  const decisionEntry = `- **${decision}:** ${reasoning} _(${dateStr})_\n`;
  smallContent = smallContent.replace(
    /(## Recent Decisions\n\n)/,
    `$1${decisionEntry}`
  );

  writeRecallFile('small.md', smallContent, teamKey.key);

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
        content: [{ type: 'text', text: 'Token expired. Run recall_auth again.' }],
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
      const small = fs.existsSync(path.join(recallDir, 'small.md'));
      const medium = fs.existsSync(path.join(recallDir, 'medium.md'));
      const large = fs.existsSync(path.join(recallDir, 'large.md'));
      status += `  - small.md: ${small ? 'Yes' : 'No'}\n`;
      status += `  - medium.md: ${medium ? 'Yes' : 'No'}\n`;
      status += `  - large.md: ${large ? 'Yes' : 'No'}\n`;
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
  description: 'Initialize Recall for the current repository. Finds the current session, imports full transcript to large.md, and generates AI summaries for small.md and medium.md.',
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
  const recallDir = getRecallDir();
  const dateStr = new Date().toISOString().split('T')[0];

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
  let largeContent = '';

  if (transcript) {
    // Save full transcript to large.md
    largeContent = `# ${repoName} - Full Session Transcripts\n\n## Session: ${dateStr}\n\n${transcript}`;
    writeRecallFile('large.md', largeContent, teamKey.key);
    console.error(`[Recall] Saved ${messageCount} messages to large.md`);

    // Call Gemini API for summaries
    const summaries = await generateSummaries(config.token, transcript, repoName);

    if (summaries) {
      smallContent = summaries.small;
      mediumContent = summaries.medium;
      console.error('[Recall] AI summaries generated');
    } else {
      // Fallback to template if API fails
      console.error('[Recall] AI summarization failed, using template');
      smallContent = `# ${repoName} - Team Context\n\nLast updated: ${dateStr}\n\n## Current Status\n\nSession imported with ${messageCount} messages. AI summarization pending.\n\n## Next Steps\n\nReview the full transcript in large.md.\n`;
      mediumContent = `# ${repoName} - Session History\n\n## ${dateStr}\n\nImported ${messageCount} messages from session.\n\nFull transcript available in large.md.\n`;
    }

    writeRecallFile('small.md', smallContent, teamKey.key);
    writeRecallFile('medium.md', mediumContent, teamKey.key);

    // Log activity
    logMemoryAccess(config.token, 'small', 'write');
    logMemoryAccess(config.token, 'medium', 'write');
    logMemoryAccess(config.token, 'large', 'write');

    return {
      content: [{ type: 'text', text: `Recall initialized for ${repoName}!\n\nImported ${messageCount} messages from current session.\n\nCreated:\n- large.md: Full session transcript (${messageCount} messages)\n- medium.md: Detailed summary (AI-generated)\n- small.md: Quick context (AI-generated)\n- CLAUDE.md: Auto-load instructions\n\nYour team will now automatically get context when opening this project.` }],
    };
  } else {
    // No session file found - create placeholder
    smallContent = `# ${repoName} - Team Context\n\nLast updated: ${dateStr}\n\n## Current Status\n\nRepository initialized with Recall. No session transcript found to import.\n\n## Next Steps\n\nUse \`recall_save_session\` to save what you accomplish in each session.\n`;
    writeRecallFile('small.md', smallContent, teamKey.key);

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

  // Read or create MCP config
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
    command: 'npx',
    args: ['-y', 'recall-mcp-server@latest'],
    env: {
      RECALL_API_TOKEN: token,
    },
  };

  // Write config
  fs.writeFileSync(configPath, JSON.stringify(mcpConfig, null, 2));
  console.log(`✓ Added recall to ${configPath}`);

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

  console.log(`
✅ Recall installed successfully for ${configs[selectedTool].name}!

Config written to: ${configPath}

What happens now:
• Team memory (small.md) loads automatically at session start
• Say "remember" to load session history (medium.md)
• Say "ultraremember" for full transcripts (large.md)
• All reads are tracked in your team dashboard

Next steps:
1. Restart ${configs[selectedTool].name} completely (Cmd+Q on Mac)
2. Start a new session - your team memory will load automatically

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

  if (args[0] === '--help' || args[0] === '-h') {
    console.log(`
Recall MCP Server - Team memory for AI coding tools

Usage:
  npx recall-mcp-server install <token> [--tool <tool>]   Install and configure Recall
  npx recall-mcp-server                                   Start MCP server (called by AI tools)

Options:
  --tool, -t <tool>   Specify which AI tool to install for: claude, cursor, windsurf
                      Required if multiple tools are installed on your system

Examples:
  npx recall-mcp-server install abc123                    Auto-detect tool (or prompt if multiple)
  npx recall-mcp-server install abc123 --tool claude      Install for Claude Code
  npx recall-mcp-server install abc123 --tool cursor      Install for Cursor
  npx recall-mcp-server install abc123 --tool windsurf    Install for Windsurf

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
  // and import them to large.md without requiring user action
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
