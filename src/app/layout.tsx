import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import './globals.css';
import { CatalogProvider } from '@/features/storefront/catalog-provider';
import CartSession from '@/features/storefront/components/cart-session';
import {
  getConfiguration,
  getProducts,
} from '@/features/storefront/server-catalog';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001',
  ),
  title: 'Hornbook Retail — A world to explore',
  description:
    'Discover products, brands and collections from Hornbook Retail.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [configuration, products] = await Promise.all([
    getConfiguration(),
    getProducts({ pageSize: 40 }),
  ]);
  return (
    <html lang="en">
      {/* Browser extensions can add body attributes before React hydrates. */}
      <body suppressHydrationWarning>
        <CatalogProvider
          configuration={configuration}
          products={products.items}
        >
          {children}
          <CartSession />
        </CatalogProvider>
        <Toaster
          style={{ fontFamily: 'inherit' }}
          position="bottom-right"
          theme="light"
          richColors
          closeButton
          duration={4000}
          visibleToasts={3}
          offset={24}
          mobileOffset={16}
          toastOptions={{
            style: { fontFamily: 'inherit', borderRadius: '12px' },
          }}
        />
      </body>
    </html>
  );
}
