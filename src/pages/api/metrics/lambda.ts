import type { APIRoute } from 'astro';
import { getAllLambdaMetrics, getLambdaMetrics } from '@/lib/aws/services/cloudwatch';

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const functionName = url.searchParams.get('function');
    const timeRange = url.searchParams.get('timeRange') as '1h' | '6h' | '24h' | '7d' || '24h';

    let data;

    if (functionName) {
      // Get metrics for specific function
      data = await getLambdaMetrics(functionName, timeRange);
    } else {
      // Get metrics for all functions
      data = await getAllLambdaMetrics(timeRange);
    }

    return new Response(JSON.stringify({
      success: true,
      data,
      timestamp: new Date().toISOString(),
      timeRange
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=120'
      }
    });
  } catch (error) {
    console.error('Error fetching Lambda metrics:', error);

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch Lambda metrics',
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