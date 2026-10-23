'use client';
/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { Heart, Plus, Star } from 'lucide-react';
import {
  money,
  photo,
  slugify,
  type Product,
} from '@/features/storefront/data/catalog';
import { useStore } from '@/features/storefront/store';

export default function ProductCard({ product }: { product: Product }) {
  const add = useStore((state) => state.add);
  const toggleWish = useStore((state) => state.toggleWish);
  const saved = useStore((state) => state.wishlist.includes(product.id));
  const href = `/p/${slugify(product.name)}`;
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
          onClick={() => toggleWish(product.id)}
        >
          <Heart size={17} fill={saved ? 'currentColor' : 'none'} />
        </button>
        <button className="quick-add" onClick={() => add(product.id)}>
          <Plus size={15} /> Add to trolley
        </button>
      </div>
      <div className="product-info">
        <small>{product.brand}</small>
        <Link prefetch className="product-title" href={href}>
          {product.name}
        </Link>
        <div className="rating">
          <Star size={12} fill="currentColor" />{' '}
          <strong>{product.rating}</strong>
          <span>({product.reviews})</span>
        </div>
        <div className="price">
          <strong>{money(product.price)}</strong>
          <del>{money(product.mrp)}</del>
          <span>
            {Math.round((1 - product.price / product.mrp) * 100)}% off
          </span>
        </div>
      </div>
    </article>
  );
}
