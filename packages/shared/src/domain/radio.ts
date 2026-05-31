export type RadioOptInStatus = 'pending' | 'active' | 'paused' | 'rejected';

export interface RadioOptInRequest {
  releaseId: string;
  regionCode: string;
}

export interface RadioOptInSummary {
  id: string;
  releaseId: string;
  regionCode: string;
  status: RadioOptInStatus;
  optedInAt: string;
}
