import { chatState, scopeMemories, respondToChat } from './chat-model.js';

export function createChatUI(ctx) {
  const { esc, icon, button, href, modal, toast, save, render, go } = ctx;
  const pending = new Set(), failures = new Map();
  const store = () => ctx.getStore();
  const current = () => store().workspaces.find(w => w.id === (location.hash.slice(1).split('/')[2]));
  const state = w => chatState(store(),w.id);
  const available = w => ctx.getMode()==='empty' ? [] : scopeMemories(store(),w.id,state(w).scope,state(w).memoryIds);
  const findArtifact = (w,id) => store().artifacts.find(a=>a.id===id&&a.workspaceId===w.id);
  function page(w,id) {
    const s=state(w), memories=available(w), busy=pending.has(w.id);
    const artifact=ctx.getMode()==='empty'?null:findArtifact(w,id||s.activeArtifactId);
    if(id&&artifact&&s.activeArtifactId!==artifact.id){s.activeArtifactId=artifact.id;save();}
    const history=ctx.getMode()==='empty'?[]:s.messages;
    const included=new Set(memories.map(m=>m.conversationId));
    return `<div class="page-heading"><div><div class="eyebrow">YOUR CONTEXT, YOUR WAY</div><h1>What would you like to do?</h1><p>Ask a question. Brief your next agent. Make something useful.</p></div>${button(`${icon('plus')} New chat`,'chat-new','secondary',busy?'disabled':'')}</div>
      <section class="context-bar" aria-label="Active context"><span class="context-label">${icon('layers')} Context</span><label class="sr-only" for="chat-scope">Context scope</label><select id="chat-scope" ${busy?'disabled':''}><option value="workspace" ${s.scope==='workspace'?'selected':''}>This workspace</option><option value="selected" ${s.scope==='selected'?'selected':''}>Selected conversations & memories</option></select><span class="context-count">${memories.length} memories · ${included.size} ${included.size===1?'conversation':'conversations'}</span>${button('Choose context','chat-scope','text',busy?'disabled':'')}<span class="context-boundary">${icon('check')} ${esc(w.name)} only</span></section>
      <div class="unified-layout ${artifact?'has-artifact':''}"><section class="panel unified-chat"><div class="unified-history" role="log" aria-label="Chat messages" aria-live="polite">${history.length?history.map(m=>`<article class="chat-message ${m.role}"><span class="turn-avatar ${m.role}">${m.role==='user'?'K':icon('spark')}</span><div><strong>${m.role==='user'?'You':'Context'}</strong><p>${esc(m.text)}</p><small class="message-scope">${m.scopeCount} memories in scope when sent</small>${m.sources?.length?`<div class="citations">${m.sources.map((source,i)=>button(`${icon('book')} ${i+1}. ${esc(source.conversationTitle)}`,'chat-source','citation',`data-message="${m.id}" data-source="${source.id}"`)).join('')}</div>`:''}${m.artifactId?button(`${icon('book')} Open ${esc(findArtifact(w,m.artifactId)?.filename||'output')}`,'chat-open','secondary output-link',`data-id="${m.artifactId}"`):''}</div></article>`).join(''):`<div class="ask-welcome"><span class="ask-symbol">${icon('spark')}</span><h2>Your context can do more.</h2><p>Tell me what you need. I’ll work with the context you choose.</p><div>${['What decisions have I made?','Give me a prompt to get a new agent up to speed','Create a SKILL.md from my preferences','Summarize my current situation'].map(q=>button(q,'chat-suggest','suggestion',`data-question="${esc(q)}" ${!memories.length||busy?'disabled':''}`)).join('')}</div></div>`}${busy?'<div class="chat-working" role="status"><span class="spinner"></span> Working with your selected context…</div>':''}</div>
      ${!memories.length?`<div class="chat-empty-context">${icon('layers')} Select at least one conversation or memory.${!store().memories.some(m=>m.workspaceId===w.id)?href(`/w/${w.id}/import`,'Import a conversation','btn text'):button('Choose context','chat-scope','text')}</div>`:''}
      ${failures.has(w.id)?`<div class="chat-error" role="alert">${esc(failures.get(w.id))}${button('Retry','chat-retry','text')}</div>`:''}
      <form id="context-chat-form" class="unified-composer"><label class="sr-only" for="chat-request">Message</label><textarea id="chat-request" name="request" rows="2" required placeholder="Ask a question, request a prompt, or say ‘make it shorter’…" ${busy?'disabled':''}>${esc(s.draft)}</textarea><button class="btn primary" type="submit" ${!memories.length||busy?'disabled':''} aria-label="Send message">${icon('send')}</button></form><p class="unified-disclaimer">Simulated responses · Fake data · No live AI connected</p></section>
      ${artifact?artifactPanel(w,artifact,memories):`<aside class="panel artifact-placeholder"><span class="large-initial purple">${icon('book')}</span><h2>A useful output, right here.</h2><p>Ask for a prompt, briefing, or skill draft. Edit it alongside your conversation, then copy or download it.</p><span class="badge">Prompts · Briefings · SKILL.md</span></aside>`}</div>`;
  }
  function artifactPanel(w,a,memories) {
    const allowed=new Set(memories.map(m=>m.id));
    const different=a.sources.some(m=>!allowed.has(m.id));
    return `<aside class="panel unified-artifact" aria-label="Generated output"><div class="artifact-heading"><div><span class="eyebrow">EDITABLE OUTPUT</span><h2>${esc(a.title)}</h2><span class="artifact-filename">${esc(a.filename)}</span></div>${button('Close','chat-close','text')}</div><div class="artifact-scope">${icon('check')} Saved output · ${a.sources.length} source ${a.sources.length===1?'memory':'memories'} · ${a.conversationIds.length} ${a.conversationIds.length===1?'conversation':'conversations'}${different?'<strong>Different from current chat scope. This output keeps its original sources.</strong>':''}</div>${a.kind==='skill'?'<p class="skill-draft-note">Generic SKILL.md draft. Review the target agent’s format before use.</p>':''}<label class="sr-only" for="artifact-text">Edit generated output</label><textarea id="artifact-text" data-id="${a.id}" spellcheck="false">${esc(a.output)}</textarea><div class="artifact-toolbar"><span id="artifact-save-status">Edits saved in this browser</span><div>${button(`${icon('copy')} Copy`,'chat-copy','secondary',`data-id="${a.id}"`)}${button(`${icon('upload')} Download`,'chat-download','primary',`data-id="${a.id}"`)}</div></div><details class="artifact-source-list" open><summary>Sources <span class="count">${a.sources.length}</span></summary><p>Sources support the generated draft. Text you add manually may not have a source.</p>${a.sources.map(m=>button(`<span>${esc(m.text)}</span><small>${esc(m.conversationTitle)}</small>`,'chat-source','artifact-source',`data-artifact="${a.id}" data-source="${m.id}"`)).join('')}</details></aside>`;
  }
  function chooseScope(w) {
    const s=state(w), currentIds=new Set(available(w).map(m=>m.id));
    const memories=ctx.getMode()==='empty'?[]:store().memories.filter(m=>m.workspaceId===w.id);
    modal('Choose the context Chat can use',`<p class="muted">Only checked memories can be used in new responses and outputs. Older messages retain their original scope.</p><div class="scope-dialog-tools">${button('Select all','chat-scope-all','text')}${button('Clear selection','chat-scope-clear','text')}</div><div class="scope-dialog-list">${store().conversations.filter(c=>c.workspaceId===w.id).map(c=>{
      const ms=memories.filter(m=>m.conversationId===c.id);
      return `<details class="scope-dialog-group" open><summary>${esc(c.title)} <span class="count">${ms.length}</span></summary><label class="scope-all"><input type="checkbox" name="scopeConversation" value="${c.id}" ${ms.length&&ms.every(m=>currentIds.has(m.id))?'checked':''} ${!ms.length?'disabled':''}> Select conversation: ${esc(c.title)}</label>${ms.map(m=>`<label class="scope-memory ${currentIds.has(m.id)?'':'dimmed'}"><input type="checkbox" name="scopeMemory" value="${m.id}" data-scope-conversation="${c.id}" ${currentIds.has(m.id)?'checked':''}><span>${esc(m.text)}<small>${m.type} · ${m.status}</small></span></label>`).join('')}</details>`;
    }).join('')||'<p class="muted">Import a conversation to create memories.</p>'}</div><div class="scope-dialog-footer"><span id="scope-dialog-count"></span>${button('Cancel','close-dialog')}<button class="btn primary" type="submit">Use selection</button></div>`,data=>{
      s.scope='selected';s.memoryIds=data.getAll('scopeMemory');s.activeArtifactId=null;save();document.querySelector('#dialog').close();go(`/w/${w.id}/chat`);render();toast('Context selection updated. New responses use only this selection.');
    });
    document.querySelector('#dialog').classList.add('scope-dialog');
    updateScopeDialog();
  }
  function updateScopeDialog() {
    const dialog=document.querySelector('#dialog');
    if(!dialog.querySelector('[name=scopeMemory]')) { const count=dialog.querySelector('#scope-dialog-count');if(count)count.textContent='0 selected'; return; }
    dialog.querySelectorAll('[name=scopeMemory]').forEach(input=>input.closest('label').classList.toggle('dimmed',!input.checked));
    dialog.querySelectorAll('[name=scopeConversation]').forEach(input=>{
      const children=[...dialog.querySelectorAll('[name=scopeMemory]')].filter(m=>m.dataset.scopeConversation===input.value);
      input.checked=children.length>0&&children.every(m=>m.checked);input.indeterminate=children.some(m=>m.checked)&&!input.checked;
    });
    dialog.querySelector('#scope-dialog-count').textContent=`${dialog.querySelectorAll('[name=scopeMemory]:checked').length} selected`;
  }
  document.querySelector('#dialog').addEventListener('close',()=>document.querySelector('#dialog').classList.remove('scope-dialog'));
  document.querySelector('#dialog').addEventListener('change',e=>{
    if(e.target.name==='scopeConversation')document.querySelectorAll('[name=scopeMemory]').forEach(m=>{if(m.dataset.scopeConversation===e.target.value)m.checked=e.target.checked;});
    if(['scopeConversation','scopeMemory'].includes(e.target.name))updateScopeDialog();
  });
  async function send(w,request) {
    if(pending.has(w.id)||!request.trim())return;
    const s=state(w), ids=available(w).map(m=>m.id);
    if(!ids.length){toast('Select at least one conversation or memory.');return;}
    const previous=findArtifact(w,s.activeArtifactId), capturedScope=s.scope;
    pending.add(w.id);failures.delete(w.id);s.draft=request;save();render();
    await new Promise(r=>setTimeout(r,650));
    try {
      if(!store().workspaces.some(x=>x.id===w.id)||state(w)!==s)return;
      const result=respondToChat(store(),{workspaceId:w.id,memoryIds:ids,request,previousArtifact:previous});
      const stamp={scopeCount:ids.length,scope:capturedScope,createdAt:new Date().toISOString()};
      s.messages.push({id:crypto.randomUUID(),role:'user',text:request,...stamp},{id:crypto.randomUUID(),role:'assistant',text:result.text,sources:result.sources,artifactId:result.artifact?.id,...stamp});
      if(result.artifact){store().artifacts.push(result.artifact);s.activeArtifactId=result.artifact.id;}
      s.draft='';save();
    } catch(e) { failures.set(w.id,e.message); }
    finally { pending.delete(w.id);if(current()?.id===w.id){go(`/w/${w.id}/chat`);render();document.querySelector('#chat-request')?.focus();} }
  }
  async function actions(e) {
    const el=e.target.closest('[data-action^="chat-"]');if(!el)return;
    const w=current();if(!w)return;const s=state(w),action=el.dataset.action;
    if(action==='chat-scope')chooseScope(w);
    if(action==='chat-scope-all'||action==='chat-scope-clear'){document.querySelectorAll('[name=scopeMemory]').forEach(input=>input.checked=action==='chat-scope-all');updateScopeDialog();}
    if(action==='chat-new'){s.messages=[];s.activeArtifactId=null;s.draft='';failures.delete(w.id);save();go(`/w/${w.id}/chat`);render();}
    if(action==='chat-suggest')await send(w,el.dataset.question);
    if(action==='chat-retry')await send(w,s.draft);
    if(action==='chat-open'){s.activeArtifactId=el.dataset.id;save();go(`/w/${w.id}/chat`);render();}
    if(action==='chat-close'){s.activeArtifactId=null;save();go(`/w/${w.id}/chat`);render();}
    if(action==='chat-copy'){
      const a=findArtifact(w,el.dataset.id);if(!a)return;
      try{await navigator.clipboard.writeText(a.output);el.innerHTML=icon('check')+' Copied';toast('Output copied.');}catch{document.querySelector('#artifact-text')?.select();toast('Select the output and press ⌘C or Ctrl+C to copy.');}
    }
    if(action==='chat-download'){
      const a=findArtifact(w,el.dataset.id);if(!a)return;
      const url=URL.createObjectURL(new Blob([a.output],{type:'text/markdown;charset=utf-8'}));
      const link=document.createElement('a');link.href=url;link.download=a.filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast(`${a.filename} downloaded.`);
    }
    if(action==='chat-source'){
      const sources=el.dataset.artifact?findArtifact(w,el.dataset.artifact)?.sources:s.messages.find(m=>m.id===el.dataset.message)?.sources;
      const source=sources?.find(m=>m.id===el.dataset.source);if(!source)return;
      const exists=store().memories.some(m=>m.workspaceId===w.id&&m.id===source.id);
      modal('Source memory',`<span class="badge">${esc(source.type)}</span><p class="source-snapshot">${esc(source.text)}</p><p class="muted">${esc(source.conversationTitle)} · ${esc(source.status)}${source.inferred?' · Inferred':''}${source.flag?' · Needs review':''}</p><h3 class="source-turn-title">Original turn</h3><blockquote class="source-turn-snapshot">${esc(source.sourceText||'Source turn is unavailable in this saved snapshot.')}</blockquote><p class="field-hint">This is the source snapshot saved with the response.</p><div class="modal-actions">${button('Close','close-dialog')}${exists?href(`/w/${w.id}/conversations/${source.conversationId}`,'Open conversation','btn primary'):''}</div>`,()=>{});
    }
  }
  document.querySelector('#dialog').addEventListener('click',e=>{if(e.target.closest('a[href]'))document.querySelector('#dialog').close();});
  return {page,actions,
    input(e){const w=current();if(!w)return;if(e.target.id==='chat-request'){state(w).draft=e.target.value;save();}if(e.target.id==='artifact-text'){const a=findArtifact(w,e.target.dataset.id);if(a){a.output=e.target.value;save();}}},
    change(e){if(e.target.id!=='chat-scope')return;const w=current();if(!w)return;const s=state(w);s.scope=e.target.value;s.activeArtifactId=null;s.memoryIds=[];save();go(`/w/${w.id}/chat`);render();if(s.scope==='selected')chooseScope(w);},
    submit(e){if(e.target.id!=='context-chat-form')return;e.preventDefault();const w=current();if(w)send(w,new FormData(e.target).get('request'));}
  };
}
