"use client";
import Navbar from '@/components/Navbar';
import './globals.css';
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-800">
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
