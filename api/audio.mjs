import {AUDIO_TYPES,responseAudioType} from '../src/audio-formats.mjs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { googleFetch, readLimited, confirmationUrl } from '../lib/drive.mjs';
export default async function handler(req,res) {
  res.setHeader('Cache-Control','private, no-store');
  if(!['GET','HEAD'].includes(req.method)) return res.status(405).end();
  const {id,key,format}=req.query;
  if(format!==undefined&&(typeof format!=='string'||!Object.hasOwn(AUDIO_TYPES,format)))return res.status(400).json({error:'Invalid audio format.'});
  if(typeof id!=='string' || !/^[\w-]{10,150}$/.test(id) || key && (typeof key!=='string' || !/^[\w-]{10,150}$/.test(key))) return res.status(400).json({error:'Invalid file.'});
  const range=req.headers.range;
  if(range && !/^bytes=\d*-\d*$/.test(range)) return res.status(416).end();
  try {
    const url=new URL('https://drive.usercontent.google.com/download'); url.searchParams.set('id',id); url.searchParams.set('export','download'); if(key) url.searchParams.set('resourcekey',key);
    const options={headers:range ? {Range:range} : {}};
    let upstream=await googleFetch(url,options);
    if(upstream.headers.get('content-type')?.includes('text/html')) {
      const confirm=confirmationUrl(await readLimited(upstream));
      if(!confirm) throw new Error('This audio file cannot be downloaded. Check its public access, download permissions, and Google Drive quota.');
      upstream=await googleFetch(confirm,options);
    }
    if(upstream.status===416) { const cr=upstream.headers.get('content-range'); if(cr) res.setHeader('Content-Range',cr); await upstream.body?.cancel(); return res.status(416).end(); }
    const type=responseAudioType(upstream.headers.get('content-type')||'',format);
    if(!upstream.ok || !type) { await upstream.body?.cancel(); throw new Error('Google Drive is not serving audio for this file. Check sharing and download limits.'); }
    res.status(upstream.status);
    res.setHeader('Content-Type',type);
    res.setHeader('X-Content-Type-Options','nosniff');
    for(const h of ['content-length','content-range','accept-ranges']) { const v=upstream.headers.get(h); if(v) res.setHeader(h,v); }
    if(req.method==='HEAD') { await upstream.body?.cancel(); return res.end(); }
    await pipeline(Readable.fromWeb(upstream.body),res);
  } catch(error) { if(!res.headersSent) res.status(502).json({error:error.message}); else res.destroy(); }
}
