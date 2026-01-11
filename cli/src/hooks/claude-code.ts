/**
 * Claude Code Hooks for Recall
 *
 * These hooks integrate Recall with Claude Code for automatic session saving:
 *
 * 1. Stop hook - Auto-save when session ends
 * 2. PostToolUse hook - Auto-save after git commit/push
 * 3. UserPromptSubmit hook - Save when user types "save", "let's save", etc.
 *
 * To install:
 *   recall hook install
 *
 * This adds to ~/.claude/settings.json:
 * {
 *   "hooks": {
 *     "Stop": [{ "hooks": [{ "type": "command", "command": "recall hook save --auto --quiet" }] }],
 *     "PostToolUse": [{ "matcher": "Bash", "hooks": [{ "type": "command", "command": "recall hook on-commit" }] }],
 *     "UserPromptSubmit": [{ "hooks": [{ "type": "command", "command": "recall hook on-prompt" }] }]
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
    Stop?: HookConfig[];
    UserPromptSubmit?: HookConfig[];
  };
  [key: string]: unknown;
}

interface HookEntry {
  type: 'command';
  command: string;
}

interface HookConfig {
  matcher?: string;
  hooks: HookEntry[];
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

    // Check Stop hook (session end)
    const stop = settings.hooks?.Stop || [];
    const hasStopHook = stop.some(hook =>
      hook.hooks?.some(h => h.command?.includes(RECALL_HOOK_MARKER))
    );

    // Check PostToolUse hook (git commit)
    const postToolUse = settings.hooks?.PostToolUse || [];
    const hasGitCommitHook = postToolUse.some(hook =>
      hook.matcher === 'Bash' &&
      hook.hooks?.some(h => h.command?.includes(RECALL_HOOK_MARKER))
    );

    return hasStopHook || hasGitCommitHook;
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

  let installed = false;

  // 1. Stop hook - auto-save when session ends
  const stopHook: HookConfig = {
    hooks: [
      {
        type: 'command',
        command: 'recall hook save --auto --quiet',
      },
    ],
  };

  const existingStop = settings.hooks.Stop || [];
  const hasStopHook = existingStop.some(hook =>
    hook.hooks?.some(h => h.command?.includes(RECALL_HOOK_MARKER))
  );

  if (!hasStopHook) {
    settings.hooks.Stop = [...existingStop, stopHook];
    installed = true;
  }

  // 2. PostToolUse hook - auto-save after git commit
  const gitCommitHook: HookConfig = {
    matcher: 'Bash',
    hooks: [
      {
        type: 'command',
        command: 'recall hook on-commit',
      },
    ],
  };

  const existingPostToolUse = settings.hooks.PostToolUse || [];
  const hasGitCommitHook = existingPostToolUse.some(hook =>
    hook.matcher === 'Bash' &&
    hook.hooks?.some(h => h.command?.includes('recall hook'))
  );

  if (!hasGitCommitHook) {
    settings.hooks.PostToolUse = [...existingPostToolUse, gitCommitHook];
    installed = true;
  }

  // 3. UserPromptSubmit hook - detect "save" keyword
  const saveKeywordHook: HookConfig = {
    hooks: [
      {
        type: 'command',
        command: 'recall hook on-prompt',
      },
    ],
  };

  const existingPromptSubmit = settings.hooks.UserPromptSubmit || [];
  const hasSaveKeywordHook = existingPromptSubmit.some(hook =>
    hook.hooks?.some(h => h.command?.includes('recall hook'))
  );

  if (!hasSaveKeywordHook) {
    settings.hooks.UserPromptSubmit = [...existingPromptSubmit, saveKeywordHook];
    installed = true;
  }

  if (!installed) {
    return {
      success: true,
      message: 'Recall hooks already installed.',
    };
  }

  // Write back
  try {
    fs.writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2));
    return {
      success: true,
      message: 'Recall hooks installed successfully:\n  - Auto-save on session end\n  - Auto-save on git commit\n  - Save on "save" keyword',
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
    for (const hookType of ['PreToolUse', 'PostToolUse', 'SessionEnd', 'SessionStart', 'Stop', 'UserPromptSubmit'] as const) {
      if (settings.hooks[hookType]) {
        settings.hooks[hookType] = settings.hooks[hookType]!.filter(hook =>
          !hook.hooks?.some(h => h.command?.includes('recall hook'))
        );
        // Clean up empty arrays
        if (settings.hooks[hookType]!.length === 0) {
          delete settings.hooks[hookType];
        }
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
 * Hook command: on-commit
 * Called after Bash tool use - checks if it was a git commit
 * Reads $CLAUDE_TOOL_INPUT to get the command that was executed
 */
export async function hookOnCommit(): Promise<void> {
  const toolInput = process.env.CLAUDE_TOOL_INPUT;

  if (!toolInput) {
    // No tool input - not a Bash command
    process.exit(0);
  }

  try {
    const input = JSON.parse(toolInput);
    const command = input.command || '';

    // Check if this was a git commit command
    if (!command.includes('git commit') && !command.includes('git push')) {
      // Not a git commit/push - exit silently
      process.exit(0);
    }

    // This was a git commit/push - save the session
    await hookSave({ auto: true, quiet: true });
  } catch {
    // Failed to parse - exit silently
    process.exit(0);
  }
}

/**
 * Hook command: on-prompt
 * Called on user prompt submit - checks for save keywords
 * Reads from stdin to get the prompt content
 */
export async function hookOnPrompt(): Promise<void> {
  // Read prompt from stdin (Claude Code pipes it)
  let prompt = '';
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const input = Buffer.concat(chunks).toString('utf8');
    const data = JSON.parse(input);
    prompt = (data.prompt || data.message || '').toLowerCase();
  } catch {
    // No stdin or parse error - exit silently
    process.exit(0);
  }

  // Check for save keywords
  const savePatterns = [
    /^save$/,                    // Just "save"
    /^save\s+session$/,          // "save session"
    /^save\s+this$/,             // "save this"
    /let'?s?\s+save/,            // "let's save", "lets save"
    /save\s+(?:the\s+)?session/, // "save the session"
    /save\s+(?:where|what)/,     // "save where we are", "save what we did"
    /save\s+progress/,           // "save progress"
    /save\s+memory/,             // "save memory"
    /save\s+context/,            // "save context"
  ];

  const shouldSave = savePatterns.some(pattern => pattern.test(prompt));

  if (!shouldSave) {
    // No save keyword - exit silently
    process.exit(0);
  }

  // User wants to save - trigger save and inform Claude
  console.log('Saving session to Recall...');
  await hookSave({ auto: true, quiet: false });
  console.log('Session saved! Team context updated.');
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

    case 'on-commit':
      await hookOnCommit();
      break;

    case 'on-prompt':
      await hookOnPrompt();
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
        console.log(chalk.dim('  - Auto-save on session end (Stop hook)'));
        console.log(chalk.dim('  - Auto-save on git commit (PostToolUse hook)'));
        console.log(chalk.dim('  - Save on "save" keyword (UserPromptSubmit hook)'));
      } else {
        console.log(chalk.yellow('Recall hooks are not installed'));
        console.log(chalk.dim('Run `recall hook install` to install'));
      }
      break;

    default:
      console.error(chalk.red(`Unknown hook subcommand: ${subcommand}`));
      console.log('Available: context, save, on-commit, on-prompt, install, uninstall, status');
      process.exit(1);
  }
}
