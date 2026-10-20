import { folderFromLink, MAX_TRACKS } from '../src/project.mjs';
import { googleFetch, parseFolder, readLimited } from '../lib/drive.mjs';
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method !== 'GET') return res.status(405).json({error:'Method not allowed.'});
  try {
    const {id,key}=folderFromLink(req.query.url || '');
    const url=new URL('https://drive.google.com/embeddedfolderview'); url.searchParams.set('id',id); if(key) url.searchParams.set('resourcekey',key);
    const response=await googleFetch(url);
    if(!response.ok) throw new Error('Google could not open this folder. Set General access to “Anyone with the link” and allow downloads.');
    const result=parseFolder(await readLimited(response));
    if(result.hasNext || result.tracks.length>MAX_TRACKS) throw new Error(`Use a folder with at most ${MAX_TRACKS} MP3 tracks so the entire sequence fits in your project link.`);
    if(!result.tracks.length && !(req.query.refresh === '1' && result.isFolderView)) throw new Error('No public MP3s were found. Put MP3 files directly in this folder, set it to “Anyone with the link,” and make sure downloads are allowed.');
    res.status(200).json({name:result.name,tracks:result.tracks});
  } catch(error) { res.status(400).json({error: error.name==='TimeoutError' ? 'Google Drive took too long to respond. Please try again.' : error.message}); }
}
