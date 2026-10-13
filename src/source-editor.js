import {initialEdit, lengthOf, deleteRange, setFade, materialize} from './output-edit-core.js?v=20261013-source3';

// Edits own a working source; the original arrays are immutable Undo references.
export function createSourceEditor({createBuffer, apply, stop, busyChanged, repaint, primePlayback, play}) {
  const el=id=>document.getElementById(id), panel=el('sourceEditPanel'), canvas=el('sourceWaveCanvas');
  let state=null, channels=2, selection=null, history=[], redo=[], drag=null;
  let busy=false, available=true, queuedPlay=false;
  let cursor=0, zoom=1, viewStart=0;
  const countOf=()=>state?lengthOf(state):0;
  const maxZoom=()=>Math.max(1,Math.min(1024,countOf()/32));
  const view=()=>{const count=countOf(),span=Math.max(1,Math.ceil(count/zoom));return {start:viewStart,end:Math.min(count,viewStart+span)};};
  function clampView(){zoom=Math.min(zoom,maxZoom());cursor=Math.min(cursor,countOf());const span=Math.ceil(countOf()/zoom);viewStart=Math.max(0,Math.min(viewStart,countOf()-span));}
  function changeZoom(next){
    if(busy||!available||drag||!countOf())return;
    zoom=Math.max(1,Math.min(maxZoom(),next));
    viewStart=Math.round(cursor-countOf()/zoom/2);clampView();update();
  }
  el('editZoomIn').onclick=()=>changeZoom(zoom*2);
  el('editZoomOut').onclick=()=>changeZoom(zoom/2);
  el('editZoomFit').onclick=()=>changeZoom(1);
  el('editPan').oninput=()=>{
    if(busy||!available||drag)return;
    viewStart=Math.round(Number(el('editPan').value)/1000*Math.max(0,countOf()-Math.ceil(countOf()/zoom)));update();
  };
  const status=el('editStatus');
  const update=(paint=true)=>{
    el('editUndo').disabled=busy||!available||!history.length;
    el('editRedo').disabled=busy||!available||!redo.length;
    el('editDelete').disabled=busy||!available||!selection||selection[0]===selection[1];
    for(const id of ['fadeInHandle','fadeOutHandle'])el(id).disabled=busy||!available||!state||!lengthOf(state);
    canvas.setAttribute('aria-disabled',String(busy||!available));
    el('editZoomIn').disabled=busy||!available||!countOf()||zoom>=maxZoom();
    el('editZoomOut').disabled=el('editZoomFit').disabled=busy||!available||zoom<=1;
    el('editZoomFit').textContent=`Fit · ${zoom.toFixed(zoom%1?1:0)}×`;
    const range=view();
    el('editPan').disabled=busy||!available||zoom<=1;
    el('editPan').value=String(Math.round(viewStart/Math.max(1,countOf()-(range.end-range.start))*1000));
    el('editPan').setAttribute('aria-valuetext',state?`${(range.start/state.rate).toFixed(3)} to ${(range.end/state.rate).toFixed(3)} seconds`:'No audio');
    el('editCursor').textContent=state?`${(cursor/state.rate).toFixed(3)} s`: '0.000 s';
    if(paint)repaint();
  };
  function load(buffer) {
    queuedPlay=false;state=initialEdit(buffer.getChannelData(0),buffer.getChannelData(Math.min(1,buffer.numberOfChannels-1)),buffer.sampleRate);
    channels=Math.min(2,buffer.numberOfChannels);history=[];redo=[];selection=null;drag=null;cursor=0;zoom=1;viewStart=0;
    status.textContent='Drag to select · Delete to join · Corner handles fade · Auto-applied';update();
  }
  async function commit(next, action='edit') {
    if(busy||!available||!state||next===state)return;
    stop();busy=true;busyChanged(true);update();status.textContent='Applying edit…';
    try {
      const count=lengthOf(next);let candidate=null;
      if(count){candidate=createBuffer(channels,count,next.rate);await materialize(next,[candidate.getChannelData(0),candidate.getChannelData(channels-1)]);}
      // Publish only complete PCM. Preview and export never see half-applied edits.
      if(action==='undo'){redo.push(state);history.pop();}
      else if(action==='redo'){history.push(state);redo.pop();}
      else {history.push(state);if(history.length>100)history.shift();redo=[];}
      cursor=Math.min(action==='edit'&&selection?selection[0]:cursor,count);
      state=next;selection=null;clampView();apply(candidate);
      status.textContent=count?'Applied · Drag to select · Corner handles fade':'Empty audio · Undo restores audio';
    } catch(error) {queuedPlay=false;status.textContent=`Edit not applied: ${error.message}. Previous audio retained.`;}
    finally {busy=false;busyChanged(false);update();if(queuedPlay){queuedPlay=false;play();}}
  }
  const undo=()=>history.length&&commit(history.at(-1),'undo');
  const redoEdit=()=>redo.length&&commit(redo.at(-1),'redo');
  const remove=()=>selection&&commit(deleteRange(state,...selection));
  el('editUndo').onclick=undo;el('editRedo').onclick=redoEdit;el('editDelete').onclick=remove;
  function frameAt(event){const r=canvas.getBoundingClientRect(),left=54,width=Math.max(1,r.width-left-8);return Math.round(Math.max(0,Math.min(1,(event.clientX-r.left-left)/width))*(view().end-view().start)+view().start);}
  function down(event,kind){
    if(busy||!available||!state||!lengthOf(state)||event.button!==0)return;
    event.preventDefault();stop();canvas.focus();event.currentTarget.setPointerCapture(event.pointerId);
    drag={kind,start:frameAt(event),clientX:event.clientX,previous:state,selection,cursor};if(kind==='select')selection=null;update();
  }
  function move(event){
    if(!drag)return;const frame=frameAt(event);
    if(drag.kind==='select')selection=[Math.min(drag.start,frame),Math.max(drag.start,frame)];
    else state=setFade(drag.previous,drag.kind,drag.kind==='fadeIn'?frame:lengthOf(state)-frame);
    update();
  }
  async function up(event){
    if(!drag)return;
    if(event.type!=='pointercancel')move(event);
    const previous=drag;drag=null;
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
    if(event.type==='pointercancel'){state=previous.previous;selection=previous.selection;cursor=previous.cursor;queuedPlay=false;update();return;}
    if(previous.kind==='select'){cursor=previous.start;if(Math.abs(event.clientX-previous.clientX)<3||selection?.[0]===selection?.[1])selection=null;update();}
    else {const next=state;state=previous.previous;await commit(next);}
  }
  for(const [target,kind] of [[canvas,'select'],[el('fadeInHandle'),'fadeIn'],[el('fadeOutHandle'),'fadeOut']]){
    target.addEventListener('pointerdown',e=>down(e,kind));target.addEventListener('pointermove',move);
    target.addEventListener('pointerup',up);target.addEventListener('pointercancel',up);
  }
  for(const [id,side] of [['fadeInHandle','fadeIn'],['fadeOutHandle','fadeOut']])el(id).onkeydown=e=>{
    if(busy||!available||!state||!['ArrowLeft','ArrowRight','Home'].includes(e.key))return;
    e.preventDefault();const delta=(e.key==='ArrowRight'?1:-1)*(side==='fadeIn'?1:-1)*state.rate*.01;
    return commit(setFade(state,side,e.key==='Home'?0:state[side]+delta));
  };
  window.addEventListener('keydown',e=>{
    const typing=e.target.matches('input,textarea,select')||e.target.isContentEditable;
    if(typing)return;
    if(!e.metaKey&&!e.ctrlKey&&!e.altKey&&['+','=','-'].includes(e.key)){
      e.preventDefault();e.stopImmediatePropagation();changeZoom(e.key==='-'?zoom/2:zoom*2);return;
    }
    if(e.code==='Space'&&(busy||drag)){
      e.preventDefault();e.stopImmediatePropagation();if(!e.repeat&&busy){queuedPlay=true;primePlayback();}return;
    }
    if(!panel.contains(e.target))return;
    if(['Delete','Backspace'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();remove();}
    else if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.stopImmediatePropagation();e.shiftKey?redoEdit():undo();}
  },true);
  el('stopButton').addEventListener('click',()=>{queuedPlay=false;},true);
  update();
  return {load,setAvailable(value){available=value;update();},followPlayback(frame){
    if(busy||drag||!countOf()||!Number.isFinite(frame))return;
    const range=view(),at=Math.max(0,Math.min(countOf(),frame));
    if(at<range.start||at>range.end){
      viewStart=Math.round(at-(range.end-range.start)/2);clampView();update(false);
    }
  },get viewport(){return view();},get cursor(){return cursor;},get state(){return state;},get selection(){return selection;},get busy(){return busy;}};
}
