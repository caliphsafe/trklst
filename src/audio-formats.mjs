export const AUDIO_TYPES={mp3:'audio/mpeg',wav:'audio/wav',m4a:'audio/mp4'};
export function audioFormat(name){return typeof name==='string'?(name.match(/\.(mp3|wav|m4a)$/i)?.[1].toLowerCase()||''):'';}
export function trackTitle(name){return name.replace(/\.(mp3|wav|m4a)$/i,'').replace(/_/g,' ');}
export function responseAudioType(upstream,format){
 const type=upstream.split(';')[0].trim().toLowerCase();
 if(type.startsWith('audio/'))return type;
 if(type==='application/octet-stream')return AUDIO_TYPES[format]||type;
 if(format==='m4a'&&['video/mp4','application/mp4'].includes(type))return AUDIO_TYPES.m4a;
 return null;
}
