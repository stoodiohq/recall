/**
 * Git utilities for Recall
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { parse as parseIni } from 'ini';

export async function getGitUser(): Promise<string> {
  try {
    const email = execSync('git config user.email', { encoding: 'utf-8' }).trim();
    if (email) return email;
  } catch {
    // Git config not available
  }

  // Fallback: try to read from ~/.gitconfig
  const gitconfigPath = join(homedir(), '.gitconfig');
  if (existsSync(gitconfigPath)) {
    try {
      const content = readFileSync(gitconfigPath, 'utf-8');
      const config = parseIni(content);
      if (config.user?.email) {
        return config.user.email;
      }
    } catch {
      // Malformed gitconfig
    }
  }

  // Ultimate fallback
  return 'unknown@local';
}

export async function getGitBranch(): Promise<string> {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

export async function getRepoName(): Promise<string> {
  try {
    const remote = execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();
    // Extract repo name from URL
    const match = remote.match(/\/([^\/]+?)(\.git)?$/);
    if (match) return match[1];
  } catch {
    // No remote or git not available
  }

  // Fallback: use directory name
  return process.cwd().split('/').pop() || 'unknown';
}

export function isGitRepo(path: string): boolean {
  return existsSync(join(path, '.git'));
}
