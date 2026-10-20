import { load } from 'cheerio';
export function parseFolder(html) {
  const $ = load(html), files = new Map();
  $('a[href]').each((_, a) => {
    let url; try { url = new URL($(a).attr('href'), 'https://drive.google.com'); } catch { return; }
    const id = url.hostname === 'drive.google.com' && url.pathname.match(/^\/file\/d\/([\w-]{10,150})(?:\/|$)/)?.[1];
    const name = $(a).find('.flip-entry-title').text().trim() || $(a).text().trim();
    if (id && /\.mp3$/i.test(name)) files.set(id, {id, name: name.slice(0,500), key: url.searchParams.get('resourcekey') || ''});
  });
  return { name: $('title').text().replace(/\s*[-–] Google Drive$/, '').trim(), tracks: [...files.values()].sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true})), hasNext: $('a[rel="next"]').length > 0 };
}
export async function googleFetch(url, options = {}) {
  for(let redirects = 0; redirects < 6; redirects++) {
    const u = new URL(url);
    if(u.protocol !== 'https:' || !['drive.google.com','drive.usercontent.google.com','docs.google.com'].includes(u.hostname) && !u.hostname.endsWith('.googleusercontent.com')) throw new Error('Unexpected Google download address.');
    const response = await fetch(u, {...options, redirect:'manual', signal: AbortSignal.timeout(25000)});
    if (![301,302,303,307,308].includes(response.status)) return response;
    const location = response.headers.get('location'); await response.body?.cancel();
    if(!location) throw new Error('Google returned an incomplete redirect.');
    url = new URL(location,u).href;
  }
  throw new Error('Google redirected this file too many times.');
}
export async function readLimited(response, limit = 3000000) {
  const reader = response.body.getReader(); const parts = []; let size=0;
  try { while(true) { const {done,value}=await reader.read(); if(done) break; size+=value.length; if(size>limit) throw new Error('Google returned an oversized response.'); parts.push(Buffer.from(value)); } }
  finally { await reader.cancel(); }
  return Buffer.concat(parts).toString('utf8');
}
export function confirmationUrl(html) {
  const $=load(html), form=$('form#download-form');
  if (!form.length) return null;
  let url; try { url=new URL(form.attr('action')); } catch { return null; }
  if(url.protocol!=='https:' || url.hostname!=='drive.usercontent.google.com' || url.pathname!=='/download') return null;
  form.find('input[name]').each((_,el)=>{ const name=$(el).attr('name'); if(['id','export','confirm','uuid','resourcekey'].includes(name)) url.searchParams.set(name,$(el).attr('value')||''); });
  return url.href;
}
