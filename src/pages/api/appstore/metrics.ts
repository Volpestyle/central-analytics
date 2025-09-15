import type { APIRoute } from 'astro';
import { createAppStoreConnectClient } from '@/lib/appstore/client';
import { format, subDays } from 'date-fns';

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const appId = url.searchParams.get('appId') || process.env.APPSTORE_APP_ID;
    const metricType = url.searchParams.get('metricType') || 'overview';
    const timeRange = url.searchParams.get('timeRange') || '7d';

    if (!appId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'App ID is required',
        timestamp: new Date().toISOString()
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    const client = createAppStoreConnectClient();

    let endDate = new Date();
    let startDate: Date;

    switch (timeRange) {
      case '7d':
        startDate = subDays(endDate, 7);
        break;
      case '30d':
        startDate = subDays(endDate, 30);
        break;
      case '90d':
        startDate = subDays(endDate, 90);
        break;
      default:
        startDate = subDays(endDate, 7);
    }

    let data: any = {};

    switch (metricType) {
      case 'overview':
        // Get multiple metrics for overview
        const [appInfo, ratings, recentReviews] = await Promise.all([
          client.getApp(appId),
          client.getAppRatings(appId),
          client.getCustomerReviews(appId, { limit: 10, sort: 'mostRecent' })
        ]);

        data = {
          app: appInfo,
          ratings,
          recentReviews
        };
        break;

      case 'performance':
        // Get performance metrics
        const perfMetrics = await Promise.all([
          client.getPerformanceMetrics(appId, {
            metricType: 'LAUNCH_TIME',
            platform: 'IOS',
            startDate: format(startDate, 'yyyy-MM-dd'),
            endDate: format(endDate, 'yyyy-MM-dd')
          }),
          client.getPerformanceMetrics(appId, {
            metricType: 'HANG_RATE',
            platform: 'IOS',
            startDate: format(startDate, 'yyyy-MM-dd'),
            endDate: format(endDate, 'yyyy-MM-dd')
          }),
          client.getPerformanceMetrics(appId, {
            metricType: 'MEMORY',
            platform: 'IOS',
            startDate: format(startDate, 'yyyy-MM-dd'),
            endDate: format(endDate, 'yyyy-MM-dd')
          })
        ]);

        data = {
          launchTime: perfMetrics[0],
          hangRate: perfMetrics[1],
          memory: perfMetrics[2]
        };
        break;

      case 'crashes':
        // Get crash data
        data = await client.getDiagnosticSignatures(appId, {
          limit: 50,
          sort: '-weight'
        });
        break;

      case 'reviews':
        // Get customer reviews
        data = await client.getCustomerReviews(appId, {
          limit: 100,
          sort: 'mostRecent'
        });
        break;

      case 'sales':
        // Get sales reports
        const vendorNumber = process.env.APPSTORE_VENDOR_NUMBER;
        if (!vendorNumber) {
          throw new Error('Vendor number not configured');
        }

        data = await client.getSalesReports({
          frequency: 'DAILY',
          reportType: 'SALES',
          reportSubType: 'SUMMARY',
          vendorNumber,
          reportDate: format(endDate, 'yyyy-MM-dd')
        });
        break;

      case 'testflight':
        // Get TestFlight information
        const [builds, betaTesters] = await Promise.all([
          client.getBuilds(appId, { limit: 20, sort: '-uploadedDate' }),
          client.getBetaTesters(appId, { limit: 100 })
        ]);

        data = {
          builds,
          betaTesters
        };
        break;

      default:
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid metric type',
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
      metricType,
      timeRange,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, s-maxage=900, stale-while-revalidate=600' // Cache for 5 minutes
      }
    });
  } catch (error) {
    console.error('Error fetching App Store metrics:', error);

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch App Store metrics',
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