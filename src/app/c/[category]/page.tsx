/* eslint-disable @next/next/no-img-element */
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ChevronRight, Flame, Sparkles } from 'lucide-react';
import StoreHeader from '@/features/storefront/components/store-header';
import CategoryCatalog from '@/features/storefront/components/category-catalog';
import {
  categories,
  categoryCampaigns,
  money,
  products,
  photo,
  slugify,
} from '@/features/storefront/data/catalog';

export function generateStaticParams() {
  return categories.map((category) => ({ category: slugify(category.name) }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const match = categories.find((item) => slugify(item.name) === category);
  return {
    title: match ? `${match.name} | AURA Mall` : 'Category not found',
    description: match
      ? `Shop curated ${match.name.toLowerCase()} products at AURA Mall.`
      : undefined,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const current = categories.find((item) => slugify(item.name) === category);
  if (!current) notFound();
  const categoryProducts = products.filter(
    (product) => product.category === current.name,
  );
  const campaign = categoryCampaigns[current.name];
  const bestseller = [...categoryProducts].sort(
    (a, b) => b.reviews - a.reviews,
  )[0];
  return (
    <>
      <StoreHeader />
      <main className="category-page">
        <div className="breadcrumbs">
          <Link href="/">Home</Link>
          <ChevronRight size={13} />
          <span>{current.name}</span>
        </div>
        <section
          className="category-hero"
          style={{ background: current.color }}
        >
          <div>
            <span className="eyebrow">
              THE {current.name.toUpperCase()} COLLECTION
            </span>
            <h1>{current.name}</h1>
            <p>
              {current.subtitle}. Explore a considered edit of useful, beautiful
              finds made for everyday life.
            </p>
            <div>
              <a className="primary-button" href="#products">
                Shop this collection <ArrowRight size={17} />
              </a>
            </div>
          </div>
          <img
            src={photo(current.image, 900)}
            alt={`${current.name} collection`}
          />
        </section>
        <section className="category-campaign">
          <div>
            <span className="campaign-icon">
              <Sparkles size={18} />
            </span>
            <div>
              <span className="eyebrow">{campaign.kicker}</span>
              <h2>{campaign.headline}</h2>
              <p>{campaign.offer}</p>
            </div>
          </div>
          <Link
            href={`/p/${slugify(bestseller.name)}`}
            className="campaign-product"
          >
            <span>
              <Flame size={13} /> MOST POPULAR THIS MONTH
            </span>
            <strong>{bestseller.name}</strong>
            <small>
              {money(bestseller.price)} · {bestseller.reviews} reviews
            </small>
            <ArrowRight size={19} />
          </Link>
        </section>
        <section className="category-intro">
          <span>{String(categoryProducts.length).padStart(2, '0')}</span>
          <div>
            <p className="eyebrow">CURATED FOR YOU</p>
            <h2>Good choices, thoughtfully gathered.</h2>
          </div>
          <p>
            Explore verified demo picks with clear pricing, useful details and
            an easy route from discovery to checkout.
          </p>
        </section>
        <div id="products">
          <CategoryCatalog products={categoryProducts} />
        </div>
        <section className="category-cross-sell">
          <div>
            <span className="eyebrow">KEEP EXPLORING</span>
            <h2>More halls, more possibilities.</h2>
          </div>
          <div>
            {categories
              .filter((item) => item.name !== current.name)
              .slice(0, 3)
              .map((item) => (
                <Link key={item.name} href={`/c/${slugify(item.name)}`}>
                  <img src={photo(item.image, 350)} alt="" />
                  <span>
                    {item.name}
                    <ArrowRight size={15} />
                  </span>
                </Link>
              ))}
          </div>
        </section>
      </main>
    </>
  );
}
