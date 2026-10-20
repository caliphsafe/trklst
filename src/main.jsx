import React, {useState,useRef,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {DndContext,MouseSensor,TouchSensor,KeyboardSensor,useSensor,useSensors,closestCenter} from '@dnd-kit/core';
import {SortableContext,useSortable,verticalListSortingStrategy,sortableKeyboardCoordinates} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {ArrowUpRight,ArrowRight,Lock,GripVertical,Play,Pause,SkipBack,SkipForward,Link,Plus,X,ImagePlus,Music2,Disc3,Check,Headphones,Repeat2,Volume2,Undo2,Settings2,Download,Loader2,FolderOpen,Copy,RefreshCw,Layers} from 'lucide-react';
import {folderFromLink,encodeProject,decodeProject,validateProject,moveTrack,nextTrack,audioUrl,time} from './project.mjs';
import {importFolder} from './import-folder.mjs';
import {storageKey,readLocal,readSession,mergeDriveTracks,artistRecord,lockSession} from './session.mjs';
import {SharePanel,UnlockPanel,VersionsPanel,Modal,ArtistPasswordPanel} from './SessionPanels.jsx';
import './styles.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/space-grotesk/latin-500.css';
import '@fontsource/space-grotesk/latin-700.css';

const localRead=readLocal;
function title(track){return track.name.replace(/\.mp3$/i,'').replace(/_/g,' ');}
function readInitial(){return readSession(location.hash);}
function Cover({cover,small=false}){return <div className={`cover ${small?'small':''}`}>{cover?<img src={cover} alt="Project cover artwork"/>:<><div className="cover-orbit one"/><div className="cover-orbit two"/><div className="cover-orbit three"/><div className="cover-dot"/>{!small&&<><span className="cover-label">A WORK IN PROGRESS</span><span className="cover-word">YOUR<br/>NEXT<br/>CHAPTER.</span><span className="cover-bottom">SOUND / IN SEQUENCE</span></>}</>}</div>;}
async function compactCover(file){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Choose a JPG, PNG, or WebP image.');
  if(file.size>15000000)throw new Error('Choose an image smaller than 15 MB.');
  const bitmap=await createImageBitmap(file);const canvas=document.createElement('canvas');canvas.width=canvas.height=192;const ctx=canvas.getContext('2d');ctx.fillStyle='#171817';ctx.fillRect(0,0,192,192);const size=Math.min(bitmap.width,bitmap.height);ctx.drawImage(bitmap,(bitmap.width-size)/2,(bitmap.height-size)/2,size,size,0,0,192,192);bitmap.close();
  let data=canvas.toDataURL('image/jpeg',.65);if(data.length>14000)data=canvas.toDataURL('image/jpeg',.35);if(data.length>18000)throw new Error('Try a simpler cover image.');return data;
}
function ProjectForm({existing,onClose,onSave}){
  const [artist,setArtist]=useState(existing?.artist||''),[name,setName]=useState(existing?.title||''),[folder,setFolder]=useState(existing?.folder||''),[cover,setCover]=useState(existing?.cover||''),[busy,setBusy]=useState(false),[imageBusy,setImageBusy]=useState(false),[error,setError]=useState('');
  const [retrying,setRetrying]=useState(false),[protectArtist,setProtectArtist]=useState(false),[newPassword,setNewPassword]=useState(''),[confirmPassword,setConfirmPassword]=useState('');
  const dialog=useRef(null),first=useRef(null);
  useEffect(()=>{const previous=document.activeElement;first.current?.focus();const before=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=before;previous?.focus();};},[]);
  async function submit(e){e.preventDefault();setError('');setBusy(true);setRetrying(false);try{if(!existing&&protectArtist&&newPassword!==confirmPassword)throw Error('Artist passwords do not match.');folderFromLink(folder);let tracks=existing?.tracks;
    if(!existing||folder!==existing.folder){const result=await importFolder(folder,{onRetry:()=>setRetrying(true)});tracks=result.tracks;}
    await onSave({...existing,v:1,id:existing?.id||crypto.randomUUID(),artist:artist.trim(),title:name.trim(),folder,cover,tracks,updated:Date.now()},existing?undefined:protectArtist?newPassword:'');
  }catch(e){setError(e.message||'Import failed. Please try again.');}finally{setBusy(false);}}
  function trap(e){if(e.key==='Escape'&&!busy)onClose();if(e.key!=='Tab')return;const items=[...dialog.current.querySelectorAll('button:not([disabled]), input:not([disabled]), a[href]')];if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0].focus();}}
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose();}}><section ref={dialog} className="modal" role="dialog" aria-modal="true" aria-labelledby="form-title" onKeyDown={trap}>
    <div className="modal-top"><span className="eyebrow">YOUR NEXT PROJECT</span><button className="icon" aria-label="Close" disabled={busy} onClick={onClose}><X/></button></div>
    <h2 id="form-title">{existing?'Make it yours.':'Start with the music.'}</h2><p>One folder. Every track. A little room to experiment.</p>
    <form onSubmit={submit}><label>Google Drive folder link<input ref={first} required type="url" value={folder} onChange={e=>setFolder(e.target.value)} placeholder="https://drive.google.com/drive/folders/…"/></label>
    <div className="form-note"><FolderOpen size={18}/><span>Set the folder to <strong>Anyone with the link</strong>. Add MP3s directly inside it and allow downloads. Up to 100 tracks.</span></div>
    <div className="form-grid"><label>Artist name<input required maxLength={100} value={artist} onChange={e=>setArtist(e.target.value)} placeholder="Your artist name"/></label><label>Project name<input required maxLength={100} value={name} onChange={e=>setName(e.target.value)} placeholder="The working title"/></label></div>
    <div className="artwork-field"><label className="artwork-input">{cover?<img src={cover} alt="Selected cover"/>:<ImagePlus/>}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy||imageBusy} onChange={async e=>{const f=e.target.files?.[0];if(!f)return;setImageBusy(true);try{setCover(await compactCover(f));setError('');}catch(err){setError(err.message);}finally{setImageBusy(false);}}}/><span className="sr-only">Upload cover art</span></label><div><strong>{imageBusy?'Preparing artwork…':'Add cover art'} <span className="muted">(optional)</span></strong><p>JPG, PNG, or WebP. A compact square copy travels with your link.</p>{cover&&<button type="button" className="text-button" onClick={()=>setCover('')}>Remove artwork</button>}</div></div>
    {!existing&&<div className="creation-password"><label className="check-label"><input type="checkbox" checked={protectArtist} onChange={e=>setProtectArtist(e.target.checked)}/>Protect artist page with a password</label>{protectArtist&&<div className="form-grid"><label>Artist password<input type="password" autoComplete="new-password" minLength={10} maxLength={200} required value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></label><label>Confirm password<input type="password" autoComplete="new-password" required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/></label></div>}</div>}
    {error&&<p className="error" role="alert">{error}</p>}
    <button className="button primary wide" disabled={busy||imageBusy} type="submit">{busy?<><Loader2 className="spin"/>{retrying?'Connection interrupted. Retrying…':'Reading your folder…'}</>:<>{existing?'Save project':'Create listening room'}<ArrowRight size={18}/></>}</button><p className="fine">No account. No database. Keep your project link to return.</p></form>
  </section></div>;
}
function TrackRow({track,index,active,playing,onPlay,onMove,count,duration,readOnly=false}){
 const {attributes,listeners,setNodeRef,transform,transition,isDragging}=useSortable({id:track.id,disabled:readOnly});
 return <div ref={setNodeRef} style={{transform:CSS.Transform.toString(transform),transition}} className={`track ${track.missing?'missing':''} ${active?'active':''} ${isDragging?'dragging':''}`}>
  {!readOnly&&<button className="drag-handle" aria-label={`Reorder ${title(track)}. Hold to drag, or press Space then arrow keys.`} {...attributes} {...listeners}><GripVertical size={18}/></button>}
  <span className="track-number">{active&&playing?<span className="equalizer"><i/><i/><i/></span>:String(index+1).padStart(2,'0')}</span>
  <button className="track-title" disabled={track.missing} onClick={()=>onPlay(track)}><span>{title(track)}</span><small>{track.missing?'UNAVAILABLE IN DRIVE':active?(playing?'NOW PLAYING':'SELECTED'):'MP3 AUDIO'}</small></button>
  <span className="track-duration">{time(duration)}</span><button disabled={track.missing} className="row-play icon" aria-label={`${active&&playing?'Pause':'Play'} ${title(track)}`} onClick={()=>onPlay(track)}>{active&&playing?<Pause size={17}/>:<Play size={17}/>}</button>
 </div>;
}
function App(){
 const [initial]=useState(readInitial),[project,setProject]=useState(initial.project),[error,setError]=useState(initial.error),[form,setForm]=useState(null),[toast,setToast]=useState(''),[saved,setSaved]=useState(true),[current,setCurrent]=useState(null),[playing,setPlaying]=useState(false),[loading,setLoading]=useState(false),[position,setPosition]=useState(0),[duration,setDuration]=useState(0),[durations,setDurations]=useState({}),[repeat,setRepeat]=useState(false),[volume,setVolume]=useState(1),[history,setHistory]=useState([]),[linkDialog,setLinkDialog]=useState(false);
 const [listener,setListener]=useState(!!initial.listener),[locked,setLocked]=useState(initial.locked||''),[shareOpen,setShareOpen]=useState(false),[versionsOpen,setVersionsOpen]=useState(false),[versions,setVersions]=useState([]),[syncing,setSyncing]=useState(false),[syncLabel,setSyncLabel]=useState(''),[revision,setRevision]=useState(Date.now()),[gap,setGap]=useState(0);
 const [artistPassword,setArtistPassword]=useState(''),[artistLocked,setArtistLocked]=useState(initial.artistLocked||null),[passwordOpen,setPasswordOpen]=useState(false),[saving,setSaving]=useState(false);
 const saveToken=useRef(0),passwordRef=useRef('');passwordRef.current=artistPassword;
 const audio=useRef(null),live=useRef({project,current,repeat,listener}),playToken=useRef(0),syncToken=useRef(0),syncBusy=useRef(false),loadedRevision=useRef(null),gapTimer=useRef(null);
 live.current={project,current,repeat,listener};
 function clearGap(){clearTimeout(gapTimer.current);gapTimer.current=null;}
 useEffect(()=>()=>{clearGap();syncToken.current++;},[]);
 const sensors=useSensors(useSensor(MouseSensor,{activationConstraint:{distance:6}}),useSensor(TouchSensor,{activationConstraint:{delay:220,tolerance:6}}),useSensor(KeyboardSensor,{coordinateGetter:sortableKeyboardCoordinates}));
 const [recent,setRecent]=useState(()=>localRead('trklst:recent')||[]);
 useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),3500);return()=>clearTimeout(timer);},[toast]);
 useEffect(()=>{
  if(!project||listener)return;
  const token=++saveToken.current;setSaving(true);
  (async()=>{try{
   const record=await artistRecord(project,artistPassword);
   if(token!==saveToken.current)return;
   localStorage.setItem(storageKey(project.id),JSON.stringify(record));
   if(artistPassword)localStorage.removeItem('trklst:versions:'+project.id);
   window.history.replaceState(null,'',location.pathname+location.search+'#edit='+project.id);
   const list=[{id:project.id,title:artistPassword?'Protected project':project.title,artist:artistPassword?'Password required':project.artist,updated:project.updated},...(localRead('trklst:recent')||[]).filter(p=>p.id!==project.id)].slice(0,12);
   localStorage.setItem('trklst:recent',JSON.stringify(list));setRecent(list);setSaved(true);
  }catch{if(token===saveToken.current){setSaved(false);setError('Autosave failed. Keep this page open and use Transfer copy to save your current work.');}}
  finally{if(token===saveToken.current)setSaving(false);}})();
  return()=>{saveToken.current++;};
 },[project,listener,artistPassword]);
 useEffect(()=>{function leave(e){if(saving){e.preventDefault();e.returnValue='';}}window.addEventListener('beforeunload',leave);return()=>window.removeEventListener('beforeunload',leave);},[saving]);
 useEffect(()=>{const load=()=>{stop();syncToken.current++;syncBusy.current=false;setSyncing(false);const r=readInitial();setProject(r.project);setListener(!!r.listener);setLocked(r.locked||'');setArtistLocked(r.artistLocked||null);setArtistPassword('');setError(r.error);setHistory([]);setShareOpen(false);setVersionsOpen(false);};window.addEventListener('hashchange',load);return()=>window.removeEventListener('hashchange',load);},[]);
 useEffect(()=>{
  if(!project)return;
  setVersions(listener?[]:(project.localVersions||localRead('trklst:versions:'+project.id)||[]));
  refreshDrive(false);
  const interval=listener?setInterval(()=>{if(document.visibilityState==='visible'&&!syncBusy.current)refreshDrive(false);},60000):null;
  return()=>{syncToken.current++;syncBusy.current=false;clearInterval(interval);};
 },[project?.id,project?.folder,listener]);
 useEffect(()=>{if(audio.current)audio.current.volume=volume;},[volume]);
 useEffect(()=>{function key(e){if(e.code==='Space'&&!form&&!linkDialog&&!shareOpen&&!versionsOpen&&!passwordOpen&&!artistLocked&&!locked&&!['INPUT','TEXTAREA','SELECT','BUTTON','A'].includes(e.target.tagName)&&project){e.preventDefault();toggle();}}window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);});
 function stop(){clearGap();playToken.current++;audio.current?.pause();if(audio.current){audio.current.removeAttribute('src');audio.current.load();}setCurrent(null);setPlaying(false);setPosition(0);setDuration(0);setLoading(false);}
 function update(p){if(!live.current.listener)setProject({...p,updated:Date.now()});}
 function reorder(from,to){if(listener||from===to)return;setHistory(h=>[...h.slice(-19),project.tracks]);update({...project,tracks:moveTrack(project.tracks,from,to)});setToast('Sequence updated');}
 async function play(track){clearGap();if(!track||track.missing)return;const a=audio.current;const token=++playToken.current;setError('');setLoading(true);if(current!==track.id||loadedRevision.current!==revision){loadedRevision.current=revision;setCurrent(track.id);setPosition(0);setDuration(0);a.src=audioUrl(track,revision);a.load();}try{await a.play();}catch(e){if(token===playToken.current&&e.name!=='AbortError')setError(e.name==='NotAllowedError'?'Tap play to continue listening.':'Could not play this MP3. Check the file’s public access and download permissions, or try again later.');}finally{if(token===playToken.current)setLoading(false);}}
 function toggle(){if(gapTimer.current){clearGap();setLoading(false);return;}if(playing){audio.current.pause();setLoading(false);}else play(project?.tracks.find(t=>t.id===current)||project?.tracks.find(t=>!t.missing));}
 function select(track){if(track.id===current)toggle();else play(track);}
 function step(direction){const p=live.current.project;if(!p)return;const i=p.tracks.findIndex(t=>t.id===live.current.current);if(direction<0&&audio.current.currentTime>3){audio.current.currentTime=0;return;}const candidates=direction>0?p.tracks.slice(i+1):p.tracks.slice(0,Math.max(i,0)).reverse();const t=candidates.find(t=>!t.missing)||(repeat?(direction>0?p.tracks.find(t=>!t.missing):[...p.tracks].reverse().find(t=>!t.missing)):null);if(t)play(t);}
 async function copyLink(){
 if(!saved&&artistPassword){await transferLink();return;}
 const link=location.origin+location.pathname+(saved?'#edit='+project.id:'#p='+encodeProject(project));
 try{await navigator.clipboard.writeText(link);setToast(saved?'Artist link copied — use this same browser':'Transfer snapshot copied');}catch{setLinkDialog(link);}
}
async function transferLink(){try{const hash=artistPassword?'#artist='+await lockSession(project,artistPassword):'#p='+encodeProject(project);setLinkDialog(location.origin+location.pathname+hash);}catch(e){setError(e.message);}}
async function refreshDrive(manual=true){
 const start=live.current.project;if(!start)return;
 const token=++syncToken.current;syncBusy.current=true;setSyncing(true);setSyncLabel('Checking Drive…');
 try{
  const result=await importFolder(start.folder,{refresh:true,onRetry:()=>{if(token===syncToken.current)setSyncLabel('Connection interrupted. Retrying…');}});
  if(token!==syncToken.current||live.current.project?.id!==start.id||live.current.project?.folder!==start.folder)return;
  const now=live.current.project;
  const tracks=mergeDriveTracks(now.tracks,result.tracks,{listener:live.current.listener,followDrive:live.current.listener&&now.listenOrder==='drive'});
  if(tracks.length>100)throw Error('The refreshed project exceeds 100 tracks. No changes were applied.');
  if(live.current.current&&!tracks.some(t=>t.id===live.current.current&&!t.missing))stop();
  setProject({...now,tracks,updated:live.current.listener?now.updated:Date.now()});
  setRevision(Date.now());setDurations(old=>live.current.current&&old[live.current.current]?{[live.current.current]:old[live.current.current]}:{});setSyncLabel('Drive checked '+new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}));
  if(manual){setHistory([]);setToast(listener?'Updated':'Drive refreshed. Active audio finishes without restarting.');}
 }catch(e){if(token===syncToken.current){setSyncLabel('Drive refresh failed — saved tracks retained');setError(e.message);}}
 finally{if(token===syncToken.current){syncBusy.current=false;setSyncing(false);}}
}
async function changeArtistPassword(password){
 const p={...live.current.project,localVersions:versions};
 const token=++saveToken.current;
 const record=await artistRecord(p,password);
 if(token!==saveToken.current)throw Error('The project changed while saving. Please try again.');
 localStorage.setItem(storageKey(p.id),JSON.stringify(record));
 localStorage.removeItem('trklst:versions:'+p.id);
 setArtistPassword(password);setProject(p);setSaved(true);setToast(password?'Artist password saved':'Artist password removed');
}
async function lockArtist(){
 try{const p=live.current.project;const record=await artistRecord(p,artistPassword);if(live.current.project!==p)throw Error('Project changed. Please lock again.');localStorage.setItem(storageKey(p.id),JSON.stringify(record));saveToken.current++;syncToken.current++;stop();setArtistLocked({id:p.id,token:record.token});setArtistPassword('');setProject(null);}catch(e){setError('Could not save and lock the project. '+e.message);}
}
function saveVersion(name){
 try{
  const next=[{id:crypto.randomUUID(),at:Date.now(),name,tracks:project.tracks},...versions].slice(0,12);
  update({...project,localVersions:next});setVersions(next);setToast('Sequence version saved on this browser');return true;
 }catch{setError('This browser could not save a version. Export your list or copy a transfer link.');return false;}
}
function restoreVersion(version){
 const tracks=mergeDriveTracks(version.tracks,project.tracks.filter(t=>!t.missing));
 if(tracks.length>100){setError('This restore would exceed 100 tracks.');return;}
 setHistory(h=>[...h.slice(-19),project.tracks]);update({...project,tracks});setVersionsOpen(false);setToast('Sequence restored; new Drive files remain at the end');
}
 function home(){saveToken.current++;setArtistPassword('');setArtistLocked(null);setPasswordOpen(false);stop();syncToken.current++;syncBusy.current=false;setSyncing(false);setLocked('');setListener(false);setProject(null);setHistory([]);setError('');window.history.replaceState(null,'',location.pathname);}
 function downloadSequence(){const text=`${project.title}\n${project.artist}\n\n${project.tracks.map((t,i)=>`${String(i+1).padStart(2,'0')}. ${title(t)}`).join('\n')}\n\n${location.href}\n`;const url=URL.createObjectURL(new Blob([text],{type:'text/plain'}));const a=document.createElement('a');a.href=url;a.download=`${project.title.replace(/[^a-z0-9 -]/gi,'')||'tracklist'}.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 const track=project?.tracks.find(t=>t.id===current),index=project?.tracks.findIndex(t=>t.id===current)??-1;
 return <div className={listener?"app listener-app":"app"}><header className="header"><button className="brand" disabled={saving} onClick={home} aria-label="TRKLST home">TRKLST<span className="brand-bars"><i/><i/><i/></span></button><span className="header-tag">EVERY TRACK HAS ITS PLACE.</span><div className="header-right"><span className="private-note"><span/>YOUR LISTENING ROOM</span>{!listener&&<button className="button subtle" disabled={saving} onClick={()=>setForm('new')}><Plus size={16}/><span>New project</span></button>}</div></header>
 <main>{error&&<div className="page-error" role="alert">{error}<button className="icon" aria-label="Dismiss error" onClick={()=>setError('')}><X size={16}/></button></div>}
 {!project?(locked||artistLocked?<div className="locked-page"/>:<><section className="landing"><div className="landing-copy"><div className="eyebrow"><span className="live-dot"/> BUILT FOR THE IN-BETWEEN</div><h1>Good tracks.<br/>Great <em>sequence.</em></h1><p>The opener. The turning point. The last word.<br className="desktop"/> Find the order that makes your project feel complete.</p><button className="button primary large" onClick={()=>setForm('new')}>Create a listening room<ArrowUpRight size={21}/></button><div className="landing-foot"><Link size={15}/><span>Bring a Drive folder. Leave with a project link.</span></div></div>
 <div className="sequence-art" aria-hidden="true"><div className="art-heading"><span>THE ART OF THE ORDER</span><span>VOL. 001</span></div><div className="vinyl"><div className="vinyl-label"><span>TRKLST</span><b>01</b><small>FIND YOUR FLOW</small></div></div><div className="art-track t-one"><GripVertical size={17}/><span>01</span><strong>The introduction</strong><span>03:24</span></div><div className="art-track t-two"><GripVertical size={17}/><span>02</span><strong>A change of pace</strong><span className="equalizer"><i/><i/><i/></span></div><div className="art-track t-three"><GripVertical size={17}/><span>03</span><strong>Something to remember</strong><span>04:12</span></div><div className="art-footer">ARRANGE. LISTEN. FEEL IT OUT.<ArrowUpRight size={22}/></div></div></section>
 <section className="how"><div><span>01 / CONNECT</span><h3>Your music, already there.</h3><p>Link a public Google Drive folder of MP3s. Add your name, project title, and cover art.</p></div><div><span>02 / EXPERIMENT</span><h3>Move it until it moves you.</h3><p>Hold and drag a track into place. Press play and hear your project in its new order.</p></div><div><span>03 / RETURN</span><h3>A whole project in a link.</h3><p>Keep one artist link on this browser. Changes autosave here; send a separate listening link to others.</p></div></section>
 {recent.length>0&&<section className="recent"><div className="section-heading"><h2>Back in the studio</h2><span>ON THIS DEVICE</span></div><div className="recent-grid">{recent.map(r=><button key={r.id} onClick={()=>{try{const opened=readSession('#edit='+r.id);if(opened.error)throw Error(opened.error);setArtistPassword('');setArtistLocked(opened.artistLocked||null);setProject(opened.project);setError('');}catch{setError('This project is no longer saved on this device. Open your copied project link.');}}}><Disc3/><div><strong>{r.title}</strong><span>{r.artist}</span></div><ArrowUpRight size={18}/></button>)}</div></section>}</>):
 <section className="workspace"><div className="workspace-top"><span className="eyebrow"><span className="live-dot"/> {listener?'LISTEN ONLY':'THE LISTENING ROOM'}</span><span className={`save-status ${saved?'':'unsaved'}`}>{saved?<Check size={14}/>:<Link size={14}/>} {listener?'':saving?'Saving…':saved?'Saved on this browser':'Autosave unavailable — copy a transfer link'}</span></div><div className="workspace-grid"><aside className="project-panel"><Cover cover={project.cover}/><div className="project-meta"><span className="eyebrow">{project.artist}</span><h1>{project.title}</h1><p>{project.tracks.length} tracks{!listener&&<> <span>·</span> A work in progress</>}</p></div><button className="button primary wide" disabled={!project.tracks.some(t=>!t.missing)} onClick={()=>playing?toggle():play(project.tracks.find(t=>!t.missing))}>{playing?<Pause size={17}/>:<Play size={17} fill="currentColor"/>}{playing?'Pause':listener?'Play':'Listen from the top'}</button>{!listener&&<><button className="button outline wide" onClick={copyLink}><Link size={16}/>Copy artist link<ArrowUpRight size={16}/></button><button className="button outline wide" onClick={()=>setShareOpen(true)}><Headphones size={16}/>Share listening session</button><div className="project-tools"><button onClick={()=>setForm('edit')}><Settings2 size={15}/>Edit details</button><button onClick={downloadSequence}><Download size={15}/>Export list</button></div><div className="project-tools"><button onClick={()=>setVersionsOpen(true)}><Layers size={15}/>Versions</button><button onClick={transferLink}><Copy size={15}/>Transfer copy</button><button onClick={()=>setPasswordOpen(true)}><Lock size={15}/>Artist password</button>{artistPassword&&<button onClick={lockArtist} disabled={saving}><Lock size={15}/>Lock</button>}</div></>}
 <button className="button outline wide sync-button" disabled={syncing} onClick={()=>refreshDrive()}><RefreshCw size={16} className={syncing?'spin':''}/>{syncing?'Refreshing Drive…':'Refresh from Drive'}</button>
 <p className="sync-status" role="status">{syncLabel}</p>
 <div className="link-note"><Link size={17}/><p>{listener?(project.listenOrder==='drive'?'Follows current Drive filenames. Checks every minute while this page is visible. Local artist drag-and-drop edits are not published to Drive.':'This is the artist’s shared sequence snapshot. Filenames and audio refresh from Drive; later sequence edits need a new link.'):'Your artist link stays the same on this browser. Changes autosave locally. Clearing browser data removes those edits. Use Transfer copy to move a snapshot to another device.'}</p></div>
 <label className="gap-control">Gap between tracks<select value={gap} onChange={e=>setGap(Number(e.target.value))}><option value="0">No added gap</option><option value="1">1 second</option><option value="2">2 seconds</option><option value="3">3 seconds</option><option value="5">5 seconds</option></select></label>
 <a href={project.folder} target="_blank" rel="noreferrer" className="drive-link"><FolderOpen size={14}/>Open source folder<ArrowUpRight size={14}/></a></aside>
 <div className="sequence-panel"><div className="sequence-title"><div><h2>Find your flow<span>.</span></h2><p>Every move changes the story.</p></div><span className="sequence-count">{String(project.tracks.length).padStart(2,'0')}<small>TRACKS</small></span></div><div className="sequence-toolbar"><span><GripVertical size={16}/><span>{listener?'Listen to the artist’s sequence.':'Hold the handle. Drag into place.'}</span></span>{!listener&&<button disabled={!history.length} onClick={()=>{update({...project,tracks:history.at(-1)});setHistory(h=>h.slice(0,-1));setToast('Previous sequence restored');}}><Undo2 size={15}/>Undo</button>}</div><div className="list-header"><span>ORDER</span><span>TRACK TITLE</span><span>TIME</span></div>
 <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={({active,over})=>{if(over&&!listener)reorder(project.tracks.findIndex(t=>t.id===active.id),project.tracks.findIndex(t=>t.id===over.id));}}><SortableContext items={project.tracks.map(t=>t.id)} strategy={verticalListSortingStrategy}><div className="tracklist">{project.tracks.map((t,i)=><TrackRow key={t.id} track={t} index={i} count={project.tracks.length} active={current===t.id} playing={playing} duration={durations[t.id]} onPlay={select} onMove={reorder} readOnly={listener}/>)}</div></SortableContext></DndContext><div className="sequence-bottom"><Headphones size={16}/><p>Trust your ears. There’s no wrong first draft.</p></div></div></div></section>}
 </main><footer className={`footer ${project?'with-player':''}`}><span>TRKLST</span><p>A little space between making music and releasing it.</p><span>MADE FOR ARTISTS.</span></footer>
 {project&&<div className="player"><div className="player-track"><Cover cover={project.cover} small/><div><strong>{track?title(track):project.title}</strong><span>{project.artist}</span></div></div><div className="player-center"><div className="transport"><button className={`icon repeat ${repeat?'enabled':''}`} aria-label="Repeat project" aria-pressed={repeat} onClick={()=>setRepeat(!repeat)}><Repeat2 size={18}/></button><button className="icon" aria-label="Previous track" disabled={index<=0&&position<3&&!repeat} onClick={()=>step(-1)}><SkipBack size={19}/></button><button className="main-play" aria-label={playing?'Pause':'Play'} onClick={toggle}>{loading?<Loader2 size={20} className="spin"/>:playing?<Pause size={20} fill="currentColor"/>:<Play size={20} fill="currentColor"/>}</button><button className="icon" aria-label="Next track" disabled={index===project.tracks.length-1&&!repeat} onClick={()=>step(1)}><SkipForward size={19}/></button><span className="queue-count">{index>=0?String(index+1).padStart(2,'0'):'—'} / {String(project.tracks.length).padStart(2,'0')}</span></div><div className="seek"><span>{time(position)}</span><input aria-label="Seek within track" type="range" min="0" max={duration||0} step="0.1" value={Math.min(position,duration||0)} disabled={!duration} onChange={e=>{audio.current.currentTime=Number(e.target.value);setPosition(Number(e.target.value));}}/><span>{time(duration||NaN)}</span></div></div><div className="volume"><Volume2 size={18}/><input aria-label="Volume" type="range" min="0" max="1" step="0.01" value={volume} onChange={e=>setVolume(Number(e.target.value))}/></div></div>}
 <audio ref={audio} preload="metadata" onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onPlaying={()=>setLoading(false)} onWaiting={()=>setLoading(true)} onTimeUpdate={e=>setPosition(e.currentTarget.currentTime)} onLoadedMetadata={e=>{const d=e.currentTarget.duration;setDuration(Number.isFinite(d)?d:0);const id=live.current.current;if(id&&Number.isFinite(d))setDurations(old=>({...old,[id]:d}));}} onEnded={()=>{setPlaying(false);const advance=()=>{gapTimer.current=null;setLoading(false);const s=live.current;if(!s.project)return;const next=nextTrack(s.project.tracks,s.current,s.repeat);if(next){if(next.id===s.current)audio.current.currentTime=0;play(next);}else setToast(listener?'End of project':'End of sequence. How did it feel?');};if(gap&&nextTrack(live.current.project.tracks,live.current.current,repeat)){setLoading(true);gapTimer.current=setTimeout(advance,gap*1000);}else advance();}} onError={()=>{setLoading(false);setPlaying(false);if(audio.current?.getAttribute('src'))setError('This track is unavailable. Check its Drive sharing and download permissions, or try again if Google has limited downloads. You can skip to the next track.');}}/>
 {form&&!listener&&<ProjectForm existing={form==='edit'?project:null} onClose={()=>setForm(null)} onSave={async(p,newPassword)=>{if(newPassword!==undefined){await artistRecord(p,newPassword);setArtistPassword(newPassword);}if(!project||p.id!==project.id||p.folder!==project.folder){stop();setHistory([]);}setProject(p);setForm(null);setError('');setToast(form==='edit'?'Project updated':'Room created. Bookmark the artist link on this browser.');}}/>}
 {linkDialog&&<Modal title="Keep your artist link" onClose={()=>setLinkDialog(false)}><p>{linkDialog.includes('#edit=')?'This link always opens your latest saved edits on this browser. It cannot restore this project on another device.':'This transfer link contains a snapshot of the current project. Use it to bring an editable copy to another device. Later edits on separate devices do not sync.'}</p><textarea className="share-text" readOnly autoFocus aria-label="Artist link" value={linkDialog} onFocus={e=>e.target.select()}/></Modal>}
 {shareOpen&&!listener&&<SharePanel project={project} onClose={()=>setShareOpen(false)}/>}
 {versionsOpen&&!listener&&<VersionsPanel versions={versions} onSave={saveVersion} onRestore={restoreVersion} onClose={()=>setVersionsOpen(false)}/>}
 {passwordOpen&&!listener&&<ArtistPasswordPanel enabled={!!artistPassword} onSave={changeArtistPassword} onClose={()=>setPasswordOpen(false)}/>}
 {artistLocked&&<UnlockPanel artist token={artistLocked.token} onClose={home} onUnlock={(p,password)=>{if(artistLocked.id&&p.id!==artistLocked.id)throw Error('This project does not match the saved artist link.');setArtistPassword(password);setProject(p);setArtistLocked(null);setListener(false);setError('');}}/>}
 {locked&&<UnlockPanel token={locked} onClose={home} onUnlock={p=>{setProject(p);setListener(true);setLocked('');setError('');}}/>}
 {toast&&<div className="toast" role="status"><Check size={16}/>{toast}</div>}
 </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
