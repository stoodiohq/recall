/**
 * recall save
 * Extract sessions from AI coding tools, append events, regenerate snapshots
 */

import chalk from 'chalk';
import {
  findRepoRoot,
  isRecallInitialized,
  readEvents,
  appendEvents,
  getLastEventTimestamp,
  writeSnapshot
} from '../core/storage.js';
import { regenerateSnapshots } from '../core/snapshots.js';
import { extractAllEvents, getActiveExtractors } from '../extractors/index.js';

interface SaveOptions {
  auto?: boolean;
  quiet?: boolean;
}

export async function saveCommand(options: SaveOptions = {}): Promise<void> {
  const { auto = false, quiet = false } = options;

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

  // Regenerate snapshots
  const allEvents = readEvents(repoRoot);
  const snapshots = regenerateSnapshots(allEvents);

  writeSnapshot(repoRoot, 'small', snapshots.small);
  writeSnapshot(repoRoot, 'medium', snapshots.medium);
  writeSnapshot(repoRoot, 'large', snapshots.large);

  log(chalk.green('✓ Snapshots regenerated'));

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
