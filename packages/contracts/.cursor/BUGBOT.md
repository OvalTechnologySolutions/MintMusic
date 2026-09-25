# Contracts (`packages/contracts`) — Bugbot rules

Hardhat / Solidity ERC-1155 release contracts. Treat as high-risk money code.

## Always flag

- `purchase` (or equivalent) forwarding full `msg.value` without refunding overpayment.
- Missing validation on `maxSupply`, `price`, or `uri` at release creation.
- `.transfer()` for creator payouts (prefer pull-payment or `call` + CEI + reentrancy guard).
- Missing events needed for indexing.
- Any path that can mint, transfer, or take ETH without clear access control.

## Autofix constraints

- Prefer CEI (checks-effects-interactions) and OpenZeppelin patterns already in the package.
- Do not deploy or suggest mainnet addresses in code comments as “fixed.”
- Keep royalty / EIP-2981 behavior consistent unless the finding is specifically about royalties.
- After Solidity changes, run the package’s Hardhat tests if present (`npx hardhat test` in `packages/contracts`).
