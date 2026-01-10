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


export interface RecallConfig {
  cloudEndpoint: string;
  apiToken?: string;
  tokenBudgets: {
    context: number;  // ~1.5-3K tokens
    history: number;  // ~30K+ tokens
    session: number;  // ~1.5K per session
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
  context: number;   // ~1.5-3K tokens
  history: number;   // ~30K+ tokens
  session: number;   // ~1.5K per session
}

export const DEFAULT_CONFIG: RecallConfig = {
  cloudEndpoint: 'https://api.recall.team',
  tokenBudgets: {
    context: 3000,
    history: 30000,
    session: 1500,
  },
  autoSave: true,
  syncOnPush: true,
};

export const RECALL_DIR = '.recall';
export const FILES = {
  context: 'context.md',
  history: 'history.md',
  sessions: 'sessions',  // folder
} as const;
