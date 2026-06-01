import { NextResponse } from 'next/server';
import { scrapePermitData } from '@/lib/scraper';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;

  console.log('🔐 Auth header received:', authHeader);
  console.log('🔑 Expected secret exists:', !!expectedSecret);

  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await scrapePermitData();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Scrape failed' }, { status: 500 });
  }
}
