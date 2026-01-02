/**
 * Cursor session extractor
 *
 * Cursor stores sessions in SQLite:
 * ~/Library/Application Support/Cursor/User/workspaceStorage/[hash]/state.vscdb
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { Extractor, ExtractorResult, Tool } from '../core/types.js';

const CURSOR_DIR = join(
  homedir(),
  'Library',
  'Application Support',
  'Cursor',
  'User',
  'workspaceStorage'
);

export class CursorExtractor implements Extractor {
  readonly name: Tool = 'cursor';
  readonly priority = 2;

  async isInstalled(): Promise<boolean> {
    return existsSync(CURSOR_DIR);
  }

  async isActive(): Promise<boolean> {
    // Check if any workspace storage exists
    return existsSync(CURSOR_DIR);
  }

  async getSessionPath(repoPath: string): Promise<string | null> {
    // TODO: Find workspace by hashing repo path
    // Cursor uses MD5 hash of workspace URI
    return null;
  }

  async extractEvents(since: Date | null): Promise<ExtractorResult> {
    // TODO: Implement SQLite extraction
    // Need better-sqlite3 to read state.vscdb
    console.log('[cursor] Extractor not yet implemented');
    return { events: [] };
  }
}

export const cursorExtractor = new CursorExtractor();
