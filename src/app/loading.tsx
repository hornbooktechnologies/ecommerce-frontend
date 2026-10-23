import { ProductCardSkeleton, Skeleton } from '@/components/ui/skeleton';
export default function StoreLoading() {
  return (
    <main className="store-loading" aria-label="Loading storefront">
      <div className="loading-header">
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </div>
      <Skeleton className="loading-home-banner" />
      <div className="loading-category-row">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} />
        ))}
      </div>
      <div className="loading-shelf">
        <Skeleton className="loading-title" />
        <div>
          {Array.from({ length: 6 }, (_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      </div>
    </main>
  );
}
