'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {GitCompareArrows,X} from 'lucide-react';
import {catalogRequest} from '../catalog-provider';
import {money,photo} from '../data/live-catalog';
import {comparisonUrl,useComparison} from './product-comparison';
import styles from './comparison-board.module.css';

export default function ComparisonBoard({selection}){
 const router=useRouter(),comparison=useComparison();
 const [result,setResult]=useState(null),[attempt,setAttempt]=useState(0),[differences,setDifferences]=useState(false);
 const entries=useMemo(()=>typeof selection==='string'&&selection.length<=1600?selection.split(','):[],[selection]);
 const valid=entries.length>=2&&entries.length<=4&&entries.every(item=>/^[a-zA-Z0-9_-]{1,320}(~[a-fA-F0-9-]{36})?$/.test(item));
 useEffect(()=>{if(!valid)return;const controller=new AbortController();setResult(null);catalogRequest(`compare?items=${encodeURIComponent(selection)}`,controller.signal).then(data=>{if(!controller.signal.aborted)setResult({data});}).catch(error=>{if(!controller.signal.aborted)setResult({error:error.message});});return()=>controller.abort();},[selection,valid,attempt]);
 const items=result?.data?.items||[],codes=[...new Set(items.flatMap(item=>item.specifications.map(field=>field.code)))];
 const rows=codes.map(code=>{const field=items.flatMap(item=>item.specifications).find(field=>field.code===code);const cells=items.map(item=>item.specifications.find(value=>value.code===code)?.displayValue??'Not provided');return {code,label:field.label,group:field.group,cells};}).filter(row=>!differences||new Set(row.cells).size>1);
 function remove(item){comparison.remove(item.id);const remaining=items.filter(value=>value.id!==item.id);router.replace(remaining.length?comparisonUrl(remaining):'/compare');}
 return <main className={styles.page}><nav className={styles.breadcrumbs} aria-label="Breadcrumb"><Link href="/products">Products</Link><span>/</span><span>Compare</span></nav><header className={styles.heading}><div><p>MAKE A CONFIDENT CHOICE</p><h1>Compare products</h1><span>Prices and stock are for the selected colour, size and seller. Product specifications apply to the product as a whole.</span></div><Link href="/products">Choose more products</Link></header>
  {!valid?<section className={styles.empty}><GitCompareArrows size={36} aria-hidden="true"/><h2>Find the right fit, side by side</h2><p>Use Compare on product cards or a product page to choose 2–4 different products of the same type.</p>{comparison.items.length>=2?<Link href={comparisonUrl(comparison.items)}>Compare selected products</Link>:<Link href="/products">Explore products</Link>}</section>:result?.error?<section className={styles.empty} role="alert"><h2>Comparison needs your attention</h2><p>{result.error}</p><p>Check that all selected products are still available and belong to the same type.</p><div className={styles.controls}><button type="button" onClick={()=>setAttempt(value=>value+1)}>Try again</button><button type="button" onClick={()=>{comparison.clear();router.replace('/compare');}}>Clear comparison</button></div></section>:!result?<section className={styles.loading} role="status" aria-label="Loading product comparison"><div/><div/><div/><p>Loading current prices and specifications…</p></section>:<>
   <div className={styles.toolbar}><p>{items.length} products · {items[0]?.vertical.toLowerCase()}</p><label><input type="checkbox" checked={differences} onChange={event=>setDifferences(event.target.checked)}/>Only different specifications</label><button type="button" onClick={()=>{comparison.clear();router.replace('/compare');}}>Clear all</button></div>
   <p className={styles.hint} id="comparison-scroll-help">On smaller screens, scroll the table horizontally to see every product.</p>
   <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Product comparison table" aria-describedby="comparison-scroll-help"><table className={styles.table}><caption>Selected products and customer-visible specifications</caption><thead><tr><th scope="col">Product</th>{items.map(item=><th scope="col" key={item.id}><div className={styles.product}><button type="button" className={styles.remove} aria-label={`Remove ${item.name}`} onClick={()=>remove(item)}><X size={18} aria-hidden="true"/></button><img src={photo(item.image,350)} alt="" width={160} height={160}/><span>{item.brand||'Product'}</span><Link href={`/p/${item.slug}?offer=${encodeURIComponent(item.offerId)}`}>{item.name}</Link><small>{[item.color,item.size].filter(Boolean).join(' / ')||item.variantName}</small></div></th>)}</tr></thead><tbody>
    <tr><th scope="row">Selected offer price</th>{items.map(item=><td key={item.id}><strong className={styles.price}>{money(item.price)}</strong>{item.mrp>item.price&&<del>{money(item.mrp)}</del>}<small>{item.includesTax?'Includes applicable taxes':'Taxes calculated at checkout'}</small></td>)}</tr>
    <tr><th scope="row">Seller</th>{items.map(item=><td key={item.id}>{item.sellerName}</td>)}</tr>
    <tr><th scope="row">Availability</th>{items.map(item=><td key={item.id}>{item.inStock?'In stock':'Out of stock'}</td>)}</tr>
    <tr><th scope="row">Customer rating</th>{items.map(item=><td key={item.id}>{item.reviews>0?`${item.rating}/5 · ${item.reviews} reviews`:'No published reviews'}</td>)}</tr>
    {rows.map(row=><tr key={row.code}><th scope="row"><small>{row.group}</small>{row.label}</th>{row.cells.map((cell,index)=><td key={items[index].id}>{cell}</td>)}</tr>)}
   </tbody></table></div>
   {!rows.length&&<p className={styles.hint}>{differences?'No different customer-visible specifications have been provided.':'Structured specifications have not been provided for these products yet.'}</p>}
   <p className={styles.hint}>Prices and availability can change. Open a product to choose another seller or variant; checkout confirms the final price and stock.</p>
  </>}
 </main>;
}
