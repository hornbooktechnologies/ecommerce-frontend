export type Product = {
  id: string;
  slug: string;
  productCode: string;
  name: string;
  brand: string;
  brandId: string | null;
  category: string;
  categorySlug: string;
  price: number;
  mrp: number;
  currency: string;
  image: string;
  color: string;
  tag: string;
  rating: string;
  reviews: number;
  description: string;
  offerId: string;
  variantId: string;
  sku: string;
  sellerName: string;
  inStock: boolean;
  availableQuantity: number;
  minimumOrderQuantity: number;
  quantityStep: number;
  includesTax: boolean;
  isReturnable: boolean;
  returnWindowDays: number;
};
export type Category = {
  id: string;
  name: string;
  slug: string;
  image: string;
  color: string;
  subtitle: string;
  count: number;
};
export type Configuration = {
  store: { name: string; tenantName: string; code: string; currency: string };
  categories: Category[];
  brands: { id: string; name: string; count: number }[];
  hero?: HeroConfiguration | null;
  homepageSections?: { sections: HomepageSection[] } | null;
};
export type HomepageSection = {
  key: 'DEALS' | 'DISCOVER' | 'FRESH'; title: string; subtitle: string;
  viewAllHref: string; viewAllLabel: string; items: Product[];
} | {
  key: 'BANNER'; title: string; subtitle: string; eyebrow: string; badgeText: string;
  imageUrl: string; altText: string; href: string; ctaLabel: string;
};
export type HeroSlide = {
  id: string; eyebrow: string; title: string; description: string;
  imageUrl: string; altText: string; href: string; ctaLabel: string;
  tone: 'sage' | 'rose' | 'sand'; showPrice: boolean;
  product: Pick<Product, 'name' | 'brand' | 'price' | 'mrp' | 'inStock'> | null;
};
export type HeroConfiguration = {
  enabled: boolean; autoplay: boolean; intervalSeconds: number; slides: HeroSlide[];
};
export type ProductList = {
  items: Product[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
export type Variant = {
  id: string;
  offerId: string;
  name: string;
  sku: string;
  colorId: string | null;
  color: string;
  size: string;
  price: number;
  mrp: number;
  sellerName: string;
  availableQuantity: number;
  minimumOrderQuantity: number;
  maximumOrderQuantity: number | null;
  quantityStep: number;
  soldByWeight: boolean;
  uom: string;
  warrantyMonths: number;
};
export type ProductDetail = Product & {
  variants: Variant[];
  images: {
    id: string;
    url: string;
    alt: string;
    variantId: string | null;
    colorId: string | null;
    role: string;
    sortOrder: number;
  }[];
  specifications: Record<string, string>;
  reviewsList: {
    id: string;
    rating: number;
    title: string;
    body: string;
    name: string;
    verifiedPurchase: boolean;
    date: string;
  }[];
};
export type Filters = Record<string, string | number | boolean | undefined>;
export const money = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);
export const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
export function photo(value: string, width = 700) {
  if (/^https?:\/\//i.test(value) || value.startsWith('/')) return value;
  if (!value) return '/catalog-placeholder.svg';
  return `/images/${value}${width <= 350 ? '-thumb' : width <= 900 ? '-card' : ''}.webp`;
}
export function queryString(filters: Filters) {
  return new URLSearchParams(
    Object.entries(filters)
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([key, value]) => [key, String(value)]),
  ).toString();
}
