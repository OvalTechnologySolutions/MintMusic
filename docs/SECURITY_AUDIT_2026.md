# MintMusic Security Audit — May 2026

**Branch audited:** `main` (baseline at `5af59a9`)  
**Runtime verified:** Next.js frontend at `http://127.0.0.1:3000` (May 27, 2026)  
**Scope:** `frontend/`, `smart-contracts/contracts/MintMusic.sol`, `backend/` (declared deps only), dependency supply chain  
**Out of scope:** Formal third-party smart contract audit, penetration test of production infrastructure (none deployed)

---

## Executive summary

MintMusic is an early MVP: a Next.js wallet-connected UI, a single ERC-1155 sales contract, mock marketplace data, and a **backend folder with no application code**. The stack is **not production-ready** from a security perspective.

| Severity | Count (approx.) | Themes |
|----------|-----------------|--------|
| **Critical** | 2 | Mock on-chain purchases; fake IPFS uploads |
| **High** | 8 | Contract payment logic; WalletConnect config; chain/address mismatch |
| **Medium** | 12 | Dependency CVEs; metadata trust; missing security headers |
| **Low** | 6 | Logging; placeholder links; SRS vs implementation drift |

**Recommendation:** Do not deploy to mainnet or accept real funds until smart contract fixes, real metadata pipeline, chain-gated UX, and dependency remediation are complete. Use the `mintmusic2026` rebuild plan for a clean architecture.

---

## 1. Application surface (runtime)

### 1.1 What runs today

- **Frontend only:** `npm run dev` in `frontend/` (Next.js 16, React 19).
- **Landing → App:** Role toggle (Collector / Creator), RainbowKit “Connect Wallet”, mock marketplace grid.
- **Backend:** `backend/package.json` lists Express, Socket.IO, CORS, dotenv — **no `index.js` or server implementation**.
- **Blockchain:** Contract must be deployed separately (Hardhat); UI hardcodes Hardhat’s first deploy address.

### 1.2 Runtime observations

- Wallet connect UI renders; **WalletConnect `projectId` is the literal placeholder `YOUR_PROJECT_ID`** in `providers.tsx` — connections may fail or behave unpredictably in production.
- Marketplace “Collect” buttons call `purchase` on token IDs **1–4** from **static mock data**, not from chain-indexed releases — high risk of failed txs, wrong-chain txs, or user confusion.
- Creator flow simulates IPFS upload (timeout + fixed `ipfs://QmMockHash...`) — **no integrity check** on audio or metadata before minting.

---

## 2. Smart contract — `MintMusic.sol`

### 2.1 Critical / high findings

| ID | Severity | Finding | Impact |
|----|----------|---------|--------|
| SC-01 | **High** | `purchase` forwards **entire** `msg.value` to creator, not `price * amount` | Overpayment is not refunded; users can lose ETH |
| SC-02 | **High** | No validation on `createRelease` (`_maxSupply`, `_price`, `_uri`) | Zero supply, zero price, or empty URI breaks economics or enables spam |
| SC-03 | **Medium** | `uri()` returns raw string, not ERC-1155 metadata JSON | Marketplaces/wallets may show broken or misleading assets |
| SC-04 | **Medium** | Creator receives ETH via `.transfer()` (2300 gas stipend) | Smart-wallet / contract creators may fail payouts (DoS on purchase) |
| SC-05 | **Medium** | No reentrancy guard on `purchase` | State updated before external call (good order), but malicious creator contract remains a concern |
| SC-06 | **Low** | No pause, no admin recovery, no upgrade path | Incident response limited |
| SC-07 | **Info** | EIP-2981 royalties set but **no in-contract secondary market** | Royalties only matter if external marketplaces honor them |
| SC-08 | **Info** | No audit trail on-chain for off-chain audio rights | Legal/compliance risk, not purely technical |

### 2.2 Code references

Overpayment (SC-01):

```57:70:smart-contracts/contracts/MintMusic.sol
    function purchase(uint256 _id, uint256 _amount) public payable {
        Release storage release = releases[_id];
        // ...
        require(msg.value >= release.price * _amount, "Insufficient funds");
        // ...
        payable(release.creator).transfer(msg.value);
```

Missing release validation (SC-02):

```31:55:smart-contracts/contracts/MintMusic.sol
    function createRelease(
        uint256 _maxSupply,
        uint256 _price,
        string memory _uri,
        uint96 _royaltyFee
    ) public returns (uint256) {
        require(_royaltyFee <= 10000, "Royalty too high");
        // No checks on _maxSupply, _price, or _uri
```

### 2.3 Required fixes before mainnet

1. Refund `msg.value - (price * amount)` or require **exact** payment.
2. `require(_maxSupply > 0)`, `require(bytes(_uri).length > 0)`, optional minimum price policy.
3. Use `call{value:}` with CEI + `ReentrancyGuard` or pull-payment pattern for creator proceeds.
4. Emit events for indexing; store content hash (e.g. IPFS CID) on-chain.
5. **Professional audit** (SRS SEC-03) before any mainnet deployment.

---

## 3. Frontend security

### 3.1 Critical / high

