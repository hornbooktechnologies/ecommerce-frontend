/* eslint-disable @next/next/no-img-element */
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getConfiguration } from '@/features/storefront/server-catalog';
import { photo } from '@/features/storefront/data/live-catalog';
import StoreHeader from '@/features/storefront/components/store-header';
import CategoryCatalog from '@/features/storefront/components/category-catalog';

async function load(slug: string) {
  const config = await getConfiguration();
  const category = config.categories.find((item) => item.slug === slug);
  if (!category) notFound();
  return category;
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const category = await load((await params).category);
  return {
    title: `${category.name} | Hornbook Retail`,
    description: category.subtitle,
  };
}
export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const category = await load((await params).category);
  return (
    <>
      <StoreHeader />
      <main className="category-page">
        <nav className="breadcrumbs">
          <Link href="/">Home</Link>
          <span>/</span>
          <span>{category.name}</span>
        </nav>
        <header className="live-category-hero">
          <div>
            <p className="eyebrow">THE HORNBOOK COLLECTION</p>
            <h1>{category.name}</h1>
            <p>
              {category.subtitle} · {category.count} products
            </p>
          </div>
          <img src={photo(category.image)} alt="" />
        </header>
        <CategoryCatalog category={category.slug} />
      </main>
    </>
  );
}
