/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { ArrowRight, BadgePercent, Flame, Sparkles } from 'lucide-react';
import {
  categories,
  photo,
  products,
  slugify,
} from '@/features/storefront/data/catalog';
import ProductCard from '@/features/storefront/components/product-card';

function Shelf({
  title,
  subtitle,
  icon,
  items,
  id,
}: {
  title: string;
  subtitle: string;
  icon: 'deal' | 'hot' | 'new';
  items: typeof products;
  id?: string;
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
        <a href="#discover">
          View all <ArrowRight size={16} />
        </a>
      </div>
      <div className="shelf-products">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

export default function MarketplaceSections() {
  const deals = [...products]
    .sort((a, b) => (b.mrp - b.price) / b.mrp - (a.mrp - a.price) / a.mrp)
    .slice(0, 6);
  const loved = [...products].sort((a, b) => b.reviews - a.reviews).slice(0, 6);
  const fresh = products
    .filter((product) => product.tag.includes('NEW') || product.id > 25)
    .slice(0, 6);
  return (
    <>
      <section
        className="quick-categories"
        aria-label="Shop popular categories"
      >
        {categories.map((category) => (
          <Link
            prefetch
            key={category.name}
            href={`/c/${slugify(category.name)}`}
          >
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
        title="Most loved right now"
        subtitle="Thousands bought these this month"
        icon="hot"
        items={loved}
      />
      <section className="brand-promise">
        <div>
          <strong>ORIGINAL</strong>
          <span>100% genuine brands</span>
        </div>
        <div>
          <strong>QUICK</strong>
          <span>Reliable doorstep delivery</span>
        </div>
        <div>
          <strong>EASY</strong>
          <span>Simple returns & exchanges</span>
        </div>
        <div>
          <strong>REWARDING</strong>
          <span>Offers every time you shop</span>
        </div>
      </section>
      <Shelf
        title="Fresh on AURA"
        subtitle="Just landed"
        icon="new"
        items={fresh}
      />
    </>
  );
}
