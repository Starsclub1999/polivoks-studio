'use strict';
const EXTRA_PARAMS=[['xRatio','ГЕНЕРАТОР II / ОТНОШЕНИЕ ЧАСТОТ',.1],['xPhase','ФАЗОВАЯ МОДУЛЯЦИЯ',.001],['xRing','КОЛЬЦЕВАЯ МОДУЛЯЦИЯ',.001],['xPwm','ШИРИНА ИМПУЛЬСА / PWM',.001],['xChorus','СТЕРЕОХОРУС',.001],['xWow','КАССЕТНОЕ ПЛАВАНИЕ',.001],['xCrush','ЗЕРНО / BIT & RATE',.001]];
const RATIO_LABELS=['1×','¼×','½×','1½×','2×','3×','4×','5×','7×','11×','16×'];
const SCORE_ROLES=[['bass','BASS'],['lead','LEAD'],['arp','ARP'],['pad','PAD / ГАРМОНИЯ'],['bell','BELL'],['drone','DRONE']];
let activeScoreVariant=0;
function importedProjectSound(q){
 const id='project-sound-import',type=SOUND_TYPES.some(([t])=>t===q.catalog?.type)?q.catalog.type:'Lead',cat=q.catalog?.genre&&q.catalog.genre!=='Все банки'?q.catalog.genre:'Импорт проекта';
 const patch={id,name:q.currentPresetName||'Тембр из проекта v'+(q.version||1),cat,type,params:{...p},extended,fxPatch:{delay:fx.delay,feedback:fx.feedback,delayTime:fx.delayTime,reverb:fx.reverb},desc:'Сохранённый тембр проекта. Новая фабричная библиотека выбирается отдельно.'};
 let i=presets.findIndex(x=>x.id===id);if(i<0){i=presets.length;presets.push(patch)}else presets[i]=patch;initPresets();return i;
}
function importedProjectScore(q){
 const id='project-score-import',genre=$('genStyle').value||'soviet',settings=Object.fromEntries(compSettingIds.map(k=>[k,$(k).value])),score={id,genre,type:$('compRole').value||'lead',name:q.currentComposerName||'Ноты из проекта v'+(q.version||1),settings,rolls:banks.map((_,b)=>getRoll(b).map(n=>({...n}))),desc:'Ноты и настройки, сохранённые в проекте; фабричная программа не подменяется.'};
 let i=compPresets.findIndex(x=>x.id===id);if(i<0){i=compPresets.length;compPresets.push(score)}else compPresets[i]=score;return i;
}
function refreshExtraControls(){for(let[k]of EXTRA_PARAMS){let e=$(k);if(!e)continue;e.value=p[k]||0;e.disabled=!extended;$(k+'Value').textContent=k==='xRatio'?RATIO_LABELS[Math.round((p[k]||0)*10)]:Math.round((p[k]||0)*100)+'%'}if($('extraState'))$('extraState').textContent=extended?'РАСШИРЕННЫЙ ТРАКТ АКТИВЕН':'ВКЛЮЧИТЕ РАСШИРЕННЫЙ РЕЖИМ ДЛЯ ЭТИХ ПАРАМЕТРОВ'}
function choosePreset(i){
 currentPreset=Math.round(clamp(i,0,presets.length-1));const q=presets[currentPreset];
 if($('followPresetMode').checked&&typeof q.extended==='boolean'){extended=q.extended;$('engineMode').value=extended?'extended':'original'}
 patchApply(q.params);if($('followPresetFX').checked&&q.fxPatch)for(let[k,v]of Object.entries(q.fxPatch)){fx[k]=v;if($(k))$(k).value=v}
 if(!filteredPresets().some(x=>x.i===currentPreset)){$('category').value=q.cat;$('presetType').value=q.type||'all';$('presetSearch').value='';fillPresets()}
 syncAudio();refreshExtraControls();$('preset').value=currentPreset;$('patchdesc').textContent=q.type+' · '+(q.desc||'Пользовательский тембр');$('patchdesc').title=q.desc||'';autoSave();toast(q.name);
}
function initComposerPresets(){
 for(let s of compStyles)$('genStyle').add(new Option(s.name,s.id));$('compGenre').add(new Option('ВСЕ ЖАНРЫ','all'));
 for(let s of compStyles)$('compGenre').add(new Option(s.name,s.id));if(composerUserPresets.length)$('compGenre').add(new Option('МОИ ШАБЛОНЫ','user'));
 $('compRoleFilter').add(new Option('ВСЕ ПАРТИИ','all'));for(let[a,b]of SCORE_ROLES)$('compRoleFilter').add(new Option(b,a));
 $('compRoleFilter').onchange=fillComposerPresets;$('compSearch').oninput=fillComposerPresets;fillComposerPresets();
}
function fillComposerPresets(){
 const genre=$('compGenre').value,type=$('compRoleFilter').value||'all',term=$('compSearch').value.trim().toLowerCase(),old=$('compPreset').value;
 $('compPreset').replaceChildren();let count=0;
 for(let[role,label]of SCORE_ROLES){const group=document.createElement('optgroup');group.label=label;
  compPresets.forEach((q,i)=>{let r=q.type||q.settings?.compRole||'lead';if(r===role&&(genre==='all'||q.genre===genre)&&(type==='all'||role===type)&&(!term||(q.name+' '+(q.desc||'')).toLowerCase().includes(term))){group.append(new Option(q.name,i));count++}});
  if(group.children.length)$('compPreset').append(group);
 }
 if([...$('compPreset').options].some(o=>o.value===old))$('compPreset').value=old;
 $('loadComp').disabled=!count;
 $('compCount').textContent=count+' / '+compPresets.length+' ПРОГРАММ';
}
function soundForPhrase(){const q=compPresets[currentCompPreset];let i=presets.findIndex(p=>p.id===q?.recommendedPatch);if(i<0){toast('Для личного шаблона тембр выбирается вручную');return}$('category').value=presets[i].cat;$('presetType').value=presets[i].type;$('presetSearch').value='';fillPresets();choosePreset(i)}
function loadComposerPreset(index,compose=true){
 const q=compPresets[index];if(!q)return;currentCompPreset=index;activeScoreVariant=q.variant||0;
 if(![...$('compPreset').options].some(o=>+o.value===index)){$('compGenre').value=q.genre;$('compRoleFilter').value='all';$('compSearch').value='';fillComposerPresets()}$('compPreset').value=index;
 for(let[id,v]of Object.entries(q.settings||{})){if(!$(id))continue;if($(id).tagName==='SELECT'&&![...$(id).options].some(o=>o.value===String(v)))$(id).add(new Option(String(v),String(v)));$(id).value=v}
 activeMotif=q.motif||null;
 if(compose&&(q.cells||q.rolls)){
  rememberRoll();for(let b=0;b<4;b++)banks[b].roll=q.cells?(q.cells[b]||[]).map(n=>({id:newNoteId(),note:n[0],start:n[1],duration:n[2],vel:n[3],mode:n[4],prob:1})):(q.rolls[b]||[]).map(n=>({...n,id:newNoteId()}));fitRoll();renderNotes();
 }else if(compose)generate(true);
 if($('linkComposerSound').checked&&q.recommendedPatch)soundForPhrase();
 $('composerHint').textContent=q.desc||'Личный шаблон композиции';$('compDisplay').textContent=q.name.slice(0,55);syncAudio();autoSave();toast('КОМПОЗИТОР: '+q.name);
}
function generateFromGenre(fromPreset=false){
 rememberRoll();const style=compStyles.find(s=>s.id===$('genStyle').value)||compStyles[0],role=$('compRole').value,sc=scales[$('scale').value]||scales.minor,root=12*(+$('baseOct').value+1)+(+$('root').value),oct=+$('octaves').value,density=clamp(+$('density').value/100),complex=+$('complexity').value/100,evo=+$('evolution').value/100,sync=+$('syncopation').value/100,gate=+$('compGate').value/100,motif=activeMotif||style.motif,rng=seeded(+$('compSeed').value),progress=$('progression').value.split(',').map(Number),targets=$('generateAll').checked?[0,1,2,3]:[bank];
 let previous=null;
 for(let b of targets){const notes=[],ch=Number.isFinite(progress[b%progress.length])?progress[b%progress.length]:style.progress[b%4],pulses=(activeScoreVariant===1?style.pulsesB:style.pulses).slice();
  const add=(note,start,duration,vel,mode=0)=>notes.push({id:newNoteId(),note:Math.round(clamp(note,24,96)),start:clamp(start,0,15.875),duration:clamp(duration,.125,64-start-b*16),vel:clamp(vel,.15,1),mode,prob:1});
  if(role==='pad'||role==='drone'){
   let offsets=role==='drone'?[0,4].slice(0,complex>.45?2:1):Array.from({length:+$('voicing').value},(_,j)=>j*2),chord=offsets.map(d=>degreeNote(root,sc,d+ch));
   if(previous)chord=chord.map((n,j)=>[n-12,n,n+12].filter(x=>x>=24&&x<=96).sort((a,b)=>Math.abs(a-previous[Math.min(j,previous.length-1)])-Math.abs(b-previous[Math.min(j,previous.length-1)]))[0]);
   chord.forEach((n,j)=>add(n,j&&complex>.5?.125*j:0,Math.min(16.5,16*gate),.73-j*.07));previous=chord;
   if(role==='pad'&&density>.7)chord.slice(1).forEach((n,j)=>add(n+12,8,7.6,.47-j*.04));
  }else{
   let times=role==='arp'?Array.from({length:16},(_,i)=>i):role==='bell'?pulses.filter((_,i)=>i%2===0):pulses;
   for(let k=0;k<times.length;k++){
    if(k&&rng()>density)continue;let start=times[k],m=motif[(k+(b&&rng()<evo?b:0))%Math.min(motif.length,+$('motifLen').value)],deg=m+ch;
    if(role==='bass'){deg=(k%3===0?m%sc.length:0)+ch;if(complex>.6&&k%4===3)deg+=sc.length}
    if(role==='arp'){const arp=$('arpMode').value,lim=sc.length*oct;if(arp==='up')deg=k%lim+ch;else if(arp==='down')deg=lim-1-k%lim+ch;else if(arp==='pendulum'){let n=Math.max(1,lim-1);deg=n-Math.abs(k%(2*n)-n)+ch}else if(arp==='random')deg=Math.floor(rng()*lim)+ch;else deg=motif[k%motif.length]+ch}
    if(role==='lead'&&b===3&&k===times.length-1)deg=ch;
    if(role==='bell'&&k%2&&oct>1)deg+=sc.length;
    if(sync>.6&&k%2&&start%1===0)start=Math.min(15.75,start+.5);
    const gap=k+1<times.length?Math.max(.25,times[k+1]-times[k]):16-start,dur=role==='bell'?1.6*gate:Math.min(role==='lead'?4:2,gap*gate),mode=role==='bass'&&['acid','dub','dnb'].includes(style.id)&&k%4===3?2:k%4===0?1:style.id==='idm'&&complex>.7&&k%5===2?3:0;
    add(degreeNote(root,sc,deg),start,dur,(k%4===0?.92:.68)+(rng()-.5)*.12,mode);
   }
  }
  banks[b].roll=notes;
 }
 renderNotes();fitRoll();syncAudio();autoSave();if(!fromPreset)toast('НОВАЯ ЖАНРОВАЯ ФРАЗА / УДАРНЫЕ СОХРАНЕНЫ');
}
function applyDrums(index,b=drumBank,fill=false){
 const q=drumPresets[index];if(!q)return;
 if(q.bars)banks[b].drums=q.bars[b%q.bars.length].map(row=>row.slice());
 else for(let j=0;j<7;j++)banks[b].drums[j]=Array.from(q.rows[j],(c,k)=>c==='x'?(k%4===0?1:.72):c==='g'?.25:c==='X'?1:0);
 if(fill&&!q.bars){banks[b].drums[1][14]=.7;banks[b].drums[5][15]=.9}renderDrums();
}
function fillDrumBooks(){
 const genre=$('drumGenre').value,term=$('drumSearch').value.trim().toLowerCase();let count=0;
 for(let[id,list,current]of[['drumKit',drumKits,currentKit],['drumPreset',drumPresets,-1]]){
  let select=$(id),old=select.value;select.replaceChildren();
  let groups=new Map();list.forEach((q,i)=>{if((genre==='all'||q.genre===genre)&&(!term||(q.name+' '+(q.desc||'')+' '+(q.kind||'')).toLowerCase().includes(term))){let g=q.genre||'legacy';if(!groups.has(g)){let group=document.createElement('optgroup');group.label=compStyles.find(s=>s.id===g)?.name||'КЛАССИЧЕСКАЯ КОЛЛЕКЦИЯ';groups.set(g,group)}groups.get(g).append(new Option(q.name,i));count++}});
  for(let group of groups.values())select.append(group);
  if([...select.options].some(o=>o.value===old))select.value=old;else if([...select.options].some(o=>+o.value===current))select.value=current;
  $(id==='drumKit'?'applyKit':'applyDrums').disabled=!select.options.length;
 }
 $('drumBookCount').textContent=count+' В ВЫБОРЕ / '+drumKits.length+' НАБОРА / '+drumPresets.length+' РИТМОВ';
}
function loadDrumPattern(index){
 const q=drumPresets[index];if(!q)return;
 if(![...$('drumPreset').options].some(o=>+o.value===index)){$('drumGenre').value=q.genre||'legacy';$('drumSearch').value='';fillDrumBooks()}$('drumPreset').value=index;
 if($('drumLoad4').checked&&q.bars)for(let b=0;b<4;b++)applyDrums(index,b);else applyDrums(index,drumBank);
 if($('drumTempo').checked){$('bpm').value=q.bpm;if(q.swing!==undefined)$('swing').value=q.swing;syncAudio()}
 $('rhythmHint').textContent=q.desc||q.name;autoSave();toast('РИТМ: '+q.name);
}
function initBookControls(){
 for(let[k,label,step]of EXTRA_PARAMS){let cell=document.createElement('label');cell.className='extra-param';let title=document.createElement('span');title.textContent=label;let out=document.createElement('output');out.id=k+'Value';let input=document.createElement('input');input.id=k;input.type='range';input.min=0;input.max=1;input.step=step;input.value=p[k]||0;input.oninput=()=>{p[k]=+input.value;refreshExtraControls();syncAudio()};input.onchange=autoSave;cell.append(title,out,input);$('extraParams').append(cell)}
 $('soundForPhrase').onclick=soundForPhrase;
 for(let q of compPresets){let v=q.settings?.progression;if(v&&![...$('progression').options].some(o=>o.value===v))$('progression').add(new Option(v,v))}
 $('drumGenre').add(new Option('ВСЕ ЖАНРЫ','all'));for(let g of compStyles)$('drumGenre').add(new Option(g.name,g.id));$('drumGenre').add(new Option('КЛАССИЧЕСКАЯ КОЛЛЕКЦИЯ','legacy'));$('drumGenre').onchange=fillDrumBooks;$('drumSearch').oninput=fillDrumBooks;
 const oldEngine=$('engineMode').onchange;$('engineMode').onchange=e=>{oldEngine?.(e);refreshExtraControls()};
 refreshExtraControls();
}
