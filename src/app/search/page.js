import { redirect } from 'next/navigation';

// Keep older shopping links useful without dropping query/filter selections.
export default async function SearchPage({ searchParams }) {
  const input = await searchParams;
  const params = new URLSearchParams();
  for (const key of ['search','category','brand','brands','colors','sizes','minPrice','maxPrice','minRating','minDiscount','inStock','sort','page']) {
    const value = input[key] ?? (key === 'search' ? input.q : undefined);
    if (typeof value === 'string') params.set(key,value);
  }
  redirect(`/products${params.size ? `?${params}` : ''}`);
}
