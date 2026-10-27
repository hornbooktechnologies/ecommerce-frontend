'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { money, photo, type HeroSlide } from '../data/live-catalog';
import { useCatalog } from '../catalog-provider';
import styles from './monthly-hero.module.css';

export default function MonthlyHero() {
  const { products, configuration } = useCatalog();
  const hero = configuration.hero;
  // Existing stores retain automatic product slides until their first publication.
  // A deliberately disabled or empty published hero must not bring that fallback back.
  const slides: HeroSlide[] = hero ? hero.slides : products.slice(0, 3).map((product, index) => ({
    id: product.id, eyebrow: `DISCOVER ${configuration.store.tenantName.toUpperCase()}`,
    title: product.name, description: product.description || `Explore the ${product.brand} collection.`,
    imageUrl: product.image, altText: product.name, href: `/p/${product.slug}`,
    ctaLabel: 'EXPLORE PRODUCT', tone: (['sage', 'rose', 'sand'] as const)[index % 3],
    showPrice: true, product,
  }));
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (
      paused ||
      hero?.enabled === false ||
      hero?.autoplay === false ||
      slides.length < 2 ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const timer = window.setInterval(
      () => setActive((value) => (value + 1) % slides.length),
      (hero?.intervalSeconds || 6) * 1000,
    );
    return () => clearInterval(timer);
  }, [slides.length, paused, hero?.enabled, hero?.autoplay, hero?.intervalSeconds]);
  const slideIndex = active % slides.length;
  const slide = slides[slideIndex];
  if (hero && (!hero.enabled || !slide)) return null;
  if (!slide)
    return (
      <section className="empty-state">
        <h1>Welcome to {configuration.store.tenantName}</h1>
        <p>New products will appear here when they are published.</p>
      </section>
    );
  const move = (direction: number) =>
    setActive((value) => (value + direction + slides.length) % slides.length);
  return (
    <section
      className={`campaign-carousel campaign-${slide.tone} ${styles.hero}`}
      aria-roledescription="carousel"
      aria-label="Featured campaigns"
      onMouseEnter={() => setPaused(true)}
      onFocusCapture={(event) => {
        if (!(event.target as HTMLElement).closest('.campaign-playback'))
          setPaused(true);
      }}
    >
      <div className="campaign-copy">
        <span>{slide.eyebrow}</span>
        <h1>{slide.title}</h1>
        <p>{slide.description}</p>
        {slide.showPrice && slide.product && <div className="campaign-price">
          <strong>{money(slide.product.price)}</strong>
          {slide.product.mrp > slide.product.price && (
            <>
              <del>{money(slide.product.mrp)}</del>
              <b>{Math.round((1 - slide.product.price / slide.product.mrp) * 100)}% OFF</b>
            </>
          )}
        </div>}
        <Link href={slide.href}>
          {slide.ctaLabel} <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </div>
      <Link
        className="campaign-image"
        href={slide.href}
        aria-label={slide.ctaLabel + ': ' + slide.title}
      >
        <img
          src={photo(slide.imageUrl, 900)}
          alt={slide.altText}
          decoding="async"
          fetchPriority="high"
        />
        {slide.product && <span>
          <small>{slide.product.brand}</small>
          <strong>{slide.product.name}</strong>
          <b>{slide.product.inStock ? 'In stock' : 'Currently unavailable'}</b>
        </span>}
      </Link>
      {slides.length > 1 && (
        <>
          <button
            className="campaign-arrow campaign-prev"
            onClick={() => move(-1)}
            aria-label="Previous slide"
          >
            <ChevronLeft />
          </button>
          <button
            className="campaign-arrow campaign-next"
            onClick={() => move(1)}
            aria-label="Next slide"
          >
            <ChevronRight />
          </button>
          {hero?.autoplay !== false && <button
            className="campaign-playback"
            onClick={() => setPaused(!paused)}
          >
            {paused ? 'Play slideshow' : 'Pause slideshow'}
          </button>}
          <div className="campaign-dots">
            {slides.map((item, index) => (
              <button
                key={item.id}
                className={slideIndex === index ? 'active' : ''}
                onClick={() => setActive(index)}
                aria-label={`Show ${item.title}`}
                aria-current={slideIndex === index ? 'true' : undefined}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
