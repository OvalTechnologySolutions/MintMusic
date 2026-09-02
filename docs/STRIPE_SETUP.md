# Stripe Setup — MintMusic

Local test mode walkthrough for **creator payouts (Connect)** and **release purchases**.

---

## Prerequisites

- API running: `npm run dev:api`
- Web running: `npm run dev:web`
- User signed in via Google OAuth
- [Stripe account](https://dashboard.stripe.com) (test mode)

---

## Step 1 — Enable Stripe Connect

1. Stripe Dashboard → **Connect** → **Get started**
2. Choose **Express** accounts (matches our integration)
3. Complete platform profile (test mode is fine)

---

## Step 2 — API environment

Edit `apps/api/.env`:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_RETURN_PATH=/settings?tab=payments
WEB_URL=http://localhost:3000
```

- **Secret key:** Developers → API keys → Secret key  
- **Webhook secret:** from Stripe CLI (Step 4)

Restart the API after saving.

---

## Step 3 — Webhook listener (required for purchases)

Install [Stripe CLI](https://stripe.com/docs/stripe-cli), then:

```bash
stripe login
stripe listen --forward-to localhost:4000/v1/stripe/webhook
```

Copy the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET` in `apps/api/.env` and **restart the API**.

Keep this terminal open while testing checkout.

Events used:

- `checkout.session.completed` → records `Purchase` in Postgres
- `account.updated` → updates creator Connect status

---

## Step 4 — Approve a creator (dev)

Payments tab only appears for **approved creators**.

```bash
npm run db:approve-creator -- your-google-email@gmail.com
```

---

## Step 5 — Connect creator bank (Stripe Express)

1. Log in as that user
2. **Settings → Payments & Payouts**
3. **Connect bank with Stripe**
4. Complete Stripe test onboarding (use test data)
5. **Refresh status** — expect:
   - Connected: Yes
   - Accept payments: Yes

In test mode, charges are often enabled immediately after onboarding.

---

## Step 6 — Seed a demo release (dev)

```bash
npm run db:seed-demo-release -- your-google-email@gmail.com
```

Creates a published single for **$9.99** in the store (no S3 upload required for testing).

---

## Step 7 — Test a purchase

1. Log in as a **different** Google account (collector)
2. Open http://localhost:3000/collector
3. Find **Demo Single — Stripe Test** → **Buy release**
4. Stripe Checkout test card: `4242 4242 4242 4242`, any future expiry, any CVC
5. After payment → redirect to `/collector?purchased=...`
6. Release appears under **My Collection**

Verify webhook terminal shows `checkout.session.completed`.

Verify DB:

```bash
cd apps/api && npm run db:studio
```

Check `purchases` table.

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| Stripe not configured | Set `STRIPE_SECRET_KEY`, restart API |
| Creator account not approved | `npm run db:approve-creator -- email` |
| Creator has not connected Stripe | Settings → Payments → Connect |
| Creator cannot accept payments yet | Finish Stripe onboarding; refresh status |
| Purchase succeeds but not in collection | Webhook not running — start `stripe listen` |
| Webhook signature error | Update `STRIPE_WEBHOOK_SECRET` from CLI output, restart API |
| Payments tab missing | User must have `creatorStatus: approved` |

---

## Production checklist

- [ ] Live mode keys (`sk_live_`, not `sk_test_`)
- [ ] Production webhook endpoint: `https://your-api.com/v1/stripe/webhook`
- [ ] Connect branding and terms of service URL in Stripe Dashboard
- [ ] Platform fee / application fee (optional — not implemented yet)

---

## Next after Stripe

1. **S3/R2** — real creator uploads (`docs/PRODUCT_READINESS.md`)
2. **Redis + worker** — `npm run worker`
3. **DRM vendor** — protected playback
