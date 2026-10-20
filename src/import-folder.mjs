import {folderFromLink} from './project.mjs';
export async function importFolder(folder,{refresh=false,fetcher=fetch,onRetry=()=>{},timeoutMs=32000,retryDelayMs=650}={}){
 folderFromLink(folder.trim());
 for(let attempt=0;attempt<2;attempt++){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const r=await fetcher('/api/drive?url='+encodeURIComponent(folder.trim())+(refresh?'&refresh=1':''),{cache:'no-store',credentials:'same-origin',signal:controller.signal,headers:{Accept:'application/json'}});
   if(r.redirected||r.status===401||r.status===403)throw Error('This page needs a hosting login. Open trklst.vercel.app directly and try again.');
   if([408,429,500,502,503,504].includes(r.status)){if(!attempt){onRetry();continue;}throw Error('The import service is temporarily unavailable. Your saved sequence is unchanged. Try again shortly.');}
   if(!r.headers.get('content-type')?.includes('application/json'))throw Error('The import service returned a page instead of tracks. Open trklst.vercel.app directly and try again.');
   const result=await r.json();if(!r.ok)throw Error(result.error||'Could not read this folder.');
   if(!Array.isArray(result.tracks)||(!refresh&&!result.tracks.length))throw Error('No MP3 tracks were returned.');
   return result;
  }catch(e){
   if(!(e instanceof TypeError)&&e.name!=='AbortError')throw e;
   if(attempt)throw Error('TRKLST could not connect after two attempts. Your saved sequence is unchanged. Try opening trklst.vercel.app directly in Safari or Chrome. This does not mean your folder is private.');
   onRetry();await new Promise(resolve=>setTimeout(resolve,retryDelayMs));
  }finally{clearTimeout(timer);}
 }
}
