const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validatePaymentSubmission,
  validateReviewStatus
} = require('../src/validation');

test('validatePaymentSubmission requires apprentice confirmation', () => {
  assert.throws(
    () =>
      validatePaymentSubmission({
        apprenticeConfirmedAccurate: false,
        paymentMade: true,
        amountPaid: 100,
        paymentDate: '2026-01-01',
        paymentMethodReference: 'bank transfer',
        remainingBalance: 0
      }),
    /must confirm/
  );
});

test('validatePaymentSubmission requires balance payment date when balance remains', () => {
  assert.throws(
    () =>
      validatePaymentSubmission({
        apprenticeConfirmedAccurate: true,
        paymentMade: true,
        amountPaid: 100,
        paymentDate: '2026-01-01',
        paymentMethodReference: 'bank transfer',
        remainingBalance: 50
      }),
    /expectedBalancePaymentDate/
  );
});

test('validatePaymentSubmission normalizes valid payload', () => {
  const payload = validatePaymentSubmission({
    apprenticeConfirmedAccurate: true,
    paymentMade: 'false',
    amountPaid: 0,
    paymentDate: '2026-01-01',
    paymentMethodReference: 'none',
    remainingBalance: 100,
    expectedBalancePaymentDate: '2026-02-01'
  });

  assert.equal(payload.paymentMade, false);
  assert.equal(payload.amountPaid, 0);
  assert.equal(payload.expectedBalancePaymentDate, '2026-02-01');
});

test('validateReviewStatus allows required workflow statuses only', () => {
  assert.equal(validateReviewStatus('payment_verified'), 'payment_verified');
  assert.throws(() => validateReviewStatus('awaiting_trendswave_verification'));
});
