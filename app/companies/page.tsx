'use client';

import { useState, useEffect, useCallback } from 'react';
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

export default function CompaniesPage() {
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
    const data = await res.json();
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
      <div className="max-w-7xl mx-auto px-4 py-8">
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

        <div className="mb-4 text-sm text-gray-600">Showing {companies.length} of {total.toLocaleString()} companies</div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Permits</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">2026 Permits</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trend</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active Years</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center">Loading...</td></tr>
                ) : companies.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center">No companies found</td></tr>
                ) : (
                  companies.map((c, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap"><Link href={`/companies/${encodeURIComponent(c.name)}`} className="text-blue-600 hover:underline">{c.name}</Link></td>
                      <td className="px-6 py-4">{c.totalPermits.toLocaleString()}</td>
                      <td className="px-6 py-4">{c.currentYearPermits.toLocaleString()}</td>
                      <td className="px-6 py-4"><span className={`px-2 py-1 text-xs rounded-full ${getTrendBadge(c.trend)}`}>{c.trend}</span></td>
                      <td className="px-6 py-4">{c.firstYear} – {c.lastActiveYear}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-between mt-6">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="px-4 py-2 border rounded disabled:opacity-50">Previous</button>
            <span>Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} className="px-4 py-2 border rounded disabled:opacity-50">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
