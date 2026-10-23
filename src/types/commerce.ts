export type ObjectId = string;
export type ISODateString = string;
export type UserRole = 'CUSTOMER';
export type ThemePreset =
  'marketplace' | 'fashion' | 'minimal-boutique' | 'electronics' | 'grocery';
export type LayoutVariant = 'mega-menu' | 'simple' | 'centered-logo';
export type ProductCardVariant = 'compact' | 'image-first' | 'detailed';
export type SortDirection = 'asc' | 'desc';

export interface MongoDocument {
  _id: ObjectId;
  tenantId: ObjectId;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}
export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
export interface ListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDirection?: SortDirection;
}

export interface ThemeTokens {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  success: string;
  danger: string;
  radius: string;
  fontFamily: string;
  buttonStyle: 'solid' | 'soft' | 'outline';
  cardStyle: 'flat' | 'bordered' | 'elevated';
  shadow: string;
  spacingDensity: 'compact' | 'comfortable' | 'spacious';
}
export interface TenantFeatures {
  marketplace: boolean;
  multiLanguage: boolean;
  customDomain: boolean;
  apiAccess: boolean;
  reviews: boolean;
  compare: boolean;
  wishlist: boolean;
  emi: boolean;
}
export type HomepageSectionType =
  | 'hero'
  | 'categories'
  | 'deal-countdown'
  | 'flash-sale'
  | 'trending'
  | 'new-arrivals'
  | 'brands'
  | 'banner-grid'
  | 'recently-viewed'
  | 'recommended'
  | 'testimonials'
  | 'newsletter'
  | 'custom-html';
export interface HomepageSection {
  id: string;
  type: HomepageSectionType;
  title?: string;
  visible: boolean;
  order: number;
  settings: Record<string, string | number | boolean | string[]>;
}
export interface Tenant extends MongoDocument {
  slug: string;
  name: string;
  domain: string;
  logo: string;
  preset: ThemePreset;
  tokens: ThemeTokens;
  headerVariant: LayoutVariant;
  productCardVariant: ProductCardVariant;
  gridDensity: 2 | 3 | 4 | 5 | 6;
  footerVariant: 'columns' | 'compact' | 'editorial';
  currency: string;
  defaultLanguage: 'en' | 'hi';
  enabledLanguages: Array<'en' | 'hi'>;
  features: TenantFeatures;
  homepageSections: HomepageSection[];
}

export interface Category extends MongoDocument {
  name: string;
  slug: string;
  description: string;
  image: string;
  parentId: ObjectId | null;
  position: number;
  isActive: boolean;
  attributes: string[];
}
export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  type: 'image' | 'video';
}
export interface ProductVariant {
  _id: ObjectId;
  sku: string;
  title: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  options: Record<string, string>;
  imageId?: string;
}
export interface Product extends MongoDocument {
  name: string;
  slug: string;
  sku: string;
  brand: string;
  categoryId: ObjectId;
  categoryName: string;
  description: string;
  highlights: string[];
  images: ProductImage[];
  variants: ProductVariant[];
  rating: number;
  reviewCount: number;
  tags: string[];
  specifications: Record<string, string>;
  sellerId?: ObjectId;
  isActive: boolean;
  isFeatured: boolean;
  seo: { title: string; description: string; keywords: string[] };
}
export interface ProductFilters {
  categoryId?: ObjectId;
  brands?: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  minDiscount?: number;
  sizes?: string[];
  colours?: string[];
  inStock?: boolean;
  attributes?: Record<string, string[]>;
}
export interface ProductQuery extends ListQuery {
  filters?: ProductFilters;
}

export interface CartLine {
  productId: ObjectId;
  variantId: ObjectId;
  quantity: number;
  unitPrice: number;
}
export interface Cart extends MongoDocument {
  customerId?: ObjectId;
  sessionId?: string;
  items: CartLine[];
  couponCode?: string;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
}
export type OrderStatus =
  | 'PLACED'
  | 'CONFIRMED'
  | 'PACKED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED';
export interface Address {
  _id: ObjectId;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
}
export interface Order extends MongoDocument {
  orderNumber: string;
  customerId: ObjectId;
  items: CartLine[];
  address: Address;
  status: OrderStatus;
  paymentMethod: 'UPI' | 'CARD' | 'NETBANKING' | 'COD';
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  timeline: Array<{ status: OrderStatus; at: ISODateString; note: string }>;
}
export interface User extends MongoDocument {
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatar?: string;
  addresses: Address[];
  walletBalance: number;
  points: number;
}
export interface AuthSession {
  token: string;
  user: User;
  expiresAt: ISODateString;
}
export interface Coupon extends MongoDocument {
  code: string;
  description: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  minOrder: number;
  maxDiscount?: number;
  startsAt: ISODateString;
  endsAt: ISODateString;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
}
export interface Review extends MongoDocument {
  productId: ObjectId;
  customerId: ObjectId;
  customerName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  body: string;
  images: string[];
  verifiedPurchase: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  helpfulCount: number;
}
