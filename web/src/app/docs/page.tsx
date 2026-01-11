'use client';

import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

const sections = [
  {
    id: 'quickstart',
    title: 'Quick Start',
    content: `
## 1. Sign up and create a team

Go to [recall.team](https://recall.team) and sign in with GitHub. Create a team and select your repositories.

## 2. Install the MCP server

Copy your API token from the dashboard and add Recall to your Claude Code configuration:

\`\`\`json
{
  "mcpServers": {
    "recall": {
      "command": "npx",
      "args": ["-y", "recall-mcp-server"],
      "env": {
        "RECALL_API_TOKEN": "your-token-here"
      }
    }
  }
}
\`\`\`

## 3. Start coding

That's it! Recall will automatically load team context at the start of each session and save summaries when you're done.
    `,
  },
  {
    id: 'how-it-works',
    title: 'How It Works',
    content: `
## Memory Files

Recall creates three types of memory files in your repository's \`.recall/\` folder:

- **context.md** (~1.5-3K tokens) - Team brain, loads every session
- **history.md** (~30K tokens) - Encyclopedia for onboarding and deep dives
- **sessions/** - Individual session records (~1.5K each)

## The Flow

1. **Session Start**: Claude loads \`context.md\` automatically via MCP
2. **During Work**: You code normally. Claude has team context.
3. **Session End**: Use \`recall_save_session\` to save a summary
4. **Team Sync**: Commit and push \`.recall/\` to share with your team

## Hotwords

Use these keywords to load different levels of context:

| Keyword | What Loads | Token Budget |
|---------|------------|--------------|
| (default) | context.md | ~1.5-3K |
| "remember" | context.md + recent sessions | ~10-15K |
| "ultraremember" | context.md + history.md | ~30K+ |
    `,
  },
  {
    id: 'mcp-tools',
    title: 'MCP Tools',
    content: `
## Available Tools

Recall provides these MCP tools to Claude Code:

### recall_get_context

Loads team context (\`context.md\`). Called automatically at session start.

### recall_get_history

Loads context.md + recent sessions (last 10). Use when you need more context about recent work. Triggered by "remember" hotword.

### recall_get_transcripts

Loads context.md + history.md (the full encyclopedia). Use when onboarding or need complete historical context. High token usage.

### recall_save_session

Saves a summary of the current session. Call this before ending your work.

\`\`\`
recall_save_session({
  summary: "Implemented user authentication with GitHub OAuth",
  decisions: [
    { what: "Used NextAuth for auth", why: "First-party Next.js integration" }
  ],
  filesChanged: ["src/app/api/auth/[...nextauth]/route.ts"],
  nextSteps: "Add session persistence"
})
\`\`\`

### recall_log_decision

Quick way to log a single decision during coding.

### recall_auth

Authenticate with your Recall API token. Usually not needed if token is in env.

### recall_status

Check your Recall connection status, team info, and repo memory status.

### recall_init

Initialize Recall for the current repository. Creates \`.recall/\` folder and imports any existing session transcripts.
    `,
  },
  {
    id: 'file-structure',
    title: 'File Structure',
    content: `
## .recall/ Folder

After initialization, your repo will have:

\`\`\`
.recall/
├── context.md      # Team brain (encrypted)
├── history.md      # Session history (encrypted)
└── sessions/       # Individual sessions
    └── 2025-01/
        └── ray/
            └── 15-1430.md
\`\`\`

## Encryption

All memory files are encrypted with your team's key. Only authenticated team members can decrypt them.

The encryption key is stored on Recall servers. Your data lives in YOUR GitHub repo - we just manage the keys.
    `,
  },
  {
    id: 'team-management',
    title: 'Team Management',
    content: `
## Adding Team Members

1. Go to Dashboard → Team
2. Click "Invite Member"
3. Share the invite link with your teammate
4. They sign in with GitHub and join your team

## Roles

- **Owner**: Full control, can delete team
- **Admin**: Can invite/remove members
- **Member**: Can use Recall, can't manage team

## Billing

Each team member needs a seat. Add/remove seats anytime from the dashboard.

Seats are prorated - you only pay for what you use.
    `,
  },
  {
    id: 'best-practices',
    title: 'Best Practices',
    content: `
## Saving Sessions

Save at natural breakpoints:
- End of a feature
- Before a long break
- When you've made important decisions

Use specific summaries:
- Bad: "Worked on the app"
- Good: "Added pagination to user list with cursor-based approach"

## Team Context

Keep \`context.md\` focused:
- Current project state
- Recent decisions
- Active blockers

Move historical info to \`history.md\`:
- Past decisions and reasoning
- Lessons learned
- Failed approaches

## Git Workflow

Commit \`.recall/\` with your code:
\`\`\`bash
git add .recall && git commit -m "Update team context"
\`\`\`

Use meaningful commit messages for recall changes.
    `,
  },
];

