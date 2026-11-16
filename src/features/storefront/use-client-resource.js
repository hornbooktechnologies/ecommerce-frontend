'use client';
import {useCallback,useEffect,useEffectEvent,useState,useSyncExternalStore} from 'react';

const subscribeHydration=()=>()=>{};
const clientSnapshot=()=>true;
const serverSnapshot=()=>false;
export const useHydrated=()=>useSyncExternalStore(subscribeHydration,clientSnapshot,serverSnapshot);

// Cached external time, never sampled during render. Refresh after tab suspension.
let currentTime=0;
const clockListeners=new Set();
let clockTimer;
function tick(){currentTime=Date.now();for(const listener of clockListeners)listener();}
function subscribeClock(listener){
  clockListeners.add(listener);
  if(clockListeners.size===1){tick();clockTimer=setInterval(tick,1000);window.addEventListener('focus',tick);document.addEventListener('visibilitychange',tick);}
  return()=>{clockListeners.delete(listener);if(!clockListeners.size){clearInterval(clockTimer);window.removeEventListener('focus',tick);document.removeEventListener('visibilitychange',tick);}};
}
export const useClientTime=()=>useSyncExternalStore(subscribeClock,()=>currentTime,()=>0);

/**
 * A request owns its result by key; changed filters never render stale data.
 * @template T
 * @param {string|null} key
 * @param {(signal:AbortSignal)=>Promise<T>} load
 */
export function useClientResource(key,load){
  const [state,setState]=useState(null);
  const loadCurrent=useEffectEvent(load);
  useEffect(()=>{
    if(key===null)return;
    const controller=new AbortController();
    loadCurrent(controller.signal).then(data=>{
      if(!controller.signal.aborted)setState({key,data,error:null});
    }).catch(error=>{
      if(!controller.signal.aborted)setState({key,data:null,error});
    });
    return()=>controller.abort();
  },[key]);
  const setData=useCallback(update=>setState(previous=>previous?.key===key?{...previous,data:typeof update==='function'?update(previous.data):update}:previous),[key]);
  const current=state?.key===key?state:null;
  return {data:current?.data??null,error:current?.error??null,loading:key!==null&&!current,setData};
}
