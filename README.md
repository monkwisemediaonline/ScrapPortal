# Ludhiana Scrap Exchange

B2B marketplace for industrial scrap in Ludhiana: iron and steel, non-ferrous metals, cloth (katran), cardboard, plastic and more.

**Two ways to trade**
1. **Daily buyer rate card.** Admin posts each buyer's (furnace or mill) buying rate per grade every morning. The public board shows the best rate. A seller taps "Sell at this rate", and admin brokers the deal. Later, buyers are linked to their rate source and can post rates themselves.
2. **Lot auctions.** An approved seller lists a lot. Approved buyers bid per kg or per tonne and see only the top bid, never who placed it. The seller picks any bidder, which creates a deal.

Both methods end in a **Deal**: confirmed → pickup → weighed (weighbridge slip, deductions) → payment → completed. Phone numbers are only revealed to the two parties of a deal.

UI languages: English, हिंदी, ਪੰਜਾਬੀ. The admin panel is English-only.

Stack: Next.js 16 (App Router, server actions) · Supabase (Postgres, Auth, Storage, RLS) · Tailwind 4.

---

## Setup

### 1. Supabase project
1. Create a project at supabase.com. Pick the **Mumbai (ap-south-1)** region.
2. In **SQL Editor**, run the files in `supabase/migrations/` in date order, then `supabase/seed.sql`.
3. Login is **email + password**. Under **Authentication → Sign In / Providers → Email**, turn **Confirm email** off so new members are signed in straight away. If you leave it on, each sign-up waits for a confirmation email, and Supabase's built-in mailer only sends a few per hour.
4. Under **Authentication → URL Configuration**, set **Site URL** to your live address and add `<address>/**` under **Redirect URLs** (also `http://localhost:3000/**` for local work). Password-reset emails use this.

### 2. Environment
```bash
cp .env.example .env.local
```
Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from **Project Settings → API**, and `NEXT_PUBLIC_SUPPORT_PHONE` (shown to sellers on deals you broker).

### 3. Run
```bash
npm install
npm run dev
```

### 4. Make yourself admin
Create your account and fill in the business form, then run this in the SQL Editor:
```sql
update profiles set role = 'admin', status = 'approved' where email = 'you@example.com';
```

---

## Daily admin routine
1. **Admin → Rate sources**: add each buyer you get rates from, one time only. The public label hides their name. Their contact details stay private.
2. **Admin → Daily rates**: click *Fill blanks with last known rates*, change what moved, then *Save*.
3. **Admin → Sell requests**: call the buyer, call the seller, then **Convert to deal**.
4. **Admin → Members**: verify GSTIN and business, then approve.
5. **Admin → Deals**: record pickup, weighbridge weight, deductions and payment.

When a buyer joins the portal, link their member ID (e.g. `LSX-1004`) to their rate source. The database already lets a linked buyer post rates for their own source.

## Where things live
| | |
|---|---|
| `supabase/migrations/…_init.sql` | Schema, row-level security, triggers, `accept_bid()`, `rate_board()`, `deal_contacts()` |
| `supabase/seed.sql` | Starter categories and grades (EN/HI/PA). Have a native speaker review the Hindi and Punjabi |
| `lib/i18n/{en,hi,pa}.ts` | UI strings |
| `lib/config.ts` | Brand name. Change it here |
| `app/actions/member.ts` | Onboarding, sell requests, lots, bids, deal updates |
| `app/actions/admin.ts` | Rates, sources, catalog, members, request → deal |

## Security model (enforced in the database, not just the UI)
- Members can't make themselves admin or approve themselves (`profiles_guard`).
- Only approved sellers can list lots. Only approved buyers can bid. Bids are blocked after closing, below the starting rate, and on your own lot (`bids_guard`).
- Bidders see only their own bid plus the top rate and bid count (`lot_bid_summary`). The lot owner sees all bids under pseudonymous member IDs.
- Only `accept_bid()` can award a lot. It atomically rejects the other bids and creates the deal.
- A buyer can record weight and payment on a deal but can't change the agreed rate (`deals_guard`).
- Rate-source contact details are visible to admin only.

## Roadmap
- WhatsApp: daily rate broadcast, OTP, new-bid and deal alerts
- Buyer self-serve rate posting screen
- Ratings after completed deals; GST invoice PDF; payment escrow
- Commission tracking per deal; more cities
