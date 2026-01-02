#!/usr/bin/env node
/**
 * Recall CLI
 * Team memory for AI coding assistants
 *
 * https://recall.team
 */

import { Command } from 'commander';
import { initCommand, saveCommand, statusCommand, syncCommand } from './commands/index.js';

const program = new Command();

program
  .name('recall')
  .description('Team memory for AI coding assistants')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize Recall in the current git repository')
  .action(initCommand);

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

program.parse();
