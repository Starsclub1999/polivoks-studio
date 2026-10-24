'use strict';
// Musical time is always sixteenth-note steps (four steps per quarter).
const STEPS_PER_BAR=16,MAX_BARS=0xffffffff,MAX_STEPS=MAX_BARS*16,MAX_EVENTS=2000000;
let noteEnd=64,drumEnd=64,loopStart=0,loopEnd=64,loopEnabled=true,loopManual=false;
let tempoMap=[],songSections=[],noteRevision=0,noteCacheRevision=-1,noteCache=[];
let playheadStep=0,cueStep=0,drumPageFollow=true;
const barLabel=b=>String(Math.floor(b)+1).padStart(3,'0');
const stepLabel=t=>barLabel(t/16)+':'+String(1+Math.floor(t%16)).padStart(2,'0');
function ensureBars(count){count=Math.ceil(count);if(!Number.isFinite(count)||count<1||count>MAX_BARS)throw Error('Число тактов выходит за числовой диапазон');if(count>banks.length)banks.length=count;return banks.length}
function storageSteps(){return Math.max(16,banks.length*16)}
function songSteps(){return Math.max(1,noteEnd,drumEnd)}
function touchNotes(){noteRevision++;rollDirty=true}
function tempoAt(step){if(!tempoMap.length)return clamp(+$('bpm').value||112,10,600);let lo=0,hi=tempoMap.length;while(lo<hi){let mid=(lo+hi)>>1;if(tempoMap[mid].step<=step)lo=mid+1;else hi=mid}return lo?tempoMap[lo-1].bpm:clamp(+$('bpm').value||112,10,600)}
function swingPosition(t,swing){const pair=Math.floor(t/2),r=t-pair*2;return pair*2+Math.min(r,1)*(1+swing)+Math.max(0,r-1)*(1-swing)}
function secondsBetween(start,end,swing=+$('swing').value/100){
 if(end<=start)return 0;let lo=0,hi=tempoMap.length;while(lo<hi){let m=(lo+hi)>>1;if(tempoMap[m].step<=start+1e-9)lo=m+1;else hi=m}let index=lo,pos=start,sum=0,bpm=index?tempoMap[index-1].bpm:clamp(+$('bpm').value||112,1,1000);
 while(pos<end-1e-9){let next=Math.min(end,index<tempoMap.length?tempoMap[index].step:end);if(next>pos)sum+=(swingPosition(next,swing)-swingPosition(pos,swing))*60/bpm/4;pos=next;if(index<tempoMap.length){bpm=tempoMap[index].bpm;index++}else break}return sum;
}
function timeText(sec){return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(Math.floor(sec%60)).padStart(2,'0')}
function loopDuration(){return secondsBetween(loopStart,loopEnd)}
function syncLoopToTracks(){if(!loopManual){loopStart=0;loopEnd=songSteps()}loopStart=clamp(loopStart,0,MAX_STEPS-.125);loopEnd=clamp(loopEnd,loopStart+.125,MAX_STEPS)}
function setLoop(start,end,manual=true){if(playing)stop();ensureBars(Math.ceil(Math.max(end,16)/16));loopStart=Math.round(clamp(start,0,MAX_STEPS-.125)*8)/8;loopEnd=Math.round(clamp(end,loopStart+.125,MAX_STEPS)*8)/8;loopManual=manual;cueStep=clamp(cueStep,loopStart,Math.max(loopStart,loopEnd-.125));updateTimeline();drawRoll();autoSave()}
function setTrackEnd(part,end){if(playing)stop();end=clamp(+end||16,.125,MAX_STEPS);ensureBars(Math.ceil(end/16));if(part==='notes')noteEnd=end;else drumEnd=end;syncLoopToTracks();updateTimeline();drawRoll();autoSave()}
function contentNoteEnd(){let end=0;for(let {b,B} of existingBanks())for(let n of B.roll||[])end=Math.max(end,b*16+n.start+n.duration);return Math.max(1,Math.ceil(end*4)/4)}
function contentDrumEnd(){let end=0;for(let {b} of existingBanks())for(let h of drumHits(b))end=Math.max(end,b*16+h.start+Math.max(.25,h.duration||.25));return Math.max(1,Math.ceil(end*4)/4)}
function fitEnds(){noteEnd=contentNoteEnd();drumEnd=contentDrumEnd();loopManual=false;syncLoopToTracks();updateTimeline();drawRoll();autoSave()}
function drumsProjected(b){let B=banks[b];if(!Array.isArray(B.hits))return;B.drums=Array.from({length:7},()=>Array(16).fill(0));for(let h of B.hits){let s=clamp(Math.floor(h.start),0,15);B.drums[h.index][s]=Math.max(B.drums[h.index][s],h.vel)}}
function drumHits(b){const B=banks[b];if(!B)return[];if(Array.isArray(B.hits))return B.hits;let hits=[];B.drums.forEach((row,index)=>row.forEach((vel,start)=>{if(vel)hits.push({index,start,vel,duration:.25,midiNote:drumNote[index]})}));return hits}
function setDrumCell(b,index,step,vel){ensureBars(b+1);let B=banks[b];if(Array.isArray(B.hits)){B.hits=B.hits.filter(h=>!(h.index===index&&Math.floor(h.start)===step));if(vel)B.hits.push({id:newNoteId(),index,start:step,vel,duration:.25,midiNote:drumNote[index]})}B.drums[index][step]=vel;if(vel&&b*16+step>=drumEnd)drumEnd=Math.min(MAX_STEPS,b*16+step+1);syncLoopToTracks();updateTimeline();autoSave()}
function updatePageButtons(){
 document.querySelectorAll('[data-bank]').forEach((e,i)=>{let at=Math.floor(bank/4)*4+i;e.dataset.bank=at;e.textContent=barLabel(at);e.classList.toggle('on',at===bank)});
 document.querySelectorAll('[data-dbank]').forEach((e,i)=>{let at=Math.floor(drumBank/4)*4+i;e.dataset.dbank=at;e.textContent=barLabel(at);e.classList.toggle('on',at===drumBank)});
}
function updateTimeline(){
 if(!$('timelineReadout'))return;syncLoopToTracks();let end=Math.max(songSteps(),loopEnd,storageSteps()),bars=Math.ceil(end/16),span=rollView().span;
 $('rollScroll').max=Math.max(0,Math.ceil(end/span)*span-span);$('rollScroll').value=clamp(+$('rollScroll').value,0,Math.max(0,Math.ceil(end/span)*span-span));
 $('drumBarScroll').max=Math.max(0,bars-1);$('drumBarScroll').value=drumBank;$('drumBarJump').max=MAX_BARS;$('drumBarJump').value=drumBank+1;
 $('drumPageInfo').textContent='ТАКТ '+barLabel(drumBank)+' / '+bars+' · '+timeText(secondsBetween(0,drumBank*16));
 $('timelineReadout').textContent=timeText(loopDuration())+' · '+stepLabel(loopStart)+' — '+stepLabel(loopEnd)+' · '+bars+' ТАКТОВ';
 $('noteLength').value=+(noteEnd/16).toFixed(3);$('drumLength').value=+(drumEnd/16).toFixed(3);$('loopFrom').value=+(loopStart/16+1).toFixed(4);$('loopTo').value=+(loopEnd/16+1).toFixed(4);$('timelineLoop').checked=loopEnabled;
 updatePageButtons();drawTimelineRuler();drawSongOverview();drawDrumOverview();window.refreshTapeDecks?.();
}
function rulerPoint(e,canvas){let r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height}}
function drawTimelineRuler(){let c=$('timelineRuler');if(!c)return;let x=c.getContext('2d'),v=rollView(),X=t=>RX+(t-v.offset)*v.cw;x.clearRect(0,0,c.width,c.height);x.fillStyle='#091911';x.fillRect(0,0,c.width,c.height);x.font='12px Kvant,monospace';x.textBaseline='middle';x.fillStyle='#c8d89c';x.fillText('ЦИКЛ',14,21);
 let a=clamp(X(loopStart),RX,c.width),b=clamp(X(loopEnd),RX,c.width);x.fillStyle='#947147';x.fillRect(a,7,Math.max(1,b-a),28);x.fillStyle='#e9c58a';x.fillRect(a+2,8,Math.max(0,b-a-4),4);x.fillStyle='#24331f';x.fillRect(a+2,30,Math.max(0,b-a-4),4);
 for(let[t,label]of[[loopStart,'◀'],[loopEnd,'▶']]){let at=X(t);if(at>=RX&&at<=c.width){x.fillStyle='#f5db9c';x.fillRect(at-5,5,10,32);x.fillStyle='#26381e';x.fillText(label,at-4,21)}}
 x.fillStyle='#a3bd88';for(let s=Math.ceil(v.offset/16)*16;s<=v.offset+v.span;s+=16*Math.max(1,2**Math.ceil(Math.log2(v.span/256)))){x.fillRect(X(s),37,1,13);x.fillText(barLabel(s/16),X(s)+5,48)}x.fillStyle='#ceaa71';x.fillText('ПОТЯНИТЕ КРАЙ · ПКМ: КОНЕЦ · SHIFT: НАЧАЛО · ДВОЙНОЙ КЛИК: ПО СОДЕРЖИМОМУ',RX,66);
}
function overview(c,drum=false){if(!c)return;let x=c.getContext('2d'),w=c.width,h=c.height,total=Math.max(songSteps(),loopEnd,storageSteps(),16),bars=Math.ceil(total/16);x.fillStyle='#0a1c16';x.fillRect(0,0,w,h);for(let {b} of existingBanks()){if(b>=bars)continue;let n=drum?drumHits(b).length:getRoll(b).length;if(n){x.fillStyle=drum?'#bd905c':'#719a6b';let hh=clamp(n/20,.13,1)*(h-12);x.fillRect(b*16/total*w,h-hh-4,Math.max(1,16/total*w-1),hh)}}for(let s of songSections){let at=s.start/total*w;x.fillStyle='#8d9c70';x.fillRect(at,0,1,h);x.font='10px Kvant,monospace';x.fillText(s.name,at+4,10)}let start=drum?drumBank*16:+$('rollScroll').value,span=drum?16:rollView().span;x.strokeStyle='#f3cf8b';x.lineWidth=2;x.strokeRect(start/total*w,1,Math.max(4,span/total*w),h-2);x.fillStyle='#ebd395';x.fillRect(playheadStep/total*w,0,2,h)}
function drawSongOverview(){overview($('songOverview'))}function drawDrumOverview(){overview($('drumOverview'),true)}
function initTimeline(){
 const ruler=$('timelineRuler');let rulerDrag=null;
 const apply=e=>{let pt=rulerPoint(e,ruler),v=rollView(),t=clamp(snapTime(v.offset+(pt.x-RX)/v.cw,e),0,MAX_STEPS);if(rulerDrag==='start')setLoop(Math.min(t,loopEnd-.125),loopEnd);else if(rulerDrag==='end')setLoop(loopStart,Math.max(t,loopStart+.125));else seekTo(clamp(t,loopStart,loopEnd-.125))};
 ruler.addEventListener('contextmenu',e=>e.preventDefault());ruler.addEventListener('pointerdown',e=>{e.preventDefault();let pt=rulerPoint(e,ruler),v=rollView(),a=RX+(loopStart-v.offset)*v.cw,b=RX+(loopEnd-v.offset)*v.cw;rulerDrag=e.button===2?'end':e.shiftKey?'start':Math.abs(pt.x-a)<14?'start':Math.abs(pt.x-b)<14?'end':pt.y<36?'end':'seek';ruler.setPointerCapture(e.pointerId);apply(e)});ruler.addEventListener('pointermove',e=>{if(rulerDrag)apply(e)});for(let k of['pointerup','pointercancel'])ruler.addEventListener(k,()=>rulerDrag=null);ruler.addEventListener('dblclick',()=>{loopManual=false;syncLoopToTracks();updateTimeline();drawRoll();autoSave()});
 for(let[id,drum]of[['songOverview',false],['drumOverview',true]]){let c=$(id),moving=false;let nav=e=>{let pt=rulerPoint(e,c),t=clamp(pt.x/c.width*Math.max(songSteps(),loopEnd,storageSteps()),0,MAX_STEPS-1);if(drum)selectDrumBank(Math.floor(t/16));else{setViewFollow('note',false);$('rollScroll').value=clamp(t-rollView().span/2,0,+$('rollScroll').max);drawRoll();drawSongOverview()}};c.addEventListener('pointerdown',e=>{moving=true;c.setPointerCapture(e.pointerId);nav(e)});c.addEventListener('pointermove',e=>{if(moving)nav(e)});c.addEventListener('pointerup',()=>moving=false);c.addEventListener('pointercancel',()=>moving=false)}
 $('noteLength').onchange=()=>setTrackEnd('notes',+$('noteLength').value*16);$('drumLength').onchange=()=>setTrackEnd('drums',+$('drumLength').value*16);$('loopFrom').onchange=()=>setLoop((+$('loopFrom').value-1)*16,loopEnd);$('loopTo').onchange=()=>setLoop(loopStart,(+$('loopTo').value-1)*16);
 $('timelineLoop').onchange=()=>{loopEnabled=$('timelineLoop').checked;autoSave()};$('fitSong').onclick=fitEnds;
 $('drumBarScroll').oninput=()=>selectDrumBank(+$('drumBarScroll').value);$('drumBarJump').onchange=()=>selectDrumBank(clamp(+$('drumBarJump').value-1,0,MAX_BARS-1));$('drumPrev').onclick=()=>selectDrumBank(Math.max(0,drumBank-1));$('drumNext').onclick=()=>selectDrumBank(Math.min(MAX_BARS-1,drumBank+1));
 $('drumFollow').onchange=()=>setViewFollow('drum',$('drumFollow').checked);$('rollScroll').addEventListener('input',()=>{drawTimelineRuler();drawSongOverview()});
 $('newComposition').onclick=()=>{stop();rememberRoll();banks.length=0;banks.push(makeBank());banks[0].roll=[];noteEnd=drumEnd=16;loopStart=0;loopEnd=16;loopManual=false;tempoMap=[];songSections=[];bank=drumBank=0;cueStep=0;touchNotes();renderNotes();renderDrums();updateTimeline();autoSave();toast('НОВАЯ КОМПОЗИЦИЯ / ОДИН ПУСТОЙ ТАКТ')};
 updateTimeline();
}
