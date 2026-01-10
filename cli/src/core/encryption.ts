/**
 * Recall Encryption Module
 * AES-256-GCM encryption for team memory files
 *
 * Encrypted files have this format:
 * - First 12 bytes: IV (initialization vector)
 * - Next 16 bytes: Auth tag
 * - Remaining bytes: Encrypted content
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { readConfig, getApiUrl, isAuthenticated } from './config.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM recommended IV length
const AUTH_TAG_LENGTH = 16;

export interface TeamKey {
  hasAccess: boolean;
  key?: string;
  keyVersion?: number;
  teamId?: string;
  teamSlug?: string;
  error?: string;
  message?: string;
}

// Cache key in memory for session (not persisted)
let cachedKey: { key: Buffer; version: number; teamId: string } | null = null;

/**
 * Generate a unique machine ID based on hostname and MAC address
 */
function getMachineId(): string {
  const hostname = os.hostname();
  const networkInterfaces = os.networkInterfaces();

  // Get first non-internal MAC address
  let mac = '';
  for (const iface of Object.values(networkInterfaces)) {
    if (!iface) continue;
    for (const info of iface) {
      if (!info.internal && info.mac !== '00:00:00:00:00:00') {
        mac = info.mac;
        break;
      }
    }
    if (mac) break;
  }

  // Create a hash of hostname + MAC
  const data = `${hostname}:${mac}`;
  return crypto.createHash('sha256').update(data).digest('hex').slice(0, 32);
}

/**
 * Fetch encryption key from API
 * Requires valid authentication and team membership
 */
export async function fetchTeamKey(): Promise<TeamKey> {
  if (!isAuthenticated()) {
    return {
      hasAccess: false,
      error: 'Not authenticated',
      message: 'Run `recall auth` to authenticate.',
    };
  }

  const config = readConfig();
  const apiUrl = getApiUrl();
  const machineId = getMachineId();

  try {
    const response = await fetch(`${apiUrl}/keys/team`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ machineId }),
    });

    const data = await response.json() as TeamKey;

    if (!response.ok) {
      return {
        hasAccess: false,
        error: data.error || 'Failed to fetch key',
        message: data.message || 'Team memory not available.',
      };
    }

    // Cache the key for this session
    if (data.hasAccess && data.key) {
      cachedKey = {
        key: Buffer.from(data.key, 'base64'),
        version: data.keyVersion || 1,
        teamId: data.teamId || '',
      };
    }

    return data;
  } catch (error) {
    // Network error - cannot decrypt without key
    return {
      hasAccess: false,
      error: 'Network error',
      message: 'Cannot reach Recall servers. Check your connection.',
    };
  }
}

/**
 * Get cached key or fetch if needed
 */
export async function getEncryptionKey(): Promise<Buffer | null> {
  if (cachedKey) {
    return cachedKey.key;
  }

  const result = await fetchTeamKey();
  if (!result.hasAccess || !result.key) {
    return null;
  }

  return cachedKey?.key || null;
}

/**
 * Encrypt a string using AES-256-GCM
 * Returns base64-encoded encrypted data with IV and auth tag prepended
 */
export function encrypt(plaintext: string, key: Buffer): string {
  // Generate random IV
  const iv = crypto.randomBytes(IV_LENGTH);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Encrypt
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  // Get auth tag
  const authTag = cipher.getAuthTag();

  // Combine: IV + authTag + encrypted
  const combined = Buffer.concat([iv, authTag, encrypted]);

  return combined.toString('base64');
}

/**
 * Decrypt a base64-encoded encrypted string
 */
