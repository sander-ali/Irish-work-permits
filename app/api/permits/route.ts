import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Dynamically import scraper only when needed (avoids build-time execution)
  const { getCachedData, scrapePermitData } = await import('@/lib/scraper');
  
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'dashboard';
  const query = searchParams.get('query') || '';
  const industry = searchParams.get('industry') || '';

  try {
    let { dashboard, companies } = await getCachedData();

    if (!dashboard || !companies) {
      // Only scrape if not in build phase and on server
      if (process.env.NEXT_PHASE !== 'phase-production-build') {
        await scrapePermitData();
        const fresh = await getCachedData();
        dashboard = fresh.dashboard;
        companies = fresh.companies;
      } else {
        return NextResponse.json({ error: 'Data not available during build' }, { status: 503 });
      }
    }

    // ... rest of the logic (same as before)
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
