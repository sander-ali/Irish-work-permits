'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Building2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Link from 'next/link';

interface CompanyDetails {
  name: string;
  industry: string;
  totalPermits: number;
  currentYearPermits: number;
  trend: string;
  firstYear: number;
  lastActiveYear: number;
}

export default function CompanyPage() {
  const params = useParams();
  const router = useRouter();
  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompany = async () => {
      const res = await fetch(`/api/permits?type=companies&query=${params.slug}`);
      const data = await res.json();
      const found = data.companies.find((c: any) => 
        encodeURIComponent(c.name.toLowerCase()) === params.slug
      );
      setCompany(found || null);
      setLoading(false);
    };
    fetchCompany();
  }, [params.slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Company not found</p>
          <button onClick={() => router.back()} className="mt-4 text-blue-600 hover:underline">
            Go back
          </button>
        </div>
      </div>
    );
  }

  const getTrendBadge = () => {
    if (company.trend === 'increasing') return <TrendingUp className="w-5 h-5 text-green-600" />;
    if (company.trend === 'decreasing') return <TrendingDown className="w-5 h-5 text-red-600" />;
    return <Minus className="w-5 h-5 text-gray-500" />;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <button onClick={() => router.back()} className="flex items-center text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to companies
        </button>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8">
            <h1 className="text-3xl font-bold text-white">{company.name}</h1>
            <p className="text-blue-100 mt-2">{company.industry}</p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-gray-600 mb-2">
                  <Building2 className="w-4 h-4" />
                  <p className="text-sm">Total Permits Sponsored</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{company.totalPermits.toLocaleString()}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-gray-600 mb-2">
                  <Calendar className="w-4 h-4" />
                  <p className="text-sm">Sponsorship Activity Period</p>
                </div>
                <p className="text-xl font-bold text-gray-900">{company.firstYear} – {company.lastActiveYear}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-gray-600 mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <p className="text-sm">Current Year Sponsorships (2026)</p>
                </div>
                <div className="flex items-center space-x-2">
                  <p className="text-3xl font-bold text-gray-900">{company.currentYearPermits.toLocaleString()}</p>
                  {getTrendBadge()}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-gray-600 mb-2">
                  <Calendar className="w-4 h-4" />
                  <p className="text-sm">Trend</p>
                </div>
                <p className="text-xl font-semibold capitalize">
                  {company.trend}
                </p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ This data shows past sponsorship activity only. It does not indicate current vacancies 
                or guarantee future sponsorship. For visa advice, please consult official Irish immigration authorities.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
