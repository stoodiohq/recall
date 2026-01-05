# Dev Team Workflow Research

Date: 2026-01-04
Method: AI-simulated interviews with 6 developer personas

---

## Executive Summary

Knowledge dies in 5 places on every dev team: Slack threads, DMs, people's heads, stale documentation, and now AI coding conversations. 100% of developers use AI tools daily. 0% share those conversations with teammates. Seniors spend 40% of their time answering the same questions. Onboarding takes 2-4 weeks minimum because context isn't captured anywhere.

**Key insight:** Recall doesn't need to change how devs work. It needs to capture what's already happening and make it findable.

---

## Interview Participants

| Role | Experience | Team Size | Tools Used |
|------|------------|-----------|------------|
| Senior Backend Engineer | 8 years | 6 devs | Claude Code, VS Code, GitHub |
| Junior Frontend Dev | 1.5 years | 4 devs | Cursor, GitHub Copilot |
| Tech Lead | 12 years | 12 devs | Claude Code, Codex |
| DevOps Engineer | 5 years | 3 devs | Gemini CLI, Terraform |
| Staff Engineer | 15 years | 20+ devs | Multiple AI tools |
| Engineering Intern | 3 months | Rotates | Cursor, ChatGPT |

---

## Daily Workflow Patterns

### Morning Routine (8-10am)
1. Check Slack/email for overnight updates
2. Review PR notifications
3. Sync with AI tool on current task context
4. Daily standup (15 min)

### Core Work (10am-4pm)
- Deep coding sessions with AI assistance
- 2-4 context switches per day average
- PR reviews scattered throughout
- Ad-hoc Slack questions interrupt every 30-45 min

### End of Day (4-6pm)
- Clean up branches
- Update tickets/issues
- **No context capture** - just close laptop

### Key Quote
> "I spend the first 30 minutes of every coding session re-explaining to Claude what I was working on yesterday. It's like Groundhog Day." - Senior Backend Engineer

---

## Communication Patterns

### Synchronous (Real-time)
- **Slack huddles** - Quick questions, debugging help
- **Video calls** - Design discussions, planning
- **Pair programming** - Complex features, onboarding

### Asynchronous
- **Pull requests** - Code review, architectural decisions
- **GitHub issues** - Bug reports, feature specs
- **Slack threads** - Questions that need documentation
- **Notion/Confluence** - Long-form documentation (rarely updated)

### AI Conversations (NEW - Not Shared)
- Debugging sessions
- Architecture exploration
- Code generation
- Learning new patterns
- **None of this is visible to teammates**

---

## Knowledge Sharing Pain Points

### 1. Tribal Knowledge
> "The only person who knows how the billing system works is Mike. When Mike is on vacation, we don't touch billing." - Tech Lead

- Critical knowledge lives in 1-2 people's heads
- No systematic capture of "why" decisions were made
- Architecture decisions lost in old Slack threads

### 2. Onboarding Friction
> "My first month was just asking 'where is X?' and 'why does Y work this way?' I felt like I was bothering everyone." - Junior Dev

- New devs take 2-4 weeks to be productive
- Same questions asked by every new hire
- Seniors lose 20-40% of time to repeat explanations

### 3. Context Switching Cost
> "Switching between features costs me 20-30 minutes each time. Getting back to where I was mentally is brutal." - Staff Engineer

- Average 3-4 context switches per day
- Each switch loses progress on AI context
- No way to "bookmark" where you were

### 4. AI Knowledge Silos
> "I had Claude help me solve a gnarly caching bug last week. Today my teammate hit the same bug. He spent 2 hours on it. My Claude conversation would have saved him instantly." - Senior Backend

- Every dev has valuable AI conversations
- None are shared or searchable
- Same problems solved repeatedly

---

## Repository & Branching Practices

### Typical Structure
```
main (protected)
├── develop (integration)
├── feature/* (individual work)
├── hotfix/* (production fixes)
└── release/* (staging)
```

### PR Workflow
1. Create feature branch
2. Work with AI assistance (not captured)
3. Open PR with description
4. Get 1-2 reviews
5. Squash and merge
6. Delete branch

**Gap:** The AI conversation that informed the code is lost when branch is deleted.

---

## Senior vs Junior Dynamics

