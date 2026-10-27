'use client';
export default function StoreError({ reset }: { reset: () => void }) {
  return (
    <main className="empty-state" role="alert">
      <h1>We couldn’t load this page</h1>
      <p>Please try again. Your shopping bag has not changed.</p>
      <button className="outline-button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
