/**
 * Common mocks for Recall tests
 * Provides mocking utilities for external services
 */

import { vi } from 'vitest';

// ============================================================================
// Fetch Mock
// ============================================================================

interface MockRoute {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  response: object | ((req: Request) => object | Promise<object>);
  status?: number;
  headers?: Record<string, string>;
}

const mockRoutes: MockRoute[] = [];

/**
 * Mock fetch with predefined routes
 */
export function mockFetch(routes: Record<string, object | ((req: Request) => object)>): void {
  mockRoutes.length = 0;

  for (const [key, response] of Object.entries(routes)) {
    const [method, path] = key.includes(' ') ? key.split(' ') : ['GET', key];
    mockRoutes.push({
      method: method as MockRoute['method'],
      path,
      response,
    });
  }

  vi.stubGlobal('fetch', createMockFetch());
}

function createMockFetch() {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = init?.method || 'GET';

    // Find matching route
    const route = mockRoutes.find((r) => {
      const methodMatch = !r.method || r.method === method;
      const pathMatch = url.includes(r.path);
      return methodMatch && pathMatch;
    });

    if (!route) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // If response is a function, call it
    if (typeof route.response === 'function') {
      const result = await route.response(new Request(url, init));
      // If the function returns a Response object, use it directly
      if (result instanceof Response) {
        return result;
      }
      // Otherwise wrap the result
      return new Response(JSON.stringify(result), {
        status: route.status || 200,
        headers: {
          'Content-Type': 'application/json',
          ...route.headers,
        },
      });
    }

    // Static response object
    return new Response(JSON.stringify(route.response), {
      status: route.status || 200,
      headers: {
        'Content-Type': 'application/json',
        ...route.headers,
      },
    });
  });
}

/**
 * Clear all fetch mocks
 */
export function clearFetchMocks(): void {
  mockRoutes.length = 0;
  vi.unstubAllGlobals();
}

// ============================================================================
// MCP Transport Mock
// ============================================================================

/**
 * Mock MCP stdio transport for testing
 */
export function createMockTransport() {
  const messages: object[] = [];

  return {
    messages,
    send: vi.fn((message: object) => {
      messages.push(message);
    }),
    onMessage: vi.fn(),
    start: vi.fn(),
    close: vi.fn(),
  };
}

// ============================================================================
// File System Mock
// ============================================================================

interface MockFileSystem {
  files: Map<string, string>;
  get: (path: string) => string | undefined;
  set: (path: string, content: string) => void;
  exists: (path: string) => boolean;
  delete: (path: string) => boolean;
  clear: () => void;
}

export function createMockFileSystem(): MockFileSystem {
  const files = new Map<string, string>();

  return {
    files,
    get: (path: string) => files.get(path),
    set: (path: string, content: string) => files.set(path, content),
    exists: (path: string) => files.has(path),
    delete: (path: string) => files.delete(path),
    clear: () => files.clear(),
  };
}

// ============================================================================
// Crypto Mock
// ============================================================================

/**
 * Generate a valid test encryption key (32 bytes base64)
 */
export function generateTestKey(): string {
  const key = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    key[i] = Math.floor(Math.random() * 256);
  }
  return Buffer.from(key).toString('base64');
}

/**
 * Create a deterministic test key for reproducible tests
 */
export function createDeterministicKey(seed: string = 'test'): string {
  // Simple deterministic key generation for tests
  const hash = Buffer.alloc(32);
  for (let i = 0; i < 32; i++) {
    hash[i] = seed.charCodeAt(i % seed.length) ^ (i * 7);
  }
  return hash.toString('base64');
}

// ============================================================================
// API Response Mocks
// ============================================================================

export const mockApiResponses = {
  teamKey: {
    success: {
      hasAccess: true,
      key: createDeterministicKey('test-team-key'),
      keyVersion: 1,
      teamId: 'test-team-id',
      teamSlug: 'test-team',
    },
    noAccess: {
      hasAccess: false,
      message: 'You do not have access to team memory. Contact your team admin.',
    },
    unauthorized: {
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    },
  },

  user: {
    authenticated: {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      github_username: 'testuser',
      avatar_url: 'https://github.com/testuser.png',
    },
  },

  team: {
    basic: {
      id: 'team-123',
      name: 'Test Team',
      slug: 'test-team',
      tier: 'pro',
      seats: 5,
      owner_id: 'user-123',
    },
    withMembers: {
      id: 'team-123',
      name: 'Test Team',
      slug: 'test-team',
      tier: 'pro',
      seats: 5,
      owner_id: 'user-123',
      members: [
        { id: 'user-123', role: 'owner', email: 'owner@example.com' },
        { id: 'user-456', role: 'member', email: 'member@example.com' },
      ],
    },
  },
};

// ============================================================================
// Stripe Mock
// ============================================================================

export const mockStripe = {
  checkout: {
    sessions: {
      create: vi.fn().mockResolvedValue({
        id: 'cs_test_xxx',
        url: 'https://checkout.stripe.com/pay/cs_test_xxx',
      }),
    },
  },
  billingPortal: {
    sessions: {
      create: vi.fn().mockResolvedValue({
        url: 'https://billing.stripe.com/session/xxx',
      }),
    },
  },
  webhooks: {
    constructEvent: vi.fn(),
  },
  customers: {
    create: vi.fn().mockResolvedValue({ id: 'cus_test_xxx' }),
  },
  subscriptions: {
    retrieve: vi.fn().mockResolvedValue({
      id: 'sub_test_xxx',
      status: 'active',
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    }),
  },
};

// ============================================================================
// GitHub OAuth Mock
// ============================================================================

export const mockGitHub = {
  exchangeCode: vi.fn().mockResolvedValue({
    access_token: 'gho_test_xxx',
    token_type: 'bearer',
    scope: 'user:email',
  }),
  getUser: vi.fn().mockResolvedValue({
    id: 12345,
    login: 'testuser',
    name: 'Test User',
    email: 'test@example.com',
    avatar_url: 'https://github.com/testuser.png',
  }),
  getEmails: vi.fn().mockResolvedValue([
    { email: 'test@example.com', primary: true, verified: true },
  ]),
};
