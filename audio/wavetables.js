// Reconstructed from the supplied initialization equations, not sampled audio.
// 33 bands / 8000 phase samples, f64; generated once outside process().
export const TABLE_SIZE=8000;
const H=[338,283,238,201,169,142,119,100,84,70,59,50,42,35,29,25,20,16,13,12,10,8,6,5,5,4,3,2,2,1,1,1,1];
export const NATIVE_TABLES=new Float64Array(33*8000*2);
const sine=new Float64Array(8000),ramp=new Float64Array(8000),tri=new Float64Array(8000);
for(let i=0;i<8000;i++)sine[i]=Math.sin(2*Math.PI*i/8000);
for(let h=1;h<=338;h++){
 const odd=h&1,sign=((h-1)/2)&1?-1:1;
 for(let i=0,j=0;i<8000;i++,j=(j+h)%8000){const v=sine[j];ramp[i]+=v/h;if(odd)tri[i]+=sign*v/(h*h)}
 for(let b=0;b<33;b++)if(H[b]===h){NATIVE_TABLES.set(ramp,b*8000);NATIVE_TABLES.set(tri,(33+b)*8000)}
}
export const PITCH_TABLE=new Float64Array(2400);
for(let i=0;i<2400;i++)PITCH_TABLE[i]=2**(i/2400);
export const TANH_TABLE=new Float64Array(32769);
for(let i=0;i<=32768;i++)TANH_TABLE[i]=Math.tanh(i*24/32768-12);
