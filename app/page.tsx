'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, TrendingUp, Users, Building2, Globe2, ChevronRight, AlertCircle } from 'lucide-react';

interface DashboardStats {
  stats: {
    totalCompanies: number;
    totalWorkers: number;
    totalCountries: number;
    topIndustry: string;
    topIndustryCount: number;
    topSector?: string;   // optional for compatibility
    topSectorCount?: number;
  };
  topCompanies: Array<{ name: string; totalPermits: number; currentYearPermits: number; trend: string }>;
  topSectors: Array<{ name: string; count: number }>;
  topIndustries?: Array<{ name: string; count: number }>;
  topNationalities: Array<{ name: string; count: number }>;
  yearlyTrends: Array<{ year: number; total: number }>;
}

export default function HomePage() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/permits?type=dashboard')
      .then(res => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading permit data...</p>
        </div>
      </div>
    );
  }

  // Use topSector if available, otherwise fallback to topIndustry
  const topIndustryName = data?.stats.topSector || data?.stats.topIndustry || 'N/A';
  const topIndustryCount = data?.stats.topSectorCount || data?.stats.topIndustryCount || 0;
  const topIndustriesList = data?.topSectors || data?.topIndustries || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-20 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Find Irish Companies That Sponsor Work Permits
          </h1>
          <p className="mt-4 text-xl text-blue-100 max-w-3xl mx-auto">
            Official data from Ireland&apos;s Department of Enterprise, Trade and Employment.
            Search every sponsor, explore industry trends, and see plain-language hiring signals.
          </p>

          <div className="mt-8 max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by company name or industry..."
                className="w-full px-6 py-4 text-gray-900 rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
                onKeyDown={(e) => e.key === 'Enter' && window.location.assign(`/companies?q=${encodeURIComponent(searchQuery)}`)}
              />
              <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>
            <Link href="/companies" className="mt-2 text-sm text-blue-200 hover:text-white block">
              Browse all companies →
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white rounded-xl shadow-md p-6 flex items-center">
            <Building2 className="w-10 h-10 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">Companies Ever Sponsored</p>
              <p className="text-2xl font-bold">{data?.stats.totalCompanies?.toLocaleString() || 0}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 flex items-center">
            <Users className="w-10 h-10 text-green-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">Workers Sponsored (Total)</p>
              <p className="text-2xl font-bold">{data?.stats.totalWorkers?.toLocaleString() || 0}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 flex items-center">
            <Globe2 className="w-10 h-10 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">Countries Represented</p>
              <p className="text-2xl font-bold">{data?.stats.totalCountries?.toLocaleString() || 0}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 flex items-center">
            <TrendingUp className="w-10 h-10 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">Top Sector</p>
              <p className="text-xl font-bold truncate">{topIndustryName}</p>
              <p className="text-xs text-gray-500">{topIndustryCount.toLocaleString()} workers</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Top Sponsoring Companies</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {data?.topCompanies?.slice(0,5).map((company, i) => (
                <Link key={i} href={`/companies/${encodeURIComponent(company.name)}`} className="flex justify-between items-center px-6 py-3 hover:bg-gray-50 transition">
                  <div>
                    <p className="font-medium text-gray-900">{company.name}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-semibold text-blue-600">{company.currentYearPermits?.toLocaleString() || 0}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Top Sectors by Sponsorships</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {topIndustriesList.slice(0,5).map((industry, i) => (
                <Link key={i} href={`/sectors?q=${encodeURIComponent(industry.name)}`} className="flex justify-between items-center px-6 py-3 hover:bg-gray-50 transition">
                  <p className="font-medium text-gray-900">{industry.name}</p>
                  <p className="text-lg font-semibold text-green-600">{industry.count?.toLocaleString() || 0}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-12 sm:px-6 lg:px-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium">About this data</p>
            <p>This website shows past sponsorship activity only. It does not show live vacancies and does not offer visa advice.
            Data is sourced from official publications by Ireland&apos;s Department of Enterprise, Trade and Employment.
            Current-year figures are partial and subject to change as new data becomes available.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
