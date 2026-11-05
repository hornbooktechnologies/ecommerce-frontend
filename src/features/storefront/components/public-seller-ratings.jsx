import {LocalizedText} from '@/localization/provider';
import Link from 'next/link';
import {CatalogError,fetchCatalog} from '../server-catalog';
import SellerRatingSummary from './seller-rating-summary';
import styles from './seller-ratings.module.css';
export default async function PublicSellerRatings({sellerId,page=1,filters={}}){
 let data;try{data=await fetchCatalog(`sellers/${encodeURIComponent(sellerId)}/ratings`,{page,pageSize:10});}catch(error){if(!(error instanceof CatalogError))throw error;return <section className={styles.panel} id="seller-reviews"><h2>Seller feedback</h2><p>Seller feedback is temporarily unavailable. Reload the page to try again.</p></section>;}
 const href=next=>`/sellers/${sellerId}?${new URLSearchParams({...filters,reviewPage:String(next)})}#seller-reviews`;
 return <section id="seller-reviews" className={styles.panel} aria-labelledby="seller-feedback-title"><header><h2 id="seller-feedback-title">Seller feedback</h2><SellerRatingSummary rating={data.summary}/><p>Approved feedback from delivered seller orders in this store. These scores are separate from product reviews.</p></header>{data.items.length?<ol className={styles.list}>{data.items.map(review=><li key={review.id}><div><strong>{review.customerName} · {review.rating} / 5</strong><time dateTime={review.createdAt}>{new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeZone:'Asia/Kolkata'}).format(new Date(review.createdAt))}</time></div><small>Delivered seller order</small><p>{review.review}</p></li>)}</ol>:<p>No published seller feedback on this page.</p>}{data.total>10&&<nav className={styles.pages} aria-label="Seller feedback pages">{data.page>1&&<Link href={href(data.page-1)} prefetch={false}>Previous feedback</Link>}<span><LocalizedText text="Page" /> {data.page} <LocalizedText text="of" /> {data.totalPages}</span>{data.page<data.totalPages&&<Link href={href(data.page+1)} prefetch={false}>Next feedback</Link>}</nav>}</section>;
}
