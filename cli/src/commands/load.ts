/**
 * recall load
 * Decrypt and load team memory context
 *
 * This command is called at session start to load context into AI.
 * It outputs the decrypted content to stdout for piping into AI context.
 */

import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs';
import {
  findRepoRoot,
  isRecallInitialized,
  getRecallDir
} from '../core/storage.js';
import {
  decryptSnapshots,
  hasEncryptionAccess,
  fetchTeamKey
} from '../core/encryption.js';

type SnapshotSize = 'small' | 'medium' | 'large';

interface LoadOptions {
  size?: SnapshotSize;
  format?: 'plain' | 'json';
  quiet?: boolean;
}

export async function loadCommand(options: LoadOptions = {}): Promise<void> {
  const { size = 'small', format = 'plain', quiet = false } = options;

  const log = quiet ? () => {} : (msg: string) => console.error(msg);
  const logError = console.error;

  // Find git repo root
  const repoRoot = findRepoRoot();

  if (!repoRoot) {
    logError(chalk.red('Error: Not in a git repository'));
    process.exit(1);
  }

  // Check if initialized
  if (!isRecallInitialized(repoRoot)) {
    logError(chalk.red('Error: Recall not initialized'));
    logError('Run ' + chalk.cyan('recall init') + ' first.');
    process.exit(1);
  }

  const recallDir = getRecallDir(repoRoot);
  const snapshotDir = path.join(recallDir, 'snapshots');

  // Check for encrypted files
  const encryptedPath = path.join(snapshotDir, `${size}.md.enc`);
  const plainPath = path.join(snapshotDir, `${size}.md`);

  if (fs.existsSync(encryptedPath)) {
    // Encrypted file exists - need to decrypt
    log(chalk.cyan('Decrypting team memory...'));

    const hasAccess = await hasEncryptionAccess();

    if (!hasAccess) {
      const keyResult = await fetchTeamKey();

      if (keyResult.error === 'No team membership') {
        logError(chalk.yellow('Team memory is encrypted.'));
        logError(chalk.dim('Contact your team admin for a Recall seat.'));
        logError(chalk.dim('Or subscribe at recall.team'));

        // Output a helpful message for the AI
        if (format === 'json') {
          console.log(JSON.stringify({
            success: false,
            error: 'no_access',
            message: 'Team memory exists but user does not have access. They need a Recall seat.',
          }));
        } else {
          console.log('# Team Memory Unavailable\n\nThis repository has Recall team memory, but you need a seat to access it.\n\nContact your team admin or subscribe at https://recall.team');
        }
        process.exit(0);
      } else if (keyResult.error === 'No seats available') {
        logError(chalk.yellow('No seats available.'));
        logError(chalk.dim(keyResult.message || 'Contact your team admin.'));
        process.exit(1);
      } else {
        logError(chalk.red('Failed to get encryption key.'));
        logError(chalk.dim(keyResult.message || 'Please try again.'));
        process.exit(1);
      }
    }

    // Decrypt all snapshots
    const result = await decryptSnapshots(recallDir);

    if (!result.success) {
      logError(chalk.red('Decryption failed.'));
      logError(chalk.dim(result.error || 'Unknown error'));
      process.exit(1);
    }

    const content = result.snapshots[size];

    if (!content) {
      logError(chalk.yellow(`No ${size} snapshot found.`));
      process.exit(0);
    }

    log(chalk.green('✓ Decrypted'));

    // Output content
    if (format === 'json') {
      console.log(JSON.stringify({
        success: true,
        size,
        content,
        tokens: estimateTokens(content),
      }));
    } else {
      console.log(content);
    }
  } else if (fs.existsSync(plainPath)) {
    // Unencrypted file (free tier or legacy)
    const content = fs.readFileSync(plainPath, 'utf8');

    if (format === 'json') {
      console.log(JSON.stringify({
        success: true,
        size,
        content,
        tokens: estimateTokens(content),
        encrypted: false,
      }));
    } else {
      console.log(content);
    }
  } else {
    // No snapshot exists
    logError(chalk.yellow(`No ${size} snapshot found.`));
    logError(chalk.dim('Run `recall save` to capture context.'));

    if (format === 'json') {
      console.log(JSON.stringify({
        success: false,
        error: 'no_snapshot',
        message: `No ${size} snapshot exists. Run 'recall save' first.`,
      }));
    }
    process.exit(0);
  }
}

/**
 * Rough token estimate (~4 chars per token)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Load context for AI tool integration
 * Returns the context string or null if not available
 */
export async function loadContext(
  repoRoot: string,
  size: SnapshotSize = 'small'
): Promise<{ content: string | null; error?: string }> {
  const recallDir = getRecallDir(repoRoot);
  const snapshotDir = path.join(recallDir, 'snapshots');

  const encryptedPath = path.join(snapshotDir, `${size}.md.enc`);
  const plainPath = path.join(snapshotDir, `${size}.md`);

  if (fs.existsSync(encryptedPath)) {
    const hasAccess = await hasEncryptionAccess();

    if (!hasAccess) {
      return {
        content: null,
        error: 'Team memory available but you need a Recall seat. Visit recall.team',
      };
    }

    const result = await decryptSnapshots(recallDir);

    if (!result.success) {
      return { content: null, error: result.error };
    }

    return { content: result.snapshots[size] || null };
  } else if (fs.existsSync(plainPath)) {
    return { content: fs.readFileSync(plainPath, 'utf8') };
  }

  return { content: null };
}
