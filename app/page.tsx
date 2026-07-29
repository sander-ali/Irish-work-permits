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
          <div
            key={i}
            className="flex justify-between items-center px-6 py-3"
          >
            <p className="font-medium text-gray-900">{company.name}</p>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-semibold text-blue-600">
                {company.currentYearPermits?.toLocaleString() || 0}
              </span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </div>
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
          <div
            key={i}
            className="flex justify-between items-center px-6 py-3"
          >
            <p className="font-medium text-gray-900">{sector.name}</p>
            <p className="text-lg font-semibold text-green-600">
              {sector.count?.toLocaleString() || 0}
            </p>
          </div>
        ))}
      </div>
    </div>
  </div>
</div>

{/* Disclaimer and Footer */}
<div className="max-w-7xl mx-auto px-4 pb-8 sm:px-6 lg:px-8">
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

  <div className="border-t border-gray-200 mt-6 pt-6 text-center text-sm text-gray-500">
    <p>
      Data from Ireland&apos;s Department of Enterprise, Trade and Employment · Updated 17 May 2026.
    </p>
    <p className="mt-2">
      ⚠️ This website is for informational purposes only. Please do your own research before applying for jobs or visas.
    </p>
    <p className="mt-2">
      Developed by{' '}
      <a
        href="https://aiverse.ie"
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline"
      >
        Sunder Ali Khowaja
      </a>
    </p>
  </div>
</div>
