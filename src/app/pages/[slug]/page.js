import {LocalizedText} from '@/localization/provider';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import StoreHeader from '@/features/storefront/components/store-header';
import { ContentPageError, getStorePage, getStorePages } from '@/features/storefront/server-content';
import styles from './page.module.css';

async function pageData(slug) {
  try { return await getStorePage(slug); }
  catch (error) { if (error instanceof ContentPageError && error.status === 404) notFound(); throw error; }
}
export async function generateMetadata({ params }) {
  const { slug } = await params; const page = await pageData(slug);
  return { title: `${page.title} | Hornbook Retail`, description: page.summary || 'Store information from Hornbook Retail.',
    alternates: { canonical: `/pages/${slug}` } };
}
export default async function StoreInformationPage({ params }) {
  const { slug } = await params;
  const [page, index] = await Promise.all([pageData(slug), getStorePages()]);
  const updated = new Date(page.publishedAt);
  const published = page.publishedAt && Number.isFinite(updated.getTime())
    ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'long', timeZone: 'Asia/Kolkata' }).format(updated) : null;
  return <><StoreHeader /><main className={styles.page}>
    <div className={styles.breadcrumb}><Link href="/"><LocalizedText text="Home" /></Link><span aria-hidden="true">/</span><span>{page.title}</span></div>
    <div className={styles.layout}><article className={styles.article}>
      <header className={styles.heading}><p className={styles.eyebrow}>Store information</p><h1>{page.title}</h1>{page.summary ? <p className={styles.summary}>{page.summary}</p> : null}
        {published ? <p className={styles.updated}><LocalizedText text="Published" /> {published}</p> : null}</header>
      <div className={styles.body}>{page.body.split(/\n\s*\n/).filter((paragraph) => paragraph.trim()).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
    </article>
      {index.items.length > 1 ? <aside className={styles.aside}><h2>Store information</h2><nav aria-label="More store information">{index.items.map((item) => <Link key={item.slug} href={`/pages/${item.slug}`} aria-current={item.slug === slug ? 'page' : undefined}>{item.title}</Link>)}</nav></aside> : null}
    </div>
  </main></>;
}
