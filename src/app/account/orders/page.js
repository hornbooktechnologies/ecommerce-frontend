import OrdersPage from '@/features/storefront/components/orders-page';

export default async function Orders({ searchParams }) {
  const params = await searchParams;
  const parsed = typeof params.page === 'string' ? Number(params.page) : 1;
  const page = Number.isInteger(parsed) && parsed > 0 && parsed <= 100000 ? parsed : 1;
  return <OrdersPage key={page} page={page} />;
}
