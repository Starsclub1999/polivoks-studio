// Display-only conditioning; does not modify sound or audio gain.
const FormantaScope={peak:.01,dc:0,start:0,scale:1,
 prepare(data,requested,sync){let sum=0,peak=0;for(let i=0;i<data.length;i++){let v=Number.isFinite(data[i])?data[i]:0;sum+=v}let dc=sum/data.length;this.dc=dc;for(let i=0;i<data.length;i++)peak=Math.max(peak,Math.abs((Number.isFinite(data[i])?data[i]:0)-dc));this.peak=Math.max(peak,this.peak*.94,.0001);this.scale=1/Math.max(1,this.peak*1.15);let len=Math.min(data.length-1,Math.round(requested)),limit=Math.max(0,data.length-len-1),start=0;
 if(sync&&peak>.0005){let armed=false,threshold=peak*.12;for(let i=1;i<=Math.min(limit,1536);i++){let v=data[i]-dc;if(v<-threshold)armed=true;if(armed&&data[i-1]<=dc&&v>0){start=i;break}}}this.start=start;return{start,len,dc,scale:this.scale,peak}}
};
