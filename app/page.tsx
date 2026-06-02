'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search, TrendingUp, Users, Building2, Globe2, ChevronRight, AlertCircle,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface DashboardData {
  stats: {
    totalCompanies: number;
    totalWorkers: number;
    totalCountries: number;
    topSector: string;
    topSectorCount: number;
  };
  yearlyTrends: { year: number; total: number }[];
  topCompanies: Array<{ name: string; currentYearPermits: number; trend: string }>;
  topSectors: Array<{ name: string; count: number }>;
  topNationalities: Array<{ name: string; count: number }>;
}

export default function HomePage() {
  const [data, setData] = useState<DashboardData | null>(null);
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const topSector = data?.stats.topSector || 'N/A';
  const topSectorCount = data?.stats.topSectorCount || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-20 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Find Irish Companies That Sponsor Work Permits
          </h1>
          <p className="mt-4 text-xl text-blue-100 max-w-3xl mx-auto">
            Data from Ireland&apos;s Department of Enterprise, Trade and Employment.
            Search every sponsor, explore industry trends, and see plain‑language hiring signals.
          </p>

          <div className="mt-8 max-w-2xl mx-auto relative">
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
          <Link href="/companies" className="mt-2 text-sm text-blue-200 hover:text-white inline-block">
            Browse all companies →
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
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
              <p className="text-xl font-bold truncate">{topSector}</p>
              <p className="text-xs text-gray-500">{topSectorCount.toLocaleString()} workers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Yearly Trend Line Chart */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Annual Work Permit Issuance Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data?.yearlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip formatter={(value) => value.toLocaleString()} />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={3} name="Permits Issued" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top Sectors Bar Chart */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Top Sectors by Permits (Current Year)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data?.topSectors.slice(0, 6)} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => value.toLocaleString()} />
                <Bar dataKey="count" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Companies & Top Sectors Lists */}
      <div className="max-w-7xl mx-auto px-4 pb-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Companies */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Top Sponsoring Companies (2026)</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {data?.topCompanies?.slice(0, 5).map((company, i) => (
                <Link
                  key={i}
                  href={`/companies/${encodeURIComponent(company.name)}`}
                  className="flex justify-between items-center px-6 py-3 hover:bg-gray-50 transition"
                >
                  <div>
                    <p className="font-medium text-gray-900">{company.name}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-semibold text-blue-600">
                      {company.currentYearPermits?.toLocaleString() || 0}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Top Sectors List */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Top Sectors by Sponsorships (2026)</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {data?.topSectors?.slice(0, 5).map((sector, i) => (
                <Link
                  key={i}
                  href={`/sectors?q=${encodeURIComponent(sector.name)}`}
                  className="flex justify-between items-center px-6 py-3 hover:bg-gray-50 transition"
                >
                  <p className="font-medium text-gray-900">{sector.name}</p>
                  <p className="text-lg font-semibold text-green-600">{sector.count?.toLocaleString() || 0}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="max-w-7xl mx-auto px-4 pb-12 sm:px-6 lg:px-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium">About this data</p>
            <p>
              This website shows past sponsorship activity only. It does not show live vacancies and does not offer visa advice.
              Data is sourced from publications by Ireland&apos;s Department of Enterprise, Trade and Employment.
              Current‑year figures are partial and subject to change as new data becomes available.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
