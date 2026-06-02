import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'dashboard';
  const query = searchParams.get('query') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 50;

  const dataDir = path.join(process.cwd(), 'public', 'data');

  async function readJSON(filename: string, defaultData: any) {
    const filePath = path.join(dataDir, filename);
    if (fs.existsSync(filePath)) {
      try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch (err) {
        console.error(`Error reading ${filename}:`, err);
        return defaultData;
      }
    }
    return defaultData;
  }

  const defaultDashboard = {
    stats: { totalCompanies: 0, totalWorkers: 0, totalCountries: 0, topSector: 'N/A', topSectorCount: 0 },
    yearlyTrends: [],
    topCompanies: [],
    topSectors: [],
    topNationalities: [],
  };
  const defaultCompanies: any[] = [];
  const defaultSectors: any[] = [];
  const defaultCounties: any[] = [];
  const defaultNationalities: any[] = [];

  if (type === 'dashboard') {
    const data = await readJSON('dashboard.json', defaultDashboard);
    return NextResponse.json(data);
  }

  if (type === 'companies') {
    let companies = await readJSON('companies.json', defaultCompanies);
    if (query) {
      const q = query.toLowerCase();
      companies = companies.filter((c: any) => c.name.toLowerCase().includes(q));
    }
    const total = companies.length;
    const paginated = companies.slice((page-1)*limit, page*limit);
    return NextResponse.json({ companies: paginated, total, page, totalPages: Math.ceil(total/limit) });
  }

  if (type === 'sectors') {
    let items = await readJSON('sectors.json', defaultSectors);
    if (query) {
      const q = query.toLowerCase();
      items = items.filter((s: any) => s.name.toLowerCase().includes(q));
    }
    const total = items.length;
    const paginated = items.slice((page-1)*limit, page*limit);
    return NextResponse.json({ items: paginated, total, page, totalPages: Math.ceil(total/limit) });
  }

  if (type === 'counties') {
    let items = await readJSON('counties.json', defaultCounties);
    if (query) {
      const q = query.toLowerCase();
      items = items.filter((c: any) => c.name.toLowerCase().includes(q));
    }
    const total = items.length;
    const paginated = items.slice((page-1)*limit, page*limit);
    return NextResponse.json({ items: paginated, total, page, totalPages: Math.ceil(total/limit) });
  }

  if (type === 'nationalities') {
    let items = await readJSON('nationalities.json', defaultNationalities);
    if (query) {
      const q = query.toLowerCase();
      items = items.filter((n: any) => n.name.toLowerCase().includes(q));
    }
    const total = items.length;
    const paginated = items.slice((page-1)*limit, page*limit);
    return NextResponse.json({ items: paginated, total, page, totalPages: Math.ceil(total/limit) });
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}
