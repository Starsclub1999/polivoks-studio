/* FORMANTA 8: f64 port of verified oscillator/filter equations.
 * Research identifiers and remaining differences: NATIVE_AUDIT.md.
 * Fixed allocation; no imports, allocation, decoding or memory growth in render.
 */
typedef unsigned int u32;
typedef unsigned long long u64;
static double mem[8192] __attribute__((aligned(16)));
static double tables[528000],pitch[2400],tanh_table[32769];
static inline double clip(double x,double a,double b){return __builtin_fmin(b,__builtin_fmax(a,x));}
static inline double absd(double x){return __builtin_fabs(x);}
static inline double pow2i(int n){union{u64 u;double d;}v;v.u=(u64)(n+1023)<<52;return v.d;}
static inline double pow2(double x){int n=(int)__builtin_floor(x);double a=(x-n)*.6931471805599453;return pow2i(n)*(1+a*(1+a*(.5+a*(.16666666666666666+a*(.041666666666666664+a*(.008333333333333333+a*(.001388888888888889+a*(.0001984126984126984+a*(.0000248015873015873+a*(.0000027557319223985893+a*.0000002755731922398589))))))))));}
static inline double shape(double x){if(x<=-12)return-1;if(x>=12)return 1;double f=(x+12)*(32768./24.);int i=(int)f;return tanh_table[i]+(tanh_table[i+1]-tanh_table[i])*(f-i);}
u32 get_memory_base(void){return(u32)(unsigned long)mem;}
u32 get_table_base(void){return(u32)(unsigned long)tables;}
u32 get_pitch_base(void){return(u32)(unsigned long)pitch;}
u32 get_tanh_base(void){return(u32)(unsigned long)tanh_table;}
static inline double cascade(double x,double *z){double *c=mem+6144+32;for(int j=0;j<4;j++){double *a=c+5*j,*s=z+2*j,y=a[0]*x+s[0];s[0]=s[1]-a[3]*y+a[1]*x;s[1]=a[2]*x-a[4]*y;x=y;}return x;}
double filter4(int slot,double cv,double resonance,double starve,double ampDrive,int mode){
 double *s=mem+16+slot*80,*q=mem+6144;int os=(int)q[13];double f=6114.649728/(q[0]*os)*pow2(clip(cv,-6,4.5)),slew=f*(.5-.47*starve)*8,feedback=resonance<.9?.8-.7375*resonance/.9:.0625-.1225*(resonance-.9)/.1,gain=.3+2.5*ampDrive*ampDrive,b=s[0],l=s[1],out=0;
 for(int i=0;i<os;i++){l=clip(l+clip(f*b,-slew,slew),-5,3.5);double up=cascade(i==0?mem[0]*os:0,s+2),h=up-b*feedback-l;b=clip(b+clip(f*h,-slew,slew),-5,3.5);double m=mode==0?l:mode==1?b:mode==2?h:mode==3?l+h:l-h;out=cascade(shape(m*gain),s+10);}
 s[0]=b;s[1]=l;return 5*out;
}
static inline double ramp_at(double phase,double p,int band,double weight){int i=(int)(phase*8000);double analytic=(phase-.5)*-3.25;if(p<=-.25)return analytic;double a=p>0?tables[band*8000+i]:analytic,b=p>0?tables[(band<32?band+1:32)*8000+i]:tables[i];return a+(b-a)*weight;}
static inline double osc(double *s,int which,double cv,int type,double pwm,double phaseMod){
 const double duty1[5]={.5,.5,.428,.196,.073},duty2[5]={.5,.5,.447,.204,.055};
 double p=clip(cv-1.842,-20.99,8.95),base=__builtin_floor(p),frac=p-base,part=frac*4,weight=part-(int)part;int band=(int)base*4;if(band<0)band=0;band+=(int)part;if(band>32)band=32;
 double freq=clip(58.59375*pow2i((int)base)*pitch[(int)(frac*2400)],0,22000),phase=s[34+which],dt=freq/mem[6144];if(type==0)dt*=phase<.5?1.015:.9854368932038836;phase+=dt;phase-=__builtin_floor(phase);s[34+which]=phase;double t=phase+phaseMod;t-=__builtin_floor(t);double r=ramp_at(t,p,band,weight),old=s[37+which];s[37+which]=r;
 if(type==1)return-4.6*r;
 if(type==0){double t2=t+.75;t2-=__builtin_floor(t2);double analytic=(t2<.5?4*t2-1:3-4*t2)*1.3333333333333333,tri=analytic;if(p>-.25){int i=(int)(t2*8000);double a=p>0?tables[(33+band)*8000+i]:analytic,b=p>0?tables[(33+(band<32?band+1:32))*8000+i]:tables[33*8000+i];tri=a+(b-a)*weight;}return 4.5*tri+.8*(r-old);}
 double duty=clip((which?duty2[type]:duty1[type])+pwm,.005,.995),t2=t+duty;t2-=__builtin_floor(t2);return-4.8*(ramp_at(t2,p,band,weight)-r-(1.6-3.2*duty));
}
double synth4(int slot,double cv,double resonance,double starve,double ampDrive,int mode,double pitch1,double pitch2,double fade,int old1,int old2,double lf,double ev,double external){
 double *s=mem+16+slot*80,*q=mem+6144;int w1=(int)q[1],w2=(int)q[2];double o2=osc(s,1,pitch2,w2,0,0),o1=osc(s,0,pitch1+o2*q[3]*.4,w1,q[8]*lf*.22,q[7]?o2*q[7]*.08*(.12+.88*ev):0),noise=0;u32 seed=(u32)s[36];
 if(q[6]){seed=seed*214013u+2531011u;double a=(double)(seed>>16)/65536.;seed=seed*214013u+2531011u;noise=(a-(double)(seed>>16)/65536.)*10*q[6];s[36]=seed;}
 double mix=(o1*q[4]+o2*q[5])*(1-q[9])+o1*o2*q[9]*.2+noise+external,x=mix*(q[10]+.3),hp=x-s[39];s[39]+=hp*q[20];mem[0]=hp;
 return filter4(slot,cv,resonance,starve,ampDrive,mode);
}
