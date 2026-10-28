let agreementVersionId = null;
let paymentRecordId = null;
let reviewedPaymentRecordId = null;

const statusBox = document.getElementById('status-box');
const finalizeButton = document.getElementById('finalize-button');

function updateStatus(message, data) {
  statusBox.textContent = `${message}\n\n${data ? JSON.stringify(data, null, 2) : ''}`;
}

async function post(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error || 'Request failed');
  }
  return body;
}

document.getElementById('agreement-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);

  try {
    const body = await post('/api/agreement/sign', {
      apprenticeName: form.get('apprenticeName'),
      apprenticeEmail: form.get('apprenticeEmail'),
      apprenticePhone: form.get('apprenticePhone'),
      apprenticeAddress: form.get('apprenticeAddress'),
      guarantorName: form.get('guarantorName'),
      guarantorLocation: form.get('guarantorLocation'),
      apprenticeSignature: form.get('apprenticeSignature'),
      termsText: form.get('termsText')
    });

    agreementVersionId = body.agreement.id;
    updateStatus('Agreement signed. Payment confirmation is now required.', body);
  } catch (error) {
    updateStatus(`Error: ${error.message}`);
  }
});

document.getElementById('payment-form').addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!agreementVersionId) {
    updateStatus('Error: sign an agreement first.');
    return;
  }

  const form = new FormData(event.currentTarget);

  try {
    const body = await post('/api/payment/submit', {
      agreementVersionId,
      paymentMade: form.get('paymentMade'),
      amountPaid: form.get('amountPaid'),
      remainingBalance: form.get('remainingBalance'),
      apprenticeConfirmedAccurate: form.get('apprenticeConfirmedAccurate') === 'on'
    });

    paymentRecordId = body.paymentRecord.id;
    reviewedPaymentRecordId = null;
    finalizeButton.disabled = true;
    updateStatus(
      'Your application has been successfully submitted and is pending approval. Check your email for confirmation of your registration/submission.',
      body
    );
  } catch (error) {
    updateStatus(`Error: ${error.message}`);
  }
});

document.getElementById('review-form').addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!paymentRecordId) {
    updateStatus('Error: submit payment information first.');
    return;
  }

  const form = new FormData(event.currentTarget);

  try {
    const body = await post('/api/payment/review', {
      paymentRecordId,
      status: form.get('status'),
      reviewedBy: form.get('reviewedBy'),
      reviewNote: form.get('reviewNote')
    });

    reviewedPaymentRecordId = body.paymentRecord.id;
    const canFinalize = ['payment_verified', 'balance_outstanding', 'fully_paid'].includes(
      body.paymentRecord.status
    );
    finalizeButton.disabled = !canFinalize;

    updateStatus('Trendswave verification recorded.', body);
  } catch (error) {
    updateStatus(`Error: ${error.message}`);
  }
});

finalizeButton.addEventListener('click', async () => {
  if (!agreementVersionId || !reviewedPaymentRecordId) {
    updateStatus('Error: approval state not ready for finalization.');
    return;
  }

  try {
    const body = await post('/api/agreement/finalize', {
      agreementVersionId,
      paymentRecordId: reviewedPaymentRecordId
    });

    updateStatus('Final PDF generated and emailed to apprentice + Trendswave.', body);
  } catch (error) {
    updateStatus(`Error: ${error.message}`);
  }
});
