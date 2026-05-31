export type BroadcastLicenseType =
  | 'mechanical'
  | 'performance'
  | 'sync'
  | 'blanket';

export interface BroadcastRegion {
  regionCode: string;
  name: string;
  licensed: boolean;
  licenseTypes: BroadcastLicenseType[];
  territories: string[];
}

export interface BroadcastLicenseSummary {
  id: string;
  regionCode: string;
  licenseType: BroadcastLicenseType;
  rightsHolder: string;
  territories: string[];
  validFrom: string;
  validTo?: string;
  active: boolean;
}
