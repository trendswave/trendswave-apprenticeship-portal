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
        remainingBalance: 0
      }),
    /must confirm/
  );
});

test('validatePaymentSubmission rejects paid amount when paymentMade is false', () => {
  assert.throws(
    () =>
      validatePaymentSubmission({
        apprenticeConfirmedAccurate: true,
        paymentMade: false,
        amountPaid: 100,
        remainingBalance: 50
      }),
    /amountPaid must be zero/
  );
});

test('validatePaymentSubmission normalizes valid payload', () => {
  const payload = validatePaymentSubmission({
    apprenticeConfirmedAccurate: true,
    paymentMade: 'false',
    amountPaid: 0,
    remainingBalance: 100
  });

  assert.equal(payload.paymentMade, false);
  assert.equal(payload.amountPaid, 0);
  assert.equal(payload.remainingBalance, 100);
});

test('validateReviewStatus allows required workflow statuses only', () => {
  assert.equal(validateReviewStatus('payment_verified'), 'payment_verified');
  assert.throws(() => validateReviewStatus('awaiting_trendswave_verification'));
});
