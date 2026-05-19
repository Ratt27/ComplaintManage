const nodemailer = require('nodemailer');
require('dotenv').config({ path: '../.env' });  

// Create transporter only if credentials are available
let transporter = null;

if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // TLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  } catch (err) {
    console.warn('⚠ Failed to initialize email transporter:', err.message);
    transporter = null;
  }
} else {
  console.warn('⚠ Email credentials not configured - emails will not be sent');
}
function sendResolutionEmail(to, subject, text) {
  if (!transporter) {
    console.warn('⚠ Email not sent (credentials not configured):', subject);
    return Promise.resolve(); // Return resolved promise to not break flow
  }
  const mailOptions = {
    from: process.env.EMAIL_USER, // admin email from .env
    to, // resolved user's email
    subject,
    text
  };
  return transporter.sendMail(mailOptions).catch(err => {
    console.warn('⚠ Failed to send email:', err.message);
    return Promise.resolve(); // Don't fail the request if email fails
  });
}

module.exports = { sendResolutionEmail }; 