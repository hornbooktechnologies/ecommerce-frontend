'use client';
import {useLocalization as useUiLocalization} from '@/localization/provider';
import {useEffect,useId,useRef,useState} from 'react';
import styles from './catalog-explorer.module.css';

const numeric=value=>typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<=1e12;
const number=new Intl.NumberFormat('en-IN',{maximumSignificantDigits:15});
export function numericRangeLabel(selection,unit=''){
 const suffix=unit?` ${unit}`:'';
 if(selection.min!==undefined&&selection.max!==undefined)return `${number.format(selection.min)}–${number.format(selection.max)}${suffix}`;
 return selection.min!==undefined?`From ${number.format(selection.min)}${suffix}`:`Up to ${number.format(selection.max)}${suffix}`;
}
export function parseSpecificationFilters(raw){
 if(!raw||raw.length>4000)return [];
 try{const entries=JSON.parse(raw);if(!Array.isArray(entries)||entries.length>8)return [];
  if(entries.some(item=>{
   if(!item||typeof item.id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(item.id))return true;
   if(item.values!==undefined)return !Array.isArray(item.values)||!item.values.length||item.values.length>10||item.values.some(value=>typeof value!=='string'||!value.length||value.length>120)||item.min!==undefined||item.max!==undefined;
   return (item.min===undefined&&item.max===undefined)||(item.min!==undefined&&!numeric(item.min))||(item.max!==undefined&&!numeric(item.max))||(item.min!==undefined&&item.max!==undefined&&item.min>item.max);
  }))return [];
  const normal=entries.map(item=>({id:item.id.toLowerCase(),...(item.values?{values:[...new Set(item.values)]}:{...(item.min!==undefined?{min:item.min}:{}),...(item.max!==undefined?{max:item.max}:{})})}));
  return new Set(normal.map(item=>item.id)).size===normal.length?normal:[];
 }catch{return [];}
}
export function specificationFormValue(form){
 const fields=new Map(),ranges=new Map();for(const [name,value]of form.entries()){
  if(name.startsWith('spec:')){const id=name.slice(5);if(!fields.has(id))fields.set(id,new Set());fields.get(id).add(String(value));}
  else if(name.startsWith('spec-min:')||name.startsWith('spec-max:')){
   const raw=String(value).trim();if(raw==='')continue;const bound=Number(raw);
   if(!numeric(bound))throw new Error('Specification bounds must be finite numbers between -1,000,000,000,000 and 1,000,000,000,000.');
   const id=name.slice(9);if(!ranges.has(id))ranges.set(id,{id});ranges.get(id)[name.startsWith('spec-min:')?'min':'max']=bound;
  }
 }
 const entries=[...[...fields].map(([id,values])=>({id,values:[...values]})),...ranges.values()];
 if(entries.length>8||entries.some(item=>item.values?.length>10)||new Set(entries.map(item=>item.id)).size!==entries.length)throw new Error('Choose up to 8 specification filters and 10 choices per choice filter.');
 if(entries.some(item=>item.min!==undefined&&item.max!==undefined&&item.min>item.max))throw new Error('A specification minimum cannot exceed its maximum.');
 const json=entries.length?JSON.stringify(entries):'';
 if(json.length>4000)throw new Error('Too many specification options selected. Remove a few and apply again.');
 return json;
}
function NumericSpecificationFilter({group,selection}){
 const {t: _uiText}=useUiLocalization();

 const id=useId(),root=useRef(null),[issue,setIssue]=useState(''),unit=group.unit?` (${group.unit})`:'';
 useEffect(()=>{const fieldset=root.current,form=fieldset?.closest('form');if(!form)return;
  const reset=()=>{fieldset.querySelectorAll('input').forEach(input=>input.setCustomValidity(''));setIssue('');};
  form.addEventListener('reset',reset);return()=>form.removeEventListener('reset',reset);
 },[]);
 function validate(event){const inputs=event.currentTarget.closest('fieldset').querySelectorAll('input[type="number"]'),[min,max]=inputs;
  const message=min.value!==''&&max.value!==''&&Number(min.value)>Number(max.value)?'Minimum cannot exceed maximum.':'';
  min.setCustomValidity(message);max.setCustomValidity(message);setIssue(message);
 }
 return <fieldset ref={root} className={styles.group}><legend>{group.name}{unit}</legend>
  <p id={`${id}-hint`} className={styles.note}>{group.range?`Available ${number.format(group.range.min)}–${number.format(group.range.max)}${group.unit?` ${group.unit}`:''} · ${group.range.count} ${group.range.count===1?'product':'products'}`:'Selected numeric filter; clear it if this field is no longer available.'}</p>
  <div className={styles.price}>
   <label htmlFor={`${id}-min`}>{_uiText("Minimum")}<input id={`${id}-min`} aria-label={`${group.name} minimum${unit}`} aria-describedby={`${id}-hint${issue?` ${id}-error`:''}`} type="number" name={`spec-min:${group.id}`} min={-1e12} max={1e12} step="any" defaultValue={selection?.min??''} placeholder={group.range?String(group.range.min):'No minimum'} onInput={validate} onBlur={validate}/></label>
   <label htmlFor={`${id}-max`}>{_uiText("Maximum")}<input id={`${id}-max`} aria-label={`${group.name} maximum${unit}`} aria-describedby={`${id}-hint${issue?` ${id}-error`:''}`} type="number" name={`spec-max:${group.id}`} min={-1e12} max={1e12} step="any" defaultValue={selection?.max??''} placeholder={group.range?String(group.range.max):'No maximum'} onInput={validate} onBlur={validate}/></label>
  </div>{issue&&<p className={styles.error} role="alert" id={`${id}-error`}>{issue}</p>}
 </fieldset>;
}
export function SpecificationFilters({facets=[],raw}){
 const selected=parseSpecificationFilters(raw),groups=[...facets];
 for(const item of selected)if(!groups.some(group=>group.id===item.id))groups.push({id:item.id,name:`Selected specification (${item.id.slice(0,8)})`,type:item.values?'SELECT':'NUMBER',options:[]});
 return groups.map(group=>{
  const selection=selected.find(item=>item.id===group.id);
  if(group.type==='NUMBER')return <NumericSpecificationFilter key={group.id} group={group} selection={selection}/>;
  const values=selection?.values||[],options=[...(group.options||[])];
  for(const value of values)if(!options.some(option=>option.value===value))options.push({value,name:value,count:0});
  return <fieldset key={group.id} className={styles.group}><legend>{group.name}</legend><div className={styles.options}>{options.map(option=><label className={styles.option} key={option.value}>
   <input type="checkbox" name={`spec:${group.id}`} value={option.value} defaultChecked={values.includes(option.value)}/><span>{option.name}</span><small>{option.count}</small>
  </label>)}</div></fieldset>;
 });
}
