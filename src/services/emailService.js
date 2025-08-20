const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const from = process.env.EMAIL_FROM || 'no-reply@example.com';
const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  try {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
    return transporter;
  } catch (err) {
    logger.error('Email transporter init failed:', err);
    return null;
  }
}

async function sendEmail({ to, subject, html, text }) {
  const tx = getTransporter();
  if (!tx) {
    logger.warn('Email transporter not configured. Logging email instead.');
    logger.info(`EMAIL to=${to} subject=${subject}\n${text || html}`);
    return { mocked: true };
  }
  const info = await tx.sendMail({ from, to, subject, html, text });
  logger.info(`Email sent to ${to}: ${info.messageId}`);
  return info;
}

function buildHtml(title, body) {
  return `
  <div style="font-family:Inter,Arial,sans-serif; max-width:640px; margin:0 auto;">
    <h2 style="color:#111827;">${title}</h2>
    <div style="color:#374151; line-height:1.6;">${body}</div>
    <hr style="margin:24px 0; border:none; border-top:1px solid #e5e7eb;" />
    <div style="color:#6b7280; font-size:12px;">This is an automated message from NewtonBotics.</div>
  </div>`;
}

async function sendPasswordResetEmail({ email, token }) {
  const link = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const subject = 'Reset your NewtonBotics password';
  const html = buildHtml('Reset your password', `
    <p>We received a request to reset your password.</p>
    <p><a href="${link}">Click here to reset your password</a>. This link will expire in 1 hour.</p>
  `);
  const text = `Reset your password: ${link}`;
  return sendEmail({ to: email, subject, html, text });
}

async function sendRoleAssignedEmail({ email, fullName, role }) {
  const subject = 'Your NewtonBotics role has been updated';
  const html = buildHtml('Role updated', `
    <p>Hello ${fullName || ''},</p>
    <p>Your role has been updated to <strong>${role}</strong>. You now have access to additional features.</p>
  `);
  const text = `Your role has been updated to ${role}.`;
  return sendEmail({ to: email, subject, html, text });
}

async function sendContactAcknowledgement({ name, email }) {
  const subject = 'We received your message';
  const html = buildHtml('Thanks for contacting NewtonBotics', `
    <p>Hi ${name || ''},</p>
    <p>We have received your message and will get back to you shortly.</p>
  `);
  const text = `Hi ${name || ''}, we received your message and will reply soon.`;
  return sendEmail({ to: email, subject, html, text });
}

async function sendContactNotificationToAdmin({ subject: sub, name, email, message }) {
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || process.env.SMTP_USER || from;
  const subject = `[Contact] ${sub} from ${name}`;
  const html = buildHtml('New contact submission', `
    <p><strong>From:</strong> ${name} (${email})</p>
    <p><strong>Subject:</strong> ${sub}</p>
    <p><strong>Message:</strong></p>
    <p>${message}</p>
  `);
  const text = `From: ${name} <${email}>, Subject: ${sub}, Message: ${message}`;
  return sendEmail({ to: adminEmail, subject, html, text });
}

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendRoleAssignedEmail,
  sendContactAcknowledgement,
  sendContactNotificationToAdmin,
};

// Extra domain notifications
async function sendProjectCreatedNotification({ project, recipients = [] }) {
  if (!project) return;
  const subject = `New Project Created: ${project.title}`;
  const link = `${baseUrl}/projects/${project._id}`;
  const html = buildHtml('New Project Created', `
    <p><strong>${project.title}</strong> has been created.</p>
    <p>Status: ${project.status}</p>
    <p><a href="${link}">View Project</a></p>
  `);
  const text = `New project created: ${project.title} (${link})`;
  const toList = recipients.filter(Boolean);
  if (toList.length === 0) return;
  return sendEmail({ to: toList.join(','), subject, html, text });
}

async function sendWorkshopRegistrationEmail({ workshop, userEmail }) {
  if (!workshop || !userEmail) return;
  const subject = `Workshop Registration: ${workshop.title}`;
  const html = buildHtml('Registration Confirmed', `
    <p>You are registered for <strong>${workshop.title}</strong>.</p>
    <p>Start: ${new Date(workshop.startDate).toLocaleString()}</p>
    <p>Location: ${workshop.location || 'TBA'}</p>
  `);
  const text = `Registered for ${workshop.title}`;
  return sendEmail({ to: userEmail, subject, html, text });
}

async function sendInventoryCheckoutEmail({ equipment, userEmail, quantity, expectedReturnDate }) {
  if (!equipment || !userEmail) return;
  const subject = `Equipment Checkout: ${equipment.name}`;
  const html = buildHtml('Checkout Confirmed', `
    <p>You checked out <strong>${equipment.name}</strong> (x${quantity}).</p>
    <p>Expected return: ${new Date(expectedReturnDate).toLocaleDateString()}</p>
    <p>Location: ${equipment.location || 'Inventory Desk'}</p>
  `);
  const text = `Checked out ${equipment.name} x${quantity}. Expected return ${new Date(expectedReturnDate).toDateString()}`;
  return sendEmail({ to: userEmail, subject, html, text });
}

module.exports.sendProjectCreatedNotification = sendProjectCreatedNotification;
module.exports.sendWorkshopRegistrationEmail = sendWorkshopRegistrationEmail;
module.exports.sendInventoryCheckoutEmail = sendInventoryCheckoutEmail;

// Project status changed
async function sendProjectStatusChangedEmail({ project, oldStatus, newStatus, recipients = [] }) {
  if (!project || !oldStatus || !newStatus) return;
  const subject = `Project Status Updated: ${project.title}`;
  const link = `${baseUrl}/projects/${project._id}`;
  const html = buildHtml('Project Status Changed', `
    <p><strong>${project.title}</strong> status updated from <strong>${oldStatus}</strong> to <strong>${newStatus}</strong>.</p>
    <p><a href="${link}">View Project</a></p>
  `);
  const text = `Project ${project.title} status: ${oldStatus} -> ${newStatus}. ${link}`;
  const toList = recipients.filter(Boolean);
  if (toList.length === 0) return;
  return sendEmail({ to: toList.join(','), subject, html, text });
}

// Project request status notifications
async function sendProjectRequestStatusEmail({ request, newStatus, recipientEmail }) {
  if (!request || !recipientEmail) return;
  const subject = `Project Request ${newStatus.replace('_', ' ').toUpperCase()}: ${request.title}`;
  const html = buildHtml('Project Request Update', `
    <p>Your project request <strong>${request.title}</strong> is now <strong>${newStatus}</strong>.</p>
  `);
  const text = `Your project request ${request.title} is now ${newStatus}.`;
  return sendEmail({ to: recipientEmail, subject, html, text });
}

module.exports.sendProjectStatusChangedEmail = sendProjectStatusChangedEmail;
module.exports.sendProjectRequestStatusEmail = sendProjectRequestStatusEmail;


