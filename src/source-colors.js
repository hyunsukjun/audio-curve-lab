// Bounded visual sample: at most 1024 windows × 1024 samples × two lanes (8 MiB).
// Copy only these windows. Never transfer or change the audio buffer itself.
let worker=null;
export function analyzeSourceColors(buffer,done) {
  worker?.terminate();worker=null;
  if(!buffer)return;
  const size=1024,count=Math.max(1,Math.min(1024,Math.ceil(buffer.length/size)));
  const lanes=[];
  for(let c=0;c<Math.min(2,buffer.numberOfChannels);c++){
    const source=buffer.getChannelData(c),out=new Float32Array(count*size);
    for(let i=0;i<count;i++){
      const start=Math.max(0,Math.min(Math.max(0,source.length-size),Math.round((i+.5)*source.length/count-size/2)));
      out.set(source.subarray(start,Math.min(start+size,source.length)),i*size);
    }
    lanes.push(out);
  }
  try {
    const job=new Worker(new URL('./source-color-worker.js',import.meta.url),{type:'module'});worker=job;
    job.onmessage=({data})=>{if(worker!==job)return;job.terminate();worker=null;done(data);};
    job.onerror=()=>{job.terminate();if(worker===job)worker=null;};
    job.postMessage({lanes,size,count,rate:buffer.sampleRate},lanes.map(a=>a.buffer));
  }catch{worker?.terminate();worker=null;} // Single-color fallback preserves editing.
}
export function toneColor(hz){
  if(!(hz>0))return '#8399ac';
  const t=Math.max(0,Math.min(1,Math.log2(hz/150)/Math.log2(8000/150)));
  const stops=[[103,178,239],[100,206,198],[229,205,119],[240,163,119]];
  const p=t*3,i=Math.min(2,Math.floor(p)),f=p-i;
  return `rgb(${stops[i].map((v,k)=>Math.round(v+(stops[i+1][k]-v)*f)).join(',')})`;
}
