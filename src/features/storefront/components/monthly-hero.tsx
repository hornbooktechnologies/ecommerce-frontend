'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import {
  money,
  photo,
  products,
  slugify,
} from '@/features/storefront/data/catalog';

const slides = [
  {
    product: products[0],
    image: '/images/campaign-headphones-v2.webp',
    eyebrow: 'OCTOBER TECH EVENT',
    title: 'Switch off the noise.',
    accent: 'Turn up your world.',
    copy: 'Our most-loved wireless headphones are now at their best price of the month.',
    offer: '50% OFF',
    theme: 'sage',
  },
  {
    product: products[1],
    image: '/images/campaign-fashion-v2.webp',
    eyebrow: 'THE NEW-SEASON EDIT',
    title: 'Everyday style.',
    accent: 'Extraordinary prices.',
    copy: 'Fresh fashion favourites made for repeat wear, with limited-time savings.',
    offer: 'UP TO 40% OFF',
    theme: 'rose',
  },
  {
    product: products[2],
    image: '/images/campaign-home-v2.webp',
    eyebrow: 'HOME REFRESH DAYS',
    title: 'A calmer home',
    accent: 'starts right here.',
    copy: 'Bring thoughtful comfort home with our top-rated Nordic collection.',
    offer: 'SAVE ₹4,500',
    theme: 'sand',
  },
];

export default function MonthlyHero() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(
      () => setActive((value) => (value + 1) % slides.length),
      6000,
    );
    return () => window.clearInterval(timer);
  }, []);
  const slide = slides[active];
  const move = (direction: number) =>
    setActive((value) => (value + direction + slides.length) % slides.length);
  return (
    <section
      className={`campaign-carousel campaign-${slide.theme}`}
      aria-roledescription="carousel"
      aria-label="Featured offers"
    >
      <div className="campaign-copy">
        <span>{slide.eyebrow}</span>
        <h1>
          {slide.title}
          <br />
          <em>{slide.accent}</em>
        </h1>
        <p>{slide.copy}</p>
        <div className="campaign-price">
          <strong>{money(slide.product.price)}</strong>
          <del>{money(slide.product.mrp)}</del>
          <b>{slide.offer}</b>
        </div>
        <Link href={`/p/${slugify(slide.product.name)}`}>
          SHOP THIS PRODUCT <ArrowRight size={17} />
        </Link>
        <div className="campaign-trust">
          <span>
            <Truck size={14} /> Free delivery
          </span>
          <span>
            <ShieldCheck size={14} /> Easy returns
          </span>
        </div>
      </div>
      <Link
        prefetch
        className="campaign-image"
        href={`/p/${slugify(slide.product.name)}`}
        aria-label={`Shop ${slide.product.name}`}
      >
        <img
          key={slide.product.id}
          src={slide.image || photo(slide.product.image, 900)}
          alt={slide.product.name}
          decoding="async"
        />
        <span>
          <small>FEATURED FIND</small>
          <strong>{slide.product.name}</strong>
          <b>{slide.product.rating} ★</b>
        </span>
      </Link>
      <button
        className="campaign-arrow campaign-prev"
        onClick={() => move(-1)}
        aria-label="Previous offer"
      >
        <ChevronLeft />
      </button>
      <button
        className="campaign-arrow campaign-next"
        onClick={() => move(1)}
        aria-label="Next offer"
      >
        <ChevronRight />
      </button>
      <div className="campaign-dots">
        {slides.map((item, index) => (
          <button
            key={item.product.id}
            className={active === index ? 'active' : ''}
            onClick={() => setActive(index)}
            aria-label={`Show offer ${index + 1}`}
            aria-current={active === index ? 'true' : undefined}
          />
        ))}
      </div>
    </section>
  );
}
