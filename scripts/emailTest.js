/* eslint-disable no-console */
require('dotenv').config();
const { sendEmail } = require('../src/services/emailService');

async function main() {
  try {
    const to = process.argv[2] || 'monu2feb2004@gmail.com';
    const subject = 'NewtonBotics SMTP Test';
    const text = 'SMTP test email from NewtonBotics backend.';
    const html = '<p>SMTP test email from <strong>NewtonBotics</strong> backend.</p>';
    const info = await sendEmail({ to, subject, text, html });
    console.log('Email sent:', info && info.messageId ? info.messageId : info);
    process.exit(0);
  } catch (err) {
    console.error('Failed to send email:', err);
    process.exit(1);
  }
}

main();



