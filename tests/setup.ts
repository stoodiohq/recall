/**
 * Global test setup for Recall test suite
 * Runs before all tests
 */

import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Create temp directories for test isolation
const TEST_TEMP_DIR = path.join(os.tmpdir(), 'recall-tests');
const TEST_HOME_DIR = path.join(TEST_TEMP_DIR, 'home');
const TEST_REPO_DIR = path.join(TEST_TEMP_DIR, 'repo');

beforeAll(async () => {
  // Create isolated directories
  fs.mkdirSync(TEST_HOME_DIR, { recursive: true });
  fs.mkdirSync(TEST_REPO_DIR, { recursive: true });
  fs.mkdirSync(path.join(TEST_REPO_DIR, '.git'), { recursive: true });

  // Set environment for isolation
  process.env.HOME = TEST_HOME_DIR;
  process.env.TEST_REPO_DIR = TEST_REPO_DIR;
  process.env.NODE_ENV = 'test';

  // Suppress console output during tests (can be overridden)
  if (!process.env.VERBOSE_TESTS) {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  }
});

afterEach(() => {
  // Clear all mocks between tests
  vi.clearAllMocks();

  // Note: Don't clean up shared directories here - each test cleans up its own context
  // via ctx.cleanup() in its afterEach
});

afterAll(async () => {
  // Restore console
  vi.restoreAllMocks();

  // Clean up temp directories - use try/catch to handle concurrent access
  try {
    if (fs.existsSync(TEST_TEMP_DIR)) {
      // Small delay to let other processes finish
      await new Promise((resolve) => setTimeout(resolve, 100));
      fs.rmSync(TEST_TEMP_DIR, { recursive: true, force: true });
    }
  } catch {
    // Ignore cleanup errors - OS will clean up /tmp eventually
  }
});

// Make test directories available globally
declare global {
  var TEST_HOME_DIR: string;
  var TEST_REPO_DIR: string;
  var TEST_TEMP_DIR: string;
}

globalThis.TEST_HOME_DIR = TEST_HOME_DIR;
globalThis.TEST_REPO_DIR = TEST_REPO_DIR;
globalThis.TEST_TEMP_DIR = TEST_TEMP_DIR;
