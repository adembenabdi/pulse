import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pulse | Your Life Dashboard',
  description: 'Personal productivity dashboard for Algerian university students',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
