import test from 'node:test';
import assert from 'node:assert/strict';
import {audioFormat,trackTitle} from '../src/audio-formats.mjs';
import {audioUrl} from '../src/project.mjs';
test('audio URLs and titles identify all supported formats case-insensitively',()=>{
 for(const format of ['mp3','wav','m4a']){
  const name=`01_Test.${format.toUpperCase()}`;
  assert.equal(audioFormat(name),format);assert.equal(trackTitle(name),'01 Test');
  const url=new URL(audioUrl({id:'track_A123456789',name,key:'resource123456'},42),'https://trklst.vercel.app');
  assert.equal(url.searchParams.get('format'),format);assert.equal(url.searchParams.get('key'),'resource123456');assert.equal(url.searchParams.get('v'),'42');
 }
 assert.equal(audioFormat('song.wav.exe'),'');
});
