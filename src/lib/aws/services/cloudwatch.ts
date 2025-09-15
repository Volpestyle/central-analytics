import {
  GetMetricStatisticsCommand,
  GetMetricDataCommand,
  ListMetricsCommand,
  type GetMetricStatisticsCommandInput,
  type GetMetricDataCommandInput,
  type MetricDataQuery,
  type Dimension
} from '@aws-sdk/client-cloudwatch';
import { getCloudWatchClient } from '../clients';
import { AWS_RESOURCES } from '../config';
import { subHours, subDays } from 'date-fns';

export interface MetricQuery {
  namespace: string;
  metricName: string;
  dimensions?: Dimension[];
  stat?: string;
  period?: number;
  startTime?: Date;
  endTime?: Date;
}

export interface LambdaMetrics {
  invocations: number;
  errors: number;
  duration: number;
  throttles: number;
  concurrentExecutions: number;
}

export interface APIGatewayMetrics {
  count: number;
  latency: number;
  '4xxErrors': number;
  '5xxErrors': number;
}

export interface DynamoDBMetrics {
  consumedReadCapacity: number;
  consumedWriteCapacity: number;
  throttledRequests: number;
  userErrors: number;
  systemErrors: number;
}

// Get metrics for a specific Lambda function
export const getLambdaMetrics = async (
  functionName: string,
  timeRange: '1h' | '6h' | '24h' | '7d' = '24h'
): Promise<LambdaMetrics> => {
  const client = getCloudWatchClient();

  const endTime = new Date();
  let startTime: Date;
  let period = 300; // 5 minutes default

  switch (timeRange) {
    case '1h':
      startTime = subHours(endTime, 1);
      period = 60; // 1 minute
      break;
    case '6h':
      startTime = subHours(endTime, 6);
      period = 300; // 5 minutes
      break;
    case '24h':
      startTime = subHours(endTime, 24);
      period = 900; // 15 minutes
      break;
    case '7d':
      startTime = subDays(endTime, 7);
      period = 3600; // 1 hour
      break;
  }

  const queries: MetricDataQuery[] = [
    {
      Id: 'm1',
      MetricStat: {
        Metric: {
          Namespace: 'AWS/Lambda',
          MetricName: 'Invocations',
          Dimensions: [{ Name: 'FunctionName', Value: functionName }]
        },
        Period: period,
        Stat: 'Sum'
      }
    },
    {
      Id: 'm2',
      MetricStat: {
        Metric: {
          Namespace: 'AWS/Lambda',
          MetricName: 'Errors',
          Dimensions: [{ Name: 'FunctionName', Value: functionName }]
        },
        Period: period,
        Stat: 'Sum'
      }
    },
    {
      Id: 'm3',
      MetricStat: {
        Metric: {
          Namespace: 'AWS/Lambda',
          MetricName: 'Duration',
          Dimensions: [{ Name: 'FunctionName', Value: functionName }]
        },
        Period: period,
        Stat: 'Average'
      }
    },
    {
      Id: 'm4',
      MetricStat: {
        Metric: {
          Namespace: 'AWS/Lambda',
          MetricName: 'Throttles',
          Dimensions: [{ Name: 'FunctionName', Value: functionName }]
        },
        Period: period,
        Stat: 'Sum'
      }
    },
    {
      Id: 'm5',
      MetricStat: {
        Metric: {
          Namespace: 'AWS/Lambda',
          MetricName: 'ConcurrentExecutions',
          Dimensions: [{ Name: 'FunctionName', Value: functionName }]
        },
        Period: period,
        Stat: 'Maximum'
      }
    }
  ];

  const input: GetMetricDataCommandInput = {
    MetricDataQueries: queries,
    StartTime: startTime,
    EndTime: endTime
  };

  const command = new GetMetricDataCommand(input);
  const response = await client.send(command);

  const metrics: LambdaMetrics = {
    invocations: 0,
    errors: 0,
    duration: 0,
    throttles: 0,
    concurrentExecutions: 0
  };

  if (response.MetricDataResults) {
    response.MetricDataResults.forEach(result => {
      const values = result.Values || [];
      const sum = values.reduce((acc, val) => acc + (val || 0), 0);
      const avg = values.length > 0 ? sum / values.length : 0;
      const max = values.length > 0 ? Math.max(...values) : 0;

      switch (result.Id) {
        case 'm1':
          metrics.invocations = sum;
          break;
        case 'm2':
          metrics.errors = sum;
          break;
        case 'm3':
          metrics.duration = avg;
          break;
        case 'm4':
          metrics.throttles = sum;
          break;
        case 'm5':
          metrics.concurrentExecutions = max;
          break;
      }
    });
  }

  return metrics;
};

