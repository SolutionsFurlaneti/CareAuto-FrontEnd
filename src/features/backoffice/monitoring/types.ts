export interface MonitoringCount {
  name: string;
  count: number;
}
export interface MonitoringFilters {
  startDate: string;
  endDate: string;
  ipAddress?: string;
  pageHost?: string;
  statusCode?: number;
  type?: 'http' | 'pageviews' | 'errors' | 'bots';
  excludeBots?: boolean;
}
export interface MonitoringTraffic {
  timestamp: string;
  requests: number;
  errors: number;
  httpRequests: number;
  averageResponseTimeMs: number | null;
  successPercentage: number;
}
export interface MonitoringLocation {
  country: string | null;
  region: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  count: number;
}
export interface MonitoringLocalityDevice {
  location: string;
  deviceType: string;
  operatingSystem: string;
  browser: string;
  screenResolution: string;
  requests: number;
  percentage: number;
  averageResponseTimeMs: number | null;
}
export interface MonitoringOverview {
  totalRequests: number;
  httpRequests: number;
  uniqueIps: number;
  uniqueSessions: number;
  averageResponseTimeMs: number | null;
  errorRequests: number;
  errorRate: number;
  botRequests: number;
  mobileRequests: number;
  mobilePercentage: number;
  successRequests: number;
  successPercentage: number;
  touchRequests: number;
  touchPercentage: number;
  initialPageTtfb: {
    p75Ms: number | null;
    p95Ms: number | null;
    averageMs: number | null;
    sampleCount: number;
    mobileP75Ms: number | null;
    mobileSampleCount: number;
  };
  trafficGranularity: 'hour' | 'day';
  traffic: MonitoringTraffic[];
  countries: MonitoringCount[];
  regions: MonitoringCount[];
  cities: MonitoringCount[];
  devices: MonitoringCount[];
  operatingSystems: MonitoringCount[];
  browsers: MonitoringCount[];
  brands: MonitoringCount[];
  models: MonitoringCount[];
  statusCodes: MonitoringCount[];
  referrers: MonitoringCount[];
  campaigns: MonitoringCount[];
  screenResolutions: MonitoringCount[];
  viewportResolutions: MonitoringCount[];
  pixelRatios: MonitoringCount[];
  protocols: MonitoringCount[];
  connectionTypes: MonitoringCount[];
  locations: MonitoringLocation[];
  localityDevices: MonitoringLocalityDevice[];
  hosts: string[];
  hasUnknownHost: boolean;
}
export interface MonitoringLog {
  id: number;
  createdAt: string;
  ipAddress: string;
  method: string;
  url: string;
  pageHost: string | null;
  statusCode: number | null;
  responseTimeMs: number | null;
  country: string | null;
  region: string | null;
  city: string | null;
  deviceType: string | null;
  operatingSystem: string | null;
  browser: string | null;
  sessionId: string | null;
}
export interface MonitoringLogs {
  items: MonitoringLog[];
  totalCount: number;
  page: number;
  pageSize: number;
}
export interface MonitoringLogDetail extends MonitoringLog {
  forwardedFor: string | null;
  userAgent: string | null;
  queryString: string | null;
  referrer: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  timeZone: string | null;
  isp: string | null;
  deviceBrand: string | null;
  deviceModel: string | null;
  browserVersion: string | null;
  screenWidth: number | null;
  screenHeight: number | null;
  viewportWidth: number | null;
  viewportHeight: number | null;
  devicePixelRatio: number | null;
  colorDepth: number | null;
  language: string | null;
  hardwareConcurrency: number | null;
  deviceMemory: number | null;
  connectionEffectiveType: string | null;
  isTouchScreen: boolean | null;
  userId: string | null;
  protocol: string | null;
  headers: string | null;
  requestBody: string | null;
  ipAddressCountry: string | null;
  ipAddressRegion: string | null;
  ipAddressCity: string | null;
  address: string | null;
}
