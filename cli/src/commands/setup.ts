/**
 * recall setup
 * One-command setup: auth + init + hook install
 */

import chalk from 'chalk';
import * as readline from 'readline';
import { readConfig, updateConfig, getApiUrl, isAuthenticated } from '../core/config.js';
import { findRepoRoot, isRecallInitialized, initRecallDir } from '../core/storage.js';
import { installHook, isHookInstalled, detectAiTool } from '../hooks/claude-code.js';

interface MeResponse {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  githubUsername: string;
  team: {
    id: string;
    name: string;
    slug: string;
    role: string;
    tier: string;
    seats: number;
  } | null;
}

/**
 * Open URL in default browser
 */
async function openBrowser(url: string): Promise<void> {
  const { exec } = await import('child_process');
  const platform = process.platform;

  let command: string;
  if (platform === 'darwin') {
    command = `open "${url}"`;
  } else if (platform === 'win32') {
    command = `start "" "${url}"`;
  } else {
    command = `xdg-open "${url}"`;
  }

  return new Promise((resolve, reject) => {
    exec(command, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

/**
 * Prompt for token input
 */
function promptForToken(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(chalk.cyan('Paste your token: '), (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Verify token with API
 */
async function verifyToken(token: string): Promise<MeResponse | null> {
  try {
    const apiUrl = getApiUrl();
    const response = await fetch(`${apiUrl}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json() as MeResponse;
  } catch {
    return null;
  }
}

export async function setupCommand(): Promise<void> {
  console.log('');
  console.log(chalk.bold.cyan('🧠 Recall Setup'));
  console.log(chalk.dim('Team memory for AI coding assistants'));
  console.log('');

  let stepNum = 1;

  // Step 1: Authentication
  console.log(chalk.bold(`Step ${stepNum}: Authentication`));

  if (isAuthenticated()) {
    const config = readConfig();
    console.log(chalk.green(`  ✓ Already authenticated as ${config.name || config.email}`));
    if (config.team) {
      console.log(chalk.dim(`    Team: ${config.team.name}`));
    }
  } else {
    const apiUrl = getApiUrl();
    const authUrl = `${apiUrl}/auth/github?return_to=cli`;

    console.log('  Opening browser for GitHub authentication...');
    console.log('');

    try {
      await openBrowser(authUrl);
      console.log(chalk.dim(`  If the browser doesn't open, visit:`));
      console.log(chalk.cyan(`  ${authUrl}`));
    } catch {
      console.log(chalk.dim('  Could not open browser automatically.'));
      console.log(`  Please visit: ${chalk.cyan(authUrl)}`);
    }

    console.log('');
    console.log('  After authenticating, paste the token below:');
    console.log('');

    const token = await promptForToken();

    if (!token) {
      console.log(chalk.red('  ✗ No token provided'));
      process.exit(1);
    }

    console.log('');
    console.log('  Verifying...');

    const user = await verifyToken(token);

    if (!user) {
      console.log(chalk.red('  ✗ Invalid or expired token'));
      process.exit(1);
    }

    updateConfig({
      apiToken: token,
      userId: user.id,
      email: user.email,
      name: user.name || undefined,
      team: user.team ? {
        id: user.team.id,
        name: user.team.name,
        tier: user.team.tier,
        seats: user.team.seats,
      } : undefined,
    });

    console.log(chalk.green(`  ✓ Authenticated as ${user.name || user.email}`));
    if (user.team) {
      console.log(chalk.dim(`    Team: ${user.team.name} (${user.team.tier})`));
    }
  }

  console.log('');
  stepNum++;

  // Step 2: Initialize in repo (if in one)
  console.log(chalk.bold(`Step ${stepNum}: Repository Setup`));

  const repoRoot = findRepoRoot();

  if (!repoRoot) {
    console.log(chalk.yellow('  ⚠ Not in a git repository'));
    console.log(chalk.dim('    Run `recall init` from inside a git repo to set up project memory.'));
  } else if (isRecallInitialized(repoRoot)) {
    console.log(chalk.green('  ✓ Recall already initialized in this repo'));
  } else {
    initRecallDir(repoRoot);
    console.log(chalk.green('  ✓ Created .recall/ directory'));
    console.log(chalk.dim('    Team context will be stored here.'));
  }

  console.log('');
  stepNum++;

  // Step 3: Install hooks
  console.log(chalk.bold(`Step ${stepNum}: AI Tool Integration`));

  const detectedTool = detectAiTool();

  if (detectedTool) {
    console.log(chalk.dim(`  Detected: ${detectedTool}`));
  }

  if (isHookInstalled()) {
    console.log(chalk.green('  ✓ Hooks already installed'));
  } else {
    try {
      installHook();
      console.log(chalk.green('  ✓ Installed auto-save hooks'));
      console.log(chalk.dim('    Sessions will be captured automatically.'));
    } catch (error) {
      console.log(chalk.yellow('  ⚠ Could not install hooks automatically'));
      console.log(chalk.dim(`    Run 'recall hook install' manually if needed.`));
    }
  }

  // Done!
  console.log('');
  console.log(chalk.green.bold('✓ Setup complete!'));
  console.log('');
  console.log(chalk.dim('Your AI coding sessions will now be captured and shared with your team.'));
  console.log(chalk.dim('Use `recall save` to manually save, or let hooks do it automatically.'));
  console.log('');
}
