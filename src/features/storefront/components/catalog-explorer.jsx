'use client';

import {useLocalization as useUiLocalization} from '@/localization/provider';
import { Suspense, useEffect, useId, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, X } from 'lucide-react';
import { catalogRequest, useCatalog } from '../catalog-provider';
import CatalogResults from './catalog-results';
import styles from './catalog-explorer.module.css';
import {SpecificationFilters,parseSpecificationFilters,specificationFormValue,numericRangeLabel} from './specification-filters';

const keys = ['search','category','brand','brands','colors','sizes','minPrice','maxPrice','minRating','minDiscount','inStock','specs','sort'];
const ids = (value = '') => [...new Set(value.split(',').filter(Boolean))];
const labels = { brands:'Brand', colors:'Colour', sizes:'Size', search:'Search', category:'Category', minPrice:'Minimum price', maxPrice:'Maximum price', minRating:'Rating', minDiscount:'Discount', inStock:'In stock', sort:'Sort' };

export default function CatalogExplorer({ category = '' }) {
  return <Suspense fallback={<p role="status">Loading collection filters...</p>}><Explorer category={category} /></Suspense>;
}

function Explorer({ category }) {
 const {t: _uiText}=useUiLocalization();

  const params = useSearchParams(), pathname = usePathname();
  const { categories, brands: allBrands } = useCatalog();
  const resultHeading = useRef(null), disclosure = useRef(null);
  const [attempt, setAttempt] = useState(0), [facetResult, setFacetResult] = useState(null);
  const filters = Object.fromEntries(keys.filter((key) => params.has(key)).map((key) => [key, params.get(key)]));
  if (category) filters.category = category;
  const activeCategory = filters.category || '', search = filters.search || '';
  const facetKey = new URLSearchParams({category:activeCategory,search}).toString();
  useEffect(() => {
    const controller = new AbortController();
    catalogRequest(`facets?${facetKey}`,controller.signal)
      .then(data => setFacetResult({key:facetKey,attempt,data}))
      .catch(error => { if (!controller.signal.aborted) setFacetResult({key:facetKey,attempt,error:error.message}); });
    return () => controller.abort();
  },[facetKey,attempt]);
  const current = facetResult?.key === facetKey && facetResult.attempt === attempt ? facetResult : null;
  const facets = current?.data;
  const parsedPage = Number(params.get('page') || 1);
  const page = Number.isInteger(parsedPage) && parsedPage >= 1 && parsedPage <= 10000 ? parsedPage : 1;
  function navigate(next) {
    const query = next.toString();
    window.history.pushState(null,'',`${pathname}${query ? `?${query}` : ''}`);
  }
  function update(key,value) {
    const next = new URLSearchParams(params.toString()); next.delete('page');
    if (value) next.set(key,value); else next.delete(key);
    navigate(next);
  }
  function reset() {
    navigate(new URLSearchParams());
  }
  const chips = [];
  for (const key of keys) {
    if (key === 'category' && category || key === 'sort' || key === 'brand' || key === 'specs') continue;
    const value = filters[key];
    if (!value || value === 'false' || value === '0') continue;
    if (['brands','colors','sizes'].includes(key)) {
      for (const id of ids(value)) {
        const item = (facets?.[key] || (key === 'brands' ? allBrands : [])).find(option=>option.id === id);
        chips.push({key:`${key}-${id}`,text:`${labels[key]}: ${item?.name || id.slice(0,8)}`,remove:()=>update(key,ids(value).filter(item=>item!==id).join(','))});
      }
    } else chips.push({key,text:`${labels[key]}: ${key==='category' ? categories.find(item=>item.slug===value)?.name || value : key==='inStock' ? 'Only' : value}`,remove:()=>update(key,'')});
  }
  const selectedSpecs=parseSpecificationFilters(filters.specs);
  for(const item of selectedSpecs){const field=facets?.specifications?.find(group=>group.id===item.id);
    if(!item.values){chips.push({key:`spec-${item.id}-range`,text:`${field?.name||'Specification'}: ${numericRangeLabel(item,field?.unit)}`,remove:()=>{const next=selectedSpecs.filter(entry=>entry.id!==item.id);update('specs',next.length?JSON.stringify(next):'');}});continue;}
    for(const value of item.values)chips.push({key:`spec-${item.id}-${value}`,text:`${field?.name||'Specification'}: ${field?.options.find(option=>option.value===value)?.name||value}`,remove:()=>{
      const next=selectedSpecs.map(entry=>entry.id===item.id?{...entry,values:entry.values.filter(option=>option!==value)}:entry).filter(entry=>entry.values.length);update('specs',next.length?JSON.stringify(next):'');
    }});
  }
  if(filters.specs&&!selectedSpecs.length)chips.push({key:'specs',text:'Specification filters',remove:()=>update('specs','')});
  if (filters.brand) chips.push({key:'brand',text:`Brand: ${allBrands.find(item=>item.id===filters.brand)?.name || filters.brand.slice(0,8)}`,remove:()=>update('brand','')});
  return <div className={styles.layout}>
    <aside className={styles.sidebar} aria-label="Product filters">
      <details open ref={disclosure} className={styles.disclosure}>
        <summary><SlidersHorizontal size={18} aria-hidden="true" />Refine your finds</summary>
        <FilterForm key={params.toString()} filters={filters} category={category} facets={facets} categories={categories} loading={!current}
          error={current?.error} retry={()=>setAttempt(value=>value+1)} reset={reset}
          apply={(next)=>{ navigate(next); if (window.matchMedia('(max-width: 800px)').matches) disclosure.current.open=false; resultHeading.current?.focus(); }} />
      </details>
    </aside>
    <section className={`category-results ${styles.results}`} aria-label="Product results">
      <div className={styles.toolbar}>
        <h2 ref={resultHeading} tabIndex={-1}>Shop the collection</h2>
        <label>{_uiText("Sort by")}<select aria-label={_uiText("Sort by")} value={filters.sort || 'featured'} onChange={event=>update('sort',event.target.value)}>
          <option value="featured">{_uiText("Featured")}</option><option value="newest">{_uiText("Newest")}</option><option value="price_asc">{_uiText("Price: low to high")}</option><option value="price_desc">{_uiText("Price: high to low")}</option><option value="rating">{_uiText("Highest rated")}</option><option value="discount">{_uiText("Biggest discount")}</option>
        </select></label>
      </div>
      {chips.length > 0 && <div className={styles.chips} aria-label="Applied filters">
        {chips.map(chip=><button type="button" key={chip.key} onClick={chip.remove} aria-label={`Remove ${chip.text}`}>{chip.text}<X size={14} aria-hidden="true" /></button>)}
        <button type="button" onClick={reset}>{_uiText("Clear all")}</button>
      </div>}
      <CatalogResults filters={filters} currentPage={page} onPageChange={nextPage=>{const next=new URLSearchParams(params.toString());next.set('page',String(nextPage));navigate(next);resultHeading.current?.focus();}} />
    </section>
  </div>;
}

