import {
  GetCostAndUsageCommand,
  GetCostForecastCommand,
  GetDimensionValuesCommand,
  type GetCostAndUsageCommandInput,
  type GetCostForecastCommandInput,
  type DateInterval,
  type Granularity,
  type Metric
} from '@aws-sdk/client-cost-explorer';
import { getCostExplorerClient } from '../clients';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

export interface CostData {
  date: string;
  amount: number;
  unit: string;
  service?: string;
}

export interface ServiceCost {
  service: string;
  amount: number;
  percentage: number;
}

export interface CostSummary {
  total: number;
  byService: ServiceCost[];
  trend: CostData[];
  forecast?: number;
  currency: string;
}

// Get daily cost data for a date range
export const getDailyCosts = async (
  startDate: Date,
  endDate: Date,
  groupBy?: 'SERVICE' | 'LINKED_ACCOUNT' | 'REGION'
): Promise<CostData[]> => {
  const client = getCostExplorerClient();

  const input: GetCostAndUsageCommandInput = {
    TimePeriod: {
      Start: format(startDate, 'yyyy-MM-dd'),
      End: format(endDate, 'yyyy-MM-dd')
    },
    Granularity: 'DAILY',
    Metrics: ['UnblendedCost'],
    GroupBy: groupBy ? [{ Type: 'DIMENSION', Key: groupBy }] : undefined
  };

  try {
    const command = new GetCostAndUsageCommand(input);
    const response = await client.send(command);

    const costData: CostData[] = [];

    if (response.ResultsByTime) {
      response.ResultsByTime.forEach(result => {
        const date = result.TimePeriod?.Start || '';

        if (result.Groups && result.Groups.length > 0) {
          // Grouped data
          result.Groups.forEach(group => {
            const amount = parseFloat(group.Metrics?.UnblendedCost?.Amount || '0');
            const unit = group.Metrics?.UnblendedCost?.Unit || 'USD';
            const service = group.Keys?.[0] || 'Unknown';

            costData.push({
              date,
              amount,
              unit,
              service
            });
          });
        } else {
          // Non-grouped data
          const amount = parseFloat(result.Total?.UnblendedCost?.Amount || '0');
          const unit = result.Total?.UnblendedCost?.Unit || 'USD';

          costData.push({
            date,
            amount,
            unit
          });
        }
      });
    }

    return costData;
  } catch (error) {
    console.error('Error fetching cost data:', error);
    return [];
  }
};

// Get cost breakdown by service for current month
export const getServiceCosts = async (): Promise<ServiceCost[]> => {
  const client = getCostExplorerClient();

  const now = new Date();
  const startDate = startOfMonth(now);
  const endDate = endOfMonth(now);

  const input: GetCostAndUsageCommandInput = {
    TimePeriod: {
      Start: format(startDate, 'yyyy-MM-dd'),
      End: format(endDate, 'yyyy-MM-dd')
    },
    Granularity: 'MONTHLY',
    Metrics: ['UnblendedCost'],
    GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
    Filter: {
      Not: {
        Dimensions: {
          Key: 'RECORD_TYPE',
          Values: ['Credit', 'Refund']
        }
      }
    }
  };

  try {
    const command = new GetCostAndUsageCommand(input);
    const response = await client.send(command);

    const serviceCosts: ServiceCost[] = [];
    let totalCost = 0;

    if (response.ResultsByTime && response.ResultsByTime[0]) {
      const result = response.ResultsByTime[0];

      if (result.Groups) {
        // Calculate total cost
        result.Groups.forEach(group => {
          const amount = parseFloat(group.Metrics?.UnblendedCost?.Amount || '0');
          totalCost += amount;
        });

        // Calculate service costs with percentages
        result.Groups.forEach(group => {
          const service = group.Keys?.[0] || 'Unknown';
          const amount = parseFloat(group.Metrics?.UnblendedCost?.Amount || '0');
          const percentage = totalCost > 0 ? (amount / totalCost) * 100 : 0;

          if (amount > 0.01) { // Filter out negligible costs
            serviceCosts.push({
              service,
              amount,
              percentage
            });
          }
        });

        // Sort by amount descending
        serviceCosts.sort((a, b) => b.amount - a.amount);
      }
    }

    return serviceCosts;
  } catch (error) {
    console.error('Error fetching service costs:', error);
    return [];
  }
};

