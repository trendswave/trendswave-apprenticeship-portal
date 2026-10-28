const test = require('node:test');
const assert = require('node:assert/strict');
const { AgreementWorkflowStore } = require('../src/workflow');
const { GmailMailer } = require('../src/mailer');

function buildStore() {
  return new AgreementWorkflowStore({
    mailer: new GmailMailer({ trendswaveEmail: 'owner@trendswave.test' })
  });
}

test('payment submission starts in awaiting verification with submitted history', () => {
  const store = buildStore();
  const agreement = store.signInitialAgreement({
    apprenticeName: 'Jane',
    apprenticeEmail: 'jane@example.com',
    apprenticeSignature: 'Jane Doe'
  });

  const { paymentRecord } = store.submitPaymentInformation({
    agreementVersionId: agreement.id,
    paymentInput: {
      paymentMade: true,
      amountPaid: 200,
      paymentDate: '2026-04-01',
      paymentMethodReference: 'bank-ref-1',
      remainingBalance: 0,
      apprenticeConfirmedAccurate: true
    }
  });

  assert.equal(paymentRecord.status, 'awaiting_trendswave_verification');
  assert.equal(paymentRecord.statusHistory[0].status, 'payment_information_submitted');
});

test('finalization is blocked until Trendswave verification status is approved', () => {
  const store = buildStore();
  const agreement = store.signInitialAgreement({
    apprenticeName: 'Jane',
    apprenticeEmail: 'jane@example.com',
    apprenticeSignature: 'Jane Doe'
  });

  const { paymentRecord } = store.submitPaymentInformation({
    agreementVersionId: agreement.id,
    paymentInput: {
      paymentMade: true,
      amountPaid: 200,
      paymentDate: '2026-04-01',
      paymentMethodReference: 'bank-ref-1',
      remainingBalance: 0,
      apprenticeConfirmedAccurate: true
    }
  });

  assert.throws(
    () =>
      store.finalizeAgreement({
        agreementVersionId: agreement.id,
        paymentRecordId: paymentRecord.id
      }),
    /blocked/
  );
});

test('review creates a new immutable payment record version', () => {
  const store = buildStore();
  const agreement = store.signInitialAgreement({
    apprenticeName: 'Jane',
    apprenticeEmail: 'jane@example.com',
    apprenticeSignature: 'Jane Doe'
  });

  const submission = store.submitPaymentInformation({
    agreementVersionId: agreement.id,
    paymentInput: {
      paymentMade: true,
      amountPaid: 150,
      paymentDate: '2026-04-01',
      paymentMethodReference: 'bank-ref-1',
      remainingBalance: 50,
      expectedBalancePaymentDate: '2026-05-01',
      apprenticeConfirmedAccurate: true
    }
  }).paymentRecord;

  const reviewed = store.reviewPaymentInformation({
    paymentRecordId: submission.id,
    status: 'balance_outstanding',
    reviewedBy: 'Trendswave Admin'
  });

  assert.notEqual(reviewed.id, submission.id);
  assert.equal(reviewed.previousPaymentRecordId, submission.id);
  assert.equal(submission.status, 'awaiting_trendswave_verification');
});

test('finalization after verification emails both apprentice and Trendswave', () => {
  const store = buildStore();
  const agreement = store.signInitialAgreement({
    apprenticeName: 'Jane',
    apprenticeEmail: 'jane@example.com',
    apprenticeSignature: 'Jane Doe'
  });

  const submitted = store.submitPaymentInformation({
    agreementVersionId: agreement.id,
    paymentInput: {
      paymentMade: true,
      amountPaid: 200,
      paymentDate: '2026-04-01',
      paymentMethodReference: 'bank-ref-1',
      remainingBalance: 0,
      apprenticeConfirmedAccurate: true
    }
  }).paymentRecord;

  const reviewed = store.reviewPaymentInformation({
    paymentRecordId: submitted.id,
    status: 'fully_paid',
    reviewedBy: 'Trendswave Admin'
  });

  const finalization = store.finalizeAgreement({
    agreementVersionId: agreement.id,
    paymentRecordId: reviewed.id
  });

  assert.equal(finalization.notifications.length, 2);
  assert.equal(finalization.status, 'finalized_and_emailed');
});

test('signed agreements are immutable and updates create new agreement versions', () => {
  const store = buildStore();
  const v1 = store.signInitialAgreement({
    apprenticeName: 'Jane',
    apprenticeEmail: 'jane@example.com',
    apprenticeSignature: 'Jane Doe',
    termsText: 'v1 terms'
  });

  const v2 = store.createAgreementVersion({
    agreementVersionId: v1.id,
    termsText: 'v2 terms'
  });

  assert.notEqual(v1.id, v2.id);
  assert.equal(v1.termsText, 'v1 terms');
  assert.equal(v2.previousVersionId, v1.id);
});
