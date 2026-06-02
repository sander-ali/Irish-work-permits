import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { BarChart3, Building2, Home, Search, MapPin, Globe2, Briefcase } from 'lucide-react';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Irish Work Permit Sponsors | A Website by Sunder Ali Khowaja',
  description: 'Search Irish companies that sponsor work permits. Data is based on Ireland\'s Department of Enterprise, Trade and Employment.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link href="/" className="flex items-center space-x-2">
                  <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                    IrishWorkPermits
                  </span>
                  <span className="text-xs text-gray-500 hidden sm:inline">Based on DETE Data by Sunder Ali Khowaja</span>
                </Link>
              </div>

              <div className="flex items-center space-x-4 overflow-x-auto whitespace-nowrap scrollbar-hide">
                <Link href="/" className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 transition px-2 py-2">
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline">Home</span>
                </Link>
                <Link href="/companies" className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 transition px-2 py-2">
                  <Building2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Companies</span>
                </Link>
                <Link href="/sectors" className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 transition px-2 py-2">
                  <Briefcase className="w-4 h-4" />
                  <span className="hidden sm:inline">Sectors</span>
                </Link>
                <Link href="/counties" className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 transition px-2 py-2">
                  <MapPin className="w-4 h-4" />
                  <span className="hidden sm:inline">Counties</span>
                </Link>
                <Link href="/nationalities" className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 transition px-2 py-2">
                  <Globe2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Nationalities</span>
                </Link>
              </div>
            </div>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
