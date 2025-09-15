import type { APIRoute } from 'astro';
import { getCostSummary, detectCostAnomalies } from '@/lib/aws/services/cost-explorer';

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const timeRange = url.searchParams.get('timeRange') as '7d' | '30d' | 'mtd' | '3m' || '30d';
    const includeAnomalies = url.searchParams.get('includeAnomalies') === 'true';

    const summary = await getCostSummary(timeRange);

    let anomalies = null;
    if (includeAnomalies) {
      anomalies = await detectCostAnomalies();
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        summary,
        anomalies
      },
      timestamp: new Date().toISOString(),
      timeRange
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600, s-maxage=21600, stale-while-revalidate=7200' // Cache for 1 hour, CDN for 6 hours
      }
    });
  } catch (error) {
    console.error('Error fetching cost summary:', error);

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch cost summary',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

export const prerender = false;