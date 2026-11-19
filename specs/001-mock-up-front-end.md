# AI Context Platform: Mockup Spec

## Purpose

A clickable mockup of the MVP web app, used to check that the screens and flows make sense before real development. This is throwaway: use fake data, any stack, and no backend.

## What the product does

Users paste AI conversations into workspaces. The app extracts the facts, decisions, and preferences worth keeping as "memories." Users work with those memories through one Chat: ask questions, request a prompt to brief another agent, create a briefing, or draft a SKILL.md. They choose the context Chat can use, refine outputs conversationally, and edit, copy, or download the result.

## Layout

- Left sidebar: list of workspaces and a New Workspace button.
- Inside a workspace, a top bar shows the workspace name, tabs for Home, Memories, and Chat, and a primary Import button.

## Screens

### 1. Workspaces list
- Grid of workspace cards showing name, type badge (General or Project), number of conversations, number of memories, and last updated.
- New Workspace opens a dialog asking for name and type. Saving goes to the new workspace's home.
- Each card has a menu with Rename and Delete. Delete asks for confirmation.

### 2. Workspace home
- Three stat cards: conversations, memories, and flagged memories. The flagged card links to the Memories screen.
- Conversations list showing title, source tool icon, import date, number of memories, and extraction status (Processing, Done, or Failed). Clicking one opens Conversation detail.
- Recent outputs list showing the title, filename, source memory count, date, and a link that reopens the output in Chat.

### 3. Import
- Fields: title, source tool (ChatGPT, Claude, Claude Code, Codex, Other), and a large text area to paste the conversation.
- Below the text area, a live preview of the conversation split into turns labeled User and Assistant.
- Saving returns to Workspace home, where the new conversation shows Processing, then switches to Done after a few seconds.

### 4. Conversation detail
- Left side: the conversation's turns.
- Right side: memories extracted from it.
- Clicking a memory scrolls to and highlights the turn it came from.

### 5. Memories
- Flagged memories appear first, in their own section.
- Filters for type (fact, preference, decision, requirement, plan, open question) and status (Confirmed, Outdated).
- Each memory shows its text, type badge, source conversation, and an "Inferred" badge if the AI inferred it rather than the user stating it.
- Every memory can be edited inline, deleted, or opened at its source.
- Conflict flag: the new memory and the existing one shown side by side, with buttons Keep New (the old one becomes Outdated), Keep Old, and Keep Both.
- Low-confidence flag: the memory and the turn it came from, with buttons Confirm, Edit, and Delete.

### 6. Chat (replaces Ask and Handoff)

One conversation for exploring context and creating outputs. Do not make users choose between an answering tool and a handoff wizard.

**Visible context scope**
- A bar above Chat shows the current workspace, scope, memory count, and conversation count.
- Default scope is This workspace: all Confirmed memories from this workspace. Outdated memories are excluded by default. Flagged and inferred memories keep their uncertainty labels in generated outputs.
- Choose context opens a checklist of conversations and individual memories. Conversation selection checks its memories; partial selection shows an indeterminate checkbox. Unselected memories look dimmed.
- Applying a selection uses only checked memories. Selected historical memories may be included explicitly and must be labeled Outdated.
- A Selected scope with nothing checked disables sending and offers Choose context or Import.
- Every answer, citation, output, and refinement must use only memories in the active scope. It must never pull from another workspace or widen selection automatically.
- Changing scope clears the active output panel. Earlier messages remain visibly labeled with their original scope count; reopening an older output shows its saved sources and warns when those differ from the current scope.

