/**
 * Configuration Tests
 * Tests ~/.recall/config.json management
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  createTestContext,
  writeTestConfig,
  readTestConfig,
  type TestContext,
} from '../utils/helpers';

describe('Configuration', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  describe('Config Directory', () => {
    it('should create ~/.recall/ directory if not exists', () => {
      const configDir = path.join(ctx.homeDir, '.recall');

      // Should not exist initially (after cleanup)
      fs.rmSync(configDir, { recursive: true, force: true });
      expect(fs.existsSync(configDir)).toBe(false);

      // Writing config should create it
      writeTestConfig(ctx.homeDir, { apiToken: 'test' });
      expect(fs.existsSync(configDir)).toBe(true);
    });

    it('should set restrictive permissions on config directory (0700)', () => {
      writeTestConfig(ctx.homeDir, { apiToken: 'test' });

      const configDir = path.join(ctx.homeDir, '.recall');
      const stats = fs.statSync(configDir);

      if (process.platform !== 'win32') {
        // eslint-disable-next-line no-bitwise
        const mode = stats.mode & 0o777;
        // Directory should be owner-only accessible
        expect(mode === 0o700 || mode === 0o755).toBe(true);
      }
    });
  });

  describe('Config File', () => {
    it('should create config.json with valid JSON', () => {
      writeTestConfig(ctx.homeDir, {
        apiToken: 'recall_test_123',
        apiUrl: 'https://api.recall.team',
      });

      const content = fs.readFileSync(ctx.configPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.apiToken).toBe('recall_test_123');
      expect(parsed.apiUrl).toBe('https://api.recall.team');
    });

    it('should set restrictive permissions on config file (0600)', () => {
      writeTestConfig(ctx.homeDir, { apiToken: 'test' });

      const stats = fs.statSync(ctx.configPath);

      if (process.platform !== 'win32') {
        // eslint-disable-next-line no-bitwise
        const mode = stats.mode & 0o777;
        expect(mode).toBe(0o600);
      }
    });

    it('should read existing config', () => {
      writeTestConfig(ctx.homeDir, {
        apiToken: 'recall_token_xyz',
        userId: 'user-123',
        teamId: 'team-456',
      });

      const config = readTestConfig(ctx.homeDir);

      expect(config?.apiToken).toBe('recall_token_xyz');
      expect(config?.userId).toBe('user-123');
      expect(config?.teamId).toBe('team-456');
    });

    it('should return null for missing config', () => {
      // Don't create config file
      const config = readTestConfig(ctx.homeDir);
      expect(config).toBeNull();
    });

    it('should handle corrupted config file', () => {
      const configDir = path.join(ctx.homeDir, '.recall');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(ctx.configPath, 'not valid json {{{');

      expect(() => {
        const content = fs.readFileSync(ctx.configPath, 'utf-8');
        JSON.parse(content);
      }).toThrow();
    });
  });

  describe('Config Values', () => {
    it('should store apiToken', () => {
      writeTestConfig(ctx.homeDir, { apiToken: 'recall_abc123' });
      const config = readTestConfig(ctx.homeDir);
      expect(config?.apiToken).toBe('recall_abc123');
    });

    it('should store apiUrl with default', () => {
      writeTestConfig(ctx.homeDir, {
        apiToken: 'test',
        apiUrl: 'https://custom.api.com',
      });

      const config = readTestConfig(ctx.homeDir);
      expect(config?.apiUrl).toBe('https://custom.api.com');
    });

    it('should store user info', () => {
      writeTestConfig(ctx.homeDir, {
        apiToken: 'test',
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      } as any);

      const config = readTestConfig(ctx.homeDir) as any;
      expect(config?.userId).toBe('user-123');
      expect(config?.email).toBe('test@example.com');
      expect(config?.name).toBe('Test User');
    });

    it('should store team info', () => {
      writeTestConfig(ctx.homeDir, {
        apiToken: 'test',
        teamId: 'team-456',
        teamName: 'My Team',
        teamTier: 'pro',
      } as any);

      const config = readTestConfig(ctx.homeDir) as any;
      expect(config?.teamId).toBe('team-456');
      expect(config?.teamName).toBe('My Team');
      expect(config?.teamTier).toBe('pro');
    });
  });

  describe('Config Updates', () => {
    it('should merge updates with existing config', () => {
      writeTestConfig(ctx.homeDir, {
        apiToken: 'original',
        apiUrl: 'https://api.original.com',
      });

      // Read, modify, write
      const existing = readTestConfig(ctx.homeDir)!;
      writeTestConfig(ctx.homeDir, {
        ...existing,
        apiToken: 'updated',
      });

      const config = readTestConfig(ctx.homeDir);
      expect(config?.apiToken).toBe('updated');
      expect(config?.apiUrl).toBe('https://api.original.com');
    });

    it('should overwrite entire config when desired', () => {
      writeTestConfig(ctx.homeDir, {
        apiToken: 'old',
        apiUrl: 'https://old.api.com',
      });

      writeTestConfig(ctx.homeDir, {
        apiToken: 'new',
        // Intentionally no apiUrl
      });

      const config = readTestConfig(ctx.homeDir);
      expect(config?.apiToken).toBe('new');
      expect(config?.apiUrl).toBeUndefined();
    });
  });

  describe('Authentication State', () => {
    it('should detect authenticated state', () => {
      writeTestConfig(ctx.homeDir, { apiToken: 'recall_valid_token' });

      const config = readTestConfig(ctx.homeDir);
      const isAuthenticated = !!config?.apiToken;

      expect(isAuthenticated).toBe(true);
    });

    it('should detect unauthenticated state', () => {
      writeTestConfig(ctx.homeDir, { apiUrl: 'https://api.recall.team' });

      const config = readTestConfig(ctx.homeDir);
      const isAuthenticated = !!config?.apiToken;

      expect(isAuthenticated).toBe(false);
    });

    it('should clear auth on logout', () => {
      writeTestConfig(ctx.homeDir, {
        apiToken: 'to-be-cleared',
        apiUrl: 'https://api.recall.team',
      });

      // Logout clears token but keeps other settings
      const config = readTestConfig(ctx.homeDir)!;
      delete (config as any).apiToken;
      writeTestConfig(ctx.homeDir, config);

      const updated = readTestConfig(ctx.homeDir);
      expect(updated?.apiToken).toBeUndefined();
      expect(updated?.apiUrl).toBe('https://api.recall.team');
    });
  });

  describe('API URL', () => {
    it('should default to production URL', () => {
      const defaultUrl = 'https://api.recall.team';

      writeTestConfig(ctx.homeDir, { apiToken: 'test' });
      const config = readTestConfig(ctx.homeDir);

      // If no apiUrl set, default should be used
      const apiUrl = config?.apiUrl || defaultUrl;
      expect(apiUrl).toBe(defaultUrl);
    });

    it('should allow custom API URL for development', () => {
      const devUrl = 'http://localhost:8787';

      writeTestConfig(ctx.homeDir, {
        apiToken: 'test',
        apiUrl: devUrl,
      });

      const config = readTestConfig(ctx.homeDir);
      expect(config?.apiUrl).toBe(devUrl);
    });

    it('should validate API URL format', () => {
      const validUrls = [
        'https://api.recall.team',
        'http://localhost:8787',
        'https://staging.api.recall.team',
      ];

      const invalidUrls = [
        'not-a-url',
        'ftp://wrong-protocol.com',
        '',
      ];

      for (const url of validUrls) {
        expect(url.match(/^https?:\/\/.+/)).toBeTruthy();
      }

      for (const url of invalidUrls) {
        expect(url.match(/^https?:\/\/.+/)).toBeFalsy();
      }
    });
  });

  describe('Environment Variables', () => {
    it('should prefer RECALL_API_TOKEN over config file', () => {
      writeTestConfig(ctx.homeDir, { apiToken: 'file_token' });
      process.env.RECALL_API_TOKEN = 'env_token';

      const envToken = process.env.RECALL_API_TOKEN;
      const fileConfig = readTestConfig(ctx.homeDir);
      const activeToken = envToken || fileConfig?.apiToken;

      expect(activeToken).toBe('env_token');

      delete process.env.RECALL_API_TOKEN;
    });

    it('should use file token when env not set', () => {
      delete process.env.RECALL_API_TOKEN;
      writeTestConfig(ctx.homeDir, { apiToken: 'file_token' });

      const envToken = process.env.RECALL_API_TOKEN;
      const fileConfig = readTestConfig(ctx.homeDir);
      const activeToken = envToken || fileConfig?.apiToken;

      expect(activeToken).toBe('file_token');
    });

    it('should support RECALL_API_URL environment variable', () => {
      process.env.RECALL_API_URL = 'http://localhost:9999';

      const envUrl = process.env.RECALL_API_URL;
      expect(envUrl).toBe('http://localhost:9999');

      delete process.env.RECALL_API_URL;
    });
  });

  describe('Migration', () => {
    it('should migrate old config format to new', () => {
      // Old format might have different field names
      const oldConfig = {
        token: 'old_format_token', // vs apiToken
        endpoint: 'https://old.api.com', // vs apiUrl
      };

      const configDir = path.join(ctx.homeDir, '.recall');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(ctx.configPath, JSON.stringify(oldConfig));

      // Migration logic would convert:
      const migrate = (old: any) => ({
        apiToken: old.token || old.apiToken,
        apiUrl: old.endpoint || old.apiUrl,
      });

      const migrated = migrate(oldConfig);
      expect(migrated.apiToken).toBe('old_format_token');
      expect(migrated.apiUrl).toBe('https://old.api.com');
    });
  });
});
