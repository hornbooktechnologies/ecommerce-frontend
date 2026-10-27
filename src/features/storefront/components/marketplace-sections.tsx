/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { ArrowRight, BadgePercent, Flame, Sparkles } from 'lucide-react';
import { photo, type Product, type HomepageSection } from '@/features/storefront/data/live-catalog';
import { useCatalog } from '@/features/storefront/catalog-provider';
import ProductCard from '@/features/storefront/components/product-card';
import styles from './managed-sections.module.css';

function Shelf({
  title,
  subtitle,
  icon,
  items,
  id,
  href = '#discover',
  linkLabel = 'View all',
}: {
  title: string;
  subtitle: string;
  icon: 'deal' | 'hot' | 'new';
  items: Product[];
  id?: string;
  href?: string;
  linkLabel?: string;
}) {
  const Icon =
    icon === 'deal' ? BadgePercent : icon === 'hot' ? Flame : Sparkles;
  return (
    <section className="market-shelf" id={id}>
      <div className="shelf-heading">
        <div>
          <span>
            <Icon size={17} />
            {subtitle}
          </span>
          <h2>{title}</h2>
        </div>
        {href && <Link href={href}>{linkLabel} <ArrowRight size={16} aria-hidden="true" /></Link>}
      </div>
      <div className="shelf-products">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

function BrandPromise() {
  return <section className="brand-promise">{[
    ['ORIGINAL', '100% genuine brands'], ['QUICK', 'Reliable doorstep delivery'],
    ['EASY', 'Simple returns & exchanges'], ['REWARDING', 'Offers every time you shop'],
  ].map(([title, description]) => <div key={title}><strong>{title}</strong><span>{description}</span></div>)}</section>;
}

function ManagedSections({ sections }: { sections: HomepageSection[] }) {
  return sections.map((section) => section.key === 'BANNER' ? (
    <section key={section.key} className={`fashion-banner ${styles.banner}`} data-homepage-section={section.key}>
      <div><span>{section.eyebrow}</span><h2>{section.title}</h2><p>{section.subtitle}</p>
        <Link href={section.href}>{section.ctaLabel}<ArrowRight size={16} aria-hidden="true" /></Link>
        {section.badgeText && <p className={styles.badge}>{section.badgeText}</p>}
      </div>
      <img src={photo(section.imageUrl, 1200)} alt={section.altText} loading="lazy" decoding="async" />
    </section>
  ) : (
    <div key={section.key} className={styles.shelf} data-homepage-section={section.key}>
      <Shelf id={section.key === 'DEALS' ? 'deal-zone' : undefined} title={section.title} subtitle={section.subtitle}
        icon={section.key === 'DEALS' ? 'deal' : section.key === 'FRESH' ? 'new' : 'hot'}
        items={section.items} href={section.viewAllHref} linkLabel={section.viewAllLabel} />
    </div>
  ));
}

export default function MarketplaceSections() {
  const { products, categories, configuration } = useCatalog();
  const deals = [...products]
    .sort((a, b) => (b.mrp - b.price) / b.mrp - (a.mrp - a.price) / a.mrp)
    .slice(0, 6);
  const loved = [...products].sort((a, b) => b.reviews - a.reviews).slice(0, 6);
  const fresh = products
    .filter((product) => product.tag.includes('NEW'))
    .slice(0, 6);
  return (
    <>
      <section
        className="quick-categories"
        aria-label="Shop popular categories"
      >
        {categories.map((category) => (
          <Link prefetch key={category.name} href={`/c/${category.slug}`}>
            <span>
              <img
                src={photo(category.image, 350)}
                alt=""
                loading="lazy"
                decoding="async"
              />
            </span>
            <strong>{category.name}</strong>
            <small>{category.subtitle}</small>
          </Link>
        ))}
      </section>
      {configuration.homepageSections ? <><ManagedSections sections={configuration.homepageSections.sections} /><BrandPromise /></> : <>
      <Shelf
        id="deal-zone"
        title="Blockbuster deals"
        subtitle="Prices drop. Excitement rises."
        icon="deal"
        items={deals}
      />
      <section className="fashion-banner">
        <div>
          <span>THE STYLE DROP · OCTOBER 2026</span>
          <h2>
            Quiet confidence.
            <br />
            Standout style.
          </h2>
          <p>
            New-season tailoring and everyday favourites in naturally easy
            tones.
          </p>
          <Link prefetch href="/c/fashion">
            EXPLORE THE EDIT <ArrowRight size={16} />
          </Link>
        </div>
        <img
          src="/images/campaign-fashion-v2.webp"
          alt="Neutral linen fashion collection"
          loading="lazy"
          decoding="async"
        />
        <div className="fashion-badge">
          <small>MINIMUM</small>
          <strong>30%</strong>
          <span>OFF</span>
        </div>
      </section>
      <Shelf
        title="More to discover"
        subtitle="Explore the collection"
        icon="hot"
        items={loved}
      />
      <BrandPromise />
      <Shelf
        title="Fresh at Hornbook"
        subtitle="Just landed"
        icon="new"
        items={fresh}
      />
      </>}
    </>
  );
}
