import {encodeProject,decodeProject,validateProject} from './project.mjs';
export const storageKey=id=>'trklst:project:'+id;
export function readLocal(key,storage){try{return JSON.parse((storage||globalThis.localStorage).getItem(key));}catch{return null;}}
export function readSession(hash,storage){
 try{
  if(hash.startsWith('#locked='))return {project:null,listener:true,locked:hash.slice(8),error:''};
  if(hash.startsWith('#listen='))return {project:decodeProject(hash.slice(8)),listener:true,error:''};
  if(hash.startsWith('#edit=')){
   const id=hash.slice(6);if(!/^[\w-]{1,80}$/.test(id))throw Error('Invalid artist link.');
   const p=readLocal(storageKey(id),storage);
   if(!p)throw Error('This artist link opens a project saved in its original browser. Open it on that browser, or use an artist transfer link to bring a copy here.');
   return {project:validateProject(p),listener:false,error:''};
  }
  if(hash.startsWith('#p=')){
   const shared=decodeProject(hash),cached=readLocal(storageKey(shared.id),storage);
   let project=shared;try{if(cached&&cached.updated>shared.updated)project=validateProject(cached);}catch{}
   return {project,listener:false,error:''};
  }
  return {project:null,listener:false,error:''};
 }catch(e){return {project:null,listener:false,error:e.message};}
}
export function mergeDriveTracks(previous,incoming,{listener=false,followDrive=false}={}){
 if(followDrive)return incoming.map(t=>({...t,missing:false}));
 const fresh=new Map(incoming.map(t=>[t.id,t])),known=new Set(previous.map(t=>t.id));
 const tracks=previous.map(t=>fresh.has(t.id)?{...fresh.get(t.id),missing:false}:{...t,missing:true});
 return listener?tracks:tracks.concat(incoming.filter(t=>!known.has(t.id)).map(t=>({...t,missing:false})));
}
export function sessionPayload(project,order='snapshot'){
 const p=validateProject(project);
 return {v:1,id:p.id,artist:p.artist,title:p.title,folder:p.folder,cover:p.cover||'',tracks:p.tracks.map(({id,name,key,missing})=>({id,name,key:key||'',missing:!!missing})),updated:p.updated,listenOrder:order};
}
function b64(bytes){let str='';for(const b of new Uint8Array(bytes))str+=String.fromCharCode(b);return btoa(str).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');}
function unb64(str){if(!/^[A-Za-z0-9_-]+$/.test(str))throw Error('Invalid encrypted link.');return Uint8Array.from(atob(str.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));}
async function keyFor(password,salt,usage){
 const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,usage);
}
export async function lockSession(project,password){
 if(password.length<10||password.length>200)throw Error('Use a password between 10 and 200 characters.');
 const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const key=await keyFor(password,salt,['encrypt']);
 const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(encodeProject(project)));
 return ['1',b64(salt),b64(iv),b64(encrypted)].join('.');
}
export async function unlockSession(token,password){
 try{
  if(token.length>160000)throw Error();
  const [version,s,i,data,...extra]=token.split('.');
  if(version!=='1'||extra.length||password.length>200)throw Error();
  const salt=unb64(s),iv=unb64(i),cipher=unb64(data);
  if(salt.length!==16||iv.length!==12)throw Error();
  const key=await keyFor(password,salt,['decrypt']);
  return decodeProject(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv},key,cipher)));
 }catch{throw Error('The password is incorrect or this listening link is incomplete.');}
}
