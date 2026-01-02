/**
 * Snapshot generator
 * Creates small.md, medium.md, large.md from events
 *
 * Local mode: Template-based summarization
 * Cloud mode: AI-powered summarization (future)
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
 * Generate small.md - Quick context (~500 tokens)
 * Focus: What does the AI need to know RIGHT NOW?
 */
export function generateSmallSnapshot(events: RecallEvent[]): string {
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
 * Generate medium.md - Session history (~4000 tokens)
 * Focus: What happened recently? Who did what?
 */
export function generateMediumSnapshot(events: RecallEvent[]): string {
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
 * Generate large.md - Full transcripts (~32000 tokens)
 * Focus: Complete history for deep context
 */
export function generateLargeSnapshot(events: RecallEvent[]): string {
  if (events.length === 0) {
    return `# Full History

_No sessions captured yet._
`;
  }

  const grouped = groupEventsByDate(events);

  let content = `# Full History

Total events: ${events.length}
Date range: ${events[0].ts.split('T')[0]} to ${events[events.length - 1].ts.split('T')[0]}

`;

  for (const group of grouped) {
    content += `## ${group.date}\n\n`;

    for (const event of group.events) {
      content += `### ${event.ts.split('T')[1].slice(0, 5)} - ${formatUser(event.user)} (${event.tool})\n\n`;
      content += `**Type:** ${event.type}\n\n`;
      content += `${event.summary}\n\n`;
      if (event.files?.length) {
        content += `**Files:** ${event.files.join(', ')}\n\n`;
      }
      content += `---\n\n`;
    }

    // Stop if too long
    if (estimateTokens(content) > 32000) {
      content += `\n_History truncated. ${events.length - grouped.indexOf(group) * 10} older events not shown._\n`;
      break;
    }
  }

  return content;
}

/**
 * Regenerate all snapshots from events
 */
export function regenerateSnapshots(events: RecallEvent[]): {
  small: string;
  medium: string;
  large: string;
} {
  return {
    small: generateSmallSnapshot(events),
    medium: generateMediumSnapshot(events),
    large: generateLargeSnapshot(events),
  };
}
