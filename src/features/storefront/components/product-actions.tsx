'use client';
/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Heart, ShoppingBag } from 'lucide-react';
import {
  money,
  photo,
  type ProductDetail,
  type Variant,
} from '../data/live-catalog';
import { useStore } from '../store';

export default function ProductActions({
  product,
}: {
  product: ProductDetail;
}) {
  const [offerId, setOfferId] = useState(product.offerId);
  const variant =
    product.variants.find((item) => item.offerId === offerId) ||
    product.variants[0];
  if (!variant) return <p>This product is currently unavailable.</p>;
  return (
    <SelectedProduct
      key={variant.offerId}
      product={product}
      variant={variant}
      onSelect={setOfferId}
    />
  );
}
function SelectedProduct({
  product,
  variant,
  onSelect,
}: {
  product: ProductDetail;
  variant: Variant;
  onSelect: (id: string) => void;
}) {
  const add = useStore((state) => state.add),
    toggleWish = useStore((state) => state.toggleWish);
  const saved = useStore((state) => state.wishlist.includes(product.id));
  const wishBusy = useStore((state) => state.wishBusy);
  const busy = useStore((state) => state.busy);
  const [quantity, setQuantity] = useState(variant.minimumOrderQuantity),
    [selectedImage, setSelectedImage] = useState(0),
    [added, setAdded] = useState(false);
  const images = product.images.filter(
    (image) =>
      (!image.variantId || image.variantId === variant.id) &&
      (!image.colorId || image.colorId === variant.colorId),
  );
  const gallery = images.length
    ? [...images].sort(
        (a, b) =>
          Number(b.role === 'PRIMARY') - Number(a.role === 'PRIMARY') ||
          a.sortOrder - b.sortOrder,
      )
    : [{ id: 'placeholder', url: '', alt: product.name }];
  const image = gallery[selectedImage] || gallery[0];
  const maximum = Math.min(
    variant.availableQuantity,
    variant.maximumOrderQuantity ?? variant.availableQuantity,
  );
  const inStock = maximum >= variant.minimumOrderQuantity;
  const aligned =
    Math.abs(
      (quantity - variant.minimumOrderQuantity) / variant.quantityStep -
        Math.round(
          (quantity - variant.minimumOrderQuantity) / variant.quantityStep,
        ),
    ) < 0.00001;
  const valid =
    Number.isFinite(quantity) &&
    quantity >= variant.minimumOrderQuantity &&
    quantity <= maximum &&
    aligned;
  return (
    <section className="product-overview">
      <div className="product-gallery">
        <div className="pdp-gallery-layout">
          <div className="pdp-thumb-rail">
            {gallery.map((item, index) => (
              <button
                key={item.id}
                className={selectedImage === index ? 'active' : ''}
                aria-label={`View image ${index + 1}`}
                aria-pressed={selectedImage === index}
                onClick={() => setSelectedImage(index)}
              >
                <img src={photo(item.url, 350)} alt={item.alt} />
              </button>
            ))}
          </div>
          <div
            className="product-main-image"
            style={{ background: product.color }}
          >
            <img src={photo(image.url, 900)} alt={image.alt} />
          </div>
        </div>
      </div>
      <div className="product-summary">
        <Link className="pdp-brand" href={`/c/${product.categorySlug}`}>
          {product.brand}
        </Link>
        <h1>{product.name}</h1>
        <p className="pdp-subtitle">{product.description}</p>
        <div className="product-rating-summary">
          {product.reviews > 0 ? (
            <a href="#reviews">
              {product.rating} stars · {product.reviews} published reviews
            </a>
          ) : (
            <span>No reviews yet</span>
          )}
        </div>
        <hr />
        <div className="product-price">
          <strong>{money(variant.price)}</strong>
          {variant.mrp > variant.price && (
            <>
              <del>MRP {money(variant.mrp)}</del>
              <span>
                {Math.round((1 - variant.price / variant.mrp) * 100)}% OFF
              </span>
            </>
          )}
        </div>
        <small>
          {product.includesTax
            ? 'Inclusive of taxes'
            : 'Taxes calculated at checkout'}
          {variant.soldByWeight ? ` · per ${variant.uom}` : ''}
        </small>
        <div className="purchase-panel">
          <div className="pdp-choice">
            <label htmlFor="product-variant">
              <strong>Select colour, size and seller</strong>
            </label>
            <select
              id="product-variant"
              className="live-variant-select"
              value={variant.offerId}
              onChange={(event) => onSelect(event.target.value)}
            >
              {product.variants.map((item) => (
                <option key={item.offerId} value={item.offerId}>
                  {[item.color, item.size, item.name, item.sellerName]
                    .filter(Boolean)
                    .join(' · ')}{' '}
                  — {money(item.price)}
                  {item.availableQuantity < item.minimumOrderQuantity
                    ? ' · Out of stock'
                    : ''}
                </option>
              ))}
            </select>
          </div>
          <p>
            <strong>{inStock ? 'In stock' : 'Currently unavailable'}</strong> ·
            SKU {variant.sku}
          </p>
          <label className="live-quantity">
            Quantity ({variant.uom})
            <input
              type="number"
              min={variant.minimumOrderQuantity}
              max={maximum}
              step={variant.quantityStep}
              value={Number.isFinite(quantity) ? quantity : ''}
              onChange={(event) => {
                setQuantity(event.target.valueAsNumber);
                setAdded(false);
              }}
              disabled={!inStock}
            />
          </label>
          {inStock && !valid && (
            <p role="alert">
              Select between {variant.minimumOrderQuantity} and {maximum}, in
              steps of {variant.quantityStep}.
            </p>
          )}
          <div className="live-purchase-actions">
            <button
              className="primary-button"
              disabled={!inStock || !valid || busy}
              onClick={async () => {
                try {
                const previousQuantity =
                  useStore.getState().cart[variant.offerId] || 0;
                await add(
                  {
                    ...product,
                    offerId: variant.offerId,
                    variantId: variant.id,
                    sku: variant.sku,
                    name: `${product.name} · ${variant.name}`,
                    price: variant.price,
                    mrp: variant.mrp,
                    image: image.url,
                    availableQuantity: maximum,
                    minimumOrderQuantity: variant.minimumOrderQuantity,
                    quantityStep: variant.quantityStep,
                    sellerName: variant.sellerName,
                    inStock,
                  },
                  quantity,
                );
                const nextQuantity =
                  useStore.getState().cart[variant.offerId] || 0;
                if (nextQuantity > previousQuantity) {
                  setAdded(true);
                  toast.success('Added to your bag', {
                    id: `bag-${variant.offerId}`,
                    description: `${product.name} · ${variant.name}`,
                  });
                } else {
                  toast.info(
                    'You already have the maximum available quantity in your bag.',
                    {
                      id: `bag-${variant.offerId}`,
                    },
                  );
                }
                } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to update your bag.'); }
              }}
            >
              <ShoppingBag size={18} />
              {busy ? 'Updating bag…' : added ? 'Added to bag' : 'Add to bag'}
            </button>
            <button
              className="outline-button"
              aria-pressed={saved}
              disabled={wishBusy}
              onClick={() => toggleWish(product)}
            >
              <Heart size={18} fill={saved ? 'currentColor' : 'none'} />
              {saved ? 'Saved' : 'Save'}
            </button>
          </div>
          {added && (
            <p>
              <Link href="/cart">View your bag</Link> · Stock and price will
              need confirmation at checkout.
            </p>
          )}
        </div>
        <section className="seller-card">
          <div>
            <small>SOLD BY</small>
            <strong>{variant.sellerName}</strong>
          </div>
        </section>
        <p>
          {product.isReturnable
            ? `Returns eligible within ${product.returnWindowDays} days, subject to the store policy.`
            : 'This item is not returnable.'}
        </p>
        {variant.warrantyMonths > 0 && (
          <p>{variant.warrantyMonths}-month warranty</p>
        )}
      </div>
    </section>
  );
}
