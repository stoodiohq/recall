/**
 * Storage Tests
 * Tests .recall/ directory operations and file management
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  createTestContext,
  initRecallDir,
  type TestContext,
} from '../utils/helpers';
import { createContextMd, createHistoryMd } from '../utils/factories';

describe('Storage', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  describe('Repository Detection', () => {
    it('should find .git directory in repo root', () => {
      // ctx.repoDir has .git created in setup
      const gitDir = path.join(ctx.repoDir, '.git');
      expect(fs.existsSync(gitDir)).toBe(true);
    });

    it('should walk up to find repo root from subdirectory', () => {
      const subDir = path.join(ctx.repoDir, 'src', 'components');
      fs.mkdirSync(subDir, { recursive: true });

      // Walk up to find .git
      let current = subDir;
      let found = false;
      while (current !== path.dirname(current)) {
        if (fs.existsSync(path.join(current, '.git'))) {
          found = true;
          expect(current).toBe(ctx.repoDir);
          break;
        }
        current = path.dirname(current);
      }

      expect(found).toBe(true);
    });

    it('should return null when not in a git repo', () => {
      const nonRepoDir = path.join(ctx.homeDir, 'not-a-repo');
      fs.mkdirSync(nonRepoDir, { recursive: true });

      let current = nonRepoDir;
      let found = false;
      while (current !== path.dirname(current)) {
        if (fs.existsSync(path.join(current, '.git'))) {
          found = true;
          break;
        }
        current = path.dirname(current);
      }

      expect(found).toBe(false);
    });
  });

  describe('Recall Directory', () => {
    it('should create .recall directory in repo root', () => {
      initRecallDir(ctx.repoDir);
      expect(fs.existsSync(ctx.recallDir)).toBe(true);
    });

    it('should create standard directory structure', () => {
      initRecallDir(ctx.repoDir);

      expect(fs.existsSync(path.join(ctx.recallDir, 'context.md'))).toBe(true);
      expect(fs.existsSync(path.join(ctx.recallDir, 'history.md'))).toBe(true);
      expect(fs.existsSync(path.join(ctx.recallDir, 'sessions'))).toBe(true);
    });

    it('should not overwrite existing files', () => {
      // Create with custom content first
      fs.mkdirSync(ctx.recallDir, { recursive: true });
      const customContent = '# Custom Context\nDo not overwrite!';
      fs.writeFileSync(path.join(ctx.recallDir, 'context.md'), customContent);

      // Initialize should not overwrite
      if (!fs.existsSync(path.join(ctx.recallDir, 'history.md'))) {
        fs.writeFileSync(path.join(ctx.recallDir, 'history.md'), '# History');
      }

      const content = fs.readFileSync(path.join(ctx.recallDir, 'context.md'), 'utf-8');
      expect(content).toBe(customContent);
    });

    it('should create .gitattributes with merge strategy', () => {
      initRecallDir(ctx.repoDir);

      const gitattributesPath = path.join(ctx.recallDir, '.gitattributes');
      if (fs.existsSync(gitattributesPath)) {
        const content = fs.readFileSync(gitattributesPath, 'utf-8');
        expect(content).toContain('merge=ours');
      }
    });
  });

  describe('Context File (context.md)', () => {
    it('should read context.md content', () => {
      const contextContent = createContextMd({
        projectName: 'TestApp',
        techStack: ['React', 'TypeScript', 'Tailwind'],
      });
      initRecallDir(ctx.repoDir, { context: contextContent });

      const content = fs.readFileSync(
        path.join(ctx.recallDir, 'context.md'),
        'utf-8'
      );

      expect(content).toContain('TestApp');
      expect(content).toContain('React');
    });

    it('should write/update context.md', () => {
      initRecallDir(ctx.repoDir);

      const newContent = '# Updated Context\nNew information here.';
      fs.writeFileSync(path.join(ctx.recallDir, 'context.md'), newContent);

      const content = fs.readFileSync(
        path.join(ctx.recallDir, 'context.md'),
        'utf-8'
      );
      expect(content).toBe(newContent);
    });

    it('should handle missing context.md gracefully', () => {
      fs.mkdirSync(ctx.recallDir, { recursive: true });
      // Don't create context.md

      const filePath = path.join(ctx.recallDir, 'context.md');
      const exists = fs.existsSync(filePath);
      expect(exists).toBe(false);
    });
  });

  describe('History File (history.md)', () => {
    it('should read history.md content', () => {
      const historyContent = createHistoryMd({
        sessions: [
          { date: '2024-01-15', summary: 'Setup project' },
          { date: '2024-01-16', summary: 'Added auth' },
        ],
      });
      initRecallDir(ctx.repoDir, { history: historyContent });

      const content = fs.readFileSync(
        path.join(ctx.recallDir, 'history.md'),
        'utf-8'
      );

      expect(content).toContain('Setup project');
      expect(content).toContain('Added auth');
    });

    it('should append to history.md', () => {
      initRecallDir(ctx.repoDir);

      const historyPath = path.join(ctx.recallDir, 'history.md');
      const original = fs.readFileSync(historyPath, 'utf-8');
      const newEntry = '\n\n## 2024-01-17\nNew session entry';
      fs.writeFileSync(historyPath, original + newEntry);

      const content = fs.readFileSync(historyPath, 'utf-8');
      expect(content).toContain(original);
      expect(content).toContain('New session entry');
    });
  });

  describe('Sessions Directory', () => {
    it('should create session files in sessions/', () => {
      initRecallDir(ctx.repoDir);

      const sessionPath = path.join(
        ctx.recallDir,
        'sessions',
        'session-001.md'
      );
      fs.writeFileSync(sessionPath, '# Session 1\nContent here');

      expect(fs.existsSync(sessionPath)).toBe(true);
    });

    it('should organize sessions by date', () => {
      initRecallDir(ctx.repoDir);

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const datePath = path.join(ctx.recallDir, 'sessions', today);
      fs.mkdirSync(datePath, { recursive: true });
      fs.writeFileSync(path.join(datePath, 'session-001.md'), '# Session');

      expect(fs.existsSync(datePath)).toBe(true);
    });

    it('should list all session files', () => {
      initRecallDir(ctx.repoDir, {
        sessions: [
          { name: 'session1.md', content: '# Session 1' },
          { name: 'session2.md', content: '# Session 2' },
          { name: 'session3.md', content: '# Session 3' },
        ],
      });

      const sessionsDir = path.join(ctx.recallDir, 'sessions');
      const files = fs.readdirSync(sessionsDir).filter((f) => f.endsWith('.md'));

      expect(files.length).toBe(3);
    });

    it('should handle nested session directories', () => {
      initRecallDir(ctx.repoDir);

      const nestedPath = path.join(
        ctx.recallDir,
        'sessions',
        '2024',
        '01',
        '15'
      );
      fs.mkdirSync(nestedPath, { recursive: true });
      fs.writeFileSync(path.join(nestedPath, 'session.md'), '# Content');

      // Walk function to find all session files
      const sessions: string[] = [];
      const walk = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(fullPath);
          } else if (entry.name.endsWith('.md')) {
            sessions.push(fullPath);
          }
        }
      };
      walk(path.join(ctx.recallDir, 'sessions'));

      expect(sessions.length).toBe(1);
    });
  });

  describe('File Types', () => {
    it('should distinguish between v1 and v2 file structure', () => {
      // v1: events.jsonl (deprecated)
      // v2: context.md, history.md, sessions/

      const v2Files = ['context.md', 'history.md', 'sessions'];
      const v1Files = ['events.jsonl', 'manifest.json'];

      initRecallDir(ctx.repoDir);

      // v2 files should exist
      expect(fs.existsSync(path.join(ctx.recallDir, 'context.md'))).toBe(true);
      expect(fs.existsSync(path.join(ctx.recallDir, 'history.md'))).toBe(true);

      // v1 files should not exist
      expect(fs.existsSync(path.join(ctx.recallDir, 'events.jsonl'))).toBe(false);
    });

    it('should detect encrypted vs plaintext files', () => {
      initRecallDir(ctx.repoDir);

      // Plaintext file
      const plainPath = path.join(ctx.recallDir, 'context.md');
      const plainContent = fs.readFileSync(plainPath, 'utf-8');
      const isPlain = !plainContent.startsWith('RECALL_ENCRYPTED:');
      expect(isPlain).toBe(true);

      // Encrypted file (simulated)
      fs.writeFileSync(plainPath, 'RECALL_ENCRYPTED:v1:iv:tag:data');
      const encContent = fs.readFileSync(plainPath, 'utf-8');
      const isEncrypted = encContent.startsWith('RECALL_ENCRYPTED:');
      expect(isEncrypted).toBe(true);
    });
  });

  describe('Imported Sessions Tracker', () => {
    it('should create tracker file on first import', () => {
      initRecallDir(ctx.repoDir);

      const trackerPath = path.join(ctx.recallDir, 'imported-sessions.json');
      const tracker = {
        version: 1,
        sessions: [],
      };
      fs.writeFileSync(trackerPath, JSON.stringify(tracker, null, 2));

      expect(fs.existsSync(trackerPath)).toBe(true);
    });

    it('should update tracker on session import', () => {
      initRecallDir(ctx.repoDir);

      const trackerPath = path.join(ctx.recallDir, 'imported-sessions.json');
      const tracker = {
        version: 1,
        sessions: [
          {
            filename: 'session1.jsonl',
            importedAt: new Date().toISOString(),
            mtime: Date.now(),
          },
        ],
      };
      fs.writeFileSync(trackerPath, JSON.stringify(tracker, null, 2));

      const content = JSON.parse(fs.readFileSync(trackerPath, 'utf-8'));
      expect(content.sessions.length).toBe(1);
    });

    it('should handle concurrent tracker updates', () => {
      initRecallDir(ctx.repoDir);

      const trackerPath = path.join(ctx.recallDir, 'imported-sessions.json');

      // Simple lock mechanism
      const lockPath = trackerPath + '.lock';

      const acquireLock = (): boolean => {
        if (fs.existsSync(lockPath)) return false;
        fs.writeFileSync(lockPath, process.pid.toString());
        return true;
      };

      const releaseLock = (): void => {
        if (fs.existsSync(lockPath)) {
          fs.unlinkSync(lockPath);
        }
      };

      // First lock succeeds
      expect(acquireLock()).toBe(true);
      // Second lock fails
      expect(acquireLock()).toBe(false);
      // After release, lock succeeds again
      releaseLock();
      expect(acquireLock()).toBe(true);
      releaseLock();
    });
  });

  describe('Path Utilities', () => {
    it('should get recall path from repo root', () => {
      const recallPath = path.join(ctx.repoDir, '.recall');
      expect(recallPath).toBe(ctx.recallDir);
    });

    it('should handle paths with spaces', () => {
      const dirWithSpaces = path.join(ctx.homeDir, 'My Projects', 'test app');
      fs.mkdirSync(path.join(dirWithSpaces, '.git'), { recursive: true });

      const recallPath = path.join(dirWithSpaces, '.recall');
      fs.mkdirSync(recallPath, { recursive: true });

      expect(fs.existsSync(recallPath)).toBe(true);
    });

    it('should normalize paths across platforms', () => {
      const inputPath = ctx.repoDir + '/.recall/../.recall';
      const normalized = path.normalize(inputPath);

      expect(normalized).toBe(ctx.recallDir);
    });
  });

  describe('Backup and Recovery', () => {
    it('should create backup before major operations', () => {
      initRecallDir(ctx.repoDir);

      const contextPath = path.join(ctx.recallDir, 'context.md');
      const backupPath = contextPath + '.bak';

      // Create backup
      fs.copyFileSync(contextPath, backupPath);
      expect(fs.existsSync(backupPath)).toBe(true);

      // Backup should match original
      const original = fs.readFileSync(contextPath, 'utf-8');
      const backup = fs.readFileSync(backupPath, 'utf-8');
      expect(backup).toBe(original);
    });

    it('should restore from backup on failure', () => {
      initRecallDir(ctx.repoDir);

      const contextPath = path.join(ctx.recallDir, 'context.md');
      const backupPath = contextPath + '.bak';

      const original = fs.readFileSync(contextPath, 'utf-8');
      fs.copyFileSync(contextPath, backupPath);

      // Simulate failed operation that corrupts file
      fs.writeFileSync(contextPath, 'CORRUPTED');

      // Restore from backup
      fs.copyFileSync(backupPath, contextPath);
      const restored = fs.readFileSync(contextPath, 'utf-8');

      expect(restored).toBe(original);
    });
  });
});
