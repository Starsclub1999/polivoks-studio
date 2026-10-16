import {SynthEngine} from './dsp.js?v=4.0.0';
import {warmEngine} from './warmup.js?v=4.0.0';
class PVDirect extends AudioWorkletProcessor{
 constructor(options){
  super();const state=options.processorOptions.state;warmEngine(sampleRate,state);
  this.eng=new SynthEngine(sampleRate,state.p,state.fx);this.eng.msg(state);this.eng.frame=currentFrame;
  this.capL=new Float32Array(8192);this.capR=new Float32Array(8192);this.capPos=0;this.nextMeter=0;
  this.port.onmessage=e=>{let m=e.data;if(m.type==='record'&&!m.on)this.flush();if(m.type==='resetMeters')this.eng.stats.late=0;else this.eng.msg(m)};
  this.port.postMessage({type:'primed'});
 }
 flush(){if(!this.capPos)return;let l=this.capL.slice(0,this.capPos),r=this.capR.slice(0,this.capPos);this.port.postMessage({type:'pcm',chunks:[[l,r]]},[l.buffer,r.buffer]);this.capPos=0}
 process(inputs,outputs){
  let out=outputs[0];this.eng.frame=currentFrame;this.eng.process(out[0],out[1]||out[0],inputs[0]&&inputs[0][0]);
  if(this.eng.record){for(let i=0;i<out[0].length;i++){this.capL[this.capPos]=out[0][i];this.capR[this.capPos++]=(out[1]||out[0])[i];if(this.capPos===8192){let l=this.capL,r=this.capR;this.port.postMessage({type:'pcm',chunks:[[l,r]]},[l.buffer,r.buffer]);this.capL=new Float32Array(8192);this.capR=new Float32Array(8192);this.capPos=0}}}
  if(currentFrame>=this.nextMeter){this.nextMeter=currentFrame+sampleRate/5;this.port.postMessage({type:'meter',peak:this.eng.peak,voices:this.eng.v.length,late:this.eng.stats.late,quantum:out[0].length})}
  return true;
 }
}
registerProcessor('pv-direct',PVDirect);
