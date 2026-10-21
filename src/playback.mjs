// Two media elements allow the outgoing track to finish during an overlap.
export class PlaybackPair {
  constructor(first, second) { this.active=first; this.idle=second; this.tail=null; }
  setVolume(value) { this.active.volume=value; this.idle.volume=value; }
  stopTail() { if(this.tail){this.tail.pause();this.tail=null;} }
  prepare(url) {
    if(this.tail && !this.tail.ended)return;
    this.tail=null;
    if(this.idle.getAttribute('src')!==url){this.idle.src=url;this.idle.preload='auto';this.idle.load();}
  }
  start(url,{overlap=false,restart=false}={}) {
    if(overlap){
      this.stopTail();
      const outgoing=this.active;this.active=this.idle;this.idle=outgoing;this.tail=outgoing;
    }else this.stopTail();
    if(this.active.getAttribute('src')!==url){this.active.src=url;this.active.load();}
    if(restart||overlap||this.active.ended)this.active.currentTime=0;
    return this.active.play();
  }
  pause(){this.active.pause();this.tail?.pause();}
  resume(){if(this.tail&&!this.tail.ended)this.tail.play().catch(()=>this.stopTail());return this.active.play();}
  seek(time){this.stopTail();this.active.currentTime=time;}
  stop(){this.tail=null;for(const a of [this.active,this.idle]){a.pause();a.removeAttribute('src');a.load();}}
}
export function overlapDue(seconds,media) {
  return seconds<0&&!media.paused&&!media.ended&&Number.isFinite(media.duration)&&media.duration>0&&media.currentTime>0&&media.duration-media.currentTime<=-seconds;
}
