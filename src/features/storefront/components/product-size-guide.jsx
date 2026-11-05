'use client';
import {useLocalization as useUiLocalization} from '@/localization/provider';
import {useEffect,useId,useRef,useState} from 'react';
import {Ruler,X} from 'lucide-react';
import styles from './product-size-guide.module.css';

export default function ProductSizeGuide({guide,selectedSize}) {
 const {t: _uiText}=useUiLocalization();

 const dialog=useRef(null),trigger=useRef(null),overflow=useRef(null),timer=useRef(null),[closing,setClosing]=useState(false),id=useId();
 const unit=guide.unit==='CM'?'cm':'in';
 function restore(){if(overflow.current!==null){document.body.style.overflow=overflow.current;overflow.current=null;}}
 useEffect(()=>()=>{clearTimeout(timer.current);restore();},[]);
 function open(){setClosing(false);overflow.current=document.body.style.overflow;document.body.style.overflow='hidden';dialog.current.showModal();}
 function close(){if(closing)return;setClosing(true);timer.current=setTimeout(()=>{dialog.current?.close();restore();trigger.current?.focus();},window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:180);}
 return <>
  <button ref={trigger} type="button" className={styles.trigger} aria-haspopup="dialog" onClick={open}><Ruler aria-hidden="true" size={18}/>{_uiText("Size guide")}</button>
  <dialog ref={dialog} className={styles.dialog} data-closing={closing||undefined} aria-labelledby={`${id}-title`} aria-describedby={`${id}-basis`} onCancel={event=>{event.preventDefault();close();}} onClose={restore}
   onClick={event=>{if(event.target===dialog.current){const b=dialog.current.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)close();}}}>
   <header className={styles.header}><div><p>FIT &amp; MEASUREMENTS</p><h2 id={`${id}-title`}>{guide.name}</h2></div><button type="button" className={styles.close} aria-label="Close size guide" onClick={close}><X aria-hidden="true" size={20}/></button></header>
   <div className={styles.body}>
    <p id={`${id}-basis`} className={styles.basis}>{guide.basis==='BODY'?'Body measurements':'Garment measurements'} · All measurements in {guide.unit==='CM'?'centimetres (cm)':'inches (in)'}</p>
    {guide.description&&<p>{guide.description}</p>}
    {selectedSize&&<p>Selected product size: <strong>{selectedSize}</strong></p>}
    <div className={styles.tableWrap} role="region" tabIndex={0} aria-label="Size measurement chart, scroll horizontally for more measurements">
     <table className={styles.table}><caption>Size chart ({unit})</caption><thead><tr><th scope="col">{_uiText("Size")}</th>{guide.columns.map(column=><th scope="col" key={column}>{column} ({unit})</th>)}</tr></thead><tbody>{guide.rows.map(row=><tr key={row.size} data-selected={row.size.toLocaleLowerCase('en-IN')===selectedSize?.toLocaleLowerCase('en-IN')||undefined}><th scope="row">{row.size}{row.size.toLocaleLowerCase('en-IN')===selectedSize?.toLocaleLowerCase('en-IN')?<span className={styles.selected}>Selected</span>:null}</th>{row.values.map((value,index)=><td key={index}>{value}</td>)}</tr>)}</tbody></table>
    </div>
    {guide.instructions&&<section><h3>How to measure</h3><p className={styles.instructions}>{guide.instructions}</p></section>}
    <p className={styles.note}>Check the measurements and fit notes before choosing a size. This guide does not automatically recommend a size.</p>
   </div><footer className={styles.footer}><button type="button" className={styles.closeButton} onClick={close}>Done</button></footer>
  </dialog>
 </>;
}
