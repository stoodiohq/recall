/**
 * Recall CLI Configuration
 * Stores user configuration and authentication tokens
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface RecallConfig {
  apiToken?: string;
  apiUrl?: string;
  userId?: string;
  email?: string;
  name?: string;
  team?: {
    id: string;
    name: string;
    tier: string;
    seats: number;
  };
}

const CONFIG_DIR = path.join(os.homedir(), '.recall');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

/**
 * Get the config directory path
 */
export function getConfigDir(): string {
  return CONFIG_DIR;
}

/**
 * Ensure config directory exists
 */
export function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * Read the current configuration
 */
export function readConfig(): RecallConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch {
    // Return empty config on error
  }
  return {};
}

/**
 * Write configuration
 */
export function writeConfig(config: RecallConfig): void {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), {
    mode: 0o600,
  });
}

/**
 * Update configuration (merge with existing)
 */
export function updateConfig(updates: Partial<RecallConfig>): RecallConfig {
  const config = readConfig();
  const newConfig = { ...config, ...updates };
  writeConfig(newConfig);
  return newConfig;
}

/**
 * Clear authentication (logout)
 */
export function clearAuth(): void {
  const config = readConfig();
  delete config.apiToken;
  delete config.userId;
  delete config.email;
  delete config.name;
  delete config.team;
  writeConfig(config);
}

/**
 * Check if authenticated
 */
export function isAuthenticated(): boolean {
  const config = readConfig();
  return !!config.apiToken;
}

/**
 * Get API URL (defaults to production)
 */
export function getApiUrl(): string {
  const config = readConfig();
  return config.apiUrl || 'https://recall-api.stoodiohq.workers.dev';
}

/**
 * Set API URL (for development)
 */
export function setApiUrl(url: string): void {
  updateConfig({ apiUrl: url });
}
