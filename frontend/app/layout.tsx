import './globals.css';

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin', 'latin-ext'],
});

export const metadata: Metadata = {
  title: 'Cogniro',
  description: 'Cogniro - Quiz Platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body className={`${inter.variable} antialiased`}>{children}</body>
    </html>
  );
}
