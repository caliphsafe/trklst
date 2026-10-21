import {audioFormat} from './audio-formats.mjs';
import LZString from 'lz-string';
export const MAX_TRACKS = 100;
const idPattern = /^[\w-]{10,150}$/;
export function folderFromLink(value) {
  let url; try { url = new URL(value); } catch { throw new Error('Paste a complete Google Drive folder link.'); }
  if (url.protocol !== 'https:' || url.hostname !== 'drive.google.com') throw new Error('Use a folder link from drive.google.com.');
  const id = url.pathname.match(/\/folders\/([\w-]+)/)?.[1] || (url.pathname === '/open' ? url.searchParams.get('id') : null);
  const key = url.searchParams.get('resourcekey') || '';
  if (!id || !idPattern.test(id) || (key && !idPattern.test(key))) throw new Error('This link does not identify a Google Drive folder.');
  return { id, key };
}
export function validateProject(p) {
  if (!p || p.v !== 1 || typeof p.id !== 'string' || !/^[\w-]{1,80}$/.test(p.id) || !Number.isFinite(p.updated)) throw new Error('This project link is not valid.');
  if (typeof p.artist !== 'string' || p.artist.length > 100 || typeof p.title !== 'string' || p.title.length > 100) throw new Error('Invalid project details.');
  if(p.transitionSeconds!==undefined&&(!Number.isInteger(p.transitionSeconds)||Math.abs(p.transitionSeconds)>5))throw new Error('Invalid track transition.');
  folderFromLink(p.folder);
  if (!Array.isArray(p.tracks) || p.tracks.length > MAX_TRACKS || new Set(p.tracks.map(t=>t.id)).size !== p.tracks.length) throw new Error('Invalid track list.');
  for (const t of p.tracks) if (!idPattern.test(t.id) || typeof t.name !== 'string' || t.name.length > 500 || (t.key && !idPattern.test(t.key))) throw new Error('Invalid track details.');
  for(const t of p.tracks)if(t.transitionSeconds!==undefined&&(!Number.isInteger(t.transitionSeconds)||Math.abs(t.transitionSeconds)>5))throw new Error('Invalid song transition.');
  if (p.cover && (typeof p.cover !== 'string' || p.cover.length > 18000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(p.cover))) throw new Error('Invalid cover artwork.');
  return p;
}
export function encodeProject(p) { return LZString.compressToEncodedURIComponent(JSON.stringify(validateProject(p))); }
export function decodeProject(hash) {
  const value = hash.replace(/^#p=/, '');
  if (value.length > 80000) throw new Error('This project link is too large.');
  try { return validateProject(JSON.parse(LZString.decompressFromEncodedURIComponent(value))); }
  catch { throw new Error('This project link is incomplete or damaged. Try copying the full link again.'); }
}
export function moveTrack(tracks, from, to) { const copy = [...tracks]; if (from < 0 || to < 0 || from >= copy.length || to >= copy.length) return tracks; copy.splice(to, 0, copy.splice(from, 1)[0]); return copy; }
export function nextTrack(tracks, currentId, repeat = false) { const index = tracks.findIndex(t=>t.id === currentId); return tracks.slice(index+1).find(t=>!t.missing) || (repeat ? tracks.find(t=>!t.missing) : null); }
export function audioUrl(track,revision='') { return `/api/audio?id=${encodeURIComponent(track.id)}${audioFormat(track.name)?`&format=${audioFormat(track.name)}`:''}${track.key ? `&key=${encodeURIComponent(track.key)}` : ''}${revision ? `&v=${encodeURIComponent(revision)}` : ''}`; }
export function time(value) { if (!Number.isFinite(value)) return '—:—'; return `${Math.floor(value/60)}:${String(Math.floor(value%60)).padStart(2,'0')}`; }

// Timing belongs to the incoming song, wherever it sits in the sequence.
export function trackTiming(project,track){return track?.transitionSeconds ?? project?.transitionSeconds ?? 0;}
