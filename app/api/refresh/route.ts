import { scrapePermitData } from '@/lib/scraper';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const CRON_SECRET = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  await scrapePermitData();
  return NextResponse.json({ success: true });
}
