import AccountPage from '@/features/storefront/components/account-page';
import { notFound } from 'next/navigation';

export const metadata = { title: 'Your account | Hornbook Retail', robots: { index: false, follow: false }, referrer: 'no-referrer' };
export default async function Page({ params }) {
  const { screen = [] } = await params;
  const mode = screen[0] || 'profile';
  if (screen.length > 1 || !['profile', 'login', 'register', 'forgot-password', 'reset-password', 'verify'].includes(mode)) notFound();
  return <AccountPage key={mode} mode={mode} />;
}
