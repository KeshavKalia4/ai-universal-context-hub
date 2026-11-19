export const types = ['fact', 'preference', 'decision', 'requirement', 'plan', 'open question'];
export const uid = () => globalThis.crypto.randomUUID();
export function parseTurns(text) {
  const lines = text.trim().split('\n');
  const turns = [];
  for (const line of lines) {
    const match = line.match(/^\s*(User|Assistant|You said|ChatGPT said):\s*(.*)$/i);
    if (match) turns.push({ id: uid(), role: /^(user|you said)$/i.test(match[1]) ? 'user' : 'assistant', text: match[2] });
    else if (turns.length) turns.at(-1).text += '\n' + line;
    else if (line.trim()) turns.push({ id: uid(), role: 'user', text: line });
  }
  return { detected: /^\s*(User|Assistant|You said|ChatGPT said):/im.test(text), turns };
}
export function resolveFlag(store, id, action) {
  const memory = store.memories.find(m => m.id === id);
  if (!memory) return;
  const old = store.memories.find(m => m.id === memory.conflictsWith);
  if (action === 'keep_new' && old) { old.status = 'outdated'; old.flag = null; }
  if (action === 'keep_old') memory.status = 'outdated';
  memory.flag = null;
}
export function generatePackage(store, { workspaceId, memoryIds, task, size }) {
  const selected = new Set(memoryIds);
  const memories = store.memories.filter(m => m.workspaceId === workspaceId && selected.has(m.id));
  if (!memories.length) throw new Error('Select at least one conversation or memory.');
  const sections = memories.map(m => ({ memoryId: m.id, text: size === 'full' ? `[${m.type.toUpperCase()} · ${m.status}] ${m.text}\nSource: ${store.conversations.find(c => c.id === m.conversationId)?.title || 'Manual memory'}` : size === 'short' ? m.text : `• ${m.text} (${m.type})` }));
  return { id: uid(), workspaceId, task, size, memoryIds: memories.map(m => m.id), conversationIds: [...new Set(memories.map(m => m.conversationId))], sections, output: `# Context for your next conversation\n\nTask: ${task}\n\n${sections.map(s => s.text).join('\n\n')}`, createdAt: new Date().toISOString() };
}
export function seed() {
  const workspaces = [{ id: 'job-search', name: 'Job Search', type: 'general', description: 'The next chapter starts with the right context.', color: 'purple' }, { id: 'context-build', name: 'Context Platform Build', type: 'project', description: 'Decisions, discoveries, and everything we’re building.', color: 'blue' }];
  const conversations = [], memories = [], handoffs = [];
  const data = [
    [
      ['Databricks interview prep', 'ChatGPT', ['I’m interviewing for a software engineering role at Databricks.', 'I want to focus on distributed systems and SQL.', 'My interview is on November 24.', 'I prefer practicing with concrete examples.', 'Create a week-long interview study plan.']],
      ['My experience & career goals', 'Claude', ['I built an AI-powered context platform.', 'I have experience with TypeScript and Python.', 'I’m interested in developer tools and AI infrastructure.', 'I prefer remote roles.', 'I plan to prepare two project stories for interviews.']],
      ['Interview strategy', 'Codex', ['I prefer hybrid roles in Seattle.', 'Use the STAR format for behavioral answers.', 'Keep answers concise and specific.', 'I should review SQL window functions.', 'Which team at Databricks fits my interests best?']]
    ],
    [
      ['Product direction & MVP', 'Claude', ['The MVP helps people carry context between AI tools.', 'Workspaces separate personal topics and projects.', 'A handoff must only include selected memories.', 'Every memory must link to its source turn.', 'Start with a clickable mockup before building the backend.']],
      ['Architecture exploration', 'Claude Code', ['Use a hosted relational database for production.', 'Keep the mockup frontend independent of the backend.', 'The first version uses pasted conversations.', 'Use browser storage for mockup persistence.', 'I plan to evaluate extraction and handoff accuracy.']],
      ['Design & interaction notes', 'ChatGPT', ['Use a local JSON file for mockup persistence.', 'Make uncertain memories visible for review.', 'Keep navigation calm and easy to scan.', 'The user should preview and edit a context package.', 'Should we support exporting packages as files?']]
    ]
  ];
  workspaces.forEach((w, wi) => {
    data[wi].forEach(([title, tool, texts], ci) => {
      const id = `${w.id}-c${ci}`;
      const turns = texts.flatMap((text, ti) => [{ id: `${id}-u${ti}`, role: 'user', text }, { id: `${id}-a${ti}`, role: 'assistant', text: `Noted. I’ll use this context as we continue: ${text}` }]);
      conversations.push({ id, workspaceId: w.id, title, sourceTool: tool, importedAt: `2026-11-${16 + (ci % 2)}T10:00:00`, status: 'done', turns });
      texts.forEach((text, mi) => memories.push({ id: `${id}-m${mi}`, workspaceId: w.id, conversationId: id, turnId: `${id}-u${mi}`, text, type: (wi === 0 ? [['fact','plan','fact','preference','plan'],['fact','fact','preference','preference','plan'],['preference','decision','preference','plan','open question']] : [['fact','decision','requirement','requirement','plan'],['decision','requirement','decision','decision','plan'],['decision','requirement','preference','requirement','open question']])[ci][mi], status: 'confirmed', inferred: mi === 3 && ci === 1, flag: ci === 2 && mi === 0 ? 'conflict' : ci === 1 && mi === 3 ? 'low_confidence' : null, conflictsWith: ci === 2 && mi === 0 ? `${w.id}-c1-m3` : null }));
    });
    for (let i = 0; i < 2; i++) {
      const ids = memories.filter(m => m.workspaceId === w.id && m.conversationId.endsWith(`c${i}`)).map(m => m.id);
      const h = generatePackage({ conversations, memories }, { workspaceId: w.id, memoryIds: ids, task: wi ? ['Plan the MVP implementation', 'Review the architecture options'][i] : ['Prepare for my Databricks interview', 'Refine my project stories'][i], size: i ? 'short' : 'medium' });
      h.id = `${w.id}-h${i}`; h.createdAt = `2026-11-${17 - i}T14:30:00`; handoffs.push(h);
    }
    w.updatedAt = '2026-11-18T10:00:00';
  });
  return { workspaces, conversations, memories, handoffs };
}
