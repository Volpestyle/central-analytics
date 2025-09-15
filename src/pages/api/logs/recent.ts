import type { APIRoute } from 'astro';
import { getRecentLogs, getAllErrorLogs } from '@/lib/aws/services/cloudwatch-logs';

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const logGroup = url.searchParams.get('logGroup');
    const timeRange = url.searchParams.get('timeRange') as '1h' | '6h' | '24h' | '7d' || '1h';
    const filterPattern = url.searchParams.get('filter') || undefined;
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);
    const errorsOnly = url.searchParams.get('errorsOnly') === 'true';

    let data;

    if (errorsOnly) {
      // Get error logs from all log groups
      data = await getAllErrorLogs(timeRange, limit);
    } else if (logGroup) {
      // Get logs from specific log group
      data = await getRecentLogs(logGroup, timeRange, filterPattern, limit);
    } else {
      // Return error if no log group specified and not requesting errors
      return new Response(JSON.stringify({
        success: false,
        error: 'Log group name is required unless requesting errors only',
        timestamp: new Date().toISOString()
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data,
      timestamp: new Date().toISOString(),
      timeRange,
      filterPattern
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=30, s-maxage=120, stale-while-revalidate=60'
      }
    });
  } catch (error) {
    console.error('Error fetching logs:', error);

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch logs',
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