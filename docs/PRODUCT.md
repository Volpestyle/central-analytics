# Product Specification: Central Analytics Dashboard MVP

## Overview
A **centralized analytics platform** designed to monitor AWS infrastructure and App Store performance metrics for **ALL deployed applications**, with analytics viewed primarily on a per-app basis. Built as a Progressive Web App (PWA) for cross-platform accessibility. The platform will initially launch with support for the ilikeyacut iOS app, with the architecture designed to easily add additional applications as they are deployed.

## MVP Objectives
- **Multi-app support architecture** - Built to monitor multiple applications from day one
- Monitor AWS resource usage and costs on a **per-application basis** (starting with ilikeyacut)
- Track App Store downloads, revenue, and user engagement for each app individually
- Provide focused view of each application's health and business metrics
- Simple, fast, mobile-friendly interface
- **Currently monitoring**: ilikeyacut iOS app (first implementation)

## Target AWS Resources

### Current Application: ilikeyacut
*Note: The dashboard architecture supports monitoring multiple applications. Additional apps will be added as they are deployed.*

### Infrastructure to Monitor (ilikeyacut)
- **API Gateway**: `ilikeyacut-api-dev` (6 endpoints)
- **Lambda Functions**:
  - `ilikeyacut-gemini-proxy-dev` (AI image processing)
  - `ilikeyacut-auth-dev` (authentication)
  - `ilikeyacut-templates-dev` (hairstyle templates)
  - `ilikeyacut-user-data-dev` (credits & history)
  - `ilikeyacut-purchase-dev` (IAP handler)
  - `ilikeyacut-iap-webhook-dev` (store webhooks)
- **DynamoDB Tables**:
  - `ilikeyacut-users-dev`
  - `ilikeyacut-transactions-dev`
  - `ilikeyacut-templates-dev`
  - `ilikeyacut-rate-limits-dev`
- **S3 & CloudFront**: Assets storage and CDN
- **CloudWatch Alarms**: Error rates and cost alerts

## MVP Features

### 1. AWS Infrastructure Dashboard

#### 1.1 Lambda Metrics
- Invocation count (per function, last 24h/7d/30d)
- Error count and error rate
- Average duration and cold starts
- Estimated monthly cost per function
- Focus on high-usage functions (Gemini Proxy)

#### 1.2 API Gateway Metrics
- Request count by endpoint
- 4XX and 5XX error rates
- Average latency
- Top endpoints by usage

#### 1.3 DynamoDB Metrics
- Read/Write capacity units consumed
- Throttled requests
- Table item counts
- Storage size and costs

#### 1.4 Cost Analytics
- Daily AWS spend (last 30 days trend)
- Cost breakdown by service
- Month-to-date total vs. last month
- Projected monthly cost
- Cost per Lambda invocation

### 2. App Store Analytics

#### 2.1 Downloads & Installs
- Daily/Weekly/Monthly downloads
- First-time vs. redownloads
- Installation rate
- Geographic distribution

#### 2.2 Revenue Metrics
- In-app purchase revenue
- Credit pack sales volume
- Average revenue per user (ARPU)
- Revenue trends (daily/weekly/monthly)

#### 2.3 User Engagement
- Active devices
- Session count
- Crash rate
- User retention (if available)

### 3. Unified Health Dashboard
- **Application selector** to switch between monitored apps
- Focused view of key metrics for the selected application
- Traffic vs. cost correlation (per app)
- Revenue vs. infrastructure usage (per app)
- Simple traffic light status indicators
- Optional aggregate view for total costs/revenue (future enhancement)
