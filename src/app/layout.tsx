import {ShoppingIdentityProvider} from '@/features/storefront/shopping-client';
import {cookies} from 'next/headers';
import {LocalizationProvider,CurrencyNotice} from '@/localization/provider';
import {normalizeLanguage,languages,preferenceKey,parsePreference} from '@/localization/core';
import {MerchandisingProvider} from '@/features/storefront/components/merchandising-analytics';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Toaster } from 'sonner';
import './globals.css';
import './appearance.css';
import '@/localization/presentation.css';
import { CatalogProvider } from '@/features/storefront/catalog-provider';
import CartSession from '@/features/storefront/components/cart-session';
import { ComparisonProvider } from '@/features/storefront/components/product-comparison';
import StoreFooter, { FooterSkeleton } from '@/features/storefront/components/store-footer';
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
  const localization=configuration.localization||null;
  const scope=localization?.scopeKey||'storefront';
  const preference=(await cookies()).get(preferenceKey(scope))?.value||`${localization?.defaultLanguage||'en'}:INR`;
  const {language:requestedLanguage,currency:requestedCurrency}=parsePreference(preference,localization?.defaultLanguage);
  const language=localization?.languages?.includes(requestedLanguage)?normalizeLanguage(requestedLanguage):normalizeLanguage(localization?.defaultLanguage);
  return (
    <html lang={languages[language].locale} data-ui-language={language} data-config-appearance="storefront" data-theme={configuration.appearance?.mode || 'light'} data-appearance-revision={configuration.appearance?.revision} data-scroll-behavior="smooth">
      <head>{configuration.appearance && <style data-storefront-appearance dangerouslySetInnerHTML={{ __html: configuration.appearance.cssText }} />}</head>
      {/* Browser extensions can add body attributes before React hydrates. */}
      <body suppressHydrationWarning>
        <LocalizationProvider key={scope} scope={scope} settings={localization} initialLanguage={language} initialCurrency={requestedCurrency||'INR'} initialTime={Date.now()}>
        <CurrencyNotice />
        <CatalogProvider
          configuration={configuration}
          products={products.items}
        >
          <ShoppingIdentityProvider><ComparisonProvider><MerchandisingProvider>{children}
          <Suspense fallback={<FooterSkeleton store={configuration.store} />}>
            <StoreFooter store={configuration.store} />
          </Suspense>
          <CartSession />
          </MerchandisingProvider></ComparisonProvider></ShoppingIdentityProvider>
        </CatalogProvider>
        <Toaster
          style={{ fontFamily: 'inherit' }}
          position="bottom-right"
          theme={configuration.appearance?.mode || 'light'}
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
        </LocalizationProvider>
      </body>
    </html>
  );
}
