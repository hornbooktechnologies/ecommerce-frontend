import CheckoutPage from '@/features/storefront/components/checkout-page';
export default async function Checkout({ searchParams }) {
  const params = await searchParams;
  const attempt = typeof params.attempt === 'string' && /^[0-9a-f-]{36}$/i.test(params.attempt) ? params.attempt : '';
  return <CheckoutPage attempt={attempt} />;
}
