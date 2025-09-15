import {
  FilterLogEventsCommand,
  GetLogEventsCommand,
  DescribeLogStreamsCommand,
  type FilterLogEventsCommandInput,
  type GetLogEventsCommandInput,
  type LogEvent
} from '@aws-sdk/client-cloudwatch-logs';
import { getCloudWatchLogsClient } from '../clients';
import { AWS_RESOURCES } from '../config';
import { subHours, subDays } from 'date-fns';

export interface LogQuery {
  logGroupName: string;
  filterPattern?: string;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  logStreamNamePrefix?: string;
}

export interface ParsedLogEvent {
  timestamp: Date;
  message: string;
  level?: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  requestId?: string;
  duration?: number;
  memoryUsed?: number;
  functionName?: string;
  raw: LogEvent;
}

// Parse Lambda log messages
const parseLambdaLog = (event: LogEvent): ParsedLogEvent => {
  const message = event.message || '';
  const timestamp = new Date(event.timestamp || Date.now());

  let level: ParsedLogEvent['level'] = 'INFO';
  let requestId: string | undefined;
  let duration: number | undefined;
  let memoryUsed: number | undefined;

  // Detect log level
  if (message.includes('ERROR') || message.includes('Error')) {
    level = 'ERROR';
  } else if (message.includes('WARN') || message.includes('Warning')) {
    level = 'WARN';
  } else if (message.includes('DEBUG')) {
    level = 'DEBUG';
  }

  // Extract request ID from START/END/REPORT messages
  const requestIdMatch = message.match(/RequestId:\s+([a-f0-9-]+)/);
  if (requestIdMatch) {
    requestId = requestIdMatch[1];
  }

  // Extract duration from REPORT messages
  const durationMatch = message.match(/Duration:\s+([\d.]+)\s+ms/);
  if (durationMatch) {
    duration = parseFloat(durationMatch[1]);
  }

  // Extract memory usage from REPORT messages
  const memoryMatch = message.match(/Max Memory Used:\s+(\d+)\s+MB/);
  if (memoryMatch) {
    memoryUsed = parseInt(memoryMatch[1], 10);
  }

  return {
    timestamp,
    message,
    level,
    requestId,
    duration,
    memoryUsed,
    raw: event
  };
};

// Get recent logs from a log group
export const getRecentLogs = async (
  logGroupName: string,
  timeRange: '1h' | '6h' | '24h' | '7d' = '1h',
  filterPattern?: string,
  limit: number = 100
): Promise<ParsedLogEvent[]> => {
  const client = getCloudWatchLogsClient();

  const endTime = new Date();
  let startTime: Date;

  switch (timeRange) {
    case '1h':
      startTime = subHours(endTime, 1);
      break;
    case '6h':
      startTime = subHours(endTime, 6);
      break;
    case '24h':
      startTime = subHours(endTime, 24);
      break;
    case '7d':
      startTime = subDays(endTime, 7);
      break;
  }

  const input: FilterLogEventsCommandInput = {
    logGroupName,
    startTime: startTime.getTime(),
    endTime: endTime.getTime(),
    limit,
    filterPattern
  };

  try {
    const command = new FilterLogEventsCommand(input);
    const response = await client.send(command);

    const events = response.events || [];
    return events.map(parseLambdaLog);
  } catch (error) {
    console.error(`Error fetching logs from ${logGroupName}:`, error);
    return [];
  }
};

// Get error logs from all Lambda functions
export const getAllErrorLogs = async (
  timeRange: '1h' | '6h' | '24h' | '7d' = '1h',
  limit: number = 50
): Promise<Record<string, ParsedLogEvent[]>> => {
  const results: Record<string, ParsedLogEvent[]> = {};

  await Promise.all(
    AWS_RESOURCES.cloudwatch.logGroups.map(async (logGroupName) => {
      try {
        const logs = await getRecentLogs(
          logGroupName,
          timeRange,
          '[ERROR]', // Filter for error messages
          limit
        );
        if (logs.length > 0) {
          results[logGroupName] = logs;
        }
      } catch (error) {
        console.error(`Error fetching error logs from ${logGroupName}:`, error);
      }
    })
  );

  return results;
};

