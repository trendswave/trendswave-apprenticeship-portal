const http = require('http');
const fs = require('fs');
const path = require('path');
const { AgreementWorkflowStore } = require('./workflow');
const { GmailMailer } = require('./mailer');

const publicDir = path.join(__dirname, '..', 'public');
const mailer = new GmailMailer();
const workflow = new AgreementWorkflowStore({ mailer });

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('Invalid JSON payload.'));
      }
    });
  });
}

function serveStatic(req, res) {
  const requestedPath = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(publicDir, requestedPath);

  if (!filePath.startsWith(publicDir)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendJson(res, 404, { error: 'Not found' });
      return;
    }

    const extension = path.extname(filePath);
    const contentType =
      extension === '.js'
        ? 'text/javascript'
        : extension === '.css'
          ? 'text/css'
          : 'text/html';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/api/agreement/sign') {
      const body = await parseBody(req);
      const agreement = workflow.signInitialAgreement({
        apprenticeName: body.apprenticeName,
        apprenticeEmail: body.apprenticeEmail,
        apprenticePhone: body.apprenticePhone,
        apprenticeAddress: body.apprenticeAddress,
        guarantorName: body.guarantorName,
        guarantorLocation: body.guarantorLocation,
        termsText: body.termsText,
        apprenticeSignature: body.apprenticeSignature
      });
      sendJson(res, 200, { agreement });
      return;
    }

    if (req.method === 'POST' && req.url === '/api/payment/submit') {
      const body = await parseBody(req);
      const result = workflow.submitPaymentInformation({
        agreementVersionId: body.agreementVersionId,
        paymentInput: body
      });
      sendJson(res, 200, result);
      return;
    }

    if (req.method === 'POST' && req.url === '/api/payment/review') {
      const body = await parseBody(req);
      const paymentRecord = workflow.reviewPaymentInformation({
        paymentRecordId: body.paymentRecordId,
        status: body.status,
        reviewedBy: body.reviewedBy,
        reviewNote: body.reviewNote
      });
      sendJson(res, 200, { paymentRecord });
      return;
    }

    if (req.method === 'POST' && req.url === '/api/agreement/finalize') {
      const body = await parseBody(req);
      const finalization = workflow.finalizeAgreement({
        agreementVersionId: body.agreementVersionId,
        paymentRecordId: body.paymentRecordId
      });
      sendJson(res, 200, { finalization });
      return;
    }

    if (req.method === 'GET' && req.url === '/api/state') {
      sendJson(res, 200, workflow.getState());
      return;
    }

    if (req.method === 'GET') {
      serveStatic(req, res);
      return;
    }

    sendJson(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
});

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  server.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Trendswave portal running at http://localhost:${port}`);
  });
}

module.exports = { server, workflow };
