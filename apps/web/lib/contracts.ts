import { webConfig } from './config';

/** Local Hardhat default — override via NEXT_PUBLIC_CONTRACT_ADDRESS */
const LEGACY_LOCAL_CONTRACT =
  '0x5FbDB2315678afecb367f032d93F642f64180aa3' as const;

export function getContractAddress(): `0x${string}` | undefined {
  return webConfig.contractAddress ?? LEGACY_LOCAL_CONTRACT;
}

export function isContractConfigured(): boolean {
  return Boolean(getContractAddress());
}
