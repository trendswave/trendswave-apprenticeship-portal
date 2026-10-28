const PAYMENT_REVIEW_STATUSES = [
  'payment_verified',
  'balance_outstanding',
  'fully_paid',
  'payment_disputed'
];

function toNumber(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`${field} must be a valid number.`);
  }
  if (number < 0) {
    throw new Error(`${field} cannot be negative.`);
  }
  return number;
}

function toDateString(value, field) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    throw new Error(`${field} must be a valid date.`);
  }
  return date.toISOString().slice(0, 10);
}

function validatePaymentSubmission(input) {
  if (!input || input.apprenticeConfirmedAccurate !== true) {
    throw new Error('Apprentice must confirm payment information is accurate.');
  }

  const paymentMade = input.paymentMade === true || input.paymentMade === 'true';
  const amountPaid = toNumber(input.amountPaid, 'amountPaid');
  const remainingBalance = toNumber(input.remainingBalance, 'remainingBalance');

  if (!paymentMade && amountPaid > 0) {
    throw new Error('amountPaid must be zero when paymentMade is false.');
  }

  const paymentDate = toDateString(input.paymentDate, 'paymentDate');

  if (!input.paymentMethodReference || !String(input.paymentMethodReference).trim()) {
    throw new Error('paymentMethodReference is required.');
  }

  let expectedBalancePaymentDate = null;
  if (remainingBalance > 0) {
    expectedBalancePaymentDate = toDateString(
      input.expectedBalancePaymentDate,
      'expectedBalancePaymentDate'
    );
  }

  return {
    paymentMade,
    amountPaid,
    paymentDate,
    paymentMethodReference: String(input.paymentMethodReference).trim(),
    remainingBalance,
    expectedBalancePaymentDate,
    apprenticeConfirmedAccurate: true
  };
}

function validateReviewStatus(status) {
  if (!PAYMENT_REVIEW_STATUSES.includes(status)) {
    throw new Error(
      `status must be one of: ${PAYMENT_REVIEW_STATUSES.join(', ')}`
    );
  }
  return status;
}

module.exports = {
  PAYMENT_REVIEW_STATUSES,
  validatePaymentSubmission,
  validateReviewStatus
};
