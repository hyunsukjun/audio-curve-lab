// Display-only spectral centroid. Never used by Preview/Render.
export function centroid(samples, offset, size, rate) {
  const re=new Float64Array(size),im=new Float64Array(size);
  for(let i=0;i<size;i++)re[i]=samples[offset+i]*(.5-.5*Math.cos(2*Math.PI*i/(size-1)));
  for(let i=1,j=0;i<size;i++){let bit=size>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j)[re[i],re[j]]=[re[j],re[i]];}
  for(let len=2;len<=size;len<<=1){const a=-2*Math.PI/len,cr=Math.cos(a),ci=Math.sin(a);for(let i=0;i<size;i+=len){let wr=1,wi=0;for(let j=0;j<len/2;j++){const u=i+j,v=u+len/2,tr=wr*re[v]-wi*im[v],ti=wr*im[v]+wi*re[v];re[v]=re[u]-tr;im[v]=im[u]-ti;re[u]+=tr;im[u]+=ti;const nr=wr*cr-wi*ci;wi=wr*ci+wi*cr;wr=nr;}}}
  let sum=0,weighted=0;for(let i=1;i<=size/2;i++){const m=Math.hypot(re[i],im[i]);sum+=m;weighted+=m*i*rate/size;}
  return sum>1e-5?weighted/sum:0;
}
if(typeof self!=='undefined' && typeof self.postMessage==='function')self.onmessage=({data})=>{
  const {lanes,size,count,rate}=data;
  const result=lanes.map(samples=>{const out=new Float32Array(count);for(let i=0;i<count;i++)out[i]=centroid(samples,i*size,size,rate);return out;});
  self.postMessage(result,result.map(a=>a.buffer));
};
