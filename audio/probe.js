import {SynthEngine} from './dsp.js?v=7.0.0';
import {warmEngine} from './warmup.js?v=7.0.0';
onmessage=e=>{try{
 const {sr,state}=e.data;warmEngine(sr,state);
 const p={...state.p,voices:4,unison:1,arpMode:0,bank6:1,bank7:1,phMode:3,chMode:1,eMode:3,rMode:5,aa:.01,as:.8,ar:.1,noise:.04,res:.7,xPhase:.14,xRing:.1,xChorus:.25,xPwm:.18};
 const eng=new SynthEngine(sr,p,state.fx);eng.extended=true;eng.on(48,.8);
 const l=new Float32Array(128),r=new Float32Array(128),times=[];
 for(let i=0;i<360;i++){if(i%48===0){eng.on(36+i%24,.8);for(let j=0;j<7;j++)eng.drum(j,.7)}let t=performance.now();eng.process(l,r);if(i>80)times.push(performance.now()-t)}
 times.sort((a,b)=>a-b);let mean=times.reduce((a,b)=>a+b,0)/times.length,budget=128/sr*1000;
 postMessage({type:'result',mean,p95:times[Math.floor(times.length*.95)],p99:times[Math.floor(times.length*.99)],worst:times[times.length-1],budget,voices:16,sampleRate:sr});close();
}catch(err){postMessage({type:'error',message:err.message});close()}};
