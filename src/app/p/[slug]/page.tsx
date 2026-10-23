/* eslint-disable @next/next/no-img-element */
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  BadgePercent,
  Banknote,
  Check,
  ChevronRight,
  CircleHelp,
  CreditCard,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  Star,
  Store,
  Tag,
  Truck,
} from 'lucide-react';
import StoreHeader from '@/features/storefront/components/store-header';
import ProductCard from '@/features/storefront/components/product-card';
import {
  products,
  photo,
  money,
  productDetails,
  slugify,
} from '@/features/storefront/data/catalog';
import ProductActions from '@/features/storefront/components/product-actions';

export function generateStaticParams() {
  return products.map((product) => ({ slug: slugify(product.name) }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = products.find((item) => slugify(item.name) === slug);
  return {
    title: product ? `${product.name} | AURA Mall` : 'Product not found',
    description: product
      ? `Discover ${product.name} by ${product.brand}. View full specifications, ratings and delivery information.`
      : undefined,
    alternates: { canonical: `/p/${slug}` },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = products.find((item) => slugify(item.name) === slug);
  if (!product) notFound();
  const details = productDetails(product),
    discount = Math.round((1 - product.price / product.mrp) * 100);
  const related = products
    .filter(
      (item) => item.category === product.category && item.id !== product.id,
    )
    .concat(products.filter((item) => item.category !== product.category))
    .slice(0, 5);
  const frequently = related.slice(0, 2),
    bundleTotal =
      product.price + frequently.reduce((sum, item) => sum + item.price, 0);
  return (
    <>
      <StoreHeader />
      <main className="product-page pdp-new">
        <div className="breadcrumbs">
          <Link href="/">Home</Link>
          <ChevronRight size={13} />
          <Link href={`/c/${slugify(product.category)}`}>
            {product.category}
          </Link>
          <ChevronRight size={13} />
          <span>{product.name}</span>
        </div>
        <section className="product-overview">
          <div className="product-gallery">
            <div className="pdp-gallery-layout">
              <div className="pdp-thumb-rail">
                {[1, 2, 3].map((item, index) => (
                  <button className={index === 0 ? 'active' : ''} key={item}>
                    <img
                      src={photo(product.image, 350)}
                      alt={`${product.name} view ${item}`}
                    />
                  </button>
                ))}
                <button className="pdp-video-thumb">
                  ▶<small>VIDEO</small>
                </button>
              </div>
              <div
                className="product-main-image"
                style={{ background: product.color }}
              >
                <img src={photo(product.image, 900)} alt={product.name} />
                <span className="product-tag">{product.tag}</span>
                <span className="image-hint">Hover to zoom</span>
              </div>
            </div>
            <div className="pdp-gallery-note">
              <ShieldCheck size={16} /> Actual product colours may vary slightly
              by screen
            </div>
          </div>
          <div className="product-summary">
            <Link
              className="pdp-brand"
              href={`/c/${slugify(product.category)}`}
            >
              {product.brand}
              <ChevronRight size={15} />
            </Link>
            <h1>{product.name}</h1>
            <p className="pdp-subtitle">{details.intro}</p>
            <div className="product-rating-summary">
              <span>
                <Star size={13} fill="currentColor" /> {product.rating}
              </span>
              <a href="#reviews">{product.reviews} ratings & reviews</a>
              <b>
                <Check size={12} /> Assured
              </b>
            </div>
            <hr />
            <div className="product-price">
              <strong>{money(product.price)}</strong>
              <del>MRP {money(product.mrp)}</del>
              <span>{discount}% OFF</span>
            </div>
            <small>Inclusive of all taxes</small>
            <p className="pdp-emi">
              or ₹{Math.ceil(product.price / 6).toLocaleString('en-IN')}/month
              with no-cost EMI
            </p>
            <section className="pdp-offers">
              <h2>
                <Tag size={17} /> Available offers
              </h2>
              <div>
                <BadgePercent size={18} />
                <p>
                  <strong>Special price</strong> Get extra 10% off with code{' '}
                  <b>AURA10</b>
                  <small>T&C</small>
                </p>
              </div>
              <div>
                <CreditCard size={18} />
                <p>
                  <strong>Bank offer</strong> 10% instant discount on selected
                  credit cards<small>T&C</small>
                </p>
              </div>
              <div>
                <Banknote size={18} />
                <p>
                  <strong>Partner offer</strong> Earn up to 500 AURA reward
                  points<small>Know more</small>
                </p>
              </div>
            </section>
            <ProductActions id={product.id} category={product.category} />
            <div className="product-promises">
              <span>
                <Truck size={21} />
                <strong>Free delivery</strong>
                <small>on this order</small>
              </span>
              <span>
                <RotateCcw size={21} />
                <strong>Easy returns</strong>
                <small>within 7 days</small>
              </span>
              <span>
                <ShieldCheck size={21} />
                <strong>Authentic</strong>
                <small>quality checked</small>
              </span>
            </div>
            <section className="seller-card">
              <Store size={20} />
              <div>
                <small>SOLD BY</small>
                <strong>AURA Retail</strong>
                <span>4.8 ★ seller rating</span>
              </div>
              <Link href="#specifications">
                Seller details <ChevronRight size={13} />
              </Link>
            </section>
          </div>
        </section>
        <nav className="pdp-jump-links" aria-label="Product information">
          <a href="#highlights">Highlights</a>
          <a href="#specifications">Specifications</a>
          <a href="#reviews">Ratings & reviews</a>
          <a href="#questions">Questions</a>
        </nav>
        <section className="product-story" id="highlights">
          <div>
            <span className="eyebrow">PRODUCT HIGHLIGHTS</span>
            <h2>Why you&apos;ll love it</h2>
            <p>
              {details.intro} Every detail balances useful performance, lasting
              quality and considered design.
            </p>
          </div>
          <ul>
            {details.features.map((feature) => (
              <li key={feature}>
                <PackageCheck size={19} />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="specifications" id="specifications">
          <div>
            <span className="eyebrow">PRODUCT INFORMATION</span>
            <h2>Specifications</h2>
            <p>Everything useful, clearly laid out before you decide.</p>
          </div>
          <dl>
            {Object.entries(details.specs).map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="bundle-section">
          <div>
            <span className="eyebrow">FREQUENTLY BOUGHT TOGETHER</span>
            <h2>Complete your purchase</h2>
            <p>Popular combinations chosen by shoppers viewing this item.</p>
          </div>
          <div className="bundle-items">
            {[product, ...frequently].map((item, index) => (
              <div key={item.id}>
                <img src={photo(item.image, 350)} alt={item.name} />
                {index < 2 ? <b>+</b> : null}
                <span>
                  {item.name}
                  <strong>{money(item.price)}</strong>
                </span>
              </div>
            ))}
          </div>
          <div className="bundle-total">
            <small>Total price</small>
            <strong>{money(bundleTotal)}</strong>
            <button>Add all 3 to cart</button>
          </div>
        </section>
        <section className="reviews-section" id="reviews">
          <div className="review-summary">
            <span className="eyebrow">RATINGS & REVIEWS</span>
            <h2>Shoppers have spoken</h2>
            <div>
              <strong>{product.rating}</strong>
              <span>
                ★★★★★<small>Based on {product.reviews} ratings</small>
              </span>
            </div>
            <div className="rating-bars">
              {[5, 4, 3, 2, 1].map((stars) => (
                <p key={stars}>
                  <span>{stars} star</span>
                  <i>
                    <b
                      style={{
                        width: stars === 5 ? '78%' : stars === 4 ? '17%' : '4%',
                      }}
                    />
                  </i>
                </p>
              ))}
            </div>
            <button className="outline-button">Rate this product</button>
          </div>
          <div className="review-list">
            <div className="review-filters">
              <button className="active">Most helpful</button>
              <button>With photos</button>
              <button>5 star</button>
            </div>
            {details.reviews.map((review) => (
              <article key={review.name}>
                <div>
                  <span>{'★'.repeat(review.rating)}</span>
                  <small>{review.date}</small>
                </div>
                <h3>{review.title}</h3>
                <p>{review.body}</p>
                <footer>
                  {review.name}
                  <span>Verified purchase</span>
                </footer>
              </article>
            ))}
          </div>
        </section>
        <section className="qa-section" id="questions">
          <div>
            <CircleHelp size={25} />
            <span>
              <small>HAVE A QUESTION?</small>
              <h2>Ask the AURA community</h2>
            </span>
          </div>
          <div>
            <strong>Is this product covered by warranty?</strong>
            <p>
              Yes. Warranty details are listed in the specification table and
              included with your order.
            </p>
            <small>Answered by AURA Retail · Helpful to 18 shoppers</small>
          </div>
          <button className="outline-button">Ask a question</button>
        </section>
        <section className="related-products">
          <div className="section-heading">
            <div>
              <span className="eyebrow">SIMILAR PRODUCTS</span>
              <h2>You may also like</h2>
            </div>
            <Link
              className="text-button"
              href={`/c/${slugify(product.category)}`}
            >
              View all {product.category} <ChevronRight size={15} />
            </Link>
          </div>
          <div className="category-product-grid">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Product',
              name: product.name,
              image: photo(product.image),
              description: details.intro,
              brand: { '@type': 'Brand', name: product.brand },
              sku: `AURA-${product.id}`,
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: product.rating,
                reviewCount: product.reviews,
              },
              offers: {
                '@type': 'Offer',
                priceCurrency: 'INR',
                price: product.price,
                availability: 'https://schema.org/InStock',
              },
            }).replace(/</g, '\u003c'),
          }}
        />
      </main>
    </>
  );
}
