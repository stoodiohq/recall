/**
 * Claude Code session extractor
 *
 * Claude Code stores sessions in:
 * ~/.claude/projects/[dash-separated-path]/
 *
 * Session files are JSONL with conversation turns.
 * Each line is a JSON object with a "type" field.
 * Types: "user", "assistant", "summary", "file-history-snapshot", etc.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { ulid } from 'ulid';
import { Extractor, ExtractorResult, RecallEvent, Tool } from '../core/types.js';
import { getGitUser } from '../utils/git.js';

const CLAUDE_DIR = join(homedir(), '.claude');
const PROJECTS_DIR = join(CLAUDE_DIR, 'projects');

// Claude Code JSONL line types
type ClaudeLineType =
  | 'user'
  | 'assistant'
  | 'summary'
  | 'file-history-snapshot'
  | 'message'
  | 'tool_use'
  | 'tool_result';

interface ClaudeLine {
  type: ClaudeLineType;
  uuid?: string;
  timestamp?: string;
  sessionId?: string;
  cwd?: string;
  message?: {
    role?: string;
    content?: string | ContentBlock[];
  };
  summary?: string;
}

interface ContentBlock {
  type: string;
  text?: string;
  thinking?: string;
}

function encodePathForClaude(repoPath: string): string {
  // Claude Code uses dash-separated paths: /Users/ray -> -Users-ray
  return repoPath.replace(/\//g, '-');
}

function getTextContent(content: string | ContentBlock[] | undefined): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  return content
    .filter(c => c.type === 'text' && c.text)
    .map(c => c.text!)
    .join('\n');
}

function extractFilesFromContent(content: string): string[] {
  const files: Set<string> = new Set();

  // Match file paths in code blocks, Read tool calls, Edit tool calls
  const patterns = [
    /(?:Read|Edit|Write|file_path)[:\s]+["']?([\/\w.-]+\.\w+)["']?/gi,
    /```[\w]*\s*(?:\/\/|#)\s*([\/\w.-]+\.\w+)/gm,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const file = match[1];
      if (file && !file.includes(' ') && file.length < 200) {
        files.add(file);
      }
    }
  }

  return Array.from(files).slice(0, 10); // Max 10 files per event
}

function summarizeSession(lines: ClaudeLine[]): string {
  // First, check for summary lines
  const summaryLine = lines.find(l => l.type === 'summary' && l.summary);
  if (summaryLine?.summary) {
    return summaryLine.summary;
  }

  // Otherwise, find the first user message
  const firstUser = lines.find(l => l.type === 'user' && l.message?.content);
  if (!firstUser) return 'Empty session';

  const task = getTextContent(firstUser.message?.content);

  // Truncate to reasonable summary length
  const maxLength = 200;
  if (task.length <= maxLength) return task;

  // Try to find a good break point
  const truncated = task.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 100 ? truncated.slice(0, lastSpace) : truncated) + '...';
}

function detectEventType(lines: ClaudeLine[]): 'session' | 'decision' | 'error_resolved' {
  const fullText = lines
    .map(l => {
      if (l.summary) return l.summary;
      if (l.message?.content) return getTextContent(l.message.content);
      return '';
    })
    .join(' ')
    .toLowerCase();

  // Check for decision indicators
  if (
    fullText.includes('decided to') ||
    fullText.includes('choosing') ||
    fullText.includes('went with') ||
    fullText.includes('architecture') ||
    fullText.includes('instead of')
  ) {
    return 'decision';
  }

  // Check for error resolution
  if (
    (fullText.includes('error') || fullText.includes('bug') || fullText.includes('fix')) &&
    (fullText.includes('fixed') || fullText.includes('resolved') || fullText.includes('working'))
  ) {
    return 'error_resolved';
  }

  return 'session';
}

export class ClaudeCodeExtractor implements Extractor {
  readonly name: Tool = 'claude-code';
  readonly priority = 1;

  async isInstalled(): Promise<boolean> {
    return existsSync(CLAUDE_DIR);
  }

  async isActive(): Promise<boolean> {
    return existsSync(PROJECTS_DIR);
  }

  async getSessionPath(repoPath: string): Promise<string | null> {
    const encoded = encodePathForClaude(repoPath);
    const projectDir = join(PROJECTS_DIR, encoded);

    if (existsSync(projectDir)) {
      return projectDir;
    }

    // Try to find by scanning projects (fallback for partial matches)
    if (!existsSync(PROJECTS_DIR)) return null;

    // Try with the home directory expanded in the path
    const homeDir = homedir();
    const withHome = repoPath.startsWith(homeDir)
      ? repoPath
      : join(homeDir, repoPath);
    const encodedWithHome = encodePathForClaude(withHome);
    const projectDirWithHome = join(PROJECTS_DIR, encodedWithHome);

    if (existsSync(projectDirWithHome)) {
      return projectDirWithHome;
    }

    return null;
  }

  async extractEvents(since: Date | null): Promise<ExtractorResult> {
    const events: RecallEvent[] = [];
    const user = await getGitUser();

    if (!existsSync(PROJECTS_DIR)) {
      return { events };
    }

    // Scan all project directories
    for (const projectDir of readdirSync(PROJECTS_DIR)) {
      const projectPath = join(PROJECTS_DIR, projectDir);
      if (!statSync(projectPath).isDirectory()) continue;

      // Find session files (JSONL files)
      let files;
      try {
        files = readdirSync(projectPath)
          .filter(f => f.endsWith('.jsonl'))
          .map(f => ({
            name: f,
            path: join(projectPath, f),
            mtime: statSync(join(projectPath, f)).mtime,
          }))
          .filter(f => !since || f.mtime > since)
          .sort((a, b) => a.mtime.getTime() - b.mtime.getTime());
      } catch {
        continue; // Skip if can't read directory
      }

      for (const file of files) {
        try {
          const content = readFileSync(file.path, 'utf-8');
          const lines: ClaudeLine[] = content
            .split('\n')
            .filter(line => line.trim())
            .map(line => {
              try {
                return JSON.parse(line) as ClaudeLine;
              } catch {
                return null;
              }
            })
            .filter((l): l is ClaudeLine => l !== null);

          // Need at least one user and one assistant message for a real session
          const hasUser = lines.some(l => l.type === 'user');
          const hasAssistant = lines.some(l => l.type === 'assistant');
          if (!hasUser || !hasAssistant) continue;

          // Extract all text content for file detection
          const allText = lines
            .map(l => {
              if (l.message?.content) return getTextContent(l.message.content);
              return '';
            })
            .join('\n');

          const extractedFiles = extractFilesFromContent(allText);

          // Get timestamp from first line or file mtime
          const firstLine = lines[0];
          const timestamp = firstLine?.timestamp || file.mtime.toISOString();

          events.push({
            id: ulid(),
            ts: timestamp,
            type: detectEventType(lines),
            tool: 'claude-code',
            user,
            summary: summarizeSession(lines),
            files: extractedFiles.length > 0 ? extractedFiles : undefined,
          });
        } catch {
          // Skip malformed files
        }
      }
    }

    return {
      events,
      lastProcessed: events.length > 0
        ? events[events.length - 1].ts
        : undefined,
    };
  }
}

export const claudeCodeExtractor = new ClaudeCodeExtractor();
