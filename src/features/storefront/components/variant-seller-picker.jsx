'use client';

import { useId } from 'react';
import { Check } from 'lucide-react';
import { money } from '../data/live-catalog';
import styles from './variant-seller-picker.module.css';

const colourKey = (item) => item.colorId || item.color || '__unspecified__';
const sellerKey = (item) => item.sellerId || item.sellerName;
const available = (item) => Math.min(item.availableQuantity, item.maximumOrderQuantity ?? item.availableQuantity) >= item.minimumOrderQuantity;
const uniqueBy = (items, key) => [...new Map(items.map((item) => [key(item), item])).values()];

// Deterministic on server and client. Only accept solid admin-defined hex colours;
// missing/invalid values keep the neutral labelled control rather than inventing a shade.
function colourStyle(value) {
  if (typeof value !== 'string' || !/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value.trim())) return undefined;
  const hex = value.trim().slice(1);
  const full = hex.length === 3 ? [...hex].map((digit) => digit + digit).join('') : hex;
  const channels = full.match(/../g).map((channel) => {
    const srgb = parseInt(channel, 16) / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  const blackContrast = (luminance + 0.05) / 0.05;
  const whiteContrast = 1.05 / (luminance + 0.05);
  return { '--swatch-fill': `#${full}`, '--swatch-ink': blackContrast >= whiteContrast ? '#000000' : '#ffffff' };
}

export default function VariantSellerPicker({ variants, selected, onSelect, disabled = false }) {
  const id = useId();
  const physical = uniqueBy(variants, (item) => item.id);
  const colours = uniqueBy(physical, colourKey);
  const inColour = physical.filter((item) => colourKey(item) === colourKey(selected));
  const sizes = uniqueBy(inColour, (item) => item.size || '');
  const configurations = inColour.filter((item) => (item.size || '') === (selected.size || ''));
  const offers = variants.filter((item) => item.id === selected.id)
    .slice().sort((a, b) => a.price - b.price || a.offerId.localeCompare(b.offerId));
  function choose(candidates) {
    const next = candidates.slice().sort((a, b) => Number(available(b)) - Number(available(a))
      || Number(sellerKey(b) === sellerKey(selected)) - Number(sellerKey(a) === sellerKey(selected))
      || a.price - b.price || a.offerId.localeCompare(b.offerId))[0];
    if (next) onSelect(next.offerId);
  }
  return <div className={styles.picker}>
    {colours.some((item) => item.color) ? <fieldset className={styles.axis} disabled={disabled}>
      <legend>Colour <strong>{selected.color || 'Not specified'}</strong></legend>
      <div className={styles.choices}>{colours.map((colour) => {
        const swatch = colourStyle(colour.colorSwatch);
        return <button type="button" key={colourKey(colour)} className={styles.colourChoice}
        style={swatch} data-swatch={swatch ? 'true' : undefined}
        aria-pressed={colourKey(colour) === colourKey(selected)}
        onClick={() => {
          const matches = variants.filter((item) => colourKey(item) === colourKey(colour));
          const sameSize = matches.filter((item) => (item.size || '') === (selected.size || ''));
          choose(sameSize.length ? sameSize : matches);
        }}><Check className={styles.colourCheck} aria-hidden="true" size={15} strokeWidth={2.5} /><span>{colour.color || 'Not specified'}</span></button>;
      })}</div>
    </fieldset> : null}
    {sizes.some((item) => item.size) ? <fieldset className={styles.axis} disabled={disabled}>
      <legend>Size <strong>{selected.size || 'Not specified'}</strong></legend>
      <div className={styles.choices}>{sizes.map((size) => <button type="button" key={size.size || '__unspecified__'} aria-pressed={(size.size || '') === (selected.size || '')}
        onClick={() => choose(variants.filter((item) => colourKey(item) === colourKey(selected) && (item.size || '') === (size.size || '')))}>{size.size || 'Not specified'}</button>)}</div>
    </fieldset> : null}
    {configurations.length > 1 ? <label className={styles.configuration} htmlFor={`${id}-configuration`}><span>Product option</span>
      <select id={`${id}-configuration`} value={selected.id} disabled={disabled} onChange={(event) => choose(variants.filter((item) => item.id === event.target.value))}>
        {configurations.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.sku}</option>)}
      </select>
    </label> : null}
    <fieldset className={styles.sellers} disabled={disabled} aria-describedby={`${id}-help`}>
      <legend>{offers.length > 1 ? `Compare ${offers.length} seller offers` : 'Seller offer'}</legend>
      <p className={styles.hint}>Offers below are for the same selected colour, size and product option.</p>
      <div className={styles.offerList}>{offers.map((offer) => {
        const canBuy = available(offer), active = offer.offerId === selected.offerId;
        return <label className={styles.offer} key={offer.offerId} data-selected={active || undefined} data-unavailable={!canBuy || undefined}>
          <input className={styles.radio} type="radio" name={`${id}-seller`} value={offer.offerId} checked={active} disabled={disabled || !canBuy} onChange={() => onSelect(offer.offerId)} />
          <span className={styles.identity}><strong>{offer.sellerName || 'Store seller'}</strong><span>{canBuy ? 'In stock' : 'Currently unavailable'}{active ? ' · Selected' : ''}</span></span>
          <span className={styles.price}><strong>{money(offer.price)}</strong>{offer.mrp > offer.price ? <del>MRP {money(offer.mrp)}</del> : null}<span>{offer.includesTax ? 'Includes tax' : 'Tax at checkout'}</span>{offer.soldByWeight ? <span>per {offer.uom}</span> : null}</span>
        </label>;
      })}</div>
      <p id={`${id}-help`} className={styles.hint}>Your chosen seller is added to the bag. Stock and prices are checked again by the server; changing colour or size may select a different eligible seller.</p>
    </fieldset>
    <p className={styles.selection} role="status">Selected: {[selected.color, selected.size, selected.name].filter(Boolean).join(' · ')} — {selected.sellerName} — {money(selected.price)}</p>
  </div>;
}
