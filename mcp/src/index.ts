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

// Encryption helpers using AES-256-GCM
function encrypt(text: string, keyBase64: string): string {
  const key = Buffer.from(keyBase64, 'base64');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:ciphertext (all base64)
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
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

    const response = await fetch(`${API_URL}/keys/team`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 403) {
        const data = await response.json();
        return { hasAccess: false, key: '', keyVersion: 0, teamId: '', teamSlug: '', ...data };
      }
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch team key:', error);
    return null;
  }
}

/**
 * Read and decrypt a recall file
 */
function readRecallFile(filename: string, key: string): string | null {
  const filePath = path.join(getRecallDir(), filename);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const encrypted = fs.readFileSync(filePath, 'utf-8');

    // Check if file is encrypted (starts with base64 pattern with colons)
    if (encrypted.includes(':')) {
      return decrypt(encrypted, key);
    }

    // File is not encrypted (legacy or first run)
    return encrypted;
  } catch (error) {
    console.error(`Failed to read ${filename}:`, error);
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

  // Fire and forget - don't block on logging
  fetch(`${API_URL}/memory/access`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fileType, action, repoName }),
  }).catch(() => {
    // Silently ignore logging failures
  });
}

/**
 * Get current repo name from git
 */
function getCurrentRepoName(): string | null {
  try {
    const { execSync } = require('child_process');
    const remote = execSync('git config --get remote.origin.url', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    const match = remote.match(/github\.com[:/](.+?)(?:\.git)?$/);
    if (match) {
      return match[1];
    }
  } catch {
    // Not a git repo or no remote
  }
  return path.basename(process.cwd());
}

// Create the MCP server with resources, prompts, and tools capabilities
const server = new McpServer({
  name: 'recall',
  version: '0.2.2',
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

  const smallContent = readRecallFile('small.md', teamKey.key);

  if (!smallContent) {
    const repoName = getCurrentRepoName();
    return {
      content: [{ type: 'text', text: `No team memory found for this repo yet.\n\nTo start building memory, use:\n- recall_save_session to save session summaries\n- recall_log_decision to log important decisions\n\nRepo: ${repoName}` }],
    };
  }

  // Log access (non-blocking)
  logMemoryAccess(config.token, 'small', 'read');

  return { content: [{ type: 'text', text: smallContent }] };
});

// Tool: recall_get_history - Get detailed session history
server.registerTool('recall_get_history', {
  description: 'Get detailed session history (medium.md). This includes more context than recall_get_context but uses more tokens.',
}, async () => {
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

  const mediumContent = readRecallFile('medium.md', teamKey.key);

  if (!mediumContent) {
    return {
      content: [{ type: 'text', text: 'No session history yet. Use recall_save_session to start building history.' }],
    };
  }

  // Log access (non-blocking)
  logMemoryAccess(config.token, 'medium', 'read');

  return { content: [{ type: 'text', text: mediumContent }] };
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

  // Log write activity (non-blocking)
  logMemoryAccess(config.token, 'small', 'write');
  logMemoryAccess(config.token, 'medium', 'write');
  logMemoryAccess(config.token, 'large', 'write');

  return {
    content: [{ type: 'text', text: `Session saved to .recall/\n\nYour team will see this context in their next session. Files are encrypted with your team key.` }],
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

/**
 * Get the MCP config file path for the current platform/tool
 * Priority: Claude Code (~/.mcp.json) > Cursor (~/.cursor/mcp.json) > Windsurf
 */
function getMcpConfigPath(): string {
  const home = os.homedir();

  // Check which config files exist
  const claudeConfig = path.join(home, '.mcp.json');
  const cursorConfig = path.join(home, '.cursor', 'mcp.json');
  const windsurfConfig = path.join(home, '.codeium', 'windsurf', 'mcp.json');

  // If any exist, use the first one found
  if (fs.existsSync(claudeConfig)) return claudeConfig;
  if (fs.existsSync(cursorConfig)) return cursorConfig;
  if (fs.existsSync(windsurfConfig)) return windsurfConfig;

  // Default to Claude Code config
  return claudeConfig;
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
## Recall Team Memory

At the START of every coding session, automatically read the team memory by using the \`recall-context\` prompt or reading the \`recall://context\` resource. This provides context about what the team has been working on.

**Hot words for more context:**
- When user says "remember" - load session history via \`recall://history\` or \`recall_get_history\`
- When user says "ultraremember" - load full transcripts via \`recall://transcripts\`

**At the END of sessions:**
- Use \`recall_save_session\` to save what was accomplished

This ensures team knowledge is preserved and shared across all team members.
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
async function installRecall(token: string): Promise<void> {
  const configPath = getMcpConfigPath();
  console.log(`\n🔧 Installing Recall MCP server...\n`);

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
✅ Recall installed successfully!

What happens now:
• Team memory (small.md) loads automatically at session start
• Say "remember" to load session history (medium.md)
• Say "ultraremember" for full transcripts (large.md)
• All reads are tracked in your team dashboard

Next steps:
1. Restart your AI coding tool (Claude Code, Cursor, or Windsurf)
2. Start a new session - your team memory will load automatically

Need help? Visit https://recall.team/docs
`);
}

// Handle CLI commands
async function handleCli(): Promise<boolean> {
  const args = process.argv.slice(2);

  if (args[0] === 'install') {
    const token = args[1];

    if (!token) {
      console.error('Usage: npx recall-mcp-server install <token>');
      console.error('\nGet your token from https://recall.team/dashboard');
      process.exit(1);
    }

    await installRecall(token);
    return true; // Handled CLI command, don't start server
  }

  if (args[0] === '--help' || args[0] === '-h') {
    console.log(`
Recall MCP Server - Team memory for AI coding tools

Usage:
  npx recall-mcp-server install <token>   Install and configure Recall
  npx recall-mcp-server                   Start MCP server (called by AI tools)

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

  // Ping the API on startup to register connection (updates last_mcp_connection)
  const config = loadConfig();
  if (config?.token) {
    getTeamKey(config.token).catch(() => {
      // Silently ignore - just trying to register the connection
    });
  }

  await server.connect(transport);
  console.error('Recall MCP server started');
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
