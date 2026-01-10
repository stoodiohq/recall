/**
 * Storage layer for .recall/ directory
 * v2: context.md, history.md, sessions/
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { RECALL_DIR, FILES } from './types.js';

export function findRepoRoot(startPath: string = process.cwd()): string | null {
  let current = startPath;
  while (current !== '/') {
    if (existsSync(join(current, '.git'))) {
      return current;
    }
    current = dirname(current);
  }
  return null;
}

export function getRecallPath(repoRoot: string): string {
  return join(repoRoot, RECALL_DIR);
}

// Alias for backwards compatibility
export const getRecallDir = getRecallPath;

export function isRecallInitialized(repoRoot: string): boolean {
  const recallPath = getRecallPath(repoRoot);
  // v2: Check for context.md as initialization marker
  return existsSync(join(recallPath, FILES.context));
}

export function initRecallDir(repoRoot: string): void {
  const recallPath = getRecallPath(repoRoot);

  // Create directory structure
  mkdirSync(join(recallPath, FILES.sessions), { recursive: true });

  // Create initial context.md (team brain)
  const contextContent = `# Team Context

_No sessions captured yet. Run \`recall save\` after your first AI coding session._
`;
  writeFileSync(join(recallPath, FILES.context), contextContent);

  // Create initial history.md (encyclopedia)
  const historyContent = `# Team History

_No sessions captured yet. This will contain decision logs, failure logs, and prompt patterns._
`;
  writeFileSync(join(recallPath, FILES.history), historyContent);

  // Create .gitattributes for merge strategy
  const gitattributes = `# Recall merge strategy
context.md merge=ours
history.md merge=ours
sessions/**/*.md merge=ours
`;
  writeFileSync(join(recallPath, '.gitattributes'), gitattributes);
}

export function writeSnapshot(
  repoRoot: string,
  type: 'context' | 'history',
  content: string
): void {
  const filePath = join(getRecallPath(repoRoot), FILES[type]);
  writeFileSync(filePath, content);
}

export function readSnapshot(
  repoRoot: string,
  type: 'context' | 'history'
): string {
  const filePath = join(getRecallPath(repoRoot), FILES[type]);
  if (!existsSync(filePath)) return '';
  return readFileSync(filePath, 'utf-8');
}

export function writeSessionFile(
  repoRoot: string,
  sessionPath: string,
  content: string
): void {
  const fullPath = join(getRecallPath(repoRoot), sessionPath);
  const dir = dirname(fullPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(fullPath, content);
}

// DEPRECATED: v1 event-based functions - CLI needs rewrite for v2
// These stubs exist only to allow compilation

import type { RecallEvent } from './types.js';

/** @deprecated v1 function - CLI needs v2 rewrite */
export function readEvents(_repoRoot: string): RecallEvent[] {
  console.warn('[Recall CLI] readEvents is deprecated in v2. CLI needs rewrite.');
  return [];
}

/** @deprecated v1 function - CLI needs v2 rewrite */
export function appendEvents(_repoRoot: string, _events: RecallEvent[]): void {
  console.warn('[Recall CLI] appendEvents is deprecated in v2. CLI needs rewrite.');
}

/** @deprecated v1 function - CLI needs v2 rewrite */
export function getLastEventTimestamp(_repoRoot: string): Date | null {
  console.warn('[Recall CLI] getLastEventTimestamp is deprecated in v2. CLI needs rewrite.');
  return null;
}

/** @deprecated v1 function - CLI needs v2 rewrite */
export function readManifest(_repoRoot: string): null {
  console.warn('[Recall CLI] readManifest is deprecated in v2. CLI needs rewrite.');
  return null;
}
