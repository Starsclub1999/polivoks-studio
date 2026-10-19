'use strict';
const EXTRA_PARAMS=[['xRatio','ГЕНЕРАТОР II / ОТНОШЕНИЕ ЧАСТОТ',.1],['xPhase','ФАЗОВАЯ МОДУЛЯЦИЯ',.001],['xRing','КОЛЬЦЕВАЯ МОДУЛЯЦИЯ',.001],['xPwm','ШИРИНА ИМПУЛЬСА / PWM',.001],['xChorus','СТЕРЕОХОРУС',.001],['xWow','КАССЕТНОЕ ПЛАВАНИЕ',.001],['xCrush','ЗЕРНО / BIT & RATE',.001]];
const RATIO_LABELS=['1×','¼×','½×','1½×','2×','3×','4×','5×','7×','11×','16×'];
const SCORE_ROLES=[['bass','БАС'],['lead','ЛИД'],['arp','АРПЕДЖИО'],['pad','ПАД / АККОРДЫ'],['bell','КОЛОКОЛ'],['drone','ДРОН'],['keys','КЛАВИШИ'],['pluck','ЩИПКОВЫЙ'],['fx','ЭФФЕКТ'],['amp','ПЕРКУССИЯ'],['brass','МЕДНЫЕ'],['strings','СТРУННЫЕ'],['poly','ПОЛИФОНИЯ']];
let activeScoreVariant=0;
function importedProjectSound(q){
 const id='project-sound-import',type=SOUND_TYPES.some(([t])=>t===q.catalog?.type)?q.catalog.type:'Lead',cat=q.catalog?.genre&&q.catalog.genre!=='Все банки'?q.catalog.genre:'Импорт проекта';
 const patch={id,mappings:q.currentControllerMappings||[],name:q.currentPresetName||'Тембр из проекта v'+(q.version||1),cat,type,params:{...p},extended,fxPatch:{delay:fx.delay,feedback:fx.feedback,delayTime:fx.delayTime,reverb:fx.reverb},desc:'Сохранённый тембр проекта. Новая фабричная библиотека выбирается отдельно.'};
 let i=presets.findIndex(x=>x.id===id);if(i<0){i=presets.length;presets.push(patch)}else presets[i]=patch;initPresets();return i;
}
function importedProjectScore(q){
 const id='project-score-import',genre=$('genStyle').value||'soviet',settings=Object.fromEntries(compSettingIds.map(k=>[k,$(k).value])),score={id,genre,type:$('compRole').value||'lead',name:q.currentComposerName||'Ноты из проекта v'+(q.version||1),settings,timeline:{noteEnd,loopStart,loopEnd},tempoMap:tempoMap.map(t=>({...t})),events:allRoll().map(e=>[e.n.note,e.start,e.n.duration,e.n.vel,e.n.mode,e.n.prob??1,e.n.channel??0]),bars:banks.length,length:noteEnd,desc:'Ноты и настройки, сохранённые в проекте; фабричная программа не подменяется.'};
 let i=compPresets.findIndex(x=>x.id===id);if(i<0){i=compPresets.length;compPresets.push(score)}else compPresets[i]=score;return i;
}
function importedProjectKit(q){
 const old=q.currentKitData||(q.currentKitId?RHYTHMBOOK.legacyKits.find(k=>k.id===q.currentKitId):RHYTHMBOOK.legacyKits[Math.round(+q.currentKit||0)]);
 if(!old)return 0;if(!['freq','decay'].every(k=>Array.isArray(old[k])&&old[k].length===7&&old[k].every(v=>Number.isFinite(+v)&&+v>0)))throw Error('Повреждён набор барабанов проекта');
 const kit={...structuredClone(old),id:'project-kit-import',genre:'import',name:old.name||'Набор из проекта',desc:old.id==='project-kit-import'?(old.desc||''):'Сохранённый набор проекта. '+(old.desc||'')};
 let i=drumKits.findIndex(k=>k.id===kit.id);if(i<0){i=drumKits.length;drumKits.push(kit)}else drumKits[i]=kit;
 return i;
}
function importedProjectRhythm(q){
 const id='project-rhythm-import',rhythm={id,genre:'import',name:q.currentDrumPresetName||'Ритм из проекта v'+(q.version||1),bpm:+$('bpm').value,swing:+$('swing').value,drumEvents:project(true).drumEvents,length:drumEnd,barsCount:banks.length,tempoMap:tempoMap.map(t=>({...t})),desc:'Полная партия сохранённого проекта; фабричная программа не подменяется.'};
 let i=drumPresets.findIndex(k=>k.id===id);if(i<0){i=drumPresets.length;drumPresets.push(rhythm)}else drumPresets[i]=rhythm;
 return i;
}
function refreshExtraControls(){document.querySelectorAll('.extra-rack')[0]?.classList.toggle('hidden',!!p.bank6);if($('polyHint'))$('polyHint').textContent='ГОЛОСОВ: '+(extended?[1,2,4,8,16][Math.round(p.voices)]||1:p.duo?'ДУО':'МОНО')+(p.unison?' · УНИСОН':'')+' · АРПЕДЖИАТОР '+(p.arpMode?'ВКЛЮЧЁН':'ВЫКЛЮЧЕН')+' · ПАНЕЛЬ '+(panelPage==='fx'?'АРП / ЭФФЕКТЫ':'ОСНОВНАЯ')+' '; for(let[k]of EXTRA_PARAMS){let e=$(k);if(!e)continue;e.value=p[k]||0;e.disabled=!extended;$(k+'Value').textContent=k==='xRatio'?RATIO_LABELS[Math.round((p[k]||0)*10)]:Math.round((p[k]||0)*100)+'%'}if($('extraState'))$('extraState').textContent='ПАНЕЛИ «ОСНОВНАЯ» / «АРП / ЭФФЕКТЫ» ПЕРЕКЛЮЧАЮТСЯ НА ПРИБОРЕ И ЗДЕСЬ'}
function choosePreset(i,forceMode=false){
 if(typeof controllerTouched!=='undefined')controllerTouched.clear();currentPreset=Math.round(clamp(i,0,presets.length-1));const q=presets[currentPreset];
 if((q.sourceValues||forceMode||$('followPresetMode').checked)&&typeof q.extended==='boolean'){extended=q.extended;$('engineMode').value=extended?'extended':'original'}
 let patch={...q.params};if(q.sourceValues&&!$('followPresetFX').checked)for(let d of defs)if(d.page==='fx')patch[d.id]=p[d.id];patchApply(patch);if($('followPresetFX').checked&&q.fxPatch)for(let[k,v]of Object.entries(q.fxPatch)){fx[k]=v;if($(k))$(k).value=v}
 if(!filteredPresets().some(x=>x.i===currentPreset)){$('category').value=q.cat;$('presetType').value=q.type||'all';$('presetSearch').value='';fillPresets()}
 syncAudio();refreshExtraControls();$('preset').value=currentPreset;$('patchdesc').textContent=q.type+' · '+(q.originalName?q.originalName+' · ':'')+(q.desc||'Пользовательский тембр');$('patchdesc').title=(q.originalName||q.name)+' · '+(q.desc||'');autoSave();toast(q.name);
}
function initComposerPresets(){
 for(let s of compStyles.filter(s=>!s.folderOnly))$('genStyle').add(new Option(s.name,s.id));$('compGenre').add(new Option('ВСЕ ЖАНРЫ','all'));
 for(let s of compStyles.filter(g=>compPresets.some(q=>q.genre===g.id)))$('compGenre').add(new Option(s.name,s.id));if(composerUserPresets.length)$('compGenre').add(new Option('МОИ ШАБЛОНЫ','user'));
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
function soundForPhrase(){
 const q=compPresets[currentCompPreset];if(q?.params){if(typeof q.extended==='boolean'){extended=q.extended;$('engineMode').value=extended?'extended':'original'}patchApply(q.params);currentPreset=importedProjectSound({currentPresetName:q.name+' / тембр',catalog:{type:q.instrumentType||'Lead'}});fillPresets();refreshExtraControls();syncAudio();return}
 let i=presets.findIndex(p=>p.id===q?.recommendedPatch);if(i<0){toast('Для личного шаблона тембр выбирается вручную');return}$('category').value=presets[i].cat;$('presetType').value=presets[i].type;$('presetSearch').value='';fillPresets();choosePreset(i,true);
}
async function loadComposerPreset(index,compose=true){
 const q=compPresets[index];if(!q)return;const serial=++compositionLoadSerial;if(q.midiFile){try{await hydrateComposition(q);if(serial!==compositionLoadSerial)return}catch(e){toast(e.message);return}}if(compose)stop();currentCompPreset=index;activeScoreVariant=q.variant||0;
 if(![...$('compPreset').options].some(o=>+o.value===index)){$('compGenre').value=q.genre;$('compRoleFilter').value='all';$('compSearch').value='';fillComposerPresets()}$('compPreset').value=index;
 for(let[id,v]of Object.entries(q.settings||{})){if(!$(id))continue;if($(id).tagName==='SELECT'&&![...$(id).options].some(o=>o.value===String(v)))$(id).add(new Option(String(v),String(v)));$(id).value=v}
 activeMotif=q.motif||null;
 if(compose){
  if(q.recipe||q.cells||q.rolls||q.events){let data=SCOREBOOK.materialize(q);rememberRoll();ensureBars(data.bars.length);for(let {B} of existingBanks())B.roll=[];for(let key of Object.keys(data.bars)){let b=+key;banks[b].roll=(data.bars[b]||[]).map(n=>({id:newNoteId(),note:n[0],start:n[1],duration:n[2],vel:n[3],mode:n[4]||0,prob:n[5]??1,channel:n[6]??0}))}noteEnd=data.length;tempoMap=Array.isArray(q.tempoMap)?q.tempoMap.map(t=>({...t})):[];songSections=data.sections||[];loopManual=false;syncLoopToTracks();cueStep=0;songMode=true;$('songMode').checked=true;bank=0;touchNotes();fitRoll();renderNotes();updateTimeline()
  }else generate(true);
 }
 if($('linkComposerSound').checked&&(q.recommendedPatch||q.params))soundForPhrase();
 let pair=drumPresets.find(d=>d.id===q.recommendedDrums);$('loadMatchedDrums').disabled=!pair;$('composerHint').textContent=(q.desc||'Личный шаблон')+(pair?' ПАРНЫЙ РИТМ: '+pair.name:'');$('compDisplay').textContent=q.name.slice(0,70);syncAudio();autoSave();toast('КОМПОЗИТОР: '+q.name);
}
function generateFromGenre(fromPreset=false){
 if(playing)stop();rememberRoll();const style=compStyles.find(s=>s.id===$('genStyle').value)||compStyles[0],all=$('generateAll').checked,N=all?Math.round(clamp(+$('generateBars').value||Math.round(+$('bpm').value/4),1,MAX_BARS)):1,settings=Object.fromEntries(compSettingIds.map(k=>[k,$(k).value]));
 let fake={genre:style.id,type:$('compRole').value,variant:activeScoreVariant,bars:N,settings,recipe:true,manual:true,soundParams:{...p},editedMotif:activeMotif||null},data=materializeScore(fake),rng=seeded(+$('compSeed').value),density=+$('density').value/100,gate=+$('compGate').value/100,sync=+$('syncopation').value/100,evo=+$('evolution').value/100,complexity=+$('complexity').value/100,role=$('compRole').value;
 let offset=all?0:bank;if(all){ensureBars(N);for(let {B} of existingBanks())B.roll=[]}else ensureBars(bank+1);
 for(let b=0;b<N;b++){
  banks[offset+b].roll=data.bars[b].filter((n,k)=>k===0||n[1]%4===0||rng()<density).map((n,k)=>{let at=n[1]+(sync>.5&&k%2&&n[1]%1===0?.5:0),note=n[0],len=n[2];if(complexity>.52&&rng()<(complexity-.5)*.64&&n[1]%4!==0)note+=rng()<.5?-1:1;if(['arp','pluck','bell'].includes(role)&&+$('octaves').value>1&&k%3===2)note+=12*Math.floor(rng()*+$('octaves').value);if(rng()<evo*.25)len*=.75+evo;len*=gate/(['pad','drone'].includes(role)?1.55:['arp','pluck','bass','amp'].includes(role)?.58:.86);return{id:newNoteId(),note:Math.round(clamp(note,0,127)),start:Math.min(15.875,at),duration:clamp(len,.125,MAX_STEPS-(offset+b)*16-Math.min(15.875,at)),vel:n[3],mode:n[4]||0,prob:1}})
 }
 noteEnd=all?N*16:Math.max(noteEnd,(bank+1)*16);loopManual=false;tempoMap=[];songSections=all?data.sections:songSections;syncLoopToTracks();currentCompPreset=-1;touchNotes();renderNotes();fitRoll();updateTimeline();syncAudio();autoSave();if(!fromPreset)toast('НОВАЯ ЖАНРОВАЯ ПАРТИТУРА / УДАРНЫЕ СОХРАНЕНЫ');
}
function applyDrums(index,b=drumBank){const q=drumPresets[index];if(!q)return;const data=RHYTHMBOOK.materialize(q);ensureBars(b+1);banks[b].drums=(data.bars[b%data.bars.length]||Array.from({length:7},()=>Array(16).fill(0))).map(row=>row.slice());banks[b].hits=null;renderDrums()}
function fillDrumBooks(){
 const genre=$('drumGenre').value,term=$('drumSearch').value.trim().toLowerCase();let count=0;
 for(let[id,list,current]of[['drumKit',drumKits,currentKit],['drumPreset',drumPresets,-1]]){
  let select=$(id),old=select.value;select.replaceChildren();
  let groups=new Map();list.forEach((q,i)=>{if((genre==='all'||q.genre===genre)&&(!term||(q.name+' '+(q.desc||'')+' '+(q.scoreName||'')+' '+(q.kind||'')).toLowerCase().includes(term))){let g=q.genre||'legacy';if(!groups.has(g)){let group=document.createElement('optgroup');group.label=compStyles.find(s=>s.id===g)?.name||(g==='import'?'ИМПОРТ ПРОЕКТА':'ДРУГИЕ НАБОРЫ');groups.set(g,group)}groups.get(g).append(new Option(q.name+(q.duration?' · '+timeText(q.duration):''),i));count++}});
  for(let group of groups.values())select.append(group);
  if([...select.options].some(o=>o.value===old))select.value=old;else if([...select.options].some(o=>+o.value===current))select.value=current;
  $(id==='drumKit'?'applyKit':'applyDrums').disabled=!select.options.length;
 }
 $('drumBookCount').textContent=count+' В ВЫБОРЕ / '+drumKits.length+' НАБОРА / '+drumPresets.length+' РИТМОВ';
}
async function loadDrumPattern(index){
 const q=drumPresets[index];if(!q)return;if(q.midiFile){try{await hydrateRhythm(q)}catch(e){toast(e.message);return}}stop();if(![...$('drumPreset').options].some(o=>+o.value===index)){$('drumGenre').value=q.genre||'import';$('drumSearch').value='';fillDrumBooks()}$('drumPreset').value=index;
 let data=RHYTHMBOOK.materialize(q);
 if($('drumLoad4').checked){ensureBars(data.bars.length);for(let {B} of existingBanks()){B.hits=null;B.drums=Array.from({length:7},()=>Array(16).fill(0))}for(let key of Object.keys(data.bars)){let b=+key;banks[b].drums=data.bars[b].map(row=>row.slice())}drumEnd=q.length||data.length;
  if(Array.isArray(q.drumEvents)){for(let {B} of existingBanks())B.hits=[];for(let h of q.drumEvents){let b=Math.floor(h[1]/16);ensureBars(b+1);(banks[b].hits??=[]).push({index:h[0],start:h[1]-b*16,vel:h[2],duration:h[3],midiNote:h[4]})}existingBanks().forEach(({b})=>drumsProjected(b))}drumBank=0;
 }else{ensureBars(drumBank+1);banks[drumBank].drums=(data.bars[drumBank%data.bars.length]||Array.from({length:7},()=>Array(16).fill(0))).map(row=>row.slice());banks[drumBank].hits=null;drumEnd=Math.max(drumEnd,(drumBank+1)*16)}
 if($('drumTempo').checked){$('bpm').value=q.bpm;if(q.swing!==undefined)$('swing').value=q.swing;tempoMap=Array.isArray(q.tempoMap)?q.tempoMap.map(t=>({...t})):[]}
 if($('drumFollowKit').checked&&q.recommendedKit){let k=drumKits.findIndex(k=>k.id===q.recommendedKit);if(k>=0)kitApply(k,false)}
 loopManual=false;syncLoopToTracks();cueStep=0;songMode=true;$('songMode').checked=true;renderDrums();updateTimeline();syncAudio();let linked=compPresets.find(p=>p.id===q.scoreId);$('loadMatchedNotes').disabled=!linked;$('rhythmHint').textContent=(q.desc||q.name)+(linked?' ДЛЯ НОТ: '+linked.name+' · '+q.bpm+' BPM · '+timeText(q.duration||secondsBetween(0,drumEnd)):'');autoSave();toast('РИТМ: '+q.name);
}
function initBookControls(){
 for(let[k,label,step]of EXTRA_PARAMS){let cell=document.createElement('label');cell.className='extra-param';let title=document.createElement('span');title.textContent=label;let out=document.createElement('output');out.id=k+'Value';let input=document.createElement('input');input.id=k;input.type='range';input.min=0;input.max=1;input.step=step;input.value=p[k]||0;input.oninput=()=>{p[k]=+input.value;refreshExtraControls();syncAudio()};input.onchange=autoSave;cell.append(title,out,input);$('extraParams').append(cell)}
 $('soundForPhrase').onclick=soundForPhrase;
 for(let q of compPresets){let v=q.settings?.progression;if(v&&![...$('progression').options].some(o=>o.value===v))$('progression').add(new Option(v,v))}
 $('drumGenre').add(new Option('ВСЕ ЖАНРЫ','all'));for(let g of compStyles)$('drumGenre').add(new Option(g.name,g.id));$('drumGenre').add(new Option('ИМПОРТ ПРОЕКТА','import'));$('drumGenre').onchange=fillDrumBooks;$('drumSearch').oninput=fillDrumBooks;
 const oldEngine=$('engineMode').onchange;$('engineMode').onchange=e=>{oldEngine?.(e);refreshExtraControls()};
 refreshExtraControls();
}
