import { uid } from './model.js';

// Preserve browser-local v1 handoffs as editable outputs, including their original text.
export function migrateChat(store) {
  store.chats ||= {};
  store.artifacts ||= [];
  for (const h of store.handoffs || []) {
    if (store.artifacts.some(a => a.id === h.id)) continue;
    const sources = snapshotSources(store, h.workspaceId, h.memoryIds);
    store.artifacts.push({ ...h, kind: 'briefing', title: h.task, filename: 'context-briefing.md', sources, request: h.task, legacy: true });
  }
  return store;
}
export function chatState(store, workspaceId) {
  store.chats ||= {};
  return store.chats[workspaceId] ||= { messages: [], scope: 'workspace', memoryIds: [], activeArtifactId: null, draft: '' };
}
export function scopeMemories(store, workspaceId, scope, memoryIds = []) {
  const selected = new Set(memoryIds);
  return store.memories.filter(m => m.workspaceId === workspaceId && (scope === 'workspace' ? m.status === 'confirmed' : selected.has(m.id)));
}
function snapshotSources(store, workspaceId, ids) {
  const selected = new Set(ids);
  return store.memories.filter(m => m.workspaceId === workspaceId && selected.has(m.id)).map(m => {
    const conversation = store.conversations.find(c => c.id === m.conversationId && c.workspaceId === workspaceId);
    return { ...m, conversationTitle: conversation?.title || 'Manual memory', sourceText: conversation?.turns.find(t => t.id === m.turnId)?.text || '' };
  });
}
export function respondToChat(store, { workspaceId, memoryIds, request, previousArtifact }) {
  const sources = snapshotSources(store, workspaceId, memoryIds);
  if (!sources.length) throw new Error('Select at least one conversation or memory.');
  const q = request.trim();
  if (!q) throw new Error('Tell me what you’d like to do with your context.');
  const refinement = /\b(shorter|shorten|concise|longer|expand|detailed|rewrite|refine|revise|format|include|add|remove|make (it|this)|turn (it|this))\b/i.test(q);
  // Prior output can guide the format only when every prior source remains in scope.
  const safePrior = previousArtifact && previousArtifact.workspaceId === workspaceId && previousArtifact.sources?.every(s => sources.some(m => m.id === s.id)) ? previousArtifact : null;
  let kind = /skill(?:\.md)?/i.test(q) ? 'skill' : /\bprompt\b/i.test(q) ? 'prompt' : /\b(briefing|summary|summarize|summarise|package|handoff|hand off|up to speed)\b/i.test(q) ? 'briefing' : refinement && safePrior ? safePrior.kind : null;
  if (!kind) {
    let matches = sources;
    if (/decision/i.test(q)) matches = sources.filter(m => m.type === 'decision');
    else if (/prefer/i.test(q)) matches = sources.filter(m => m.type === 'preference');
    else {
      const words = q.toLowerCase().match(/[a-z]{4,}/g) || [];
      matches = [...sources].sort((a,b) => words.filter(x=>b.text.toLowerCase().includes(x)).length - words.filter(x=>a.text.toLowerCase().includes(x)).length);
    }
    matches = matches.slice(0,4);
    return { text: matches.length ? `Here’s what your selected context says:\n\n${matches.map(m=>'• '+m.text).join('\n\n')}\n\nI can turn this context into a prompt, a briefing, or a SKILL.md draft.` : 'No memories of that type are available in this scope. Try a different question or explicitly change your context selection.', sources: matches, artifact: null };
  }
  const short = /\b(shorter|shorten|concise|brief|short)\b/i.test(q);
  const detailed = /\b(longer|expand|detailed|sources|full)\b/i.test(q);
  // A shorter output uses a smaller, explicitly cited subset; it never broadens scope.
  const relevant = refinement && safePrior ? sources.filter(m=>safePrior.sources.some(s=>s.id===m.id)) : /prefer/i.test(q) ? sources.filter(m=>m.type==='preference') : /decisions/i.test(q) ? sources.filter(m=>m.type==='decision') : sources;
  if(!relevant.length) return {text:'No matching memories are available in this scope. Choose different context or ask for another output.',sources:[],artifact:null};
  const used = short ? relevant.slice(0,3) : relevant;
  const bullets = used.map(m => `- ${m.text}${m.status === 'outdated' ? ' [Outdated — historical context]' : ''}${m.flag ? ' [Needs review]' : ''}${m.inferred ? ' [Inferred]' : ''}${detailed ? `\n  Source: ${m.conversationTitle}` : ''}`).join('\n');
  const purpose = refinement && safePrior ? safePrior.request : q;
  let output, title, filename;
  if (kind === 'skill') {
    title='Reusable context skill';filename='SKILL.md';
    output=`---\nname: workspace-context\ndescription: Apply the selected workspace context when assisting with related tasks.\n---\n\n# Workspace context\n\n## When to use\n\nUse when the user asks for help related to the context below.\n\n## Context\n\n${bullets}\n\n## Instructions\n\n- Use these facts and preferences only where relevant.\n- Treat outdated items as history and flagged or inferred items as uncertain.\n- Ask for missing details; do not invent decisions or personal facts.\n- Follow the receiving agent’s project instructions and current user request.\n\n## Requested purpose\n\n${purpose}\n\n${refinement ? '## Revision request\n\n'+q+'\n\n' : ''}<!-- Mock draft: review and adapt to your target agent’s skill format before use. -->`;
  } else if (kind === 'prompt') {
    title='Prompt for your next agent';filename='agent-prompt.md';
    output=`# Bring a new agent up to speed\n\nUse the following context to help me with this task:\n\n${purpose}\n\n## Relevant context\n\n${bullets}\n\n## How to help\n\nUse only the context above. Identify uncertainties, ask for missing information, and propose concrete next steps.${refinement ? '\n\n## Requested revision\n\n'+q : ''}`;
  } else {
    title='Context briefing';filename='context-briefing.md';
    output=`# Context briefing\n\n## Purpose\n\n${purpose}\n\n## What to know\n\n${bullets}\n\n${detailed ? '## Working boundaries\n\nThis briefing only uses the listed memories. Outdated items are history; flagged and inferred items need review.\n\n' : ''}${refinement ? '## Requested revision\n\n'+q+'\n\n' : ''}Review this briefing before sharing it with another tool.`;
  }
  if(short) {
    output = kind === 'skill' ? `---\nname: workspace-context\ndescription: Use the selected context for related tasks.\n---\n\n# Workspace context\n\n${bullets}\n\n## Instructions\n\nUse only this context, respect uncertainty labels, and ask for missing details. Adapt this draft to the receiving agent’s skill format.` : kind === 'prompt' ? `# Agent prompt\n\n${purpose}\n\n${bullets}\n\nUse this context. Ask about missing details.` : `# Briefing\n\n${purpose}\n\n${bullets}`;
  }
  const artifact = { id:uid(),workspaceId,kind,title,filename,request:purpose,revisionRequest:q,output,sources:used,memoryIds:used.map(m=>m.id),scopeMemoryIds:sources.map(m=>m.id),conversationIds:[...new Set(used.map(m=>m.conversationId))],createdAt:new Date().toISOString() };
  return { text:`I’ve ${refinement && safePrior ? 'created a revised' : 'created a'} ${kind === 'skill' ? 'SKILL.md draft' : kind} using ${used.length} ${used.length===1?'memory':'memories'} from your selected context. Review and edit it in the output panel before sharing.${kind === 'skill' ? ' This is a generic draft; adapt it to your target agent’s format.' : ''}`, sources:used, artifact };
}
