/**
 * Storage layer for .recall/ directory
 * Handles events (JSONL) and snapshots (Markdown)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import {
  RecallEvent,
  Manifest,
  RECALL_DIR,
  EVENTS_FILE,
  MANIFEST_FILE,
  FILES
} from './types.js';

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
  return existsSync(join(recallPath, MANIFEST_FILE));
}

export function initRecallDir(repoRoot: string): void {
  const recallPath = getRecallPath(repoRoot);

  // Create directory structure
  mkdirSync(join(recallPath, 'events'), { recursive: true });
  mkdirSync(join(recallPath, FILES.sessions), { recursive: true });

  // Create manifest
  const manifest: Manifest = {
    version: 1,
    created: new Date().toISOString(),
  };
  writeFileSync(
    join(recallPath, MANIFEST_FILE),
    JSON.stringify(manifest, null, 2)
  );

  // Create empty events file
  writeFileSync(join(recallPath, EVENTS_FILE), '');

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
events/events.jsonl merge=union
context.md merge=ours
history.md merge=ours
sessions/**/*.md merge=ours
manifest.json merge=ours
`;
  writeFileSync(join(recallPath, '.gitattributes'), gitattributes);
}

export function readEvents(repoRoot: string): RecallEvent[] {
  const eventsPath = join(getRecallPath(repoRoot), EVENTS_FILE);
  if (!existsSync(eventsPath)) return [];

  const content = readFileSync(eventsPath, 'utf-8');
  return content
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line) as RecallEvent);
}

export function appendEvents(repoRoot: string, events: RecallEvent[]): void {
  const eventsPath = join(getRecallPath(repoRoot), EVENTS_FILE);
  const lines = events.map(e => JSON.stringify(e)).join('\n');
  appendFileSync(eventsPath, lines + '\n');
}

export function getLastEventTimestamp(repoRoot: string): Date | null {
  const events = readEvents(repoRoot);
  if (events.length === 0) return null;
  return new Date(events[events.length - 1].ts);
}

export function readManifest(repoRoot: string): Manifest | null {
  const manifestPath = join(getRecallPath(repoRoot), MANIFEST_FILE);
  if (!existsSync(manifestPath)) return null;
  return JSON.parse(readFileSync(manifestPath, 'utf-8'));
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
