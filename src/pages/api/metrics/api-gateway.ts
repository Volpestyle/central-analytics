import type { APIRoute } from 'astro';
import { getAPIGatewayMetrics } from '@/lib/aws/services/cloudwatch';
import { AWS_RESOURCES } from '@/lib/aws/config';

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const timeRange = url.searchParams.get('timeRange') as '1h' | '6h' | '24h' | '7d' || '24h';
    const apiName = url.searchParams.get('apiName') || AWS_RESOURCES.apiGateway.apiName;

    const data = await getAPIGatewayMetrics(apiName, timeRange);

    return new Response(JSON.stringify({
      success: true,
      data,
      apiName,
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
    console.error('Error fetching API Gateway metrics:', error);

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch API Gateway metrics',
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