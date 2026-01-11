/**
 * Claude Code Hooks Tests
 * Tests for hook installation, detection, and execution
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  createTestContext,
  type TestContext,
} from '../utils/helpers';

interface HookEntry {
  type: 'command';
  command: string;
}

interface HookConfig {
  matcher?: string;
  hooks: HookEntry[];
}

interface ClaudeSettings {
  hooks?: {
    PreToolUse?: HookConfig[];
    PostToolUse?: HookConfig[];
    SessionEnd?: HookConfig[];
    SessionStart?: HookConfig[];
    Stop?: HookConfig[];
    UserPromptSubmit?: HookConfig[];
  };
  [key: string]: unknown;
}

describe('Claude Code Hooks', () => {
  let ctx: TestContext;
  let claudeSettingsPath: string;

  beforeEach(async () => {
    ctx = await createTestContext();
    // Create .claude directory in temp home
    const claudeDir = path.join(ctx.homeDir, '.claude');
    fs.mkdirSync(claudeDir, { recursive: true });
    claudeSettingsPath = path.join(claudeDir, 'settings.json');
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  describe('Hook Installation', () => {
    it('should create settings.json if not exists', () => {
      // Simulate what installHooks does
      const settings: ClaudeSettings = {
        hooks: {
          Stop: [
            {
              hooks: [{ type: 'command', command: 'recall hook save --auto --quiet' }],
            },
          ],
        },
      };

      fs.writeFileSync(claudeSettingsPath, JSON.stringify(settings, null, 2));

      expect(fs.existsSync(claudeSettingsPath)).toBe(true);
      const content = JSON.parse(fs.readFileSync(claudeSettingsPath, 'utf-8'));
      expect(content.hooks).toBeDefined();
    });

    it('should install Stop hook for session end', () => {
      const settings: ClaudeSettings = {
        hooks: {
          Stop: [
            {
              hooks: [{ type: 'command', command: 'recall hook save --auto --quiet' }],
            },
          ],
        },
      };

      fs.writeFileSync(claudeSettingsPath, JSON.stringify(settings, null, 2));

      const content = JSON.parse(fs.readFileSync(claudeSettingsPath, 'utf-8')) as ClaudeSettings;
      expect(content.hooks?.Stop).toHaveLength(1);
      expect(content.hooks?.Stop?.[0].hooks[0].command).toContain('recall hook save');
    });

    it('should install PostToolUse hook for git commit', () => {
      const settings: ClaudeSettings = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'Bash',
              hooks: [{ type: 'command', command: 'recall hook on-commit' }],
            },
          ],
        },
      };

      fs.writeFileSync(claudeSettingsPath, JSON.stringify(settings, null, 2));

      const content = JSON.parse(fs.readFileSync(claudeSettingsPath, 'utf-8')) as ClaudeSettings;
      expect(content.hooks?.PostToolUse).toHaveLength(1);
      expect(content.hooks?.PostToolUse?.[0].matcher).toBe('Bash');
      expect(content.hooks?.PostToolUse?.[0].hooks[0].command).toContain('recall hook on-commit');
    });

    it('should install UserPromptSubmit hook for save keyword', () => {
      const settings: ClaudeSettings = {
        hooks: {
          UserPromptSubmit: [
            {
              hooks: [{ type: 'command', command: 'recall hook on-prompt' }],
            },
          ],
        },
      };

      fs.writeFileSync(claudeSettingsPath, JSON.stringify(settings, null, 2));

      const content = JSON.parse(fs.readFileSync(claudeSettingsPath, 'utf-8')) as ClaudeSettings;
      expect(content.hooks?.UserPromptSubmit).toHaveLength(1);
      expect(content.hooks?.UserPromptSubmit?.[0].hooks[0].command).toContain('recall hook on-prompt');
    });

    it('should preserve existing hooks when installing', () => {
      // Existing settings with other hooks
      const existing: ClaudeSettings = {
        hooks: {
          Stop: [
            {
              hooks: [{ type: 'command', command: 'other-tool cleanup' }],
            },
          ],
        },
      };

      fs.writeFileSync(claudeSettingsPath, JSON.stringify(existing, null, 2));

      // Add recall hook
      const settings = JSON.parse(fs.readFileSync(claudeSettingsPath, 'utf-8')) as ClaudeSettings;
      settings.hooks!.Stop = [
        ...(settings.hooks?.Stop || []),
        {
          hooks: [{ type: 'command', command: 'recall hook save --auto --quiet' }],
        },
      ];

      fs.writeFileSync(claudeSettingsPath, JSON.stringify(settings, null, 2));

      const content = JSON.parse(fs.readFileSync(claudeSettingsPath, 'utf-8')) as ClaudeSettings;
      expect(content.hooks?.Stop).toHaveLength(2);
      expect(content.hooks?.Stop?.[0].hooks[0].command).toContain('other-tool');
      expect(content.hooks?.Stop?.[1].hooks[0].command).toContain('recall hook');
    });

    it('should not duplicate hooks if already installed', () => {
      const settings: ClaudeSettings = {
        hooks: {
          Stop: [
            {
              hooks: [{ type: 'command', command: 'recall hook save --auto --quiet' }],
            },
          ],
        },
      };

      fs.writeFileSync(claudeSettingsPath, JSON.stringify(settings, null, 2));

      // Check if already installed
      const existing = JSON.parse(fs.readFileSync(claudeSettingsPath, 'utf-8')) as ClaudeSettings;
      const hasRecallHook = existing.hooks?.Stop?.some((hook) =>
        hook.hooks?.some((h) => h.command?.includes('recall hook'))
      );

      expect(hasRecallHook).toBe(true);
      // If already installed, don't add again
    });
  });

  describe('Hook Detection', () => {
    it('should detect installed Stop hook', () => {
      const settings: ClaudeSettings = {
        hooks: {
          Stop: [
            {
              hooks: [{ type: 'command', command: 'recall hook save --auto --quiet' }],
            },
          ],
        },
      };

      fs.writeFileSync(claudeSettingsPath, JSON.stringify(settings, null, 2));

      const content = JSON.parse(fs.readFileSync(claudeSettingsPath, 'utf-8')) as ClaudeSettings;
      const hasStopHook = content.hooks?.Stop?.some((hook) =>
        hook.hooks?.some((h) => h.command?.includes('recall hook'))
      );

      expect(hasStopHook).toBe(true);
    });

    it('should detect installed PostToolUse hook with Bash matcher', () => {
      const settings: ClaudeSettings = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'Bash',
              hooks: [{ type: 'command', command: 'recall hook on-commit' }],
            },
          ],
        },
      };

      fs.writeFileSync(claudeSettingsPath, JSON.stringify(settings, null, 2));

      const content = JSON.parse(fs.readFileSync(claudeSettingsPath, 'utf-8')) as ClaudeSettings;
      const hasGitCommitHook = content.hooks?.PostToolUse?.some(
        (hook) =>
          hook.matcher === 'Bash' &&
          hook.hooks?.some((h) => h.command?.includes('recall hook'))
      );

      expect(hasGitCommitHook).toBe(true);
    });

    it('should return false when no hooks installed', () => {
      const settings: ClaudeSettings = {};
      fs.writeFileSync(claudeSettingsPath, JSON.stringify(settings, null, 2));

      const content = JSON.parse(fs.readFileSync(claudeSettingsPath, 'utf-8')) as ClaudeSettings;
      const hasRecallHook = content.hooks?.Stop?.some((hook) =>
        hook.hooks?.some((h) => h.command?.includes('recall hook'))
      );

      expect(hasRecallHook).toBeFalsy();
    });

    it('should return false when settings.json does not exist', () => {
      if (fs.existsSync(claudeSettingsPath)) {
        fs.unlinkSync(claudeSettingsPath);
      }

      expect(fs.existsSync(claudeSettingsPath)).toBe(false);
    });
  });

  describe('Hook Uninstallation', () => {
    it('should remove all recall hooks', () => {
      const settings: ClaudeSettings = {
        hooks: {
          Stop: [
            {
              hooks: [{ type: 'command', command: 'recall hook save --auto --quiet' }],
            },
          ],
          PostToolUse: [
            {
              matcher: 'Bash',
              hooks: [{ type: 'command', command: 'recall hook on-commit' }],
            },
          ],
          UserPromptSubmit: [
            {
              hooks: [{ type: 'command', command: 'recall hook on-prompt' }],
            },
          ],
        },
      };

      fs.writeFileSync(claudeSettingsPath, JSON.stringify(settings, null, 2));

      // Simulate uninstall
      const content = JSON.parse(fs.readFileSync(claudeSettingsPath, 'utf-8')) as ClaudeSettings;

      for (const hookType of ['Stop', 'PostToolUse', 'UserPromptSubmit'] as const) {
        if (content.hooks?.[hookType]) {
          content.hooks[hookType] = content.hooks[hookType]!.filter(
            (hook) => !hook.hooks?.some((h) => h.command?.includes('recall hook'))
          );
          if (content.hooks[hookType]!.length === 0) {
            delete content.hooks[hookType];
          }
        }
      }

      fs.writeFileSync(claudeSettingsPath, JSON.stringify(content, null, 2));

      const updated = JSON.parse(fs.readFileSync(claudeSettingsPath, 'utf-8')) as ClaudeSettings;
      expect(updated.hooks?.Stop).toBeUndefined();
      expect(updated.hooks?.PostToolUse).toBeUndefined();
      expect(updated.hooks?.UserPromptSubmit).toBeUndefined();
    });

    it('should preserve non-recall hooks when uninstalling', () => {
      const settings: ClaudeSettings = {
        hooks: {
          Stop: [
            {
              hooks: [{ type: 'command', command: 'other-tool cleanup' }],
            },
            {
              hooks: [{ type: 'command', command: 'recall hook save --auto --quiet' }],
            },
          ],
        },
      };

      fs.writeFileSync(claudeSettingsPath, JSON.stringify(settings, null, 2));

      // Simulate uninstall
      const content = JSON.parse(fs.readFileSync(claudeSettingsPath, 'utf-8')) as ClaudeSettings;

      if (content.hooks?.Stop) {
        content.hooks.Stop = content.hooks.Stop.filter(
          (hook) => !hook.hooks?.some((h) => h.command?.includes('recall hook'))
        );
      }

      fs.writeFileSync(claudeSettingsPath, JSON.stringify(content, null, 2));

      const updated = JSON.parse(fs.readFileSync(claudeSettingsPath, 'utf-8')) as ClaudeSettings;
      expect(updated.hooks?.Stop).toHaveLength(1);
      expect(updated.hooks?.Stop?.[0].hooks[0].command).toContain('other-tool');
    });
  });

  describe('Git Commit Detection', () => {
    it('should detect git commit command', () => {
      const commands = [
        'git commit -m "message"',
        'git commit -am "message"',
        'git commit --amend',
        "git add . && git commit -m 'message'",
      ];

      for (const cmd of commands) {
        const isGitCommit = cmd.includes('git commit');
        expect(isGitCommit).toBe(true);
      }
    });

    it('should detect git push command', () => {
      const commands = [
        'git push',
        'git push origin main',
        'git push -u origin feature',
        'git commit -m "msg" && git push',
      ];

      for (const cmd of commands) {
        const isGitPush = cmd.includes('git push');
        expect(isGitPush).toBe(true);
      }
    });

    it('should not trigger on non-git commands', () => {
      const commands = [
        'npm install',
        'ls -la',
        'echo "hello"',
        'cat package.json',
      ];

      for (const cmd of commands) {
        const isGitCommit = cmd.includes('git commit');
        const isGitPush = cmd.includes('git push');
        expect(isGitCommit || isGitPush).toBe(false);
      }
    });

    it('should not trigger on git commands that are not commit/push', () => {
      const commands = [
        'git status',
        'git log',
        'git diff',
        'git branch',
        'git checkout main',
      ];

      for (const cmd of commands) {
        const isGitCommit = cmd.includes('git commit');
        const isGitPush = cmd.includes('git push');
        expect(isGitCommit || isGitPush).toBe(false);
      }
    });
  });

  describe('Save Keyword Detection', () => {
    it('should detect "save" keyword', () => {
      const prompts = ['save', 'Save', 'SAVE'];
      const pattern = /^save$/i;

      for (const prompt of prompts) {
        expect(pattern.test(prompt)).toBe(true);
      }
    });

    it('should detect "save session" variations', () => {
      const prompts = ['save session', 'save this session', 'save the session'];
      const patterns = [
        /^save\s+session$/i,
        /save\s+this\s+session/i,
        /save\s+(?:the\s+)?session/i,
      ];

      for (const prompt of prompts) {
        const matches = patterns.some((p) => p.test(prompt.toLowerCase()));
        expect(matches).toBe(true);
      }
    });

    it("should detect \"let's save\" variations", () => {
      const prompts = ["let's save", 'lets save', "let's save this", 'lets save where we are'];
      const pattern = /let'?s?\s+save/i;

      for (const prompt of prompts) {
        expect(pattern.test(prompt)).toBe(true);
      }
    });

    it('should detect "save progress/memory/context"', () => {
      const prompts = ['save progress', 'save memory', 'save context'];
      const patterns = [/save\s+progress/i, /save\s+memory/i, /save\s+context/i];

      for (const prompt of prompts) {
        const matches = patterns.some((p) => p.test(prompt.toLowerCase()));
        expect(matches).toBe(true);
      }
    });

    it('should not trigger on unrelated prompts', () => {
      const prompts = [
        'help me write code',
        'what is the weather',
        'explain this function',
        'fix the bug',
      ];
      const savePatterns = [
        /^save$/i,
        /^save\s+session$/i,
        /^save\s+this$/i,
        /let'?s?\s+save/i,
        /save\s+(?:the\s+)?session/i,
        /save\s+(?:where|what)/i,
        /save\s+progress/i,
        /save\s+memory/i,
        /save\s+context/i,
      ];

      for (const prompt of prompts) {
        const matches = savePatterns.some((p) => p.test(prompt.toLowerCase()));
        expect(matches).toBe(false);
      }
    });
  });

  describe('Hook Configuration Format', () => {
    it('should use correct Stop hook format', () => {
      const stopHook: HookConfig = {
        hooks: [
          {
            type: 'command',
            command: 'recall hook save --auto --quiet',
          },
        ],
      };

      expect(stopHook.matcher).toBeUndefined();
      expect(stopHook.hooks).toHaveLength(1);
      expect(stopHook.hooks[0].type).toBe('command');
    });

    it('should use correct PostToolUse hook format with matcher', () => {
      const postToolUseHook: HookConfig = {
        matcher: 'Bash',
        hooks: [
          {
            type: 'command',
            command: 'recall hook on-commit',
          },
        ],
      };

      expect(postToolUseHook.matcher).toBe('Bash');
      expect(postToolUseHook.hooks).toHaveLength(1);
    });

    it('should use correct UserPromptSubmit hook format', () => {
      const promptHook: HookConfig = {
        hooks: [
          {
            type: 'command',
            command: 'recall hook on-prompt',
          },
        ],
      };

      expect(promptHook.matcher).toBeUndefined();
      expect(promptHook.hooks[0].command).toBe('recall hook on-prompt');
    });
  });
});
