import test from 'node:test';
import assert from 'node:assert/strict';
import {PlaybackPair,overlapDue} from '../src/playback.mjs';
class Media {
 constructor(){this.src='';this.paused=true;this.ended=false;this.currentTime=0;this.duration=120;this.volume=1;this.loads=0;}
 getAttribute(){return this.src;}
 removeAttribute(){this.src='';}
 load(){this.loads++;this.currentTime=0;this.ended=false;}
 play(){this.paused=false;return Promise.resolve();}
 pause(){this.paused=true;}
}
test('early start keeps the outgoing audio playing and reuses preloaded incoming audio',async()=>{
 const a=new Media(),b=new Media(),pair=new PlaybackPair(a,b);
 await pair.start('A');a.currentTime=117;pair.prepare('B');const loads=b.loads;
 await pair.start('B',{overlap:true});
 assert.equal(a.paused,false);assert.equal(b.paused,false);assert.equal(a.currentTime,117);
 assert.equal(pair.active,b);assert.equal(pair.tail,a);assert.equal(b.loads,loads);
 pair.prepare('C');assert.equal(a.src,'A'); // Do not interrupt the outgoing tail to preload.
 a.ended=true;pair.prepare('C');assert.equal(a.src,'C');
});
test('pause/resume controls both songs; seeking and manual skipping clear the tail',async()=>{
 const a=new Media(),b=new Media(),pair=new PlaybackPair(a,b);
 await pair.start('A');await pair.start('B',{overlap:true});pair.setVolume(.4);
 assert.equal(a.volume,.4);assert.equal(b.volume,.4);pair.pause();assert.ok(a.paused&&b.paused);
 await pair.resume();assert.ok(!a.paused&&!b.paused);pair.seek(20);assert.ok(a.paused);assert.equal(b.currentTime,20);
 await pair.start('C',{overlap:true});await pair.start('D');assert.equal(pair.tail,null);assert.ok(b.paused);
 pair.stop();assert.ok(a.paused&&b.paused);assert.equal(a.src,'');assert.equal(b.src,'');
});
test('repeat can overlap the same file and restart ended audio',async()=>{
 const pair=new PlaybackPair(new Media(),new Media());await pair.start('A');pair.active.currentTime=118;
 await pair.start('A',{overlap:true});assert.equal(pair.active.currentTime,0);assert.equal(pair.tail.currentTime,118);
 pair.active.ended=true;pair.active.currentTime=120;await pair.start('A',{restart:true});assert.equal(pair.active.currentTime,0);
});
test('overlap triggers only inside the selected 1–5 second window while playing',()=>{
 const media=new Media();media.paused=false;
 for(let n=1;n<=5;n++){media.currentTime=120-n-.1;assert.equal(overlapDue(-n,media),false);media.currentTime=120-n;assert.equal(overlapDue(-n,media),true);}
 assert.equal(overlapDue(2,media),false);assert.equal(overlapDue(0,media),false);
 media.paused=true;assert.equal(overlapDue(-5,media),false);media.paused=false;media.duration=NaN;assert.equal(overlapDue(-5,media),false);
});
