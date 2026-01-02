/**
 * Core domain types for Recall
 * Event-sourced model: Events are truth, snapshots are derived
 */

export type Tool = 'claude-code' | 'cursor' | 'codex' | 'gemini';
export type EventType = 'session' | 'decision' | 'error_resolved';

export interface RecallEvent {
  id: string;          // ULID - sortable unique ID
  ts: string;          // ISO8601 UTC timestamp
  type: EventType;
  tool: Tool;
  user: string;        // Git user email
  summary: string;     // Human-readable summary
  files?: string[];    // Files touched
}

export interface Manifest {
  version: number;
  created: string;     // ISO8601
  team?: string;       // Team ID if connected to cloud
}

export interface RecallConfig {
  cloudEndpoint: string;
  apiToken?: string;
  tokenBudgets: {
    small: number;
    medium: number;
    large: number;
  };
  autoSave: boolean;
  syncOnPush: boolean;
}

export interface ExtractorResult {
  events: RecallEvent[];
  lastProcessed?: string; // Timestamp of last processed session
}

export interface Extractor {
  readonly name: Tool;
  readonly priority: number;
  isInstalled(): Promise<boolean>;
  isActive(): Promise<boolean>;
  getSessionPath(repoPath: string): Promise<string | null>;
  extractEvents(since: Date | null): Promise<ExtractorResult>;
}

export interface SnapshotConfig {
  small: number;   // ~500 tokens
  medium: number;  // ~4000 tokens
  large: number;   // ~32000 tokens
}

export const DEFAULT_CONFIG: RecallConfig = {
  cloudEndpoint: 'https://api.recall.team',
  tokenBudgets: {
    small: 500,
    medium: 4000,
    large: 32000,
  },
  autoSave: true,
  syncOnPush: true,
};

export const RECALL_DIR = '.recall';
export const EVENTS_FILE = 'events/events.jsonl';
export const MANIFEST_FILE = 'manifest.json';
export const SNAPSHOTS = {
  small: 'snapshots/small.md',
  medium: 'snapshots/medium.md',
  large: 'snapshots/large.md',
} as const;
