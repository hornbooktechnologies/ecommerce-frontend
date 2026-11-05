import {LocalizedText} from '@/localization/provider';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import StoreHeader from '@/features/storefront/components/store-header';
import ProductCard from '@/features/storefront/components/product-card';
import {
  CatalogError,
  getConfiguration,
} from '@/features/storefront/server-catalog';
import { getCollection } from '@/features/storefront/server-collections';
import styles from '../collections.module.css';
export const dynamic = 'force-dynamic';
async function load(slug, search, sort, page) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 120) notFound();
  try {
    return await getCollection(slug, search, sort, page);
  } catch (error) {
    if (error instanceof CatalogError && error.status === 404) notFound();
    throw error;
  }
}
const first = (value) => (typeof value === 'string' ? value : '');
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const [collection, config] = await Promise.all([
    load(slug),
    getConfiguration(),
  ]);
  return {
    title: collection.seoTitle || `${collection.title} | ${config.store.name}`,
    description:
      collection.seoDescription ||
      collection.description.slice(0, 180) ||
      `Explore ${collection.title}.`,
    alternates: { canonical: `/collections/${slug}` },
    openGraph: {
      title: collection.seoTitle || collection.title,
      description:
        collection.seoDescription || collection.description.slice(0, 180),
      ...(collection.imageUrl
        ? { images: [{ url: collection.imageUrl, alt: collection.altText }] }
        : {}),
    },
  };
}
export default async function CollectionPage({ params, searchParams }) {
  const { slug } = await params,
    query = await searchParams;
  const search = first(query.search).slice(0, 190),
    sort = [
      'curated',
      'newest',
      'price_asc',
      'price_desc',
      'rating',
      'discount',
    ].includes(first(query.sort))
      ? query.sort
      : 'curated';
  const n = Number(first(query.page) || 1),
    page = Number.isInteger(n) && n >= 1 && n <= 10000 ? n : 1;
  const collection = await load(slug, search, sort, page);
  const link = (to) =>
    `/collections/${slug}?${new URLSearchParams({ ...(search ? { search } : {}), ...(sort !== 'curated' ? { sort } : {}), page: String(to) })}`;
  return (
    <>
      <StoreHeader />
      <main className={styles.page} data-merch-kind="COLLECTION" data-merch-key={slug}>
        <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
          <Link href="/"><LocalizedText text="Home" /></Link>
          <span aria-hidden="true">/</span>
          <Link href="/collections"><LocalizedText text="Collections" /></Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{collection.title}</span>
        </nav>
        <header
          className={styles.hero}
          data-merch-view="true"
          data-image={Boolean(collection.imageUrl)}
        >
          {collection.imageUrl && (
            <img
              className={styles.banner}
              src={collection.imageUrl}
              alt={collection.altText}
              fetchPriority="high"
            />
          )}
          <div className={styles.intro}>
            <p className={styles.eyebrow}>The collection edit</p>
            <h1>{collection.title}</h1>
            {collection.description && (
              <p className={styles.description}>{collection.description}</p>
            )}
            <a className={styles.textLink} href="#collection-products">
              Explore the collection <span aria-hidden="true">↓</span>
            </a>
          </div>
        </header>
        <section
          id="collection-products"
          className={styles.catalog}
          aria-labelledby="collection-results"
        >
          <div className={styles.toolbar}>
            <h2 id="collection-results">
              {collection.total.toLocaleString('en-IN')}{' '}
              {collection.total === 1 ? 'product' : 'products'}
            </h2>
            <form
              action={`/collections/${slug}`}
              method="get"
              className={styles.filters}
            >
              <label>
                <span>Search this collection</span>
                <input
                  type="search"
                  name="search"
                  defaultValue={search}
                  maxLength={190}
                  placeholder="Product name or SKU"
                />
              </label>
              <label>
                <span><LocalizedText text="Sort by" /></span>
                <select name="sort" defaultValue={sort}>
                  <option value="curated">Collection order</option>
                  <option value="newest"><LocalizedText text="Newest" /></option>
                  <option value="price_asc"><LocalizedText text="Price: low to high" /></option>
                  <option value="price_desc"><LocalizedText text="Price: high to low" /></option>
                  <option value="rating"><LocalizedText text="Top rated" /></option>
                  <option value="discount"><LocalizedText text="Biggest discount" /></option>
                </select>
              </label>
              <button type="submit"><LocalizedText text="Apply" /></button>
              {search || sort !== 'curated' ? (
                <Link href={`/collections/${slug}`}><LocalizedText text="Reset" /></Link>
              ) : null}
            </form>
          </div>
          {collection.items.length ? (
            <div className={styles.products}>
              {collection.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <h3>
                {search
                  ? 'No matching products'
                  : 'No products available right now'}
              </h3>
              <p>
                {search
                  ? 'Try another search within this collection.'
                  : 'Check back soon or explore the rest of the store.'}
              </p>
              <Link href={search ? `/collections/${slug}` : '/products'}>
                {search ? 'Clear search' : 'Browse all products'}
              </Link>
            </div>
          )}
          {collection.total > 0 && (
            <nav
              className={styles.pagination}
              aria-label="Collection products pagination"
            >
              {page > 1 && (
                <Link href={link(Math.min(page - 1, collection.totalPages))}>
                  ← Previous
                </Link>
              )}
              <span>
                <LocalizedText text="Page" /> {page} <LocalizedText text="of" /> {collection.totalPages}
              </span>
              {page < collection.totalPages && (
                <Link href={link(page + 1)}>Next →</Link>
              )}
            </nav>
          )}
        </section>
      </main>
    </>
  );
}
