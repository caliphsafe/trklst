import React,{useState,useRef,useEffect} from 'react';
import {X,Link,Lock,Unlock,Copy,Loader2} from 'lucide-react';
import {encodeProject} from './project.mjs';
import {sessionPayload,lockSession,unlockSession} from './session.mjs';

export function Modal({title,onClose,children}){
 const ref=useRef(null);
 useEffect(()=>{const old=document.activeElement,before=document.body.style.overflow;document.body.style.overflow='hidden';ref.current?.querySelector('button,input,textarea,select')?.focus();return()=>{document.body.style.overflow=before;old?.focus();};},[]);
 function key(e){if(e.key==='Escape')onClose();if(e.key!=='Tab')return;const items=[...ref.current.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea,select,a[href]')];if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0]?.focus();}}
 return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><section className="modal session-modal" role="dialog" aria-modal="true" aria-label={title} ref={ref} onKeyDown={key}><div className="modal-top"><h2>{title}</h2><button className="icon" onClick={onClose} aria-label="Close dialog"><X/></button></div>{children}</section></div>;
}
export function SharePanel({project,onClose}){
 const [mode,setMode]=useState('snapshot'),[protectedLink,setProtected]=useState(false),[password,setPassword]=useState(''),[link,setLink]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[copied,setCopied]=useState(false);
 function reset(){setLink('');setCopied(false);setError('');}
 async function generate(e){e.preventDefault();setBusy(true);setError('');try{const payload=sessionPayload(project,mode);const hash=protectedLink?'#locked='+await lockSession(payload,password):'#listen='+encodeProject(payload);setLink(location.origin+location.pathname+hash);}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <Modal title="Share a listening session" onClose={onClose}><p>Listeners get playback controls only. They cannot change your saved artist project.</p><form onSubmit={generate}>
 <label>What should this link play?<select value={mode} disabled={busy} onChange={e=>{setMode(e.target.value);reset();}}><option value="snapshot">This exact sequence</option><option value="drive">Follow current Drive filenames</option></select></label>
 <p className="session-note">{mode==='snapshot'?'Captures the order and details you have now. Drive renames and replacement audio refresh, but later drag-and-drop changes require a new listener link.':'A permanent link to the current folder contents, sorted by filename. Prefix filenames with 01, 02, 03 in Drive to control this order. This does not follow your local drag-and-drop sequence. Artist name and cover remain as shared.'}</p>
 <label className="check-label"><input type="checkbox" checked={protectedLink} disabled={busy} onChange={e=>{setProtected(e.target.checked);reset();}}/>Password-encrypt this link</label>
 {protectedLink&&<><label>Session password<input type="password" autoComplete="new-password" minLength={10} maxLength={200} required value={password} disabled={busy} onChange={e=>{setPassword(e.target.value);reset();}} placeholder="At least 10 characters"/></label><p className="session-note">Share the password separately. It encrypts the project details in this link, not the public MP3 files. Changing or removing a password creates a new link; old links cannot be revoked.</p></>}
 <button className="button primary wide" disabled={busy}>{busy?<Loader2 className="spin"/>:<Link size={16}/>}Create listener link</button></form>
 {error&&<p className="error" role="alert">{error}</p>}
 {link&&<div className="generated-link"><label>Listener link<textarea aria-label="Listener link" readOnly value={link} onFocus={e=>e.target.select()}/></label><button className="button outline wide" onClick={async()=>{try{await navigator.clipboard.writeText(link);setCopied(true);}catch{setError('Select the full link above and copy it manually.');}}}><Copy size={16}/>{copied?'Copied':'Copy listener link'}</button><p className="fine">No files uploaded. No database. Keep the full link.</p></div>}
 </Modal>;
}
export function UnlockPanel({token,onUnlock,onClose,artist=false}){
 const [password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 return <Modal title={artist?"Unlock artist project":"Enter password"} onClose={onClose}><form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await onUnlock(await unlockSession(token,password),password);}catch(e){setError(e.message);}finally{setBusy(false);}}}><label>Password<input type="password" autoComplete="current-password" required maxLength={200} value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p className="error" role="alert">{error}</p>}<button disabled={busy} className="button primary wide">{busy?<Loader2 className="spin"/>:<Unlock size={16}/>}{artist?'Unlock project':'Listen'}</button></form></Modal>;
}
export function VersionsPanel({versions,onSave,onRestore,onClose}){
 const [name,setName]=useState('');
 return <Modal title="Sequence versions" onClose={onClose}><p>Keep up to 12 arrangements on this browser. Restoring a version keeps current filenames and flags missing tracks.</p><form onSubmit={e=>{e.preventDefault();if(onSave(name.trim()||'Untitled version'))setName('');}}><label>Version name<input maxLength={60} value={name} onChange={e=>setName(e.target.value)} placeholder="Version A — slow build"/></label><button className="button primary wide">Save current sequence</button></form><div className="version-list">{versions.length?versions.map(v=><div key={v.id}><div><strong>{v.name}</strong><small>{new Date(v.at).toLocaleString()} · {v.tracks.length} tracks</small></div><button className="button outline" onClick={()=>onRestore(v)}>Restore</button></div>):<p>No versions saved yet.</p>}</div></Modal>;
}

export function ArtistPasswordPanel({enabled,onSave,onClose}){
 const [password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function save(value){setBusy(true);setError('');try{await onSave(value);onClose();}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <Modal title="Artist password" onClose={()=>{if(!busy)onClose();}}><p>Encrypts this browser’s saved project and versions. You’ll enter it when reopening the artist page. Keep it safe—there is no password recovery.</p><form onSubmit={e=>{e.preventDefault();if(password!==confirm){setError('Passwords do not match.');return;}save(password);}}><label>{enabled?'New password':'Password'}<input type="password" required minLength={10} maxLength={200} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/></label><label>Confirm password<input type="password" required maxLength={200} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>{error&&<p className="error" role="alert">{error}</p>}<button className="button primary wide" disabled={busy}>{busy?<Loader2 className="spin"/>:<Lock size={16}/>} {enabled?'Change password':'Set password'}</button>{enabled&&<button type="button" className="button outline wide" disabled={busy} onClick={()=>save('')}>Remove artist password</button>}</form><p className="fine">Listener passwords are separate. Public Drive audio remains public.</p></Modal>;
}
