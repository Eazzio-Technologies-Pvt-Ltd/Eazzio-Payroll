const nodemailer = require('nodemailer');
const logger = require('../config/logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.mailtrap.io',
  port: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '2525'),
  auth: {
    user: process.env.SMTP_USER || process.env.EMAIL_USER || '',
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASS || ''
  }
});

const sendEmail = async ({ to, subject, html, attachments }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.FROM_EMAIL || process.env.EMAIL_FROM || '"FFMS Admin" <noreply@ffms.com>',
      to,
      subject,
      html,
      attachments
    });
    logger.info(`Email sent successfully: ${info.messageId}`);
    return info;
  } catch (err) {
    logger.error('Error sending email:', err);
    throw err;
  }
};

const sendWelcomeEmail = async (user, tempPassword) => {
  const html = `
    <h1>Welcome to FFMS, ${user.name}!</h1>
    <p>Your account has been created by the administrator.</p>
    <p><strong>Employee ID:</strong> ${user.employeeId}</p>
    <p><strong>Temporary Password:</strong> ${tempPassword}</p>
    <p>Please log in and change your password immediately.</p>
  `;
  return sendEmail({ to: user.email, subject: 'Welcome to FFMS - Account Created', html });
};

const sendOTPEmail = async (email, otp) => {
  const html = `
    <h1>Password Reset Request</h1>
    <p>Use the following 6-digit One Time Password (OTP) to reset your password:</p>
    <h2 style="font-size: 32px; letter-spacing: 5px; color: #4F46E5;">${otp}</h2>
    <p>This OTP is valid for 15 minutes.</p>
  `;
  return sendEmail({ to: email, subject: 'FFMS Password Reset OTP', html });
};

const sendForceResetEmail = async (user, tempPassword) => {
  const html = `
    <h1>Password Force Reset</h1>
    <p>An administrator has force-reset your password.</p>
    <p><strong>Temporary Password:</strong> ${tempPassword}</p>
    <p>Please log in and update your password.</p>
  `;
  return sendEmail({ to: user.email, subject: 'FFMS Password Force Reset', html });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendOTPEmail,
  sendForceResetEmail
};
