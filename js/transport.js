'use strict';
let held=new Map(),keySources=new Map(),activeKeys=new Set(),keyOct=0;
let playing=false,synthRunning=false,drumsRunning=false,liveRecord=false,timer=null,nextTime=0,seqIndex=0,songIndex=0;
let visualStep=-1,visualBank=0,visualDrumBank=0,displayQueue=[],scheduledVisual=[],recordStarts=new Map(),transportStep=0,transportSerial=0,transportFirst=true,transportStopAt=null,lastDisplay=null;
const uiStepVoices=new Map();
function noteOn(n,vel=.8,source='live',slide=false){
 if(!audioReady){keySources.set(source,n);startAudio().then(ok=>{if(ok&&keySources.get(source)===n)noteOn(n,vel,source,slide)});return}
 if(keySources.has(source)&&keySources.get(source)!==n)noteOff(keySources.get(source),source);if(activeKeys.has(source))return;
 keySources.set(source,n);activeKeys.add(source);held.set(n,(held.get(n)||0)+1);post({type:'on',note:n,vel,slide});
 if(liveRecord&&!String(source).startsWith('roll')){let at=playing?currentPlayStep():bank*16,b=Math.floor(at/16);ensureBars(b+1);rememberRoll();let note={id:newNoteId(),note:n,start:at-b*16,duration:1,vel,mode:0,prob:1};getRoll(b).push(note);recordStarts.set(source,{id:note.id,at:ctx.currentTime,start:at});noteEnd=Math.max(noteEnd,at+1);touchNotes();renderNotes()}
}
function noteOff(n,source='live'){if(keySources.get(source)!==n)return;keySources.delete(source);activeKeys.delete(source);let count=(held.get(n)||1)-1;if(count>0)held.set(n,count);else{held.delete(n);post({type:'off',note:n})}if(recordStarts.has(source)){let q=recordStarts.get(source),e=allRoll().find(e=>e.n.id===q.id);if(e){e.n.duration=clamp((ctx.currentTime-q.at)/stepDuration(),.125,MAX_STEPS-e.start);noteEnd=Math.max(noteEnd,e.start+e.n.duration)}recordStarts.delete(source);touchNotes();renderNotes();autoSave()}}
function releaseAll(){held.clear();keySources.clear();activeKeys.clear();post({type:'panic'});syncAudio()}
function stepDuration(step=playheadStep){return 60/tempoAt(step)/4}
function swungDuration(start,len,base,sw){return (swingPosition(start+len,sw)-swingPosition(start,sw))*base}
function transportRange(){if(songMode){let end=loopManual?loopEnd:synthRunning&&drumsRunning?Math.max(noteEnd,drumEnd):synthRunning?noteEnd:drumEnd;return{start:Math.min(loopStart,end-.125),end}};let b=(!synthRunning&&drumsRunning)?drumBank:bank;return{start:b*16,end:Math.min(MAX_STEPS,(b+1)*16)}}
function queueNote(n,absStart,start,end,at){
 let human=$('human').checked,prob=+$('probability').value/100;if(Math.random()>prob*(n.prob??1))return;
 let from=Math.max(absStart,start),to=Math.min(absStart+n.duration,end,noteEnd);if(to<=from)return;
 let when=at+secondsBetween(start,from)+(human?(Math.random()-.5)*.002:0);when=Math.max(ctx.currentTime+.003,when);
 let rat=n.mode===3?2:n.mode===4?3:1,length=secondsBetween(from,to);for(let k=0;k<rat;k++){let onAt=when+k*length/rat,token='seq-'+(++transportSerial),vel=clamp(n.vel*(n.mode===1?1.15:1)*(human?.96+Math.random()*.08:1));let offAt=Math.min(at+secondsBetween(start,to),onAt+Math.max(.003,length/rat*(rat>1?.85:1)));if(offAt<=onAt)continue;
  post({type:'event',kind:'on',at:onAt,note:n.note,vel,token,slide:n.mode===2});post({type:'event',kind:'off',at:offAt,note:n.note,token});scheduledVisual.push({at:onAt,note:n.note,on:true,token},{at:offAt,note:n.note,on:false,token});
 }
}
function schedule(){
 if(!playing||!ctx)return;let now=ctx.currentTime;if(nextTime<now-.03){nextTime=now+.08;audioLate++}let guard=0,range=transportRange();
 while(nextTime<now+audioQueueSeconds+.7&&guard++<128){
  if(transportStep>=range.end-1e-8){if(loopEnabled){transportStep=range.start;transportFirst=true}else{transportStopAt=nextTime;break}}
  let start=transportStep,end=Math.min(range.end,Math.floor(start+1.00000001)),b=Math.floor(start/16),st=start-b*16;
  ensureBars(b+1);let db=songMode?b:drumBank,dbStart=db*16,localLo=st,localHi=st+(end-start),synthEnd=Math.min(range.end,noteEnd);
  if(synthRunning&&!$('synthMute').checked&&start<noteEnd){
   if(transportFirst){for(let e of allRoll()){if(e.start<start&&e.start+e.n.duration>start)queueNote(e.n,e.start,start,synthEnd,nextTime)}}
   for(let n of getRoll(b)){let abs=b*16+n.start;if(abs>=start-1e-8&&abs<end-1e-8)queueNote(n,abs,start,synthEnd,nextTime)}
  }
  if(drumsRunning&&!$('drumMute').checked&&dbStart+localLo<drumEnd)for(let h of drumHits(db)){if(h.start>=localLo-1e-8&&h.start<localHi-1e-8&&dbStart+h.start<drumEnd){let when=nextTime+secondsBetween(start,start+h.start-localLo);post({type:'event',kind:'drum',at:Math.max(now+.003,when),index:h.index,vel:h.vel*($('human').checked?.96+Math.random()*.08:1)})}}
  let bpmNow=tempoAt(start);if(schedule.bpm!==bpmNow){post({type:'event',kind:'tempo',bpm:bpmNow,at:nextTime});schedule.bpm=bpmNow}let dur=secondsBetween(start,end);displayQueue.push({at:nextTime,endAt:nextTime+dur,abs:start,to:end,step:Math.floor(st),bank:b,db});transportFirst=false;transportStep=end;nextTime+=dur;
 }
 scheduledVisual.sort((a,b)=>a.at-b.at);
}
function refreshTransport(){$('play').textContent=synthRunning?'▶ НОТЫ ИГРАЮТ':'▶ НОТЫ';$('play').classList.toggle('on',synthRunning);$('drumPlay').textContent=drumsRunning?'▶ УДАРНЫЕ ИГРАЮТ':'▶ УДАРНЫЕ';$('drumPlay').classList.toggle('on',drumsRunning);$('playAll').classList.toggle('on',synthRunning&&drumsRunning);markPlayhead()}
async function play(part='synth'){
 if(!await startAudio())return;if(part==='synth'||part==='all')synthRunning=true;if(part==='drums'||part==='all')drumsRunning=true;
 if(playing){refreshTransport();return}playing=true;let r=transportRange();transportStep=clamp(cueStep,r.start,r.end-.000001);playheadStep=transportStep;transportFirst=true;transportStopAt=null;nextTime=ctx.currentTime+audioQueueSeconds+.11;displayQueue=[];scheduledVisual=[];lastDisplay=null;schedule.bpm=null;visualStep=-1;timer=setInterval(schedule,20);schedule();refreshTransport();
}
function stopPart(part){if(part==='synth'){synthRunning=false;post({type:'stopPart',part:'synth'});scheduledVisual=[];uiStepVoices.clear()}else{drumsRunning=false;post({type:'stopPart',part:'drums'})}if(!synthRunning&&!drumsRunning)stop();else refreshTransport()}
function stop(){playing=false;synthRunning=false;drumsRunning=false;clearInterval(timer);timer=null;displayQueue=[];scheduledVisual=[];lastDisplay=null;transportStopAt=null;uiStepVoices.clear();visualStep=-1;releaseAll();if($('drumPlay'))refreshTransport();$('position').textContent='СТОП / '+stepLabel(cueStep)}
function seekTo(step){let part=synthRunning&&drumsRunning?'all':drumsRunning?'drums':'synth',was=playing;if(was)stop();cueStep=clamp(step,0,MAX_STEPS-.125);playheadStep=cueStep;selectBank(Math.floor(cueStep/16),false);if(drumPageFollow)selectDrumBank(Math.floor(cueStep/16));markPlayhead();drawSongOverview();if(was)play(part)}
function currentPlayStep(){if(!playing||!lastDisplay)return cueStep;let q=lastDisplay,t=clamp((ctx.currentTime-q.at)/Math.max(.0001,q.endAt-q.at));return q.abs+(q.to-q.abs)*t}
function updateTransportVisual(t){
 if(!playing||!ctx)return;let dirty=false;while(displayQueue.length&&displayQueue[0].at<=ctx.currentTime){let e=displayQueue.shift();lastDisplay=e;visualStep=e.step;visualBank=e.bank;visualDrumBank=e.db;if($('follow').checked&&bank!==e.bank)selectBank(e.bank,true);if(drumPageFollow&&drumBank!==e.db)selectDrumBank(e.db,true);$('position').textContent=stepLabel(e.abs)+' · '+timeText(secondsBetween(loopStart,e.abs))+' / '+timeText(secondsBetween(transportRange().start,transportRange().end));$('drumPosition').textContent=(drumsRunning?'ИГРАЕТ / ':'СТОП / ')+stepLabel(e.db*16+e.step);if(drumsRunning)for(let h of drumHits(e.db))if(Math.floor(h.start)===e.step)drumPadFlash[h.index]=t;dirty=true}
 while(scheduledVisual.length&&scheduledVisual[0].at<=ctx.currentTime){let e=scheduledVisual.shift(),set=uiStepVoices.get(e.note)||new Set;if(e.on){set.add(e.token);uiStepVoices.set(e.note,set)}else{set.delete(e.token);if(!set.size)uiStepVoices.delete(e.note)}}
 playheadStep=currentPlayStep();markPlayhead();if(dirty){drawSongOverview();drawDrumOverview()}if(transportStopAt!==null&&ctx.currentTime>=transportStopAt){cueStep=loopStart;stop()}
}
$('play').onclick=()=>synthRunning?stopPart('synth'):play('synth');$('stop').onclick=()=>stopPart('synth');$('playAll').onclick=()=>synthRunning&&drumsRunning?stop():play('all');$('panic').onclick=()=>{emergencyReset();toast('СТУДИЯ ОСТАНОВЛЕНА')};$('liveRec').onclick=()=>{liveRecord=!liveRecord;$('liveRec').classList.toggle('on',liveRecord)};
const scales={minor:[0,2,3,5,7,8,10],major:[0,2,4,5,7,9,11],phrygian:[0,1,3,5,7,8,10],dorian:[0,2,3,5,7,9,10],harmonic:[0,2,3,5,7,8,11],pentatonic:[0,3,5,7,10],chromatic:Array.from({length:12},(_,i)=>i),lydian:[0,2,4,6,7,9,11],blues:[0,3,5,6,7,10],whole:[0,2,4,6,8,10]};for(let i=0;i<12;i++)$('root').add(new Option(names[i],i));$('root').value=4;
