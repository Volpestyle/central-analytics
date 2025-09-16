# Central Analytics Quick Reference

## 🚀 Quick Start

### Creating a New Chart Component

```tsx
import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { ChartContainer } from '@components/charts/ChartContainer';
import { useChartData } from '@/hooks/useChartData';
import { createLineChartOptions } from '@/utils/chartUtils';

export const NewChart = React.memo(({ appId, timeRange }) => {
  const { data, isLoading, error, refetch } = useChartData({
    appId,
    timeRange,
    endpoint: `/api/your-endpoint`
  });

  const options = useMemo(() =>
    createLineChartOptions({ data: data?.values || [] }),
    [data]
  );

  return (
    <ChartContainer
      title="Your Chart"
      loading={isLoading}
      error={error}
      onRetry={refetch}
    >
      {data && <ReactECharts option={options} />}
    </ChartContainer>
  );
});
```

## 📦 Common Imports

```typescript
// UI Components
import { Button } from '@components/ui/Button';
import { ErrorState } from '@components/ui/ErrorState';
import { LoadingState } from '@components/ui/LoadingState';
import { ChartContainer } from '@components/charts/ChartContainer';
import { KPICard } from '@components/charts/KPICard';

// Hooks
import { useChartData } from '@/hooks/useChartData';
import { useFetchMetrics, useParallelFetch } from '@/hooks/useFetchMetrics';
import { useChartViewModes, useFormattedChartData } from '@/hooks/useChartData';

// Utilities
import { formatNumber, formatPercentage, formatTimestamps } from '@/utils/chartUtils';
import { createLineChartOptions, createBarChartOptions } from '@/utils/chartUtils';
import { darkTheme, getResponsiveOptions } from '@/utils/chartTheme';

// Types
import type { User } from '@/types/auth';
import type { ApiResponse, MetricsResponse } from '@/types/api';
import type { ChartDataPoint, ChartSeries } from '@/types/charts';
```

## 🎨 Component Patterns

### Data Fetching Pattern
```tsx
const { data, isLoading, error, refetch } = useChartData<DataType>({
  appId: 'app-123',
  timeRange: '7d',
  endpoint: '/api/metrics',
  transformData: (raw) => ({ formatted: raw })
});
```

### Error Handling Pattern
```tsx
if (isLoading) return <LoadingState />;
if (error) return <ErrorState message={error} onRetry={refetch} />;
if (!data) return <EmptyState />;
return <YourComponent data={data} />;
```

### Memoization Pattern
```tsx
const Component = React.memo(({ prop1, prop2 }) => {
  const computed = useMemo(() => expensiveOperation(prop1), [prop1]);
  const callback = useCallback(() => doSomething(prop2), [prop2]);
  return <div>{computed}</div>;
});
```

## 🔧 Utility Functions

### Format Helpers
```typescript
formatNumber(1234567)        // "1.2M"
formatNumber(1234)           // "1.2K"
formatPercentage(0.125)      // "12.5%"
formatTimestamps(data, '24h') // ["12 PM", "1 PM", ...]
```

### Chart Options Builders
```typescript
createLineChartOptions({
  data: [1, 2, 3, 4, 5],
  timestamps: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  title: 'My Chart',
  smooth: true,
  colors: ['#0A84FF'],
  showArea: true
});

createBarChartOptions({
  data: [10, 20, 30],
  xAxisData: ['A', 'B', 'C'],
  title: 'Bar Chart',
  colors: ['#32D74B']
});
```

## 🎯 Type Definitions

### Common Interfaces
```typescript
// User authentication
interface User {
  id: string;
  email?: string;
  name?: string;
  isAdmin: boolean;
}

// API responses
interface ApiResponse<T> {
  data: T;
  metadata?: Record<string, unknown>;
  error?: ApiError;
}

// Chart data
interface ChartDataPoint {
  timestamp: string | Date;
  value: number;
  label?: string;
}
```

## 🎨 Style Classes

### Tailwind Utilities
```tsx
// Text colors
className="text-white"          // Primary text
className="text-gray-400"        // Secondary text
className="text-green-400"       // Success
className="text-red-400"         // Error
className="text-yellow-400"      // Warning
className="text-blue-400"        // Info

// Backgrounds
className="bg-gray-900"          // Card background
className="bg-surface-dark"      // Dark surface
className="border-gray-800"      // Border

// Layout
className="p-4 rounded-xl"       // Card padding
className="grid grid-cols-1 md:grid-cols-2 gap-4"  // Responsive grid
className="flex items-center justify-between"       // Flex layout
```

## 🔗 API Endpoints

```typescript
// Metrics endpoints
`/api/apps/${appId}/metrics/aws/lambda`       // Lambda metrics
`/api/apps/${appId}/metrics/costs`            // Cost analytics
`/api/apps/${appId}/metrics/apigateway`       // API Gateway
`/api/apps/${appId}/metrics/dynamodb`         // DynamoDB
`/api/apps/${appId}/metrics/appstore`         // App Store metrics

// Time ranges
'24h'  // Last 24 hours
'7d'   // Last 7 days
'30d'  // Last 30 days
'90d'  // Last 90 days
```

## 💡 Pro Tips

### 1. Always Memoize Chart Options
```tsx
// Good ✅
const options = useMemo(() => createOptions(data), [data]);

// Bad ❌
const options = createOptions(data); // Recreates on every render
```

### 2. Use Proper TypeScript Types
```tsx
// Good ✅
const [data, setData] = useState<MetricsData | null>(null);

// Bad ❌
const [data, setData] = useState<any>(null);
```

### 3. Handle All States
```tsx
// Good ✅
if (isLoading) return <LoadingState />;
if (error) return <ErrorState />;
if (!data) return <EmptyState />;

// Bad ❌
if (isLoading) return null; // No feedback to user
```

### 4. Extract Complex Logic
```tsx
// Good ✅
const processedData = useProcessedMetrics(rawData);

// Bad ❌
// 50 lines of processing logic in component
```

### 5. Use Semantic Component Names
```tsx
// Good ✅
<LambdaMetricsChart />
<CostAnalyticsChart />

// Bad ❌
<Chart1 />
<Component2 />
```

## 🐛 Common Issues & Solutions

### Issue: Chart not updating
**Solution**: Check dependencies in useMemo/useEffect
```tsx
const options = useMemo(() => createOptions(data), [data]); // ✅ Include data
```

### Issue: Too many re-renders
**Solution**: Wrap component with React.memo
```tsx
export const Component = React.memo(({ props }) => {...});
```

### Issue: Stale closures in callbacks
**Solution**: Use useCallback with proper dependencies
```tsx
const handler = useCallback(() => {
  doSomething(value);
}, [value]); // ✅ Include value
```

### Issue: Type errors with ECharts
**Solution**: Use type assertions for complex options
```tsx
const option: EChartsOption = {
  series: [{
    type: 'line' as const, // Type assertion
    data: values
  }]
};
```

## 📚 Further Reading

- [Full Style Guide](./STYLE_GUIDE.md)
- [TypeScript Types](../src/types/)
- [Component Examples](../src/components/)
- [Hook Documentation](../src/hooks/)