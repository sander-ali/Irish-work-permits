import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DashboardData } from '@/lib/scraper';

const CACHE_DIR = path.join(process.cwd(), 'public', 'data');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'dashboard';
  const query = searchParams.get('query') || '';
  const industry = searchParams.get('industry') || '';

  try {
    if (type === 'dashboard') {
      const dashboardPath = path.join(CACHE_DIR, 'dashboard.json');
      if (fs.existsSync(dashboardPath)) {
        const data = JSON.parse(fs.readFileSync(dashboardPath, 'utf-8'));
        return NextResponse.json(data);
      }
    }

    if (type === 'companies') {
      const companiesPath = path.join(CACHE_DIR, 'companies.json');
      if (fs.existsSync(companiesPath)) {
        let companies = JSON.parse(fs.readFileSync(companiesPath, 'utf-8'));

        // Apply search filter
        if (query) {
          const searchLower = query.toLowerCase();
          companies = companies.filter((c: any) =>
            c.name.toLowerCase().includes(searchLower) ||
            c.industry.toLowerCase().includes(searchLower)
          );
        }

        // Apply industry filter
        if (industry) {
          companies = companies.filter((c: any) =>
            c.industry.toLowerCase() === industry.toLowerCase()
          );
        }

        // Pagination
        const page = parseInt(searchParams.get('page') || '1');
        const limit = 50;
        const start = (page - 1) * limit;
        const paginated = companies.slice(start, start + limit);

        return NextResponse.json({
          companies: paginated,
          total: companies.length,
          page,
          totalPages: Math.ceil(companies.length / limit),
        });
      }
    }

    // If no cache, trigger scrape and return empty
    const { scrapePermitData } = await import('@/lib/scraper');
    await scrapePermitData();

    return NextResponse.json({ message: 'Data refresh initiated', status: 'loading' });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
  }
}
