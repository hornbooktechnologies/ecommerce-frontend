import {LocalizedText} from '@/localization/provider';
import Link from 'next/link';
import StoreHeader from '@/features/storefront/components/store-header';
import { getCollections } from '@/features/storefront/server-collections';
import styles from './collections.module.css';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Collections',
  description: 'Explore curated edits and collections from the store.',
  alternates: { canonical: '/collections' },
};
export default async function CollectionsPage({ searchParams }) {
  const query = await searchParams,
    n = Number(query.page || 1),
    page = Number.isInteger(n) && n >= 1 && n <= 10000 ? n : 1;
  const result = await getCollections(page);
  return (
    <>
      <StoreHeader />
      <main className={styles.page}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/"><LocalizedText text="Home" /></Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page"><LocalizedText text="Collections" /></span>
        </nav>
        <header className={styles.directoryHeading}>
          <p className={styles.eyebrow}>Curated for you</p>
          <h1>Explore the edits.</h1>
          <p>Discover products brought together with a point of view.</p>
        </header>
        <div className={styles.directory}>
          {result.items.map((item) => (
            <Link
              href={`/collections/${item.slug}`}
              key={item.slug}
              className={styles.collectionLink}
            >
              {item.imageUrl && (
                <img src={item.imageUrl} alt={item.altText} loading="lazy" />
              )}
              <div>
                <h2>{item.title}</h2>
                <p>{item.description.slice(0, 180)}</p>
                <span>Explore collection →</span>
              </div>
            </Link>
          ))}
        </div>
        {!result.items.length && (
          <p>
            No collections are currently available.{' '}
            <Link href="/products">Browse all products</Link>.
          </p>
        )}
        {result.total > 0 && (
          <nav
            className={styles.pagination}
            aria-label="Collections pagination"
          >
            {page > 1 && (
              <Link
                href={`/collections?page=${Math.min(page - 1, result.totalPages)}`}
              >
                ← Previous
              </Link>
            )}
            <span>
              <LocalizedText text="Page" /> {page} <LocalizedText text="of" /> {result.totalPages}
            </span>
            {page < result.totalPages && (
              <Link href={`/collections?page=${page + 1}`}>Next →</Link>
            )}
          </nav>
        )}
      </main>
    </>
  );
}
