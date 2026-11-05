'use client';
import {useLocalization as useUiLocalization} from '@/localization/provider';
import {useEffect,useRef,useState} from 'react';
import {toast} from 'sonner';
import {shoppingRequest,useShoppingIdentity} from '../shopping-client';
import styles from './shopping-reminders.module.css';
const when=value=>{const date=new Date(value);return Number.isFinite(date.getTime())?new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeZone:'Asia/Kolkata'}).format(date):'Not set';};
export function ShoppingReminders({kind}){const identity=useShoppingIdentity();if(!identity.ready||!identity.customerId||identity.failed)return null;return kind?<details key={`${identity.customerId}:${kind}`} className={styles.disclosure}><summary>{kind==='CART'?'Manage optional bag reminders':'Manage optional wishlist reminders'}</summary><Preferences kind={kind}/></details>:<Preferences key={`${identity.customerId}:ALL`}/>;}
function Preferences({kind}){
 const [result,setResult]=useState(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{const controller=new AbortController();setResult(null);setError('');shoppingRequest('reminders/settings',{}, {signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setResult(data);}).catch(cause=>{if(!controller.signal.aborted)setError(cause.message);});return()=>controller.abort();},[attempt]);
 return <section className={styles.panel} aria-label="Cart and wishlist reminder preferences"><header><h2>Optional shopping reminders</h2><p>In-app only. Separate from stock/price alerts and newsletter consent. Nothing is enabled automatically.</p></header>{error?<p role="alert">{error} <button type="button" onClick={()=>setAttempt(value=>value+1)}>Retry preferences</button></p>:!result?<p role="status">Loading reminder preferences…</p>:<>{result.items.filter(item=>!kind||item.kind===kind).map(item=><Preference key={`${item.kind}:${item.version}`} item={item}/>)}<button className={styles.refresh} type="button" onClick={()=>setAttempt(value=>value+1)}>Refresh reminder settings</button></>}</section>;
}
function Preference({item}){
 const {t: _uiText}=useUiLocalization();

 const [current,setCurrent]=useState(item),[enabled,setEnabled]=useState(item.enabled),[busy,setBusy]=useState(false),[error,setError]=useState(''),lock=useRef(false),alive=useRef(true),cart=item.kind==='CART';
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 async function submit(event){event.preventDefault();if(lock.current)return;lock.current=true;setBusy(true);setError('');try{const next=await shoppingRequest('reminders/consent',{kind:item.kind,enabled,consent:enabled,version:current.version});if(alive.current){setCurrent(next);setEnabled(next.enabled);toast.success(next.enabled?'In-app reminder enabled.':'Reminder turned off.');}}catch(cause){if(alive.current)setError(cause.message);}finally{lock.current=false;if(alive.current)setBusy(false);}}
 return <form onSubmit={submit} className={styles.row}><h3>{cart?'Saved bag':_uiText("Wishlist")}</h3><p>{cart?'One reminder after your bag and consent have both been idle for 24 hours.':'One reminder after your wishlist and consent have both been idle for 7 days.'} At most one per type every 7 days; a list must change before another reminder. Empty/unavailable lists and purchases since the last list change are skipped.</p>
  <label><input type="checkbox" checked={enabled} disabled={busy} onChange={event=>setEnabled(event.target.checked)}/><span>{cart?'Remind me about my saved bag in-app':'Remind me about my wishlist in-app'}</span></label>
  <small>{current.status==='EXPIRED'?'Consent expired. Opt in again if you want reminders.':current.enabled?`Enabled until ${when(current.expiresAt)}.`:'Off.'} Consent lasts 90 days. Turning off also hides old queued reminders. No email is sent.</small>
  {error&&<p role="alert" className={styles.error}>{error} Use Refresh reminder settings if another tab changed your preference.</p>}
  <button type="submit" disabled={busy||enabled===current.enabled}>{busy?_uiText("Saving…"):enabled===current.enabled?(enabled?'Reminder enabled':'Reminder off'):enabled?'Enable reminder':'Turn off reminder'}</button>
 </form>;
}