**Conversation**
- Suggested starters: "What decisions have I made?", "Give me a prompt to get a new agent up to speed", "Create a SKILL.md from my preferences", and "Summarize my current situation".
- Questions return answers with clickable source chips. A chip opens the memory text, conversation name, and original source turn, with an option to open the conversation if it still exists.
- Requests for prompts, briefings/summaries, or SKILL.md drafts create an editable output beside the conversation.
- Follow-up requests can create a shorter version, a longer version with source labels, or a different supported output format. Revisions create new outputs; existing outputs and manual edits stay available.
- Refinement can use a prior output only when all of its sources remain within the current scope. A scope change must not bring excluded context back through conversation history or an earlier artifact.
- New chat clears the current conversation and active output, while saved outputs stay accessible from Home.
- Chat messages, scope, composer draft, output edits, and active output persist in this browser and stay separate for each workspace.

### 7. Editable output panel

- Appears beside Chat on wide screens and below it on narrow screens.
- Shows output title, filename, editable Markdown, source count, conversation count, and saved scope.
- Supported examples: agent-prompt.md, context-briefing.md, and SKILL.md. The request determines the format; no separate generation wizard is required.
- SKILL.md is a generic draft with name/description frontmatter and instructions. Display that users must review compatibility with the receiving agent; do not imply it is installed or universally compatible.
- Copy copies the current edited text and shows a Copied confirmation. Download saves that exact text as a Markdown file using the displayed filename.
- Sources lists the memories used, each opening its saved source details. Source snapshots remain inspectable even after a memory is edited or deleted. User edits may add text not supported by these citations; state this next to Sources.
- Close hides the output panel. Reopen outputs from a message or Home without losing edits.

## Mock behavior

- Keep the mockup browser-local and dependency-free, with no live AI service, backend, authentication, or network generation requests.
- Label Chat clearly as simulated. Use deterministic templates for answers, prompts, briefings, skill drafts, and supported refinements so the interaction can be tested without an AI model.
- Shorter outputs use fewer cited memories; expanded outputs add source labels. Unsupported requests may return a scoped answer or an explanation rather than pretending arbitrary AI behavior works.
- Keep existing imports, extraction previews, memory management, and fake extraction behavior.
- Preserve existing browser-local data. Migrate old handoffs to saved briefing outputs without rewriting their text; old Ask/Handoff URLs should open the corresponding Chat experience.

## States

**Loading:** placeholder skeletons shaped like each screen. Chat shows a working indicator and disables sending, scope changes, and New chat while a response is pending. Buttons show a spinner while working.

**Empty:**
- No workspaces: "Create your first workspace" with the New Workspace button.
- No conversations: "Import a conversation to start building context" with the Import button.
- No memories: "Memories appear here after you import a conversation."
- No flagged memories: hide the flagged section.
- No context selected in Chat: sending and suggestions are disabled, with the hint "Select at least one conversation or memory."
- No matching memories for a question or requested output: explain that no matching context exists in the current scope; do not fall back to another scope.
- No output yet: show an explanatory panel with examples of supported output formats.

**Error:**
- Something failed to load: an inline message with a Retry button. Never a blank screen.
- Chat response failed: keep the typed request, show an inline error with Retry, and keep the existing output intact.
- Extraction failed: the conversation shows Failed with a Retry Extraction option.
- Pasted text can't be split into turns: show "Couldn't detect User and Assistant turns" and allow saving it as one block anyway.

## Fake data to include

- 2 workspaces: one General ("Job Search") and one Project ("Context Platform Build").
- 3 conversations in each.
- About 15 memories in each, including one conflict flag and one low-confidence flag.
- 2 saved briefing outputs in each, available from Home.

## Acceptance checks

- Home, Memories, and Chat are the only workspace tabs; Import remains a primary action.
- Selecting one conversation and requesting a prompt produces no memories from any other conversation.
- Questions, skill drafts, and follow-up refinements obey the same scope boundary.
- Changing workspace never carries over chat history, scope, or active output.
- "Make it shorter" creates a new, shorter output without overwriting manual edits in the previous one.
- Copy and Download use the edited output text; source chips open the correct saved source details.
- Reloading retains chat history, scope, and output edits.
- Existing saved handoffs reopen as outputs through both Home and legacy URLs.
- Chat, context selection, source dialogs, and editable outputs remain usable on a narrow viewport.
