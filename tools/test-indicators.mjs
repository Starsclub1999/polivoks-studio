// Audio-clock regression checks for the source-derived panel indicators.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {SynthEngine} from '../audio/dsp.js';
import {FXRack} from '../audio/fx-rack.js';
const root=new URL('../',import.meta.url),c={};
for(const [f,key]of [['panel-schema','PANEL_SCHEMA'],['panel-leds','FormantaLED'],['soundbook','SOUNDBOOK']])vm.runInNewContext(fs.readFileSync(new URL('js/'+f+'.js',root),'utf8')+';this.'+key+'='+key,c);
const base=Object.fromEntries(c.PANEL_SCHEMA.map(d=>[d.id,d.value]));
const patch=c.SOUNDBOOK.presets.find(q=>q.originalName==='Pure & Simple');
const p={...base,...patch.params,mainOn:1,arpMode:0,phMode:0,chMode:0,eMode:0,rMode:0};
const fx={master:.7,bpm:120,drumVolume:.7,kit:{},drumTracks:[]};
const l=new Float32Array(128),r=new Float32Array(128),e=new SynthEngine(48000,p,fx);
e.msg({type:'params',p,fx,extended:true,wheel:0});
e.drum(0,.9);e.process(l,r);let drum=e.telemetry();
assert.equal(drum.synthPeak,0,'The Polivoks meter must exclude the independent drum machine');
assert.ok(l.some(v=>Math.abs(v)>1e-7),'The drum-only fixture must actually produce sound');
assert.equal(drum.at,128/48000);
e.on(60,.9);for(let i=0;i<120;i++)e.process(l,r);
let tone=e.telemetry();assert.ok(tone.synthPeak>0);assert.equal(e.telemetry().synthPeak,0,'Window peaks are cleared on publication');
assert.equal(tone.at,e.frame/48000);
for(let [k,v]of Object.entries(tone))if(typeof v==='number')assert.ok(Number.isFinite(v),k);
for(let k of ['mainPhase','fxPhase','arpPhase'])assert.ok(tone[k]>=0&&tone[k]<1,k);

// Bypassed effects retain the source FX modulator clock, including silent input.
for(let sr of [44100,48000,96000]){
 let rack=new FXRack(sr);rack.update({...p,fxSync:0,fxRate:.25},120,0);
 for(let i=0;i<2048;i++)rack.process(0,0);
 let expected=(2048*rack.fxHz/sr)%1;
 assert.ok(Math.abs(rack.phase-expected)<1e-10);
 assert.equal(rack.phPhase,0);assert.equal(rack.chPhase,0);assert.equal(rack.echoTimePhase,0);
 // With no modulation/spread the independent echo-time lamp completes one
 // cycle per actual left delay, independent of its modulation oscillator.
 rack.update({...p,eMode:1,eTime:.5,eDepth:0,eMod:.5,eSpread:0},120,0);
 rack.eDelay=rack.eTime;let start=rack.echoTimePhase;
 for(let i=0;i<2048;i++)rack.process(0,0);
 assert.ok(Math.abs(rack.echoTimePhase-(start+2048/rack.eTime)%1)<1e-10);
}
for(let x of [0,.125,.25,.5,.75,1,2,8]){
 let y=x<=1?2*x-x*x:2*(1/x)-(1/x)**2;
 let expected=x<=1?y*(.775+.225*y):2-y*(.775+.225*y);
 assert.ok(Math.abs(c.FormantaLED.curve(x)-expected)<1e-13);
}
const report={version:'8.2.0',passed:true,synthOnlyPeak:true,windowPeakReset:true,renderFrameTimestamps:true,bypassedFxClockSampleRates:[44100,48000,96000],echoLampActualDelay:true,nativeMeterTransferFunction:true,scope:'Node DSP checks; no browser audio output or native A/B'};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
