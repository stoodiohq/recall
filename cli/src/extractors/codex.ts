/**
 * OpenAI Codex CLI session extractor
 *
 * Codex stores sessions in:
 * ~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { ulid } from 'ulid';
import { Extractor, ExtractorResult, RecallEvent, Tool } from '../core/types.js';
import { getGitUser } from '../utils/git.js';

const CODEX_DIR = join(homedir(), '.codex');
const SESSIONS_DIR = join(CODEX_DIR, 'sessions');

export class CodexExtractor implements Extractor {
  readonly name: Tool = 'codex';
  readonly priority = 3;

  async isInstalled(): Promise<boolean> {
    return existsSync(CODEX_DIR);
  }

  async isActive(): Promise<boolean> {
    return existsSync(SESSIONS_DIR);
  }

  async getSessionPath(_repoPath: string): Promise<string | null> {
    return existsSync(SESSIONS_DIR) ? SESSIONS_DIR : null;
  }

  async extractEvents(since: Date | null): Promise<ExtractorResult> {
    const events: RecallEvent[] = [];
    const user = await getGitUser();

    if (!existsSync(SESSIONS_DIR)) {
      return { events };
    }

    // Walk through date-based directory structure
    const years = readdirSync(SESSIONS_DIR).filter(f =>
      /^\d{4}$/.test(f) && statSync(join(SESSIONS_DIR, f)).isDirectory()
    );

    for (const year of years) {
      const yearDir = join(SESSIONS_DIR, year);
      const months = readdirSync(yearDir).filter(f =>
        /^\d{2}$/.test(f) && statSync(join(yearDir, f)).isDirectory()
      );

      for (const month of months) {
        const monthDir = join(yearDir, month);
        const days = readdirSync(monthDir).filter(f =>
          /^\d{2}$/.test(f) && statSync(join(monthDir, f)).isDirectory()
        );

        for (const day of days) {
          const dayDir = join(monthDir, day);
          const files = readdirSync(dayDir)
            .filter(f => f.startsWith('rollout-') && f.endsWith('.jsonl'))
            .map(f => ({
              name: f,
              path: join(dayDir, f),
              mtime: statSync(join(dayDir, f)).mtime,
            }))
            .filter(f => !since || f.mtime > since);

          for (const file of files) {
            try {
              const content = readFileSync(file.path, 'utf-8');
              const lines = content.split('\n').filter(l => l.trim());

              if (lines.length < 2) continue;

              // Extract summary from first user message
              const firstLine = JSON.parse(lines[0]);
              const summary = typeof firstLine.content === 'string'
                ? firstLine.content.slice(0, 200)
                : 'Codex session';

              events.push({
                id: ulid(),
                ts: file.mtime.toISOString(),
                type: 'session',
                tool: 'codex',
                user,
                summary,
              });
            } catch {
              // Skip malformed files
            }
          }
        }
      }
    }

    return { events };
  }
}

export const codexExtractor = new CodexExtractor();
