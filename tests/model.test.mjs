import test from 'node:test';
import assert from 'node:assert/strict';
import { seed, parseTurns, resolveFlag, generatePackage } from '../model.js';
test('seed includes the complete example set and linked source turns', () => {
 const s=seed();assert.equal(s.workspaces.length,2);
 for(const w of s.workspaces){assert.equal(s.conversations.filter(c=>c.workspaceId===w.id).length,3);assert.equal(s.memories.filter(m=>m.workspaceId===w.id).length,15);assert.equal(s.handoffs.filter(h=>h.workspaceId===w.id).length,2);assert.equal(s.memories.filter(m=>m.workspaceId===w.id&&m.flag).length,2);}
 for(const m of s.memories)assert.ok(s.conversations.find(c=>c.id===m.conversationId).turns.some(t=>t.id===m.turnId));
});
test('handoff cannot leak unselected or other-workspace memories', () => {
 const s=seed(),one=s.memories[0],outside=s.memories.at(-1);
 const h=generatePackage(s,{workspaceId:one.workspaceId,memoryIds:[one.id,outside.id],task:'Interview prep',size:'full'});
 assert.deepEqual(h.memoryIds,[one.id]);assert.ok(h.output.includes(one.text));
 for(const m of s.memories.filter(m=>m.id!==one.id))assert.ok(!h.output.includes(m.text));
 assert.deepEqual(h.conversationIds,[one.conversationId]);
});
test('empty or foreign-only selection cannot generate a package',()=>{
 const s=seed();for(const ids of [[],[s.memories.at(-1).id]])assert.throws(()=>generatePackage(s,{workspaceId:s.workspaces[0].id,memoryIds:ids,task:'x',size:'short'}));
});
test('conflict actions preserve history and resolve only the requested memory',()=>{
 for(const action of ['keep_new','keep_old','keep_both']){const s=seed(),m=s.memories.find(m=>m.flag==='conflict'),old=s.memories.find(x=>x.id===m.conflictsWith);resolveFlag(s,m.id,action);assert.equal(m.flag,null);assert.equal(m.status,action==='keep_old'?'outdated':'confirmed');assert.equal(old.status,action==='keep_new'?'outdated':'confirmed');assert.equal(s.memories.length,30);}
});
test('parser accepts common labels, multiline turns, and unlabeled text',()=>{
 const p=parseTurns('You said: First line\nSecond line\nChatGPT said: A reply\nUser: Another thought\nAssistant: Got it');assert.equal(p.turns.length,4);assert.equal(p.turns[0].text,'First line\nSecond line');assert.deepEqual(p.turns.map(t=>t.role),['user','assistant','user','assistant']);assert.equal(p.detected,true);assert.equal(parseTurns('Just a note').detected,false);
});
