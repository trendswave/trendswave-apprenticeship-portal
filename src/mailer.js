class GmailMailer {
  constructor(config = {}) {
    this.config = {
      host: config.host || process.env.GMAIL_SMTP_HOST || 'smtp.gmail.com',
      port: Number(config.port || process.env.GMAIL_SMTP_PORT || 587),
      user: config.user || process.env.GMAIL_USER || 'your-gmail-address@example.com',
      appPassword:
        config.appPassword ||
        process.env.GMAIL_APP_PASSWORD ||
        'your-gmail-app-password',
      trendswaveEmail:
        config.trendswaveEmail ||
        process.env.TRENDSWAVE_EMAIL ||
        'trendswave-owner@example.com'
    };
    this.sent = [];
  }

  sendAgreementEmail({ to, subject, body, attachmentName, attachmentContent }) {
    const message = {
      transport: `smtp://${this.config.host}:${this.config.port}`,
      authenticatedUser: this.config.user,
      to,
      subject,
      body,
      attachmentName,
      attachmentContent,
      sentAt: new Date().toISOString()
    };

    this.sent.push(message);
    return message;
  }
}

module.exports = { GmailMailer };
