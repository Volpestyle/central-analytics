import { SignJWT, importPKCS8 } from 'jose';

interface AppStoreConnectConfig {
  issuerId: string;
  keyId: string;
  privateKey: string;
}

interface AppStoreConnectToken {
  token: string;
  expiresAt: number;
}

export class AppStoreConnectClient {
  private config: AppStoreConnectConfig;
  private tokenCache: AppStoreConnectToken | null = null;
  private baseUrl = 'https://api.appstoreconnect.apple.com/v1';

  constructor(config: AppStoreConnectConfig) {
    this.config = config;
  }

  // Generate JWT token for App Store Connect API
  private async generateToken(): Promise<string> {
    // Check if cached token is still valid
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
      return this.tokenCache.token;
    }

    const alg = 'ES256';
    const privateKey = await importPKCS8(this.config.privateKey, alg);

    const jwt = await new SignJWT({})
      .setProtectedHeader({ alg, kid: this.config.keyId, typ: 'JWT' })
      .setIssuedAt()
      .setIssuer(this.config.issuerId)
      .setAudience('appstoreconnect-v1')
      .setExpirationTime('20m') // Token expires in 20 minutes
      .sign(privateKey);

    // Cache the token
    this.tokenCache = {
      token: jwt,
      expiresAt: Date.now() + (19 * 60 * 1000) // 19 minutes
    };

    return jwt;
  }

  // Make authenticated request to App Store Connect API
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.generateToken();

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`App Store Connect API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // Get app information
  async getApp(appId: string) {
    return this.request(`/apps/${appId}`);
  }

  // Get app analytics reports
  async getAnalyticsReports(appId: string, params: {
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    measures: string[];
    startDate: string;
    endDate: string;
  }) {
    const queryParams = new URLSearchParams({
      'filter[frequency]': params.frequency,
      'filter[reportDate]': `${params.startDate}/${params.endDate}`,
      'measures': params.measures.join(',')
    });

    return this.request(`/analyticsReportRequests?${queryParams}`);
  }

  // Get sales reports
  async getSalesReports(params: {
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    reportType: 'SALES' | 'SUBSCRIPTION' | 'SUBSCRIPTION_EVENT' | 'SUBSCRIBER';
    reportSubType: 'SUMMARY' | 'DETAILED';
    vendorNumber: string;
    reportDate?: string;
  }) {
    const queryParams = new URLSearchParams({
      'filter[frequency]': params.frequency,
      'filter[reportType]': params.reportType,
      'filter[reportSubType]': params.reportSubType,
      'filter[vendorNumber]': params.vendorNumber
    });

    if (params.reportDate) {
      queryParams.append('filter[reportDate]', params.reportDate);
    }

    return this.request(`/salesReports?${queryParams}`);
  }

  // Get finance reports
  async getFinanceReports(params: {
    regionCode: string;
    reportType: 'FINANCIAL' | 'FINANCE_DETAIL';
    vendorNumber: string;
    reportDate: string;
  }) {
    const queryParams = new URLSearchParams({
      'filter[regionCode]': params.regionCode,
      'filter[reportType]': params.reportType,
      'filter[vendorNumber]': params.vendorNumber,
      'filter[reportDate]': params.reportDate
    });

    return this.request(`/financeReports?${queryParams}`);
  }

  // Get app store version information
  async getAppStoreVersions(appId: string) {
    return this.request(`/apps/${appId}/appStoreVersions`);
  }

  // Get customer reviews
  async getCustomerReviews(appId: string, params?: {
    limit?: number;
    sort?: 'mostRecent' | 'mostHelpful' | 'mostFavorable' | 'mostCritical';
  }) {
    const queryParams = new URLSearchParams();

    if (params?.limit) {
      queryParams.append('limit', params.limit.toString());
    }

    if (params?.sort) {
      queryParams.append('sort', params.sort);
    }

    const query = queryParams.toString();
    return this.request(`/apps/${appId}/customerReviews${query ? `?${query}` : ''}`);
  }

  // Get app ratings
  async getAppRatings(appId: string) {
    return this.request(`/apps/${appId}/ratings`);
  }

  // Get diagnostic signatures (crash data)
  async getDiagnosticSignatures(appId: string, params?: {
    limit?: number;
    sort?: '-weight' | 'weight';
  }) {
    const queryParams = new URLSearchParams();

    if (params?.limit) {
      queryParams.append('limit', params.limit.toString());
    }

    if (params?.sort) {
      queryParams.append('sort', params.sort);
    }

    const query = queryParams.toString();
    return this.request(`/apps/${appId}/diagnosticSignatures${query ? `?${query}` : ''}`);
  }

  // Get performance metrics
  async getPerformanceMetrics(appId: string, params: {
    metricType: 'DISK_WRITES' | 'BATTERY' | 'LAUNCH_TIME' | 'HANG_RATE' | 'MEMORY' | 'ANIMATION_HITCHES';
    platform: 'IOS' | 'MACOS' | 'TVOS' | 'WATCHOS' | 'VISIONOS';
    startDate: string;
    endDate: string;
  }) {
    const queryParams = new URLSearchParams({
      'filter[metricType]': params.metricType,
      'filter[platform]': params.platform,
      'filter[date]': `${params.startDate}/${params.endDate}`
    });

    return this.request(`/apps/${appId}/perfPowerMetrics?${queryParams}`);
  }

  // Get app availability
  async getAppAvailability(appId: string) {
    return this.request(`/apps/${appId}/availableTerritories`);
  }

  // Get beta test information
  async getBetaTesters(appId: string, params?: {
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();

    if (params?.limit) {
      queryParams.append('limit', params.limit.toString());
    }

    const query = queryParams.toString();
    return this.request(`/apps/${appId}/betaTesters${query ? `?${query}` : ''}`);
  }

  // Get TestFlight build information
  async getBuilds(appId: string, params?: {
    limit?: number;
    sort?: '-uploadedDate' | 'uploadedDate' | '-version' | 'version';
  }) {
    const queryParams = new URLSearchParams();

    if (params?.limit) {
      queryParams.append('limit', params.limit.toString());
    }

    if (params?.sort) {
      queryParams.append('sort', params.sort);
    }

    const query = queryParams.toString();
    return this.request(`/apps/${appId}/builds${query ? `?${query}` : ''}`);
  }
}

// Factory function to create client from environment variables
export const createAppStoreConnectClient = () => {
  const issuerId = process.env.APPSTORE_CONNECT_ISSUER_ID;
  const keyId = process.env.APPSTORE_CONNECT_KEY_ID;
  const privateKey = process.env.APPSTORE_CONNECT_PRIVATE_KEY;

  if (!issuerId || !keyId || !privateKey) {
    throw new Error('App Store Connect credentials not configured');
  }

  return new AppStoreConnectClient({
    issuerId,
    keyId,
    privateKey
  });
};