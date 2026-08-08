import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SpendClear — Verified Agent Payments',
  description: 'CVI-verified identity. CVA-verified assets. On-chain audit trails. Built for autonomous agent payments on Monad.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="grid-bg" />
        {children}
      </body>
    </html>
  );
}