| ID | Severity | Finding | Location |
|----|----------|---------|----------|
| FE-01 | **Critical** | Mock marketplace IDs/prices **not tied to chain state** | `FanView.tsx`, `AlbumCard.tsx` |
| FE-02 | **Critical** | Simulated IPFS upload — fixed mock CID | `page.tsx` `handleFileChange` |
| FE-03 | **High** | Hardcoded contract `0x5FbDB...` (Hardhat #1) | `page.tsx`, `AlbumCard.tsx`, `MyMints.tsx` |
| FE-04 | **High** | Placeholder WalletConnect `projectId` | `providers.tsx` |
| FE-05 | **High** | Multi-chain config (mainnet, polygon, …) without enforced chain in writes | `providers.tsx` + write calls |
| FE-06 | **Medium** | Royalty UI slider **not wired** to `createRelease` (hardcoded `1000n`) | `page.tsx` |
| FE-07 | **Medium** | `title` field never sent on-chain | `page.tsx` |
| FE-08 | **Medium** | Full wagmi `error.message` shown to users | `page.tsx`, `AlbumCard.tsx` |

### 3.2 Configuration & headers

| ID | Severity | Finding |
|----|----------|---------|
| FE-09 | **Medium** | No CSP, HSTS, `X-Frame-Options`, or `Referrer-Policy` in `next.config.ts` |
| FE-10 | **Low** | Remote images from `images.unsplash.com` (third-party tracking / availability) |
| FE-11 | **Low** | `console.log` of upload filenames in client |

### 3.3 Web3 UX risks

- Users can connect on **any** configured chain while the contract address targets **local Hardhat** only.
- No transaction simulation preview (amount, recipient, token id).
- No allowlist or phishing-resistant contract address display (EIP-6963 / verified addresses).

---

## 4. Backend & real-time (planned, not implemented)

| ID | Severity | Finding |
|----|----------|---------|
| BE-01 | **Info** | SRS describes Socket.IO, P2P, encrypted messaging — **zero server code** |
| BE-02 | **High** (if built naïvely) | Future Socket.IO without auth = open rooms, impersonation, stream hijacking |
| BE-03 | **High** (if built naïvely) | CORS `*` + cookie sessions would be dangerous; plan auth before MusicMoments livestreams |

When implementing MusicMoments (livestreams, listening sessions), plan for:

- Signed JWT or wallet-based session for API/WebSocket
- Rate limits, room ACLs, moderator roles
- Stream keys via provider (Mux/Livepeer/IVS), never in client bundles
- COPPA/privacy and chat moderation for community features

---

## 5. Dependency & supply chain

**Frontend (`npm audit`, May 2026):** 42 vulnerabilities (32 moderate, 10 high), largely transitive via `wagmi` → `@wagmi/connectors` → WalletConnect / MetaMask SDK.

**Actions:**

1. Pin and upgrade `wagmi` / `@rainbow-me/rainbowkit` on a schedule; test wallet flows after major bumps.
2. Run `npm audit` in CI; fail build on **high** in production lockfile.
3. Add Dependabot or Renovate.
4. Audit `smart-contracts/` separately when dependencies are installed (`npm install` in that folder).

---

## 6. Privacy & compliance (product-aligned)

| Topic | Current state | Risk |
|-------|---------------|------|
| PII | No accounts; wallet address only | Low today; increases with profiles |
| Analytics | Mock stats; no real “fan vs casual” distinction | Product gap vs 2026 goals |
| Music rights | No license attestation on upload | DMCA / rights holder disputes |
| Financial | Primary sales only; no KYC | May be required for brand deals / large transactions |
| Live audio | Not implemented | Future: performance rights, venue licenses |

---

## 7. Gap analysis vs stated 2026 product goals

| Goal pillar | In codebase? | Security note for rebuild |
|-------------|--------------|---------------------------|
| Fan financial engagement / insights | Partial (mint only) | Need indexed events + off-chain analytics with access control |
| MusicMoments (livestreams, listening) | No | Highest new attack surface — authZ on rooms and streams |
| Artist–brand marketplace | No | Escrow, contracts, dispute resolution |
| Sponsorships / industry networking | No | Verify identities; anti-spam; report abuse |
| Complimentary listening | No | DRM/licensing model distinct from NFT ownership |

---

## 8. Remediation priority (ordered)

### P0 — Block production

1. Remove or gate mock purchases; index releases from chain only.
2. Real IPFS/Pinata (or similar) with server-side or signed upload; verify MIME/size.
3. Fix contract payment logic; add release validation.
4. Env-based `NEXT_PUBLIC_CONTRACT_ADDRESS`, `NEXT_PUBLIC_WC_PROJECT_ID`, single default chain + `useChainId` guards.

### P1 — Before public beta

5. Security headers in Next.js middleware.
6. Dependency upgrades + CI audit.
7. Contract test suite (Foundry/Hardhat) including overpay, sold-out, zero supply.
8. Error sanitization in UI.

### P2 — MVP feature security (2026 rebuild)

9. AuthN/AuthZ design for API + WebSockets.
10. MusicMoments provider integration with stream key secrecy.
11. Role-based dashboards (artist / fan / brand) with least privilege.
12. Third-party smart contract audit before mainnet.

---

## 9. Sign-off

This document is an **internal engineering audit**, not a formal security certificate. Treat all findings as requiring verification after the `mintmusic2026` rebuild.

**Next document:** [MVP_REBUILD_2026.md](./MVP_REBUILD_2026.md)
