'use strict';
function parseMidi(buffer,target='both'){
 if(buffer.byteLength>24*1024*1024)throw Error('MIDI больше 24 МБ');const u=new Uint8Array(buffer),v=new DataView(buffer);let pos=0;
 const need=n=>{if(pos+n>u.length)throw Error('Неожиданный конец MIDI')};
 const str=n=>{need(n);let s=String.fromCharCode(...u.subarray(pos,pos+n));pos+=n;return s};
 const word=()=>{need(2);let n=v.getUint16(pos);pos+=2;return n};const long=()=>{need(4);let n=v.getUint32(pos);pos+=4;return n};
 function vl(end=u.length){let n=0;for(let c=0;c<4;c++){if(pos>=end)throw Error('Повреждён MIDI VLQ');let b=u[pos++];n=n*128+(b&127);if(!(b&128))return n}throw Error('MIDI VLQ длиннее четырёх байтов')}
 if(str(4)!=='MThd')throw Error('Нужен стандартный MIDI-файл');let header=long();if(header<6)throw Error('Повреждён MIDI-заголовок');let format=word(),tracks=word(),division=word();if(format>1)throw Error('Поддерживаются MIDI формата 0 и 1');if(!tracks||tracks>1024||!division)throw Error('Неверные параметры MIDI');need(header-6);pos+=header-6;
 const raw=[],tempos=[],trackNames=[];let endTick=0,serial=0;
 for(let tr=0;tr<tracks;tr++){
  if(str(4)!=='MTrk')throw Error('Не найден MIDI-трек');let length=long(),end=pos+length;if(end>u.length)throw Error('Повреждена длина MIDI-трека');let tick=0,running=0;
  while(pos<end){tick+=vl(end);endTick=Math.max(endTick,tick);need(1);let first=u[pos],status;
   if(first&128){status=u[pos++];if(status<240)running=status}else{status=running;if(!status)throw Error('Отсутствует MIDI running status')}
   if(status===255){if(pos>=end)throw Error('Повреждено MIDI meta');let type=u[pos++],n=vl(end);if(pos+n>end)throw Error('Повреждена длина MIDI meta');if(type===81&&n===3){let us=(u[pos]<<16)|(u[pos+1]<<8)|u[pos+2];if(us){tempos.push({tick,bpm:60000000/us,serial:serial++});if(tempos.length>MAX_STEPS)throw Error('В MIDI слишком много изменений темпа')}}if(type===3)trackNames[tr]=new TextDecoder().decode(u.subarray(pos,pos+n));pos+=n;continue}
   if(status===240||status===247){let n=vl(end);if(pos+n>end)throw Error('Повреждён MIDI SysEx');pos+=n;running=0;continue}
   if(status<128||status>=240)throw Error('Неизвестное MIDI-событие');let type=status&240,ch=status&15,n=(type===192||type===208)?1:2;if(pos+n>end)throw Error('Повреждено MIDI-событие');let a=u[pos++],b=n===2?u[pos++]:0;if(a>127||b>127)throw Error('Неверные MIDI-данные');if(type===144||type===128||type===176)raw.push({tick,type,ch,a,b,tr,serial:serial++});if(raw.length>MAX_EVENTS*4)throw Error('Слишком много MIDI-событий')
  }
 }
 raw.sort((a,b)=>a.tick-b.tick||a.serial-b.serial);tempos.sort((a,b)=>a.tick-b.tick||a.serial-b.serial);
 let smpte=!!(division&32768),tickStep;
 if(smpte){let code=256-(division>>8),fps=code===29?30000/1001:code,sub=division&255;if(![24,25,29,30].includes(code)||!sub)throw Error('Неверная временная база SMPTE');tickStep=t=>t/(fps*sub)*8}else tickStep=t=>t/division*4;
 const firstTempo=smpte?120:(tempos.findLast(t=>t.tick===0)?.bpm||120),map=[];
 if(!smpte)for(let t of tempos){let q={step:tickStep(t.tick),bpm:clamp(t.bpm,1,1000)};if(map.length&&map.at(-1).step===q.step)map[map.length-1]=q;else map.push(q)}
 if(!map.length||map[0].step>0)map.unshift({step:0,bpm:firstTempo});
 const active=new Map(),pedal=Array(16).fill(false),sustained=Array.from({length:16},()=>[]),all=[];
 const finish=(n,tick)=>{all.push({note:n.a,start:tickStep(n.tick),duration:Math.max(1e-5,tickStep(tick)-tickStep(n.tick)),vel:n.b/127,channel:n.ch,track:n.tr});if(all.length>MAX_EVENTS)throw Error('В MIDI больше 200 000 нот')};
 for(let e of raw){let key=e.ch+':'+e.a;
  if(e.type===176){if(e.a===64){let down=e.b>=64;if(pedal[e.ch]&&!down){for(let n of sustained[e.ch])finish(n,e.tick);sustained[e.ch]=[]}pedal[e.ch]=down}if(e.a===123||e.a===120){for(let[k,list]of active)if(k.startsWith(e.ch+':')){list.forEach(n=>finish(n,e.tick));active.delete(k)}for(let n of sustained[e.ch])finish(n,e.tick);sustained[e.ch]=[]}continue}
  if(e.type===144&&e.b){if(!active.has(key))active.set(key,[]);active.get(key).push(e)}else{let list=active.get(key),n=list?.shift();if(list&&!list.length)active.delete(key);if(n){if(pedal[e.ch]&&e.ch!==9)sustained[e.ch].push(n);else finish(n,e.tick)}}
 }
 for(let list of active.values())for(let n of list)finish(n,Math.max(endTick,n.tick+(smpte?480:division/4)));for(let list of sustained)for(let n of list)finish(n,endTick);
 const hasDrumChannel=all.some(n=>n.channel===9),notes=[],drums=[];
 for(let n of all){let isDrum=target==='drums'?!hasDrumChannel||n.channel===9:n.channel===9;if(isDrum){if(target!=='notes')drums.push(n)}else if(target!=='drums')notes.push(n)}
 let endSteps=Math.max(tickStep(endTick),1);for(let n of notes)endSteps=Math.max(endSteps,n.start+n.duration);for(let n of drums)endSteps=Math.max(endSteps,n.start+n.duration);if(endSteps>MAX_STEPS)throw Error('MIDI длиннее 4096 тактов; разделите файл на части');
 return{notes,drums,endSteps,tempoMap:map,bpm:firstTempo,trackNames,format,smpte};
}
function gmDrumIndex(n){if([35,36].includes(n))return 0;if([37,38,40].includes(n))return 1;if([42,44,69,70,73,74,75,82].includes(n))return 2;if([46,54].includes(n))return 3;if([39,62,63,64].includes(n))return 4;if([41,43,45,47,48,50,60,61,65,66,76,77].includes(n))return 5;return 6}
function midiImport(buffer,target='both'){
 const q=parseMidi(buffer,target);if(target==='notes'&&!q.notes.length)throw Error('В MIDI нет мелодических нот');if(target==='drums'&&!q.drums.length)throw Error('В MIDI нет нот ударных');stop();rememberRoll();ensureBars(Math.ceil(q.endSteps/16));
 if(target!=='drums'){for(let B of banks)B.roll=[];for(let n of q.notes){let b=Math.floor(n.start/16);getRoll(b).push({id:newNoteId(),note:n.note,start:n.start-b*16,duration:n.duration,vel:n.vel,channel:n.channel,mode:0,prob:1})}noteEnd=q.endSteps;currentCompPreset=-1;touchNotes()}
 if(target!=='notes'){for(let B of banks){B.hits=[];B.drums=Array.from({length:7},()=>Array(16).fill(0))}for(let n of q.drums){let b=Math.floor(n.start/16);banks[b].hits.push({id:newNoteId(),index:gmDrumIndex(n.note),start:n.start-b*16,duration:n.duration,vel:n.vel,midiNote:n.note})}banks.forEach((_,b)=>drumsProjected(b));drumEnd=q.endSteps;$('drumPreset').value=''}
 tempoMap=q.tempoMap;$('bpm').value=+q.bpm.toFixed(3);$('swing').value=0;$('human').checked=false;$('probability').value=100;songSections=[];loopManual=false;syncLoopToTracks();songMode=true;$('songMode').checked=true;cueStep=loopStart;bank=drumBank=0;
 if(target!=='drums'){currentCompPreset=importedProjectScore({currentComposerName:'MIDI / '+q.notes.length+' нот · '+Math.ceil(q.endSteps/16)+' тактов'});$('compGenre').value='all';$('compSearch').value='';$('compRoleFilter').value='all';fillComposerPresets();$('compPreset').value=currentCompPreset;$('composerHint').textContent='Импорт MIDI: длительности, каналы и карта темпа сохранены. Тембр остаётся выбранным вручную.';$('loadMatchedDrums').disabled=true}
 if(target!=='notes'){let imported=importedProjectRhythm({currentDrumPresetName:'MIDI / '+q.drums.length+' ударов · '+Math.ceil(q.endSteps/16)+' тактов'});$('drumGenre').value='import';$('drumSearch').value='';fillDrumBooks();$('drumPreset').value=imported;$('rhythmHint').textContent='MIDI: '+q.drums.length+' ударов. Исходные GM-номера, длительности и дробные позиции сохранены; редактируется выбранный такт.';$('loadMatchedNotes').disabled=true}
 fitRoll();renderNotes();renderDrums();updateTimeline();syncAudio();autoSave();toast('MIDI: '+q.notes.length+' НОТ / '+q.drums.length+' УДАРОВ · '+Math.ceil(q.endSteps/16)+' ТАКТОВ'+(q.smpte?' · SMPTE→ВРЕМЯ':''));return q;
}
function varlen(v){v=Math.max(0,Math.round(v));let b=[v&127];while(v=Math.floor(v/128))b.unshift((v&127)|128);return b}
function be(v,n){return Array.from({length:n},(_,i)=>(v>>((n-i-1)*8))&255)}function ascii(s){return[...s].map(c=>c.charCodeAt(0))}
function midiTrack(events,name,endTick){const label=[...new TextEncoder().encode(name)],bytes=[0,255,3,...varlen(label.length),...label];events.sort((a,b)=>a.t-b.t||a.order-b.order);let tick=0;for(let e of events){bytes.push(...varlen(e.t-tick),...e.data);tick=e.t}bytes.push(...varlen(Math.max(0,endTick-tick)),255,47,0);return[...ascii('MTrk'),...be(bytes.length,4),...bytes]}
function midiBytes(target='both'){
 let start=loopStart,end=loopEnd,ppq=480,base=120,sw=+$('swing').value/100;
 const tick=t=>Math.round(swungDuration(start,t-start,base,sw)),endTick=tick(end),a=[],d=[],meta=[];
 const addTempo=(at,bpm)=>{let us=Math.round(60000000/bpm);meta.push({t:tick(at),order:0,data:[255,81,3,...be(us,3)]})};addTempo(start,tempoAt(start));for(let t of tempoMap)if(t.step>start&&t.step<end)addTempo(t.step,t.bpm);
 if(target!=='drums')for(let e of allRoll()){let n=e.n,from=Math.max(start,e.start),to=Math.min(end,e.start+n.duration,noteEnd);if(to<=from||e.start>=noteEnd)continue;let rat=n.mode===3?2:n.mode===4?3:1,ch=(n.channel??0)===9?0:clamp(n.channel??0,0,15);for(let r=0;r<rat;r++){let t0=from+(to-from)*r/rat,t1=t0+(to-from)/rat*(rat>1?.85:1);a.push({t:Math.min(endTick-1,tick(t0)),order:1,data:[144|ch,n.note,Math.round(clamp(n.vel*(n.mode===1?1.15:1),.01,1)*127)]},{t:Math.min(endTick,Math.max(Math.min(endTick-1,tick(t0))+1,tick(t1))),order:0,data:[128|ch,n.note,0]})}}
 if(target!=='notes')for(let b=Math.floor(start/16);b<Math.ceil(Math.min(end,drumEnd)/16);b++)for(let h of drumHits(b)){let t=b*16+h.start;if(t<start||t>=end||t>=drumEnd)continue;let n=clamp(h.midiNote??drumNote[h.index],0,127);d.push({t:Math.min(endTick-1,tick(t)),order:1,data:[153,n,Math.round(clamp(h.vel,.01,1)*127)]},{t:Math.min(endTick,Math.max(tick(t)+1,tick(Math.min(t+(h.duration||.25),end)))),order:0,data:[137,n,0]})}
 let tracks=[midiTrack(meta,'TEMPO / POLIVOKS',endTick)];if(target!=='drums')tracks.push(midiTrack(a,'POLIVOKS / KVANT',endTick));if(target!=='notes')tracks.push(midiTrack(d,'RHYTHM / GM DRUMS',endTick));return new Uint8Array([...ascii('MThd'),0,0,0,6,0,1,...be(tracks.length,2),...be(ppq,2),...tracks.flat()]);
}
function midiExport(target='both'){download(midiBytes(target),'polivoks-'+target+'.mid','audio/midi');toast('MIDI: ВЫБРАННЫЙ ДИАПАЗОН / ДЛИТЕЛЬНОСТИ И КАРТА ТЕМПА')}
function openMidi(target){fileIntent='midi-'+target;$('fileInput').accept='.mid,.midi';$('fileInput').click()}
$('midiOut').onclick=()=>midiExport('both');$('midiIn').onclick=()=>openMidi('notes');$('drumMidiIn').onclick=()=>openMidi('drums');$('drumMidiOut').onclick=()=>midiExport('drums');$('midiBothIn').onclick=()=>openMidi('both');
