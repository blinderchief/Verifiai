import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'VerifiAI Protocol - Trustless AI Verification on Aptos',
  description: 'Generate and verify zero-knowledge proofs for AI inference on the Aptos blockchain. Build trustless AI agents for RWA settlements, content verification, and more.',
  keywords: ['AI', 'blockchain', 'Aptos', 'zero-knowledge proofs', 'ZK', 'verification', 'RWA', 'DeFi'],
  authors: [{ name: 'VerifiAI Team' }],
  openGraph: {
    title: 'VerifiAI Protocol',
    description: 'Trustless AI Verification on Aptos Blockchain',
    url: 'https://verifiai.io',
    siteName: 'VerifiAI Protocol',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VerifiAI Protocol',
    description: 'Trustless AI Verification on Aptos Blockchain',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <QueryProvider>
              {children}
              <Toaster />
            </QueryProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
