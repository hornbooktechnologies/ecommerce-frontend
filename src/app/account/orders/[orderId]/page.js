import { notFound } from 'next/navigation';
import OrdersPage from '@/features/storefront/components/orders-page';

export default async function Order({ params }) {
  const { orderId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) notFound();
  return <OrdersPage key={orderId} orderId={orderId} />;
}
