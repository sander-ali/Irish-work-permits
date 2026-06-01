import { NextResponse } from 'next/server';
import { getCachedData, scrapePermitData } from '@/lib/scraper';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'dashboard';
  const query = searchParams.get('query') || '';
  const industry = searchParams.get('industry') || '';

  try {
    let { dashboard, companies } = await getCachedData();

    // If no cache, trigger scrape (but not during build)
    if (!dashboard || !companies) {
      if (process.env.NEXT_PHASE !== 'phase-production-build') {
        const fresh = await scrapePermitData();
        dashboard = fresh;
        companies = fresh.topCompanies; // Actually companies list is inside fresh, but we need full list.
        // Better: we saved companies.json separately; after scrape, re-read.
        const refreshed = await getCachedData();
        dashboard = refreshed.dashboard;
        companies = refreshed.companies;
      } else {
        return NextResponse.json({ error: 'Data not ready' }, { status: 503 });
      }
    }

    if (type === 'dashboard') {
      return NextResponse.json(dashboard);
    }

    if (type === 'companies') {
      let filtered = companies || [];
      if (query) {
        const q = query.toLowerCase();
        filtered = filtered.filter(c =>
          c.name.toLowerCase().includes(q) || c.industry.toLowerCase().includes(q)
        );
      }
      if (industry) {
        filtered = filtered.filter(c => c.industry.toLowerCase() === industry.toLowerCase());
      }

      const page = parseInt(searchParams.get('page') || '1');
      const limit = 50;
      const start = (page - 1) * limit;
      const paginated = filtered.slice(start, start + limit);

      return NextResponse.json({
        companies: paginated,
        total: filtered.length,
        page,
        totalPages: Math.ceil(filtered.length / limit),
      });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
  }
}
