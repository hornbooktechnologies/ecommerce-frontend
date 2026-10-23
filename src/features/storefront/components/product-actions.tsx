'use client';
import { useEffect, useState } from 'react';
import {
  Check,
  ChevronRight,
  Heart,
  MapPin,
  Minus,
  Plus,
  ShoppingBag,
  Zap,
} from 'lucide-react';
import { useStore } from '@/features/storefront/store';

const fashionCategories = new Set(['Fashion', 'Sports & Outdoors']);
export default function ProductActions({
  id,
  category,
}: {
  id: number;
  category: string;
}) {
  const add = useStore((state) => state.add);
  const toggle = useStore((state) => state.toggleWish);
  const saved = useStore((state) => state.wishlist.includes(id));
  const sizes = fashionCategories.has(category)
    ? ['S', 'M', 'L', 'XL']
    : category === 'Home & Living'
      ? ['Single', 'Pair', 'Set of 4']
      : ['Standard', 'Premium', 'Gift ready'];
  const [added, setAdded] = useState(false),
    [variant, setVariant] = useState(sizes[0]),
    [colour, setColour] = useState('Natural'),
    [pin, setPin] = useState(''),
    [delivery, setDelivery] = useState(''),
    [quantity, setQuantity] = useState(1);
  useEffect(() => {
    useStore.persist.rehydrate();
  }, []);
  const addSelected = () => {
    for (let index = 0; index < quantity; index++) add(id);
    setAdded(true);
  };
  return (
    <div className="purchase-panel">
      <div className="pdp-choice">
        <div>
          <strong>Select option</strong>
          {fashionCategories.has(category) ? (
            <button>
              Size chart <ChevronRight size={13} />
            </button>
          ) : null}
        </div>
        <div className="variant-row">
          {sizes.map((option) => (
            <button
              className={variant === option ? 'active' : ''}
              key={option}
              onClick={() => setVariant(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <div className="pdp-choice">
        <div>
          <strong>Colour</strong>
          <span>{colour}</span>
        </div>
        <div className="colour-row">
          {[
            ['Natural', '#d8c9ad'],
            ['Sage', '#7c8c73'],
            ['Charcoal', '#414641'],
          ].map(([name, value]) => (
            <button
              aria-label={`Choose ${name}`}
              className={colour === name ? 'active' : ''}
              key={name}
              style={{ background: value }}
              onClick={() => setColour(name)}
            >
              <Check size={12} />
            </button>
          ))}
        </div>
      </div>
      <div className="quantity-buy">
        <div className="quantity">
          <button
            aria-label="Decrease quantity"
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
          >
            <Minus size={14} />
          </button>
          <span>{quantity}</span>
          <button
            aria-label="Increase quantity"
            onClick={() => setQuantity((value) => Math.min(5, value + 1))}
          >
            <Plus size={14} />
          </button>
        </div>
        <span>In stock · ready to dispatch</span>
      </div>
      <div className="product-action-buttons">
        <button className="pdp-cart-button" onClick={addSelected}>
          <ShoppingBag size={18} />
          {added ? 'Added to cart' : 'Add to cart'}
        </button>
        <button className="pdp-buy-button" onClick={addSelected}>
          <Zap size={18} fill="currentColor" />
          Buy now
        </button>
        <button
          className={`pdp-wish-button ${saved ? 'saved' : ''}`}
          aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
          onClick={() => toggle(id)}
        >
          <Heart size={19} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <form
        className="delivery-check"
        onSubmit={(event) => {
          event.preventDefault();
          setDelivery(
            pin.length === 6
              ? 'Delivery available in 3–5 days · Free delivery'
              : 'Enter a valid 6-digit PIN code',
          );
        }}
      >
        <MapPin size={17} />
        <input
          aria-label="Delivery PIN code"
          placeholder="Enter delivery PIN code"
          value={pin}
          inputMode="numeric"
          maxLength={6}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
        />
        <button>CHECK</button>
      </form>
      {delivery ? (
        <p className="delivery-result">
          <Check size={14} />
          {delivery}
        </p>
      ) : null}
      <div className="mobile-buy-bar">
        <div>
          <small>Selected: {variant}</small>
          <strong>{added ? 'Added to cart' : 'Ready to order'}</strong>
        </div>
        <button onClick={addSelected}>
          <ShoppingBag size={17} /> Add to cart
        </button>
      </div>
    </div>
  );
}
