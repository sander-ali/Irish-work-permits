"use client";

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface Company {
  name: string;
  totalPermits: number;
  currentYearPermits: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  firstYear: number;
  lastActiveYear: number;
}

interface CompaniesResponse {
  companies: Company[];
  total: number;
  page: number;
  totalPages: number;
}

// This component uses useSearchParams and must be wrapped in Suspense
function CompaniesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const q = searchParams.get('q') || '';

  useEffect(() => {
    setSearchQuery(q);
  }, [q]);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      type: 'companies',
      page: page.toString(),
      query: searchQuery,
    });
    const res = await fetch(`/api/permits?${params}`);
    const data: CompaniesResponse = await res.json();
    setCompanies(data.companies);
    setTotal(data.total);
    setTotalPages(data.totalPages);
    setLoading(false);
  }, [page, searchQuery]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const updateSearch = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set('q', value);
    else params.delete('q');
    params.set('page', '1');
    router.push(`/companies?${params}`);
  };

  const getTrendBadge = (trend: string) => {
    const colors = {
      increasing: 'bg-green-100 text-green-800',
      decreasing: 'bg-red-100 text-red-800',
      stable: 'bg-gray-100 text-gray-800',
    };
    return colors[trend as keyof typeof colors] || colors.stable;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Company Explorer</h1>
        <p className="text-gray-600 mb-6">Search employers who have sponsored work permits (2017–2026).</p>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by employer name..."
              value={searchQuery}
              onChange={(e) => updateSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mb-4 text-sm text-gray-600">
          Showing {companies.length} of {total.toLocaleString()} companies
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Permits</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">2026 Permits</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trend</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active Years</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </td>
                  </tr>
                ) : companies.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No companies found matching your search.
                    </td>
                  </tr>
                ) : (
                  companies.map((company, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/companies/${encodeURIComponent(company.name)}`} className="text-blue-600 hover:text-blue-800 font-medium">
                          {company.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">{company.totalPermits.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">{company.currentYearPermits.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getTrendBadge(company.trend)}`}>
                          {company.trend}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{company.firstYear} – {company.lastActiveYear}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </button>
            <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function CompaniesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <CompaniesContent />
    </Suspense>
  );
}
