import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'dashboard';
  const query = searchParams.get('query') || '';
  const industry = searchParams.get('industry') || '';

  try {
    const dashboardPath = path.join(process.cwd(), 'public', 'data', 'dashboard.json');
    const companiesPath = path.join(process.cwd(), 'public', 'data', 'companies.json');

    // Check if files exist
    if (!fs.existsSync(dashboardPath) || !fs.existsSync(companiesPath)) {
      return NextResponse.json(
        { error: 'Data not found. Please run `npm run scrape` locally and commit the public/data/ folder.' },
        { status: 503 }
      );
    }

    const dashboard = JSON.parse(fs.readFileSync(dashboardPath, 'utf-8'));
    let companies = JSON.parse(fs.readFileSync(companiesPath, 'utf-8'));

    if (type === 'dashboard') {
      return NextResponse.json(dashboard);
    }

    if (type === 'companies') {
      // Apply search filter
      if (query) {
        const q = query.toLowerCase();
        companies = companies.filter((c: any) =>
          c.name.toLowerCase().includes(q) || c.industry.toLowerCase().includes(q)
        );
      }

      // Apply industry filter
      if (industry) {
        companies = companies.filter((c: any) => c.industry.toLowerCase() === industry.toLowerCase());
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

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
  }
}
