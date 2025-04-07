const nodemailer = require('nodemailer');
const { renderEmailTemplate } = require('../utils/renderEmail');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD
  }
});

const sendVerificationEmail = async (email, name, code) => {
  const html = renderEmailTemplate('verification', { name, code });
  return transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Verify Your Email - Jain Prabhutmanch',
    html
  });
};

const sendWelcomeEmail = async (email, name) => {
  const html = renderEmailTemplate('welcome', { name });
  return transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Welcome to Jain Prabhutmanch 🎉',
    html
  });
};

const sendPasswordResetEmail = async (email, name, code) => {
  const html = renderEmailTemplate('passwordReset', { name, code });
  return transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Reset Your Password - Jain Prabhutmanch',
    html
  });
};

module.exports = {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail
};
