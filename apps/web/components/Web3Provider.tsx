'use client';

import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { baseSepolia, sepolia } from 'wagmi/chains';
import '@rainbow-me/rainbowkit/styles.css';
import { webConfig } from '@/lib/config';

const wcProjectId =
  webConfig.wcProjectId || '00000000000000000000000000000000';

const wagmiConfig = getDefaultConfig({
  appName: 'MintMusic',
  projectId: wcProjectId,
  chains: [sepolia, baseSepolia],
  ssr: true,
});

const queryClient = new QueryClient();

export default function Web3Provider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
