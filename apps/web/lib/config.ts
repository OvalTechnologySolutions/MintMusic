export const webConfig = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:4000',
  contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` | undefined,
  chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 11155111),
  wcProjectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? '',
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
} as const;
