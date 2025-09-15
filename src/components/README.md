# Central Analytics Components

## Chart Components

### BaseChart
The foundation component for all ECharts visualizations. Handles:
- Chart initialization and disposal
- Theme registration
- Responsive resizing
- Loading states
- Event handling

### LineChart
For time-series data visualization. Features:
- Smooth or stepped lines
- Area fills
- Trend lines
- Data zoom controls

### BarChart
For categorical comparisons. Features:
- Horizontal/vertical orientation
- Stacked bars
- Grouped bars
- Animations

### PieChart
For part-to-whole relationships. Features:
- Donut variant
- Label positioning
- Value formatting
- Hover effects

### LambdaMetricsChart
Specialized chart for AWS Lambda metrics:
- Invocations
- Errors
- Duration
- Cost tracking
- Throttles
- Concurrent executions

### CostBreakdownChart
Multi-view cost analytics:
- Daily trend view
- Service breakdown pie chart
- Treemap distribution
- Stacked area trends

### AppStoreChart
App Store and user engagement metrics:
- Downloads and updates
- Revenue breakdown
- User engagement
- Retention rates
- Rating distribution

## UI Components

### DashboardLayout
Main layout wrapper with:
- Responsive navigation
- Mobile drawer menu
- Auto-refresh controls
- Dark theme optimized

### MetricCard
Summary metric display cards:
- Value display
- Change indicators
- Loading states
- Icons

### ChartCard
Container for chart components:
- Title and subtitle
- Header actions
- Loading states
- Consistent styling

## Usage

All components are React-based and designed to work with Astro's island architecture:

```astro
---
import { LambdaMetricsChart } from '../components/charts';
---

<LambdaMetricsChart
  client:visible
  data={lambdaData}
  metricType="invocations"
/>
```

## State Management

Components use Zustand for state management:
- `metricsStore`: Centralized metrics data
- Auto-refresh capabilities
- Mock data generation for development

## Styling

All components use:
- Tailwind CSS for utility styling
- Dark theme optimized
- Mobile-first responsive design
- iOS 26 / iPhone 17 Pro optimizations