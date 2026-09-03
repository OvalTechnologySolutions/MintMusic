'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { baseSepolia, sepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

/**
 * Wallet integration provider.
 *
 * Intentionally unbranded: no RainbowKit UI / crypto marketing. It only sets up
 * the underlying wagmi client (injected connector) so the app can optionally
 * connect a wallet and read on-chain ownership from Settings. The capability is
 * preserved end-to-end (config + contracts + ABI + /api/users/me) but never
 * advertised in the product surface.
 */
const wagmiConfig = createConfig({
  chains: [sepolia, baseSepolia],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [sepolia.id]: http(),
    [baseSepolia.id]: http(),
  },
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
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
