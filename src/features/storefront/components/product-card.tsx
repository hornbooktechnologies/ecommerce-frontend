'use client';
/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { Heart, Plus, Star } from 'lucide-react';
import {
  money,
  photo,
  type Product,
} from '@/features/storefront/data/live-catalog';
import { useStore } from '@/features/storefront/store';

export default function ProductCard({ product }: { product: Product }) {
  const toggleWish = useStore((state) => state.toggleWish);
  const saved = useStore((state) => state.wishlist.includes(product.id));
  const wishBusy = useStore((state) => state.wishBusy);
  const href = `/p/${product.slug}`;
  return (
    <article className="product-card">
      <div className="product-image" style={{ background: product.color }}>
        <Link
          prefetch
          className="product-open"
          href={href}
          aria-label={`View ${product.name}`}
        >
          <img
            src={photo(product.image, 600)}
            alt={product.name}
            loading="lazy"
            decoding="async"
          />
        </Link>
        <span
          className={`product-tag ${product.tag.includes('OFF') ? 'sale' : ''}`}
        >
          {product.tag}
        </span>
        <button
          className={`wish-button ${saved ? 'saved' : ''}`}
          aria-label={`${saved ? 'Remove from' : 'Add to'} wishlist: ${product.name}`}
          aria-pressed={saved}
          disabled={wishBusy}
          onClick={() => toggleWish(product)}
        >
          <Heart size={17} fill={saved ? 'currentColor' : 'none'} />
        </button>
        <Link className="quick-add" href={href}>
          <Plus size={15} />{' '}
          {product.inStock ? 'Choose options' : 'View unavailable item'}
        </Link>
      </div>
      <div className="product-info">
        <small>{product.brand}</small>
        <Link prefetch className="product-title" href={href}>
          {product.name}
        </Link>
        {product.reviews > 0 ? (
          <div className="rating">
            <Star size={12} fill="currentColor" />{' '}
            <strong>{product.rating}</strong>
            <span>({product.reviews})</span>
          </div>
        ) : (
          <div className="rating rating-empty">No reviews yet</div>
        )}
        <div className="price">
          <strong>{money(product.price)}</strong>
          {product.mrp > product.price && (
            <>
              <del>{money(product.mrp)}</del>
              <span>
                {Math.round((1 - product.price / product.mrp) * 100)}% off
              </span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
