import type { Metadata } from 'next';
import { Bricolage_Grotesque, Hanken_Grotesk, Space_Mono } from 'next/font/google';
import './globals.css';

// Type roles (see files/design-direction.md): display / body / mono.
const display = Bricolage_Grotesque({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['600', '700', '800'],
});

const body = Hanken_Grotesk({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const mono = Space_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '700'],
});

export const metadata: Metadata = {
  title: 'Bot Or Not',
  description: 'The GeoGuessr of AI detection — spot AI-generated media under time pressure.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="grain bg-ink-900 font-body text-text flex min-h-full flex-col">
        {children}
      </body>
    </html>
  );
}
