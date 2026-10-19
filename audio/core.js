import {CORE_BYTES} from './core-bytes.js?v=7.0.0';
let compiled=null;try{compiled=new WebAssembly.Module(CORE_BYTES)}catch{}
const C=(x,a,b)=>Math.max(a,Math.min(b,x));
const soft=(x,r)=>{let z=C(x/r,-3,3),z2=z*z;return r*z*(27+z2)/(27+9*z2)};
const ca=[.036681502163648,.2746317593794541,.5610989697879195,.769741833862266],cb=[.1365476246319577,.42313861743656667,.6775400499741616,.839889624849638];
const derivative=(x,r)=>{let z=C(x/r,-3,3),z2=z*z,a=z2-9;return a*a/(9*(z2+3)*(z2+3))};
// Numerically identical fallback, used when the browser has no WebAssembly.
function fallbackFilter(data,slot,g,k,starve,drive,mode){let ptr=16+slot*32,ic1=data[ptr],ic2=data[ptr+1],sag=data[ptr+2],res=Math.max(0,2-k),nom=3.6/(1+starve*4.6+res*res*(drive-.5)**2*(.8+.6*drive)*.9),sum=0;
 for(let i=0;i<4;i++){let x=data[i],load=Math.abs(ic1)+.55*Math.abs(ic2);sag+=(load*(starve+.3*res)-sag)*.002;let rail=nom/(1+sag*.28),invRail=1/rail,v=(ic1+g*(x-ic2))/(1+g*(k+g)),bp=0,lp=0;
  for(let j=0;j<5;j++){let z=C(v*invRail,-3,3),z2=z*z,den=1/(27+9*z2),zd=z2-9;bp=rail*z*(27+z2)*den;let db=9*(zd*zd)*den*den;lp=ic2+g*bp;let a=x-k*v-lp;z=C(a*invRail,-3,3);z2=z*z;den=1/(27+9*z2);zd=z2-9;let sa=rail*z*(27+z2)*den,da=9*(zd*zd)*den*den,f=v-ic1-g*sa,df=1+g*da*(k+g*db);if(Math.abs(f)<1e-11)break;v-=f/Math.max(.16,df)}
  bp=v;lp=ic2+g*soft(bp,rail);ic1=C(2*bp-ic1,-rail*1.12,rail*1.12);ic2=C(2*lp-ic2,-rail*1.08,rail*1.08);let hp=x-k*bp-lp;data[4+i]=mode===0?lp:mode===1?bp:mode===2?hp:mode===3?hp+lp:x+1.4*bp;
 }data[ptr]=ic1;data[ptr+1]=ic2;data[ptr+2]=sag;for(let pair=0;pair<2;pair++){let a=data[4+pair*2],b=data[5+pair*2];for(let j=0;j<4;j++){let za=ptr+4+j*2,zb=ptr+5+j*2,ya=ca[j]*a+data[za],yb=cb[j]*b+data[zb];data[za]=a-ca[j]*ya;data[zb]=b-cb[j]*yb;a=ya;b=yb}data[4+pair]=(a+b)*.5}let a=data[4],b=data[5];for(let j=0;j<4;j++){let za=ptr+12+j*2,zb=ptr+13+j*2,ya=ca[j]*a+data[za],yb=cb[j]*b+data[zb];data[za]=a-ca[j]*ya;data[zb]=b-cb[j]*yb;a=ya;b=yb}return(a+b)*.5;
}
export function createCore(useWasm=true){let inst=compiled&&useWasm?new WebAssembly.Instance(compiled):null,data=inst?new Float64Array(inst.exports.memory.buffer,inst.exports.get_memory_base(),8192):new Float64Array(8192),slots=new Uint8Array(64);return{data,technology:inst?'WASM SIMD f64 ZDF 4×':'JS f64 ZDF 4×',synth:inst?.exports.synth4,allocate(a=0,b=0){let slot=slots.indexOf(0);if(slot<0)return-1;slots[slot]=1;data.fill(0,16+slot*32,48+slot*32);data[16+slot*32+21]=.31;data[16+slot*32+22]=((slot+1)*2654435761)>>>0;data[16+slot*32]=a;data[17+slot*32]=b;return slot},free(slot){if(slot>=0)slots[slot]=0},seed(slot,a,b){data[16+slot*32]=a;data[17+slot*32]=b},filter:inst?inst.exports.filter4:(...args)=>fallbackFilter(data,...args)}}
