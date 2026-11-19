# AI Universal Context Hub

A browser-local, clickable mockup of the AI Context Platform. Implements [spec 001](specs/001-mock-up-front-end.md) with fake data, simulated responses, and no backend, live AI, or external dependencies.

## Run locally

With Node.js 20 or newer:

```sh
npm run dev
```

Open http://localhost:4173. Alternatively, serve the repository with `python3 -m http.server 4173 --bind 127.0.0.1`.

```sh
npm test
```

## Try it

- Open **Job Search** or **Context Platform Build**. Create, rename, or delete a workspace from the workspace list.
- Import a conversation using `User:` / `Assistant:` or `You said:` / `ChatGPT said:` labels. Unlabeled text can be saved as one block. Processing completes after three seconds; use the failure checkbox to try Failed → Retry Extraction. Mock memories copy source user turns.
- Review conflicts and uncertain memories, edit inline, filter by type/status, and inspect original source turns.
- **Chat** combines questions and output generation. The visible scope defaults to this workspace’s Confirmed memories. **Choose context** lets you select conversations or individual memories, including historical ones. Nothing outside that scope can be used.
- Ask “What decisions have I made?”, “Give me a prompt to get a new agent up to speed”, “Create a SKILL.md from my preferences”, or “Summarize my current situation”. Follow up with “Make it shorter” or “Make it more detailed with sources”. These are deterministic demonstrations, not real AI reasoning.
- Prompts, briefings, and generic SKILL.md drafts appear beside Chat. Edit the text, **Copy**, or **Download** it as Markdown. Open **Sources** to inspect the memory and original turn captured at generation time. Skill drafts need review for the receiving agent’s format.
- Revisions create new outputs. Manual edits remain in older versions. **New chat** clears the current messages; saved outputs remain accessible from **Home → Recent outputs**.
- Each workspace remembers its chat, context scope, composer draft, and active output. Changing scope clears the active panel; older output snapshots retain their original sources. Reopening one outside the current scope displays a warning.
- Use **Preview** to inspect loading, empty, and error states. Reset demo data with the adjacent reset button.

All changes persist in this browser’s localStorage. Existing handoffs migrate to saved briefing outputs without changing their text, and older Ask/Handoff links redirect to Chat. Initial data has two workspaces, six conversations, thirty memories, and four saved outputs. Source snapshots describe the generated draft; text you add manually may not be supported by those sources.

There is no authentication, sync, real extraction, or server persistence. Hash routes work on a basic static server (for example `/#/w/job-search/chat`). Use this server for local development only.
