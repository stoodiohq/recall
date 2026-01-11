# Recall Test Suite

Comprehensive test architecture for Recall - Team Memory for AI Coding Assistants.

## Quick Start

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run specific test suites
npm run test:mcp      # MCP server tests
npm run test:api      # API endpoint tests
npm run test:cli      # CLI tests
npm run test:e2e      # End-to-end tests

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## Architecture Overview

```
tests/
├── README.md           # This file
├── vitest.config.ts    # Vitest configuration
├── setup.ts            # Global test setup
├── mcp/                # MCP server tests
│   ├── connection.test.ts    # MCP connection & transport
│   ├── auth.test.ts          # Authentication flow
│   ├── tools.test.ts         # Tool invocations
│   └── session.test.ts       # Session lifecycle
├── api/                # Cloudflare Workers API tests
│   ├── auth.test.ts          # OAuth, JWT, tokens
│   ├── teams.test.ts         # Team CRUD
│   ├── members.test.ts       # Team membership
│   ├── keys.test.ts          # Encryption key management
│   ├── billing.test.ts       # Stripe integration
│   └── repos.test.ts         # Repository management
├── cli/                # CLI command tests
│   ├── encryption.test.ts    # AES-256-GCM encryption
│   ├── storage.test.ts       # .recall/ file operations
│   └── config.test.ts        # Configuration management
├── e2e/                # End-to-end user flows
│   ├── onboarding.test.ts    # New user setup
│   ├── team-workflow.test.ts # Team collaboration
│   └── session-cycle.test.ts # Full session lifecycle
├── fixtures/           # Test data
│   ├── sessions/             # Sample session files
│   ├── encrypted/            # Encrypted file samples
│   └── api-responses/        # Mock API responses
└── utils/              # Test utilities
    ├── mocks.ts              # Common mocks
    ├── factories.ts          # Test data factories
    └── helpers.ts            # Test helpers
```

## Test Categories

### 1. MCP Connection & Auth Tests (`tests/mcp/`)

Tests for the Model Context Protocol server that connects to Claude Code.

| Test File | What It Tests |
|-----------|---------------|
| `connection.test.ts` | StdioServerTransport connection, MCP handshake |
| `auth.test.ts` | Token validation, recall_auth tool, token caching |
| `tools.test.ts` | All 10 MCP tools (recall_get_context, recall_save_session, etc.) |
| `session.test.ts` | Session import, deduplication, transcript parsing |

**Key scenarios:**
- Valid/invalid token authentication
- Token caching across tool calls
- Config file vs environment variable token loading
- MCP protocol compliance

### 2. API Endpoint Tests (`tests/api/`)

Tests for the Cloudflare Workers API at api.recall.team.

| Test File | What It Tests |
|-----------|---------------|
| `auth.test.ts` | GitHub OAuth flow, JWT signing/verification, API token generation |
| `teams.test.ts` | Team CRUD, ownership transfer, slug uniqueness |
| `members.test.ts` | Member invites, role changes, seat limits |
| `keys.test.ts` | Team key fetching, key rotation, machine ID validation |
| `billing.test.ts` | Stripe checkout, webhook handling, subscription status |
| `repos.test.ts` | Repo CRUD, initialization, toggle enabled |

**Key scenarios:**
- Authentication middleware for all protected routes
- Team tier restrictions (free vs paid)
- Seat limit enforcement
- Encryption key access control

### 3. CLI/Encryption Tests (`tests/cli/`)

Tests for the CLI encryption and storage layer.

| Test File | What It Tests |
|-----------|---------------|
| `encryption.test.ts` | AES-256-GCM encrypt/decrypt, file encryption, key caching |
| `storage.test.ts` | .recall/ directory operations, file read/write |
| `config.test.ts` | ~/.recall/config.json management |

**Key scenarios:**
- Encryption round-trip (encrypt then decrypt = original)
- Invalid key handling
- Corrupted file handling
- Machine ID generation consistency

### 4. End-to-End Tests (`tests/e2e/`)

Full user journey tests that exercise multiple components.

| Test File | What It Tests |
|-----------|---------------|
| `onboarding.test.ts` | GitHub OAuth -> Create team -> Generate token -> Connect MCP |
| `team-workflow.test.ts` | Invite member -> Accept -> Shared context access |
| `session-cycle.test.ts` | Start session -> Save context -> Load in new session |

