#!/usr/bin/env node
/**
 * Recall CLI
 * Team memory for AI coding assistants
 *
 * https://recall.team
 */

import { Command } from 'commander';
import { authCommand, initCommand, loadCommand, saveCommand, setupCommand, statusCommand, syncCommand, uninstallCommand } from './commands/index.js';
import { hookCommand } from './hooks/claude-code.js';

const program = new Command();

program
  .name('recall')
  .description('Team memory for AI coding assistants')
  .version('0.1.0');

program
  .command('setup')
  .description('One-command setup: authenticate, initialize, and install hooks')
  .action(setupCommand);

program
  .command('auth')
  .description('Authenticate with GitHub')
  .option('-t, --token <token>', 'Set token directly (skip browser)')
  .option('--logout', 'Log out and clear stored credentials')
  .option('--status', 'Show current authentication status')
  .action(authCommand);

program
  .command('init')
  .description('Initialize Recall in the current git repository')
  .action(initCommand);

program
  .command('load')
  .description('Load and decrypt team memory context')
  .option('-s, --size <size>', 'Snapshot size: small, medium, large', 'small')
  .option('-f, --format <format>', 'Output format: plain, json', 'plain')
  .option('--quiet', 'Suppress status messages')
  .action(loadCommand);

program
  .command('save')
  .description('Extract sessions and update team context')
  .option('--auto', 'Run in auto mode (quiet, exit cleanly on errors)')
  .option('--quiet', 'Suppress non-error output')
  .action(saveCommand);

program
  .command('status')
  .description('Show Recall status for this repository')
  .action(statusCommand);

program
  .command('sync')
  .description('Sync with Recall cloud for AI-powered summaries')
  .option('--regenerate', 'Regenerate snapshots after sync')
  .option('--quiet', 'Suppress non-error output')
  .action(syncCommand);

program
  .command('uninstall')
  .description('Completely remove Recall from Claude Code')
  .option('--quiet', 'Suppress output')
  .action(uninstallCommand);

// Hook commands for AI tool integration
const hook = program
  .command('hook')
  .description('Manage AI tool hooks (Claude Code, etc.)');

hook
  .command('install')
  .description('Install Recall hooks into Claude Code')
  .action(() => hookCommand('install'));

hook
  .command('uninstall')
  .description('Remove Recall hooks from Claude Code')
  .action(() => hookCommand('uninstall'));

hook
  .command('status')
  .description('Check if Recall hooks are installed')
  .action(() => hookCommand('status'));

hook
  .command('context')
  .description('(Internal) Output context for AI tool')
  .action(() => hookCommand('context'));

hook
  .command('save')
  .description('(Internal) Save context after session')
  .option('--auto', 'Auto mode')
  .option('--quiet', 'Quiet mode')
  .action((opts) => hookCommand('save', opts));

hook
  .command('on-commit')
  .description('(Internal) Handle post-commit hook')
  .action(() => hookCommand('on-commit'));

hook
  .command('on-prompt')
  .description('(Internal) Handle user prompt for save keywords')
  .action(() => hookCommand('on-prompt'));

program.parse();
