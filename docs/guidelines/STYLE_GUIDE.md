# Central Analytics Component Style Guide

## Overview
This style guide documents the standardized patterns, component APIs, and best practices for the Central Analytics dashboard. All components follow React/TypeScript industry standards with a focus on type safety, performance, and maintainability.

## Table of Contents
1. [Core Principles](#core-principles)
2. [Type System](#type-system)
3. [Component APIs](#component-apis)
4. [Hooks](#hooks)
5. [Error Handling](#error-handling)
6. [Performance Patterns](#performance-patterns)
7. [Chart Components](#chart-components)

---

## Core Principles

### 1. Type Safety First
- **Never use `any`** - Always define proper TypeScript interfaces
- Use generic types with constraints
- Leverage TypeScript's type inference where possible

### 2. Component Composition
- Prefer composition over inheritance
- Use custom hooks for logic extraction
- Keep components focused on single responsibilities

### 3. Performance by Default
- Use `React.memo` for pure components
- Implement `useMemo` for expensive computations
- Apply `useCallback` for stable function references

### 4. Consistent Error Handling
- All data-fetching components must handle loading, error, and success states
- Provide user-friendly error messages with retry capabilities
- Log errors for debugging while showing sanitized messages to users

---

## Type System

### Type Organization
Types are organized into dedicated files in `/src/types/`:

```typescript
// src/types/auth.ts
export interface User {
  id: string;
  email?: string;
  name?: string;
  appleUserSub: string;
  isAdmin: boolean;
  biometricEnabled: boolean;
  lastAuthenticated?: Date;
}

// src/types/api.ts
export interface ApiResponse<T> {
  data: T;
  metadata?: {
    timestamp: string;
    version?: string;
    count?: number;
  };
  error?: ApiError;
}

// src/types/charts.ts
export interface ChartDataPoint {
  timestamp: string | Date;
  value: number;
  label?: string;
  metadata?: Record<string, unknown>;
}
```

### Generic Type Patterns
Use generic types with proper constraints:

```typescript
// Good - constrained generic
export function useChartData<TData = unknown, TTransformed = TData>(
  options: UseChartDataOptions<TData, TTransformed>
): UseChartDataReturn<TTransformed>

// Bad - unconstrained any
export function useChartData<T = any>(options: any): any
```

---

## Component APIs

### UI Components

#### Button Component
```tsx
import { Button } from '@components/ui/Button';

// Props
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  // Plus all standard button HTML attributes
}

// Usage
<Button
  variant="primary"
  size="medium"
  onClick={handleClick}
  isLoading={isSubmitting}
>
  Save Changes
</Button>
```

#### ErrorState Component
```tsx
import { ErrorState } from '@components/ui/ErrorState';

// Props
interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  showRetry?: boolean;
  className?: string;
}

// Usage
<ErrorState
  title="Data Load Failed"
  message="Unable to fetch metrics. Please check your connection."
  onRetry={refetch}
  showRetry={true}
/>
```

#### LoadingState Component
```tsx
import { LoadingState } from '@components/ui/LoadingState';

// Props
interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

// Usage
<LoadingState
  message="Loading analytics data..."
  size="medium"
/>
```

### Container Components

#### ChartContainer Component
```tsx
import { ChartContainer } from '@components/charts/ChartContainer';

// Props
interface ChartContainerProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  loading?: boolean;
  error?: boolean | string | Error | null;
  controls?: ReactNode;
  className?: string;
  onRetry?: () => void;
}

// Usage
<ChartContainer
  title="API Gateway Metrics"
  subtitle="Last 7 days"
  loading={isLoading}
  error={error}
  onRetry={refetch}
  controls={<ViewModeToggle />}
>
  <ReactECharts option={chartOptions} />
</ChartContainer>
```

#### KPICard Component
```tsx
import { KPICard } from '@components/charts/KPICard';

// Props
interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  sparklineData?: number[];
  unit?: string;
  icon?: React.ReactNode;
  color?: string;
}

// Usage
<KPICard
  title="API Requests"
  value="5.2K"
  change={12.5}
  sparklineData={[100, 120, 115, 134, 168, 132, 150]}
  color="#0A84FF"
/>
```

---

## Hooks

### Data Fetching Hooks

#### useChartData Hook
Primary hook for fetching and transforming chart data:

```typescript
import { useChartData } from '@/hooks/useChartData';

// Usage
const { data, isLoading, error, refetch } = useChartData<InputType, OutputType>({
  appId: 'app-123',
  timeRange: '7d',
  endpoint: '/api/metrics',
  aggregatedMetrics: null, // Optional pre-fetched data
  transformData: (raw) => transformToChartFormat(raw),
  enabled: true
});
```

#### useFetchMetrics Hook
Simplified metrics fetching with automatic error handling:

```typescript
import { useFetchMetrics } from '@/hooks/useFetchMetrics';

// Usage
const { data, isLoading, error, refetch } = useFetchMetrics<MetricsType>({
  endpoint: '/api/metrics/lambda',
  params: { appId: 'app-123', timeRange: '24h' },
  enabled: true,
  refreshInterval: 30000 // Optional auto-refresh
});
```

#### useParallelFetch Hook
Fetch multiple endpoints concurrently:

```typescript
import { useParallelFetch } from '@/hooks/useFetchMetrics';

// Usage
const { data, isLoading, errors, refetchAll } = useParallelFetch<{
  lambda: LambdaMetrics;
  costs: CostMetrics;
}>([
  { key: 'lambda', endpoint: '/api/lambda', params: {} },
  { key: 'costs', endpoint: '/api/costs', params: {} }
]);
```

### UI Hooks

#### useChartViewModes Hook
Manage chart view mode toggles:

```typescript
import { useChartViewModes } from '@/hooks/useChartData';

// Usage
const { selectedMode, controls } = useChartViewModes([
  'invocations',
  'errors',
  'duration'
]);

// Render controls
controls.map(control => (
  <button
    key={control.mode}
    onClick={control.onClick}
    className={control.isActive ? 'active' : ''}
  >
    {control.label}
  </button>
))
```

#### useFormattedChartData Hook
Format data for chart display:

```typescript
import { useFormattedChartData } from '@/hooks/useChartData';

// Usage
const { timestamps, formatNumber, formatPercentage } = useFormattedChartData(
  data,
  timeRange
);
```

---

## Error Handling

### Standard Error Pattern
All components that fetch data should follow this pattern:

```tsx
const Component = () => {
  const { data, isLoading, error, refetch } = useChartData({...});

  if (isLoading) {
    return <LoadingState message="Loading data..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load"
        message={error}
        onRetry={refetch}
      />
    );
  }

  if (!data) {
    return <EmptyState message="No data available" />;
  }

  return <Chart data={data} />;
};
```

### Error Boundaries
Wrap chart components with error boundaries for crash protection:

```tsx
<ErrorBoundary fallback={<ErrorState />}>
  <ChartComponent />
</ErrorBoundary>
```

---

## Performance Patterns

### Memoization
Apply memoization to prevent unnecessary re-renders:

```tsx
// Component memoization
export const ChartComponent = React.memo(({ data, options }) => {
  // Component logic
});

// Value memoization
const chartOptions = useMemo(() =>
  createChartOptions(data, config),
  [data, config]
);

// Callback memoization
const handleClick = useCallback((item) => {
  processItem(item);
}, [dependency]);
```

### Code Splitting
Lazy load heavy components:

```tsx
const HeavyChart = lazy(() => import('@components/charts/HeavyChart'));

// Usage
<Suspense fallback={<LoadingState />}>
  <HeavyChart />
</Suspense>
```

---

## Chart Components

### Chart Component Pattern
All chart components should follow this structure:

```tsx
interface ChartProps {
  appId: string;
  timeRange: TimeRange;
  detailed?: boolean;
  metrics?: AggregatedMetrics | null;
}

export const ChartComponent: React.FC<ChartProps> = React.memo(({
  appId,
  timeRange,
  detailed = false,
  metrics
}) => {
  // 1. Fetch data using standardized hook
  const { data, isLoading, error, refetch } = useChartData({
    appId,
    timeRange,
    endpoint: `/api/endpoint`,
    aggregatedMetrics: metrics,
    transformData: transformFunction
  });

  // 2. Process data with memoization
  const processedData = useMemo(() =>
    processChartData(data),
    [data]
  );

  // 3. Create chart options
  const chartOptions = useMemo(() =>
    createChartOptions(processedData, detailed),
    [processedData, detailed]
  );

  // 4. Render with proper error handling
  return (
    <ChartContainer
      title="Chart Title"
      loading={isLoading}
      error={error}
      onRetry={refetch}
    >
      {processedData && (
        <ReactECharts
          option={chartOptions}
          style={{ height: '300px' }}
          theme="dark"
        />
      )}
    </ChartContainer>
  );
});

ChartComponent.displayName = 'ChartComponent';
```

### Chart Utilities
Use standardized utilities for common chart operations:

```typescript
import {
  formatTimestamps,
  formatNumber,
  formatPercentage,
  createLineChartOptions,
  createBarChartOptions,
  createTooltipFormatter
} from '@/utils/chartUtils';

// Create standardized chart options
const options = createLineChartOptions({
  data: values,
  timestamps: dates,
  title: 'Metrics Over Time',
  smooth: true,
  colors: ['#0A84FF'],
  width: window.innerWidth,
  yAxisLabel: 'Value',
  showArea: true
});
```

---

## Best Practices Checklist

### Component Development
- [ ] Define proper TypeScript interfaces for all props
- [ ] Use `React.memo` for pure components
- [ ] Extract complex logic into custom hooks
- [ ] Handle loading, error, and empty states
- [ ] Provide retry functionality for failed requests
- [ ] Use semantic HTML and ARIA attributes
- [ ] Follow consistent naming conventions

### Performance
- [ ] Memoize expensive computations with `useMemo`
- [ ] Stabilize callbacks with `useCallback`
- [ ] Avoid inline function definitions in render
- [ ] Use React.lazy for code splitting where appropriate
- [ ] Implement virtual scrolling for long lists
- [ ] Optimize bundle size with tree shaking

### Code Quality
- [ ] No `any` types - use proper interfaces
- [ ] Add JSDoc comments for public APIs
- [ ] Keep components under 200 lines
- [ ] Maintain single responsibility principle
- [ ] Write self-documenting code
- [ ] Follow DRY principle with shared utilities

### Testing Considerations
- [ ] Components should be testable in isolation
- [ ] Mock external dependencies properly
- [ ] Test error states and edge cases
- [ ] Verify accessibility requirements
- [ ] Test responsive behavior

---

## Migration Guide

### Migrating Legacy Components
When updating older components to follow the new patterns:

1. **Replace direct fetch calls** with `useChartData` or `useFetchMetrics`
2. **Add proper TypeScript types** - eliminate all `any` usage
3. **Implement memoization** - wrap with `React.memo` and use `useMemo`
4. **Standardize error handling** - use `ErrorState` and `LoadingState`
5. **Extract repeated logic** into shared utilities or hooks
6. **Update chart options** to use `chartUtils` helpers

### Example Migration
```tsx
// Before
const OldChart = ({ data }) => {
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(setChartData)
      .finally(() => setLoading(false));
  }, []);

  // Direct chart config...
};

// After
const NewChart: React.FC<ChartProps> = React.memo(({ appId, timeRange }) => {
  const { data, isLoading, error, refetch } = useChartData<DataType>({
    appId,
    timeRange,
    endpoint: '/api/data',
    transformData: (raw) => transformToChartFormat(raw)
  });

  const chartOptions = useMemo(() =>
    createLineChartOptions({
      data: data?.values || [],
      timestamps: data?.timestamps || [],
      title: 'Chart Title'
    }),
    [data]
  );

  return (
    <ChartContainer
      title="Chart"
      loading={isLoading}
      error={error}
      onRetry={refetch}
    >
      {data && <ReactECharts option={chartOptions} />}
    </ChartContainer>
  );
});
```

---

## Resources

### Internal Documentation
- [Analytics Types](/src/types/analytics.ts)
- [Chart Utilities](/src/utils/chartUtils.ts)
- [API Client](/src/lib/api-client.ts)

### External References
- [React TypeScript CheatSheet](https://react-typescript-cheatsheet.netlify.app/)
- [ECharts Documentation](https://echarts.apache.org/en/index.html)
- [Zustand State Management](https://docs.pmnd.rs/zustand/getting-started/introduction)

---

## Contributing

When adding new components or patterns:

1. Follow the established patterns documented here
2. Update this style guide with new patterns
3. Add TypeScript interfaces to appropriate type files
4. Include JSDoc comments for public APIs
5. Ensure components are properly memoized
6. Test error states and edge cases

For questions or suggestions, please open an issue in the repository.