// Get metrics for all Lambda functions
export const getAllLambdaMetrics = async (
  timeRange: '1h' | '6h' | '24h' | '7d' = '24h'
): Promise<Record<string, LambdaMetrics>> => {
  const results: Record<string, LambdaMetrics> = {};

  await Promise.all(
    AWS_RESOURCES.lambda.functions.map(async (functionName) => {
      try {
        results[functionName] = await getLambdaMetrics(functionName, timeRange);
      } catch (error) {
        console.error(`Error fetching metrics for ${functionName}:`, error);
        results[functionName] = {
          invocations: 0,
          errors: 0,
          duration: 0,
          throttles: 0,
          concurrentExecutions: 0
        };
      }
    })
  );

  return results;
};

// Get API Gateway metrics
export const getAPIGatewayMetrics = async (
  apiName: string,
  timeRange: '1h' | '6h' | '24h' | '7d' = '24h'
): Promise<APIGatewayMetrics> => {
  const client = getCloudWatchClient();

  const endTime = new Date();
  let startTime: Date;
  let period = 300;

  switch (timeRange) {
    case '1h':
      startTime = subHours(endTime, 1);
      period = 60;
      break;
    case '6h':
      startTime = subHours(endTime, 6);
      period = 300;
      break;
    case '24h':
      startTime = subHours(endTime, 24);
      period = 900;
      break;
    case '7d':
      startTime = subDays(endTime, 7);
      period = 3600;
      break;
  }

  const queries: MetricDataQuery[] = [
    {
      Id: 'm1',
      MetricStat: {
        Metric: {
          Namespace: 'AWS/ApiGateway',
          MetricName: 'Count',
          Dimensions: [{ Name: 'ApiName', Value: apiName }]
        },
        Period: period,
        Stat: 'Sum'
      }
    },
    {
      Id: 'm2',
      MetricStat: {
        Metric: {
          Namespace: 'AWS/ApiGateway',
          MetricName: 'Latency',
          Dimensions: [{ Name: 'ApiName', Value: apiName }]
        },
        Period: period,
        Stat: 'Average'
      }
    },
    {
      Id: 'm3',
      MetricStat: {
        Metric: {
          Namespace: 'AWS/ApiGateway',
          MetricName: '4XXError',
          Dimensions: [{ Name: 'ApiName', Value: apiName }]
        },
        Period: period,
        Stat: 'Sum'
      }
    },
    {
      Id: 'm4',
      MetricStat: {
        Metric: {
          Namespace: 'AWS/ApiGateway',
          MetricName: '5XXError',
          Dimensions: [{ Name: 'ApiName', Value: apiName }]
        },
        Period: period,
        Stat: 'Sum'
      }
    }
  ];

  const input: GetMetricDataCommandInput = {
    MetricDataQueries: queries,
    StartTime: startTime,
    EndTime: endTime
  };

  const command = new GetMetricDataCommand(input);
  const response = await client.send(command);

  const metrics: APIGatewayMetrics = {
    count: 0,
    latency: 0,
    '4xxErrors': 0,
    '5xxErrors': 0
  };

  if (response.MetricDataResults) {
    response.MetricDataResults.forEach(result => {
      const values = result.Values || [];
      const sum = values.reduce((acc, val) => acc + (val || 0), 0);
      const avg = values.length > 0 ? sum / values.length : 0;

      switch (result.Id) {
        case 'm1':
          metrics.count = sum;
          break;
        case 'm2':
          metrics.latency = avg;
          break;
        case 'm3':
          metrics['4xxErrors'] = sum;
          break;
        case 'm4':
          metrics['5xxErrors'] = sum;
          break;
      }
    });
  }

  return metrics;
};

