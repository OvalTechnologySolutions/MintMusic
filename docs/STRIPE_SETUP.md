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

## Mint top-ups & Artist subscription (payment sprint)

See **[MINT_BILLING.md](./MINT_BILLING.md)** for full architecture.

### Additional API env

```env
STRIPE_ARTIST_PRICE_ID=price_...   # $9.99/month recurring
MINT_TOPUP_MAX_CENTS=100000
OFFLINE_LEASE_SECONDS=604800
```

### Create Artist Price (test mode)

1. Stripe Dashboard → Products → Add product **MintMusic Artist**
2. Pricing: **$9.99 USD**, recurring **monthly**
3. Copy Price ID into `STRIPE_ARTIST_PRICE_ID`

### Extra webhook events

In addition to `checkout.session.completed` and `account.updated`:

- `checkout.session.async_payment_succeeded` / `async_payment_failed` / `expired`
- `customer.subscription.created` / `updated` / `deleted`
- `invoice.payment_failed`
- `charge.refunded`
- `charge.dispute.created` / `charge.dispute.funds_withdrawn`

### Test Mint purchase

1. Sign in on `/` with Google/GitHub
2. Open wallet → Add Mint → $5 / $10 / $25
3. Pay with `4242 4242 4242 4242`
4. Confirm balance via Settings or TopBar after webhook

### Test Artist free year

1. Approve creator: `npm run db:approve-creator -- you@email.com`
2. Artist tab → Start 12 months free
3. Cancel renewal → access remains through free-period end
4. Add payment method via portal → Authorize $9.99 renewal before charging

### Test cards

| Card | Result |
|------|--------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0002` | Decline |
| `4000 0000 0000 0341` | Attach succeeds, charge fails later |

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
| STRIPE_ARTIST_PRICE_ID missing | Create monthly $9.99 price; set env |
| Mint not credited after checkout | Webhook must process; redirect alone never credits |
| Artist features paused | Free year ended without renewal authorization |

---

## Production checklist

- [ ] Live mode keys (`sk_live_`, not `sk_test_`)
- [ ] Production webhook endpoint: `https://your-api.com/v1/stripe/webhook`
- [ ] Connect branding and terms of service URL in Stripe Dashboard
- [ ] Platform fee / application fee (optional — not implemented yet)
- [ ] Artist Price ID configured; Customer Portal enabled
- [ ] Mint top-up and subscription flows verified in test mode first

---

## Next after Stripe

1. **S3/R2** — real creator uploads (`docs/PRODUCT_READINESS.md`)
2. **Redis + worker** — `npm run worker`
3. **DRM vendor** — protected playback / offline licenses
