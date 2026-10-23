import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AURA Mall — A world to explore',
  description:
    'Discover your next favourite across eight thoughtfully curated product categories at AURA Mall.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