// Get DynamoDB metrics for a specific table
export const getDynamoDBMetrics = async (
  tableName: string,
  timeRange: '1h' | '6h' | '24h' | '7d' = '24h'
): Promise<DynamoDBMetrics> => {
  const client = getCloudWatchClient();

  const endTime = new Date();
  let startTime: Date;
  let period = 300;

  switch (timeRange) {
    case '1h':
      startTime = subHours(endTime, 1);
      period = 60;
      break;
    case '6h':
      startTime = subHours(endTime, 6);
      period = 300;
      break;
    case '24h':
      startTime = subHours(endTime, 24);
      period = 900;
      break;
    case '7d':
      startTime = subDays(endTime, 7);
      period = 3600;
      break;
  }

  const queries: MetricDataQuery[] = [
    {
      Id: 'm1',
      MetricStat: {
        Metric: {
          Namespace: 'AWS/DynamoDB',
          MetricName: 'ConsumedReadCapacityUnits',
          Dimensions: [{ Name: 'TableName', Value: tableName }]
        },
        Period: period,
        Stat: 'Sum'
      }
    },
    {
      Id: 'm2',
      MetricStat: {
        Metric: {
          Namespace: 'AWS/DynamoDB',
          MetricName: 'ConsumedWriteCapacityUnits',
          Dimensions: [{ Name: 'TableName', Value: tableName }]
        },
        Period: period,
        Stat: 'Sum'
      }
    },
    {
      Id: 'm3',
      MetricStat: {
        Metric: {
          Namespace: 'AWS/DynamoDB',
          MetricName: 'ThrottledRequests',
          Dimensions: [{ Name: 'TableName', Value: tableName }]
        },
        Period: period,
        Stat: 'Sum'
      }
    },
    {
      Id: 'm4',
      MetricStat: {
        Metric: {
          Namespace: 'AWS/DynamoDB',
          MetricName: 'UserErrors',
          Dimensions: [{ Name: 'TableName', Value: tableName }]
        },
        Period: period,
        Stat: 'Sum'
      }
    },
    {
      Id: 'm5',
      MetricStat: {
        Metric: {
          Namespace: 'AWS/DynamoDB',
          MetricName: 'SystemErrors',
          Dimensions: [{ Name: 'TableName', Value: tableName }]
        },
        Period: period,
        Stat: 'Sum'
      }
    }
  ];

  const input: GetMetricDataCommandInput = {
    MetricDataQueries: queries,
    StartTime: startTime,
    EndTime: endTime
  };

  const command = new GetMetricDataCommand(input);
  const response = await client.send(command);

  const metrics: DynamoDBMetrics = {
    consumedReadCapacity: 0,
    consumedWriteCapacity: 0,
    throttledRequests: 0,
    userErrors: 0,
    systemErrors: 0
  };

  if (response.MetricDataResults) {
    response.MetricDataResults.forEach(result => {
      const values = result.Values || [];
      const sum = values.reduce((acc, val) => acc + (val || 0), 0);

      switch (result.Id) {
        case 'm1':
          metrics.consumedReadCapacity = sum;
          break;
        case 'm2':
          metrics.consumedWriteCapacity = sum;
          break;
        case 'm3':
          metrics.throttledRequests = sum;
          break;
        case 'm4':
          metrics.userErrors = sum;
          break;
        case 'm5':
          metrics.systemErrors = sum;
          break;
      }
    });
  }

  return metrics;
};

// Get metrics for all DynamoDB tables
export const getAllDynamoDBMetrics = async (
  timeRange: '1h' | '6h' | '24h' | '7d' = '24h'
): Promise<Record<string, DynamoDBMetrics>> => {
  const results: Record<string, DynamoDBMetrics> = {};

  await Promise.all(
    AWS_RESOURCES.dynamodb.tables.map(async (tableName) => {
      try {
        results[tableName] = await getDynamoDBMetrics(tableName, timeRange);
      } catch (error) {
        console.error(`Error fetching metrics for ${tableName}:`, error);
        results[tableName] = {
          consumedReadCapacity: 0,
          consumedWriteCapacity: 0,
          throttledRequests: 0,
          userErrors: 0,
          systemErrors: 0
        };
      }
    })
  );

  return results;
};