// Get performance logs (REPORT messages with duration/memory)
export const getPerformanceLogs = async (
  logGroupName: string,
  timeRange: '1h' | '6h' | '24h' | '7d' = '1h',
  limit: number = 100
): Promise<ParsedLogEvent[]> => {
  return getRecentLogs(
    logGroupName,
    timeRange,
    'REPORT RequestId', // Filter for Lambda REPORT messages
    limit
  );
};

// Get logs by request ID
export const getLogsByRequestId = async (
  logGroupName: string,
  requestId: string
): Promise<ParsedLogEvent[]> => {
  return getRecentLogs(
    logGroupName,
    '24h', // Search within last 24 hours
    requestId,
    1000 // Get all logs for this request
  );
};

// Get aggregated log statistics
export interface LogStatistics {
  totalLogs: number;
  errorCount: number;
  warnCount: number;
  averageDuration: number;
  maxDuration: number;
  averageMemoryUsed: number;
  maxMemoryUsed: number;
  errorRate: number;
}

export const getLogStatistics = async (
  logGroupName: string,
  timeRange: '1h' | '6h' | '24h' | '7d' = '1h'
): Promise<LogStatistics> => {
  const logs = await getRecentLogs(logGroupName, timeRange, undefined, 1000);

  const stats: LogStatistics = {
    totalLogs: logs.length,
    errorCount: 0,
    warnCount: 0,
    averageDuration: 0,
    maxDuration: 0,
    averageMemoryUsed: 0,
    maxMemoryUsed: 0,
    errorRate: 0
  };

  const durations: number[] = [];
  const memoryUsages: number[] = [];

  logs.forEach(log => {
    if (log.level === 'ERROR') stats.errorCount++;
    if (log.level === 'WARN') stats.warnCount++;
    if (log.duration) {
      durations.push(log.duration);
      stats.maxDuration = Math.max(stats.maxDuration, log.duration);
    }
    if (log.memoryUsed) {
      memoryUsages.push(log.memoryUsed);
      stats.maxMemoryUsed = Math.max(stats.maxMemoryUsed, log.memoryUsed);
    }
  });

  if (durations.length > 0) {
    stats.averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  }

  if (memoryUsages.length > 0) {
    stats.averageMemoryUsed = memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length;
  }

  if (stats.totalLogs > 0) {
    stats.errorRate = stats.errorCount / stats.totalLogs;
  }

  return stats;
};

// Stream logs in real-time (for live monitoring)
export async function* streamLogs(
  logGroupName: string,
  filterPattern?: string,
  pollingInterval: number = 5000 // 5 seconds
): AsyncGenerator<ParsedLogEvent[], void, unknown> {
  const client = getCloudWatchLogsClient();
  let lastEventTime = Date.now() - 60000; // Start from 1 minute ago

  while (true) {
    try {
      const input: FilterLogEventsCommandInput = {
        logGroupName,
        startTime: lastEventTime,
        endTime: Date.now(),
        filterPattern,
        limit: 100
      };

      const command = new FilterLogEventsCommand(input);
      const response = await client.send(command);

      if (response.events && response.events.length > 0) {
        const parsedEvents = response.events.map(parseLambdaLog);
        yield parsedEvents;

        // Update last event time to avoid duplicates
        const latestEvent = response.events[response.events.length - 1];
        if (latestEvent.timestamp) {
          lastEventTime = latestEvent.timestamp + 1;
        }
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollingInterval));
    } catch (error) {
      console.error('Error streaming logs:', error);
      // Continue streaming even if there's an error
      await new Promise(resolve => setTimeout(resolve, pollingInterval));
    }
  }
}