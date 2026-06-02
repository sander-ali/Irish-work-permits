import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Sample data for when files are missing
const sampleCompanies = [
  { name: "Google Ireland", totalPermits: 1245, currentYearPermits: 234, trend: "increasing", firstYear: 2018, lastActiveYear: 2026 },
  { name: "Apple Distribution", totalPermits: 987, currentYearPermits: 187, trend: "stable", firstYear: 2019, lastActiveYear: 2026 },
  { name: "Microsoft Ireland", totalPermits: 876, currentYearPermits: 165, trend: "increasing", firstYear: 2017, lastActiveYear: 2026 },
  { name: "Amazon Data Services", totalPermits: 765, currentYearPermits: 143, trend: "decreasing", firstYear: 2018, lastActiveYear: 2026 },
  { name: "Deloitte", totalPermits: 654, currentYearPermits: 98, trend: "stable", firstYear: 2016, lastActiveYear: 2026 },
];

const sampleSectors = [
  { name: "Information Technology", total: 8450 },
  { name: "Healthcare", total: 6230 },
  { name: "Engineering & Manufacturing", total: 5120 },
];

const sampleCounties = [
  { name: "Dublin", total: 21340 },
  { name: "Cork", total: 8920 },
  { name: "Galway", total: 3450 },
];

const sampleNationalities = [
  { name: "India", total: 12453 },
  { name: "Brazil", total: 6789 },
  { name: "Philippines", total: 5432 },
];

const sampleDashboard = {
  stats: {
    totalCompanies: 1250,
    totalWorkers: 48762,
    totalCountries: 87,
    topSector: "Information Technology",
    topSectorCount: 8450,
  },
  yearlyTrends: [
    { year: 2020, total: 15234 },
    { year: 2021, total: 18763 },
    { year: 2022, total: 23122 },
    { year: 2023, total: 28901 },
    { year: 2024, total: 31245 },
    { year: 2025, total: 33412 },
    { year: 2026, total: 3621 },
  ],
  topCompanies: sampleCompanies.slice(0,5),
  topSectors: sampleSectors,
  topNationalities: sampleNationalities,
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'dashboard';
  const query = searchParams.get('query') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 50;

  const basePath = path.join(process.cwd(), 'public', 'data');

  // Helper to read JSON or return sample
  async function getData(filename: string, sampleData: any) {
    const filePath = path.join(basePath, filename);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
      } catch (err) {
        console.error(`Error parsing ${filename}:`, err);
        return sampleData;
      }
    }
    console.log(`File ${filename} not found, using sample data`);
    return sampleData;
  }

  try {
    if (type === 'dashboard') {
      const data = await getData('dashboard.json', sampleDashboard);
      return NextResponse.json(data);
    }

    if (type === 'companies') {
      let companies = await getData('companies.json', sampleCompanies);
      if (query) {
        const q = query.toLowerCase();
        companies = companies.filter((c: any) => c.name.toLowerCase().includes(q));
      }
      const total = companies.length;
      const paginated = companies.slice((page-1)*limit, page*limit);
      return NextResponse.json({
        companies: paginated,
        total,
        page,
        totalPages: Math.ceil(total/limit),
      });
    }

    if (type === 'sectors') {
      let items = await getData('sectors.json', sampleSectors);
      if (query) {
        const q = query.toLowerCase();
        items = items.filter((s: any) => s.name.toLowerCase().includes(q));
      }
      const total = items.length;
      const paginated = items.slice((page-1)*limit, page*limit);
      return NextResponse.json({ items: paginated, total, page, totalPages: Math.ceil(total/limit) });
    }

    if (type === 'counties') {
      let items = await getData('counties.json', sampleCounties);
      if (query) {
        const q = query.toLowerCase();
        items = items.filter((c: any) => c.name.toLowerCase().includes(q));
      }
      const total = items.length;
      const paginated = items.slice((page-1)*limit, page*limit);
      return NextResponse.json({ items: paginated, total, page, totalPages: Math.ceil(total/limit) });
    }

    if (type === 'nationalities') {
      let items = await getData('nationalities.json', sampleNationalities);
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
    console.error('API error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
