/**
 * Auth Command
 * Authenticate with GitHub to get an API token
 */

import chalk from 'chalk';
import * as readline from 'readline';
import { readConfig, updateConfig, clearAuth, getApiUrl, isAuthenticated } from '../core/config.js';

interface AuthOptions {
  token?: string;
  logout?: boolean;
  status?: boolean;
}

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

/**
 * Show auth status
 */
function showStatus(): void {
  const config = readConfig();

  if (!config.apiToken) {
    console.log(chalk.yellow('Not authenticated'));
    console.log('');
    console.log(`Run ${chalk.cyan('recall auth')} to authenticate with GitHub`);
    return;
  }

  console.log(chalk.green('Authenticated'));
  console.log('');
  if (config.name) {
    console.log(`  Name: ${config.name}`);
  }
  if (config.email) {
    console.log(`  Email: ${config.email}`);
  }
  if (config.team) {
    console.log(`  Team: ${config.team.name} (${config.team.tier})`);
  } else {
    console.log(`  Team: ${chalk.dim('No team')}`);
  }
}

export async function authCommand(options: AuthOptions): Promise<void> {
  // Handle --status
  if (options.status) {
    showStatus();
    return;
  }

  // Handle --logout
  if (options.logout) {
    clearAuth();
    console.log(chalk.green('Logged out successfully'));
    return;
  }

  // Handle --token <token> (direct token set)
  if (options.token) {
    console.log('Verifying token...');
    const user = await verifyToken(options.token);

    if (!user) {
      console.log(chalk.red('Invalid or expired token'));
      process.exit(1);
    }

    updateConfig({
      apiToken: options.token,
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

    console.log(chalk.green(`Authenticated as ${user.name || user.email}`));
    if (user.team) {
      console.log(`Team: ${user.team.name} (${user.team.tier})`);
    }
    return;
  }

  // Check if already authenticated
  if (isAuthenticated()) {
    const config = readConfig();
    console.log(chalk.yellow(`Already authenticated as ${config.name || config.email}`));
    console.log('');
    console.log(`Use ${chalk.cyan('recall auth --logout')} to log out first`);
    console.log(`Use ${chalk.cyan('recall auth --status')} to see details`);
    return;
  }

  // Start OAuth flow
  const apiUrl = getApiUrl();
  const authUrl = `${apiUrl}/auth/github?return_to=cli`;

  console.log(chalk.bold('Recall Authentication'));
  console.log('');
  console.log('Opening browser for GitHub authentication...');
  console.log('');

  try {
    await openBrowser(authUrl);
    console.log(chalk.dim(`If the browser doesn't open, visit:`));
    console.log(chalk.cyan(authUrl));
    console.log('');
  } catch {
    console.log('Could not open browser automatically.');
    console.log(`Please visit: ${chalk.cyan(authUrl)}`);
    console.log('');
  }

  console.log('After authenticating, paste the token below:');
  console.log('');

  const token = await promptForToken();

  if (!token) {
    console.log(chalk.red('No token provided'));
    process.exit(1);
  }

  console.log('');
  console.log('Verifying token...');

  const user = await verifyToken(token);

  if (!user) {
    console.log(chalk.red('Invalid or expired token'));
    console.log('');
    console.log(`Try again with ${chalk.cyan('recall auth')}`);
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

  console.log('');
  console.log(chalk.green(`Authenticated as ${user.name || user.email}`));

  if (user.team) {
    console.log(`Team: ${user.team.name} (${user.team.tier})`);
  } else {
    console.log('');
    console.log(chalk.yellow('No active subscription'));
    console.log(`Visit ${chalk.cyan('https://recall.team/pricing')} to subscribe`);
  }
}
