// Compact instrument memory, settings drawer and audio-time tape decks.
(()=>{
 FormantaI18n.add?.({'ТЕМП СИНТ.':'SYNTH TEMPO','Темп синтезатора':'Synth tempo','ПРИВЯЗКА':'FOLLOW','Вернуть просмотр к воспроизведению':'Follow playback again','Собственный темп арпеджиатора и синхронной модуляции; хранится в программе':'Independent arpeggiator and synced modulation tempo, stored in the program'});
 const E=id=>document.getElementById(id),dialog=E('settingsDialog');
 E('settingsOpen').onclick=()=>{dialog.showModal();E('settingsOpen').classList.add('open');E('settingsOpen').setAttribute('aria-expanded','true')};
 E('settingsClose').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{E('settingsOpen').classList.remove('open');E('settingsOpen').setAttribute('aria-expanded','false');resize()});dialog.addEventListener('keydown',e=>e.stopPropagation());
 dialog.addEventListener('click',e=>{if(e.target===dialog){let r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
 for(let id of ['storageBtn','returnReception']){let b=E(id),handler=b.onclick;b.onclick=e=>{dialog.close();handler?.(e)}}
 const label=q=>FormantaI18n.language==='en'?(q.originalName||q.nameEn||TR(q.name)):q.name;
 let miniRows=[],auditionTimer=null;
 function fillMini(){let selected=presets[currentPreset],bank=E('miniBank').value||'all',type=E('miniType').value||'all';
  let cats=[...new Set(presets.map(q=>q.cat))];if(bank!=='all'&&!cats.includes(bank))bank='all';if(selected&&bank!=='all'&&selected.cat!==bank)bank=selected.cat;
  E('miniBank').replaceChildren(new Option(TR('ВСЕ БАНКИ'),'all'));for(let name of cats)E('miniBank').add(new Option(TR(name),name));E('miniBank').value=bank;
  let available=presets.filter(q=>bank==='all'||q.cat===bank),types=SOUND_TYPES.filter(([id])=>available.some(q=>q.type===id));if(type!=='all'&&!types.some(([id])=>id===type))type='all';if(selected&&type!=='all'&&selected.type!==type)type=selected.type;
  E('miniType').replaceChildren(new Option(TR('ВСЕ ТИПЫ'),'all'));for(let[id,name]of types)E('miniType').add(new Option(TR(name),id));E('miniType').value=type;
  miniRows=available.map(q=>({q,i:presets.indexOf(q)})).filter(r=>type==='all'||r.q.type===type);
  E('miniPreset').replaceChildren();for(let r of miniRows)E('miniPreset').add(new Option(label(r.q),r.i));E('miniPreset').value=currentPreset;
  E('miniFxState').replaceChildren();for(let[id,name]of[['arpMode','АРП'],['phMode','ФАЗ'],['chMode','ХОР'],['eMode','ЭХО'],['rMode','РЕВ']]){let lamp=document.createElement('span');lamp.textContent=TR(name);lamp.className=p[id]?'active':'';lamp.title=TR(p[id]?'ВКЛ':'ВЫКЛ');E('miniFxState').append(lamp)}
 }
 const applyPreset=choosePreset;choosePreset=function(...args){applyPreset(...args);fillMini()};Polivoks.choosePreset=choosePreset;
 const applyParam=setParam;setParam=function(...args){applyParam(...args);if(['arpMode','phMode','chMode','eMode','rMode'].includes(args[0]))fillMini()};Polivoks.setParam=setParam;
 const filterMini=()=>{let b=E('miniBank').value,t=E('miniType').value,available=presets.filter(q=>b==='all'||q.cat===b);if(t!=='all'&&!available.some(q=>q.type===t))t='all';let i=presets.findIndex(q=>(b==='all'||q.cat===b)&&(t==='all'||q.type===t));E('miniType').value=t;if(i>=0)choosePreset(i,true);else fillMini()};E('miniBank').onchange=filterMini;E('miniType').onchange=filterMini;E('miniPreset').onchange=()=>choosePreset(+E('miniPreset').value,true);
 const stepPreset=dir=>{let i=miniRows.findIndex(r=>r.i===currentPreset);if(miniRows.length)choosePreset(miniRows[(i+dir+miniRows.length)%miniRows.length].i,true)};E('miniPrevious').onclick=()=>stepPreset(-1);E('miniNext').onclick=()=>stepPreset(1);
 E('miniListen').onclick=async()=>{clearTimeout(auditionTimer);for(let n of [48,55,60,64,67])if(keySources.has('memory-'+n))noteOff(n,'memory-'+n);if(!await startAudio())return;let q=presets[currentPreset],notes=q.params.arpMode?[48,55,60]:['Pad','Poly','Strings','Keys'].includes(q.type)?[60,64,67]:[q.type==='Bass'?43:60];for(let n of notes)noteOn(n,.82,'memory-'+n);auditionTimer=setTimeout(()=>{for(let n of notes)noteOff(n,'memory-'+n)},Math.max(1500,Math.min(9000,(.003*(10000/3)**p.aa+1.4)*1000)))};
 let dragging=null;
 window.refreshTapeDecks=()=>{E('synthTempo').disabled=false;E('synthTempo').value=synthTempo;let step=playing?currentPlayStep():cueStep;for(let part of ['note','drum']){let end=part==='note'?noteEnd:drumEnd,range=E(part+'TapeSeek');range.max=Math.max(.125,end);if(dragging!==part){range.value=Math.min(end,step);E(part+'TapeBar').value=+(Math.min(end,step)/16+1).toFixed(3);E(part+'TapeTime').textContent=timeText(secondsBetween(0,Math.min(end,step)))+' / '+timeText(secondsBetween(0,end))}}};
 const seek=(part,value)=>{let end=part==='note'?noteEnd:drumEnd,at=clamp(+value||0,0,Math.max(0,end-.125));if(loopEnabled&&loopManual)at=clamp(at,loopStart,Math.max(loopStart,loopEnd-.125));songMode=true;E('songMode').checked=true;seekTo(at);followPlaybackViews(part);refreshTapeDecks();autoSave()};
 for(let part of ['note','drum']){let range=E(part+'TapeSeek');range.onpointerdown=()=>dragging=part;range.oninput=()=>{dragging=part;E(part+'TapeTime').textContent=timeText(secondsBetween(0,+range.value))+' / '+timeText(secondsBetween(0,part==='note'?noteEnd:drumEnd))};range.onchange=()=>{dragging=null;seek(part,range.value)};range.onpointerup=()=>{dragging=null;refreshTapeDecks()};range.onpointercancel=()=>{dragging=null;refreshTapeDecks()};E(part+'TapeBar').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();seek(part,(+E(part+'TapeBar').value-1)*16)}}}
 for(let b of document.querySelectorAll('[data-tape-skip]'))b.onclick=()=>seek(b.dataset.tapePart,(playing?currentPlayStep():cueStep)+ +b.dataset.tapeSkip);
 for(let b of document.querySelectorAll('[data-tape-home]'))b.onclick=()=>seek(b.dataset.tapePart,loopManual?loopStart:0);
 for(let b of document.querySelectorAll('[data-tape-go]'))b.onclick=()=>seek(b.dataset.tapePart,(+E(b.dataset.tapePart+'TapeBar').value-1)*16);
 E('rollScroll').addEventListener('input',()=>setViewFollow('note',false));
 E('follow').onchange=()=>setViewFollow('note',E('follow').checked);E('noteFollow').onclick=()=>setViewFollow('note',true);E('drumFollowView').onclick=()=>setViewFollow('drum',true);
 E('synthTempo').onchange=()=>setSynthTempo(E('synthTempo').value);E('resetProgram').onclick=()=>choosePreset(currentPreset,true);refreshViewFollow();
 window.addEventListener('formanta-language',()=>{fillMini();refreshTapeDecks()});window.FormantaMemory={refresh:fillMini,get rows(){return miniRows.map(r=>r.i)}};
 fillMini();refreshTapeDecks();resize();
})();
