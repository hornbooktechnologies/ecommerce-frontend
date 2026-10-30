'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  ArrowUpRight,
  Search,
  ShoppingBag,
  Heart,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Plus,
  Truck,
  ShieldCheck,
  RotateCcw,
  Headphones,
  Shirt,
  Sofa,
  Bike,
  Apple,
  Blocks,
  BookOpen,
  Menu,
  Check,
  Mail,
  UserRound,
  Package,
} from 'lucide-react';
import { photo, money, slugify } from '@/features/storefront/data/live-catalog';
import { useCatalog } from '@/features/storefront/catalog-provider';
import CatalogResults from './catalog-results';
import { useStore } from '@/features/storefront/store';
import MonthlyHero from '@/features/storefront/components/monthly-hero';
import MarketplaceSections from '@/features/storefront/components/marketplace-sections';
import SearchExperience from '@/features/storefront/components/search-experience';
import customerNavigation from './customer-navigation.module.css';
import { useCustomerSummary } from '../use-customer-summary';
import DeliveryChecker from './delivery-checker';
import headerStyles from './homepage-header.module.css';
import CustomerInbox from './customer-inbox';
const icons = [
  Shirt,
  Headphones,
  Sofa,
  Sparkles,
  Bike,
  Apple,
  Blocks,
  BookOpen,
];
export default function Storefront() {
  const customer = useCustomerSummary();
  const { categories, products } = useCatalog();
  const [category, setCategory] = useState('All categories'),
    [query, setQuery] = useState(''),
    [tab, setTab] = useState('Trending now'),
    [sort, setSort] = useState('popular'),
    [newsletter, setNewsletter] = useState(false),
    [menu, setMenu] = useState(false),
    [headerMenu, setHeaderMenu] = useState<'account' | 'orders' | null>(null);
  const router = useRouter();
  const store = useStore();
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    useStore.persist.rehydrate();
  }, []);
  const browse = (name: string) => {
    if (name !== 'All categories') {
      router.push(
        `/c/${categories.find((item) => item.name.toLowerCase() === name.toLowerCase())?.slug || slugify(name)}`,
      );
      return;
    }
    setCategory(name);
    setMenu(false);
    setTimeout(
      () =>
        document
          .getElementById('discover')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      50,
    );
  };
  let shown = products.filter(
    (p) =>
      (category === 'All categories' || p.category === category) &&
      `${p.name} ${p.category} ${p.brand}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  if (tab === 'New arrivals')
    shown = shown.filter((p) => p.tag === 'NEW ARRIVAL');
  if (tab === 'Best deals')
    shown = shown.filter((p) => (p.mrp - p.price) / p.mrp > 0.32);
  if (tab === 'Top rated') shown = shown.filter((p) => Number(p.rating) >= 4.8);
  shown = [...shown].sort((a, b) =>
    sort === 'low'
      ? a.price - b.price
      : sort === 'high'
        ? b.price - a.price
        : sort === 'rating'
          ? Number(b.rating) - Number(a.rating)
          : 0,
  );
  const count = Object.values(store.cart).reduce((a, b) => a + b, 0);
  return (
    <>
      <header className={`header ${headerStyles.header}`}>
        <Link href="/" className="logo" aria-label="Hornbook Retail home">
          <span className="logo-symbol">a</span>
          <span>
            HORNBOOK<span className="logo-mall">RETAIL</span>
          </span>
        </Link>
        <DeliveryChecker />
        <div className="enhanced-search-slot">
          <SearchExperience
            query={query}
            setQuery={setQuery}
            category={category}
            setCategory={setCategory}
            onShowAll={() => browse(category)}
          />
        </div>
        <div className="search">
          <select
            aria-label="Search category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option>All categories</option>
            {categories.map((c) => (
              <option key={c.name}>{c.name}</option>
            ))}
          </select>
          <input
            ref={searchRef}
            aria-label="Search all products"
            placeholder="Search products, brands and categories"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter')
                document
                  .getElementById('discover')
                  ?.scrollIntoView({ behavior: 'smooth' });
            }}
          />
          <button aria-label="Submit search">
            <Search size={20} />
          </button>
          {query && (
            <div className="search-suggestions">
              <small>{shown.length} matching products</small>
              {shown.slice(0, 4).map((p) => (
                <Link key={p.id} href={`/p/${p.slug}`}>
                  <img src={photo(p.image, 80)} alt="" />
                  <span>
                    {p.name}
                    <small>{p.category}</small>
                  </span>
                  <strong>{money(p.price)}</strong>
                </Link>
              ))}
              <button onClick={() => browse(category)}>
                See all search results <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>
        <div className="header-menu-wrap">
          <button
            className="header-action account-action"
            aria-expanded={headerMenu === 'account'}
            onClick={() =>
              setHeaderMenu(headerMenu === 'account' ? null : 'account')
            }
          >
            <UserRound size={20} />
            <span>
              <small>{customer.email ? `Hello, ${customer.firstName}` : 'Hello, sign in'}</small>Account
            </span>
            <ChevronDown size={12} />
          </button>
          {headerMenu === 'account' ? (
            <div className="header-popover account-popover">
              <strong>Welcome to Hornbook Retail</strong>
              <p>Manage your profile, password and saved addresses.</p>
              <button
                className="popover-primary"
                onClick={() => {
                  setHeaderMenu(null);
                  router.push(customer.email ? '/account' : '/account/login');
                }}
              >
                {customer.email ? 'Your account' : 'Sign in'}
              </button>
              {!customer.email && <span>
                New customer?{' '}
                <button
                  onClick={() => router.push('/account/register')}
                >
                  Create account
                </button>
              </span>}
              <hr />
              <button onClick={() => router.push('/account')}>My profile & addresses</button>
              <Link href="/account/orders" onClick={() => setHeaderMenu(null)}>My orders</Link>
              <Link href="/wishlist">My wishlist</Link>
            </div>
          ) : null}
        </div>
        <div className="header-menu-wrap orders-action">
          <button
            className="header-action"
            aria-expanded={headerMenu === 'orders'}
            onClick={() =>
              setHeaderMenu(headerMenu === 'orders' ? null : 'orders')
            }
          >
            <Package size={20} />
            <span>
              <small>Returns</small>& Orders
            </span>
            <ChevronDown size={12} />
          </button>
          {headerMenu === 'orders' ? (
            <div className="header-popover orders-popover">
              <strong>Your purchases</strong>
              <p>View your purchases and recorded fulfilment updates.</p>
              <Link
                className="popover-primary"
                href="/account/orders"
                onClick={() => setHeaderMenu(null)}
              >
                View all orders
              </Link>
              <hr />
              <Link href="/account/orders" onClick={() => setHeaderMenu(null)}>Track a package</Link>
            </div>
          ) : null}
        </div>
        <Link className={`header-action ${customerNavigation.desktopWishlist}`} href="/wishlist" aria-label={`Wishlist, ${store.wishlist.length} saved products`}>
          <Heart size={21} />
          <span>Wishlist</span>
          {store.wishlist.length > 0 && <b>{store.wishlist.length}</b>}
        </Link>
        <Link className={customerNavigation.mobileAccount} href="/account" aria-label="Your account"><UserRound size={20} /><span>Account</span></Link>
        <CustomerInbox customerId={customer.id} />
        <Link className="header-action trolley" href="/cart">
          <ShoppingBag size={21} />
          <span>Cart</span>
          <b>{count}</b>
        </Link>
      </header>
      <nav className="navigation">
        <div className="nav-links">
          <button
            className="all-categories"
            onClick={() => setMenu(!menu)}
            aria-expanded={menu}
          >
            <Menu size={16} /> All categories <ChevronDown size={12} />
          </button>
          <Link className={customerNavigation.mobileAccount} href="/wishlist" aria-label={`Wishlist, ${store.wishlist.length} saved products`}><Heart size={17} aria-hidden="true" /><span>Wishlist ({store.wishlist.length})</span></Link>
          <button onClick={() => browse('Fashion')}>Fashion</button>
          <button onClick={() => browse('Electronics')}>Electronics</button>
          <button onClick={() => browse('Home & Living')}>Home & Living</button>
          <button onClick={() => browse('Beauty')}>Beauty</button>
          <button
            onClick={() => {
              setTab('New arrivals');
              browse('All categories');
            }}
          >
            New arrivals <i />
          </button>
          <button
            className="deals-link"
            onClick={() => {
              setTab('Best deals');
              browse('All categories');
            }}
          >
            Today’s deals
          </button>
        </div>
        {menu && (
          <div className="category-menu">
            {categories.map((c, i) => {
              const Icon = icons[i] || ShoppingBag;
              return (
                <button key={c.name} onClick={() => browse(c.name)}>
                  <Icon size={17} />
                  {c.name}
                  <ChevronRight size={14} />
                </button>
              );
            })}
          </div>
        )}
      </nav>
      <main>
        <MonthlyHero />
        <MarketplaceSections />
        <section className="hero">
          <div className="hero-copy">
            <div className="hero-eyebrow">
              <span /> YOUR NEXT GREAT FIND STARTS HERE
            </div>
            <h1>
              Not just shopping.
              <br />A world to <em>explore.</em>
            </h1>
            <p>
              Discover things you’ll love, from brands you’ll love.
              <br className="desktop-break" /> All your favourites. One
              extraordinary mall.
            </p>
            <div className="hero-buttons">
              <button
                className="primary-button"
                onClick={() =>
                  document
                    .getElementById('categories')
                    ?.scrollIntoView({ behavior: 'smooth' })
                }
              >
                <Sparkles size={18} /> Explore categories{' '}
                <ArrowRight size={18} />
              </button>
              <button
                className="text-button"
                onClick={() => browse('All categories')}
              >
                Explore products <ArrowRight size={17} />
              </button>
            </div>
            <div className="hero-footnote">
              <span className="mini-avatars">
                <img
                  alt=""
                  src={photo('photo-1534528741775-53994a69daeb', 60)}
                />
                <img
                  alt=""
                  src={photo('photo-1506794778202-cad84cf45f1d', 60)}
                />
                <img
                  alt=""
                  src={photo('photo-1500648767791-00dcc994a43e', 60)}
                />
              </span>
              <span>
                <span className="tiny-stars">★★★★★</span>
                <br />A little discovery. A lot of delight.
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <img
              className="hero-room"
              src={photo('photo-1600210492486-724fe5c67fb0', 1500)}
              alt="Beautiful sunlit living room with curved furniture and natural textures"
              fetchPriority="high"
            />
            <div className="visual-shade" />
            <span className="live-label">
              <span /> CURATED FOR YOU
            </span>
            <button
              className="room-pin pin-one"
              aria-label="Explore Nordic chair"
              onClick={() =>
                products[2] && router.push(`/p/${products[2].slug}`)
              }
              disabled={!products[2]}
            >
              <Plus size={16} />
            </button>
            <button
              className="room-pin pin-two"
              aria-label="Explore home decor"
              onClick={() => browse('Home & Living')}
            >
              <Plus size={16} />
            </button>
            <div className="floating-room">
              <span className="room-cube">
                <Sparkles size={23} />
              </span>
              <div>
                <small>DISCOVER SOMETHING NEW</small>
                <strong>The Home & Living Collection</strong>
                <span>Thoughtfully curated. Beautifully yours.</span>
              </div>
              <button
                aria-label="Browse home and living"
                onClick={() => browse('Home & Living')}
              >
                <ArrowUpRight size={21} />
              </button>
            </div>
            <span className="visual-caption">
              EXPLORE. DISCOVER. MAKE IT YOURS.
            </span>
          </div>
        </section>
        <div className="benefits">
          <span>
            <Truck size={18} />
            <strong>Free shipping</strong>
            <small>on orders over ₹999</small>
          </span>
          <span>
            <ShieldCheck size={18} />
            <strong>100% authentic</strong>
            <small>brands you can trust</small>
          </span>
          <span>
            <RotateCcw size={18} />
            <strong>Easy returns</strong>
            <small>within 7 days</small>
          </span>
          <span>
            <Headphones size={18} />
            <strong>Here to help</strong>
            <small>every step of the way</small>
          </span>
        </div>
        <section className="categories-section" id="categories">
          <div className="section-heading">
            <div>
              <span className="eyebrow">SO MANY WAYS TO FIND YOUR THING</span>
              <h2>
                A hall for every interest<span>.</span>
              </h2>
            </div>
            <button
              className="text-button"
              onClick={() => browse('All categories')}
            >
              Explore all categories <ArrowRight size={16} />
            </button>
          </div>
          <div className="category-grid">
            {categories.map((c, i) => {
              const Icon = icons[i] || ShoppingBag;
              return (
                <Link
                  className="category-card"
                  key={c.name}
                  href={`/c/${c.slug}`}
                >
                  <div
                    className="category-image"
                    style={{ background: c.color }}
                  >
                    <img src={photo(c.image, 350)} alt="" loading="lazy" />
                    <span>
                      <Icon size={18} />
                    </span>
                  </div>
                  <h3>{c.name}</h3>
                  <p>{c.subtitle}</p>
                </Link>
              );
            })}
          </div>
        </section>
        <section className="discover-section" id="discover">
          <div className="section-heading">
            <div>
              <span className="eyebrow">GOOD FINDS. GREAT FEELING.</span>
              <h2>
                {category === 'All categories'
                  ? 'Your next favourite is here'
                  : category}
                <span>.</span>
              </h2>
            </div>
            <Link className="text-button" href="/products">
              View all products <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className="product-toolbar">
            <div className="tabs">
              {['Trending now', 'New arrivals', 'Best deals', 'Top rated'].map(
                (t) => (
                  <button
                    className={tab === t ? 'active' : ''}
                    key={t}
                    onClick={() => setTab(t)}
                  >
                    {t === 'Trending now' && <Sparkles size={14} />} {t}
                  </button>
                ),
              )}
            </div>
            <label className="sort">
              Sort by:{' '}
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="popular">Recommended</option>
                <option value="low">Price: low to high</option>
                <option value="high">Price: high to low</option>
                <option value="rating">Highest rated</option>
              </select>
            </label>
          </div>
          {query && (
            <p className="search-summary">
              {shown.length} results for “{query}”{' '}
              <button onClick={() => setQuery('')}>Clear search</button>
            </p>
          )}
          <CatalogResults
            filters={{
              search: query,
              category: categories.find((item) => item.name === category)?.slug,
              sort:
                sort === 'low'
                  ? 'price_asc'
                  : sort === 'high'
                    ? 'price_desc'
                    : sort === 'rating' || tab === 'Top rated'
                      ? 'rating'
                      : tab === 'New arrivals'
                        ? 'newest'
                        : 'featured',
              minDiscount: tab === 'Best deals' ? 20 : undefined,
              minRating: tab === 'Top rated' ? 4 : undefined,
            }}
          />
        </section>
        <section className="editorial-banner">
          <div>
            <span className="eyebrow">LESS SCROLLING. MORE DISCOVERING.</span>
            <h2>
              Your favourite mall.
              <br />
              Now, a little closer.
            </h2>
            <p>Browse curated collections and discover a better way to shop.</p>
            <button
              className="primary-button"
              onClick={() =>
                document
                  .getElementById('categories')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              Browse collections <ArrowUpRight size={17} />
            </button>
          </div>
          <div className="editorial-art">
            <Sparkles size={110} strokeWidth={0.6} />
            <span>THE HORNBOOK EDIT</span>
          </div>
          <span className="banner-number">01 / ∞</span>
        </section>
        <section className="newsletter">
          <div>
            <Mail size={27} />
            <div>
              <h3>Good things. In your inbox.</h3>
              <p>New finds, fresh collections and a little inspiration.</p>
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setNewsletter(true);
            }}
          >
            {newsletter ? (
              <span className="subscribed">
                <Check size={18} /> You’re on the demo list. Stay curious!
              </span>
            ) : (
              <>
                <input
                  required
                  type="email"
                  aria-label="Your email address"
                  placeholder="Enter your email address"
                />
                <button aria-label="Join newsletter">
                  <ArrowRight size={20} />
                </button>
              </>
            )}
          </form>
        </section>
      </main>
      <footer>
        <Link className="logo" href="/">
          <span className="logo-symbol">a</span>
          <span>
            HORNBOOK<span className="logo-mall">RETAIL</span>
          </span>
        </Link>
        <p>A world of wonderful, all in one place.</p>
        <span>
          © {new Date().getFullYear()} Hornbook Retail · Storefront preview
        </span>
        <span className="footer-note">
          <ShieldCheck size={14} /> Thoughtfully made for everyday discovery
        </span>
      </footer>
    </>
  );
}
