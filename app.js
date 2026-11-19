import { seed, uid, types, parseTurns, resolveFlag } from './model.js';
import { migrateChat } from './chat-model.js';
import { createChatUI } from './chat-ui.js';
const KEY = 'context-platform-mockup-v1';
let store;
try { store = JSON.parse(localStorage.getItem(KEY)) || seed(); } catch { store = seed(); }
migrateChat(store);
const app = document.querySelector('#app');
const dialog = document.querySelector('#dialog');
let mode = 'normal', filterType = '', filterStatus = '', highlighted = '', toastTimer;
let importDraft = { title: '', tool: 'ChatGPT', text: '' };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icons = {
 grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 layers:'<path d="m12 3 10 5-10 5L2 8Z"/><path d="m2 12 10 5 10-5M2 16l10 5 10-5"/>',
 plus:'<path d="M12 5v14M5 12h14"/>', chat:'<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9H13a8.5 8.5 0 0 1 8 8v.5Z"/>',
 memory:'<path d="M9 4a3 3 0 0 0-5 3 4 4 0 0 0-1 7 4 4 0 0 0 6 5M15 4a3 3 0 0 1 5 3 4 4 0 0 1 1 7 4 4 0 0 1-6 5M9 4v16M15 4v16M4 10h5m6 4h5"/>',
 send:'<path d="m22 2-7 20-4-9L2 9Z"/><path d="M22 2 11 13"/>', upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', flag:'<path d="M4 22V3m0 0c6-5 10 5 16 0v11c-6 5-10-5-16 0"/>', check:'<path d="m5 12 4 4L19 6"/>', more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>', chevron:'<path d="m9 5 7 7-7 7"/>', copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>', spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>', folder:'<path d="M3 7V4h7l2 3h9v13H3Z"/>', search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>', close:'<path d="m6 6 12 12M6 18 18 6"/>', edit:'<path d="m15 4 5 5M3 21l5-1L21 7l-5-5L3 15Z"/>', trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>', logout:'<path d="M9 4H3v16h6M13 8l4 4-4 4m-5-4h13"/>', book:'<path d="M12 5C8 2 4 3 2 4v16c3-1 7-1 10 1 3-2 7-2 10-1V4c-2-1-6-2-10 1Zm0 0v16"/>'
};
const icon = (name, cls='') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.layers}</svg>`;
const button = (label, action, cls='secondary', extra='') => `<button type="button" class="btn ${cls}" data-action="${action}" ${extra}>${label}</button>`;
const href = (path, text, cls='') => `<a class="${cls}" href="#${path}">${text}</a>`;
const date = s => new Date(s).toLocaleDateString('en-US', { month:'short', day:'numeric' });
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { toast('Browser storage is unavailable. Changes last for this session.'); } };
const wsMem = w => mode === 'empty' ? [] : store.memories.filter(m => m.workspaceId === w.id);
const wsCon = w => mode === 'empty' ? [] : store.conversations.filter(c => c.workspaceId === w.id);
const wsHand = w => mode === 'empty' ? [] : store.artifacts.filter(h => h.workspaceId === w.id);
const tool = name => `<span class="tool tool-${name.toLowerCase().split(' ')[0]}" title="${esc(name)}">${name === 'ChatGPT' ? '◎' : name === 'Claude' ? '✳' : name === 'Claude Code' ? '⌘' : name === 'Codex' ? '❯' : '◈'}</span>`;
function toast(message) { const el = document.querySelector('#toast'); el.textContent = message; el.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 3200); }
function route() { return (location.hash.slice(1) || '/').split('/').filter(Boolean); }
function go(path) { if (location.hash === '#'+path) render(); else location.hash = path; }
function heading(eyebrow, title, subtitle, action='') { return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${subtitle}</p></div>${action}</div>`; }
function empty(title, text, action='') { return `<div class="empty">${icon('layers')}<h3>${title}</h3><p>${text}</p>${action}</div>`; }
function skeleton(page='workspaces') {
 const block=(cls)=>`<div class="skeleton ${cls}"></div>`;
 const rows=Array.from({length:4},()=>block('list-skeleton')).join('');
 const two=(left,right)=>`<div class="detail-layout"><section>${left}</section><section>${right}</section></div>`;
 const body=page==='workspaces'?`<div class="workspace-grid">${block('tall-skeleton')}${block('tall-skeleton')}</div>`:page==='import'?`<div class="form-grid">${block('list-skeleton')}${block('list-skeleton')}</div>${block('tall-skeleton')}`:page==='conversations'?two(rows,block('tall-skeleton')):page==='chat'?two(block('chat-skeleton'),block('tall-skeleton')):page==='memories'?block('stat-skeleton')+rows:`<div class="stats">${[1,2,3].map(()=>block('stat-skeleton')).join('')}</div>${rows}`;
 return `<div class="skeleton-wrap" aria-label="Loading" role="status">${block('title-skeleton')}${body}</div>`;
}
function render() {
  const p = route(), w = store.workspaces.find(w => w.id === p[1]);
  if (w && ['ask','handoff'].includes(p[2])) { location.replace('#/w/'+w.id+'/chat'+(p[3]?'/'+p[3]:'')); return; }
  const page = p[2] || 'home';
  app.innerHTML = `<aside class="sidebar"><a class="brand" href="#/">${icon('layers')}<span>context<span class="brand-dot">.</span></span></a><div class="sidebar-tagline">Your knowledge, carried forward.</div>${href('/', `${icon('grid')} All workspaces`, `side-link ${!w?'active':''}`)}<div class="side-label">YOUR WORKSPACES <span>${store.workspaces.length}</span></div><div class="workspace-nav">${store.workspaces.map(s=>href(`/w/${s.id}`, `<span class="workspace-initial ${s.color}">${s.type === 'project'?icon('folder'):icon('layers')}</span><span>${esc(s.name)}</span>`, `side-link ${s.id===w?.id?'active':''}`)).join('')}</div>${button(`${icon('plus')} New workspace`, 'new-workspace', 'side-new')}<div class="sidebar-bottom"><div class="local-note">${icon('book')}<div><strong>A little context goes a long way.</strong><p>Save what matters.<br>Take it anywhere.</p></div></div><div class="profile"><span class="avatar">KK</span><div><strong>Keshav Kalia</strong><small>Personal workspace</small></div><span class="profile-mark">K</span></div></div></aside><div class="main-shell"><header class="topbar"><div class="breadcrumbs">${href('/', 'Workspaces')}${w?`${icon('chevron')}<strong>${esc(w.name)}</strong>`:''}</div><div class="prototype-controls"><span class="prototype-badge">Interactive mockup</span><label class="sr-only" for="demo-state">Preview state</label><select id="demo-state" aria-label="Preview state"><option value="normal">Preview: Normal</option><option value="loading">Preview: Loading</option><option value="empty">Preview: Empty</option><option value="error">Preview: Error</option></select><button class="icon-btn" data-action="reset" aria-label="Reset demo data" title="Reset demo data">↻</button></div></header>${w?`<div class="workspace-header"><div class="workspace-title"><span class="workspace-initial ${w.color}">${icon(w.type==='project'?'folder':'layers')}</span><strong>${esc(w.name)}</strong><span class="badge">${w.type==='project'?'Project':'General'}</span></div><div class="workspace-tabs"><nav aria-label="Workspace">${[['home','Home'],['memories','Memories'],['chat','Chat']].map(([k,t])=>href(`/w/${w.id}${k==='home'?'':'/'+k}`,t,page===k?'selected':'')).join('')}</nav>${href(`/w/${w.id}/import`, `${icon('plus')} Import conversation`, 'btn primary')}</div></div>`:''}<main id="main">${p[0] && !w ? empty('Workspace not found','This workspace may have been deleted.',href('/','All workspaces','btn primary')) : mode==='loading' ? skeleton(w?page:'workspaces') : mode==='error' ? `<div class="error-state">${icon('flag')}<h2>Something couldn’t load</h2><p>Your context is still here. Give it another try.</p>${button('Retry','retry','primary')}</div>` : !w ? workspacesPage() : page==='home'?homePage(w):page==='import'?importPage(w):page==='conversations'?conversationPage(w,p[3]):page==='memories'?memoriesPage(w):page==='chat'?chatUI.page(w,p[3]):empty('Page not found','Choose a workspace tab to continue.')}</main><footer class="app-footer"><span>${icon('layers')} Your context. Your control.</span><span>Mockup · Fake data · Saved in this browser</span></footer></div>`;
  document.querySelector('#demo-state').value=mode;
  if (page==='import') updateTurnPreview();
  if (highlighted) requestAnimationFrame(()=>{ const el=document.getElementById(highlighted); if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('highlight');setTimeout(()=>el.classList.remove('highlight'),2500);} highlighted=''; });
  const chat=document.querySelector('.unified-history'); if(chat) chat.scrollTop=chat.scrollHeight;
}
function workspacesPage() {
  const list=mode==='empty'?[]:store.workspaces;
  return `${heading('YOUR PERSONAL CONTEXT LIBRARY','A home for everything you know.','Keep the good ideas. Connect the dots. Pick up where you left off.',button(`${icon('plus')} New workspace`,'new-workspace','primary'))}<div class="section-heading"><h2>Your workspaces <span class="count">${list.length}</span></h2><span>Organized by you. Ready for what’s next.</span></div>${list.length?`<div class="workspace-grid">${list.map(w=>`<article class="workspace-card"><div class="card-top"><span class="large-initial ${w.color}">${icon(w.type==='project'?'folder':'layers')}</span><div class="card-right"><span class="badge">${w.type==='project'?'Project':'General'}</span>${workspaceMenu(w)}</div></div>${href(`/w/${w.id}`,`<h2>${esc(w.name)}</h2><p>${esc(w.description||'A fresh space for your ideas and conversations.')}</p>`,'workspace-card-link')}<div class="card-metrics"><span>${icon('chat')} ${wsCon(w).length} conversations</span><span>${icon('memory')} ${wsMem(w).length} memories</span></div><div class="card-footer"><span>Updated ${date(w.updatedAt||new Date())}</span>${href(`/w/${w.id}`,'Open workspace','open-link')}</div></article>`).join('')}<button class="new-card" data-action="new-workspace"><span>${icon('plus')}</span><strong>A new space for a new idea</strong><small>Create a workspace</small></button></div><div class="how-it-works"><div class="section-heading"><h2>Good context goes places.</h2><span>A simple loop. A better starting point.</span></div><div class="steps">${[['chat','Save the conversation','Bring in a conversation from any AI tool.'],['memory','Keep what matters','Review the memories worth carrying forward.'],['send','Continue anywhere','Ask questions and create outputs in Chat.']].map(([i,t,s])=>`<div>${icon(i)}<strong>${t}</strong><p>${s}</p></div>`).join('')}</div></div>`:empty('Create your first workspace','Give your conversations and ideas a place to live.',button(`${icon('plus')} New Workspace`,'new-workspace','primary'))}`;
}
function workspaceMenu(w) { return `<details class="card-menu"><summary class="icon-btn" aria-label="Actions for ${esc(w.name)}">${icon('more')}</summary><div>${button('Rename','rename-workspace','plain',`data-id="${w.id}"`)}${button('Delete','delete-workspace','plain danger-text',`data-id="${w.id}"`)}</div></details>`; }
function homePage(w) {
  const cs=wsCon(w),ms=wsMem(w),hs=wsHand(w),flags=ms.filter(m=>m.flag).length;
  return `${heading('WORKSPACE OVERVIEW','A little more connected.','Everything you’ve saved, ready for your next conversation.')}<div class="stats">${[['chat',cs.length,'Conversations','Ideas worth coming back to',''],['memory',ms.length,'Memories','The details that matter','memories'],['flag',flags,'Need your review','A quick check keeps context clear','memories']].map(([i,n,t,s,path])=>href(`/w/${w.id}${path?'/'+path:''}`,`<span class="stat-icon ${i==='flag'?'amber':''}">${icon(i)}</span><div class="stat-number">${n}<span>${t}</span></div><small>${s}</small>`,'stat-card')).join('')}</div><section class="panel"><div class="panel-heading"><div><h2>Conversations <span class="count">${cs.length}</span></h2><p>Your thinking, all in one place.</p></div>${href(`/w/${w.id}/import`,`${icon('plus')} Import conversation`,'btn secondary')}</div>${cs.length?`<div class="conversation-table"><div class="table-head"><span>CONVERSATION</span><span>MEMORIES</span><span>IMPORTED</span><span>STATUS</span><span></span></div>${cs.map(c=>`<div class="conversation-row">${href(`/w/${w.id}/conversations/${c.id}`,`${tool(c.sourceTool)}<span><strong>${esc(c.title)}</strong><small>${esc(c.sourceTool)}</small></span>`,'conversation-name')}<span>${store.memories.filter(m=>m.conversationId===c.id).length} memories</span><span>${date(c.importedAt)}</span><span class="status ${c.status}">${c.status==='done'?icon('check'):c.status==='processing'?icon('clock'):icon('flag')}${c.status==='done'?'Done':c.status==='processing'?'Processing':'Failed'}</span>${c.status==='failed'?button('Retry Extraction','retry-extraction','text',`data-id="${c.id}"`):href(`/w/${w.id}/conversations/${c.id}`,icon('chevron'),'icon-btn')}</div>`).join('')}</div>`:empty('Import a conversation to start building context','Paste a conversation. We’ll help you find what’s worth keeping.',href(`/w/${w.id}/import`,'Import conversation','btn primary'))}</section><section class="panel"><div class="panel-heading"><div><h2>Recent outputs</h2><p>Prompts, briefings, and skill drafts from Chat.</p></div>${href(`/w/${w.id}/chat`,`${icon('chat')} Open Chat`,'btn text')}</div>${hs.length?hs.slice().reverse().map(h=>href(`/w/${w.id}/chat/${h.id}`,`<span class="handoff-icon">${icon('send')}</span><span class="grow"><strong>${esc(h.title)}</strong><small>${h.memoryIds.length} memories · ${esc(h.filename)}</small></span><span class="muted">${date(h.createdAt)}</span>${icon('chevron')}`,'handoff-row')).join(''):empty('Your next conversation starts here.','Ask a question or turn your context into a reusable output.',href(`/w/${w.id}/chat`,'Open Chat','btn secondary'))}</section>`;
}
function importPage(w) {
 return `${heading('BRING YOUR CONTEXT WITH YOU','Save a conversation.','The useful details deserve to stick around.')}<form id="import-form" class="panel form-panel"><div class="form-grid"><label>Conversation title<input name="title" required maxlength="160" placeholder="e.g. Databricks interview prep" value="${esc(importDraft.title)}"></label><label>Source tool<select name="tool">${['ChatGPT','Claude','Claude Code','Codex','Other'].map(t=>`<option ${t===importDraft.tool?'selected':''}>${t}</option>`).join('')}</select></label></div><label>Conversation<textarea name="rawText" required rows="10" placeholder="User: I’m preparing for a technical interview.&#10;Assistant: Let’s make a plan…">${esc(importDraft.text)}</textarea><span class="field-hint">Paste the full conversation, including User: and Assistant: labels.</span></label><div id="turn-preview"></div><label class="failure-demo"><input type="checkbox" name="simulateFailure"> Simulate extraction failure (demo)</label><div class="form-footer"><span>${icon('spark')} Memories will appear after processing.</span><div>${href(`/w/${w.id}`,'Cancel','btn secondary')}<button class="btn primary" type="submit">${icon('upload')} Save conversation</button></div></div></form>`;
}
function turnsHtml(turns, compact=false) { return turns.map(t=>`<article id="turn-${t.id}" class="turn ${compact?'compact':''}"><span class="turn-avatar ${t.role}">${t.role==='user'?'K':icon('spark')}</span><div><strong>${t.role==='user'?'User':'Assistant'}</strong><p>${esc(t.text)}</p></div></article>`).join(''); }
function updateTurnPreview() {
 const el=document.querySelector('#turn-preview');if(!el)return;
 const text=importDraft.text; if(!text.trim()){el.innerHTML='';return;}
 const parsed=parseTurns(text); el.innerHTML=`<div class="preview-heading"><h3>Conversation preview</h3><span class="badge">${parsed.detected?parsed.turns.length+' turns':'1 block'}</span></div>${!parsed.detected?'<div class="notice">Couldn’t detect User and Assistant turns. You can save this as one block anyway.</div>':''}<div class="turn-preview">${turnsHtml(parsed.detected?parsed.turns:[{id:'preview',role:'user',text}],true)}</div>`;
}
function conversationPage(w,id) {
 const c=store.conversations.find(c=>c.id===id&&c.workspaceId===w.id); if(!c)return empty('Conversation not found','Choose another conversation.',href(`/w/${w.id}`,'Workspace home','btn secondary'));
 const ms=wsMem(w).filter(m=>m.conversationId===id);
 return `${heading(`${esc(c.sourceTool.toUpperCase())} · IMPORTED ${date(c.importedAt).toUpperCase()}`,esc(c.title),`${c.turns.length} turns · ${ms.length} memories extracted`,href(`/w/${w.id}/memories`,'All memories','btn secondary'))}<div class="detail-layout"><section class="panel"><div class="panel-heading"><h2>Conversation</h2><span class="badge">Original source</span></div>${mode==='empty'?empty('No turns to display','Import a conversation to see its turns here.'):turnsHtml(c.turns)}</section><aside class="panel memory-aside"><div class="panel-heading"><h2>${icon('memory')} Extracted memories</h2></div>${c.status==='processing'?'<div class="notice">Processing this conversation…</div>':c.status==='failed'?`<div class="notice">Extraction failed. ${button('Retry Extraction','retry-extraction','text',`data-id="${c.id}"`)}</div>`:''}${ms.length?ms.map(m=>`<button class="source-memory" data-action="highlight-turn" data-id="${m.turnId}"><span class="badge type-${m.type.replace(' ','-')}">${m.type}</span><p>${esc(m.text)}</p><small>${icon('book')} View source turn</small></button>`).join(''):empty('No memories yet','Memories appear here after you import a conversation.')}</aside></div>`;
}
function sourceLabel(m) { return esc(store.conversations.find(c=>c.id===m.conversationId)?.title||'Manual memory'); }
function memoryActions(m) { return `<div class="memory-actions">${button(`${icon('edit')} Edit`,'edit-memory','text',`data-id="${m.id}"`)}${button(`${icon('book')} View source`,'view-source','text',`data-id="${m.id}"`)}<button class="icon-btn danger-text" data-action="delete-memory" data-id="${m.id}" aria-label="Delete memory: ${esc(m.text)}">${icon('trash')}</button></div>`; }
function memoriesPage(w) {
 const all=wsMem(w), flags=all.filter(m=>m.flag), list=all.filter(m=>(!filterType||m.type===filterType)&&(!filterStatus||m.status===filterStatus));
 return `${heading('THE DETAILS THAT MATTER','Your memory, made useful.','Review, refine, and keep your context true to you.')} ${flags.length?`<section class="flag-section"><div class="section-heading"><h2>${icon('flag')} A little clarity needed <span class="count amber">${flags.length}</span></h2><span>You have the final say.</span></div>${flags.map(m=>flagCard(m)).join('')}</section>`:''}<section class="panel"><div class="panel-heading"><div><h2>All memories <span class="count">${list.length}</span></h2><p>A living record of what you know.</p></div><div class="filters"><label class="sr-only" for="filter-type">Memory type</label><select id="filter-type"><option value="">All types</option>${types.map(t=>`<option ${filterType===t?'selected':''}>${t}</option>`).join('')}</select><label class="sr-only" for="filter-status">Memory status</label><select id="filter-status"><option value="">All statuses</option><option value="confirmed" ${filterStatus==='confirmed'?'selected':''}>Confirmed</option><option value="outdated" ${filterStatus==='outdated'?'selected':''}>Outdated</option></select></div></div>${list.length?list.map(m=>`<article class="memory-row ${m.status==='outdated'?'outdated':''}" id="memory-${m.id}"><div class="memory-row-top"><span class="badge type-${m.type.replace(' ','-')}">${m.type}</span>${m.inferred?'<span class="badge inferred">✧ Inferred</span>':''}<span class="memory-status">${m.status==='outdated'?'Outdated':icon('check')+' Confirmed'}</span></div><p>${esc(m.text)}</p><div class="memory-row-bottom"><span class="source-label">${icon('chat')} ${sourceLabel(m)}</span>${memoryActions(m)}</div></article>`).join(''):empty(all.length?'No memories match these filters':'Memories appear here after you import a conversation.',all.length?'Try another type or status.':'Your conversations are the starting point.')}</section>`;
}
function flagCard(m) {
 const old=store.memories.find(x=>x.id===m.conflictsWith),turn=store.conversations.find(c=>c.id===m.conversationId)?.turns.find(t=>t.id===m.turnId);
 return `<article class="flag-card"><div class="flag-title"><span>${icon('flag')} ${m.flag==='conflict'?'Conflicting memories':'A memory to double-check'}</span><span class="badge amber">${m.flag==='conflict'?'Conflict':'Low confidence'}</span></div>${m.flag==='conflict'?`<div class="conflict-grid"><div><small>NEW MEMORY</small><p>${esc(m.text)}</p><span>${sourceLabel(m)}</span></div><div><small>EXISTING MEMORY</small><p>${esc(old?.text||'The previous memory was deleted.')}</p><span>${old?sourceLabel(old):'Source unavailable'}</span></div></div><div class="flag-actions">${[['Keep New','keep_new'],['Keep Old','keep_old'],['Keep Both','keep_both']].map(([l,a],i)=>button(l,'resolve',i?'secondary':'primary',`data-id="${m.id}" data-resolution="${a}"`)).join('')}</div>`:`<p>${esc(m.text)}</p><blockquote>${esc(turn?.text||'Source turn is unavailable.')}</blockquote><div class="flag-actions">${button('Confirm','resolve','primary',`data-id="${m.id}" data-resolution="confirm"`)}${button('Edit','edit-memory','secondary',`data-id="${m.id}"`)}${button('Delete','delete-memory','text danger-text',`data-id="${m.id}"`)}</div>`}</article>`;
}
function modal(title,content,onSubmit) {
 dialog.innerHTML=`<form id="dialog-form"><div class="modal-heading"><h2>${title}</h2><button type="button" class="icon-btn" data-action="close-dialog" aria-label="Close dialog">${icon('close')}</button></div>${content}</form>`;
 dialog.showModal(); document.querySelector('#dialog-form').onsubmit=async e=>{e.preventDefault();await onSubmit(new FormData(e.target),e.target);};
}
function workspaceDialog(id) {
 const w=store.workspaces.find(w=>w.id===id);
 modal(w?'Rename workspace':'A space for what matters.',`<p class="muted">${w?'Give this space a new name.':'Keep related conversations and memories together.'}</p><label>Workspace name<input name="name" required maxlength="80" placeholder="e.g. My next big idea" value="${esc(w?.name||'')}"></label>${!w?'<label>Workspace type<select name="type"><option value="general">General</option><option value="project">Project</option></select></label>':''}<div class="modal-actions">${button('Cancel','close-dialog')}<button class="btn primary" type="submit">${w?'Save name':'Create workspace'}</button></div>`,data=>{
 const name=data.get('name').trim();if(!name)return;
 if(w){w.name=name;w.updatedAt=new Date().toISOString();}else{const n={id:uid(),name,type:data.get('type'),color:data.get('type')==='project'?'blue':'purple',updatedAt:new Date().toISOString()};store.workspaces.push(n);mode='normal';go(`/w/${n.id}`);}
 save();dialog.close();render();toast(w?'Workspace renamed':'Your new workspace is ready.');
 });
}
function confirmModal(title,text,action) { modal(title,`<p>${esc(text)}</p><div class="modal-actions">${button('Cancel','close-dialog')}<button class="btn danger" type="submit">Delete</button></div>`,()=>{action();save();dialog.close();render();toast('Deleted.');}); }
function editMemory(id) {
 const m=store.memories.find(m=>m.id===id),row=document.getElementById('memory-'+id);
 const editor=`<label>Edit memory<textarea name="text" required rows="3">${esc(m.text)}</textarea></label><label>Type<select name="type">${types.map(t=>`<option ${m.type===t?'selected':''}>${t}</option>`).join('')}</select></label><div class="modal-actions">${button('Cancel',row?'cancel-edit':'close-dialog')}<button class="btn primary" type="submit">Save memory</button></div>`;
 const submit=data=>{if(!data.get('text').trim())return;m.text=data.get('text').trim();m.type=data.get('type');m.flag=null;save();dialog.close();render();toast('Memory updated.');};
 if(row){row.innerHTML=`<form class="inline-editor">${editor}</form>`;row.querySelector('form').onsubmit=e=>{e.preventDefault();submit(new FormData(e.target));};row.querySelector('textarea').focus();}else modal('Edit memory',editor,submit);
}
function finishExtraction(id) {
 const c=store.conversations.find(c=>c.id===id); if(!c||c.status!=='processing')return;
 if(c.simulateFailure){c.simulateFailure=false;c.status='failed';save();render();toast('Mock extraction failed. Use Retry Extraction to try again.');return;}
 c.status='done';
 const userTurns=c.turns.filter(t=>t.role==='user');
 // This is a visible mock extraction, not an AI request. Every fake memory retains its exact source.
 for(const [i,t] of (userTurns.length?userTurns:c.turns).slice(0,5).entries()) {
   store.memories.push({id:uid(),workspaceId:c.workspaceId,conversationId:c.id,turnId:t.id,text:t.text.trim(),type:types[i%types.length],status:'confirmed',inferred:false,flag:i===1?'low_confidence':null});
 }
 save();render();toast('Conversation ready. Review its mock memories.');
}
const chatUI = createChatUI({ getStore:()=>store, getMode:()=>mode, esc, icon, button, href, modal, toast, save, render, go });
async function waitButton(el,text,ms=650) { el.disabled=true;el.innerHTML=`<span class="spinner"></span> ${text}`;await new Promise(r=>setTimeout(r,ms)); }
app.addEventListener('input',e=>{
 chatUI.input(e);
 if(e.target.closest('#import-form')){const f=e.target.form;importDraft={title:f.elements.namedItem('title').value,tool:f.elements.namedItem('tool').value,text:f.elements.namedItem('rawText').value};if(e.target.name==='rawText')updateTurnPreview();}

});
app.addEventListener('change',e=>{
 chatUI.change(e);
 const w=store.workspaces.find(w=>w.id===route()[1]);
 if(e.target.id==='demo-state'){mode=e.target.value;render();}
 if(e.target.id==='filter-type'){filterType=e.target.value;render();}
 if(e.target.id==='filter-status'){filterStatus=e.target.value;render();}

});
async function actions(e) {
 const el=e.target.closest('[data-action]');if(!el)return;
 if(el.dataset.action.startsWith('chat-')) { await chatUI.actions(e); return; }
 const id=el.dataset.id,action=el.dataset.action,w=store.workspaces.find(w=>w.id===route()[1]);
 if(action==='new-workspace')workspaceDialog();
 if(action==='rename-workspace')workspaceDialog(id);
 if(action==='close-dialog')dialog.close();
 if(action==='retry'){mode='loading';render();setTimeout(()=>{mode='normal';render();},600);}
 if(action==='reset'){modal('Start fresh?',`<p>This resets all browser-local mock data and edits to the original examples.</p><div class="modal-actions">${button('Cancel','close-dialog')}<button class="btn primary" type="submit">Reset demo</button></div>`,()=>{store=migrateChat(seed());mode='normal';importDraft={title:'',tool:'ChatGPT',text:''};save();dialog.close();go('/');render();toast('Demo reset.');});}
 if(action==='delete-workspace'){const s=store.workspaces.find(w=>w.id===id);confirmModal('Delete workspace?',`“${s.name}” and all its conversations, memories, chats, and outputs will be removed from this browser.`,()=>{store.workspaces=store.workspaces.filter(w=>w.id!==id);for(const key of ['conversations','memories','handoffs','artifacts'])store[key]=store[key].filter(x=>x.workspaceId!==id);delete store.chats[id];if(w?.id===id)go('/');});}
 if(action==='edit-memory')editMemory(id);
 if(action==='cancel-edit')render();
 if(action==='delete-memory')confirmModal('Delete memory?','This removes the memory from future chat responses. Saved outputs keep their original text and source snapshots.',()=>{store.memories=store.memories.filter(m=>m.id!==id);});
 if(action==='resolve'){resolveFlag(store,id,el.dataset.resolution);save();render();toast('Memory reviewed. Your context is up to date.');}
 if(action==='view-source'){const m=store.memories.find(m=>m.id===id);highlighted='turn-'+m.turnId;go(`/w/${m.workspaceId}/conversations/${m.conversationId}`);}
 if(action==='highlight-turn'){const target=document.getElementById('turn-'+id);target?.scrollIntoView({behavior:'smooth',block:'center'});target?.classList.add('highlight');setTimeout(()=>target?.classList.remove('highlight'),2500);}
 if(action==='retry-extraction'){const c=store.conversations.find(c=>c.id===id);c.status='processing';save();render();setTimeout(()=>finishExtraction(id),3000);}

}
app.addEventListener('click',actions);dialog.addEventListener('click',actions);
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
app.addEventListener('submit',async e=>{
 chatUI.submit(e);
 if(e.target.id!=='import-form')return;e.preventDefault();
 const form=e.target,data=new FormData(form),submit=form.querySelector('[type=submit]'),w=store.workspaces.find(w=>w.id===route()[1]);
 if(form.id==='import-form'){
 const title=data.get('title').trim(),raw=data.get('rawText').trim();if(!title||!raw){toast('Add a title and conversation text.');return;}
 await waitButton(submit,'Saving…');const p=parseTurns(raw),id=uid();store.conversations.push({id,workspaceId:w.id,title,sourceTool:data.get('tool'),importedAt:new Date().toISOString(),status:'processing',simulateFailure:data.has('simulateFailure'),turns:p.detected?p.turns:[{id:uid(),role:'user',text:raw}]});w.updatedAt=new Date().toISOString();save();importDraft={title:'',tool:'ChatGPT',text:''};go(`/w/${w.id}`);setTimeout(()=>finishExtraction(id),3000);
 }
});
window.addEventListener('hashchange',()=>{mode='normal';render();window.scrollTo(0,0);});
render();
for(const c of store.conversations.filter(c=>c.status==='processing'))setTimeout(()=>finishExtraction(c.id),3000);
