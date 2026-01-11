# Recall Team Memory

This directory contains encrypted team memory files managed by [Recall](https://recall.team).

These files are encrypted with your team's key. Only team members with active Recall subscriptions can decrypt and read them.

## Files

- **context.md** - Team brain (~1.5-3k tokens) - loaded every session
- **history.md** - Encyclopedia (~30k tokens) - for onboarding and deep dives
- **sessions/** - Individual session records (~1.5k each) - full transcripts

## Usage

1. Install the Recall MCP server in your AI coding tool
2. Authenticate with `recall_auth`
3. Memory is automatically loaded and updated

Learn more at [recall.team](https://recall.team)
