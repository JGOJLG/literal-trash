import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Literal Trash Book Club',
  description: 'A very serious website for unserious reading opinions.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
