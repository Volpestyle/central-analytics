import type { APIRoute } from 'astro';
import { getAllDynamoDBMetrics, getDynamoDBMetrics } from '@/lib/aws/services/cloudwatch';

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const tableName = url.searchParams.get('table');
    const timeRange = url.searchParams.get('timeRange') as '1h' | '6h' | '24h' | '7d' || '24h';

    let data;

    if (tableName) {
      // Get metrics for specific table
      data = await getDynamoDBMetrics(tableName, timeRange);
    } else {
      // Get metrics for all tables
      data = await getAllDynamoDBMetrics(timeRange);
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
    console.error('Error fetching DynamoDB metrics:', error);

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch DynamoDB metrics',
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