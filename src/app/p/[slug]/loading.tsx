import { Skeleton } from '@/components/ui/skeleton';
export default function ProductLoading() {
  return (
    <main className="route-loading" aria-label="Loading product">
      <Skeleton className="loading-crumb" />
      <section className="loading-product">
        <Skeleton className="loading-media" />
        <div className="loading-copy">
          <Skeleton />
          <Skeleton />
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      </section>
    </main>
  );
}
