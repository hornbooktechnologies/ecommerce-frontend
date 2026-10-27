import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  CatalogError,
  getProduct,
  getProducts,
} from '@/features/storefront/server-catalog';
import StoreHeader from '@/features/storefront/components/store-header';
import ProductActions from '@/features/storefront/components/product-actions';
import ProductCard from '@/features/storefront/components/product-card';

async function load(slug: string) {
  try {
    return await getProduct(slug);
  } catch (error) {
    if (error instanceof CatalogError && error.status === 404) notFound();
    throw error;
  }
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const product = await load((await params).slug);
  return {
    title: `${product.name} | Hornbook Retail`,
    description: product.description,
    alternates: { canonical: `/p/${product.slug}` },
  };
}
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const product = await load((await params).slug);
  const related = (
    await getProducts({ category: product.categorySlug, pageSize: 6 })
  ).items
    .filter((item) => item.id !== product.id)
    .slice(0, 5);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.sku,
    image: product.images.map((image) => image.url),
    description: product.description,
    ...(product.brand
      ? { brand: { '@type': 'Brand', name: product.brand } }
      : {}),
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: product.currency,
      availability: `https://schema.org/${product.inStock ? 'InStock' : 'OutOfStock'}`,
    },
    ...(product.reviews > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.rating,
            reviewCount: product.reviews,
          },
        }
      : {}),
  };
  return (
    <>
      <StoreHeader />
      <main className="product-page pdp-new">
        <nav className="breadcrumbs">
          <Link href="/">Home</Link>
          <span>/</span>
          <Link href={`/c/${product.categorySlug}`}>{product.category}</Link>
          <span>/</span>
          <span>{product.name}</span>
        </nav>
        <ProductActions product={product} />
        <section id="specifications" className="live-product-section">
          <h2>Product specifications</h2>
          {Object.keys(product.specifications).length ? (
            <dl className="live-specifications">
              {Object.entries(product.specifications).map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p>Additional specifications have not been provided.</p>
          )}
        </section>
        <section id="reviews" className="live-product-section">
          <h2>Customer reviews</h2>
          <p>Purchased this product? <Link href="/account/orders">Review it from My orders</Link> after delivery. Reviews appear after moderation.</p>
          {product.reviewsList.length ? (
            product.reviewsList.map((review) => (
              <article className="live-review" key={review.id}>
                <strong>
                  {review.title || `${review.rating} out of 5 stars`}
                </strong>
                <p>{review.body}</p>
                <small>
                  {review.name} · {review.rating}/5
                  {review.verifiedPurchase ? ' · Verified purchase' : ''}
                </small>
              </article>
            ))
          ) : (
            <p>No published reviews yet.</p>
          )}
        </section>
        {related.length > 0 && (
          <section className="live-product-section">
            <h2>More in {product.category}</h2>
            <div className="category-product-grid">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema).replace(/</g, '\\u003c'),
          }}
        />
      </main>
    </>
  );
}
