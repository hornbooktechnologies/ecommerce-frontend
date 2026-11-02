'use client';
import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {GitCompareArrows,X} from 'lucide-react';
import {toast} from 'sonner';
import {useCatalog} from '../catalog-provider';
import styles from './product-comparison.module.css';
const Context=createContext(null);
const itemKey=item=>`${item.slug}~${item.offerId}`;
export const comparisonUrl=items=>`/compare?items=${encodeURIComponent(items.map(itemKey).join(','))}`;
export function ComparisonProvider({children}){
 const {configuration}=useCatalog();
 const pathname=usePathname();
 const scope=configuration.appearance?.scope;
 const key=`commerce-comparison:${scope?.tenantId||configuration.store.tenantName}:${scope?.storeId||configuration.store.code}`;
 const [state,setState]=useState({key:'',items:[]}),snapshot=useRef({key:'',items:[]});
 useEffect(()=>{let items=[];try{const saved=JSON.parse(sessionStorage.getItem(key)||'[]');if(Array.isArray(saved))items=saved.filter(item=>item&&typeof item.id==='string'&&typeof item.name==='string'&&/^[a-zA-Z0-9_-]{1,320}$/.test(item.slug)&&/^[a-f0-9-]{36}$/.test(item.offerId)&&['GENERAL','GROCERY','CLOTHING','ELECTRONICS'].includes(item.vertical)).slice(0,4);}catch{}snapshot.current={key,items};setState(snapshot.current);},[key]);
 const commit=useCallback(items=>{snapshot.current={key,items};setState(snapshot.current);try{sessionStorage.setItem(key,JSON.stringify(items));}catch{}},[key]);
 const currentItems=useCallback(()=>snapshot.current.key===key?snapshot.current.items:[],[key]);
 const items=useMemo(()=>state.key===key?state.items:[],[state,key]);
 const remove=useCallback(id=>commit(currentItems().filter(item=>item.id!==id)),[commit,currentItems]);
 const toggle=useCallback(product=>{
  const latest=currentItems(),same=latest.find(item=>item.id===product.id);
  if(same?.offerId===product.offerId){remove(product.id);return;}
  if(latest.some(item=>item.vertical!==product.vertical)){toast.error('Choose products of the same type, or clear the current comparison.');return;}
  if(!same&&latest.length>=4){toast.error('Compare up to four products. Remove one to choose another.');return;}
  const value={id:product.id,slug:product.slug,name:product.name,vertical:product.vertical,offerId:product.offerId};
  commit(same?latest.map(item=>item.id===product.id?value:item):[...latest,value]);
  toast.success(same?'Comparison updated to this seller and variant.':'Product added to comparison.');
 },[currentItems,remove,commit]);
 const value=useMemo(()=>({items,toggle,remove,clear:()=>commit([]),ready:state.key===key}),[items,toggle,remove,commit,state.key,key]);
 const showTray=items.length>0&&pathname!=='/compare';
 return <Context.Provider value={value}>{children}{showTray&&<aside className={styles.tray} aria-label="Selected products for comparison"><div><strong><GitCompareArrows size={18} aria-hidden="true"/>Compare products · {items.length}/4</strong><div className={styles.chips}>{items.map(item=><button type="button" key={item.id} title={`Remove ${item.name}`} aria-label={`Remove ${item.name} from comparison`} onClick={()=>remove(item.id)}>{item.name}<X size={14} aria-hidden="true"/></button>)}</div></div><div className={styles.controls}><button type="button" onClick={()=>commit([])}>Clear</button>{items.length>=2?<Link href={comparisonUrl(items)}>Compare now</Link>:<span>Choose one more product</span>}</div></aside>}{showTray&&<div className={styles.clearance} aria-hidden="true"/>}</Context.Provider>;
}
export function useComparison(){const value=useContext(Context);if(!value)throw Error('ComparisonProvider missing');return value;}
export function CompareButton({product}){const {items,toggle,ready}=useComparison(),current=items.find(item=>item.id===product.id),selected=current?.offerId===product.offerId;
 return <button className={styles.compareButton} type="button" aria-pressed={selected} disabled={!ready} onClick={()=>toggle(product)} aria-label={`${selected?'Remove from':current?'Update':'Add to'} comparison: ${product.name}`}><GitCompareArrows size={16} aria-hidden="true"/>{selected?'In comparison':current?'Update comparison':'Compare'}</button>;
}
