const {
  validatePaymentSubmission,
  validateReviewStatus
} = require('./validation');

const FINALIZABLE_PAYMENT_STATUSES = new Set([
  'payment_verified',
  'balance_outstanding',
  'fully_paid'
]);

class AgreementWorkflowStore {
  constructor({ mailer }) {
    this.mailer = mailer;
    this.agreements = [];
    this.paymentRecords = [];
    this.finalizations = [];
    this.agreementCounter = 0;
    this.paymentCounter = 0;
  }

  signInitialAgreement({ apprenticeName, apprenticeEmail, termsText, apprenticeSignature }) {
    if (!apprenticeName || !apprenticeEmail || !apprenticeSignature) {
      throw new Error('apprenticeName, apprenticeEmail, and apprenticeSignature are required.');
    }

    const agreementRootId = `agr-${++this.agreementCounter}`;
    const versioned = this.#createAgreementVersionRecord({
      agreementRootId,
      version: 1,
      previousVersionId: null,
      apprenticeName,
      apprenticeEmail,
      termsText: termsText || 'Trendswave apprenticeship terms.',
      apprenticeSignature
    });

    this.agreements.push(versioned);
    return versioned;
  }

  createAgreementVersion({ agreementVersionId, termsText, apprenticeSignature }) {
    const current = this.getAgreementByVersionId(agreementVersionId);
    const nextVersion = this.#createAgreementVersionRecord({
      agreementRootId: current.agreementRootId,
      version: current.version + 1,
      previousVersionId: current.id,
      apprenticeName: current.apprenticeName,
      apprenticeEmail: current.apprenticeEmail,
      termsText: termsText || current.termsText,
      apprenticeSignature: apprenticeSignature || current.apprenticeSignature
    });

    this.agreements.push(nextVersion);
    return nextVersion;
  }

  submitPaymentInformation({ agreementVersionId, paymentInput }) {
    const agreement = this.getAgreementByVersionId(agreementVersionId);
    const normalized = validatePaymentSubmission(paymentInput);
    const now = new Date().toISOString();

    const record = {
      id: `pay-${++this.paymentCounter}`,
      previousPaymentRecordId: null,
      agreementVersionId: agreement.id,
      paymentMade: normalized.paymentMade,
      amountPaid: normalized.amountPaid,
      paymentDate: normalized.paymentDate,
      paymentMethodReference: normalized.paymentMethodReference,
      remainingBalance: normalized.remainingBalance,
      expectedBalancePaymentDate: normalized.expectedBalancePaymentDate,
      apprenticeConfirmedAccurate: true,
      submittedAt: now,
      reviewedAt: null,
      reviewedBy: null,
      reviewNote: null,
      status: 'awaiting_trendswave_verification',
      statusHistory: [
        { status: 'payment_information_submitted', at: now, actor: 'apprentice' },
        { status: 'awaiting_trendswave_verification', at: now, actor: 'system' }
      ]
    };

    this.paymentRecords.push(record);
    return { agreement, paymentRecord: record };
  }

  reviewPaymentInformation({ paymentRecordId, status, reviewedBy, reviewNote }) {
    const source = this.getPaymentRecordById(paymentRecordId);
    const validatedStatus = validateReviewStatus(status);

    if (!reviewedBy) {
      throw new Error('reviewedBy is required for Trendswave verification.');
    }

    const now = new Date().toISOString();

    const reviewedRecord = {
      ...source,
      id: `pay-${++this.paymentCounter}`,
      previousPaymentRecordId: source.id,
      reviewedAt: now,
      reviewedBy,
      reviewNote: reviewNote || null,
      status: validatedStatus,
      statusHistory: [
        ...source.statusHistory,
        { status: validatedStatus, at: now, actor: reviewedBy }
      ]
    };

    this.paymentRecords.push(reviewedRecord);
    return reviewedRecord;
  }

  finalizeAgreement({ agreementVersionId, paymentRecordId }) {
    const agreement = this.getAgreementByVersionId(agreementVersionId);
    const paymentRecord = this.getPaymentRecordById(paymentRecordId);

    if (paymentRecord.agreementVersionId !== agreement.id) {
      throw new Error('payment record does not match selected agreement version.');
    }

    if (!FINALIZABLE_PAYMENT_STATUSES.has(paymentRecord.status)) {
      throw new Error(
        'Final PDF generation is blocked until Trendswave verifies payment information.'
      );
    }

    const alreadyFinalized = this.finalizations.find(
      (entry) => entry.agreementVersionId === agreement.id && entry.paymentRecordId === paymentRecord.id
    );

    if (alreadyFinalized) {
      return alreadyFinalized;
    }

    const pdfContent = this.#buildPseudoPdf(agreement, paymentRecord);
    const subject = `Final Apprenticeship Agreement - ${agreement.apprenticeName}`;
    const body = 'Attached is the finalized Trendswave apprenticeship agreement.';

    const apprenticeEmail = this.mailer.sendAgreementEmail({
      to: agreement.apprenticeEmail,
      subject,
      body,
      attachmentName: `${agreement.id}-final.pdf`,
      attachmentContent: pdfContent
    });

    const trendswaveEmail = this.mailer.sendAgreementEmail({
      to: this.mailer.config.trendswaveEmail,
      subject,
      body,
      attachmentName: `${agreement.id}-final.pdf`,
      attachmentContent: pdfContent
    });

    const finalization = {
      id: `final-${agreement.id}`,
      agreementVersionId: agreement.id,
      paymentRecordId: paymentRecord.id,
      finalizedAt: new Date().toISOString(),
      status: 'finalized_and_emailed',
      notifications: [apprenticeEmail, trendswaveEmail]
    };

    this.finalizations.push(finalization);
    return finalization;
  }

  getAgreementByVersionId(agreementVersionId) {
    const agreement = this.agreements.find((item) => item.id === agreementVersionId);
    if (!agreement) {
      throw new Error(`Agreement version not found: ${agreementVersionId}`);
    }
    return agreement;
  }

  getPaymentRecordById(paymentRecordId) {
    const paymentRecord = this.paymentRecords.find((item) => item.id === paymentRecordId);
    if (!paymentRecord) {
      throw new Error(`Payment record not found: ${paymentRecordId}`);
    }
    return paymentRecord;
  }

  getState() {
    return {
      agreements: this.agreements,
      paymentRecords: this.paymentRecords,
      finalizations: this.finalizations
    };
  }

  #createAgreementVersionRecord({
    agreementRootId,
    version,
    previousVersionId,
    apprenticeName,
    apprenticeEmail,
    termsText,
    apprenticeSignature
  }) {
    const signedAt = new Date().toISOString();
    return {
      id: `${agreementRootId}-v${version}`,
      agreementRootId,
      version,
      previousVersionId,
      apprenticeName,
      apprenticeEmail,
      termsText,
      apprenticeSignature,
      signedAt,
      immutable: true
    };
  }

  #buildPseudoPdf(agreement, paymentRecord) {
    return [
      'TRENDSWAVE APPRENTICESHIP AGREEMENT (FINALIZED)',
      `Agreement Version: ${agreement.id}`,
      `Apprentice: ${agreement.apprenticeName}`,
      `Signed At: ${agreement.signedAt}`,
      '',
      'Payment Acknowledgment',
      `Payment Made: ${paymentRecord.paymentMade ? 'Yes' : 'No'}`,
      `Amount Paid: ${paymentRecord.amountPaid}`,
      `Payment Date: ${paymentRecord.paymentDate}`,
      `Payment Method/Reference: ${paymentRecord.paymentMethodReference}`,
      `Remaining Balance: ${paymentRecord.remainingBalance}`,
      `Expected Balance Payment Date: ${paymentRecord.expectedBalancePaymentDate || 'N/A'}`,
      `Trendswave Review Status: ${paymentRecord.status}`,
      `Reviewed By: ${paymentRecord.reviewedBy || 'N/A'}`,
      '',
      'The apprentice confirms this payment information is accurate.',
      'Trendswave review and verification are required before final issuance.',
      '',
      'Formal legal terms must be reviewed for the applicable jurisdiction before official use.'
    ].join('\n');
  }
}

module.exports = { AgreementWorkflowStore, FINALIZABLE_PAYMENT_STATUSES };
