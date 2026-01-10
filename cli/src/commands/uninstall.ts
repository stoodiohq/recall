/**
 * recall uninstall
 * Complete removal of Recall from Claude Code
 *
 * Removes:
 * - MCP server registration
 * - Hooks from settings.json
 * - RECALL block from ~/.claude/CLAUDE.md
 * - Local auth tokens (~/.recall/config.json)
 */

import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { uninstallHooks } from '../hooks/claude-code.js';
import { getConfigDir } from '../core/config.js';

const execAsync = promisify(exec);

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const CLAUDE_MD_PATH = path.join(CLAUDE_DIR, 'CLAUDE.md');
const RECALL_START_MARKER = '<!-- RECALL:START -->';
const RECALL_END_MARKER = '<!-- RECALL:END -->';

interface UninstallOptions {
  keepData?: boolean;  // Keep .recall/ folders in projects
  quiet?: boolean;
}

/**
 * Remove RECALL block from a CLAUDE.md file
 */
function removeRecallBlock(filePath: string): { removed: boolean; message: string } {
  if (!fs.existsSync(filePath)) {
    return { removed: false, message: 'File does not exist' };
  }

  try {
    let content = fs.readFileSync(filePath, 'utf-8');

    if (!content.includes(RECALL_START_MARKER)) {
      return { removed: false, message: 'No Recall block found' };
    }

    // Remove the RECALL block (including markers and surrounding newlines)
    const regex = new RegExp(
      `\\n?${RECALL_START_MARKER}[\\s\\S]*?${RECALL_END_MARKER}\\n?`,
      'g'
    );
    content = content.replace(regex, '\n');

    // Clean up extra newlines
    content = content.replace(/\n{3,}/g, '\n\n').trim();

    // If file is now empty or just whitespace, delete it
    if (!content || content.trim() === '') {
      fs.unlinkSync(filePath);
      return { removed: true, message: 'File was empty after removal, deleted' };
    }

    fs.writeFileSync(filePath, content + '\n');
    return { removed: true, message: 'Recall block removed' };
  } catch (error) {
    return {
      removed: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Remove MCP server from Claude Code
 * Uses claude CLI for user-level removal, also checks legacy config files
 */
async function removeMcpServer(): Promise<{ removed: boolean; message: string }> {
  let removedAny = false;
  const messages: string[] = [];

  // Remove from user-level via claude CLI (this is where install now puts it)
  try {
    await execAsync('claude mcp remove recall -s user');
    removedAny = true;
    messages.push('Removed from user-level config');
  } catch {
    // May not exist at user level, that's fine
  }

  // Try project-level removal via claude CLI
  try {
    await execAsync('claude mcp remove recall');
    removedAny = true;
    messages.push('Removed from project-level config');
  } catch {
    // Project-level not found, that's fine
  }

  // Also clean up legacy locations that older installs may have used

  // Legacy: ~/.mcp.json
  const userMcpPath = path.join(os.homedir(), '.mcp.json');
  if (fs.existsSync(userMcpPath)) {
    try {
      const content = fs.readFileSync(userMcpPath, 'utf-8');
      const config = JSON.parse(content) as { mcpServers?: Record<string, unknown> };

      if (config.mcpServers && 'recall' in config.mcpServers) {
        delete config.mcpServers.recall;
        fs.writeFileSync(userMcpPath, JSON.stringify(config, null, 2));
        removedAny = true;
        messages.push('Removed from ~/.mcp.json (legacy)');
      }
    } catch {
      // Ignore errors
    }
  }

  // Legacy: ~/.claude/mcp.json (this was the old incorrect location)
  const claudeMcpPath = path.join(CLAUDE_DIR, 'mcp.json');
  if (fs.existsSync(claudeMcpPath)) {
    try {
      const content = fs.readFileSync(claudeMcpPath, 'utf-8');
      const config = JSON.parse(content) as { mcpServers?: Record<string, unknown> };

      if (config.mcpServers && 'recall' in config.mcpServers) {
        delete config.mcpServers.recall;
        fs.writeFileSync(claudeMcpPath, JSON.stringify(config, null, 2));
        removedAny = true;
        messages.push('Removed from ~/.claude/mcp.json (legacy)');
      }
    } catch {
      // Ignore errors
    }
  }

  if (removedAny) {
    return { removed: true, message: messages.join(', ') };
  } else {
    return { removed: false, message: 'MCP server not registered' };
  }
}

/**
 * Clear local auth config
 */
function clearLocalConfig(): { cleared: boolean; message: string } {
  const configDir = getConfigDir();
  const configFile = path.join(configDir, 'config.json');

  if (!fs.existsSync(configFile)) {
    return { cleared: false, message: 'No config file found' };
  }

  try {
    fs.unlinkSync(configFile);

    // Try to remove the directory if empty
    try {
      const files = fs.readdirSync(configDir);
      if (files.length === 0) {
        fs.rmdirSync(configDir);
      }
    } catch {
      // Directory not empty or can't be removed, that's fine
    }

    return { cleared: true, message: 'Auth tokens cleared' };
  } catch (error) {
    return {
      cleared: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function uninstallCommand(options: UninstallOptions = {}): Promise<void> {
  const { quiet = false } = options;

  if (!quiet) {
    console.log('');
    console.log(chalk.bold.red('Uninstalling Recall...'));
    console.log('');
  }

  let hasErrors = false;

  // Step 1: Remove MCP server
  if (!quiet) console.log(chalk.dim('Removing MCP server...'));
  const mcpResult = await removeMcpServer();
  if (mcpResult.removed) {
    if (!quiet) console.log(chalk.green('  ✓ ' + mcpResult.message));
  } else {
    if (!quiet) console.log(chalk.yellow('  ⚠ ' + mcpResult.message));
  }

  // Step 2: Remove hooks from settings.json
  if (!quiet) console.log(chalk.dim('Removing hooks...'));
  const hookResult = uninstallHooks();
  if (hookResult.success) {
    if (!quiet) console.log(chalk.green('  ✓ ' + hookResult.message));
  } else {
    if (!quiet) console.log(chalk.red('  ✗ ' + hookResult.message));
    hasErrors = true;
  }

  // Step 3: Remove RECALL block from ~/.claude/CLAUDE.md
  if (!quiet) console.log(chalk.dim('Cleaning up CLAUDE.md...'));
  const claudeMdResult = removeRecallBlock(CLAUDE_MD_PATH);
  if (claudeMdResult.removed) {
    if (!quiet) console.log(chalk.green('  ✓ ' + claudeMdResult.message));
  } else {
    if (!quiet) console.log(chalk.yellow('  ⚠ ' + claudeMdResult.message));
  }

  // Step 4: Clear local auth tokens
  if (!quiet) console.log(chalk.dim('Clearing auth tokens...'));
  const configResult = clearLocalConfig();
  if (configResult.cleared) {
    if (!quiet) console.log(chalk.green('  ✓ ' + configResult.message));
  } else {
    if (!quiet) console.log(chalk.yellow('  ⚠ ' + configResult.message));
  }

  // Done
  if (!quiet) {
    console.log('');
    if (hasErrors) {
      console.log(chalk.yellow('Recall uninstalled with warnings.'));
    } else {
      console.log(chalk.green.bold('✓ Recall completely uninstalled.'));
    }
    console.log('');
    console.log(chalk.dim('Note: Project .recall/ folders are preserved.'));
    console.log(chalk.dim('To remove project data, delete .recall/ manually.'));
    console.log('');
  }
}
