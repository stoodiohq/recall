/**
 * recall sync
 * Sync with Recall cloud for AI-powered summarization
 */

import chalk from 'chalk';
import {
  findRepoRoot,
  isRecallInitialized,
  readEvents,
  readManifest,
  writeSnapshot
} from '../core/storage.js';

interface SyncOptions {
  regenerate?: boolean;
  quiet?: boolean;
}

export async function syncCommand(options: SyncOptions = {}): Promise<void> {
  const { regenerate = false, quiet = false } = options;
  const log = quiet ? () => {} : console.log;

  // Find git repo root
  const repoRoot = findRepoRoot();

  if (!repoRoot) {
    console.error(chalk.red('Error: Not in a git repository'));
    process.exit(1);
  }

  // Check if initialized
  if (!isRecallInitialized(repoRoot)) {
    console.error(chalk.red('Error: Recall not initialized'));
    console.error('Run ' + chalk.cyan('recall init') + ' first.');
    process.exit(1);
  }

  const manifest = readManifest(repoRoot);

  // Check if connected to cloud
  if (!manifest?.team) {
    log(chalk.yellow('Not connected to Recall cloud.'));
    log();
    log('Running in local-only mode. Summaries are template-based.');
    log('To get AI-powered summaries, sign up at ' + chalk.cyan('https://recall.team'));
    log();

    if (regenerate) {
      // Just regenerate locally
      const { regenerateSnapshots } = await import('../core/snapshots.js');
      const events = readEvents(repoRoot);
      const snapshots = regenerateSnapshots(events);

      writeSnapshot(repoRoot, 'small', snapshots.small);
      writeSnapshot(repoRoot, 'medium', snapshots.medium);
      writeSnapshot(repoRoot, 'large', snapshots.large);

      log(chalk.green('✓ Snapshots regenerated (local mode)'));
    }

    return;
  }

  // TODO: Cloud sync implementation
  log(chalk.cyan('Syncing with Recall cloud...'));
  log();
  log(chalk.yellow('Cloud sync coming soon.'));
  log('For now, Recall works in local-only mode.');
}
