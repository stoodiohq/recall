/**
 * Extractor registry
 * Manages all platform-specific session extractors
 */

import { Extractor, ExtractorResult, RecallEvent } from '../core/types.js';
import { claudeCodeExtractor } from './claude-code.js';
import { cursorExtractor } from './cursor.js';
import { codexExtractor } from './codex.js';
import { geminiExtractor } from './gemini.js';

// All available extractors, sorted by priority
const extractors: Extractor[] = [
  claudeCodeExtractor,
  cursorExtractor,
  codexExtractor,
  geminiExtractor,
].sort((a, b) => a.priority - b.priority);

export async function getInstalledExtractors(): Promise<Extractor[]> {
  const installed: Extractor[] = [];
  for (const extractor of extractors) {
    if (await extractor.isInstalled()) {
      installed.push(extractor);
    }
  }
  return installed;
}

export async function getActiveExtractors(): Promise<Extractor[]> {
  const active: Extractor[] = [];
  for (const extractor of extractors) {
    if (await extractor.isActive()) {
      active.push(extractor);
    }
  }
  return active;
}

export async function extractAllEvents(
  since: Date | null = null
): Promise<RecallEvent[]> {
  const allEvents: RecallEvent[] = [];
  const active = await getActiveExtractors();

  for (const extractor of active) {
    try {
      const result = await extractor.extractEvents(since);
      allEvents.push(...result.events);
    } catch (error) {
      console.error(`[${extractor.name}] Extraction failed:`, error);
    }
  }

  // Sort by timestamp
  return allEvents.sort((a, b) =>
    new Date(a.ts).getTime() - new Date(b.ts).getTime()
  );
}

export { claudeCodeExtractor, cursorExtractor, codexExtractor, geminiExtractor };
