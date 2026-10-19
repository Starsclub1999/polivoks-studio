'use strict';
// Factory songs are expanded only when loaded. The browser does not allocate
// hundreds of minute-long piano rolls or render their audio in the background.
function songForm(q){let n=q.bars||q.barsCount;let cuts=[0,Math.max(2,Math.round(n*.12)),Math.round(n*.37),Math.round(n*.54),Math.round(n*.65),n-2,n];let names=['ВСТУПЛЕНИЕ','ТЕМА A','ОТВЕТ B','МОСТ','ВОЗВРАТ','КОДА'];return names.map((name,i)=>({name,start:cuts[i]*16,end:cuts[i+1]*16,index:i})).filter(s=>s.end>s.start)}
function scoreSections(q){return songForm(q).map(s=>({name:s.name,start:s.start}))}
function materializeScore(q){
 if(q.events){let bars=Array.from({length:q.bars},()=>[]);for(let n of q.events){let b=Math.floor(n[1]/16);bars[b].push([n[0],n[1]-b*16,n[2],n[3],n[4]||0,1,0])}return{bars,sections:q.sections||[],length:q.length||q.bars*16}}
 if(q.cells)return{bars:q.cells,sections:q.sections||[],length:q.length||q.cells.length*16};
 if(q.rolls)return{bars:q.rolls.map(bar=>bar.map(n=>[n.note,n.start,n.duration,n.vel,n.mode||0,n.prob??1,n.channel??0])),sections:q.sections||[],length:q.timeline?.noteEnd||q.rolls.length*16};
 if(!q.recipe)throw Error('В шаблоне нет нот');
 const baseSpec=SCOREBOOK.spec[q.genre],spec=q.manual?{...baseSpec,motif:q.editedMotif||baseSpec.motif,motifB:q.editedMotif||baseSpec.motifB,progress:q.settings.progression.split(',').map(Number)}:baseSpec,scale=scales[q.settings.scale]||scales.minor,root=+q.settings.root,bpm=+q.settings.bpm,step=60/bpm/4,N=q.bars,end=N*16,bars=Array.from({length:N},()=>[]),role=q.type==='strings'?'pad':['brass','poly'].includes(q.type)?'keys':q.type,variant=q.variant||0;
 const patch=SOUNDBOOK.presets.find(p=>p.id===q.recommendedPatch),p=q.soundParams||patch?.params||defaults,envtime=k=>p.bank6?.003*Math.pow(10000/3,p[k]||0):.003+(p[k]||0)**2*7,attack=envtime('aa'),release=envtime('ar'),forms=songForm(q);
 const add=(note,at,dur,vel=.75,mode=0)=>{if(at<0||at>=end||!Number.isFinite(note)||!Number.isFinite(dur))return;note=Math.round(clamp(note,24,103));let b=Math.floor(at/16);bars[b].push([note,+(at-b*16).toFixed(4),+Math.min(Math.max(.05,dur),end-at).toFixed(4),+clamp(vel,.1,1).toFixed(3),mode,1,0])};
 if(q.manual){let length=Math.round(clamp(+q.settings.motifLen||8,1,32));spec.motif=Array.from({length},(_,i)=>spec.motif[i%spec.motif.length]+(Math.floor(i/spec.motif.length)%2?2:0));spec.motifB=Array.from({length},(_,i)=>spec.motifB[i%spec.motifB.length]+(Math.floor(i/spec.motifB.length)%2?-2:0))}
 const deg=(base,d)=>degreeNote(base,scale,d),tonic=(q.manual?12*(+q.settings.baseOct+1):role==='lead'||role==='bell'?60:48)+root;
 if(q.publicDomain){buildPublicDomain(q,add,end,tonic);return{bars,sections:scoreSections(q),length:end}}
 for(let b=0;b<N;b++){
  let form=forms.find(s=>b*16>=s.start&&b*16<s.end)||forms[0],f=form.index,local=b-form.start/16,answer=(f===2||variant&&b%4>=2),motif=answer?spec.motifB:spec.motif,ch=spec.progress[Math.floor(b/2)%spec.progress.length],chord=spec.harmony[b%4];
  if(q.manual)chord=Array.from({length:+q.settings.voicing||3},(_,j)=>degreeNote(0,scale,ch+j*2));
  let strength=f===0?.63:f===3?.58:f===5?.57:.85,fade=f===5?1-(b-(N-2))*.27:1;
  let pulses=(answer?spec.pulsesB:spec.pulses).slice();if(f===0)pulses=pulses.filter((_,i)=>i%2===0);if(f===3)pulses=pulses.filter((_,i)=>i%3===0);if(f===5)pulses=pulses.filter(t=>t<10);
  if(role==='bass'){
   for(let k=0;k<pulses.length;k++){let t=pulses[k],d=(k%3?0:motif[(k+local+variant)%motif.length])+ch;
    if(['industrial','doom','techno'].includes(q.genre))d=[0,0,1,0,4,0,-1,0][(k+local+variant)%8]+(b%8>=6?1:0);
    if(q.genre==='jazz')d=motif[(k+2*b+variant)%motif.length]+ch;
    if(answer&&k%4===3)d+=scale.length;let gap=k+1<pulses.length?pulses[k+1]-t:16-t,length=Math.min(gap*.72,Math.max(.5,envtime('ad')*.8/step));
    add(deg(tonic,d),b*16+t,Math.max(.18,length),strength*fade*(k%4===0?1.08:.86),['acid','dub','dnb','jungle'].includes(q.genre)&&k%4===3?2:k%4===0?1:0)
   }
  }else if(['lead','arp','pluck','bell'].includes(role)){
   let times=pulses;if(role==='lead')times=times.filter((_,i)=>i%(answer?1:2)===0);if(role==='bell')times=times.filter((_,i)=>i%2===(variant?1:0));if(role==='arp'&&f!==0&&f!==3){let grid=+q.settings.division||4;times=Array.from({length:Math.ceil(16/(4/grid))},(_,i)=>i*4/grid);if(['kaitlyn','idm','random'].includes(q.genre))times=spec.pulses.concat(spec.pulsesB.filter((_,i)=>i%3===0)).filter((t,i,a)=>a.indexOf(t)===i).sort((a,b)=>a-b)}
   for(let k=0;k<times.length;k++){let t=times[k];if(role==='lead'&&b%2===0&&t>12)continue;let d=motif[(k+(b%2?2:0)+variant)%motif.length]+ch;
    if((role==='arp'||role==='pluck')&&(k+b+variant)%3===2)d+=scale.length;if(f===4&&k%5===3)d+=scale.length;if(f===5&&k===times.length-1)d=0;
    if(q.manual&&role==='arp'){let mode=q.settings.arpMode,lim=scale.length*(+q.settings.octaves||1);if(mode==='up')d=k%lim+ch;else if(mode==='down')d=lim-1-k%lim+ch;else if(mode==='pendulum'){let r=Math.max(1,lim-1);d=r-Math.abs(k%(2*r)-r)+ch}else if(mode==='random')d=Math.floor(seeded(+q.settings.compSeed+k+b*173)()*lim)+ch}
    let n=deg(tonic,d);while(n>95)n-=12;let gap=k+1<times.length?times[k+1]-t:16-t,dur=gap*(role==='lead'?.87:.59);
    if(role==='bell')dur=Math.max(1.3,Math.min(6.1,envtime('ad')*.6/step));if(role==='lead')dur=Math.max(attack*1.35/step,Math.min(6.5,dur));
    add(n,b*16+t,dur,strength*fade*(k%3===0?1:.79),role==='arp'&&k%4===0?1:0)
   }
  }else if(role==='pad'||role==='drone'){
   let span=Math.max(role==='drone'?4:2,Math.ceil(attack*1.55/(16*step)));if(local%span||end-b*16<attack/step*1.15)continue;
   let use=role==='drone'?[chord[0]-12,chord[1],chord.at(-1)]:chord;
   use.forEach((n,j)=>add(tonic+n,b*16+(variant?j*.27:0),Math.min(span*16+.75,end-b*16),strength*fade*(.9-j*.13)));
   if(answer&&end-b*16>span*16*.7)add(tonic+use.at(-1)+12,b*16+span*16*.64,span*16*.35,.43*fade)
  }else if(role==='keys'){
   let times=(answer?spec.pulsesB:spec.pulses).filter((_,i)=>i%2===0);if(f===0||f===3)times=times.filter((_,i)=>i%2===0);if(f===5)times=times.filter(t=>t<8);
   for(let k=0;k<times.length;k++){let t=times[k],use=variant?[chord[0]-12,...chord.slice(1)]:chord,gap=k+1<times.length?times[k+1]-t:16-t,dur=Math.max(attack*1.4/step,Math.min(gap*.76,envtime('ad')*.65/step));use.forEach((n,j)=>add(tonic+n,b*16+t+(answer?j*.085:0),dur,strength*fade*(.91-j*.09)))}
  }else if(role==='fx'){
   let span=Math.max(2,Math.ceil((attack*1.6+release*.2)/(16*step)));if(local%span||end-b*16<attack*1.15/step)continue;
   let at=b*16+(variant?2.5:0),dur=Math.max(attack*1.4/step,envtime('ad')*.8/step);add(deg(tonic,motif[(b+variant)%motif.length]),at,dur,strength*fade)
  }else{
   let times=pulses.filter((_,i)=>i%2===(variant?1:0));for(let k=0;k<times.length;k++)add(deg(tonic,motif[(k+b+variant)%motif.length]%scale.length),b*16+times[k],Math.max(.18,(attack+envtime('ad')*.65)/step),strength*fade*(k%3===0?1:.72));
  }
 }
 for(let bar of bars)bar.sort((a,b)=>a[1]-b[1]||a[0]-b[0]);return{bars,sections:scoreSections(q),length:end};
}
function buildPublicDomain(q,add,end,tonic){
 if(q.publicDomain==='joy'){
  // Beethoven, Symphony 9: public-domain melody, original electronic arrangement.
  const pitches=[4,4,5,7,7,5,4,2,0,0,2,4,4,2,2,4,4,5,7,7,5,4,2,0,0,2,4,2,0,0,2,2,4,0,2,4,5,4,0,2,4,5,4,2,0,2,-5,4,4,5,7,7,5,4,2,0,0,2,4,2,0,0];
  const phrase=[...Array(12).fill(4),6,2,8],bridge=[4,4,4,4,4,4,2,2,4,4,4,2,2,4,4,4,8],durations=[...phrase,...phrase,...bridge,...phrase];let time=0,k=0;while(time<end){let n=k%pitches.length,dur=durations[n],register=q.genre==='chip'&&Math.floor(k/16)%2?12:0;add(60+pitches[n]+register,time,dur*.92,.79);if(['soviet','newage'].includes(q.genre)&&n%4===0){let chord=[0,7,12];for(let x of chord)add(36+x+(n%16>=8?7:0),time,Math.min(14,end-time),.44)}time+=dur;k++}
 }else{
  // J.S. Bach, BWV 846, opening harmonic sequence and sixteenth-note figure.
  const chords=[[48,52,55,60,64],[48,50,57,62,65],[47,50,55,62,65],[48,52,55,60,64],[48,52,57,64,69],[48,50,54,57,62],[47,50,55,62,67],[47,48,52,55,60]];
  const order=[0,1,2,3,4,2,3,4,0,1,2,3,4,2,3,4];for(let b=0;b<Math.ceil(end/16);b++){let c=chords[b%8];for(let k=0;k<16;k++)add(c[order[k]]+(q.genre==='scifi'?12:0),b*16+k,.86,.7+(k%8===0?.09:0));if(q.genre==='jazz')add(c[0]-12,b*16,14.8,.42)}
 }
}
const PERC_LANGUAGE={
 modern:[4,[3,11],[6,14],2],soviet:[5,[3,7,11,15],[2,6,10,14],4],industrial:[6,[0,3,6,10,12],[2,5,8,11,15],2],doom:[5,[0,2,3,8,11,14],[1,4,7,10,15],2],goldfrapp:[4,[4,7,12],[3,10,15],2],franz:[3,[2,6,10,14],[3,7,11,15],2],kaitlyn:[5,[0,3,7,10,14],[2,5,9,12],1],cinema:[6,[0,10],[5,13],4],lofi:[5,[1,9],[6,14],2],burzum:[6,[0,12],[3,11],8],dungeon:[5,[2,6,10,14],[3,7,11,15],4],black:[6,[1,10],[4,13],4],legowelt:[3,[2,7,10,14],[3,6,11,15],2],idm:[5,[0,3,5,9,14],[1,4,8,11,15],2],synthwave:[5,[4,11,14],[3,8,13,15],4],chip:[6,[0,7,10,15],[3,6,11,14],2],acid:[3,[2,6,11,14],[1,7,10,15],2],electro:[4,[3,8,14],[2,7,12],2],trip:[5,[2,11],[5,14],2],dub:[4,[4,10],[2,12],2],berlin:[5,[0,3,6,9,12],[2,5,8,11,14],4],horror:[6,[2,13],[5,10],4],newage:[5,[1,8,12],[4,10,15],4],vapor:[4,[5,12],[3,10],4],darkwave:[6,[0,6,12],[3,8,14],2],scifi:[6,[1,7,13],[4,10,15],4],random:[5,[0,2,5,8,12,15],[1,4,7,11,14],2],techno:[5,[0,5,10,15],[2,7,12],2],house:[3,[2,6,10,14],[2,5,10,13],2],dnb:[5,[3,6,11,14],[2,7,10,15],2],jungle:[4,[1,6,9,14],[3,7,10,13,15],2],jazz:[5,[3,10,15],[2,7,13],2],trance:[3,[2,6,10,15],[1,6,9,14],2],ambient:[6,[5,13],[2,10],8]
};
function materializeDrums(q){
 if(q.events){let bars=Array.from({length:q.barsCount},()=>Array.from({length:7},()=>Array(16).fill(0)));for(let h of q.events)bars[Math.floor(h[0]/16)][h[1]][Math.floor(h[0]%16)]=h[2];return{bars,length:q.length||q.barsCount*16,sections:q.sections||[]}}
 if(Array.isArray(q.bars))return{bars:q.bars.map(bar=>bar.map(row=>row.slice())),length:q.bars.length*16,sections:q.sections||[]};
 let base=RHYTHMBOOK.baseGrooves.find(d=>d.id===q.baseId);if(!base)throw Error('Не найден базовый ритм');let n=q.barsCount,forms=songForm(q),result=[];
 const sparse=['burzum','black','ambient','horror','newage','kaitlyn'].includes(q.genre);
 for(let b=0;b<n;b++){
  let f=forms.find(s=>b*16>=s.start&&b*16<s.end)||forms[0],src=base.bars[(b+q.variant)%4],bar=src.map(row=>row.slice());
  // The accompaniment leaves space for the linked instrument, while the
  // genre's authored base groove keeps its kick/snare language.
  const role=q.type,barNo=b+q.variant,put=(track,at,velocity)=>{bar[track][at]=Math.max(bar[track][at],velocity)},thin=(track,keep)=>{bar[track]=bar[track].map((v,k)=>keep(k)?v:0)};
  if(role==='bass'){
   thin(0,k=>k%4===0||k===(barNo%2?10:6));thin(3,k=>k%8===6);if(barNo%4===3)put(1,14,.31);if(!sparse&&barNo%2)put(2,9,.42);
  }else if(role==='lead'){
   if(barNo%2)put(1,11,.28);else put(1,7,.24);thin(4,k=>k===12);if(!sparse)put(3,barNo%2?10:2,.52);
  }else if(role==='arp'){
   thin(0,k=>k===0||k===(barNo%2?9:10));thin(1,k=>k===12);thin(2,k=>k%4===2);thin(3,k=>k===6);if(barNo%4===2)put(5,13,.47);
  }else if(role==='pad'){
   thin(2,k=>k%8===2);thin(3,k=>k===14&&barNo%2);thin(1,k=>k===12&&barNo%2===0);thin(4,k=>k===4&&barNo%4===2);put(5,barNo%2?11:3,.43);if(barNo%4===0)put(6,8,.38);
  }else if(role==='fx'){
   thin(0,k=>k===0&&barNo%2===0);thin(1,k=>k===12&&barNo%4===3);bar[2].fill(0);bar[3].fill(0);bar[4].fill(0);put(5,barNo%4===3?15:7,.49);put(6,barNo%2?13:1,.42);
  }else if(role==='bell'){
   thin(2,k=>k%4===0);thin(3,k=>k===6);thin(4,k=>k===4&&barNo%2);for(let k of (barNo%2?[3,9]:[5,11]))put(5,k,.4);if(barNo%4===1)put(6,14,.44);
  }else if(role==='keys'){
   thin(0,k=>k!==8);put(0,barNo%2?11:7,.64);thin(4,k=>k===12);thin(6,k=>k===0&&barNo%4===0);if(!sparse){put(2,barNo%2?5:13,.34);put(1,15,.21)}
  }else if(role==='pluck'){
   thin(1,k=>k%8===4);thin(3,k=>k===14);put(4,barNo%2?10:2,.51);if(barNo%2===0)put(5,9,.45);thin(6,k=>k===0&&barNo%4===3);
  }else if(role==='drone'){
   bar=bar.map(()=>Array(16).fill(0));if(barNo%4===0){put(0,0,.72);put(0,3,.44)}if(barNo%4===2)put(5,6,.48);if(barNo%8===7){put(6,12,.43);put(5,14,.39)}
  }else if(role==='amp'){
   thin(2,k=>k%8===6);thin(3,k=>k===2&&barNo%2);thin(5,k=>k%4===1);put(4,barNo%2?13:5,.52);if(barNo%4===1)put(0,15,.62);if(!sparse)put(6,barNo%2?7:11,.4);
  }
  const lang=PERC_LANGUAGE[q.genre];if(lang&&b%lang[3]===(q.variant?1:0)){let pulses=lang[q.variant?2:1];if(['drone','fx','pad'].includes(role))pulses=pulses.filter((_,i)=>i%2===0);for(let k of pulses)put(lang[0],k,sparse?.31:.43)}
  if(q.publicDomain==='joy'){bar[5].fill(0);bar[6].fill(0);put(0,0,.82);put(1,4,.61);put(1,12,.67);if(b%4===3){put(5,14,.5);put(5,15,.61)}}
  if(q.publicDomain==='bach'){bar[3].fill(0);bar[4].fill(0);thin(1,k=>k===12&&b%2);put(5,b%2?10:2,.41);if(b%4===3)put(6,15,.33)}
  if(f.index===0){bar=bar.map((row,j)=>row.map((v,k)=>j===0?(k%8===0?v:0):j===2?(k%4===0?v*.6:0):j===6&&b%2===0?v*.4:0))}
  if(f.index===2){if(!sparse){bar[0][q.variant?11:7]=.71;bar[1][b%2?15:3]=.23;bar[3][b%2?14:6]=.61}else{bar[5][b%2?13:5]=.48;bar[6][10]=.36}}
  if(f.index===3){bar=bar.map((row,j)=>row.map((v,k)=>j===0&&k%8===0?v*.6:j===5?v*.55:j===6&&k%4===2?v*.5:0));if(b%2===0)bar[6][0]=.36}
  if(f.index===4){if(!sparse){bar[4][12]=Math.max(bar[4][12],.58);if(b%2)bar[2][15]=.37}else bar[6][q.variant?7:11]=.4}
  if(f.index===5){let factor=b===n-1?.45:.72;bar=bar.map((row,j)=>row.map((v,k)=>b===n-1&&k>=10?0:v*factor))}
  const next=forms.find(s=>s.start===(b+1)*16);if((next&&b>1||b%8===7)&&f.index!==5){let fill=sparse?[10,14]:q.variant?[11,13,14,15]:[12,14,15];fill.forEach((k,i)=>bar[5][k]=.5+i*.09);if(!sparse)bar[1][15]=.56}
  if(b===n-1){bar[0][0]=.72;bar[6][0]=sparse?.43:.66}
  result.push(bar.map(row=>row.map(v=>+clamp(v).toFixed(3))));
 }
 return{bars:result,length:n*16,sections:scoreSections(q)};
}
