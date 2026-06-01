'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface DashboardData {
  stats: {
    totalCompanies: number;
    totalWorkers: number;
    totalCountries: number;
    topIndustry: string;
    topIndustryCount: number;
  };
  yearlyTrends: Array<{ year: number; total: number }>;
  topCompanies: Array<{ name: string; industry: string; currentYearPermits: number; trend: string }>;
  topIndustries: Array<{ name: string; count: number }>;
  topNationalities: Array<{ name: string; count: number }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

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

  const getTrendIcon = (trend: string) => {
    if (trend === 'increasing') return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (trend === 'decreasing') return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Ireland&apos;s Work Permit Landscape</h1>
        <p className="text-gray-600 mb-8">Explore sponsorship trends by year, company, industry, and worker origin.</p>

        {/* Key Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Companies Ever Sponsored</p>
            <p className="text-3xl font-bold text-gray-900">{data?.stats.totalCompanies.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Total Workers Sponsored</p>
            <p className="text-3xl font-bold text-gray-900">{data?.stats.totalWorkers.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Countries Represented</p>
            <p className="text-3xl font-bold text-gray-900">{data?.stats.totalCountries}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Most Active Industry</p>
            <p className="text-lg font-semibold text-gray-900">{data?.stats.topIndustry}</p>
            <p className="text-sm text-gray-500">{data?.stats.topIndustryCount.toLocaleString()} workers</p>
          </div>
        </div>

        {/* Yearly Trend Chart */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Annual Work Permit Issuance Trend</h2>
          <ResponsiveContainer width="100%" height={400}>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Companies */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Top Companies (Current Year)</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {data?.topCompanies.slice(0, 10).map((company, i) => (
                <div key={i} className="flex justify-between items-center px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <span className="text-gray-500 text-sm w-8">{i + 1}.</span>
                    <div>
                      <p className="font-medium text-gray-900">{company.name}</p>
                      <p className="text-sm text-gray-500">{company.industry}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="font-semibold text-gray-900">{company.currentYearPermits}</span>
                    {getTrendIcon(company.trend)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Industries & Nationalities */}
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold">Top Industries</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {data?.topIndustries.map((industry, i) => (
                  <div key={i} className="flex justify-between items-center px-6 py-4">
                    <span className="font-medium">{industry.name}</span>
                    <span className="font-semibold text-blue-600">{industry.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold">Top Nationalities</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {data?.topNationalities.map((nation, i) => (
                  <div key={i} className="flex justify-between items-center px-6 py-4">
                    <span className="font-medium">{nation.name}</span>
                    <span className="font-semibold text-purple-600">{nation.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
