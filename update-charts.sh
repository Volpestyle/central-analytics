#!/bin/bash

# Update RevenueChart to use api-client
cat > /tmp/revenue-patch.txt << 'EOF'
import { fetchMetricsParallel } from '@lib/api-client';
EOF

sed -i '' '/import { appleAuth }/d' src/components/analytics/RevenueChart.tsx
sed -i '' '/^import type.*from.*analytics/a\
import { fetchMetricsParallel } from "@lib/api-client";' src/components/analytics/RevenueChart.tsx

# Update DownloadsChart
sed -i '' '/import { appleAuth }/d' src/components/analytics/DownloadsChart.tsx
sed -i '' '/^import type.*from.*analytics/a\
import { fetchMetricsParallel } from "@lib/api-client";' src/components/analytics/DownloadsChart.tsx

# Update CostBreakdownChart
sed -i '' '/import { appleAuth }/d' src/components/analytics/CostBreakdownChart.tsx
sed -i '' '/^import type.*from.*analytics/a\
import { fetchMetricsParallel } from "@lib/api-client";' src/components/analytics/CostBreakdownChart.tsx

# Update ApiGatewayChart and DynamoDBChart to use fetchMetrics
sed -i '' '/import { appleAuth }/d' src/components/analytics/ApiGatewayChart.tsx
sed -i '' '/^import type.*from.*analytics/a\
import { fetchMetrics } from "@lib/api-client";' src/components/analytics/ApiGatewayChart.tsx

sed -i '' '/import { appleAuth }/d' src/components/analytics/DynamoDBChart.tsx
sed -i '' '/^import type.*from.*analytics/a\
import { fetchMetrics } from "@lib/api-client";' src/components/analytics/DynamoDBChart.tsx

echo "Updated imports in all chart components"