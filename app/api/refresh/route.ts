import { scrapePermitData } from '@/lib/scraper';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  await scrapePermitData();
  return NextResponse.json({ success: true });
}
