/**
 * recall save
 * Extract sessions from AI coding tools, get AI summaries, encrypt and save
 */

import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs';
import {
  findRepoRoot,
  isRecallInitialized,
  readEvents,
  appendEvents,
  getLastEventTimestamp,
  writeSnapshot,
  getRecallDir
} from '../core/storage.js';
import { regenerateSnapshots } from '../core/snapshots.js';
import { extractAllEvents, getActiveExtractors } from '../extractors/index.js';
import { readConfig, getApiUrl, isAuthenticated } from '../core/config.js';
import {
  getEncryptionKey,
  encrypt,
  hasEncryptionAccess,
  fetchTeamKey
} from '../core/encryption.js';
import type { RecallEvent } from '../core/types.js';

interface SaveOptions {
  auto?: boolean;
  quiet?: boolean;
  useApi?: boolean; // Use cloud API for AI summarization (default: true)
}

interface ApiSummaryResponse {
  context: string;
  history: string;
  warning?: string;
}

/**
 * Call the Recall API for AI-powered summarization
 */
async function getAiSummaries(
  events: RecallEvent[],
  projectName: string
): Promise<ApiSummaryResponse | null> {
  if (!isAuthenticated()) {
    return null;
  }

  const config = readConfig();
  const apiUrl = getApiUrl();

  try {
    const response = await fetch(`${apiUrl}/summarize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events, projectName }),
    });

    if (!response.ok) {
      console.error(chalk.yellow('Warning: AI summarization failed, using local templates'));
      return null;
    }

    return await response.json() as ApiSummaryResponse;
  } catch (error) {
    // Network error - fall back to local
    return null;
  }
}

/**
 * Get project name from git remote or directory name
 */
function getProjectName(repoRoot: string): string {
  try {
    const gitConfigPath = path.join(repoRoot, '.git', 'config');
    if (fs.existsSync(gitConfigPath)) {
      const config = fs.readFileSync(gitConfigPath, 'utf8');
      const match = config.match(/url\s*=\s*.*[:/]([^/]+?)(?:\.git)?$/m);
      if (match) {
        return match[1];
      }
    }
  } catch {
    // Fall through
  }
  return path.basename(repoRoot);
}

export async function saveCommand(options: SaveOptions = {}): Promise<void> {
  const { auto = false, quiet = false, useApi = true } = options;

  const log = quiet ? () => {} : console.log;
  const logError = console.error;

  // Find git repo root
  const repoRoot = findRepoRoot();

  if (!repoRoot) {
    if (!auto) {
      logError(chalk.red('Error: Not in a git repository'));
    }
    process.exit(1);
  }

  // Check if initialized
  if (!isRecallInitialized(repoRoot)) {
    if (!auto) {
      logError(chalk.red('Error: Recall not initialized'));
      logError('Run ' + chalk.cyan('recall init') + ' first.');
    }
    process.exit(1);
  }

  // Get active extractors
  const active = await getActiveExtractors();
  if (active.length === 0) {
    if (!auto) {
      log(chalk.yellow('No AI coding tools detected.'));
      log('Supported tools: Claude Code, Cursor, Codex, Gemini CLI');
    }
    process.exit(0);
  }

  log(chalk.cyan('Extracting sessions...'));

  // Get last processed timestamp
  const since = getLastEventTimestamp(repoRoot);

  if (since && !quiet) {
    log(chalk.dim(`Looking for sessions since ${since.toISOString()}`));
  }

  // Extract new events
  const newEvents = await extractAllEvents(since);

  if (newEvents.length === 0) {
    log(chalk.dim('No new sessions found.'));
    process.exit(0);
  }

  log(chalk.green(`✓ Found ${newEvents.length} new session(s)`));

  // Log by tool
  const byTool = new Map<string, number>();
  for (const event of newEvents) {
    byTool.set(event.tool, (byTool.get(event.tool) || 0) + 1);
  }
  for (const [tool, count] of byTool) {
    log(`  ${tool}: ${count}`);
  }

  // Append events
  appendEvents(repoRoot, newEvents);
  log(chalk.green('✓ Events saved to .recall/events/events.jsonl'));

  // Get all events for summarization
  const allEvents = readEvents(repoRoot);
  const projectName = getProjectName(repoRoot);

  // Try API summarization first, fall back to local
  let memoryFiles: { context: string; history: string; sessionFiles: Map<string, string> };

  if (useApi && isAuthenticated()) {
    log(chalk.cyan('Generating AI summaries...'));
    const apiResult = await getAiSummaries(allEvents, projectName);

    if (apiResult) {
      // Use AI-generated summaries for context and history
      // Session files are always generated locally
      const localResult = regenerateSnapshots(allEvents);
      memoryFiles = {
        context: apiResult.context,
        history: apiResult.history,
        sessionFiles: localResult.sessionFiles,
      };

      if (apiResult.warning) {
        log(chalk.yellow(`Note: ${apiResult.warning}`));
      }
      log(chalk.green('✓ AI summaries generated'));
    } else {
      // Fall back to local templates
      memoryFiles = regenerateSnapshots(allEvents);
      log(chalk.yellow('Using local templates (API unavailable)'));
    }
  } else {
    // Use local templates
    memoryFiles = regenerateSnapshots(allEvents);
  }

  // Check for encryption access
  const recallDir = getRecallDir(repoRoot);
  const sessionsDir = path.join(recallDir, 'sessions');
  const hasAccess = await hasEncryptionAccess();

  // Ensure sessions directory exists
  if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, { recursive: true });
  }

  if (hasAccess) {
    // Encrypt and save
    log(chalk.cyan('Encrypting memory files...'));
    const key = await getEncryptionKey();

    if (key) {
      // Write encrypted context.md and history.md
      fs.writeFileSync(
        path.join(recallDir, 'context.md.enc'),
        encrypt(memoryFiles.context, key),
        { mode: 0o600 }
      );
      fs.writeFileSync(
        path.join(recallDir, 'history.md.enc'),
        encrypt(memoryFiles.history, key),
        { mode: 0o600 }
      );

      // Write encrypted session files
      for (const [sessionPath, content] of memoryFiles.sessionFiles) {
        const fullPath = path.join(recallDir, sessionPath);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(fullPath + '.enc', encrypt(content, key), { mode: 0o600 });
      }

      // Remove unencrypted files if they exist
      const unencrypted = ['context.md', 'history.md'];
      for (const file of unencrypted) {
        const filePath = path.join(recallDir, file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      log(chalk.green('✓ Encrypted memory files saved'));
    } else {
      // Shouldn't happen if hasAccess is true, but fallback
      writeSnapshot(repoRoot, 'context', memoryFiles.context);
      writeSnapshot(repoRoot, 'history', memoryFiles.history);
      log(chalk.yellow('Memory files saved (unencrypted - no key available)'));
    }
  } else {
    // No encryption access - check if this is free tier or no auth
    const keyResult = await fetchTeamKey();

    if (keyResult.error === 'No team membership') {
      // Save unencrypted for free/solo users
      writeSnapshot(repoRoot, 'context', memoryFiles.context);
      writeSnapshot(repoRoot, 'history', memoryFiles.history);
      log(chalk.green('✓ Memory files saved'));
      log(chalk.dim('Tip: Subscribe at recall.team for encrypted team sharing'));
    } else if (keyResult.error) {
      logError(chalk.red(`Encryption error: ${keyResult.message}`));
      // Still save unencrypted as fallback
      writeSnapshot(repoRoot, 'context', memoryFiles.context);
      writeSnapshot(repoRoot, 'history', memoryFiles.history);
    }
  }

  // Show summary
  log();
  log(chalk.bold('Summary:'));
  log(`  Total events: ${allEvents.length}`);
  log(`  New this save: ${newEvents.length}`);

  // Show what to do next
  if (!auto) {
    log();
    log(chalk.dim('Next: Commit and push to share context with your team.'));
    log(chalk.dim('  git add .recall && git commit -m "Update team context"'));
  }
}
