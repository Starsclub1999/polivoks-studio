/* FORMANTA 7 — independent f64 programmable-op-amp model.
 * 4x oscillators, convergence-controlled implicit Newton solve, two IIR halfband stages.
 * No native-plugin code, assets or third-party synthesizer code is used here.
 */
typedef unsigned int u32;
typedef double v2d __attribute__((vector_size(16)));
static double mem[8192] __attribute__((aligned(16)));
static inline double absd(double x){return __builtin_fabs(x);}
static inline double clip(double x,double a,double b){return __builtin_fmin(b,__builtin_fmax(a,x));}
static inline double soft(double x,double rail){double z=clip(x/rail,-3,3),z2=z*z;return rail*z*(27+z2)/(27+9*z2);}
static const double ca[4]={.036681502163648,.2746317593794541,.5610989697879195,.769741833862266};
static const double cb[4]={.1365476246319577,.42313861743656667,.6775400499741616,.839889624849638};
static inline double halfband(double a,double b,double *state){
 v2d x={a,b};
 for(int j=0;j<4;j++){v2d c={ca[j],cb[j]},z=*(v2d*)(state+j*2),y=c*x+z;*(v2d*)(state+j*2)=x-c*y;x=y;}
 return .5*(x[0]+x[1]);
}
unsigned int get_memory_base(void){return (unsigned int)(unsigned long)mem;}
double filter4(int slot,double g,double k,double starve,double drive,int mode){
 double *p=mem+16+slot*32,ic1=p[0],ic2=p[1],sag=p[2],res=__builtin_fmax(0,2-k),nom=3.6/(1+starve*4.6+res*res*(drive-.5)*(drive-.5)*(.8+.6*drive)*.9),out[4];
 for(int i=0;i<4;i++){
  double x=mem[i],load=absd(ic1)+.55*absd(ic2);sag+=(load*(starve+.3*res)-sag)*.002;
  double rail=nom/(1+sag*.28),invRail=1/rail,v=(ic1+g*(x-ic2))/(1+g*(k+g)),bp=0,lp=0;
  for(int j=0;j<5;j++){
   double z=clip(v*invRail,-3,3),z2=z*z,den=1/(27+9*z2),zd=z2-9;
   bp=rail*z*(27+z2)*den;double db=9*(zd*zd)*den*den;
   lp=ic2+g*bp;double a=x-k*v-lp;
   z=clip(a*invRail,-3,3);z2=z*z;den=1/(27+9*z2);zd=z2-9;
   double sa=rail*z*(27+z2)*den,da=9*(zd*zd)*den*den,f=v-ic1-g*sa,df=1+g*da*(k+g*db);if(absd(f)<1e-11)break;v-=f/__builtin_fmax(.16,df);
  }
  bp=v;lp=ic2+g*soft(bp,rail);ic1=clip(2*bp-ic1,-rail*1.12,rail*1.12);ic2=clip(2*lp-ic2,-rail*1.08,rail*1.08);
  double hp=x-k*bp-lp;out[i]=mode==0?lp:mode==1?bp:mode==2?hp:mode==3?hp+lp:x+1.4*bp;
 }
 p[0]=ic1;p[1]=ic2;p[2]=sag;
 double a=halfband(out[0],out[1],p+4),b=halfband(out[2],out[3],p+4);
 return halfband(a,b,p+12);
}
static inline double blep(double t,double dt){if(t<dt){t/=dt;return t+t-t*t-1;}if(t>1-dt){t=(t-1)/dt;return t*t+t+t+1;}return 0;}
static inline double wave(double t,double dt,int type,double pwm){if(type==0)return 1-4*absd(t-.5);if(type==1)return 2*t-1-blep(t,dt);double duty=clip((type==2?.5:type==3?.25:.125)+pwm,.045,.955),shift=t-duty;if(shift<0)shift+=1;return(t<duty?1:-1)+blep(t,dt)-blep(shift,dt);}
// Parameters at mem[4096..] are published once per render block by the engine.
double synth4(int slot,double g,double k,double starve,double drive,int mode,double f,double f2,double fade,int old1,int old2,double lf,double ev,double external){
 double *p=mem+16+slot*32,*q=mem+4096,ph1=p[20],ph2=p[21],den=q[0]*4;
 int w1=(int)q[1],w2=(int)q[2];double fm=q[3],mix1=q[4],mix2=q[5],noise=q[6],phaseDepth=q[7],pwm=q[8]*lf*.22,ring=q[9],d2=clip(f2/den,.0000001,.45);u32 seed=(u32)p[22];
 for(int i=0;i<4;i++){
  ph2+=d2;if(ph2>=1)ph2-=1;double o2=wave(ph2,d2,w2,0);if(fade<1)o2=o2*fade+wave(ph2,d2,old2,0)*(1-fade);
  double signedDt=clip(f*(1+o2*fm*3)/den,-.45,.45),d1=__builtin_fmax(.0000001,absd(signedDt));ph1+=signedDt;if(ph1>=1)ph1-=1;if(ph1<0)ph1+=1;
  double phase=ph1+(phaseDepth?o2*phaseDepth*.6*(.12+.88*ev):0);phase-=__builtin_floor(phase);
  double o1=wave(phase,d1,w1,pwm);if(fade<1)o1=o1*fade+wave(phase,d1,old1,pwm)*(1-fade);
  double n=0;if(noise){seed^=seed<<13;seed^=seed>>17;seed^=seed<<5;n=((double)seed/2147483648.-1)*noise;}
  mem[i]=((o1*mix1+o2*mix2)*(1-ring)+o1*o2*ring*1.35+n+external)*.9;
 }
 p[20]=ph1;p[21]=ph2;p[22]=(double)seed;
 return filter4(slot,g,k,starve,drive,mode);
}
