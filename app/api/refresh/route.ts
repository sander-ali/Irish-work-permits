import { NextResponse } from 'next/server';
import { scrapePermitData } from '@/lib/scraper';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;

  console.log('=== DEBUG REFRESH ===');
  console.log('Received auth header:', authHeader);
  console.log('Expected secret exists:', !!expectedSecret);
  console.log('Expected secret value (first 4 chars):', expectedSecret ? expectedSecret.substring(0,4) + '...' : 'undefined');

  if (!expectedSecret) {
    console.error('CRON_SECRET environment variable is NOT set!');
    return NextResponse.json({ error: 'Server misconfigured: missing CRON_SECRET' }, { status: 500 });
  }

  const expectedBearer = `Bearer ${expectedSecret}`;
  console.log('Expected bearer:', expectedBearer.substring(0, 15) + '...');
  console.log('Does header match?', authHeader === expectedBearer);

  if (authHeader !== expectedBearer) {
    console.log('❌ Unauthorized - header mismatch');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('✅ Authorized, starting scrape...');
    await scrapePermitData();
    console.log('✅ Scrape completed');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Scrape failed:', error);
    return NextResponse.json({ error: 'Scrape failed' }, { status: 500 });
  }
}

// Allow GET for manual testing in browser (remove in production)
export async function GET(request: Request) {
  return POST(request);
}
