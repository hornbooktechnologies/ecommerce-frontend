'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  Search,
  TrendingUp,
  X,
} from 'lucide-react';
import { money, photo } from '@/features/storefront/data/live-catalog';
import {
  useCatalog,
  useCatalogQuery,
} from '@/features/storefront/catalog-provider';

const STORAGE_KEY = 'aura-recent-searches-v1';
const popular = [
  'wireless headphones',
  'new fashion',
  'skincare',
  'home décor',
];
function score(text: string, query: string) {
  const source = text.toLowerCase(),
    term = query.toLowerCase().trim();
  if (!term) return 1;
  if (source.startsWith(term)) return 4;
  if (source.includes(term)) return 3;
  let index = 0;
  for (const char of source) if (char === term[index]) index++;
  return index === term.length ? 1 : 0;
}
function readRecent() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as string[];
  } catch {
    return [];
  }
}

export default function SearchExperience({
  query,
  setQuery,
  category,
  setCategory,
  onShowAll,
}: {
  query: string;
  setQuery: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  onShowAll: () => void;
}) {
  const { categories } = useCatalog();
  const results = useCatalogQuery({
    search: query,
    category: categories.find((item) => item.name === category)?.slug,
    pageSize: 6,
  });
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>(readRecent);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    const outside = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setCategoryOpen(false);
      }
    };
    window.addEventListener('keydown', shortcut);
    document.addEventListener('pointerdown', outside);
    return () => {
      window.removeEventListener('keydown', shortcut);
      document.removeEventListener('pointerdown', outside);
    };
  }, []);
  const matches = results.data?.items || [];
  const categoryMatches = categories
    .filter(
      (item) =>
        !query ||
        score(`${item.name} ${item.subtitle}`, query) > 0 ||
        matches.some((product) => product.category === item.name),
    )
    .slice(0, 4);
  function remember(value: string) {
    const clean = value.trim();
    if (!clean) return;
    const next = [clean, ...recent.filter((item) => item !== clean)].slice(
      0,
      5,
    );
    setRecent(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  function submit() {
    if (!query.trim()) return;
    remember(query);
    setOpen(false);
    onShowAll();
  }
  function choose(value: string) {
    setQuery(value);
    remember(value);
    setOpen(false);
    setTimeout(onShowAll, 0);
  }
  return (
    <div
      ref={containerRef}
      className={`search commerce-search ${open || categoryOpen ? 'search-open' : ''}`}
    >
      <div className="search-category-control">
        <button
          type="button"
          aria-label="Search category"
          aria-expanded={categoryOpen}
          onClick={() => {
            setCategoryOpen((value) => !value);
            setOpen(false);
          }}
        >
          <span>{category}</span>
          <ChevronDown size={14} />
        </button>
        {categoryOpen ? (
          <div className="search-category-menu" role="menu">
            {['All categories', ...categories.map((item) => item.name)].map(
              (item) => (
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={category === item}
                  key={item}
                  onClick={() => {
                    setCategory(item);
                    setCategoryOpen(false);
                    inputRef.current?.focus();
                  }}
                >
                  {item}
                  {category === item ? <Check size={14} /> : null}
                </button>
              ),
            )}
          </div>
        ) : null}
      </div>
      <Search className="search-leading" size={18} />
      <input
        ref={inputRef}
        aria-label="Search all products"
        placeholder="Search for products, brands and categories"
        value={query}
        onFocus={() => {
          setOpen(true);
          setCategoryOpen(false);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') submit();
          if (event.key === 'Escape') {
            setOpen(false);
            setCategoryOpen(false);
          }
        }}
        autoComplete="off"
      />
      {query ? (
        <button
          className="search-clear"
          aria-label="Clear search"
          onClick={() => setQuery('')}
        >
          <X size={16} />
        </button>
      ) : null}
      <button
        className="search-submit"
        aria-label="Submit search"
        onClick={submit}
      >
        <Search size={20} />
      </button>
      {open ? (
        <div className="search-panel">
          <div className="search-panel-head">
            <span>
              {query
                ? `Suggestions for “${query}”`
                : 'What are you looking for?'}
            </span>
            <small>{category}</small>
          </div>
          {!query && recent.length > 0 ? (
            <section className="suggestion-group">
              <h3>
                <Clock3 size={14} /> Recent searches{' '}
                <button
                  onClick={() => {
                    setRecent([]);
                    localStorage.removeItem(STORAGE_KEY);
                  }}
                >
                  Clear
                </button>
              </h3>
              <div className="search-chips">
                {recent.map((item) => (
                  <button key={item} onClick={() => choose(item)}>
                    {item}
                  </button>
                ))}
              </div>
            </section>
          ) : null}
          {!query ? (
            <section className="suggestion-group">
              <h3>
                <TrendingUp size={14} /> Popular right now
              </h3>
              <div className="popular-searches">
                {popular.map((item, index) => (
                  <button key={item} onClick={() => choose(item)}>
                    <b>{String(index + 1).padStart(2, '0')}</b>
                    <span>
                      {item}
                      <small>Popular search</small>
                    </span>
                    <ArrowRight size={14} />
                  </button>
                ))}
              </div>
            </section>
          ) : null}
          {categoryMatches.length > 0 ? (
            <section className="suggestion-group category-suggestions">
              <h3>SHOP BY CATEGORY</h3>
              {categoryMatches.map((item) => (
                <Link key={item.name} href={`/c/${item.slug}`}>
                  <span>
                    <Search size={13} />
                    {query || item.name} <small>in {item.name}</small>
                  </span>
                  <ArrowRight size={13} />
                </Link>
              ))}
            </section>
          ) : null}
          {query ? (
            <section className="suggestion-group product-suggestions">
              <h3>
                TOP PRODUCT MATCHES <small>{matches.length} found</small>
              </h3>
              {matches.map((product) => {
                const href = `/p/${product.slug}`;
                return (
                  <Link
                    href={href}
                    key={product.id}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      remember(query);
                      router.push(href);
                    }}
                  >
                    <img src={photo(product.image, 150)} alt="" />
                    <span>
                      <small>{product.brand}</small>
                      <strong>{product.name}</strong>
                      <em>{product.category}</em>
                    </span>
                    <span className="suggestion-price">
                      <b>{money(product.price)}</b>
                      <del>{money(product.mrp)}</del>
                    </span>
                  </Link>
                );
              })}
              {results.loading && <p role="status">Searching products…</p>}
              {results.error && (
                <p role="alert">
                  {results.error}{' '}
                  <button onClick={results.retry}>Try again</button>
                </p>
              )}
              {!results.loading && !results.error && matches.length === 0 ? (
                <div className="no-suggestions">
                  <Search size={22} />
                  <span>
                    <strong>No exact matches</strong>
                    <small>Try a product type, brand or category.</small>
                  </span>
                </div>
              ) : null}
            </section>
          ) : null}
          {query ? (
            <button
              className="search-all"
              onMouseDown={(event) => event.preventDefault()}
              onClick={submit}
            >
              View all results for “{query}” <ArrowRight size={16} />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
