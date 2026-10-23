export function Skeleton({
  className = '',
  label,
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={`skeleton ${className}`}
      role={label ? 'status' : undefined}
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function ProductCardSkeleton() {
  return (
    <article className="skeleton-card" aria-hidden="true">
      <Skeleton className="skeleton-card-image" />
      <div>
        <Skeleton className="skeleton-line skeleton-short" />
        <Skeleton className="skeleton-line" />
        <Skeleton className="skeleton-line skeleton-medium" />
      </div>
    </article>
  );
}
