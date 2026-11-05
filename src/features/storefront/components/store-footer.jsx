import Link from 'next/link';
import styles from './store-footer.module.css';
import { getStorePages } from '../server-content';
import {MerchandisingConsent} from './merchandising-analytics';

function FooterContent({ store, pages, unavailable = false, loading = false }) {
  const name = store.tenantName || store.name;
  const year = new Intl.DateTimeFormat('en-IN', { year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date());
  return <footer className={styles.footer}>
    <div className={styles.brandBlock}><Link className={styles.brand} href="/">{name}</Link><p className={styles.copyright}>© {year} {name}</p></div>
    {loading ? <p className={styles.unavailable} role="status">Loading store information…</p> : pages.length ? <nav className={styles.links} aria-label="Store information and policies">{pages.map((page) => <Link key={page.slug} href={`/pages/${page.slug}`}>{page.title}</Link>)}</nav>
      : unavailable ? <p className={styles.unavailable} role="status">Store information links are temporarily unavailable. Please refresh to try again.</p> : null}
    {!loading&&<MerchandisingConsent/>}
  </footer>;
}
export function FooterSkeleton({ store }) { return <FooterContent store={store} pages={[]} loading />; }
export default async function StoreFooter({ store }) {
  const pages = await getStorePages();
  return <FooterContent store={store} pages={pages.items} unavailable={pages.unavailable} />;
}
