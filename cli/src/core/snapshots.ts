/**
 * Snapshot generator
 * Creates context.md, history.md from events
 *
 * context.md - Team brain, loads every session (~1.5-3K tokens)
 * history.md - Encyclopedia for onboarding and learning (~30K+ tokens)
 * sessions/ - Individual session records (~1.5K each)
 *
 * Local mode: Template-based summarization
 * Cloud mode: AI-powered summarization (Phase 3)
 */

import { RecallEvent } from './types.js';

interface GroupedEvents {
  date: string;
  events: RecallEvent[];
}

function groupEventsByDate(events: RecallEvent[]): GroupedEvents[] {
  const groups = new Map<string, RecallEvent[]>();

  for (const event of events) {
    const date = event.ts.split('T')[0];
    if (!groups.has(date)) {
      groups.set(date, []);
    }
    groups.get(date)!.push(event);
  }

  return Array.from(groups.entries())
    .map(([date, events]) => ({ date, events }))
    .sort((a, b) => b.date.localeCompare(a.date)); // Most recent first
}

function formatUser(email: string): string {
  const name = email.split('@')[0];
  return `@${name}`;
}

function estimateTokens(text: string): number {
  // Rough estimate: ~4 chars per token
  return Math.ceil(text.length / 4);
}

/**
 * Generate context.md - Team brain (~1.5-3K tokens)
 * Focus: What does the AI need to know RIGHT NOW?
 */
export function generateContextSnapshot(events: RecallEvent[]): string {
  if (events.length === 0) {
    return `# Team Context

_No sessions captured yet._
`;
  }

  const recentEvents = events.slice(-20); // Last 20 events
  const grouped = groupEventsByDate(recentEvents);
  const lastUpdated = events[events.length - 1].ts.split('T')[0];

  // Extract key decisions and failures
  const decisions = recentEvents.filter(e => e.type === 'decision');
  const errors = recentEvents.filter(e => e.type === 'error_resolved');
  const sessions = recentEvents.filter(e => e.type === 'session');

  let content = `# Team Context

Last updated: ${lastUpdated}

`;

  // Recent focus
  if (sessions.length > 0) {
    const recentSession = sessions[sessions.length - 1];
    content += `## Current Focus
${recentSession.summary}

`;
  }

  // Key decisions
  if (decisions.length > 0) {
    content += `## Key Decisions
`;
    for (const decision of decisions.slice(-5)) {
      content += `- ${decision.summary} (${formatUser(decision.user)}, ${decision.ts.split('T')[0]})\n`;
    }
    content += '\n';
  }

  // Avoid these (resolved errors = things that didn't work)
  if (errors.length > 0) {
    content += `## Avoid These
`;
    for (const error of errors.slice(-3)) {
      content += `- ${error.summary}\n`;
    }
    content += '\n';
  }

  // Trim if too long
  while (estimateTokens(content) > 500 && content.includes('\n-')) {
    const lines = content.split('\n');
    // Remove oldest bullet point
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].startsWith('- ')) {
        lines.splice(i, 1);
        break;
      }
    }
    content = lines.join('\n');
  }

  return content;
}

/**
 * Generate history.md - Encyclopedia (~30K+ tokens)
 * Focus: Full history for onboarding and deep learning
 */
export function generateHistorySnapshot(events: RecallEvent[]): string {
  if (events.length === 0) {
    return `# Session History

_No sessions captured yet._
`;
  }

  const grouped = groupEventsByDate(events.slice(-100)); // Last 100 events

  let content = `# Session History

`;

  for (const group of grouped.slice(0, 14)) { // Last 2 weeks
    content += `## ${group.date}\n\n`;

    for (const event of group.events) {
      const icon = event.type === 'decision' ? '[decision]'
                 : event.type === 'error_resolved' ? '[fix]'
                 : '';
      const files = event.files?.length ? ` (${event.files.join(', ')})` : '';
      content += `- ${formatUser(event.user)} (${event.tool}): ${event.summary}${files} ${icon}\n`;
    }
    content += '\n';

    // Stop if too long
    if (estimateTokens(content) > 4000) break;
  }

  return content;
}

/**
 * Generate a single session file content
 * Format: sessions/YYYY-MM/username/DD-HHMM.md
 */
export function generateSessionFile(event: RecallEvent): string {
  const date = new Date(event.ts);
  const dateStr = date.toISOString().split('T')[0];

  let content = `# Session ${dateStr} (${formatUser(event.user)})

## Summary
${event.summary}

## Type
${event.type}
`;

  if (event.files?.length) {
    content += `
## Files Changed
${event.files.map(f => `- ${f}`).join('\n')}
`;
  }

  content += `
---
_Tool: ${event.tool}_
`;

  return content;
}

/**
 * Get the session file path for an event
 * Format: sessions/YYYY-MM/username/DD-HHMM.md
 */
export function getSessionFilePath(event: RecallEvent): string {
  const date = new Date(event.ts);
  const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  const username = event.user.split('@')[0];
  const day = String(date.getDate()).padStart(2, '0');
  const time = `${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`;

  return `sessions/${yearMonth}/${username}/${day}-${time}.md`;
}

/**
 * Regenerate all snapshots from events
 */
export function regenerateSnapshots(events: RecallEvent[]): {
  context: string;
  history: string;
  sessionFiles: Map<string, string>; // path -> content
} {
  const sessionFiles = new Map<string, string>();

  for (const event of events) {
    const filePath = getSessionFilePath(event);
    const content = generateSessionFile(event);
    sessionFiles.set(filePath, content);
  }

  return {
    context: generateContextSnapshot(events),
    history: generateHistorySnapshot(events),
    sessionFiles,
  };
}
