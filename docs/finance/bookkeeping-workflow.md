# Bookkeeping workflow

This is a technical workflow for collecting evidence. Confirm account mapping, VAT, OSS, and Swedish bookkeeping details with an accountant.

## Evidence bundle per period

- Stripe balance transaction report.
- Stripe payout report.
- Stripe invoice/receipt exports.
- Stripe refund/dispute export.
- Volturiano `credit_transactions` export.
- Volturiano `refund_requests` export.
- Volturiano `stripe_webhook_events` export for the same period.
- Revolut business account statement.
- Supplier receipts/invoices for Supabase, AI providers, hosting, fuel/mileage, and other costs.

## Monthly routine

1. Export Stripe balance transactions for the month.
2. Export Revolut statement for the month.
3. Download supplier invoices/receipts.
4. Use `/api/billing/finance-export?from=YYYY-MM-DD&to=YYYY-MM-DD` as admin.
5. Reconcile Stripe gross, fees, refunds/disputes, and net payout to Revolut.
6. Store the evidence bundle in a dated folder.
7. Mark unresolved differences before year-end.

## Controls

- Do not manually increase credits without an audit log and reason.
- Every refund should have a Stripe refund/dispute reference or admin note.
- Keep financial ledger rows even when account deletion anonymizes the user.
- Save accounting evidence for the legally required retention period.

## Simple Stripe mental model

Stripe is not the bookkeeping by itself. Stripe is one evidence source. The business bookkeeping needs:

- the sale,
- the Stripe fee,
- the net payout to the bank,
- refunds/disputes if any,
- VAT/tax treatment,
- and matching bank statements.
