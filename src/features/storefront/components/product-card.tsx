'use client';
/* eslint-disable @next/next/no-img-element */
import {useLocalization as useUiLocalization} from '@/localization/provider';
import Link from 'next/link';
import { Heart, Plus, Star } from 'lucide-react';
import { photo, type Product } from '@/features/storefront/data/live-catalog';
import { useStore } from '@/features/storefront/store';
import styles from './product-card.module.css';
import { CompareButton } from './product-comparison';

export default function ProductCard({ product }: { product: Product }) {
 const {t: _uiText,money: _localizedMoney}=useUiLocalization();

  const toggleWish = useStore((state) => state.toggleWish);
  const saved = useStore((state) => state.wishlist.includes(product.id));
  const wishBusy = useStore((state) => state.wishBusy);
  const href = `/p/${product.slug}?offer=${encodeURIComponent(product.offerId)}`;
  const hasPriceReduction = Number.isFinite(product.price) && Number.isFinite(product.mrp)
    && product.price >= 0 && product.mrp > 0 && product.mrp > product.price;
  const discountPercent = hasPriceReduction ? Math.round((1 - product.price / product.mrp) * 100) : 0;
  const configuredTag = product.tag?.trim() || '';
  // Percentage badges describe this offer's current price, not an old marketing value.
  const isDiscountTag = /^\d+(?:\.\d+)?\s*%\s*off$/i.test(configuredTag);
  const badgeText = isDiscountTag ? (discountPercent > 0 ? `${discountPercent}% OFF` : '') : configuredTag;
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
        {badgeText && <span
          className={`product-tag ${isDiscountTag ? 'sale' : ''}`}
        >
          {badgeText}
        </span>}
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
          {product.inStock ? _uiText("Choose options") : _uiText("View unavailable item")}
        </Link>
      </div>
      <div className="product-info">
        <small>{product.brand}</small>
        {(product.matchedColor || product.matchedSize) && <p className={styles.variant}>{[product.matchedColor, product.matchedSize].filter(Boolean).join(' / ')}</p>}
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
          <div className="rating rating-empty">{_uiText("No reviews yet")}</div>
        )}
        <div className="price">
          <strong>{_localizedMoney(product.price)}</strong>
          {hasPriceReduction && (
            <>
              <del>{_localizedMoney(product.mrp)}</del>
              {discountPercent > 0 && <span>{discountPercent}% off</span>}
            </>
          )}
        </div>
        <CompareButton product={product} />
      </div>
    </article>
  );
}
