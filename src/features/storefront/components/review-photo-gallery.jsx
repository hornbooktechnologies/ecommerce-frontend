'use client';
import {useEffect,useRef,useState} from 'react';
import styles from './review-photos.module.css';
export default function ReviewPhotoGallery({photos=[]}){
 const dialog=useRef(null),timer=useRef(null),trigger=useRef(null),[active,setActive]=useState(null),[closing,setClosing]=useState(false);
 useEffect(()=>{if(!active)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';dialog.current?.showModal();return()=>{clearTimeout(timer.current);document.body.style.overflow=previous;};},[active]);
 function close(){if(closing)return;setClosing(true);timer.current=setTimeout(()=>{dialog.current?.close();setActive(null);setClosing(false);trigger.current?.focus();},matchMedia('(prefers-reduced-motion: reduce)').matches?0:160);}
 if(!photos.length)return null;
 return <div className={styles.publicGallery} aria-label="Customer review photos">{photos.map((photo,index)=><button key={photo.id} type="button" aria-label={`Enlarge customer photo ${index+1}: ${photo.alt}`} onClick={event=>{trigger.current=event.currentTarget;setActive(photo);}}><img src={photo.url} alt={photo.alt} width={photo.width} height={photo.height} loading="lazy"/></button>)}
 {active&&<dialog className={styles.viewer} data-closing={closing||undefined} ref={dialog} aria-label="Customer review photo" onCancel={event=>{event.preventDefault();close();}} onClick={event=>{if(event.target===event.currentTarget)close();}}><div><header><strong>Customer review photo</strong><button autoFocus type="button" onClick={close}>Close</button></header><img src={active.url} alt={active.alt} width={active.width} height={active.height}/><p>{active.alt}</p></div></dialog>}</div>;
}
