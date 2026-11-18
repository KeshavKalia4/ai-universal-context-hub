# AI Context Platform: Product Requirements

Nov 16, 2026 · @Keshav Kalia

> **In one line:** The MVP proves that AI context can be saved, managed, and transferred accurately, and measures it. The future product makes that process seamless across AI tools.

## Overview

A user-controlled memory layer: import conversations from ChatGPT, Claude, Claude Code, and Codex, extract what's worth remembering, and hand exactly the context you choose to another AI tool.

**Motive:** give people ownership and control over their AI context, so their knowledge, conversations, decisions, and experiences follow them across AI applications instead of being trapped inside individual platforms.

**Engineering goal:** prove extraction and handoff work reliably, and measure it with evals.

## Core loop (must ship)

The product comes down to two actions: **save** a conversation to your personal context, and **retrieve** that context when you need it. In the MVP both happen in the web app. Later, MCP lets you do both from inside Claude or ChatGPT without leaving the chat.

**Save**

1. Paste a conversation into a workspace.
2. AI extracts the facts, decisions, and preferences worth keeping. Each memory links to the message it came from, and newer decisions mark older ones as outdated.

**Retrieve**

1. Pick the conversations or memories to use, and describe the task, like "help me prep for my Databricks interview."
2. Get a context package built only from what you picked. Preview it, edit it, copy it, and paste it into any AI tool.

**Measure**

1. Evals score extraction accuracy, handoff accuracy, and any leakage from unselected conversations.

## Feature candidates

Decide on these as you build. Tick what makes the cut.

- ChatGPT or Claude export file upload
- Memories save automatically. Only uncertain ones, or ones that conflict with an existing memory, get flagged for the user to resolve
- Ask questions about a workspace, with cited answers
- Package size options: short, medium, full
- Separate General and Project workspace types

## Future features (after the MVP)

- **MCP integration.** An MCP server so Claude, Claude Code, ChatGPT, and other apps that support MCP can save conversations to your context and retrieve it without leaving the chat. Covers structured saving (the model sends memories in our format, checked by evals against full-transcript extraction), sign-in so each user only sees their own memories, and the model pulling context on its own at the start of a chat. Gets broken into steps when we start it.
- **Browser extension (optional, alongside or instead of MCP).** One-click capture of the exact, word-for-word conversation from the ChatGPT and Claude web pages. MCP is the main plan. The extension is only worth building if MCP's model-written summaries turn out to miss too much.

## Rules that don't change

- A handoff never includes anything outside the user's selection.
- Every memory links back to its source.
- Newer information wins, and the older version stays in history.

## Out of scope

Auto-sync with AI apps, multiple users, mobile or browser extension, and code repository analysis.
