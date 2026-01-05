# AI Memory Products - Competitive Analysis

Date: 2026-01-04

---

## Executive Summary

| Product | Pricing Model | Starting Price | Target Market |
|---------|--------------|----------------|---------------|
| **Mem0** | Tiered (memories + API calls) | Free / $19-$249/mo | Individual devs to enterprise |
| **Zep** | Credit-based (episodes) | $25/mo + usage | Enterprise AI agents |
| **Letta** | Credit-based | Free / $20/mo | Agent developers |
| **Dust** | Per-seat | 29 EUR/user/mo (~$32) | Team AI assistants |
| **Pieces** | Per-seat | Free / $18.99/mo (Pro) | Individual developers |
| **Recall** | Per-seat | Free / $12/user/mo | Dev teams using AI coding tools |

**Our position:** Cheaper than all competitors, focused specifically on dev teams, works with existing AI tools.

---

## Detailed Analysis

### 1. Mem0 (mem0.ai)

**What They Do:** Memory layer for AI applications. Stores user preferences and context.

**Pricing:**
| Tier | Price | Memories | API Calls/Month |
|------|-------|----------|-----------------|
| Hobby | Free | 10,000 | 1,000 |
| Starter | $19/mo | 50,000 | 5,000 |
| Pro | $249/mo | Unlimited | 50,000 |
| Enterprise | Custom | Unlimited | Unlimited |

**What's Working:**
- 41,000+ GitHub stars
- $24M raised from YC, Peak XV
- Beat OpenAI by 26% accuracy in benchmarks

**What's NOT Working:**
- Open-source version requires complex Neo4j setup
- Failed basic memory retrieval in independent tests
- Memory extraction through LLM loses nuance

**Recall Differentiation:** Mem0 is for building AI apps. Recall is for teams *using* AI coding tools.

---

### 2. Zep (getzep.com)

**What They Do:** Temporal knowledge graph for AI agent memory.

**Pricing:**
| Tier | Price | Credits | Limits |
|------|-------|---------|--------|
| Free | $0 | 1,000/mo | Lower priority |
| Flex | $25/mo | 20,000 | 5 projects |
| Enterprise | Custom | Guaranteed | SOC2, HIPAA |

**What's Working:**
- Temporal knowledge graph is novel (tracks when facts were true)
- 20,000+ GitHub stars on Graphiti
- 94.8% accuracy on benchmarks

**What's NOT Working:**
- "Far from polished or reliable" per user reviews
- Credit-based = unpredictable costs
- Steep for smaller teams

**Recall Differentiation:** Zep is infrastructure for building agents. Recall is a complete solution.

---

### 3. Letta (formerly MemGPT)

**What They Do:** Platform for stateful AI agents with self-managed memory.

**Pricing:**
| Tier | Price | Credits | Storage |
|------|-------|---------|---------|
| Free | $0 | 5,000/mo | 1 GB |
| Pro | $20/mo | 20,000/mo | 10 GB |
| Enterprise | Custom | Volume | Unlimited |

**What's Working:**
- Strong open-source (Apache 2.0)
- #1 on Terminal-Bench for coding agents
- White-box system (inspect/edit memory)

**What's NOT Working:**
- Must layer IAM, VPC, compliance manually
- Credit-based model
- Steeper learning curve

**Recall Differentiation:** Letta is an agent platform. Recall works with existing tools.

---

### 4. Dust (dust.tt)

**What They Do:** AI agent platform for teams with company knowledge access.

**Pricing:**
| Tier | Price | Key Features |
|------|-------|--------------|
| Pro | 29 EUR/user/mo (~$32) | GPT-4, Claude, 1GB storage |
| Enterprise | Custom | SSO, SCIM, custom storage |

**What's Working:**
- Per-seat = predictable costs
- Strong integrations (Slack, GitHub, Notion)
- SOC 2 Type II, GDPR compliant
- 2,000+ organizations

**What's NOT Working:**
- "Steep learning curve"
- Support delays
- At $32/user adds up fast

**Recall Differentiation:** Dust is broad team AI. Recall is dev-focused, git-native.

---

### 5. Pieces for Developers

**What They Do:** Local-first AI tool with persistent memory.

**Pricing:**
| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | Copilot, local memory, chat history |
| Pro | $18.99/mo | Claude 4, Gemini 2.5, advanced AI |
| Teams | Contact | Shared context, custom LLMs |

**What's Working:**
- Local-first appeals to privacy-conscious devs
- Captures from IDE, browser, terminal, Slack
- 9 months context retention

**What's NOT Working:**
- Local-first = heavy resource usage
- Team pricing hidden
- Less mature than cloud competitors

**Recall Differentiation:** Pieces is individual-first. Recall is team-first, git-native.

---

## Pricing Model Comparison

| Model | Examples | Pros | Cons |
|-------|----------|------|------|
| Per-Seat | Dust ($32), Pieces ($19), **Recall ($12)** | Predictable, simple | Leaves value on table for power users |
| Usage/Credits | Mem0, Zep, Letta | Aligns with cost | Unpredictable, confusing |
| Tiered Flat | Mem0 ($19/$249) | Clear upgrade path | Massive tier jumps |

**Verdict:** Per-seat is right for Recall. Developers hate unpredictable bills.

---

## The "Just Expense It" Threshold

- **Under $10/mo:** Devs pay personally
- **$10-20/mo:** "Just expense it" - no approval needed
- **$20-50/mo:** May need manager nod
- **$50+/mo:** Formal procurement

**Recall at $12/seat is in the sweet spot.**

---

## Why $12/seat Works

1. **Cheaper than Copilot Business** ($19) - positioned as add-on
2. **Cheaper than Dust** ($32) - more focused
3. **Cheaper than Pieces Pro** ($19) - team-first
4. **Easy math:** 10 devs = $120/mo, trivial budget item
5. **ROI:** Needs to save 10 min/month to break even

---

## Positioning

```
                    HIGH VALUE CAPTURE
                          |
         Enterprise       |       Premium Dev Tools
              Dust        |       Pieces Pro
              Zep         |
                          |
    ----------------------+----------------------
                          |
         Commodity        |       Growth/Adoption
              Free OSS    |       RECALL ($12)
              Mem0 Hobby  |       GitHub Copilot
                          |
                    LOW VALUE CAPTURE

    USAGE-BASED <-----> PER-SEAT
```

Recall: High adoption potential, per-seat simplicity, right in the sweet spot.

---

## Key Takeaways

1. **$12/seat is competitive** - cheaper than all direct competitors
2. **Per-seat is correct** - matches dev tool expectations
3. **We may be underpriced** - but strategic for market entry
4. **Differentiation is clear** - git-native, team-first, works with existing tools
5. **The space is immature** - room for a focused, production-ready solution

---

## Sources

- Mem0: techcrunch.com, mem0.ai
- Zep: getzep.com, blog.getzep.com
- Letta: letta.com
- Dust: dust.tt
- Pieces: pieces.app
