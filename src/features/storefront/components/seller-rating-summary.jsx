import styles from './seller-ratings.module.css';
export default function SellerRatingSummary({rating}){return <span className={styles.summary}>{rating?.count>0?`${Number(rating.average).toFixed(1)} / 5 · ${rating.count} seller rating${rating.count===1?'':'s'}`:'No published seller ratings yet'}</span>;}
