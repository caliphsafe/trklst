import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeProject,validateProject,nextTrack,audioUrl} from '../src/project.mjs';
import {readSession,storageKey,mergeDriveTracks,sessionPayload,lockSession,unlockSession} from '../src/session.mjs';
import {importFolder} from '../src/import-folder.mjs';
const a={id:'track_A123456789',name:'A.mp3',key:''},b={id:'track_B123456789',name:'B.mp3',key:''},c={id:'track_C123456789',name:'C.mp3',key:''};
const p={v:1,id:'room-1',artist:'Artist',title:'Album',folder:'https://drive.google.com/drive/folders/folder123456789',cover:'',tracks:[b,a],updated:1};
const memory=new Map(),storage={getItem:k=>memory.get(k)||null};
test('the unchanged artist link resolves the latest local save and explains missing device data',()=>{
 memory.set(storageKey(p.id),JSON.stringify(p));const link='#edit='+p.id;assert.deepEqual(readSession(link,storage).project,p);
 const later={...p,tracks:[a,b],updated:2};memory.set(storageKey(p.id),JSON.stringify(later));assert.deepEqual(readSession(link,storage).project,later);
 assert.match(readSession(link,{getItem:()=>null}).error,/original browser/);
});
test('listener snapshots ignore artist storage and never become editable sessions',()=>{
 memory.set(storageKey(p.id),JSON.stringify({...p,title:'Secret newer draft',updated:9}));
 const session=readSession('#listen='+encodeProject(p),storage);assert.equal(session.listener,true);assert.equal(session.project.title,'Album');
});
test('Drive refresh preserves order, updates names, flags deletions, and appends new tracks',()=>{
 const result=mergeDriveTracks(p.tracks,[{...a,name:'A remastered.mp3'},c]);
 assert.deepEqual(result.map(t=>t.id),[b.id,a.id,c.id]);assert.equal(result[0].missing,true);assert.equal(result[1].name,'A remastered.mp3');
 assert.equal(nextTrack(result,b.id).id,a.id);assert.equal(mergeDriveTracks(result,[a,b,c])[0].missing,false);
});
test('snapshot listeners retain published membership; Drive-order sessions follow current folder',()=>{
 const incoming=[a,c];assert.deepEqual(mergeDriveTracks([b,a],incoming,{listener:true}).map(t=>t.id),[b.id,a.id]);
 assert.deepEqual(mergeDriveTracks([b,a],incoming,{listener:true,followDrive:true}).map(t=>t.id),[a.id,c.id]);
 assert.equal(mergeDriveTracks([a],[],{listener:true,followDrive:true}).length,0);
 assert.doesNotThrow(()=>validateProject({...p,tracks:[]}));
});
test('encrypted listener links roundtrip and reject wrong passwords or tampering',async()=>{
 const payload=sessionPayload(p,'drive');const password='a strong test passphrase';
 const locked=await lockSession(payload,password);assert.ok(!locked.includes(password));assert.ok(!locked.includes('Album'));
 assert.deepEqual(await unlockSession(locked,password),payload);
 await assert.rejects(()=>unlockSession(locked,'incorrect password'),/incorrect/);
 const pieces=locked.split('.');pieces[3]=(pieces[3][0]==='A'?'B':'A')+pieces[3].slice(1);
 await assert.rejects(()=>unlockSession(pieces.join('.'),password),/incorrect/);
 await assert.rejects(()=>lockSession(payload,'short'),/10 and 200/);
 assert.equal(readSession('#locked='+locked,storage).project,null);
});
test('audio refresh changes cache identity without altering the Drive file ID',()=>{
 assert.notEqual(audioUrl(a,1),audioUrl(a,2));assert.ok(audioUrl(a,2).includes('id='+a.id));assert.ok(audioUrl(a,2).includes('&v=2'));
});
test('import retries Load failed once and preserves meaningful provider errors',async()=>{
 let calls=0;const result=await importFolder(p.folder,{retryDelayMs:0,fetcher:async()=>{if(++calls===1)throw new TypeError('Load failed');return new Response(JSON.stringify({tracks:[a]}),{headers:{'content-type':'application/json'}});}});
 assert.equal(calls,2);assert.deepEqual(result.tracks,[a]);
 let badCalls=0;await assert.rejects(()=>importFolder(p.folder,{fetcher:async()=>{badCalls++;return new Response(JSON.stringify({error:'No public MP3s'}),{status:400,headers:{'content-type':'application/json'}});}}),/No public MP3s/);assert.equal(badCalls,1);
});
test('failed network retries are bounded and empty refresh results are permitted',async()=>{
 let calls=0;await assert.rejects(()=>importFolder(p.folder,{retryDelayMs:0,fetcher:async()=>{calls++;throw new TypeError('Load failed');}}),/two attempts/);assert.equal(calls,2);
 assert.deepEqual((await importFolder(p.folder,{refresh:true,fetcher:async()=>new Response(JSON.stringify({tracks:[]}),{headers:{'content-type':'application/json'}})})).tracks,[]);
});

test('artist passwords encrypt local drafts and versions, and reopening requires unlock',async()=>{
 const {artistRecord}=await import('../src/session.mjs');
 const draft={...p,localVersions:[{id:'version-1',name:'Private draft order',at:1,tracks:[a,b]}]};
 const record=await artistRecord(draft,'artist test password');
 assert.equal(record.artistEncrypted,1);assert.ok(!JSON.stringify(record).includes('Private draft order'));
 const local={getItem:key=>key===storageKey(p.id)?JSON.stringify(record):null};
 const initial=readSession('#edit='+p.id,local);assert.equal(initial.project,null);assert.equal(initial.listener,false);assert.equal(initial.artistLocked.token,record.token);
 assert.deepEqual(await unlockSession(record.token,'artist test password'),draft);
 await assert.rejects(()=>unlockSession(record.token,'wrong password'));
 const legacy=readSession('#p='+encodeProject(p),local);assert.equal(legacy.project,null);assert.ok(legacy.artistLocked);
 const transfer=readSession('#artist='+record.token,local);assert.equal(transfer.project,null);assert.ok(transfer.artistLocked);
 const changed=await artistRecord(draft,'replacement password');await assert.rejects(()=>unlockSession(changed.token,'artist test password'));
 assert.deepEqual(await artistRecord(draft,''),draft);
});

test('transition timing survives artist and listener links and rejects invalid values',()=>{
 for(let n=-5;n<=5;n++){
  const project={...p,transitionSeconds:n};
  assert.equal(readSession('#p='+encodeProject(project),{getItem:()=>null}).project.transitionSeconds,n);
  assert.equal(readSession('#listen='+encodeProject(sessionPayload(project))).project.transitionSeconds,n);
 }
 assert.equal(sessionPayload(p).transitionSeconds,0);
 for(const value of [-6,6,1.5,'-3',null])assert.throws(()=>validateProject({...p,transitionSeconds:value}));
});
