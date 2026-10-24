// Validate every bundled MIDI, source hash, default part and program reference.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),c={MAX_STEPS:0xffffffff*16,MAX_EVENTS:2000000,clamp:(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),TextDecoder,Uint8Array,DataView,console,Map,Set,Math};
vm.createContext(c);
for(let [f,key]of [['scorebook','SCOREBOOK'],['rhythmbook','RHYTHMBOOK'],['soundbook','SOUNDBOOK']])vm.runInContext(fs.readFileSync(new URL('js/'+f+'.js',root),'utf8')+';globalThis.'+key+'='+key,c);
vm.runInContext(fs.readFileSync(new URL('js/midi.js',root),'utf8').split('function gmDrumIndex')[0],c);
const scores=c.SCOREBOOK.presets,drums=c.RHYTHMBOOK.presets,patches=c.SOUNDBOOK.presets;
const ids=new Set,hashes=new Set;let melodic=0,hits=0,totalDuration=0,maxSeconds=0,paired=0,parts=0;
for(let q of scores){
 assert.ok(!ids.has(q.id),q.id);ids.add(q.id);
 let raw=fs.readFileSync(new URL(q.midiFile,root)),hash=createHash('sha256').update(raw).digest('hex');
 assert.equal(hash,q.sourceInfo.sha256,q.name);assert.ok(!hashes.has(hash),'duplicate MIDI bytes: '+q.name);hashes.add(hash);
 let data=c.parseMidi(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
 assert.ok(data.notes.length>0,q.name);assert.ok(q.defaultPart==='all'||data.notes.some(n=>n.track===q.defaultPart),q.name+' selected part');
 assert.ok(q.defaultPart==='all'||q.parts.some(n=>n.track===q.defaultPart),q.name+' part metadata');
 assert.ok(patches.some(p=>p.id===q.recommendedPatch),q.name+' sound');
 assert.ok(c.SCOREBOOK.genres.some(g=>g.id===q.genre),q.name+' genre');
 let seconds=0,last=0,bpm=data.bpm;
 for(let t of data.tempoMap){seconds+=(t.step-last)*60/bpm/4;last=t.step;bpm=t.bpm}
 seconds+=(data.endSteps-last)*60/bpm/4;
 assert.ok(Math.abs(data.endSteps-q.length)<.02,q.name+' length');
 assert.ok(Math.abs(seconds-q.duration)<.3,q.name+' duration');
 if(q.recommendedDrums){let pair=drums.find(d=>d.id===q.recommendedDrums);assert.ok(pair,q.name+' paired rhythm');assert.equal(pair.scoreId,q.id);assert.equal(pair.midiFile,q.midiFile);assert.ok(data.drums.length>0);assert.ok(c.RHYTHMBOOK.kits.some(k=>k.id===pair.recommendedKit));paired++}
 for(let n of [...data.notes,...data.drums]){assert.ok(n.duration>0&&Number.isFinite(n.start)&&n.vel>0&&n.vel<=1);assert.ok(n.note>=0&&n.note<=127)}
 melodic+=data.notes.length;hits+=data.drums.length;totalDuration+=seconds;maxSeconds=Math.max(maxSeconds,seconds);parts+=q.parts.length;
}
assert.equal(paired,drums.length,'Every bundled factory rhythm belongs to an actual source score');
const report={version:'8.2.0',passed:true,compositions:scores.length,uniqueSourceMidi:hashes.size,genreFolders:new Set(scores.map(q=>q.genre)).size,pairedSourceDrumPatterns:paired,soundKits:c.RHYTHMBOOK.kits.length,melodicNotes:melodic,drumHits:hits,selectableMelodicParts:parts,repertoireSeconds:totalDuration,longestSeconds:maxSeconds,allSourceHashesMatch:true,allDefaultPartsContainNotes:true,allSourceProgramReferencesExist:true,allDurationsRetained:true};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