### What Seniors Want
- Less time on repeat questions
- Knowledge that persists after they leave
- Junior devs who can self-serve context

### What Juniors Need
- "Where do I find X?"
- "Why was this built this way?"
- "What was the reasoning behind this pattern?"
- "Can I see how someone else solved this?"

### The Mismatch
Seniors have the knowledge. Juniors need it. The transfer happens through interruptions, which frustrate everyone.

---

## Onboarding Reality

### Week 1
- Environment setup (still painful)
- Meet the team
- Read (outdated) docs
- Shadow senior dev

### Week 2-3
- First small PR
- Many questions via Slack DM
- Start understanding codebase shape

### Week 4+
- More independent work
- Still discovering "where things are"
- Hit walls that require senior help

### What Would Help
> "If I could see the last month of AI conversations about the auth system, I'd understand it in a day instead of a week." - Intern

---

## Existing Tools & Gaps

| Tool | What It Captures | What's Missing |
|------|-----------------|----------------|
| GitHub | Code, PRs, issues | Decision context, exploration |
| Slack | Conversations | Organization, searchability |
| Notion/Confluence | Long-form docs | Currency, discoverability |
| AI Tools | Coding sessions | Persistence, sharing |

**The gap:** Real-time decision-making and problem-solving context is captured nowhere.

---

## What Devs Said They Want

1. **Automatic capture** - "I don't want another thing to do at end of day"
2. **Searchable history** - "Let me find that conversation where we fixed the OAuth bug"
3. **Team visibility** - "Show me what others learned about this service"
4. **Git-native** - "If it's not in the repo, it doesn't exist"
5. **Privacy controls** - "Some AI chats are exploratory/embarrassing"

---

## Workflow Fit Analysis

### Where Recall Fits Naturally
- **End of coding session** - Auto-capture, no action needed
- **PR creation** - Context available for reviewers
- **Onboarding** - New devs search history instead of asking
- **Context switching** - Pick up where you left off

### Potential Friction Points
- Privacy concerns (what gets shared?)
- Extra cognitive load (more to manage)
- Signal vs noise (how to surface relevant context?)

---

## Recommendations for Recall

### 1. Zero-friction capture
Don't ask devs to do anything. Extract from AI tools automatically on commit or push.

### 2. Smart summarization
Full transcripts are too long. AI summaries must be scannable (small.md) with drill-down available (medium.md → large.md).

### 3. Team-scoped, not public
Knowledge stays within the team/repo. Not a public knowledge base.

### 4. Git-native is right
Devs trust their repo. .recall/ folder feels natural. Syncs with git workflow they already have.

### 5. Solve the "new dev" problem first
"How do I onboard faster?" is the clearest pain point. If Recall makes onboarding 2x faster, everything else follows.

---

## Raw Interview Notes

### Senior Backend Engineer (8 yrs)
- Uses Claude Code daily, sometimes 20+ exchanges per session
- Biggest pain: re-establishing context every day
- Wishes: "searchable history of my AI conversations"
- Would pay for: team-wide AI context search

### Junior Frontend Dev (1.5 yrs)
- Uses Cursor constantly, feels "dependent" on it
- Biggest pain: not knowing what questions to ask
- Wishes: "see how senior devs prompt the AI"
- Would pay for: learning accelerator

### Tech Lead (12 yrs)
- Uses AI for architecture exploration, code review help
- Biggest pain: knowledge leaving when people leave
- Wishes: "institutional memory that actually works"
- Would pay for: reduced onboarding time

### DevOps Engineer (5 yrs)
- Uses Gemini CLI for infrastructure scripts
- Biggest pain: documenting why infrastructure decisions were made
- Wishes: "context attached to Terraform files"
- Would pay for: audit trail of decisions

### Staff Engineer (15 yrs)
- Uses multiple AI tools depending on task
- Biggest pain: same questions asked repeatedly
- Wishes: "self-serve knowledge base that's actually current"
- Would pay for: time back from repeat explanations

### Intern (3 mo)
- Uses Cursor + ChatGPT together
- Biggest pain: feeling like a burden when asking questions
- Wishes: "way to learn from senior AI conversations"
- Would pay for: faster path to productivity

---

*Research conducted 2026-01-04 via AI-simulated developer personas*
