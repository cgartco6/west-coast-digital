const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransporter({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Email transporter verification failed:', error);
  } else {
    console.log('Email transporter is ready to send messages');
  }
});

// Send email function
exports.sendEmail = async ({ to, subject, html, text }) => {
  try {
    const mailOptions = {
      from: `"West Coast Digital" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '') // Convert HTML to text if no text provided
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return result;

  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
};

// Email templates
exports.emailTemplates = {
  welcome: (user) => ({
    subject: 'Welcome to West Coast Digital!',
    html: `
      <h2>Welcome to West Coast Digital, ${user.firstName}!</h2>
      <p>Thank you for joining our business directory platform.</p>
      <p>Your account has been successfully created and you can now:</p>
      <ul>
        <li>Add your business listings</li>
        <li>Choose from various subscription plans</li>
        <li>Boost your listings for better visibility</li>
        <li>Access AI-powered marketing tools</li>
      </ul>
      <p>If you have any questions, please don't hesitate to contact our support team.</p>
      <br>
      <p>Best regards,<br>The West Coast Digital Team</p>
    `
  }),
  
  paymentConfirmation: (payment, business) => ({
    subject: 'Payment Confirmation - West Coast Digital',
    html: `
      <h2>Payment Successful!</h2>
      <p>Thank you for your payment to West Coast Digital.</p>
      <p><strong>Business:</strong> ${business.businessName}</p>
      <p><strong>Amount:</strong> R${payment.amount.toFixed(2)}</p>
      <p><strong>Plan:</strong> ${payment.plan}</p>
      <p><strong>Payment Type:</strong> ${payment.paymentType}</p>
      <p><strong>Transaction ID:</strong> ${payment.payfastPaymentId}</p>
      <p><strong>Date:</strong> ${payment.paymentDate.toLocaleDateString()}</p>
      <br>
      <p>If you have any questions about your payment, please contact our support team.</p>
      <br>
      <p>Best regards,<br>The West Coast Digital Team</p>
    `
  }),
  
  subscriptionRenewal: (business, subscription) => ({
    subject: 'Subscription Renewal Reminder - West Coast Digital',
    html: `
      <h2>Subscription Renewal Reminder</h2>
      <p>Dear ${business.businessName} owner,</p>
      <p>Your ${subscription.plan} subscription is due for renewal on ${subscription.endDate.toLocaleDateString()}.</p>
      <p>To ensure uninterrupted service and continued visibility for your business, please renew your subscription before the due date.</p>
      <p><strong>Renewal Amount:</strong> R${subscription.amount.toFixed(2)}</p>
      <br>
      <p>You can renew your subscription by logging into your dashboard and navigating to the subscriptions section.</p>
      <br>
      <p>Best regards,<br>The West Coast Digital Team</p>
    `
  }),
  
  supportTicket: (ticket) => ({
    subject: `Support Ticket Received #${ticket.number}`,
    html: `
      <h2>Support Ticket Received</h2>
      <p>Thank you for contacting West Coast Digital support.</p>
      <p><strong>Ticket #:</strong> ${ticket.number}</p>
      <p><strong>Subject:</strong> ${ticket.subject}</p>
      <p><strong>Status:</strong> ${ticket.status}</p>
      <p><strong>Priority:</strong> ${ticket.priority}</p>
      <br>
      <p>We have received your request and our support team will get back to you within 24 hours.</p>
      <p>You can view the status of your ticket at any time by logging into your dashboard.</p>
      <br>
      <p>Best regards,<br>The West Coast Digital Support Team</p>
    `
  })
};

// Batch email sender
exports.sendBatchEmails = async (recipients, templateFn) => {
  const results = {
    successful: [],
    failed: []
  };

  for (const recipient of recipients) {
    try {
      const emailContent = templateFn(recipient);
      await this.sendEmail({
        to: recipient.email,
        ...emailContent
      });
      results.successful.push(recipient.email);
    } catch (error) {
      console.error(`Failed to send email to ${recipient.email}:`, error);
      results.failed.push({
        email: recipient.email,
        error: error.message
      });
    }
  }

  return results;
};
