export interface CreatorPerformanceDashboard {
  periodDays: number;
  totalSales: number;
  revenueCents: number;
  totalListens: number;
  uniqueListeners: number;
  topReleases: Array<{
    releaseId: string;
    title: string;
    sales: number;
    listens: number;
  }>;
  listensBySource: Record<string, number>;
}

export interface RecordPlayRequest {
  releaseId: string;
  source: 'collection' | 'discovery' | 'radio' | 'feed';
  listenedMs: number;
  deviceType?: string;
}
