/**
 * recall status
 * Show current Recall state in this repository
 */

import chalk from 'chalk';
import {
  findRepoRoot,
  isRecallInitialized,
  readEvents,
  readManifest,
  readSnapshot
} from '../core/storage.js';
import { getInstalledExtractors, getActiveExtractors } from '../extractors/index.js';

export async function statusCommand(): Promise<void> {
  // Find git repo root
  const repoRoot = findRepoRoot();

  if (!repoRoot) {
    console.error(chalk.red('Error: Not in a git repository'));
    process.exit(1);
  }

  console.log(chalk.bold('Recall Status'));
  console.log();

  // Check if initialized
  if (!isRecallInitialized(repoRoot)) {
    console.log(chalk.yellow('Not initialized'));
    console.log('Run ' + chalk.cyan('recall init') + ' to get started.');
    process.exit(0);
  }

  console.log(chalk.green('✓ Initialized'));
  console.log();

  // Manifest info
  const manifest = readManifest(repoRoot);
  if (manifest) {
    console.log(chalk.bold('Repository:'));
    console.log(`  Version: ${manifest.version}`);
    console.log(`  Created: ${manifest.created}`);
    console.log(`  Team: ${manifest.team || 'local (not connected)'}`);
    console.log();
  }

  // Events summary
  const events = readEvents(repoRoot);
  console.log(chalk.bold('Events:'));
  console.log(`  Total: ${events.length}`);

  if (events.length > 0) {
    const first = new Date(events[0].ts);
    const last = new Date(events[events.length - 1].ts);
    console.log(`  First: ${first.toLocaleDateString()}`);
    console.log(`  Last: ${last.toLocaleDateString()}`);

    // Count by type
    const byType = new Map<string, number>();
    const byTool = new Map<string, number>();
    const byUser = new Map<string, number>();

    for (const event of events) {
      byType.set(event.type, (byType.get(event.type) || 0) + 1);
      byTool.set(event.tool, (byTool.get(event.tool) || 0) + 1);
      byUser.set(event.user, (byUser.get(event.user) || 0) + 1);
    }

    console.log();
    console.log('  By type:');
    for (const [type, count] of byType) {
      console.log(`    ${type}: ${count}`);
    }

    console.log();
    console.log('  By tool:');
    for (const [tool, count] of byTool) {
      console.log(`    ${tool}: ${count}`);
    }

    console.log();
    console.log('  By user:');
    for (const [user, count] of byUser) {
      console.log(`    ${user}: ${count}`);
    }
  }

  console.log();

  // Snapshot sizes
  console.log(chalk.bold('Snapshots:'));
  const small = readSnapshot(repoRoot, 'small');
  const medium = readSnapshot(repoRoot, 'medium');
  const large = readSnapshot(repoRoot, 'large');

  const estimateTokens = (text: string) => Math.ceil(text.length / 4);

  console.log(`  small.md: ~${estimateTokens(small)} tokens`);
  console.log(`  medium.md: ~${estimateTokens(medium)} tokens`);
  console.log(`  large.md: ~${estimateTokens(large)} tokens`);
  console.log();

  // Installed extractors
  console.log(chalk.bold('AI Coding Tools:'));
  const installed = await getInstalledExtractors();
  const active = await getActiveExtractors();

  if (installed.length === 0) {
    console.log(chalk.yellow('  None detected'));
  } else {
    for (const ext of installed) {
      const isActive = active.some(a => a.name === ext.name);
      const status = isActive ? chalk.green('active') : chalk.dim('installed');
      console.log(`  ${ext.name}: ${status}`);
    }
  }

  console.log();
  console.log(chalk.dim('Run ' + chalk.cyan('recall save') + ' to capture new sessions.'));
}
