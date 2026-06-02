'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, TrendingUp, Users, Building2, Globe2, ChevronRight, AlertCircle } from 'lucide-react';

export default function HomePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/permits?type=dashboard')
      .then(res => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  const topSector = data?.stats.topSector || 'N/A';
  const topSectorCount = data?.stats.topSectorCount || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16 text-center">
        <h1 className="text-4xl font-bold sm:text-5xl md:text-6xl">Find Irish Companies That Sponsor Work Permits</h1>
        <p className="mt-4 text-xl text-blue-100 max-w-3xl mx-auto">Official data from Ireland's Department of Enterprise, Trade and Employment.</p>
        <div className="mt-8 max-w-2xl mx-auto relative">
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by company name..." className="w-full px-6 py-4 text-gray-900 rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-white" onKeyDown={(e) => e.key === 'Enter' && window.location.assign(`/companies?q=${encodeURIComponent(searchQuery)}`)} />
          <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white rounded-xl shadow-md p-6 flex items-center"><Building2 className="w-10 h-10 text-blue-600" /><div className="ml-4"><p className="text-sm text-gray-500">Companies Ever Sponsored</p><p className="text-2xl font-bold">{data?.stats.totalCompanies?.toLocaleString() || 0}</p></div></div>
          <div className="bg-white rounded-xl shadow-md p-6 flex items-center"><Users className="w-10 h-10 text-green-600" /><div className="ml-4"><p className="text-sm text-gray-500">Workers Sponsored (Total)</p><p className="text-2xl font-bold">{data?.stats.totalWorkers?.toLocaleString() || 0}</p></div></div>
          <div className="bg-white rounded-xl shadow-md p-6 flex items-center"><Globe2 className="w-10 h-10 text-purple-600" /><div className="ml-4"><p className="text-sm text-gray-500">Countries Represented</p><p className="text-2xl font-bold">{data?.stats.totalCountries?.toLocaleString() || 0}</p></div></div>
          <div className="bg-white rounded-xl shadow-md p-6 flex items-center"><TrendingUp className="w-10 h-10 text-orange-600" /><div className="ml-4"><p className="text-sm text-gray-500">Top Sector</p><p className="text-xl font-bold truncate">{topSector}</p><p className="text-xs">{topSectorCount.toLocaleString()} workers</p></div></div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b"><h2 className="text-lg font-semibold">Top Sponsoring Companies</h2></div>
          <div className="divide-y divide-gray-200">
            {data?.topCompanies?.slice(0,5).map((c: any, i: number) => (
              <Link key={i} href={`/companies/${encodeURIComponent(c.name)}`} className="flex justify-between items-center px-6 py-3 hover:bg-gray-50">
                <div><p className="font-medium">{c.name}</p></div>
                <div className="flex items-center space-x-2"><span className="text-lg font-semibold text-blue-600">{c.currentYearPermits?.toLocaleString() || 0}</span><ChevronRight className="w-4 h-4 text-gray-400" /></div>
              </Link>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b"><h2 className="text-lg font-semibold">Top Sectors</h2></div>
          <div className="divide-y divide-gray-200">
            {data?.topSectors?.slice(0,5).map((s: any, i: number) => (
              <Link key={i} href={`/sectors?q=${encodeURIComponent(s.name)}`} className="flex justify-between items-center px-6 py-3 hover:bg-gray-50">
                <span className="font-medium">{s.name}</span><span className="font-semibold text-green-600">{s.count?.toLocaleString() || 0}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-12">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"><p className="text-sm text-yellow-800">⚠️ This website shows past sponsorship activity only. It does not show live vacancies and does not offer visa advice. Data is sourced from official DETE publications. Current-year figures are partial.</p></div>
      </div>
    </div>
  );
}
