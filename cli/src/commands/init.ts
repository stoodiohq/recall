/**
 * recall init
 * Initialize .recall/ directory in the current git repository
 */

import chalk from 'chalk';
import { findRepoRoot, isRecallInitialized, initRecallDir, getRecallPath } from '../core/storage.js';
import { getInstalledExtractors } from '../extractors/index.js';

export async function initCommand(): Promise<void> {
  // Find git repo root
  const repoRoot = findRepoRoot();

  if (!repoRoot) {
    console.error(chalk.red('Error: Not in a git repository'));
    console.log('Run this command from inside a git repository.');
    process.exit(1);
  }

  // Check if already initialized
  if (isRecallInitialized(repoRoot)) {
    console.log(chalk.yellow('Recall is already initialized in this repository.'));
    console.log(`Path: ${getRecallPath(repoRoot)}`);
    process.exit(0);
  }

  // Initialize
  console.log(chalk.cyan('Initializing Recall...'));
  initRecallDir(repoRoot);

  console.log(chalk.green('✓ Created .recall/ directory'));
  console.log(chalk.green('✓ Created events.jsonl'));
  console.log(chalk.green('✓ Created snapshots (small.md, medium.md, large.md)'));
  console.log(chalk.green('✓ Created .recallignore'));
  console.log(chalk.green('✓ Created .gitattributes for merge strategy'));

  // Check for installed extractors
  const installed = await getInstalledExtractors();
  if (installed.length > 0) {
    console.log();
    console.log(chalk.cyan('Detected AI coding tools:'));
    for (const ext of installed) {
      console.log(`  ${chalk.green('✓')} ${ext.name}`);
    }
  }

  console.log();
  console.log(chalk.bold('Next steps:'));
  console.log('  1. Use your AI coding assistant as usual');
  console.log('  2. Run ' + chalk.cyan('recall save') + ' to capture context');
  console.log('  3. Commit and push to share with your team');
  console.log();
  console.log(chalk.dim('Your AI will read .recall/small.md for team context.'));
}