## Test Fixtures

### Session Files (`fixtures/sessions/`)
```
session-simple.jsonl       # Basic Claude Code session
session-multi-tool.jsonl   # Session with multiple tool calls
session-large.jsonl        # Large session for performance testing
session-malformed.jsonl    # Malformed JSONL for error handling
```

### Encrypted Files (`fixtures/encrypted/`)
```
context.md.enc             # Encrypted context file
history.md.enc             # Encrypted history file
invalid.enc                # Invalid encrypted data
```

### API Responses (`fixtures/api-responses/`)
```
team-key-success.json      # Valid team key response
team-key-no-access.json    # 403 response
user-me.json               # Current user response
team-with-members.json     # Team with member list
```

## Prerequisites

### Environment Setup

Create a `.env.test` file:
```bash
# Test API (use local or staging)
TEST_API_URL=http://localhost:8787

# Test tokens (generate for test team)
TEST_API_TOKEN=test_token_xxx
TEST_TEAM_ID=test-team-id
TEST_USER_ID=test-user-id

# For E2E tests only
GITHUB_TEST_TOKEN=ghp_xxx  # Optional, for OAuth tests
```

### Local API

For API tests, run the local Wrangler dev server:
```bash
cd api && wrangler dev
```

### Test Database

API tests use a separate D1 database binding. Configure in `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "recall-test"
database_id = "xxx"
```

## Running Tests

### All Tests
```bash
npm test
```

### By Category
```bash
npm run test:mcp      # MCP server only
npm run test:api      # API endpoints only
npm run test:cli      # CLI/encryption only
npm run test:e2e      # E2E flows only
```

### Single File
```bash
npx vitest run tests/mcp/auth.test.ts
```

### Watch Mode
```bash
npx vitest watch tests/mcp/
```

### Coverage Report
```bash
npm run test:coverage
```

## Writing Tests

### Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestContext } from '../utils/helpers';

describe('FeatureName', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it('should do expected behavior', async () => {
    // Arrange
    const input = ctx.fixtures.validSession;

    // Act
    const result = await someFunction(input);

    // Assert
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it('should handle error case', async () => {
    // Arrange
    const invalidInput = ctx.fixtures.malformedSession;

    // Act & Assert
    await expect(someFunction(invalidInput)).rejects.toThrow('Expected error');
  });
});
```

### Using Factories

```typescript
import { createUser, createTeam, createSession } from '../utils/factories';

const user = createUser({ email: 'test@example.com' });
const team = createTeam({ owner: user, tier: 'pro' });
const session = createSession({ user, content: 'Test content' });
```

### Mocking External Services

```typescript
import { mockFetch, mockStripe, mockGitHub } from '../utils/mocks';

// Mock API calls
mockFetch({
  'POST /keys/team': { hasAccess: true, key: 'test-key' },
});

// Mock Stripe
mockStripe.checkout.sessions.create.mockResolvedValue({
  id: 'cs_test_xxx',
  url: 'https://checkout.stripe.com/xxx',
});
```

## CI/CD Integration

### GitHub Actions

Tests run on every PR and push to main:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v4
```

## Debugging Tests

### Verbose Output
```bash
npx vitest run --reporter=verbose
```

### Debug Single Test
```bash
npx vitest run tests/mcp/auth.test.ts --inspect-brk
```

### Check Test Isolation
```bash
npx vitest run --no-threads
```

## Coverage Goals

| Area | Target | Rationale |
|------|--------|-----------|
| Encryption | 100% | Security-critical |
| Auth | 95% | Security-critical |
| API endpoints | 90% | Core functionality |
| MCP tools | 90% | Core functionality |
| CLI commands | 80% | User-facing |
| E2E flows | Key paths | Smoke tests |

## Known Issues

1. **E2E OAuth tests require manual token** - GitHub OAuth flow can't be fully automated without a test OAuth app
2. **D1 in tests** - Wrangler dev mode D1 doesn't persist between restarts
3. **Encryption key caching** - Tests must reset the cached key between test cases

## Contributing

1. Write tests for new features before implementation (TDD encouraged)
2. Run full test suite before submitting PR
3. Maintain coverage goals
4. Update fixtures when API contracts change