function TableOfContents() {
  return (
    <nav className="hidden lg:block sticky top-24 self-start">
      <p className="text-sm font-semibold text-text-primary mb-4">On this page</p>
      <ul className="space-y-2 text-sm">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className="text-text-tertiary hover:text-text-primary transition-colors"
            >
              {section.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-bg-base">
      <Header />

      <div className="max-w-6xl mx-auto px-6 pt-24 pb-16">
        <div className="lg:grid lg:grid-cols-[1fr_200px] lg:gap-12">
          {/* Main content */}
          <div>
            <motion.h1
              className="text-4xl font-bold text-text-primary mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              Documentation
            </motion.h1>
            <motion.p
              className="text-xl text-text-secondary mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              Everything you need to get your team up and running with Recall.
            </motion.p>

            {sections.map((section, index) => (
              <motion.section
                key={section.id}
                id={section.id}
                className="mb-16"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * (index + 1) }}
              >
                <h2 className="text-2xl font-bold text-text-primary mb-6 pb-3 border-b border-border-subtle">
                  {section.title}
                </h2>
                <div
                  className="prose prose-invert prose-cyan max-w-none
                    prose-headings:text-text-primary prose-headings:font-semibold
                    prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4
                    prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
                    prose-p:text-text-secondary prose-p:leading-relaxed
                    prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline
                    prose-strong:text-text-primary
                    prose-code:text-cyan-400 prose-code:bg-bg-elevated prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                    prose-pre:bg-bg-elevated prose-pre:border prose-pre:border-border-subtle
                    prose-ul:text-text-secondary
                    prose-li:text-text-secondary
                    prose-table:text-sm
                    prose-th:text-text-primary prose-th:font-semibold prose-th:border-border-subtle
                    prose-td:text-text-secondary prose-td:border-border-subtle"
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(section.content) }}
                />
              </motion.section>
            ))}

            {/* Help section */}
            <motion.div
              className="bg-bg-elevated border border-border-subtle rounded-xl p-8 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                Need help?
              </h3>
              <p className="text-text-secondary mb-6">
                Can&apos;t find what you&apos;re looking for?
              </p>
              <div className="flex items-center justify-center gap-4">
                <a
                  href="https://github.com/stoodiohq/recall/issues"
                  className="text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  Open an issue
                </a>
                <span className="text-text-tertiary">or</span>
                <a
                  href="mailto:hello@recall.team"
                  className="text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  Contact support
                </a>
              </div>
            </motion.div>
          </div>

          {/* TOC sidebar */}
          <TableOfContents />
        </div>
      </div>

      <Footer />
    </main>
  );
}

// Simple markdown to HTML converter for the docs
function markdownToHtml(markdown: string): string {
  return markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    // Code blocks
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Tables
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match.split('|').filter(c => c.trim());
      if (cells.every(c => /^[-:]+$/.test(c.trim()))) {
        return ''; // Skip separator row
      }
      const isHeader = !match.includes('-');
      const tag = isHeader ? 'th' : 'td';
      const row = cells.map(c => `<${tag} class="px-4 py-2 border">${c.trim()}</${tag}>`).join('');
      return `<tr>${row}</tr>`;
    })
    // Wrap tables
    .replace(/(<tr>[\s\S]*?<\/tr>)+/g, '<table class="w-full border-collapse border border-border-subtle my-4">$&</table>')
    // Lists
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul class="list-disc pl-6 space-y-1">$&</ul>')
    // Numbered lists
    .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[huplto])(.+)$/gim, '<p>$1</p>')
    // Clean up
    .replace(/<p><\/p>/g, '')
    .replace(/<p>\s*<\/p>/g, '')
    .trim();
}
