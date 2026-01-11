/**
 * Test helpers for Recall tests
 * Common utilities and setup functions
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { vi } from 'vitest';

// ============================================================================
// Test Context
// ============================================================================

export interface TestContext {
  repoDir: string;
  homeDir: string;
  recallDir: string;
  configPath: string;
  cleanup: () => Promise<void>;
}

/**
 * Create an isolated test context with temp directories
 */
export async function createTestContext(): Promise<TestContext> {
  const testId = crypto.randomUUID().slice(0, 8);
  // Use os.tmpdir() directly to avoid shared directory race conditions
  const baseDir = path.join(os.tmpdir(), `recall-test-${testId}`);
  const repoDir = path.join(baseDir, 'repo');
  const homeDir = path.join(baseDir, 'home');
  const recallDir = path.join(repoDir, '.recall');
  const configPath = path.join(homeDir, '.recall', 'config.json');

  // Create all directories atomically
  fs.mkdirSync(baseDir, { recursive: true });
  fs.mkdirSync(path.join(repoDir, '.git'), { recursive: true });
  fs.mkdirSync(path.join(homeDir, '.recall'), { recursive: true });
  fs.mkdirSync(recallDir, { recursive: true });

  return {
    repoDir,
    homeDir,
    recallDir,
    configPath,
    cleanup: async () => {
      try {
        if (fs.existsSync(baseDir)) {
          fs.rmSync(baseDir, { recursive: true, force: true });
        }
      } catch {
        // Ignore cleanup errors
      }
    },
  };
}

// ============================================================================
// File Helpers
// ============================================================================

/**
 * Write a file with automatic directory creation
 */
export function writeTestFile(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content);
}

/**
 * Read a file, returning undefined if it doesn't exist
 */
export function readTestFile(filePath: string): string | undefined {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Create a .recall directory with standard structure
 */
export function initRecallDir(repoDir: string, options: {
  context?: string;
  history?: string;
  sessions?: Array<{ name: string; content: string }>;
} = {}): string {
  const recallDir = path.join(repoDir, '.recall');
  const sessionsDir = path.join(recallDir, 'sessions');

  fs.mkdirSync(sessionsDir, { recursive: true });

  // Write context.md
  const contextContent = options.context || `# Team Context

## Current Work
Testing the Recall system.

## Tech Stack
- TypeScript
- Node.js
`;
  fs.writeFileSync(path.join(recallDir, 'context.md'), contextContent);

  // Write history.md
  const historyContent = options.history || `# Team History

## Session Log
Initial test setup.
`;
  fs.writeFileSync(path.join(recallDir, 'history.md'), historyContent);

  // Write session files
  for (const session of options.sessions || []) {
    fs.writeFileSync(path.join(sessionsDir, session.name), session.content);
  }

  return recallDir;
}

// ============================================================================
// Config Helpers
// ============================================================================

interface TestConfig {
  apiToken?: string;
  apiUrl?: string;
  userId?: string;
  teamId?: string;
}

/**
 * Write test configuration
 */
export function writeTestConfig(homeDir: string, config: TestConfig): void {
  const configDir = path.join(homeDir, '.recall');
  const configPath = path.join(configDir, 'config.json');

  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  // Set restrictive permissions (chmod bypasses umask)
  // Only chmod if files exist to avoid race conditions
  if (process.platform !== 'win32') {
    if (fs.existsSync(configDir)) {
      fs.chmodSync(configDir, 0o700);
    }
    if (fs.existsSync(configPath)) {
      fs.chmodSync(configPath, 0o600);
    }
  }
}

/**
 * Read test configuration
 */
export function readTestConfig(homeDir: string): TestConfig | null {
  const configPath = path.join(homeDir, '.recall', 'config.json');
  if (!fs.existsSync(configPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

// ============================================================================
// Encryption Helpers
// ============================================================================

/**
 * Generate a valid 32-byte encryption key
 */
export function generateTestKey(): Buffer {
  return crypto.randomBytes(32);
}

/**
 * Encrypt content using AES-256-GCM (matches production format)
 */
export function encryptContent(plaintext: string, key: Buffer): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  return `RECALL_ENCRYPTED:v1:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt content
 */
export function decryptContent(encrypted: string, key: Buffer): string {
  const parts = encrypted.split(':');
  if (parts.length !== 5 || parts[0] !== 'RECALL_ENCRYPTED') {
    throw new Error('Invalid encrypted format');
  }

  const iv = Buffer.from(parts[2], 'base64');
  const authTag = Buffer.from(parts[3], 'base64');
  const ciphertext = parts[4];

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// ============================================================================
// Wait Helpers
// ============================================================================

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await sleep(interval);
  }
  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Mock Helpers
// ============================================================================

/**
 * Create a spy that tracks calls but doesn't modify behavior
 */
export function createSpy<T extends (...args: unknown[]) => unknown>(
  fn: T
): T & { calls: Parameters<T>[] } {
  const calls: Parameters<T>[] = [];
  const spy = ((...args: Parameters<T>) => {
    calls.push(args);
    return fn(...args);
  }) as T & { calls: Parameters<T>[] };
  spy.calls = calls;
  return spy;
}

/**
 * Mock process.env for a test
 */
export function mockEnv(overrides: Record<string, string>): () => void {
  const original: Record<string, string | undefined> = {};

  for (const key of Object.keys(overrides)) {
    original[key] = process.env[key];
    process.env[key] = overrides[key];
  }

  return () => {
    for (const key of Object.keys(overrides)) {
      if (original[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original[key];
      }
    }
  };
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert that a file exists
 */
export function assertFileExists(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Expected file to exist: ${filePath}`);
  }
}

/**
 * Assert that a file contains specific content
 */
export function assertFileContains(filePath: string, content: string): void {
  assertFileExists(filePath);
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  if (!fileContent.includes(content)) {
    throw new Error(`Expected file ${filePath} to contain: ${content}`);
  }
}

/**
 * Assert that encrypted file can be decrypted
 */
export function assertValidEncryption(encrypted: string, key: Buffer): void {
  try {
    decryptContent(encrypted, key);
  } catch (error) {
    throw new Error(`Invalid encryption: ${error}`);
  }
}

// ============================================================================
// API Test Helpers
// ============================================================================

/**
 * Create authorization header
 */
export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Create a mock request object
 */
export function createMockRequest(options: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: object;
}): Request {
  const { method = 'GET', url = 'http://localhost/', headers = {}, body } = options;

  return new Request(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ============================================================================
// Snapshot Helpers
// ============================================================================

/**
 * Normalize dynamic values for snapshot testing
 */
export function normalizeForSnapshot(obj: object): object {
  return JSON.parse(
    JSON.stringify(obj, (key, value) => {
      // Replace UUIDs
      if (typeof value === 'string' && /^[0-9a-f-]{36}$/.test(value)) {
        return '[UUID]';
      }
      // Replace timestamps
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
        return '[TIMESTAMP]';
      }
      // Replace tokens
      if (typeof value === 'string' && value.startsWith('recall_')) {
        return '[TOKEN]';
      }
      return value;
    })
  );
}