export function decrypt(encryptedBase64: string, key: Buffer): string {
  const combined = Buffer.from(encryptedBase64, 'base64');

  // Extract parts
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  // Decrypt
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Encrypt a file in place, appending .enc extension
 */
export async function encryptFile(
  filePath: string,
  key: Buffer,
  removeOriginal: boolean = true
): Promise<string> {
  const content = fs.readFileSync(filePath, 'utf8');
  const encrypted = encrypt(content, key);

  const encryptedPath = filePath + '.enc';
  fs.writeFileSync(encryptedPath, encrypted, { mode: 0o600 });

  if (removeOriginal) {
    fs.unlinkSync(filePath);
  }

  return encryptedPath;
}

/**
 * Decrypt a .enc file
 */
export async function decryptFile(
  encryptedPath: string,
  key: Buffer,
  outputPath?: string
): Promise<string> {
  if (!encryptedPath.endsWith('.enc')) {
    throw new Error('File must have .enc extension');
  }

  const encrypted = fs.readFileSync(encryptedPath, 'utf8');
  const decrypted = decrypt(encrypted, key);

  const targetPath = outputPath || encryptedPath.replace(/\.enc$/, '');
  fs.writeFileSync(targetPath, decrypted, { mode: 0o600 });

  return targetPath;
}

/**
 * Encrypt all memory files in .recall directory
 * context.md, history.md, and all files in sessions/
 */
export async function encryptMemoryFiles(recallDir: string): Promise<{
  success: boolean;
  encrypted: string[];
  error?: string;
}> {
  const key = await getEncryptionKey();
  if (!key) {
    return {
      success: false,
      encrypted: [],
      error: 'No encryption key available. Ensure you have a valid team subscription.',
    };
  }

  const encrypted: string[] = [];

  // Encrypt context.md and history.md
  const mainFiles = ['context.md', 'history.md'];
  for (const file of mainFiles) {
    const filePath = path.join(recallDir, file);
    if (fs.existsSync(filePath)) {
      const encPath = await encryptFile(filePath, key);
      encrypted.push(encPath);
    }
  }

  // Encrypt all session files in sessions/ folder
  const sessionsDir = path.join(recallDir, 'sessions');
  if (fs.existsSync(sessionsDir)) {
    const walkDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.name.endsWith('.md') && !entry.name.endsWith('.enc')) {
          encryptFile(fullPath, key).then(encPath => encrypted.push(encPath));
        }
      }
    };
    walkDir(sessionsDir);
  }

  return { success: true, encrypted };
}

/**
 * Decrypt memory files in .recall directory
 * Returns decrypted content for context.md and history.md
 */
export async function decryptMemoryFiles(recallDir: string): Promise<{
  success: boolean;
  files: {
    context?: string;
    history?: string;
  };
  error?: string;
}> {
  const key = await getEncryptionKey();
  if (!key) {
    return {
      success: false,
      files: {},
      error: 'No encryption key available. Contact your team admin for a Recall seat.',
    };
  }

  const files: { context?: string; history?: string } = {};

  const mainFiles: Array<{ name: 'context' | 'history'; file: string }> = [
    { name: 'context', file: 'context.md.enc' },
    { name: 'history', file: 'history.md.enc' },
  ];

  for (const { name, file } of mainFiles) {
    const filePath = path.join(recallDir, file);
    if (fs.existsSync(filePath)) {
      try {
        const encrypted = fs.readFileSync(filePath, 'utf8');
        files[name] = decrypt(encrypted, key);
      } catch (error) {
        console.error(`Failed to decrypt ${file}:`, error);
      }
    }
  }

  return { success: Object.keys(files).length > 0, files };
}

/**
 * Check if memory files are encrypted
 */
export function hasEncryptedMemoryFiles(recallDir: string): boolean {
  return fs.existsSync(path.join(recallDir, 'context.md.enc'));
}

/**
 * Check if user has encryption access (cached check)
 */
export async function hasEncryptionAccess(): Promise<boolean> {
  if (cachedKey) return true;
  const result = await fetchTeamKey();
  return result.hasAccess;
}

/**
 * Clear cached key (for logout)
 */
export function clearKeyCache(): void {
  cachedKey = null;
}
