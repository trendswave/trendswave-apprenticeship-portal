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

  return {
    paymentMade,
    amountPaid,
    remainingBalance,
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
