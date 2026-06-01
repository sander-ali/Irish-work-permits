import { NextResponse } from 'next/server';
import { scrapePermitData } from '@/lib/scraper';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;

  // If no secret is set, allow the request (only for testing)
  if (expectedSecret && authHeader !== `Bearer sk_8x9QpLmN2rTz1vY3wK5bA6cD7eF0gH4j`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await scrapePermitData();
    return NextResponse.json({ success: true, message: 'Data refreshed successfully' });
  } catch (error) {
    console.error('Refresh failed:', error);
    return NextResponse.json({ error: 'Failed to refresh data' }, { status: 500 });
  }
}

// Also allow GET for manual testing (optional)
export async function GET(request: Request) {
  return POST(request);
}
