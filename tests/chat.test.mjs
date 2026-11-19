import test from 'node:test';
import assert from 'node:assert/strict';
import { seed } from '../model.js';
import { migrateChat, chatState, scopeMemories, respondToChat } from '../chat-model.js';
const setup=()=>migrateChat(seed());
const request=(s,text,ids=s.memories.filter(m=>m.workspaceId==='job-search').map(m=>m.id),previousArtifact)=>respondToChat(s,{workspaceId:'job-search',memoryIds:ids,request:text,previousArtifact});
test('migration preserves old output text and is idempotent',()=>{
 const s=seed(),text=s.handoffs[0].output;migrateChat(s);migrateChat(s);
 assert.equal(s.artifacts.length,4);assert.equal(s.artifacts[0].output,text);assert.equal(s.artifacts[0].id,s.handoffs[0].id);assert.ok(s.artifacts[0].sources.every(m=>m.sourceText));
});
test('all chat output formats and answers exclude unselected and foreign memories',()=>{
 const s=setup(),one=s.memories[0],foreign=s.memories.at(-1);
 for(const q of ['What do you know?','Write a prompt','Create a SKILL.md','Summarize my situation']){
  const r=request(s,q,[one.id,foreign.id]);assert.deepEqual(r.sources.map(m=>m.id),[one.id]);
  for(const m of s.memories.filter(m=>m.id!==one.id))assert.ok(!(r.text+'\n'+(r.artifact?.output||'')).includes(m.text));
 }
});
test('workspace scope excludes history, selected scope explicitly permits it',()=>{
 const s=setup(),m=s.memories[0];m.status='outdated';assert.ok(!scopeMemories(s,m.workspaceId,'workspace').some(x=>x.id===m.id));assert.deepEqual(scopeMemories(s,m.workspaceId,'selected',[m.id]).map(x=>x.id),[m.id]);
 assert.match(request(s,'Write a prompt',[m.id]).artifact.output,/Outdated/);
});
test('shorter and expanded revisions create fresh outputs and preserve manual edits',()=>{
 const s=setup(),first=request(s,'Create a prompt').artifact;first.output+='\nMY EDIT';
 const short=request(s,'Make it shorter',undefined,first).artifact;assert.notEqual(short.id,first.id);assert.ok(short.output.length<first.output.length);assert.ok(first.output.endsWith('MY EDIT'));assert.equal(short.sources.length,3);
 const full=request(s,'Make it more detailed with sources',undefined,short).artifact;assert.match(full.output,/Source:/);assert.ok(full.output.length>short.output.length);
});
test('narrowing scope prevents prior output from reintroducing excluded facts',()=>{
 const s=setup(),prior=request(s,'Write a prompt').artifact;const only=s.memories[0];
 const r=request(s,'Make it shorter',[only.id],prior);assert.equal(r.artifact,null);assert.deepEqual(r.sources.map(m=>m.id),[only.id]);
 assert.ok(!r.text.includes(s.memories[1].text));
});
test('skill drafts use preferences when requested and never invent missing matches',()=>{
 const s=setup(),r=request(s,'Create a SKILL.md from my preferences');assert.equal(r.artifact.filename,'SKILL.md');assert.match(r.artifact.output,/^---\nname:/);assert.ok(r.sources.every(m=>m.type==='preference'));
 const empty=request(s,'Create a SKILL.md from my preferences',[s.memories[0].id]);assert.equal(empty.artifact,null);assert.equal(empty.sources.length,0);
});
test('workspace sessions and source snapshots remain independent',()=>{
 const s=setup(),a=chatState(s,'job-search'),b=chatState(s,'context-build');a.messages.push({text:'private draft'});assert.equal(b.messages.length,0);
 const r=request(s,'Write a prompt');const original=r.sources[0].text;s.memories[0].text='Changed';assert.equal(r.artifact.sources[0].text,original);
});
test('empty or foreign-only scope cannot produce any response',()=>{
 const s=setup();for(const ids of [[],[s.memories.at(-1).id]])assert.throws(()=>request(s,'Write a prompt',ids),/Select at least/);
});