// Get cost forecast for next month
export const getCostForecast = async (): Promise<number> => {
  const client = getCostExplorerClient();

  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() + 1, 1); // First day of next month
  const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0); // Last day of next month

  const input: GetCostForecastCommandInput = {
    TimePeriod: {
      Start: format(startDate, 'yyyy-MM-dd'),
      End: format(endDate, 'yyyy-MM-dd')
    },
    Metric: 'UNBLENDED_COST',
    Granularity: 'MONTHLY'
  };

  try {
    const command = new GetCostForecastCommand(input);
    const response = await client.send(command);

    if (response.Total?.Amount) {
      return parseFloat(response.Total.Amount);
    }

    return 0;
  } catch (error) {
    console.error('Error fetching cost forecast:', error);
    return 0;
  }
};

// Get comprehensive cost summary
export const getCostSummary = async (
  timeRange: '7d' | '30d' | 'mtd' | '3m' = '30d'
): Promise<CostSummary> => {
  let startDate: Date;
  const endDate = new Date();

  switch (timeRange) {
    case '7d':
      startDate = subDays(endDate, 7);
      break;
    case '30d':
      startDate = subDays(endDate, 30);
      break;
    case 'mtd': // Month to date
      startDate = startOfMonth(endDate);
      break;
    case '3m':
      startDate = subDays(endDate, 90);
      break;
  }

  // Get daily costs
  const dailyCosts = await getDailyCosts(startDate, endDate);

  // Get service breakdown
  const serviceCosts = await getServiceCosts();

  // Get forecast
  const forecast = await getCostForecast();

  // Calculate total
  const total = dailyCosts.reduce((sum, cost) => sum + cost.amount, 0);

  return {
    total,
    byService: serviceCosts,
    trend: dailyCosts,
    forecast,
    currency: 'USD'
  };
};

// Get specific service cost details
export const getServiceCostDetails = async (
  serviceName: string,
  timeRange: '7d' | '30d' | '3m' = '30d'
): Promise<CostData[]> => {
  const client = getCostExplorerClient();

  let startDate: Date;
  const endDate = new Date();

  switch (timeRange) {
    case '7d':
      startDate = subDays(endDate, 7);
      break;
    case '30d':
      startDate = subDays(endDate, 30);
      break;
    case '3m':
      startDate = subDays(endDate, 90);
      break;
  }

  const input: GetCostAndUsageCommandInput = {
    TimePeriod: {
      Start: format(startDate, 'yyyy-MM-dd'),
      End: format(endDate, 'yyyy-MM-dd')
    },
    Granularity: timeRange === '7d' ? 'DAILY' : 'MONTHLY',
    Metrics: ['UnblendedCost', 'UsageQuantity'],
    Filter: {
      Dimensions: {
        Key: 'SERVICE',
        Values: [serviceName]
      }
    },
    GroupBy: [{ Type: 'DIMENSION', Key: 'USAGE_TYPE' }]
  };

  try {
    const command = new GetCostAndUsageCommand(input);
    const response = await client.send(command);

    const costData: CostData[] = [];

    if (response.ResultsByTime) {
      response.ResultsByTime.forEach(result => {
        const date = result.TimePeriod?.Start || '';

        if (result.Groups) {
          result.Groups.forEach(group => {
            const amount = parseFloat(group.Metrics?.UnblendedCost?.Amount || '0');
            const unit = group.Metrics?.UnblendedCost?.Unit || 'USD';
            const service = group.Keys?.[0] || serviceName;

            if (amount > 0) {
              costData.push({
                date,
                amount,
                unit,
                service
              });
            }
          });
        }
      });
    }

    return costData;
  } catch (error) {
    console.error(`Error fetching cost details for ${serviceName}:`, error);
    return [];
  }
};

// Get cost anomalies (significant cost increases)
export const detectCostAnomalies = async (
  threshold: number = 0.2 // 20% increase threshold
): Promise<{ date: string; service: string; increase: number }[]> => {
  const endDate = new Date();
  const startDate = subDays(endDate, 14); // Get 2 weeks of data

  const costs = await getDailyCosts(startDate, endDate, 'SERVICE');

  const anomalies: { date: string; service: string; increase: number }[] = [];

  // Group costs by service
  const serviceMap = new Map<string, CostData[]>();
  costs.forEach(cost => {
    if (cost.service) {
      if (!serviceMap.has(cost.service)) {
        serviceMap.set(cost.service, []);
      }
      serviceMap.get(cost.service)?.push(cost);
    }
  });

  // Detect anomalies for each service
  serviceMap.forEach((serviceCosts, service) => {
    serviceCosts.sort((a, b) => a.date.localeCompare(b.date));

    for (let i = 1; i < serviceCosts.length; i++) {
      const current = serviceCosts[i];
      const previous = serviceCosts[i - 1];

      if (previous.amount > 0) {
        const increase = (current.amount - previous.amount) / previous.amount;

        if (increase > threshold) {
          anomalies.push({
            date: current.date,
            service,
            increase: increase * 100 // Convert to percentage
          });
        }
      }
    }
  });

  return anomalies;
};