import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'dashboard';
  const query = searchParams.get('query') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 50;

  const basePath = path.join(process.cwd(), 'public', 'data');

  try {
    if (type === 'dashboard') {
      const filePath = path.join(basePath, 'dashboard.json');
      if (!fs.existsSync(filePath)) return NextResponse.json({ error: 'No data' }, { status: 503 });
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return NextResponse.json(data);
    }

    if (type === 'companies') {
      const filePath = path.join(basePath, 'companies.json');
      if (!fs.existsSync(filePath)) return NextResponse.json({ companies: [], total: 0 });
      let companies = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (query) {
        const q = query.toLowerCase();
        companies = companies.filter((c: any) => c.name.toLowerCase().includes(q));
      }
      const total = companies.length;
      const paginated = companies.slice((page-1)*limit, page*limit);
      return NextResponse.json({ companies: paginated, total, page, totalPages: Math.ceil(total/limit) });
    }

    if (type === 'sectors') {
      const filePath = path.join(basePath, 'sectors.json');
      if (!fs.existsSync(filePath)) return NextResponse.json({ items: [], total: 0 });
      let items = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (query) {
        const q = query.toLowerCase();
        items = items.filter((s: any) => s.name.toLowerCase().includes(q));
      }
      const total = items.length;
      const paginated = items.slice((page-1)*limit, page*limit);
      return NextResponse.json({ items: paginated, total, page, totalPages: Math.ceil(total/limit) });
    }

    if (type === 'counties') {
      const filePath = path.join(basePath, 'counties.json');
      if (!fs.existsSync(filePath)) return NextResponse.json({ items: [], total: 0 });
      let items = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (query) {
        const q = query.toLowerCase();
        items = items.filter((c: any) => c.name.toLowerCase().includes(q));
      }
      const total = items.length;
      const paginated = items.slice((page-1)*limit, page*limit);
      return NextResponse.json({ items: paginated, total, page, totalPages: Math.ceil(total/limit) });
    }

    if (type === 'nationalities') {
      const filePath = path.join(basePath, 'nationalities.json');
      if (!fs.existsSync(filePath)) return NextResponse.json({ items: [], total: 0 });
      let items = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (query) {
        const q = query.toLowerCase();
        items = items.filter((n: any) => n.name.toLowerCase().includes(q));
      }
      const total = items.length;
      const paginated = items.slice((page-1)*limit, page*limit);
      return NextResponse.json({ items: paginated, total, page, totalPages: Math.ceil(total/limit) });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
