'use client';
import {useLocalization as useUiLocalization} from '@/localization/provider';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {MessageSquare,Send} from 'lucide-react';
import {toast} from 'sonner';
import {catalogRequest} from '../catalog-provider';
import {useCustomerSummary} from '../use-customer-summary';
import {questionRequest,questionTime} from '@/lib/product-questions';
import styles from './product-questions.module.css';

export default function ProductQuestions({productSlug}){
 const {t: _uiText}=useUiLocalization();

 const customer=useCustomerSummary(),[page,setPage]=useState(1),[attempt,setAttempt]=useState(0),[result,setResult]=useState(null);
 useEffect(()=>{const controller=new AbortController();setResult(null);catalogRequest(`products/${encodeURIComponent(productSlug)}/questions?page=${page}&pageSize=10`,controller.signal).then(data=>setResult({data})).catch(error=>{if(!controller.signal.aborted)setResult({error:error.message});});return()=>controller.abort();},[productSlug,page,attempt]);
 const data=result?.data;
 return <section id="questions" className={`live-product-section ${styles.section}`} aria-labelledby="product-questions-title"><div className={styles.heading}><div><p>BUY WITH CONFIDENCE</p><h2 id="product-questions-title">Questions &amp; answers</h2><span>Product facts, answered by the store or an eligible seller and reviewed before publication.</span></div><MessageSquare size={30} aria-hidden="true"/></div>
  {!result?<p role="status" className={styles.skeleton}>Loading published answers…</p>:result.error?<div role="alert"><p>{result.error}</p><button type="button" onClick={()=>setAttempt(value=>value+1)}>{_uiText("Try again")}</button></div>:!data.items.length?<p className={styles.empty}>No published answers yet. Ask about sizing, materials, compatibility or other product details.</p>:<><div>{data.items.map(item=><article className={styles.qa} key={item.id}><h3><span>Q.</span>{item.question}</h3><div className={styles.answer}><strong>A.</strong><div><p>{item.answer}</p><small>{item.kind==='VENDOR'?`Seller · ${item.seller}`:'Store team'} · {questionTime(item.answeredAt)} · Moderated answer</small></div></div></article>)}</div><QuestionPagination data={data} onChange={setPage}/></>}
  <QuestionForm key={`${productSlug}:${customer.id||'guest'}`} customer={customer} productSlug={productSlug}/>
 </section>;
}
function QuestionForm({customer,productSlug}){
 const {t: _uiText}=useUiLocalization();

 const [question,setQuestion]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),lock=useRef(false),errorRef=useRef(null);
 useEffect(()=>{if(error)errorRef.current?.focus();},[error]);
 async function submit(event){event.preventDefault();if(lock.current)return;lock.current=true;setBusy(true);setError('');setMessage('');try{const result=await questionRequest('ask',{productSlug,question:question.trim()});setQuestion('');setMessage(result.message);toast.success(result.message);}catch(cause){setError(cause.message);toast.error(cause.message);}finally{lock.current=false;setBusy(false);}}
 return <div className={styles.ask}><h3>Have a product question?</h3><p>Ask about this product, not an order or delivery issue. Do not include email addresses, phone numbers or other private details. Your question and a moderated answer may be published.</p>{customer.id?<form onSubmit={submit}>{error&&<div className={styles.error} role="alert" tabIndex={-1} ref={errorRef}><a href="#product-question-input">{error}</a></div>}{message&&<p role="status" className={styles.success}>{message}</p>}<label htmlFor="product-question-input">Your question</label><textarea id="product-question-input" required minLength={10} maxLength={1000} rows={3} aria-describedby="product-question-help" value={question} disabled={busy} onChange={event=>setQuestion(event.target.value)}/><small id="product-question-help">10–1,000 characters. New questions remain private until moderated.</small><div className={styles.actions}><button type="submit" disabled={busy||question.trim().length<10}><Send size={16} aria-hidden="true"/>{busy?'Submitting…':'Submit question'}</button><Link href="/account/questions">{_uiText("My questions")}</Link></div></form>:<div className={styles.actions}><Link href="/account/login">Sign in to ask a question</Link><Link href="/account/questions">{_uiText("My questions")}</Link></div>}</div>;
}
export function QuestionPagination({data,onChange}){
 const {t: _uiText}=useUiLocalization();
if(!data?.total)return null;return <nav className={styles.pagination} aria-label="Questions pagination"><span>{data.total} question{data.total===1?'':'s'} · Page {data.page} {_uiText("of")} {data.totalPages}</span><div><button type="button" disabled={data.page<=1} onClick={()=>onChange(data.page-1)}>{_uiText("Previous")}</button><button type="button" disabled={data.page>=data.totalPages} onClick={()=>onChange(data.page+1)}>{_uiText("Next")}</button></div></nav>;}
