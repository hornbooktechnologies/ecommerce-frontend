import { ProductCardSkeleton, Skeleton } from '@/components/ui/skeleton';
export default function CategoryLoading() {
  return (
    <main className="route-loading" aria-label="Loading category">
      <Skeleton className="loading-crumb" />
      <Skeleton className="loading-banner" />
      <div className="loading-grid">
        {Array.from({ length: 8 }, (_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    </main>
  );
}
