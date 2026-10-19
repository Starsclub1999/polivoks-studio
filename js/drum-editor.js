'use strict';
function selectDrumBank(i,fromTransport=false){if(playing&&!fromTransport){drumPageFollow=false;$('drumFollow').checked=false;}drumBank=Math.floor(clamp(i,0,MAX_BARS-1));ensureBars(drumBank+1);updatePageButtons();renderDrums();updateTimeline();autoSave()}
function selectDrum(i){selectedDrum=i;const t=drumTracks[i];$('drumSelected').textContent='КАНАЛ '+String(i+1).padStart(2,'0')+' / '+DRUM_NAMES[i];for(let[k,id]of[['level','trackLevel'],['pitch','trackPitch'],['decay','trackDecay'],['tone','trackTone'],['noise','trackNoise'],['drive','trackDrive'],['pan','trackPan']])$(id).value=t[k];document.querySelectorAll('[data-drumname]').forEach(e=>e.classList.toggle('selected',+e.dataset.drumname===i))}
function renderDrums(){
 if(!$('drumGrid'))return;ensureBars(drumBank+1);$('drumGrid').replaceChildren();banks[drumBank].drums.forEach((row,j)=>{
  let el=document.createElement('div');el.className='drumrow';let name=document.createElement('button');name.className='drumname'+(selectedDrum===j?' selected':'');name.dataset.drumname=j;name.textContent=DRUM_NAMES[j];name.title='Выбрать и прослушать';name.onclick=async()=>{selectDrum(j);if(await startAudio()){post({type:'drum',index:j,vel:.95});drumPadFlash[j]=performance.now()}};el.append(name);
  for(let[k,label]of[['mute','M'],['solo','S']]){let b=document.createElement('button');b.className='drum-toggle'+(drumTracks[j][k]?' on':'');b.textContent=label;b.title=k==='mute'?'Выключить канал':'Соло';b.onclick=()=>{drumTracks[j][k]=!drumTracks[j][k];syncAudio();renderDrums();autoSave()};el.append(b)}
  row.forEach((vel,step)=>{let b=document.createElement('button');b.className='drumcell'+(vel?' on':'');b.dataset.dstep=step;b.textContent=vel>.9?'●':vel?'•':'';let count=Array.isArray(banks[drumBank].hits)?banks[drumBank].hits.filter(h=>h.index===j&&Math.floor(h.start)===step).length:0;b.title=DRUM_NAMES[j]+' / '+stepLabel(drumBank*16+step)+(count?' · MIDI: '+count+' СОБЫТИЙ':'');b.onclick=e=>{let v=banks[drumBank].drums[j][step];setDrumCell(drumBank,j,step,e.shiftKey?v>.9?.65:1:v?0:.8);renderDrums()};el.append(b)});$('drumGrid').append(el)
 });markPlayhead();
}
function initDrumEditor(){
 fillDrumBooks();$('applyKit').onclick=()=>kitApply(+$('drumKit').value);$('applyDrums').onclick=()=>loadDrumPattern(+$('drumPreset').value);
 document.querySelectorAll('[data-dbank]').forEach(e=>e.onclick=()=>selectDrumBank(+e.dataset.dbank));
 $('copyDrumBank').onclick=()=>{let next=drumBank+1;if(next>=MAX_BARS)return;ensureBars(next+1);banks[next].drums=structuredClone(banks[drumBank].drums);banks[next].hits=Array.isArray(banks[drumBank].hits)?banks[drumBank].hits.map(h=>({...h,id:newNoteId()})):null;drumEnd=Math.max(drumEnd,(next+1)*16);syncLoopToTracks();updateTimeline();autoSave();toast('РИТМ → ТАКТ '+barLabel(next))};
 $('clearDrumBank').onclick=()=>{banks[drumBank].drums=Array.from({length:7},()=>Array(16).fill(0));banks[drumBank].hits=null;renderDrums();updateTimeline();autoSave()};
 $('drumFill').onclick=()=>{for(let i=12;i<16;i++){setDrumCell(drumBank,5,i,.55+(i-12)*.12);setDrumCell(drumBank,1,i,i%2?.8:0)}renderDrums();autoSave()};
 for(let[k,id]of[['level','trackLevel'],['pitch','trackPitch'],['decay','trackDecay'],['tone','trackTone'],['noise','trackNoise'],['drive','trackDrive'],['pan','trackPan']]){$(id).oninput=()=>{drumTracks[selectedDrum][k]=+$(id).value;syncAudio()};$(id).onchange=autoSave}
 $('trackReset').onclick=()=>{drumTracks[selectedDrum]={...trackDefault(),noise:drumKits[currentKit].noise};selectDrum(selectedDrum);syncAudio();renderDrums();autoSave()};$('drumCollapse').onclick=()=>$('drumPanel').classList.toggle('hidden');$('drumPlay').onclick=()=>drumsRunning?stopPart('drums'):play('drums');$('drumStop').onclick=()=>stopPart('drums');
 $('loadMatchedDrums').onclick=()=>{let q=compPresets[currentCompPreset],i=drumPresets.findIndex(p=>p.id===q?.recommendedDrums);if(i<0){toast('Для этой партии связанный ритм не задан');return}loadDrumPattern(i)};
 $('loadMatchedNotes').onclick=()=>{let d=$('drumPreset').value!==''?drumPresets[+$('drumPreset').value]:null,i=compPresets.findIndex(q=>q.id===d?.scoreId);if(i>=0)loadComposerPreset(i);else toast('Ритм не связан с фабричной партитурой')};
 kitApply(0,false);
}
