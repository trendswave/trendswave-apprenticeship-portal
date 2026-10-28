# trendswave-apprenticeship-portal

Digital apprenticeship agreement, e-signature, payment verification, document delivery, and progress tracking portal for Trendswave.

## What this version implements

- Apprentice signs the agreement first.
- Apprentice must complete a payment confirmation step before finalization:
  - whether payment was made
  - amount paid
  - payment date
  - payment method/reference
  - remaining balance
  - expected payment date for any balance
  - apprentice accuracy confirmation checkbox
- Payment status flow with explicit Trendswave review states:
  - `payment_information_submitted`
  - `awaiting_trendswave_verification`
  - `payment_verified`
  - `balance_outstanding`
  - `fully_paid`
  - `payment_disputed`
- Final PDF/email generation is blocked until Trendswave verifies/approves payment status.
- Finalized PDF notification is sent to both apprentice and Trendswave.
- Signed agreement versions are immutable; updates must create a new agreement version.
- Payment records are immutable; review/changes create a new payment record version linked to the prior record.

## Quick start

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## Tests

```bash
npm test
```

## Gmail delivery configuration (placeholders)

Set these environment variables before running in production:

- `GMAIL_SMTP_HOST` (default: `smtp.gmail.com`)
- `GMAIL_SMTP_PORT` (default: `587`)
- `GMAIL_USER` (placeholder in code: `your-gmail-address@example.com`)
- `GMAIL_APP_PASSWORD` (placeholder in code: `your-gmail-app-password`)
- `TRENDSWAVE_EMAIL` (placeholder in code: `trendswave-owner@example.com`)

> This repository currently includes a mailer placeholder implementation that records outgoing messages for workflow verification.

## Legal note

This workflow supports versioned records and verification controls, but formal agreement terms must still be reviewed by a qualified professional for the applicable jurisdiction before official use.