function FilterForm({filters,category,facets,categories,loading,error,retry,reset,apply}) {
 const {t: _uiText}=useUiLocalization();

  const id = useId(), [message,setMessage] = useState('');
  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget), next = new URLSearchParams();
    const min = form.get('minPrice'), max = form.get('maxPrice');
    if (min !== '' && max !== '' && Number(min) > Number(max)) {setMessage('Minimum price cannot exceed maximum price.');return;}
    for (const key of ['brands','colors','sizes']) {
      const values = form.getAll(key);
      if (values.length > 30) {setMessage(`Choose up to 30 ${labels[key].toLowerCase()} options.`);return;}
      if(values.length) next.set(key,[...new Set(values)].join(','));
    }
    for(const key of ['search','category','minPrice','maxPrice','minRating','minDiscount','inStock']) {
      const value = form.get(key); if(value && value !== '0') next.set(key,String(value).trim());
    }
    try{const specs=specificationFormValue(form);if(specs)next.set('specs',specs);}catch(error){setMessage(error.message);return;}
    if(filters.sort) next.set('sort',filters.sort);
    apply(next);
  }
  return <form className={styles.form} onSubmit={submit}>
    <label className={styles.field}>{_uiText("Search products")}<input type="search" name="search" maxLength={190} defaultValue={filters.search || ''} placeholder={_uiText("Name, brand or SKU")} /></label>
    {category ? <input type="hidden" name="category" value={category} /> : <label className={styles.field}>{_uiText("Category")}<select name="category" defaultValue={filters.category || ''}><option value="">{_uiText("All categories")}</option>{categories.map(item=><option key={item.id} value={item.slug}>{item.name}</option>)}</select></label>}
    <p className={styles.note}>Option counts show products in this search and category, before applying other filters. Changes apply when you select Apply filters.</p>
    {loading && <p role="status">Loading product filter options...</p>}
    {error && <p role="alert">{error} <button type="button" onClick={retry}>Retry options</button></p>}
    {['brands','colors','sizes'].map(key=>{
      const selected = ids([filters[key] || '',key==='brands' ? filters.brand || '' : ''].filter(Boolean).join(','));
      const options = [...(facets?.[key] || [])];
      for(const selectedId of selected) if(!options.some(item=>item.id===selectedId)) options.push({id:selectedId,name:`Selected ${labels[key].toLowerCase()} (${selectedId.slice(0,8)})`,count:0});
      return options.length ? <fieldset key={key} className={styles.group}><legend>{key==='brands' ? _uiText("Brands") : key==='colors' ? _uiText("Colours") : _uiText("Sizes")}</legend>
        <div className={styles.options}>{options.map(item=><label key={item.id} className={styles.option}>
          <input type="checkbox" name={key} value={item.id} defaultChecked={selected.includes(item.id)} />
          {key==='colors' && /^#[\da-f]{6}$/i.test(item.swatchValue || '') && <span aria-hidden="true" className={styles.swatch} style={{backgroundColor:item.swatchValue}} />}
          <span>{item.name}</span><small>{item.count}</small>
        </label>)}</div>
      </fieldset> : null;
    })}
    <SpecificationFilters facets={facets?.specifications} raw={filters.specs}/>
    <fieldset className={styles.group}><legend>{_uiText("Price range (INR)")}</legend><div className={styles.price}>
      <label htmlFor={`${id}-min`}>{_uiText("Minimum")}<input id={`${id}-min`} type="number" name="minPrice" min="0" max="1000000000000" step="0.01" defaultValue={filters.minPrice || ''} placeholder="0" /></label>
      <label htmlFor={`${id}-max`}>{_uiText("Maximum")}<input id={`${id}-max`} type="number" name="maxPrice" min="0" max="1000000000000" step="0.01" defaultValue={filters.maxPrice || ''} placeholder={_uiText("No limit")} /></label>
    </div></fieldset>
    <label className={styles.field}>{_uiText("Minimum rating")}<select name="minRating" defaultValue={filters.minRating || '0'}><option value="0">{_uiText("Any rating")}</option>{[1,2,3,4,5].map(value=><option key={value} value={value}>{value} stars &amp; above</option>)}</select></label>
    <label className={styles.field}>{_uiText("Minimum discount")}<select name="minDiscount" defaultValue={filters.minDiscount || '0'}><option value="0">{_uiText("Any discount")}</option>{[10,20,30,40,50,60,70].map(value=><option key={value} value={value}>{value}% &amp; above</option>)}</select></label>
    <label className={styles.option}><input type="checkbox" name="inStock" value="true" defaultChecked={filters.inStock==='true'} /><span>In stock only</span></label>
    {message && <p role="alert" className={styles.error}>{message}</p>}
    <div className={styles.actions}><button type="submit">{_uiText("Apply filters")}</button><button type="button" onClick={event=>{event.currentTarget.form.reset();setMessage('');reset();}}>Reset filters</button></div>
  </form>;
}
