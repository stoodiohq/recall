/**
 * Gemini CLI session extractor
 *
 * Gemini CLI stores sessions in:
 * ~/.gemini/tmp/[project_hash]/chats/
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { ulid } from 'ulid';
import { Extractor, ExtractorResult, RecallEvent, Tool } from '../core/types.js';
import { getGitUser } from '../utils/git.js';

const GEMINI_DIR = join(homedir(), '.gemini');
const TMP_DIR = join(GEMINI_DIR, 'tmp');

export class GeminiExtractor implements Extractor {
  readonly name: Tool = 'gemini';
  readonly priority = 4;

  async isInstalled(): Promise<boolean> {
    return existsSync(GEMINI_DIR);
  }

  async isActive(): Promise<boolean> {
    return existsSync(TMP_DIR);
  }

  async getSessionPath(_repoPath: string): Promise<string | null> {
    return existsSync(TMP_DIR) ? TMP_DIR : null;
  }

  async extractEvents(since: Date | null): Promise<ExtractorResult> {
    const events: RecallEvent[] = [];
    const user = await getGitUser();

    if (!existsSync(TMP_DIR)) {
      return { events };
    }

    // Walk through project directories
    const projects = readdirSync(TMP_DIR).filter(f =>
      statSync(join(TMP_DIR, f)).isDirectory()
    );

    for (const project of projects) {
      const chatsDir = join(TMP_DIR, project, 'chats');
      if (!existsSync(chatsDir)) continue;

      const chatFiles = readdirSync(chatsDir)
        .filter(f => f.endsWith('.json'))
        .map(f => ({
          name: f,
          path: join(chatsDir, f),
          mtime: statSync(join(chatsDir, f)).mtime,
        }))
        .filter(f => !since || f.mtime > since);

      for (const file of chatFiles) {
        try {
          const content = JSON.parse(readFileSync(file.path, 'utf-8'));

          // Extract summary from conversation
          const messages = content.messages || content.conversation || [];
          const firstUserMessage = messages.find((m: { role?: string }) =>
            m.role === 'user'
          );

          const summary = firstUserMessage?.content?.slice(0, 200) || 'Gemini session';

          events.push({
            id: ulid(),
            ts: file.mtime.toISOString(),
            type: 'session',
            tool: 'gemini',
            user,
            summary,
          });
        } catch {
          // Skip malformed files
        }
      }
    }

    return { events };
  }
}

export const geminiExtractor = new GeminiExtractor();
