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
  MapPin,
  ChevronDown,
  ChevronRight,
  Sparkles,
  X,
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
import {
  categories,
  products,
  photo,
  money,
  slugify,
  type Product,
} from '@/features/storefront/data/catalog';
import { useStore } from '@/features/storefront/store';
import ProductCard from '@/features/storefront/components/product-card';
import MonthlyHero from '@/features/storefront/components/monthly-hero';
import ReviewWall from '@/features/storefront/components/review-wall';
import MarketplaceSections from '@/features/storefront/components/marketplace-sections';
import SearchExperience from '@/features/storefront/components/search-experience';
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
  const [category, setCategory] = useState('All categories'),
    [query, setQuery] = useState(''),
    [tab, setTab] = useState('Trending now'),
    [sort, setSort] = useState('popular'),
    [panel, setPanel] = useState<'wishlist' | 'location' | null>(null),
    [toast, setToast] = useState(''),
    [location, setLocation] = useState('Select location'),
    [newsletter, setNewsletter] = useState(false),
    [menu, setMenu] = useState(false),
    [headerMenu, setHeaderMenu] = useState<'account' | 'orders' | null>(null),
    [showAll, setShowAll] = useState(false);
  const router = useRouter();
  const store = useStore();
  const dialog = useRef<HTMLDialogElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    useStore.persist.rehydrate();
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);
  useEffect(() => {
    if (panel) {
      dialog.current?.showModal();
    } else {
      dialog.current?.close();
    }
  }, [panel]);
  const notify = (s: string) => {
    setToast(s);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3000);
  };
  const add = (p: Product) => {
    store.add(p.id);
    notify(`${p.name} added to your trolley`);
  };
  const browse = (name: string) => {
    if (name !== 'All categories') {
      router.push(`/c/${slugify(name)}`);
      return;
    }
    setCategory(name);
    setMenu(false);
    setShowAll(true);
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
    shown = shown.filter((p) => p.tag === 'NEW ARRIVAL' || p.id > 6);
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
  const close = () => {
    setPanel(null);
  };
  return (
    <>
      <div className="enhanced-search-slot">
        <SearchExperience
          query={query}
          setQuery={setQuery}
          category={category}
          setCategory={setCategory}
          onShowAll={() => browse(category)}
        />
      </div>
      <header className="header">
        <Link href="/" className="logo" aria-label="Aura Mall home">
          <span className="logo-symbol">a</span>
          <span>
            AURA<span className="logo-mall">MALL</span>
          </span>
        </Link>
        <button className="location" onClick={() => setPanel('location')}>
          <MapPin size={19} />
          <span>
            <small>Deliver to</small>
            {location}
          </span>
          <ChevronDown size={13} />
        </button>
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
                <Link key={p.id} href={`/p/${slugify(p.name)}`}>
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
              <small>Hello, sign in</small>Account
            </span>
            <ChevronDown size={12} />
          </button>
          {headerMenu === 'account' ? (
            <div className="header-popover account-popover">
              <strong>Welcome to AURA</strong>
              <p>Sign in to see your orders, saved addresses and rewards.</p>
              <button
                className="popover-primary"
                onClick={() => {
                  setHeaderMenu(null);
                  notify('Sign-in experience is ready for the account phase');
                }}
              >
                Sign in
              </button>
              <span>
                New customer?{' '}
                <button
                  onClick={() => notify('Account creation will open here')}
                >
                  Create account
                </button>
              </span>
              <hr />
              <button>My profile</button>
              <button onClick={() => setPanel('wishlist')}>My wishlist</button>
              <button>AURA rewards</button>
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
              <p>Track deliveries, download invoices or start a return.</p>
              <button
                className="popover-primary"
                onClick={() => notify('Sign in to view your orders')}
              >
                View all orders
              </button>
              <hr />
              <button>Track a package</button>
              <button>Returns & exchanges</button>
              <button>Help with an order</button>
            </div>
          ) : null}
        </div>
        <button className="header-action" onClick={() => setPanel('wishlist')}>
          <Heart size={21} />
          <span>Wishlist</span>
          {store.wishlist.length > 0 && <b>{store.wishlist.length}</b>}
        </button>
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
              const Icon = icons[i];
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
              onClick={() => router.push(`/p/${slugify(products[2].name)}`)}
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
              const Icon = icons[i];
              return (
                <Link
                  className="category-card"
                  key={c.name}
                  href={`/c/${slugify(c.name)}`}
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
            <button
              className="text-button"
              onClick={() => {
                setCategory('All categories');
                setTab('Trending now');
                setQuery('');
                setShowAll(true);
              }}
            >
              View all products <ArrowRight size={16} />
            </button>
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
          <div className="product-grid">
            {shown
              .slice(
                0,
                !showAll && category === 'All categories' && !query ? 5 : 20,
              )
              .map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
          </div>
          {shown.length === 0 && (
            <div className="empty-state">
              <Search size={30} />
              <h3>No finds just yet</h3>
              <p>Try another search or explore a different category.</p>
              <button
                className="primary-button"
                onClick={() => {
                  setQuery('');
                  setCategory('All categories');
                  setTab('Trending now');
                }}
              >
                Show all products
              </button>
            </div>
          )}
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
            <span>THE AURA EDIT</span>
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
        <ReviewWall />
      </main>
      <footer>
        <Link className="logo" href="/">
          <span className="logo-symbol">a</span>
          <span>
            AURA<span className="logo-mall">MALL</span>
          </span>
        </Link>
        <p>A world of wonderful, all in one place.</p>
        <span>© {new Date().getFullYear()} Aura Mall · Demo storefront</span>
        <span className="footer-note">
          <ShieldCheck size={14} /> Thoughtfully made for everyday discovery
        </span>
      </footer>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
      <dialog
        ref={dialog}
        onCancel={close}
        onClick={(e) => {
          if (e.target === dialog.current) close();
        }}
        className="modal"
        aria-label={panel || 'Shopping dialog'}
      >
        <button
          className="close-modal"
          onClick={close}
          aria-label="Close dialog"
        >
          <X size={21} />
        </button>
        {panel === 'location' && (
          <>
            <span className="eyebrow">A LITTLE CLOSER TO YOU</span>
            <h2>Where are we delivering?</h2>
            <p>Enter your Indian PIN code to personalise your visit.</p>
            <form
              className="stack-form"
              onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                setLocation(String(data.get('pin')));
                close();
                notify(
                  'Location saved. Availability is confirmed at checkout.',
                );
              }}
            >
              <input
                name="pin"
                aria-label="Six digit PIN code"
                placeholder="6-digit PIN code"
                pattern="[1-9][0-9]{5}"
                inputMode="numeric"
                maxLength={6}
                required
              />
              <button className="primary-button">
                Save location <ArrowRight size={17} />
              </button>
            </form>
          </>
        )}
        {panel === 'wishlist' && (
          <>
            <span className="eyebrow">KEEP THE GOOD FINDS CLOSE</span>
            <h2>
              Your wishlist <span>({store.wishlist.length})</span>
            </h2>
            {!store.wishlist.length ? (
              <div className="empty-state">
                <Heart size={35} />
                <h3>A little room for your favourites</h3>
                <p>Tap the heart on a product to save it here.</p>
              </div>
            ) : (
              products
                .filter((p) => store.wishlist.includes(p.id))
                .map((p) => (
                  <div className="cart-item" key={p.id}>
                    <img src={photo(p.image, 150)} alt={p.name} />
                    <div>
                      <strong>{p.name}</strong>
                      <span>{money(p.price)}</span>
                      <button onClick={() => add(p)}>
                        Add to trolley <Plus size={13} />
                      </button>
                    </div>
                    <button
                      aria-label={`Remove ${p.name} from wishlist`}
                      onClick={() => store.toggleWish(p.id)}
                    >
                      <X size={17} />
                    </button>
                  </div>
                ))
            )}
          </>
        )}
      </dialog>
    </>
  );
}
