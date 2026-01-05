/**
 * Claude Code Hooks for Recall
 *
 * These hooks integrate Recall with Claude Code:
 * - Session start: Load context from .recall/
 * - Session end: Save new sessions to .recall/
 *
 * To install:
 *   recall hooks install
 *
 * Or manually add to ~/.claude/settings.json:
 * {
 *   "hooks": {
 *     "PreToolUse": [
 *       {
 *         "matcher": ".*",
 *         "commands": ["recall hook context"]
 *       }
 *     ],
 *     "PostToolUse": [],
 *     "SessionEnd": [
 *       {
 *         "matcher": ".*",
 *         "commands": ["recall hook save --auto"]
 *       }
 *     ]
 *   }
 * }
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import chalk from 'chalk';
import { findRepoRoot, isRecallInitialized } from '../core/storage.js';
import { loadContext } from '../commands/load.js';
import { saveCommand } from '../commands/save.js';

interface ClaudeSettings {
  hooks?: {
    PreToolUse?: HookConfig[];
    PostToolUse?: HookConfig[];
    SessionEnd?: HookConfig[];
    SessionStart?: HookConfig[];
  };
  [key: string]: unknown;
}

interface HookConfig {
  matcher: string;
  commands: string[];
}

const CLAUDE_SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');
const RECALL_HOOK_MARKER = 'recall hook';

/**
 * Detect which AI coding tool is being used
 */
export function detectAiTool(): string | null {
  // Check for Claude Code
  if (fs.existsSync(path.join(os.homedir(), '.claude'))) {
    return 'Claude Code';
  }
  // Check for Cursor
  if (fs.existsSync(path.join(os.homedir(), '.cursor'))) {
    return 'Cursor';
  }
  // Check for Windsurf
  if (fs.existsSync(path.join(os.homedir(), '.windsurf'))) {
    return 'Windsurf';
  }
  return null;
}

/**
 * Check if Recall hooks are installed
 */
export function isHookInstalled(): boolean {
  return hooksInstalled();
}

export function hooksInstalled(): boolean {
  if (!fs.existsSync(CLAUDE_SETTINGS_PATH)) {
    return false;
  }

  try {
    const settings = JSON.parse(fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf8')) as ClaudeSettings;
    const sessionEnd = settings.hooks?.SessionEnd || [];

    return sessionEnd.some(hook =>
      hook.commands.some(cmd => cmd.includes(RECALL_HOOK_MARKER))
    );
  } catch {
    return false;
  }
}

/**
 * Install Recall hooks into Claude Code settings
 */
export function installHook(): { success: boolean; message: string } {
  return installHooks();
}

export function installHooks(): { success: boolean; message: string } {
  const claudeDir = path.dirname(CLAUDE_SETTINGS_PATH);

  // Ensure .claude directory exists
  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true, mode: 0o700 });
  }

  // Read existing settings or create new
  let settings: ClaudeSettings = {};
  if (fs.existsSync(CLAUDE_SETTINGS_PATH)) {
    try {
      settings = JSON.parse(fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf8'));
    } catch {
      return {
        success: false,
        message: 'Failed to parse existing Claude settings.json',
      };
    }
  }

  // Initialize hooks if not present
  if (!settings.hooks) {
    settings.hooks = {};
  }

  // Add SessionEnd hook for auto-save
  const sessionEndHook: HookConfig = {
    matcher: '.*',
    commands: ['recall hook save --auto --quiet'],
  };

  // Check if already installed
  const existingSessionEnd = settings.hooks.SessionEnd || [];
  const alreadyInstalled = existingSessionEnd.some(hook =>
    hook.commands.some(cmd => cmd.includes(RECALL_HOOK_MARKER))
  );

  if (alreadyInstalled) {
    return {
      success: true,
      message: 'Recall hooks already installed.',
    };
  }

  settings.hooks.SessionEnd = [...existingSessionEnd, sessionEndHook];

  // Write back
  try {
    fs.writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2));
    return {
      success: true,
      message: 'Recall hooks installed successfully.',
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to write settings: ${error}`,
    };
  }
}

/**
 * Uninstall Recall hooks from Claude Code settings
 */
export function uninstallHooks(): { success: boolean; message: string } {
  if (!fs.existsSync(CLAUDE_SETTINGS_PATH)) {
    return {
      success: true,
      message: 'No Claude settings found.',
    };
  }

  try {
    const settings = JSON.parse(fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf8')) as ClaudeSettings;

    if (!settings.hooks) {
      return {
        success: true,
        message: 'No hooks configured.',
      };
    }

    // Remove Recall hooks from each hook type
    for (const hookType of ['PreToolUse', 'PostToolUse', 'SessionEnd', 'SessionStart'] as const) {
      if (settings.hooks[hookType]) {
        settings.hooks[hookType] = settings.hooks[hookType]!.filter(hook =>
          !hook.commands.some(cmd => cmd.includes(RECALL_HOOK_MARKER))
        );
      }
    }

    fs.writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2));
    return {
      success: true,
      message: 'Recall hooks uninstalled.',
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to uninstall hooks: ${error}`,
    };
  }
}

/**
 * Hook command: context
 * Called at session start to output context for loading
 */
export async function hookContext(): Promise<void> {
  const repoRoot = findRepoRoot();

  if (!repoRoot) {
    // Not in a git repo - silently exit
    process.exit(0);
  }

  if (!isRecallInitialized(repoRoot)) {
    // Recall not initialized - silently exit
    process.exit(0);
  }

  // Load small context by default
  const result = await loadContext(repoRoot, 'small');

  if (result.content) {
    // Output context for Claude to read
    console.log(`

# Team Memory (Recall)

The following is your team's shared context for this repository.
Read it to understand what has been built, why decisions were made,
and what mistakes to avoid.

---

${result.content}

---
`);
  } else if (result.error) {
    // Output error as a note
    console.log(`
# Team Memory Note

${result.error}
`);
  }
}

/**
 * Hook command: save
 * Called at session end to save new context
 */
export async function hookSave(options: { auto?: boolean; quiet?: boolean } = {}): Promise<void> {
  try {
    await saveCommand({
      auto: options.auto ?? true,
      quiet: options.quiet ?? true,
    });
  } catch {
    // Silently fail in hook context
    process.exit(0);
  }
}

/**
 * CLI handler for 'recall hook' subcommand
 */
export async function hookCommand(subcommand: string, options: Record<string, unknown> = {}): Promise<void> {
  switch (subcommand) {
    case 'context':
      await hookContext();
      break;

    case 'save':
      await hookSave({
        auto: options.auto as boolean | undefined,
        quiet: options.quiet as boolean | undefined,
      });
      break;

    case 'install':
      const installResult = installHooks();
      if (installResult.success) {
        console.log(chalk.green('✓ ' + installResult.message));
      } else {
        console.error(chalk.red('Error: ' + installResult.message));
        process.exit(1);
      }
      break;

    case 'uninstall':
      const uninstallResult = uninstallHooks();
      if (uninstallResult.success) {
        console.log(chalk.green('✓ ' + uninstallResult.message));
      } else {
        console.error(chalk.red('Error: ' + uninstallResult.message));
        process.exit(1);
      }
      break;

    case 'status':
      if (hooksInstalled()) {
        console.log(chalk.green('✓ Recall hooks are installed'));
      } else {
        console.log(chalk.yellow('Recall hooks are not installed'));
        console.log(chalk.dim('Run `recall hook install` to install'));
      }
      break;

    default:
      console.error(chalk.red(`Unknown hook subcommand: ${subcommand}`));
      console.log('Available: context, save, install, uninstall, status');
      process.exit(1);
  }
}
