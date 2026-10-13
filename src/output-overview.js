// Cancel stale work immediately; show only the latest source+curve revision.
export function createOutputOverview({capture,render,publish,pending,failed,delay=180}) {
  let revision=0, timer=null, abort=null;
  function cancel(){revision++;clearTimeout(timer);timer=null;abort?.abort();abort=null;}
  function invalidate(){
    cancel();const id=revision;pending();
    timer=setTimeout(async()=>{
      timer=null;const snapshot=capture();if(!snapshot){publish(null);return;}
      const controller=new AbortController();abort=controller;
      try {const result=await render(snapshot,controller.signal);if(id===revision)publish(result);}
      catch(error){if(id===revision&&error.name!=='AbortError')failed(error);}
      finally {if(abort===controller)abort=null;}
    },delay);
  }
  return {invalidate,cancel};
}
