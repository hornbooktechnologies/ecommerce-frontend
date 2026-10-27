import Link from 'next/link';
import StoreHeader from '@/features/storefront/components/store-header';
import CategoryCatalog from '@/features/storefront/components/category-catalog';
import styles from './products.module.css';

export const metadata = {
  title: 'All products | Hornbook Retail',
  description: 'Explore the Hornbook Retail collection. Filter by brand, price and availability, and find your next favourite.',
  alternates: { canonical: '/products' },
};

export default function ProductsPage() {
  return <>
    <StoreHeader />
    <main className="category-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">All products</span>
      </nav>
      <header className={styles.heading}>
        <p className="eyebrow">THE HORNBOOK COLLECTION</p>
        <h1>All products.</h1>
        <p>Every good find, in one place. Explore the collection and make it yours.</p>
      </header>
      <CategoryCatalog category="" />
    </main>
  </>;
}
